// dashboard.js — the Dashboard's server side (costs, ratings, tasks + Syrve data).
// worker.js sends every /api/dash/... request here, after checking the CEO password login.
//
// Storage: the same KV as PriceCheck (binding STORE), keys start with "dash:".
// Syrve secrets (Cloudflare → this Worker → Settings → Variables and Secrets, type Secret):
//   SYRVE_URL       https://focacceria.syrve.online
//   SYRVE_LOGIN     Syrve Office user
//   SYRVE_PASSWORD  that user's password (plain — it is hashed here)
// Optional secrets: TZ_OFFSET (hours from UTC, default 4), DEBT_SIGN (default -1)

import { listOutgoingWaybills } from "./rsge.js";
import { bankConfigured, loadBankSettings, saveBankSettings, loadBankState, loadBankData, loadRecipientPayments, syncStep, bumpVersion, loadVersion } from "./bank.js";
import { loadLog } from "./store.js";

const DATA_KEYS = ["fixed", "variable", "ratings", "tasks"];
const LINKS_KEY = "dash:bank:links"; // { byTin, byIban, byTx: { key: supplierId | "ignore" } } — the CEO's remembered decisions
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
      if (parts[1] === "live" || parts[1] === "paytype") {
        // a date range (inclusive); today by default. Ranges that include today are refreshed every minute.
        const today = localDate(env);
        const day = v => (/^\d{4}-\d{2}-\d{2}$/.test(v || "") ? v : "");
        const from = day(url.searchParams.get("from")) || today;
        const to = [day(url.searchParams.get("to")) || from, today].sort()[0];
        if (from > to) return json({ error: "bad range" }, 400);
        const ttl = to >= today ? 60 : 3600;
        if (parts[1] === "live") return json(await cached(env, `live:${from}:${to}`, ttl, fresh, () => syrveLive(env, from, to)));
        const name = String(url.searchParams.get("name") || "").slice(0, 100);
        if (!name) return json({ error: "name required" }, 400);
        return json(await cached(env, `pay:${from}:${to}:${name}`, ttl, fresh, () => syrvePayType(env, from, to, name)));
      }
      if (parts[1] === "monthly") return json(await cached(env, "monthly", 3600, fresh, () => syrveMonthly(env)));
      if (parts[1] === "debts") {
        const syrve = await cached(env, "debts-syrve", 900, fresh, () => syrveDebts(env));
        // reuse the last result until something changes (bank sync, a CEO decision, Syrve refresh)
        const version = `${syrve._at}|${await loadVersion(env)}`;
        const saved = await env.STORE.get("dash:cache:debts-result");
        if (saved && saved.startsWith(version + "\n")) {
          return new Response(saved.slice(version.length + 1), { headers: JSON_HEADERS });
        }
        const body = JSON.stringify(await buildDebts(env, syrve));
        await env.STORE.put("dash:cache:debts-result", version + "\n" + body);
        return new Response(body, { headers: JSON_HEADERS });
      }
      if (parts[1] === "employees") {
        const month = url.searchParams.get("month") || localDate(env).slice(0, 7);
        if (!/^\d{4}-\d{2}$/.test(month)) return json({ error: "bad month" }, 400);
        return json(await cached(env, "emp:" + month, 300, fresh, () => syrveEmployees(env, month)));
      }
    }
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
async function cached(env, name, ttl, fresh, fn) {
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

  return withSyrve(env, async get => {
    const result = { date: from, from, to, total: 0, orders: 0, byPayType: [], byHour: [], byDay: [], source: "olap" };

    // 1) OLAP sales by payment type
    try {
      const xml = await get("/reports/olap", {
        report: "SALES", from: ddmmyyyy(from), to: ddmmyyyy(end),
        groupRow: "PayTypes", agr: ["DishDiscountSumInt", "UniqOrderId.OrdersCount"],
      });
      const rows = xmlRecords(xml, "r");
      for (const r of rows) {
        const sum = num(r.DishDiscountSumInt);
        result.byPayType.push({ name: r.PayTypes || "—", sum });
        result.total += sum;
        result.orders += num(r["UniqOrderId.OrdersCount"]);
      }
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
    const olap = (fields, aggregates = ["DishDiscountSumInt"]) =>
      post("/v2/reports/olap", { reportType: "SALES", buildSummary: false, groupByRowFields: fields, aggregateFields: aggregates, filters })
        .then(r => r.data || []);

    const orders = new Map();
    for (const r of await olap(KEY)) {
      orders.set(keyOf(r), { day: String(r["OpenDate.Typed"] || "").slice(0, 10), num: String(r.OrderNum ?? ""), time: "", customer: "", cashier: "", sum: num(r.DishDiscountSumInt), items: [] });
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
    try {
      for (const r of await olap([...KEY, "DishName"], ["DishAmountInt", "DishDiscountSumInt"])) {
        orders.get(keyOf(r))?.items.push({ name: r.DishName || "—", qty: num(r.DishAmountInt), sum: num(r.DishDiscountSumInt) });
      }
    } catch (e) { itemsError = String(e.message || e).slice(0, 200); }
    return { orders: [...orders.values()], itemsError };
  });

  const orders = out.orders.sort((a, b) => (b.day + b.time).localeCompare(a.day + a.time) || Number(b.num) - Number(a.num));
  const result = { name, from, to, total: Math.round(orders.reduce((a, o) => a + o.sum, 0) * 100) / 100, orders, itemsError: out.itemsError, waybills: null, waybillError: "" };

  // B2B: look for the waybill we issued to that buyer on rs.ge
  if (orders.some(o => o.customer)) {
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
const addDaysIso = (day, n) => { const d = new Date(day + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

// ---------- MONTHLY: last 12 months from cash shifts ----------
async function syrveMonthly(env) {
  const now = nowLocal(env);
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
  const from = start.toISOString().slice(0, 10);
  const to = localDate(env);

  return withSyrve(env, async get => {
    const shifts = JSON.parse(await get("/v2/cashshifts/list", { openDateFrom: from, openDateTo: to, status: "ANY" }));
    const months = {};
    for (let i = 0; i < 12; i++) {
      const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
      months[d.toISOString().slice(0, 7)] = { month: d.toISOString().slice(0, 7), income: 0, cash: 0, card: 0, credit: 0, shifts: 0 };
    }
    for (const s of shifts) {
      const m = String(s.openDate || "").slice(0, 7);
      if (!months[m]) continue;
      months[m].income += num(s.payOrders);
      months[m].cash += num(s.salesCash);
      months[m].card += num(s.salesCard);
      months[m].credit += num(s.salesCredit);
      months[m].shifts += 1;
    }
    return { months: Object.values(months) };
  });
}

// ---------- DEBTS: what we owe suppliers ----------
// Syrve part: every supplier (with tax ID) and what Syrve says we owe them.
// Payments are not entered in Syrve, so this is the sum of all invoices; bank payments are subtracted in buildDebts.
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
  return { byTin: l.byTin || {}, byIban: l.byIban || {}, byTx: l.byTx || {} };
}

// body: { txId, tin, supplierId | "ignore" | null, scope: "tin" | "tx" }
async function saveReview(env, body) {
  const links = await loadLinks(env);
  const target = body.supplierId === null ? null : String(body.supplierId || "").toLowerCase();
  if (body.supplierId !== null && !target) return { error: "supplierId required" };
  if (body.scope === "once") {
    // only the payments we have now; future payments to this recipient will be asked about again
    const rk = String(body.rk || "");
    if (!rk || target === null) return { error: "rk and supplierId required" };
    const settings = await loadBankSettings(env);
    for (const r of await loadRecipientPayments(env, settings.historyFrom, rk)) links.byTx[r[0]] = { to: target, cents: r[2], rk };
  } else if (body.scope === "iban") {
    const iban = String(body.iban || "").trim().toUpperCase();
    if (!iban) return { error: "iban required" };
    if (target === null) delete links.byIban[iban]; else links.byIban[iban] = target;
  } else if (body.scope === "tin") {
    const tin = String(body.tin || "").trim();
    if (!tin) return { error: "tin required" };
    if (target === null) delete links.byTin[tin]; else links.byTin[tin] = target;
  } else {
    const txId = String(body.txId || "").trim();
    if (!txId) return { error: "txId required" };
    if (target === null) delete links.byTx[txId]; else links.byTx[txId] = target;
  }
  await env.STORE.put(LINKS_KEY, JSON.stringify(links));
  await bumpVersion(env);
  return { ok: true };
}

async function buildDebts(env, syrve) {
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
  // rs.ge waybills: seller tax ID → seller name
  const rsName = {};
  try { for (const r of await loadLog(env)) if (r.sellerTin && r.seller) rsName[r.sellerTin] = r.seller; } catch (_) {}

  const decide = rk => {
    const [name = "", tin = "", iban = "", bankCode = "", own = 0] = recipients[rk] || [];
    const forced = (tin ? links.byTin[tin] : undefined) ?? (iban ? links.byIban[iban.toUpperCase()] : undefined);
    if (forced === "ignore") return { skip: true };
    if (forced && sup[forced]) return { supplierId: forced };
    if (own || isTreasury({ name, iban, bankCode }) || (!tin && !iban)) return { skip: true }; // own transfers, taxes, fees
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
  let ignored = 0, matched = 0, reviewAmount = 0, payments = 0;
  for (const [rk, a] of Object.entries(agg)) {
    const [count, tetri, last, purpose, banks] = a;
    payments += count;
    const singles = txByRk[rk] || [];
    for (const v of singles) {
      if (v.to === "ignore") ignored++;
      else if (sup[v.to]) { paid[v.to] = (paid[v.to] || 0) + v.cents / 100; matched++; }
    }
    const restCount = count - singles.length;
    const restAmount = (tetri - singles.reduce((x, v) => x + v.cents, 0)) / 100;
    if (restCount <= 0) continue;
    const d = decide(rk);
    if (d.skip) { ignored += restCount; continue; }
    if (d.supplierId) { paid[d.supplierId] = (paid[d.supplierId] || 0) + restAmount; matched += restCount; continue; }
    reviewAmount += restAmount;
    const [name = "", tin = "", iban = ""] = recipients[rk] || [];
    review.push({ rk, name, tin, iban, count: restCount, amount: Math.round(restAmount * 100) / 100, last, purpose,
      bank: banks === 3 ? "BOG + TBC" : banks === 2 ? "TBC" : "BOG", reason: d.reason, suggestion: d.suggestion, rsName: rsName[tin] || "" });
  }

  const ids = new Set([...Object.keys(syrve.owed), ...Object.keys(paid)]);
  const list = [...ids].filter(id => sup[id]).map(id => {
    const invoices = Math.round((syrve.owed[id] || 0) * 100) / 100;
    const p = Math.round((paid[id] || 0) * 100) / 100;
    return { id, name: sup[id].name, tin: sup[id].tin, invoices, paid: p, owed: Math.round((invoices - p) * 100) / 100 };
  }).filter(x => Math.abs(x.owed) >= 0.01 || x.paid > 0).sort((a, b) => b.owed - a.owed);

  review.sort((a, b) => b.amount - a.amount); // biggest first: one decision clears the most money
  return {
    asOf: syrve.asOf,
    total: Math.round(list.reduce((a, x) => a + (x.owed > 0 ? x.owed : 0), 0) * 100) / 100,
    suppliers: list,
    review: { count: review.length, payments: review.reduce((a, x) => a + x.count, 0), amount: Math.round(reviewAmount * 100) / 100, items: review.slice(0, 150) },
    options: syrve.suppliers.map(s => ({ id: s.id, name: s.name })).sort((a, b) => a.name.localeCompare(b.name)),
    linkedTins: [
      ...Object.entries(links.byTin).map(([tin, to]) => ({ kind: "tin", key: tin, tin, to, name: to === "ignore" ? "" : (sup[to]?.name || to) })),
      ...Object.entries(links.byIban).map(([iban, to]) => ({ kind: "iban", key: iban, tin: iban, to, name: to === "ignore" ? "" : (sup[to]?.name || to) })),
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
