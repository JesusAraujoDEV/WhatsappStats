export const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const monthKey = (d) => dayKey(d).slice(0, 7);
export const inc = (o, k, n = 1) => (o[k] = (o[k] || 0) + n);
export const top = (o, n) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n);
export const quantile = (a, q) => { if (!a.length) return 0; const s = Float64Array.from(a).sort(); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
export const per1k = (n, total) => (total ? (1000 * n) / total : 0);

export const EMOJI = /\p{Extended_Pictographic}(?:\p{Emoji_Modifier}|️|‍\p{Extended_Pictographic})*/gu;
export const URL = /https?:\/\/\S+/g;
export const WORD = /[\p{L}\p{N}]+/gu;
export const STOP = new Set(`que de la el en y a los las se no un una por con es para lo me te mi tu su al del le ya si pero como mas más muy yo eso esta este está ese era fue ser hay qué q d x ni o u sí son hace tengo tiene todo pues porque bueno entonces también vez así hasta cuando donde sin sobre cosa ahí allá aqui aquí estoy estás tienes voy va van and the to of is it in that you for on with this was are be have not but just so can what my me your at do im its dont like get all he she we they or if about one there will would from out up how when no yes ok der die das und ist ich du nicht sie es ein eine zu mit den auf für sich dem des auch wie was war aber so mir dich mich hast bin habe noch nur schon wenn dann jetzt kann oder ja nein mal`.split(' '));

// Pasted code/logs pollute word stats with "const", "null", "string"...
export const isCode = (t) => t.length > 300 || /[{}]|=>|;\s*\n|\b(const|function|def|let|var|return|import)\s/.test(t);

// Words worth counting: no stopwords, numbers, URLs or code.
export function contentWords(t) {
  const out = [];
  for (const w of t.replace(URL, '').toLowerCase().match(WORD) || []) if (w.length > 2 && !STOP.has(w) && !/^\d+$/.test(w)) out.push(w);
  return out;
}

// Logical day starts at 5 am, so a 2 am message still belongs to "last night".
export const logicalDay = (d) => dayKey(new Date(d - 5 * 3600e3));
export const daysInMonthWithin = (month, first, last) => {
  const [y, m] = month.split('-').map(Number);
  const start = new Date(y, m - 1, 1), end = new Date(y, m, 0);
  const a = first > start ? first : start, b = last < end ? last : end;
  const partial = first > start || last < new Date(y, m, 0, 23, 59);
  return { days: Math.max(1, Math.round((new Date(b.getFullYear(), b.getMonth(), b.getDate()) - new Date(a.getFullYear(), a.getMonth(), a.getDate())) / 864e5) + 1), partial };
};
