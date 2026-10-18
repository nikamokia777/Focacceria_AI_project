// store.js — data shared by the website and the Telegram bot, kept in Cloudflare KV.
//
// Keys:
//   base_prices   all products (distributor + bazaar) — the list the bot checks waybills against
//   settings      app settings (accountant's WhatsApp number)
//   order         the current shopping list (ticked products)
//   waybill_log   approved / rejected waybills and received orders (History + Mistakes tabs)

const PRICES_KEY = "base_prices";
const SETTINGS_KEY = "settings";
const ORDER_KEY = "order";
const LOG_KEY = "waybill_log";
const LOG_LIMIT = 600;

const str = (v, max = 200) => String(v ?? "").trim().slice(0, max);
const now = () => new Date().toISOString();

// ── Products ─────────────────────────────────────────────────────────────────

export async function loadBasePrices(env) {
  if (!env.STORE) return [];
  const list = await env.STORE.get(PRICES_KEY, "json");
  return Array.isArray(list) ? list : [];
}

export function cleanProduct(p, i = 0) {
  return {
    id: Number(p.id) || i + 1,
    type: p.type === "bazaar" ? "bazaar" : "distributor",
    category: str(p.category, 60),
    name: str(p.name),
    nameRs: str(p.nameRs),
    code: str(p.code, 60),
    supplier: str(p.supplier, 120),
    contactName: str(p.contactName, 80),
    phone: str(p.phone, 40),
    unit: p.unit === "unit" ? "" : str(p.unit, 40), // size / pack, e.g. "1 კგ", "0.38" ("unit" was the old default)
    basePrice: Math.max(0, Number(p.basePrice) || 0),
    altSupplier: str(p.altSupplier, 120),
    comment: str(p.comment, 300),
    isAlt: !!p.isAlt,
  };
}

export async function saveBasePrices(env, items) {
  const clean = items
    .filter((p) => p && typeof p.name === "string" && p.name.trim())
    .map(cleanProduct);
  // ids must be unique — repair duplicates instead of losing products
  const seen = new Set();
  let next = clean.reduce((m, p) => Math.max(m, p.id), 0) + 1;
  for (const p of clean) {
    if (seen.has(p.id)) p.id = next++;
    seen.add(p.id);
  }
  await env.STORE.put(PRICES_KEY, JSON.stringify(clean));
  return clean;
}

// ── Settings ─────────────────────────────────────────────────────────────────

export async function loadSettings(env) {
  const saved = env.STORE ? await env.STORE.get(SETTINGS_KEY, "json") : null;
  return { accountantPhone: "", ...(saved && typeof saved === "object" ? saved : {}) };
}

export function publicSettings(s) {
  return { accountantPhone: s.accountantPhone || "" };
}

export async function saveSettings(env, settings) {
  const current = await loadSettings(env);
  const clean = {
    ...current,
    accountantPhone: str(settings?.accountantPhone ?? current.accountantPhone, 40),
  };
  await env.STORE.put(SETTINGS_KEY, JSON.stringify(clean));
  return clean;
}

// ── Current order (shopping list) ────────────────────────────────────────────
// { items: [{ productId, qty, unit, comment, status: "new"|"sent", sentAt, by, source, addedAt }], updatedAt }

export async function loadOrder(env) {
  const o = env.STORE ? await env.STORE.get(ORDER_KEY, "json") : null;
  return { items: Array.isArray(o?.items) ? o.items : [], updatedAt: o?.updatedAt || null };
}

async function saveOrder(env, order) {
  order.updatedAt = now();
  await env.STORE.put(ORDER_KEY, JSON.stringify(order));
  return order;
}

// Apply a list of changes to the latest saved order (so the website and the bot
// never overwrite each other's additions).
//   { op: "set", productId, qty?, unit?, comment?, by?, source? }  add or update a line
//   { op: "remove", productId }
//   { op: "clear" }
//   { op: "sent", productIds }                                     WhatsApp sent to supplier
//   { op: "received", productIds }                                 goods arrived → History
export async function applyOrderOps(env, ops, products = null) {
  const order = await loadOrder(env);
  const received = [];
  for (const op of ops || []) {
    const pid = Number(op.productId);
    const idx = order.items.findIndex((it) => it.productId === pid);
    if (op.op === "set" && pid) {
      const prev = idx >= 0 ? order.items[idx] : null;
      const line = {
        productId: pid,
        qty: op.qty !== undefined ? Math.max(0, Number(String(op.qty).replace(",", ".")) || 0) : prev?.qty ?? 1,
        unit: op.unit !== undefined ? str(op.unit, 20) : prev?.unit ?? "",
        comment: op.comment !== undefined ? str(op.comment, 200) : prev?.comment ?? "",
        status: prev?.status || "new",
        sentAt: prev?.sentAt || null,
        by: prev?.by || str(op.by, 80),
        source: prev?.source || (op.source === "telegram" ? "telegram" : "app"),
        addedAt: prev?.addedAt || now(),
      };
      // changing a line that was already sent makes it "new" again (needs resending)
      if (prev && prev.status === "sent" && (line.qty !== prev.qty || line.unit !== prev.unit)) {
        line.status = "new";
        line.sentAt = null;
      }
      if (idx >= 0) order.items[idx] = line;
      else order.items.push(line);
    } else if (op.op === "remove" && idx >= 0) {
      order.items.splice(idx, 1);
    } else if (op.op === "clear") {
      order.items = [];
    } else if (op.op === "sent") {
      const ids = new Set((op.productIds || []).map(Number));
      const at = now();
      for (const it of order.items) if (ids.has(it.productId)) { it.status = "sent"; it.sentAt = at; }
    } else if (op.op === "received") {
      const ids = new Set((op.productIds || []).map(Number));
      received.push(...order.items.filter((it) => ids.has(it.productId)));
      order.items = order.items.filter((it) => !ids.has(it.productId));
    }
  }
  await saveOrder(env, order);

  // Manually received goods (e.g. from the bazaar, which has no rs.ge waybill) go to History.
  if (received.length) {
    const list = products || (await loadBasePrices(env));
    const byId = new Map(list.map((p) => [p.id, p]));
    const groups = new Map();
    for (const it of received) {
      const p = byId.get(it.productId);
      const supplier = p?.supplier || "—";
      if (!groups.has(supplier)) groups.set(supplier, []);
      groups.get(supplier).push({
        name: p?.name || `#${it.productId}`,
        qty: it.qty,
        unit: it.unit,
        comment: it.comment,
        price: p?.basePrice || 0,
      });
    }
    for (const [supplier, items] of groups) {
      await upsertLog(env, {
        token: "o" + randomId(),
        kind: "order",
        status: "received",
        supplier,
        items,
        total: items.reduce((s, x) => s + (x.price || 0) * (x.qty || 0), 0).toFixed(2),
        createdAt: now(),
        decidedAt: now(),
      });
    }
  }
  return order;
}

// When a waybill is approved, the ordered products it contains count as received.
export async function receiveOrderItems(env, productIds) {
  const ids = new Set((productIds || []).map(Number));
  if (!ids.size) return [];
  const order = await loadOrder(env);
  const done = order.items.filter((it) => ids.has(it.productId));
  if (!done.length) return [];
  order.items = order.items.filter((it) => !ids.has(it.productId));
  await saveOrder(env, order);
  return done;
}

// ── Waybill log (History + Mistakes) ─────────────────────────────────────────

export async function loadLog(env) {
  const list = env.STORE ? await env.STORE.get(LOG_KEY, "json") : null;
  return Array.isArray(list) ? list : [];
}

async function saveLog(env, list) {
  await env.STORE.put(LOG_KEY, JSON.stringify(list.slice(0, LOG_LIMIT)));
}

export async function getLogRecord(env, token) {
  return (await loadLog(env)).find((r) => r.token === token) || null;
}

// Insert or replace a record (newest first).
export async function upsertLog(env, record) {
  const list = await loadLog(env);
  const idx = list.findIndex((r) => r.token === record.token);
  if (idx >= 0) list[idx] = { ...list[idx], ...record };
  else list.unshift(record);
  await saveLog(env, list);
  return idx >= 0 ? list[idx] : record;
}

// Change one record; fn receives a copy and returns the updated record (or null to skip).
export async function patchLog(env, token, fn) {
  const list = await loadLog(env);
  const idx = list.findIndex((r) => r.token === token);
  if (idx < 0) return null;
  const updated = fn({ ...list[idx] });
  if (!updated) return list[idx];
  list[idx] = updated;
  await saveLog(env, list);
  return updated;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export function randomId(bytes = 9) {
  return [...crypto.getRandomValues(new Uint8Array(bytes))].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// "5XX 12 34 56", "+995 5XX…", "00995…" → "9955XX123456" (the format wa.me wants)
export function toWhatsAppNumber(phone) {
  let d = String(phone ?? "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 9) d = "995" + d;            // Georgian mobile without country code
  if (d.length === 10 && d.startsWith("0")) d = "995" + d.slice(1);
  return d.length >= 10 && d.length <= 15 ? d : "";
}
