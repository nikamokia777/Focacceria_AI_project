// telegram.js — the waybill approval bot.
//
// Flow:
//   1. An employee posts a photo of a waybill (or types its number) in the group.
//   2. The bot reads the number, pulls the waybill from rs.ge, compares every
//      line with the base price list and replies with Approve / Reject buttons.
//   3. Approve  → the CEO gets a private message that the waybill is valid.
//      Reject   → the bot asks for the reason; reason + waybill go to the CEO.
//
// The CEO registers once by opening a private chat with the bot and sending /start.

import { lookupWaybill, normalizeWaybillNumber } from "./rsge.js";
import { loadBasePrices } from "./store.js";

const PENDING_TTL = 60 * 60 * 24 * 14; // keep an unanswered waybill for 14 days
const COMMENT_TTL = 60 * 60 * 2;       // wait up to 2 hours for a rejection reason
const MAX_LINES = 40;

const UNITS = { "1": "ცალი", "2": "კგ", "3": "გრ", "4": "ლ", "5": "ტ" };

// ── Texts (Georgian by default, BOT_LANG=en for English) ─────────────────────

const TEXTS = {
  ka: {
    reading: "🔎 ვამოწმებ ზედნადებს…",
    noNumber: "ფოტოზე ზედნადების ნომერი ვერ ამოვიკითხე. გადაიღეთ უფრო მკაფიოდ ან ჩაწერეთ ნომერი ტექსტად.",
    notFound: (n) => `ზედნადები № ${n} rs.ge-ზე ვერ მოიძებნა. გადაამოწმეთ ნომერი.`,
    failed: (e) => `⚠️ შემოწმება ვერ მოხერხდა: ${e}`,
    waybill: "ზედნადები",
    seller: "მომწოდებელი",
    total: "ჯამი",
    cancelled: "⚠️ ეს ზედნადები rs.ge-ზე გაუქმებულია/წაშლილია!",
    mismatches: "ფასის შეუსაბამობა",
    newItems: "ბაზაში არ არის",
    okItems: "ფასი ემთხვევა",
    base: "ბაზა",
    more: (n) => `… და კიდევ ${n} პოზიცია`,
    allOk: "✅ ყველა ფასი ემთხვევა ბაზას.",
    hasIssues: (n) => `⚠️ ${n} პოზიციის ფასი არ ემთხვევა ბაზას.`,
    ask: "შეამოწმეთ საქონელი (რაოდენობა, დაზიანება) და აირჩიეთ:",
    approve: "✅ დადასტურება",
    reject: "❌ უარყოფა",
    approvedBy: (n) => `✅ დაადასტურა: ${n}`,
    rejectedBy: (n) => `❌ უარყო: ${n}`,
    reason: "მიზეზი",
    askReason: (n) => `${n}, დაწერეთ უარყოფის მიზეზი ერთ შეტყობინებაში (ზედნადები № %N%).`,
    reasonSaved: "მიზეზი გადაეგზავნა დირექტორს.",
    already: "ეს ზედნადები უკვე დამუშავებულია.",
    expired: "ეს ზედნადები ვეღარ მოიძებნა (ვადა გაუვიდა). გააგზავნეთ თავიდან.",
    ceoApproved: "✅ ზედნადები დადასტურებულია",
    ceoRejected: "❌ ზედნადები უარყოფილია",
    checkedBy: "შეამოწმა",
    noCeo: "⚠️ დირექტორი ჯერ არ არის დარეგისტრირებული. მან უნდა გახსნას ბოტი პირად ჩატში და გაგზავნოს /start.",
    ceoFail: "⚠️ დირექტორთან გაგზავნა ვერ მოხერხდა.",
    ceoRegistered: "✅ თქვენ დარეგისტრირდით როგორც დირექტორი. ზედნადებების დადასტურებები და უარყოფები აქ მოვა.",
    ceoAlready: "თქვენ უკვე დარეგისტრირებული ხართ. შეტყობინებები აქ მოვა.",
    ceoTaken: "დირექტორი უკვე დარეგისტრირებულია. ეს ბოტი მუშაობს თანამშრომლების ჯგუფში.",
    ceoReset: "დირექტორის რეგისტრაცია გაუქმდა. ახალმა დირექტორმა უნდა გაგზავნოს /start.",
    help: "გააგზავნეთ ზედნადების ფოტო ან ნომერი და მე შევამოწმებ ფასებს.",
  },
  en: {
    reading: "🔎 Checking the waybill…",
    noNumber: "I couldn't read a waybill number from the photo. Take a clearer photo or type the number.",
    notFound: (n) => `Waybill № ${n} was not found on rs.ge. Please check the number.`,
    failed: (e) => `⚠️ Check failed: ${e}`,
    waybill: "Waybill",
    seller: "Supplier",
    total: "Total",
    cancelled: "⚠️ This waybill is cancelled/deleted on rs.ge!",
    mismatches: "Price mismatch",
    newItems: "Not in base list",
    okItems: "Price matches",
    base: "base",
    more: (n) => `… and ${n} more lines`,
    allOk: "✅ All prices match the base list.",
    hasIssues: (n) => `⚠️ ${n} line(s) do not match the base price.`,
    ask: "Check the goods (quantity, damage) and choose:",
    approve: "✅ Approve",
    reject: "❌ Reject",
    approvedBy: (n) => `✅ Approved by ${n}`,
    rejectedBy: (n) => `❌ Rejected by ${n}`,
    reason: "Reason",
    askReason: (n) => `${n}, write the reason for rejecting in one message (waybill № %N%).`,
    reasonSaved: "The reason was sent to the CEO.",
    already: "This waybill has already been handled.",
    expired: "This waybill is no longer available (expired). Please send it again.",
    ceoApproved: "✅ Waybill approved",
    ceoRejected: "❌ Waybill rejected",
    checkedBy: "Checked by",
    noCeo: "⚠️ The CEO is not registered yet. They need to open the bot in a private chat and send /start.",
    ceoFail: "⚠️ Could not deliver the message to the CEO.",
    ceoRegistered: "✅ You are registered as the CEO. Waybill approvals and rejections will arrive here.",
    ceoAlready: "You are already registered. Notifications arrive here.",
    ceoTaken: "A CEO is already registered. This bot works in the employees' group.",
    ceoReset: "CEO registration removed. The new CEO should send /start.",
    help: "Send a waybill photo or number and I will check the prices.",
  },
};

function texts(env) {
  return TEXTS[env.BOT_LANG === "en" ? "en" : "ka"];
}

// ── Telegram API ─────────────────────────────────────────────────────────────

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function tg(env, method, payload) {
  const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON reply */ }
  return data || { ok: false, description: `HTTP ${res.status}` };
}

function send(env, chatId, text, extra = {}) {
  return tg(env, "sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...extra,
  });
}

// A secret Telegram echoes back on every webhook call, so strangers can't fake updates.
export async function webhookSecret(env) {
  if (env.TELEGRAM_WEBHOOK_SECRET) return env.TELEGRAM_WEBHOOK_SECRET;
  const bytes = new TextEncoder().encode(`webhook:${env.TELEGRAM_BOT_TOKEN}`);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// One-time setup: tell Telegram where to deliver updates.
export async function setupWebhook(env, origin) {
  return tg(env, "setWebhook", {
    url: `${origin}/telegram-webhook`,
    secret_token: await webhookSecret(env),
    allowed_updates: ["message", "callback_query"],
  });
}

// ── Reading the waybill number from a photo ──────────────────────────────────

function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

async function downloadFile(env, fileId) {
  const info = await tg(env, "getFile", { file_id: fileId });
  if (!info.ok) throw new Error(info.description || "getFile failed");
  const res = await fetch(`https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${info.result.file_path}`);
  if (!res.ok) throw new Error(`file download HTTP ${res.status}`);
  return toBase64(await res.arrayBuffer());
}

async function readWaybillNumber(env, base64, mimeType) {
  if (!env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set");
  const prompt = `This is a photo of a Georgian electronic waybill (სასაქონლო ზედნადები) from rs.ge, or of its number.
Find the waybill number (ზედნადების ნომერი). It is usually printed as "ელ-" followed by about 10 digits, e.g. ელ-0988938607.
Reply with ONLY the digits of the waybill number (keep leading zeros). If you cannot find one, reply with exactly NONE.`;
  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: base64 } }] }],
    generationConfig: { temperature: 0, maxOutputTokens: 2000 },
  });

  let res, data;
  for (let attempt = 0; attempt < 3; attempt++) {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body }
    );
    try { data = await res.json(); } catch { data = {}; }
    if (res.ok) break;
    const transient = res.status === 429 || res.status >= 500;
    if (!transient || attempt === 2) break;
    await new Promise((r) => setTimeout(r, attempt === 0 ? 1000 : 2500));
  }
  if (!res.ok) throw new Error(data?.error?.message || "Gemini error");
  const text = (data?.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
  return normalizeWaybillNumber(text);
}

// ── Price comparison ─────────────────────────────────────────────────────────

const norm = (s) => String(s ?? "").trim().toLowerCase();

function findBase(basePrices, item) {
  const code = norm(item.code);
  if (code) {
    const byCode = basePrices.find((b) => norm(b.code) === code);
    if (byCode) return byCode;
  }
  const name = norm(item.name);
  if (!name) return null;
  return basePrices.find((b) => {
    const candidates = [norm(b.name), norm(b.nameRs)].filter((n) => n.length >= 3);
    return candidates.some((n) => n === name || n.includes(name) || name.includes(n));
  }) || null;
}

export function compareGoods(goods, basePrices) {
  return goods.map((g) => {
    const base = findBase(basePrices, g);
    const basePrice = base ? Number(base.basePrice) : null;
    let status = "unknown";
    let diff = null;
    if (basePrice !== null && !Number.isNaN(basePrice)) {
      diff = g.price - basePrice;
      status = Math.abs(diff) < 0.005 ? "ok" : diff > 0 ? "high" : "low";
    }
    return { ...g, basePrice, diff, status, supplier: base?.supplier || "" };
  });
}

const money = (n) => Number(n || 0).toFixed(2);
const qty = (n) => String(Math.round(Number(n || 0) * 1000) / 1000);

function goodsLine(t, r) {
  const unit = r.unitText || UNITS[r.unitId] || "";
  const head = `${esc(r.name)} — ${qty(r.quantity)}${unit ? " " + esc(unit) : ""} × ${money(r.price)}`;
  if (r.status === "high" || r.status === "low") {
    const pct = r.basePrice ? ` (${r.diff > 0 ? "+" : ""}${((r.diff / r.basePrice) * 100).toFixed(1)}%)` : "";
    return `${r.status === "high" ? "🔴 ▲" : "🔵 ▼"} ${head} | ${t.base}: ${money(r.basePrice)}${pct}`;
  }
  return `• ${head}`;
}

export function buildSummary(t, waybill, rows) {
  const bad = rows.filter((r) => r.status === "high" || r.status === "low");
  const unknown = rows.filter((r) => r.status === "unknown");
  const ok = rows.filter((r) => r.status === "ok");

  let out = `🧾 <b>${t.waybill} № ${esc(waybill.number)}</b>\n`;
  if (waybill.sellerName) out += `${t.seller}: ${esc(waybill.sellerName)}\n`;
  const total = waybill.fullAmount || rows.reduce((s, r) => s + (r.amount || r.price * r.quantity), 0);
  out += `${t.total}: ${money(total)} ₾\n`;
  if (Number(waybill.status) < 0) out += `\n${t.cancelled}\n`;

  let budget = MAX_LINES;
  const section = (title, list) => {
    if (!list.length) return;
    out += `\n<b>${title} (${list.length})</b>\n`;
    const shown = list.slice(0, Math.max(budget, 0));
    shown.forEach((r) => { out += goodsLine(t, r) + "\n"; });
    budget -= shown.length;
    if (list.length > shown.length) out += `${t.more(list.length - shown.length)}\n`;
  };
  section(`⚠️ ${t.mismatches}`, bad);
  section(`❓ ${t.newItems}`, unknown);
  section(`✅ ${t.okItems}`, ok);

  out += `\n${bad.length ? t.hasIssues(bad.length) : unknown.length ? "" : t.allOk}`;
  return out.trim();
}

// ── Handlers ─────────────────────────────────────────────────────────────────

function displayName(user) {
  const full = [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim();
  return full || (user?.username ? `@${user.username}` : "—");
}

function newToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Look the waybill up, compare prices, post the result with buttons.
async function processWaybill(env, msg, number, hasPhoto = false) {
  const t = texts(env);
  const chatId = msg.chat.id;
  const reply = { reply_to_message_id: msg.message_id, allow_sending_without_reply: true };

  let waybill;
  try {
    waybill = await lookupWaybill(env, number);
  } catch (err) {
    await send(env, chatId, t.failed(esc(err.message)), reply);
    return;
  }
  if (!waybill) {
    await send(env, chatId, t.notFound(esc(number)), reply);
    return;
  }

  const rows = compareGoods(waybill.goods, await loadBasePrices(env));
  const summary = buildSummary(t, waybill, rows);
  const token = newToken();

  const sent = await send(env, chatId, `${summary}\n\n${t.ask}`, {
    ...reply,
    reply_markup: {
      inline_keyboard: [[
        { text: t.approve, callback_data: `a:${token}` },
        { text: t.reject, callback_data: `r:${token}` },
      ]],
    },
  });
  if (!sent.ok) return;

  await env.STORE.put(`pending:${token}`, JSON.stringify({
    status: "open",
    number: waybill.number || number,
    summary,
    chatId,
    sourceMessageId: msg.message_id,          // the employee's photo / text
    hasPhoto,                                 // copy the photo to the CEO later
    resultMessageId: sent.result.message_id,  // the bot's message with buttons
  }), { expirationTtl: PENDING_TTL });
}

// Send the outcome to the CEO's private chat. Returns true when delivered.
async function notifyCeo(env, pending, heading, byName, comment) {
  const t = texts(env);
  const ceoChatId = env.CEO_CHAT_ID || (await env.STORE.get("ceo_chat_id"));
  if (!ceoChatId) {
    await send(env, pending.chatId, t.noCeo);
    return false;
  }
  let text = `<b>${heading}</b>\n${t.checkedBy}: ${esc(byName)}\n`;
  if (comment) text += `${t.reason}: ${esc(comment)}\n`;
  text += `\n${pending.summary}`;

  const sent = await send(env, ceoChatId, text);
  if (!sent.ok) {
    await send(env, pending.chatId, `${t.ceoFail} (${esc(sent.description || "")})`);
    return false;
  }
  // Attach the employee's original photo so the CEO sees the paper waybill too.
  if (pending.hasPhoto) {
    await tg(env, "copyMessage", {
      chat_id: ceoChatId,
      from_chat_id: pending.chatId,
      message_id: pending.sourceMessageId,
    });
  }
  return true;
}

async function handleCallback(env, cq) {
  const t = texts(env);
  const [action, token] = String(cq.data || "").split(":");
  const key = `pending:${token}`;
  const raw = token ? await env.STORE.get(key) : null;

  if (!raw) {
    await tg(env, "answerCallbackQuery", { callback_query_id: cq.id, text: t.expired, show_alert: true });
    return;
  }
  const pending = JSON.parse(raw);
  if (pending.status !== "open") {
    await tg(env, "answerCallbackQuery", { callback_query_id: cq.id, text: t.already, show_alert: true });
    return;
  }
  const name = displayName(cq.from);

  if (action === "a") {
    pending.status = "approved";
    pending.by = name;
    await env.STORE.put(key, JSON.stringify(pending), { expirationTtl: PENDING_TTL });
    await tg(env, "answerCallbackQuery", { callback_query_id: cq.id });
    await tg(env, "editMessageText", {
      chat_id: pending.chatId,
      message_id: pending.resultMessageId,
      text: `${pending.summary}\n\n<b>${esc(t.approvedBy(name))}</b>`,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });
    await notifyCeo(env, pending, t.ceoApproved, name, "");
    return;
  }

  if (action === "r") {
    pending.status = "awaiting_comment";
    pending.by = name;
    await env.STORE.put(key, JSON.stringify(pending), { expirationTtl: PENDING_TTL });
    await env.STORE.put(`await:${pending.chatId}:${cq.from.id}`, token, { expirationTtl: COMMENT_TTL });
    await tg(env, "answerCallbackQuery", { callback_query_id: cq.id });
    await tg(env, "editMessageText", {
      chat_id: pending.chatId,
      message_id: pending.resultMessageId,
      text: `${pending.summary}\n\n<b>${esc(t.rejectedBy(name))}</b>`,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });
    await send(env, pending.chatId, esc(t.askReason(name).replace("%N%", pending.number)), {
      reply_to_message_id: pending.resultMessageId,
      allow_sending_without_reply: true,
      reply_markup: { force_reply: true, selective: true },
    });
    return;
  }

  await tg(env, "answerCallbackQuery", { callback_query_id: cq.id });
}

// If this user owes us a rejection reason, take this message as the reason.
async function tryConsumeComment(env, msg) {
  const t = texts(env);
  const awaitKey = `await:${msg.chat.id}:${msg.from?.id}`;
  const token = await env.STORE.get(awaitKey);
  if (!token) return false;

  const key = `pending:${token}`;
  const raw = await env.STORE.get(key);
  await env.STORE.delete(awaitKey);
  if (!raw) return false;
  const pending = JSON.parse(raw);
  if (pending.status !== "awaiting_comment") return false;

  const comment = msg.text.trim();
  pending.status = "rejected";
  pending.comment = comment;
  await env.STORE.put(key, JSON.stringify(pending), { expirationTtl: PENDING_TTL });

  await tg(env, "editMessageText", {
    chat_id: pending.chatId,
    message_id: pending.resultMessageId,
    text: `${pending.summary}\n\n<b>${esc(t.rejectedBy(pending.by))}</b>\n${t.reason}: ${esc(comment)}`,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });
  const delivered = await notifyCeo(env, pending, t.ceoRejected, pending.by, comment);
  if (delivered) {
    await send(env, msg.chat.id, t.reasonSaved, {
      reply_to_message_id: msg.message_id,
      allow_sending_without_reply: true,
    });
  }
  return true;
}

async function handlePrivateCommand(env, msg, command) {
  const t = texts(env);
  const chatId = String(msg.chat.id);
  const current = await env.STORE.get("ceo_chat_id");

  if (command === "/start") {
    if (!current) {
      await env.STORE.put("ceo_chat_id", chatId);
      await send(env, chatId, t.ceoRegistered);
    } else {
      await send(env, chatId, current === chatId ? t.ceoAlready : t.ceoTaken);
    }
    return true;
  }
  if (command === "/resetceo" && current === chatId) {
    await env.STORE.delete("ceo_chat_id");
    await send(env, chatId, t.ceoReset);
    return true;
  }
  return false;
}

async function handleMessage(env, msg) {
  const t = texts(env);
  const isPrivate = msg.chat.type === "private";
  const text = (msg.text || "").trim();
  const command = text.startsWith("/") ? text.split(/[\s@]/)[0].toLowerCase() : "";

  if (isPrivate && command && (await handlePrivateCommand(env, msg, command))) return;
  if (command === "/help" || (command === "/start" && !isPrivate)) {
    await send(env, msg.chat.id, t.help);
    return;
  }

  // A photo, or an image sent as a file.
  const photo = msg.photo?.length ? msg.photo[msg.photo.length - 1] : null;
  const imageDoc = msg.document && /^image\//.test(msg.document.mime_type || "") ? msg.document : null;
  if (photo || imageDoc) {
    const reply = { reply_to_message_id: msg.message_id, allow_sending_without_reply: true };
    let number = normalizeWaybillNumber(msg.caption); // number typed as caption wins
    if (!number) {
      try {
        const base64 = await downloadFile(env, (photo || imageDoc).file_id);
        number = await readWaybillNumber(env, base64, imageDoc?.mime_type || "image/jpeg");
      } catch (err) {
        await send(env, msg.chat.id, t.failed(esc(err.message)), reply);
        return;
      }
    }
    if (!number) {
      await send(env, msg.chat.id, t.noNumber, reply);
      return;
    }
    await processWaybill(env, msg, number, true);
    return;
  }

  if (!text || command) return;

  // A pending rejection reason takes priority over everything else.
  if (await tryConsumeComment(env, msg)) return;

  // A message that is just a waybill number, e.g. "ელ-0988938607" or "0988938607".
  if (/^(?:ელ|el)?[\s\-–.№#]*\d{8,12}(?:\/\d+)?$/i.test(text)) {
    await processWaybill(env, msg, normalizeWaybillNumber(text));
  }
}

export async function handleUpdate(env, update) {
  if (update.callback_query) return handleCallback(env, update.callback_query);
  if (update.message) return handleMessage(env, update.message);
}
