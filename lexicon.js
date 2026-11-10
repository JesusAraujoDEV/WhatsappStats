// Affection & topic phrases (Spanish). Matched on normalized text: lowercase,
// no accents, letters repeated 3+ times collapsed ("TE AMOOO" → "te amo").
import { monthKey, per1k } from './util.js';

export const CATEGORIES = [
  ['teamo', 'Te amo', /\b(te ?amo|te adoro)\b/, true],
  ['tequiero', 'Te quiero', /\b(te quiero|tq|tqm|tkm)\b/, true],
  ['teextrano', 'Te extraño', /\b(te extrano|te echo de menos|te necesito|te extranaba)\b/, true],
  ['apodos', 'Apodos (amor, bebé, mi vida…)', /\b(mi amor|amor|bebe|beba|mi vida|cielo|corazon|mi reina|mi rey|gordit[oa]|mi nina|mi nino)\b/, true],
  ['buenosdias', 'Buenos días', /\b(buen(os|as)? dias?|buen dia)\b|^buenas\b(?! (noches|tardes))/, true],
  ['buenasnoches', 'Buenas noches', /\b(buenas noches|feliz noche|dulces suenos|que descanses|duerme bien)\b/, true],
  ['piropos', 'Piropos', /\b(lind[oa]|hermos[oa]|precios[oa]|guap[oa]|bonit[oa])\b/],
  ['perdon', 'Perdón', /\b(perdon|perdoname|disculpa|disculpame|lo siento|mi culpa)\b/],
  ['gracias', 'Gracias', /\b(gracias|grax)\b/],
  ['tension', 'Tensión (indicador, no veredicto)', /\b(no entiendes|me molesta|estoy molest[oa]|estoy brav[oa]|me dolio|me duele que)\b/],
  ['planes', 'Planes', /\b(vamos a|salimos|nos vemos|te veo|te espero)\b/],
  ['comida', 'Comida', /\b(comer|comida|cenar|almorzar|desayun\w*)\b/],
  ['sueno', 'Sueño / cansancio', /\b(dormir|sueno|cansad[oa]|dormid[oa])\b/],
  ['trabajo', 'Trabajo / estudio', /\b(trabaj\w*|chamba|estudi\w*|examen)\b/],
  ['jerga', 'Jerga venezolana', /\b(pana|chamo|chama|vaina|naguara|cono|carajo|que fino|guevon|weon|marico)\b/],
  ['risa', 'Risa', /\bj[aeisj]{3,}\b|\bxd+\b|😂|🤣|💀/],
];

const ACCENTS = { á: 'a', à: 'a', ä: 'a', â: 'a', ã: 'a', é: 'e', è: 'e', ë: 'e', ê: 'e', í: 'i', ì: 'i', ï: 'i', î: 'i', ó: 'o', ò: 'o', ö: 'o', ô: 'o', õ: 'o', ú: 'u', ù: 'u', ü: 'u', û: 'u', ñ: 'n', ç: 'c' };
// ponytail: accent map instead of normalize('NFD') — 5× faster; covers es/de/pt/fr, other scripts pass through untouched
export const norm = (t) => t.toLowerCase().replace(/[áàäâãéèëêíìïîóòöôõúùüûñç]/g, (c) => ACCENTS[c]).replace(/(.)\1{2,}/gu, '$1');
// Normalized text is reused by every lexicon/mentions run (custom words trigger re-runs).
const normOf = (m) => (m.norm ??= norm(m.text));

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const customCategory = (word) => {
  const w = norm(word.trim());
  return [`custom:${w}`, `“${word.trim()}”`, new RegExp(`\\b${escapeRe(w)}\\b`), true];
};

// Who mentions which name. Doubled letters are collapsed on both sides so "Pieraa" counts as "piera".
const loose = (t) => norm(t).replace(/(\p{L})\1+/gu, '$1');
const looseOf = (m) => (m.loose ??= normOf(m).replace(/(\p{L})\1+/gu, '$1'));
export function mentions(messages, names) {
  const list = [...new Set(names.map(loose).filter(Boolean))];
  const res = Object.fromEntries(names.map((n) => [loose(n), { name: n.trim(), total: 0, by: {} }]));
  if (!list.length) return [];
  const re = new RegExp(`\\b(${list.map(escapeRe).join('|')})\\b`, 'g');
  for (const m of messages) {
    if (m.type !== 'text') continue;
    for (const [, w] of looseOf(m).matchAll(re)) { const r = res[w]; r.total++; r.by[m.author] = (r.by[m.author] || 0) + 1; }
  }
  return Object.values(res).sort((a, b) => b.total - a.total);
}

// Counts messages containing each category, per person and per month. First use per person too.
export function lexicon(messages, extra = []) {
  const cats = [...CATEGORIES, ...extra];
  const res = Object.fromEntries(cats.map(([k, label, , affective]) => [k, { label, affective: !!affective, by: {}, months: {}, monthsBy: {}, first: {} }]));
  const textBy = {}, textMonths = {};
  const start = messages[0]?.date;
  for (const m of messages) {
    if (m.type !== 'text') continue;
    const mk = monthKey(m.date);
    textBy[m.author] = (textBy[m.author] || 0) + 1;
    textMonths[mk] = (textMonths[mk] || 0) + 1;
    const t = normOf(m);
    for (const [k, , re] of cats) {
      if (!re.test(t)) continue;
      const r = res[k];
      r.by[m.author] = (r.by[m.author] || 0) + 1;
      r.months[mk] = (r.months[mk] || 0) + 1;
      const mb = (r.monthsBy[mk] ||= {});
      mb[m.author] = (mb[m.author] || 0) + 1;
      r.first[m.author] ||= { date: m.date, day: Math.floor((m.date - start) / 864e5) + 1 };
    }
  }
  for (const r of Object.values(res)) {
    r.rate = Object.fromEntries(Object.entries(r.by).map(([a, n]) => [a, per1k(n, textBy[a])]));
    r.monthRate = Object.fromEntries(Object.entries(r.months).map(([mk, n]) => [mk, per1k(n, textMonths[mk])]));
  }
  return { cats: res, textBy, textMonths };
}
