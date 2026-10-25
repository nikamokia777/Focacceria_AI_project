// dashboard.js — the Dashboard's server side (costs, ratings, tasks + Syrve data).
// worker.js sends every /api/dash/... request here, after checking the CEO password login.
//
// Storage: the same KV as PriceCheck (binding STORE), keys start with "dash:".
// Syrve secrets (Cloudflare → this Worker → Settings → Variables and Secrets, type Secret):
//   SYRVE_URL       https://focacceria.syrve.online
//   SYRVE_LOGIN     Syrve Office user
//   SYRVE_PASSWORD  that user's password (plain — it is hashed here)
// Optional secrets: TZ_OFFSET (hours from UTC, default 4), DEBT_SIGN (default -1)

import { bankConfigured, loadBankSettings, saveBankSettings, loadBankState, loadPayments, syncStep } from "./bank.js";
import { loadLog } from "./store.js";

const DATA_KEYS = ["fixed", "variable", "ratings", "tasks"];
const LINKS_KEY = "dash:bank:links"; // { byTin: { tin: supplierId | "ignore" }, byTx: { txId: supplierId | "ignore" } }
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
      if (request.method === "GET") return json({ value: await env.STORE.get(kvKey, "json") });
      if (request.method === "PUT") {
        const body = await request.json().catch(() => null);
        if (!body || !("value" in body)) return json({ error: "Expected { value }" }, 400);
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
      if (parts[1] === "live") return json(await cached(env, "live", 60, fresh, () => syrveLive(env)));
      if (parts[1] === "monthly") return json(await cached(env, "monthly", 3600, fresh, () => syrveMonthly(env)));
      if (parts[1] === "debts") {
        const syrve = await cached(env, "debts-syrve", 900, fresh, () => syrveDebts(env));
        // keep the bank up to date: one small sync step if the last one is older than 10 minutes
        const cfg = bankConfigured(env);
        if (cfg.bog || cfg.tbc) {
          const st = await loadBankState(env);
          if (fresh || !st.lastSyncAt || Date.now() - Date.parse(st.lastSyncAt) > 10 * 60 * 1000) {
            try { await syncStep(env); } catch (_) {}
          }
        }
        return json(await buildDebts(env, syrve));
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
function nowLocal(env) {
  const off = Number(env.TZ_OFFSET ?? 4);
  return new Date(Date.now() + off * 3600000); // read with getUTC* methods
}
function localDate(env, d = nowLocal(env)) {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}
function ddmmyyyy(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

// ---------- minimal XML reading (Syrve answers are flat XML) ----------
function decode(s) {
  return s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'").replace(/&amp;/g, "&");
}
// Returns an array of {child: text} objects for every <tag>...</tag> record.
function xmlRecords(xml, tag) {
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
async function withSyrve(env, fn) {
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

  try {
    return await fn(get);
  } finally {
    // Always log out so the API license is freed.
    try { await fetch(`${base}/logout?key=${key}`); } catch (_) {}
  }
}

const num = v => (v === undefined || v === null || v === "" ? 0 : Number(v) || 0);

// ---------- LIVE: today's sales ----------
async function syrveLive(env) {
  const today = localDate(env);
  const tomorrowD = nowLocal(env); tomorrowD.setUTCDate(tomorrowD.getUTCDate() + 1);
  const tomorrow = localDate(env, tomorrowD);

  return withSyrve(env, async get => {
    const result = { date: today, total: 0, orders: 0, byPayType: [], byHour: [], source: "olap" };

    // 1) OLAP sales by payment type
    try {
      const xml = await get("/reports/olap", {
        report: "SALES", from: ddmmyyyy(today), to: ddmmyyyy(tomorrow),
        groupRow: "PayTypes", agr: ["DishDiscountSumInt", "UniqOrderId.OrdersCount"],
      });
      const rows = xmlRecords(xml, "r");
      for (const r of rows) {
        const sum = num(r.DishDiscountSumInt);
        result.byPayType.push({ name: r.PayTypes || "—", sum });
        result.total += sum;
        result.orders += num(r["UniqOrderId.OrdersCount"]);
      }
      // 2) by hour (optional — ignore if the field isn't supported)
      try {
        const xh = await get("/reports/olap", {
          report: "SALES", from: ddmmyyyy(today), to: ddmmyyyy(tomorrow),
          groupRow: "HourOpen", agr: "DishDiscountSumInt",
        });
        result.byHour = xmlRecords(xh, "r")
          .map(r => ({ hour: Number(r.HourOpen), sum: num(r.DishDiscountSumInt) }))
          .filter(r => !Number.isNaN(r.hour))
          .sort((a, b) => a.hour - b.hour);
      } catch (_) {}
    } catch (e) {
      // Fallback: cash shifts of today
      result.source = "cashshifts";
      result.olapError = String(e.message || e);
      const data = JSON.parse(await get("/v2/cashshifts/list", { openDateFrom: today, openDateTo: today, status: "ANY" }));
      let cash = 0, card = 0, credit = 0;
      for (const s of data) { result.total += num(s.payOrders); cash += num(s.salesCash); card += num(s.salesCard); credit += num(s.salesCredit); }
      result.byPayType = [{ name: "Cash", sum: cash }, { name: "Card", sum: card }, { name: "Credit", sum: credit }].filter(x => x.sum);
    }
    return result;
  });
}

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
    .replace(/[^\p{L}\p{N}]+/gu, " ")            // punctuation → space ("შ.პ.ს." → "შ პ ს")
    .split(" ").filter(w => w.length > 1 && !LEGAL.has(w)) // drop legal forms and single letters
    .join(" ");
}
// Georgian → Latin, so "ნიკორა" and "Nikora" compare equal
const KA = { ა:"a",ბ:"b",გ:"g",დ:"d",ე:"e",ვ:"v",ზ:"z",თ:"t",ი:"i",კ:"k",ლ:"l",მ:"m",ნ:"n",ო:"o",პ:"p",ჟ:"zh",რ:"r",ს:"s",ტ:"t",უ:"u",ფ:"p",ქ:"k",ღ:"gh",ყ:"k",შ:"sh",ჩ:"ch",ც:"ts",ძ:"dz",წ:"ts",ჭ:"ch",ხ:"kh",ჯ:"j",ჰ:"h" };
const latin = s => s.replace(/[ა-ჰ]/g, c => KA[c] || c).replace(/kh/g, "k").replace(/ts/g, "c").replace(/[wq]/g, "k").replace(/x/g, "ks");
function similar(a, b) {
  return similarRaw(a, b) || similarRaw(latin(norm(a)), latin(norm(b)));
}
function similarRaw(a, b) {
  const x = norm(a), y = norm(b);
  if (!x || !y) return false;
  if (x === y) return true;
  if (x.length >= 3 && y.length >= 3 && (x.includes(y) || y.includes(x))) return true;
  const A = new Set(x.split(" ").filter(w => w.length > 1)), B = new Set(y.split(" ").filter(w => w.length > 1));
  if (!A.size || !B.size) return false;
  let both = 0; for (const w of A) if (B.has(w)) both++;
  return both / Math.min(A.size, B.size) >= 0.6;
}
const isTreasury = tx => tx.bankCode.toUpperCase() === "TRESGE22" || /^GE\d{2}NB/i.test(tx.iban) || /სახაზინო|treasury/i.test(tx.name);

async function loadLinks(env) {
  const l = (await env.STORE.get(LINKS_KEY, "json")) || {};
  return { byTin: l.byTin || {}, byTx: l.byTx || {} };
}

// body: { txId, tin, supplierId | "ignore" | null, scope: "tin" | "tx" }
async function saveReview(env, body) {
  const links = await loadLinks(env);
  const target = body.supplierId === null ? null : String(body.supplierId || "").toLowerCase();
  if (body.supplierId !== null && !target) return { error: "supplierId required" };
  if (body.scope === "tin") {
    const tin = String(body.tin || "").trim();
    if (!tin) return { error: "tin required" };
    if (target === null) delete links.byTin[tin]; else links.byTin[tin] = target;
  } else {
    const txId = String(body.txId || "").trim();
    if (!txId) return { error: "txId required" };
    if (target === null) delete links.byTx[txId]; else links.byTx[txId] = target;
  }
  await env.STORE.put(LINKS_KEY, JSON.stringify(links));
  return { ok: true };
}

async function buildDebts(env, syrve) {
  const settings = await loadBankSettings(env);
  const state = await loadBankState(env);
  const configured = bankConfigured(env);
  const links = await loadLinks(env);
  const payments = (configured.bog || configured.tbc) ? await loadPayments(env, settings.historyFrom) : [];

  const sup = {}; for (const s of syrve.suppliers) sup[s.id] = s;
  const byTin = {};  // Syrve card tax IDs
  for (const s of syrve.suppliers) if (s.tin) (byTin[s.tin] = byTin[s.tin] || []).push(s);
  // rs.ge waybills: seller tax ID → seller name (as written on the waybill)
  const rsName = {};
  try { for (const r of await loadLog(env)) if (r.sellerTin && r.seller) rsName[r.sellerTin] = r.seller; } catch (_) {}

  const paid = {};
  const review = [];
  let ignored = 0, matched = 0;
  for (const tx of payments) {
    let supplierId = null, reason = "", suggestion = null, how = "";
    const forced = links.byTx[tx.id] ?? (tx.tin ? links.byTin[tx.tin] : undefined);
    if (forced === "ignore") { ignored++; continue; }
    if (forced && sup[forced]) { supplierId = forced; how = "confirmed"; }
    else if (tx.own || isTreasury(tx) || (!tx.tin && !tx.iban)) { ignored++; continue; } // own transfers, taxes, fees
    else if (tx.tin && byTin[tx.tin]?.length === 1) {
      const s = byTin[tx.tin][0];
      if (!tx.name || similar(tx.name, s.name) || (rsName[tx.tin] && similar(rsName[tx.tin], s.name))) { supplierId = s.id; how = "tax_id"; }
      else { reason = "name_differs"; suggestion = s.id; }
    } else if (tx.tin && rsName[tx.tin]) {
      const c = syrve.suppliers.filter(s => similar(s.name, rsName[tx.tin]) || similar(s.name, tx.name));
      if (c.length === 1) { supplierId = c[0].id; how = "rs_ge"; }
      else { reason = c.length ? "several_matches" : "not_in_syrve"; suggestion = c[0]?.id || null; }
    } else {
      const c = syrve.suppliers.filter(s => similar(s.name, tx.name));
      reason = c.length ? "name_only" : "unknown";
      suggestion = c[0]?.id || null;
    }
    if (supplierId) { paid[supplierId] = (paid[supplierId] || 0) + tx.amount; matched++; }
    else review.push({ ...tx, reason, suggestion, rsName: rsName[tx.tin] || "" });
  }

  const ids = new Set([...Object.keys(syrve.owed), ...Object.keys(paid)]);
  const list = [...ids].filter(id => sup[id]).map(id => {
    const invoices = Math.round((syrve.owed[id] || 0) * 100) / 100;
    const p = Math.round((paid[id] || 0) * 100) / 100;
    return { id, name: sup[id].name, tin: sup[id].tin, invoices, paid: p, owed: Math.round((invoices - p) * 100) / 100 };
  }).filter(x => Math.abs(x.owed) >= 0.01 || x.paid > 0).sort((a, b) => b.owed - a.owed);

  review.sort((a, b) => b.date.localeCompare(a.date));
  return {
    asOf: syrve.asOf,
    total: Math.round(list.reduce((a, x) => a + (x.owed > 0 ? x.owed : 0), 0) * 100) / 100,
    suppliers: list,
    review: { count: review.length, amount: Math.round(review.reduce((a, x) => a + x.amount, 0) * 100) / 100, items: review.slice(0, 150) },
    options: syrve.suppliers.map(s => ({ id: s.id, name: s.name })).sort((a, b) => a.name.localeCompare(b.name)),
    linkedTins: Object.entries(links.byTin).map(([tin, to]) => ({ tin, to, name: to === "ignore" ? "" : (sup[to]?.name || to) })),
    bank: { configured, settings, lastSyncAt: state.lastSyncAt, errors: state.errors, cursors: state.cursors, payments: payments.length, matched, ignored },
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
