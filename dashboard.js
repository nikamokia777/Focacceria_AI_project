// dashboard.js — the Dashboard's server side (costs, ratings, tasks + Syrve data).
// worker.js sends every /api/dash/... request here, after checking the CEO password login.
//
// Storage: the same KV as PriceCheck (binding STORE), keys start with "dash:".
// Syrve secrets (Cloudflare → this Worker → Settings → Variables and Secrets, type Secret):
//   SYRVE_URL       https://focacceria.syrve.online
//   SYRVE_LOGIN     Syrve Office user
//   SYRVE_PASSWORD  that user's password (plain — it is hashed here)
// Optional secrets: TZ_OFFSET (hours from UTC, default 4), DEBT_SIGN (default -1),
//   COMPANY_TIN (our tax ID — transfers to it are between our own accounts, not supplier payments)

import { listOutgoingWaybills } from "./rsge.js";
import { buildMenu, buildDish, buildMenuMonthly } from "./menu.js";
import { bankConfigured, loadBankSettings, saveBankSettings, loadBankState, loadBankData, loadRecipientPayments, syncStep, bumpVersion, loadVersion } from "./bank.js";
import { loadLog, loadBasePrices } from "./store.js";
import { syncWaybills, waybillTotals } from "./waybills.js";
import { syncInvoices, invoiceTotals } from "./syrveinv.js";
import { syncTelegramApproved, categorizer, loadCategories, saveCategory, CATEGORIES } from "./debtsrc.js";
import { runProbe } from "./rsprobe.js";

const DATA_KEYS = ["fixed", "variable", "ratings", "tasks"];
// The CEO's remembered decisions: { byTin, byIban, byTx: { key: target }, comments: { "tin:…" | "iban:…" | "rk:…": text } }
// target: a supplier id, "ignore" (not a supplier) or "x:<category>" (not a supplier: an expense, see EXPENSE_CATS)
const LINKS_KEY = "dash:bank:links";
const EXPENSE_CATS = ["supplies", "equipment", "other", "outsource"];
const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: JSON_HEADERS });

// path is the part after /api/dash/, e.g. "data/fixed" or "syrve/live"
export async function handleDashboard(request, env, path) {
  const parts = path.split("/").filter(Boolean);
  const url = new URL(request.url);
  try {
    // typed data
    if (parts[0] === "data" && DATA_KEYS.includes(parts[1])) {
      const kvKey = "dash:data:" + parts[1];
      if (request.method === "GET") return json({ value: await env.STORE.get(kvKey, "json"), at: new Date().toISOString() });
      if (request.method === "PUT") {
        const body = await request.json().catch(() => null);
        if (!body || !("value" in body)) return json({ error: "Expected { value }" }, 400);
        if (parts[1] === "tasks") await keepBotTasks(env, kvKey, body);
        const text = JSON.stringify(body.value ?? null);
        if (text.length > 1_000_000) return json({ error: "Too much data" }, 400);
        await env.STORE.put(kvKey, text);
        return json({ ok: true });
      }
      return json({ error: "Method not allowed" }, 405);
    }

    // Syrve
    if (parts[0] === "syrve" && request.method === "GET") {
      const fresh = url.searchParams.get("fresh") === "1";
      if (parts[1] === "live" || parts[1] === "paytype" || parts[1] === "menu") {
        // a date range (inclusive); today by default. Ranges that include today are refreshed every minute.
        const today = localDate(env);
        const day = v => (/^\d{4}-\d{2}-\d{2}$/.test(v || "") ? v : "");
        const from = day(url.searchParams.get("from")) || today;
        const to = [day(url.searchParams.get("to")) || from, today].sort()[0];
        if (from > to) return json({ error: "bad range" }, 400);
        const ttl = to >= today ? 60 : 3600;
        if (parts[1] === "menu") {
          if (parts[2] === "monthly") return json(await buildMenuMonthly(env, url.searchParams.get("months") === "12" ? 12 : 6, fresh));
          if (parts[2] === "dish") {
            const id = String(url.searchParams.get("id") || "").toLowerCase().slice(0, 100);
            if (!id) return json({ error: "id required" }, 400);
            const d = await buildDish(env, id, from, to, fresh);
            return d.error ? json(d, 404) : json(d);
          }
          return json(await buildMenu(env, from, to, fresh));
        }
        if (parts[1] === "live") return json(await cached(env, `live2:${from}:${to}`, ttl, fresh, () => syrveLive(env, from, to)));
        const name = String(url.searchParams.get("name") || "").slice(0, 100);
        if (!name) return json({ error: "name required" }, 400);
        return json(await cached(env, `pay:${from}:${to}:${name}`, ttl, fresh, () => syrvePayType(env, from, to, name)));
      }
      if (parts[1] === "monthly") return json(await cached(env, "monthly2", 900, fresh, () => syrveMonthly(env)));
      if (parts[1] === "debts") {
        // rs.ge waybills and Syrve invoices: a little of what is missing per request (the page asks again
        // while something is missing); Refresh also re-reads the current month. Then new Telegram approvals.
        const waybills = await syncWaybills(env, { budget: 24, current: fresh });
        const invoices = await syncInvoices(env, { current: fresh });
        const tg = await syncTelegramApproved(env);
        // Syrve's balance is only a comparison column now: the page still works without it
        let syrve;
        try { syrve = await cached(env, "debts-syrve", 900, fresh, () => syrveDebts(env)); }
        catch (e) { syrve = { error: String(e.message || e).slice(0, 200), suppliers: [], owed: {}, _at: "err" }; }
        // reuse the last result until something changes (bank sync, rs.ge waybills, a CEO decision, Syrve refresh)
        const version = `${syrve._at}|${await loadVersion(env)}`;
        const saved = await env.STORE.get("dash:cache:debts-result3");
        let result;
        if (saved && saved.startsWith(version + "\n")) result = JSON.parse(saved.slice(version.length + 1));
        else {
          result = await buildDebts(env, syrve, tg);
          await env.STORE.put("dash:cache:debts-result3", version + "\n" + JSON.stringify(result));
        }
        // The sync states change on every sync, even when the debts don't: always send the
        // current ones. (A stale copy made the page think the bank was behind and sync forever.)
        const state = await loadBankState(env);
        Object.assign(result.bank, { lastSyncAt: state.lastSyncAt, errors: state.errors, notes: state.notes, cursors: state.cursors });
        result.waybills = waybills;
        result.invoices = invoices;
        return json(result);
      }
      if (parts[1] === "employees") {
        const month = url.searchParams.get("month") || localDate(env).slice(0, 7);
        if (!/^\d{4}-\d{2}$/.test(month)) return json({ error: "bad month" }, 400);
        return json(await cached(env, "emp:" + month, 300, fresh, () => syrveEmployees(env, month)));
      }
    }
    // Debts → "rs მოსული": move a product to another category ({ key, cat }; cat "" = automatic again)
    if (parts[0] === "debts" && parts[1] === "category" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      return json(await saveCategory(env, body || {}));
    }
    // one-off read-only check of rs.ge / Syrve / Telegram answers (rsprobe.js)
    if (parts[0] === "probe" && request.method === "GET") return json(await runProbe(env));
    // bank settings / sync / review
    if (parts[0] === "bank") {
      if (parts[1] === "settings" && request.method === "GET") return json({ settings: await loadBankSettings(env), configured: bankConfigured(env) });
      if (parts[1] === "settings" && request.method === "PUT") {
        const body = await request.json().catch(() => ({}));
        return json({ settings: await saveBankSettings(env, body || {}) });
      }
      if (parts[1] === "sync" && request.method === "POST") return json(await syncStep(env));
      if (parts[1] === "review" && request.method === "POST") {
        const body = await request.json().catch(() => ({}));
        return json(await saveReview(env, body || {}));
      }
    }

    return json({ error: "Not found" }, 404);
  } catch (e) {
    return json({ error: String(e && e.message ? e.message : e) }, 502);
  }
}

// ── helpers ──────────────────────────────────────────────────────────────────

// The Telegram bot adds tasks (Storage alarms) while a Dashboard page may be open with an
// older list. Keep what the bot added or changed after that page loaded (body.loadedAt).
async function keepBotTasks(env, kvKey, body) {
  const list = body.value?.overall;
  const since = String(body.loadedAt || "");
  if (!Array.isArray(list) || !since) return;
  const current = (await env.STORE.get(kvKey, "json"))?.overall || [];
  const byId = new Map(list.map(x => [x.id, x]));
  for (const c of current) {
    if (!c.botAt || c.botAt <= since) continue;
    const mine = byId.get(c.id);
    if (!mine) list.push(c);
    else if (c.botAt > (mine.botAt || "")) { mine.note = c.note; mine.botAt = c.botAt; }
  }
}

async function sha1(text) {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

// Cache Syrve answers in KV so we don't log in (and take a license) on every refresh.
export async function cached(env, name, ttl, fresh, fn) {
  const key = "dash:cache:" + name;
  if (!fresh) {
    const hit = await env.STORE.get(key, "json");
    if (hit && hit._at && Date.now() - hit._at < ttl * 1000) return hit;
  }
  const value = await fn();
  value._at = Date.now();
  await env.STORE.put(key, JSON.stringify(value), { expirationTtl: Math.max(60, ttl * 4) });
  return value;
}

// Local (restaurant) date/time helpers
export function nowLocal(env) {
  const off = Number(env.TZ_OFFSET ?? 4);
  return new Date(Date.now() + off * 3600000); // read with getUTC* methods
}
export function localDate(env, d = nowLocal(env)) {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}
export function ddmmyyyy(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

// ---------- minimal XML reading (Syrve answers are flat XML) ----------
function decode(s) {
  return s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'").replace(/&amp;/g, "&");
}
// Returns an array of {child: text} objects for every <tag>...</tag> record.
export function xmlRecords(xml, tag) {
  const out = [];
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "g");
  let m;
  while ((m = re.exec(xml))) {
    const rec = {};
    const inner = m[1];
    const fre = /<([A-Za-z_][\w.\-]*)(?:\s[^>]*)?>([^<]*)<\/\1>|<([A-Za-z_][\w.\-]*)(?:\s[^>]*)?\/>/g;
    let f;
    while ((f = fre.exec(inner))) {
      if (f[1]) { if (!(f[1] in rec)) rec[f[1]] = decode(f[2].trim()); }
      else if (f[3] && !(f[3] in rec)) rec[f[3]] = "";
    }
    out.push(rec);
  }
  return out;
}

// ---------- Syrve session ----------
export async function withSyrve(env, fn) {
  if (!env.SYRVE_URL || !env.SYRVE_LOGIN || !env.SYRVE_PASSWORD) {
    throw new Error("Syrve is not configured (SYRVE_URL / SYRVE_LOGIN / SYRVE_PASSWORD)");
  }
  const base = env.SYRVE_URL.replace(/\/+$/, "") + "/resto/api";
  const pass = await sha1(env.SYRVE_PASSWORD);
  const authRes = await fetch(`${base}/auth?login=${encodeURIComponent(env.SYRVE_LOGIN)}&pass=${pass}`);
  const key = (await authRes.text()).trim();
  if (!authRes.ok || !key || key.length > 100) throw new Error("Syrve login failed (" + authRes.status + ")");

  const get = async (path, query = {}) => {
    const qs = new URLSearchParams();
    qs.append("key", key);
    for (const [k, v] of Object.entries(query)) {
      if (Array.isArray(v)) v.forEach(x => qs.append(k, x));
      else if (v !== undefined && v !== null) qs.append(k, v);
    }
    const res = await fetch(`${base}${path}?${qs}`);
    const text = await res.text();
    if (!res.ok) throw new Error(`Syrve ${path} → ${res.status}: ${text.slice(0, 200)}`);
    return text;
  };

  // OLAP v2 takes a JSON body
  const post = async (path, body) => {
    const res = await fetch(`${base}${path}?key=${encodeURIComponent(key)}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`Syrve ${path} → ${res.status}: ${text.slice(0, 200)}`);
    return JSON.parse(text);
  };

  try {
    return await fn(get, post);
  } finally {
    // Always log out so the API license is freed.
    try { await fetch(`${base}/logout?key=${key}`); } catch (_) {}
  }
}

const num = v => (v === undefined || v === null || v === "" ? 0 : Number(v) || 0);

// ---------- LIVE: sales for a day or a range of days (today by default) ----------
const nextDay = day => { const d = new Date(day + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); };

async function syrveLive(env, from, to) {
  const end = nextDay(to); // Syrve's "to" is exclusive

  return withSyrve(env, async (get, post) => {
    const result = { date: from, from, to, total: 0, orders: 0, byPayType: [], byHour: [], byDay: [], source: "olap" };

    // 0) Preferred: OLAP v2 without deleted orders — the same basis as the payment-type details.
    //    Orders are counted per day, so an order paid two ways (card + cash) counts once.
    try {
      const filters = {
        "OpenDate.Typed": { filterType: "DateRange", periodType: "CUSTOM", from, to: end, includeLow: true, includeHigh: false },
        OrderDeleted: { filterType: "IncludeValues", values: ["NOT_DELETED"] },
      };
      const olap = (fields, aggregates) => post("/v2/reports/olap", { reportType: "SALES", buildSummary: false, groupByRowFields: fields, aggregateFields: aggregates, filters })
        .then(r => r.data || []);
      let marketingOrders = 0;
      for (const r of await olap(["PayTypes"], ["DishDiscountSumInt", "DishSumInt", "UniqOrderId.OrdersCount"])) {
        const name = r.PayTypes || "—";
        if (isMarketing(name)) { result.byPayType.push({ name, sum: num(r.DishSumInt), notIncome: true }); marketingOrders += num(r["UniqOrderId.OrdersCount"]); continue; }
        result.byPayType.push({ name, sum: num(r.DishDiscountSumInt) });
        result.total += num(r.DishDiscountSumInt);
      }
      const days = await olap(["OpenDate.Typed"], ["DishDiscountSumInt", "UniqOrderId.OrdersCount"]);
      result.orders = Math.max(0, days.reduce((a, r) => a + num(r["UniqOrderId.OrdersCount"]), 0) - marketingOrders);
      if (from !== to) {
        result.byDay = days.map(r => ({ day: String(r["OpenDate.Typed"] || "").slice(0, 10), sum: num(r.DishDiscountSumInt) }))
          .filter(r => r.day).sort((a, b) => a.day.localeCompare(b.day));
        result.salesDays = result.byDay.filter(r => r.sum > 0).length; // a range's hours are averaged over these
      }
      // by hour: one day's hours, or a range's hours summed over all its days
      try {
        result.byHour = (await olap(["HourOpen"], ["DishDiscountSumInt"]))
          .map(r => ({ hour: Number(r.HourOpen), sum: num(r.DishDiscountSumInt) }))
          .filter(r => !Number.isNaN(r.hour)).sort((a, b) => a.hour - b.hour);
      } catch (_) {}
      if (!result.byPayType.some(p => p.notIncome)) result.byPayType.push({ name: "მარკეტინგი", sum: 0, notIncome: true });
      result.source = "olap2";
      return result;
    } catch (e) {
      Object.assign(result, { total: 0, orders: 0, byPayType: [], byHour: [], byDay: [], olap2Error: String(e.message || e).slice(0, 200) });
    }

    // 1) Older Syrve versions: OLAP v1 sales by payment type
    try {
      const xml = await get("/reports/olap", {
        report: "SALES", from: ddmmyyyy(from), to: ddmmyyyy(end),
        groupRow: "PayTypes", agr: ["DishDiscountSumInt", "DishSumInt", "UniqOrderId.OrdersCount"],
      });
      const rows = xmlRecords(xml, "r");
      for (const r of rows) {
        const name = r.PayTypes || "—";
        // Marketing (food given away) is shown at menu price but is not income
        if (isMarketing(name)) { result.byPayType.push({ name, sum: num(r.DishSumInt), notIncome: true }); continue; }
        const sum = num(r.DishDiscountSumInt);
        result.byPayType.push({ name, sum });
        result.total += sum;
        result.orders += num(r["UniqOrderId.OrdersCount"]);
      }
      // always list marketing, even on days without it
      if (!result.byPayType.some(p => p.notIncome)) result.byPayType.push({ name: "მარკეტინგი", sum: 0, notIncome: true });
      // 2) by hour for one day, by day for a range (optional — ignore if the field isn't supported)
      try {
        if (from === to) {
          const xh = await get("/reports/olap", {
            report: "SALES", from: ddmmyyyy(from), to: ddmmyyyy(end),
            groupRow: "HourOpen", agr: "DishDiscountSumInt",
          });
          result.byHour = xmlRecords(xh, "r")
            .map(r => ({ hour: Number(r.HourOpen), sum: num(r.DishDiscountSumInt) }))
            .filter(r => !Number.isNaN(r.hour))
            .sort((a, b) => a.hour - b.hour);
        } else {
          const xd = await get("/reports/olap", {
            report: "SALES", from: ddmmyyyy(from), to: ddmmyyyy(end),
            groupRow: "OpenDate.Typed", agr: "DishDiscountSumInt",
          });
          result.byDay = xmlRecords(xd, "r")
            .map(r => ({ day: String(r["OpenDate.Typed"] || "").slice(0, 10), sum: num(r.DishDiscountSumInt) }))
            .filter(r => r.day)
            .sort((a, b) => a.day.localeCompare(b.day));
        }
      } catch (_) {}
    } catch (e) {
      // Fallback: cash shifts of those days
      result.source = "cashshifts";
      result.olapError = String(e.message || e);
      const data = JSON.parse(await get("/v2/cashshifts/list", { openDateFrom: from, openDateTo: to, status: "ANY" }));
      let cash = 0, card = 0, credit = 0;
      for (const s of data) { result.total += num(s.payOrders); cash += num(s.salesCash); card += num(s.salesCard); credit += num(s.salesCredit); }
      result.byPayType = [{ name: "Cash", sum: cash }, { name: "Card", sum: card }, { name: "Credit", sum: credit }].filter(x => x.sum);
    }
    return result;
  });
}

// ---------- one payment type in detail (click on a row in Income now) ----------
// Every order paid with it: when, order number, the customer (B2B buyer), cashier, amount,
// the products sold — and for orders with a customer, our matching rs.ge waybill.
async function syrvePayType(env, from, to, name) {
  const filters = {
    "OpenDate.Typed": { filterType: "DateRange", periodType: "CUSTOM", from, to: nextDay(to), includeLow: true, includeHigh: false },
    PayTypes: { filterType: "IncludeValues", values: [name] },
    OrderDeleted: { filterType: "IncludeValues", values: ["NOT_DELETED"] },
  };
  const KEY = ["OpenDate.Typed", "OrderNum"];
  const keyOf = r => `${String(r["OpenDate.Typed"] || "").slice(0, 10)}#${r.OrderNum}`;

  const out = await withSyrve(env, async (get, post) => {
    const SUM = isMarketing(name) ? "DishSumInt" : "DishDiscountSumInt"; // marketing at menu price
    const olap = (fields, aggregates = [SUM]) =>
      post("/v2/reports/olap", { reportType: "SALES", buildSummary: false, groupByRowFields: fields, aggregateFields: aggregates, filters })
        .then(r => r.data || []);

    const orders = new Map();
    for (const r of await olap(KEY)) {
      orders.set(keyOf(r), { day: String(r["OpenDate.Typed"] || "").slice(0, 10), num: String(r.OrderNum ?? ""), time: "", customer: "", cashier: "", sum: num(r[SUM]), items: [] });
    }
    // Field names differ between Syrve versions: each extra column is asked separately,
    // so one the server doesn't know only leaves that column empty.
    const extra = async (field, apply) => {
      try { for (const r of await olap([...KEY, field])) { const o = orders.get(keyOf(r)); if (o && r[field] != null && r[field] !== "") apply(o, r[field]); } }
      catch (_) {}
    };
    await extra("CloseTime", (o, v) => { o.time = String(v).slice(11, 16); });
    await extra("Cashier", (o, v) => { o.cashier = String(v); });
    await extra("CreditUser", (o, v) => { o.customer = String(v); });
    await extra("Delivery.CustomerName", (o, v) => { o.customer = o.customer || String(v); });
    let itemsError = "";
    if (!isB2B(name)) { // B2B shows only orders and their waybills
      try {
        for (const r of await olap([...KEY, "DishName"], ["DishAmountInt", SUM])) {
          orders.get(keyOf(r))?.items.push({ name: r.DishName || "—", qty: num(r.DishAmountInt), sum: num(r[SUM]) });
        }
      } catch (e) { itemsError = String(e.message || e).slice(0, 200); }
    }
    return { orders: [...orders.values()], itemsError };
  });

  const orders = out.orders.sort((a, b) => (b.day + b.time).localeCompare(a.day + a.time) || Number(b.num) - Number(a.num));
  const result = { name, from, to, b2b: isB2B(name), total: Math.round(orders.reduce((a, o) => a + o.sum, 0) * 100) / 100, orders, itemsError: out.itemsError, waybills: null, waybillError: "" };

  // B2B only: look for the waybill we issued to that buyer on rs.ge
  if (isB2B(name) && orders.some(o => o.customer)) {
    if (!env.RSGE_SERVICE_USER || !env.RSGE_SERVICE_PASSWORD) result.waybillError = "rs.ge is not configured";
    else {
      try {
        const list = (await listOutgoingWaybills(env, addDaysIso(from, -1), [addDaysIso(to, 2), localDate(env)].sort()[0]))
          .filter(w => w.status !== "-1" && w.status !== "-2"); // deleted / cancelled
        const used = new Set();
        result.waybills = list.length;
        for (const o of orders.filter(x => x.customer).sort((a, b) => b.sum - a.sum)) {
          const near = list.filter(w => !used.has(w.id) && similar(w.buyerName, o.customer)
            && Math.abs(Date.parse(String(w.createDate || w.beginDate).slice(0, 10)) - Date.parse(o.day)) <= 2 * 86400000);
          // the closest amount wins
          near.sort((a, b) => Math.abs(a.fullAmount - o.sum) - Math.abs(b.fullAmount - o.sum));
          const w = near[0];
          if (w) { used.add(w.id); o.waybill = { number: w.number, amount: w.fullAmount, status: w.status, buyer: w.buyerName, date: String(w.createDate || "").slice(0, 10) }; }
          else o.waybill = null;
        }
      } catch (e) { result.waybillError = String(e.message || e).slice(0, 200); }
    }
  }
  return result;
}
const isB2B = name => /b2b/i.test(name);
const isMarketing = name => /მარკეტ|market|маркет/i.test(name);
const addDaysIso = (day, n) => { const d = new Date(day + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

// ---------- MONTHLY: last 12 months — income and the cost of the food sold ----------
// Same basis as Income now (Syrve sales without deleted orders, marketing not counted as income).
// cost = Syrve's cost price of everything sold, marketing included (that food was used too).
// Older Syrve versions fall back to cash shifts (income only, no cost).
async function syrveMonthly(env) {
  const now = nowLocal(env);
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
  const from = start.toISOString().slice(0, 10);
  const to = localDate(env);
  const fresh = () => {
    const months = {};
    for (let i = 0; i < 12; i++) {
      const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
      months[d.toISOString().slice(0, 7)] = { month: d.toISOString().slice(0, 7), income: 0, cash: 0, card: 0, credit: 0, shifts: 0, cost: null };
    }
    return months;
  };

  return withSyrve(env, async (get, post) => {
    let months = fresh();
    try {
      const filters = {
        "OpenDate.Typed": { filterType: "DateRange", periodType: "CUSTOM", from, to: nextDay(to), includeLow: true, includeHigh: false },
        OrderDeleted: { filterType: "IncludeValues", values: ["NOT_DELETED"] },
      };
      const olap = (fields, aggregates) => post("/v2/reports/olap", { reportType: "SALES", buildSummary: false, groupByRowFields: fields, aggregateFields: aggregates, filters })
        .then(r => r.data || []);
      for (const r of await olap(["OpenDate.Typed", "PayTypes"], ["DishDiscountSumInt"])) {
        const m = months[String(r["OpenDate.Typed"] || "").slice(0, 7)];
        const pay = String(r.PayTypes || "");
        if (!m || isMarketing(pay)) continue;
        const sum = num(r.DishDiscountSumInt);
        m.income += sum;
        if (/cash|нал|ნაღდ/i.test(pay)) m.cash += sum;
        else if (/card|карт|ბარათ|visa|master/i.test(pay)) m.card += sum;
        else m.credit += sum;
      }
      let costError = "";
      try {
        const rows = await olap(["OpenDate.Typed"], ["ProductCostBase.ProductCost"]);
        for (const m of Object.values(months)) m.cost = 0;
        for (const r of rows) {
          const m = months[String(r["OpenDate.Typed"] || "").slice(0, 7)];
          if (m) m.cost += num(r["ProductCostBase.ProductCost"]);
        }
      } catch (e) { costError = String(e.message || e).slice(0, 200); }
      return { months: Object.values(months), source: "olap2", costError };
    } catch (e) {
      months = fresh();
      const shifts = JSON.parse(await get("/v2/cashshifts/list", { openDateFrom: from, openDateTo: to, status: "ANY" }));
      for (const s of shifts) {
        const m = months[String(s.openDate || "").slice(0, 7)];
        if (!m) continue;
        m.income += num(s.payOrders);
        m.cash += num(s.salesCash);
        m.card += num(s.salesCard);
        m.credit += num(s.salesCredit);
        m.shifts += 1;
      }
      return { months: Object.values(months), source: "cashshifts", olap2Error: String(e.message || e).slice(0, 200), costError: "Syrve cost price is not available" };
    }
  });
}

// ---------- DEBTS: what we owe suppliers ----------
// Debt per supplier (tax ID) = goods received − our return waybills (rs.ge) − bank payments, in four views:
//   rs.ge:     active rs.ge waybills (confirmed + not yet confirmed; rejected / cancelled ones don't count).
//              THE debt: its total is shown on the Main page.
//   Syrve:     Syrve incoming invoices (syrveinv.js); Syrve's own balance is a grey comparison column.
//   Telegram:  waybills approved in the Telegram bot (debtsrc.js), plus a waybill-by-waybill comparison with rs.ge.
//   rs მოსული: the rs.ge goods lines by category (food / consumables / equipment / other); each supplier's
//              payments and returns are split between its categories by their share of its goods. Recipients the
//              CEO marks "not a supplier" can get an expense category (consumables / fixed assets / other /
//              outsource): their payments are listed there as "without a waybill" and never count as supplier payments.
// Everything counts from the bank "history from" date.
// Payments are not entered in Syrve, so Syrve's balance is the sum of all Syrve invoices.
async function syrveDebts(env) {
  const sign = Number(env.DEBT_SIGN ?? -1);
  const timestamp = nowLocal(env).toISOString().slice(0, 19); // yyyy-MM-ddTHH:mm:ss

  return withSyrve(env, async get => {
    const supXml = await get("/suppliers");
    const suppliers = {};
    for (const s of xmlRecords(supXml, "employee")) {
      if (!s.id || s.deleted === "true") continue;
      // the tax ID field name differs between Syrve versions — take the first one that looks like it
      const tinKey = Object.keys(s).find(k => /taxpayer|^inn$|tin$|taxcode|identificationnumber/i.test(k) && s[k]);
      suppliers[s.id.toLowerCase()] = { id: s.id.toLowerCase(), name: s.name || s.code || s.id, tin: tinKey ? s[tinKey].replace(/\s+/g, "") : "" };
    }
    const balances = JSON.parse(await get("/v2/reports/balance/counteragents", { timestamp }));
    const owed = {};
    for (const b of balances) {
      const id = (b.counteragent || "").toLowerCase();
      if (!id || !suppliers[id]) continue;
      owed[id] = (owed[id] || 0) + num(b.sum) * sign;
    }
    return { asOf: timestamp, suppliers: Object.values(suppliers), owed };
  });
}

// ---------- matching bank payments to suppliers ----------
const LEGAL = new Set(["შპს", "სს", "იმ", "ltd", "llc", "jsc", "inc", "co", "company", "კომპანია"]);
function norm(name) {
  return String(name || "").toLowerCase()
    .replace(/\./g, "")                           // "ა.მ.გ." → "ამგ", "შ.პ.ს." → "შპს"
    .replace(/[^\p{L}\p{N}]+/gu, " ")            // other punctuation → space
    .split(" ").filter(w => w.length > 1 && !LEGAL.has(w)) // drop legal forms and single letters
    .join(" ");
}
// Georgian → Latin, so "ნიკორა" and "Nikora" compare equal
const KA = { ა:"a",ბ:"b",გ:"g",დ:"d",ე:"e",ვ:"v",ზ:"z",თ:"t",ი:"i",კ:"k",ლ:"l",მ:"m",ნ:"n",ო:"o",პ:"p",ჟ:"zh",რ:"r",ს:"s",ტ:"t",უ:"u",ფ:"p",ქ:"k",ღ:"gh",ყ:"k",შ:"sh",ჩ:"ch",ც:"ts",ძ:"dz",წ:"ts",ჭ:"ch",ხ:"kh",ჯ:"j",ჰ:"h" };
const latin = s => s.replace(/[ა-ჰ]/g, c => KA[c] || c).replace(/kh/g, "k").replace(/ts/g, "c").replace(/[wq]/g, "k").replace(/x/g, "ks");
// Names are prepared once ("keys"), then compared cheaply many times.
function nameKey(name) {
  const n = norm(name);
  const l = latin(n);
  const words = w => new Set(w.split(" ").filter(x => x.length > 1));
  return { n, l, wn: words(n), wl: words(l) };
}
// strict: the same name after removing legal forms (Georgian or Latin spelling)
const sameKey = (A, B) => !!A.n && !!B.n && (A.n === B.n || A.l === B.l);
function overlap(x, y, X, Y) {
  if (!x || !y) return false;
  if (x === y) return true;
  if (x.length >= 3 && y.length >= 3 && (x.includes(y) || y.includes(x))) return true;
  if (!X.size || !Y.size) return false;
  let both = 0; for (const w of X) if (Y.has(w)) both++;
  return both / Math.min(X.size, Y.size) >= 0.6;
}
const similarKey = (A, B) => overlap(A.n, B.n, A.wn, B.wn) || overlap(A.l, B.l, A.wl, B.wl);
// convenience for one-off checks
const similar = (a, b) => similarKey(nameKey(a), nameKey(b));
const sameName = (a, b) => sameKey(nameKey(a), nameKey(b));

const isTreasury = r => String(r.bankCode || "").toUpperCase() === "TRESGE22" || /^GE\d{2}NB/i.test(r.iban || "") || /სახაზინო|treasury/i.test(r.name || "");

async function loadLinks(env) {
  const l = (await env.STORE.get(LINKS_KEY, "json")) || {};
  return { byTin: l.byTin || {}, byIban: l.byIban || {}, byTx: l.byTx || {}, comments: l.comments || {} };
}

// body: { scope: "tin" | "iban" | "once" | "tx", tin | iban | rk | txId, supplierId: target | null (forget), comment? }
async function saveReview(env, body) {
  const links = await loadLinks(env);
  const target = body.supplierId === null ? null : String(body.supplierId || "").toLowerCase();
  if (body.supplierId !== null && !target) return { error: "supplierId required" };
  if (target && target.startsWith("x:") && !EXPENSE_CATS.includes(target.slice(2))) return { error: "bad category" };
  let noteKey = "";
  if (body.scope === "once") {
    // only the payments we have now; future payments to this recipient will be asked about again
    const rk = String(body.rk || "");
    if (!rk) return { error: "rk required" };
    noteKey = "rk:" + rk;
    if (target === null) {
      for (const [id, v] of Object.entries(links.byTx)) if (v && v.rk === rk) delete links.byTx[id];
    } else {
      const settings = await loadBankSettings(env);
      for (const r of await loadRecipientPayments(env, settings.historyFrom, rk)) links.byTx[r[0]] = { to: target, cents: r[2], rk };
    }
  } else if (body.scope === "iban") {
    const iban = String(body.iban || "").trim().toUpperCase();
    if (!iban) return { error: "iban required" };
    noteKey = "iban:" + iban;
    if (target === null) delete links.byIban[iban]; else links.byIban[iban] = target;
  } else if (body.scope === "tin") {
    const tin = String(body.tin || "").trim();
    if (!tin) return { error: "tin required" };
    noteKey = "tin:" + tin;
    if (target === null) delete links.byTin[tin]; else links.byTin[tin] = target;
  } else {
    const txId = String(body.txId || "").trim();
    if (!txId) return { error: "txId required" };
    if (target === null) delete links.byTx[txId]; else links.byTx[txId] = target;
  }
  // a note on an expense ("სხვა ხარჯი: rent", …); dropped when the recipient is no longer an expense
  const comment = String(body.comment ?? "").trim().slice(0, 300);
  if (noteKey && target?.startsWith("x:") && comment) links.comments[noteKey] = comment;
  else if (noteKey && (!target?.startsWith("x:") || body.comment !== undefined)) delete links.comments[noteKey];
  await env.STORE.put(LINKS_KEY, JSON.stringify(links));
  await bumpVersion(env);
  return { ok: true };
}

async function buildDebts(env, syrve, tg) {
  const settings = await loadBankSettings(env);
  const state = await loadBankState(env);
  const configured = bankConfigured(env);
  const links = await loadLinks(env);
  const { recipients, agg } = (configured.bog || configured.tbc) ? await loadBankData(env) : { recipients: {}, agg: {} };

  // suppliers, prepared once, with a word index so each recipient is compared only with likely suppliers
  const sup = {};
  const supList = syrve.suppliers.map(s => { const x = { ...s, key: nameKey(s.name) }; sup[s.id] = x; return x; });
  const byTin = {};
  for (const s of supList) if (s.tin) (byTin[s.tin] = byTin[s.tin] || []).push(s);
  const index = new Map();
  supList.forEach((s, i) => { for (const w of [...s.key.wn, ...s.key.wl]) { if (!index.has(w)) index.set(w, new Set()); index.get(w).add(i); } });
  const common = Math.max(8, Math.ceil(supList.length * 0.15)); // a word shared by many suppliers says little
  const candidates = k => {
    const ws = [...k.wn, ...k.wl].filter(w => index.has(w));
    const rare = ws.filter(w => index.get(w).size <= common);
    const hit = new Set();
    for (const w of (rare.length ? rare : ws)) for (const i of index.get(w)) hit.add(i);
    return [...hit].map(i => supList[i]);
  };
  // rs.ge waybills: seller tax ID → seller name (PriceCheck's waybill log, then the Debts waybills)
  const { sellers, returns, waybills, goods } = await waybillTotals(env);
  const invoices = await invoiceTotals(env);
  const rsName = {};
  try { for (const r of await loadLog(env)) if (r.sellerTin && r.seller) rsName[r.sellerTin] = r.seller; } catch (_) {}
  for (const [tin, s] of Object.entries(sellers)) if (s.name) rsName[tin] = s.name;

  // A payment goes to a Syrve supplier (its id) or to an rs.ge seller that isn't in Syrve ("tin:<tax ID>").
  // Rows are per tax ID, so a Syrve supplier and the rs.ge seller with the same tax ID share one row.
  const valid = to => !!to && (!!sup[to] || /^tin:\S+$/.test(to));
  const rowKey = to => to.startsWith("tin:") ? to.slice(4) : (sup[to].tin || "s:" + to);

  // our own company: TBC doesn't flag transfers between our accounts, so recognise them by
  // our tax ID (seen as the sender on BOG, or COMPANY_TIN) and by our BOG account numbers
  const ownTins = new Set([String(env.COMPANY_TIN || "").trim(), ...Object.values(recipients).filter(r => r[4] && r[1]).map(r => r[1])].filter(Boolean));
  const ownIbans = new Set((settings.bogAccounts || []).map(x => x.toUpperCase()));
  const decide = rk => {
    const [name = "", tin = "", iban = "", bankCode = "", ownFlag = 0] = recipients[rk] || [];
    const own = ownFlag || (tin && ownTins.has(tin)) || (iban && ownIbans.has(iban.toUpperCase()));
    const byT = tin ? links.byTin[tin] : undefined;
    const forced = byT ?? (iban ? links.byIban[iban.toUpperCase()] : undefined);
    const scope = byT !== undefined ? "tin" : "iban";
    if (forced === "ignore") return { skip: true, unsorted: scope }; // "not a supplier", no category yet
    if (forced?.startsWith("x:")) return { skip: true, expense: forced.slice(2), scope };
    if (forced && valid(forced)) return { supplierId: forced };
    if (own || isTreasury({ name, iban, bankCode }) || (!tin && !iban)) return { skip: true }; // own transfers, taxes, fees
    if (tin && sellers[tin]) return { supplierId: "tin:" + tin }; // the seller's tax ID on our rs.ge waybills
    const k = nameKey(name);
    if (tin && byTin[tin]?.length === 1) {
      const s = byTin[tin][0];
      if (!name || similarKey(k, s.key) || (rsName[tin] && similarKey(nameKey(rsName[tin]), s.key))) return { supplierId: s.id };
      return { reason: "name_differs", suggestion: s.id };
    }
    if (tin && rsName[tin]) {
      const rk2 = nameKey(rsName[tin]);
      const c = [...new Set([...candidates(rk2), ...candidates(k)])].filter(s => (similarKey(s.key, rk2) || similarKey(s.key, k)) && (!s.tin || s.tin === tin));
      if (c.length === 1) return { supplierId: c[0].id };
      return { reason: c.length ? "several_matches" : "not_in_syrve", suggestion: c[0]?.id || null };
    }
    const near = candidates(k);
    const exact = near.filter(s => sameKey(s.key, k));
    const free = exact.filter(s => !s.tin || s.tin === tin);
    if (free.length === 1 && exact.length === 1) return { supplierId: free[0].id };
    if (exact.length && !free.length) return { reason: "tin_differs", suggestion: exact[0].id };
    const c = near.filter(s => similarKey(s.key, k));
    return { reason: c.length > 1 || exact.length > 1 ? "several_matches" : c.length ? "name_only" : "unknown", suggestion: (exact[0] || c[0])?.id || null };
  };

  // single-payment decisions ("only these payments"), grouped by recipient
  const txByRk = {};
  for (const v of Object.values(links.byTx)) if (v && typeof v === "object" && v.rk) (txByRk[v.rk] = txByRk[v.rk] || []).push(v);

  const paid = {};
  const review = [];
  // payments to recipients the CEO marked "not a supplier": with a category (expenses) or still without one (unsorted)
  const expenses = Object.fromEntries(EXPENSE_CATS.map(k => [k, {}]));
  const unsorted = {};
  const note = (into, rk, scope, n, amount, last, purpose) => {
    const [name = "", tin = "", iban = ""] = recipients[rk] || [];
    const key = scope === "tin" ? "tin:" + tin : scope === "iban" ? "iban:" + iban.toUpperCase() : "rk:" + rk;
    const x = into[key] = into[key] || { rk, scope, name, tin, iban, count: 0, amount: 0, last, purpose, comment: links.comments[key] || "" };
    x.count += n;
    x.amount = Math.round((x.amount + amount) * 100) / 100;
    if (last > x.last) { x.last = last; x.purpose = purpose; }
  };
  let ignored = 0, matched = 0, reviewAmount = 0, payments = 0;
  for (const [rk, a] of Object.entries(agg)) {
    const [count, tetri, last, purpose, banks] = a;
    payments += count;
    const singles = txByRk[rk] || [];
    for (const v of singles) {
      if (v.to === "ignore") { ignored++; note(unsorted, rk, "once", 1, v.cents / 100, last, purpose); }
      else if (v.to?.startsWith("x:") && expenses[v.to.slice(2)]) { ignored++; note(expenses[v.to.slice(2)], rk, "once", 1, v.cents / 100, last, purpose); }
      else if (valid(v.to)) { paid[v.to] = (paid[v.to] || 0) + v.cents / 100; matched++; }
    }
    const restCount = count - singles.length;
    const restAmount = (tetri - singles.reduce((x, v) => x + v.cents, 0)) / 100;
    if (restCount <= 0) continue;
    const d = decide(rk);
    if (d.skip) {
      ignored += restCount;
      if (d.unsorted) note(unsorted, rk, d.unsorted, restCount, restAmount, last, purpose);
      else if (d.expense && expenses[d.expense]) note(expenses[d.expense], rk, d.scope, restCount, restAmount, last, purpose);
      continue;
    }
    if (d.supplierId) { paid[d.supplierId] = (paid[d.supplierId] || 0) + restAmount; matched += restCount; continue; }
    reviewAmount += restAmount;
    const [name = "", tin = "", iban = ""] = recipients[rk] || [];
    review.push({ rk, name, tin, iban, count: restCount, amount: Math.round(restAmount * 100) / 100, last, purpose,
      bank: banks === 3 ? "BOG + TBC" : banks === 2 ? "TBC" : "BOG", reason: d.reason, suggestion: d.suggestion, rsName: rsName[tin] || "" });
  }

  // "rs მოსული": the goods lines of the active rs.ge waybills, per product and per supplier and category
  const r2 = x => Math.round(x * 100) / 100;
  const cat = categorizer(await loadCategories(env), await loadBasePrices(env));
  const products = {}, bySup = {};
  for (const [tin, lines] of Object.entries(goods)) {
    for (const [name, amount] of Object.entries(lines)) {
      const c = cat(name);
      const p = products[c.key] = products[c.key] || { key: c.key, name, cat: c.cat, manual: c.manual, amount: 0, by: {} };
      p.amount = r2(p.amount + amount);
      p.by[tin] = r2((p.by[tin] || 0) + amount);
      const g = bySup[tin] = bySup[tin] || { total: 0 };
      g[c.cat] = r2((g[c.cat] || 0) + amount);
      g.total = r2(g.total + amount);
    }
  }

  // one row per tax ID (Syrve suppliers without a tax ID get their own row, so do Telegram sellers without one)
  const rows = {};
  const row = key => rows[key] = rows[key] || { id: key, name: "", tin: /^[sn]:/.test(key) ? "" : key, rsName: "",
    confirmed: 0, unconfirmed: 0, rejected: 0, nConfirmed: 0, nUnconfirmed: 0, nRejected: 0, returns: 0, nReturns: 0, paid: 0,
    syrveBalance: null, inv: 0, nInv: 0, tg: 0, nTg: 0 };
  for (const [tin, s] of Object.entries(sellers)) { const x = row(tin); Object.assign(x, s, { name: "", rsName: s.name }); }
  for (const tin of Object.keys(bySup)) row(tin);
  for (const [tin, s] of Object.entries(returns)) { const x = row(tin); x.returns = s.amount; x.nReturns = s.n; if (!x.rsName) x.rsName = s.name; }
  for (const s of syrve.suppliers) {
    const owed = syrve.owed[s.id];
    const x = s.tin || owed ? row(rowKey(s.id)) : rows[rowKey(s.id)];
    if (!x) continue;
    if (!x.name) x.name = s.name; // Syrve's name: the one the team knows
    if (owed) x.syrveBalance = r2((x.syrveBalance || 0) + owed);
  }
  // Syrve incoming invoices (a supplier Syrve no longer lists keeps its own row)
  for (const [id, v] of Object.entries(invoices.suppliers)) {
    const x = row(sup[id] ? rowKey(id) : "s:" + id);
    if (!x.name && sup[id]) x.name = sup[id].name;
    x.inv = r2(x.inv + v.amount);
    x.nInv += v.n;
  }
  // waybills approved in Telegram, from the bank start date; a seller without a tax ID is found by name
  const tgKey = w => {
    if (w.tin) return w.tin;
    const k = nameKey(w.seller);
    const s = supList.find(s => sameKey(s.key, k));
    if (s) return rowKey(s.id);
    return Object.keys(rsName).find(tin => sameKey(nameKey(rsName[tin]), k)) || "n:" + (k.n || w.seller || "?");
  };
  const tgList = (tg?.list || []).filter(w => !settings.historyFrom || !w.day || w.day >= settings.historyFrom).map(w => ({ ...w, key: tgKey(w) }));
  for (const w of tgList) {
    const x = row(w.key);
    if (!x.rsName && w.seller) x.rsName = w.seller;
    x.tg = r2(x.tg + w.total);
    x.nTg++;
  }
  for (const [to, amount] of Object.entries(paid)) { const x = row(rowKey(to)); x.paid = r2(x.paid + amount); }

  const list = Object.values(rows).map(x => {
    const active = r2(x.confirmed + x.unconfirmed);
    const left = v => r2(v - x.returns - x.paid);
    return { ...x, name: x.name || x.rsName || rsName[x.tin] || x.tin || x.id, active, nActive: x.nConfirmed + x.nUnconfirmed,
      owed: left(active), owedInv: left(x.inv), owedTg: left(x.tg) };
  }).filter(x => x.active || x.rejected || x.returns || x.paid || x.syrveBalance || x.inv || x.tg || bySup[x.tin]).sort((a, b) => b.owed - a.owed);
  const sumPos = f => r2(list.reduce((a, x) => a + Math.max(0, f(x)), 0));
  const nameOf = new Map(list.map(x => [x.id, x.name]));
  const nameFor = key => nameOf.get(key) || rsName[key] || key;

  // categories: each supplier's payments and returns split by its goods' shares; its debt (if any) the same way
  const catTotals = Object.fromEntries(CATEGORIES.map(k => [k, { amount: 0, paid: 0, returns: 0, owed: 0, n: 0 }]));
  const catSuppliers = [];
  let unsplit = 0; // payments to suppliers without rs.ge goods
  for (const x of list) {
    const g = x.tin && bySup[x.tin];
    if (!g || !g.total) { unsplit = r2(unsplit + x.paid); continue; }
    const owed = r2(g.total - x.returns - x.paid);
    const e = { id: x.id, name: x.name, tin: x.tin, total: g.total, paid: x.paid, returns: x.returns, owed, c: {} };
    for (const k of CATEGORIES) {
      if (!g[k]) continue;
      const share = g[k] / g.total;
      const v = e.c[k] = { amount: g[k], share: Math.round(share * 1000) / 10, paid: r2(x.paid * share), returns: r2(x.returns * share), owed: r2(Math.max(0, owed) * share) };
      const t = catTotals[k];
      t.amount = r2(t.amount + v.amount); t.paid = r2(t.paid + v.paid); t.returns = r2(t.returns + v.returns); t.owed = r2(t.owed + v.owed); t.n++;
    }
    catSuppliers.push(e);
  }
  catSuppliers.sort((a, b) => b.owed - a.owed);
  const productList = Object.values(products).sort((a, b) => b.amount - a.amount).slice(0, 3000).map(p => ({
    key: p.key, name: p.name, cat: p.cat, manual: p.manual, amount: p.amount,
    sellers: Object.entries(p.by).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([tin]) => nameFor(tin)) }));

  // Telegram approvals vs the active rs.ge waybills, waybill by waybill, from the day the bot saw its first waybill
  const compare = { since: "", onlyTg: [], onlyRs: [], diff: [], suppliers: [], counts: { onlyTg: 0, onlyRs: 0, diff: 0 } };
  if (tg?.since) {
    const since = compare.since = [tg.since, settings.historyFrom || ""].sort().pop();
    const rsBy = new Map(waybills.map(w => [w[0], w]));
    const tgBy = new Set(tgList.map(w => w.number));
    const per = {};
    const add = (key, field, amount) => { const p = per[key] = per[key] || { key, tg: 0, rs: 0, nTg: 0, nRs: 0 }; p[field] = r2(p[field] + amount); p[field === "tg" ? "nTg" : "nRs"]++; };
    for (const w of tgList) {
      add(w.key, "tg", w.total);
      const r = rsBy.get(w.number);
      if (!r || r[4] === -1) compare.onlyTg.push({ number: w.number, name: nameFor(w.key), amount: w.total, day: w.day, why: r ? "rejected" : "missing" });
      else if (Math.abs(r[2] - w.total) >= 0.01) compare.diff.push({ number: w.number, name: nameFor(r[1]), tg: w.total, rs: r[2], day: w.day });
    }
    for (const r of waybills) {
      if (r[4] === -1 || !r[3] || r[3] < since) continue;
      add(r[1], "rs", r[2]);
      if (!tgBy.has(r[0])) compare.onlyRs.push({ number: r[0], name: nameFor(r[1]), amount: r[2], day: r[3] });
    }
    compare.onlyRs.sort((a, b) => b.day.localeCompare(a.day));
    compare.counts = { onlyTg: compare.onlyTg.length, onlyRs: compare.onlyRs.length, diff: compare.diff.length };
    compare.onlyRs = compare.onlyRs.slice(0, 300);
    compare.suppliers = Object.values(per).map(p => ({ ...p, name: nameFor(p.key), gap: r2(p.rs - p.tg) }))
      .sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));
  }

  // the review list's supplier choices: Syrve suppliers, then rs.ge sellers that aren't in Syrve
  const syrveTins = new Set(syrve.suppliers.map(s => s.tin).filter(Boolean));
  const options = [
    ...syrve.suppliers.map(s => ({ id: s.id, name: s.name })),
    ...Object.entries(sellers).filter(([tin]) => !syrveTins.has(tin)).map(([tin, s]) => ({ id: "tin:" + tin, name: `${s.name || tin} (rs.ge ${tin})` })),
  ].sort((a, b) => a.name.localeCompare(b.name));
  const targetName = to => to === "ignore" || to.startsWith("x:") ? "" : sup[to]?.name || (to.startsWith("tin:") ? rsName[to.slice(4)] || to.slice(4) : to);

  review.sort((a, b) => b.amount - a.amount); // biggest first: one decision clears the most money
  return {
    asOf: syrve.asOf || "",
    syrveError: syrve.error || "",
    total: sumPos(x => x.owed), // the rs.ge view: shown on the Main page
    totals: { rs: sumPos(x => x.owed), syrve: sumPos(x => x.owedInv), tg: sumPos(x => x.owedTg),
      cats: r2(CATEGORIES.reduce((a, k) => a + catTotals[k].owed, 0)) },
    suppliers: list,
    cats: { totals: catTotals, suppliers: catSuppliers, products: productList, unsplit,
      // not suppliers: payments without a waybill per expense category, and those still without a category
      expenses: Object.fromEntries(EXPENSE_CATS.map(k => [k, Object.values(expenses[k]).sort((a, b) => b.amount - a.amount)])),
      expenseTotals: Object.fromEntries(EXPENSE_CATS.map(k => [k, r2(Object.values(expenses[k]).reduce((a, x) => a + x.amount, 0))])),
      unsorted: Object.values(unsorted).sort((a, b) => b.amount - a.amount) },
    compare,
    tgSince: tg?.since || "",
    review: { count: review.length, payments: review.reduce((a, x) => a + x.count, 0), amount: Math.round(reviewAmount * 100) / 100, items: review.slice(0, 150) },
    options,
    linkedTins: [
      ...Object.entries(links.byTin).map(([tin, to]) => ({ kind: "tin", key: tin, tin, to, name: targetName(to) })),
      ...Object.entries(links.byIban).map(([iban, to]) => ({ kind: "iban", key: iban, tin: iban, to, name: targetName(to) })),
    ],
    bank: { configured, settings, lastSyncAt: state.lastSyncAt, errors: state.errors, notes: state.notes, cursors: state.cursors, payments, matched, ignored },
  };
}

// ---------- EMPLOYEES: schedule + attendance for a month ----------
async function syrveEmployees(env, month) {
  const [y, m] = month.split("-").map(Number);
  const from = `${month}-01`;
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const to = `${month}-${String(last).padStart(2, "0")}`;

  return withSyrve(env, async get => {
    const empXml = await get("/employees");
    const people = {};
    for (const e of xmlRecords(empXml, "employee")) {
      if (!e.id) continue;
      const name = e.name || [e.firstName, e.lastName].filter(Boolean).join(" ") || e.code || e.id;
      people[e.id.toLowerCase()] = { name, role: e.mainRoleCode || "", deleted: e.deleted === "true" };
    }

    const schXml = await get("/employees/schedule/", { from, to, withPaymentDetails: "false", revisionFrom: "-1" });
    const shifts = xmlRecords(schXml, "schedule").map(s => ({
      employeeId: (s.employeeId || "").toLowerCase(),
      from: s.dateFrom || "", to: s.dateTo || "",
      type: s.scheduleTypeCode || "",
      department: s.departmentName || "",
    }));

    let attendance = [];
    try {
      const attXml = await get("/employees/attendance/", { from, to, withPaymentDetails: "false", revisionFrom: "-1" });
      attendance = xmlRecords(attXml, "attendance").map(a => ({
        employeeId: (a.employeeId || "").toLowerCase(),
        from: a.dateFrom || "", to: a.dateTo || "",
      }));
    } catch (_) {}

    const nameOf = id => (people[id] ? people[id].name : "—");
    return {
      month, today: localDate(env),
      shifts: shifts.map(s => ({ ...s, name: nameOf(s.employeeId) })),
      attendance: attendance.map(a => ({ ...a, name: nameOf(a.employeeId) })),
    };
  });
}
