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

// Full settings, including the bot token — for server use only, never sent to the website.
export async function loadSettings(env) {
  const saved = env.STORE ? await env.STORE.get(SETTINGS_KEY, "json") : null;
  return {
    accountantPhone: "",
    reportChatId: "",
    reportBotToken: "",
    ...(saved && typeof saved === "object" ? saved : {}),
  };
}

// "1234567890:AAH…xYz9" → "••••••••••xYz9" (the site is public, so the full token is never shown)
export function maskToken(token) {
  return token ? "••••••••••" + String(token).slice(-4) : "";
}

// What the website is allowed to see.
export function publicSettings(s) {
  return {
    accountantPhone: s.accountantPhone || "",
    reportChatId: s.reportChatId || "",
    reportBotToken: maskToken(s.reportBotToken),
  };
}

export class SettingsError extends Error {}

export async function saveSettings(env, settings) {
  const current = await loadSettings(env);
  const pick = (k, max) => String(settings?.[k] ?? current[k] ?? "").trim().slice(0, max);
  // Bot token: keep the saved one when the website sends back the hidden (masked) value.
  let token = current.reportBotToken || "";
  if (settings && typeof settings.reportBotToken === "string") {
    const typed = settings.reportBotToken.trim();
    if (typed !== maskToken(current.reportBotToken)) {
      if (typed && !/^\d{5,}:[\w-]{20,}$/.test(typed)) {
        throw new SettingsError("invalid_token");
      }
      token = typed; // empty = removed
    }
  }
  const clean = {
    accountantPhone: pick("accountantPhone", 40),
    // Telegram chat the website's "Send to Telegram" reports go to, e.g. -1001234567890
    reportChatId: pick("reportChatId", 40).replace(/[^\d-]/g, ""),
    // Bot used for those reports (falls back to the TELEGRAM_BOT_TOKEN secret when empty)
    reportBotToken: token,
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
