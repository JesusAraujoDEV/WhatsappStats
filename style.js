// Writing style, distinctive words (log-odds), links, media mix, system events.
import { monthKey, inc, top, quantile, per1k, EMOJI, URL, WORD, isCode, contentWords } from './util.js';

const MIN_PERSON = 35, MIN_MONTH = 25;
const HEARTS = ['😭', '💔', '❤️'];

// score = ln((a+1)/Ta) − ln((b+1)/Tb): how much more group A uses w than everyone else.
function distinctive(countsA, totalA, countsAll, totalAll, min, n) {
  const totalB = totalAll - totalA, out = [];
  for (const [w, a] of Object.entries(countsA)) {
    if (a < min) continue;
    const b = countsAll[w] - a;
    out.push([w, Math.log((a + 1) / totalA) - Math.log((b + 1) / Math.max(1, totalB)), a]);
  }
  return out.sort((x, y) => y[1] - x[1]).slice(0, n);
}

export function style(messages) {
  const P = {}, wordsAll = {}, monthWords = {}, monthTotals = {}, monthMedia = {};
  let wordsTotal = 0;
  for (const m of messages) {
    const p = (P[m.author] ||= { text: 0, all: 0, media: 0, wpm: [], one: 0, long: 0, elongated: 0, caps: 0, excl: 0, hearts: {}, vocab: {}, vocabTotal: 0, domains: {} });
    p.all++;
    const mk = monthKey(m.date);
    if (m.type !== 'text' && m.type !== 'deleted') { p.media++; inc((monthMedia[mk] ||= {}), m.type); continue; }
    if (m.type !== 'text') continue;
    const t = m.text;
    p.text++;
    const nw = (t.replace(URL, '').match(WORD) || []).length;
    p.wpm.push(nw);
    if (nw === 1) p.one++;
    if (nw >= 15) p.long++;
    if (/(\p{L})\1{3,}/u.test(t)) p.elongated++;
    if (/\b\p{Lu}{6,}\b/u.test(t)) p.caps++;
    if (t.includes('!')) p.excl++;
    for (const e of t.match(EMOJI) || []) if (HEARTS.includes(e)) inc(p.hearts, e);
    for (const u of t.match(URL) || []) { try { inc(p.domains, new globalThis.URL(u).hostname.replace(/^www\./, '')); } catch {} }
    if (isCode(t)) continue;
    for (const w of contentWords(t)) {
      inc(p.vocab, w); p.vocabTotal++; inc(wordsAll, w); wordsTotal++;
      inc((monthWords[mk] ||= {}), w); inc(monthTotals, mk);
    }
  }
  const people = Object.fromEntries(Object.entries(P).map(([a, p]) => [a, {
    avgWords: p.wpm.reduce((x, y) => x + y, 0) / Math.max(1, p.text), medianWords: quantile(p.wpm, 0.5),
    one: p.one / Math.max(1, p.text), long: p.long / Math.max(1, p.text),
    elongated: per1k(p.elongated, p.text), caps: per1k(p.caps, p.text), excl: per1k(p.excl, p.text),
    hearts: Object.fromEntries(HEARTS.map((h) => [h, per1k(p.hearts[h] || 0, p.text)])),
    uniqueWords: Object.keys(p.vocab).length, mediaShare: p.media / Math.max(1, p.all), text: p.text,
    domains: top(p.domains, 5),
    distinctive: distinctive(p.vocab, p.vocabTotal, wordsAll, wordsTotal, MIN_PERSON, 15),
  }]));
  const months = Object.keys(monthWords).sort().map((mk) => ({
    month: mk, words: distinctive(monthWords[mk], monthTotals[mk], wordsAll, wordsTotal, MIN_MONTH, 6),
  }));
  return { people, months, media: Object.keys(monthMedia).sort().map((mk) => ({ month: mk, types: monthMedia[mk] })) };
}

// unblock before block: "Du blockierst diese Person nicht mehr" contains both words
const EVENTS = [
  ['Desbloqueo', /nicht mehr|unblocked|desbloqueaste|desbloqueado/i],
  ['Bloqueo', /blockiert|blocked|bloqueaste|bloqueado/i],
  ['Cambio de número', /nummer|number|número/i],
  ['Nombre / foto del grupo', /(changed|geändert|cambió|cambiaste).*(name|namen|nombre|icon|bild|foto|subject|betreff|asunto)/i],
  ['Entra / sale', /(joined|added|left|removed|beigetreten|hinzugefügt|verlassen|entfernt|se unió|añadió|salió|eliminó)/i],
];

export function events(system) {
  return system.flatMap(({ date, text }) => {
    const hit = EVENTS.find(([, re]) => re.test(text));
    return hit ? [{ date, kind: hit[0], text }] : [];
  });
}
