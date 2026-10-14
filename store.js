// store.js — data shared by the website and the Telegram bot, kept in Cloudflare KV.

const PRICES_KEY = "base_prices";
const SETTINGS_KEY = "settings";

export async function loadBasePrices(env) {
  if (!env.STORE) return [];
  const list = await env.STORE.get(PRICES_KEY, "json");
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
      phone: String(p.phone ?? "").trim(),
      isAlt: !!p.isAlt,
    }));
  await env.STORE.put(PRICES_KEY, JSON.stringify(clean));
  return clean;
}

export async function loadSettings(env) {
  const saved = env.STORE ? await env.STORE.get(SETTINGS_KEY, "json") : null;
  return { accountantPhone: "", ...(saved && typeof saved === "object" ? saved : {}) };
}

export async function saveSettings(env, settings) {
  const clean = {
    accountantPhone: String(settings?.accountantPhone ?? "").trim().slice(0, 40),
  };
  await env.STORE.put(SETTINGS_KEY, JSON.stringify(clean));
  return clean;
}

// "5XX 12 34 56", "+995 5XX…", "00995…" → "9955XX123456" (the format wa.me wants)
export function toWhatsAppNumber(phone) {
  let d = String(phone ?? "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 9) d = "995" + d;            // Georgian mobile without country code
  if (d.length === 10 && d.startsWith("0")) d = "995" + d.slice(1);
  return d.length >= 10 && d.length <= 15 ? d : "";
}
