// debtsrc.js — two more sources for the Debts tab:
//
// 1. Waybills approved in Telegram. The bot's log (store.js) keeps only the last 600 records, so the
//    approved ones are copied to their own list here, which keeps them for good.
//    KV  dash:tg:approved  { since: first day the bot saw a waybill, items: { token: [number, sellerTin, seller, total, day] } }
//    A record that is no longer "approved" in the log is dropped from the list.
//
// 2. Product categories for the "rs მოსული" view: food & drink / consumables (jars, paper, napkins…) /
//    equipment (fridge, microwave…) / other. Sorted automatically by the product's name (and by
//    PriceCheck's product list for food); the CEO can move any product, which is remembered:
//    KV  dash:debts:cats  { productKey: "food" | "supplies" | "equipment" | "other" }

import { loadLog } from "./store.js";
import { bumpVersion } from "./bank.js";
import { normalizeWaybillNumber } from "./rsge.js";

const TG_KEY = "dash:tg:approved";
const CATS_KEY = "dash:debts:cats";
const num = v => Number(String(v ?? "").replace(",", ".")) || 0;

// ── Telegram ─────────────────────────────────────────────────────────────────

// Copies new approvals from the bot's log; returns { since, list: [{ number, tin, seller, total, day }] }
export async function syncTelegramApproved(env) {
  const saved = (await env.STORE.get(TG_KEY, "json")) || {};
  const next = { since: saved.since || "", items: { ...(saved.items || {}) } };
  for (const r of await loadLog(env)) {
    if (r.kind !== "waybill" || !r.token) continue;
    const seen = String(r.createdAt || "").slice(0, 10);
    if (seen && (!next.since || seen < next.since)) next.since = seen;
    if (r.status === "approved") {
      next.items[r.token] = [normalizeWaybillNumber(r.number) || String(r.number || ""), r.sellerTin || "", r.seller || "",
        Math.round(num(r.total) * 100) / 100, String(r.date || r.createdAt || "").slice(0, 10)];
    } else delete next.items[r.token];
  }
  if (JSON.stringify(next) !== JSON.stringify({ since: saved.since || "", items: saved.items || {} })) {
    await env.STORE.put(TG_KEY, JSON.stringify(next));
    await bumpVersion(env);
  }
  return { since: next.since, list: Object.values(next.items).map(([number, tin, seller, total, day]) => ({ number, tin, seller, total, day })) };
}

// ── categories ───────────────────────────────────────────────────────────────

export const CATEGORIES = ["food", "supplies", "equipment", "other"];
export const productKey = name => String(name || "").toLowerCase().replace(/\s+/g, " ").trim().slice(0, 200);

// a word that starts with one of these stems (not glued to letters on its left)
const stems = list => new RegExp(`(^|[^\\p{L}])(${list.join("|")})`, "iu");
// exactly these words
const words = list => new RegExp(`(^|[^\\p{L}])(${list.join("|")})($|[^\\p{L}])`, "iu");
const SUPPLIES = [
  stems(["ხელსახოც", "სალფეთქ", "ხელსაწმენდ", "ქაღალდ", "ტუალეტის", "რულონ", "ფოლგ", "სტრეჩ", "ფირ", "პაკეტ", "პარკ", "ცელოფან",
    "ჩანთ", "ხელთათმან", "ერთჯერად", "ჭიქ", "სახურავ", "საწოვარ", "ჩხირ", "კოვზ", "ჩანგალ", "თეფშ", "კონტეინერ", "ლანჩბოქს",
    "ყუთ", "კოლოფ", "ეტიკეტ", "სტიკერ", "ლენტ", "სკოჩ", "საპონ", "შამპუნ", "დეზინფ", "სადეზინფ", "ქლორ", "სარეცხი საშუალ",
    "საწმენდ", "გამწმენდ", "ღრუბელ", "ტილო", "ნაგვის", "ცოცხ", "ჩვარ", "napkin", "tissue", "paper", "foil", "film", "bag", "glove",
    "cup", "lid", "straw", "spoon", "fork", "container", "box", "label", "tape", "soap", "detergent", "sponge"]),
  words(["ქილა", "ქილები", "jar", "jars"]),
];
const EQUIPMENT = [
  stems(["მაცივ", "საყინულ", "მიკროტალღ", "ღუმელ", "ქურა", "მიქსერ", "ბლენდერ", "აპარატ", "მანქანა", "კომბაინ", "ფრიტიურ",
    "გრილ", "ტოსტერ", "ჩაიდან", "სასწორ", "კონდიციონერ", "გამათბობ", "ვენტილატორ", "ტელევიზორ", "მონიტორ", "კომპიუტერ", "ლეპტოპ",
    "ნოუთბუქ", "პრინტერ", "სკანერ", "როუტერ", "კამერ", "სკამ", "მაგიდ", "თარო", "კარადა", "ვიტრინ", "ნათურ", "სანათ", "ტაფა",
    "ქვაბ", "fridge", "refrigerator", "freezer", "microwave", "oven", "mixer", "blender", "machine", "toaster", "kettle", "scale",
    "monitor", "printer", "laptop", "chair"]),
];
const FOOD = [
  stems(["ფქვილ", "საფუარ", "მარილ", "შაქარ", "ზეთ", "ზეითუნ", "ყველ", "მოცარელ", "პარმეზან", "რიკოტ", "მასკარპონ", "რძე", "რძის",
    "ნაღებ", "კარაქ", "მაწონ", "იოგურტ", "არაჟან", "კვერცხ", "ხორც", "ქათმ", "ქათამ", "ღორ", "საქონლ", "ძეხვ", "სოსის", "ლორ",
    "ბეკონ", "სალამ", "პროშუტ", "თევზ", "ორაგულ", "კრევეტ", "ტუნა", "პომიდორ", "ტომატ", "კიტრ", "ხახვ", "ნიორ", "კარტოფ",
    "სტაფილ", "წიწაკ", "ბადრიჯან", "სოკო", "შამპინიონ", "ბროკოლ", "კომბოსტ", "სალათ", "რუკოლ", "შპინატ", "ბაზილიკ", "ოხრახუშ",
    "ქინძ", "კამა", "პიტნა", "ლიმონ", "ფორთოხალ", "ვაშლ", "ბანან", "მარწყვ", "ხილ", "ბოსტნეულ", "მწვანილ", "ბრინჯ", "მაკარონ",
    "პასტა", "სპაგეტ", "ლობიო", "ცერცვ", "სიმინდ", "თხილ", "ნიგოზ", "ნუშ", "შოკოლად", "კაკაო", "ვანილ", "თაფლ", "ჯემ", "მურაბ",
    "სოუს", "კეტჩუპ", "მაიონეზ", "მდოგვ", "ძმარ", "სანელებ", "ორეგანო", "პილპილ", "დარიჩინ", "პურ", "ცომ", "წყალ", "წვენ",
    "ლიმონათ", "კოლა", "კოკა", "ფანტა", "სპრაიტ", "პეპსი", "ენერგეტიკ", "ლუდ", "ღვინ", "არაყ", "ვისკ", "ჭაჭ", "კონიაკ", "ლიქიორ",
    "ტონიკ", "სიროფ", "ყავ", "ესპრესო", "ჩაი", "ნაყინ", "ტორტ", "ნამცხვარ", "ფუნთუშ", "საკვებ", "სასმელ", "მინერალ", "ბორჯომ",
    "flour", "yeast", "salt", "sugar", "oil", "cheese", "mozzarella", "milk", "cream", "butter", "egg", "meat", "chicken", "ham",
    "bacon", "salami", "tomato", "onion", "garlic", "potato", "pepper", "mushroom", "basil", "lemon", "rice", "pasta", "sauce",
    "coffee", "tea", "juice", "water", "beer", "wine", "cola", "syrup", "chocolate"]),
];
const any = (rules, s) => rules.some(r => r.test(s));

// "food" | "supplies" | "equipment" | "other" by the name (pcCategory: the PriceCheck product's category, if it is one)
export function autoCategory(name, pcCategory) {
  if (any(SUPPLIES, name)) return "supplies";
  if (any(EQUIPMENT, name)) return "equipment";
  if (pcCategory !== undefined) return any(SUPPLIES, pcCategory) ? "supplies" : any(EQUIPMENT, pcCategory) ? "equipment" : "food";
  if (any(FOOD, name)) return "food";
  return "other";
}

export async function loadCategories(env) {
  return (await env.STORE.get(CATS_KEY, "json")) || {};
}

// name → { key, cat, manual }: the CEO's choice first, then the automatic one
export function categorizer(manual, basePrices) {
  const known = new Map();
  for (const p of basePrices || []) for (const n of [p.nameRs, p.name]) if (n) known.set(productKey(n), p.category || "");
  return name => {
    const key = productKey(name);
    if (CATEGORIES.includes(manual[key])) return { key, cat: manual[key], manual: true };
    return { key, cat: autoCategory(name, known.get(key)), manual: false };
  };
}

// body: { key, cat } — cat null / "" puts the product back to automatic
export async function saveCategory(env, body) {
  const key = productKey(body.key);
  if (!key) return { error: "key required" };
  const cat = body.cat || "";
  if (cat && !CATEGORIES.includes(cat)) return { error: "bad category" };
  const cats = await loadCategories(env);
  if (cat) cats[key] = cat; else delete cats[key];
  await env.STORE.put(CATS_KEY, JSON.stringify(cats));
  await bumpVersion(env);
  return { ok: true };
}
