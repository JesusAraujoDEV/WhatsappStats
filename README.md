# WhatsApp Stats

Estadísticas de un chat de WhatsApp exportado: mensajes por persona, palabras, emojis, risas, quién inicia las conversaciones, tiempo de respuesta, rachas, silencios, actividad por mes/día/hora, heatmap, tipos de mensaje (stickers, audios, fotos…) y palabras favoritas.

**Úsalo:** https://whatsappstats.jesusaraujo.lat — exporta el chat (*Exportar chat → Sin archivos*) y suelta el `.txt`.

Todo corre en tu navegador; el chat nunca sale de tu equipo.

Soporta exports de Android e iOS en español, inglés y alemán, con formato de 12 h o 24 h y fechas dd/mm o mm/dd.

## Desarrollo

Sin build ni dependencias. Para servirlo en local usa `npx serve`; para los tests, `node test.mjs`.
