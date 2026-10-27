// stock.js — the Storage tab in PriceCheck: what is left in the Syrve stores right now.
//
// Syrve is only READ. Typing a new amount on the website stores a correction on top of
// Syrve's number (typed − Syrve), so sales keep counting it down; the correction is
// dropped automatically as soon as Syrve has a newer reconciliation (inventory document).
//
// Each product can have a minimum; when the live amount falls to it, the bot posts an
// alarm in the employees' group with Approve / Disapprove (see telegram.js). The alarm
// fires once and re-arms when the amount is above the minimum again.
//
// KV keys:
//   stock:cfg           { store, items: { <syrveProductId>: { min, prio, link, corr, corrAt } } }
//   stock:alarms        { <syrveProductId>: { token, state: "open" | "approved" | "rejected", at } }
//   stockalarm:<token>  one alarm message in Telegram (telegram.js)
//   dash:cache:stock    the last Syrve answer (reused for 1 minute)

import { withSyrve, xmlRecords, nowLocal, localDate, ddmmyyyy } from "./dashboard.js";
import { loadBasePrices } from "./store.js";
import { matchProduct, normName } from "./orders.js";
import { sendStockAlarm } from "./telegram.js";

const CFG_KEY = "stock:cfg";
const ALARMS_KEY = "stock:alarms";
const CACHE_KEY = "dash:cache:stock";
const CACHE_TTL = 60;          // seconds
const INVENTORY_DAYS = 62;     // how far back to look for reconciliations
const MAX_ALARMS_PER_RUN = 10; // stay within Cloudflare's per-request limit on outgoing calls
const PRIORITIES = ["red", "yellow", "cyan"];
// Syrve product types that are kept in stores (raw goods and semi-finished products)
const STOCK_TYPES = new Set(["GOODS", "PREPARED"]);

const num = (v) => Number(String(v ?? "").replace(",", ".")) || 0;
const round3 = (n) => Math.round(n * 1000) / 1000;
const localStamp = (env) => nowLocal(env).toISOString().slice(0, 16); // "YYYY-MM-DDTHH:MM", restaurant time

// Syrve dates come as "2026-10-01T23:00:00(+04:00)" or "01.10.2026 23:00" → "YYYY-MM-DDTHH:MM"
function stamp(s) {
  s = String(s || "").trim();
  const ru = s.match(/^(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
  if (ru) return `${ru[3]}-${ru[2]}-${ru[1]}T${ru[4] || "00"}:${ru[5] || "00"}`;
  return s.slice(0, 16);
}

// ── settings ─────────────────────────────────────────────────────────────────

async function loadCfg(env) {
  const c = (await env.STORE.get(CFG_KEY, "json")) || {};
  return { store: c.store || "", items: c.items || {} };
}
const saveCfg = (env, cfg) => env.STORE.put(CFG_KEY, JSON.stringify(cfg));

export async function loadAlarms(env) {
  return (await env.STORE.get(ALARMS_KEY, "json")) || {};
}
export const saveAlarms = (env, alarms) => env.STORE.put(ALARMS_KEY, JSON.stringify(alarms));

// ── Syrve ────────────────────────────────────────────────────────────────────

async function fetchSyrve(env) {
  const now = nowLocal(env);
  const asOf = now.toISOString().slice(0, 19);
  const from = localDate(env, new Date(now.getTime() - INVENTORY_DAYS * 86400000));

  return withSyrve(env, async (get) => {
    const balances = JSON.parse(await get("/v2/reports/balance/stores", { timestamp: asOf }));
    const bal = {}; // productId → { storeId: amount }
    for (const b of balances) {
      const p = String(b.product || "").toLowerCase();
      if (!p) continue;
      const s = String(b.store || "").toLowerCase();
      bal[p] = bal[p] || {};
      bal[p][s] = round3((bal[p][s] || 0) + num(b.amount));
    }

    const units = {}, groups = {};
    try { for (const u of JSON.parse(await get("/v2/entities/list", { rootType: "MeasureUnit" }))) units[String(u.id).toLowerCase()] = u.name || u.code || ""; } catch (_) {}
    try { for (const g of JSON.parse(await get("/v2/entities/products/group/list"))) groups[String(g.id).toLowerCase()] = g.name || ""; } catch (_) {}

    const products = [];
    for (const p of JSON.parse(await get("/v2/entities/products/list", { includeDeleted: "false" }))) {
      const id = String(p.id || "").toLowerCase();
      if (!id || p.deleted === true) continue;
      if (!STOCK_TYPES.has(p.type) && !bal[id]) continue;
      products.push([id, p.name || p.num || id, units[String(p.mainUnit || "").toLowerCase()] || "", groups[String(p.parent || "").toLowerCase()] || ""]);
    }

    let stores = [];
    try {
      stores = xmlRecords(await get("/corporation/stores"), "corporateItemDto")
        .filter((s) => s.id && (!s.type || s.type === "STORE"))
        .map((s) => ({ id: s.id.toLowerCase(), name: s.name || s.code || s.id }));
    } catch (_) {}

    // reconciliations = Syrve "inventory" documents; one row per product that differed
    const inventories = [];
    let inventoryError = "";
    try {
      const xml = await get("/reports/storeOperations", {
        dateFrom: ddmmyyyy(from), dateTo: ddmmyyyy(localDate(env)),
        documentTypes: "INCOMING_INVENTORY", productDetalization: "true", showCostCorrections: "false",
      });
      const docs = new Map();
      for (const r of xmlRecords(xml, "storeReportItemDto")) {
        const key = r.documentId || r.documentNum || r.date;
        if (!key) continue;
        if (!docs.has(key)) docs.set(key, { num: r.documentNum || "", date: stamp(r.date || r.dateTime), store: String(r.primaryStore || r.store || "").toLowerCase(), d: {} });
        const p = String(r.product || "").toLowerCase();
        if (!p) continue;
        let amount = num(r.amount);
        if (r.incoming === "false") amount = -Math.abs(amount);
        else if (r.incoming === "true") amount = Math.abs(amount);
        const doc = docs.get(key);
        doc.d[p] = round3((doc.d[p] || 0) + amount);
      }
      inventories.push(...docs.values());
    } catch (e) {
      inventoryError = String(e.message || e).slice(0, 200);
    }

    return { asOf, products, bal, stores, inventories, inventoryError };
  });
}

// The cached Syrve answer; `keep: false` reads fresh data without writing the cache (cron).
async function syrveStock(env, { fresh = false, keep = true } = {}) {
  if (!fresh) {
    const hit = await env.STORE.get(CACHE_KEY, "json");
    if (hit && Date.now() - hit._at < CACHE_TTL * 1000) return hit;
  }
  const value = await fetchSyrve(env);
  value._at = Date.now();
  if (keep) await env.STORE.put(CACHE_KEY, JSON.stringify(value), { expirationTtl: 3600 });
  return value;
}

// ── the Storage list ─────────────────────────────────────────────────────────

export async function buildStock(env, opts = {}) {
  const [syrve, cfg, alarms, products] = await Promise.all([
    syrveStock(env, opts), loadCfg(env), loadAlarms(env), loadBasePrices(env),
  ]);
  const store = syrve.stores.some((s) => s.id === cfg.store) ? cfg.store : "";
  const invs = syrve.inventories
    .filter((d) => !store || !d.store || d.store === store)
    .sort((a, b) => b.date.localeCompare(a.date));
  const lastInv = invs[0] || null;

  // PriceCheck products for the order: exact name match for everything (cheap),
  // the fuzzy order matcher only for products that can raise an alarm.
  const byId = new Map(products.map((p) => [p.id, p]));
  const byName = new Map();
  for (const p of products) for (const n of [p.name, p.nameRs]) if (n && !byName.has(normName(n))) byName.set(normName(n), p);

  let cfgChanged = false;
  const items = syrve.products.map(([id, name, unit, group]) => {
    const c = cfg.items[id] || {};
    const bal = syrve.bal[id] || {};
    const amount = round3(store ? num(bal[store]) : Object.values(bal).reduce((a, b) => a + b, 0));
    // a newer reconciliation replaces the manual correction
    if (c.corrAt && lastInv && lastInv.date > c.corrAt) {
      delete c.corr; delete c.corrAt; cfgChanged = true;
    }
    const corr = num(c.corr);
    const min = c.min ?? null;
    let link = null, auto = false;
    if (c.link && c.link !== "none") link = byId.get(Number(c.link)) || null;
    else if (!c.link) {
      link = byName.get(normName(name)) || (min !== null ? matchProduct(products, name) : null);
      auto = !!link;
    }
    return {
      id, name, unit, group,
      syrve: amount, corr: round3(corr), corrAt: c.corrAt || null, live: round3(amount + corr),
      min, prio: c.prio || "",
      link: link ? { id: link.id, name: link.name, auto } : null, noLink: c.link === "none",
      inv: lastInv && lastInv.d[id] !== undefined ? lastInv.d[id] : null,
      alarm: alarms[id]?.state || "",
    };
  });
  if (cfgChanged) {
    for (const [id, c] of Object.entries(cfg.items)) if (!Object.keys(c).length) delete cfg.items[id];
    await saveCfg(env, cfg);
  }

  return {
    asOf: syrve.asOf, store, stores: syrve.stores, items,
    inventory: lastInv ? { num: lastInv.num, date: lastInv.date, count: Object.keys(lastInv.d).length } : null,
    inventoryError: syrve.inventoryError,
    products: products.map((p) => ({ id: p.id, name: p.name })),
  };
}

// body: { id, min?, prio?, link?, live?, clearCorr? } or { store }
export async function updateStock(env, body) {
  const cfg = await loadCfg(env);
  if ("store" in body) cfg.store = String(body.store || "").toLowerCase();
  const id = String(body.id || "").toLowerCase();
  if (id) {
    const c = cfg.items[id] || {};
    if ("min" in body) {
      const v = body.min === null || body.min === "" ? NaN : num(body.min);
      if (Number.isFinite(v) && v >= 0 && String(body.min).trim() !== "") c.min = round3(v); else delete c.min;
    }
    if ("prio" in body) { if (PRIORITIES.includes(body.prio)) c.prio = body.prio; else delete c.prio; }
    if ("link" in body) {
      if (body.link === "none") c.link = "none";
      else if (Number(body.link) > 0) c.link = Number(body.link);
      else delete c.link;
    }
    if ("live" in body && String(body.live).trim() !== "") {
      // correction against the Syrve amount the page was showing (cached for a minute)
      const syrve = await syrveStock(env);
      const bal = syrve.bal[id] || {};
      const store = syrve.stores.some((s) => s.id === cfg.store) ? cfg.store : "";
      const amount = store ? num(bal[store]) : Object.values(bal).reduce((a, b) => a + b, 0);
      const corr = round3(num(body.live) - amount);
      if (corr) { c.corr = corr; c.corrAt = localStamp(env); } else { delete c.corr; delete c.corrAt; }
    }
    if (body.clearCorr) { delete c.corr; delete c.corrAt; }
    if (Object.keys(c).length) cfg.items[id] = c; else delete cfg.items[id];
  }
  await saveCfg(env, cfg);
}

// ── alarms ───────────────────────────────────────────────────────────────────

export async function groupChatId(env) {
  return env.GROUP_CHAT_ID || (await env.STORE.get("group_chat_id"));
}

// Post an alarm for every product at or below its minimum; re-arm the ones that recovered.
// Returns "no_group" when there is no Telegram group to post to yet.
export async function checkStockAlarms(env, data) {
  const alarms = await loadAlarms(env);
  const chatId = await groupChatId(env);
  let changed = false, sent = 0, problem = "";
  for (const it of data.items) {
    const low = it.min !== null && it.live <= it.min;
    if (!low) {
      if (alarms[it.id]) { delete alarms[it.id]; changed = true; it.alarm = ""; }
      continue;
    }
    if (alarms[it.id]) continue;
    if (!chatId || !env.TELEGRAM_BOT_TOKEN) { problem = "no_group"; continue; }
    if (sent >= MAX_ALARMS_PER_RUN) break; // the rest go out on the next check
    const token = await sendStockAlarm(env, chatId, it);
    sent++;
    if (token) { alarms[it.id] = { token, state: "open", at: new Date().toISOString() }; it.alarm = "open"; changed = true; }
  }
  if (changed) await saveAlarms(env, alarms);
  return problem;
}

// Called by telegram.js when someone taps Approve / Disapprove.
export async function setAlarmState(env, productId, token, state) {
  const alarms = await loadAlarms(env);
  const a = alarms[productId];
  if (!a || a.token !== token) return;
  a.state = state;
  await saveAlarms(env, alarms);
}

// A disapproved alarm becomes a Dashboard task labelled "needs to check".
// botAt lets the Dashboard keep it even if a page that loaded earlier saves its task list.
const TASKS_KEY = "dash:data:tasks";
export async function addCheckTask(env, title, by) {
  const d = (await env.STORE.get(TASKS_KEY, "json")) || {};
  const tasks = { daily: d.daily || [], overall: d.overall || [] };
  const id = "st" + crypto.randomUUID().slice(0, 8);
  tasks.overall.push({ id, title, assignee: "", due: "", done: false, createdAt: localDate(env), label: "check", by, note: "", botAt: new Date().toISOString() });
  await env.STORE.put(TASKS_KEY, JSON.stringify(tasks));
  return id;
}
export async function setTaskNote(env, id, note) {
  const d = await env.STORE.get(TASKS_KEY, "json");
  const x = d?.overall?.find((v) => v.id === id);
  if (!x) return false;
  x.note = note;
  x.botAt = new Date().toISOString();
  await env.STORE.put(TASKS_KEY, JSON.stringify(d));
  return true;
}

// Cron (every 15 minutes): fresh Syrve numbers, alarms only — the page cache is left alone.
export async function scheduledStockCheck(env) {
  const cfg = await loadCfg(env);
  if (!Object.values(cfg.items).some((c) => c.min !== undefined)) return; // no minimums set yet
  const data = await buildStock(env, { fresh: true, keep: false });
  await checkStockAlarms(env, data);
}
