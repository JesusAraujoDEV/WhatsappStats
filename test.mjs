// node test.mjs — synthetic chats only; real exports never go in the repo.
import assert from 'node:assert/strict';
import { parse } from './parser.js';
import { compute } from './stats.js';

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
console.log('ok');
