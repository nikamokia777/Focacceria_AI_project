// stockrs.js — the Storage tab's „საწყობი RS“ and „სხვაობა“ columns (PriceCheck → საწყობი).
//
// For a Syrve storage item linked to PriceCheck products (one item can have several products,
// e.g. two suppliers), this month only, starting from zero on the 1st:
//   RS          = rs.ge waybills received − our return waybills − what Syrve took out
//   Syrve Δ     = Syrve now − Syrve at the start of the 1st
//   სხვაობა     = RS − Syrve Δ  (= rs.ge in − returns  minus  Syrve incoming invoices − Syrve returns)
//   "Syrve took out" (usage) = Syrve at the start + Syrve invoices − Syrve returns − Syrve now,
//   i.e. every Syrve change except incoming invoices and returns: sales, write-offs, production,
//   inventory.
// So სხვაობა is 0 when every waybill is in Syrve with the same amount.
//
// A waybill line belongs to a product when its rs.ge code is one of the product's codes AND the
// seller is the product's supplier; a product without a code matches the rs.ge name exactly.
// Waybills that count: like Debts — active and closed, confirmed on rs.ge or not; rejected,
// cancelled and saved ones don't.
//
// Units: rs.ge კგ / გრ / ტ / ლ lines are converted directly. A line in pieces uses the product's
// typed „ზომა (ნეტო)“, else a factor learned from Syrve (the same waybill number in Syrve, e.g.
// 1 ცალი on rs.ge = 50 კგ in Syrve), else pieces → pieces 1 : 1. Otherwise the line shows ⚠ and
// isn't counted.
//
// Only the current month is shown; a day in an earlier month leaves the columns empty.
//
// KV keys:
//   dash:cache:stockrs:<YYYY-MM>  the month's rs.ge lines and Syrve documents (10 minutes)
//   stock:rsfactor                { <productId>: { f, fam, wb } } learned piece → Syrve unit factors
//   stock:cfg items[id].prods     the item's linked products (set on the page); without it DEFAULT_PRODS

import { withSyrve, xmlRecords, ddmmyyyy } from "./dashboard.js";
import { listBuyerGoods, listOutgoingWaybillsStrict, getWaybill, normalizeWaybillNumber } from "./rsge.js";
import { nameKey, sameKey, similarKey } from "./names.js";

const CACHE = "dash:cache:stockrs:";
const TTL = 600; // seconds
const FACTOR_KEY = "stock:rsfactor";
const MAX_RETURNS = 15; // return waybills read per month (one rs.ge call each)

// The matches agreed with the owner on 14 Nov 2026: Syrve product id → PriceCheck product ids.
export const DEFAULT_PRODS = {
  "dc9335ab-abe7-4f2c-b207-6b17774ef49d": [1],       // ფისტა *
  "49202d03-a524-4a50-9167-607cd163f582": [2],       // ნუში *
  "d8f3c3e5-7b83-4899-bcbf-1e95ca7e4f1d": [15],      // თხილი *
  "359c618e-afc2-bd64-019d-49b1adc6e034": [3],       // ზეითუნის ზეთი ექსტრა*
  "558ff6da-8f49-4327-86b0-d83b110ae3f5": [35],      // ზეითუნის ზეთი*
  "a87e6643-aaa8-434f-90a6-d18f1c1101d7": [4],       // ბალზამიკო*
  "8f944f29-436f-469e-a8bc-0f3cc6fc50a2": [6],       // არტიშოკი *
  "2aa6fe6b-20e7-42df-9a8f-f7eef5256d46": [5, 34],   // მზეზე გამომშრალი პომიდორი *
  "359c618e-afc2-bd64-019c-d4f8eba1f36d": [7],       // პროშუტო გრან სასო (კრუდო) *
  "359c618e-afc2-bd64-019c-d4f8eba1f357": [8],       // პროშუტო კოტო *
  "da003390-4251-42d2-bbf7-abef8d4f5067": [9],       // მორტადელა *
  "359c618e-afc2-bd64-019d-140dee30979f": [10, 31],  // სალიამი სალსიჩა *(PICCANTE)
  "359c618e-afc2-bd64-019c-d4f8eba1f57a": [11, 32],  // სალიამი მილანო *(SALAME MILANO/NAPOLI)
  "9694941b-b705-43da-9691-8312d41bd210": [14],      // მასკარპონე *
  "b3bf866f-e9ad-4202-8192-1cd5b8ae583a": [16],      // ლურჯი ობიანი *
  "3b9c813f-3b7b-4799-b803-317109ace17c": [37, 13],  // პარმეზანი *
  "33c087ab-4526-4f92-94ec-ad58045c15a2": [24],      // სტრაჩატელა *
  "b54f763c-a17f-442f-9751-f479b1d9f5c0": [25],      // მოცარელას ბურთები *
  "ad880bf4-0cbb-44bf-9f65-87021464b723": [21],      // ნაღები 35% *
  "61aebfd2-9d75-4bda-b955-2883c3e203f0": [22, 42],  // კარაქი *
  "359c618e-afc2-bd64-019c-d4f8eba1f595": [20],      // რძე ჩვ *
  "359c618e-afc2-bd64-019c-d4f8eba1f37e": [46],      // რძე ყავის *
  "117b89c9-d748-412f-8dad-753d67dc0aa4": [45],      // ყავა მარცვალი*
  "359c618e-afc2-bd64-019c-d4f8eba1f96d": [18],      // რომი კაპიტან მორგანი ლ *
  "a51f5c42-1a90-4054-86e6-6e465d38450b": [26],      // შავი ზეთისხილი *
  "601fc121-e219-4f53-a3c5-885af74371e9": [23, 38],  // ნუტელა*
  "d4cb95a9-f303-4846-a0d2-f4698a967bf7": [27],      // კენკრა კგ *
  "3df10752-3b18-4611-950e-a7a3586b507a": [28],      // სემოლა*
  "c232d3f1-4cb7-451b-a1e9-d5550498f023": [30],      // ფქვილი კაპუტო*
  "1d18db6e-5903-4780-987a-0137cc4fe8c4": [39],      // ფქვილი მადლი*
  "1cfe2ed9-c981-48b5-a1ce-2b6841f2a58f": [33],      // პომიდორი *
  "99e49d16-6ac9-4eed-9a6f-a1485edcb878": [43],      // სავოიარდი* (ტირამისუს ჩხირები)
  "d05d0b3b-5ce1-4c62-98d2-522e7c2e99c3": [47],      // მარილი*
  "b5038b6a-9ac6-47a6-890f-3f4f433891c5": [41],      // მინის ქილა
  "d6f82fb3-914a-4c0a-a267-0b8b311db605": [12],      // ტრუფელი*
  "32298550-1cad-4dcb-840e-e8f917a8dbc1": [49],      // "22" საცხობი ქაღალდი ფურცლებად 40x60
};

const num = (v) => Number(String(v ?? "").replace(",", ".")) || 0;
const round3 = (n) => Math.round(n * 1000) / 1000;
const r6 = (n) => Math.round(n * 1e6) / 1e6;
const addDays = (day, n) => new Date(Date.parse(day + "T00:00:00Z") + n * 86400000).toISOString().slice(0, 10);

// ── units ────────────────────────────────────────────────────────────────────

// Syrve unit name → family
export function famOf(unit) {
  const u = String(unit || "").trim().toLowerCase().replace(/\.$/, "");
  if (["кг", "kg", "კგ"].includes(u)) return "kg";
  if (["л", "l", "ლ", "lt"].includes(u)) return "l";
  if (["шт", "pcs", "pc", "ც", "ცალი"].includes(u)) return "pc";
  return "";
}
// rs.ge UNIT_ID → [family, factor to that family's base unit, label]
const RS_UNITS = { "1": ["pc", 1, "ცალი"], "2": ["kg", 1, "კგ"], "3": ["kg", 0.001, "გრ"], "4": ["l", 1, "ლ"], "5": ["kg", 1000, "ტ"] };
export const rsUnitLabel = (id) => (RS_UNITS[id] || [])[2] || "";
const NET_FAM = { "კგ": "kg", "ლ": "l", "ც": "pc" };

// One line's quantity in the Syrve item's unit: { amt, how } — how: unit | size | learned | pc;
// amt null when it can't be converted.
export function convert(line, product, fam, factors) {
  const u = RS_UNITS[line.unitId];
  if (u && u[0] !== "pc" && u[0] === fam) return { amt: line.qty * u[1], how: "unit" };
  if (u && u[0] !== "pc") return { amt: null, how: null }; // kg on rs.ge, pieces in Syrve: can't tell
  if (product && num(product.netSize) > 0 && NET_FAM[product.netUnit] === fam) return { amt: line.qty * num(product.netSize), how: "size" };
  const f = product && factors[product.id];
  if (f && f.fam === fam && f.f > 0) return { amt: line.qty * f.f, how: "learned" };
  if (u && fam === "pc") return { amt: line.qty, how: "pc" };
  return { amt: null, how: null };
}

// ── matching a waybill line to a product ─────────────────────────────────────

const normCode = (c) => String(c || "").toLowerCase().replace(/\s+/g, "");
// "180 და 204" → ["180და204", "180", "204"]; "CARDOLC cr001" stays one code (+ its parts)
export function codesOf(code) {
  const s = String(code || "").trim();
  if (!s) return [];
  const out = new Set([normCode(s)]);
  for (const part of s.split(/\s+და\s+|[,;/]|\s+/)) if (normCode(part).length >= 2) out.add(normCode(part));
  return [...out];
}
const normText = (s) => String(s || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const noSpace = (s) => normText(s).replace(/ /g, "");
const tinsIn = (s) => String(s || "").match(/\d{9,11}/g) || [];
const nameOnly = (s) => String(s || "").replace(/\(.*?\)/g, " ").replace(/\d{9,11}/g, " ");

// Is the waybill's seller this product's supplier? (an empty supplier accepts any seller)
export function sameSeller(supplier, sellerTin, sellerName) {
  if (!String(supplier || "").trim()) return true;
  if (sellerTin && tinsIn(supplier).includes(String(sellerTin))) return true;
  const a = nameKey(nameOnly(supplier)), b = nameKey(sellerName);
  if (!a.n || !b.n) return false;
  if (sameKey(a, b) || similarKey(a, b)) return true;
  if (noSpace(a.n) && noSpace(a.n) === noSpace(b.n)) return true; // "ბლექსი" / "ბლექ სი"
  // the same word with a different ending: "ლაქტალისი" / "ლაქტალის"
  for (const x of a.wn) for (const y of b.wn) {
    const [s, l] = x.length <= y.length ? [x, y] : [y, x];
    if (s.length >= 5 && l.startsWith(s)) return true;
  }
  return false;
}

// Which product (of the linked ones) a line belongs to: a code match beats a name match.
function matcher(linked) {
  const byCode = new Map(); // code → [{ p, item }]
  const byName = new Map(); // normalized name → [{ p, item }] (products without a code)
  for (const { p, item } of linked) {
    const codes = codesOf(p.code);
    if (codes.length) for (const c of codes) { if (!byCode.has(c)) byCode.set(c, []); byCode.get(c).push({ p, item }); }
    else for (const n of [p.name, p.nameRs]) {
      const k = normText(n);
      if (k.length < 3) continue;
      if (!byName.has(k)) byName.set(k, []);
      byName.get(k).push({ p, item });
    }
  }
  return (line, tin, seller) => {
    const pick = (list) => (list || []).find(({ p }) => sameSeller(p.supplier, tin, seller));
    return pick(byCode.get(normCode(line.code))) || pick(byName.get(normText(line.name))) || null;
  };
}

// ── the month's data (rs.ge + Syrve), cached ──────────────────────────────────

const countsRs = (status, confirmed) => {
  const s = String(status ?? "").trim();
  return s !== "0" && s !== "" && !s.startsWith("-") && String(confirmed ?? "").trim() !== "-1";
};

async function fetchMonth(env, ym, toDay) {
  const from = ym + "-01";
  const out = { ym, from, to: toDay, lines: [], rets: [], inv: [], sret: [], start: {}, errors: {} };

  if (!env.RSGE_SERVICE_USER || !env.RSGE_SERVICE_PASSWORD) out.errors.rs = "rs.ge is not configured";
  else {
    try {
      for (const g of await listBuyerGoods(env, from, toDay)) {
        if (!countsRs(g.status, g.isConfirmed)) continue;
        // [number, day, sellerTin, sellerName, name, code, unitId, qty, amount]
        out.lines.push([normalizeWaybillNumber(g.number) || g.number, String(g.createDate).slice(0, 10), g.sellerTin, g.sellerName,
          g.name, g.code, g.unitId, g.quantity, g.amount]);
      }
    } catch (e) { out.errors.rs = String(e.message || e).slice(0, 200); }
    // our return waybills (type 5) are listed 3 days at a time, then read one by one for their goods
    try {
      let read = 0;
      for (let d = from; d <= toDay; d = addDays(d, 3)) {
        const e = addDays(d, 2) < toDay ? addDays(d, 2) : toDay;
        for (const w of await listOutgoingWaybillsStrict(env, d, e, "5")) {
          if (!countsRs(w.status, "") || !w.id) continue;
          if (++read > MAX_RETURNS) { out.errors.ret = "too many return waybills"; break; }
          const full = await getWaybill(env, w.id);
          for (const g of full?.goods || []) {
            out.rets.push([normalizeWaybillNumber(w.number) || w.number, String(w.createDate || full.createDate).slice(0, 10),
              w.buyerTin || full.buyerTin, w.buyerName || full.buyerName, g.name, g.code, g.unitId, g.quantity, g.amount]);
          }
        }
      }
    } catch (e) { out.errors.ret = String(e.message || e).slice(0, 200); }
  }

  try {
    await withSyrve(env, async (get) => {
      // the stock at the start of the 1st (asked as 00:00 of that day, see stock.js)
      for (const b of JSON.parse(await get("/v2/reports/balance/stores", { timestamp: from + "T00:00:00" }))) {
        const p = String(b.product || "").toLowerCase();
        if (!p) continue;
        const s = String(b.store || "").toLowerCase();
        out.start[p] = out.start[p] || {};
        out.start[p][s] = round3((out.start[p][s] || 0) + num(b.amount));
      }
      // processed incoming invoices; Syrve's "to" may not include its day, so one day more
      const xml = await get("/documents/export/incomingInvoice", { from, to: addDays(toDay, 1) });
      for (const m of xml.matchAll(/<document>([\s\S]*?)<\/document>/g)) {
        const head = xmlRecords("<h>" + m[1].replace(/<items>[\s\S]*<\/items>/, "") + "</h>", "h")[0] || {};
        if (head.status && head.status !== "PROCESSED") continue;
        const day = String(head.dateIncoming || head.incomingDate || "").slice(0, 10);
        if (!day || day < from || day > toDay) continue;
        const number = normalizeWaybillNumber(head.documentNumber) || String(head.documentNumber || "").trim();
        for (const it of xmlRecords(m[1], "item")) {
          // [number, day, productId, amount (Syrve unit), storeId]
          out.inv.push([number, day, String(it.product || "").toLowerCase(), num(it.amount), String(it.store || "").toLowerCase()]);
        }
      }
      // our returns to suppliers in Syrve
      try {
        const rx = await get("/reports/storeOperations", {
          dateFrom: ddmmyyyy(from), dateTo: ddmmyyyy(toDay), documentTypes: "RETURNED_INVOICE",
          productDetalization: "true", showCostCorrections: "false",
        });
        for (const r of xmlRecords(rx, "storeReportItemDto")) {
          const p = String(r.product || "").toLowerCase();
          if (!p || r.incoming === "true") continue;
          if (r.documentType && r.documentType !== "RETURNED_INVOICE") continue; // only returns, whatever Syrve sends
          const d = String(r.date || r.dateTime || "");
          const ru = d.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
          // [day, productId, amount, storeId]
          out.sret.push([ru ? `${ru[3]}-${ru[2]}-${ru[1]}` : d.slice(0, 10), p, Math.abs(num(r.amount)), String(r.primaryStore || r.store || "").toLowerCase()]);
        }
      } catch (e) { out.errors.sret = String(e.message || e).slice(0, 200); }
    });
  } catch (e) { out.errors.syrve = String(e.message || e).slice(0, 200); }
  return out;
}

export async function loadMonth(env, ym, toDay, fresh = false) {
  const key = CACHE + ym;
  if (!fresh) {
    const hit = await env.STORE.get(key, "json");
    if (hit && hit.to === toDay && Date.now() - hit._at < TTL * 1000) return hit;
  }
  const value = await fetchMonth(env, ym, toDay);
  value._at = Date.now();
  await env.STORE.put(key, JSON.stringify(value), { expirationTtl: 3600 });
  return value;
}

// ── per item ─────────────────────────────────────────────────────────────────

// The linked products of a storage item: set on the page (cfg.prods), else the agreed default.
export const prodsOf = (id, c) => (Array.isArray(c?.prods) ? c.prods : DEFAULT_PRODS[id] || []);

// items: [{ id, unit, syrve }] (syrve = Syrve's amount at the end of `day`, store filtered)
// returns { byId: { id: rs }, info } and saves newly learned factors
export async function buildRs(env, { items, cfg, products, day, today, store, fresh = false }) {
  const ym = today.slice(0, 7);
  if (day.slice(0, 7) !== ym) return { byId: {}, info: { off: true } };
  const linked = [];
  const pById = new Map(products.map((p) => [p.id, p]));
  const itemById = new Map(items.map((it) => [it.id, it]));
  for (const it of items) {
    for (const pid of prodsOf(it.id, cfg.items[it.id])) {
      const p = pById.get(Number(pid));
      if (p) linked.push({ p, item: it });
    }
  }
  if (!linked.length) return { byId: {}, info: { month: ym } };

  const month = await loadMonth(env, ym, today, fresh);
  const factors = (await env.STORE.get(FACTOR_KEY, "json")) || {};
  const find = matcher(linked);
  const inStore = (s) => !store || !s || s === store;

  // Syrve invoice amounts per waybill number and item; returns per item (up to `day`)
  const syrveDoc = new Map(); // number → Map(itemId → amount)
  const syrveIn = {}, syrveRet = {};
  for (const [n, d, p, a, s] of month.inv) {
    if (d > day || !inStore(s)) continue;
    if (!syrveDoc.has(n)) syrveDoc.set(n, new Map());
    const m = syrveDoc.get(n);
    m.set(p, (m.get(p) || 0) + a);
    syrveIn[p] = (syrveIn[p] || 0) + a;
  }
  for (const [d, p, a, s] of month.sret) if (d <= day && inStore(s)) syrveRet[p] = (syrveRet[p] || 0) + a;

  // assign the lines
  const per = new Map(); // itemId → { wbs: Map(number → wb) }
  const assign = (row, ret) => {
    const [n, d, tin, seller, name, code, unitId, qty, amount] = row;
    if (d > day) return;
    const hit = find({ code, name }, tin, seller);
    if (!hit) return;
    const it = hit.item;
    if (!per.has(it.id)) per.set(it.id, new Map());
    const wbs = per.get(it.id);
    const k = (ret ? "r:" : "") + n;
    if (!wbs.has(k)) wbs.set(k, { n, day: d, seller, ret, lines: [] });
    wbs.get(k).lines.push({ pid: hit.p.id, name, code, unitId, qty, sum: amount });
  };
  for (const row of month.lines) assign(row, false);
  for (const row of month.rets) assign(row, true);

  // learn piece → Syrve unit factors from waybills that are in Syrve
  let learned = false;
  for (const [itemId, wbs] of per) {
    const fam = famOf(itemById.get(itemId).unit);
    if (!fam) continue;
    for (const wb of wbs.values()) {
      if (wb.ret || !syrveDoc.has(wb.n)) continue;
      const pieces = wb.lines.filter((l) => !RS_UNITS[l.unitId] || RS_UNITS[l.unitId][0] === "pc");
      if (!pieces.length || pieces.length !== wb.lines.length) continue;
      const pids = new Set(pieces.map((l) => l.pid));
      if (pids.size !== 1) continue;
      const qty = pieces.reduce((a, l) => a + l.qty, 0);
      const amt = syrveDoc.get(wb.n).get(itemId) || 0;
      if (qty <= 0 || amt <= 0) continue;
      const pid = [...pids][0];
      const f = r6(amt / qty);
      const old = factors[pid];
      if (!old || old.f !== f || old.fam !== fam) { factors[pid] = { f, fam, wb: wb.n }; learned = true; }
    }
  }
  if (learned) await env.STORE.put(FACTOR_KEY, JSON.stringify(factors));

  const byId = {};
  for (const it of items) {
    if (!prodsOf(it.id, cfg.items[it.id]).length) continue;
    const fam = famOf(it.unit);
    const wbs = [...(per.get(it.id) || new Map()).values()].sort((a, b) => a.day.localeCompare(b.day) || a.n.localeCompare(b.n));
    let rsIn = 0, rsRet = 0, warn = 0;
    for (const wb of wbs) {
      for (const l of wb.lines) {
        const c = convert(l, pById.get(l.pid), fam, factors);
        l.amt = c.amt === null ? null : round3(c.amt);
        l.how = c.how;
        l.unit = rsUnitLabel(l.unitId) || l.unitId;
        if (c.amt === null) { warn++; continue; }
        if (wb.ret) rsRet += c.amt; else rsIn += c.amt;
      }
      if (!wb.ret) {
        const doc = syrveDoc.get(wb.n);
        wb.inSyrve = !!doc;
        wb.syrve = doc ? round3(doc.get(it.id) || 0) : null;
      }
    }
    const startBal = month.start[it.id] || {};
    const start = store ? num(startBal[store]) : Object.values(startBal).reduce((a, b) => a + b, 0);
    const sIn = syrveIn[it.id] || 0, sRet = syrveRet[it.id] || 0;
    const usage = start + sIn - sRet - it.syrve;
    const amount = rsIn - rsRet - usage;
    const delta = it.syrve - start;
    byId[it.id] = {
      amount: round3(amount), diff: round3(amount - delta),
      rsIn: round3(rsIn), rsRet: round3(rsRet), start: round3(start), syrveIn: round3(sIn), syrveRet: round3(sRet),
      usage: round3(usage), delta: round3(delta), warn,
      prods: prodsOf(it.id, cfg.items[it.id]).map(Number),
      wbs: wbs.map((wb) => ({ ...wb, lines: wb.lines.map(({ unitId, ...l }) => l) })),
    };
  }
  return { byId, info: { month: ym, from: month.from, to: day, at: month._at, errors: month.errors } };
}
