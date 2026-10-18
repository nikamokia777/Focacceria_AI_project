// orders.js — reading shopping lists that employees write in Telegram, e.g.
//
//   რუკოლა 2კგ
//   ჩერი პომიდორი 3 კგ
//   - მოცარელა 125გ 4 ცალი
//
// One product per line, amount at the end (or at the start: "2კგ რუკოლა").

const UNIT_ALIASES = [
  [/^(კგ|კ\.გ|კილო|კილოგრამი|kg|kgs|kilo)$/i, "კგ"],
  [/^(გრ|გ|გრამი|g|gr)$/i, "გრ"],
  [/^(ლ|ლიტრი|l|lt|ltr)$/i, "ლ"],
  [/^(მლ|ml)$/i, "მლ"],
  [/^(ც|ცალი|ცალ|pcs|pc|ც\.)$/i, "ცალი"],
  [/^(შეკვრა|შეკ|შეკვ)$/i, "შეკვრა"],
  [/^(ყუთი|ყუთ|box)$/i, "ყუთი"],
  [/^(ბოთლი|ბოთ)$/i, "ბოთლი"],
  [/^(ქილა)$/i, "ქილა"],
  [/^(პაკეტი|პაკ)$/i, "პაკეტი"],
];

export function normalizeUnit(raw) {
  const u = String(raw ?? "").trim().replace(/\.$/, "");
  if (!u) return "";
  for (const [re, unit] of UNIT_ALIASES) if (re.test(u)) return unit;
  return null; // not a known unit
}

const hasLetter = (s) => /\p{L}/u.test(s);
const toNumber = (s) => Number(String(s).replace(",", "."));

function parseLine(raw) {
  const line = raw.replace(/^\s*(?:[-•*·–—]+|\d+[.)])\s*/, "").trim();
  if (!line) return null;

  // name … amount [unit]     e.g. "ჩერი პომიდორი 1.5 კგ", "რუკოლა - 2კგ", "კვერცხი x30"
  let m = line.match(/^(.*?\p{L}.*?)[\s:\-–—=x×]*(\d+(?:[.,]\d+)?)\s*([\p{L}.]{0,12})$/u);
  if (m) {
    const unit = normalizeUnit(m[3]);
    return { raw, name: m[1].trim(), qty: toNumber(m[2]), unit: unit ?? m[3], knownUnit: unit !== null };
  }
  // amount [unit] name       e.g. "2კგ რუკოლა", "3 ჩერი პომიდორი"
  m = line.match(/^(\d+(?:[.,]\d+)?)\s*(.*\p{L}.*)$/u);
  if (m) {
    const [first, ...rest] = m[2].trim().split(/\s+/);
    const unit = normalizeUnit(first);
    if (unit && rest.length) return { raw, name: rest.join(" "), qty: toNumber(m[1]), unit, knownUnit: true };
    return { raw, name: m[2].trim(), qty: toNumber(m[1]), unit: "", knownUnit: true };
  }
  return null;
}

// Returns the parsed lines, or null when the message doesn't look like a shopping list.
export function parseOrderMessage(text) {
  const lines = String(text ?? "").split(/\n|;/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length || lines.length > 60) return null;
  const out = [];
  for (const l of lines) {
    // a heading such as "შეკვეთა:" / "Order:" is fine
    if (/[:：]$/.test(l) && !/\d/.test(l)) continue;
    const p = parseLine(l);
    if (!p || !hasLetter(p.name) || !(p.qty > 0)) return null;
    out.push(p);
  }
  return out.length ? out : null;
}

// ── Finding the product by (approximate) name ────────────────────────────────

export const normName = (s) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/[.,'"`()\[\]\-–—_/\\]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function score(query, candidate) {
  if (!query || !candidate) return 0;
  if (query === candidate) return 100;
  if (candidate.startsWith(query) || query.startsWith(candidate)) return Math.min(query.length, candidate.length) >= 3 ? 85 : 0;
  // every typed word is the start of a word in the product name ("ბულგ წიწ" → "ბულგარული წიწაკა")
  const qw = query.split(" ");
  const cw = candidate.split(" ");
  if (qw.length > 1 && qw.every((w) => cw.some((c) => c.startsWith(w)))) return 78;
  if (Math.min(query.length, candidate.length) >= 4 && (candidate.includes(query) || query.includes(candidate))) return 70;
  return 0;
}

export function matchProduct(products, name) {
  const q = normName(name);
  if (q.length < 2) return null;
  let best = null;
  let bestScore = 0;
  let bestGap = Infinity;
  for (const p of products) {
    for (const cand of [p.name, p.nameRs]) {
      const c = normName(cand);
      const s = score(q, c);
      const gap = Math.abs(c.length - q.length);
      if (s > bestScore || (s === bestScore && s > 0 && gap < bestGap)) {
        best = p;
        bestScore = s;
        bestGap = gap;
      }
    }
  }
  return bestScore >= 70 ? best : null;
}
