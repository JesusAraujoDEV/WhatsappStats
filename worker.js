// Heavy lifting off the main thread: ~10 s on a 500k-message chat.
import { parse } from './parser.js';
import { compute } from './stats.js';
import { lexicon, customCategory, mentions } from './lexicon.js';
import { rhythm } from './rhythm.js';
import { style, events } from './style.js';

let messages = [];

onmessage = ({ data }) => {
  try {
    const words = () => ({ lx: lexicon(messages, data.custom.map(customCategory)), mt: mentions(messages, data.names) });
    if (data.text === undefined) return postMessage(words());
    const r = parse(data.text);
    messages = r.messages;
    if (!messages.length) return postMessage({ error: 'No encontré mensajes. ¿Es un export de WhatsApp?' });
    postMessage({ s: compute(messages), rh: rhythm(messages), st: style(messages), ev: events(r.system), ...words() });
  } catch (e) {
    postMessage({ error: `Error procesando el chat: ${e.message}` });
  }
};
