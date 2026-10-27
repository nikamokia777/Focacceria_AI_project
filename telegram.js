// telegram.js — the Telegram bot.
//
// In the employees' group:
//   • A photo of a waybill (or its number) → the bot pulls it from rs.ge, compares
//     every line with the product list and replies with Approve / Reject buttons.
//       Approve → the waybill goes to History on the website (with a "send to
//                 accountant" button); ordered products in it count as received.
//       Reject  → the bot asks for the reason; the waybill + reason go to the
//                 Mistakes tab (with "send to distributor" and "resolved" buttons).
//     Either way the CEO gets a short notice in his private chat.
//   • A shopping list, one product per line ("რუკოლა 2კგ") → the products are
//     ticked in the Orders tab.
//   • Storage alarms (stock.js): a product fell to its minimum → Approve ticks it in
//     the order; Disapprove asks for a comment and adds a "needs to check" task.
//
// In the CEO's private chat:
//   /start               register as the CEO (first person only)
//   /password <new>      set the website password (message is deleted right away)
//   /resetceo            give up the CEO registration

import { lookupWaybill, normalizeWaybillNumber } from "./rsge.js";
import {
  loadBasePrices, loadSettings, toWhatsAppNumber, upsertLog, patchLog, getLogRecord,
  applyOrderOps, receiveOrderItems, loadOrder,
} from "./store.js";
import { setAlarmState, addCheckTask, setTaskNote } from "./stock.js";
import { parseOrderMessage, matchProduct } from "./orders.js";
import { setPassword } from "./auth.js";

const PENDING_TTL = 60 * 60 * 24 * 14; // keep an unanswered waybill for 14 days
const LINK_TTL = 60 * 60 * 24 * 90;    // old "send later" WhatsApp buttons keep working for 90 days
const COMMENT_TTL = 60 * 60 * 2;       // wait up to 2 hours for a rejection reason
const MAX_LINES = 40;

export const UNITS = { "1": "ცალი", "2": "კგ", "3": "გრ", "4": "ლ", "5": "ტ" };

// ── Texts (Georgian by default, BOT_LANG=en for English) ─────────────────────

const TEXTS = {
  ka: {
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
    reasonSaved: "მიზეზი შენახულია და დირექტორს ეცნობა.",
    already: "ეს ზედნადები უკვე დამუშავებულია.",
    expired: "ეს ზედნადები ვეღარ მოიძებნა (ვადა გაუვიდა). გააგზავნეთ თავიდან.",
    ceoApproved: (n) => `✅ ზედნადები № ${n} დადასტურებულია`,
    ceoRejected: (n) => `❌ ზედნადები № ${n} უარყოფილია`,
    checkedBy: "შეამოწმა",
    receivedFromOrder: (n) => `🛒 შეკვეთიდან მიღებულად მოინიშნა: ${n} პოზიცია`,
    openHistory: "📋 ისტორიაში ნახვა",
    openMistakes: "⚠️ შეცდომებში ნახვა",
    noCeo: "⚠️ დირექტორი ჯერ არ არის დარეგისტრირებული. მან უნდა გახსნას ბოტი პირად ჩატში და გაგზავნოს /start.",
    ceoRegistered: "✅ თქვენ დარეგისტრირდით როგორც დირექტორი. ზედნადებების შეტყობინებები აქ მოვა.\n\nსაიტის პაროლის დასაყენებლად გამოგზავნეთ:\n/password თქვენი_პაროლი",
    ceoAlready: "თქვენ უკვე დარეგისტრირებული ხართ. შეტყობინებები აქ მოვა.",
    ceoTaken: "დირექტორი უკვე დარეგისტრირებულია. ეს ბოტი მუშაობს თანამშრომლების ჯგუფში.",
    ceoReset: "დირექტორის რეგისტრაცია გაუქმდა. ახალმა დირექტორმა უნდა გაგზავნოს /start.",
    help: "• გააგზავნეთ ზედნადების ფოტო ან ნომერი — შევამოწმებ ფასებს.\n• შეკვეთისთვის დაწერეთ თითო პროდუქტი ცალკე ხაზზე, მაგ.:\nრუკოლა 2კგ\nჩერი პომიდორი 3 კგ",
    pwUsage: "გამოიყენეთ ასე:\n/password ახალი_პაროლი\n(მინიმუმ 4 სიმბოლო)",
    pwSet: "✅ საიტის პაროლი დაყენებულია. თქვენი შეტყობინება წაიშალა.\nყველა მოწყობილობიდან გამოსვლა მოხდა — შედით ახალი პაროლით.",
    pwNotCeo: "პაროლის შეცვლა მხოლოდ დირექტორს შეუძლია.",
    orderAdded: "🛒 შეკვეთაში დაემატა:",
    orderNotFound: "⚠️ პროდუქტებში ვერ ვიპოვე:",
    orderNotFoundHint: "დაამატეთ საიტზე „პროდუქტებში“ ან დააზუსტეთ სახელი.",
    linkExpired: "ეს ბმული აღარ მოქმედებს.",
    // old messages (sent before this update) still have these buttons
    laterDistributor: "📤 მომწოდებელთან გაგზავნა",
    laterAccountant: "📤 ბუღალტერთან გაგზავნა",
    notSent: "⏸ არ გაიგზავნა. მოგვიანებით გასაგზავნად დააჭირეთ ღილაკს.",
    waOpened: "📲 WhatsApp გაიხსნა",
    stockAlarm: "🔔 მარაგი იწურება",
    stockLeft: "დარჩა",
    stockMin: "მინიმუმი",
    prio: { red: "🔴 მაღალი პრიორიტეტი", yellow: "🟡 საშუალო პრიორიტეტი", cyan: "🔵 დაბალი პრიორიტეტი" },
    stockApprove: "✅ შეკვეთაში დამატება",
    stockReject: "❌ არ ვუკვეთავთ",
    stockOrdered: (n) => `✅ ${n}: შეკვეთაში დაემატა`,
    stockInOrder: (n) => `✅ ${n}: დადასტურდა (უკვე შეკვეთაშია)`,
    stockNoLink: (n) => `✅ ${n}: დადასტურდა\n⚠️ PriceCheck-ის პროდუქტთან დაკავშირებული არ არის — შეკვეთაში ხელით დაამატეთ ან დააკავშირეთ „საწყობის“ ჩანართში.`,
    stockRejectedBy: (n) => `❌ ${n}: არ ვუკვეთავთ`,
    askStockReason: (n, p) => `${n}, დაწერეთ კომენტარი ერთ შეტყობინებაში (${p}) — დავალებებში დაემატება „შესამოწმებელი“ ნიშნით.`,
    stockReasonSaved: "კომენტარი დავალებას დაემატა.",
    stockTask: (p) => `📦 ${p}: მარაგი იწურება — შეკვეთა არ დადასტურდა`,
    stockAlready: "ეს შეტყობინება უკვე დამუშავებულია.",
    comment: "კომენტარი",
  },
  en: {
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
    reasonSaved: "The reason was saved and the CEO was notified.",
    already: "This waybill has already been handled.",
    expired: "This waybill is no longer available (expired). Please send it again.",
    ceoApproved: (n) => `✅ Waybill № ${n} approved`,
    ceoRejected: (n) => `❌ Waybill № ${n} rejected`,
    checkedBy: "Checked by",
    receivedFromOrder: (n) => `🛒 Marked as received from the order: ${n} item(s)`,
    openHistory: "📋 Open History",
    openMistakes: "⚠️ Open Mistakes",
    noCeo: "⚠️ The CEO is not registered yet. They need to open the bot in a private chat and send /start.",
    ceoRegistered: "✅ You are registered as the CEO. Waybill notifications will arrive here.\n\nTo set the website password send:\n/password your_password",
    ceoAlready: "You are already registered. Notifications arrive here.",
    ceoTaken: "A CEO is already registered. This bot works in the employees' group.",
    ceoReset: "CEO registration removed. The new CEO should send /start.",
    help: "• Send a waybill photo or number and I will check the prices.\n• To order, write one product per line, e.g.:\nრუკოლა 2კგ\nჩერი პომიდორი 3 კგ",
    pwUsage: "Use it like this:\n/password new_password\n(at least 4 characters)",
    pwSet: "✅ Website password set. Your message was deleted.\nAll devices were logged out — log in with the new password.",
    pwNotCeo: "Only the CEO can change the password.",
    orderAdded: "🛒 Added to the order:",
    orderNotFound: "⚠️ Not found in Products:",
    orderNotFoundHint: "Add it under Products on the website or check the name.",
    linkExpired: "This link is no longer valid.",
    laterDistributor: "📤 Send to distributor",
    laterAccountant: "📤 Send to accountant",
    notSent: "⏸ Not sent. Tap the button below to send it later.",
    waOpened: "📲 WhatsApp opened",
    stockAlarm: "🔔 Running low",
    stockLeft: "Left",
    stockMin: "minimum",
    prio: { red: "🔴 High priority", yellow: "🟡 Moderate priority", cyan: "🔵 Low priority" },
    stockApprove: "✅ Add to order",
    stockReject: "❌ Don't order",
    stockOrdered: (n) => `✅ ${n}: added to the order`,
    stockInOrder: (n) => `✅ ${n}: approved (already in the order)`,
    stockNoLink: (n) => `✅ ${n}: approved\n⚠️ Not linked to a PriceCheck product — add it to the order by hand or link it in the Storage tab.`,
    stockRejectedBy: (n) => `❌ ${n}: not ordering`,
    askStockReason: (n, p) => `${n}, write a comment in one message (${p}) — it will be added to Tasks as "needs to check".`,
    stockReasonSaved: "The comment was added to the task.",
    stockTask: (p) => `📦 ${p}: running low — order not approved`,
    stockAlready: "This alarm has already been handled.",
    comment: "Comment",
  },
};

function texts(env) {
  return TEXTS[env.BOT_LANG === "en" ? "en" : "ka"];
}

// ── WhatsApp message texts (plain text — edit the wording here) ──────────────

export const WHATSAPP = {
  // kind "d": to the distributor about a rejected waybill
  d: (p) =>
    `გამარჯობა!\n` +
    `ზედნადები № ${p.number}${p.date ? ` (${p.date})` : ""} — მიღებისას აღმოჩნდა პრობლემა:\n` +
    `${p.comment || "—"}\n\n` +
    `გთხოვთ დაგვიკავშირდეთ.`,
  // kind "a": to the accountant about an approved waybill
  a: (p) =>
    `გამარჯობა!\n` +
    `ზედნადები № ${p.number}${p.date ? ` (${p.date})` : ""} შემოწმებულია და დადასტურებულია.\n` +
    (p.seller ? `მომწოდებელი: ${p.seller}\n` : "") +
    (p.total ? `ჯამი: ${p.total} ₾\n` : "") +
    `შეამოწმა: ${p.by || "—"}`,
};

// The web address of this app, e.g. https://focacceria-ai-project.….workers.dev
let ORIGIN = "";

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
    return { ...g, basePrice, diff, status, supplier: base?.supplier || "", baseId: base?.id ?? null, phone: base?.phone || "" };
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

function mostCommon(list) {
  const counts = new Map();
  for (const x of list) counts.set(x, (counts.get(x) || 0) + 1);
  let best = "";
  for (const [x, n] of counts) if (!best || n > counts.get(best)) best = x;
  return best;
}

function newToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const nowIso = () => new Date().toISOString();

async function ceoChatId(env) {
  return env.CEO_CHAT_ID || (await env.STORE.get("ceo_chat_id"));
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
    createdAt: nowIso(),
    seller: waybill.sellerName || "",
    sellerTin: waybill.sellerTin || "",
    total: money(waybill.fullAmount || rows.reduce((sum, r) => sum + (r.amount || r.price * r.quantity), 0)),
    date: String(waybill.deliveryDate || waybill.beginDate || waybill.createDate || "").slice(0, 10),
    baseIds: [...new Set(rows.map((r) => r.baseId).filter((id) => id != null))],
    distributorPhone: mostCommon(rows.map((r) => r.phone).filter(Boolean)),
    // compact copy of the lines for the website
    rows: rows.map((r) => ({
      n: r.name,
      c: r.code,
      q: r.quantity,
      u: r.unitText || UNITS[r.unitId] || "",
      p: r.price,
      b: r.basePrice,
      s: r.status,
    })),
  }), { expirationTtl: PENDING_TTL });
}

// The record shown on the website (History / Mistakes).
function logRecord(token, p, extra) {
  return {
    token,
    kind: "waybill",
    number: p.number,
    seller: p.seller || "",
    sellerTin: p.sellerTin || "",
    total: p.total || "",
    date: p.date || "",
    by: p.by || "",
    comment: p.comment || "",
    rows: p.rows || [],
    baseIds: p.baseIds || [],
    distributorPhone: p.distributorPhone || "",
    createdAt: p.createdAt || nowIso(),
    ...extra,
  };
}

// Short notice to the CEO's private chat, with a button that opens the website.
async function notifyCeo(env, rec, kind, extraLines = []) {
  const t = texts(env);
  const ceo = await ceoChatId(env);
  if (!ceo) {
    await send(env, rec.chatId, t.noCeo);
    return false;
  }
  if (rec.hasPhoto) {
    await tg(env, "copyMessage", { chat_id: ceo, from_chat_id: rec.chatId, message_id: rec.sourceMessageId });
  }
  const heading = kind === "a" ? t.ceoApproved(esc(rec.number)) : t.ceoRejected(esc(rec.number));
  let text = `<b>${heading}</b>\n`;
  if (rec.seller) text += `${t.seller}: ${esc(rec.seller)}\n`;
  if (rec.total) text += `${t.total}: ${esc(rec.total)} ₾\n`;
  text += `${t.checkedBy}: ${esc(rec.by)}\n`;
  if (kind === "d") text += `${t.reason}: ${esc(rec.comment || "—")}\n`;
  for (const line of extraLines.filter(Boolean)) text += `${line}\n`;

  const url = /^https:\/\//.test(ORIGIN) ? `${ORIGIN}/#${kind === "a" ? "history" : "mistakes"}` : "";
  const extra = url
    ? { reply_markup: { inline_keyboard: [[{ text: kind === "a" ? t.openHistory : t.openMistakes, url }]] } }
    : {};
  const sent = await send(env, ceo, text.trim(), extra);
  return !!sent.ok;
}

// ── WhatsApp links (/wa/<token>/<a|d>) ───────────────────────────────────────

const waLink = (token, kind) => `${ORIGIN}/wa/${token}/${kind}`;

function laterButton(t, token, kind) {
  return { text: kind === "d" ? t.laterDistributor : t.laterAccountant, url: waLink(token, kind) };
}

// Phone number of the distributor: taken from the products on this waybill.
export async function distributorNumber(env, rec) {
  const ids = new Set(rec.baseIds || []);
  let phone = "";
  if (ids.size) {
    const prices = await loadBasePrices(env);
    phone = mostCommon(prices.filter((p) => ids.has(p.id) && p.phone).map((p) => p.phone));
  }
  return toWhatsAppNumber(phone || rec.distributorPhone);
}

// Messages sent before this update had their WhatsApp buttons in Telegram.
async function updateCeoMessage(env, pending, token, kind, statusLine) {
  const t = texts(env);
  if (!pending.ceoMessageId) return;
  await tg(env, "editMessageText", {
    chat_id: pending.ceoChatId,
    message_id: pending.ceoMessageId,
    text: `${pending.ceoText}\n\n<b>${esc(statusLine)}</b>`,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: { inline_keyboard: [[laterButton(t, token, kind)]] },
  });
}

// Opens WhatsApp with the message already written (accountant "a" / distributor "d")
// and records that it was sent. Used by the website buttons (and old Telegram buttons).
export async function handleWhatsAppLink(env, ctx, token, kind) {
  const t = texts(env);
  const valid = /^[0-9a-f]{8,64}$/.test(token) && (kind === "a" || kind === "d");
  let rec = valid ? await getLogRecord(env, token) : null;
  let pending = null;
  if (valid && !rec) {
    const raw = await env.STORE.get(`pending:${token}`);
    pending = raw ? JSON.parse(raw) : null;
    rec = pending;
  }
  const allowed = kind === "d" ? ["rejected", "resolved"] : ["approved"];
  if (!rec || !allowed.includes(rec.status)) {
    return new Response(
      `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
      `<p style="font:16px sans-serif;padding:24px">${esc(t.linkExpired)}</p>`,
      { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  const number = kind === "d"
    ? await distributorNumber(env, rec)
    : toWhatsAppNumber((await loadSettings(env)).accountantPhone);
  const target = `https://wa.me/${number}?text=${encodeURIComponent(WHATSAPP[kind](rec))}`;

  ctx.waitUntil((async () => {
    const field = kind === "d" ? "distributorSentAt" : "accountantSentAt";
    const updated = await patchLog(env, token, (r) => ({ ...r, [field]: nowIso() }));
    if (pending && !updated) {
      const decisionKey = kind === "d" ? "distributorDecision" : "accountantDecision";
      if (pending[decisionKey] !== "yes") {
        pending[decisionKey] = "yes";
        await env.STORE.put(`pending:${token}`, JSON.stringify(pending), { expirationTtl: LINK_TTL });
        await updateCeoMessage(env, pending, token, kind, t.waOpened);
      }
    }
  })().catch((err) => console.error("whatsapp link update failed:", err?.stack || err)));

  return new Response(null, { status: 302, headers: { Location: target, "Cache-Control": "no-store" } });
}

// "No" under an old Telegram WhatsApp question.
async function handleCeoNo(env, cq, kind, token) {
  const t = texts(env);
  const key = `pending:${token}`;
  const raw = token ? await env.STORE.get(key) : null;
  if (!raw) {
    await tg(env, "answerCallbackQuery", { callback_query_id: cq.id, text: t.expired, show_alert: true });
    return;
  }
  const pending = JSON.parse(raw);
  const decisionKey = kind === "d" ? "distributorDecision" : "accountantDecision";
  if (!pending[decisionKey]) {
    pending[decisionKey] = "no";
    await env.STORE.put(key, JSON.stringify(pending), { expirationTtl: LINK_TTL });
  }
  await tg(env, "answerCallbackQuery", { callback_query_id: cq.id });
  await updateCeoMessage(env, pending, token, kind, t.notSent);
}

// ── Approve / Reject buttons ─────────────────────────────────────────────────

async function handleCallback(env, cq) {
  const t = texts(env);
  const [action, token] = String(cq.data || "").split(":");
  if (action === "an" || action === "dn") return handleCeoNo(env, cq, action[0], token);
  if (action === "sa" || action === "sr") return handleStockCallback(env, cq, action === "sa", token);

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
    await env.STORE.put(key, JSON.stringify(pending), { expirationTtl: LINK_TTL });
    await tg(env, "answerCallbackQuery", { callback_query_id: cq.id });
    await tg(env, "editMessageText", {
      chat_id: pending.chatId,
      message_id: pending.resultMessageId,
      text: `${pending.summary}\n\n<b>${esc(t.approvedBy(name))}</b>`,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });

    // Ordered products on this waybill have arrived → take them off the order.
    const received = await receiveOrderItems(env, pending.baseIds);
    let receivedItems = [];
    if (received.length) {
      const byId = new Map((await loadBasePrices(env)).map((p) => [p.id, p]));
      receivedItems = received.map((it) => ({
        name: byId.get(it.productId)?.name || `#${it.productId}`,
        qty: it.qty,
        unit: it.unit,
      }));
    }
    await upsertLog(env, logRecord(token, pending, { status: "approved", decidedAt: nowIso(), receivedItems }));

    const bad = (pending.rows || []).filter((r) => r.s === "high" || r.s === "low").length;
    await notifyCeo(env, pending, "a", [
      bad ? t.hasIssues(bad) : "",
      receivedItems.length ? t.receivedFromOrder(receivedItems.length) : "",
    ]);
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
    // Shows up in Mistakes right away; the reason is filled in when it arrives.
    await upsertLog(env, logRecord(token, pending, { status: "rejected", decidedAt: nowIso() }));
    await send(env, pending.chatId, esc(t.askReason(name).replace("%N%", pending.number)), {
      reply_to_message_id: pending.resultMessageId,
      allow_sending_without_reply: true,
      reply_markup: { force_reply: true, selective: true },
    });
    return;
  }

  await tg(env, "answerCallbackQuery", { callback_query_id: cq.id });
}

// ── Storage alarms ───────────────────────────────────────────────────────────

const STOCK_TTL = 60 * 60 * 24 * 30;
const amountStr = (n, unit) => `${qty(n)}${unit ? " " + unit : ""}`;

function stockSummary(t, a) {
  return [
    `<b>${t.stockAlarm}</b>`,
    `<b>${esc(a.name)}</b>`,
    `${t.stockLeft}: <b>${esc(amountStr(a.live, a.unit))}</b> · ${t.stockMin}: ${esc(amountStr(a.min, a.unit))}`,
    a.prio && t.prio[a.prio] ? t.prio[a.prio] : "",
  ].filter(Boolean).join("\n");
}

// Post one alarm to the group; returns its token, or "" if Telegram refused.
export async function sendStockAlarm(env, chatId, item) {
  const t = texts(env);
  const token = newToken();
  const a = {
    id: item.id, name: item.name, unit: item.unit, live: item.live, min: item.min, prio: item.prio,
    link: item.link?.id || null, chatId, status: "open",
  };
  const r = await send(env, chatId, stockSummary(t, a), {
    reply_markup: { inline_keyboard: [[
      { text: t.stockApprove, callback_data: `sa:${token}` },
      { text: t.stockReject, callback_data: `sr:${token}` },
    ]] },
  });
  if (!r.ok) {
    console.error("stock alarm not sent:", r.description);
    return "";
  }
  a.messageId = r.result.message_id;
  await env.STORE.put(`stockalarm:${token}`, JSON.stringify(a), { expirationTtl: STOCK_TTL });
  return token;
}

async function handleStockCallback(env, cq, approve, token) {
  const t = texts(env);
  const key = `stockalarm:${token}`;
  const a = token ? await env.STORE.get(key, "json") : null;
  if (!a || a.status !== "open") {
    await tg(env, "answerCallbackQuery", { callback_query_id: cq.id, text: a ? t.stockAlready : t.linkExpired, show_alert: true });
    return;
  }
  const name = displayName(cq.from);
  a.by = name;
  await tg(env, "answerCallbackQuery", { callback_query_id: cq.id });
  const edit = (line) => tg(env, "editMessageText", {
    chat_id: a.chatId, message_id: a.messageId, parse_mode: "HTML", disable_web_page_preview: true,
    text: `${stockSummary(t, a)}\n\n<b>${esc(line)}</b>`,
  });

  if (approve) {
    a.status = "approved";
    await env.STORE.put(key, JSON.stringify(a), { expirationTtl: STOCK_TTL });
    await setAlarmState(env, a.id, token, "approved");
    if (!a.link) return edit(t.stockNoLink(name));
    const order = await loadOrder(env);
    if (order.items.some((it) => it.productId === a.link)) return edit(t.stockInOrder(name));
    // enough to get back to the minimum (at least 1); the amount can be changed in Orders
    const need = Math.max(Math.round((a.min - a.live) * 100) / 100, 1);
    await applyOrderOps(env, [{ op: "set", productId: a.link, qty: need, unit: a.unit, by: name, source: "telegram",
      comment: `${t.stockLeft}: ${amountStr(a.live, a.unit)} / ${t.stockMin}: ${amountStr(a.min, a.unit)}` }]);
    return edit(t.stockOrdered(name));
  }

  a.status = "rejected";
  a.taskId = await addCheckTask(env, t.stockTask(a.name), name);
  await env.STORE.put(key, JSON.stringify(a), { expirationTtl: STOCK_TTL });
  await setAlarmState(env, a.id, token, "rejected");
  await env.STORE.put(`await:${a.chatId}:${cq.from.id}`, `s:${token}`, { expirationTtl: COMMENT_TTL });
  await edit(t.stockRejectedBy(name));
  await send(env, a.chatId, esc(t.askStockReason(name, a.name)), {
    reply_to_message_id: a.messageId,
    allow_sending_without_reply: true,
    reply_markup: { force_reply: true, selective: true },
  });
}

async function consumeStockComment(env, msg, token) {
  const t = texts(env);
  const key = `stockalarm:${token}`;
  const a = await env.STORE.get(key, "json");
  if (!a || !a.taskId) return false;
  const comment = msg.text.trim().slice(0, 500);
  a.comment = comment;
  await env.STORE.put(key, JSON.stringify(a), { expirationTtl: STOCK_TTL });
  await setTaskNote(env, a.taskId, `${comment} — ${a.by}`);
  await tg(env, "editMessageText", {
    chat_id: a.chatId, message_id: a.messageId, parse_mode: "HTML", disable_web_page_preview: true,
    text: `${stockSummary(t, a)}\n\n<b>${esc(t.stockRejectedBy(a.by))}</b>\n${t.comment}: ${esc(comment)}`,
  });
  await send(env, msg.chat.id, t.stockReasonSaved, { reply_to_message_id: msg.message_id, allow_sending_without_reply: true });
  return true;
}

// If this user owes us a rejection reason, take this message as the reason.
async function tryConsumeComment(env, msg) {
  const t = texts(env);
  const awaitKey = `await:${msg.chat.id}:${msg.from?.id}`;
  const token = await env.STORE.get(awaitKey);
  if (!token) return false;
  if (token.startsWith("s:")) {
    await env.STORE.delete(awaitKey);
    return consumeStockComment(env, msg, token.slice(2));
  }

  const key = `pending:${token}`;
  const raw = await env.STORE.get(key);
  await env.STORE.delete(awaitKey);
  if (!raw) return false;
  const pending = JSON.parse(raw);
  if (pending.status !== "awaiting_comment") return false;

  const comment = msg.text.trim();
  pending.status = "rejected";
  pending.comment = comment;
  await env.STORE.put(key, JSON.stringify(pending), { expirationTtl: LINK_TTL });

  await tg(env, "editMessageText", {
    chat_id: pending.chatId,
    message_id: pending.resultMessageId,
    text: `${pending.summary}\n\n<b>${esc(t.rejectedBy(pending.by))}</b>\n${t.reason}: ${esc(comment)}`,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });
  const updated = await patchLog(env, token, (r) => ({ ...r, comment }));
  if (!updated) await upsertLog(env, logRecord(token, pending, { status: "rejected", decidedAt: nowIso() }));

  if (await notifyCeo(env, pending, "d")) {
    await send(env, msg.chat.id, t.reasonSaved, {
      reply_to_message_id: msg.message_id,
      allow_sending_without_reply: true,
    });
  }
  return true;
}

// ── Shopping lists ───────────────────────────────────────────────────────────

async function handleOrderMessage(env, msg, lines) {
  const t = texts(env);
  const products = await loadBasePrices(env);
  const found = [];
  const missing = [];
  for (const line of lines) {
    const p = matchProduct(products, line.name);
    if (p) found.push({ p, line });
    else missing.push(line);
  }
  if (!found.length) return; // ordinary chat, not a shopping list

  const by = displayName(msg.from);
  await applyOrderOps(env, found.map(({ p, line }) => ({
    op: "set", productId: p.id, qty: line.qty, unit: line.unit, by, source: "telegram",
  })), products);

  const fmt = (name, l) => `• ${esc(name)} — ${qty(l.qty)}${l.unit ? " " + esc(l.unit) : ""}`;
  let text = `${t.orderAdded}\n${found.map(({ p, line }) => fmt(p.name, line)).join("\n")}`;
  if (missing.length) {
    text += `\n\n${t.orderNotFound}\n${missing.map((l) => fmt(l.name, l)).join("\n")}\n${t.orderNotFoundHint}`;
  }
  await send(env, msg.chat.id, text, { reply_to_message_id: msg.message_id, allow_sending_without_reply: true });
}

// ── Commands ─────────────────────────────────────────────────────────────────

async function handlePrivateCommand(env, msg, command) {
  const t = texts(env);
  const chatId = String(msg.chat.id);
  const current = await ceoChatId(env);

  if (command === "/start") {
    if (!current) {
      await env.STORE.put("ceo_chat_id", chatId);
      await send(env, chatId, t.ceoRegistered);
    } else {
      await send(env, chatId, String(current) === chatId ? t.ceoAlready : t.ceoTaken);
    }
    return true;
  }
  if (command === "/resetceo" && String(current) === chatId && !env.CEO_CHAT_ID) {
    await env.STORE.delete("ceo_chat_id");
    await send(env, chatId, t.ceoReset);
    return true;
  }
  if (command === "/password") {
    const password = String(msg.text || "").replace(/^\/password(@\S+)?/i, "").trim();
    // Never leave a password visible in the chat, whatever happens next.
    if (password) await tg(env, "deleteMessage", { chat_id: chatId, message_id: msg.message_id });
    if (String(current) !== chatId) {
      await send(env, chatId, t.pwNotCeo);
      return true;
    }
    if (password.length < 4 || password.length > 64) {
      await send(env, chatId, t.pwUsage);
      return true;
    }
    await setPassword(env, password);
    await send(env, chatId, t.pwSet);
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
  // remember the employees' group, so Storage alarms know where to go
  if (!isPrivate && !env.GROUP_CHAT_ID && String(msg.chat.id) !== (await env.STORE.get("group_chat_id"))) {
    await env.STORE.put("group_chat_id", String(msg.chat.id));
  }
  if (command === "/chatid") {
    await send(env, msg.chat.id, `Chat ID: <code>${msg.chat.id}</code>`);
    return;
  }
  if (command === "/help" || (command === "/start" && !isPrivate)) {
    await send(env, msg.chat.id, esc(t.help));
    return;
  }
  if (command === "/password" && !isPrivate) {
    // someone typed a password in the group: remove it straight away
    await tg(env, "deleteMessage", { chat_id: msg.chat.id, message_id: msg.message_id });
    await send(env, msg.chat.id, t.pwNotCeo);
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
    return;
  }

  // A shopping list: one product per line with an amount.
  const lines = parseOrderMessage(text);
  if (lines) await handleOrderMessage(env, msg, lines);
}

export async function handleUpdate(env, update, origin) {
  if (origin) ORIGIN = origin;
  if (update.callback_query) return handleCallback(env, update.callback_query);
  if (update.message) return handleMessage(env, update.message);
}
