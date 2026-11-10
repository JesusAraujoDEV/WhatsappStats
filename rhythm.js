// Rhythm & reciprocity: responses, sessions, who opens/closes the day, silences, bursts, months.
import { dayKey, monthKey, inc, top, quantile, EMOJI, logicalDay, daysInMonthWithin } from './util.js';

const GAP = 6 * 3600e3, SESSION = 3600e3, MIN = 60e3;
const BANDS = [[0, 5], [5, 12], [12, 18], [18, 24]];
const band = (h) => BANDS.findIndex(([a, b]) => h >= a && h < b);
const RESP_BUCKETS = [['< 1 min', 1], ['1–5 min', 5], ['5–30 min', 30], ['30 min–6 h', 360]];
const DAY_BUCKETS = [['0', 0], ['1–50', 50], ['51–150', 150], ['151–300', 300], ['301–600', 600], ['601–1000', 1000], ['> 1000', Infinity]];

function responseStats(list) {
  const buckets = RESP_BUCKETS.map(([label, max], i) => {
    const lo = i ? RESP_BUCKETS[i - 1][1] * MIN : 0;
    return [label, list.filter((x) => x >= lo && x < max * MIN).length];
  });
  return { n: list.length, under1: list.filter((x) => x < MIN).length / Math.max(1, list.length), p90: quantile(list, 0.9), buckets };
}

export function rhythm(messages) {
  const first = messages[0].date, last = messages.at(-1).date;
  const resp = {}, monthResp = {}, bursts = {}, opens = {}, closes = {}, openMonth = {}, closeMonth = {};
  const months = {}, weeks = {}, perDay = {}, gaps = [];
  let sessions = [], sess = null, burst = { author: null, n: 0 }, maxBurst = { n: 0 }, switches = 0;
  const dayFirstLast = {};

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i], prev = messages[i - 1], d = m.date, mk = monthKey(d);
    const M = (months[mk] ||= { n: 0, by: {}, starts: {}, night: 0, bands: [0, 0, 0, 0], sessions: 0, emojis: {}, types: {} });
    M.n++; inc(M.by, m.author); M.bands[band(d.getHours())]++; inc(M.types, m.type);
    if (d.getHours() < 5) M.night++;
    if (m.type === 'text') for (const e of m.text.match(EMOJI) || []) inc(M.emojis, e);
    inc(perDay, dayKey(d));
    // weeks start on Monday
    const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
    const W = (weeks[dayKey(monday)] ||= { n: 0, by: {}, media: 0 });
    W.n++; inc(W.by, m.author); if (m.type !== 'text') W.media++;

    const ld = logicalDay(d);
    (dayFirstLast[ld] ||= { first: m, last: m }).last = m;

    const gap = prev ? d - prev.date : Infinity;
    if (prev) {
      if (prev.author !== m.author) switches++;
      gaps.push({ gap, from: prev.date, breaker: m.author });
      if (gap < GAP && prev.author !== m.author) {
        (resp[m.author] ||= []).push(gap);
        (monthResp[mk] ||= []).push(gap);
      }
    }
    if (gap >= GAP) inc(M.starts, m.author);
    if (gap > SESSION) { sess = { start: d, end: d, n: 0 }; sessions.push(sess); M.sessions++; }
    sess.end = d; sess.n++;
    if (burst.author === m.author) burst.n++;
    else { if (burst.author) (bursts[burst.author] ||= []).push(burst.n); burst = { author: m.author, n: 1, date: d }; }
    if (burst.n > maxBurst.n) maxBurst = { ...burst };
  }
  (bursts[burst.author] ||= []).push(burst.n);

  for (const [ld, { first: f, last: l }] of Object.entries(dayFirstLast)) {
    const mk = ld.slice(0, 7);
    inc(opens, f.author); inc(closes, l.author);
    inc((openMonth[mk] ||= {}), f.author); inc((closeMonth[mk] ||= {}), l.author);
  }

  // every calendar day in the span, including empty ones
  const allDays = [];
  for (let d = new Date(first.getFullYear(), first.getMonth(), first.getDate()); d <= last; d.setDate(d.getDate() + 1)) allDays.push([dayKey(d), perDay[dayKey(d)] || 0]);
  const counts = allDays.map(([, n]) => n);
  const active = allDays.filter(([, n]) => n > 0).sort((a, b) => a[1] - b[1]);
  const wdCount = Array(7).fill(0);
  for (const [k] of allDays) wdCount[(new Date(`${k}T12:00`).getDay() + 6) % 7]++;

  const longest = sessions.reduce((b, s) => (s.end - s.start > b.end - b.start ? s : b), sessions[0]);
  const monthKeys = Object.keys(months).sort();
  const monthly = monthKeys.map((mk) => {
    const M = months[mk], { days, partial } = daysInMonthWithin(mk, first, last);
    const r = responseStats(monthResp[mk] || []);
    return { month: mk, partial, days, perDay: M.n / days, n: M.n, by: M.by, night: M.night, bands: M.bands, starts: M.starts,
      sessionsPerDay: M.sessions / days, perSession: M.n / Math.max(1, M.sessions), under1: r.under1, p90: r.p90,
      topEmojis: top(M.emojis, 4), types: M.types, opens: openMonth[mk] || {}, closes: closeMonth[mk] || {} };
  });

  return {
    responses: Object.fromEntries(Object.entries(resp).map(([a, l]) => [a, responseStats(l)])),
    sessions: { n: sessions.length, perDay: sessions.length / allDays.length, perSession: messages.length / sessions.length, longest },
    opens, closes, monthly,
    weeks: Object.keys(weeks).sort().map((k) => ({ week: k, ...weeks[k], perDay: weeks[k].n / 7 })),
    rare: { low: active.filter(([, n]) => n < 150).length, high: active.filter(([, n]) => n > 1000).length, lowest: active.slice(0, 5), highest: active.slice(-5).reverse() },
    medianPerDay: quantile(counts, 0.5),
    dayHistogram: DAY_BUCKETS.map(([label, max], i) => [label, counts.filter((n) => n <= max && n > (i ? DAY_BUCKETS[i - 1][1] : -1)).length]),
    silences: gaps.sort((a, b) => b.gap - a.gap).slice(0, 8),
    bursts: { max: maxBurst, avg: Object.fromEntries(Object.entries(bursts).map(([a, l]) => [a, l.reduce((x, y) => x + y, 0) / l.length])) },
    alternation: switches / Math.max(1, messages.length - 1),
    weekdayAvg: wdCount, // divide per-person weekday totals by this
  };
}
