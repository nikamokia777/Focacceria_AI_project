// rsge.js — small client for the Revenue Service (rs.ge) WayBill Service.
// Official protocol: https://eservices.rs.ge/Docs/el-zednadebis_protokoli.pdf
// The service is classic ASP.NET SOAP 1.1 (namespace http://tempuri.org/).
// Every call carries the "service user" name (su) and password (sp).

const RSGE_ENDPOINT = "https://services.rs.ge/WayBillService/WayBillService.asmx";
const NS = "http://tempuri.org/";

// ── XML helpers ──────────────────────────────────────────────────────────────

export function xmlEscape(value) {
  return String(value ?? "").replace(/[<>&'"]/g, (c) => (
    { "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]
  ));
}

export function xmlUnescape(value) {
  return String(value ?? "")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

// Minimal XML parser — enough for rs.ge's plain element-only documents.
// Returns { tag, children: [...], text } or null.
export function parseXml(xmlText) {
  const s = String(xmlText ?? "")
    .replace(/^﻿/, "")
    .replace(/<\?xml[\s\S]*?\?>/g, "")
    .replace(/<!--[\s\S]*?-->/g, "");
  let pos = 0;
  const openRe = /<([A-Za-z_][\w.:-]*)((?:\s+[\w.:-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/y;
  const closeRe = /<\/([A-Za-z_][\w.:-]*)\s*>/y;

  function parseElement() {
    openRe.lastIndex = pos;
    const m = openRe.exec(s);
    if (!m) return null;
    pos = openRe.lastIndex;
    const node = { tag: m[1].replace(/^.*:/, ""), children: [], text: "" };
    if (m[3] === "/") return node;

    while (pos < s.length) {
      if (s.startsWith("<![CDATA[", pos)) {
        const end = s.indexOf("]]>", pos);
        const stop = end === -1 ? s.length : end;
        node.text += s.slice(pos + 9, stop);
        pos = end === -1 ? s.length : end + 3;
      } else if (s.startsWith("</", pos)) {
        closeRe.lastIndex = pos;
        const c = closeRe.exec(s);
        pos = c ? closeRe.lastIndex : s.length;
        break;
      } else if (s[pos] === "<") {
        const child = parseElement();
        if (child) node.children.push(child);
        else pos++; // stray "<" — skip it rather than loop forever
      } else {
        const next = s.indexOf("<", pos);
        const stop = next === -1 ? s.length : next;
        node.text += xmlUnescape(s.slice(pos, stop));
        pos = stop;
      }
    }
    node.text = node.text.trim();
    return node;
  }

  const start = s.indexOf("<");
  if (start === -1) return null;
  pos = start;
  return parseElement();
}

export function childrenOf(node, tag) {
  return node ? node.children.filter((c) => c.tag === tag) : [];
}
export function childOf(node, tag) {
  return childrenOf(node, tag)[0] || null;
}
export function textOf(node, tag) {
  const c = childOf(node, tag);
  return c ? c.text : "";
}
// Find the first element with this tag anywhere in the tree.
export function findDeep(node, tag) {
  if (!node) return null;
  if (node.tag === tag) return node;
  for (const c of node.children) {
    const hit = findDeep(c, tag);
    if (hit) return hit;
  }
  return null;
}

// ── SOAP plumbing ────────────────────────────────────────────────────────────

// params: ordered [name, value] pairs. Empty values are left out entirely,
// because rs.ge's optional date/number fields reject an empty element.
export function buildEnvelope(method, params) {
  const fields = params
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([name, v]) => `<${name}>${xmlEscape(v)}</${name}>`)
    .join("");
  return (
    `<?xml version="1.0" encoding="utf-8"?>` +
    `<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">` +
    `<soap:Body><${method} xmlns="${NS}">${fields}</${method}></soap:Body>` +
    `</soap:Envelope>`
  );
}

function credentials(env) {
  const su = env.RSGE_SERVICE_USER;
  const sp = env.RSGE_SERVICE_PASSWORD;
  if (!su || !sp) {
    throw new Error("Server is missing RSGE_SERVICE_USER / RSGE_SERVICE_PASSWORD.");
  }
  return { su, sp };
}

// Calls one method and returns the parsed <methodResponse> element.
async function soapCall(env, method, params) {
  const { su, sp } = credentials(env);
  const res = await fetch(RSGE_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: `"${NS}${method}"`,
    },
    body: buildEnvelope(method, [["su", su], ["sp", sp], ...params]),
  });
  const raw = await res.text();
  const doc = parseXml(raw);
  if (!res.ok) {
    const fault = textOf(findDeep(doc, "Fault"), "faultstring");
    throw new Error(`rs.ge error (HTTP ${res.status}): ${fault || raw.slice(0, 300)}`);
  }
  const response = findDeep(doc, `${method}Response`);
  if (!response) {
    throw new Error(`rs.ge returned an unexpected response: ${raw.slice(0, 300)}`);
  }
  return response;
}

// The "...Result" element holds an XML document. Depending on how the server
// serialises it, that document arrives either as real child elements or as an
// escaped string — handle both.
function resultDocument(response, method, rootTag) {
  const result = childOf(response, `${method}Result`);
  if (!result) return null;
  const direct = findDeep(result, rootTag);
  if (direct) return direct;
  if (result.text) return findDeep(parseXml(result.text), rootTag);
  return null;
}

// ── Public API ───────────────────────────────────────────────────────────────

// Are the service user name and password valid?
export async function checkServiceUser(env) {
  const response = await soapCall(env, "chek_service_user", []);
  return {
    ok: textOf(response, "chek_service_userResult").toLowerCase() === "true",
    unId: textOf(response, "un_id"),
    sUserId: textOf(response, "s_user_id"),
  };
}

function mapWaybillHeader(w) {
  return {
    id: textOf(w, "ID"),
    number: textOf(w, "WAYBILL_NUMBER"),
    type: textOf(w, "TYPE"),
    status: textOf(w, "STATUS"),
    sellerName: textOf(w, "SELLER_NAME"),
    sellerTin: textOf(w, "SELLER_TIN"),
    buyerName: textOf(w, "BUYER_NAME"),
    buyerTin: textOf(w, "BUYER_TIN"),
    fullAmount: parseFloat(textOf(w, "FULL_AMOUNT")) || 0,
    createDate: textOf(w, "CREATE_DATE"),
    beginDate: textOf(w, "BEGIN_DATE"),
    deliveryDate: textOf(w, "DELIVERY_DATE"),
    comment: textOf(w, "WAYBILL_COMMENT"),
  };
}

// List waybills filtered by printed waybill number.
// method: "get_buyer_waybills" (we received the goods) or "get_waybills" (we sent them).
async function listByNumber(env, method, waybillNumber) {
  const response = await soapCall(env, method, [["waybill_number", waybillNumber]]);
  const list = resultDocument(response, method, "WAYBILL_LIST");
  return childrenOf(list, "WAYBILL").map(mapWaybillHeader);
}

// Full waybill, including the goods lines.
export async function getWaybill(env, waybillId) {
  const response = await soapCall(env, "get_waybill", [["waybill_id", waybillId]]);
  const w = resultDocument(response, "get_waybill", "WAYBILL");
  if (!w) return null;
  const goods = childrenOf(childOf(w, "GOODS_LIST"), "GOODS")
    .filter((g) => textOf(g, "STATUS") !== "-1") // -1 = deleted line
    .map((g) => ({
      name: textOf(g, "W_NAME"),
      code: textOf(g, "BAR_CODE"),
      unitId: textOf(g, "UNIT_ID"),
      unitText: textOf(g, "UNIT_TXT"),
      quantity: parseFloat(textOf(g, "QUANTITY")) || 0,
      price: parseFloat(textOf(g, "PRICE")) || 0,
      amount: parseFloat(textOf(g, "AMOUNT")) || 0,
    }));
  return { ...mapWaybillHeader(w), goods };
}

// "ელ-0988938607", "EL 0988938607", "0988938607/1" → "0988938607" (keeps a /sub suffix)
export function normalizeWaybillNumber(input) {
  const m = String(input ?? "").match(/\d{6,}(?:\/\d+)?/);
  return m ? m[0] : "";
}

// Look a waybill up by the number printed on it and return it with its goods.
// Returns null when rs.ge has no such waybill for this company.
export async function lookupWaybill(env, printedNumber) {
  const number = normalizeWaybillNumber(printedNumber);
  if (!number) return null;

  let matches = await listByNumber(env, "get_buyer_waybills", number);
  if (!matches.length) matches = await listByNumber(env, "get_waybills", number);
  if (!matches.length) return null;

  const exact = matches.find((w) => w.number === number) || matches[0];
  const full = await getWaybill(env, exact.id);
  if (!full) return null;
  // The list view carries seller/buyer names that the single view may omit.
  for (const k of Object.keys(exact)) {
    if (!full[k]) full[k] = exact[k];
  }
  return full;
}
