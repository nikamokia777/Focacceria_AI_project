// src/app.jsx — the PriceCheck website (Focacceria).
// This is the source; it is compiled to public/app.js (plain JavaScript) before uploading.

const { useState, useEffect, useRef, useMemo, useCallback } = React;

// ── Texts ────────────────────────────────────────────────────────────────────

const T = {
  ka: {
    appSub: "PriceCheck",
    tabs: { products: "პროდუქტები", distributors: "დისტრიბუცია", bazaar: "ბაზარი", orders: "შეკვეთები", storage: "საწყობი", mistakes: "შეცდომები", debts: "ვალები", history: "ისტორია" },
    sync: { ok: "✓ სინქრ.", saving: "ინახება…", error: "⚠ კავშირი" },
    search: "ძებნა…",
    searchProduct: "პროდუქტის ძებნა…",
    allCats: "ყველა კატეგ.",
    allSuppliers: "ყველა მომწ.",
    allTypes: "ყველა ტიპი",
    all: "ყველა",
    typeDistributor: "დისტრიბუცია",
    typeBazaar: "ბაზარი",
    add: "+ დამატება",
    csv: "↓ CSV",
    edit: "რედაქტირება",
    col: { n: "#", cat: "კატ.", name: "დასახელება", code: "rs.ge კოდი", supplier: "მომწოდებელი", contact: "კონტაქტი", size: "ზომა", price: "ფასი ₾", comment: "კომ." },
    kpi: {
      products: "პროდუქტი", suppliers: "მომწოდებელი", avgPrice: "საშ. ფასი", alternatives: "ალტერნატივა",
      priceKnown: "ფასი ცნობ.", priceUnknown: "ფასი უცნობ.",
      open: "ღია შეცდომა", sentToDistributor: "გაგზავნილი მომწ.", resolved: "მოგვარებული", openAmount: "ღია თანხა",
      total: "სულ ჩანაწერი", approved: "დადასტურებული", sentToAccountant: "ბუღალტერთან გაგზ.", ordersReceived: "მიღებული შეკვეთა",
    },
    noProducts: "პროდუქტები არ მოიძებნა",
    noProductsYet: "პროდუქტები ჯერ არ არის — დაამატეთ „+ დამატება“-თი.",
    noSuppliers: "მომწოდებლები ჯერ არ არის",
    bazaarEmpty: "ბაზრის მომწოდებლები ჯერ არ არის — დაამატეთ „+ დამატება“-თი.",
    alt: "ალტ.",
    bazaarTag: "ბაზარი",
    // orders
    order: "შეკვეთა",
    clear: "გასუფთავება",
    clearConfirm: "გავასუფთავოთ მთელი შეკვეთა?",
    orderEmpty: "პროდუქტი არ არის დამატებული",
    orderHint: "დააჭირეთ „+“-ს პროდუქტის დასამატებლად, ან თანამშრომელმა დაწეროს სია Telegram-ის ჯგუფში.",
    positions: (n) => `${n} პოზ.`,
    qty: "რაოდ.",
    unit: "ერთ.",
    commentPh: "კომენტ…",
    whatsappTo: (s) => `WhatsApp — ${s}`,
    noPhone: "ნომერი არ არის — WhatsApp-ში კონტაქტს თავად აირჩევთ",
    received: "📦 მივიღე — ისტორიაში გადატანა",
    receivedConfirm: (s) => `${s}: პროდუქტები მიღებულია? ისინი ისტორიაში გადავა.`,
    sentAt: (d) => `✓ გაგზავნილია ${d}`,
    resend: "შეიცვალა — გააგზავნეთ ხელახლა",
    estTotal: "სავარაუდო ჯამი",
    fromTelegram: "Telegram",
    deleted: "წაშლილი პროდუქტი",
    // mistakes / history
    waybillNo: (n) => `ზედნადები № ${n}`,
    checkedBy: "შეამოწმა",
    reason: "მიზეზი",
    noReason: "მიზეზი ჯერ არ არის დაწერილი",
    lines: (n) => `პოზიციები (${n})`,
    sendDistributor: "მომწოდებელთან გაგზავნა",
    sendAccountant: "ბუღალტერთან გაგზავნა",
    sendAgain: "ხელახლა გაგზავნა",
    markResolved: "✓ მოგვარებულია",
    reopen: "↩ ხელახლა გახსნა",
    resolveConfirm: "მოინიშნოს მოგვარებულად? გადავა ისტორიაში.",
    mistakesEmpty: "შეცდომები არ არის 🎉",
    historyEmpty: "ისტორია ცარიელია",
    status: { approved: "დადასტურებული", rejected: "ღია", resolved: "მოგვარებული შეცდომა", received: "მიღებული შეკვეთა" },
    allStatuses: "ყველა სტატუსი",
    orderReceivedTitle: (s) => `შეკვეთა მიღებულია — ${s}`,
    receivedFromOrder: "შეკვეთიდან მიღებული",
    distributorSent: (d) => `✓ მომწოდებელს გაეგზავნა ${d}`,
    accountantSent: (d) => `✓ ბუღალტერს გაეგზავნა ${d}`,
    lineStatus: { ok: "ემთხვევა", high: "ძვირი", low: "იაფი", unknown: "ბაზაში არ არის", noprice: "ფასი არ არის" },
    base: "ბაზა",
    // debts
    debtsTitle: "ვალები",
    debtsSoon: "ეს განყოფილება მალე დაემატება.",
    // product form
    newProduct: "ახალი პროდუქტი",
    editProduct: "პროდუქტის რედაქტირება",
    f: {
      type: "ტიპი", category: "კატეგორია", name: "დასახელება", nameRs: "დასახელება rs.ge-ზე", code: "rs.ge კოდი",
      supplier: "მომწოდებელი", contactName: "საკონტაქტო პირი", phone: "ტელეფონი (WhatsApp)", size: "ზომა",
      price: "ფასი ₾", altSupplier: "ალტ. მომწოდებელი", comment: "კომენტარი",
    },
    nameRequired: "დასახელება აუცილებელია",
    delete: "წაშლა",
    deleteConfirm: (n) => `წავშალოთ „${n}“?`,
    cancel: "გაუქმება",
    save: "შენახვა",
    saved: "✓ შენახულია",
    saveFailed: "შენახვა ვერ მოხერხდა. სცადეთ თავიდან.",
    // settings
    settings: "პარამეტრები",
    accountant: "ბუღალტერი",
    accountantPhone: "ბუღალტრის WhatsApp ნომერი",
    accountantHint: "დადასტურებული ზედნადები ამ ნომერზე იგზავნება ისტორიიდან.",
    language: "ენა",
    systemStatus: "სისტემის მდგომარეობა",
    statusLabels: { storage: "მონაცემთა საცავი", telegramBot: "Telegram ბოტი", rsgeLogin: "rs.ge კავშირი", gemini: "ფოტოს ამოკითხვა (Gemini)", ceoRegistered: "დირექტორი დარეგისტრირებულია", passwordSet: "პაროლი დაყენებულია" },
    botHelp: "Telegram ბოტის ბრძანებები",
    botHelpText: [
      "ჯგუფში: ზედნადების ფოტო ან ნომერი — შემოწმება",
      "ჯგუფში: სია, თითო პროდუქტი ცალკე ხაზზე (მაგ. „რუკოლა 2კგ“) — შეკვეთაში დამატება",
      "დირექტორის პირად ჩატში: /password ახალი_პაროლი — საიტის პაროლის შეცვლა",
      "ნებისმიერ ჯგუფში: /chatid — ჯგუფის ID",
    ],
    logout: "გამოსვლა",
    close: "დახურვა",
    // login
    loginTitle: "შესვლა",
    password: "პაროლი",
    login: "შესვლა",
    wrongPassword: "პაროლი არასწორია",
    tooMany: "ძალიან ბევრი მცდელობა — სცადეთ 15 წუთში",
    notSet: "პაროლი ჯერ არ არის დაყენებული. დირექტორმა ბოტს პირად ჩატში უნდა გაუგზავნოს: /password ახალი_პაროლი",
    connError: "კავშირის შეცდომა — სცადეთ თავიდან",
    loading: "იტვირთება…",
    stock: {
      search: "პროდუქტის ძებნა…",
      all: "ყველა", low: "იწურება", withMin: "მინიმუმით", allStores: "ყველა საწყობი",
      prioNames: { red: "მაღალი პრიორიტეტი", yellow: "საშუალო პრიორიტეტი", cyan: "დაბალი პრიორიტეტი" },
      refresh: "↻ განახლება",
      col: { prio: "პრიორიტეტი", name: "პროდუქტი", syrve: "Syrve", live: "რეალური", min: "მინიმუმი", inv: "ინვენტ. სხვაობა", status: "სტატუსი" },
      kpi: { products: "პროდუქტი", low: "იწურება", lastInv: "ბოლო ინვენტარიზაცია", asOf: "Syrve განახლდა" },
      noInv: "2 თვეში არ ყოფილა",
      invDoc: (n, c) => `${n ? "№ " + n + " · " : ""}${c} პოზიციაში სხვაობა`,
      manual: "ხელით", resetCorr: "Syrve-ს რიცხვზე დაბრუნება",
      corrHint: "ხელით ცვლილება Syrve-ზე არ მოქმედებს და ახალი ინვენტარიზაციისას თავისით უქმდება.",
      minHint: "როცა რეალური რაოდენობა მინიმუმამდე ჩამოვა, ბოტი Telegram-ის ჯგუფში შეტყობინებას გაგზავნის.",
      alarm: { open: "🔔 გაგზავნილია", approved: "✅ შეკვეთილი", rejected: "❌ უარყოფილი", low: "იწურება" },
      linked: "შეკვეთაში:", autoLinked: "ავტომ.", noLink: "PriceCheck-თან არ არის დაკავშირებული",
      autoOpt: "— ავტომატურად —", unlinkOpt: "— არ დაკავშირდეს —", changeLink: "შეცვლა",
      noGroup: "Telegram-ის ჯგუფი ჯერ უცნობია — დაწერეთ ნებისმიერი შეტყობინება თანამშრომლების ჯგუფში, რომ ბოტმა დაიმახსოვროს.",
      invError: "ინვენტარიზაციის მონაცემი ვერ წავიკითხე: ",
      error: "Syrve-დან მონაცემი ვერ მივიღე: ",
      showing: (a, b) => `ნაჩვენებია ${a} / ${b} — დააზუსტეთ ძებნა`,
      empty: "პროდუქტები არ მოიძებნა",
    },
  },
  en: {
    appSub: "PriceCheck",
    tabs: { products: "Products", distributors: "Distributors", bazaar: "Bazaar", orders: "Orders", storage: "Storage", mistakes: "Mistakes", debts: "Debts", history: "History" },
    sync: { ok: "✓ Synced", saving: "Saving…", error: "⚠ Offline" },
    search: "Search…",
    searchProduct: "Search products…",
    allCats: "All categories",
    allSuppliers: "All suppliers",
    allTypes: "All types",
    all: "All",
    typeDistributor: "Distributor",
    typeBazaar: "Bazaar",
    add: "+ Add",
    csv: "↓ CSV",
    edit: "Edit",
    col: { n: "#", cat: "Cat.", name: "Name", code: "rs.ge code", supplier: "Supplier", contact: "Contact", size: "Size", price: "Price ₾", comment: "Note" },
    kpi: {
      products: "Products", suppliers: "Suppliers", avgPrice: "Avg. price", alternatives: "Alternatives",
      priceKnown: "Price known", priceUnknown: "Price unknown",
      open: "Open mistakes", sentToDistributor: "Sent to supplier", resolved: "Resolved", openAmount: "Open amount",
      total: "Total records", approved: "Approved", sentToAccountant: "Sent to accountant", ordersReceived: "Orders received",
    },
    noProducts: "No products found",
    noProductsYet: "No products yet — add one with “+ Add”.",
    noSuppliers: "No suppliers yet",
    bazaarEmpty: "No bazaar suppliers yet — add one with “+ Add”.",
    alt: "Alt.",
    bazaarTag: "Bazaar",
    order: "Order",
    clear: "Clear",
    clearConfirm: "Clear the whole order?",
    orderEmpty: "No products added",
    orderHint: "Tap “+” to add a product, or let an employee write the list in the Telegram group.",
    positions: (n) => `${n} item${n === 1 ? "" : "s"}`,
    qty: "Qty",
    unit: "Unit",
    commentPh: "Note…",
    whatsappTo: (s) => `WhatsApp — ${s}`,
    noPhone: "No number saved — you will pick the contact in WhatsApp",
    received: "📦 Received — move to History",
    receivedConfirm: (s) => `${s}: goods received? They will move to History.`,
    sentAt: (d) => `✓ Sent ${d}`,
    resend: "Changed — send again",
    estTotal: "Estimated total",
    fromTelegram: "Telegram",
    deleted: "deleted product",
    waybillNo: (n) => `Waybill № ${n}`,
    checkedBy: "Checked by",
    reason: "Reason",
    noReason: "No reason written yet",
    lines: (n) => `Lines (${n})`,
    sendDistributor: "Send to distributor",
    sendAccountant: "Send to accountant",
    sendAgain: "Send again",
    markResolved: "✓ Resolved",
    reopen: "↩ Reopen",
    resolveConfirm: "Mark as resolved? It will move to History.",
    mistakesEmpty: "No mistakes 🎉",
    historyEmpty: "History is empty",
    status: { approved: "Approved", rejected: "Open", resolved: "Resolved mistake", received: "Order received" },
    allStatuses: "All statuses",
    orderReceivedTitle: (s) => `Order received — ${s}`,
    receivedFromOrder: "Received from order",
    distributorSent: (d) => `✓ Sent to supplier ${d}`,
    accountantSent: (d) => `✓ Sent to accountant ${d}`,
    lineStatus: { ok: "matches", high: "higher", low: "lower", unknown: "not in list", noprice: "no base price" },
    base: "base",
    debtsTitle: "Debts",
    debtsSoon: "This section is coming soon.",
    newProduct: "New product",
    editProduct: "Edit product",
    f: {
      type: "Type", category: "Category", name: "Name", nameRs: "Name on rs.ge", code: "rs.ge code",
      supplier: "Supplier", contactName: "Contact person", phone: "Phone (WhatsApp)", size: "Size",
      price: "Price ₾", altSupplier: "Alt. supplier", comment: "Note",
    },
    nameRequired: "Name is required",
    delete: "Delete",
    deleteConfirm: (n) => `Delete “${n}”?`,
    cancel: "Cancel",
    save: "Save",
    saved: "✓ Saved",
    saveFailed: "Could not save. Please try again.",
    settings: "Settings",
    accountant: "Accountant",
    accountantPhone: "Accountant's WhatsApp number",
    accountantHint: "Approved waybills are sent to this number from History.",
    language: "Language",
    systemStatus: "System status",
    statusLabels: { storage: "Data storage", telegramBot: "Telegram bot", rsgeLogin: "rs.ge connection", gemini: "Photo reading (Gemini)", ceoRegistered: "CEO registered", passwordSet: "Password set" },
    botHelp: "Telegram bot commands",
    botHelpText: [
      "In the group: a waybill photo or number — price check",
      "In the group: a list, one product per line (e.g. “რუკოლა 2კგ”) — added to the order",
      "CEO's private chat: /password new_password — change the website password",
      "Any group: /chatid — the group's ID",
    ],
    logout: "Log out",
    close: "Close",
    loginTitle: "Log in",
    password: "Password",
    login: "Log in",
    wrongPassword: "Wrong password",
    tooMany: "Too many attempts — try again in 15 minutes",
    notSet: "No password set yet. The CEO should send the bot (in a private chat): /password new_password",
    connError: "Connection error — please try again",
    loading: "Loading…",
    stock: {
      search: "Search products…",
      all: "All", low: "Running low", withMin: "With minimum", allStores: "All stores",
      prioNames: { red: "High priority", yellow: "Moderate priority", cyan: "Low priority" },
      refresh: "↻ Refresh",
      col: { prio: "Priority", name: "Product", syrve: "Syrve", live: "Real", min: "Minimum", inv: "Reconciliation Δ", status: "Status" },
      kpi: { products: "Products", low: "Running low", lastInv: "Last reconciliation", asOf: "Syrve updated" },
      noInv: "none in 2 months",
      invDoc: (n, c) => `${n ? "№ " + n + " · " : ""}${c} item(s) differed`,
      manual: "manual", resetCorr: "Back to the Syrve number",
      corrHint: "A manual change does not touch Syrve and is cleared automatically by the next reconciliation.",
      minHint: "When the real amount falls to the minimum, the bot posts an alarm in the Telegram group.",
      alarm: { open: "🔔 Sent", approved: "✅ Ordered", rejected: "❌ Not ordered", low: "Running low" },
      linked: "Orders as:", autoLinked: "auto", noLink: "Not linked to PriceCheck",
      autoOpt: "— automatic —", unlinkOpt: "— don't link —", changeLink: "change",
      noGroup: "The Telegram group is not known yet — write any message in the employees' group so the bot remembers it.",
      invError: "Could not read reconciliations: ",
      error: "Could not get data from Syrve: ",
      showing: (a, b) => `Showing ${a} of ${b} — narrow the search`,
      empty: "No products found",
    },
  },
};

const TABS = ["products", "distributors", "bazaar", "orders", "storage", "mistakes", "debts", "history"];

// ── Categories ───────────────────────────────────────────────────────────────

const CATEGORIES = ["ხორცეული", "ყველი", "ზეთი", "პასტა", "ბოსტნეული", "რძის პროდუქტი", "ყავა", "თხილეული", "გაყინული", "სხვა"];
const CAT_EN = {
  "ხორცეული": "Meat", "ყველი": "Cheese", "ზეთი": "Oil", "პასტა": "Pasta", "ბოსტნეული": "Vegetables",
  "რძის პროდუქტი": "Dairy", "ყავა": "Coffee", "თხილეული": "Nuts", "გაყინული": "Frozen", "სხვა": "Other",
};
const CAT_COLORS = {
  "ხორცეული": ["#fcd690", "#7a4a00"], "ყველი": ["#fdeaa7", "#6b5200"], "ზეთი": ["#d9ef8f", "#3f5a00"],
  "პასტა": ["#f9d3b4", "#7a3e10"], "ბოსტნეული": ["#b4ecd6", "#0d6046"], "რძის პროდუქტი": ["#dbe8ff", "#1d3f8a"],
  "ყავა": ["#e6d2bd", "#5a3416"], "თხილეული": ["#efdcc8", "#6b4422"], "გაყინული": ["#cdeefc", "#0b5875"], "სხვა": ["#e8e6e1", "#555"],
};
function catColor(cat) {
  if (CAT_COLORS[cat]) return CAT_COLORS[cat];
  let h = 0;
  for (const ch of String(cat)) h = (h * 31 + ch.codePointAt(0)) % 360;
  return [`hsl(${h} 70% 88%)`, `hsl(${h} 45% 28%)`];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const num = (v) => Number(v) || 0;
const money = (n) => (num(n) > 0 ? `${num(n).toFixed(2)}₾` : "—");
const qtyStr = (n) => String(Math.round(num(n) * 1000) / 1000);
const norm = (s) => String(s ?? "").toLowerCase().trim();

function fmtDate(iso, withYear = false) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return String(iso).slice(0, 10);
  const p = (x) => String(x).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}${withYear ? "." + d.getFullYear() : ""} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// Same rule as the server: "599 11 22 33" → "995599112233"
function waNumber(phone) {
  let d = String(phone ?? "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 9) d = "995" + d;
  if (d.length === 10 && d.startsWith("0")) d = "995" + d.slice(1);
  return d.length >= 10 && d.length <= 15 ? d : "";
}
const waUrl = (phone, text) => `https://wa.me/${waNumber(phone)}${text ? "?text=" + encodeURIComponent(text) : ""}`;

function downloadCsv(filename, header, rows) {
  const esc = (v) => {
    const s = String(v ?? "");
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = "﻿" + [header, ...rows].map((r) => r.map(esc).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}
async function api(path, body, method) {
  const res = await fetch(path, {
    method: method || (body !== undefined ? "POST" : "GET"),
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: "same-origin",
  });
  let data = null;
  try { data = JSON.parse(await res.text()); } catch {}
  if (!res.ok) throw new ApiError(data?.error || `HTTP ${res.status}`, res.status);
  return data;
}

function readLang() {
  try { return localStorage.getItem("pc_lang") === "en" ? "en" : "ka"; } catch { return "ka"; }
}
function tabFromHash() {
  const h = (location.hash || "").replace("#", "");
  return TABS.includes(h) ? h : "products";
}

// ── Small UI pieces ──────────────────────────────────────────────────────────

function WaIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm5.79 14.06c-.24.68-1.42 1.3-1.95 1.34-.5.05-.97.23-3.27-.68-2.77-1.09-4.52-3.92-4.66-4.1-.13-.18-1.11-1.48-1.11-2.82 0-1.34.7-2 .95-2.27.25-.27.54-.34.72-.34h.52c.17 0 .39-.06.61.47.24.56.79 1.92.86 2.06.07.14.11.3.02.48-.09.18-.14.3-.27.46-.13.16-.28.36-.4.48-.13.13-.27.28-.12.55.16.27.7 1.15 1.5 1.86 1.03.92 1.9 1.2 2.17 1.34.27.13.43.11.59-.07.16-.18.68-.79.86-1.06.18-.27.36-.23.61-.14.25.09 1.59.75 1.86.89.27.13.45.2.52.32.07.11.07.66-.17 1.34z" />
    </svg>
  );
}

function CatPill({ cat, lang }) {
  if (!cat) return <span className="muted">—</span>;
  const [bg, fg] = catColor(cat);
  return <span className="pill" style={{ background: bg, color: fg }}>{lang === "en" && CAT_EN[cat] ? CAT_EN[cat] : cat}</span>;
}

function Kpis({ items }) {
  return (
    <div className="kpis">
      {items.map(([label, value], i) => (
        <div className="card kpi" key={i}>
          <div className="kpi-label">{label}</div>
          <div className="kpi-value">{value}</div>
        </div>
      ))}
    </div>
  );
}

function Contact({ name, phone }) {
  if (!name && !phone) return <span className="muted">—</span>;
  const n = waNumber(phone);
  return (
    <span className="contact">
      {name ? name + " " : ""}{phone}
      {n && <a className="dot" href={waUrl(phone)} target="_blank" rel="noopener" title="WhatsApp" />}
    </span>
  );
}

function Empty({ children }) {
  return <div className="empty">{children}</div>;
}

// ── Login ────────────────────────────────────────────────────────────────────

function Login({ t, lang, setLang, passwordSet, onDone }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(passwordSet ? "" : t.notSet);
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!pw) return;
    setBusy(true); setErr("");
    try {
      await api("/api/login", { password: pw });
      onDone();
    } catch (er) {
      setErr(er.message === "wrong" ? t.wrongPassword : er.message === "too_many" ? t.tooMany : er.message === "not_set" ? t.notSet : t.connError);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="login-wrap">
      <form className="card login" onSubmit={submit}>
        <div className="login-top">
          <div className="brand">🫓 Focacceria <span className="muted">— {t.appSub}</span></div>
          <button type="button" className="btn-ghost small" onClick={() => setLang(lang === "ka" ? "en" : "ka")}>{lang === "ka" ? "EN" : "ქა"}</button>
        </div>
        <label className="field-label">{t.password}</label>
        <input className="input" type="password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" />
        {err && <div className="error-text">{err}</div>}
        <button className="btn-dark wide" disabled={busy || !pw}>{busy ? "…" : t.login}</button>
      </form>
    </div>
  );
}

// ── Products table (Products + Bazaar tabs) ──────────────────────────────────

function ProductTable({ t, lang, rows, onEdit, emptyText }) {
  return (
    <div className="card table-card">
      <div className="table-scroll">
        <table className="table">
          <thead>
            <tr>
              <th className="c-n">{t.col.n}</th><th>{t.col.cat}</th><th>{t.col.name}</th><th>{t.col.code}</th>
              <th>{t.col.supplier}</th><th>{t.col.contact}</th><th>{t.col.size}</th><th>{t.col.price}</th>
              <th>{t.col.comment}</th><th />
            </tr>
          </thead>
          <tbody>
            {rows.map((p, i) => (
              <tr key={p.id}>
                <td className="c-n muted">{i + 1}</td>
                <td><CatPill cat={p.category} lang={lang} /></td>
                <td className="strong">
                  {p.name}
                  {p.type === "bazaar" && <span className="tag">{t.bazaarTag}</span>}
                  {p.isAlt && <span className="tag">ALT</span>}
                </td>
                <td className="muted mono">{p.code || "—"}</td>
                <td>{p.supplier || <span className="muted">—</span>}</td>
                <td><Contact name={p.contactName} phone={p.phone} /></td>
                <td>{p.unit || <span className="muted">—</span>}</td>
                <td className="strong">{money(p.basePrice)}</td>
                <td className="muted small">
                  {p.comment}
                  {p.altSupplier && <div>{t.alt} {p.altSupplier}</div>}
                </td>
                <td className="c-act"><button className="icon-btn" title={t.edit} onClick={() => onEdit(p)}>✎</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && <Empty>{emptyText}</Empty>}
    </div>
  );
}

function productCsv(list, name) {
  downloadCsv(name, ["type", "category", "name", "nameRs", "code", "supplier", "contactName", "phone", "size", "price", "altSupplier", "comment"],
    list.map((p) => [p.type, p.category, p.name, p.nameRs, p.code, p.supplier, p.contactName, p.phone, p.unit, p.basePrice, p.altSupplier, p.comment]));
}

function matchesSearch(p, q) {
  if (!q) return true;
  return [p.name, p.nameRs, p.code, p.supplier, p.contactName, p.phone, p.category, p.comment].some((v) => norm(v).includes(q));
}

function ProductsTab({ t, lang, products, onEdit, onAdd }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [sup, setSup] = useState("");
  const [type, setType] = useState("");
  const cats = useMemo(() => [...new Set(products.map((p) => p.category).filter(Boolean))].sort(), [products]);
  const sups = useMemo(() => [...new Set(products.map((p) => p.supplier).filter(Boolean))].sort(), [products]);
  const rows = products.filter((p) =>
    matchesSearch(p, norm(q)) && (!cat || p.category === cat) && (!sup || p.supplier === sup) && (!type || p.type === type));
  const priced = products.filter((p) => num(p.basePrice) > 0);
  const avg = priced.length ? priced.reduce((s, p) => s + num(p.basePrice), 0) / priced.length : 0;
  return (
    <>
      <Kpis items={[
        [t.kpi.products, products.length],
        [t.kpi.suppliers, sups.length],
        [t.kpi.avgPrice, avg ? `${avg.toFixed(2)}₾` : "—"],
        [t.kpi.alternatives, products.filter((p) => p.altSupplier || p.isAlt).length],
      ]} />
      <div className="toolbar">
        <input className="input grow" placeholder={t.search} value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">{t.allCats}</option>
          {cats.map((c) => <option key={c} value={c}>{lang === "en" && CAT_EN[c] ? CAT_EN[c] : c}</option>)}
        </select>
        <select className="input" value={sup} onChange={(e) => setSup(e.target.value)}>
          <option value="">{t.allSuppliers}</option>
          {sups.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">{t.allTypes}</option>
          <option value="distributor">{t.typeDistributor}</option>
          <option value="bazaar">{t.typeBazaar}</option>
        </select>
        <button className="btn-dark" onClick={() => onAdd("distributor")}>{t.add}</button>
        <button className="btn-outline" onClick={() => productCsv(rows, "products.csv")}>{t.csv}</button>
      </div>
      <ProductTable t={t} lang={lang} rows={rows} onEdit={onEdit} emptyText={products.length ? t.noProducts : t.noProductsYet} />
    </>
  );
}

// ── Supplier cards (Distributors + Bazaar tabs) ──────────────────────────────

function groupBySupplier(products) {
  const map = new Map();
  for (const p of products) {
    const key = p.supplier || "";
    if (!key) continue;
    if (!map.has(key)) map.set(key, { name: key, products: [], contactName: "", phone: "" });
    const g = map.get(key);
    g.products.push(p);
    if (!g.phone && p.phone) { g.phone = p.phone; g.contactName = p.contactName; }
    if (!g.contactName && p.contactName) g.contactName = p.contactName;
  }
  return [...map.values()].sort((a, b) => b.products.length - a.products.length || a.name.localeCompare(b.name));
}

function SupplierCards({ groups }) {
  return (
    <div className="supplier-grid">
      {groups.map((g) => (
        <div className="card supplier" key={g.name}>
          <div className="supplier-head">
            <div className="strong">{g.name}</div>
            {waNumber(g.phone) && (
              <a className="btn-wa small" href={waUrl(g.phone)} target="_blank" rel="noopener"><WaIcon /> WA</a>
            )}
          </div>
          {(g.contactName || g.phone) && <div className="supplier-contact">{[g.contactName, g.phone].filter(Boolean).join(" ")}</div>}
          <div className="supplier-products">{g.products.map((p) => p.name).join(", ")}</div>
        </div>
      ))}
    </div>
  );
}

function DistributorsTab({ t, products }) {
  const groups = groupBySupplier(products.filter((p) => p.type !== "bazaar"));
  return (
    <>
      <Kpis items={[[t.kpi.suppliers, groups.length], ...groups.slice(0, 3).map((g) => [g.name, g.products.length])]} />
      {groups.length ? <SupplierCards groups={groups} /> : <div className="card"><Empty>{t.noSuppliers}</Empty></div>}
    </>
  );
}

function BazaarTab({ t, lang, products, onEdit, onAdd }) {
  const [q, setQ] = useState("");
  const bazaar = products.filter((p) => p.type === "bazaar");
  const groups = groupBySupplier(bazaar);
  const rows = bazaar.filter((p) => matchesSearch(p, norm(q)));
  const known = bazaar.filter((p) => num(p.basePrice) > 0).length;
  return (
    <>
      <Kpis items={[
        [t.kpi.suppliers, groups.length],
        [t.kpi.products, bazaar.length],
        [t.kpi.priceKnown, known],
        [t.kpi.priceUnknown, bazaar.length - known],
      ]} />
      <div className="toolbar">
        <input className="input grow" placeholder={t.search} value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn-dark" onClick={() => onAdd("bazaar")}>{t.add}</button>
        <button className="btn-outline" onClick={() => productCsv(rows, "bazaar.csv")}>{t.csv}</button>
      </div>
      {groups.length > 0 && <SupplierCards groups={groups} />}
      <ProductTable t={t} lang={lang} rows={rows} onEdit={onEdit} emptyText={bazaar.length ? t.noProducts : t.bazaarEmpty} />
    </>
  );
}

// ── Orders ───────────────────────────────────────────────────────────────────

function orderMessage(lines) {
  return "გამარჯობა! Focacceria-ს შეკვეთა:\n" +
    lines.map((l) => `• ${l.name} — ${qtyStr(l.qty)}${l.unit ? " " + l.unit : ""}${l.comment ? ` (${l.comment})` : ""}`).join("\n") +
    "\nგმადლობთ!";
}

function OrderLine({ t, item, product, onChange, onRemove }) {
  const [local, setLocal] = useState({ qty: String(item.qty), unit: item.unit || "", comment: item.comment || "" });
  const focused = useRef(false);
  const timer = useRef(null);
  useEffect(() => {
    if (!focused.current) setLocal({ qty: String(item.qty), unit: item.unit || "", comment: item.comment || "" });
  }, [item.qty, item.unit, item.comment]);
  const update = (field, value) => {
    const next = { ...local, [field]: value };
    setLocal(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(next), 700);
  };
  const flush = () => {
    focused.current = false;
    clearTimeout(timer.current);
    if (local.qty !== String(item.qty) || local.unit !== (item.unit || "") || local.comment !== (item.comment || "")) onChange(local);
  };
  const inputProps = { onFocus: () => { focused.current = true; }, onBlur: flush };
  return (
    <div className="order-line">
      <div className="order-line-top">
        <div>
          <div className="strong">{product?.name || `#${item.productId} (${t.deleted})`}</div>
          <div className="order-line-meta">
            <span className="small muted">{money(product?.basePrice)}</span>
            {product?.unit && <span className="chip">{product.unit}</span>}
            {item.source === "telegram" && <span className="chip tg" title={item.by}>✈ {t.fromTelegram}</span>}
          </div>
        </div>
        <button className="x-btn" onClick={onRemove} title="✕">×</button>
      </div>
      <div className="order-line-inputs">
        <input className="input qty" inputMode="decimal" value={local.qty} onChange={(e) => update("qty", e.target.value)} {...inputProps} aria-label={t.qty} />
        <input className="input unit" value={local.unit} onChange={(e) => update("unit", e.target.value)} placeholder="კგ" {...inputProps} aria-label={t.unit} />
        <input className="input grow" value={local.comment} onChange={(e) => update("comment", e.target.value)} placeholder={t.commentPh} {...inputProps} />
      </div>
    </div>
  );
}

function OrdersTab({ t, lang, products, order, orderOps }) {
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const inOrder = useMemo(() => new Set(order.items.map((i) => i.productId)), [order]);
  const list = products.filter((p) => matchesSearch(p, norm(q)) && (!type || p.type === type));

  const groups = useMemo(() => {
    const map = new Map();
    for (const it of order.items) {
      const p = byId.get(it.productId);
      const key = p?.supplier || "—";
      if (!map.has(key)) map.set(key, { supplier: key, items: [], phone: "", contactName: "" });
      const g = map.get(key);
      g.items.push(it);
      if (!g.phone && p?.phone) { g.phone = p.phone; g.contactName = p.contactName; }
    }
    return [...map.values()];
  }, [order, byId]);

  const total = order.items.reduce((s, it) => s + num(byId.get(it.productId)?.basePrice) * num(it.qty), 0);
  const toggle = (p) => orderOps(inOrder.has(p.id) ? [{ op: "remove", productId: p.id }] : [{ op: "set", productId: p.id, qty: 1, unit: "" }]);

  return (
    <div className="orders">
      <div className="card orders-list">
        <div className="toolbar inner">
          <input className="input grow" placeholder={t.searchProduct} value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">{t.all}</option>
            <option value="distributor">{t.typeDistributor}</option>
            <option value="bazaar">{t.typeBazaar}</option>
          </select>
        </div>
        <div className="orders-scroll">
          {list.map((p) => {
            const on = inOrder.has(p.id);
            return (
              <div className={"order-row" + (on ? " on" : "")} key={p.id}>
                <div className="order-row-main">
                  <div className="strong">{p.name}</div>
                  <div className="small muted">{[p.supplier, lang === "en" && CAT_EN[p.category] ? CAT_EN[p.category] : p.category].filter(Boolean).map((x) => "· " + x).join(" ")}</div>
                </div>
                <div className="order-row-price">
                  <div className="strong">{money(p.basePrice)}</div>
                  {p.unit && <div className="small muted">{p.unit}</div>}
                </div>
                <button className={"round-btn" + (on ? " on" : "")} onClick={() => toggle(p)} aria-label={on ? "remove" : "add"}>{on ? "✓" : "+"}</button>
              </div>
            );
          })}
          {!list.length && <Empty>{products.length ? t.noProducts : t.noProductsYet}</Empty>}
        </div>
      </div>

      <div className="card order-panel">
        <div className="order-panel-head">
          <div className="strong big">{t.order}</div>
          {order.items.length > 0 && (
            <button className="btn-danger-outline" onClick={() => confirm(t.clearConfirm) && orderOps([{ op: "clear" }])}>{t.clear}</button>
          )}
        </div>
        {!order.items.length && <Empty>{t.orderEmpty}<div className="small muted hint">{t.orderHint}</div></Empty>}
        {groups.map((g) => {
          const lines = g.items.map((it) => ({ ...it, name: byId.get(it.productId)?.name || `#${it.productId}` }));
          const allSent = g.items.every((it) => it.status === "sent");
          const someSent = g.items.some((it) => it.status === "sent");
          const lastSent = g.items.map((it) => it.sentAt).filter(Boolean).sort().pop();
          const ids = g.items.map((it) => it.productId);
          return (
            <div className="order-group" key={g.supplier}>
              <div className="order-group-head">
                <div>
                  <div className="strong">{g.supplier}</div>
                  <div className="small muted">{[g.contactName, g.phone].filter(Boolean).join(" ")}</div>
                </div>
                <div className="small muted">{t.positions(g.items.length)}</div>
              </div>
              {g.items.map((it) => (
                <OrderLine key={it.productId} t={t} item={it} product={byId.get(it.productId)}
                  onChange={(v) => orderOps([{ op: "set", productId: it.productId, qty: v.qty, unit: v.unit, comment: v.comment }])}
                  onRemove={() => orderOps([{ op: "remove", productId: it.productId }])} />
              ))}
              <div className="order-group-actions">
                {allSent && lastSent && <div className="sent-note">{t.sentAt(fmtDate(lastSent))}</div>}
                {!allSent && someSent && <div className="warn-note">{t.resend}</div>}
                {!waNumber(g.phone) && <div className="small muted">{t.noPhone}</div>}
                <a className="btn-wa" href={waUrl(g.phone, orderMessage(lines))} target="_blank" rel="noopener"
                  onClick={() => orderOps([{ op: "sent", productIds: ids }])}>
                  <WaIcon size={16} /> {t.whatsappTo(g.supplier)}
                </a>
                <button className="btn-green-outline" onClick={() => confirm(t.receivedConfirm(g.supplier)) && orderOps([{ op: "received", productIds: ids }])}>
                  {t.received}
                </button>
              </div>
            </div>
          );
        })}
        {order.items.length > 0 && (
          <div className="order-total">
            <span className="muted">{t.estTotal}</span>
            <span className="strong big">{total.toFixed(2)}₾</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Waybill cards (Mistakes + History) ───────────────────────────────────────

function LinesTable({ t, rows }) {
  return (
    <div className="table-scroll">
      <table className="table mini">
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={"line-" + r.s}>
              <td>{r.n}</td>
              <td className="nowrap">{qtyStr(r.q)} {r.u}</td>
              <td className="nowrap strong">{num(r.p).toFixed(2)}₾</td>
              <td className="nowrap muted">{r.b != null ? `${t.base}: ${num(r.b).toFixed(2)}₾` : ""}</td>
              <td className="nowrap"><span className={"status-dot s-" + r.s}>{t.lineStatus[r.s] || r.s}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecordCard({ t, rec, children }) {
  const [open, setOpen] = useState(false);
  const isOrder = rec.kind === "order";
  const bad = (rec.rows || []).filter((r) => r.s === "high" || r.s === "low").length;
  return (
    <div className="card record">
      <div className="record-head">
        <div>
          <div className="strong">{isOrder ? t.orderReceivedTitle(rec.supplier) : t.waybillNo(rec.number)}</div>
          <div className="small muted">
            {[!isOrder && rec.seller, rec.total && `${rec.total}₾`, rec.by && `${t.checkedBy}: ${rec.by}`, fmtDate(rec.decidedAt || rec.createdAt)]
              .filter(Boolean).join(" · ")}
          </div>
        </div>
        <span className={"status-pill st-" + rec.status}>{t.status[rec.status] || rec.status}</span>
      </div>

      {(rec.status === "rejected" || rec.status === "resolved") && (
        <div className={"reason" + (rec.comment ? "" : " empty-reason")}>
          {rec.comment ? <><b>{t.reason}:</b> {rec.comment}</> : t.noReason}
        </div>
      )}
      {rec.receivedItems?.length > 0 && (
        <div className="small received-line">🛒 {t.receivedFromOrder}: {rec.receivedItems.map((x) => `${x.name} ${qtyStr(x.qty)}${x.unit ? " " + x.unit : ""}`).join(", ")}</div>
      )}
      {isOrder && (
        <div className="small">{rec.items.map((x) => `${x.name} — ${qtyStr(x.qty)}${x.unit ? " " + x.unit : ""}${x.comment ? ` (${x.comment})` : ""}`).join(" · ")}</div>
      )}
      {!isOrder && rec.rows?.length > 0 && (
        <button className="link-btn" onClick={() => setOpen(!open)}>
          {t.lines(rec.rows.length)} {bad > 0 && <span className="bad-count">⚠ {bad}</span>} {open ? "▴" : "▾"}
        </button>
      )}
      {open && <LinesTable t={t} rows={rec.rows} />}
      {children && <div className="record-actions">{children}</div>}
    </div>
  );
}

function recordSearch(rec, q) {
  if (!q) return true;
  return [rec.number, rec.seller, rec.supplier, rec.by, rec.comment, ...(rec.rows || []).map((r) => r.n), ...(rec.items || []).map((x) => x.name)]
    .some((v) => norm(v).includes(q));
}

function MistakesTab({ t, log, logAction, refresh }) {
  const [q, setQ] = useState("");
  const open = log.filter((r) => r.kind !== "order" && r.status === "rejected");
  const resolved = log.filter((r) => r.status === "resolved");
  const rows = open.filter((r) => recordSearch(r, norm(q)));
  const amount = open.reduce((s, r) => s + num(r.total), 0);
  return (
    <>
      <Kpis items={[
        [t.kpi.open, open.length],
        [t.kpi.sentToDistributor, open.filter((r) => r.distributorSentAt).length],
        [t.kpi.resolved, resolved.length],
        [t.kpi.openAmount, amount ? `${amount.toFixed(2)}₾` : "—"],
      ]} />
      <div className="toolbar">
        <input className="input grow" placeholder={t.search} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="records">
        {rows.map((rec) => (
          <RecordCard key={rec.token} t={t} rec={rec}>
            {rec.distributorSentAt && <span className="sent-note">{t.distributorSent(fmtDate(rec.distributorSentAt))}</span>}
            <a className="btn-wa" href={`/wa/${rec.token}/d`} target="_blank" rel="noopener" onClick={() => setTimeout(refresh, 1500)}>
              <WaIcon size={16} /> {rec.distributorSentAt ? t.sendAgain : t.sendDistributor}
            </a>
            <button className="btn-dark" onClick={() => confirm(t.resolveConfirm) && logAction(rec.token, "resolve")}>{t.markResolved}</button>
          </RecordCard>
        ))}
        {!rows.length && <div className="card"><Empty>{open.length ? t.noProducts : t.mistakesEmpty}</Empty></div>}
      </div>
    </>
  );
}

function HistoryTab({ t, log, logAction, refresh }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const items = log.filter((r) => r.status === "approved" || r.status === "resolved" || r.status === "received");
  const rows = items.filter((r) => (!status || r.status === status) && recordSearch(r, norm(q)));
  const approved = items.filter((r) => r.status === "approved");
  return (
    <>
      <Kpis items={[
        [t.kpi.total, items.length],
        [t.kpi.approved, approved.length],
        [t.kpi.sentToAccountant, approved.filter((r) => r.accountantSentAt).length],
        [t.kpi.ordersReceived, items.filter((r) => r.status === "received").length],
      ]} />
      <div className="toolbar">
        <input className="input grow" placeholder={t.search} value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input grow" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">{t.allStatuses}</option>
          <option value="approved">{t.status.approved}</option>
          <option value="resolved">{t.status.resolved}</option>
          <option value="received">{t.status.received}</option>
        </select>
      </div>
      <div className="records">
        {rows.map((rec) => (
          <RecordCard key={rec.token} t={t} rec={rec}>
            {rec.status === "approved" && (
              <>
                {rec.accountantSentAt && <span className="sent-note">{t.accountantSent(fmtDate(rec.accountantSentAt))}</span>}
                <a className={rec.accountantSentAt ? "btn-outline" : "btn-wa"} href={`/wa/${rec.token}/a`} target="_blank" rel="noopener" onClick={() => setTimeout(refresh, 1500)}>
                  <WaIcon size={16} /> {rec.accountantSentAt ? t.sendAgain : t.sendAccountant}
                </a>
              </>
            )}
            {rec.status === "resolved" && (
              <>
                {rec.distributorSentAt && <span className="sent-note">{t.distributorSent(fmtDate(rec.distributorSentAt))}</span>}
                <button className="btn-outline" onClick={() => logAction(rec.token, "reopen")}>{t.reopen}</button>
              </>
            )}
          </RecordCard>
        ))}
        {!rows.length && <div className="card"><Empty>{t.historyEmpty}</Empty></div>}
      </div>
    </>
  );
}

function DebtsTab({ t }) {
  return (
    <div className="card soon">
      <div className="soon-icon">💳</div>
      <div className="strong big">{t.debtsTitle}</div>
      <div className="muted">{t.debtsSoon}</div>
    </div>
  );
}

// ── Storage (Syrve stock) ────────────────────────────────────────────────────

const PRIORITIES = ["red", "yellow", "cyan"];
const PRIO_RANK = { red: 0, yellow: 1, cyan: 2 };
const MAX_STOCK_ROWS = 300;
const isLow = (it) => it.min !== null && it.live <= it.min;

function PrioPicker({ t, value, onChange }) {
  return (
    <div className="prio-pick">
      {PRIORITIES.map((p) => (
        <button key={p} className={"prio-dot p-" + p + (value === p ? " on" : "")} title={t.stock.prioNames[p]}
          aria-label={t.stock.prioNames[p]} aria-pressed={value === p} onClick={() => onChange(value === p ? "" : p)} />
      ))}
    </div>
  );
}

// A number that saves when you leave the field or press Enter.
function NumInput({ value, placeholder, title, onSave }) {
  const shown = value === null || value === undefined ? "" : qtyStr(value);
  const [v, setV] = useState(shown);
  useEffect(() => setV(shown), [shown]);
  const commit = () => { if (v.trim() !== shown) onSave(v.trim()); };
  return (
    <input className="input num-input mono" inputMode="decimal" value={v} placeholder={placeholder} title={title}
      onChange={(e) => setV(e.target.value)} onBlur={commit}
      onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); if (e.key === "Escape") { setV(shown); } }} />
  );
}

function StockLink({ t, item, products, onSave }) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    const value = item.noLink ? "none" : item.link && !item.link.auto ? String(item.link.id) : "";
    return (
      <select className="input link-select" autoFocus value={value} onBlur={() => setEditing(false)}
        onChange={(e) => { setEditing(false); onSave(e.target.value); }}>
        <option value="">{t.stock.autoOpt}</option>
        <option value="none">{t.stock.unlinkOpt}</option>
        {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
    );
  }
  return (
    <div className="muted small">
      {item.link ? <>{t.stock.linked} {item.link.name}{item.link.auto && <span className="tag">{t.stock.autoLinked}</span>}</> : t.stock.noLink}
      {" "}<button className="link-btn" onClick={() => setEditing(true)}>{t.stock.changeLink}</button>
    </div>
  );
}

function StorageTab({ t, guard }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (fresh) => {
    setBusy(true);
    try { setData(await guard(() => api("/api/stock" + (fresh ? "?fresh=1" : "")))); setErr(""); }
    catch (e) { setErr(e.message); }
    setBusy(false);
  }, [guard]);
  useEffect(() => {
    load(false);
    // Syrve numbers change with every sale; the server reuses them for a minute
    const id = setInterval(() => { if (document.visibilityState === "visible") load(false); }, 60000);
    return () => clearInterval(id);
  }, [load]);

  const save = async (body) => {
    try { setData(await guard(() => api("/api/stock", body))); setErr(""); }
    catch (e) { setErr(e.message); }
  };

  if (!data) {
    return <div className="card">{err ? <div className="empty error-text">{t.stock.error}{err}</div> : <Empty>{t.loading}</Empty>}</div>;
  }

  const qn = norm(q);
  const rows = data.items
    .filter((it) => !qn || norm(it.name).includes(qn) || norm(it.group).includes(qn) || norm(it.link?.name).includes(qn))
    .filter((it) => !filter || (filter === "low" ? isLow(it) : filter === "min" ? it.min !== null : it.prio === filter))
    .sort((a, b) => (isLow(b) - isLow(a)) || ((PRIO_RANK[a.prio] ?? 3) - (PRIO_RANK[b.prio] ?? 3)) || a.name.localeCompare(b.name));
  const lowCount = data.items.filter(isLow).length;
  const inv = data.inventory;

  return (
    <>
      <div className="kpis">
        <div className="card kpi"><div className="kpi-label">{t.stock.kpi.products}</div><div className="kpi-value">{data.items.length}</div></div>
        <div className="card kpi"><div className="kpi-label">{t.stock.kpi.low}</div><div className={"kpi-value" + (lowCount ? " red-text" : "")}>{lowCount}</div></div>
        <div className="card kpi">
          <div className="kpi-label">{t.stock.kpi.lastInv}</div>
          <div className="kpi-value">{inv ? fmtDate(inv.date, true).slice(0, 10) : "—"}</div>
          <div className="muted small">{inv ? t.stock.invDoc(inv.num, inv.count) : t.stock.noInv}</div>
        </div>
        <div className="card kpi"><div className="kpi-label">{t.stock.kpi.asOf}</div><div className="kpi-value">{fmtDate(data.asOf).slice(6)}</div></div>
      </div>

      {err && <div className="card notice error-text">{t.stock.error}{err}</div>}
      {data.alarmProblem === "no_group" && <div className="card notice">{t.stock.noGroup}</div>}
      {data.inventoryError && <div className="card notice muted small">{t.stock.invError}{data.inventoryError}</div>}

      <div className="card table-card">
        <div className="toolbar inner">
          <input className="input grow" placeholder={t.stock.search} value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="input" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">{t.stock.all}</option>
            <option value="low">{t.stock.low}</option>
            <option value="min">{t.stock.withMin}</option>
            {PRIORITIES.map((p) => <option key={p} value={p}>{t.stock.prioNames[p]}</option>)}
          </select>
          {data.stores.length > 1 && (
            <select className="input" value={data.store} onChange={(e) => save({ store: e.target.value })}>
              <option value="">{t.stock.allStores}</option>
              {data.stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
          <button className="btn-outline" disabled={busy} onClick={() => load(true)}>{t.stock.refresh}</button>
        </div>
        <div className="table-scroll">
          <table className="table stock-table">
            <thead>
              <tr>
                <th>{t.stock.col.prio}</th><th>{t.stock.col.name}</th>
                <th className="r">{t.stock.col.syrve}</th><th className="r" title={t.stock.corrHint}>{t.stock.col.live}</th>
                <th className="r" title={t.stock.minHint}>{t.stock.col.min}</th>
                <th className="r">{t.stock.col.inv}</th><th>{t.stock.col.status}</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, MAX_STOCK_ROWS).map((it) => {
                const low = isLow(it);
                return (
                  <tr key={it.id} className={low ? "row-low" : ""}>
                    <td><PrioPicker t={t} value={it.prio} onChange={(prio) => save({ id: it.id, prio })} /></td>
                    <td>
                      <div className="strong">{it.name}{it.group && <span className="tag">{it.group}</span>}</div>
                      <StockLink t={t} item={it} products={data.products} onSave={(link) => save({ id: it.id, link })} />
                    </td>
                    <td className="r mono muted nowrap">{qtyStr(it.syrve)} {it.unit}</td>
                    <td className="r nowrap">
                      <NumInput value={it.live} title={t.stock.corrHint} onSave={(live) => save({ id: it.id, live })} />
                      <span className="unit-label">{it.unit}</span>
                      {it.corr !== 0 && (
                        <div className="small corr-note" title={t.stock.corrHint}>
                          ✎ {t.stock.manual} {it.corr > 0 ? "+" : ""}{qtyStr(it.corr)}
                          {" "}<button className="link-btn" title={t.stock.resetCorr} onClick={() => save({ id: it.id, clearCorr: true })}>↺</button>
                        </div>
                      )}
                    </td>
                    <td className="r nowrap">
                      <NumInput value={it.min} placeholder="—" title={t.stock.minHint} onSave={(min) => save({ id: it.id, min })} />
                      <span className="unit-label">{it.unit}</span>
                    </td>
                    <td className="r mono nowrap">{it.inv === null ? <span className="muted">—</span> : <span className={it.inv < 0 ? "red-text" : ""}>{it.inv > 0 ? "+" : ""}{qtyStr(it.inv)}</span>}</td>
                    <td className="nowrap">
                      {it.alarm ? <span className={"pill alarm-" + it.alarm}>{t.stock.alarm[it.alarm]}</span>
                        : low ? <span className="pill alarm-low">{t.stock.alarm.low}</span> : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!rows.length && <Empty>{t.stock.empty}</Empty>}
        {rows.length > MAX_STOCK_ROWS && <div className="muted small table-foot">{t.stock.showing(MAX_STOCK_ROWS, rows.length)}</div>}
      </div>
    </>
  );
}

// ── Product form ─────────────────────────────────────────────────────────────

function ProductModal({ t, lang, draft, products, onSave, onDelete, onClose }) {
  const [p, setP] = useState(draft);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const isNew = !draft.id;
  const set = (k) => (e) => setP((v) => ({ ...v, [k]: e.target.value }));
  const cats = [...new Set([...CATEGORIES, ...products.map((x) => x.category).filter(Boolean)])];
  const sups = [...new Set(products.filter((x) => x.type === p.type).map((x) => x.supplier).filter(Boolean))].sort();

  // picking a known supplier fills in their contact
  const pickSupplier = (e) => {
    const name = e.target.value;
    const known = products.find((x) => x.supplier === name && (x.phone || x.contactName));
    setP((v) => ({
      ...v,
      supplier: name,
      contactName: v.contactName || known?.contactName || "",
      phone: v.phone || known?.phone || "",
    }));
  };

  const save = async () => {
    if (!String(p.name || "").trim()) { setErr(t.nameRequired); return; }
    setBusy(true); setErr("");
    try { await onSave({ ...p, basePrice: num(String(p.basePrice).replace(",", ".")) }); }
    catch { setErr(t.saveFailed); setBusy(false); }
  };
  const remove = async () => {
    if (!confirm(t.deleteConfirm(p.name))) return;
    setBusy(true);
    try { await onDelete(p); } catch { setErr(t.saveFailed); setBusy(false); }
  };

  const field = (k, label, props = {}) => (
    <label className="field">
      <span className="field-label">{label}</span>
      <input className="input" value={p[k] ?? ""} onChange={set(k)} {...props} />
    </label>
  );

  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card modal">
        <div className="modal-head">
          <div className="strong big">{isNew ? t.newProduct : t.editProduct}</div>
          <button className="x-plain" onClick={onClose}>×</button>
        </div>
        <div className="segmented">
          {["distributor", "bazaar"].map((ty) => (
            <button key={ty} className={p.type === ty ? "on" : ""} onClick={() => setP((v) => ({ ...v, type: ty }))}>
              {ty === "bazaar" ? t.typeBazaar : t.typeDistributor}
            </button>
          ))}
        </div>
        <div className="form-grid">
          <label className="field">
            <span className="field-label">{t.f.category}</span>
            <input className="input" list="cat-list" value={p.category ?? ""} onChange={set("category")} />
            <datalist id="cat-list">{cats.map((c) => <option key={c} value={c}>{lang === "en" && CAT_EN[c] ? CAT_EN[c] : ""}</option>)}</datalist>
          </label>
          {field("name", t.f.name + " *", { autoFocus: isNew })}
          {field("code", t.f.code)}
          {field("nameRs", t.f.nameRs)}
          <label className="field">
            <span className="field-label">{t.f.supplier}</span>
            <input className="input" list="sup-list" value={p.supplier ?? ""} onChange={pickSupplier} />
            <datalist id="sup-list">{sups.map((s) => <option key={s} value={s} />)}</datalist>
          </label>
          {field("contactName", t.f.contactName)}
          {field("phone", t.f.phone, { type: "tel", placeholder: "5XX XX XX XX" })}
          {field("unit", t.f.size, { placeholder: "1 კგ" })}
          {field("basePrice", t.f.price, { inputMode: "decimal" })}
          {field("altSupplier", t.f.altSupplier)}
          <label className="field span2">
            <span className="field-label">{t.f.comment}</span>
            <input className="input" value={p.comment ?? ""} onChange={set("comment")} />
          </label>
        </div>
        {err && <div className="error-text">{err}</div>}
        <div className="modal-actions">
          {!isNew && <button className="btn-danger-outline" disabled={busy} onClick={remove}>{t.delete}</button>}
          <div className="grow" />
          <button className="btn-outline" onClick={onClose}>{t.cancel}</button>
          <button className="btn-dark" disabled={busy} onClick={save}>{busy ? "…" : t.save}</button>
        </div>
      </div>
    </div>
  );
}

// ── Settings ─────────────────────────────────────────────────────────────────

function SettingsModal({ t, lang, setLang, settings, saveSettings, onLogout, onClose }) {
  const [phone, setPhone] = useState(settings.accountantPhone || "");
  const [state, setState] = useState("");
  const [status, setStatus] = useState(null);
  useEffect(() => { api("/api/status").then(setStatus).catch(() => setStatus({})); }, []);
  const save = async () => {
    setState("saving");
    try { await saveSettings({ accountantPhone: phone }); setState("saved"); } catch { setState("error"); }
  };
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card modal">
        <div className="modal-head">
          <div className="strong big">⚙ {t.settings}</div>
          <button className="x-plain" onClick={onClose}>×</button>
        </div>

        <div className="section-title">{t.accountant}</div>
        <label className="field-label">{t.accountantPhone}</label>
        <div className="row">
          <input className="input grow" type="tel" placeholder="5XX XX XX XX" value={phone} onChange={(e) => { setPhone(e.target.value); setState(""); }} />
          <button className="btn-dark" onClick={save} disabled={state === "saving"}>{t.save}</button>
        </div>
        {state === "saved" && <div className="ok-text">{t.saved}</div>}
        {state === "error" && <div className="error-text">{t.saveFailed}</div>}
        <div className="small muted hint">{t.accountantHint}</div>

        <div className="section-title">{t.language}</div>
        <div className="segmented">
          <button className={lang === "ka" ? "on" : ""} onClick={() => setLang("ka")}>ქართული</button>
          <button className={lang === "en" ? "on" : ""} onClick={() => setLang("en")}>English</button>
        </div>

        <div className="section-title">{t.systemStatus}</div>
        {!status ? <div className="small muted">{t.loading}</div> : (
          <div className="status-list">
            {Object.entries(t.statusLabels).map(([k, label]) => (
              <div key={k} className="status-row">
                <span>{label}</span>
                <span className={status[k] ? "ok-text" : "error-text"}>{status[k] ? "✓" : "✗"}</span>
              </div>
            ))}
          </div>
        )}

        <div className="section-title">{t.botHelp}</div>
        <ul className="help-list small">{t.botHelpText.map((x, i) => <li key={i}>{x}</li>)}</ul>

        <div className="modal-actions">
          <button className="btn-danger-outline" onClick={onLogout}>{t.logout}</button>
          <div className="grow" />
          <button className="btn-outline" onClick={onClose}>{t.close}</button>
        </div>
      </div>
    </div>
  );
}

// ── App ──────────────────────────────────────────────────────────────────────

function App() {
  const [lang, setLangState] = useState(readLang);
  const t = T[lang];
  const setLang = (l) => { setLangState(l); try { localStorage.setItem("pc_lang", l); } catch {} };
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  const [session, setSession] = useState({ loading: true, authed: false, passwordSet: true });
  const [tab, setTab] = useState(tabFromHash);
  const [products, setProducts] = useState([]);
  const [order, setOrder] = useState({ items: [] });
  const [log, setLog] = useState([]);
  const [settings, setSettings] = useState({ accountantPhone: "" });
  const [sync, setSync] = useState("ok");
  const [loaded, setLoaded] = useState(false);
  const [modal, setModal] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  const checkSession = useCallback(async () => {
    try {
      const s = await api("/api/session");
      setSession({ loading: false, authed: !!s.authed, passwordSet: !!s.passwordSet });
    } catch {
      setSession({ loading: false, authed: false, passwordSet: true });
    }
  }, []);
  useEffect(() => { checkSession(); }, [checkSession]);

  // Any request that comes back 401 sends us to the login screen.
  const guard = useCallback(async (fn) => {
    setSync("saving");
    try {
      const r = await fn();
      setSync("ok");
      return r;
    } catch (err) {
      if (err.status === 401) setSession((s) => ({ ...s, authed: false }));
      setSync("error");
      throw err;
    }
  }, []);

  const loadAll = useCallback(async () => {
    const [p, o, l, s] = await guard(() => Promise.all([
      api("/api/base-prices"), api("/api/order"), api("/api/log"), api("/api/settings"),
    ]));
    setProducts(p.items || []);
    setOrder(o.order || { items: [] });
    setLog(l.items || []);
    setSettings(s.settings || {});
    setLoaded(true);
  }, [guard]);

  const refresh = useCallback(async () => {
    try {
      const [o, l] = await Promise.all([api("/api/order"), api("/api/log")]);
      setOrder(o.order || { items: [] });
      setLog(l.items || []);
      setSync("ok");
    } catch (err) {
      if (err.status === 401) setSession((s) => ({ ...s, authed: false }));
      else setSync("error");
    }
  }, []);

  useEffect(() => {
    if (!session.authed) return;
    loadAll().catch(() => {});
    // keep Orders / Mistakes / History fresh (the bot changes them from Telegram)
    const id = setInterval(() => { if (document.visibilityState === "visible") refresh(); }, 20000);
    const onVis = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVis); };
  }, [session.authed, loadAll, refresh]);

  useEffect(() => {
    const onHash = () => setTab(tabFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const go = (id) => {
    setTab(id);
    history.replaceState(null, "", "#" + id);
    window.scrollTo(0, 0);
    if (id === "orders" || id === "mistakes" || id === "history") refresh();
  };

  // ── data changes ──
  const saveProducts = async (list) => {
    const r = await guard(() => api("/api/base-prices", { items: list }));
    setProducts(r.items || []);
  };
  const saveProduct = async (p) => {
    let list;
    if (p.id) list = products.map((x) => (x.id === p.id ? p : x));
    else list = [...products, { ...p, id: products.reduce((m, x) => Math.max(m, x.id), 0) + 1 }];
    await saveProducts(list);
    setModal(null);
  };
  const deleteProduct = async (p) => {
    await saveProducts(products.filter((x) => x.id !== p.id));
    setModal(null);
  };
  const orderOps = async (ops) => {
    try {
      const r = await guard(() => api("/api/order", { ops }));
      setOrder(r.order);
      if (ops.some((o) => o.op === "received")) refresh();
    } catch {}
  };
  const logAction = async (token, action) => {
    try {
      const r = await guard(() => api("/api/log/action", { token, action }));
      setLog((l) => l.map((x) => (x.token === token ? r.item : x)));
    } catch {}
  };
  const saveSettings = async (s) => {
    const r = await guard(() => api("/api/settings", { settings: s }));
    setSettings(r.settings);
  };
  const logout = async () => {
    try { await api("/api/logout", {}); } catch {}
    setShowSettings(false);
    setSession((s) => ({ ...s, authed: false }));
  };

  const newProduct = (type) => setModal({
    type, category: "", name: "", nameRs: "", code: "", supplier: "", contactName: "", phone: "",
    unit: "", basePrice: "", altSupplier: "", comment: "",
  });

  if (session.loading) return <div className="login-wrap"><div className="muted">{t.loading}</div></div>;
  if (!session.authed) {
    return <Login t={t} lang={lang} setLang={setLang} passwordSet={session.passwordSet}
      onDone={() => setSession({ loading: false, authed: true, passwordSet: true })} />;
  }

  const openMistakes = log.filter((r) => r.status === "rejected").length;
  const badges = { orders: order.items.length, mistakes: openMistakes };

  return (
    <>
      <header className="topbar">
        <div className="brand">🫓 Focacceria <span className="muted">— {t.appSub}</span></div>
        <div className="topbar-right">
          <span className={"sync sync-" + sync}>{t.sync[sync]}</span>
          <button className="btn-ghost small" onClick={() => setLang(lang === "ka" ? "en" : "ka")}>{lang === "ka" ? "EN" : "ქა"}</button>
          <button className="btn-ghost small" onClick={() => setShowSettings(true)} title={t.settings}>⚙</button>
        </div>
      </header>

      <main className="main">
        <nav className="tabs">
          {TABS.map((id) => (
            <button key={id} className={"tab" + (tab === id ? " on" : "")} onClick={() => go(id)}>
              {t.tabs[id]}
              {badges[id] > 0 && <span className="badge">{badges[id]}</span>}
            </button>
          ))}
        </nav>

        {!loaded ? <div className="card"><Empty>{t.loading}</Empty></div> : (
          <>
            {tab === "products" && <ProductsTab t={t} lang={lang} products={products} onEdit={(p) => setModal({ ...p })} onAdd={newProduct} />}
            {tab === "distributors" && <DistributorsTab t={t} products={products} />}
            {tab === "bazaar" && <BazaarTab t={t} lang={lang} products={products} onEdit={(p) => setModal({ ...p })} onAdd={newProduct} />}
            {tab === "orders" && <OrdersTab t={t} lang={lang} products={products} order={order} orderOps={orderOps} />}
            {tab === "storage" && <StorageTab t={t} guard={guard} />}
            {tab === "mistakes" && <MistakesTab t={t} log={log} logAction={logAction} refresh={refresh} />}
            {tab === "debts" && <DebtsTab t={t} />}
            {tab === "history" && <HistoryTab t={t} log={log} logAction={logAction} refresh={refresh} />}
          </>
        )}
      </main>

      {modal && <ProductModal t={t} lang={lang} draft={modal} products={products} onSave={saveProduct} onDelete={deleteProduct} onClose={() => setModal(null)} />}
      {showSettings && <SettingsModal t={t} lang={lang} setLang={setLang} settings={settings} saveSettings={saveSettings} onLogout={logout} onClose={() => setShowSettings(false)} />}
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
