// Parses WhatsApp .txt exports (Android/iOS, en/es/de, 12h/24h, dd/mm or mm/dd).
const LINE = /^\[?(\d{1,4})[./-](\d{1,2})[./-](\d{2,4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([ap])?\.?\s?(?:m\.?)?(?:\]\s|\s-\s)(.*)$/i;

const DELETED = /^(this message was deleted|you deleted this message|diese nachricht wurde gelöscht\.?|du hast diese nachricht gelöscht\.?|se eliminó este mensaje\.?|eliminaste este mensaje\.?)$/i;
const EDITED = /\s*<(this message was edited|diese nachricht wurde bearbeitet\.?|se editó este mensaje\.?)>$/i;
const OMITTED = /^<(media omitted|medien ausgeschlossen|multimedia omitido)>$/i;
const ATTACHED = /^(\S+\.\w+) \((file attached|datei angehängt|archivo adjunto)\)/i;
// @mentions are exported with the contact name as saved on the exporting phone: "@⁨Paco 🐙⁩",
// or the number for unsaved contacts. They're not typed words, so they're pulled out of the text.
const MENTION = /@⁨([^⁩]+)⁩|@(\+?\d[\d ]{6,}\d)/g;
const LOCATION =/^(location|standort|ubicación): /i;

function attachmentType(name) {
  const n = name.toUpperCase();
  if (n.startsWith('STK-')) return 'sticker';
  if (n.startsWith('PTT-') || n.startsWith('AUD-') || /\.(OPUS|OGG|M4A|MP3|AAC)$/.test(n)) return 'audio';
  if (n.startsWith('IMG-') || /\.(JPE?G|PNG|HEIC)$/.test(n)) return 'image';
  if (n.startsWith('VID-') || /\.(MP4|MOV|3GP)$/.test(n)) return 'video';
  if (/\.GIF$/.test(n)) return 'gif';
  if (/\.VCF$/.test(n)) return 'contact';
  return 'document';
}

export function classify(text) {
  if (DELETED.test(text)) return 'deleted';
  if (OMITTED.test(text)) return 'media';
  const a = ATTACHED.exec(text);
  if (a) return attachmentType(a[1]);
  if (/^<video note omitted>$/i.test(text)) return 'videonote';
  if (/^<view once voice message omitted>$/i.test(text)) return 'audio';
  if (text === 'null') return 'viewonce';
  if (LOCATION.test(text)) return 'location';
  if (/^(POLL|UMFRAGE|ENCUESTA):/.test(text)) return 'poll';
  return 'text';
}

// dd/mm vs mm/dd: decided once for the whole file, since exports are consistent.
function detectDayFirst(heads) {
  for (const [a, b, sep] of heads) {
    if (sep === '.') return true;
    if (a > 12) return true;
    if (b > 12) return false;
  }
  return true;
}

export function parse(raw) {
  const lines = raw.replace(/\r/g, '').replace(/[‎‏‪-‮]/g, '').replace(/[  ]/g, ' ').split('\n');
  const heads = [];
  const entries = [];
  for (const line of lines) {
    const m = LINE.exec(line);
    if (m) {
      heads.push([+m[1], +m[2], line.match(/^\[?\d+([./-])/)[1]]);
      entries.push({ m, extra: [] });
    } else if (entries.length) {
      entries[entries.length - 1].extra.push(line);
    }
  }
  const dayFirst = detectDayFirst(heads.slice(0, 5000));
  const messages = [];
  const system = [];
  for (const { m, extra } of entries) {
    let [, a, b, y, h, min, s, ap, rest] = m;
    if (a.length === 4) [y, a, b] = [a, b, y]; // yyyy-mm-dd
    const day = dayFirst ? +a : +b;
    const month = dayFirst ? +b : +a;
    let year = +y < 100 ? 2000 + +y : +y;
    let hour = +h;
    if (ap) hour = (hour % 12) + (ap.toLowerCase() === 'p' ? 12 : 0);
    const date = new Date(year, month - 1, day, hour, +min, +(s || 0));
    const sep = rest.indexOf(': ');
    if (sep < 1 || sep > 60) { system.push({ date, text: rest }); continue; }
    const author = rest.slice(0, sep).trim();
    let text = [rest.slice(sep + 2), ...extra].join('\n');
    const edited = text.endsWith('>') && EDITED.test(text); // cheap guard: the regex backtracks on every line
    if (edited) text = text.replace(EDITED, '');
    const mentions = [];
    if (text.includes('@')) text = text.replace(MENTION, (_, name, num) => (mentions.push((name || num).trim()), '')).replace(/^\s+|\s+$/g, '');
    messages.push({ date, author, text, type: classify(text.trim()), edited, mentions });
  }
  return { messages, system, dayFirst };
}
