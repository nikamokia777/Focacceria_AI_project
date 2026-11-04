// waybills.js — rs.ge waybills for the Debts tab: what each supplier sent us, month by month.
//
// For every month since the bank "history from" date, per seller tax ID:
//   confirmed / unconfirmed / rejected on rs.ge (the Debts tab counts every active waybill, i.e.
//   confirmed + unconfirmed: the team doesn't confirm waybills on rs.ge), every waybill (number,
//   amount, day, state), and the return waybills we issued to the seller (goods sent back).
// Saved, deleted and cancelled waybills (status 0 or negative) don't count.
//
// KV  dash:rsge:waybills  { v: 2, returnType, error, codes, months: { "YYYY-MM": { f: first day,
//       s: { sellerTin: [name, confirmed, unconfirmed, rejected, nConfirmed, nUnconfirmed, nRejected] },
//       w: [[number, sellerTin, amount, "YYYY-MM-DD", state: 1 confirmed | 0 not yet | -1 rejected]],
//       r: { pieceFirstDay: { buyerTin: [name, amount, n] } } } } }
// rs.ge answers a month of received waybills in one call, but lists our own waybills only 72 hours
// at a time (error -1064), so returns are read in 3-day pieces.
// Written only when something changed (KV free plan: ~1,000 writes a day).
// Work is counted in rs.ge calls: the Debts page spends up to 24 per request (it asks again while
// something is missing), the cron 6 per run. Missing data first (newest month first), then the
// current month again (its waybills + its last two return pieces), then an older month in turn,
// because waybills get confirmed, rejected or cancelled later.

import { listBuyerWaybills, listOutgoingWaybillsStrict, listWaybillTypes, listErrorCodes, normalizeWaybillNumber } from "./rsge.js";
import { loadBankSettings, bumpVersion } from "./bank.js";

const KEY = "dash:rsge:waybills";
const FORMAT = 2; // older saved data (another layout) is read again from rs.ge
const RUN = 15 * 60 * 1000; // cron interval

export const rsgeConfigured = env => !!(env.RSGE_SERVICE_USER && env.RSGE_SERVICE_PASSWORD);

const r2 = x => Math.round(x * 100) / 100;
const today = env => new Date(Date.now() + Number(env.TZ_OFFSET ?? 4) * 3600000).toISOString().slice(0, 10);
const counts = w => { const s = String(w.status ?? "").trim(); return s !== "0" && !s.startsWith("-"); };
const stateOf = v => { const s = String(v ?? "").trim(); return s === "1" ? 1 : s === "-1" ? -1 : 0; };
const addDays = (day, n) => { const d = new Date(day + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

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

// the month's 3-day pieces that have started by today: [[firstDay, lastDay], …]
function piecesOf(m, endDay) {
  const out = [];
  for (let d = m.from; d <= m.to && d <= endDay; d = addDays(d, 3)) {
    const e = addDays(d, 2);
    out.push([d, e < m.to ? e : m.to]);
  }
  return out;
}

export async function loadWaybills(env) {
  const d = (await env.STORE.get(KEY, "json")) || {};
  const same = d.v === FORMAT;
  return { v: FORMAT, returnType: same ? d.returnType ?? null : null, error: same ? d.error || "" : "", codes: d.codes || {}, months: same ? d.months || {} : {} };
}

// received waybills, for one month (1 call)
async function readMonth(env, m) {
  const list = await listBuyerWaybills(env, m.from, m.to);
  const s = {}, w = [];
  for (const x of list) {
    if (!counts(x) || !x.sellerTin) continue;
    const st = stateOf(x.isConfirmed), i = st === 1 ? 0 : st === 0 ? 1 : 2;
    const y = s[x.sellerTin] = s[x.sellerTin] || [x.sellerName || "", 0, 0, 0, 0, 0, 0];
    if (!y[0] && x.sellerName) y[0] = x.sellerName;
    y[1 + i] = r2(y[1 + i] + x.fullAmount);
    y[4 + i]++;
    w.push([normalizeWaybillNumber(x.number) || x.number, x.sellerTin, r2(x.fullAmount), (x.createDate || "").slice(0, 10), st]);
  }
  return { s, w };
}

// our return waybills in one 3-day piece (1 call)
async function readPiece(env, [from, to], returnType) {
  const r = {};
  for (const w of await listOutgoingWaybillsStrict(env, from, to, returnType)) {
    if (w.type !== returnType || !counts(w) || !w.buyerTin) continue;
    const x = r[w.buyerTin] = r[w.buyerTin] || [w.buyerName || "", 0, 0];
    x[1] = r2(x[1] + w.fullAmount);
    x[2]++;
  }
  return r;
}

// Reads from rs.ge for at most `budget` calls (see the top of the file). Returns the page status.
export async function syncWaybills(env, { budget = 24, current = false, rotate = false } = {}) {
  if (!rsgeConfigured(env)) return { configured: false };
  const { historyFrom } = await loadBankSettings(env);
  if (!historyFrom) return { configured: true, from: "" };
  const data = await loadWaybills(env);
  const before = JSON.stringify(data);
  const core = () => JSON.stringify([data.months, data.returnType]); // what the debts depend on
  const coreBefore = core();
  const end = today(env);
  const list = monthsBetween(historyFrom, end);

  // keep only months of the current range (a new start date makes the first month stale)
  const kept = {};
  for (const m of list) if (data.months[m.ym]?.f === m.from) kept[m.ym] = data.months[m.ym];
  data.months = kept;
  const needsReturns = () => data.returnType !== "";

  // work, most important first; a returns piece needs the return type, read once (1 call)
  const units = [];
  const newest = list.slice().reverse();
  for (const m of newest) if (!kept[m.ym]?.s) units.push({ kind: "m", m, cost: 1 });
  if (needsReturns()) for (const m of newest) for (const p of piecesOf(m, end)) if (!kept[m.ym]?.r?.[p[0]]) units.push({ kind: "r", m, p, cost: 1 });
  const cur = list[list.length - 1];
  if (current && cur) {
    units.push({ kind: "m", m: cur, cost: 1 });
    if (needsReturns()) for (const p of piecesOf(cur, end).slice(-2)) units.push({ kind: "r", m: cur, p, cost: 1 });
  }
  if (rotate && list.length > 1) { const older = list.slice(0, -1); units.push({ kind: "m", m: older[Math.floor(Date.now() / RUN / 2) % older.length], cost: 1 }); }
  const run = [], seen = new Set();
  let spent = data.returnType === null ? 1 : 0;
  for (const u of units) {
    const id = u.kind + u.m.ym + (u.p ? u.p[0] : "");
    if (seen.has(id) || spent + u.cost > budget) continue;
    seen.add(id); run.push(u); spent += u.cost;
  }

  const errors = [];
  if (run.length) {
    if (data.returnType === null) {
      // the return type's id, by its name ("უკან დაბრუნება"); "" = rs.ge has no such type
      try { data.returnType = ((await listWaybillTypes(env)).find(x => /დაბრუნ|return/i.test(x.name)) || {}).id || ""; }
      catch (e) { errors.push(e); }
    }
    const results = await Promise.allSettled(run.map(u =>
      u.kind === "m" ? readMonth(env, u.m) : data.returnType ? readPiece(env, u.p, data.returnType) : Promise.resolve(null)));
    run.forEach((u, i) => {
      const res = results[i];
      if (res.status === "rejected") { errors.push(res.reason); return; }
      if (res.value === null) return;
      const month = data.months[u.m.ym] = data.months[u.m.ym] || { f: u.m.from };
      if (u.kind === "m") { delete month.g; Object.assign(month, res.value); } // g: goods lines, no longer kept
      else (month.r = month.r || {})[u.p[0]] = res.value;
    });
  }
  if (errors.length) {
    // rs.ge's own text for its error code, e.g. "-1064 — შექმნის თარიღის დიაპაზონის …"
    let msg = String(errors[0]?.message || errors[0]).slice(0, 200);
    const code = (msg.match(/error (-\d+)/) || [])[1];
    if (code && !data.codes[code]) { try { const all = await listErrorCodes(env); if (all[code]) data.codes[code] = all[code]; } catch (_) {} }
    if (code && data.codes[code]) msg += " — " + data.codes[code];
    data.error = msg.slice(0, 400);
  } else if (run.length) data.error = "";

  // months in date order, so an unchanged month list compares equal (no needless KV write)
  data.months = Object.fromEntries(list.filter(m => data.months[m.ym]).map(m => [m.ym, data.months[m.ym]]));
  const after = JSON.stringify(data);
  if (after !== before) {
    await env.STORE.put(KEY, after);
    if (core() !== coreBefore) await bumpVersion(env);
  }
  const missing = m => !data.months[m.ym]?.s || (needsReturns() && piecesOf(m, end).some(p => !data.months[m.ym]?.r?.[p[0]]));
  const loaded = list.filter(m => !missing(m)).length;
  return { configured: true, from: historyFrom, months: loaded, total: list.length, pending: loaded < list.length && !errors.length,
    error: data.error, returnsKnown: needsReturns() };
}

// Cron: 6 rs.ge calls per run — missing data first, else the current month and an older month in turn
// (so the current month is re-read every 30 minutes).
export async function scheduledWaybills(env) {
  const odd = Math.floor(Date.now() / RUN) % 2 === 1;
  await syncWaybills(env, { budget: 6, current: !odd, rotate: odd });
}

// Everything stored, added up:
// { sellers: { tin: { name, confirmed, unconfirmed, rejected, n… } }, returns: { tin: { name, amount, n } },
//   waybills: [[number, tin, amount, day, state]] }
export async function waybillTotals(env) {
  const { months } = await loadWaybills(env);
  const sellers = {}, returns = {}, waybills = [];
  for (const m of Object.values(months)) {
    for (const [tin, [name, c, u, r, nc, nu, nr]] of Object.entries(m.s || {})) {
      const x = sellers[tin] = sellers[tin] || { name: "", confirmed: 0, unconfirmed: 0, rejected: 0, nConfirmed: 0, nUnconfirmed: 0, nRejected: 0 };
      if (name) x.name = name;
      x.confirmed = r2(x.confirmed + c); x.unconfirmed = r2(x.unconfirmed + u); x.rejected = r2(x.rejected + r);
      x.nConfirmed += nc; x.nUnconfirmed += nu; x.nRejected += nr;
    }
    for (const piece of Object.values(m.r || {})) {
      for (const [tin, [name, a, k]] of Object.entries(piece)) {
        const x = returns[tin] = returns[tin] || { name: "", amount: 0, n: 0 };
        if (name) x.name = name;
        x.amount = r2(x.amount + a); x.n += k;
      }
    }
    waybills.push(...(m.w || []));
  }
  return { sellers, returns, waybills };
}
