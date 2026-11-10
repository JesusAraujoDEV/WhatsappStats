import { $, esc, n, pct, fmtDate, dur, css, color, chips, chartCard, section, chart, stacked, WEEK, TYPES } from './ui.js';
import { dayKey } from './util.js';
import { nombres, drawNombres, carino, drawCarino, ritmo, drawRitmo, mesames, drawMesames, estilo, drawEstilo, eventos } from './sections.js';

const worker = new Worker('worker.js', { type: 'module' });
const read = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const loadCustom = () => read('whatsappstats.custom') || [];
// Default names come from names.json, generated from the NAMES env var when the container starts (not in git).
const defaultNames = fetch('names.json').then((r) => (r.ok ? r.json() : [])).catch(() => []);
const loadNames = async () => read('whatsappstats.names') || (await defaultNames);
const splitList = (v) => v.split(',').map((w) => w.trim()).filter(Boolean).slice(0, 60);
const recount = async () => worker.postMessage({ custom: loadCustom(), names: await loadNames() });
let state = null, fileName = '';

const drop = $('#drop');
$('#file').onchange = (e) => e.target.files[0] && load(e.target.files[0]);
drop.ondragover = (e) => { e.preventDefault(); drop.classList.add('over'); };
drop.ondragleave = () => drop.classList.remove('over');
drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove('over'); e.dataTransfer.files[0] && load(e.dataTransfer.files[0]); };
$('#print').onclick = () => window.print();
window.onbeforeprint = () => document.querySelectorAll('details').forEach((d) => (d.open = true));

async function load(file) {
  fileName = file.name;
  $('#status').textContent = `Procesando ${file.name}… (un chat grande tarda unos segundos)`;
  worker.postMessage({ text: await file.text(), custom: loadCustom(), names: await loadNames() });
}

worker.onmessage = ({ data }) => {
  if (data.error) { $('#status').textContent = data.error; return; }
  if (data.s) { state = data; render(); $('#status').textContent = `${fileName} · ${n(data.s.total)} mensajes`; return; }
  state.lx = data.lx; state.mt = data.mt; renderCarino(); renderNombres();
};

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
    ['Inicia conversaciones (tras 6 h)', (p) => n(p.starts)], ['Tiempo de respuesta medio', (p) => dur(p.avgResponse)],
    ['Emojis', (p) => n(p.emojiCount)], ['Risas (jaja, xd…)', (p) => n(p.laughs)], ['Preguntas', (p) => n(p.questions)],
    ['Links', (p) => n(p.links)], ['Editados', (p) => n(p.edited)],
    ...Object.keys(TYPES).filter((t) => t !== 'text' && s.types[t]).map((t) => [TYPES[t], (p) => n(p.types[t] || 0)]),
  ];
  const head = s.people.map((p, i) => `<th style="color:${color(i)}">${esc(p.name)}</th>`).join('');
  const body = rows.map(([label, f]) => `<tr><td>${label}</td>${s.people.map((p) => `<td>${f(p)}</td>`).join('')}</tr>`).join('');
  return `<div class="card"><h2>Por persona</h2><div class="scroll"><table><tr><th></th>${head}</tr>${body}</table></div></div>`;
}

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

const names = () => state.s.people.slice(0, 12).map((p) => p.name);

function renderCarino() {
  $('#carino').innerHTML = carino(state.lx, names());
  $('#custom-input').value = loadCustom().join(', ');
  $('#custom-form').onsubmit = (e) => { e.preventDefault(); save('whatsappstats.custom', splitList($('#custom-input').value)); recount(); };
  drawCarino(state.lx, names());
}

async function renderNombres() {
  $('#nombres').innerHTML = nombres(state.mt, names(), state.s.tags);
  $('#names-input').value = (await loadNames()).join(', ');
  $('#names-form').onsubmit = (e) => { e.preventDefault(); save('whatsappstats.names', splitList($('#names-input').value)); recount(); };
  drawNombres(state.mt, names());
}

function render() {
  const { s, rh, st, ev } = state;
  const out = $('#out');
  out.hidden = false;
  out.innerHTML = `<p class="muted">${fmtDate(s.first)} → ${fmtDate(s.last)}</p>${kpis(s)}${peopleTable(s)}
    ${chartCard('months', 'Mensajes por mes')}${chartCard('daily', 'Mensajes por día', ev.length ? 'Los puntos marcan eventos (bloqueos, cambios de número…).' : '')}
    <div class="two">${chartCard('hours', 'Por hora del día')}${chartCard('weekdays', 'Por día de la semana (totales)')}</div>
    ${heatmap(s)}
    <div class="two">${chartCard('types', 'Tipos de mensaje')}${chartCard('share', 'Quién habla más')}</div>
    <div class="card"><h2>Emojis más usados</h2>${chips(s.topEmojis)}</div>
    ${chartCard('words', 'Palabras más usadas', '', 640)}${personCards(s)}
    ${section('Nombres mencionados', '<div id="nombres"></div>', s.people.length > 2)}
    ${section('Cariño', '<div id="carino"></div>')}
    ${section('Ritmo y reciprocidad', ritmo(s, rh, names()))}
    ${section('Mes a mes', mesames(rh, state.lx, names()))}
    ${section('Estilo de escritura', estilo(st, names()))}
    ${section(`Eventos (${ev.length})`, eventos(ev))}`;
  Chart.defaults.color = css('--muted');
  Chart.defaults.borderColor = css('--line');
  draw(s, ev);
  renderCarino();
  renderNombres();
  drawRitmo(s, rh, names());
  drawMesames(rh);
  drawEstilo(st);
}

function draw(s, ev) {
  const ppl = s.people.slice(0, 12);
  const perPerson = (labels, get) => ({ labels, datasets: ppl.map((p, i) => ({ label: p.name, data: get(p), backgroundColor: color(i), borderColor: color(i) })) });
  chart('months', { type: 'bar', data: perPerson(s.months.map((m) => m.month), (p) => s.months.map((m) => m.by[p.name] || 0)), options: stacked() });
  const evDays = new Map(ev.map((e) => [dayKey(e.date), e.kind]));
  const daily = [{ label: 'Mensajes', data: s.days.map((d) => d.n), borderColor: color(0), pointRadius: 0, borderWidth: 1 }];
  if (ev.length) daily.push({ label: 'Eventos', data: s.days.map((d) => (evDays.has(d.day) ? d.n : null)), showLine: false, pointRadius: 6, backgroundColor: color(1), borderColor: color(1) });
  chart('daily', { type: 'line', data: { labels: s.days.map((d) => d.day), datasets: daily }, options: { plugins: { legend: { display: ev.length > 0 }, tooltip: { callbacks: { afterLabel: (c) => (c.datasetIndex === 1 ? evDays.get(c.label) : '') } } } } });
  chart('hours', { type: 'bar', data: perPerson(Array.from({ length: 24 }, (_, h) => `${h}h`), (p) => p.hours), options: stacked() });
  chart('weekdays', { type: 'bar', data: perPerson(WEEK, (p) => p.weekdays), options: stacked() });
  const types = Object.entries(s.types).sort((a, b) => b[1] - a[1]);
  chart('types', { type: 'doughnut', data: { labels: types.map(([t]) => TYPES[t] || t), datasets: [{ data: types.map(([, v]) => v), backgroundColor: types.map((_, i) => color(i)) }] }, options: { plugins: { legend: { position: 'right' } } } });
  chart('share', { type: 'doughnut', data: { labels: ppl.map((p) => p.name), datasets: [{ data: ppl.map((p) => p.messages), backgroundColor: ppl.map((_, i) => color(i)) }] } });
  chart('words', { type: 'bar', data: { labels: s.topWords.map(([w]) => w), datasets: [{ data: s.topWords.map(([, v]) => v), backgroundColor: color(0) }] }, options: { indexAxis: 'y', plugins: { legend: { display: false } } } });
}
