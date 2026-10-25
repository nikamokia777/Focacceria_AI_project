/* Dashboard — 8 tabs: fixed cost, variable cost, live income, monthly income,
   debts, ratings, employees, tasks.  Georgian / English.
   Open with ?demo=1 to try it with sample data (nothing is saved to the server). */

(() => {
"use strict";

// ====================== settings ======================
const API = "/api/dash";
const DEMO = new URLSearchParams(location.search).get("demo") === "1";
const SUBITEMS_ENABLED = false;          // turn on later to show sub-items inside a fixed cost category
const LIVE_REFRESH_MS = 2 * 60 * 1000;   // live income auto-refresh
const CURRENCY = "₾";

const TABS = ["fixed", "variable", "live", "monthly", "debts", "ratings", "employees", "tasks"];
const FIXED_PRESETS = ["rent", "utilities", "internet", "salaries", "program", "cleaning", "outsourcing"];
const VAR_TYPES = ["goods", "jars", "packaging", "other"];
const PLATFORMS = ["wolt", "glovo", "bolt", "other"];

// ====================== translations ======================
const T = {
  ka: {
    dashboard: "დეშბორდი", home: "← მთავარი", password: "პაროლი", login: "შესვლა", logout: "გასვლა",
    wrong_password: "პაროლი არასწორია", too_many: "ძალიან ბევრი მცდელობა — სცადეთ 15 წუთში",
    not_set: "პაროლი ჯერ არ არის დაყენებული — გაგზავნეთ /password ბოტთან", saved: "შენახულია", save_failed: "ვერ შეინახა",
    tab_fixed: "ფიქსირებული ხარჯები", tab_variable: "ცვლადი ხარჯები", tab_live: "შემოსავალი ახლა",
    tab_monthly: "თვიური შემოსავალი", tab_debts: "ვალები", tab_ratings: "რეიტინგები",
    tab_employees: "თანამშრომლები", tab_tasks: "დავალებები",
    rent: "ქირა", utilities: "კომუნალური", internet: "ინტერნეტი", salaries: "ხელფასები",
    program: "პროგრამის მომსახურება", cleaning: "დასუფთავება", outsourcing: "აუთსორსინგი",
    category: "კატეგორია", amount: "თანხა", due_day: "გადახდის დღე", status: "სტატუსი", comment: "კომენტარი",
    paid: "გადახდილი", unpaid: "გადაუხდელი", total: "ჯამი", per_month: "თვეში",
    paid_this_month: "გადახდილი ამ თვეში", left_to_pay: "დარჩენილი გადასახდელი", next_due: "შემდეგი გადახდა",
    add_category: "კატეგორიის დამატება", add: "დამატება", export: "ექსპორტი Excel-ში", name: "დასახელება",
    delete: "წაშლა", confirm_delete: "წავშალო?", none: "—", day: "რიცხვი",
    fixed_sub: "ერთი სია ყველა თვისთვის. „გადახდილი“ ყოველი თვის დასაწყისში თავიდან იწყება.",
    every_month_on: "ყოველი თვის", overdue: "ვადაგადაცილებული",
    goods: "საქონელი", jars: "ქილები", packaging: "შეფუთვა", other: "სხვა", type: "ტიპი", date: "თარიღი",
    month: "თვე", var_sub: "საქონლის ღირებულება და დამატებითი ხარჯები (ქილები, შეფუთვა).",
    no_entries: "ჩანაწერები ჯერ არ არის", month_total: "თვის ჯამი",
    today_income: "დღევანდელი შემოსავალი", orders: "შეკვეთები", avg_check: "საშუალო ჩეკი",
    by_payment: "გადახდის ტიპის მიხედვით", by_hour: "საათების მიხედვით", refresh: "განახლება",
    updated: "განახლდა", live_sub: "მონაცემები Syrve-დან, ახლდება ყოველ 2 წუთში.",
    cash: "ნაღდი", card: "ბარათი", credit: "კრედიტი",
    income: "შემოსავალი", fixed: "ფიქსირებული", variable: "ცვლადი", profit: "მოგება",
    this_month: "ეს თვე", last_month: "წინა თვე", profit_this_month: "მოგება ამ თვეში",
    monthly_sub: "შემოსავალი Syrve-ს სალაროს ცვლებიდან. მოგება = შემოსავალი − ფიქსირებული − ცვლადი.",
    monthly_note: "ფიქსირებული ხარჯი ყველა თვისთვის მიმდინარე სიიდან ითვლება.",
    income_by_month: "შემოსავალი თვეების მიხედვით",
    total_owed: "სულ გადასახდელი", suppliers: "მომწოდებლები", supplier: "მომწოდებელი", owed: "გადასახდელი",
    debts_sub: "რამდენი გვმართებს მომწოდებლებს, Syrve-ს ბალანსის მიხედვით.", search: "ძებნა",
    prepaid: "წინასწარ გადახდილი", no_debts: "ვალები არ არის",
    platform: "პლატფორმა", rating: "რეიტინგი", reviews: "შეფასებები", latest: "ბოლო",
    ratings_sub: "მიტანის აპლიკაციების რეიტინგები. შეიყვანეთ ციფრები აპლიკაციიდან.", history: "ისტორია",
    wolt: "Wolt", glovo: "Glovo", bolt: "Bolt Food", no_rating: "ჯერ არ არის", vs_prev: "წინასთან შედარებით",
    working_today: "დღეს მუშაობს", calendar: "კალენდარი", shift: "ცვლა", on_shift: "ცვლაზეა",
    finished: "დაასრულა", not_arrived: "ჯერ არ მოსულა", nobody_today: "დღეს ცვლები არ არის",
    employees_sub: "გრაფიკი და გამოცხადება Syrve-დან.", prev: "‹", next: "›",
    days: ["ორშ", "სამ", "ოთხ", "ხუთ", "პარ", "შაბ", "კვი"],
    months: ["იანვარი", "თებერვალი", "მარტი", "აპრილი", "მაისი", "ივნისი", "ივლისი", "აგვისტო", "სექტემბერი", "ოქტომბერი", "ნოემბერი", "დეკემბერი"],
    daily_tasks: "ყოველდღიური დავალებები", overall_tasks: "ზოგადი დავალებები", task: "დავალება",
    assignee: "პასუხისმგებელი", due: "ვადა", done_today: "შესრულებულია დღეს", tasks_sub: "ყოველდღიური სია ყოველ დღე თავიდან იწყება.",
    open_tasks: "ღია დავალებები", done: "შესრულებული", no_tasks: "დავალებები ჯერ არ არის",
    syrve_error: "Syrve-დან მონაცემები ვერ მივიღე", loading: "იტვირთება…",
    demo: "დემო რეჟიმი — ნიმუშის მონაცემები, არაფერი ინახება.",
  },
  en: {
    dashboard: "Dashboard", home: "← Home", password: "Password", login: "Log in", logout: "Log out",
    wrong_password: "Wrong password", too_many: "Too many attempts — try again in 15 minutes",
    not_set: "No password set yet — send /password to the bot", saved: "Saved", save_failed: "Could not save",
    tab_fixed: "Fixed costs", tab_variable: "Variable costs", tab_live: "Live income",
    tab_monthly: "Monthly income", tab_debts: "Debts", tab_ratings: "Ratings",
    tab_employees: "Employees", tab_tasks: "Tasks",
    rent: "Rent", utilities: "Utilities", internet: "Internet", salaries: "Salaries",
    program: "Program service", cleaning: "Cleaning", outsourcing: "Outsourcing",
    category: "Category", amount: "Amount", due_day: "Due day", status: "Status", comment: "Comment",
    paid: "Paid", unpaid: "Unpaid", total: "Total", per_month: "per month",
    paid_this_month: "Paid this month", left_to_pay: "Left to pay", next_due: "Next payment",
    add_category: "Add category", add: "Add", export: "Export to Excel", name: "Name",
    delete: "Delete", confirm_delete: "Delete this?", none: "—", day: "Day",
    fixed_sub: "One list for every month. “Paid” starts over at the beginning of each month.",
    every_month_on: "every month on day", overdue: "Overdue",
    goods: "Goods", jars: "Jars", packaging: "Packaging", other: "Other", type: "Type", date: "Date",
    month: "Month", var_sub: "Cost of goods and extra costs (jars, packaging).",
    no_entries: "No entries yet", month_total: "Month total",
    today_income: "Today's income", orders: "Orders", avg_check: "Average check",
    by_payment: "By payment type", by_hour: "By hour", refresh: "Refresh",
    updated: "Updated", live_sub: "Data from Syrve, refreshes every 2 minutes.",
    cash: "Cash", card: "Card", credit: "Credit",
    income: "Income", fixed: "Fixed", variable: "Variable", profit: "Profit",
    this_month: "This month", last_month: "Last month", profit_this_month: "Profit this month",
    monthly_sub: "Income from Syrve cash shifts. Profit = income − fixed − variable.",
    monthly_note: "Fixed cost for every month uses the current fixed cost list.",
    income_by_month: "Income by month",
    total_owed: "Total owed", suppliers: "Suppliers", supplier: "Supplier", owed: "Owed",
    debts_sub: "What we owe suppliers, from Syrve balances.", search: "Search",
    prepaid: "Prepaid", no_debts: "No debts",
    platform: "Platform", rating: "Rating", reviews: "Reviews", latest: "Latest",
    ratings_sub: "Delivery app ratings. Enter the numbers from each app.", history: "History",
    wolt: "Wolt", glovo: "Glovo", bolt: "Bolt Food", no_rating: "No rating yet", vs_prev: "vs previous",
    working_today: "Working today", calendar: "Calendar", shift: "Shift", on_shift: "On shift",
    finished: "Finished", not_arrived: "Not arrived yet", nobody_today: "No shifts today",
    employees_sub: "Schedule and attendance from Syrve.", prev: "‹", next: "›",
    days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    daily_tasks: "Daily tasks", overall_tasks: "Overall tasks", task: "Task",
    assignee: "Assignee", due: "Due", done_today: "Done today", tasks_sub: "The daily list starts over every day.",
    open_tasks: "Open tasks", done: "Done", no_tasks: "No tasks yet",
    syrve_error: "Couldn't get data from Syrve", loading: "Loading…",
    demo: "Demo mode — sample data, nothing is saved.",
  },
};

const store = {
  get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (_) {} },
  del(k) { try { localStorage.removeItem(k); } catch (_) {} },
};

// ====================== state ======================
const S = {
  lang: store.get("dash_lang") || "ka",
  tab: null,
  data: {},          // fixed, variable, ratings, tasks
  syrve: {},         // live, monthly, debts, employees:<month>
  varMonth: ymNow(),
  empMonth: ymNow(),
  debtQuery: "",
  liveTimer: null,
};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const t = k => (T[S.lang][k] ?? T.en[k] ?? k);

// ====================== small helpers ======================

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function n(v) { const x = Number(v); return Number.isFinite(x) ? x : 0; }
function money(v, opts = {}) {
  const x = n(v);
  const s = Math.abs(x).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).replace(/,/g, " ");
  return (x < 0 ? "−" : "") + s + (opts.noCur ? "" : " " + CURRENCY);
}
function compact(v) {
  const x = Math.abs(n(v));
  if (x >= 1e6) return (n(v) / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
  if (x >= 1e3) return (n(v) / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
  return String(Math.round(n(v)));
}
function pad(x) { return String(x).padStart(2, "0"); }
function todayISO() { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function ymNow() { return todayISO().slice(0, 7); }
function ymShift(ym, delta) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
function monthLabel(ym, short = false) {
  const [y, m] = ym.split("-").map(Number);
  const name = t("months")[m - 1];
  return short ? `${name.slice(0, 3)} ${String(y).slice(2)}` : `${name} ${y}`;
}
function hhmm(s) { return s && s.length >= 16 ? s.slice(11, 16) : ""; }
function toast(msg) {
  const el = $("#toast");
  el.textContent = msg; el.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => (el.hidden = true), 1800);
}

// ====================== API ======================
// Uses the same login as PriceCheck (a cookie), so no token is kept here.
async function request(url, opts = {}) {
  const res = await fetch(url, {
    method: opts.method || "GET",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const body = await res.json().catch(() => ({}));
  return { res, body };
}
async function api(path, opts = {}) {
  if (DEMO) return demoApi(path, opts);
  const { res, body } = await request(API + path, opts);
  if (res.status === 401) { showLogin(); throw new Error("unauthorized"); }
  if (!res.ok) throw new Error(body.error || ("HTTP " + res.status));
  return body;
}

const DEFAULTS = {
  fixed: () => ({ categories: FIXED_PRESETS.map(k => ({ id: uid(), key: k, name: "", amount: 0, dueDay: "", comment: "", paid: {}, items: [] })) }),
  variable: () => ({ entries: [] }),
  ratings: () => ({ entries: [] }),
  tasks: () => ({ daily: [], overall: [] }),
};

async function loadData(key) {
  if (S.data[key]) return S.data[key];
  const r = await api("/data/" + key);
  S.data[key] = r.value || DEFAULTS[key]();
  return S.data[key];
}

const saveTimers = {};
function saveData(key) {
  clearTimeout(saveTimers[key]);
  saveTimers[key] = setTimeout(async () => {
    try { await api("/data/" + key, { method: "PUT", body: { value: S.data[key] } }); toast(t("saved")); }
    catch (e) { toast(t("save_failed") + ": " + e.message); }
  }, 500);
}

async function loadSyrve(name, query = "", fresh = false) {
  const cacheKey = name + query;
  if (S.syrve[cacheKey] && !fresh) return S.syrve[cacheKey];
  const sep = query ? "&" : "?";
  const r = await api(`/syrve/${name}${query}${fresh ? sep + "fresh=1" : ""}`);
  S.syrve[cacheKey] = r;
  return r;
}

// ====================== export ======================
function exportXlsx(filename, sheetName, rows) {
  if (!window.XLSX) { toast("Excel library not loaded"); return; }
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = rows[0].map((_, i) => ({ wch: Math.max(10, ...rows.map(r => String(r[i] ?? "").length + 2)) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, filename);
}

// ====================== bar chart (single series) ======================
// points: [{label, value, tip}]
function barChart(points, { height = 220, highlightLast = false, width = 720 } = {}) {
  const W = Math.max(280, Math.round(width)), H = height, padL = 44, padR = 8, padT = 18, padB = 26;
  const max = Math.max(1, ...points.map(p => p.value));
  const step = niceStep(max / 4);
  const top = Math.ceil(max / step) * step;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const band = innerW / Math.max(1, points.length);
  const bw = Math.min(24, band * 0.6);
  const y = v => padT + innerH - (Math.max(0, v) / top) * innerH;

  let grid = "", axis = "";
  for (let v = 0; v <= top + 1e-9; v += step) {
    grid += `<line x1="${padL}" x2="${W - padR}" y1="${y(v)}" y2="${y(v)}"/>`;
    axis += `<text x="${padL - 8}" y="${y(v) + 4}" text-anchor="end">${compact(v)}</text>`;
  }
  const every = Math.ceil(points.length / 12);
  let bars = "", labels = "";
  points.forEach((p, i) => {
    const cx = padL + band * i + band / 2;
    const h = Math.max(0, padT + innerH - y(p.value));
    const x0 = cx - bw / 2, y0 = y(p.value), r = Math.min(4, h, bw / 2);
    const dim = highlightLast && i < points.length - 1 ? " dim" : "";
    const path = h > 0
      ? `M${x0},${y0 + h} L${x0},${y0 + r} Q${x0},${y0} ${x0 + r},${y0} L${x0 + bw - r},${y0} Q${x0 + bw},${y0} ${x0 + bw},${y0 + r} L${x0 + bw},${y0 + h} Z`
      : "";
    bars += `<rect class="hit" x="${padL + band * i}" y="${padT}" width="${band}" height="${innerH}" data-tip="${esc(p.tip ?? (p.label + ": " + money(p.value)))}" data-i="${i}"/>`;
    if (path) bars += `<path class="bar${dim}" data-i="${i}" d="${path}"/>`;
    if (i % every === 0) labels += `<text x="${cx}" y="${H - 8}" text-anchor="middle">${esc(p.label)}</text>`;
  });
  // label only the highest bar
  let peak = "";
  if (points.length) {
    const pi = points.reduce((b, p, i) => (p.value > points[b].value ? i : b), 0);
    if (points[pi].value > 0) {
      const cx = padL + band * pi + band / 2;
      peak = `<text class="val" x="${cx}" y="${y(points[pi].value) - 6}" text-anchor="middle">${compact(points[pi].value)}</text>`;
    }
  }
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img">
    <g class="grid">${grid}</g><g class="axis">${axis}${labels}</g>
    <line class="zero" x1="${padL}" x2="${W - padR}" y1="${y(0)}" y2="${y(0)}"/>
    <g>${bars}</g>${peak}</svg></div>`;
}
// inner width of a panel body, so chart text stays the same size on every screen
function panelWidth(half) {
  const v = $("#view");
  const cs = getComputedStyle(v);
  const inner = v.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const w = half && inner > 860 ? (inner - 20) / 2 : inner;
  return w - 34; // panel border + body padding
}
function niceStep(raw) {
  if (raw <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
}
function wireChartHover(root) {
  const tip = $("#tooltip");
  $$(".chart .hit", root).forEach(h => {
    const bar = $(`.chart .bar[data-i="${h.dataset.i}"]`, h.closest("svg"));
    h.addEventListener("mousemove", e => {
      tip.innerHTML = h.dataset.tip.replace(/: (.*)$/, ": <b>$1</b>");
      tip.style.left = e.clientX + "px"; tip.style.top = e.clientY + "px"; tip.hidden = false;
      bar && bar.classList.add("hover");
    });
    h.addEventListener("mouseleave", () => { tip.hidden = true; bar && bar.classList.remove("hover"); });
  });
}

// ====================== shell ======================
function applyStatic() {
  document.documentElement.lang = S.lang;
  $$("[data-t]").forEach(el => (el.textContent = t(el.dataset.t)));
  $("#langBtn").textContent = S.lang === "ka" ? "EN" : "ქარ";
  document.title = t("dashboard");
  $("#tabs").innerHTML = TABS.map(k =>
    `<button class="tab" role="tab" data-tab="${k}" aria-selected="${k === S.tab}">${esc(t("tab_" + k))}</button>`).join("");
  $$("#tabs .tab").forEach(b => b.addEventListener("click", () => { location.hash = b.dataset.tab; }));
}

function showLogin() { $("#app").hidden = true; $("#login").hidden = false; applyStatic(); $("#loginPass").focus(); }
function showApp() { $("#login").hidden = true; $("#app").hidden = false; route(); }
async function logout() {
  if (!DEMO) { try { await request("/api/logout", { method: "POST", body: {} }); } catch (_) {} }
  S.data = {}; S.syrve = {}; showLogin();
}

function route() {
  const tab = TABS.includes(location.hash.slice(1)) ? location.hash.slice(1) : TABS[0];
  S.tab = tab;
  clearInterval(S.liveTimer);
  applyStatic();
  render();
}

async function render() {
  const view = $("#view");
  const renderers = { fixed: renderFixed, variable: renderVariable, live: renderLive, monthly: renderMonthly,
    debts: renderDebts, ratings: renderRatings, employees: renderEmployees, tasks: renderTasks };
  const demo = DEMO ? `<div class="notice">${esc(t("demo"))}</div>` : "";
  try {
    await renderers[S.tab](view, demo);
  } catch (e) {
    view.innerHTML = demo + `<div class="notice bad">${esc(t("syrve_error"))}: ${esc(e.message)}</div>`;
  }
}

function head(title, sub, actions = "") {
  return `<div class="section-head"><div><h2>${esc(title)}</h2>${sub ? `<div class="sub">${esc(sub)}</div>` : ""}</div><div class="actions">${actions}</div></div>`;
}
function card(label, value, hint = "", cls = "") {
  return `<div class="card ${cls}"><div class="label">${esc(label)}</div><div class="value num ${cls.includes("good") ? "good" : cls.includes("bad") ? "bad" : ""}">${value}</div>${hint ? `<div class="hint">${hint}</div>` : ""}</div>`;
}
function confirmDel() { return confirm(t("confirm_delete")); }

// ====================== 1. FIXED COSTS ======================
async function renderFixed(view, demo) {
  const d = await loadData("fixed");
  const ym = ymNow();
  const day = new Date().getDate();
  const cats = d.categories;
  const catName = c => c.name || (c.key ? t(c.key) : "");
  const catAmount = c => (SUBITEMS_ENABLED && c.items && c.items.length ? c.items.reduce((a, i) => a + n(i.amount), 0) : n(c.amount));
  const total = cats.reduce((a, c) => a + catAmount(c), 0);
  const paid = cats.filter(c => c.paid && c.paid[ym]).reduce((a, c) => a + catAmount(c), 0);
  const unpaid = cats.filter(c => !(c.paid && c.paid[ym]));
  const nextDue = unpaid.filter(c => c.dueDay).sort((a, b) => n(a.dueDay) - n(b.dueDay))
    .find(c => n(c.dueDay) >= day) || unpaid.filter(c => c.dueDay).sort((a, b) => n(a.dueDay) - n(b.dueDay))[0];

  const rows = cats.map(c => {
    const isPaid = !!(c.paid && c.paid[ym]);
    const late = !isPaid && c.dueDay && n(c.dueDay) < day;
    const pill = isPaid
      ? `<button class="pill good" data-act="toggle" data-id="${c.id}">✓ ${esc(t("paid"))}</button>`
      : `<button class="pill ${late ? "bad" : "neutral"}" data-act="toggle" data-id="${c.id}">${late ? "! " + esc(t("overdue")) : "○ " + esc(t("unpaid"))}</button>`;
    return `<tr>
      <td><input class="cell-input" data-f="name" data-id="${c.id}" value="${esc(catName(c))}"></td>
      <td class="r"><input class="cell-input amount" type="number" step="0.01" min="0" data-f="amount" data-id="${c.id}" value="${esc(c.amount)}"></td>
      <td><input class="cell-input day" type="number" min="1" max="31" data-f="dueDay" data-id="${c.id}" value="${esc(c.dueDay)}" placeholder="—"></td>
      <td>${pill}</td>
      <td><input class="cell-input" data-f="comment" data-id="${c.id}" value="${esc(c.comment)}" placeholder="…"></td>
      <td class="r"><button class="icon-btn" title="${esc(t("delete"))}" data-act="del" data-id="${c.id}">✕</button></td>
    </tr>`;
  }).join("");

  view.innerHTML = demo + head(t("tab_fixed"), t("fixed_sub"), `<button class="btn" id="fxExport">${esc(t("export"))}</button>`) +
    `<div class="cards">
      ${card(t("total") + " · " + t("per_month"), money(total), "", "hero")}
      ${card(t("paid_this_month"), money(paid), monthLabel(ym), "good")}
      ${card(t("left_to_pay"), money(total - paid), `${unpaid.length} ${esc(t("category").toLowerCase())}`, total - paid > 0 ? "bad" : "")}
      ${card(t("next_due"), nextDue ? esc(catName(nextDue)) : t("none"), nextDue ? `${esc(t("day"))} ${esc(nextDue.dueDay)} · ${money(catAmount(nextDue))}` : "")}
    </div>
    <div class="panel">
      <div class="table-wrap"><table class="edit">
        <thead><tr><th>${esc(t("category"))}</th><th class="r">${esc(t("amount"))}</th><th>${esc(t("due_day"))}</th><th>${esc(t("status"))} · ${esc(monthLabel(ym))}</th><th>${esc(t("comment"))}</th><th></th></tr></thead>
        <tbody>${rows || `<tr><td colspan="6" class="empty">${esc(t("no_entries"))}</td></tr>`}</tbody>
        <tfoot><tr><td>${esc(t("total"))}</td><td class="r num">${money(total)}</td><td colspan="4"></td></tr></tfoot>
      </table></div>
      <form class="form-row" id="fxAdd">
        <label class="w-l">${esc(t("name"))}<input type="text" name="name" required></label>
        <label class="w-s">${esc(t("amount"))}<input type="number" name="amount" step="0.01" min="0" required></label>
        <label class="w-s">${esc(t("due_day"))}<input type="number" name="dueDay" min="1" max="31"></label>
        <label>${esc(t("comment"))}<input type="text" name="comment"></label>
        <button class="btn primary" type="submit">${esc(t("add_category"))}</button>
      </form>
    </div>`;

  const find = id => cats.find(c => c.id === id);
  $$(".cell-input", view).forEach(inp => inp.addEventListener("change", () => {
    const c = find(inp.dataset.id); if (!c) return;
    const f = inp.dataset.f;
    if (f === "name") c.name = (c.key && inp.value.trim() === t(c.key)) ? "" : inp.value.trim();
    else if (f === "amount") c.amount = n(inp.value);
    else if (f === "dueDay") c.dueDay = inp.value ? Math.min(31, Math.max(1, n(inp.value))) : "";
    else c[f] = inp.value;
    saveData("fixed"); renderFixed(view, demo);
  }));
  $$("[data-act]", view).forEach(b => b.addEventListener("click", () => {
    const c = find(b.dataset.id); if (!c) return;
    if (b.dataset.act === "toggle") { c.paid = c.paid || {}; if (c.paid[ym]) delete c.paid[ym]; else c.paid[ym] = true; }
    if (b.dataset.act === "del") { if (!confirmDel()) return; d.categories = cats.filter(x => x.id !== c.id); }
    saveData("fixed"); renderFixed(view, demo);
  }));
  $("#fxAdd", view).addEventListener("submit", e => {
    e.preventDefault();
    const f = new FormData(e.target);
    d.categories.push({ id: uid(), key: null, name: f.get("name").trim(), amount: n(f.get("amount")),
      dueDay: f.get("dueDay") ? n(f.get("dueDay")) : "", comment: f.get("comment") || "", paid: {}, items: [] });
    saveData("fixed"); renderFixed(view, demo);
  });
  $("#fxExport", view).addEventListener("click", () => {
    const rows = [[t("category"), t("amount"), t("due_day"), t("status") + " " + monthLabel(ym), t("comment")]];
    cats.forEach(c => rows.push([catName(c), catAmount(c), c.dueDay || "", c.paid && c.paid[ym] ? t("paid") : t("unpaid"), c.comment || ""]));
    rows.push([t("total"), total, "", "", ""]);
    exportXlsx(`fixed-costs-${ym}.xlsx`, t("tab_fixed"), rows);
  });
}

// ====================== 2. VARIABLE COSTS ======================
async function renderVariable(view, demo) {
  const d = await loadData("variable");
  const ym = S.varMonth;
  const list = d.entries.filter(e => (e.date || "").startsWith(ym)).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const total = list.reduce((a, e) => a + n(e.amount), 0);
  const byType = Object.fromEntries(VAR_TYPES.map(k => [k, list.filter(e => e.type === k).reduce((a, e) => a + n(e.amount), 0)]));

  const typeSelect = (val, attrs) => `<select ${attrs}>${VAR_TYPES.map(k => `<option value="${k}" ${k === val ? "selected" : ""}>${esc(t(k))}</option>`).join("")}</select>`;
  const rows = list.map(e => `<tr>
    <td><input class="cell-input" type="date" data-f="date" data-id="${e.id}" value="${esc(e.date)}"></td>
    <td>${typeSelect(e.type, `class="cell-input" data-f="type" data-id="${e.id}"`)}</td>
    <td><input class="cell-input" data-f="name" data-id="${e.id}" value="${esc(e.name)}"></td>
    <td class="r"><input class="cell-input amount" type="number" step="0.01" min="0" data-f="amount" data-id="${e.id}" value="${esc(e.amount)}"></td>
    <td><input class="cell-input" data-f="comment" data-id="${e.id}" value="${esc(e.comment)}" placeholder="…"></td>
    <td class="r"><button class="icon-btn" data-act="del" data-id="${e.id}" title="${esc(t("delete"))}">✕</button></td>
  </tr>`).join("");

  const defaultDate = ym === ymNow() ? todayISO() : ym + "-01";
  view.innerHTML = demo + head(t("tab_variable"), t("var_sub"),
    `<input type="month" id="varMonth" value="${ym}"><button class="btn" id="varExport">${esc(t("export"))}</button>`) +
    `<div class="cards">
      ${card(t("month_total"), money(total), esc(monthLabel(ym)), "hero")}
      ${VAR_TYPES.map(k => card(t(k), money(byType[k]))).join("")}
    </div>
    <div class="panel">
      <div class="table-wrap"><table class="edit">
        <thead><tr><th>${esc(t("date"))}</th><th>${esc(t("type"))}</th><th>${esc(t("name"))}</th><th class="r">${esc(t("amount"))}</th><th>${esc(t("comment"))}</th><th></th></tr></thead>
        <tbody>${rows || `<tr><td colspan="6" class="empty">${esc(t("no_entries"))}</td></tr>`}</tbody>
        ${list.length ? `<tfoot><tr><td colspan="3">${esc(t("total"))}</td><td class="r num">${money(total)}</td><td colspan="2"></td></tr></tfoot>` : ""}
      </table></div>
      <form class="form-row" id="varAdd">
        <label class="w-s">${esc(t("date"))}<input type="date" name="date" value="${defaultDate}" required></label>
        <label class="w-s">${esc(t("type"))}${typeSelect("goods", 'name="type"')}</label>
        <label class="w-l">${esc(t("name"))}<input type="text" name="name" required></label>
        <label class="w-s">${esc(t("amount"))}<input type="number" name="amount" step="0.01" min="0" required></label>
        <label>${esc(t("comment"))}<input type="text" name="comment"></label>
        <button class="btn primary" type="submit">${esc(t("add"))}</button>
      </form>
    </div>`;

  $("#varMonth", view).addEventListener("change", e => { S.varMonth = e.target.value || ymNow(); renderVariable(view, demo); });
  const find = id => d.entries.find(x => x.id === id);
  $$(".cell-input", view).forEach(inp => inp.addEventListener("change", () => {
    const e = find(inp.dataset.id); if (!e) return;
    e[inp.dataset.f] = inp.dataset.f === "amount" ? n(inp.value) : inp.value;
    saveData("variable"); renderVariable(view, demo);
  }));
  $$("[data-act=del]", view).forEach(b => b.addEventListener("click", () => {
    if (!confirmDel()) return;
    d.entries = d.entries.filter(x => x.id !== b.dataset.id); saveData("variable"); renderVariable(view, demo);
  }));
  $("#varAdd", view).addEventListener("submit", ev => {
    ev.preventDefault();
    const f = new FormData(ev.target);
    d.entries.push({ id: uid(), date: f.get("date"), type: f.get("type"), name: f.get("name").trim(), amount: n(f.get("amount")), comment: f.get("comment") || "" });
    S.varMonth = String(f.get("date")).slice(0, 7);
    saveData("variable"); renderVariable(view, demo);
  });
  $("#varExport", view).addEventListener("click", () => {
    const rows = [[t("date"), t("type"), t("name"), t("amount"), t("comment")]];
    list.forEach(e => rows.push([e.date, t(e.type), e.name, n(e.amount), e.comment || ""]));
    rows.push([t("total"), "", "", total, ""]);
    exportXlsx(`variable-costs-${ym}.xlsx`, t("tab_variable"), rows);
  });
}

// ====================== 3. LIVE INCOME ======================
async function renderLive(view, demo, fresh = false) {
  if (!S.syrve.live) view.innerHTML = demo + `<div class="loading">${esc(t("loading"))}</div>`;
  const r = await loadSyrve("live", "", fresh);
  const payName = s => {
    const k = String(s || "").toLowerCase();
    if (/cash|нал|ნაღდ/.test(k)) return t("cash");
    if (/card|карт|ბარათ|visa|master/.test(k)) return t("card");
    if (/credit|кредит/.test(k)) return t("credit");
    return s;
  };
  const maxPay = Math.max(1, ...r.byPayType.map(p => p.sum));
  const avg = r.orders ? r.total / r.orders : 0;
  const hours = [];
  if (r.byHour && r.byHour.length) {
    const lo = Math.min(...r.byHour.map(h => h.hour)), hi = Math.max(...r.byHour.map(h => h.hour));
    for (let h = lo; h <= hi; h++) {
      const v = (r.byHour.find(x => x.hour === h) || {}).sum || 0;
      hours.push({ label: pad(h) + ":00", value: v, tip: `${pad(h)}:00–${pad(h + 1)}:00: ${money(v)}` });
    }
  }
  const upd = new Date(r._at || Date.now());

  view.innerHTML = demo + head(t("tab_live"), t("live_sub"),
    `<span class="muted small">${esc(t("updated"))} ${pad(upd.getHours())}:${pad(upd.getMinutes())}</span><button class="btn" id="liveRefresh">${esc(t("refresh"))}</button>`) +
    `<div class="cards">
      ${card(t("today_income"), money(r.total), esc(r.date || ""), "hero")}
      ${card(t("orders"), r.orders ? String(r.orders) : t("none"))}
      ${card(t("avg_check"), r.orders ? money(avg) : t("none"))}
    </div>
    <div class="grid-2">
      <div class="panel"><div class="panel-head"><h3>${esc(t("by_payment"))}</h3></div><div class="panel-body">
        ${r.byPayType.length ? `<div class="split">${r.byPayType.sort((a, b) => b.sum - a.sum).map(p => `
          <div class="split-row"><span>${esc(payName(p.name))}</span><span class="num"><b>${money(p.sum)}</b> <span class="muted small">${r.total ? Math.round(p.sum / r.total * 100) : 0}%</span></span>
          <div class="bar-track"><div class="bar-fill" style="width:${(p.sum / maxPay * 100).toFixed(1)}%"></div></div></div>`).join("")}</div>`
        : `<div class="empty">${esc(t("no_entries"))}</div>`}
      </div></div>
      <div class="panel"><div class="panel-head"><h3>${esc(t("by_hour"))}</h3></div><div class="panel-body">
        ${hours.length ? barChart(hours, { height: 200, width: panelWidth(true) }) : `<div class="empty">${esc(t("no_entries"))}</div>`}
      </div></div>
    </div>`;
  wireChartHover(view);
  $("#liveRefresh", view).addEventListener("click", () => renderLive(view, demo, true).catch(e => toast(e.message)));
  clearInterval(S.liveTimer);
  S.liveTimer = setInterval(() => { if (S.tab === "live" && !document.hidden) renderLive(view, demo, true).catch(() => {}); }, LIVE_REFRESH_MS);
}

// ====================== 4. MONTHLY INCOME ======================
async function renderMonthly(view, demo) {
  view.innerHTML = demo + `<div class="loading">${esc(t("loading"))}</div>`;
  const [r, fx, vr] = await Promise.all([loadSyrve("monthly"), loadData("fixed"), loadData("variable")]);
  const fixedTotal = fx.categories.reduce((a, c) => a + n(c.amount), 0);
  const rows = r.months.map(m => {
    const variable = vr.entries.filter(e => (e.date || "").startsWith(m.month)).reduce((a, e) => a + n(e.amount), 0);
    return { ...m, fixed: fixedTotal, variable, profit: m.income - fixedTotal - variable };
  });
  const cur = rows[rows.length - 1] || { income: 0, profit: 0 };
  const prev = rows[rows.length - 2] || { income: 0 };
  const change = prev.income ? Math.round((cur.income - prev.income) / prev.income * 100) : null;

  view.innerHTML = demo + head(t("tab_monthly"), t("monthly_sub"), `<button class="btn" id="moExport">${esc(t("export"))}</button>`) +
    `<div class="cards">
      ${card(t("this_month"), money(cur.income), cur.month ? esc(monthLabel(cur.month)) : "", "hero")}
      ${card(t("last_month"), money(prev.income), prev.month ? esc(monthLabel(prev.month)) + (change !== null ? ` · ${change >= 0 ? "+" : "−"}${Math.abs(change)}%` : "") : "")}
      ${card(t("profit_this_month"), money(cur.profit), "", cur.profit >= 0 ? "good" : "bad")}
    </div>
    <div class="panel"><div class="panel-head"><h3>${esc(t("income_by_month"))}</h3></div><div class="panel-body">
      ${barChart(rows.map(m => ({ label: monthLabel(m.month, true), value: m.income, tip: `${monthLabel(m.month)}: ${money(m.income)}` })), { height: 240, width: panelWidth(false) })}
    </div></div>
    <div class="panel"><div class="table-wrap"><table class="edit">
      <thead><tr><th>${esc(t("month"))}</th><th class="r">${esc(t("income"))}</th><th class="r">${esc(t("cash"))}</th><th class="r">${esc(t("card"))}</th><th class="r">${esc(t("fixed"))}</th><th class="r">${esc(t("variable"))}</th><th class="r">${esc(t("profit"))}</th></tr></thead>
      <tbody>${rows.slice().reverse().map(m => `<tr>
        <td>${esc(monthLabel(m.month))}</td><td class="r num"><b>${money(m.income)}</b></td><td class="r num">${money(m.cash)}</td><td class="r num">${money(m.card)}</td>
        <td class="r num">${money(m.fixed)}</td><td class="r num">${money(m.variable)}</td>
        <td class="r num"><b style="color:var(${m.profit >= 0 ? "--good" : "--bad"})">${money(m.profit)}</b></td></tr>`).join("")}</tbody>
    </table></div></div>
    <p class="muted small">${esc(t("monthly_note"))}</p>`;
  wireChartHover(view);
  $("#moExport", view).addEventListener("click", () => {
    const out = [[t("month"), t("income"), t("cash"), t("card"), t("fixed"), t("variable"), t("profit")]];
    rows.forEach(m => out.push([monthLabel(m.month), m.income, m.cash, m.card, m.fixed, m.variable, m.profit]));
    exportXlsx(`monthly-income.xlsx`, t("tab_monthly"), out);
  });
}

// ====================== 5. DEBTS ======================
async function renderDebts(view, demo, fresh = false) {
  if (!S.syrve.debts) view.innerHTML = demo + `<div class="loading">${esc(t("loading"))}</div>`;
  const r = await loadSyrve("debts", "", fresh);
  const q = S.debtQuery.toLowerCase();
  const list = r.suppliers.filter(s => !q || String(s.name).toLowerCase().includes(q));
  const owing = r.suppliers.filter(s => s.owed > 0);

  view.innerHTML = demo + head(t("tab_debts"), t("debts_sub"),
    `<input type="text" id="debtSearch" placeholder="${esc(t("search"))}…" value="${esc(S.debtQuery)}"><button class="btn" id="debtRefresh">${esc(t("refresh"))}</button><button class="btn" id="debtExport">${esc(t("export"))}</button>`) +
    `<div class="cards">
      ${card(t("total_owed"), money(r.total), "", r.total > 0 ? "hero bad" : "hero")}
      ${card(t("suppliers"), String(owing.length))}
      ${owing[0] ? card(t("supplier") + " #1", esc(owing[0].name), money(owing[0].owed)) : ""}
    </div>
    <div class="panel"><div class="table-wrap"><table>
      <thead><tr><th>${esc(t("supplier"))}</th><th class="r">${esc(t("owed"))}</th></tr></thead>
      <tbody>${list.length ? list.map(s => `<tr><td>${esc(s.name)}</td><td class="r num">${s.owed >= 0 ? `<b>${money(s.owed)}</b>` : `<span class="pill neutral">${esc(t("prepaid"))}</span> ${money(-s.owed)}`}</td></tr>`).join("")
        : `<tr><td colspan="2" class="empty">${esc(t("no_debts"))}</td></tr>`}</tbody>
      ${list.length ? `<tfoot><tr><td>${esc(t("total_owed"))}</td><td class="r num">${money(r.total)}</td></tr></tfoot>` : ""}
    </table></div></div>`;

  const s = $("#debtSearch", view);
  s.addEventListener("input", () => { S.debtQuery = s.value; renderDebts(view, demo).then(() => { const x = $("#debtSearch"); x.focus(); x.setSelectionRange(x.value.length, x.value.length); }); });
  $("#debtRefresh", view).addEventListener("click", () => renderDebts(view, demo, true).catch(e => toast(e.message)));
  $("#debtExport", view).addEventListener("click", () => {
    const out = [[t("supplier"), t("owed")]];
    r.suppliers.forEach(x => out.push([x.name, x.owed]));
    out.push([t("total_owed"), r.total]);
    exportXlsx(`debts-${todayISO()}.xlsx`, t("tab_debts"), out);
  });
}

// ====================== 6. RATINGS ======================
async function renderRatings(view, demo) {
  const d = await loadData("ratings");
  const sorted = d.entries.slice().sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const stars = v => { const full = Math.round(n(v)); return "★".repeat(Math.max(0, Math.min(5, full))) + "☆".repeat(5 - Math.max(0, Math.min(5, full))); };
  const platName = p => t(p);

  const cards = PLATFORMS.filter(p => p !== "other" || sorted.some(e => e.platform === "other")).map(p => {
    const es = sorted.filter(e => e.platform === p);
    if (!es.length) return card(platName(p), t("none"), esc(t("no_rating")));
    const [last, prev] = es;
    let delta = "";
    if (prev) {
      const dv = Math.round((n(last.rating) - n(prev.rating)) * 100) / 100;
      if (dv !== 0) delta = ` <span class="delta ${dv > 0 ? "up" : "down"}">${dv > 0 ? "▲" : "▼"} ${Math.abs(dv)}</span>`;
    }
    return card(platName(p), `${n(last.rating).toFixed(1)}${delta}`,
      `<span class="stars">${stars(last.rating)}</span> · ${last.reviews ? esc(last.reviews) + " " + esc(t("reviews").toLowerCase()) + " · " : ""}${esc(last.date)}`);
  }).join("");

  const platSelect = `<select name="platform">${PLATFORMS.map(p => `<option value="${p}">${esc(platName(p))}</option>`).join("")}</select>`;
  view.innerHTML = demo + head(t("tab_ratings"), t("ratings_sub"), `<button class="btn" id="rtExport">${esc(t("export"))}</button>`) +
    `<div class="cards">${cards}</div>
    <div class="panel">
      <div class="panel-head"><h3>${esc(t("history"))}</h3></div>
      <div class="table-wrap"><table>
        <thead><tr><th>${esc(t("date"))}</th><th>${esc(t("platform"))}</th><th class="r">${esc(t("rating"))}</th><th class="r">${esc(t("reviews"))}</th><th>${esc(t("comment"))}</th><th></th></tr></thead>
        <tbody>${sorted.length ? sorted.map(e => `<tr><td>${esc(e.date)}</td><td>${esc(platName(e.platform))}</td>
          <td class="r num"><b>${n(e.rating).toFixed(1)}</b> <span class="stars">${stars(e.rating)}</span></td>
          <td class="r num">${esc(e.reviews || "")}</td><td>${esc(e.comment || "")}</td>
          <td class="r"><button class="icon-btn" data-act="del" data-id="${e.id}" title="${esc(t("delete"))}">✕</button></td></tr>`).join("")
          : `<tr><td colspan="6" class="empty">${esc(t("no_entries"))}</td></tr>`}</tbody>
      </table></div>
      <form class="form-row" id="rtAdd">
        <label class="w-s">${esc(t("date"))}<input type="date" name="date" value="${todayISO()}" required></label>
        <label class="w-s">${esc(t("platform"))}${platSelect}</label>
        <label class="w-s">${esc(t("rating"))}<input type="number" name="rating" min="0" max="5" step="0.1" required></label>
        <label class="w-s">${esc(t("reviews"))}<input type="number" name="reviews" min="0" step="1"></label>
        <label class="w-l">${esc(t("comment"))}<input type="text" name="comment"></label>
        <button class="btn primary" type="submit">${esc(t("add"))}</button>
      </form>
    </div>`;

  $$("[data-act=del]", view).forEach(b => b.addEventListener("click", () => {
    if (!confirmDel()) return;
    d.entries = d.entries.filter(x => x.id !== b.dataset.id); saveData("ratings"); renderRatings(view, demo);
  }));
  $("#rtAdd", view).addEventListener("submit", ev => {
    ev.preventDefault();
    const f = new FormData(ev.target);
    d.entries.push({ id: uid(), date: f.get("date"), platform: f.get("platform"), rating: n(f.get("rating")),
      reviews: f.get("reviews") ? n(f.get("reviews")) : "", comment: f.get("comment") || "" });
    saveData("ratings"); renderRatings(view, demo);
  });
  $("#rtExport", view).addEventListener("click", () => {
    const out = [[t("date"), t("platform"), t("rating"), t("reviews"), t("comment")]];
    sorted.forEach(e => out.push([e.date, platName(e.platform), n(e.rating), e.reviews || "", e.comment || ""]));
    exportXlsx(`ratings.xlsx`, t("tab_ratings"), out);
  });
}

// ====================== 7. EMPLOYEES ======================
async function renderEmployees(view, demo, fresh = false) {
  const ym = S.empMonth;
  view.innerHTML = demo + `<div class="loading">${esc(t("loading"))}</div>`;
  const q = "?month=" + ym;
  const [r, rToday] = await Promise.all([
    loadSyrve("employees", q, fresh),
    ym === ymNow() ? null : loadSyrve("employees", "?month=" + ymNow(), fresh),
  ]);
  const tdata = rToday || r;
  const today = tdata.today || todayISO();
  const now = new Date();
  const nowHM = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

  // who works today
  const todayShifts = tdata.shifts.filter(s => (s.from || "").slice(0, 10) === today).sort((a, b) => (a.from || "").localeCompare(b.from || ""));
  const att = tdata.attendance.filter(a => (a.from || "").slice(0, 10) === today);
  const statusOf = s => {
    const a = att.filter(x => x.employeeId === s.employeeId);
    if (!a.length) return `<span class="pill neutral">○ ${esc(t("not_arrived"))}</span>`;
    const open = a.find(x => !x.to || hhmm(x.to) > nowHM || (x.to || "").slice(0, 10) > today);
    return open
      ? `<span class="pill good">● ${esc(t("on_shift"))} · ${esc(hhmm(open.from))}</span>`
      : `<span class="pill neutral">✓ ${esc(t("finished"))} · ${esc(hhmm(a[a.length - 1].to))}</span>`;
  };
  const initials = name => String(name).split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join("").toUpperCase() || "?";
  const todayHtml = todayShifts.length ? `<div class="today-list">${todayShifts.map(s => `
    <div class="person"><div class="who"><span class="avatar">${esc(initials(s.name))}</span>
      <div><div><b>${esc(s.name)}</b></div><div class="muted small">${esc(t("shift"))} ${esc(hhmm(s.from))}–${esc(hhmm(s.to))}${s.department ? " · " + esc(s.department) : ""}</div></div></div>
      ${statusOf(s)}</div>`).join("")}</div>`
    : `<div class="empty">${esc(t("nobody_today"))}</div>`;

  // calendar
  const [y, m] = ym.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const lead = (first.getDay() + 6) % 7; // Monday first
  const daysIn = new Date(y, m, 0).getDate();
  const byDay = {};
  r.shifts.forEach(s => { const k = (s.from || "").slice(0, 10); (byDay[k] = byDay[k] || []).push(s); });
  let cells = t("days").map(dn => `<div class="cal-head">${esc(dn)}</div>`).join("");
  for (let i = 0; i < lead; i++) cells += `<div class="cal-day out"></div>`;
  for (let dd = 1; dd <= daysIn; dd++) {
    const k = `${ym}-${pad(dd)}`;
    const list = (byDay[k] || []).sort((a, b) => (a.from || "").localeCompare(b.from || ""));
    const shown = list.slice(0, 4);
    cells += `<div class="cal-day ${k === today ? "today" : ""}"><div class="d">${dd}</div>
      ${shown.map(s => `<div class="who" title="${esc(s.name)} ${esc(hhmm(s.from))}–${esc(hhmm(s.to))}">${esc(hhmm(s.from))} ${esc(s.name)}</div>`).join("")}
      ${list.length > shown.length ? `<div class="more">+${list.length - shown.length}</div>` : ""}</div>`;
  }
  const trail = (7 - ((lead + daysIn) % 7)) % 7;
  for (let i = 0; i < trail; i++) cells += `<div class="cal-day out"></div>`;

  view.innerHTML = demo + head(t("tab_employees"), t("employees_sub"), `<button class="btn" id="empRefresh">${esc(t("refresh"))}</button>`) +
    `<div class="panel"><div class="panel-head"><h3>${esc(t("working_today"))} · ${esc(today)}</h3><span class="muted small">${todayShifts.length}</span></div>
      <div class="panel-body">${todayHtml}</div></div>
    <div class="panel"><div class="panel-head"><h3>${esc(t("calendar"))}</h3>
      <div class="actions"><button class="btn small" id="empPrev">${t("prev")}</button><b>${esc(monthLabel(ym))}</b><button class="btn small" id="empNext">${t("next")}</button></div></div>
      <div class="calendar">${cells}</div></div>`;

  $("#empPrev", view).addEventListener("click", () => { S.empMonth = ymShift(ym, -1); renderEmployees(view, demo); });
  $("#empNext", view).addEventListener("click", () => { S.empMonth = ymShift(ym, 1); renderEmployees(view, demo); });
  $("#empRefresh", view).addEventListener("click", () => renderEmployees(view, demo, true).catch(e => toast(e.message)));
}

// ====================== 8. TASKS ======================
async function renderTasks(view, demo) {
  const d = await loadData("tasks");
  const today = todayISO();
  // keep daily history small: drop done-marks older than 60 days
  const cutoff = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10);
  d.daily.forEach(x => { x.done = Object.fromEntries(Object.entries(x.done || {}).filter(([k]) => k >= cutoff)); });

  const doneToday = d.daily.filter(x => x.done && x.done[today]).length;
  const pct = d.daily.length ? Math.round(doneToday / d.daily.length * 100) : 0;
  const overall = d.overall.slice().sort((a, b) => (a.done - b.done) || (a.due || "9999").localeCompare(b.due || "9999"));
  const openCount = d.overall.filter(x => !x.done).length;

  const dailyHtml = d.daily.length ? `<ul class="task-list">${d.daily.map(x => {
    const done = !!(x.done && x.done[today]);
    return `<li class="task ${done ? "done" : ""}"><input type="checkbox" data-kind="daily" data-id="${x.id}" ${done ? "checked" : ""}>
      <span class="title">${esc(x.title)}</span><span class="meta">${esc(x.assignee || "")}</span>
      <button class="icon-btn" data-del="daily" data-id="${x.id}" title="${esc(t("delete"))}">✕</button></li>`;
  }).join("")}</ul>` : `<div class="empty">${esc(t("no_tasks"))}</div>`;

  const overallHtml = overall.length ? `<ul class="task-list">${overall.map(x => {
    const late = !x.done && x.due && x.due < today;
    return `<li class="task ${x.done ? "done" : ""}"><input type="checkbox" data-kind="overall" data-id="${x.id}" ${x.done ? "checked" : ""}>
      <span class="title">${esc(x.title)}${x.assignee ? ` <span class="muted small">· ${esc(x.assignee)}</span>` : ""}</span>
      <span class="meta ${late ? "late" : ""}">${x.due ? (late ? "! " : "") + esc(x.due) : ""}</span>
      <button class="icon-btn" data-del="overall" data-id="${x.id}" title="${esc(t("delete"))}">✕</button></li>`;
  }).join("")}</ul>` : `<div class="empty">${esc(t("no_tasks"))}</div>`;

  view.innerHTML = demo + head(t("tab_tasks"), t("tasks_sub")) +
    `<div class="cards">
      ${card(t("done_today"), `${doneToday} / ${d.daily.length}`, `<div class="progress"><div style="width:${pct}%"></div></div>`, "hero")}
      ${card(t("open_tasks"), String(openCount))}
    </div>
    <div class="grid-2">
      <div class="panel"><div class="panel-head"><h3>${esc(t("daily_tasks"))}</h3><span class="muted small">${esc(today)}</span></div>
        ${dailyHtml}
        <form class="form-row" id="addDaily">
          <label class="w-l">${esc(t("task"))}<input type="text" name="title" required></label>
          <label>${esc(t("assignee"))}<input type="text" name="assignee"></label>
          <button class="btn primary" type="submit">${esc(t("add"))}</button>
        </form></div>
      <div class="panel"><div class="panel-head"><h3>${esc(t("overall_tasks"))}</h3></div>
        ${overallHtml}
        <form class="form-row" id="addOverall">
          <label class="w-l">${esc(t("task"))}<input type="text" name="title" required></label>
          <label>${esc(t("assignee"))}<input type="text" name="assignee"></label>
          <label class="w-s">${esc(t("due"))}<input type="date" name="due"></label>
          <button class="btn primary" type="submit">${esc(t("add"))}</button>
        </form></div>
    </div>`;

  $$("input[type=checkbox]", view).forEach(cb => cb.addEventListener("change", () => {
    if (cb.dataset.kind === "daily") {
      const x = d.daily.find(v => v.id === cb.dataset.id); if (!x) return;
      x.done = x.done || {}; if (cb.checked) x.done[today] = true; else delete x.done[today];
    } else {
      const x = d.overall.find(v => v.id === cb.dataset.id); if (!x) return;
      x.done = cb.checked; x.doneAt = cb.checked ? today : null;
    }
    saveData("tasks"); renderTasks(view, demo);
  }));
  $$("[data-del]", view).forEach(b => b.addEventListener("click", () => {
    if (!confirmDel()) return;
    const k = b.dataset.del; d[k] = d[k].filter(v => v.id !== b.dataset.id); saveData("tasks"); renderTasks(view, demo);
  }));
  $("#addDaily", view).addEventListener("submit", ev => {
    ev.preventDefault(); const f = new FormData(ev.target);
    d.daily.push({ id: uid(), title: f.get("title").trim(), assignee: (f.get("assignee") || "").trim(), done: {} });
    saveData("tasks"); renderTasks(view, demo);
  });
  $("#addOverall", view).addEventListener("submit", ev => {
    ev.preventDefault(); const f = new FormData(ev.target);
    d.overall.push({ id: uid(), title: f.get("title").trim(), assignee: (f.get("assignee") || "").trim(), due: f.get("due") || "", done: false, createdAt: today });
    saveData("tasks"); renderTasks(view, demo);
  });
}

// ====================== demo data ======================
function demoApi(path, opts) {
  const now = new Date();
  if (path.startsWith("/data/")) {
    const key = path.split("/")[2];
    if (opts.method === "PUT") return { ok: true };
    const samples = {
      fixed: { categories: [
        ["rent", 4500, 1], ["utilities", 1200, 10], ["internet", 90, 15], ["salaries", 18500, 5],
        ["program", 350, 20], ["cleaning", 600, 28], ["outsourcing", 800, 25],
      ].map(([k, a, dd], i) => ({ id: "f" + i, key: k, name: "", amount: a, dueDay: dd, comment: "", paid: i < 3 ? { [ymNow()]: true } : {}, items: [] })) },
      variable: { entries: [
        { id: "v1", date: todayISO(), type: "goods", name: "Flour 00, 50kg", amount: 310, comment: "" },
        { id: "v2", date: todayISO(), type: "jars", name: "Pesto jars 250ml ×200", amount: 180, comment: "" },
        { id: "v3", date: ymNow() + "-03", type: "packaging", name: "Pizza boxes ×500", amount: 420, comment: "" },
        { id: "v4", date: ymNow() + "-02", type: "goods", name: "Mozzarella", amount: 1240, comment: "" },
      ] },
      ratings: { entries: [
        { id: "r1", date: ymShift(ymNow(), -1) + "-15", platform: "wolt", rating: 4.5, reviews: 812, comment: "" },
        { id: "r2", date: todayISO(), platform: "wolt", rating: 4.6, reviews: 845, comment: "" },
        { id: "r3", date: todayISO(), platform: "glovo", rating: 4.7, reviews: 214, comment: "" },
      ] },
      tasks: { daily: [
        { id: "d1", title: "Open checklist", assignee: "Nino", done: { [todayISO()]: true } },
        { id: "d2", title: "Check fridge temperatures", assignee: "Giorgi", done: {} },
        { id: "d3", title: "Count cash at close", assignee: "", done: {} },
      ], overall: [
        { id: "o1", title: "Renew Wolt menu photos", assignee: "Ana", due: ymNow() + "-30", done: false },
        { id: "o2", title: "Fix terrace lights", assignee: "", due: ymShift(ymNow(), -1) + "-20", done: false },
      ] },
    };
    return { value: samples[key] };
  }
  if (path.startsWith("/syrve/live")) {
    const hrs = []; for (let h = 9; h <= Math.max(10, now.getHours()); h++) hrs.push({ hour: h, sum: Math.round(300 + Math.random() * 900 + (h >= 12 && h <= 14 ? 800 : 0) + (h >= 19 ? 900 : 0)) });
    const total = hrs.reduce((a, h) => a + h.sum, 0);
    return { date: todayISO(), total, orders: Math.round(total / 38), byPayType: [{ name: "Card", sum: Math.round(total * 0.68) }, { name: "Cash", sum: total - Math.round(total * 0.68) }], byHour: hrs, _at: Date.now() };
  }
  if (path.startsWith("/syrve/monthly")) {
    const months = []; for (let i = 11; i >= 0; i--) { const m = ymShift(ymNow(), -i); const inc = 52000 + Math.round(Math.sin(i) * 9000 + (11 - i) * 900); months.push({ month: m, income: i === 0 ? Math.round(inc * now.getDate() / 30) : inc, cash: Math.round(inc * 0.3), card: Math.round(inc * 0.7), credit: 0 }); }
    return { months };
  }
  if (path.startsWith("/syrve/debts")) {
    const suppliers = [["Nikora", 3420.5], ["Sante GMT", 2180], ["Ori Nabiji", 1460], ["Metro Cash & Carry", 890.4], ["Local farm (veg)", -200]].map(([name, owed], i) => ({ id: "s" + i, name, owed }));
    return { asOf: todayISO(), total: suppliers.filter(s => s.owed > 0).reduce((a, s) => a + s.owed, 0), suppliers };
  }
  if (path.startsWith("/syrve/employees")) {
    const month = (path.match(/month=(\d{4}-\d{2})/) || [])[1] || ymNow();
    const people = ["Nino Beridze", "Giorgi Kapanadze", "Ana Lomidze", "Luka Tsiklauri", "Mariam Gelashvili", "Saba Abashidze"];
    const [y, m] = month.split("-").map(Number); const days = new Date(y, m, 0).getDate();
    const shifts = [];
    for (let dd = 1; dd <= days; dd++) people.forEach((p, i) => {
      if ((dd + i) % 3 === 0) return;
      const start = i % 2 ? "15:00" : "09:00", end = i % 2 ? "23:00" : "17:00";
      shifts.push({ employeeId: "e" + i, name: p, from: `${month}-${pad(dd)}T${start}:00+04:00`, to: `${month}-${pad(dd)}T${end}:00+04:00`, department: "" });
    });
    const attendance = shifts.filter(s => s.from.slice(0, 10) === todayISO() && s.from.slice(11, 16) === "09:00")
      .map(s => ({ employeeId: s.employeeId, name: s.name, from: s.from.replace("09:00", "08:55"), to: "" }));
    return { month, today: todayISO(), shifts, attendance };
  }
  return {};
}

// ====================== boot ======================
function boot() {
  $("#langBtn").addEventListener("click", () => { S.lang = S.lang === "ka" ? "en" : "ka"; store.set("dash_lang", S.lang); route(); });
  $("#logoutBtn").addEventListener("click", logout);
  $("#loginForm").addEventListener("submit", async e => {
    e.preventDefault();
    const err = $("#loginErr"); err.hidden = true;
    if (DEMO) { showApp(); return; }
    const { res, body } = await request("/api/login", { method: "POST", body: { password: $("#loginPass").value } });
    if (res.ok) { $("#loginPass").value = ""; showApp(); return; }
    const code = body.error;
    err.textContent = code === "wrong" ? t("wrong_password") : code === "too_many" ? t("too_many") : code === "not_set" ? t("not_set") : (code || "HTTP " + res.status);
    err.hidden = false;
  });
  window.addEventListener("hashchange", route);
  if (DEMO) { showApp(); return; }
  request("/api/session").then(({ body }) => (body.authed ? showApp() : showLogin())).catch(() => showLogin());
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
