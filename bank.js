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
// KV keys (compact, so the Debts page stays within Cloudflare's CPU limit):
//   dash:bank:settings    { bogAccounts: [iban], historyFrom: "YYYY-MM-DD" }
//   dash:bank:state2      { cursors: { "bog:<iban>": "YYYY-MM-DD", "tbc": "YYYY-MM-DD" }, lastSyncAt, errors }
//   dash:bank:rcp         { <recipientKey>: [name, tin, iban, bankCode, own(0|1)] }   each recipient stored once
//   dash:bank:v2:<year>   [[id, "YYYY-MM-DD", amountInTetri, recipientKey, purpose], ...]
//   dash:bank:agg         { <recipientKey>: [count, totalTetri, lastDate, lastPurpose, banks(1=BOG,2=TBC)] }
//                         running totals, so the Debts page never has to read every payment

const SETTINGS_KEY = "dash:bank:settings";
const STATE_KEY = "dash:bank:state2";
const RCP_KEY = "dash:bank:rcp";
const TX_PREFIX = "dash:bank:v2:";
const AGG_KEY = "dash:bank:agg";
const VER_KEY = "dash:bank:ver"; // changes whenever anything the debts depend on changes

export async function bumpVersion(env) { await env.STORE.put(VER_KEY, String(Date.now())); }
export async function loadVersion(env) { return (await env.STORE.get(VER_KEY)) || "0"; }
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
  // a new start date restarts the history from that date
  if (prev.historyFrom !== next.historyFrom) {
    await env.STORE.put(STATE_KEY, JSON.stringify({ cursors: {}, lastSyncAt: null, errors: {} }));
    await env.STORE.put(AGG_KEY, "{}");
    const y1 = new Date().getUTCFullYear();
    for (let y = 2010; y <= y1; y++) await env.STORE.delete(TX_PREFIX + y);
  }
  await bumpVersion(env);
  return next;
}

export async function loadBankState(env) {
  const s = (await env.STORE.get(STATE_KEY, "json")) || {};
  return { cursors: s.cursors || {}, lastSyncAt: s.lastSyncAt || null, errors: s.errors || {}, notes: s.notes || {} };
}

export const recipientKey = tx =>
  tx.tin ? "t:" + tx.tin : tx.iban ? "i:" + tx.iban.toUpperCase() : "n:" + (tx.name || "").toLowerCase();

// what the Debts page needs: each recipient once, with running totals
export async function loadBankData(env) {
  const [recipients, agg] = await Promise.all([env.STORE.get(RCP_KEY, "json"), env.STORE.get(AGG_KEY, "json")]);
  return { recipients: recipients || {}, agg: agg || {} };
}

// all stored payments of one recipient (used when the CEO decides "only these payments")
export async function loadRecipientPayments(env, historyFrom, rk) {
  const y0 = Number((historyFrom || "2015").slice(0, 4));
  const y1 = new Date().getUTCFullYear();
  const out = [];
  for (let y = y0; y <= y1; y++) {
    const rows = await env.STORE.get(TX_PREFIX + y, "json");
    if (rows) for (const r of rows) if (r[3] === rk) out.push(r);
  }
  return out;
}

async function savePayments(env, list) {
  const rcp = (await env.STORE.get(RCP_KEY, "json")) || {};
  let rcpChanged = false;
  const byYear = {};
  for (const tx of list) {
    const key = recipientKey(tx);
    const rec = [tx.name, tx.tin, tx.iban, tx.bankCode, tx.own ? 1 : 0];
    if (!rcp[key] || (!rcp[key][0] && tx.name)) { rcp[key] = rec; rcpChanged = true; }
    (byYear[tx.date.slice(0, 4)] = byYear[tx.date.slice(0, 4)] || []).push([tx.id, tx.date, Math.round(tx.amount * 100), key, (tx.purpose || "").slice(0, 80)]);
  }
  if (rcpChanged) await env.STORE.put(RCP_KEY, JSON.stringify(rcp));
  const agg = (await env.STORE.get(AGG_KEY, "json")) || {};
  let aggChanged = false;
  for (const [year, rows] of Object.entries(byYear)) {
    const key = TX_PREFIX + year;
    const cur = (await env.STORE.get(key, "json")) || [];
    const seen = new Set(cur.map(r => r[0]));
    let added = false;
    for (const r of rows) {
      if (seen.has(r[0])) continue;
      cur.push(r); seen.add(r[0]); added = true;
      // update the running totals for this recipient
      const a = agg[r[3]] || (agg[r[3]] = [0, 0, "", "", 0]);
      a[0] += 1; a[1] += r[2];
      if (r[1] >= a[2]) { a[2] = r[1]; a[3] = r[4]; }
      a[4] |= r[0].startsWith("tbc:") ? 2 : 1;
      aggChanged = true;
    }
    if (added) await env.STORE.put(key, JSON.stringify(cur));
  }
  if (aggChanged) await env.STORE.put(AGG_KEY, JSON.stringify(agg));
  if (aggChanged || rcpChanged) await bumpVersion(env);
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
  id = String(id || "").trim(); secret = String(secret || "").trim(); // copy-paste often adds spaces or a line break
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

// ── TBC login, with self-diagnosis ───────────────────────────────────────────
// The request format is the one TBC's own SDK uses. When TBC still says no, we try the
// safe variants a person would try by hand and remember the one that works:
//   1. keys as given   2. Client ID and Secret swapped   3. keys also sent in the body + apikey header
// If none works on the real server, we check TBC's test server only to explain the problem
// (test keys from developers.tbcbank.ge never work on real accounts). No data is read from the test server.

const TBC_LOGIN_KEY = "dash:bank:tbc-login";
const TBC_TEST_URL = "https://test-api.tbcbank.ge";

async function tryToken(url, id, secret, { extraBody = "", apikey = false } = {}) {
  const headers = { "Content-Type": "application/x-www-form-urlencoded", Authorization: "Basic " + btoa(`${id}:${secret}`) };
  let body = "grant_type=client_credentials" + extraBody;
  if (apikey) { headers.apikey = id; body += `&client_id=${encodeURIComponent(id)}&client_secret=${encodeURIComponent(secret)}`; }
  try {
    const res = await fetch(url, { method: "POST", headers, body });
    const text = await res.text();
    let j = {}; try { j = JSON.parse(text); } catch (_) {}
    if (res.ok && j.access_token) return { ok: true, token: j.access_token };
    const msg = j.error_description || j.message || j.error || j.title || text.slice(0, 120);
    return { ok: false, status: res.status, msg: String(msg || "").trim() };
  } catch (e) {
    return { ok: false, status: 0, msg: String(e.message || e) };
  }
}

async function tbcLogin(env, budget) {
  const id = String(env.TBC_CLIENT_ID || "").trim(), secret = String(env.TBC_CLIENT_SECRET || "").trim();
  const base = (env.TBC_API_URL || TBC_API_URL).replace(/\/+$/, "");
  const variants = [
    { name: "normal", id, secret },
    { name: "swapped", id: secret, secret: id },
    { name: "apikey", id, secret, apikey: true },
  ];
  const remembered = await env.STORE.get(TBC_LOGIN_KEY);
  if (remembered) variants.sort((a, b) => (b.name === remembered) - (a.name === remembered));

  let first = null;
  for (const v of variants) {
    budget.used++;
    const r = await tryToken(base + "/oauth/token", v.id, v.secret, { extraBody: "&scope=bab_accounts", apikey: v.apikey });
    if (r.ok) {
      if (remembered !== v.name) await env.STORE.put(TBC_LOGIN_KEY, v.name);
      return { token: r.token, note: v.name === "swapped" ? "tbc_swapped" : "" };
    }
    first = first || r;
    if (r.status === 0 || r.status >= 500) break; // TBC unreachable / down — no point trying variants
  }
  if (first && (first.status === 0 || first.status >= 500)) throw new Error(`tbc_down|${first.status}|${first.msg}`);

  // explain: are these TBC *test* keys?
  for (const v of variants.slice(0, 2)) {
    budget.used++;
    const r = await tryToken(TBC_TEST_URL + "/oauth/token", v.id, v.secret, { extraBody: "&scope=bab_accounts" });
    if (r.ok) throw new Error("tbc_test_keys||");
  }
  const m = (first?.msg || "").toLowerCase();
  if (m.includes("clientid") || m.includes("client id") || m.includes("invalid client")) throw new Error(`tbc_unknown_id|${first.status}|${first.msg}`);
  throw new Error(`tbc_bad_keys|${first?.status || ""}|${first?.msg || ""}`);
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
  const total = num(g(body, "totalCount") ?? g(body, "count")); // BOG names it "Count" in some API versions
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
  const before = JSON.stringify([state.errors, state.notes]);
  state.errors = {};
  state.notes = {};

  for (const src of sources) {
    let cursor = state.cursors[src.key] || settings.historyFrom;
    if (cursor < settings.historyFrom) cursor = settings.historyFrom;
    try {
      while (cursor <= end && budget.used < STEP_FETCH_BUDGET) {
        const to = addDays(cursor, CHUNK_DAYS - 1) < end ? addDays(cursor, CHUNK_DAYS - 1) : end;
        let recs;
        if (src.key === "tbc") {
          if (!tokens.tbc) {
            const login = await tbcLogin(env, budget);
            tokens.tbc = login.token;
            if (login.note) state.notes = { ...(state.notes || {}), tbc: login.note };
          }
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
  // a fixed key or a new error must reach the Debts page even when no new payments arrived
  if (JSON.stringify([state.errors, state.notes]) !== before) await bumpVersion(env);
  return { done, configured: cfg, state, saved: collected.length, behind: sources.filter(s => (state.cursors[s.key] || "") < addDays(end, -OVERLAP_DAYS)).map(s => ({ source: s.key, at: state.cursors[s.key] })) };
}
