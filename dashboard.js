// dashboard.js — the Dashboard's server side (costs, ratings, tasks + Syrve data).
// worker.js sends every /api/dash/... request here, after checking the CEO password login.
//
// Storage: the same KV as PriceCheck (binding STORE), keys start with "dash:".
// Syrve secrets (Cloudflare → this Worker → Settings → Variables and Secrets, type Secret):
//   SYRVE_URL       https://focacceria.syrve.online
//   SYRVE_LOGIN     Syrve Office user
//   SYRVE_PASSWORD  that user's password (plain — it is hashed here)
// Optional secrets: TZ_OFFSET (hours from UTC, default 4), DEBT_SIGN (default -1)

const DATA_KEYS = ["fixed", "variable", "ratings", "tasks"];
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
      if (parts[1] === "debts") return json(await cached(env, "debts", 900, fresh, () => syrveDebts(env)));
      if (parts[1] === "employees") {
        const month = url.searchParams.get("month") || localDate(env).slice(0, 7);
        if (!/^\d{4}-\d{2}$/.test(month)) return json({ error: "bad month" }, 400);
        return json(await cached(env, "emp:" + month, 300, fresh, () => syrveEmployees(env, month)));
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
async function syrveDebts(env) {
  const sign = Number(env.DEBT_SIGN ?? -1);
  const d = nowLocal(env);
  const timestamp = d.toISOString().slice(0, 19); // yyyy-MM-ddTHH:mm:ss

  return withSyrve(env, async get => {
    const supXml = await get("/suppliers");
    const suppliers = {};
    for (const s of xmlRecords(supXml, "employee")) {
      if (s.id && s.deleted !== "true") suppliers[s.id.toLowerCase()] = s.name || s.code || s.id;
    }
    const balances = JSON.parse(await get("/v2/reports/balance/counteragents", { timestamp }));
    const per = {};
    for (const b of balances) {
      const id = (b.counteragent || "").toLowerCase();
      if (!id || !suppliers[id]) continue;
      per[id] = (per[id] || 0) + num(b.sum) * sign;
    }
    const list = Object.entries(per)
      .map(([id, owed]) => ({ id, name: suppliers[id], owed: Math.round(owed * 100) / 100 }))
      .filter(x => Math.abs(x.owed) >= 0.01)
      .sort((a, b) => b.owed - a.owed);
    const total = list.reduce((a, x) => a + (x.owed > 0 ? x.owed : 0), 0);
    return { asOf: timestamp, total, suppliers: list };
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
