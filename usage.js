// usage.js — PriceCheck „რეპორტი“ → „საქონლის ხარჯი“: how much of each stock item was used in a period.
//
// The same data as Syrve Office's transactions report „საქონლის ხარჯი“ (transaction „Product COST“,
// „Consumption (qty)“ per stock item): Syrve's OLAP TRANSACTIONS report, transaction type
// SESSION_WRITEOFF (what sales take out of the store by recipe). Its store side (the store's account,
// e.g. „Основной склад“) carries the products and amounts going out: Amount < 0, Sum.ResignedSum < 0.
// Checked live (14 Nov 2026): SESSION_WRITEOFF rows exist for „Основной склад“ and „Расход продуктов“.
// Product names, units, groups and types come from the menu base (menu.js, the same product list).
// "Average per day" divides by days with sales (days with any SESSION_WRITEOFF), as everywhere.
//
// GET /api/report/usage?from=YYYY-MM-DD&to=YYYY-MM-DD[&fresh=1] (this month by default)
// → { from, to, days, total, items: [{ id, name, unit, group, type, qty, cost }] }

import { withSyrve, xmlRecords, localDate, cached } from "./dashboard.js";
import { loadBase } from "./menu.js";

const num = (v) => Number(String(v ?? "").replace(",", ".")) || 0;
const r2 = (x) => Math.round(x * 100) / 100;
const r3 = (x) => Math.round(x * 1000) / 1000;
const nextDay = (d) => new Date(Date.parse(d + "T00:00:00Z") + 86400000).toISOString().slice(0, 10);
const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
const out = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
const isDay = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v || "") && !isNaN(Date.parse(v));

export async function fetchUsage(env, from, to) {
  const end = nextDay(to);
  const filters = {
    "DateTime.Typed": { filterType: "DateRange", periodType: "CUSTOM", from, to: end, includeLow: true, includeHigh: false },
    TransactionType: { filterType: "IncludeValues", values: ["SESSION_WRITEOFF"] },
  };
  const { rows, dayRows, stores } = await withSyrve(env, async (get, post) => {
    const olap = (fields, aggregates) => post("/v2/reports/olap", { reportType: "TRANSACTIONS", buildSummary: false, groupByRowFields: fields, aggregateFields: aggregates, filters })
      .then((r) => r.data || []);
    const st = new Set();
    try { for (const s of xmlRecords(await get("/corporation/stores"), "corporateItemDto")) if (s.name) st.add(s.name); } catch (_) {}
    return {
      stores: st,
      rows: await olap(["Account.Name", "Product.Id", "Product.Name"], ["Amount", "Sum.ResignedSum"]),
      dayRows: await olap(["DateTime.Typed"], ["Sum.ResignedSum"]),
    };
  });
  // the store side: a store's account, or (when the store list is unknown) the rows going out
  const storeSide = (r) => (stores.size ? stores.has(r["Account.Name"]) : num(r.Amount) < 0);
  let base = { products: {} };
  try { base = await loadBase(env, false); } catch (_) {}
  const by = new Map();
  for (const r of rows) {
    if (!storeSide(r)) continue;
    const id = String(r["Product.Id"] || r["Product.Name"] || "").toLowerCase();
    if (!id) continue;
    const x = by.get(id) || { id, name: r["Product.Name"] || id, qty: 0, cost: 0 };
    x.qty -= num(r.Amount);           // going out of the store is negative
    x.cost -= num(r["Sum.ResignedSum"]);
    by.set(id, x);
  }
  const items = [];
  for (const x of by.values()) {
    if (Math.abs(x.qty) < 1e-9 && Math.abs(x.cost) < 0.005) continue;
    const p = base.products?.[x.id] || [];
    items.push({ id: x.id, name: p[0] || x.name, unit: p[2] || "", group: p[3] || "", type: p[1] || "", qty: r3(x.qty), cost: r2(x.cost) });
  }
  items.sort((a, b) => b.qty - a.qty || a.name.localeCompare(b.name));
  const days = new Set(dayRows.filter((r) => Math.abs(num(r["Sum.ResignedSum"])) > 0).map((r) => String(r["DateTime.Typed"] || "").slice(0, 10)).filter(Boolean)).size;
  return { from, to, days, total: r2(items.reduce((a, i) => a + i.cost, 0)), items };
}

export async function handleUsage(request, env) {
  if (request.method !== "GET") return out({ error: "Method not allowed" }, 405);
  const q = new URL(request.url).searchParams;
  const today = localDate(env);
  let from = isDay(q.get("from")) ? q.get("from") : today.slice(0, 8) + "01";
  let to = isDay(q.get("to")) ? q.get("to") : today;
  if (to > today) to = today;
  if (from > to) return out({ error: "bad range" }, 400);
  const ttl = to >= today ? 60 : 3600;
  const data = await cached(env, `usage:${from}:${to}`, ttl, q.get("fresh") === "1", () => fetchUsage(env, from, to));
  return out(data);
}
