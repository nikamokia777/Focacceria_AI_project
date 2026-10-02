// store.js — the shared base price list, kept in Cloudflare KV so that both
// the website and the Telegram bot read the same data.

const KEY = "base_prices";

export async function loadBasePrices(env) {
  if (!env.STORE) return [];
  const list = await env.STORE.get(KEY, "json");
  return Array.isArray(list) ? list : [];
}

export async function saveBasePrices(env, items) {
  const clean = items
    .filter((p) => p && typeof p.name === "string" && p.name.trim())
    .map((p, i) => ({
      id: Number(p.id) || i + 1,
      name: p.name.trim(),
      nameRs: typeof p.nameRs === "string" ? p.nameRs.trim() : "",
      code: String(p.code ?? "").trim(),
      basePrice: Number(p.basePrice) || 0,
      unit: String(p.unit ?? "").trim() || "unit",
      supplier: String(p.supplier ?? "").trim(),
      isAlt: !!p.isAlt,
    }));
  await env.STORE.put(KEY, JSON.stringify(clean));
  return clean;
}
