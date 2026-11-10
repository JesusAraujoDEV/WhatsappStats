// Shared formatting + chart helpers for the page.
export const $ = (s) => document.querySelector(s);
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
export const n = (x) => Math.round(x).toLocaleString('es');
export const f1 = (x) => x.toLocaleString('es', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
export const pct = (a, b = 1) => `${((100 * a) / Math.max(1e-9, b)).toFixed(1)}%`;
export const fmtDate = (d) => new Date(d).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
export const fmtDay = (k) => fmtDate(new Date(`${k}T12:00`));
export const dur = (ms) => (ms < 60e3 ? '< 1 min' : ms < 3600e3 ? `${Math.round(ms / 60e3)} min` : `${(ms / 3600e3).toFixed(1)} h`);
export const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
export const color = (i) => (i < 4 ? css(`--a${i + 1}`) : `hsl(${(i * 67) % 360} 60% 55%)`);
export const WEEK = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
export const TYPES = { text: 'Texto', sticker: 'Stickers', image: 'Fotos', video: 'Videos', audio: 'Audios', gif: 'GIFs', media: 'Multimedia (sin desglose)', viewonce: 'Ver una vez', videonote: 'Videonotas', deleted: 'Eliminados', location: 'Ubicaciones', document: 'Documentos', contact: 'Contactos', poll: 'Encuestas' };

export const chips = (list, fmt = n) => `<div class="chips">${list.map(([k, v]) => `<span class="chip">${esc(k)} <span class="muted">${fmt(v)}</span></span>`).join('')}</div>`;
export const help = (t) => `<p class="muted help">${t}</p>`;
export const chartCard = (id, title, note = '', h = 280) => `<div class="card"><h2>${title}</h2>${note && help(note)}<div class="chart" style="height:${h}px"><canvas id="${id}"></canvas></div></div>`;
export const section = (title, body, open = false) => `<details class="sec"${open ? ' open' : ''}><summary>${title}</summary>${body}</details>`;
export const table = (head, rows) => `<div class="scroll"><table><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</table></div>`;
export const personHead = (people) => people.map((p, i) => `<span style="color:${color(i)}">${esc(p)}</span>`);

const charts = new Map();
export function chart(id, cfg) {
  charts.get(id)?.destroy();
  const el = document.getElementById(id);
  if (el) charts.set(id, new Chart(el, { ...cfg, options: { maintainAspectRatio: false, ...cfg.options } }));
}
export const stacked = (pct100) => ({ scales: { x: { stacked: true }, y: { stacked: true, ...(pct100 && { max: 100, ticks: { callback: (v) => `${v}%` } }) } } });
