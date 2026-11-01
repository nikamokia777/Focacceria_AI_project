// menu.js — the Dashboard's MENU tab: what we sell, how much, at what price, what it costs
// to make (Syrve recipes, fully broken down) and the margin.
//
// Everything comes from Syrve (read only), nothing is calculated from stock or invoices:
//   products   /v2/entities/products/list      name, type, unit, group, menu price (defaultSalePrice)
//   recipes    /v2/assemblyCharts/getAll       recipe cards valid today: ingredients per output amount
//   costs      /reports/ingredientEntry        Syrve's own cost prices, as shown on the recipe card:
//                sourceProductCostNorm = cost of one unit of the product ("Price per unit")
//                dishCostNorm          = total cost of each dish it goes into (the card's total)
//   sales      /v2/reports/olap (SALES)        quantity and revenue per dish, per hour or day
//
// One ingredientEntry call per product, so costs are kept in KV for COST_TTL and fetched a batch at a
// time (the page asks again until all are in; the 15-minute cron fills them in the background).
// Food cost % = cost ÷ menu price with VAT (as on Syrve's card).
// Margin is on the price without VAT: (price / 1.18 − cost) / (price / 1.18).

import { withSyrve, localDate, ddmmyyyy, cached, xmlRecords } from "./dashboard.js";

const VAT = 0.18;
const MAX_DEPTH = 8;
const BASE_TTL = 3600;                     // products, recipes and costs change rarely
const SELLABLE = new Set(["DISH"]);        // listed even when nothing was sold
const RECIPES_PATH = "/v2/assemblyCharts/getAll";
const COSTS_KEY = "menu:syrve-costs";
const COST_TTL = 3 * 3600;                 // Syrve cost prices are re-read after 3 hours
const PAGE_BUDGET = 30;                    // ingredientEntry calls per page request (Cloudflare limits outgoing calls)
const CRON_BUDGET = 40;

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

    // the department the recipe-card costs are calculated for
    let department = env.SYRVE_DEPARTMENT_ID || "";
    if (!department) {
      try { department = (xmlRecords(await get("/corporation/departments"), "corporateItemDto").find((d) => d.type === "DEPARTMENT") || {}).id || ""; } catch (_) {}
    }

    return { products, charts, department, recipesError };
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

// ── Syrve's cost prices (ingredientEntry), kept in KV ────────────────────────

const recipeOf = (base, pid, path) => {
  const chart = base.charts[pid];
  return chart && chart.items.length && !path.has(pid) && path.size < MAX_DEPTH ? chart : null;
};

// Reads Syrve's cost prices in batches inside one Syrve login. `pick(store)` says which products to
// read next (it is asked again after every batch, so a list can stop as soon as it has what it needs);
// products read within COST_TTL are skipped unless in `forceIds`. At most `budget` reports per call.
// Returns lookups: unit(id) = cost of one unit; dish(id) = Syrve's total recipe cost.
async function syrveCosts(env, base, pick, budget, forceIds = []) {
  const store = (await env.STORE.get(COSTS_KEY, "json")) || { unit: {}, dish: {} };
  const force = new Set(forceIds);
  const done = new Set();
  const stale = (id) => !done.has(id) && (force.has(id) || !store.unit[id] || Date.now() - store.unit[id][1] > COST_TTL * 1000);
  let error = "", read = 0;
  // the first report alone (the most shared ingredient often covers the whole menu), then five at a time
  const next = () => pick(store).filter(Boolean).filter(stale).slice(0, Math.min(read ? 5 : 1, budget - read));
  if (budget > 0 && next().length) {
    try {
      await withSyrve(env, async (get) => {
        const date = ddmmyyyy(localDate(env));
        for (let batch = next(); batch.length; batch = next()) {
          read += batch.length;
          await Promise.all(batch.map(async (id) => {
            done.add(id);
            const xml = await get("/reports/ingredientEntry", { date, product: id, department: base.department || undefined, includeSubtree: "true" });
            const rows = xmlRecords(xml, "item");
            const own = rows.find((r) => r.sourceProductCostNorm !== undefined && r.sourceProductCostNorm !== "");
            const now = Date.now();
            store.unit[id] = [own ? num(own.sourceProductCostNorm) : null, now];
            for (const r of rows) {
              const p = String(r.product || "").toLowerCase();
              if (p && r.dishCostNorm !== undefined && r.dishCostNorm !== "") store.dish[p] = [num(r.dishCostNorm), now];
            }
          }));
        }
      });
    } catch (e) { error = String(e.message || e).slice(0, 200); }
    await env.STORE.put(COSTS_KEY, JSON.stringify(store));
  }
  return {
    unit: (id) => (store.unit[id] ? store.unit[id][0] : null),
    dish: (id) => (store.dish[id] ? store.dish[id][0] : null),
    store, error,
  };
}

// Cost of one unit of a dish: Syrve's own total (dishCostNorm) when known, otherwise the sum of
// its first-level ingredients × their Syrve cost prices — the same arithmetic as the card.
function dishCost(base, costs, pid) {
  const own = costs.dish(pid);
  if (own !== null) return { cost: own, partial: false };
  const chart = base.charts[pid];
  if (!chart || !chart.items.length) { const u = costs.unit(pid); return { cost: u, partial: false }; }
  let cost = 0, partial = false;
  for (const [child, q] of chart.items) {
    const u = costs.unit(child);
    if (u === null) partial = true; else cost += (q / chart.out) * u;
  }
  return { cost, partial };
}

// The recipe as a tree; every line priced with Syrve's cost price of that product.
// Semi-finished products show their own recipe underneath (for reading); their line uses
// Syrve's cost price of the semi-finished product, exactly as the card does.
function recipeTree(base, costs, pid, qty, depth = 0, path = new Set()) {
  const p = base.products[pid] || ["?", "", "", "", null];
  const node = { id: pid, name: p[0], unit: p[2], qty: round(qty, 4), semi: false, unitCost: null, cost: null, missing: false, children: [] };
  const chart = recipeOf(base, pid, path);
  if (chart) {
    node.semi = depth > 0;
    path.add(pid);
    node.children = chart.items.map(([child, q]) => recipeTree(base, costs, child, (q / chart.out) * qty, depth + 1, path));
    path.delete(pid);
  }
  if (depth === 0) {
    const own = costs.dish(pid);
    node.cost = own !== null ? own * qty : node.children.reduce((a, c) => a + (c.cost || 0), 0);
    node.missing = own === null && node.children.some((c) => c.missing);
  } else {
    const u = costs.unit(pid);
    if (u === null) node.missing = true;
    else { node.unitCost = round(u, 2); node.cost = round(u * qty, 4); }
  }
  return node;
}

// every product of a recipe tree (to know which cost prices to read)
function treeIds(base, pid, path = new Set(), out = new Set()) {
  const chart = recipeOf(base, pid, path);
  if (!chart) return out;
  path.add(pid);
  for (const [child] of chart.items) { out.add(child); treeIds(base, child, path, out); }
  path.delete(pid);
  return out;
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
    foodCostPct: cost === null ? null : round((cost / price) * 100, 2), // like Syrve's card: of the price with VAT
  };
}

// ── the MENU list ────────────────────────────────────────────────────────────

async function loadBase(env, fresh) { return cached(env, "menu-base3", BASE_TTL, fresh, () => fetchBase(env)); }
async function loadSales(env, from, to, fresh) {
  return cached(env, `menu-sales:${from}:${to}`, to >= localDate(env) ? 120 : 3600, fresh, () => fetchSales(env, from, to));
}

// Which cost prices the list needs: Syrve's dish total comes with any ingredient's report, so read
// the ingredients shared by the most dishes first (packaging, dough…) — few calls cover many dishes.
function listCostIds(base, dishIds, store) {
  const now = Date.now(), old = (x) => !x || now - x[1] > COST_TTL * 1000;
  const uncovered = dishIds.filter((id) => base.charts[id] && old(store.dish[id]));
  const freq = new Map();
  for (const d of uncovered) for (const [child] of base.charts[d].items) if (old(store.unit[child])) freq.set(child, (freq.get(child) || 0) + 1);
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
}

async function menuCosts(env, base, dishIds, budget) {
  const goods = dishIds.filter((id) => !base.charts[id]); // sold as they are: their own cost price
  return syrveCosts(env, base, (store) => [...listCostIds(base, dishIds, store), ...goods], budget);
}

export async function buildMenu(env, from, to, fresh = false, budget = PAGE_BUDGET) {
  const [base, sales] = await Promise.all([loadBase(env, fresh), loadSales(env, from, to, fresh)]);

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
  const known = [...ids].filter((id) => base.products[id]);
  const costs = await menuCosts(env, base, known, budget);
  const dishes = [...ids].map((id) => {
    const p = base.products[id] || [sold.get(id).name, "", "", "", null];
    const s = sold.get(id) || { qty: 0, revenue: 0, menuSum: 0 };
    const c = base.products[id] ? dishCost(base, costs, id) : { cost: null, partial: false };
    const price = p[4] || (s.qty > 0 ? s.menuSum / s.qty : null);
    return {
      id, name: p[0], group: p[3], unit: p[2], type: p[1],
      sold: round(s.qty, 3), revenue: round(s.revenue),
      cost: c.cost === null || c.partial ? null : round(c.cost), costPartial: c.partial, hasRecipe: !!base.charts[id],
      ...economics(price, c.partial ? null : c.cost),
    };
  });
  dishes.sort((a, b) => b.sold - a.sold || b.revenue - a.revenue || a.name.localeCompare(b.name));
  let rank = 0;
  for (const d of dishes) d.rank = d.sold > 0 ? ++rank : null;

  return {
    from, to, dishes,
    totals: { sold: round(dishes.reduce((a, d) => a + d.sold, 0), 3), revenue: round(dishes.reduce((a, d) => a + d.revenue, 0)) },
    recipesError: base.recipesError, costError: costs.error, pricesPending: dishes.filter((d) => d.costPartial).length, vat: VAT,
  };
}

// ── one dish: recipe tree + flat list + when it sold ─────────────────────────

export async function buildDish(env, id, from, to, fresh = false) {
  const menu = await buildMenu(env, from, to, false, 0);
  const dish = menu.dishes.find((d) => d.id === id);
  if (!dish) return { error: "not_found" };
  const base = await loadBase(env, false);

  // every product in this recipe (refreshed on "Refresh"), plus the dish's own Syrve total
  const ids = [...treeIds(base, id)];
  const costs = await syrveCosts(env, base, () => ids, 45, fresh ? ids : []);
  const tree = recipeTree(base, costs, id, 1);
  const c = dishCost(base, costs, id);
  Object.assign(dish, { cost: c.cost === null || c.partial ? null : round(c.cost), costPartial: c.partial, ...economics(dish.price, c.cost === null || c.partial ? null : c.cost) });

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

  return { ...dish, tree, flat: flatten(tree), sales, recipesError: base.recipesError, costError: costs.error, pricesPending: ids.filter((x) => costs.unit(x) === null && !costs.store.unit[x]).length };
}

// Cron (every 15 minutes): read missing or old Syrve cost prices in the background.
export async function scheduledMenuCosts(env) {
  const base = await loadBase(env, false);
  const dishIds = Object.entries(base.products).filter(([, p]) => SELLABLE.has(p[1])).map(([id]) => id);
  await menuCosts(env, base, dishIds, CRON_BUDGET);
}
