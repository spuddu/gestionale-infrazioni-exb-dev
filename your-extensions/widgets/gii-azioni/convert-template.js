#!/usr/bin/env node
/**
 * convert-template.js — Legge il template .htm (salvato da Word) e genera rapporto-template.ts
 * 
 * Workflow:
 *   1. Apri rapporto-template.docx in Word
 *   2. Modifica il layout e i {{placeholder}} come vuoi
 *   3. File > Salva con nome > Tipo: Pagina Web (*.htm, *.html)
 *   4. Lancia: node convert-template.js
 *   5. Deploy
 */

const fs = require('fs')
const path = require('path')

const inputFile = process.argv[2] || path.join(__dirname, 'rapporto-template.htm')
const outputFile = path.join(__dirname, 'src', 'runtime', 'rapporto-template.ts')

if (!fs.existsSync(inputFile)) {
  console.error('File non trovato: ' + inputFile)
  process.exit(1)
}

console.log('Lettura: ' + inputFile)

// ── Fix encoding ──────────────────────────────────────────────────────────────
// Word "Pagina Web" produce un file misto: UTF-8 con alcuni byte windows-1252
// e alcuni caratteri già corrotti in U+FFFD (EF BF BD).

var buf = fs.readFileSync(inputFile)

// Step 1: Sostituisci byte raw windows-1252 (0x80-0x9F) con i corrispondenti UTF-8
var win1252toUtf8 = {
  0x80: Buffer.from('\u20AC'),  // €
  0x82: Buffer.from('\u201A'),  // ‚
  0x83: Buffer.from('\u0192'),  // ƒ
  0x84: Buffer.from('\u201E'),  // „
  0x85: Buffer.from('\u2026'),  // …
  0x86: Buffer.from('\u2020'),  // †
  0x87: Buffer.from('\u2021'),  // ‡
  0x88: Buffer.from('\u02C6'),  // ˆ
  0x89: Buffer.from('\u2030'),  // ‰
  0x8A: Buffer.from('\u0160'),  // Š
  0x8B: Buffer.from('\u2039'),  // ‹
  0x8C: Buffer.from('\u0152'),  // Œ
  0x8E: Buffer.from('\u017D'),  // Ž
  0x91: Buffer.from('\u2018'),  // '
  0x92: Buffer.from('\u2019'),  // '
  0x93: Buffer.from('\u201C'),  // "
  0x94: Buffer.from('\u201D'),  // "
  0x95: Buffer.from('\u2022'),  // •
  0x96: Buffer.from('\u2013'),  // –
  0x97: Buffer.from('\u2014'),  // —
  0x98: Buffer.from('\u02DC'),  // ˜
  0x99: Buffer.from('\u2122'),  // ™
  0x9A: Buffer.from('\u0161'),  // š
  0x9B: Buffer.from('\u203A'),  // ›
  0x9C: Buffer.from('\u0153'),  // œ
  0x9E: Buffer.from('\u017E'),  // ž
  0x9F: Buffer.from('\u0178'),  // Ÿ
}

// Ricostruisci il buffer sostituendo i byte 0x80-0x9F
var chunks = []
for (var i = 0; i < buf.length; i++) {
  var b = buf[i]
  if (win1252toUtf8[b]) {
    chunks.push(win1252toUtf8[b])
  } else {
    chunks.push(buf.slice(i, i + 1))
  }
}
var fixedBuf = Buffer.concat(chunks)
var html = fixedBuf.toString('utf-8')

// Step 2: Ripara caratteri U+FFFD (già corrotti nel file) con sostituzione contestuale
html = html.replace(/pi\uFFFD di pagina/g, 'pi\u00E8 di pagina')           // piè di pagina
html = html.replace(/Pi\uFFFD di pagina/g, 'Pi\u00E8 di pagina')           // Piè di pagina
html = html.replace(/dell\uFFFD/g, 'dell\u2019')                            // dell'acqua → dell'acqua  
html = html.replace(/Gravit\uFFFD/g, 'Gravit\u00E0')                        // Gravità
html = html.replace(/Localit\uFFFD/g, 'Localit\u00E0')
html = html.replace(/reperibilit\uFFFD/g, 'reperibilit\u00E0')
html = html.replace(/pi\uFFFD di lista/g, 'pi\u00E8 di lista')             // piè di lista (€)
html = html.replace(/'>\uFFFD <\/span>-/g, "'>\u00A0</span>-")            // nbsp before dash                      // Località
html = html.replace(/DISTRETTO 1 \uFFFD SAN/g, 'DISTRETTO 1 \u2013 SAN')   // – (en-dash)
// Spazi speciali prima di - e ANNO
html = html.replace(/\uFFFD -/g, '\u00A0-')                                  // nbsp before dash
html = html.replace(/\uFFFD\r?\n\s*<\/span>ANNO/g, '\u00A0</span>ANNO')     // nbsp before ANNO

// Pulizia residua di eventuali FFFD rimasti
var fffdCount = (html.match(/\uFFFD/g) || []).length
if (fffdCount > 0) {
  console.warn('AVVISO: ' + fffdCount + ' caratteri U+FFFD ancora presenti (non riparati)')
}

// ── Fix 3: Charset meta tag ──────────────────────────────────────────────────
html = html.replace(/charset=windows-1252/gi, 'charset=utf-8')

// ── Fix 4: Pulisci tag HTML dentro {{placeholder}} ──────────────────────────
html = html.replace(/\{\{((?:(?!\}\}).)*)\}\}/gs, function(match) {
  var inner = match.slice(2, -2).replace(/<[^>]*>/g, '').replace(/\s+/g, '').trim()
  return '{{' + inner + '}}'
})

// ── Fix 5: Rimuovi riferimenti a file esterni ────────────────────────────────
html = html.replace(/<link[^>]*href="rapporto-template_file\/[^"]*"[^>]*>/gi, '')
html = html.replace(/url\("rapporto-template_file\/[^"]*"\)\s*\w*/gi, '""')

// ── Fix 6: CSS stampa ───────────────────────────────────────────────────────
var printCss = '\n<style>\n' +
  '@page {\n  size: A4;\n  margin: 2cm 1.5cm 1.5cm 1.5cm;\n}\n' +
  '@media print {\n  html, body {\n    -webkit-print-color-adjust: exact;\n    print-color-adjust: exact;\n  }\n}\n' +
  '</style>\n'
html = html.replace('</head>', printCss + '</head>')

// ── Genera .ts ──────────────────────────────────────────────────────────────
var escaped = html.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')

var tsContent = [
  '// =================================================================',
  '// Template HTML del Rapporto Tecnico di Rilevazione',
  '// =================================================================',
  '// Generato da: node convert-template.js',
  '// Sorgente: ' + path.basename(inputFile),
  '// Data: ' + new Date().toISOString(),
  '// =================================================================',
  '// NON MODIFICARE QUESTO FILE. Modifica il .docx, salva come .htm, rilancia.',
  '// =================================================================',
  '',
  'export const RAPPORTO_TEMPLATE = `' + escaped + '`',
  ''
].join('\n')

var dir = path.dirname(outputFile)
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
fs.writeFileSync(outputFile, tsContent, 'utf-8')

// ── Report ──────────────────────────────────────────────────────────────────
var placeholders = html.match(/\{\{[^}]+\}\}/g) || []
var unique = []
placeholders.forEach(function(p) { if (unique.indexOf(p) < 0) unique.push(p) })
unique.sort()
console.log('Generato: ' + outputFile)
console.log('Placeholder: ' + placeholders.length + ' (' + unique.length + ' unici)')
unique.forEach(function(p) { console.log('  ' + p) })

var expected = ['cod_pratica','anno','area_label','settore_label','tecnico_rilevatore',
  'data_rilevazione','ora_rilevazione','descrizione_fatti','circostanze',
  'denominazione','cf_piva','via','civico','citta','telefono','email_pec',
  'presenza_trasgressore','firma_tr','firma_ti','firma_rz','firma_ri','firma_dt']
var missing = expected.filter(function(e) { return unique.indexOf('{{' + e + '}}') < 0 })
if (missing.length > 0) {
  console.log('\nATTENZIONE - Placeholder mancanti:')
  missing.forEach(function(m) { console.log('  {{' + m + '}}') })
}
