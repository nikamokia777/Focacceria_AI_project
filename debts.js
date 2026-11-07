// debts.js — the Debts tab: rs.ge waybills compared with BOG / TBC transfers.
//
// Waybills: every active rs.ge waybill (confirmed on rs.ge or not) from the bank "history from" date
// (waybills.js), minus the return waybills we issued to the seller. Transfers: outgoing BOG / TBC
// payments (bank.js), without transfers between our own accounts, taxes / treasury, salaries (employees
// typed in the Employees tab, by personal ID or IBAN) and bank fees: entries with no code and no account,
// TBC's "გადარიცხვის საკომისიო", and BOG's fee for a transfer to another bank (booked as its own entry of
// up to 5 ₾, same recipient and day as the transfer).
//
// A transfer counts for a supplier (a waybill seller):
//   1. by identification code: the recipient's code is the seller's code;
//   2. by exact name, when the transfer has no code at all (banks don't send it for transfers to another
//      bank): the recipient's name is exactly one seller's name, apart from შპს / ი/მ and punctuation;
//   3. by a similar name: only after the CEO picks that version (subtab 3);
//   4. by another CEO decision (a code typed in subtab 2 or 3).
// Subtabs: 1 debt per supplier · 2 transfers without a waybill · 3 problems (recipients that match a
// supplier by name only; suppliers with no transfer at all) · 4 overpayments (paid more than the waybills)
// · 5 card payments („ბარათით“).
//
// Card purchases (BOG, recipientKey "c:<SHOP>", bank.js) have no code: they count only after the CEO picks
// the supplier (a decision on the shop = all its payments, future too, or on one payment). Suggestions are
// the suppliers' waybills with the same amount at any date (a waybill can come late), nearest date first,
// that no confirmed card payment uses yet. A confirmed card payment without such a waybill shows
// „ზედნადები ჯერ არ არის“ until one arrives.
//
// KV dash:debts2:decisions {
//   rcp:    { recipientKey: { to, at, comment? } }        all transfers to a recipient
//   tx:     { transferId: { to, at, rk, comment? } }      one transfer
//   sup:    { sellerCode: { debt?: "YYYY-MM-DD", no?: [recipientKey] } }
//           debt: "no transfer at all, the debt is right" · no: name versions the CEO turned down
//   manual: [{ id, tin, amount, date, comment }]          payments that aren't in the bank (cash …)
// }
// to: "s:<code>" a supplier · "w:<code>" its waybill is being created (counts once rs.ge has one) · "x" other expense

import { bankConfigured, loadBankSettings, loadBankState, loadBankData, loadPayments, loadRecipientPayments, bumpVersion } from "./bank.js";
import { waybillTotals } from "./waybills.js";
import { nameKey, sameKey, similarKey } from "./names.js";

const KEY = "dash:debts2:decisions";
// the old Debts tab's own data (decisions, product categories, Syrve invoices, Telegram archive, caches),
// deleted once when the new tab is first built
const OLD_KEYS = ["dash:bank:links", "dash:debts:cats", "dash:syrve:invoices", "dash:tg:approved",
  "dash:cache:debts-result3", "dash:cache:debts-result2", "dash:cache:debts-syrve"];
const CLEANED_KEY = "dash:debts2:cleaned";
const MAX_TX = 60; // transfers listed per recipient row

const r2 = x => Math.round(x * 100) / 100;
const today = env => new Date(Date.now() + Number(env.TZ_OFFSET ?? 4) * 3600000).toISOString().slice(0, 10);
const isTreasury = (name, iban, bankCode) =>
  String(bankCode || "").toUpperCase() === "TRESGE22" || /^GE\d{2}NB/i.test(iban || "") || /სახაზინო|treasury/i.test(name || "");
const CODE = /^[0-9A-Za-z]{2,20}$/;
const FEE_CENTS = 500; // BOG's fee entries for transfers to another bank are a few tetri to a few lari
const isFeePurpose = p => /^გადარიცხვის საკომისიო/.test(String(p || "").trim());
const cleanCode = v => String(v ?? "").replace(/\s+/g, "");
const isCard = rk => String(rk).startsWith("c:");
const dayGap = (a, b) => Math.abs(Date.parse(a + "T00:00:00Z") - Date.parse(b + "T00:00:00Z")) / 864e5 || 0;
const MAX_SUGGEST = 5;

export async function loadDecisions(env) {
  const d = (await env.STORE.get(KEY, "json")) || {};
  return { rcp: d.rcp || {}, tx: d.tx || {}, sup: d.sup || {}, manual: Array.isArray(d.manual) ? d.manual : [] };
}

export async function dropOldDebtsData(env) {
  if (await env.STORE.get(CLEANED_KEY)) return;
  for (const k of OLD_KEYS) await env.STORE.delete(k);
  await env.STORE.put(CLEANED_KEY, new Date().toISOString());
}

export async function buildDebts(env) {
  const configured = bankConfigured(env);
  const connected = configured.bog || configured.tbc;
  const [settings, state, dec, wb, staff] = await Promise.all([
    loadBankSettings(env), loadBankState(env), loadDecisions(env), waybillTotals(env), env.STORE.get("dash:data:staff", "json"),
  ]);
  const { recipients } = connected ? await loadBankData(env) : { recipients: {} };
  const payments = connected ? await loadPayments(env, settings.historyFrom) : [];

  // suppliers = sellers with active waybills; a decision or a manual payment can add a code without waybills
  const sup = {};
  const row = tin => sup[tin] = sup[tin] || { tin, name: "", n: 0, nConfirmed: 0, amount: 0, returns: 0, nReturns: 0,
    paid: 0, manual: 0, waybills: [], transfers: [], manualList: [] };
  for (const [tin, s] of Object.entries(wb.sellers)) {
    const n = s.nConfirmed + s.nUnconfirmed;
    if (!n) continue;
    Object.assign(row(tin), { name: s.name || tin, n, nConfirmed: s.nConfirmed, amount: r2(s.confirmed + s.unconfirmed) });
  }
  const sellers = new Set(Object.keys(sup));
  for (const w of wb.waybills) if (w[4] !== -1 && sellers.has(w[1])) sup[w[1]].waybills.push([w[0], w[3], w[2], w[4]]); // number, day, amount, confirmed
  for (const [tin, r] of Object.entries(wb.returns)) if (sellers.has(tin)) Object.assign(sup[tin], { returns: r.amount, nReturns: r.n });

  // transfers that are not supplier payments: our own accounts, taxes, fees, salaries
  const emps = ((staff || {}).employees || []).filter(e => e && e.id);
  const empPid = new Set(emps.map(e => String(e.pid || "").trim()).filter(Boolean));
  const empIban = new Set(emps.map(e => String(e.iban || "").replace(/\s+/g, "").toUpperCase()).filter(Boolean));
  const ownTins = new Set([String(env.COMPANY_TIN || "").trim(), ...Object.values(recipients).filter(r => r[4] && r[1]).map(r => r[1])].filter(Boolean));
  const ownIbans = new Set((settings.bogAccounts || []).map(x => x.toUpperCase()));
  const skipMemo = {};
  const skip = rk => {
    if (isCard(rk)) return false;
    if (rk in skipMemo) return skipMemo[rk];
    const [name = "", tin = "", iban = "", bankCode = "", own = 0] = recipients[rk] || [];
    const I = iban.toUpperCase();
    return skipMemo[rk] = !!(own || (tin && ownTins.has(tin)) || (I && ownIbans.has(I)) || isTreasury(name, I, bankCode) || (!tin && !I)
      || (tin && empPid.has(tin)) || (I && empIban.has(I)));
  };

  // a decision's target: a supplier, a waybill still being created, or an other expense
  const target = to => {
    if (to === "x") return { other: true };
    const m = /^([sw]):(.+)$/.exec(String(to || ""));
    if (!m) return null;
    return m[1] === "s" || sellers.has(m[2]) ? { tin: m[2] } : { wait: m[2] };
  };
  // name versions: sellers whose name looks like the recipient's (minus versions the CEO turned down)
  const sellerKeys = [...sellers].map(tin => ({ tin, key: nameKey(sup[tin].name) }));
  const versionMemo = {};
  const versionsOf = rk => versionMemo[rk] ??= (() => {
    const name = (recipients[rk] || [])[0];
    if (!name) return [];
    const k = nameKey(name);
    return sellerKeys.filter(s => similarKey(k, s.key) && !(dec.sup[s.tin]?.no || []).includes(rk))
      .sort((a, b) => sameKey(b.key, k) - sameKey(a.key, k)).map(s => s.tin);
  })();
  // exact name: the only seller whose name is the recipient's (apart from legal forms and punctuation)
  const exactMemo = {};
  const exactOf = rk => exactMemo[rk] ??= (() => {
    const name = (recipients[rk] || [])[0];
    if (!name) return "";
    const k = nameKey(name);
    const hits = sellerKeys.filter(s => sameKey(k, s.key) && !(dec.sup[s.tin]?.no || []).includes(rk));
    return hits.length === 1 ? hits[0].tin : "";
  })();

  // bank fees: TBC's "გადარიცხვის საკომისიო"; BOG's is a small entry next to a bigger transfer
  // to the same recipient on the same day
  const biggest = {};
  for (const [, date, cents, rk] of payments) { const k = rk + "|" + date; if (cents > (biggest[k] || 0)) biggest[k] = cents; }
  const isFee = (id, date, cents, rk, purpose) => !isCard(rk) && (isFeePurpose(purpose)
    || (String(id).startsWith("bog:") && cents <= FEE_CENTS && biggest[rk + "|" + date] > FEE_CENTS));

  const groups = { open: {}, wait: {}, other: {}, name: {} };
  const cardOpen = [], cardOther = {}, cardPaid = []; // card payments: undecided, other expenses, counted for a supplier
  let counted = 0, skipped = 0;
  for (const [id, date, cents, rk, purpose = "", card] of payments) {
    if (settings.historyFrom && date < settings.historyFrom) continue;
    if (skip(rk) || isFee(id, date, cents, rk, purpose)) { skipped++; continue; }
    counted++;
    const amount = cents / 100;
    const [name = "", tin = "", iban = ""] = recipients[rk] || [];
    const txd = dec.tx[id], rd = dec.rcp[rk], d = txd || rd;
    const scope = txd ? "tx" : rd ? "rcp" : "";
    let t = d ? target(d.to) : null, how = t ? "dec" : "";
    if (isCard(rk)) {
      const [last4 = "", buy = "", shopKa = "", mcc = ""] = card || [];
      const c = { id, rk, date, buy: buy || date, amount: r2(amount), shop: name || rk.slice(2), shopKa, last4, mcc, purpose };
      if (t?.tin) {
        const x = row(t.tin);
        if (!x.name) x.name = t.tin;
        x.paid = r2(x.paid + amount);
        const tr = [id, date, r2(amount), c.shop + (last4 ? " ••" + last4 : ""), purpose, "card", scope, rk, last4, ""];
        x.transfers.push(tr);
        cardPaid.push({ tin: t.tin, cents, buy: c.buy, tr, c });
      } else if (t?.other) {
        const gk = rk + "|" + scope;
        const g = cardOther[gk] = cardOther[gk] || { rk, name: c.shop, shopKa, last4, scope, comment: d.comment || "", count: 0, amount: 0, last: "", tx: [] };
        g.count++; g.amount = r2(g.amount + amount);
        if (c.buy >= g.last) g.last = c.buy;
        g.tx.push([id, c.buy, r2(amount), purpose]);
      } else cardOpen.push({ ...c, cents });
      continue;
    }
    if (!t && tin && sellers.has(tin)) { t = { tin }; how = "code"; }
    if (!t && !tin && exactOf(rk)) { t = { tin: exactOf(rk) }; how = "name"; }
    if (t?.tin) {
      const x = row(t.tin);
      if (!x.name) x.name = name || t.tin;
      x.paid = r2(x.paid + amount);
      x.transfers.push([id, date, r2(amount), name || tin || iban, purpose, how, scope, rk]);
      continue;
    }
    let into, gk = rk, extra = {};
    if (t?.wait) { into = groups.wait; gk += "|" + scope + "|" + t.wait; extra = { scope, code: t.wait }; }
    else if (t?.other) { into = groups.other; gk += "|" + scope; extra = { scope, comment: d.comment || "" }; }
    else if (versionsOf(rk).length) { into = groups.name; extra = { versions: versionsOf(rk) }; }
    else into = groups.open;
    const g = into[gk] = into[gk] || { rk, name, tin, iban, bank: "", count: 0, amount: 0, last: "", purpose: "", tx: [], ...extra };
    g.count++;
    g.amount = r2(g.amount + amount);
    if (date >= g.last) { g.last = date; g.purpose = purpose; }
    const b = String(id).startsWith("tbc:") ? "TBC" : "BOG";
    if (!g.bank.includes(b)) g.bank = g.bank ? g.bank + " + " + b : b;
    g.tx.push([id, date, r2(amount), purpose]);
  }

  for (const m of dec.manual) {
    if (!m || !m.tin) continue;
    const x = row(m.tin);
    if (!x.name) x.name = m.tin;
    x.manual = r2(x.manual + (Number(m.amount) || 0));
    x.manualList.push({ id: m.id, amount: r2(Number(m.amount) || 0), date: m.date || "", comment: m.comment || "" });
  }

  // card payments ↔ waybills of the same amount (any date, nearest first; each waybill used once)
  const wbByCents = {};
  for (const tin of sellers) for (const [num, day, amount] of sup[tin].waybills) {
    const k = Math.round(amount * 100);
    (wbByCents[k] = wbByCents[k] || []).push({ tin, num, day, amount });
  }
  const used = new Set();
  const nearest = (list, day) => list.filter(w => !used.has(w.tin + "|" + w.num)).sort((a, b) => dayGap(a.day, day) - dayGap(b.day, day) || b.day.localeCompare(a.day));
  for (const p of cardPaid.sort((a, b) => a.buy.localeCompare(b.buy))) {
    const w = nearest((wbByCents[p.cents] || []).filter(w => w.tin === p.tin), p.buy)[0];
    if (w) { used.add(w.tin + "|" + w.num); p.tr[9] = w.num; }
    else sup[p.tin].cardWait = (sup[p.tin].cardWait || 0) + 1;
  }
  const sellerKeyOf = Object.fromEntries(sellerKeys.map(s => [s.tin, s.key]));
  const shopCount = {};
  for (const c of cardOpen) shopCount[c.rk] = (shopCount[c.rk] || 0) + 1;
  const cardsFor = {}; // supplier code → undecided card payments that suggest it
  const openCards = cardOpen.sort((a, b) => b.buy.localeCompare(a.buy) || b.amount - a.amount).map(({ cents, ...c }) => {
    const suggest = nearest(wbByCents[cents] || [], c.buy).slice(0, MAX_SUGGEST)
      .map(w => ({ tin: w.tin, name: sup[w.tin].name || w.tin, num: w.num, day: w.day, amount: w.amount, gap: dayGap(w.day, c.buy) }));
    for (const s of suggest) cardsFor[s.tin] = (cardsFor[s.tin] || 0) + 1;
    const keys = [c.shopKa, c.shop].filter(Boolean).map(nameKey);
    const names = [...sellers].filter(tin => !suggest.some(s => s.tin === tin) && keys.some(k => k && similarKey(k, sellerKeyOf[tin])))
      .slice(0, 3).map(tin => ({ tin, name: sup[tin].name || tin }));
    return { ...c, count: shopCount[c.rk], suggest, names };
  });
  const cardOtherList = Object.values(cardOther).map(g => ({ ...g, tx: g.tx.sort((a, b) => b[1].localeCompare(a[1])).slice(0, MAX_TX) })).sort((a, b) => b.amount - a.amount);

  const nameOf = tin => sup[tin]?.name || tin;
  const finish = g => ({ ...g, tx: g.tx.sort((a, b) => b[1].localeCompare(a[1])).slice(0, MAX_TX) });
  const byAmount = o => Object.values(o).map(finish).sort((a, b) => b.amount - a.amount);
  const nameGroups = byAmount(groups.name).map(g => ({ ...g,
    versions: g.versions.map(tin => ({ tin, name: nameOf(tin), amount: sup[tin].amount, n: sup[tin].n })) }));
  const versionFor = {}; // supplier code → recipients that look like it by name
  for (const g of nameGroups) for (const v of g.versions) (versionFor[v.tin] = versionFor[v.tin] || []).push({ rk: g.rk, name: g.name, tin: g.tin, amount: g.amount, count: g.count });

  const list = Object.values(sup).map(x => {
    const owed = r2(x.amount - x.returns - x.paid - x.manual);
    const debtOk = dec.sup[x.tin]?.debt || "";
    const none = x.n > 0 && !x.paid && !x.manual && owed > 0 && !debtOk;
    x.waybills.sort((a, b) => b[1].localeCompare(a[1]));
    x.transfers.sort((a, b) => b[1].localeCompare(a[1]));
    return { ...x, owed, debtOk, none, versions: versionFor[x.tin] || [], cardWait: x.cardWait || 0, cards: cardsFor[x.tin] || 0 };
  }).sort((a, b) => b.owed - a.owed);

  const sum = (arr, f) => r2(arr.reduce((a, x) => a + f(x), 0));
  const withWaybills = list.filter(x => x.n);
  const other = byAmount(groups.other);
  return {
    total: sum(list, x => Math.max(0, x.owed)), // shown on the Main page
    totals: {
      waybills: sum(list, x => x.n), waybillSum: sum(list, x => x.amount), returns: sum(list, x => x.returns),
      paid: sum(list, x => x.paid), manual: sum(list, x => x.manual),
      suppliers: withWaybills.length, owing: list.filter(x => x.owed > 0).length,
    },
    suppliers: list,
    noWaybill: { open: byAmount(groups.open), wait: byAmount(groups.wait), other, otherTotal: sum(other, g => g.amount) },
    problems: {
      name: nameGroups,
      none: list.filter(x => x.none).map(x => ({ tin: x.tin, name: x.name, n: x.n, amount: x.amount, returns: x.returns, owed: x.owed, versions: x.versions, cards: x.cards })),
    },
    cards: {
      open: openCards, other: cardOtherList, otherTotal: sum(cardOtherList, g => g.amount),
      openTotal: sum(openCards, c => c.amount),
      paid: cardPaid.length, paidTotal: sum(cardPaid, p => p.c.amount), waiting: cardPaid.filter(p => !p.tr[9]).length,
    },
    over: list.filter(x => x.owed < 0).map(x => ({ tin: x.tin, name: x.name, n: x.n, amount: x.amount, returns: x.returns, paid: x.paid, manual: x.manual, excess: r2(-x.owed) })),
    sellers: [...sellers].map(tin => ({ tin, name: nameOf(tin) })).sort((a, b) => a.name.localeCompare(b.name)),
    bank: { configured, settings, lastSyncAt: state.lastSyncAt, errors: state.errors, notes: state.notes, cursors: state.cursors, payments: counted, skipped },
  };
}

// The CEO's answers. body.kind:
//   assign     { rk, to: "s:<code>" | "w:<code>" | "x", comment?, once?, id? }  a recipient's transfers (once: only the
//              ones there are now; id: only that one payment)
//   undo       { rk, scope: "rcp" | "tx", to? } or { ids: [transferId] }    back to undecided
//   comment    { rk, scope, comment }                                       an other expense's comment
//   reject     { rk, tins: [code] }                                         "not this supplier" for name versions
//   debt       { tin, on }                                                  "no transfer at all, the debt is right" (on: false = undo)
//   manual     { tin, code?, amount?, date?, comment? }                     a recipient code that pays this supplier, and/or a payment outside the bank
//   manualDel  { id }
export async function saveDecision(env, body) {
  const dec = await loadDecisions(env);
  const at = today(env);
  const rk = String(body.rk || "").slice(0, 200);
  const comment = String(body.comment ?? "").trim().slice(0, 300);
  const tin = cleanCode(body.tin);
  switch (body.kind) {
    case "assign": {
      const to = String(body.to || "");
      const m = /^([sw]):(.+)$/.exec(to);
      if (to !== "x" && !(m && CODE.test(m[2]))) return { error: "bad target" };
      if (!rk) return { error: "rk required" };
      if (body.id) {
        // one payment (a card payment: „მხოლოდ ეს გადახდა“)
        const id = String(body.id).slice(0, 100);
        dec.tx[id] = { to, at, rk, ...(to === "x" && comment ? { comment } : {}) };
      } else if (body.once) {
        const settings = await loadBankSettings(env);
        let n = 0;
        for (const r of await loadRecipientPayments(env, settings.historyFrom, rk)) {
          if (dec.tx[r[0]]) continue;
          dec.tx[r[0]] = { to, at, rk, ...(to === "x" && comment ? { comment } : {}) };
          n++;
        }
        if (!n) return { error: "no transfers" };
      } else dec.rcp[rk] = { to, at, ...(to === "x" && comment ? { comment } : {}) };
      break;
    }
    case "undo": {
      if (Array.isArray(body.ids)) for (const id of body.ids) delete dec.tx[String(id)];
      else if (body.scope === "tx") { for (const [id, v] of Object.entries(dec.tx)) if (v.rk === rk && (!body.to || v.to === body.to)) delete dec.tx[id]; }
      else delete dec.rcp[rk];
      break;
    }
    case "comment": {
      if (body.scope === "tx") { for (const v of Object.values(dec.tx)) if (v.rk === rk && v.to === "x") v.comment = comment; }
      else if (dec.rcp[rk]?.to === "x") dec.rcp[rk].comment = comment;
      else return { error: "not an expense" };
      break;
    }
    case "reject": {
      if (!rk || !Array.isArray(body.tins)) return { error: "rk and tins required" };
      for (const t of body.tins.map(cleanCode).filter(t => CODE.test(t))) {
        const s = dec.sup[t] = dec.sup[t] || {};
        s.no = [...new Set([...(s.no || []), rk])];
      }
      break;
    }
    case "debt": {
      if (!CODE.test(tin)) return { error: "tin required" };
      const s = dec.sup[tin] = dec.sup[tin] || {};
      if (body.on === false) delete s.debt; else s.debt = at;
      if (!Object.keys(s).length) delete dec.sup[tin];
      break;
    }
    case "manual": {
      if (!CODE.test(tin)) return { error: "tin required" };
      const code = cleanCode(body.code);
      const amount = Math.round(Number(String(body.amount ?? "").replace(",", ".")) * 100) / 100;
      if (code && !CODE.test(code)) return { error: "bad code" };
      if (!code && !(amount > 0)) return { error: "code or amount required" };
      if (amount && !(amount > 0 && amount < 1e8)) return { error: "bad amount" };
      if (code) dec.rcp["t:" + code] = { to: "s:" + tin, at };
      if (amount > 0) {
        const date = /^\d{4}-\d{2}-\d{2}$/.test(body.date || "") ? body.date : at;
        dec.manual.push({ id: "m" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), tin, amount, date, comment });
      }
      break;
    }
    case "manualDel": {
      dec.manual = dec.manual.filter(m => m.id !== String(body.id || ""));
      break;
    }
    default:
      return { error: "unknown kind" };
  }
  await env.STORE.put(KEY, JSON.stringify(dec));
  await bumpVersion(env);
  return { ok: true };
}
