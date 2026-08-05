/* Shared GII alerts utilities.
 *
 * Scopo:
 * - calcolare gli allarmi attivi derivanti dai termini amministrativi;
 * - leggere la tabella GII_ALLARMI_ARCHIVIATI;
 * - filtrare gli allarmi già archiviati dall'utente corrente;
 * - archiviare un singolo allarme.
 *
 * Il modulo non monta UI e non dipende da un widget specifico.
 */

import { ensureAttivitaCorrentiJsonOnlyQueryFormat } from './attivita-correnti-query-format-fix'
import { isPracticeAssignedToCurrentTiAmm } from '../gii-access/ti-amm-assignment'

export type GiiAlertType =
  | 'PAGAMENTO_SCADUTO'
  | 'RICORSO_SCADUTO'
  | 'RICORSO_TARDIVO'
  | 'PAGAMENTO_RIDETERMINATO_SCADUTO'
  | 'PRATICA_DA_DEFINIRE'
  | 'PRATICA_DA_PRENDERE_IN_CARICO'
  | 'PRESA_IN_CARICO_TI_AMM'
  | 'PRESA_IN_CARICO_RI_AMM'
  | 'PRESA_IN_CARICO_DA'
  | 'PRESA_IN_CARICO_RZ_TEC'
  | 'PRESA_IN_CARICO_RZ_AGR'
  | 'PRESA_IN_CARICO_TI_TEC'
  | 'PRESA_IN_CARICO_RI_TEC'
  | 'PRESA_IN_CARICO_DT_TEC'
  | 'PRESA_IN_CARICO_TI_AGR'
  | 'PRESA_IN_CARICO_RI_AGR'
  | 'PRESA_IN_CARICO_DT_AGR'
  | 'PRESA_IN_CARICO_CORRENTE'
  | 'ATTIVITA_INFORMATIVA'
  | 'ALTRO'

export type GiiAlertStatus =
  | 'IN_SCADENZA'
  | 'SCADUTO'
  | 'CRITICO'
  | 'INFORMATIVO'

export type GiiAlertSeverity = 'red' | 'orange' | 'blue' | 'gray'

export interface GiiUserProfileForAlerts {
  username: string
  fullName?: string
  role?: string
  roleCod?: string
  areaCod?: string
  settoreCod?: string
  ufficio?: number | string | null
  isAdmin?: boolean
}

export interface GiiAlertItem {
  alertKey: string
  tipoAlert: GiiAlertType
  statoAlert: GiiAlertStatus
  severity: GiiAlertSeverity
  title: string
  message: string
  parentGlobalId: string
  parentObjectId: number | null
  reportCode: string
  termineData: number | null
  giorniResidui: number | null
  raw: Record<string, any>
}

export interface GiiArchivedAlertRecord {
  alert_key?: string
  username?: string
  tipo_alert?: string
  stato_alert_snapshot?: string
  parent_globalid?: string
  parent_objectid?: number
  archiviato_il?: number
  archiviato_da?: string
}

export interface GiiAlertQueryOptions {
  practiceLayerUrl: string
  archiveTableUrl: string
  user: GiiUserProfileForAlerts
  warningDays?: number
  now?: number | Date
  where?: string
  pageSize?: number
  includeArchived?: boolean
  signal?: AbortSignal
}

export interface GiiAlertQueryResult {
  alerts: GiiAlertItem[]
  archivedKeys: Set<string>
  counts: {
    total: number
    red: number
    orange: number
    blue: number
    gray: number
    scaduti: number
    inScadenza: number
    critici: number
    informativi: number
  }
}

export interface GiiArchiveAlertOptions {
  archiveTableUrl: string
  alert: GiiAlertItem
  user: GiiUserProfileForAlerts
  now?: number | Date
}

const DAY_MS = 24 * 60 * 60 * 1000

export const GII_ALERT_FIELDS = [
  'objectid',
  'OBJECTID',
  'globalid',
  'GlobalID',
  'numero_rapporto_tecnico',
  'numero_rilevazione',
  'area_cod',
  'settore_cod',
  'n_rapporto',
  'numero_rapporto',
  'codice_rapporto',
  'cod_pratica',
  'rapporto',
  'num_rapporto',
  'origine_pratica',
  'ti_amm_assegnato_username',
  'ti_amm_assegnato_user',
  'ti_amm_assegnato',
  'ti_amm_assegnato_nome',
  'ti_amm_assegnato_name',
  'ti_amm_username',
  'utente_TI_AMM',
  'utente_ti_amm',
  'stato_TI_AMM',
  'stato_RI_AMM',
  'determinazione_stato',
  'stato_RZ_TEC',
  'stato_RZ_AGR',
  'stato_RZ',
  'presa_in_carico_RZ_TEC',
  'presa_in_carico_RZ_AGR',
  'presa_in_carico_RZ',
  'stato_TI_TEC',
  'stato_RI_TEC',
  'stato_DT_TEC',
  'stato_TI_AGR',
  'stato_RI_AGR',
  'stato_DT_AGR',
  'stato_TI',
  'stato_RI',
  'stato_DT',
  'dt_stato_TI_AMM',
  'dt_stato_RI_AMM',
  'determinazione_data',
  'dt_stato_RZ_TEC',
  'dt_stato_RZ_AGR',
  'dt_stato_RZ',
  'dt_stato_TI_TEC',
  'dt_stato_RI_TEC',
  'dt_stato_DT_TEC',
  'dt_stato_TI_AGR',
  'dt_stato_RI_AGR',
  'dt_stato_DT_AGR',
  'tipo_atto_amm',
  'accertamento_numero',
  'accertamento_data',
  'determinazione_numero',
  'determinazione_trasmessa_firma_il',
  'notifica_data',
  'notifica_esito',
  'pagamento_scadenza',
  'pagamento_stato',
  'pagamento_importo_totale',
  'pagamento_importo_incassato',
  'termine_ricorso_data',
  'ricorso_presentato',
  'ricorso_data_presentazione',
  'termine_pagamento_rideterminato_data',
  'cda_importo_rideterminato',
  'definizione_pratica_esito',
  'definizione_pratica_data'
]

export const GII_ARCHIVE_FIELDS = [
  'alert_key',
  'parent_globalid',
  'parent_objectid',
  'tipo_alert',
  'username',
  'archiviato_il',
  'archiviato_da',
  'titolo_snapshot',
  'messaggio_snapshot',
  'termine_data_snapshot',
  'stato_alert_snapshot',
  'creato_il',
  'creato_da'
]

function normalizeKey (value: any): string {
  return String(value ?? '').trim().toLowerCase()
}

function attr (data: Record<string, any>, names: string[]): any {
  if (!data) return null
  const direct = names.find(n => Object.prototype.hasOwnProperty.call(data, n))
  if (direct) return data[direct]
  const map = new Map<string, any>()
  Object.keys(data).forEach(k => map.set(normalizeKey(k), data[k]))
  for (const n of names) {
    const v = map.get(normalizeKey(n))
    if (v !== undefined) return v
  }
  return null
}

function hasValue (value: any): boolean {
  return value !== null && value !== undefined && String(value).trim() !== ''
}

function asNumber (value: any): number {
  if (value === null || value === undefined || value === '') return 0
  const n = Number(String(value).replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

function asDateMs (value: any): number | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const d = value instanceof Date ? value : new Date(value)
  const t = d.getTime()
  return Number.isFinite(t) ? t : null
}

function dayStart (value: number | Date | undefined): number {
  const d = value instanceof Date ? new Date(value) : new Date(value ?? Date.now())
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function daysUntil (termineMs: number, nowStartMs: number): number {
  const d = new Date(termineMs)
  d.setHours(0, 0, 0, 0)
  return Math.ceil((d.getTime() - nowStartMs) / DAY_MS)
}

function isYes (value: any): boolean {
  const s = String(value ?? '').trim().toUpperCase()
  return ['1', 'SI', 'SÌ', 'YES', 'TRUE', 'Y'].includes(s)
}

function isPaidStatus (value: any): boolean {
  const s = String(value ?? '').trim().toUpperCase()
  if (!s) return false
  return (
    s.includes('PAGATO') ||
    s.includes('SALDATO') ||
    s.includes('INCASSATO') ||
    s === 'P' ||
    s === '2'
  )
}


function isDefinedClosed (value: any): boolean {
  const s = String(value ?? '').trim().toUpperCase()
  return !!s && !['DA_DEFINIRE', 'APERTO', 'IN_CORSO', ''].includes(s)
}

function cleanPracticeNumberText (value: any): string {
  return String(value ?? '')
    .trim()
    .replace(/^rapporto\s+tecnico\s+n\.?\s*/i, '')
    .replace(/^rapporto\s+n\.?\s*/i, '')
    .replace(/^rapporto\s*/i, '')
    .replace(/^rilevazione\s+n\.?\s*/i, '')
    .replace(/^rilevazione\s*/i, '')
    .trim()
}

function normalizePracticeSectorCode (value: any): string {
  const s = String(value ?? '').trim().toUpperCase()
  if (!s) return ''
  if (s === 'CS') return 'DS'
  const mDist = s.match(/^D\s*([1-6])$/)
  if (mDist) return `D${mDist[1]}`
  if (s === 'DS' || s === 'CR' || s === 'GI') return s
  return s
}

function practiceSectorForMessage (data: Record<string, any>): string {
  return normalizePracticeSectorCode(attr(data, [
    'settore_cod',
    'settore',
    'destinatario_settore',
    'settore_destinatario'
  ]))
}

function practicePrefixForMessage (data: Record<string, any>, rawCode?: any): 'TR' | 'TI' {
  const raw = String(rawCode ?? '').trim().toUpperCase()
  if (/(^|[-_\s])TI([-_\s]|$)/.test(raw) || /^TI[-_\s]/.test(raw)) return 'TI'
  if (/(^|[-_\s])TR([-_\s]|$)/.test(raw) || /^TR[-_\s]/.test(raw)) return 'TR'
  const op = String(attr(data, ['origine_pratica']) ?? '').trim().toUpperCase()
  return (op === '2' || op === 'TI') ? 'TI' : 'TR'
}

function officialReportNumberForMessage (data: Record<string, any>): string {
  const candidates = [
    attr(data, ['numero_rapporto_tecnico']),
    attr(data, ['n_rapporto']),
    attr(data, ['numero_rapporto']),
    attr(data, ['codice_rapporto']),
    attr(data, ['rapporto']),
    attr(data, ['num_rapporto'])
  ]
  for (const candidate of candidates) {
    const text = cleanPracticeNumberText(candidate)
    if (!text || /^[-–—]+$/.test(text)) continue
    // I numeri provvisori di rilevazione non sono numeri ufficiali di rapporto.
    if (/^RILEVAZIONE\b/i.test(String(candidate ?? '').trim())) continue
    if (/^(TR|TI)[-_\s]*\d+/i.test(text)) continue
    if (/^\d+[-_\s]*(TR|TI)\b/i.test(text)) continue
    if (/^R[-_\s]*\d+/i.test(text) || /^\d+\s*\/\s*\d{4}$/.test(text)) return text.replace(/\s+/g, '')
  }
  return ''
}

function rilevazioneNumberForMessage (data: Record<string, any>, oid: number | null): string {
  const rawCandidate = cleanPracticeNumberText(
    attr(data, ['numero_rilevazione']) ||
    attr(data, ['cod_pratica']) ||
    attr(data, ['numero_rapporto']) ||
    attr(data, ['n_rapporto']) ||
    ''
  )
  const raw = rawCandidate.toUpperCase().replace(/_/g, '-').replace(/\s+/g, '-')
  const settore = practiceSectorForMessage(data)

  let oidPart = oid != null && Number.isFinite(Number(oid)) ? String(Number(oid)) : ''
  let prefix = practicePrefixForMessage(data, raw)
  let sectorPart = settore

  let m = raw.match(/^(TR|TI)-?(\d+)(?:-([A-Z0-9]+))?$/i)
  if (m) {
    prefix = m[1].toUpperCase() as 'TR' | 'TI'
    oidPart = m[2]
    if (!sectorPart && m[3]) sectorPart = normalizePracticeSectorCode(m[3])
  } else {
    m = raw.match(/^(\d+)-?(TR|TI)(?:-([A-Z0-9]+))?$/i)
    if (m) {
      oidPart = m[1]
      prefix = m[2].toUpperCase() as 'TR' | 'TI'
      if (!sectorPart && m[3]) sectorPart = normalizePracticeSectorCode(m[3])
    } else if (/^\d+$/.test(raw)) {
      oidPart = raw
    }
  }

  const base = oidPart || rawCandidate || '—'
  if (base === '—') return base
  return sectorPart ? `${base}-${prefix}-${sectorPart}` : `${base}-${prefix}`
}

function practiceDescriptionForMessage (data: Record<string, any>, oid: number | null): string {
  const reportNumber = officialReportNumberForMessage(data)
  if (reportNumber) return `Rapporto tecnico n. ${reportNumber}`
  return `Rilevazione n. ${rilevazioneNumberForMessage(data, oid)}`
}

function getReportCode (data: Record<string, any>, oid: number | null): string {
  return practiceDescriptionForMessage(data, oid)
}


function getParentObjectId (data: Record<string, any>): number | null {
  const v = attr(data, ['objectid', 'OBJECTID'])
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function getParentGlobalId (data: Record<string, any>): string {
  return String(attr(data, ['globalid', 'GlobalID']) || '').trim()
}

function makeKeyDatePart (dateMs: number | null): string {
  if (dateMs == null) return 'NO_DATE'
  const d = new Date(dateMs)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function isGiiTakeChargeAlert (alertOrType: GiiAlertItem | GiiAlertType | string | null | undefined): boolean {
  const tipo = typeof alertOrType === 'object'
    ? String((alertOrType as GiiAlertItem)?.tipoAlert || '')
    : String(alertOrType || '')
  return tipo.toUpperCase().startsWith('PRESA_IN_CARICO_')
}

export function buildGiiAlertKey (parentGlobalId: string, tipoAlert: GiiAlertType, termineMs: number | null): string {
  return `${String(parentGlobalId || '').trim()}|${tipoAlert}|${makeKeyDatePart(termineMs)}`
}

function statusForTerm (termineMs: number, nowStartMs: number, warningDays: number): { status: GiiAlertStatus, severity: GiiAlertSeverity, giorniResidui: number } | null {
  const giorniResidui = daysUntil(termineMs, nowStartMs)
  if (giorniResidui < 0) return { status: 'SCADUTO', severity: 'red', giorniResidui }
  if (giorniResidui <= warningDays) return { status: 'IN_SCADENZA', severity: 'orange', giorniResidui }
  return null
}

function makeAlert (args: {
  data: Record<string, any>
  tipoAlert: GiiAlertType
  statoAlert: GiiAlertStatus
  severity: GiiAlertSeverity
  title: string
  message: string
  termineMs: number | null
  giorniResidui: number | null
}): GiiAlertItem | null {
  const parentGlobalId = getParentGlobalId(args.data)
  if (!parentGlobalId) return null
  const parentObjectId = getParentObjectId(args.data)
  const reportCode = getReportCode(args.data, parentObjectId)
  return {
    alertKey: buildGiiAlertKey(parentGlobalId, args.tipoAlert, args.termineMs),
    tipoAlert: args.tipoAlert,
    statoAlert: args.statoAlert,
    severity: args.severity,
    title: args.title,
    message: args.message,
    parentGlobalId,
    parentObjectId,
    reportCode,
    termineData: args.termineMs,
    giorniResidui: args.giorniResidui,
    raw: args.data
  }
}

function isPaymentCompleted (data: Record<string, any>, expectedAmount: number): boolean {
  const status = attr(data, ['pagamento_stato'])
  if (isPaidStatus(status)) return true
  if (expectedAmount <= 0) return false
  const paid = asNumber(attr(data, ['pagamento_importo_incassato']))
  return paid >= expectedAmount
}

function isAttoDefinitivoForAlerts (data: Record<string, any>): boolean {
  const tipoAtto = normalizeAlertCode(attr(data, ['tipo_atto_amm']))
  const prevedeAtto = tipoAtto === 'VERBALE' || tipoAtto === 'VERBALE_RISARCIMENTO'
  const determinazioneAdottata = normalizeAlertCode(attr(data, ['determinazione_stato'])) === 'ADOTTATA' || (hasValue(attr(data, ['determinazione_numero'])) && hasValue(attr(data, ['determinazione_data'])))
  if (prevedeAtto) {
    return hasValue(attr(data, ['accertamento_numero'])) && hasValue(attr(data, ['accertamento_data']))
  }
  return determinazioneAdottata
}

function isAttoNotificatoForAlerts (data: Record<string, any>): boolean {
  const esito = normalizeAlertCode(attr(data, ['notifica_esito']))
  return (esito === 'NOTIFICATA' || esito === 'COMPIUTA_GIACENZA') && hasValue(attr(data, ['notifica_data']))
}

function normalizeAlertCode (value: any): string {
  return String(value ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_')
}

const LOG_TABLE_URL = 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_LOG_EVENTI_CICLI/FeatureServer/0'

type LogHistoryItem = {
  evento: string
  ruolo: string
  ruoloDest: string
}

type LogEntry = {
  utente: string
  ruolo: string
  area: string
  settore: string
  evento: string
  dt: number | null
  ruoloDest: string
  utenteDest: string
  history?: LogHistoryItem[]
}

const ALLOWED_OGGETTI = new Set([
  'NUOVA RILEVAZIONE',
  'ASSEGNAZIONE ISTRUTTORIA',
  'TRASMISSIONE ISTRUTTORIA',
  'RICHIESTA DI INTEGRAZIONE',
  'TRASMISSIONE INTEGRAZIONE',
  'RILEVAZIONE RESPINTA',
  'ISTRUTTORIA TECNICA RESPINTA',
  'ISTRUTTORIA TECNICA APPROVATA',
  'SANZIONE APPROVATA',
  'SANZIONE RESPINTA',
  'SANZIONE NOTIFICATA'
])

const ALLOWED_LOG_EVENTI = new Set([
  'CREAZIONE',
  'NUOVA_ASSEGNAZIONE',
  'INTEGRAZIONE_TRASMESSA',
  'INTEGRAZIONE_RICHIESTA',
  'ISTRUTTORIA_TRASMESSA',
  'RAPPORTO_APPROVATO',
  'SANZIONE_APPROVATA',
  'SANZIONE_NOTIFICATA',
  'VERBALE_NOTIFICATO',
  'RESTITUZIONE_A_TI_AMM',
  'RESPINTA',
  'RIMANDA_A_DT'
])

function normGid (v: any): string {
  return String(v ?? '').trim().replace(/^\{|\}$/g, '').toLowerCase()
}

function normalizeOggettoLabel (label: any): string {
  const v = String(label || '').trim().toUpperCase().replace(/\s+/g, ' ')
  if (!v) return '—'
  if (v === 'TRASMESSIONE ISTRUTTORIA') return 'TRASMISSIONE ISTRUTTORIA'
  if (v === 'TRASMESSIONE INTEGRAZIONE') return 'TRASMISSIONE INTEGRAZIONE'
  if (ALLOWED_OGGETTI.has(v)) return v
  return '—'
}

function isOggettoLogEvent (evento: any): boolean {
  const e = String(evento || '').trim().toUpperCase()
  return ALLOWED_LOG_EVENTI.has(e)
}

function normalizeLogRole (role: any): string {
  const r = String(role || '').trim().toUpperCase().replace(/[\s-]+/g, '_')
  if (r === 'RI_AMM' || r === 'TI_AMM') return r
  if (r === 'DA_AMM') return 'DA'
  if (r.startsWith('DT')) return 'DT'
  if (r.startsWith('RI') && r !== 'RI_AMM') return 'RI'
  if (r.startsWith('RZ')) return 'RZ'
  if (r.startsWith('TI') && r !== 'TI_AMM') return 'TI'
  if (r.startsWith('TR')) return 'TR'
  if (r.startsWith('DA')) return 'DA'
  return r
}

function formatCausale (evento: string): string {
  const e = String(evento || '').trim().toUpperCase()
  if (!e) return '—'
  if (e === 'CREAZIONE') return 'NUOVA RILEVAZIONE'
  if (e === 'NUOVA_ASSEGNAZIONE') return 'ASSEGNAZIONE ISTRUTTORIA'
  if (e === 'INTEGRAZIONE_TRASMESSA') return 'TRASMISSIONE INTEGRAZIONE'
  if (e === 'INTEGRAZIONE_RICHIESTA') return 'RICHIESTA DI INTEGRAZIONE'
  if (e === 'ISTRUTTORIA_TRASMESSA') return 'TRASMISSIONE ISTRUTTORIA'
  if (e === 'RAPPORTO_APPROVATO') return 'ISTRUTTORIA TECNICA APPROVATA'
  if (e === 'SANZIONE_APPROVATA') return 'SANZIONE APPROVATA'
  if (e === 'SANZIONE_NOTIFICATA' || e === 'VERBALE_NOTIFICATO') return 'SANZIONE NOTIFICATA'
  if (e === 'RESTITUZIONE_A_TI_AMM') return 'TRASMISSIONE INTEGRAZIONE'
  if (e === 'RESPINTA') return 'ISTRUTTORIA TECNICA RESPINTA'
  if (e === 'RIMANDA_A_DT') return 'TRASMISSIONE INTEGRAZIONE'
  return '—'
}

function isTransmissionReturnEvent (evento: any): boolean {
  const e = String(evento || '').trim().toUpperCase()
  return e === 'ISTRUTTORIA_TRASMESSA' ||
    e === 'INTEGRAZIONE_TRASMESSA' ||
    e === 'RAPPORTO_APPROVATO' ||
    e === 'SANZIONE_APPROVATA' ||
    e === 'RESTITUZIONE_A_TI_AMM' ||
    e === 'RIMANDA_A_DT'
}

function transmissionAnswersIntegration (log: LogEntry): boolean {
  const currentEvent = String(log.evento || '').trim().toUpperCase()
  if (!isTransmissionReturnEvent(currentEvent)) return false

  const chronological: LogHistoryItem[] = [
    ...(log.history || []).slice().reverse(),
    { evento: log.evento, ruolo: log.ruolo, ruoloDest: log.ruoloDest }
  ]
  const open: Array<{ requester: string, target: string }> = []

  for (let i = 0; i < chronological.length; i++) {
    const item = chronological[i]
    const event = String(item.evento || '').trim().toUpperCase()
    const sender = normalizeLogRole(item.ruolo)
    const receiver = normalizeLogRole(item.ruoloDest)
    const isCurrent = i === chronological.length - 1

    if (event === 'INTEGRAZIONE_RICHIESTA') {
      if (sender && receiver) open.push({ requester: sender, target: receiver })
      continue
    }

    if (!isTransmissionReturnEvent(event)) continue

    const isIntegrationReturn = open.length > 0
    if (isCurrent) return isIntegrationReturn

    if (isIntegrationReturn && receiver) {
      const closeIndex = open.map(req => req.requester).lastIndexOf(receiver)
      if (closeIndex >= 0) open.splice(closeIndex)
    }
  }

  return false
}

function readAlertRoleNumber (d: any, role: string, kind: 'presa' | 'stato' | 'esito'): number | null {
  const field = kind === 'presa' ? `presa_in_carico_${role}` : `${kind}_${role}`
  const v = attr(d, [field])
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function formatCausaleForLog (log: LogEntry | null, d: any): string {
  if (!log) return '—'
  const evento = String(log.evento || '').trim().toUpperCase()
  let label = ''
  if (evento === 'RESPINTA') {
    const ruolo = normalizeLogRole(log.ruolo)
    if (ruolo === 'DA') label = 'SANZIONE RESPINTA'
    else if (ruolo === 'DT') label = 'ISTRUTTORIA TECNICA RESPINTA'
    else if (ruolo === 'RZ') {
      const tiAssigned = String(
        attr(d, ['ti_assegnato_username']) ??
        attr(d, ['ti_assegnato_user']) ??
        attr(d, ['ti_assegnato']) ??
        ''
      ).trim()
      const tiEsito = readAlertRoleNumber(d, 'TI', 'esito')
      label = (tiAssigned || tiEsito !== null) ? 'ISTRUTTORIA TECNICA RESPINTA' : 'RILEVAZIONE RESPINTA'
    } else {
      label = 'ISTRUTTORIA TECNICA RESPINTA'
    }
  } else if (evento === 'ISTRUTTORIA_TRASMESSA' && transmissionAnswersIntegration(log)) {
    label = 'TRASMISSIONE INTEGRAZIONE'
  } else {
    label = formatCausale(evento)
  }
  return normalizeOggettoLabel(label)
}

function baseWorkflowRoleForAlert (roleAreaKey: string): string {
  if (roleAreaKey === 'TI_AMM' || roleAreaKey === 'RI_AMM' || roleAreaKey === 'DA') return roleAreaKey
  if (roleAreaKey.endsWith('_TEC') || roleAreaKey.endsWith('_AGR')) return roleAreaKey.replace(/_(TEC|AGR)$/i, '')
  return roleAreaKey
}

function takeChargeTitleForMessage (label: string, row: Record<string, any>): string {
  const hay = `${label || ''} ${attr(row, ['tipo_attivita']) || ''} ${attr(row, ['sottotipo_attivita']) || ''} ${attr(row, ['titolo']) || ''} ${attr(row, ['messaggio']) || ''} ${attr(row, ['origine_evento']) || ''}`.toUpperCase()
  if (hay.includes('ATTESTAZIONE_CONFORMITA') || hay.includes('ATTESTAZIONE DI CONFORMIT')) return 'Attestazione di conformità apposta'
  if (hay.includes('PROPOSTA_CONTESTAZIONE_APPROVATA') || hay.includes('PROPOSTA DI CONTESTAZIONE APPROVATA')) return 'Proposta di contestazione approvata'
  if (hay.includes('BOZZA_DETERMINAZIONE') || hay.includes('BOZZA DETERMINAZIONE')) return 'Bozza determinazione da verificare'
  if (hay.includes('INTEGRAZ')) return 'Richiesta di integrazione ricevuta'
  return 'Nuova istruttoria ricevuta'
}

function takeChargeTextFromElencoLogic (
  roleAreaKey: string,
  log: LogEntry | null | undefined,
  data: Record<string, any>,
  reportCode: string
): { title: string, message: string } {
  const label = formatCausaleForLog(log || null, data)
  const parentObjectId = getParentObjectId(data)
  return {
    title: takeChargeTitleForMessage(label, data),
    message: practiceDescriptionForMessage(data, parentObjectId)
  }
}


function latestLogTargetsRole (log: LogEntry | null | undefined, roleAreaKey: string): boolean {
  if (!log) return false
  const dest = normalizeLogRole(log.ruoloDest)
  const role = baseWorkflowRoleForAlert(roleAreaKey)
  return !!dest && !!role && dest === role
}

function roleAreaKeyForAlerts (data: Record<string, any>, options?: { user?: GiiUserProfileForAlerts }): string {
  const role = normalizeAlertCode(options?.user?.role || options?.user?.roleCod || (options?.user as any)?.profiloCod || (options?.user as any)?.ruoloCod)
  const area = normalizeAlertCode(options?.user?.areaCod || (options?.user as any)?.area)
  if (role === 'ADMIN') return 'ADMIN'
  if (role === 'DA') return 'DA'
  if (role === 'TI_AMM' || role === 'RI_AMM') return role
  if (role === 'TI' && area === 'AMM') return 'TI_AMM'
  if (role === 'RI' && area === 'AMM') return 'RI_AMM'
  if (role === 'RZ' && area === 'TEC') return 'RZ_TEC'
  if (role === 'TI' && area === 'TEC') return 'TI_TEC'
  if (role === 'RI' && area === 'TEC') return 'RI_TEC'
  if (role === 'DT' && area === 'TEC') return 'DT_TEC'
  if (role === 'RZ' && area === 'AGR') return 'RZ_AGR'
  if (role === 'TI' && area === 'AGR') return 'TI_AGR'
  if (role === 'RI' && area === 'AGR') return 'RI_AGR'
  if (role === 'DT' && area === 'AGR') return 'DT_AGR'
  if (role.endsWith('_TEC') || role.endsWith('_AGR')) return role
  return role
}

function isTakeChargeState (value: any): boolean {
  const s = normalizeAlertCode(value)
  if (!s) return false
  if (s === '1') return true
  return s.includes('DA_PRENDERE_IN_CARICO') || s.includes('DA_PRENDERE') || s.includes('PRESA_DA_FARE')
}

function isBozzaDeterminazioneTrasmessaRiAmmForAlerts (data: Record<string, any>): boolean {
  const stato = normalizeAlertCode(attr(data, ['determinazione_stato', 'DETERMINAZIONE_STATO']))
  if (stato === 'TRASMESSA_RI_AMM' || stato === 'BOZZA_TRASMESSA_RI_AMM') return true

  // Fallback per viste/allarmi che non espongono determinazione_stato: dopo la
  // trasmissione della bozza al Responsabile il nodo RI_AMM è aperto (stato/presa
  // 1 o 2) e il nodo TI_AMM è chiuso con esito conforme. Il solo visto TI_AMM
  // imposta invece RI_AMM a 4/null e non deve generare attività operativa.
  const statoRiAmm = normalizeAlertCode(attr(data, ['stato_RI_AMM', 'STATO_RI_AMM']))
  const presaRiAmm = normalizeAlertCode(attr(data, ['presa_in_carico_RI_AMM', 'PRESA_IN_CARICO_RI_AMM']))
  const statoTiAmm = normalizeAlertCode(attr(data, ['stato_TI_AMM', 'STATO_TI_AMM']))
  const esitoTiAmm = normalizeAlertCode(attr(data, ['esito_TI_AMM', 'ESITO_TI_AMM']))
  const riAmmOpen = statoRiAmm === '1' || statoRiAmm === '2' || presaRiAmm === '1' || presaRiAmm === '2'
  const tiAmmClosedConforme = (statoTiAmm === '4' || statoTiAmm === 'APPROVATA' || statoTiAmm === 'TRASMESSO') && (esitoTiAmm === '2' || esitoTiAmm === 'APPROVATA' || esitoTiAmm === 'CONFORME')
  return riAmmOpen && tiAmmClosedConforme
}

function isVistoTiAmmOnlyBeforeBozzaForAlerts (data: Record<string, any>): boolean {
  const esitoTiAmm = normalizeAlertCode(attr(data, ['esito_TI_AMM', 'ESITO_TI_AMM']))
  if (esitoTiAmm !== '2' && esitoTiAmm !== 'APPROVATA' && esitoTiAmm !== 'CONFORME') return false
  return !isBozzaDeterminazioneTrasmessaRiAmmForAlerts(data)
}

function isStaleTiAmmAttestationCurrentActivity (row: Record<string, any>): boolean {
  const tipo = normalizeAlertCode(attr(row, ['tipo_attivita']))
  const dest = normalizeAlertCode(attr(row, ['destinatario_ruolo']))
  const subtipo = normalizeAlertCode(attr(row, ['sottotipo_attivita']))
  const origine = normalizeAlertCode(attr(row, ['origine_evento']))
  const titolo = normalizeAlertCode(attr(row, ['titolo']))
  return tipo === 'PRESA_IN_CARICO' &&
    dest === 'RI_AMM' &&
    (subtipo === 'ATTESTAZIONE_CONFORMITA_TI_AMM' || origine === 'ATTESTAZIONE_CONFORMITA' || titolo.includes('ATTESTAZIONE_DI_CONFORMITA'))
}

function takeChargeConfigForRole (roleAreaKey: string): { tipo: GiiAlertType, fieldNames: string[], title: string } | null {
  switch (roleAreaKey) {
    case 'TI_AMM': return { tipo: 'PRESA_IN_CARICO_TI_AMM', fieldNames: ['stato_TI_AMM'], title: 'Pratica da prendere in carico' }
    case 'RI_AMM': return { tipo: 'PRESA_IN_CARICO_RI_AMM', fieldNames: ['stato_RI_AMM'], title: 'Pratica da prendere in carico' }

    case 'RZ_TEC': return { tipo: 'PRESA_IN_CARICO_RZ_TEC', fieldNames: ['stato_RZ_TEC', 'stato_RZ', 'presa_in_carico_RZ_TEC', 'presa_in_carico_RZ'], title: 'Rapporto da prendere in carico' }
    case 'RZ_AGR': return { tipo: 'PRESA_IN_CARICO_RZ_AGR', fieldNames: ['stato_RZ_AGR', 'stato_RZ', 'presa_in_carico_RZ_AGR', 'presa_in_carico_RZ'], title: 'Rapporto da prendere in carico' }
    case 'TI_TEC': return { tipo: 'PRESA_IN_CARICO_TI_TEC', fieldNames: ['stato_TI_TEC', 'stato_TI'], title: 'Rapporto da prendere in carico' }
    case 'RI_TEC': return { tipo: 'PRESA_IN_CARICO_RI_TEC', fieldNames: ['stato_RI_TEC', 'stato_RI'], title: 'Rapporto da prendere in carico' }
    case 'DT_TEC': return { tipo: 'PRESA_IN_CARICO_DT_TEC', fieldNames: ['stato_DT_TEC', 'stato_DT'], title: 'Rapporto da prendere in carico' }

    case 'TI_AGR': return { tipo: 'PRESA_IN_CARICO_TI_AGR', fieldNames: ['stato_TI_AGR', 'stato_TI'], title: 'Rapporto da prendere in carico' }
    case 'RI_AGR': return { tipo: 'PRESA_IN_CARICO_RI_AGR', fieldNames: ['stato_RI_AGR', 'stato_RI'], title: 'Rapporto da prendere in carico' }
    case 'DT_AGR': return { tipo: 'PRESA_IN_CARICO_DT_AGR', fieldNames: ['stato_DT_AGR', 'stato_DT'], title: 'Rapporto da prendere in carico' }

    default: return null
  }
}

function computeTakeChargeAlert (data: Record<string, any>, options?: { user?: GiiUserProfileForAlerts, log?: LogEntry | null }): GiiAlertItem | null {
  const roleAreaKey = roleAreaKeyForAlerts(data, options)
  const cfg = takeChargeConfigForRole(roleAreaKey)
  if (!cfg) return null

  if (roleAreaKey === 'RI_AMM' && isVistoTiAmmOnlyBeforeBozzaForAlerts(data)) return null

  const state = attr(data, cfg.fieldNames)
  const hasExplicitState = state !== null && state !== undefined && String(state).trim() !== ''
  const logTargetsCurrentRole = latestLogTargetsRole(options?.log, roleAreaKey)

  // Coerente con gii-elenco: se il campo stato dice "da prendere in carico" lo mostriamo;
  // se il campo non è disponibile nella vista ma l'ultimo log utile è destinato al ruolo corrente,
  // lo trattiamo comunque come attività da prendere in carico.
  if (!isTakeChargeState(state) && !(logTargetsCurrentRole && !hasExplicitState)) return null

  const parentObjectId = getParentObjectId(data)
  const reportCode = getReportCode(data, parentObjectId)
  const display = takeChargeTextFromElencoLogic(roleAreaKey, options?.log || null, data, reportCode)

  return makeAlert({
    data,
    tipoAlert: cfg.tipo,
    statoAlert: 'INFORMATIVO',
    severity: 'blue',
    title: display.title || cfg.title,
    message: display.message,
    termineMs: null,
    giorniResidui: null
  })
}

export function computeGiiAlertsFromPractice (data: Record<string, any>, options?: { now?: number | Date, warningDays?: number, user?: GiiUserProfileForAlerts, log?: LogEntry | null }): GiiAlertItem[] {
  const nowStartMs = dayStart(options?.now)
  const warningDays = Number.isFinite(Number(options?.warningDays)) ? Number(options?.warningDays) : 5
  const alerts: GiiAlertItem[] = []

  const roleAreaKeyForGate = roleAreaKeyForAlerts(data, options)
  if (roleAreaKeyForGate === 'TI_AMM' && !isPracticeAssignedToCurrentTiAmm(data, options?.user)) return alerts

  const takeChargeAlert = computeTakeChargeAlert(data, { user: options?.user, log: options?.log || null })
  if (takeChargeAlert) alerts.push(takeChargeAlert)

  if (!isAttoDefinitivoForAlerts(data) || !isAttoNotificatoForAlerts(data)) return alerts
  const parentObjectId = getParentObjectId(data)
  const reportCode = getReportCode(data, parentObjectId)

  const totalDue = asNumber(attr(data, ['pagamento_importo_totale']))
  const paymentTermMs = asDateMs(attr(data, ['pagamento_scadenza']))
  if (paymentTermMs != null && totalDue > 0 && !isPaymentCompleted(data, totalDue)) {
    const state = statusForTerm(paymentTermMs, nowStartMs, warningDays)
    if (state) {
      const title = state.status === 'SCADUTO'
        ? 'Pagamento scaduto'
        : 'Pagamento in scadenza'
      const message = state.status === 'SCADUTO'
        ? `Il termine di pagamento del ${reportCode} è decorso senza che risulti registrato il pagamento integrale.`
        : `Il termine di pagamento del ${reportCode} scade tra ${state.giorniResidui} giorni.`
      const a = makeAlert({
        data,
        tipoAlert: 'PAGAMENTO_SCADUTO',
        statoAlert: state.status,
        severity: state.severity,
        title,
        message,
        termineMs: paymentTermMs,
        giorniResidui: state.giorniResidui
      })
      if (a) alerts.push(a)
    }
  }

  const ricorsoTermMs = asDateMs(attr(data, ['termine_ricorso_data']))
  const ricorsoPresentato = isYes(attr(data, ['ricorso_presentato']))
  const ricorsoDataMs = asDateMs(attr(data, ['ricorso_data_presentazione']))
  if (ricorsoTermMs != null && ricorsoPresentato && ricorsoDataMs != null && dayStart(ricorsoDataMs) > dayStart(ricorsoTermMs)) {
    const a = makeAlert({
      data,
      tipoAlert: 'RICORSO_TARDIVO',
      statoAlert: 'CRITICO',
      severity: 'red',
      title: 'Ricorso presentato oltre il termine',
      message: `Il ricorso relativo al ${reportCode} risulta presentato oltre il termine indicato.`,
      termineMs: ricorsoTermMs,
      giorniResidui: daysUntil(ricorsoTermMs, nowStartMs)
    })
    if (a) alerts.push(a)
  } else if (ricorsoTermMs != null && !ricorsoPresentato) {
    const state = statusForTerm(ricorsoTermMs, nowStartMs, warningDays)
    if (state) {
      const title = state.status === 'SCADUTO'
        ? 'Termine ricorso scaduto'
        : 'Termine ricorso in scadenza'
      const message = state.status === 'SCADUTO'
        ? `Il termine per la presentazione del ricorso relativo al ${reportCode} è decorso senza ricorso registrato.`
        : `Il termine per la presentazione del ricorso relativo al ${reportCode} scade tra ${state.giorniResidui} giorni.`
      const a = makeAlert({
        data,
        tipoAlert: 'RICORSO_SCADUTO',
        statoAlert: state.status,
        severity: state.severity,
        title,
        message,
        termineMs: ricorsoTermMs,
        giorniResidui: state.giorniResidui
      })
      if (a) alerts.push(a)
    }
  }

  const ridetTermMs = asDateMs(attr(data, ['termine_pagamento_rideterminato_data']))
  const ridetAmount = asNumber(attr(data, ['cda_importo_rideterminato']))
  if (ridetTermMs != null && ridetAmount > 0 && !isPaymentCompleted(data, ridetAmount)) {
    const state = statusForTerm(ridetTermMs, nowStartMs, warningDays)
    if (state) {
      const title = state.status === 'SCADUTO'
        ? 'Pagamento rideterminato scaduto'
        : 'Pagamento rideterminato in scadenza'
      const message = state.status === 'SCADUTO'
        ? `Il termine per il pagamento rideterminato del ${reportCode} è decorso senza che risulti registrato il pagamento integrale.`
        : `Il termine per il pagamento rideterminato del ${reportCode} scade tra ${state.giorniResidui} giorni.`
      const a = makeAlert({
        data,
        tipoAlert: 'PAGAMENTO_RIDETERMINATO_SCADUTO',
        statoAlert: state.status,
        severity: state.severity,
        title,
        message,
        termineMs: ridetTermMs,
        giorniResidui: state.giorniResidui
      })
      if (a) alerts.push(a)
    }
  }

  const definitionDate = asDateMs(attr(data, ['definizione_pratica_data']))
  const definitionOutcome = attr(data, ['definizione_pratica_esito'])
  const hasAnyClosedPostNotificationTerm =
    (paymentTermMs != null && daysUntil(paymentTermMs, nowStartMs) < 0) ||
    (ricorsoTermMs != null && daysUntil(ricorsoTermMs, nowStartMs) < 0) ||
    (ridetTermMs != null && daysUntil(ridetTermMs, nowStartMs) < 0)

  if (hasAnyClosedPostNotificationTerm && definitionDate == null && !isDefinedClosed(definitionOutcome)) {
    const a = makeAlert({
      data,
      tipoAlert: 'PRATICA_DA_DEFINIRE',
      statoAlert: 'INFORMATIVO',
      severity: 'blue',
      title: 'Pratica da definire',
      message: `Il ${reportCode} presenta termini post-notifica decorsi e non risulta ancora definito.`,
      termineMs: null,
      giorniResidui: null
    })
    if (a) alerts.push(a)
  }

  return alerts
}

export function computeGiiAlertsFromPractices (rows: Array<Record<string, any>>, options?: { now?: number | Date, warningDays?: number, user?: GiiUserProfileForAlerts, logMap?: Map<string, LogEntry> }): GiiAlertItem[] {
  return (rows || []).flatMap(row => {
    const gid = normGid(getParentGlobalId(row))
    const log = gid ? options?.logMap?.get(gid) || null : null
    return computeGiiAlertsFromPractice(row, { now: options?.now, warningDays: options?.warningDays, user: options?.user, log })
  })
}

export function filterArchivedGiiAlerts (alerts: GiiAlertItem[], archivedKeys: Set<string>, includeArchived?: boolean): GiiAlertItem[] {
  if (includeArchived) return alerts

  // Le attività operative di presa in carico non sono archiviabili:
  // devono persistere finché lo stato della pratica resta "da prendere in carico"
  // e sparire solo dopo l'effettiva presa in carico.
  return (alerts || []).filter(a => isGiiTakeChargeAlert(a) || !archivedKeys.has(a.alertKey))
}

export function summarizeGiiAlerts (alerts: GiiAlertItem[]): GiiAlertQueryResult['counts'] {
  const list = alerts || []
  return {
    total: list.length,
    red: list.filter(a => a.severity === 'red').length,
    orange: list.filter(a => a.severity === 'orange').length,
    blue: list.filter(a => a.severity === 'blue').length,
    gray: list.filter(a => a.severity === 'gray').length,
    scaduti: list.filter(a => a.statoAlert === 'SCADUTO').length,
    inScadenza: list.filter(a => a.statoAlert === 'IN_SCADENZA').length,
    critici: list.filter(a => a.statoAlert === 'CRITICO').length,
    informativi: list.filter(a => a.statoAlert === 'INFORMATIVO').length
  }
}

function escapeSqlString (value: string): string {
  return String(value || '').replace(/'/g, "''")
}

async function loadEsriModule<T = any> (path: string): Promise<T> {
  const req = (window as any)?.require
  if (!req) throw new Error('ArcGIS AMD loader non disponibile.')
  return await new Promise<T>((resolve, reject) => {
    try {
      req([path], (m: T) => resolve(m), (e: any) => reject(e))
    } catch (e) {
      reject(e)
    }
  })
}

function normalizeLayerUrlForAlerts (url: string): string {
  let s = String(url || '').trim().replace(/[?#].*$/, '').replace(/\/+$/, '')
  if (/\/(FeatureServer|MapServer)$/i.test(s)) s = `${s}/0`
  return s
}

function isGiiAbortError (error: any): boolean {
  return String(error?.name || '').toLowerCase() === 'aborterror' ||
    String(error?.message || '').toLowerCase().includes('abort')
}

function throwIfGiiAborted (signal?: AbortSignal): void {
  if (!signal?.aborted) return
  const error = new Error('Operazione annullata.')
  ;(error as any).name = 'AbortError'
  throw error
}

async function makeFeatureLayer (url: string, signal?: AbortSignal): Promise<any> {
  const normalizedUrl = normalizeLayerUrlForAlerts(url)
  if (!normalizedUrl) throw new Error('URL layer/tabella non configurato.')
  throwIfGiiAborted(signal)
  const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
  throwIfGiiAborted(signal)
  const layer = new FeatureLayer({ url: normalizedUrl })

  if (typeof layer.load === 'function') {
    await layer.load(signal ? { signal } : undefined)
  }
  throwIfGiiAborted(signal)
  return layer
}

function alertOutFieldsForLayer (layer: any): string[] {
  const available = new Map<string, string>()
  ;(Array.isArray(layer?.fields) ? layer.fields : []).forEach((f: any) => {
    const name = String(f?.name || '').trim()
    if (name) available.set(name.toLowerCase(), name)
  })
  const out: string[] = []
  GII_ALERT_FIELDS.forEach(name => {
    const real = available.get(String(name).toLowerCase())
    if (real && !out.includes(real)) out.push(real)
  })
  return out.length ? out : ['*']
}

async function queryAllRows (layer: any, query: any, pageSize: number, signal?: AbortSignal): Promise<Array<Record<string, any>>> {
  const rows: Array<Record<string, any>> = []
  let start = 0
  const size = Number.isFinite(Number(pageSize)) && Number(pageSize) > 0 ? Number(pageSize) : 1000

  while (true) {
    throwIfGiiAborted(signal)
    const q = {
      where: '1=1',
      outFields: ['*'],
      returnGeometry: false,
      ...query,
      resultOffset: start,
      resultRecordCount: size
    }
    const res = await layer.queryFeatures(q, signal ? { signal } : undefined)
    throwIfGiiAborted(signal)
    const features = Array.isArray(res?.features) ? res.features : []
    features.forEach((f: any) => rows.push({ ...(f?.attributes || {}) }))
    if (features.length < size) break
    start += size
  }

  return rows
}


async function loadAlertLogMap (rows: Array<Record<string, any>>, signal?: AbortSignal): Promise<Map<string, LogEntry>> {
  const gids = Array.from(new Set((rows || []).map(row => normGid(getParentGlobalId(row))).filter(Boolean)))
  const map = new Map<string, LogEntry>()
  if (!gids.length) return map

  try {
    const layer = await makeFeatureLayer(LOG_TABLE_URL, signal)
    const chunks: string[][] = []
    for (let i = 0; i < gids.length; i += 50) chunks.push(gids.slice(i, i + 50))

    for (const chunk of chunks) {
      const inClause = chunk.map(g => `'${escapeSqlString(g)}'`).join(',')
      const logRows = await queryAllRows(layer, {
        where: `parent_globalid IN (${inClause}) AND stato_record = 'CHIUSO'`,
        outFields: ['parent_globalid', 'utente_operatore', 'ruolo_competente', 'area', 'settore', 'evento_chiusura', 'dt_chiusura', 'ruolo_destinatario', 'utente_destinatario'],
        orderByFields: ['dt_chiusura DESC'],
        returnGeometry: false
      }, 1000, signal)

      for (const a of logRows) {
        const pgid = normGid(a?.parent_globalid)
        const eventoLog = String(a?.evento_chiusura || '')
        if (!pgid || !isOggettoLogEvent(eventoLog)) continue

        const dtRaw = a?.dt_chiusura
        const dtMs = dtRaw ? (typeof dtRaw === 'number' ? dtRaw : Date.parse(String(dtRaw))) : null
        const eventInfo: LogHistoryItem = {
          evento: String(a?.evento_chiusura || ''),
          ruolo: String(a?.ruolo_competente || ''),
          ruoloDest: String(a?.ruolo_destinatario || '')
        }

        if (!map.has(pgid)) {
          map.set(pgid, {
            utente: String(a?.utente_operatore || ''),
            ruolo: eventInfo.ruolo,
            area: String(a?.area || ''),
            settore: String(a?.settore || ''),
            evento: eventInfo.evento,
            dt: (dtMs && Number.isFinite(dtMs)) ? dtMs : null,
            ruoloDest: eventInfo.ruoloDest,
            utenteDest: String(a?.utente_destinatario || ''),
            history: []
          })
        } else {
          const current = map.get(pgid)
          if (current) {
            const history = current.history || []
            if (history.length < 50) history.push(eventInfo)
            current.history = history
          }
        }
      }
    }
  } catch (e) {
    if (isGiiAbortError(e)) throw e
    console.warn('[GII-Alerts] Errore caricamento GII_LOG_EVENTI_CICLI:', e)
  }

  return map
}

export async function loadArchivedGiiAlertKeys (archiveTableUrl: string, username: string, signal?: AbortSignal): Promise<Set<string>> {
  const keys = new Set<string>()
  if (!archiveTableUrl || !String(username || '').trim()) return keys
  const table = await makeFeatureLayer(archiveTableUrl, signal)
  const rows = await queryAllRows(table, {
    where: `username='${escapeSqlString(username)}'`,
    outFields: ['*'],
    returnGeometry: false
  }, 1000, signal)
  rows.forEach(r => {
    const key = String(attr(r, ['alert_key']) || '').trim()
    if (key) keys.add(key)
  })
  return keys
}

export interface GiiCurrentActivityQueryOptions {
  activityLayerUrl: string
  user: GiiUserProfileForAlerts
  archiveTableUrl?: string
  where?: string
  pageSize?: number
  includeArchived?: boolean
  signal?: AbortSignal
}

function giiSqlString (value: any): string {
  return String(value ?? '').replace(/'/g, "''")
}

type GiiLatestQuerySlot<T> = {
  requestId: number
  promise: Promise<T>
}

let giiLatestQueryRequestId = 0

const giiCurrentActivityQuerySlots = new Map<string, GiiLatestQuerySlot<GiiAlertQueryResult>>()
const giiPracticeAlertQuerySlots = new Map<string, GiiLatestQuerySlot<GiiAlertQueryResult>>()

function buildGiiLatestQueryScope (parts: any[]): string {
  return JSON.stringify((parts || []).map(value => value ?? null))
}

/**
 * Garantisce che, per la stessa sorgente di allarmi, prevalga sempre la richiesta
 * avviata più di recente. È fondamentale durante il cambio account: una query
 * ancora pendente del vecchio utente non deve poter ripubblicare i suoi allarmi
 * dopo che è già iniziato il caricamento del nuovo profilo.
 *
 * Le richieste superate non restituiscono il proprio risultato (né il proprio
 * errore), ma si allineano alla promise più recente dello stesso ambito. In questo
 * modo anche un chiamante non dotato di AbortController applica soltanto dati
 * coerenti con l'ultimo caricamento richiesto.
 */
function runLatestGiiQuery<T> (
  slots: Map<string, GiiLatestQuerySlot<T>>,
  scope: string,
  task: () => Promise<T>
): Promise<T> {
  const requestId = ++giiLatestQueryRequestId

  const promise = (async (): Promise<T> => {
    try {
      const result = await task()
      const latest = slots.get(scope)
      if (latest && latest.requestId !== requestId) return await latest.promise
      return result
    } catch (error) {
      const latest = slots.get(scope)
      if (latest && latest.requestId !== requestId) return await latest.promise
      throw error
    }
  })()

  slots.set(scope, { requestId, promise })
  return promise
}

function activityRoleForUser (user?: GiiUserProfileForAlerts): string {
  const key = roleAreaKeyForAlerts({}, { user })
  return baseWorkflowRoleForAlert(key)
}

function activityAreaForUser (user?: GiiUserProfileForAlerts): string {
  const key = roleAreaKeyForAlerts({}, { user })
  if (key.endsWith('_AGR')) return 'AGR'
  if (key.endsWith('_TEC')) return 'TEC'
  if (key === 'TI_AMM' || key === 'RI_AMM' || key === 'DA') return 'AMM'
  return normalizeAlertCode(user?.areaCod || '')
}

function buildCurrentActivityWhere (user?: GiiUserProfileForAlerts, extraWhere?: string): string {
  const clauses: string[] = []

  // La stessa tabella contiene sia attività operative di presa in carico,
  // sia comunicazioni informative archiviabili dai destinatari.
  clauses.push(`(tipo_attivita = 'PRESA_IN_CARICO' OR tipo_attivita = 'INFORMATIVA')`)

  if (user?.isAdmin) {
    // ADMIN vede tutto ciò che è corrente nella vista/tabella configurata.
  } else {
    const role = activityRoleForUser(user)
    const area = activityAreaForUser(user)
    const username = String(user?.username || '').trim()
    const settore = String(user?.settoreCod || '').trim()
    const ufficioRaw = (user as any)?.ufficio
    const ufficioNum = Number(ufficioRaw)

    if (role) clauses.push(`destinatario_ruolo = '${giiSqlString(role)}'`)
    if (area) clauses.push(`destinatario_area = '${giiSqlString(area)}'`)

    // Se una riga è indirizzata a uno username specifico, deve coincidere.
    // Se il campo è vuoto/null, vale per tutto il ruolo/area/settore/ufficio.
    if (username) {
      clauses.push(`(destinatario_username IS NULL OR destinatario_username = '' OR UPPER(destinatario_username) = '${giiSqlString(username.toUpperCase())}')`)
    }

    // Il filtro per settore serve per ruoli effettivamente settoriali (TI/RZ/TR).
    // RI e DT sono ruoli d'area: devono vedere tutte le attività della propria area,
    // anche se il record conserva il settore/distretto di provenienza della rilevazione.
    const roleForSectorFilter = String(role || '').trim().toUpperCase()
    const mustMatchSector = roleForSectorFilter === 'TI' || roleForSectorFilter === 'RZ' || roleForSectorFilter === 'TR'
    if (settore && mustMatchSector) {
      clauses.push(`(destinatario_settore IS NULL OR destinatario_settore = '' OR destinatario_settore = '${giiSqlString(settore)}')`)
    }

    if (Number.isFinite(ufficioNum)) {
      clauses.push(`(destinatario_ufficio_id IS NULL OR destinatario_ufficio_id = ${ufficioNum})`)
    }
  }

  const extra = String(extraWhere || '').trim()
  if (extra) clauses.push(`(${extra})`)

  return clauses.length ? clauses.join(' AND ') : '1=1'
}

function severityFromActivityPriority (value: any): GiiAlertSeverity {
  const p = normalizeAlertCode(value)
  if (p === 'CRITICA') return 'red'
  if (p === 'ATTENZIONE') return 'orange'
  return 'blue'
}


function currentActivityToAlert (row: Record<string, any>): GiiAlertItem | null {
  const parentGlobalId = String(attr(row, ['parent_globalid']) || '').trim()
  const parentObjectIdRaw = attr(row, ['parent_objectid'])
  const parentObjectIdNum = Number(parentObjectIdRaw)
  const parentObjectId = Number.isFinite(parentObjectIdNum) ? parentObjectIdNum : null
  const numero = String(attr(row, ['numero_rapporto']) || '').trim()
  const rowForDisplay = { ...row, numero_rapporto: numero }
  const reportCode = practiceDescriptionForMessage(rowForDisplay, parentObjectId)
  const chiave = String(attr(row, ['chiave_attivita']) || '').trim()
  const rawGlobalId = String(attr(row, ['GlobalID', 'globalid']) || '').trim()
  const keyBase = parentGlobalId || rawGlobalId || chiave
  if (!keyBase) return null

  if (isStaleTiAmmAttestationCurrentActivity(row)) return null

  const tipoAttivita = String(attr(row, ['tipo_attivita']) || '').trim().toUpperCase()
  const isInformativa = tipoAttivita === 'INFORMATIVA'
  const titoloRecord = String(attr(row, ['titolo']) || '').trim()
  const messageRecord = String(attr(row, ['messaggio']) || '').trim()
  const title = isInformativa
    ? (titoloRecord || 'Comunicazione informativa')
    : takeChargeTitleForMessage(titoloRecord, rowForDisplay)
  const message = isInformativa
    ? (messageRecord || reportCode)
    : (messageRecord || reportCode)
  const tipoAlert: GiiAlertType = isInformativa ? 'ATTIVITA_INFORMATIVA' : 'PRESA_IN_CARICO_CORRENTE'

  return {
    alertKey: chiave || `${keyBase}|${tipoAlert}`,
    tipoAlert,
    statoAlert: 'INFORMATIVO',
    severity: severityFromActivityPriority(attr(row, ['priorita'])),
    title,
    message,
    parentGlobalId,
    parentObjectId,
    reportCode,
    // Le attività correnti non hanno una scadenza: data_attivazione/creato_il sono solo dati di apertura.
    // Non valorizziamo termineData per evitare che lo header mostri un finto “Termine”.
    termineData: null,
    giorniResidui: null,
    raw: { ...row }
  }
}

export async function queryGiiCurrentActivities (options: GiiCurrentActivityQueryOptions): Promise<GiiAlertQueryResult> {
  const scope = buildGiiLatestQueryScope([
    'CURRENT_ACTIVITIES',
    normalizeLayerUrlForAlerts(options.activityLayerUrl),
    normalizeLayerUrlForAlerts(options.archiveTableUrl || ''),
    String(options.where || '').trim(),
    Number(options.pageSize) || 100,
    !!options.includeArchived,
    String(options.user?.username || '').trim().toLowerCase(),
    String(options.user?.roleCod || options.user?.role || '').trim().toUpperCase(),
    String(options.user?.areaCod || '').trim().toUpperCase(),
    String(options.user?.settoreCod || '').trim().toUpperCase()
  ])

  return await runLatestGiiQuery(giiCurrentActivityQuerySlots, scope, async () => {
    await ensureAttivitaCorrentiJsonOnlyQueryFormat()
    const activityLayer = await makeFeatureLayer(options.activityLayerUrl, options.signal)
    const pageSize = Number.isFinite(Number(options.pageSize)) && Number(options.pageSize) > 0 ? Number(options.pageSize) : 100
    const rows = await queryAllRows(activityLayer, {
      where: buildCurrentActivityWhere(options.user, options.where),
      outFields: [
        'OBJECTID',
        'GlobalID',
        'chiave_attivita',
        'parent_globalid',
        'parent_objectid',
        'numero_rapporto',
        'tipo_attivita',
        'sottotipo_attivita',
        'titolo',
        'messaggio',
        'destinatario_ruolo',
        'destinatario_area',
        'destinatario_settore',
        'destinatario_ufficio_id',
        'destinatario_ufficio_zona',
        'destinatario_username',
        'origine_evento',
        'priorita',
        'data_attivazione',
        'creato_il',
        'creato_da',
        'aggiornato_il',
        'aggiornato_da'
      ],
      orderByFields: ['data_attivazione DESC', 'OBJECTID DESC'],
      returnGeometry: false
    }, pageSize, options.signal)

    const computed = rows
      .map(row => currentActivityToAlert(row))
      .filter((a): a is GiiAlertItem => !!a)

    const archivedKeys = options.archiveTableUrl
      ? await loadArchivedGiiAlertKeys(options.archiveTableUrl, options.user?.username, options.signal)
      : new Set<string>()
    const alerts = filterArchivedGiiAlerts(computed, archivedKeys, options.includeArchived)

    return {
      alerts,
      archivedKeys,
      counts: summarizeGiiAlerts(alerts)
    }
  })
}

export async function queryGiiAlerts (options: GiiAlertQueryOptions): Promise<GiiAlertQueryResult> {
  const scope = buildGiiLatestQueryScope([
    'PRACTICE_ALERTS',
    normalizeLayerUrlForAlerts(options.practiceLayerUrl),
    normalizeLayerUrlForAlerts(options.archiveTableUrl),
    String(options.where || '1=1').trim(),
    Number(options.pageSize) || 1000,
    !!options.includeArchived,
    String(options.user?.username || '').trim().toLowerCase(),
    String(options.user?.roleCod || options.user?.role || '').trim().toUpperCase(),
    String(options.user?.areaCod || '').trim().toUpperCase(),
    String(options.user?.settoreCod || '').trim().toUpperCase()
  ])

  return await runLatestGiiQuery(giiPracticeAlertQuerySlots, scope, async () => {
    const user = options.user || { username: '' }
    const practiceLayer = await makeFeatureLayer(options.practiceLayerUrl, options.signal)
    const pageSize = Number.isFinite(Number(options.pageSize)) && Number(options.pageSize) > 0 ? Number(options.pageSize) : 1000
    const rows = await queryAllRows(practiceLayer, {
      where: options.where || '1=1',
      outFields: alertOutFieldsForLayer(practiceLayer),
      returnGeometry: false
    }, pageSize, options.signal)

    const logMap = await loadAlertLogMap(rows, options.signal)
    const computed = computeGiiAlertsFromPractices(rows, {
      now: options.now,
      warningDays: options.warningDays,
      user: options.user,
      logMap
    })

    const archivedKeys = await loadArchivedGiiAlertKeys(options.archiveTableUrl, user.username, options.signal)
    const alerts = filterArchivedGiiAlerts(computed, archivedKeys, options.includeArchived)
      .sort((a, b) => {
        const sevRank: Record<GiiAlertSeverity, number> = { red: 0, orange: 1, blue: 2, gray: 3 }
        const sr = (sevRank[a.severity] ?? 9) - (sevRank[b.severity] ?? 9)
        if (sr) return sr
        const da = a.termineData ?? Number.MAX_SAFE_INTEGER
        const db = b.termineData ?? Number.MAX_SAFE_INTEGER
        return da - db
      })

    return {
      alerts,
      archivedKeys,
      counts: summarizeGiiAlerts(alerts)
    }
  })
}

function filterArchiveAttrs (attrs: Record<string, any>, fields: any[]): Record<string, any> {
  const names = new Set((fields || []).map(f => String(f.name)))
  const out: Record<string, any> = {}
  Object.entries(attrs || {}).forEach(([k, v]) => {
    if (names.has(k)) out[k] = v
  })
  return out
}

export async function archiveGiiAlert (options: GiiArchiveAlertOptions): Promise<void> {
  const alert = options.alert
  if (!alert?.alertKey) throw new Error('Allarme non valido.')
  const username = String(options.user?.username || '').trim()
  if (!username) throw new Error('Utente corrente non disponibile.')

  const table = await makeFeatureLayer(options.archiveTableUrl)
  const fields = Array.isArray(table?.fields) ? table.fields : []
  const nowMs = asDateMs(options.now ?? Date.now()) ?? Date.now()
  const displayName = String(options.user?.fullName || username)

  const attrs = filterArchiveAttrs({
    alert_key: alert.alertKey,
    parent_globalid: alert.parentGlobalId,
    parent_objectid: alert.parentObjectId,
    tipo_alert: alert.tipoAlert,
    username,
    archiviato_il: nowMs,
    archiviato_da: displayName,
    titolo_snapshot: alert.title,
    messaggio_snapshot: alert.message,
    termine_data_snapshot: alert.termineData,
    stato_alert_snapshot: alert.statoAlert,
    creato_il: nowMs,
    creato_da: displayName
  }, fields)

  const res = await table.applyEdits({ addFeatures: [{ attributes: attrs }] })
  const add = res?.addFeatureResults?.[0] || res?.addResults?.[0]
  if (add?.error) throw new Error(add.error.message || JSON.stringify(add.error))
}

export function getGiiAlertBellTone (counts: GiiAlertQueryResult['counts']): 'none' | 'red' | 'orange' | 'blue' {
  if (!counts || counts.total <= 0) return 'none'
  if (counts.red > 0 || counts.scaduti > 0 || counts.critici > 0) return 'red'
  if (counts.orange > 0 || counts.inScadenza > 0) return 'orange'
  return 'blue'
}
