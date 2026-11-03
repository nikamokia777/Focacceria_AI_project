// syrveinv.js — Syrve incoming invoices for the Debts tab ("Syrve" view): the goods each supplier
// brought into stock, at the Syrve invoice prices (VAT included), month by month since the bank
// "history from" date. Only processed invoices count (not drafts, not deleted ones).
// A Syrve invoice's number is the rs.ge waybill number.
//
// KV  dash:syrve:invoices  { error, months: { "YYYY-MM": { f: first day, at: read at (ms),
//       s: { supplierId: [sum, n] }, w: [[number, supplierId, sum, "YYYY-MM-DD"]] } } }
// One Syrve login per sync. Missing months first (newest first, 2 per request — the Debts page asks
// again), then the current month when it is older than 15 minutes (or on Refresh).
// The cron fills missing months and re-reads the current month once an hour.

import { withSyrve } from "./dashboard.js";
import { loadBankSettings, bumpVersion } from "./bank.js";

const KEY = "dash:syrve:invoices";
const r2 = x => Math.round(x * 100) / 100;
const today = env => new Date(Date.now() + Number(env.TZ_OFFSET ?? 4) * 3600000).toISOString().slice(0, 10);
const addDays = (day, n) => { const d = new Date(day + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const num = v => Number(String(v ?? "").replace(",", ".")) || 0;
const decode = s => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
const field = (xml, tag) => { const m = xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`)); return m ? decode(m[1].trim()) : ""; };

function monthsBetween(startDay, endDay) {
  const out = [];
  let [y, m] = startDay.slice(0, 7).split("-").map(Number);
  for (let i = 0; i < 240; i++) {
    const ym = `${y}-${String(m).padStart(2, "0")}`;
    if (ym > endDay.slice(0, 7)) break;
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    out.push({ ym, from: ym === startDay.slice(0, 7) ? startDay : `${ym}-01`, to: `${ym}-${String(last).padStart(2, "0")}` });
    if (++m > 12) { m = 1; y++; }
  }
  return out;
}

export async function loadInvoices(env) {
  const d = (await env.STORE.get(KEY, "json")) || {};
  return { error: d.error || "", months: d.months || {} };
}

// One month of processed incoming invoices. Syrve's "to" day may or may not be inclusive,
// so ask one day more and keep only invoices dated inside the month.
async function readMonth(get, m) {
  const xml = await get("/documents/export/incomingInvoice", { from: m.from, to: addDays(m.to, 1) });
  const s = {}, w = [];
  for (const [doc] of xml.matchAll(/<document>[\s\S]*?<\/document>/g)) {
    const head = doc.replace(/<items>[\s\S]*<\/items>/, "");
    const day = (field(head, "dateIncoming") || field(head, "incomingDate")).slice(0, 10);
    const supplier = field(head, "supplier").toLowerCase();
    if (field(head, "status") !== "PROCESSED" || !supplier || day < m.from || day > m.to) continue;
    let sum = 0;
    for (const [item] of doc.matchAll(/<item>[\s\S]*?<\/item>/g)) sum += num(field(item, "sum"));
    sum = r2(sum);
    const x = s[supplier] = s[supplier] || [0, 0];
    x[0] = r2(x[0] + sum);
    x[1]++;
    w.push([field(head, "documentNumber"), supplier, sum, day]);
  }
  return { s, w };
}

export async function syncInvoices(env, { max = 2, current = false, staleMinutes = 15 } = {}) {
  if (!env.SYRVE_URL || !env.SYRVE_LOGIN || !env.SYRVE_PASSWORD) return { configured: false };
  const { historyFrom } = await loadBankSettings(env);
  if (!historyFrom) return { configured: true, from: "" };
  const data = await loadInvoices(env);
  const before = JSON.stringify(data);
  const core = () => JSON.stringify(Object.entries(data.months).map(([k, v]) => [k, v.f, v.s, v.w])); // without read times
  const coreBefore = core();
  const list = monthsBetween(historyFrom, today(env));
  const kept = {};
  for (const m of list) if (data.months[m.ym]?.f === m.from) kept[m.ym] = data.months[m.ym];
  data.months = kept;

  const todo = list.filter(m => !kept[m.ym]).reverse();
  const cur = list[list.length - 1];
  if (cur && (current || !kept[cur.ym] || Date.now() - (kept[cur.ym].at || 0) > staleMinutes * 60000)) todo.unshift(cur);
  const run = [...new Set(todo)].slice(0, max);
  if (run.length) {
    try {
      await withSyrve(env, async get => {
        for (const m of run) data.months[m.ym] = { f: m.from, at: Date.now(), ...(await readMonth(get, m)) };
      });
      data.error = "";
    } catch (e) {
      data.error = String(e.message || e).slice(0, 200);
    }
  }

  data.months = Object.fromEntries(list.filter(m => data.months[m.ym]).map(m => [m.ym, data.months[m.ym]]));
  if (JSON.stringify(data) !== before) {
    await env.STORE.put(KEY, JSON.stringify(data));
    if (core() !== coreBefore) await bumpVersion(env);
  }
  const loaded = list.filter(m => data.months[m.ym]).length;
  return { configured: true, from: historyFrom, months: loaded, total: list.length, pending: loaded < list.length && !data.error, error: data.error };
}

// Cron: one missing month per run, else the current month once an hour.
export async function scheduledInvoices(env) {
  await syncInvoices(env, { max: 1, staleMinutes: 60 });
}

// { suppliers: { supplierId: { amount, n } }, invoices: [[number, supplierId, sum, day]] }
export async function invoiceTotals(env) {
  const { months } = await loadInvoices(env);
  const suppliers = {}, invoices = [];
  for (const m of Object.values(months)) {
    for (const [id, [sum, n]] of Object.entries(m.s || {})) {
      const x = suppliers[id] = suppliers[id] || { amount: 0, n: 0 };
      x.amount = r2(x.amount + sum); x.n += n;
    }
    invoices.push(...(m.w || []));
  }
  return { suppliers, invoices };
}
