// names.js — comparing company / person names from rs.ge, the banks and Syrve
// ("შპს ნიკორა", "NIKORA LLC", "ნიკორა ტრეიდი" …).

const LEGAL = new Set(["შპს", "სს", "იმ", "ltd", "llc", "jsc", "inc", "co", "company", "კომპანია"]);
function norm(name) {
  return String(name || "").toLowerCase()
    .replace(/\./g, "")                           // "ა.მ.გ." → "ამგ", "შ.პ.ს." → "შპს"
    .replace(/[^\p{L}\p{N}]+/gu, " ")            // other punctuation → space
    .split(" ").filter(w => w.length > 1 && !LEGAL.has(w)) // drop legal forms and single letters
    .join(" ");
}
// Georgian → Latin, so "ნიკორა" and "Nikora" compare equal
const KA = { ა:"a",ბ:"b",გ:"g",დ:"d",ე:"e",ვ:"v",ზ:"z",თ:"t",ი:"i",კ:"k",ლ:"l",მ:"m",ნ:"n",ო:"o",პ:"p",ჟ:"zh",რ:"r",ს:"s",ტ:"t",უ:"u",ფ:"p",ქ:"k",ღ:"gh",ყ:"k",შ:"sh",ჩ:"ch",ც:"ts",ძ:"dz",წ:"ts",ჭ:"ch",ხ:"kh",ჯ:"j",ჰ:"h" };
const latin = s => s.replace(/[ა-ჰ]/g, c => KA[c] || c).replace(/kh/g, "k").replace(/ts/g, "c").replace(/[wq]/g, "k").replace(/x/g, "ks");
// Names are prepared once ("keys"), then compared cheaply many times.
export function nameKey(name) {
  const n = norm(name);
  const l = latin(n);
  const words = w => new Set(w.split(" ").filter(x => x.length > 1));
  return { n, l, wn: words(n), wl: words(l) };
}
// strict: the same name after removing legal forms (Georgian or Latin spelling)
export const sameKey = (A, B) => !!A.n && !!B.n && (A.n === B.n || A.l === B.l);
function overlap(x, y, X, Y) {
  if (!x || !y) return false;
  if (x === y) return true;
  if (x.length >= 3 && y.length >= 3 && (x.includes(y) || y.includes(x))) return true;
  if (!X.size || !Y.size) return false;
  let both = 0; for (const w of X) if (Y.has(w)) both++;
  return both / Math.min(X.size, Y.size) >= 0.6;
}
export const similarKey = (A, B) => overlap(A.n, B.n, A.wn, B.wn) || overlap(A.l, B.l, A.wl, B.wl);
// convenience for one-off checks
export const similar = (a, b) => similarKey(nameKey(a), nameKey(b));
