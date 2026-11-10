// The collapsible deep-dive sections: Cariño, Ritmo, Mes a mes, Estilo, Eventos.
import { esc, n, f1, pct, fmtDate, fmtDay, dur, color, chips, help, chartCard, table, personHead, chart, stacked, TYPES, WEEK } from './ui.js';

const MIN_SAMPLE = 35;
const rate = (count, total) => (total >= MIN_SAMPLE ? `${n(count)} <span class="muted">(${f1((1000 * count) / total)}‰)</span>` : `${n(count)} <span class="muted">(muestra chica)</span>`);
const leader = (o = {}) => { const e = Object.entries(o).sort((a, b) => b[1] - a[1])[0]; return e ? esc(e[0]) : '—'; };
const monthLabel = (m) => `${m.month}${m.partial ? '*' : ''}`;

export function carino(lx, names) {
  const cats = Object.entries(lx.cats);
  const rows = cats.map(([, c]) => [esc(c.label), ...names.map((a) => rate(c.by[a] || 0, lx.textBy[a] || 0))]);
  const firsts = ['teamo', 'tequiero', 'teextrano', 'perdon'].filter((k) => lx.cats[k]).map((k) => [lx.cats[k].label,
    ...names.map((a) => { const f = lx.cats[k].first[a]; return f ? `${fmtDate(f.date)} <span class="muted">(día ${n(f.day)})</span>` : '—'; })]);
  return `<div class="card"><h2>Quién dijo más cada cosa</h2>
    ${help('Mensajes de texto que contienen la frase, y en paréntesis la tasa por cada 1.000 mensajes de texto de esa persona (‰). Ignora tildes, mayúsculas y letras alargadas ("TE AMOOO" cuenta).')}
    ${table(['', ...personHead(names)], rows)}
    <form id="custom-form" class="custom"><input id="custom-input" placeholder="Agrega tus palabras: gordi, mi sol, nojoda" aria-label="Palabras personalizadas"><button>Contar</button></form>
    ${help('Tus palabras se guardan solo en este navegador.')}</div>
    <div class="card"><h2>Primeras veces</h2>${help('Primer mensaje de cada persona con la frase. "Día N" cuenta desde el primer mensaje del export.')}${table(['', ...personHead(names)], firsts)}</div>
    ${chartCard('aff-months', 'Cariño por mes', 'Tasa por 1.000 mensajes de texto de ese mes. El primer y el último mes pueden estar incompletos.')}
    ${chartCard('perdon-months', 'Perdones por mes', 'Indicador de tensión, no un veredicto.')}`;
}

export function drawCarino(lx, names) {
  const months = Object.keys(lx.textMonths).sort();
  const aff = Object.values(lx.cats).filter((c) => c.affective);
  chart('aff-months', { type: 'line', data: { labels: months, datasets: aff.map((c, i) => ({ label: c.label, data: months.map((m) => (lx.textMonths[m] >= 25 ? c.monthRate[m] || 0 : null)), borderColor: color(i), backgroundColor: color(i), tension: 0.3 })) } });
  const p = lx.cats.perdon;
  chart('perdon-months', { type: 'bar', data: { labels: months, datasets: names.map((a, i) => ({ label: a, data: months.map((m) => p.monthsBy[m]?.[a] || 0), backgroundColor: color(i) })) }, options: stacked() });
}

export function ritmo(s, rh, names) {
  const R = rh.responses, S = rh.sessions;
  const kpi = [[f1(S.perDay), 'sesiones por día (corte: 1 h sin mensajes)'], [n(S.perSession), 'mensajes por sesión'],
    [dur(S.longest.end - S.longest.start), `sesión más larga · ${fmtDate(S.longest.start)} · ${n(S.longest.n)} mensajes`],
    [pct(rh.alternation), 'alternancia: mensajes que cambian de emisor'], [n(rh.medianPerDay), 'mediana de mensajes por día'],
    [n(rh.rare.low), 'días con menos de 150 mensajes'], [n(rh.rare.high), 'días con más de 1.000 mensajes'],
    [n(rh.bursts.max.n), `ráfaga más larga · ${esc(rh.bursts.max.author)} · ${fmtDate(rh.bursts.max.date)}`]];
  const rows = [
    ['Respuestas medidas', ...names.map((a) => n(R[a]?.n || 0))],
    ['Responde en < 1 min', ...names.map((a) => pct(R[a]?.under1 || 0))],
    ['p90 de respuesta', ...names.map((a) => dur(R[a]?.p90 || 0))],
    ...(R[names[0]]?.buckets || []).map(([label], i) => [`Respuestas ${label}`, ...names.map((a) => n(R[a]?.buckets[i][1] || 0))]),
    ['Abre el día (desde las 5 am)', ...names.map((a) => n(rh.opens[a] || 0))],
    ['Cierra el día', ...names.map((a) => n(rh.closes[a] || 0))],
    ['Largo medio de ráfaga', ...names.map((a) => f1(rh.bursts.avg[a] || 0))],
  ];
  const sil = rh.silences.map((g) => [dur(g.gap), fmtDate(g.from), esc(g.breaker)]);
  const days = (list) => list.map(([d, c]) => `${fmtDay(d)} <span class="muted">${n(c)}</span>`).join(' · ');
  const matrix = names.length > 2 ? `<div class="card"><h2>Quién le responde a quién</h2>${help('Fila: quien escribe. Columna: a quién le sigue (el mensaje anterior era de esa persona, menos de 6 h antes).')}
    ${table(['', ...personHead(names)], names.map((a) => [esc(a), ...names.map((b) => (a === b ? '—' : n(rh.replies[a]?.[b] || 0)))]))}</div>` : '';
  return `<div class="grid">${kpi.map(([b, t]) => `<div class="kpi"><b>${b}</b><span>${t}</span></div>`).join('')}</div>${matrix}
    <div class="card"><h2>Reciprocidad</h2>${help('Respuesta = mensaje de la otra persona tras menos de 6 h. Los timestamps son de minuto, así que se muestra el % de respuestas en menos de 1 min y el p90 (el 90 % de las respuestas llega antes de ese tiempo) en vez de la mediana. Las llamadas no se exportan.')}
    ${table(['', ...personHead(names)], rows)}</div>
    <div class="two"><div class="card"><h2>Silencios más largos</h2>${table(['Duración', 'Desde', 'Lo rompió'], sil)}</div>
    <div class="card"><h2>Días raros</h2><p class="muted">Más tranquilos</p><p>${days(rh.rare.lowest)}</p><p class="muted">Más intensos</p><p>${days(rh.rare.highest)}</p></div></div>
    <div class="two">${chartCard('weekday-avg', 'Promedio por día de la semana', 'Mensajes ÷ cantidad de ese día de la semana en el periodo.')}${chartCard('day-hist', 'Distribución de mensajes por día', 'Incluye los días sin mensajes.')}</div>
    ${chartCard('weeks', 'Mensajes por día, semana a semana', 'Promedio diario de cada semana (lunes a domingo).')}`;
}

export function drawRitmo(s, rh, names) {
  chart('weekday-avg', { type: 'bar', data: { labels: WEEK, datasets: s.people.filter((p) => names.includes(p.name)).map((p, i) => ({ label: p.name, data: p.weekdays.map((v, d) => v / Math.max(1, rh.weekdayAvg[d])), backgroundColor: color(i) })) }, options: stacked() });
  chart('day-hist', { type: 'bar', data: { labels: rh.dayHistogram.map(([l]) => l), datasets: [{ data: rh.dayHistogram.map(([, v]) => v), backgroundColor: color(0) }] }, options: { plugins: { legend: { display: false } } } });
  chart('weeks', { type: 'bar', data: { labels: rh.weeks.map((w) => w.week), datasets: names.map((a, i) => ({ label: a, data: rh.weeks.map((w) => (w.by[a] || 0) / 7), backgroundColor: color(i) })) }, options: stacked() });
}

export function mesames(rh, lx, names) {
  const maxM = rh.monthly.reduce((b, m) => (m.perDay > b.perDay ? m : b), rh.monthly[0]);
  const rows = rh.monthly.map((m, i) => {
    const prev = rh.monthly[i - 1], delta = prev ? (m.perDay - prev.perDay) / prev.perDay : null;
    const cells = [monthLabel(m), n(m.perDay), delta === null ? '—' : `<span class="${delta >= 0 ? 'up' : 'down'}">${delta >= 0 ? '+' : ''}${pct(delta)}</span>`,
      ...names.map((a) => pct(m.by[a] || 0, m.n)), pct(m.under1), dur(m.p90), pct(m.night, m.n), f1(m.sessionsPerDay), n(m.perSession),
      leader(m.starts), leader(m.opens), n(lx.cats.teamo.months[m.month] || 0), n(lx.cats.perdon.months[m.month] || 0), esc(m.topEmojis.map(([e]) => e).join(' '))];
    return m === maxM ? cells.map((c) => `<b>${c}</b>`) : cells;
  });
  return `<div class="card"><h2>Mes a mes</h2>${help('* = mes incompleto, calculado sobre sus días reales. En negrita, el mes con más mensajes por día. Madrugada = 0 a 5 h.')}
    ${table(['Mes', 'Msj/día', 'Δ', ...personHead(names).map((p) => `% ${p}`), '< 1 min', 'p90', 'Madrugada', 'Sesiones/día', 'Msj/sesión', 'Inicia', 'Abre el día', 'Te amo', 'Perdón', 'Emojis top'], rows)}</div>
    ${chartCard('bands', 'Franjas horarias por mes', 'Reparto de los mensajes de cada mes por franja. Los cambios en la madrugada suelen marcar cambios de etapa.')}`;
}

export function drawMesames(rh) {
  const labels = rh.monthly.map(monthLabel), B = ['0–5 h', '5–12 h', '12–18 h', '18–24 h'];
  chart('bands', { type: 'bar', data: { labels, datasets: B.map((b, i) => ({ label: b, data: rh.monthly.map((m) => (100 * m.bands[i]) / m.n), backgroundColor: color(i) })) }, options: stacked(true) });
}

export function estilo(st, names) {
  const P = names.map((a) => st.people[a]).filter(Boolean);
  const rows = [
    ['Palabras por mensaje (media / mediana)', ...P.map((p) => `${f1(p.avgWords)} / ${n(p.medianWords)}`)],
    ['Mensajes de 1 palabra', ...P.map((p) => pct(p.one))], ['Mensajes de 15+ palabras', ...P.map((p) => pct(p.long))],
    ['Letras alargadas ("holaaaa") ‰', ...P.map((p) => f1(p.elongated))], ['MAYÚSCULAS ‰', ...P.map((p) => f1(p.caps))],
    ['Exclamaciones ‰', ...P.map((p) => f1(p.excl))],
    ...['😭', '💔', '❤️'].map((h) => [`${h} ‰`, ...P.map((p) => f1(p.hearts[h]))]),
    ['Vocabulario distinto', ...P.map((p) => n(p.uniqueWords))], ['Multimedia', ...P.map((p) => pct(p.mediaShare))],
  ];
  const cards = names.map((a, i) => st.people[a] && `<div class="card"><h2 style="color:${color(i)}">${esc(a)}</h2>
    <p class="muted">Palabras distintivas (las usa más que el resto, mínimo 35 veces)</p>${chips(st.people[a].distinctive.map(([w, , c]) => [w, c]))}
    <p class="muted">Links por dominio</p>${st.people[a].domains.length ? chips(st.people[a].domains) : '<p class="muted">—</p>'}</div>`).join('');
  const months = st.months.map((m) => [m.month, chips(m.words.map(([w, , c]) => [w, c]))]);
  return `<div class="card"><h2>Cómo escribe cada uno</h2>${help('‰ = por cada 1.000 mensajes de texto. Las palabras excluyen stopwords, números, links y código pegado.')}${table(['', ...personHead(names)], rows)}</div>
    <div class="two">${cards}</div>
    <div class="card"><h2>Palabras que suben cada mes</h2>${help('Palabras más típicas de ese mes frente al resto del chat (log-odds, mínimo 25 usos en el mes).')}${table(['Mes', 'Palabras'], months)}</div>
    ${chartCard('media-months', 'Multimedia por mes', 'Si el export se hizo sin archivos, todo aparece como "Multimedia (sin desglose)".')}`;
}

export function drawEstilo(st) {
  const labels = st.media.map((m) => m.month);
  const types = [...new Set(st.media.flatMap((m) => Object.keys(m.types)))];
  chart('media-months', { type: 'bar', data: { labels, datasets: types.map((t, i) => ({ label: TYPES[t] || t, data: st.media.map((m) => m.types[t] || 0), backgroundColor: color(i) })) }, options: stacked() });
}

export function nombres(mt, names) {
  const rows = mt.map((r) => [esc(r.name), `<b>${n(r.total)}</b>`, ...names.map((a) => n(r.by[a] || 0))]);
  return `<div class="card"><h2>Quién nombra a quién</h2>${help('Veces que aparece cada nombre en mensajes de texto. Ignora mayúsculas, tildes y letras repetidas ("Pieraa" cuenta como "piera"). Cada variante (marian / mariana) cuenta aparte.')}
    <form id="names-form" class="custom"><input id="names-input" placeholder="Mariana, Oriana, Marci…" aria-label="Nombres a contar"><button>Contar</button></form>
    ${help('La lista se guarda solo en este navegador.')}
    ${mt.length ? table(['Nombre', 'Total', ...personHead(names)], rows) : help('Agrega nombres para empezar.')}</div>
    ${mt.length ? chartCard('names-chart', 'Nombres más mencionados', '', Math.max(240, mt.length * 28)) : ''}`;
}

export function drawNombres(mt, names) {
  if (!mt.length) return;
  chart('names-chart', { type: 'bar', data: { labels: mt.map((r) => r.name), datasets: names.map((a, i) => ({ label: a, data: mt.map((r) => r.by[a] || 0), backgroundColor: color(i) })) }, options: { indexAxis: 'y', ...stacked() } });
}

export function eventos(ev) {
  if (!ev.length) return help('El export no tiene eventos de sistema (bloqueos, cambios de número, cambios en el grupo).');
  return `<div class="card">${help('Marcados también en el gráfico "Mensajes por día".')}${table(['Fecha', 'Evento', 'Texto'], ev.map((e) => [fmtDate(e.date), e.kind, esc(e.text)]))}</div>`;
}
