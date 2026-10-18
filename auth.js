// auth.js — the website password.
//
// The CEO sets the password by sending "/password <new password>" to the bot in
// his private Telegram chat. Only a salted hash is stored (in KV), never the
// password itself, and it never appears in the code — the GitHub repo is public.
// Setting a new password logs every device out.

const PW_KEY = "app_password";
const SESSION_TTL = 60 * 60 * 24 * 90; // stay logged in for 90 days
const COOKIE = "pc_session";
const MAX_FAILS = 10;                   // wrong attempts per IP …
const FAIL_WINDOW = 60 * 15;            // … per 15 minutes

const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
const randomHex = (n) => hex(crypto.getRandomValues(new Uint8Array(n)));

async function hashPassword(password, salt) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: enc.encode(salt), iterations: 20000 },
    key,
    256
  );
  return hex(bits);
}

function sameString(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function passwordIsSet(env) {
  return !!(env.STORE && (await env.STORE.get(PW_KEY)));
}

export async function setPassword(env, password) {
  const current = await env.STORE.get(PW_KEY, "json");
  const salt = randomHex(16);
  const record = {
    salt,
    hash: await hashPassword(password, salt),
    v: (current?.v || 0) + 1, // bumping the version logs out all existing sessions
    setAt: new Date().toISOString(),
  };
  await env.STORE.put(PW_KEY, JSON.stringify(record));
  return record.v;
}

function readCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  for (const part of header.split(/;\s*/)) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i) === name) return part.slice(i + 1);
  }
  return "";
}

export async function isLoggedIn(env, request) {
  if (!env.STORE) return false;
  const token = readCookie(request, COOKIE);
  if (!/^[0-9a-f]{40}$/.test(token)) return false;
  const [session, pw] = await Promise.all([
    env.STORE.get(`session:${token}`, "json"),
    env.STORE.get(PW_KEY, "json"),
  ]);
  return !!(session && pw && session.v === pw.v);
}

// Returns { ok, cookie } or { ok: false, error: "not_set" | "wrong" | "too_many" }
export async function login(env, request, password) {
  const pw = await env.STORE.get(PW_KEY, "json");
  if (!pw) return { ok: false, error: "not_set" };

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const failKey = `loginfail:${ip}`;
  const fails = Number(await env.STORE.get(failKey)) || 0;
  if (fails >= MAX_FAILS) return { ok: false, error: "too_many" };

  const hash = await hashPassword(String(password ?? ""), pw.salt);
  if (!sameString(hash, pw.hash)) {
    await env.STORE.put(failKey, String(fails + 1), { expirationTtl: FAIL_WINDOW });
    return { ok: false, error: "wrong" };
  }

  const token = randomHex(20);
  await env.STORE.put(`session:${token}`, JSON.stringify({ v: pw.v }), { expirationTtl: SESSION_TTL });
  return {
    ok: true,
    cookie: `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL}`,
  };
}

export async function logout(env, request) {
  const token = readCookie(request, COOKIE);
  if (/^[0-9a-f]{40}$/.test(token)) await env.STORE.delete(`session:${token}`);
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}
