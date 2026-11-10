import { parse } from './parser.js';
import { compute } from './stats.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const n = (x) => Math.round(x).toLocaleString('es');
const pct = (a, b) => `${((100 * a) / Math.max(1, b)).toFixed(1)}%`;
const fmtDate = (d) => new Date(d).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
const dur = (ms) => (ms < 60e3 ? '< 1 min' : ms < 3600e3 ? `${Math.round(ms / 60e3)} min` : `${(ms / 3600e3).toFixed(1)} h`);
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const color = (i) => (i < 4 ? css(`--a${i + 1}`) : `hsl(${(i * 67) % 360} 60% 55%)`);
const WEEK = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const TYPES = { text: 'Texto', sticker: 'Stickers', image: 'Fotos', video: 'Videos', audio: 'Audios', gif: 'GIFs', media: 'Multimedia (omitida)', viewonce: 'Ver una vez', videonote: 'Videonotas', deleted: 'Eliminados', location: 'Ubicaciones', document: 'Documentos', contact: 'Contactos', poll: 'Encuestas' };
const charts = [];

const drop = $('#drop');
$('#file').onchange = (e) => e.target.files[0] && load(e.target.files[0]);
drop.ondragover = (e) => { e.preventDefault(); drop.classList.add('over'); };
drop.ondragleave = () => drop.classList.remove('over');
drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove('over'); e.dataTransfer.files[0] && load(e.dataTransfer.files[0]); };

async function load(file) {
  $('#status').textContent = `Procesando ${file.name}…`;
  const text = await file.text();
  await new Promise((r) => setTimeout(r, 30)); // let the status paint before the heavy work
  const { messages } = parse(text);
  if (!messages.length) { $('#status').textContent = 'No encontré mensajes. ¿Es un export de WhatsApp?'; return; }
  render(compute(messages));
  $('#status').textContent = `${file.name} · ${n(messages.length)} mensajes`;
}

function kpis(s) {
  const items = [
    [n(s.total), 'mensajes'], [n(s.words), 'palabras'], [n(s.spanDays), 'días de chat'],
    [`${n(s.activeDays)} (${pct(s.activeDays, s.spanDays)})`, 'días con mensajes'], [s.avgPerDay.toFixed(1), 'mensajes por día'],
    [`${s.streak.len} días`, `racha más larga · ${fmtDate(s.streak.start)} → ${fmtDate(s.streak.end)}`],
    [n(s.busiest.n), `día más activo · ${fmtDate(s.busiest.day)}`],
    [s.silence.gap ? `${s.silence.gap} días` : 'ninguno', s.silence.gap ? `silencio más largo · ${fmtDate(s.silence.from)}` : 'silencio de más de un día'],
  ];
  return `<div class="grid">${items.map(([b, t]) => `<div class="kpi"><b>${b}</b><span>${esc(t)}</span></div>`).join('')}</div>`;
}

function peopleTable(s) {
  const rows = [
    ['Mensajes', (p) => `${n(p.messages)} (${pct(p.messages, s.total)})`], ['Palabras', (p) => n(p.words)],
    ['Letras por mensaje', (p) => p.avgLen.toFixed(1)], ['Días activos', (p) => n(p.activeDays)],
    ['Inicia conversaciones', (p) => n(p.starts)], ['Tiempo de respuesta medio', (p) => dur(p.avgResponse)],
    ['Emojis', (p) => n(p.emojiCount)], ['Risas (jaja, xd…)', (p) => n(p.laughs)], ['Preguntas', (p) => n(p.questions)],
    ['Links', (p) => n(p.links)], ['Editados', (p) => n(p.edited)],
    ...Object.keys(TYPES).filter((t) => t !== 'text' && s.types[t]).map((t) => [TYPES[t], (p) => n(p.types[t] || 0)]),
  ];
  const head = s.people.map((p, i) => `<th style="color:${color(i)}">${esc(p.name)}</th>`).join('');
  const body = rows.map(([label, f]) => `<tr><td>${label}</td>${s.people.map((p) => `<td>${f(p)}</td>`).join('')}</tr>`).join('');
  return `<div class="card"><h2>Por persona</h2><div class="scroll"><table><tr><th></th>${head}</tr>${body}</table></div></div>`;
}

const chips = (list) => `<div class="chips">${list.map(([k, v]) => `<span class="chip">${esc(k)} <span class="muted">${n(v)}</span></span>`).join('')}</div>`;

function personCards(s) {
  return `<div class="two">${s.people.slice(0, 12).map((p, i) => `<div class="card"><h2 style="color:${color(i)}">${esc(p.name)}</h2>
    <p class="muted">Emojis favoritos</p>${chips(p.topEmojis)}
    <p class="muted">Palabras favoritas</p>${chips(p.topWords)}
    <details><summary class="muted">Mensaje más largo (${n(p.longest.length)} letras)</summary><pre>${esc(p.longest)}</pre></details></div>`).join('')}</div>`;
}

function heatmap(s) {
  const max = Math.max(...s.heat.flat(), 1);
  const cells = s.heat.map((row, d) => `<span>${WEEK[d]}</span>${row.map((v, h) =>
    `<div title="${WEEK[d]} ${h}:00 · ${n(v)}" style="background:color-mix(in srgb, var(--accent) ${Math.round((100 * v) / max)}%, var(--bg))"></div>`).join('')}`).join('');
  const hours = Array.from({ length: 24 }, (_, h) => `<span>${h % 3 ? '' : h}</span>`).join('');
  return `<div class="card"><h2>Cuándo hablan (día × hora)</h2><div class="heat">${cells}<span></span>${hours}</div></div>`;
}

const chartCard = (id, title) => `<div class="card"><h2>${title}</h2><div class="chart"><canvas id="${id}"></canvas></div></div>`;

function render(s) {
  const out = $('#out');
  out.hidden = false;
  out.innerHTML = `<p class="muted">${fmtDate(s.first)} → ${fmtDate(s.last)}</p>${kpis(s)}${peopleTable(s)}
    ${chartCard('months', 'Mensajes por mes')}${chartCard('daily', 'Mensajes por día')}
    <div class="two">${chartCard('hours', 'Por hora del día')}${chartCard('weekdays', 'Por día de la semana')}</div>
    ${heatmap(s)}
    <div class="two">${chartCard('types', 'Tipos de mensaje')}${chartCard('share', 'Quién habla más')}</div>
    <div class="card"><h2>Emojis más usados</h2>${chips(s.topEmojis)}</div>
    ${chartCard('words', 'Palabras más usadas')}${personCards(s)}`;
  draw(s);
}

function draw(s) {
  charts.splice(0).forEach((c) => c.destroy());
  Chart.defaults.color = css('--muted');
  Chart.defaults.borderColor = css('--line');
  const ppl = s.people.slice(0, 12);
  const mk = (id, cfg) => charts.push(new Chart($(`#${id}`), { ...cfg, options: { maintainAspectRatio: false, ...cfg.options } }));
  const perPerson = (labels, get) => ({ labels, datasets: ppl.map((p, i) => ({ label: p.name, data: get(p), backgroundColor: color(i), borderColor: color(i) })) });
  const stacked = { scales: { x: { stacked: true }, y: { stacked: true } } };

  mk('months', { type: 'bar', data: perPerson(s.months.map((m) => m.month), (p) => s.months.map((m) => m.by[p.name] || 0)), options: stacked });
  mk('daily', { type: 'line', data: { labels: s.days.map((d) => d.day), datasets: [{ label: 'Mensajes', data: s.days.map((d) => d.n), borderColor: color(0), pointRadius: 0, borderWidth: 1 }] }, options: { plugins: { legend: { display: false } } } });
  mk('hours', { type: 'bar', data: perPerson(Array.from({ length: 24 }, (_, h) => `${h}h`), (p) => p.hours), options: stacked });
  mk('weekdays', { type: 'bar', data: perPerson(WEEK, (p) => p.weekdays), options: stacked });
  const types = Object.entries(s.types).sort((a, b) => b[1] - a[1]);
  mk('types', { type: 'doughnut', data: { labels: types.map(([t]) => TYPES[t] || t), datasets: [{ data: types.map(([, v]) => v), backgroundColor: types.map((_, i) => color(i)) }] }, options: { plugins: { legend: { position: 'right' } } } });
  mk('share', { type: 'doughnut', data: { labels: ppl.map((p) => p.name), datasets: [{ data: ppl.map((p) => p.messages), backgroundColor: ppl.map((_, i) => color(i)) }] } });
  mk('words', { type: 'bar', data: { labels: s.topWords.map(([w]) => w), datasets: [{ data: s.topWords.map(([, v]) => v), backgroundColor: color(0) }] }, options: { indexAxis: 'y', plugins: { legend: { display: false } } } });
  $('#words').parentElement.style.height = '640px';
}
