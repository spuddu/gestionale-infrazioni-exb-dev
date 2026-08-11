// _shared/gii-anteprime/documenti-amministrativi/bozza-determinazione/bozza-determinazione-map.ts
//
// Unica fonte di verità per la mappatura dati -> segnaposto usata per generare
// il DOCX di lavoro della determinazione dirigenziale. Il PDF verificato nel
// fascicolo non viene costruito da questo modulo: è il PDF caricato dal TI_AMM.
//
// Deliberatamente autonomo: non dipende dal livello di formattazione campi di
// gii-editing-amm (pdfFieldValue/getFieldInfo/domainLabel), che è generico e
// usato per scopi non legati a questo documento. Le etichette dei domini
// codificati necessarie qui (area_cod, settore_cod, tipo_atto_amm) sono
// hardcoded e verificate contro lo schema del Feature Layer madre.

function pickAttrCI (data: any, names: string[]): any {
  if (!data || typeof data !== 'object') return undefined
  for (const n of names) {
    if (Object.prototype.hasOwnProperty.call(data, n)) return data[n]
  }
  const keys = Object.keys(data)
  for (const n of names) {
    const found = keys.find(k => k.toLowerCase() === String(n).toLowerCase())
    if (found) return data[found]
  }
  return undefined
}

function toDateObj (v: any): Date | null {
  if (v == null || v === '') return null
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v
  const n = Number(v)
  if (Number.isFinite(n) && Math.abs(n) > 1000000000) {
    const d = new Date(n)
    return Number.isNaN(d.getTime()) ? null : d
  }
  if (typeof v === 'string') {
    const d = new Date(v)
    return Number.isNaN(d.getTime()) ? null : d
  }
  return null
}

function formatDateValue (v: any): string {
  const d = toDateObj(v)
  if (!d) return ''
  return d.toLocaleDateString('it-IT')
}

function parseNumberInput (v: any): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  let s = String(v ?? '').trim().replace(/\s+/g, '')
  if (!s) return null
  const hasComma = s.includes(',')
  const dotCount = (s.match(/\./g) || []).length
  if (hasComma) {
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (dotCount > 1) {
    s = s.replace(/\./g, '')
  } else if (dotCount === 1) {
    const parts = s.split('.')
    if (parts[1]?.length === 3 && parts[0]?.length <= 3) s = parts.join('')
  }
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

function formatDecimalIt (value: number, fractionDigits = 2): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return ''
  const sign = n < 0 ? '-' : ''
  const fixed = Math.abs(n).toFixed(fractionDigits)
  const [integerPart, decimalPart] = fixed.split('.')
  const groupedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return decimalPart != null ? `${sign}${groupedInteger},${decimalPart}` : `${sign}${groupedInteger}`
}

function formatEuroText (v: any): string {
  const n = typeof v === 'number' ? v : parseNumberInput(v)
  if (n == null || !Number.isFinite(n)) return ''
  return `${formatDecimalIt(n, 2)} €`
}

function normalizeToken (v: any): string {
  return String(v ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

function joinParts (...parts: string[]): string {
  return parts.map(p => String(p || '').trim()).filter(Boolean).join(' ')
}

function joinItalianTextList (values: string[]): string {
  const clean = values.map(v => String(v || '').trim()).filter(Boolean)
  if (clean.length <= 1) return clean[0] || ''
  if (clean.length === 2) return `${clean[0]} e ${clean[1]}`
  return `${clean.slice(0, -1).join(', ')} e ${clean[clean.length - 1]}`
}

function normalizeArticleNumber (raw: any): string {
  const m = String(raw ?? '').match(/(\d{1,2})(?:\.\d+)?/)
  return m ? String(Number(m[1])) : ''
}

// --- codice rapporto / rilevazione (identico a gii-editing-amm) ---

function cleanReportCodeText (raw: any): string {
  return String(raw ?? '')
    .trim()
    .replace(/^rapporto\s+tecnico\s+n\.?\s*/i, '')
    .replace(/^rapporto\s+n\.?\s*/i, '')
    .replace(/^rilevazione\s+n\.?\s*/i, '')
    .replace(/^rilevazione\s*/i, '')
    .trim()
}

function normalizeSectorCodeForAmm (value: any): string {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const upper = raw.toUpperCase().replace(/[–—]/g, '-').replace(/\s+/g, ' ')
  const direct = upper.match(/\b(D[1-6]|DS|CR|GI)\b/)
  if (direct) return direct[1]
  const distretto = upper.match(/DISTRETTO\s*([1-6])/) || upper.match(/\bD\.?\s*([1-6])\b/)
  if (distretto) return `D${distretto[1]}`
  if (/DRENO|SCOLO|TECNICO/.test(upper)) return 'DS'
  if (/CATASTO|RUOLI|SERVIZI TERRITORIALI/.test(upper)) return 'CR'
  if (/GESTIONE IRRIGUA/.test(upper)) return 'GI'
  return ''
}

function settoreCodeFromUfficioAmm (value: any): string {
  const upper = String(value || '').toUpperCase()
  if (!upper) return ''
  if (/QUARTU|VILLAPUTZU|MURAVERA|SAN SPERATE/.test(upper)) return 'D1'
  if (/SERRAMANNA|PIMPISU/.test(upper)) return 'D2'
  if (/SAN GAVINO|VILLACIDRO/.test(upper)) return 'D3'
  if (/SAN GIOVANNI SUERGIU|MASAINAS|BASSO SULCIS/.test(upper)) return 'D4'
  if (/SENORB/.test(upper)) return 'D5'
  if (/IGLESIAS|SILIQUA|VILLASOR|CIXERRI/.test(upper)) return 'D6'
  return ''
}

function normalizeRilevazioneCodeForAmm (data: any, oid: number | null): string {
  const d = data || {}
  const stored = cleanReportCodeText(pickAttrCI(d, ['numero_rilevazione', 'Numero_rilevazione', 'NUMERO_RILEVAZIONE', 'cod_pratica', 'Cod_pratica', 'COD_PRATICA', 'numero_rapporto', 'Numero_rapporto', 'NUMERO_RAPPORTO']))
  const raw = stored.toUpperCase().replace(/_/g, '-').replace(/\s+/g, '-')
  const op = pickAttrCI(d, ['origine_pratica', 'Origine_pratica', 'ORIGINE_PRATICA'])
  let prefix = (op === 2 || op === '2' || String(op || '').toUpperCase() === 'TI') ? 'TI' : 'TR'
  let oidPart = oid != null && Number.isFinite(Number(oid)) ? String(Number(oid)) : ''
  let settore = normalizeSectorCodeForAmm(pickAttrCI(d, ['settore_cod', 'Settore_cod', 'SETTORE_COD', 'settore', 'Settore', 'SETTORE'])) || settoreCodeFromUfficioAmm(pickAttrCI(d, ['ufficio_zona', 'Ufficio_zona', 'UFFICIO_ZONA']))

  let m = raw.match(/^(TR|TI)-?(\d+)(?:-([A-Z0-9]+))?$/i)
  if (m) {
    prefix = m[1].toUpperCase()
    oidPart = m[2]
    if (!settore && m[3]) settore = normalizeSectorCodeForAmm(m[3]) || m[3].toUpperCase()
  } else {
    m = raw.match(/^(\d+)-?(TR|TI)(?:-([A-Z0-9]+))?$/i)
    if (m) {
      oidPart = m[1]
      prefix = m[2].toUpperCase()
      if (!settore && m[3]) settore = normalizeSectorCodeForAmm(m[3]) || m[3].toUpperCase()
    } else if (!oidPart && /^\d+$/.test(raw)) {
      oidPart = raw
    }
  }

  const base = oidPart || stored || '—'
  if (base === '—') return base
  return settore ? `${base}-${prefix}-${settore}` : `${base}-${prefix}`
}

function normalizeReportCode (raw: any, oid: number | null): string {
  const code = cleanReportCodeText(raw)
  if (code) {
    const normalized = code.toUpperCase().replace(/_/g, '-').replace(/\s+/g, '-')
    if (/^(TR|TI)-?\d+(?:-[A-Z0-9]+)?$/.test(normalized) || /^\d+-?(TR|TI)(?:-[A-Z0-9]+)?$/.test(normalized)) return ''
    return /^\d+$/.test(code) ? `R-${code}` : code
  }
  return ''
}

// --- rilevazione degli articoli violati (equivalente a buildViolationRows,
// ma limitata a determinare QUALI articoli si applicano, senza costruire le
// righe di dettaglio - qui non servono) ---

const DIRECT_ARTICLE_FIELDS: string[] = ['08', '12', '27', '28', '29', '30', '31', '32', '33', '34', '35', '36', '37', '39']

function isCheckedValue (v: any): boolean {
  return v === true || v === 1 || v === '1' || String(v ?? '').trim().toLowerCase() === 'si' || String(v ?? '').trim().toLowerCase() === 'sì'
}

function art15Applies (d: any): boolean {
  const norma15Parziale = pickAttrCI(d, ['norma15_parziale'])
  const norma15Totale = pickAttrCI(d, ['norma15_totale'])
  if (norma15Parziale != null && norma15Parziale !== '') return true
  if (norma15Totale != null && norma15Totale !== '') return true

  // Fallback: pratiche in cui il numero di superficie è stato inserito senza
  // valorizzare la tendina norma15_parziale/totale (dato storico/di passaggio).
  // Replica solo il gate di rilevanza di deriveArt15FallbackCase, non la scelta
  // del codice caso (qui irrilevante: serve solo sapere se l'art. 15 si applica).
  const dichiarata = parseNumberInput(pickAttrCI(d, ['sup_dichiarata_art15']))
  const irrigata = parseNumberInput(pickAttrCI(d, ['sup_irrigata_art15']))
  if (irrigata == null || irrigata <= 0) return false
  const tipo = normalizeToken(pickAttrCI(d, ['tipo_prelievo']) ?? pickAttrCI(d, ['tipo_abuso']))
  const totale = tipo.includes('TOTALE') || dichiarata == null || dichiarata <= 0
  const parziale = tipo.includes('PARZIALE') || (!totale && dichiarata != null && irrigata > dichiarata)
  return totale || parziale
}

function art16Applies (d: any): boolean {
  const raw = String(pickAttrCI(d, ['norma16_17']) ?? '').toLowerCase()
  return raw.includes('art16')
}

function art17Applies (d: any): boolean {
  const raw = String(pickAttrCI(d, ['norma16_17']) ?? '').toLowerCase()
  const art17Tipo = pickAttrCI(d, ['art17_tipo'])
  return raw.includes('art17') || (art17Tipo != null && art17Tipo !== '')
}

function getViolatedArticleNumbers (data: any): string[] {
  const d = data || {}
  const numbers: string[] = []
  if (art15Applies(d)) numbers.push('15')
  if (art16Applies(d)) numbers.push('16')
  if (art17Applies(d)) numbers.push('17')
  for (const art of DIRECT_ARTICLE_FIELDS) {
    if (isCheckedValue(pickAttrCI(d, [`v_art${art}`]))) numbers.push(art)
  }
  return numbers
}

function buildArticleReference (data: any): { elenco: string, riferimento: string } {
  const rows = getViolatedArticleNumbers(data)
  const seen = new Set<string>()
  const numbers: string[] = []
  rows.forEach(raw => {
    const n = normalizeArticleNumber(raw)
    if (n && !seen.has(n)) {
      seen.add(n)
      numbers.push(n)
    }
  })
  numbers.sort((a, b) => Number(a) - Number(b))
  if (!numbers.length) return { elenco: '', riferimento: 'dell’art. ____' }
  if (numbers.length === 1) return { elenco: `art. ${numbers[0]}`, riferimento: `dell’art. ${numbers[0]}` }
  return { elenco: joinItalianTextList(numbers.map(n => `art. ${n}`)), riferimento: `degli artt. ${joinItalianTextList(numbers)}` }
}

// --- etichette dominio codificato (hardcoded, verificate contro lo schema
// del Feature Layer madre - non dipendono dall'array fields live) ---

const AREA_LABELS: Record<string, string> = { AMM: 'Amministrativa', AGR: 'Agraria', TEC: 'Tecnica' }

const SETTORE_LABELS: Record<string, string> = {
  CR: 'Catasto, Ruoli e Servizi Territoriali',
  GI: 'Gestione irrigua',
  D1: 'Distretto 1 (Quartu Sant’Elena/Villaputzu/Muravera – San Sperate)',
  D2: 'Distretto 2 (Serramanna/Pimpisu)',
  D3: 'Distretto 3 (San Gavino - Villacidro)',
  D4: 'Distretto 4 (Basso Sulcis)',
  D5: 'Distretto 5 (Senorbì)',
  D6: 'Distretto 6 (Cixerri)',
  DS: 'Manutenzione opere di dreno e di scolo'
}

const TIPO_ATTO_AMM_LABELS: Record<string, string> = {
  VERBALE: 'Verbale amministrativo',
  RISARCIMENTO_DANNI: 'Richiesta risarcimento danni',
  VERBALE_RISARCIMENTO: 'Verbale misto',
  ARCHIVIAZIONE: 'Archiviazione / non luogo a procedere',
  RIMBORSO: 'Richiesta di rimborso',
  RIMBORSO_RISARCIMENTO: 'Richiesta di rimborso e risarcimento danni'
}

function domainLabelOrRaw (raw: any, labels: Record<string, string>): string {
  if (raw == null || raw === '') return ''
  const code = String(raw).trim()
  return labels[code] || code
}

function buildDefaultOggetto (data: any): string {
  const d = data || {}
  const ragioneSociale = String(pickAttrCI(d, ['ragione_sociale']) || '').trim()
  const trasgressore = ragioneSociale || joinParts(String(pickAttrCI(d, ['cognome']) || ''), String(pickAttrCI(d, ['nome']) || ''))
  return `Contestazione di infrazione alle “Norme generali sulla distribuzione dell’acqua ad uso irriguo”, approvate con deliberazione del C.d.D. n. 016 del 02.12.2019${trasgressore ? ` – Ditta “${trasgressore}”` : ''}.`
}

export function buildBozzaDeterminazioneMap (data: any, profile: { username: string, fullName: string }): Record<string, string> {
  const d = data || {}
  const oid = pickAttrCI(d, ['OBJECTID', 'objectid', 'ObjectId', 'FID'])
  const oidNumber = oid != null && Number.isFinite(Number(oid)) ? Number(oid) : null
  const nRapporto = normalizeReportCode(pickAttrCI(d, [
    'numero_rapporto_tecnico', 'NUMERO_RAPPORTO_TECNICO', 'Numero_rapporto_tecnico',
    'n_rapporto', 'numero_rapporto', 'codice_rapporto'
  ]), oidNumber)
  const nRilevazione = normalizeRilevazioneCodeForAmm(d, oidNumber)
  const ragioneSociale = String(pickAttrCI(d, ['ragione_sociale']) || '').trim()
  const trasgressore = ragioneSociale || joinParts(String(pickAttrCI(d, ['cognome']) || ''), String(pickAttrCI(d, ['nome']) || ''))
  const cfPiva = ragioneSociale ? String(pickAttrCI(d, ['piva']) || '').trim() : String(pickAttrCI(d, ['codice_fiscale']) || '').trim()
  const oggettoBozza = buildDefaultOggetto(d)
  const area = domainLabelOrRaw(pickAttrCI(d, ['area_cod']), AREA_LABELS) || String(pickAttrCI(d, ['area_label', 'area']) || '')
  const settore = domainLabelOrRaw(pickAttrCI(d, ['settore_cod']), SETTORE_LABELS) || String(pickAttrCI(d, ['settore_label', 'settore']) || '')
  const articleRef = buildArticleReference(d)
  const tipoAttoRaw = pickAttrCI(d, ['tipo_atto_amm'])
  return {
    objectid: oid != null ? String(oid) : '',
    n_rilevazione: nRilevazione,
    n_rapporto: nRapporto,
    data_rapporto_tecnico: formatDateValue(pickAttrCI(d, ['data_rapporto_tecnico'])),
    area,
    settore,
    articoli_violati_elenco: articleRef.elenco,
    articoli_violati_riferimento: articleRef.riferimento,
    protocollo_fascicolo_numero: String(pickAttrCI(d, ['protocollo_fascicolo_numero']) || ''),
    protocollo_fascicolo_data: formatDateValue(pickAttrCI(d, ['protocollo_fascicolo_data'])),
    trasgressore,
    cf_piva: cfPiva,
    tipo_atto_amm_label: domainLabelOrRaw(tipoAttoRaw, TIPO_ATTO_AMM_LABELS) || String(tipoAttoRaw || ''),
    oggetto_atto_amm: String(pickAttrCI(d, ['oggetto_atto_amm']) || ''),
    pagamento_importo_totale: formatEuroText(pickAttrCI(d, ['pagamento_importo_totale'])),
    bozza_determinazione_oggetto: oggettoBozza,
    anno_corrente: String(new Date().getFullYear()),
    data_generazione: new Date().toLocaleString('it-IT'),
    generato_da: profile.fullName || profile.username || ''
  }
}
