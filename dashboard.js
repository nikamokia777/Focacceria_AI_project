// dashboard.js — the Dashboard's server side (costs, ratings, tasks + Syrve data).
// worker.js sends every /api/dash/... request here, after checking the CEO password login.
//
// Storage: the same KV as PriceCheck (binding STORE), keys start with "dash:".
// Syrve secrets (Cloudflare → this Worker → Settings → Variables and Secrets, type Secret):
//   SYRVE_URL       https://focacceria.syrve.online
//   SYRVE_LOGIN     Syrve Office user
//   SYRVE_PASSWORD  that user's password (plain — it is hashed here)
// Optional secrets: TZ_OFFSET (hours from UTC, default 4),
//   COMPANY_TIN (our tax ID — transfers to it are between our own accounts, not supplier payments)

import { listOutgoingWaybills } from "./rsge.js";
import { buildMenu, buildDish, buildMenuMonthly } from "./menu.js";
import { bankConfigured, loadBankSettings, saveBankSettings, loadBankState, syncStep, bumpVersion, loadVersion } from "./bank.js";
import { syncWaybills } from "./waybills.js";
import { buildDebts, saveDecision, dropOldDebtsData } from "./debts.js";
import { similar } from "./names.js";
import { runProbe } from "./rsprobe.js";

// staff = { employees: [{ id, name, role, pay: "hour" | "shift" | "month", rate, pid, iban, from, active }],
//           shifts: [{ id, emp, day: "YYYY-MM-DD", from: "HH:MM", to: "HH:MM", ot: overtime ₾, note }] } — typed in the Employees tab
const DATA_KEYS = ["fixed", "variable", "ratings", "tasks", "staff"];
const DEBTS_RESULT_KEY = "dash:cache:debts-result5"; // the last Debts answer, kept until the data version changes
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
        if (parts[1] === "staff") await bumpVersion(env); // Debts leaves employees' salaries out
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
        // rs.ge waybills: a little of what is missing per request (the page asks again while something
        // is missing); Refresh also re-reads the current month.
        const waybills = await syncWaybills(env, { budget: 24, current: fresh });
        // reuse the last result until something changes (bank sync, rs.ge waybills, a CEO decision, employees)
        const version = await loadVersion(env);
        const saved = await env.STORE.get(DEBTS_RESULT_KEY);
        let result;
        if (saved && saved.startsWith(version + "\n")) result = JSON.parse(saved.slice(version.length + 1));
        else {
          await dropOldDebtsData(env);
          result = await buildDebts(env);
          await env.STORE.put(DEBTS_RESULT_KEY, version + "\n" + JSON.stringify(result));
        }
        // The sync states change on every sync, even when the debts don't: always send the
        // current ones. (A stale copy made the page think the bank was behind and sync forever.)
        const state = await loadBankState(env);
        Object.assign(result.bank, { lastSyncAt: state.lastSyncAt, errors: state.errors, notes: state.notes, cursors: state.cursors });
        result.waybills = waybills;
        return json(result);
      }
      if (parts[1] === "employees") {
        const month = url.searchParams.get("month") || localDate(env).slice(0, 7);
        if (!/^\d{4}-\d{2}$/.test(month)) return json({ error: "bad month" }, 400);
        return json(await cached(env, "emp:" + month, 300, fresh, () => syrveEmployees(env, month)));
      }
    }
    // Debts: the CEO's answers (debts.js saveDecision)
    if (parts[0] === "debts" && parts[1] === "decide" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const r = await saveDecision(env, body || {});
      return json(r, r.error ? 400 : 200);
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
