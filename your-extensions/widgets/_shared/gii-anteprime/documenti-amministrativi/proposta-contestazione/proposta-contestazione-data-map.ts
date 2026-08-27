// =================================================================
// proposta-contestazione-data-map.ts
// Mappa dati condivisa per il documento "Proposta di contestazione".
// È usata da gii-editing-amm e dal builder condiviso del fascicolo.
// Le funzioni equivalenti presenti nell'editor restano dove servono
// all'interfaccia amministrativa (badge, tabella violazioni, ecc.).
// =================================================================
import { buildPropostaContestazionePdf as buildVerbalePdf, getPropostaContestazionePdfFilePrefix as getVerbalePdfFilePrefix } from '../proposta-contestazione/proposta-contestazione-pdf-builder'
import { buildAttoFinalePdf, getAttoFinalePdfFilePrefix } from '../verbale-contestazione/verbale-pdf-builder'

export type LayerFieldInfo = {
  name: string
  type: string
  alias?: string
  domain?: any | null
  editable?: boolean
}

type ViolationRow = {
  key: string
  label: string
  details: Array<{ label: string, value: string }>
}

const VIOLATION_ARTICLE_TITLES: Record<string, string> = {
  '8': 'Violazione servizio di reperibilità',
  '12': 'Negato accesso ai fondi (al personale consortile)',
  '15': 'Prelievo abusivo d’acqua',
  '16': 'Presentazione tardiva comunicazione di irrigazione',
  '17': 'Presentazione tardiva comunicazione di variazione o di rinuncia',
  '27': 'Spreco d’acqua/uso negligente della risorsa idrica',
  '28': 'Violazione prescrizioni del consorzio',
  '29': 'Violazione termini restituzione attrezzature',
  '30': 'Danneggiamento e/o perdita attrezzature',
  '31': 'Mancata segnalazione guasti',
  '32': 'Negato accesso ai fondi (al consorziato)',
  '33': 'Inosservanza limiti temporali di prelievo',
  '34': 'Interferenze',
  '35': 'Manomissione reti di dispensa e allaccio di apparecchi di aspirazione all’idrante',
  '36': 'Uso attrezzature non autorizzate',
  '37': 'Uso sistemi di irrigazione incompatibili',
  '39': 'Danni alle strutture irrigue'
}

const DIRECT_ARTICLE_FIELDS: Array<{ field: string, label: string, supDich?: string[], supIrr?: string[] }> = [
  { field: 'v_art08', label: 'Art. 8', supDich: ['sup_dichiarata_art08'], supIrr: ['sup_irrigata_art08'] },
  { field: 'v_art12', label: 'Art. 12', supDich: ['sup_dichiarata_art12'], supIrr: ['sup_irrigata_art12'] },
  { field: 'v_art27', label: 'Art. 27', supDich: ['sup_dichiarata_art27'], supIrr: ['sup_irrigata_art27'] },
  { field: 'v_art28', label: 'Art. 28', supDich: ['sup_dichiarata_art28'], supIrr: ['sup_irrigata_art28'] },
  { field: 'v_art29', label: 'Art. 29', supDich: ['sup_dichiarata_art29'], supIrr: ['sup_irrigata_art29'] },
  { field: 'v_art30', label: 'Art. 30', supDich: ['sup_dichiarata_art30'], supIrr: ['sup_irrigata_art30'] },
  { field: 'v_art31', label: 'Art. 31', supDich: ['sup_dichiarata_art31'], supIrr: ['sup_irrigata_art31'] },
  { field: 'v_art32', label: 'Art. 32', supDich: ['sup_dichiarata_art32'], supIrr: ['sup_irrigata_art32'] },
  { field: 'v_art33', label: 'Art. 33', supDich: ['sup_dichiarata_art33'], supIrr: ['sup_irrigata_art33'] },
  { field: 'v_art34', label: 'Art. 34', supDich: ['sup_dichiarata_art34'], supIrr: ['sup_irrigata_art34'] },
  { field: 'v_art35', label: 'Art. 35', supDich: ['sup_dichiarata_art35'], supIrr: ['sup_irrigata_art35'] },
  { field: 'v_art36', label: 'Art. 36', supDich: ['sup_dichiarata_art36'], supIrr: ['sup_irrigata_art36'] },
  { field: 'v_art37', label: 'Art. 37', supDich: ['sup_dichiarata_art37'], supIrr: ['sup_irrigata_art37'] },
  { field: 'v_art39', label: 'Art. 39', supDich: ['sup_dichiarata_art39'], supIrr: ['sup_irrigata_art39'] }
]

const ARTICLES_WITH_GRAVITA = new Set(['12', '27', '28', '31', '32', '33', '34', '35', '36', '37'])

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
  if (!d) return '—'
  return d.toLocaleDateString('it-IT')
}

function formatValue (v: any): string {
  if (v == null || v === '') return '—'
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? '—' : v.toLocaleDateString('it-IT')
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '—'
  if (typeof v === 'boolean') return v ? 'Sì' : 'No'
  return String(v)
}

function formatDecimalIt (value: number, fractionDigits = 2): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  const sign = n < 0 ? '-' : ''
  const fixed = Math.abs(n).toFixed(fractionDigits)
  const [integerPart, decimalPart] = fixed.split('.')
  const groupedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return decimalPart != null ? `${sign}${groupedInteger},${decimalPart}` : `${sign}${groupedInteger}`
}

function formatEuroText (v: any): string {
  const n = typeof v === 'number' ? v : parseNumberInput(v)
  if (n == null || !Number.isFinite(n)) return '—'
  return `${formatDecimalIt(n, 2)} €`
}

function looksLikeDateField (name: string): boolean {
  return /(^dt_|data|_data|date|_il$)/i.test(String(name || ''))
}

function getFieldInfo (fields: LayerFieldInfo[], wanted: string): LayerFieldInfo | null {
  const w = String(wanted || '').toLowerCase()
  return fields.find(x => String(x.name).toLowerCase() === w) || null
}

function getDomainOptions (field: LayerFieldInfo | null): Array<{ code: any, name: string }> {
  const vals = field?.domain?.codedValues
  if (!Array.isArray(vals)) return []
  return vals.map((x: any) => ({ code: x?.code, name: String(x?.name ?? x?.code ?? '') }))
}

function getFallbackDomainOptions (fieldName: string): Array<{ code: any, name: string }> {
  if (fieldName === 'tipo_atto_amm') {
    return [
      { code: 'VERBALE', name: 'Atto di accertamento' },
      { code: 'RISARCIMENTO_DANNI', name: 'Richiesta risarcimento danni' },
      { code: 'VERBALE_RISARCIMENTO', name: 'Atto di accertamento con rimborso/risarcimento' },
      { code: 'ARCHIVIAZIONE', name: 'Archiviazione / non luogo a procedere' },
      { code: 'RIMBORSO', name: 'Richiesta di rimborso' },
      { code: 'RIMBORSO_RISARCIMENTO', name: 'Richiesta di rimborso e risarcimento danni' }
    ]
  }
  if (fieldName === 'pagamento_modalita') {
    return [
      { code: 'PAGOPA', name: 'pagoPA' },
      { code: 'BONIFICO', name: 'Bonifico bancario' },
      { code: 'MISTO', name: 'Pagamento misto' },
      { code: 'ALTRO', name: 'Altro' }
    ]
  }
  if (fieldName === 'pagamento_stato') {
    return [
      { code: 'DA_GENERARE', name: 'Da generare' },
      { code: 'DA_PAGARE', name: 'Da pagare' },
      { code: 'GENERATO', name: 'Generato' },
      { code: 'NOTIFICATO', name: 'Notificato' },
      { code: 'PARZIALE', name: 'Pagato parzialmente' },
      { code: 'PAGATO', name: 'Pagato' },
      { code: 'SCADUTO', name: 'Scaduto' },
      { code: 'ANNULLATO', name: 'Annullato' }
    ]
  }
  if (fieldName === 'notifica_tipo') {
    return [
      { code: 'PEC', name: 'PEC' },
      { code: 'RAC_AR', name: 'Raccomandata A/R' },
      { code: 'MESSO', name: 'Messo notificatore' },
      { code: 'CONSEGNA_MANO', name: 'Consegna a mano' },
      { code: 'ALTRO', name: 'Altro' }
    ]
  }
  if (fieldName === 'notifica_esito') {
    return [
      { code: 'DA_NOTIFICARE', name: 'Da notificare' },
      { code: 'NOTIFICATA', name: 'Notificata' },
      { code: 'NON_NOTIFICATA', name: 'Non notificata' },
      { code: 'COMPIUTA_GIACENZA', name: 'Compiuta giacenza' },
      { code: 'IRREPERIBILE', name: 'Irreperibile' },
      { code: 'ALTRO', name: 'Altro' }
    ]
  }
  if (fieldName === 'attrezzature_cauzione_presente') {
    return [
      { code: 0, name: 'No' },
      { code: 1, name: 'Sì' }
    ]
  }
  if (fieldName === 'area_cod') {
    return [
      { code: 'AMM', name: 'Amministrativa' },
      { code: 'AGR', name: 'Agraria' },
      { code: 'TEC', name: 'Tecnica' }
    ]
  }
  if (fieldName === 'settore_cod') {
    return [
      { code: 'CR', name: 'Catasto, Ruoli e Servizi Territoriali' },
      { code: 'GI', name: 'Gestione irrigua' },
      { code: 'D1', name: "Distretto 1 (Quartu Sant'Elena/Villaputzu/Muravera – San Sperate)" },
      { code: 'D2', name: 'Distretto 2 (Serramanna/Pimpisu)' },
      { code: 'D3', name: 'Distretto 3 (San Gavino - Villacidro)' },
      { code: 'D4', name: 'Distretto 4 (Basso Sulcis)' },
      { code: 'D5', name: 'Distretto 5 (Senorbì)' },
      { code: 'D6', name: 'Distretto 6 (Cixerri)' },
      { code: 'DS', name: 'Manutenzione opere di dreno e di scolo' }
    ]
  }
  if (/^stato_(IA|RIA|DA)$/i.test(fieldName)) {
    return [
      { code: 0, name: 'Non attivo' },
      { code: 1, name: 'Da prendere in carico' },
      { code: 2, name: 'Presa in carico' },
      { code: 3, name: 'Integrazione richiesta' },
      { code: 4, name: 'Trasmesso' },
      { code: 5, name: 'Respinto' }
    ]
  }
  if (/^esito_(IA|RIA|DA|DT)$/i.test(fieldName)) {
    return [
      { code: 1, name: 'Integrazione richiesta' },
      { code: 2, name: 'Approvata' },
      { code: 3, name: 'Respinta' }
    ]
  }
  return []
}

function domainLabel (field: LayerFieldInfo | null, raw: any, fallbackFieldName?: string): string {
  if (raw == null || raw === '') return '—'
  const opts = getDomainOptions(field)
  const fallback = fallbackFieldName ? getFallbackDomainOptions(fallbackFieldName) : []
  const found = [...opts, ...fallback].find(o => String(o.code) === String(raw))
  return found ? found.name : String(raw)
}

function normalizeToken (v: any): string {
  return String(v ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
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
  const direct = upper.match(/(D[1-6]|DS|CR|GI)/)
  if (direct) return direct[1]
  const distretto = upper.match(/DISTRETTO\s*([1-6])/) || upper.match(/D\.?\s*([1-6])/)
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
  let prefix = (op === 2 || op === '2' || String(op || '').toUpperCase() === 'IT') ? 'IT' : 'TR'
  let oidPart = oid != null && Number.isFinite(Number(oid)) ? String(Number(oid)) : ''
  let settore = normalizeSectorCodeForAmm(pickAttrCI(d, ['settore_cod', 'Settore_cod', 'SETTORE_COD', 'settore', 'Settore', 'SETTORE'])) || settoreCodeFromUfficioAmm(pickAttrCI(d, ['ufficio_zona', 'Ufficio_zona', 'UFFICIO_ZONA']))

  let m = raw.match(/^(TR|IT)-?(\d+)(?:-([A-Z0-9]+))?$/i)
  if (m) {
    prefix = m[1].toUpperCase()
    oidPart = m[2]
    if (!settore && m[3]) settore = normalizeSectorCodeForAmm(m[3]) || m[3].toUpperCase()
  } else {
    m = raw.match(/^(\d+)-?(TR|IT)(?:-([A-Z0-9]+))?$/i)
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
    if (/^(TR|IT)-?\d+(?:-[A-Z0-9]+)?$/.test(normalized) || /^\d+-?(TR|IT)(?:-[A-Z0-9]+)?$/.test(normalized)) return ''
    return /^\d+$/.test(code) ? `R-${code}` : code
  }
  return ''
}

function isDeterminazioneAdottata (data: Record<string, any>): boolean {
  const d = data || {}
  const stato = String(pickAttrCI(d, ['determinazione_stato']) || '').trim().toUpperCase()
  return stato === 'ADOTTATA' || (hasAdminValue(pickAttrCI(d, ['determinazione_numero'])) && hasAdminValue(pickAttrCI(d, ['determinazione_data'])))
}

function verbaleApprovalDateValue (data: Record<string, any>): any {
  const d = data || {}
  return pickAttrCI(d, ['accertamento_data']) || pickAttrCI(d, ['determinazione_data']) || pickAttrCI(d, ['determinazione_registrata_il']) || pickAttrCI(d, ['determinazione_trasmessa_firma_il'])
}

function displayVerbaleApprovalDate (data: Record<string, any>, fields: LayerFieldInfo[]): string {
  const d = data || {}
  const value = verbaleApprovalDateValue(d)
  if (!hasAdminValue(value)) return '—'
  const fieldName = hasAdminValue(pickAttrCI(d, ['accertamento_data']))
    ? 'accertamento_data'
    : hasAdminValue(pickAttrCI(d, ['determinazione_data']))
      ? 'determinazione_data'
      : hasAdminValue(pickAttrCI(d, ['determinazione_registrata_il']))
        ? 'determinazione_registrata_il'
        : 'determinazione_trasmessa_firma_il'
  const lf = getFieldInfo(fields, fieldName)
  if (lf?.domain?.codedValues || getFallbackDomainOptions(fieldName).length) return domainLabel(lf, value, fieldName)
  return formatDateValue(value)
}

function verbaleNumberValue (data: Record<string, any>, oid?: any): string {
  const d = data || {}
  return String(pickAttrCI(d, ['accertamento_numero']) || '').trim()
}

function isCheckedValue (v: any): boolean {
  return v === true || v === 1 || v === '1' || String(v ?? '').trim().toLowerCase() === 'si' || String(v ?? '').trim().toLowerCase() === 'sì'
}

function isMeaningfulValue (v: any): boolean {
  return v != null && v !== '' && !(typeof v === 'number' && Number.isNaN(v))
}

function formatViolationValue (data: any, fields: LayerFieldInfo[], name: string): string {
  const raw = pickAttrCI(data, [name])
  if (!isMeaningfulValue(raw)) return ''
  const lf = getFieldInfo(fields, name)
  if (lf?.domain?.codedValues) return domainLabel(lf, raw)
  if (looksLikeDateField(name)) return formatDateValue(raw)
  return formatValue(raw)
}

function firstViolationValue (data: any, fields: LayerFieldInfo[], names: string[]): string {
  for (const n of names) {
    const v = formatViolationValue(data, fields, n)
    if (v && v !== '—') return v
  }
  return ''
}

function addViolationDetail (details: Array<{ label: string, value: string }>, label: string, value: string) {
  const v = String(value || '').trim()
  if (v && v !== '—') details.push({ label, value: v })
}

function normalizeArticleNumber (raw: any): string {
  const m = String(raw ?? '').match(/(\d{1,2})(?:\.\d+)?/)
  return m ? String(Number(m[1])) : ''
}

function violationArticleLabel (raw: any): string {
  const article = normalizeArticleNumber(raw)
  if (!article) return String(raw || '').trim()
  const title = VIOLATION_ARTICLE_TITLES[article]
  return title ? `Art. ${article} - ${title}` : `Art. ${article}`
}

function parseGradiViolazioniField (raw: any): Record<string, string> {
  const out: Record<string, string> = {}
  const txt = String(raw ?? '').trim()
  if (!txt) return out

  txt.split(/[;\n,]+/).forEach(part => {
    const item = String(part || '').trim()
    if (!item) return
    const m = item.match(/(?:art\.?\s*)?(\d{1,2})(?:\.\d+)?\s*[-:=]\s*([1-4])/i)
    if (!m) return
    const article = normalizeArticleNumber(m[1])
    if (ARTICLES_WITH_GRAVITA.has(article)) out[article] = m[2]
  })

  return out
}

function normalizeGravitaValue (raw: any): string {
  const s = String(raw ?? '').trim()
  if (!s) return ''
  const m = s.match(/[1-4]/)
  return m ? m[0] : ''
}

function getGravitaForArticle (data: any, articleNumber: any): string {
  const d = data || {}
  const article = normalizeArticleNumber(articleNumber)
  const gradi = parseGradiViolazioniField(pickAttrCI(d, ['gradi_violazioni']))
  if (article && gradi[article]) return gradi[article]

  const specificNames = article
    ? [`grado_art${article}`, `gravita_art${article}`, `grado_art_${article}`, `gravita_art_${article}`]
    : []
  const specific = normalizeGravitaValue(pickAttrCI(d, specificNames))
  if (specific) return specific

  return normalizeGravitaValue(pickAttrCI(d, ['grado', 'gravita']))
}

function formatOccorrenzaValue (raw: any, fields: LayerFieldInfo[]): string {
  if (!isMeaningfulValue(raw)) return ''

  const lf = getFieldInfo(fields, 'occorrenza')
  if (lf?.domain?.codedValues) {
    const label = domainLabel(lf, raw)
    if (label && label !== '—') return label
  }

  const value = String(raw).trim()
  if (value === '1') return 'Prima contestazione'
  if (value === '2') return 'Recidiva'
  return formatValue(raw)
}

function addCommonViolationDetails (data: any, fields: LayerFieldInfo[], details: Array<{ label: string, value: string }>, articleNumber: any) {
  const article = normalizeArticleNumber(articleNumber)

  if (ARTICLES_WITH_GRAVITA.has(article)) {
    addViolationDetail(details, 'Grado di gravità', getGravitaForArticle(data, article))
  }

  if (article === '15') {
    addViolationDetail(details, 'Occorrenza', formatOccorrenzaValue(pickAttrCI(data, ['occorrenza']), fields))
  }
}

function buildViolationRows (data: any, fields: LayerFieldInfo[]): ViolationRow[] {
  const d = data || {}
  const rows: ViolationRow[] = []

  const norma15Parziale = firstViolationValue(d, fields, ['norma15_parziale'])
  const norma15Totale = firstViolationValue(d, fields, ['norma15_totale'])
  const art15FallbackCase = deriveArt15FallbackCase(d, fields)
  if (norma15Parziale || norma15Totale || art15FallbackCase) {
    const details: Array<{ label: string, value: string }> = []
    const tipoAbuso = firstViolationValue(d, fields, ['tipo_abuso', 'tipo_prelievo']) ||
      (norma15Parziale || art15FallbackCase.includes('PARZIALE') ? 'Parziale' : (norma15Totale || art15FallbackCase.includes('TOTALE') ? 'Totale' : ''))
    const occorrenza = formatOccorrenzaValue(pickAttrCI(d, ['occorrenza']), fields) ||
      norma15Parziale || norma15Totale ||
      (art15FallbackCase ? (art15FallbackCase.includes('RECIDIVA') ? 'Recidiva' : 'Prima contestazione') : '')
    addViolationDetail(details, 'Tipo di abuso', tipoAbuso)
    addViolationDetail(details, 'Superficie dichiarata', firstViolationValue(d, fields, ['sup_dichiarata_art15']))
    addViolationDetail(details, 'Superficie irrigata', firstViolationValue(d, fields, ['sup_irrigata_art15']))
    addViolationDetail(details, 'Occorrenza', occorrenza)
    rows.push({ key: 'art15', label: violationArticleLabel('15'), details })
  }

  const norma1617Raw = String(pickAttrCI(d, ['norma16_17']) ?? '')
  const norma1617Label = firstViolationValue(d, fields, ['norma16_17'])
  const art16On = norma1617Raw.toLowerCase().includes('art16') || norma1617Label.toLowerCase().includes('art. 16')
  if (art16On) {
    const details: Array<{ label: string, value: string }> = []
    addViolationDetail(details, 'Tipo inosservanza', violationArticleLabel('16'))
    addViolationDetail(details, 'Superficie dichiarata', firstViolationValue(d, fields, ['sup_dichiarata_art16', 'sup_dichiarata_art16_17']))
    addViolationDetail(details, 'Superficie irrigata', firstViolationValue(d, fields, ['sup_irrigata_art16_17_2', 'sup_irrigata_art16_17']))
    addCommonViolationDetails(d, fields, details, '16')
    rows.push({ key: 'art16', label: violationArticleLabel('16'), details })
  }

  const art17Tipo = firstViolationValue(d, fields, ['art17_tipo'])
  const art17On = norma1617Raw.toLowerCase().includes('art17') || norma1617Label.toLowerCase().includes('art. 17') || !!art17Tipo
  if (art17On) {
    const details: Array<{ label: string, value: string }> = []
    addViolationDetail(details, 'Tipo violazione', art17Tipo)
    addViolationDetail(details, 'Superficie dichiarata', firstViolationValue(d, fields, ['sup_dichiarata_art17_1', 'sup_dichiarata_art17_2', 'sup_dichiarata_art16_17']))
    addViolationDetail(details, 'Superficie variata/irrigata', firstViolationValue(d, fields, ['sup_irrigata_art17_1', 'sup_irrigata_art16_17_2', 'sup_irrigata_art16_17']))
    addCommonViolationDetails(d, fields, details, '17')
    rows.push({ key: 'art17', label: violationArticleLabel('17'), details })
  }

  for (const art of DIRECT_ARTICLE_FIELDS) {
    if (!isCheckedValue(pickAttrCI(d, [art.field]))) continue
    const details: Array<{ label: string, value: string }> = []
    addViolationDetail(details, 'Superficie dichiarata', firstViolationValue(d, fields, art.supDich || []))
    addViolationDetail(details, 'Superficie irrigata', firstViolationValue(d, fields, art.supIrr || []))
    addCommonViolationDetails(d, fields, details, art.label)
    rows.push({ key: art.field, label: violationArticleLabel(art.label), details })
  }

  return rows
}

function fieldRawOrLabel (data: any, fields: LayerFieldInfo[], name: string): string {
  const raw = pickAttrCI(data, [name])
  const label = formatViolationValue(data, fields, name)
  return `${raw ?? ''} ${label || ''}`.trim()
}

function numericAttr (data: any, names: string[]): number | null {
  for (const name of names) {
    const raw = pickAttrCI(data, [name])
    const n = parseNumberInput(raw)
    if (n != null) return n
  }
  return null
}

function isRecidivaPractice (data: any, fields: LayerFieldInfo[]): boolean {
  const d = data || {}
  const names = ['occorrenza', 'recidiva', 'occorrenza_art15', 'art15_occorrenza', 'norma15_occorrenza']
  for (const name of names) {
    const raw = pickAttrCI(d, [name])
    const combined = normalizeToken(fieldRawOrLabel(d, fields, name))
    if (String(raw).trim() === '2') return true
    if (String(raw).trim() === '1' && normalizeToken(name).includes('RECID')) return true
    if (combined.includes('RECID')) return true
  }

  for (const [key, raw] of Object.entries(d)) {
    const k = normalizeToken(key)
    if (!k.includes('RECID') && !k.includes('OCCORRENZA')) continue
    const value = normalizeToken(raw)
    if (String(raw).trim() === '2' || value.includes('RECID')) return true
    if (k.includes('RECID') && (String(raw).trim() === '1' || value === 'SI' || value === 'SÌ')) return true
  }

  return false
}

function deriveArt15FallbackCase (data: any, fields: LayerFieldInfo[]): string {
  const dichiarata = numericAttr(data, ['sup_dichiarata_art15'])
  const irrigata = numericAttr(data, ['sup_irrigata_art15'])
  if (irrigata == null || irrigata <= 0) return ''

  const tipo = normalizeToken(fieldRawOrLabel(data, fields, 'tipo_prelievo') || fieldRawOrLabel(data, fields, 'tipo_abuso'))
  const recidiva = isRecidivaPractice(data, fields)
  const totale = tipo.includes('TOTALE') || dichiarata == null || dichiarata <= 0
  const parziale = tipo.includes('PARZIALE') || (!totale && dichiarata != null && irrigata > dichiarata)

  if (totale) return recidiva ? 'C118_PRELIEVO_TOTALE_RECIDIVA' : 'C117_PRELIEVO_TOTALE_PRIMA'
  if (parziale) return recidiva ? 'C116_PRELIEVO_PARZIALE_RECIDIVA' : 'C115_PRELIEVO_PARZIALE_PRIMA'
  return ''
}

function normalizeArt15AbuseTypeLabel (raw: any): string {
  const value = String(raw ?? '').trim()
  if (!value) return ''
  const token = normalizeToken(value)
  if (token.includes('PARZIALE')) return 'Parziale'
  if (token.includes('TOTALE')) return 'Totale'
  return value
}

function art15AbuseTypeLabel (data: Record<string, any>, fields: LayerFieldInfo[], caseCodeRaw?: any): string {
  const direct = normalizeArt15AbuseTypeLabel(firstViolationValue(data || {}, fields || [], ['tipo_abuso', 'tipo_prelievo']))
  if (direct) return direct

  if (isCheckedValue(pickAttrCI(data || {}, ['norma15_parziale']))) return 'Parziale'
  if (isCheckedValue(pickAttrCI(data || {}, ['norma15_totale']))) return 'Totale'

  const fallback = normalizeToken(caseCodeRaw || deriveArt15FallbackCase(data || {}, fields || []))
  if (fallback.includes('PARZIALE')) return 'Parziale'
  if (fallback.includes('TOTALE')) return 'Totale'
  return ''
}

function normalizeArt17CommunicationTypeLabel (raw: any): string {
  const value = String(raw ?? '').trim()
  if (!value) return ''
  const token = normalizeToken(value)
  if (token.includes('VARIAZIONE')) return 'Variazione tardiva'
  if (token.includes('RINUNCIA')) return 'Rinuncia tardiva'
  return value
}

function art17CommunicationTypeLabel (data: Record<string, any>, fields: LayerFieldInfo[], caseCodeRaw?: any): string {
  const direct = normalizeArt17CommunicationTypeLabel(firstViolationValue(data || {}, fields || [], ['art17_tipo']))
  if (direct) return direct
  const fallback = normalizeToken(caseCodeRaw || '')
  if (fallback.includes('VARIAZIONE')) return 'Variazione tardiva'
  if (fallback.includes('RINUNCIA')) return 'Rinuncia tardiva'
  return ''
}

function hasAdminValue (v: any): boolean {
  return v != null && String(v).trim() !== ''
}

function pdfFieldValue (data: any, fields: LayerFieldInfo[], name: string, opts?: { money?: boolean }): string {
  const raw = pickAttrCI(data, [name])
  if (raw == null || raw === '') return ''
  if (opts?.money) {
    const n = typeof raw === 'number' ? raw : parseNumberInput(raw)
    return n != null ? formatEuroText(n) : String(raw)
  }
  const lf = getFieldInfo(fields, name)
  if (lf?.domain?.codedValues) {
    const label = domainLabel(lf, raw)
    return label === '—' ? '' : label
  }
  if (looksLikeDateField(name)) {
    const d = formatDateValue(raw)
    return d === '—' ? '' : d
  }
  const v = formatValue(raw)
  return v === '—' ? '' : v
}

function pdfDomainValue (data: any, fields: LayerFieldInfo[], names: string[], fallbackFieldName: string): string {
  for (const name of names) {
    const raw = pickAttrCI(data, [name])
    if (raw == null || raw === '') continue
    const lf = getFieldInfo(fields, name) || getFieldInfo(fields, fallbackFieldName)
    const label = domainLabel(lf, raw, fallbackFieldName)
    if (label && label !== '—') return label
  }
  return ''
}

function formatPdfDateTimeValue (value: any, fallbackTimeValue?: any): string {
  const main = toDateObj(value)
  if (!main) return ''
  const date = main.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const hasRealTime = !(main.getUTCHours() === 0 && main.getUTCMinutes() === 0 && main.getUTCSeconds() === 0 && main.getUTCMilliseconds() === 0)
  const timeSource = hasRealTime ? main : toDateObj(fallbackTimeValue)
  const time = timeSource && !(timeSource.getUTCHours() === 0 && timeSource.getUTCMinutes() === 0 && timeSource.getUTCSeconds() === 0 && timeSource.getUTCMilliseconds() === 0)
    ? timeSource.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
    : ''
  return time ? `${date}, ${time}` : date
}

function pdfDateTimeValue (data: any, names: string[], fallbackTimeNames: string[] = []): string {
  for (const name of names) {
    const raw = pickAttrCI(data, [name])
    if (raw == null || raw === '') continue
    const fallback = fallbackTimeNames.map(n => pickAttrCI(data, [n])).find(v => v != null && v !== '')
    const formatted = formatPdfDateTimeValue(raw, fallback)
    if (formatted) return formatted
  }
  return ''
}

function ammOfficeLabelForPdf (value: string): string {
  const clean = String(value || '').trim()
  if (!clean) return ''
  return /^ufficio\s+di\s+/i.test(clean) ? clean : `Ufficio di ${clean}`
}

function joinParts (...parts: string[]): string {
  return parts.map(p => String(p || '').trim()).filter(Boolean).join(' ')
}

function firstTextAttr (data: any, names: string[]): string {
  for (const name of names) {
    const value = String(pickAttrCI(data || {}, [name]) || '').trim()
    if (value) return value
  }
  return ''
}

function buildVerbaleViolationsText (data: any, fields: LayerFieldInfo[]): string {
  const rows = buildViolationRows(data || {}, fields || [])
    .map((row, index) => ({ row, index }))
    .sort((a, b) => Number(normalizeArticleNumber(a.row.label) || Number.MAX_SAFE_INTEGER) - Number(normalizeArticleNumber(b.row.label) || Number.MAX_SAFE_INTEGER) || a.index - b.index)
    .map(item => item.row)
  if (!rows.length) return ''
  return rows.map(row => {
    const lines = [row.label, ...row.details.map(d => `• ${d.label}: ${d.value}`)]
    return lines.join('\n')
  }).join('\n\n')
}

export function buildVerbalePdfMap (data: any, fields: LayerFieldInfo[], profile: { username: string, fullName: string }): Record<string, string> {
  const d = data || {}
  const oid = pickAttrCI(d, ['OBJECTID', 'objectid', 'ObjectId', 'FID'])
  const oidNumber = oid != null && Number.isFinite(Number(oid)) ? Number(oid) : null
  const nRapporto = normalizeReportCode(pickAttrCI(d, [
    'numero_rapporto_tecnico', 'NUMERO_RAPPORTO_TECNICO', 'Numero_rapporto_tecnico',
    'n_rapporto', 'numero_rapporto', 'codice_rapporto'
  ]), oidNumber)
  const nRilevazione = normalizeRilevazioneCodeForAmm(d, oidNumber)
  const dataApprovazioneRapporto = pdfFieldValue(d, fields, 'dt_esito_DT') || pdfFieldValue(d, fields, 'data_rapporto_tecnico')
  const nomeTrasgressore = String(pickAttrCI(d, ['nome']) || '').trim()
  const cognomeTrasgressore = String(pickAttrCI(d, ['cognome']) || '').trim()
  const ragioneSociale = String(pickAttrCI(d, ['ragione_sociale']) || '').trim()
  const isPg = String(pickAttrCI(d, ['tipologia_soggetto']) || '').toUpperCase().includes('GIUR') || !!ragioneSociale
  const trasgressore = isPg
    ? ragioneSociale
    : joinParts(cognomeTrasgressore, nomeTrasgressore)
  const cfPiva = isPg ? String(pickAttrCI(d, ['piva']) || '').trim() : String(pickAttrCI(d, ['codice_fiscale']) || '').trim()
  const indirizzo = joinParts(String(pickAttrCI(d, ['via']) || ''), String(pickAttrCI(d, ['civico']) || ''))
  const comuneCap = joinParts(String(pickAttrCI(d, ['citta', 'comune']) || ''), String(pickAttrCI(d, ['cap']) || ''))
  const domRaw = pickAttrCI(d, ['dom_notifica_uguale'])
  const domicilioCoincide = domRaw == null || domRaw === '' || String(domRaw) === '1' || ['SI', 'SÌ', 'TRUE'].includes(String(domRaw).trim().toUpperCase())
  const destinatarioVia = domicilioCoincide ? String(pickAttrCI(d, ['via']) || '') : String(pickAttrCI(d, ['dom_notifica_via']) || '')
  const destinatarioCivico = domicilioCoincide ? String(pickAttrCI(d, ['civico']) || '') : String(pickAttrCI(d, ['dom_notifica_civico']) || '')
  const destinatarioCitta = (domicilioCoincide ? String(pickAttrCI(d, ['citta', 'comune']) || '') : String(pickAttrCI(d, ['dom_notifica_citta']) || '')).trim()
  const destinatarioCap = (domicilioCoincide ? String(pickAttrCI(d, ['cap']) || '') : String(pickAttrCI(d, ['dom_notifica_cap']) || '')).trim()
  const destinatarioProvincia = (domicilioCoincide ? String(pickAttrCI(d, ['provincia']) || '') : String(pickAttrCI(d, ['dom_notifica_provincia']) || '')).trim()
  const destinatarioStato = (domicilioCoincide ? String(pickAttrCI(d, ['stato']) || '') : String(pickAttrCI(d, ['dom_notifica_stato']) || '')).trim()
  const destinatarioIndirizzo = joinParts(destinatarioVia, destinatarioCivico)
  const destinatarioComuneCap = [destinatarioCap, destinatarioCitta ? `${destinatarioCitta}${destinatarioProvincia ? ` (${destinatarioProvincia})` : ''}` : ''].filter(Boolean).join(' - ')
  const contatti = [String(pickAttrCI(d, ['email']) || '').trim(), String(pickAttrCI(d, ['telefono']) || '').trim(), String(pickAttrCI(d, ['cellulare']) || '').trim()].filter(Boolean).join(' / ')
  const area = pdfDomainValue(d, fields, ['area_cod', 'Area_cod', 'AREA_COD', 'area', 'Area'], 'area_cod') || String(pickAttrCI(d, ['area_label']) || '')
  const settore = pdfDomainValue(d, fields, ['settore_cod', 'Settore_cod', 'SETTORE_COD', 'settore', 'Settore'], 'settore_cod') || String(pickAttrCI(d, ['settore_label']) || '')
  const rawTipoAtto = String(pickAttrCI(d, ['tipo_atto_amm']) || '').trim()
  const tipoAttoLabel = pdfFieldValue(d, fields, 'tipo_atto_amm') || rawTipoAtto
  const iaNome = firstTextAttr(d, ['ia_assegnato_nome', 'ia_assegnato_username'])
  const approvatoDa = isDeterminazioneAdottata(d)
  const riaNome = firstTextAttr(d, [
    'ria_nome', 'ria_username',
    'responsabile_istruttoria_amm_nome', 'responsabile_istruttoria_amm_username',
    'istruttoria_amm_chiusa_da'
  ])
  const direttoreNomeUfficiale = firstTextAttr(d, [
    'da_nome',
    'direttore_area_nome',
    'direttore_amm_nome',
    'dt_amm_nome'
  ])
  const daNome = firstTextAttr(d, [
    'da_nome', 'da_username',
    'direttore_area_nome', 'direttore_area_username',
    'direttore_amm_nome', 'direttore_amm_username',
    'dt_amm_nome', 'dt_amm_username',
    'atto_approvato_da', 'approvato_da', 'istruttoria_amm_approvata_da'
  ])
  const esitoIaNum = parseNumberInput(pickAttrCI(d, ['esito_IA']))
  const esitoRiaNum = parseNumberInput(pickAttrCI(d, ['esito_RIA']))
  // L'esito RIA è il riferimento autorevole per la versione corrente della
  // Proposta. A ogni nuova trasmissione IA → RIA questo esito viene
  // azzerato, quindi un valore 2 identifica necessariamente l'approvazione
  // dell'ultimo ciclo e non deve dipendere da una copia locale di esito_IA.
  const propostaApprovata = esitoRiaNum === 2
  return {
    objectid: oid != null ? String(oid) : '',
    pratica: '',
    n_rilevazione: nRilevazione,
    n_rapporto: nRapporto,
    data_rilevazione: pdfDateTimeValue(d, ['data_rilevazione', 'data_ora_rilevazione'], ['start']) || pdfFieldValue(d, fields, 'data_rilevazione'),
    data_approvazione_rapporto: dataApprovazioneRapporto,
    area,
    settore,
    ufficio_zona: ammOfficeLabelForPdf(pdfFieldValue(d, fields, 'ufficio_zona')),
    tecnico_rilevatore: String(pickAttrCI(d, ['tecnico_rilevatore']) || ''),
    ia: String(pickAttrCI(d, ['ia_assegnato_nome', 'ia_assegnato_username']) || ''),
    trasgressore_tipo: isPg ? 'PG' : 'PF',
    trasgressore,
    cf_piva: cfPiva,
    indirizzo,
    comune_cap: comuneCap,
    destinatario_indirizzo: destinatarioIndirizzo,
    destinatario_comune_cap: destinatarioComuneCap,
    destinatario_provincia: destinatarioProvincia,
    destinatario_stato: destinatarioStato,
    pec: String(pickAttrCI(d, ['pec']) || ''),
    contatti,
    violazioni: buildVerbaleViolationsText(d, fields),
    descrizione_fatti: String(pickAttrCI(d, ['descrizione_fatti']) || ''),
    tipo_atto_amm: rawTipoAtto,
    tipo_atto_amm_label: tipoAttoLabel,
    atto_approvato: isDeterminazioneAdottata(d) ? '1' : '0',
    proposta_approvata: propostaApprovata ? '1' : '0',
    protocollo_istanza_numero: String(pickAttrCI(d, ['protocollo_istanza_numero']) || ''),
    protocollo_istanza_data: pdfFieldValue(d, fields, 'protocollo_istanza_data'),
    oggetto_atto_amm: String(pickAttrCI(d, ['oggetto_atto_amm']) || ''),
    note_atto_amm: String(pickAttrCI(d, ['note_atto_amm']) || ''),
    esito_ia: esitoIaNum === 1 ? 'Da integrare/rettificare' : esitoIaNum === 2 ? 'Conforme' : esitoIaNum === 3 ? 'Respinta' : '',
    note_ia: String(pickAttrCI(d, ['note_IA', 'note_atto_amm']) || ''),
    determinazione_numero: String(pickAttrCI(d, ['determinazione_numero']) || ''),
    determinazione_data: pdfFieldValue(d, fields, 'determinazione_data'),
    accertamento_numero: verbaleNumberValue(d, oid),
    accertamento_data: hasAdminValue(pickAttrCI(d, ['accertamento_data'])) ? pdfFieldValue(d, fields, 'accertamento_data') : displayVerbaleApprovalDate(d, fields),
    protocollo_verbale: String(pickAttrCI(d, ['protocollo_atto_accertamento_numero']) || ''),
    protocollo_atto_accertamento_data: pdfFieldValue(d, fields, 'protocollo_atto_accertamento_data'),
    notifica_tipo: pdfFieldValue(d, fields, 'notifica_tipo'),
    notifica_data: pdfFieldValue(d, fields, 'notifica_data'),
    notifica_esito: pdfFieldValue(d, fields, 'notifica_esito'),
    notifica_estremi: String(pickAttrCI(d, ['notifica_estremi']) || ''),
    sanzione_importo_base: pdfFieldValue(d, fields, 'sanzione_importo_base', { money: true }),
    sanzione_importo_ridotta: pdfFieldValue(d, fields, 'sanzione_importo_ridotta', { money: true }),
    risarcimento_danni_importo: pdfFieldValue(d, fields, 'risarcimento_danni_importo', { money: true }),
    sanzione_spese_notifica: pdfFieldValue(d, fields, 'sanzione_spese_notifica', { money: true }),
    attrezzature_cauzione_presente: pdfFieldValue(d, fields, 'attrezzature_cauzione_presente'),
    attrezzature_risarcimento_importo: pdfFieldValue(d, fields, 'attrezzature_risarcimento_importo', { money: true }),
    attrezzature_cauzione_decurtata: pdfFieldValue(d, fields, 'attrezzature_cauzione_decurtata', { money: true }),
    attrezzature_importo_netto: pdfFieldValue(d, fields, 'attrezzature_importo_netto', { money: true }),
    attrezzature_risarcimento_dettaglio: String(pickAttrCI(d, ['attrezzature_risarcimento_dettaglio']) || ''),
    attrezzature_note: String(pickAttrCI(d, ['attrezzature_note']) || ''),
    pagamento_importo_totale: pdfFieldValue(d, fields, 'pagamento_importo_totale', { money: true }),
    pagamento_scadenza: pdfFieldValue(d, fields, 'pagamento_scadenza'),
    pagamento_modalita: pdfFieldValue(d, fields, 'pagamento_modalita'),
    pagamento_stato: pdfFieldValue(d, fields, 'pagamento_stato'),
    pagamento_note: String(pickAttrCI(d, ['pagamento_note']) || ''),
    pagopa_iuv: String(pickAttrCI(d, ['pagopa_iuv']) || ''),
    pagopa_codice_avviso: String(pickAttrCI(d, ['pagopa_codice_avviso']) || ''),
    bonifico_iban: String(pickAttrCI(d, ['bonifico_iban_snapshot']) || ''),
    bonifico_intestatario: String(pickAttrCI(d, ['bonifico_intestatario_snapshot']) || ''),
    bonifico_causale: String(pickAttrCI(d, ['bonifico_causale']) || ''),
    bonifico_cro_trn: String(pickAttrCI(d, ['bonifico_cro_trn']) || ''),
    bonifico_data_accredito: pdfFieldValue(d, fields, 'bonifico_data_accredito'),
    tipo_abuso_art15: art15AbuseTypeLabel(d, fields, ''),
    tipo_comunicazione_art17: art17CommunicationTypeLabel(d, fields, ''),
    sanzione_dettaglio_calcolo: String(pickAttrCI(d, ['sanzione_dettaglio_calcolo']) || ''),
    sanzione_calcolata_il: pdfFieldValue(d, fields, 'sanzione_calcolata_il'),
    sanzione_calcolata_da: String(pickAttrCI(d, ['sanzione_calcolata_da']) || ''),
    istruttoria_amm_chiusa_il: pdfFieldValue(d, fields, 'istruttoria_amm_chiusa_il'),
    istruttoria_amm_chiusa_da: String(pickAttrCI(d, ['istruttoria_amm_chiusa_da']) || ''),
    amm_iter_compilazione_nome: iaNome,
    amm_iter_compilazione_presa: pdfFieldValue(d, fields, 'dt_presa_in_carico_IA'),
    amm_iter_compilazione_data: pdfFieldValue(d, fields, 'dt_esito_IA') || pdfFieldValue(d, fields, 'sanzione_calcolata_il'),
    amm_iter_supervisione_nome: riaNome,
    amm_iter_supervisione_presa: pdfFieldValue(d, fields, 'dt_presa_in_carico_RIA'),
    amm_iter_supervisione_data: pdfFieldValue(d, fields, 'dt_esito_RIA') || pdfFieldValue(d, fields, 'istruttoria_amm_chiusa_il'),
    amm_iter_approvazione_nome: daNome,
    amm_direttore_nome: direttoreNomeUfficiale,
    amm_iter_approvazione_presa: pdfFieldValue(d, fields, 'determinazione_trasmessa_firma_il'),
    amm_iter_approvazione_data: isDeterminazioneAdottata(d) ? (pdfFieldValue(d, fields, 'determinazione_data') || pdfFieldValue(d, fields, 'determinazione_registrata_il')) : '',
    data_generazione: new Date().toLocaleString('it-IT'),
    generato_da: profile.fullName || profile.username || ''
  }
}

export function verbalePdfFileName (map: Record<string, string>): string {
  const prefix = getVerbalePdfFilePrefix(map) || 'proposta_contestazione'
  const base = String(map.n_rapporto || map.objectid || prefix).replace(/[^a-zA-Z0-9_-]/g, '_')
  return `${prefix}_${base || prefix}.pdf`
}

export async function buildVerbalePdfBlob (data: any, fields: LayerFieldInfo[], profile: { username: string, fullName: string }): Promise<{ blob: Blob, fileName: string }> {
  const map = buildVerbalePdfMap(data, fields, profile)
  const bytes = await buildVerbalePdf(map)
  const fileName = verbalePdfFileName(map)
  return { blob: new Blob([bytes as any], { type: 'application/pdf' }), fileName }
}

export function attoFinalePdfFileName (map: Record<string, string>): string {
  const prefix = getAttoFinalePdfFilePrefix(map) || 'atto_finale'
  const numero = String(map.accertamento_numero || '').trim().replace(/[^a-zA-Z0-9_-]/g, '_')
  const rapporto = String(map.n_rapporto || map.objectid || '').trim().replace(/[^a-zA-Z0-9_-]/g, '_')
  const base = numero || rapporto || prefix
  return `${prefix}_${base}.pdf`
}

export async function buildAttoFinalePdfBlob (data: any, fields: LayerFieldInfo[], profile: { username: string, fullName: string }): Promise<{ blob: Blob, fileName: string }> {
  const map = buildVerbalePdfMap(data, fields, profile)
  const bytes = await buildAttoFinalePdf(map)
  const fileName = attoFinalePdfFileName(map)
  return { blob: new Blob([bytes as any], { type: 'application/pdf' }), fileName }
}
