// waybills.js — rs.ge waybills for the Debts tab: what each supplier sent us, month by month.
//
// Kept per seller tax ID, for every month since the bank "history from" date:
//   confirmed (we confirmed it on rs.ge), unconfirmed (not yet), rejected (we rejected it).
// Plus, per buyer tax ID, the return waybills we issued (goods sent back to a supplier).
// Saved, deleted and cancelled waybills (status 0 or negative) don't count.
//
// KV  dash:rsge:waybills  { returnType, error, months: { "YYYY-MM": { f: firstDay,
//       s: { sellerTin: [name, confirmed, unconfirmed, rejected, nConfirmed, nUnconfirmed, nRejected] },
//       r: { buyerTin: [name, amount, n] } } } }
// Written only when something changed (KV free plan: ~1,000 writes a day).
// Missing months are filled by the Debts page (a few per request, the page asks again) and by
// the cron (one month per run). The cron also re-reads the current month every 30 minutes and
// the older months in turn, because waybills get confirmed or cancelled later.

import { listBuyerWaybills, listOutgoingWaybillsStrict, listWaybillTypes } from "./rsge.js";
import { loadBankSettings, bumpVersion } from "./bank.js";

const KEY = "dash:rsge:waybills";
const RUN = 15 * 60 * 1000; // cron interval

export const rsgeConfigured = env => !!(env.RSGE_SERVICE_USER && env.RSGE_SERVICE_PASSWORD);

const r2 = x => Math.round(x * 100) / 100;
const today = env => new Date(Date.now() + Number(env.TZ_OFFSET ?? 4) * 3600000).toISOString().slice(0, 10);
const counts = w => { const s = String(w.status ?? "").trim(); return s !== "0" && !s.startsWith("-"); };

// [{ ym, from, to }] from the start day's month to this month; the first month starts on the start day
function monthsBetween(startDay, endDay) {
  const out = [];
  let [y, m] = startDay.slice(0, 7).split("-").map(Number);
  const end = endDay.slice(0, 7);
  for (let i = 0; i < 240; i++) {
    const ym = `${y}-${String(m).padStart(2, "0")}`;
    if (ym > end) break;
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    out.push({ ym, from: ym === startDay.slice(0, 7) ? startDay : `${ym}-01`, to: `${ym}-${String(last).padStart(2, "0")}` });
    if (++m > 12) { m = 1; y++; }
  }
  return out;
}

export async function loadWaybills(env) {
  const d = (await env.STORE.get(KEY, "json")) || {};
  return { returnType: d.returnType ?? null, error: d.error || "", months: d.months || {} };
}

async function fetchMonth(env, m, returnType) {
  const [conf, unconf, rej, out] = await Promise.all([
    listBuyerWaybills(env, m.from, m.to, 1),
    listBuyerWaybills(env, m.from, m.to, 0),
    listBuyerWaybills(env, m.from, m.to, -1),
    returnType ? listOutgoingWaybillsStrict(env, m.from, m.to) : [],
  ]);
  const s = {};
  [conf, unconf, rej].forEach((list, i) => {
    for (const w of list) {
      if (!counts(w) || !w.sellerTin) continue;
      const x = s[w.sellerTin] = s[w.sellerTin] || [w.sellerName || "", 0, 0, 0, 0, 0, 0];
      if (!x[0] && w.sellerName) x[0] = w.sellerName;
      x[1 + i] = r2(x[1 + i] + w.fullAmount);
      x[4 + i]++;
    }
  });
  const r = {};
  for (const w of out) {
    if (w.type !== returnType || !counts(w) || !w.buyerTin) continue;
    const x = r[w.buyerTin] = r[w.buyerTin] || [w.buyerName || "", 0, 0];
    x[1] = r2(x[1] + w.fullAmount);
    x[2]++;
  }
  return { f: m.from, s, r };
}

// Reads up to `max` months from rs.ge: missing months first (newest first), then the current
// month (current) and/or the next older month in turn (rotate). Returns the page status.
export async function syncWaybills(env, { max = 3, current = false, rotate = false } = {}) {
  if (!rsgeConfigured(env)) return { configured: false };
  const { historyFrom } = await loadBankSettings(env);
  if (!historyFrom) return { configured: true, from: "" };
  const data = await loadWaybills(env);
  const before = JSON.stringify(data);
  const core = () => JSON.stringify([data.months, data.returnType]); // what the debts depend on
  const coreBefore = core();
  const list = monthsBetween(historyFrom, today(env));

  // keep only months of the current range (a new start date makes the first month stale)
  const kept = {};
  for (const m of list) if (data.months[m.ym]?.f === m.from) kept[m.ym] = data.months[m.ym];
  data.months = kept;

  const todo = list.filter(m => !kept[m.ym]).reverse();
  if (current && list.length) todo.push(list[list.length - 1]);
  if (rotate && list.length > 1) { const older = list.slice(0, -1); todo.push(older[Math.floor(Date.now() / RUN / 2) % older.length]); }
  const run = [...new Set(todo)].slice(0, max);

  if (run.length) {
    try {
      if (data.returnType === null) {
        // the return type's id, by its name ("უკან დაბრუნება"); "" = rs.ge has no such type
        const types = await listWaybillTypes(env);
        data.returnType = (types.find(x => /დაბრუნ|return/i.test(x.name)) || {}).id || "";
      }
      for (const m of run) data.months[m.ym] = await fetchMonth(env, m, data.returnType);
      data.error = "";
    } catch (e) {
      data.error = String(e.message || e).slice(0, 200);
    }
  }

  // months in date order, so an unchanged month list compares equal (no needless KV write)
  data.months = Object.fromEntries(list.filter(m => data.months[m.ym]).map(m => [m.ym, data.months[m.ym]]));
  const after = JSON.stringify(data);
  if (after !== before) {
    await env.STORE.put(KEY, after);
    if (core() !== coreBefore) await bumpVersion(env);
  }
  const loaded = list.filter(m => data.months[m.ym]).length;
  return { configured: true, from: historyFrom, months: loaded, total: list.length, pending: loaded < list.length && !data.error,
    error: data.error, returnsKnown: data.returnType !== "" };
}

// Cron: one month per run — a missing month if there is one, else the current month and an older
// month in turn (so the current month is re-read every 30 minutes).
export async function scheduledWaybills(env) {
  const odd = Math.floor(Date.now() / RUN) % 2 === 1;
  await syncWaybills(env, { max: 1, current: !odd, rotate: odd });
}

// Totals over all stored months: { sellers: { tin: { name, confirmed, unconfirmed, rejected, n… } }, returns: { tin: { name, amount, n } } }
export async function waybillTotals(env) {
  const { months } = await loadWaybills(env);
  const sellers = {}, returns = {};
  for (const m of Object.values(months)) {
    for (const [tin, [name, c, u, r, nc, nu, nr]] of Object.entries(m.s || {})) {
      const x = sellers[tin] = sellers[tin] || { name: "", confirmed: 0, unconfirmed: 0, rejected: 0, nConfirmed: 0, nUnconfirmed: 0, nRejected: 0 };
      if (name) x.name = name;
      x.confirmed = r2(x.confirmed + c); x.unconfirmed = r2(x.unconfirmed + u); x.rejected = r2(x.rejected + r);
      x.nConfirmed += nc; x.nUnconfirmed += nu; x.nRejected += nr;
    }
    for (const [tin, [name, a, k]] of Object.entries(m.r || {})) {
      const x = returns[tin] = returns[tin] || { name: "", amount: 0, n: 0 };
      if (name) x.name = name;
      x.amount = r2(x.amount + a); x.n += k;
    }
  }
  return { sellers, returns };
}
