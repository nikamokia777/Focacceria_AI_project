// bank.js — reads outgoing GEL payments from Bank of Georgia and TBC and keeps them in KV.
//
// Only READS statements. Nothing here can send money.
//
// Secrets (Cloudflare → Worker → Settings → Variables and Secrets, type Secret):
//   BOG_CLIENT_ID, BOG_CLIENT_SECRET   from bonline.bog.ge → Admin → API (register an application)
//   TBC_CLIENT_ID, TBC_CLIENT_SECRET   from TBC Business Internet Bank → API Integration
//                                      (permission: "view transaction history and statements")
// Optional: BOG_TOKEN_URL, BOG_API_URL, TBC_API_URL (only if the banks change their addresses)
//
// Settings kept in KV (edited in the Debts tab): BOG account IBANs, history start date.
// TBC returns all accounts of the company, so it needs no account list.
//
// KV keys:
//   dash:bank:settings   { bogAccounts: [iban], historyFrom: "YYYY-MM-DD" }
//   dash:bank:state      { cursors: { "bog:<iban>": "YYYY-MM-DD", "tbc": "YYYY-MM-DD" }, lastSyncAt, errors }
//   dash:bank:tx:<year>  { <id>: { id, bank, date, amount, name, tin, iban, bankCode, purpose, own } }

const SETTINGS_KEY = "dash:bank:settings";
const STATE_KEY = "dash:bank:state";
const TX_PREFIX = "dash:bank:tx:";
const CHUNK_DAYS = 31;        // one statement request covers about a month
const STEP_FETCH_BUDGET = 30; // stay well under Cloudflare's per-request limit on outgoing calls
const OVERLAP_DAYS = 3;       // re-read the last few days so late bookings are caught

const BOG_TOKEN_URL = "https://account.bog.ge/auth/realms/bog/protocol/openid-connect/token";
const BOG_API_URL = "https://api.businessonline.ge/api";
const TBC_API_URL = "https://api.tbcbank.ge";

// ── settings / state ─────────────────────────────────────────────────────────

export function bankConfigured(env) {
  return { bog: !!(env.BOG_CLIENT_ID && env.BOG_CLIENT_SECRET), tbc: !!(env.TBC_CLIENT_ID && env.TBC_CLIENT_SECRET) };
}

export async function loadBankSettings(env) {
  const s = (await env.STORE.get(SETTINGS_KEY, "json")) || {};
  return { bogAccounts: Array.isArray(s.bogAccounts) ? s.bogAccounts : [], historyFrom: s.historyFrom || "" };
}

export async function saveBankSettings(env, input) {
  const ibans = (Array.isArray(input.bogAccounts) ? input.bogAccounts : String(input.bogAccounts || "").split(/[\s,;]+/))
    .map(x => String(x).trim().toUpperCase().replace(/\s+/g, ""))
    .filter(x => /^GE\d{2}[A-Z]{2}\d{16}$/.test(x));
  const historyFrom = /^\d{4}-\d{2}-\d{2}$/.test(input.historyFrom || "") ? input.historyFrom : "";
  const prev = await loadBankSettings(env);
  const next = { bogAccounts: [...new Set(ibans)], historyFrom };
  await env.STORE.put(SETTINGS_KEY, JSON.stringify(next));
  // a new start date (or new account) restarts history from that date
  if (prev.historyFrom !== next.historyFrom) {
    await env.STORE.put(STATE_KEY, JSON.stringify({ cursors: {}, lastSyncAt: null, errors: {} }));
  }
  return next;
}

export async function loadBankState(env) {
  const s = (await env.STORE.get(STATE_KEY, "json")) || {};
  return { cursors: s.cursors || {}, lastSyncAt: s.lastSyncAt || null, errors: s.errors || {} };
}

// all stored payments from the history start until today
export async function loadPayments(env, historyFrom) {
  const y0 = Number((historyFrom || "2015").slice(0, 4));
  const y1 = new Date().getUTCFullYear();
  const keys = [];
  for (let y = y0; y <= y1; y++) keys.push(TX_PREFIX + y);
  const parts = await Promise.all(keys.map(k => env.STORE.get(k, "json")));
  const out = [];
  for (const p of parts) if (p) out.push(...Object.values(p));
  return out.filter(x => !historyFrom || x.date >= historyFrom);
}

async function savePayments(env, list) {
  const byYear = {};
  for (const tx of list) (byYear[tx.date.slice(0, 4)] = byYear[tx.date.slice(0, 4)] || []).push(tx);
  for (const [year, txs] of Object.entries(byYear)) {
    const key = TX_PREFIX + year;
    const cur = (await env.STORE.get(key, "json")) || {};
    for (const tx of txs) cur[tx.id] = tx;
    await env.STORE.put(key, JSON.stringify(cur));
  }
}

// ── dates ────────────────────────────────────────────────────────────────────

const iso = d => d.toISOString().slice(0, 10);
function addDays(day, n) { const d = new Date(day + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return iso(d); }
function today(env) { return iso(new Date(Date.now() + Number(env.TZ_OFFSET ?? 4) * 3600000)); }

// case-insensitive field read (the banks' examples mix camelCase and PascalCase)
function g(obj, name) {
  if (!obj) return undefined;
  if (name in obj) return obj[name];
  const k = Object.keys(obj).find(x => x.toLowerCase() === name.toLowerCase());
  return k ? obj[k] : undefined;
}
const str = v => (v == null ? "" : String(v).trim());
const num = v => Number(v) || 0;

// ── tokens ───────────────────────────────────────────────────────────────────

async function clientToken(url, id, secret, extraBody = "") {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + btoa(`${id}:${secret}`),
    },
    body: "grant_type=client_credentials" + extraBody,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) throw new Error(`login failed (${res.status}) ${body.error_description || body.error || ""}`.trim());
  return body.access_token;
}

// ── Bank of Georgia ──────────────────────────────────────────────────────────

function bogRecord(r, iban) {
  const debit = num(g(r, "entryAmountDebit"));
  if (debit <= 0) return null;                    // only money going out
  const ben = g(r, "beneficiaryDetails") || {};
  const snd = g(r, "senderDetails") || {};
  const id = str(g(r, "entryId")) || str(g(r, "documentKey"));
  if (!id) return null;
  const tin = str(g(ben, "inn"));
  return {
    id: "bog:" + id,
    bank: "BOG",
    account: iban,
    date: str(g(r, "entryDate")).slice(0, 10),
    amount: Math.round(debit * 100) / 100,
    name: str(g(ben, "name")),
    tin,
    iban: str(g(ben, "accountNumber")),
    bankCode: str(g(ben, "bankCode")),
    purpose: str(g(r, "documentNomination")) || str(g(r, "entryComment")),
    own: !!tin && tin === str(g(snd, "inn")),     // transfer between our own accounts
  };
}

async function bogChunk(env, token, iban, from, to, budget) {
  const base = (env.BOG_API_URL || BOG_API_URL).replace(/\/+$/, "");
  const headers = { Authorization: "Bearer " + token, Accept: "application/json" };
  const first = await fetch(`${base}/v2/statement/${iban}/GEL/${from}/${to}`, { headers });
  budget.used++;
  if (!first.ok) throw new Error(`BOG statement ${first.status}: ${(await first.text()).slice(0, 150)}`);
  const body = await first.json();
  const records = [...(g(body, "records") || [])];
  const id = g(body, "id");
  const total = num(g(body, "totalCount"));
  // more than 1,000 entries: fetch the next pages in order
  for (let page = 2; records.length < total && id != null; page++) {
    if (budget.used >= STEP_FETCH_BUDGET) throw new Error("budget");
    const res = await fetch(`${base}/v2/statement/${iban}/GEL/${id}/${page}`, { headers });
    budget.used++;
    if (!res.ok) throw new Error(`BOG statement page ${res.status}`);
    const more = await res.json();
    const recs = Array.isArray(more) ? more : (g(more, "records") || []);
    if (!recs.length) break;
    records.push(...recs);
  }
  return records.map(r => bogRecord(r, iban)).filter(x => x && x.date);
}

// ── TBC ──────────────────────────────────────────────────────────────────────

function tbcRecord(t) {
  if (g(t, "isDebit") !== true) return null;
  if (str(g(t, "currency")).toUpperCase() !== "GEL") return null;
  const p = g(t, "partnerAccountInfo") || {};
  const id = str(g(t, "movementId")) || str(g(t, "transactionReference"));
  if (!id) return null;
  return {
    id: "tbc:" + id,
    bank: "TBC",
    account: str(g(t, "accountNumber")) || "",
    date: str(g(t, "date")).slice(0, 10),
    amount: Math.round(Math.abs(num(g(t, "amount"))) * 100) / 100,
    name: str(g(p, "partnerName")),
    tin: str(g(p, "taxCode")),
    iban: str(g(p, "accountIban")),
    bankCode: "",
    purpose: [str(g(t, "purpose")), str(g(t, "additionalDescription"))].filter(Boolean).join(" · "),
    own: false,
  };
}

async function tbcChunk(env, token, from, to, budget) {
  const base = (env.TBC_API_URL || TBC_API_URL).replace(/\/+$/, "");
  const out = [];
  for (let page = 0; ; page++) {
    if (budget.used >= STEP_FETCH_BUDGET) throw new Error("budget");
    const qs = new URLSearchParams({ PeriodFrom: from + "T00:00:00", PeriodTo: to + "T23:59:59", PageIndex: String(page), PageSize: "700" });
    const res = await fetch(`${base}/bab/v1/accounts/movements?${qs}`, { headers: { Authorization: "Bearer " + token, Accept: "application/json" } });
    budget.used++;
    if (!res.ok) throw new Error(`TBC movements ${res.status}: ${(await res.text()).slice(0, 150)}`);
    const body = await res.json();
    const txs = g(body, "transactions") || [];
    out.push(...txs);
    const total = num(g(body, "total"));
    if (!txs.length || (page + 1) * 700 >= total) break;
  }
  return out.map(tbcRecord).filter(x => x && x.date);
}

// ── sync one step ────────────────────────────────────────────────────────────
// Reads up to ~30 bank requests' worth of history, saves it, and remembers where it stopped.
// Call again until { done: true } — the Debts tab does this automatically.

export async function syncStep(env) {
  const cfg = bankConfigured(env);
  const settings = await loadBankSettings(env);
  const state = await loadBankState(env);
  if (!cfg.bog && !cfg.tbc) return { done: true, configured: cfg, state, message: "no_bank_secrets" };
  if (!settings.historyFrom) return { done: true, configured: cfg, state, message: "no_start_date" };

  const end = today(env);
  const sources = [];
  if (cfg.tbc) sources.push({ key: "tbc" });
  if (cfg.bog) for (const iban of settings.bogAccounts) sources.push({ key: "bog:" + iban, iban });

  const budget = { used: 0 };
  const tokens = {};
  const collected = [];
  state.errors = {};

  for (const src of sources) {
    let cursor = state.cursors[src.key] || settings.historyFrom;
    if (cursor < settings.historyFrom) cursor = settings.historyFrom;
    try {
      while (cursor <= end && budget.used < STEP_FETCH_BUDGET) {
        const to = addDays(cursor, CHUNK_DAYS - 1) < end ? addDays(cursor, CHUNK_DAYS - 1) : end;
        let recs;
        if (src.key === "tbc") {
          tokens.tbc = tokens.tbc || await clientToken((env.TBC_API_URL || TBC_API_URL).replace(/\/+$/, "") + "/oauth/token",
            env.TBC_CLIENT_ID, env.TBC_CLIENT_SECRET, "&scope=bab_accounts");
          budget.used++;
          recs = await tbcChunk(env, tokens.tbc, cursor, to, budget);
        } else {
          tokens.bog = tokens.bog || await clientToken(env.BOG_TOKEN_URL || BOG_TOKEN_URL, env.BOG_CLIENT_ID, env.BOG_CLIENT_SECRET);
          budget.used++;
          recs = await bogChunk(env, tokens.bog, src.iban, cursor, to, budget);
        }
        collected.push(...recs);
        if (to >= end) { cursor = addDays(end, -OVERLAP_DAYS); break; } // caught up — next time re-read the last days
        cursor = addDays(to, 1);
      }
      state.cursors[src.key] = cursor;
    } catch (e) {
      if (String(e.message) !== "budget") state.errors[src.key] = String(e.message || e).slice(0, 200);
      state.cursors[src.key] = cursor;
    }
  }

  if (collected.length) await savePayments(env, collected);
  const done = sources.every(s => (state.cursors[s.key] || "") >= addDays(end, -OVERLAP_DAYS)) || Object.keys(state.errors).length > 0;
  state.lastSyncAt = new Date().toISOString();
  await env.STORE.put(STATE_KEY, JSON.stringify(state));
  return { done, configured: cfg, state, saved: collected.length, behind: sources.filter(s => (state.cursors[s.key] || "") < addDays(end, -OVERLAP_DAYS)).map(s => ({ source: s.key, at: state.cursors[s.key] })) };
}
