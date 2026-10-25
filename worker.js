// worker.js — single entry point for the whole app.
//
// Open to everyone:
//   GET  /api/session          is this browser logged in? is a password set?
//   POST /api/login            { password } → login cookie
//   POST /api/logout
//   GET  /api/status           which parts are configured (no secrets)
//   GET  /api/telegram-setup   connect the Telegram bot to this app (run once)
//   POST /telegram-webhook     Telegram delivers group messages / button taps here
//   GET  /wa/<token>/<a|d>     opens WhatsApp (accountant / distributor) for a waybill
//
// Password required (the CEO sets it with /password in the bot):
//   GET/POST /api/base-prices  all products
//   GET/POST /api/settings     app settings (accountant's WhatsApp number)
//   GET/POST /api/order        the current order (POST { ops: [...] })
//   GET      /api/log          History + Mistakes records
//   POST     /api/log/action   { token, action: "resolve" | "reopen" }
//   *        /api/dash/...     the Dashboard (costs, ratings, tasks, Syrve data) — see dashboard.js
//
// Everything else is served from the static files in /public.

import { checkServiceUser } from "./rsge.js";
import {
  loadBasePrices, saveBasePrices, loadSettings, saveSettings, publicSettings,
  loadOrder, applyOrderOps, loadLog, patchLog,
} from "./store.js";
import { isLoggedIn, login, logout, passwordIsSet } from "./auth.js";
import { handleUpdate, handleWhatsAppLink, setupWebhook, webhookSecret } from "./telegram.js";
import { handleDashboard } from "./dashboard.js";

const JSON_HEADERS = { "Content-Type": "application/json", "Cache-Control": "no-store" };

const json = (data, status = 200, extraHeaders = {}) =>
  new Response(JSON.stringify(data), { status, headers: { ...JSON_HEADERS, ...extraHeaders } });

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

// ── Login ────────────────────────────────────────────────────────────────────

async function handleSession(request, env) {
  if (!env.STORE) return json({ authed: false, passwordSet: false, error: "no_storage" });
  const [authed, passwordSet] = await Promise.all([isLoggedIn(env, request), passwordIsSet(env)]);
  return json({ authed, passwordSet });
}

async function handleLogin(request, env) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!env.STORE) return json({ error: "no_storage" }, 503);
  const body = await readJson(request);
  const result = await login(env, request, body?.password);
  if (!result.ok) return json({ error: result.error }, result.error === "too_many" ? 429 : 401);
  return json({ ok: true }, 200, { "Set-Cookie": result.cookie });
}

async function handleLogout(request, env) {
  if (!env.STORE) return json({ ok: true });
  return json({ ok: true }, 200, { "Set-Cookie": await logout(env, request) });
}

// ── Data (password required) ─────────────────────────────────────────────────

async function handleBasePrices(request, env) {
  if (request.method === "GET") return json({ items: await loadBasePrices(env) });
  if (request.method === "POST") {
    const body = await readJson(request);
    if (!Array.isArray(body?.items)) return json({ error: "Expected { items: [...] }" }, 400);
    if (body.items.length > 5000) return json({ error: "Too many products" }, 400);
    return json({ items: await saveBasePrices(env, body.items) });
  }
  return json({ error: "Method not allowed" }, 405);
}

async function handleSettings(request, env) {
  if (request.method === "GET") return json({ settings: publicSettings(await loadSettings(env)) });
  if (request.method === "POST") {
    const body = await readJson(request);
    if (!body || typeof body.settings !== "object") return json({ error: "Expected { settings: {...} }" }, 400);
    return json({ settings: publicSettings(await saveSettings(env, body.settings)) });
  }
  return json({ error: "Method not allowed" }, 405);
}

async function handleOrder(request, env) {
  if (request.method === "GET") return json({ order: await loadOrder(env) });
  if (request.method === "POST") {
    const body = await readJson(request);
    if (!Array.isArray(body?.ops) || body.ops.length > 500) return json({ error: "Expected { ops: [...] }" }, 400);
    return json({ order: await applyOrderOps(env, body.ops) });
  }
  return json({ error: "Method not allowed" }, 405);
}

async function handleLog(request, env) {
  if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
  return json({ items: await loadLog(env) });
}

async function handleLogAction(request, env) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const body = await readJson(request);
  const token = String(body?.token || "");
  const action = body?.action;
  const at = new Date().toISOString();
  let updated = null;
  if (action === "resolve") {
    updated = await patchLog(env, token, (r) => (r.status === "rejected" ? { ...r, status: "resolved", resolvedAt: at } : null));
  } else if (action === "reopen") {
    updated = await patchLog(env, token, (r) => (r.status === "resolved" ? { ...r, status: "rejected", resolvedAt: null } : null));
  } else {
    return json({ error: "Unknown action" }, 400);
  }
  if (!updated) return json({ error: "not_found" }, 404);
  return json({ item: updated });
}

// ── Setup / health ───────────────────────────────────────────────────────────

async function handleStatus(env) {
  const status = {
    gemini: !!env.GEMINI_API_KEY,
    storage: !!env.STORE,
    telegramBot: !!env.TELEGRAM_BOT_TOKEN,
    rsgeCredentials: !!(env.RSGE_SERVICE_USER && env.RSGE_SERVICE_PASSWORD),
    rsgeLogin: null,
    ceoRegistered: null,
    passwordSet: null,
  };
  if (status.rsgeCredentials) {
    try {
      status.rsgeLogin = (await checkServiceUser(env)).ok;
    } catch (err) {
      status.rsgeLogin = false;
      status.rsgeError = err.message;
    }
  }
  if (env.STORE) {
    status.ceoRegistered = !!(env.CEO_CHAT_ID || (await env.STORE.get("ceo_chat_id")));
    status.passwordSet = await passwordIsSet(env);
  }
  return json(status);
}

async function handleTelegramSetup(request, env) {
  if (!env.TELEGRAM_BOT_TOKEN) return json({ error: "TELEGRAM_BOT_TOKEN is not set." }, 500);
  if (!env.STORE) return json({ error: "KV binding STORE is missing." }, 500);
  const result = await setupWebhook(env, new URL(request.url).origin);
  return json(result, result.ok ? 200 : 502);
}

async function handleTelegramWebhook(request, env, ctx) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!env.TELEGRAM_BOT_TOKEN || !env.STORE) return json({ error: "Bot is not configured" }, 503);
  const secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
  if (secret !== (await webhookSecret(env))) return json({ error: "Forbidden" }, 403);

  const update = await readJson(request);
  if (!update) return json({ ok: true });
  // Answer Telegram immediately and do the slow work (AI + rs.ge) afterwards,
  // otherwise Telegram would think the delivery failed and send it again.
  ctx.waitUntil(
    handleUpdate(env, update, new URL(request.url).origin)
      .catch((err) => console.error("telegram update failed:", err?.stack || err))
  );
  return json({ ok: true });
}

// ── Router ───────────────────────────────────────────────────────────────────

const PROTECTED = {
  "/api/base-prices": handleBasePrices,
  "/api/settings": handleSettings,
  "/api/order": handleOrder,
  "/api/log": handleLog,
  "/api/log/action": handleLogAction,
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/api/session") return handleSession(request, env);
    if (path === "/api/login") return handleLogin(request, env);
    if (path === "/api/logout") return handleLogout(request, env);
    if (path === "/api/status") return handleStatus(env);
    if (path === "/api/telegram-setup") return handleTelegramSetup(request, env);
    if (path === "/telegram-webhook") return handleTelegramWebhook(request, env, ctx);

    const wa = path.match(/^\/wa\/([^/]+)\/([ad])\/?$/);
    if (wa && env.STORE) return handleWhatsAppLink(env, ctx, wa[1], wa[2]);

    const handler = PROTECTED[path];
    if (handler) {
      if (!env.STORE) return json({ error: "Shared storage is not connected (KV binding STORE is missing)." }, 503);
      if (!(await isLoggedIn(env, request))) return json({ error: "unauthorized" }, 401);
      try {
        return await handler(request, env);
      } catch (err) {
        return json({ error: err.message || "Unknown server error" }, 500);
      }
    }
    // Dashboard — same password as PriceCheck
    if (path.startsWith("/api/dash/")) {
      if (!env.STORE) return json({ error: "Shared storage is not connected (KV binding STORE is missing)." }, 503);
      if (!(await isLoggedIn(env, request))) return json({ error: "unauthorized" }, 401);
      return handleDashboard(request, env, path.slice("/api/dash/".length));
    }

    if (path.startsWith("/api/")) return json({ error: "Not found" }, 404);

    // Everything else (index.html, etc.) is served by the static assets binding
    return env.ASSETS.fetch(request);
  },
};
