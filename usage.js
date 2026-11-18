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
// GET /api/report/usage/item?id=… — one product: its deliveries and the dishes it went into (below)

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
      // per day and account: a day's store side and expense side cancel out (checked live 18 Nov), so the
      // days with sales are the days whose store side has usage
      dayRows: await olap(["DateTime.Typed", "Account.Name"], ["Amount", "Sum.ResignedSum"]),
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
  const days = new Set(dayRows.filter((r) => storeSide(r) && (Math.abs(num(r.Amount)) > 1e-9 || Math.abs(num(r["Sum.ResignedSum"])) > 0)).map((r) => String(r["DateTime.Typed"] || "").slice(0, 10)).filter(Boolean)).size;
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
  const data = await cached(env, `usage2:${from}:${to}`, ttl, q.get("fresh") === "1", () => fetchUsage(env, from, to));
  return out(data);
}

// ── one product in detail (click on a row) ───────────────────────────────────
// GET /api/report/usage/item?id=<Syrve product id>&from&to[&fresh=1]
// → { id, name, unit, from, to, restocks: [{ day, num, supplier, qty, price, sum }],
//     dishes: [{ name, qty, cost }], used: { qty, cost } }
// Restocks = Syrve's processed incoming invoices (supplier deliveries), one row per delivery line, never
// summed (checked live 14 Nov: documentNumber = the rs.ge waybill №, item amount in the stock unit).
// The supplier's name comes from the rs.ge waybills the Debts tab keeps (dash:rsge:waybills), by №.
// Dishes = the same SESSION_WRITEOFF data as the list, split by the dish sold (Contr-Product.Name).
// The whole period is read once (every product's dishes and deliveries) and cached like the list.

async function fetchDetailData(env, from, to) {
  const end = nextDay(to);
  const filters = {
    "DateTime.Typed": { filterType: "DateRange", periodType: "CUSTOM", from, to: end, includeLow: true, includeHigh: false },
    TransactionType: { filterType: "IncludeValues", values: ["SESSION_WRITEOFF"] },
  };
  return withSyrve(env, async (get, post) => {
    const stores = new Set();
    try { for (const s of xmlRecords(await get("/corporation/stores"), "corporateItemDto")) if (s.name) stores.add(s.name); } catch (_) {}
    const storeSide = (r) => (stores.size ? stores.has(r["Account.Name"]) : num(r.Amount) < 0);
    // dishes: productId → { dish name → [qty, cost] }
    const dishes = {};
    let dishError = "";
    try {
      const r = await post("/v2/reports/olap", { reportType: "TRANSACTIONS", buildSummary: false,
        groupByRowFields: ["Account.Name", "Product.Id", "Contr-Product.Name"], aggregateFields: ["Amount", "Sum.ResignedSum"], filters });
      for (const row of r.data || []) {
        if (!storeSide(row)) continue;
        const id = String(row["Product.Id"] || "").toLowerCase();
        if (!id) continue;
        const dish = String(row["Contr-Product.Name"] || "").trim() || "—";
        const d = (dishes[id] = dishes[id] || {});
        const x = (d[dish] = d[dish] || [0, 0]);
        x[0] = r3(x[0] - num(row.Amount));
        x[1] = r2(x[1] - num(row["Sum.ResignedSum"]));
      }
    } catch (e) { dishError = String(e.message || e).slice(0, 200); }
    // deliveries: [number, day, productId, qty, price, sum, supplierId]
    const inv = [];
    let invError = "";
    try {
      const xml = await get("/documents/export/incomingInvoice", { from, to: end });
      for (const m of xml.matchAll(/<document>([\s\S]*?)<\/document>/g)) {
        const head = xmlRecords("<h>" + m[1].replace(/<items>[\s\S]*<\/items>/, "") + "</h>", "h")[0] || {};
        if (head.status && head.status !== "PROCESSED") continue;
        const day = String(head.dateIncoming || head.incomingDate || "").slice(0, 10);
        if (!day || day < from || day > to) continue;
        for (const it of xmlRecords(m[1], "item")) {
          inv.push([String(head.documentNumber || "").trim(), day, String(it.product || "").toLowerCase(), r3(num(it.amount)), r2(num(it.price)), r2(num(it.sum)), String(head.supplier || "")]);
        }
      }
    } catch (e) { invError = String(e.message || e).slice(0, 200); }
    return { dishes, inv, dishError, invError };
  });
}

// rs.ge waybill № → seller name, from the Debts tab's saved waybills
async function sellerNames(env) {
  const out = new Map();
  try {
    const saved = await env.STORE.get("dash:rsge:waybills", "json");
    for (const m of Object.values(saved?.months || {})) {
      for (const [numb, tin] of m.w || []) {
        const name = m.s?.[tin]?.[0];
        if (numb && name) out.set(String(numb).replace(/^0+/, ""), name);
      }
    }
  } catch (_) {}
  return out;
}

export async function handleUsageItem(request, env) {
  if (request.method !== "GET") return out({ error: "Method not allowed" }, 405);
  const q = new URL(request.url).searchParams;
  const id = String(q.get("id") || "").toLowerCase().slice(0, 100);
  if (!id) return out({ error: "id required" }, 400);
  const today = localDate(env);
  let from = isDay(q.get("from")) ? q.get("from") : today.slice(0, 8) + "01";
  let to = isDay(q.get("to")) ? q.get("to") : today;
  if (to > today) to = today;
  if (from > to) return out({ error: "bad range" }, 400);
  const ttl = to >= today ? 60 : 3600;
  const data = await cached(env, `usagedet:${from}:${to}`, ttl, q.get("fresh") === "1", () => fetchDetailData(env, from, to));
  const names = await sellerNames(env);
  let base = { products: {} };
  try { base = await loadBase(env, false); } catch (_) {}
  const p = base.products?.[id] || [];
  const restocks = data.inv.filter((x) => x[2] === id).map(([n, day, , qty, price, sum]) => ({ day, num: n, supplier: names.get(n.replace(/^0+/, "")) || "", qty, price, sum }))
    .sort((a, b) => a.day.localeCompare(b.day) || a.num.localeCompare(b.num));
  const dishes = Object.entries(data.dishes[id] || {}).map(([name, [qty, cost]]) => ({ name, qty, cost })).filter((d) => Math.abs(d.qty) > 1e-9 || Math.abs(d.cost) > 0.004)
    .sort((a, b) => b.qty - a.qty || a.name.localeCompare(b.name));
  return out({
    id, name: p[0] || "", unit: p[2] || "", from, to, restocks, dishes,
    used: { qty: r3(dishes.reduce((a, d) => a + d.qty, 0)), cost: r2(dishes.reduce((a, d) => a + d.cost, 0)) },
    errors: { dishes: data.dishError || undefined, restocks: data.invError || undefined },
  });
}
