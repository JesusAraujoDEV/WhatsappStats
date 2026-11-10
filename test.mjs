// node test.mjs — synthetic chats only; real exports never go in the repo.
import assert from 'node:assert/strict';
import { parse } from './parser.js';
import { compute } from './stats.js';
import { lexicon, customCategory } from './lexicon.js';
import { rhythm } from './rhythm.js';
import { style, events } from './style.js';

const en = `27/04/24, 10:50 pm - Ana: hola jajaja 😂😂
27/04/24, 10:51 pm - Bob: STK-20231018-WA0076.webp (file attached)
27/04/24, 10:52 pm - Bob: multi
2024/01/01 [emerg] 1#1: pasted log, not a message
27/04/24, 10:53 pm - Ana: This message was deleted
28/04/24, 9:00 am - Bob: editado?<This message was edited>
28/04/24, 9:01 am - Messages and calls are end-to-end encrypted.`;

const r = parse(en);
assert.equal(r.messages.length, 5);
assert.equal(r.system.length, 1);
assert.equal(r.messages[0].date.getHours(), 22);
assert.equal(r.messages[2].text, 'multi\n2024/01/01 [emerg] 1#1: pasted log, not a message');
assert.deepEqual(r.messages.map((m) => m.type), ['text', 'sticker', 'text', 'deleted', 'text']);
assert.equal(r.messages[4].edited, true);
assert.equal(r.messages[4].date.getHours(), 9);

const de = parse(`19.02.26, 10:21 - ‎Pieraa ist ein Kontakt.
19.02.26, 23:24 - Jesús Araujo <⁠(⁠￣⁠︶⁠￣⁠)⁠: <Medien ausgeschlossen>
[03/13/26, 1:05:09 PM] Ana: ios + month-first`);
assert.equal(de.system.length, 1);
assert.equal(de.messages[0].author, 'Jesús Araujo <⁠(⁠￣⁠︶⁠￣⁠)⁠');
assert.equal(de.messages[0].type, 'media');
assert.equal(de.messages[0].date.getHours(), 23);

const iso = parse('[03/13/26, 1:05:09 PM] Ana: x\n[03/14/26, 1:05:09 AM] Bob: y');
assert.equal(iso.dayFirst, false);
assert.equal(iso.messages[0].date.getMonth(), 2);
assert.equal(iso.messages[0].date.getHours(), 13);

const s = compute(r.messages);
assert.equal(s.people[0].messages, 3); // Bob
assert.equal(s.people.find((p) => p.name === 'Ana').laughs, 1);
assert.deepEqual(s.topEmojis[0], ['😂', 2]);
assert.equal(s.streak.len, 2);
// lexicon: accents, caps and stretched letters must still count
const love = parse(`01/03/25, 08:00 - Ana: Buenos días mi amor
01/03/25, 08:00 - Bob: TE AMOOOO
01/03/25, 08:01 - Ana: teeee amo, te extraño
01/03/25, 08:30 - Bob: perdón 😂
02/03/25, 23:00 - Ana: buenas noches, que descanses
02/03/25, 23:00 - Bob: const x = { a: 1 }; null null null
05/03/25, 10:00 - Bob: holaaaa`);
const lx = lexicon(love.messages, [customCategory('mi amor')]);
assert.deepEqual(lx.cats.teamo.by, { Bob: 1, Ana: 1 });
assert.deepEqual(lx.cats.teextrano.by, { Ana: 1 });
assert.deepEqual(lx.cats.buenosdias.by, { Ana: 1 });
assert.deepEqual(lx.cats.buenasnoches.by, { Ana: 1 });
assert.deepEqual(lx.cats.perdon.by, { Bob: 1 });
assert.deepEqual(lx.cats.risa.by, { Bob: 1 });
assert.deepEqual(lx.cats['custom:mi amor'].by, { Ana: 1 });
assert.equal(lx.cats.teamo.first.Ana.day, 1);

const rh = rhythm(love.messages);
assert.equal(rh.sessions.n, 3); // 01/03 morning, 02/03 night, 05/03
assert.equal(rh.responses.Bob.n, 3);
assert.equal(rh.responses.Bob.under1, 2 / 3);
assert.equal(rh.silences[0].breaker, 'Bob');
assert.equal(rh.monthly[0].partial, true);
assert.equal(rh.weekdayAvg.reduce((a, b) => a + b), 5); // 1–5 March

const st = style(love.messages);
assert.equal(st.people.Bob.elongated, 500); // TE AMOOOO, holaaaa out of 4 texts
assert.ok(!compute(love.messages).topWords.some(([w]) => w === 'const' || w === 'null'));

assert.deepEqual(events(parse(`05.09.26, 00:00 - Du hast diese Person blockiert. Tippe, um sie freizugeben.
05.09.26, 00:01 - Du blockierst diese Person nicht mehr.`).system).map((e) => e.kind), ['Bloqueo', 'Desbloqueo']);
console.log('ok');
