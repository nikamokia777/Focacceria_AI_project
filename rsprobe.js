// rsprobe.js — a one-off, read-only check of what rs.ge, Syrve and the Telegram log really answer.
// Open /api/dash/probe while logged in to the Dashboard. Nothing is written anywhere.
// Shows: rs.ge error-code texts, how each waybill list method answers for a month / 3 days / 1 day,
// and the field names of the first record — so the Debts tabs are built on facts, not guesses.

import { buildEnvelope, parseXml, childOf, findDeep } from "./rsge.js";
import { withSyrve, xmlRecords, nowLocal } from "./dashboard.js";
import { loadLog } from "./store.js";
import { loadBankSettings } from "./bank.js";

const RSGE_ENDPOINT = "https://services.rs.ge/WayBillService/WayBillService.asmx";
const NS = "http://tempuri.org/";
const cut = (s, n = 60) => String(s ?? "").slice(0, n);

async function call(env, method, params) {
  const started = Date.now();
  try {
    const res = await fetch(RSGE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/xml; charset=utf-8", SOAPAction: `"${NS}${method}"` },
      body: buildEnvelope(method, [["su", env.RSGE_SERVICE_USER], ["sp", env.RSGE_SERVICE_PASSWORD], ...params]),
    });
    const raw = await res.text();
    const out = { ms: Date.now() - started, http: res.status };
    const response = findDeep(parseXml(raw), `${method}Response`);
    const result = response && childOf(response, `${method}Result`);
    if (!result) return { ...out, raw: cut(raw, 300) };
    // the result document arrives as child elements or as an escaped string
    const doc = result.children[0] || (result.text ? parseXml(result.text) : null);
    if (!doc) return { ...out, text: cut(result.text, 100) };
    const status = findDeep(doc, "STATUS");
    const records = doc.children;
    const first = records[0];
    return { ...out, root: doc.tag, count: records.length,
      status: status && !status.children.length && doc.tag === "RESULT" ? status.text : undefined,
      recordTag: first?.tag, fields: first ? first.children.map(c => c.tag) : [],
      sample: first ? Object.fromEntries(first.children.slice(0, 40).map(c => [c.tag, c.children.length ? `[${c.children.length} children]` : cut(c.text)])) : undefined,
      tags: [...new Set(records.map(r => r.tag))].slice(0, 5), _doc: doc };
  } catch (e) {
    return { ms: Date.now() - started, error: cut(e.message || e, 200) };
  }
}
const strip = r => { const { _doc, ...rest } = r; return rest; };

export async function runProbe(env) {
  const out = { at: new Date().toISOString() };
  const now = nowLocal(env);
  const y = now.getUTCFullYear(), m = now.getUTCMonth(); // previous full month
  const pm = new Date(Date.UTC(y, m - 1, 1)).toISOString().slice(0, 10);
  const pmEnd = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  const day = (d, n) => { const x = new Date(d + "T00:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
  const ranges = { month: [pm, pmEnd], days3: [pm, day(pm, 2)], day1: [pm, pm] };
  out.ranges = ranges;
  out.historyFrom = (await loadBankSettings(env)).historyFrom || "";

  if (!env.RSGE_SERVICE_USER || !env.RSGE_SERVICE_PASSWORD) out.rsge = "RSGE_SERVICE_USER / RSGE_SERVICE_PASSWORD missing";
  else {
    const rs = out.rsge = {};
    // every error code with its text (only negative codes are kept)
    const codes = await call(env, "get_error_codes", []);
    if (codes._doc) {
      rs.errorCodes = codes._doc.children.map(r => r.children.map(c => c.text).join(" | ")).filter(t => /-\d/.test(t));
      rs.errorCodeFields = codes.fields;
    } else rs.errorCodes = strip(codes);
    const types = await call(env, "get_waybill_types", []);
    rs.waybillTypes = types._doc ? types._doc.children.map(r => r.children.map(c => c.text).join(" | ")) : strip(types);

    const dates = ([s, e]) => [["create_date_s", `${s}T00:00:00`], ["create_date_e", `${e}T23:59:59`]];
    const methods = {
      buyer_confirmed: ["get_buyer_waybills_ex", r => [...dates(r), ["is_confirmed", "1"]]],
      buyer_all: ["get_buyer_waybills_ex", r => dates(r)],
      outgoing: ["get_waybills", r => dates(r)],
      goods: ["get_buyer_waybilll_goods_list", r => dates(r)],
    };
    for (const [name, [method, params]] of Object.entries(methods)) {
      rs[name] = {};
      let shown = false; // field names and a sample once per method
      for (const [rname, r] of Object.entries(ranges)) {
        const x = strip(await call(env, method, params(r)));
        if (shown) { delete x.fields; delete x.sample; delete x.tags; } else shown = !!x.sample;
        rs[name][rname] = x;
      }
    }
  }

  try {
    out.syrve = await withSyrve(env, async get => {
      const xml = await get("/documents/export/incomingInvoice", { from: pm, to: pmEnd });
      const docs = xmlRecords(xml, "document");
      const statuses = {};
      for (const d of docs) statuses[d.status] = (statuses[d.status] || 0) + 1;
      const items = xmlRecords(xml, "item");
      const firstDoc = (xml.match(/<document>[\s\S]*?<\/document>/) || [""])[0];
      return { bytes: xml.length, root: cut(xml.replace(/<\?xml[^>]*\?>/, "").trim(), 40), documents: docs.length, statuses,
        suppliers: new Set(docs.map(d => d.supplier)).size, items: items.length,
        docFields: firstDoc ? [...new Set([...firstDoc.replace(/<items>[\s\S]*<\/items>/, "").matchAll(/<([A-Za-z_][\w.-]*)[\s>\/]/g)].map(x => x[1]))] : [],
        itemFields: items[0] ? Object.keys(items[0]) : [],
        sampleDoc: docs[0] ? Object.fromEntries(Object.entries(docs[0]).slice(0, 30).map(([k, v]) => [k, cut(v)])) : null };
    });
  } catch (e) { out.syrve = { error: cut(e.message || e, 200) }; }

  const log = await loadLog(env);
  const wb = log.filter(r => r.kind === "waybill");
  const approved = wb.filter(r => r.status === "approved");
  const kinds = {};
  for (const r of log) { const k = `${r.kind}/${r.status}`; kinds[k] = (kinds[k] || 0) + 1; }
  out.telegram = { records: log.length, limit: 600, kinds, approved: approved.length,
    withTin: approved.filter(r => r.sellerTin).length,
    oldest: log.length ? log[log.length - 1].createdAt : "", newest: log.length ? log[0].createdAt : "",
    samples: approved.slice(0, 3).map(r => ({ number: r.number, date: r.date, total: r.total, tin: !!r.sellerTin, createdAt: r.createdAt, decidedAt: r.decidedAt, rows: (r.rows || []).length, rowFields: Object.keys((r.rows || [])[0] || {}) })) };
  return out;
}
