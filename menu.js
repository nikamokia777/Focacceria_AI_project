// menu.js — the Dashboard's MENU tab: what we sell, how much, at what price, what it costs
// to make (Syrve recipes, fully broken down) and the margin.
//
// From Syrve (read only):
//   products        /v2/entities/products/list        name, type, unit, group, menu price (defaultSalePrice)
//   recipes         /v2/assemblyCharts/getAll         recipe cards valid today: ingredients per output amount
//   ingredient cost /v2/reports/balance/stores        Syrve's average cost = stock value / stock amount
//   sales           /v2/reports/olap (SALES)          quantity and revenue per dish, per hour or day
//
// Cost of a dish = its recipe, with semi-finished products (dough, sauces…) broken down into
// their own recipes, priced at Syrve's cost of each raw ingredient.
// Margin is on the price without VAT: (price / 1.18 − cost) / (price / 1.18).

import { withSyrve, nowLocal, localDate, cached } from "./dashboard.js";

const VAT = 0.18;
const MAX_DEPTH = 8;
const BASE_TTL = 3600;                     // products, recipes and costs change rarely
const SELLABLE = new Set(["DISH"]);        // listed even when nothing was sold
const RECIPES_PATH = "/v2/assemblyCharts/getAll";

const num = (v) => (v === undefined || v === null || v === "" ? 0 : Number(v) || 0);
const round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
const nextDay = (day) => { const d = new Date(day + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); };

// ── Syrve: products, recipes, ingredient costs (cached for an hour) ──────────

async function fetchBase(env) {
  const today = localDate(env);
  return withSyrve(env, async (get) => {
    const units = {}, groups = {};
    try { for (const u of JSON.parse(await get("/v2/entities/list", { rootType: "MeasureUnit" }))) units[String(u.id).toLowerCase()] = u.name || u.code || ""; } catch (_) {}
    try { for (const g of JSON.parse(await get("/v2/entities/products/group/list"))) groups[String(g.id).toLowerCase()] = g.name || ""; } catch (_) {}

    // products: id → [name, type, unit, group, menu price]
    const products = {};
    for (const p of JSON.parse(await get("/v2/entities/products/list", { includeDeleted: "false" }))) {
      const id = String(p.id || "").toLowerCase();
      if (!id || p.deleted === true || p.type === "MODIFIER") continue;
      products[id] = [p.name || p.num || id, p.type || "", units[String(p.mainUnit || "").toLowerCase()] || "",
        groups[String(p.parent || "").toLowerCase()] || "", p.defaultSalePrice != null ? num(p.defaultSalePrice) : null];
    }

    // recipes valid today: product → { out: amount the recipe makes, items: [[ingredient, gross amount]] }
    const charts = {};
    let recipesError = "";
    try {
      const body = JSON.parse(await get(RECIPES_PATH, { dateFrom: today, dateTo: today, includeDeletedProducts: "false", includePreparedCharts: "false" }));
      const list = Array.isArray(body) ? body : body.assemblyCharts || [];
      for (const c of list.sort((a, b) => String(a.dateFrom || "").localeCompare(String(b.dateFrom || "")))) {
        const id = String(c.assembledProductId || "").toLowerCase();
        if (!id) continue;
        charts[id] = { // the latest valid card wins
          out: num(c.assembledAmount) || 1,
          items: (c.items || []).map((i) => [String(i.productId || "").toLowerCase(), num(i.amountIn ?? i.amountMiddle ?? i.amountOut)])
            .filter(([pid, q]) => pid && q > 0),
        };
      }
    } catch (e) { recipesError = String(e.message || e).slice(0, 200); }

    // Syrve's average cost of each ingredient: stock value ÷ stock amount (all stores)
    const cost = {};
    let costError = "";
    try {
      const bal = {};
      for (const b of JSON.parse(await get("/v2/reports/balance/stores", { timestamp: nowLocal(env).toISOString().slice(0, 19) }))) {
        const id = String(b.product || "").toLowerCase();
        if (!id) continue;
        const x = bal[id] || (bal[id] = [0, 0]);
        x[0] += num(b.amount); x[1] += num(b.sum);
      }
      for (const [id, [amount, sum]] of Object.entries(bal)) if (amount > 0.0005 && sum > 0) cost[id] = sum / amount;
    } catch (e) { costError = String(e.message || e).slice(0, 200); }

    return { products, charts, cost, recipesError, costError };
  });
}

// ── Syrve: sales per dish for a date range ───────────────────────────────────

function salesFilters(from, to, extra = {}) {
  return {
    "OpenDate.Typed": { filterType: "DateRange", periodType: "CUSTOM", from, to: nextDay(to), includeLow: true, includeHigh: false },
    OrderDeleted: { filterType: "IncludeValues", values: ["NOT_DELETED"] },
    ...extra,
  };
}
const olap = (post, fields, aggregates, filters) =>
  post("/v2/reports/olap", { reportType: "SALES", buildSummary: false, groupByRowFields: fields, aggregateFields: aggregates, filters }).then((r) => r.data || []);

async function fetchSales(env, from, to) {
  return withSyrve(env, async (get, post) => {
    const agg = ["DishAmountInt", "DishDiscountSumInt", "DishSumInt"];
    let rows, byId = true;
    try { rows = await olap(post, ["DishId", "DishName"], agg, salesFilters(from, to)); }
    catch (_) { rows = await olap(post, ["DishName"], agg, salesFilters(from, to)); byId = false; } // older Syrve: by name
    return {
      rows: rows.map((r) => ({ id: byId ? String(r.DishId || "").toLowerCase() : "", name: r.DishName || "",
        qty: num(r.DishAmountInt), revenue: num(r.DishDiscountSumInt), menuSum: num(r.DishSumInt) })),
    };
  });
}

// ── recipe cost (memoised, breaks semi-finished products down) ───────────────

function costing(base) {
  const memo = new Map();
  // cost of one unit of a product; { cost, partial } — partial = some ingredient has no price
  const unitCost = (pid, path = new Set()) => {
    if (memo.has(pid)) return memo.get(pid);
    const chart = base.charts[pid];
    let res;
    if (chart && chart.items.length && !path.has(pid) && path.size < MAX_DEPTH) {
      path.add(pid);
      let cost = 0, partial = false;
      for (const [child, q] of chart.items) {
        const c = unitCost(child, path);
        if (c.cost === null) partial = true; else cost += (q / chart.out) * c.cost;
        partial = partial || c.partial;
      }
      path.delete(pid);
      res = { cost, partial };
    } else {
      const c = base.cost[pid];
      res = c === undefined ? { cost: null, partial: false } : { cost: c, partial: false };
    }
    memo.set(pid, res);
    return res;
  };
  return unitCost;
}

function recipeTree(base, pid, qty, depth = 0, path = new Set()) {
  const p = base.products[pid] || ["?", "", "", "", null];
  const chart = base.charts[pid];
  const node = { id: pid, name: p[0], unit: p[2], qty: round(qty, 4), semi: false, unitCost: null, cost: null, missing: false, children: [] };
  if (depth > 0 && chart && chart.items.length && !path.has(pid) && depth < MAX_DEPTH) {
    node.semi = true;
    path.add(pid);
    node.children = chart.items.map(([child, q]) => recipeTree(base, child, (q / chart.out) * qty, depth + 1, path));
    path.delete(pid);
    node.cost = node.children.reduce((a, c) => a + (c.cost || 0), 0);
    node.missing = node.children.some((c) => c.missing);
  } else if (depth > 0) {
    const c = base.cost[pid];
    if (c === undefined) node.missing = true;
    else node.cost = c * qty;
  }
  if (node.cost !== null) { node.unitCost = qty ? round(node.cost / qty, 2) : null; node.cost = round(node.cost, 4); }
  return node;
}

// everything reduced to raw ingredients and summed, most expensive first
function flatten(tree) {
  const by = new Map();
  const walk = (n) => {
    if (n.semi) return n.children.forEach(walk);
    const x = by.get(n.id) || { id: n.id, name: n.name, unit: n.unit, qty: 0, cost: 0, missing: false };
    x.qty += n.qty; x.cost += n.cost || 0; x.missing = x.missing || n.missing;
    by.set(n.id, x);
  };
  tree.children.forEach(walk);
  return [...by.values()].map((x) => ({ ...x, qty: round(x.qty, 4), cost: round(x.cost, 4), unitCost: x.qty && !x.missing ? round(x.cost / x.qty, 2) : null }))
    .sort((a, b) => b.cost - a.cost);
}

function economics(price, cost) {
  if (!price) return { price: null, priceNoVat: null, margin: null, foodCostPct: null };
  const noVat = price / (1 + VAT);
  return {
    price: round(price), priceNoVat: round(noVat),
    margin: cost === null ? null : round(((noVat - cost) / noVat) * 100, 1),
    foodCostPct: cost === null ? null : round((cost / noVat) * 100, 1),
  };
}

// ── the MENU list ────────────────────────────────────────────────────────────

async function loadBase(env, fresh) { return cached(env, "menu-base", BASE_TTL, fresh, () => fetchBase(env)); }
async function loadSales(env, from, to, fresh) {
  return cached(env, `menu-sales:${from}:${to}`, to >= localDate(env) ? 120 : 3600, fresh, () => fetchSales(env, from, to));
}

export async function buildMenu(env, from, to, fresh = false) {
  const [base, sales] = await Promise.all([loadBase(env, fresh), loadSales(env, from, to, fresh)]);
  const unitCost = costing(base);

  // sales → product id (by id; by name when Syrve gives no id)
  const nameToId = new Map();
  for (const [id, p] of Object.entries(base.products)) {
    const k = p[0].trim().toLowerCase();
    if (!nameToId.has(k) || SELLABLE.has(p[1])) nameToId.set(k, id);
  }
  const sold = new Map();
  for (const r of sales.rows) {
    const id = (r.id && base.products[r.id] ? r.id : nameToId.get(r.name.trim().toLowerCase())) || "name:" + r.name;
    const x = sold.get(id) || { name: r.name, qty: 0, revenue: 0, menuSum: 0 };
    x.qty += r.qty; x.revenue += r.revenue; x.menuSum += r.menuSum;
    sold.set(id, x);
  }

  const ids = new Set([...Object.entries(base.products).filter(([, p]) => SELLABLE.has(p[1])).map(([id]) => id), ...sold.keys()]);
  const dishes = [...ids].map((id) => {
    const p = base.products[id] || [sold.get(id).name, "", "", "", null];
    const s = sold.get(id) || { qty: 0, revenue: 0, menuSum: 0 };
    const c = base.products[id] ? unitCost(id) : { cost: null, partial: false };
    const price = p[4] || (s.qty > 0 ? s.menuSum / s.qty : null);
    return {
      id, name: p[0], group: p[3], unit: p[2], type: p[1],
      sold: round(s.qty, 3), revenue: round(s.revenue),
      cost: c.cost === null ? null : round(c.cost), costPartial: c.partial, hasRecipe: !!base.charts[id],
      ...economics(price, c.cost),
    };
  });
  dishes.sort((a, b) => b.sold - a.sold || b.revenue - a.revenue || a.name.localeCompare(b.name));
  let rank = 0;
  for (const d of dishes) d.rank = d.sold > 0 ? ++rank : null;

  return {
    from, to, dishes,
    totals: { sold: round(dishes.reduce((a, d) => a + d.sold, 0), 3), revenue: round(dishes.reduce((a, d) => a + d.revenue, 0)) },
    recipesError: base.recipesError, costError: base.costError, vat: VAT,
  };
}

// ── one dish: recipe tree + flat list + when it sold ─────────────────────────

export async function buildDish(env, id, from, to, fresh = false) {
  const menu = await buildMenu(env, from, to, false);
  const dish = menu.dishes.find((d) => d.id === id);
  if (!dish) return { error: "not_found" };
  const base = await loadBase(env, false);

  const tree = recipeTree(base, id, 1);
  // the dish itself (depth 0) is always broken down into its recipe
  const chart = base.charts[id];
  if (chart) {
    tree.children = chart.items.map(([child, q]) => recipeTree(base, child, q / chart.out, 1, new Set([id])));
    tree.cost = round(tree.children.reduce((a, c) => a + (c.cost || 0), 0), 4);
    tree.missing = tree.children.some((c) => c.missing);
  }

  const sales = await cached(env, `menu-dish:${from}:${to}:${id}`, to >= localDate(env) ? 120 : 3600, fresh, () =>
    withSyrve(env, async (get, post) => {
      const filter = { DishName: { filterType: "IncludeValues", values: [dish.name] } };
      const field = from === to ? "HourOpen" : "OpenDate.Typed";
      const rows = await olap(post, [field], ["DishAmountInt", "DishDiscountSumInt"], salesFilters(from, to, filter));
      return {
        byHour: from === to ? rows.map((r) => ({ hour: Number(r.HourOpen), qty: num(r.DishAmountInt), revenue: num(r.DishDiscountSumInt) })).filter((r) => !Number.isNaN(r.hour)).sort((a, b) => a.hour - b.hour) : [],
        byDay: from === to ? [] : rows.map((r) => ({ day: String(r["OpenDate.Typed"] || "").slice(0, 10), qty: num(r.DishAmountInt), revenue: num(r.DishDiscountSumInt) })).filter((r) => r.day).sort((a, b) => a.day.localeCompare(b.day)),
      };
    }).catch((e) => ({ byHour: [], byDay: [], error: String(e.message || e).slice(0, 200) })));

  return { ...dish, tree, flat: flatten(tree), sales, recipesError: base.recipesError, costError: base.costError };
}
