// Heavy lifting off the main thread: ~10 s on a 500k-message chat.
import { parse } from './parser.js';
import { compute } from './stats.js';
import { lexicon, customCategory } from './lexicon.js';
import { rhythm } from './rhythm.js';
import { style, events } from './style.js';

let messages = [];

onmessage = ({ data }) => {
  try {
    if (data.text !== undefined) {
      const r = parse(data.text);
      messages = r.messages;
      if (!messages.length) return postMessage({ error: 'No encontré mensajes. ¿Es un export de WhatsApp?' });
      postMessage({
        s: compute(messages), rh: rhythm(messages), st: style(messages), ev: events(r.system),
        lx: lexicon(messages, data.custom.map(customCategory)),
      });
    } else {
      postMessage({ lx: lexicon(messages, data.custom.map(customCategory)) });
    }
  } catch (e) {
    postMessage({ error: `Error procesando el chat: ${e.message}` });
  }
};
