/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx, type AllWidgetProps } from 'jimu-core'
import { defaultConfig, type IMConfig } from '../config'
import { isPracticeAssignedToCurrentIa } from '../../../_shared/gii-access/ia-assignment'
import {
  pickGiiRuntimeView,
  type GiiRuntimeView as RuntimeDsView
} from '../../../_shared/gii-runtime/runtime-views'
import { GiiPageTitle } from '../../../_shared/gii-ui/page-title'

type GiiAssignment = {
  ruoloCod: string
  area: number | null
  areaCod: 'AMM' | 'AGR' | 'TEC' | ''
  settore: number | null
  settoreCod: string
}

type GiiUserInfo = {
  username: string
  fullName?: string
  full_name?: string
  nome?: string
  displayName?: string
  ruoloLabel: string
  ruoloCod: string
  ruoloFull?: string
  profiloCod?: string
  profiloLabel?: string
  area: number | null
  areaCod: 'AMM' | 'AGR' | 'TEC' | ''
  areaFull?: string
  settore: number | null
  settoreCod: string
  settoreFull?: string
  gruppo?: string
  isAdmin: boolean
  isWorkflowAdmin?: boolean
  assignments: GiiAssignment[]
}

type DashRecord = Record<string, any>

type PeriodFilter = 'all' | '30' | '90' | '365'
type DashboardTab = 'operativo' | 'statistiche'
type ChartItem = { label: string; value: number }
type TrendPoint = { label: string; value: number }

type SortDir = 'asc' | 'desc'
type SettoreSortBy = 'label' | 'count'
type InfrazioneSortBy = 'article' | 'count'

const SETTORE_FROM_CODE: Record<number, string> = { 1: 'CR', 2: 'GI', 3: 'D1', 4: 'D2', 5: 'D3', 6: 'D4', 7: 'D5', 8: 'D6', 9: 'DS', 10: 'D7' }

function loadEsriModule<T = any> (path: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = (window as any).require
    if (!req) { reject(new Error('AMD require non disponibile')); return }
    try { req([path], (mod: T) => resolve(mod), (err: any) => reject(err)) } catch (e) { reject(e) }
  })
}

function cleanCode (v: any): string {
  return String(v ?? '').trim().toUpperCase()
}

const WORKFLOW_ROLE_CODES = new Set(['TR', 'IT', 'CS', 'RIT', 'DT', 'DA', 'ADMIN', 'RIA', 'IA'])

function normalizeRuoloCode (ruoloCod: any, isAdmin?: boolean): string {
  const raw = cleanCode(ruoloCod).replace(/[\s-]+/g, '_')
  if (raw && WORKFLOW_ROLE_CODES.has(raw)) return raw
  return isAdmin ? 'ADMIN' : ''
}

function normalizeAreaCode (areaCod: any, area?: number | null | undefined): 'AMM' | 'AGR' | 'TEC' | '' {
  const raw = cleanCode(areaCod)
  if (raw === 'AMM' || raw === 'AGR' || raw === 'TEC') return raw
  if (/^\d+$/.test(raw)) return normalizeAreaCode('', Number(raw))
  if (area === 1) return 'AMM'
  if (area === 2) return 'AGR'
  if (area === 3) return 'TEC'
  return ''
}

function normalizeSettoreCode (settoreCod: any, settore?: number | null | undefined): string {
  const raw = cleanCode(settoreCod)
  if (raw) {
    if (/^\d+$/.test(raw)) return SETTORE_FROM_CODE[Number(raw)] || raw
    return raw
  }
  if (settore == null) return ''
  return SETTORE_FROM_CODE[Number(settore)] || String(settore || '')
}

function getEffectiveRole (ruoloLabel: string, areaCode: 'AMM' | 'AGR' | 'TEC' | ''): string {
  const r = cleanCode(ruoloLabel)
  return r
}

function pickRuntimeViewsForUser (user: GiiUserInfo | null): RuntimeDsView[] {
  if (!user) return []
  if (user.isAdmin || user.isWorkflowAdmin) {
    const view = pickGiiRuntimeView({ roleCode: user.ruoloCod, areaCode: user.areaCod, settoreCode: user.settoreCod, isAdmin: user.isAdmin, isWorkflowAdmin: user.isWorkflowAdmin })
    return view ? [view] : []
  }
  const uniq = new Map<string, RuntimeDsView>()
  for (const assignment of user.assignments || []) {
    const view = pickGiiRuntimeView({ roleCode: assignment.ruoloCod, areaCode: assignment.areaCod, settoreCode: assignment.settoreCod })
    if (view && !uniq.has(view.layerUrl)) uniq.set(view.layerUrl, view)
  }
  return Array.from(uniq.values())
}

function readGiiUser (): GiiUserInfo | null {
  const cached: any = (window as any).__giiUserRole
  if (!cached?.username) return null
  const isAdminRaw = !!cached.isAdmin || !!cached.isWorkflowAdmin || cleanCode(cached.ruoloCod || cached.ruolo_cod) === 'ADMIN'
  const ruoloCod = normalizeRuoloCode(cached.ruoloCod ?? cached.ruolo_cod, isAdminRaw)
  const isAdmin = isAdminRaw || ruoloCod === 'ADMIN'
  const area = cached.area != null && cached.area !== '' ? Number(cached.area) : null
  const settore = cached.settore != null && cached.settore !== '' ? Number(cached.settore) : null
  const areaCod = normalizeAreaCode(cached.areaCod ?? cached.area_cod, area)
  const settoreCod = normalizeSettoreCode(cached.settoreCod ?? cached.settore_cod, settore)
  const rawAssignments = Array.isArray(cached.assignments) ? cached.assignments : []
  const assignments: GiiAssignment[] = rawAssignments.map((a: any) => {
    const aArea = a?.area != null && a.area !== '' ? Number(a.area) : null
    const aSettore = a?.settore != null && a.settore !== '' ? Number(a.settore) : null
    return {
      ruoloCod: normalizeRuoloCode(a?.ruoloCod ?? a?.ruolo_cod, false),
      area: aArea,
      areaCod: normalizeAreaCode(a?.areaCod ?? a?.area_cod, aArea),
      settore: aSettore,
      settoreCod: normalizeSettoreCode(a?.settoreCod ?? a?.settore_cod, aSettore)
    }
  }).filter((a: GiiAssignment) => !!a.ruoloCod)
  if (!assignments.length) assignments.push({ ruoloCod, area, areaCod, settore, settoreCod })
  return {
    username: String(cached.username || '').trim(),
    fullName: String(cached.fullName || cached.full_name || cached.nome || cached.displayName || cached.username || '').trim(),
    full_name: String(cached.full_name || cached.fullName || '').trim(),
    nome: String(cached.nome || '').trim(),
    displayName: String(cached.displayName || '').trim(),
    ruoloLabel: ruoloCod,
    ruoloCod,
    ruoloFull: String(cached.ruoloFull || cached.ruolo_full || '').trim(),
    profiloCod: String(cached.profiloCod || cached.profilo_cod || '').trim(),
    profiloLabel: String(cached.profiloLabel || cached.profilo_label || '').trim(),
    area,
    areaCod,
    areaFull: String(cached.areaFull || cached.area_full || '').trim(),
    settore,
    settoreCod,
    settoreFull: String(cached.settoreFull || cached.settore_full || '').trim(),
    gruppo: String(cached.gruppo || ''),
    isAdmin,
    isWorkflowAdmin: !!cached.isWorkflowAdmin,
    assignments
  }
}

function getStatoFieldForRuolo (ruoloLabel: string): string {
  const r = ruoloLabel.toUpperCase()
  if (r === 'TR') return 'stato_TR'
  if (r === 'IT') return 'stato_IT'
  if (r === 'CS') return 'stato_CS'
  if (r === 'RIT') return 'stato_RIT'
  if (r === 'DT') return 'stato_DT'
  if (r === 'DA') return 'determinazione_stato'
  if (r === 'RIA') return 'stato_RIA'
  if (r === 'IA') return 'stato_IA'
  return 'stato_DT'
}

function equalsUser (a: any, b: any): boolean {
  const sa = String(a ?? '').trim().toLowerCase()
  const sb = String(b ?? '').trim().toLowerCase()
  return !!sa && !!sb && sa === sb
}

function meaningful (v: any): boolean {
  return v !== null && v !== undefined && v !== '' && v !== 0 && v !== '0'
}

function isStateOnlyWorkflowRole (role: string): boolean {
  return ['IT', 'CS', 'RIT'].includes(String(role || '').trim().toUpperCase())
}

function hasRuoloData (d: any, role: string): boolean {
  // stato_* = 0 significa "Non attivo": non deve far risultare il ruolo come nodo corrente.
  const s = d[`stato_${role}`]
  if (isStateOnlyWorkflowRole(role)) return meaningful(s)
  const e = d[`esito_${role}`]
  return meaningful(s) || meaningful(e)
}

function isInFaseSanzionatoria (d: any): boolean {
  return meaningful(d['stato_RIA']) || meaningful(d['esito_RIA']) ||
    meaningful(d['stato_IA']) || meaningful(d['esito_IA']) ||
    meaningful(d['determinazione_stato']) || meaningful(d['determinazione_numero'])
}

function parseToMs (v: any): number | null {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'number' && Number.isFinite(v)) return v > 100000000000 ? v : v * 1000
  const t = Date.parse(String(v))
  return Number.isFinite(t) ? t : null
}

function getRoleLastTouchMs (d: any, role: string): number | null {
  const vals = [
    parseToMs(d[`dt_presa_in_carico_${role}`]),
    parseToMs(d[`dt_stato_${role}`]),
    ...(['IT', 'CS', 'RIT'].includes(String(role || '').toUpperCase()) ? [] : [parseToMs(d[`dt_esito_${role}`])])
  ].filter((v): v is number => v !== null)
  return vals.length ? Math.max(...vals) : null
}

function getLastTouchMs (d: any): number | null {
  const candidates: Array<number | null> = [
    parseToMs(d['dt_ultimo_passaggio']),
    parseToMs(d['EditDate_1']),
    parseToMs(d['EditDate']),
    parseToMs(d['CreationDate_1']),
    parseToMs(d['CreationDate'])
  ]
  ;['DA', 'IA', 'RIA', 'DT', 'RIT', 'CS', 'IT', 'TR'].forEach(r => candidates.push(getRoleLastTouchMs(d, r)))
  const vals = candidates.filter((v): v is number => v !== null)
  return vals.length ? Math.max(...vals) : null
}

function getTiIstruttoriaInfo (d: any) {
  const tiUser = String(d['it_assegnato_username'] ?? '').trim()
  const higherTouched = hasRuoloData(d, 'RIT') || hasRuoloData(d, 'DT') || hasRuoloData(d, 'DA')
  const statoTiRaw = d['stato_IT']
  const statoTiNum = statoTiRaw !== null && statoTiRaw !== undefined && statoTiRaw !== '' ? Number(statoTiRaw) : null
  const tiReturned = statoTiNum === 4 || statoTiNum === 5
  return { isInTiIstruttoria: !!tiUser && !higherTouched && !tiReturned }
}

function getRecordAreaCode (d: any): 'AMM' | 'AGR' | 'TEC' | '' {
  return normalizeAreaCode(d?.area_cod ?? d?.AREA_COD ?? d?.area ?? d?.AREA)
}

function getRecordSettoreCode (d: any): string {
  return normalizeSettoreCode(d?.settore_cod ?? d?.SETTORE_COD ?? d?.settore ?? d?.SETTORE)
}

function assignmentAppliesToRecord (assignment: GiiAssignment, d: any): boolean {
  const role = getEffectiveRole(assignment.ruoloCod || '', assignment.areaCod)
  if (!role) return false
  if (role === 'DA' || role === 'RIA' || role === 'IA') return isInFaseSanzionatoria(d)
  const recArea = getRecordAreaCode(d)
  if (assignment.areaCod && recArea && assignment.areaCod !== recArea) return false
  if (role === 'IT' || role === 'CS') {
    const recSettore = getRecordSettoreCode(d)
    if (assignment.settoreCod && recSettore && assignment.settoreCod !== recSettore) return false
  }
  return true
}

function isVisibleUnderAssignment (d: any, user: GiiUserInfo, assignment: GiiAssignment): boolean {
  if (!assignmentAppliesToRecord(assignment, d)) return false
  const role = getEffectiveRole(assignment.ruoloCod || '', assignment.areaCod)
  if (role === 'IA') return isPracticeAssignedToCurrentIa(d, { ...user, ...assignment } as any)
  if (role !== 'IT') return true

  const meUser = String(user.username || '').trim()
  const meName = String(user.fullName ?? user.nome ?? user.displayName ?? '').trim()
  const opRaw = d['origine_pratica']
  const opNum = opRaw !== null && opRaw !== undefined && opRaw !== '' ? Number(opRaw) : null
  const tiUser = String(d['it_assegnato_username'] ?? '').trim()
  const tiName = String(d['it_assegnato_nome'] ?? '').trim()
  const assignedToMe = equalsUser(tiUser, meUser) || equalsUser(tiName, meUser) || (meName ? equalsUser(tiName, meName) : false)
  const creatorVals = [d['created_user'], d['Creator'], d['creator'], d['username'], d['user_name'], d['utente'], d['utente_ins'], d['created_by'], d['submitter'], d['owner']]
  const createdByMe = creatorVals.some(v => equalsUser(v, meUser) || (meName ? equalsUser(v, meName) : false))
  const hasTiWorkflow = hasRuoloData(d, 'IT')
  if (opNum === 1) {
    if (!tiUser && !tiName && !hasTiWorkflow) return false
    return tiUser || tiName ? assignedToMe : false
  }
  if (opNum === 2) {
    if (tiUser || tiName) return assignedToMe
    if (createdByMe) return true
    return hasTiWorkflow
  }
  return true
}

function getVisibleAssignmentsForRecord (d: any, user: GiiUserInfo | null): GiiAssignment[] {
  if (!user || user.isAdmin || user.isWorkflowAdmin) return []
  return (user.assignments || []).filter(assignment => isVisibleUnderAssignment(d, user, assignment))
}

function isRecordVisibleForCurrentUser (d: any, user: GiiUserInfo | null): boolean {
  if (!user) return false
  if (user.isAdmin || user.isWorkflowAdmin) return true
  const archVal = d['GII_arch'] ?? d['gii_arch'] ?? d['GII_ARCH']
  if (archVal !== null && archVal !== undefined && archVal !== '' && Number(archVal) === 1) return false
  return getVisibleAssignmentsForRecord(d, user).length > 0
}

function isWaitingForIaAfterRia (d: any): boolean {
  const riaLast = getRoleLastTouchMs(d, 'RIA')
  const iaLast = getRoleLastTouchMs(d, 'IA')
  return hasRuoloData(d, 'IA') && (iaLast === null || riaLast === null || iaLast > riaLast)
}

function isAttesaMiaUnderAssignment (d: any, user: GiiUserInfo, assignment: GiiAssignment): boolean {
  const role = getEffectiveRole(assignment.ruoloCod || '', assignment.areaCod)
  if (role === 'DA') return false
  const statoField = getStatoFieldForRuolo(role)
  const val = d[statoField]
  const n = val != null && val !== '' ? Number(val) : null

  if (role === 'DT' && n === 2) return true
  if (role === 'CS' && n === 2) return !getTiIstruttoriaInfo(d).isInTiIstruttoria
  if ((role === 'IT' || role === 'IA') && n === 2) {
    if (role === 'IA') return isPracticeAssignedToCurrentIa(d, { ...user, ...assignment } as any)
    const meUser = String(user.username || '').trim()
    const meName = String(user.fullName ?? user.nome ?? user.displayName ?? '').trim()
    const tiUser = String(d['it_assegnato_username'] ?? '').trim()
    const tiName = String(d['it_assegnato_nome'] ?? '').trim()
    return equalsUser(tiUser, meUser) || equalsUser(tiName, meUser) || (meName ? equalsUser(tiName, meName) : false)
  }
  if (role === 'RIA' && n === 2) return !isWaitingForIaAfterRia(d)
  if (role === 'CS' && getTiIstruttoriaInfo(d).isInTiIstruttoria) return false
  return n === 0 || n === 1 || n === 3
}

function isAttesaAltriUnderAssignment (d: any, user: GiiUserInfo, assignment: GiiAssignment): boolean {
  const role = getEffectiveRole(assignment.ruoloCod || '', assignment.areaCod)
  if (role === 'DA') return false
  const statoField = getStatoFieldForRuolo(role)
  const val = d[statoField]
  const n = val != null && val !== '' ? Number(val) : null
  if (role === 'CS' && getTiIstruttoriaInfo(d).isInTiIstruttoria) return true
  if ((role === 'CS' || role === 'DT') && n === 2) return false
  if ((role === 'IT' || role === 'IA') && n === 2) return !isAttesaMiaUnderAssignment(d, user, assignment)
  if (role === 'RIA' && n === 2) return isWaitingForIaAfterRia(d)
  return n === 2 || n === 4
}

function isAttesaMia (d: any, user: GiiUserInfo | null): boolean {
  if (!user || user.isAdmin || user.isWorkflowAdmin) return false
  return getVisibleAssignmentsForRecord(d, user).some(assignment => isAttesaMiaUnderAssignment(d, user, assignment))
}

function isAttesaAltri (d: any, user: GiiUserInfo | null): boolean {
  if (!user || user.isAdmin || user.isWorkflowAdmin) return false
  const assignments = getVisibleAssignmentsForRecord(d, user)
  if (assignments.some(assignment => isAttesaMiaUnderAssignment(d, user, assignment))) return false
  return assignments.some(assignment => isAttesaAltriUnderAssignment(d, user, assignment))
}

function isDaPrendereInCarico (d: any, user: GiiUserInfo | null): boolean {
  if (!user || user.isAdmin || user.isWorkflowAdmin) return false
  return getVisibleAssignmentsForRecord(d, user).some(assignment => {
    const role = getEffectiveRole(assignment.ruoloCod || '', assignment.areaCod)
    if (!role || role === 'DA') return false
    const raw = d[getStatoFieldForRuolo(role)]
    const n = raw != null && raw !== '' ? Number(raw) : null
    return n === 0 || n === 1
  })
}

function getMyStateValueForRecord (d: any, user: GiiUserInfo | null): any {
  if (!user || user.isAdmin || user.isWorkflowAdmin) return null
  const assignments = getVisibleAssignmentsForRecord(d, user)
  if (!assignments.length) return null
  const chosen = assignments.find(assignment => isAttesaMiaUnderAssignment(d, user, assignment)) || assignments[0]
  const role = getEffectiveRole(chosen.ruoloCod || '', chosen.areaCod)
  return role ? d[getStatoFieldForRuolo(role)] : null
}

function getActiveRole (d: any): string {
  const roles = ['IA', 'RIA', 'DT', 'RIT', 'CS', 'IT', 'TR']
  for (const r of roles) if (hasRuoloData(d, r)) return r
  return 'N/D'
}

function faseLabel (role: string): string {
  const r = String(role || '').trim().toUpperCase()
  if (r === 'TR' || r === 'IT' || r === 'CS' || r === 'RIT') return 'Istruttoria tecnica'
  if (r === 'DT') return 'Approvazione tecnica'
  if (r === 'RIA' || r === 'IA' || r === 'DA') return 'Istruttoria amministrativa'
  return 'Non determinata'
}

function ruoloOperativoLabel (role: string): string {
  const r = String(role || '').trim().toUpperCase()
  if (r === 'TR') return 'Tecnico rilevatore'
  if (r === 'IT') return 'Istruttore tecnico'
  if (r === 'CS') return 'Capo Settore'
  if (r === 'RIT') return 'Responsabile istruttoria tecnica'
  if (r === 'DT') return 'Direttore tecnico'
  if (r === 'IA') return 'Istruttore amministrativo'
  if (r === 'RIA') return 'Responsabile istruttoria amministrativa'
  if (r === 'DA') return 'Direttore Area AA. GG. e P.F.'
  if (r === 'ADMIN') return 'Amministratore'
  return 'Non determinato'
}

function getFirst (d: any, names: string[], fallback = '—'): string {
  for (const n of names) {
    const v = d[n]
    if (v !== null && v !== undefined && String(v).trim() !== '') return String(v).trim()
  }
  return fallback
}

function getObjectId (d: any): string {
  return getFirst(d, ['OBJECTID', 'objectid', 'ObjectId', 'objectId', 'FID'], '—')
}

// Numero di rilevazione: solo l'OID (es. 83), come nel report; l'origine TR/IT è nella colonna Origine.
function getNumeroRapporto (d: any): string {
  const oid = getObjectId(d)
  return oid && oid !== '—' ? oid : '—'
}


function getComune (d: any): string {
  return getFirst(d, ['comune', 'Comune', 'COMUNE'], '—')
}

function statoLabel (v: any): string {
  const n = v !== null && v !== undefined && v !== '' ? Number(v) : null
  if (n === 0 || n === 1) return 'Da prendere in carico'
  if (n === 2) return 'Presa in carico / in lavorazione'
  if (n === 3) return 'Integrazione richiesta'
  if (n === 4) return 'Trasmessa / completata'
  if (n === 5) return 'Respinta'
  return 'Non valorizzato'
}

function toChartItems (map: Map<string, number>, limit = 8): ChartItem[] {
  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'it', { sensitivity: 'base' }))
    .slice(0, limit)
}

function formatShortDateTime (ms: number | null): string {
  return ms ? new Date(ms).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'
}

function getAnalysisDateMs (d: any): number | null {
  return parseToMs(d['data_rilevazione']) ||
    parseToMs(d['Data_rilevazione']) ||
    parseToMs(d['DATA_RILEVAZIONE']) ||
    getLastTouchMs(d)
}

const SETTORE_LABEL_BY_CODE: Record<string, string> = {
  D1: 'Distretto 1 Quartu Sant’Elena',
  D2: 'Distretto 2 Serramanna',
  D3: 'Distretto 3 San Gavino',
  D4: 'Distretto 4 Basso Sulcis',
  D5: 'Distretto 5 Senorbì',
  D6: 'Distretto 6 Cixerri',
  D7: 'Distretto 7 San Sperate',
  DS: 'Manutenzione opere di dreno e di scolo'
}

function getSettoreLabel (d: any): string {
  const code = getRecordSettoreCode(d)
  if (!code) return 'Non indicato'
  return SETTORE_LABEL_BY_CODE[code] || code
}

const INFRACTION_LABEL_BY_CODE: Record<string, string> = {
  Art8: 'Art. 8 - Violazione servizio di reperibilità',
  Art12: 'Art. 12 - Negato accesso ai fondi (al personale consortile)',
  Art15: 'Art. 15 - Uso irriguo abusivo',
  Art16: 'Art. 16 - Presentazione tardiva comunicazione di irrigazione',
  Art17: 'Art. 17 - Presentazione tardiva comunicazione di variazione o rinuncia',
  Art27: 'Art. 27 - Spreco d’acqua/uso negligente della risorsa idrica',
  Art28: 'Art. 28 - Violazione prescrizioni del consorzio',
  Art29: 'Art. 29 - Violazione termini restituzione attrezzature',
  Art30: 'Art. 30 - Danneggiamento e/o perdita attrezzature',
  Art31: 'Art. 31 - Mancata segnalazione guasti',
  Art32: 'Art. 32 - Negato accesso ai fondi (al consorziato)',
  Art33: 'Art. 33 - Inosservanza limiti temporali di prelievo',
  Art34: 'Art. 34 - Interferenze',
  Art35: 'Art. 35 - Manomissione reti di dispensa e allaccio di apparecchi di aspirazione all’idrante',
  Art36: 'Art. 36 - Uso attrezzature non autorizzate',
  Art37: 'Art. 37 - Uso sistemi di irrigazione incompatibili',
  Art39: 'Art. 39 - Danni alle strutture irrigue'
}

const INFRACTION_FIELD_BY_CODE: Record<string, string> = {
  Art8: 'v_art08',
  Art12: 'v_art12',
  Art27: 'v_art27',
  Art28: 'v_art28',
  Art29: 'v_art29',
  Art30: 'v_art30',
  Art31: 'v_art31',
  Art32: 'v_art32',
  Art33: 'v_art33',
  Art34: 'v_art34',
  Art35: 'v_art35',
  Art36: 'v_art36',
  Art37: 'v_art37',
  Art39: 'v_art39'
}

function isSelectedFlagValue (v: any): boolean {
  if (v === true || v === 1) return true
  const s = String(v ?? '').trim().toLowerCase()
  return s === '1' || s === 'true' || s === 'si' || s === 'sì' || s === 'yes'
}

function parseMultiValue (raw: any): string[] {
  return String(raw ?? '')
    .split(/[;,\s]+/)
    .map(v => v.trim())
    .filter(Boolean)
}

function normalizeInfractionCode (value: any): string {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  const match = raw.match(/(?:art(?:icolo)?\.?\s*)?0?(\d{1,2})(?:\.\d+)?/i)
  if (!match) return ''
  const n = Number(match[1])
  return Number.isFinite(n) ? `Art${n}` : ''
}

function addInfractionLabel (set: Set<string>, code: string) {
  const normalized = normalizeInfractionCode(code)
  const label = INFRACTION_LABEL_BY_CODE[normalized]
  if (label) set.add(label)
}

function addInfractionCode (set: Set<string>, value: any) {
  const raw = String(value ?? '').trim()
  if (!raw) return
  parseMultiValue(raw.replace(/_/g, ' ')).forEach(part => addInfractionLabel(set, part))
}

function getInfractionLabels (d: any): string[] {
  const set = new Set<string>()
  ;[
    'norma15_parziale',
    'norma15_totale',
    'norma16_17',
    'art17_tipo',
    'norma_violata1',
    'norma_violata2',
    'norma_violata3',
    'norma_violata',
    'articoli_violati',
    'articolo_violato',
    'tipologia_infrazione',
    'violazione_descrizione'
  ].forEach(name => addInfractionCode(set, d[name]))

  Object.entries(INFRACTION_FIELD_BY_CODE).forEach(([code, field]) => {
    const v = d[field] ?? d[String(field).toUpperCase()]
    if (isSelectedFlagValue(v)) addInfractionLabel(set, code)
  })

  return set.size ? Array.from(set) : ['Non classificata']
}

function recordHasInfraction (d: any, label: string): boolean {
  const target = String(label || '').trim()
  if (!target) return true
  return getInfractionLabels(d).some(v => v === target)
}

function buildSettoreItems (records: DashRecord[]): ChartItem[] {
  const map = new Map<string, number>()
  for (const r of records) {
    const k = getSettoreLabel(r)
    map.set(k, (map.get(k) || 0) + 1)
  }
  return Array.from(map.entries()).map(([label, value]) => ({ label, value }))
}

function buildInfrazioneItems (records: DashRecord[]): ChartItem[] {
  const map = new Map<string, number>()
  for (const r of records) {
    for (const label of getInfractionLabels(r)) map.set(label, (map.get(label) || 0) + 1)
  }
  return Array.from(map.entries()).map(([label, value]) => ({ label, value }))
}

function getInfractionArticleNumber (label: string): number | null {
  const match = String(label || '').match(/Art\.\s*(\d{1,2})/i)
  if (!match) return null
  const n = Number(match[1])
  return Number.isFinite(n) ? n : null
}

function sortSettoreItems (items: ChartItem[], sortBy: SettoreSortBy, dir: SortDir): ChartItem[] {
  const direction = dir === 'asc' ? 1 : -1
  return [...items].sort((a, b) => {
    const cmp = sortBy === 'count'
      ? (a.value - b.value || a.label.localeCompare(b.label, 'it', { sensitivity: 'base' }))
      : a.label.localeCompare(b.label, 'it', { sensitivity: 'base' })
    return cmp * direction
  })
}

function sortInfrazioneItems (items: ChartItem[], sortBy: InfrazioneSortBy, dir: SortDir): ChartItem[] {
  const direction = dir === 'asc' ? 1 : -1
  return [...items].sort((a, b) => {
    if (sortBy === 'count') {
      return ((a.value - b.value) || a.label.localeCompare(b.label, 'it', { sensitivity: 'base' })) * direction
    }
    const aArt = getInfractionArticleNumber(a.label)
    const bArt = getInfractionArticleNumber(b.label)
    if (aArt === null && bArt !== null) return 1
    if (aArt !== null && bArt === null) return -1
    if (aArt !== null && bArt !== null && aArt !== bArt) return (aArt - bArt) * direction
    return a.label.localeCompare(b.label, 'it', { sensitivity: 'base' }) * direction
  })
}

function pad2 (n: number): string {
  return String(n).padStart(2, '0')
}

function dayKey (d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function monthKey (d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`
}

function buildMonthlyTrend (records: DashRecord[], months = 12, endDate = new Date()): TrendPoint[] {
  const today = endDate
  const buckets: Array<TrendPoint & { key: string }> = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const key = monthKey(d)
    buckets.push({
      label: d.toLocaleDateString('it-IT', { month: 'short' }).replace('.', ''),
      value: 0,
      key
    })
  }
  const byKey = new Map<string, TrendPoint & { key: string }>()
  buckets.forEach(b => byKey.set(b.key, b))
  for (const r of records) {
    const ms = getAnalysisDateMs(r)
    if (!ms) continue
    const d = new Date(ms)
    const key = monthKey(d)
    const bucket = byKey.get(key)
    if (bucket) bucket.value += 1
  }
  return buckets.map(b => ({ label: b.label, value: b.value }))
}

function buildPeriodTrend (records: DashRecord[], period: PeriodFilter): TrendPoint[] {
  if (period === '365') return buildMonthlyTrend(records, 12)

  const now = new Date()
  if (period === '30') {
    const buckets: Array<TrendPoint & { key: string }> = []
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29)
    for (let i = 0; i < 30; i++) {
      const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i)
      buckets.push({ key: dayKey(d), label: d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }), value: 0 })
    }
    const byKey = new Map<string, TrendPoint & { key: string }>()
    buckets.forEach(b => byKey.set(b.key, b))
    for (const r of records) {
      const ms = getAnalysisDateMs(r)
      if (!ms) continue
      const bucket = byKey.get(dayKey(new Date(ms)))
      if (bucket) bucket.value += 1
    }
    return buckets.map(b => ({ label: b.label, value: b.value }))
  }

  if (period === '90') {
    const bucketDays = 7
    const bucketCount = 13
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((bucketCount * bucketDays) - 1))
    const buckets: Array<TrendPoint & { from: number; to: number }> = []
    for (let i = 0; i < bucketCount; i++) {
      const from = new Date(start.getFullYear(), start.getMonth(), start.getDate() + (i * bucketDays))
      const to = new Date(from.getFullYear(), from.getMonth(), from.getDate() + bucketDays)
      buckets.push({ from: from.getTime(), to: to.getTime(), label: from.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }), value: 0 })
    }
    for (const r of records) {
      const ms = getAnalysisDateMs(r)
      if (!ms) continue
      const bucket = buckets.find(b => ms >= b.from && ms < b.to)
      if (bucket) bucket.value += 1
    }
    return buckets.map(b => ({ label: b.label, value: b.value }))
  }

  const dates = records.map(getAnalysisDateMs).filter((v): v is number => v !== null).sort((a, b) => a - b)
  if (!dates.length) return buildMonthlyTrend(records, 12)
  const first = new Date(dates[0])
  const last = new Date(dates[dates.length - 1])
  const monthSpan = Math.max(1, ((last.getFullYear() - first.getFullYear()) * 12) + last.getMonth() - first.getMonth() + 1)
  return buildMonthlyTrend(records, Math.min(Math.max(monthSpan, 1), 24), last)
}

async function queryLayer (view: RuntimeDsView, where: string, pageSize: number): Promise<DashRecord[]> {
  const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
  const layer = new FeatureLayer({ url: view.layerUrl, outFields: ['*'] })
  if (typeof layer.load === 'function') {
    try { await layer.load() } catch {}
  }
  const res = await layer.queryFeatures({
    where: where || '1=1',
    outFields: ['*'],
    returnGeometry: false,
    num: pageSize || 2000
  })
  return (res?.features || []).map((f: any) => f?.attributes || {})
}

function EmptyState (props: { cfg: any; text?: string }) {
  return <div style={{ color: props.cfg.mutedColor, fontSize: 12.5, padding: '16px 0' }}>{props.text || 'Nessun dato disponibile.'}</div>
}

// Icona Esporta: la freccia esce dal vassoio (come in report, Gestione utenti, Parametri, Caricatore prezzari).
function ExportActionIcon (props: { size?: number }): React.ReactElement {
  const size = Number(props.size || 18)
  return (
    <svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true' focusable='false'>
      <path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'/>
      <path d='M17 8l-5-5-5 5'/>
      <path d='M12 3v12'/>
    </svg>
  )
}

function csvEscape (v: any): string {
  const s = String(v ?? '')
  if (/[;"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

// Icona Aggiorna (frecce circolari), uguale a quella del report.
function RefreshActionIcon (props: { size?: number }): React.ReactElement {
  const size = Number(props.size || 18)
  return (
    <svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true' focusable='false'>
      <path d='M21 12a9 9 0 0 1-15.36 6.36L3 16'/>
      <path d='M3 21v-5h5'/>
      <path d='M3 12a9 9 0 0 1 15.36-6.36L21 8'/>
      <path d='M21 3v5h-5'/>
    </svg>
  )
}

function CardShell (props: { cfg: any; title?: string; right?: React.ReactNode; children: React.ReactNode; minHeight?: number }) {
  return (
    <div style={{
      background: props.cfg.cardBg,
      border: `1px solid ${props.cfg.cardBorder}`,
      borderRadius: Number(props.cfg.cardRadius ?? 14),
      padding: 16,
      minHeight: props.minHeight,
      boxShadow: '0 18px 54px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.04)',
      backdropFilter: 'blur(10px)',
      overflow: 'hidden',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {props.title && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexShrink: 0 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: props.cfg.textColor, letterSpacing: 0.2 }}>{props.title}</h3>
          {props.right}
        </div>
      )}
      {props.children}
    </div>
  )
}


function OperationalMetricsSummary (props: {
  cfg: any
  totalLabel: string
  total: number
  attesaMia: number
  attesaAltri: number
  daPrendere: number
  ferme: number
  sanz: number
  showWorkloadSplit: boolean
}) {
  const classified = props.attesaMia + props.attesaAltri
  const myPct = classified > 0 ? Math.max(0, Math.min(100, (props.attesaMia / classified) * 100)) : 0
  const otherPct = classified > 0 ? Math.max(0, Math.min(100, 100 - myPct)) : 0
  const giaInCarico = Math.max(0, props.attesaMia - props.daPrendere)

  const indicatorStyle = {
    minWidth: 0,
    border: `1px solid ${props.cfg.cardBorder}`,
    borderRadius: 11,
    padding: '11px 12px',
    background: 'rgba(2,6,23,0.20)'
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: props.showWorkloadSplit
        ? 'repeat(auto-fit, minmax(300px, 1fr))'
        : 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: 12,
      marginBottom: 12
    }}>
      <CardShell cfg={props.cfg} minHeight={142}>
        <div style={{ height: 3, width: 44, borderRadius: 99, background: props.cfg.accentColor, boxShadow: `0 0 24px ${props.cfg.accentColor}`, marginBottom: 13 }} />
        <div style={{ color: props.cfg.mutedColor, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.2 }}>{props.totalLabel}</div>
        <div style={{ fontSize: 36, fontWeight: 900, color: props.cfg.textColor, lineHeight: 0.95, marginTop: 8 }}>{props.total}</div>
        <div style={{ color: props.cfg.mutedColor, fontSize: 13, marginTop: 9, lineHeight: 1.4 }}>
          Totale delle pratiche incluse nel quadro corrente.
        </div>
      </CardShell>

      {props.showWorkloadSplit && (
        <CardShell cfg={props.cfg} title='Ripartizione operativa' minHeight={142}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ minWidth: 0, paddingRight: 10, borderRight: `1px solid ${props.cfg.cardBorder}` }}>
              <div style={{ color: '#34d399', fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1 }}>In attesa mia</div>
              <div style={{ color: props.cfg.textColor, fontSize: 34, fontWeight: 900, lineHeight: 1, marginTop: 6 }}>{props.attesaMia}</div>
              <div style={{ color: props.cfg.mutedColor, fontSize: 12.5, lineHeight: 1.35, marginTop: 6 }}>Richiedono un tuo intervento.</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 8 }}>
                <div style={{ border: `1px solid ${props.cfg.cardBorder}`, borderRadius: 9, padding: '8px 9px', background: 'rgba(2,6,23,0.18)' }}>
                  <div style={{ color: props.cfg.mutedColor, fontSize: 11, fontWeight: 800, lineHeight: 1.25 }}>Da prendere in carico</div>
                  <div style={{ color: props.cfg.textColor, fontSize: 18, fontWeight: 900, marginTop: 3 }}>{props.daPrendere}</div>
                </div>
                <div style={{ border: `1px solid ${props.cfg.cardBorder}`, borderRadius: 9, padding: '8px 9px', background: 'rgba(2,6,23,0.18)' }}>
                  <div style={{ color: props.cfg.mutedColor, fontSize: 11, fontWeight: 800, lineHeight: 1.25 }}>Già in carico / da gestire</div>
                  <div style={{ color: props.cfg.textColor, fontSize: 18, fontWeight: 900, marginTop: 3 }}>{giaInCarico}</div>
                </div>
              </div>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: '#a78bfa', fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1 }}>In attesa di altri</div>
              <div style={{ color: props.cfg.textColor, fontSize: 34, fontWeight: 900, lineHeight: 1, marginTop: 6 }}>{props.attesaAltri}</div>
              <div style={{ color: props.cfg.mutedColor, fontSize: 12.5, lineHeight: 1.35, marginTop: 6 }}>Sono attualmente presso altri ruoli.</div>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ height: 7, borderRadius: 999, background: 'rgba(148,163,184,0.14)', overflow: 'hidden', display: 'flex' }}>
              {classified > 0 && <div style={{ width: `${myPct}%`, height: '100%', background: '#34d399' }} />}
              {classified > 0 && <div style={{ width: `${otherPct}%`, height: '100%', background: '#a78bfa' }} />}
            </div>
          </div>
        </CardShell>
      )}

      <CardShell cfg={props.cfg} title='Indicatori trasversali' minHeight={142}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
          <div style={indicatorStyle}>
            <div style={{ color: '#fb7185', fontSize: 11.5, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.8 }}>Ferme da &gt; {Number(props.cfg.staleDays || 15)} gg</div>
            <div style={{ color: props.cfg.textColor, fontSize: 28, fontWeight: 900, lineHeight: 1, marginTop: 6 }}>{props.ferme}</div>
            <div style={{ color: props.cfg.mutedColor, fontSize: 11.5, lineHeight: 1.35, marginTop: 5 }}>Pratiche senza aggiornamenti oltre la soglia.</div>
          </div>
          <div style={indicatorStyle}>
            <div style={{ color: '#fbbf24', fontSize: 11.5, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.8 }}>Fase sanzionatoria</div>
            <div style={{ color: props.cfg.textColor, fontSize: 28, fontWeight: 900, lineHeight: 1, marginTop: 6 }}>{props.sanz}</div>
            <div style={{ color: props.cfg.mutedColor, fontSize: 11.5, lineHeight: 1.35, marginTop: 5 }}>Indicatore trasversale di avanzamento.</div>
          </div>
        </div>
      </CardShell>
    </div>
  )
}

function HorizontalBars (props: { title: string; items: ChartItem[]; total: number; cfg: any; accent?: string; emptyText?: string }) {
  const max = Math.max(1, ...props.items.map(i => i.value))
  const accent = props.accent || props.cfg.accentColor
  return (
    <CardShell cfg={props.cfg} title={props.title} minHeight={260}>
      {props.items.length === 0 && <EmptyState cfg={props.cfg} text={props.emptyText} />}
      <div style={{ display: 'grid', gap: 11 }}>
        {props.items.map(item => {
          const width = Math.max(5, Math.round((item.value / max) * 100))
          const pct = props.total > 0 ? Math.round((item.value / props.total) * 100) : 0
          return (
            <div key={item.label}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto auto', gap: 9, alignItems: 'center', marginBottom: 5 }}>
                <div title={item.label} style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: props.cfg.textColor, fontSize: 12.5, fontWeight: 700 }}>{item.label}</div>
                <div style={{ color: props.cfg.textColor, fontSize: 12, fontWeight: 900 }}>{item.value}</div>
                <div style={{ color: props.cfg.mutedColor, fontSize: 11, minWidth: 34, textAlign: 'right' }}>{pct}%</div>
              </div>
              <div style={{ height: 8, borderRadius: 999, background: 'rgba(148,163,184,0.14)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${width}%`, borderRadius: 999, background: `linear-gradient(90deg, ${accent}, rgba(255,255,255,0.72))`, boxShadow: `0 0 18px ${accent}`, transition: 'width 260ms ease' }} />
              </div>
            </div>
          )
        })}
      </div>
    </CardShell>
  )
}

function InteractiveRanking (props: {
  title: string
  subtitle: string
  items: ChartItem[]
  total: number
  selected: string
  cfg: any
  accent: string
  sortBy: string
  sortDir: SortDir
  sortOptions: Array<{ value: string; label: string }>
  onSortByChange: (value: string) => void
  onSortDirChange: (value: SortDir) => void
  onSelect: (label: string) => void
}) {
  const max = Math.max(1, ...props.items.map(i => i.value))
  return (
    <CardShell
      cfg={props.cfg}
      title={props.title}
      right={(
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <span style={{ color: props.cfg.mutedColor, fontSize: 11, fontWeight: 800 }}>{props.items.length} voci</span>
          <select
            value={props.sortBy}
            onChange={(e: any) => props.onSortByChange(String(e?.target?.value || ''))}
            style={{
              height: 28,
              border: `1px solid ${props.cfg.cardBorder}`,
              borderRadius: 8,
              background: 'rgba(15,23,42,0.86)',
              color: props.cfg.textColor,
              fontSize: 11,
              fontWeight: 800,
              padding: '0 8px',
              outline: 'none'
            }}
          >
            {props.sortOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          <button
            type='button'
            onClick={() => props.onSortDirChange(props.sortDir === 'asc' ? 'desc' : 'asc')}
            title={props.sortDir === 'asc' ? 'Crescente' : 'Decrescente'}
            style={{
              width: 30,
              height: 28,
              border: `1px solid ${props.accent}`,
              borderRadius: 8,
              background: 'rgba(15,23,42,0.86)',
              color: props.accent,
              fontSize: 14,
              fontWeight: 950,
              lineHeight: '24px',
              cursor: 'pointer'
            }}
          >{props.sortDir === 'asc' ? '↑' : '↓'}</button>
        </div>
      )}
      minHeight={430}
    >
      <div style={{ color: props.cfg.mutedColor, fontSize: 12, lineHeight: 1.35, marginTop: -5, marginBottom: 11, flexShrink: 0 }}>{props.subtitle}</div>
      {props.items.length === 0 && <EmptyState cfg={props.cfg} />}
      <div style={{ display: 'grid', gap: 7, flex: '1 1 auto', minHeight: 0, overflowY: 'auto', paddingRight: 4, alignContent: 'start' }}>
        {props.items.map(item => {
          const active = props.selected === item.label
          const pct = props.total > 0 ? Math.round((item.value / props.total) * 100) : 0
          const width = Math.max(4, Math.round((item.value / max) * 100))
          return (
            <button
              key={item.label}
              type='button'
              onClick={() => props.onSelect(active ? '' : item.label)}
              title={item.label}
              style={{
                border: `1px solid ${active ? props.accent : props.cfg.cardBorder}`,
                background: active ? 'rgba(56,189,248,0.16)' : 'rgba(2,6,23,0.22)',
                color: props.cfg.textColor,
                borderRadius: 12,
                padding: 10,
                textAlign: 'left',
                width: '100%',
                display: 'block',
                cursor: 'pointer',
                boxShadow: active ? '0 0 0 2px rgba(56,189,248,0.20), 0 10px 28px rgba(0,0,0,0.22)' : 'none'
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(58px, auto)', gap: 9, alignItems: 'center', width: '100%' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ overflowWrap: 'anywhere', whiteSpace: 'normal', lineHeight: 1.22, fontSize: 12.5, fontWeight: 900 }}>{item.label}</div>
                  <div style={{ marginTop: 7, height: 6, borderRadius: 999, background: 'rgba(148,163,184,0.16)', overflow: 'hidden' }}>
                    <div style={{ width: `${width}%`, height: '100%', borderRadius: 999, background: `linear-gradient(90deg, ${props.accent}, rgba(255,255,255,0.78))`, boxShadow: `0 0 14px ${props.accent}` }} />
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 15, fontWeight: 950, lineHeight: 1 }}>{item.value}</div>
                  <div style={{ color: props.cfg.mutedColor, fontSize: 10.5, marginTop: 3 }}>{pct}%</div>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </CardShell>
  )
}

function DonutChart (props: { title: string; items: ChartItem[]; cfg: any }) {
  const total = props.items.reduce((sum, item) => sum + item.value, 0)
  const colors = [props.cfg.accentColor, '#34d399', '#fbbf24', '#a78bfa', '#fb7185', '#60a5fa', '#94a3b8']
  const radius = 44
  const circumference = 2 * Math.PI * radius
  let offset = 0
  return (
    <CardShell cfg={props.cfg} title={props.title} minHeight={260}>
      {total <= 0 && <EmptyState cfg={props.cfg} />}
      {total > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '124px minmax(0, 1fr)', gap: 16, alignItems: 'center' }}>
          <div style={{ position: 'relative', width: 124, height: 124 }}>
            <svg viewBox='0 0 120 120' width='124' height='124' aria-hidden='true'>
              <circle cx='60' cy='60' r={radius} fill='none' stroke='rgba(148,163,184,0.12)' strokeWidth='16' />
              {props.items.map((item, idx) => {
                const len = (item.value / total) * circumference
                const circle = (
                  <circle
                    key={item.label}
                    cx='60'
                    cy='60'
                    r={radius}
                    fill='none'
                    stroke={colors[idx % colors.length]}
                    strokeWidth='16'
                    strokeLinecap='round'
                    strokeDasharray={`${Math.max(0, len - 1)} ${circumference}`}
                    strokeDashoffset={-offset}
                    transform='rotate(-90 60 60)'
                  />
                )
                offset += len
                return circle
              })}
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ color: props.cfg.textColor, fontSize: 28, fontWeight: 900, lineHeight: 1 }}>{total}</div>
              <div style={{ color: props.cfg.mutedColor, fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>totale</div>
            </div>
          </div>
          <div style={{ display: 'grid', gap: 9, minWidth: 0 }}>
            {props.items.slice(0, 6).map((item, idx) => (
              <div key={item.label} style={{ display: 'grid', gridTemplateColumns: '10px minmax(0, 1fr) auto', gap: 8, alignItems: 'center', color: props.cfg.mutedColor, fontSize: 12 }}>
                <span style={{ width: 9, height: 9, borderRadius: 99, background: colors[idx % colors.length], boxShadow: `0 0 12px ${colors[idx % colors.length]}` }} />
                <span title={item.label} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                <strong style={{ color: props.cfg.textColor }}>{item.value}</strong>
              </div>
            ))}
          </div>
        </div>
      )}
    </CardShell>
  )
}

function TrendChart (props: { title: string; points: TrendPoint[]; cfg: any }) {
  const width = 520
  const height = 168
  const padX = 18
  const padTop = 18
  const padBottom = 30
  const innerW = width - padX * 2
  const innerH = height - padTop - padBottom
  const max = Math.max(1, ...props.points.map(p => p.value))
  const step = props.points.length > 1 ? innerW / (props.points.length - 1) : innerW
  const coords = props.points.map((p, i) => ({
    x: padX + i * step,
    y: padTop + innerH - ((p.value / max) * innerH),
    ...p
  }))
  const path = coords.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const areaPath = coords.length ? `${path} L${coords[coords.length - 1].x.toFixed(1)} ${height - padBottom} L${coords[0].x.toFixed(1)} ${height - padBottom} Z` : ''
  const labelStep = Math.max(1, Math.ceil(coords.length / 8))
  return (
    <CardShell cfg={props.cfg} title={props.title} minHeight={260}>
      <svg viewBox={`0 0 ${width} ${height}`} width='100%' height='190' preserveAspectRatio='none' aria-hidden='true'>
        {[0, 1, 2, 3].map(i => {
          const y = padTop + (innerH / 3) * i
          return <line key={i} x1={padX} x2={width - padX} y1={y} y2={y} stroke='rgba(148,163,184,0.12)' strokeWidth='1' />
        })}
        <defs>
          <linearGradient id='giiTrendFill' x1='0' x2='0' y1='0' y2='1'>
            <stop offset='0%' stopColor={props.cfg.accentColor} stopOpacity='0.32' />
            <stop offset='100%' stopColor={props.cfg.accentColor} stopOpacity='0.02' />
          </linearGradient>
        </defs>
        <path d={areaPath} fill='url(#giiTrendFill)' />
        <path d={path} fill='none' stroke={props.cfg.accentColor} strokeWidth='3' strokeLinecap='round' strokeLinejoin='round' />
        {coords.map((p, i) => (
          <g key={`${p.label}-${i}`}>
            <circle cx={p.x} cy={p.y} r='3.5' fill={props.cfg.accentColor} />
            {(i === 0 || i === coords.length - 1 || p.value === max) && <text x={p.x} y={Math.max(12, p.y - 9)} fill={props.cfg.textColor} fontSize='11' fontWeight='800' textAnchor='middle'>{p.value}</text>}
          </g>
        ))}
        {coords.map((p, i) => (i === 0 || i === coords.length - 1 || i % labelStep === 0) && (
          <text key={`l-${p.label}-${i}`} x={p.x} y={height - 8} fill={props.cfg.mutedColor} fontSize='10' textAnchor='middle'>{p.label}</text>
        ))}
      </svg>
    </CardShell>
  )
}

function PeriodSelector (props: { value: PeriodFilter; onChange: (value: PeriodFilter) => void; cfg: any }) {
  const items: Array<{ value: PeriodFilter; label: string }> = [
    { value: 'all', label: 'Tutto' },
    { value: '365', label: '12 mesi' },
    { value: '90', label: '90 gg' },
    { value: '30', label: '30 gg' }
  ]
  return (
    <div style={{ display: 'inline-flex', padding: 3, border: `1px solid ${props.cfg.cardBorder}`, borderRadius: 999, background: 'rgba(15,23,42,0.72)', gap: 2 }}>
      {items.map(item => {
        const active = props.value === item.value
        return (
          <button key={item.value} type='button' onClick={() => props.onChange(item.value)}
            style={{
              border: 'none',
              borderRadius: 999,
              padding: '7px 10px',
              background: active ? props.cfg.accentColor : 'transparent',
              color: active ? '#03111f' : props.cfg.mutedColor,
              fontSize: 11,
              fontWeight: 900,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >{item.label}</button>
        )
      })}
    </div>
  )
}

export default function Widget (props: AllWidgetProps<IMConfig>) {
  const cfgSrc: any = props.config as any
  const cfg: any = {
    ...defaultConfig,
    ...(cfgSrc?.asMutable ? cfgSrc.asMutable({ deep: true }) : cfgSrc?.toJS ? cfgSrc.toJS() : (cfgSrc || {}))
  }
  const [user, setUser] = React.useState<GiiUserInfo | null>(() => readGiiUser())
  const [records, setRecords] = React.useState<DashRecord[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string>('')
  const [lastLoad, setLastLoad] = React.useState<number | null>(null)
  const [nonce, setNonce] = React.useState(0)
  const [periodFilter, setPeriodFilter] = React.useState<PeriodFilter>('all')
  const [activeTab, setActiveTab] = React.useState<DashboardTab>('operativo')
  const [selectedSettore, setSelectedSettore] = React.useState('')
  const [selectedInfrazione, setSelectedInfrazione] = React.useState('')
  const [settoreSortBy, setSettoreSortBy] = React.useState<SettoreSortBy>('label')
  const [settoreSortDir, setSettoreSortDir] = React.useState<SortDir>('asc')
  const [infrazioneSortBy, setInfrazioneSortBy] = React.useState<InfrazioneSortBy>('article')
  const [infrazioneSortDir, setInfrazioneSortDir] = React.useState<SortDir>('asc')

  React.useEffect(() => {
    const hUser = () => setUser(readGiiUser())
    const hRefresh = () => setNonce(n => n + 1)
    window.addEventListener('gii:userLoaded', hUser as any)
    window.addEventListener('gii-force-refresh-selection', hRefresh as any)
    window.addEventListener('gii-dashboard-refresh', hRefresh as any)
    return () => {
      window.removeEventListener('gii:userLoaded', hUser as any)
      window.removeEventListener('gii-force-refresh-selection', hRefresh as any)
      window.removeEventListener('gii-dashboard-refresh', hRefresh as any)
    }
  }, [])

  const views = React.useMemo(() => pickRuntimeViewsForUser(user), [user])
  const viewsKey = React.useMemo(() => views.map(v => v.layerUrl).sort().join('|'), [views])
  const viewsLabel = React.useMemo(() => views.map(v => v.viewName).join(', '), [views])
  const effectiveRole = getEffectiveRole(user?.ruoloCod || '', user?.areaCod || '')

  React.useEffect(() => {
    let cancelled = false
    const run = async () => {
      setError('')
      if (!user?.username) {
        setRecords([])
        return
      }
      if (!views.length) {
        setRecords([])
        setError('Non è stato possibile individuare le pratiche di competenza.')
        return
      }
      setLoading(true)
      try {
        const chunks = await Promise.all(views.map(view => queryLayer(view, cfg.whereClause || '1=1', Number(cfg.pageSize || 2000))))
        if (cancelled) return
        const uniq = new Map<string, DashRecord>()
        let fallbackIndex = 0
        for (const record of chunks.flat()) {
          const gid = String(record?.GlobalID ?? record?.globalid ?? record?.GLOBALID ?? '').trim().replace(/[{}]/g, '').toLowerCase()
          const oid = String(record?.OBJECTID ?? record?.objectid ?? record?.ObjectId ?? '').trim()
          const key = gid ? `gid:${gid}` : (oid ? `oid:${oid}` : `row:${fallbackIndex++}`)
          if (!uniq.has(key)) uniq.set(key, record)
        }
        const visible = Array.from(uniq.values()).filter(r => isRecordVisibleForCurrentUser(r, user))
        setRecords(visible)
        setLastLoad(Date.now())
      } catch (ex: any) {
        if (cancelled) return
        setRecords([])
        setError(String(ex?.message || ex || 'Errore caricamento dashboard'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [viewsKey, user, cfg.whereClause, cfg.pageSize, nonce])

  const staleMs = Math.max(1, Number(cfg.staleDays || 15)) * 24 * 60 * 60 * 1000
  const now = Date.now()
  const analysisRecords = React.useMemo(() => {
    if (periodFilter === 'all') return records
    const days = Number(periodFilter)
    const from = Date.now() - (days * 24 * 60 * 60 * 1000)
    return records.filter(r => {
      const ms = getAnalysisDateMs(r)
      return ms !== null && ms >= from
    })
  }, [records, periodFilter])
  const statsFilteredRecords = React.useMemo(() => {
    return analysisRecords.filter(r => {
      const settoreOk = !selectedSettore || getSettoreLabel(r) === selectedSettore
      const infrazioneOk = !selectedInfrazione || recordHasInfraction(r, selectedInfrazione)
      return settoreOk && infrazioneOk
    })
  }, [analysisRecords, selectedSettore, selectedInfrazione])
  const displayRecords = activeTab === 'statistiche' ? statsFilteredRecords : records
  const attesaMia = displayRecords.filter(r => isAttesaMia(r, user)).length
  const attesaAltri = displayRecords.filter(r => isAttesaAltri(r, user)).length
  const sanz = displayRecords.filter(r => isInFaseSanzionatoria(r)).length
  const ferme = displayRecords.filter(r => {
    const last = getLastTouchMs(r)
    return last !== null && (now - last) > staleMs
  }).length
  const daPrendere = displayRecords.filter(r => isDaPrendereInCarico(r, user)).length

  const byFase = React.useMemo(() => {
    const map = new Map<string, number>()
    for (const r of displayRecords) {
      const k = faseLabel(getActiveRole(r))
      map.set(k, (map.get(k) || 0) + 1)
    }
    return toChartItems(map, 8)
  }, [displayRecords])

  const byRole = React.useMemo(() => {
    const map = new Map<string, number>()
    for (const r of displayRecords) {
      const k = ruoloOperativoLabel(getActiveRole(r))
      map.set(k, (map.get(k) || 0) + 1)
    }
    return toChartItems(map, 8)
  }, [displayRecords])

  const byStatus = React.useMemo(() => {
    if (!user || user.isAdmin || user.isWorkflowAdmin) return [] as ChartItem[]
    const map = new Map<string, number>()
    for (const r of displayRecords) {
      const k = statoLabel(getMyStateValueForRecord(r, user))
      map.set(k, (map.get(k) || 0) + 1)
    }
    return toChartItems(map, 8)
  }, [displayRecords, user])

  const bySettore = React.useMemo(() => {
    const map = new Map<string, number>()
    for (const r of displayRecords) {
      const k = getSettoreLabel(r)
      map.set(k, (map.get(k) || 0) + 1)
    }
    return toChartItems(map, 8)
  }, [displayRecords])

  const byInfrazione = React.useMemo(() => {
    const map = new Map<string, number>()
    for (const r of displayRecords) {
      for (const label of getInfractionLabels(r)) map.set(label, (map.get(label) || 0) + 1)
    }
    return toChartItems(map, 8)
  }, [displayRecords])

  const allSettori = React.useMemo(() => {
    const base = selectedInfrazione
      ? analysisRecords.filter(r => recordHasInfraction(r, selectedInfrazione))
      : analysisRecords
    return sortSettoreItems(buildSettoreItems(base), settoreSortBy, settoreSortDir)
  }, [analysisRecords, selectedInfrazione, settoreSortBy, settoreSortDir])

  const allInfrazioni = React.useMemo(() => {
    const base = selectedSettore
      ? analysisRecords.filter(r => getSettoreLabel(r) === selectedSettore)
      : analysisRecords
    return sortInfrazioneItems(buildInfrazioneItems(base), infrazioneSortBy, infrazioneSortDir)
  }, [analysisRecords, selectedSettore, infrazioneSortBy, infrazioneSortDir])

  React.useEffect(() => {
    if (selectedSettore && !allSettori.some(item => item.label === selectedSettore)) setSelectedSettore('')
  }, [allSettori, selectedSettore])

  React.useEffect(() => {
    if (selectedInfrazione && !allInfrazioni.some(item => item.label === selectedInfrazione)) setSelectedInfrazione('')
  }, [allInfrazioni, selectedInfrazione])

  // Ultimo aggiornamento fra le pratiche del perimetro (per la Sintesi operativa).
  const lastTouchMs = React.useMemo(() => displayRecords.reduce((max, r) => Math.max(max, getLastTouchMs(r) || 0), 0), [displayRecords])

  const trend = React.useMemo(() => buildPeriodTrend(displayRecords, activeTab === 'statistiche' ? periodFilter : '365'), [displayRecords, activeTab, periodFilter])

  // Esporta CSV delle statistiche visibili (dati aggregati, con periodo e filtri attivi). L'elenco delle pratiche si esporta dal Report.
  const exportStatisticheCsv = () => {
    const periodoLabel: Record<PeriodFilter, string> = { all: 'Tutto', '365': 'Ultimi 12 mesi', '90': 'Ultimi 90 giorni', '30': 'Ultimi 30 giorni' }
    const rows: any[][] = [
      ['Statistiche delle pratiche GII'],
      ['Esportato il', new Date().toLocaleString('it-IT')],
      ['Periodo', periodoLabel[periodFilter] || periodFilter],
      ['Filtro Settore', selectedSettore || 'Nessuno'],
      ['Filtro tipologia di infrazione', selectedInfrazione || 'Nessuno'],
      [],
      ['Indicatore', 'Pratiche'],
      ['Pratiche analizzate', displayRecords.length]
    ]
    if (!(user?.isAdmin || user?.isWorkflowAdmin)) {
      rows.push(['In attesa mia', attesaMia], ['Da prendere in carico', daPrendere], ['In attesa di altri', attesaAltri])
    }
    rows.push([`Ferme da più di ${Number(cfg.staleDays || 15)} giorni`, ferme], ['Fase sanzionatoria', sanz])
    const sezione = (titolo: string, items: Array<{ label: string; value: number }>) => {
      rows.push([], [titolo, 'Pratiche'])
      for (const item of items) rows.push([item.label, item.value])
    }
    sezione('Settore', allSettori)
    sezione('Tipologia di infrazione', allInfrazioni)
    sezione('Fase', byFase)
    sezione('Ruolo competente', byRole)
    rows.push([], ['Periodo di rilevazione', 'Rilevazioni'])
    for (const p of trend) rows.push([p.label, p.value])
    const csv = rows.map(row => row.map(csvEscape).join(';')).join('\r\n')
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gii_statistiche_pratiche_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const criticalRows = React.useMemo(() => {
    return displayRecords
      .map(r => ({ r, t: getLastTouchMs(r) || 0 }))
      .filter(({ t }) => t > 0 && (now - t) > staleMs)
      .sort((a, b) => a.t - b.t)
      .slice(0, 6)
  }, [displayRecords, now, staleMs])




  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden', color: cfg.textColor, boxSizing: 'border-box', padding: `${Number(cfg.outerPaddingTop ?? defaultConfig.outerPaddingTop)}px ${Number(cfg.outerPaddingRight ?? defaultConfig.outerPaddingRight)}px ${Number(cfg.outerPaddingBottom ?? defaultConfig.outerPaddingBottom)}px ${Number(cfg.outerPaddingLeft ?? defaultConfig.outerPaddingLeft)}px` }}>
      <div style={{
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: `radial-gradient(circle at 18% 0%, rgba(56,189,248,0.13), transparent 34%), radial-gradient(circle at 86% 8%, rgba(52,211,153,0.10), transparent 30%), ${cfg.panelBg}`,
        border: `1px solid ${cfg.cardBorder}`,
        borderRadius: 18,
        padding: `${Number(cfg.panelPaddingTop ?? defaultConfig.panelPaddingTop)}px ${Number(cfg.panelPaddingRight ?? defaultConfig.panelPaddingRight)}px ${Number(cfg.panelPaddingBottom ?? defaultConfig.panelPaddingBottom)}px ${Number(cfg.panelPaddingLeft ?? defaultConfig.panelPaddingLeft)}px`,
        boxShadow: '0 28px 90px rgba(0,0,0,0.30)'
      }}>
        {/* scrollbarGutter: lo spazio della barra di scorrimento è riservato in entrambe le schede,
            così passando da Operativo a Statistiche il contenuto non si sposta a sinistra.
            Anche Stato operativo scorre, se il contenuto supera l'altezza disponibile. */}
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto', overflowX: 'hidden', paddingRight: 2, scrollbarGutter: 'stable' } as any}>
          <GiiPageTitle
          showSubtitle={(cfg as any).showTitleSubtitle !== false}
          showDivider={(cfg as any).showTitleDivider !== false}
          showIcon={(cfg as any).showTitleIcon !== false}
            title={cfg.title || undefined}
            subtitle={cfg.subtitle || undefined}
            fallbackIcon='dashboard'
            titleColor={cfg.textColor}
            titleFontSize={Number(cfg.pageTitleFontSize ?? 22)}
            titleFontWeight={900}
            subtitleColor={String(cfg.pageTitleDescriptionColor || cfg.mutedColor)}
            subtitleFontSize={Number(cfg.pageTitleDescriptionFontSize ?? 13)}
            iconSize={Number(cfg.titleIconSize ?? 26)}
            dividerColor={String(cfg.titleDividerColor || cfg.accentColor)}
            dividerWidth={Math.max(0, Number(cfg.titleDividerWidth ?? 2))}
            style={{ marginBottom: 10, flex: '0 0 auto' }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, borderBottom: `1px solid ${cfg.cardBorder}`, flexWrap: 'wrap' }}>
            {[
              { id: 'operativo' as DashboardTab, label: 'Stato operativo' },
              { id: 'statistiche' as DashboardTab, label: 'Statistiche' }
            ].map(tab => {
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type='button'
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    border: 'none',
                    borderBottom: `3px solid ${active ? cfg.accentColor : 'transparent'}`,
                    background: active ? 'rgba(255,255,255,0.07)' : 'transparent',
                    color: active ? cfg.textColor : cfg.mutedColor,
                    padding: '10px 14px 9px',
                    fontSize: 12,
                    fontWeight: 900,
                    letterSpacing: 0.4,
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    borderRadius: '10px 10px 0 0'
                  }}
                >{tab.label}</button>
              )
            })}
          </div>

          {activeTab === 'statistiche' ? (
            <React.Fragment>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 14, alignItems: 'center', minHeight: 40, marginBottom: 12 }}>
            <div style={{ minWidth: 0 }}>
              {/* Come nella scheda Operativo: il titolo è solo nell'intestazione della pagina. */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                {lastLoad && <div style={{ color: cfg.mutedColor, fontSize: 11.5 }}>Aggiornato: {new Date(lastLoad).toLocaleString('it-IT')}</div>}
                {cfg.showTechnicalInfo && views.length > 0 && <div style={{ color: cfg.mutedColor, fontSize: 11.5 }}>{views.length > 1 ? 'Ambiti dati' : 'Ambito dati'}: {viewsLabel}</div>}
                <div style={{ color: cfg.mutedColor, fontSize: 11.5 }}>Record caricati: {records.length}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center' }}>
              <PeriodSelector value={periodFilter} onChange={setPeriodFilter} cfg={cfg} />
              {(selectedSettore || selectedInfrazione) && (
                <button
                  type='button'
                  onClick={() => { setSelectedSettore(''); setSelectedInfrazione('') }}
                  style={{ border: `1px solid ${cfg.accentColor}`, background: 'rgba(56,189,248,0.16)', color: cfg.textColor, borderRadius: 999, padding: '9px 12px', fontWeight: 900, cursor: 'pointer' }}
                >Azzera filtri</button>
              )}
              <button type='button' onClick={exportStatisticheCsv} disabled={displayRecords.length === 0} title='Esporta CSV delle statistiche' aria-label='Esporta CSV delle statistiche' style={{ width: 36, height: 36, padding: 0, boxSizing: 'border-box', border: `1px solid ${displayRecords.length ? cfg.accentColor : cfg.cardBorder}`, background: displayRecords.length ? cfg.accentColor : 'rgba(15,23,42,0.86)', color: displayRecords.length ? '#03111f' : cfg.mutedColor, borderRadius: 8, cursor: displayRecords.length ? 'pointer' : 'not-allowed', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><ExportActionIcon /></button>
              <button type='button' onClick={() => setNonce(n => n + 1)} title='Aggiorna' aria-label='Aggiorna' style={{ width: 36, height: 36, padding: 0, boxSizing: 'border-box', border: `1px solid ${cfg.cardBorder}`, background: 'rgba(15,23,42,0.86)', color: cfg.textColor, borderRadius: 8, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}><RefreshActionIcon /></button>
            </div>
          </div>

          {loading && <div style={{ padding: 14, marginBottom: 16, borderRadius: 14, background: 'rgba(255,255,255,0.08)', color: cfg.mutedColor }}>Caricamento dashboard...</div>}
          {error && <div style={{ padding: 14, marginBottom: 16, borderRadius: 14, background: 'rgba(127,29,29,0.40)', border: '1px solid rgba(248,113,113,0.35)', color: '#fecaca' }}>{error}</div>}

          <OperationalMetricsSummary
            cfg={cfg}
            totalLabel='Pratiche analizzate'
            total={displayRecords.length}
            attesaMia={attesaMia}
            attesaAltri={attesaAltri}
            daPrendere={daPrendere}
            ferme={ferme}
            sanz={sanz}
            showWorkloadSplit={!(user?.isAdmin || user?.isWorkflowAdmin)}
          />

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
            <span style={{ color: cfg.mutedColor, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1.1 }}>Filtri attivi</span>
            <span style={{ color: selectedSettore ? '#03111f' : cfg.mutedColor, background: selectedSettore ? cfg.accentColor : 'rgba(148,163,184,0.12)', border: `1px solid ${selectedSettore ? cfg.accentColor : cfg.cardBorder}`, borderRadius: 999, padding: '6px 9px', fontSize: 11.5, fontWeight: 900 }}>Settore: {selectedSettore || 'Tutti'}</span>
            <span style={{ color: selectedInfrazione ? '#03111f' : cfg.mutedColor, background: selectedInfrazione ? '#34d399' : 'rgba(148,163,184,0.12)', border: `1px solid ${selectedInfrazione ? '#34d399' : cfg.cardBorder}`, borderRadius: 999, padding: '6px 9px', fontSize: 11.5, fontWeight: 900 }}>Infrazione: {selectedInfrazione || 'Tutte'}</span>
            <span style={{ color: cfg.mutedColor, fontSize: 11.5, marginLeft: 'auto' }}>{displayRecords.length} pratiche nel perimetro selezionato</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12, marginBottom: 12 }}>
            <InteractiveRanking
              title='Settori'
              subtitle='Elenco completo. Clic su una riga per filtrare tutta la dashboard.'
              items={allSettori}
              total={allSettori.reduce((sum, item) => sum + item.value, 0)}
              selected={selectedSettore}
              cfg={cfg}
              accent={cfg.accentColor}
              sortBy={settoreSortBy}
              sortDir={settoreSortDir}
              sortOptions={[
                { value: 'label', label: 'Settore' },
                { value: 'count', label: 'Numero' }
              ]}
              onSortByChange={value => setSettoreSortBy(value === 'count' ? 'count' : 'label')}
              onSortDirChange={setSettoreSortDir}
              onSelect={setSelectedSettore}
            />
            <InteractiveRanking
              title='Tipologie di infrazione'
              subtitle='Elenco completo delle tipologie rilevate nel perimetro corrente.'
              items={allInfrazioni}
              total={allInfrazioni.reduce((sum, item) => sum + item.value, 0)}
              selected={selectedInfrazione}
              cfg={cfg}
              accent='#34d399'
              sortBy={infrazioneSortBy}
              sortDir={infrazioneSortDir}
              sortOptions={[
                { value: 'article', label: 'Articolo' },
                { value: 'count', label: 'Numero' }
              ]}
              onSortByChange={value => setInfrazioneSortBy(value === 'count' ? 'count' : 'article')}
              onSortDirChange={setInfrazioneSortDir}
              onSelect={setSelectedInfrazione}
            />
            <div style={{ display: 'grid', gap: 12, minWidth: 0 }}>
              <TrendChart title='Andamento rilevazioni filtrate' points={trend} cfg={cfg} />
              <DonutChart title='Distribuzione per fase' items={byFase.slice(0, 6)} cfg={cfg} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginBottom: 12 }}>
            <HorizontalBars title='Ruolo competente' items={byRole} total={displayRecords.length} cfg={cfg} accent='#a78bfa' />
            <CardShell cfg={cfg} title='Pratiche critiche' minHeight={260}>
              {criticalRows.length === 0 && <EmptyState cfg={cfg} text='Nessuna pratica oltre la soglia impostata.' />}
              <div style={{ display: 'grid', gap: 9 }}>
                {criticalRows.map(({ r, t }) => {
                  const days = Math.max(1, Math.floor((now - t) / (24 * 60 * 60 * 1000)))
                  const oid = getObjectId(r)
                  return (
                    <div key={`${oid}-${t}`} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 12, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(148,163,184,0.11)' }}>
                      <div style={{ minWidth: 0 }}>
                        <div title={getNumeroRapporto(r)} style={{ color: cfg.textColor, fontSize: 12.5, fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getNumeroRapporto(r)}</div>
                        <div title={`${getComune(r)} - ${faseLabel(getActiveRole(r))}`} style={{ color: cfg.mutedColor, fontSize: 11.5, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getComune(r)} · {faseLabel(getActiveRole(r))}</div>
                      </div>
                      <div style={{ color: '#fecaca', background: 'rgba(251,113,133,0.13)', border: '1px solid rgba(251,113,133,0.30)', borderRadius: 999, padding: '5px 8px', fontSize: 11, fontWeight: 900 }}>{days} gg</div>
                    </div>
                  )
                })}
              </div>
            </CardShell>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: (user?.isAdmin || user?.isWorkflowAdmin) ? '1fr' : 'minmax(280px, 0.72fr) minmax(360px, 1.28fr)', gap: 12, marginBottom: 12 }}>
            {!(user?.isAdmin || user?.isWorkflowAdmin) && (
              <HorizontalBars title='Stato delle attività' items={byStatus} total={displayRecords.length} cfg={cfg} accent='#fbbf24' />
            )}
            <CardShell cfg={cfg} title='Sintesi operativa' minHeight={220}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
                {[
                  ['Fase più frequente', byFase[0]?.label || '—', byFase[0]?.value || 0],
                  ['Settore più presente', bySettore[0]?.label || '—', bySettore[0]?.value || 0],
                  ['Infrazione ricorrente', byInfrazione[0]?.label || '—', byInfrazione[0]?.value || 0],
                  ['Ultimo aggiornamento', formatShortDateTime(lastTouchMs || null), displayRecords.length]
                ].map(([label, value, count]) => (
                  <div key={String(label)} style={{ border: `1px solid ${cfg.cardBorder}`, borderRadius: 12, padding: 12, background: 'rgba(2,6,23,0.22)' }}>
                    <div style={{ color: cfg.mutedColor, fontSize: 10.5, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
                    <div title={String(value)} style={{ color: cfg.textColor, fontSize: 13.5, fontWeight: 900, marginTop: 7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
                    <div style={{ color: cfg.mutedColor, fontSize: 11, marginTop: 4 }}>{typeof count === 'number' && count > 0 ? `${count} pratiche` : 'Dato non disponibile'}</div>
                  </div>
                ))}
              </div>
            </CardShell>
          </div>

            </React.Fragment>
          ) : (
            <React.Fragment>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, minHeight: 40, marginBottom: 12, flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0 }}>
                  {/* Titolo e sottotitolo sono già nell'intestazione della pagina: qui solo i dati di aggiornamento. */}
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                    {lastLoad && <div style={{ color: cfg.mutedColor, fontSize: 11.5 }}>Aggiornato: {new Date(lastLoad).toLocaleString('it-IT')}</div>}
                    {cfg.showTechnicalInfo && views.length > 0 && <div style={{ color: cfg.mutedColor, fontSize: 11.5 }}>{views.length > 1 ? 'Ambiti dati' : 'Ambito dati'}: {viewsLabel}</div>}
                    <div style={{ color: cfg.mutedColor, fontSize: 11.5 }}>Record caricati: {records.length}</div>
                  </div>
                </div>
                <button type='button' onClick={() => setNonce(n => n + 1)} title='Aggiorna' aria-label='Aggiorna' style={{ width: 36, height: 36, padding: 0, boxSizing: 'border-box', border: `1px solid ${cfg.cardBorder}`, background: 'rgba(15,23,42,0.86)', color: cfg.textColor, borderRadius: 8, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}><RefreshActionIcon /></button>
              </div>

              {loading && <div style={{ padding: 14, marginBottom: 16, borderRadius: 14, background: 'rgba(255,255,255,0.08)', color: cfg.mutedColor }}>Caricamento dashboard...</div>}
              {error && <div style={{ padding: 14, marginBottom: 16, borderRadius: 14, background: 'rgba(127,29,29,0.40)', border: '1px solid rgba(248,113,113,0.35)', color: '#fecaca' }}>{error}</div>}

              <OperationalMetricsSummary
                cfg={cfg}
                totalLabel='Pratiche di competenza'
                total={displayRecords.length}
                attesaMia={attesaMia}
                attesaAltri={attesaAltri}
                daPrendere={daPrendere}
                ferme={ferme}
                sanz={sanz}
                showWorkloadSplit={!(user?.isAdmin || user?.isWorkflowAdmin)}
              />

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginBottom: 12 }}>
                <HorizontalBars title='Pratiche per fase di lavorazione' items={byFase} total={displayRecords.length} cfg={cfg} />
                <HorizontalBars title='Pratiche per ruolo competente' items={byRole} total={displayRecords.length} cfg={cfg} accent='#a78bfa' />
                {user?.isAdmin || user?.isWorkflowAdmin
                  ? <CardShell cfg={cfg} title='Stato delle attività' minHeight={260}><EmptyState cfg={cfg} text='Per l’amministratore non è previsto uno stato attività specifico.' /></CardShell>
                  : <HorizontalBars title='Stato delle attività' items={byStatus} total={displayRecords.length} cfg={cfg} accent='#fbbf24' />}
              </div>
            </React.Fragment>
          )}

        </div>
      </div>
    </div>
  )
}
