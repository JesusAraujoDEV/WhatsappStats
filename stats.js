// Core numbers: totals, per person, timelines, streaks.
import { dayKey, monthKey, inc, top, EMOJI, URL, WORD, isCode, contentWords } from './util.js';

const LAUGH = /\b(?:j[aeisj]{3,}|ha(?:ha)+|ja(?:ja)+|lo+l|lmao|xd+)\b/giu;
const GAP = 6 * 3600e3; // a silence this long starts a new "conversation"

function newAuthor() {
  return { messages: 0, words: 0, chars: 0, types: {}, emojis: {}, words_: {}, emojiCount: 0, laughs: 0, links: 0, questions: 0, edited: 0, starts: 0, responses: [], longest: '', hours: Array(24).fill(0), weekdays: Array(7).fill(0), days: new Set() };
}

export function compute(messages) {
  const authors = {};
  const perDay = {}, perMonth = {}, heat = Array.from({ length: 7 }, () => Array(24).fill(0));
  const emojis = {}, words = {}, types = {}, tags = {}; // tags[author][mentioned] = @mentions
  let prev = null;
  for (const m of messages) {
    const a = (authors[m.author] ||= newAuthor());
    const d = m.date, day = dayKey(d), wd = (d.getDay() + 6) % 7; // Monday = 0
    a.messages++; a.hours[d.getHours()]++; a.weekdays[wd]++; a.days.add(day);
    inc(a.types, m.type); inc(types, m.type);
    inc((perDay[day] ||= {}), m.author);
    inc((perMonth[monthKey(d)] ||= {}), m.author);
    heat[wd][d.getHours()]++;
    if (m.edited) a.edited++;
    for (const who of m.mentions || []) inc((tags[m.author] ||= {}), who);
    if (!prev || d - prev.date >= GAP) a.starts++;
    else if (prev.author !== m.author) a.responses.push(d - prev.date);
    prev = m;
    if (m.type !== 'text') continue;
    const t = m.text;
    a.chars += t.length;
    if (t.length > a.longest.length) a.longest = t;
    a.links += (t.match(URL) || []).length;
    if (t.includes('?')) a.questions++;
    a.laughs += (t.match(LAUGH) || []).length;
    for (const e of t.match(EMOJI) || []) { inc(a.emojis, e); inc(emojis, e); a.emojiCount++; }
    a.words += (t.replace(URL, '').match(WORD) || []).length;
    if (isCode(t)) continue;
    for (const w of contentWords(t)) { inc(a.words_, w); inc(words, w); }
  }

  const days = Object.keys(perDay).sort();
  const dayTotals = days.map((k) => Object.values(perDay[k]).reduce((x, y) => x + y, 0));
  // streaks and silences, walking day by day
  let best = { len: 0 }, cur = { len: 0 }, silence = { gap: 0 };
  for (let i = 0; i < days.length; i++) {
    const gapDays = i ? Math.round((new Date(days[i]) - new Date(days[i - 1])) / 864e5) : 1;
    cur = gapDays === 1 && i ? { start: cur.start, end: days[i], len: cur.len + 1 } : { start: days[i], end: days[i], len: 1 };
    if (cur.len > best.len) best = cur;
    if (gapDays - 1 > silence.gap) silence = { gap: gapDays - 1, from: days[i - 1], to: days[i] };
  }
  const busiest = days.reduce((b, k, i) => (dayTotals[i] > b.n ? { day: k, n: dayTotals[i] } : b), { n: 0 });
  const first = messages[0]?.date, last = messages.at(-1)?.date;
  const spanDays = first ? Math.max(1, Math.round((last - first) / 864e5) + 1) : 0;

  const people = Object.entries(authors)
    .sort((x, y) => y[1].messages - x[1].messages)
    // drop the big per-person maps: they'd be cloned back from the worker for nothing
    .map(([name, { words_, emojis: _e, responses, days, ...a }]) => ({
      name, ...a,
      activeDays: days.size,
      avgLen: a.chars / Math.max(1, a.types.text || 0),
      // ponytail: mean, not median — exports have minute precision so the median is almost always 0
      avgResponse: responses.reduce((x, y) => x + y, 0) / Math.max(1, responses.length),
      topEmojis: top(_e, 10),
      topWords: top(words_, 15),
    }));

  return {
    total: messages.length, first, last, spanDays, activeDays: days.length,
    avgPerDay: messages.length / Math.max(1, spanDays),
    words: people.reduce((s, p) => s + p.words, 0),
    people, types, heat, busiest, streak: best, silence, tags,
    months: Object.keys(perMonth).sort().map((k) => ({ month: k, by: perMonth[k] })),
    days: days.map((k, i) => ({ day: k, n: dayTotals[i] })),
    topEmojis: top(emojis, 20), topWords: top(words, 30),
  };
}
