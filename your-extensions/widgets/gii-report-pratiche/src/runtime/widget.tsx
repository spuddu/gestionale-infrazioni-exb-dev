/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx, type AllWidgetProps } from 'jimu-core'
import { defaultConfig, type IMConfig } from '../config'
import { isPracticeAssignedToCurrentIa } from '../../../_shared/gii-access/ia-assignment'
import {
  pickGiiRuntimeView,
  type GiiRuntimeView as RuntimeDsView
} from '../../../_shared/gii-runtime/runtime-views'

type TransferActionIconName = 'import' | 'export'

function TransferActionIcon (props: { name: TransferActionIconName, size?: number }): React.ReactElement {
  const size = Number(props.size || 18)
  if (props.name === 'import') {
    return (
      <svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true' focusable='false'>
        <path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'/>
        <path d='M17 8l-5-5-5 5'/>
        <path d='M12 3v12'/>
      </svg>
    )
  }
  return (
    <svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true' focusable='false'>
      <path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'/>
      <path d='M7 10l5 5 5-5'/>
      <path d='M12 15V3'/>
    </svg>
  )
}

function transferActionButtonStyle (disabled: boolean): React.CSSProperties {
  return {
    width: 30,
    height: 30,
    padding: 0,
    boxSizing: 'border-box',
    borderRadius: 7,
    border: `1.5px solid ${disabled ? '#e5e7eb' : '#0d3b66'}`,
    background: disabled ? '#e5e7eb' : '#ffffff',
    color: disabled ? '#9ca3af' : '#0d3b66',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
    flex: '0 0 auto',
    opacity: disabled ? 0.6 : 1
  }
}

type GiiUserInfo = {
  username: string
  fullName?: string
  full_name?: string
  nome?: string
  displayName?: string
  ruoloCod: string
  ruoloLabel: string
  area: number | null
  areaCod: 'AMM' | 'AGR' | 'TEC' | ''
  settore: number | null
  settoreCod: string
  gruppo?: string
  isAdmin: boolean
  isWorkflowAdmin?: boolean
}

type ReportRecord = Record<string, any>
type SituationFilter = 'tutte' | 'da_gestire' | 'attesa_altri' | 'ferme' | 'sanzionatoria'
type SortKey = 'lastUpdate' | 'rilevazioneNumber' | 'reportNumber' | 'verbaleNumber' | 'reportDate' | 'rilevatore' | 'istruttore' | 'area' | 'settore' | 'faseProcedimentale' | 'ruoloCorrente' | 'giorniFermo'
type SortDir = 'asc' | 'desc'
type SortRule = { key: SortKey; dir: SortDir }

const DEFAULT_SORT_RULES: SortRule[] = [{ key: 'lastUpdate', dir: 'desc' }]

const SETTORE_FROM_CODE: Record<number, string> = { 1: 'CR', 2: 'GI', 3: 'D1', 4: 'D2', 5: 'D3', 6: 'D4', 7: 'D5', 8: 'D6', 9: 'DS' }
const AREA_LABELS: Record<string, string> = { AGR: 'Agraria', TEC: 'Tecnica', AMM: 'Amministrativa' }
const SETTORE_LABELS: Record<string, string> = {
  D1: 'Distretto 1 – San Sperate',
  D2: 'Distretto 2 – Serramanna/Pimpisu',
  D3: 'Distretto 3 – San Gavino/Villacidro',
  D4: 'Distretto 4 – Basso Sulcis',
  D5: 'Distretto 5 – Senorbì',
  D6: 'Distretto 6 – Cixerri',
  DS: 'Manutenzione opere di dreno e di scolo',
  CR: 'Catasto, Ruoli e Servizi Territoriali',
  GI: 'Gestione irrigua'
}

type DomainLabelGroup = 'area' | 'settore' | 'ruolo'
type DomainLabelMaps = Record<DomainLabelGroup, Record<string, string>>

const EMPTY_DOMAIN_LABELS: DomainLabelMaps = { area: {}, settore: {}, ruolo: {} }
const SETTORE_TEXT_CODES = new Set(['CR', 'GI', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'DS'])

function normalizeTextCode (v: any): string {
  return String(v ?? '').trim().toUpperCase()
}

function cloneEmptyDomainLabels (): DomainLabelMaps {
  return { area: {}, settore: {}, ruolo: {} }
}

function getDomainGroupFromFieldName (fieldName: string): DomainLabelGroup | null {
  const f = String(fieldName || '').trim().toLowerCase()
  if (f === 'area' || f === 'area_cod' || f === 'areacod') return 'area'
  if (f === 'settore' || f === 'settore_cod' || f === 'settorecod' || f === 'id_settore') return 'settore'
  if (f === 'ruolo_cod' || f === 'ruolocod') return 'ruolo'
  return null
}

function normalizeDomainLookupKey (group: DomainLabelGroup, value: any): string {
  const text = normalizeTextCode(value)
  if (!text) return ''
  if (group === 'area') {
    const area = normalizeAreaCode(text)
    return area || text
  }
  if (group === 'settore') {
    if (SETTORE_TEXT_CODES.has(text)) return text
    const n = Number(value)
    return Number.isFinite(n) ? normalizeSettoreCode(n) : text
  }
  if (group === 'ruolo') {
    if (text === 'RIA') return 'RIA'
    if (text === 'Istruttore amministrativo' || text === 'IA-AMM') return 'IA'
    return text
  }
  return text
}

function buildDomainLabelMapsFromFields (fields: any[]): DomainLabelMaps {
  const maps = cloneEmptyDomainLabels()
  for (const f of (Array.isArray(fields) ? fields : [])) {
    const group = getDomainGroupFromFieldName(String(f?.name || ''))
    const codedValues = f?.domain?.codedValues
    if (!group || !Array.isArray(codedValues)) continue
    for (const cv of codedValues) {
      const label = String(cv?.name ?? '').trim()
      if (!label) continue
      const normalizedKey = normalizeDomainLookupKey(group, cv?.code)
      const rawKey = normalizeTextCode(cv?.code)
      if (normalizedKey) maps[group][normalizedKey] = label
      if (rawKey) maps[group][rawKey] = label
    }
  }
  return maps
}

async function loadDomainLabelMaps (layerUrl: string): Promise<DomainLabelMaps> {
  const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
  const layer = new FeatureLayer({ url: layerUrl, outFields: ['*'] })
  if (typeof layer.load === 'function') {
    try { await layer.load() } catch {}
  }
  return buildDomainLabelMapsFromFields(Array.isArray(layer?.fields) ? layer.fields : [])
}

function getDomainLabel (domainLabels: DomainLabelMaps | null | undefined, group: DomainLabelGroup, code: any): string | null {
  const key = normalizeDomainLookupKey(group, code)
  if (!key) return null
  const direct = domainLabels?.[group]?.[key]
  if (direct) return direct
  const raw = normalizeTextCode(code)
  return raw ? (domainLabels?.[group]?.[raw] || null) : null
}

function getAreaLabelFromCode (code: any, domainLabels?: DomainLabelMaps | null): string {
  const key = normalizeDomainLookupKey('area', code)
  return getDomainLabel(domainLabels, 'area', code) || AREA_LABELS[key] || key || '—'
}

function getSettoreLabelFromCode (code: any, domainLabels?: DomainLabelMaps | null): string {
  const key = normalizeDomainLookupKey('settore', code)
  return getDomainLabel(domainLabels, 'settore', code) || SETTORE_LABELS[key] || key || '—'
}

function pickField (d: any, name: string): any {
  if (d == null) return undefined
  if (d[name] !== undefined) return d[name]
  const lc = String(name).toLowerCase()
  for (const k of Object.keys(d)) {
    if (k.toLowerCase() === lc) return d[k]
  }
  return undefined
}

function toNumberOrNull (value: any): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function loadEsriModule<T = any> (path: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = (window as any).require
    if (!req) { reject(new Error('AMD require non disponibile')); return }
    try { req([path], (mod: T) => resolve(mod), (err: any) => reject(err)) } catch (e) { reject(e) }
  })
}

const WORKFLOW_ROLE_CODES = new Set(['TR', 'IT', 'CS', 'RIT', 'DT', 'DA', 'ADMIN', 'RIA', 'IA'])

function normalizeRoleCode (ruolo: any): string {
  const raw = String(ruolo ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_')
  if (!raw) return ''
  return WORKFLOW_ROLE_CODES.has(raw) ? raw : ''
}

function normalizeAreaCode (area: any): 'AMM' | 'AGR' | 'TEC' | '' {
  const raw = String(area ?? '').trim().toUpperCase()
  if (!raw) return ''
  if (raw === '1') return 'AMM'
  if (raw === '2') return 'AGR'
  if (raw === '3') return 'TEC'
  if (raw === 'AMM' || raw === 'AGR' || raw === 'TEC') return raw
  return ''
}

function normalizeSettoreCode (settore: any): string {
  const raw = String(settore ?? '').trim().toUpperCase()
  if (!raw) return ''
  const n = Number(raw)
  if (Number.isFinite(n) && SETTORE_FROM_CODE[n]) return SETTORE_FROM_CODE[n]
  return raw
}

function getEffectiveRole (ruoloLabel: string, area: any, areaCod?: any): string {
  const r = normalizeRoleCode(ruoloLabel)
  const a = normalizeAreaCode(areaCod || area)
  return r
}

function pickRuntimeViewForUser (user: GiiUserInfo | null): RuntimeDsView | null {
  if (!user) return null
  const role = normalizeRoleCode(user.ruoloCod)
  const areaCode = normalizeAreaCode(user.areaCod || user.area)
  const settoreCode = normalizeSettoreCode(user.settoreCod || user.settore)
  return pickGiiRuntimeView({
    roleCode: role,
    areaCode,
    settoreCode,
    isAdmin: user.isAdmin,
    isWorkflowAdmin: user.isWorkflowAdmin
  })
}

function readGiiUser (): GiiUserInfo | null {
  const cached: any = (window as any).__giiUserRole
  if (!cached?.username) return null
  const ruoloCod = normalizeRoleCode(cached.ruoloCod ?? cached.ruolo_cod)
  const areaCod = normalizeAreaCode(cached.areaCod ?? cached.area_cod ?? cached.area)
  const settoreCod = normalizeSettoreCode(cached.settoreCod ?? cached.settore_cod ?? cached.settore)
  const isAdmin = !!cached.isAdmin || !!cached.isWorkflowAdmin || ruoloCod === 'ADMIN'
  const ruoloLabel = ruoloCod || (isAdmin ? 'ADMIN' : '')
  return {
    username: String(cached.username || '').trim(),
    fullName: String(cached.fullName || cached.full_name || cached.nome || cached.displayName || cached.username || '').trim(),
    full_name: String(cached.full_name || cached.fullName || '').trim(),
    nome: String(cached.nome || '').trim(),
    displayName: String(cached.displayName || '').trim(),
    ruoloCod: ruoloLabel,
    ruoloLabel,
    area: toNumberOrNull(cached.area),
    areaCod,
    settore: toNumberOrNull(cached.settore),
    settoreCod,
    gruppo: String(cached.gruppo || ''),
    isAdmin,
    isWorkflowAdmin: !!cached.isWorkflowAdmin
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
  const s = pickField(d, `stato_${role}`)
  if (isStateOnlyWorkflowRole(role)) return meaningful(s)
  const e = pickField(d, `esito_${role}`)
  return meaningful(s) || meaningful(e)
}

function isInFaseSanzionatoria (d: any): boolean {
  return meaningful(pickField(d, 'stato_RIA')) || meaningful(pickField(d, 'esito_RIA')) ||
    meaningful(pickField(d, 'stato_IA')) || meaningful(pickField(d, 'esito_IA')) ||
    meaningful(pickField(d, 'determinazione_stato')) || meaningful(pickField(d, 'determinazione_numero'))
}

function parseToMs (v: any): number | null {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'number' && Number.isFinite(v)) return v > 100000000000 ? v : v * 1000
  const t = Date.parse(String(v))
  return Number.isFinite(t) ? t : null
}

function getRoleLastTouchMs (d: any, role: string): number | null {
  const vals = [
    parseToMs(pickField(d, `dt_presa_in_carico_${role}`)),
    parseToMs(pickField(d, `dt_stato_${role}`)),
    ...(['IT', 'CS', 'RIT'].includes(String(role || '').toUpperCase()) ? [] : [parseToMs(pickField(d, `dt_esito_${role}`))])
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

function getCreatedMs (d: any): number | null {
  return parseToMs(d['CreationDate_1']) || parseToMs(d['CreationDate']) || parseToMs(d['created_date']) || parseToMs(d['data_rilevazione'])
}

function getTiIstruttoriaInfo (d: any) {
  const tiUser = String(pickField(d, 'it_assegnato_username') ?? '').trim()
  const higherTouched = hasRuoloData(d, 'RIT') || hasRuoloData(d, 'DT') || hasRuoloData(d, 'DA')
  const statoTiRaw = pickField(d, 'stato_IT')
  const statoTiNum = statoTiRaw !== null && statoTiRaw !== undefined && statoTiRaw !== '' ? Number(statoTiRaw) : null
  const tiReturned = statoTiNum === 4 || statoTiNum === 5
  const tiLastTouchMs = getRoleLastTouchMs(d, 'IT')
  const csLastTouchMs = getRoleLastTouchMs(d, 'CS')
  const awaitingRetakeByCs = !!tiUser && tiReturned && !higherTouched && tiLastTouchMs !== null && (csLastTouchMs === null || csLastTouchMs <= tiLastTouchMs)
  return { hasAssignedTi: !!tiUser, tiUser, higherTouched, statoTiNum, tiReturned, tiLastTouchMs, csLastTouchMs, awaitingRetakeByCs, isInTiIstruttoria: !!tiUser && !higherTouched && !tiReturned }
}

function isRecordVisibleForCurrentUser (d: any, user: GiiUserInfo | null): boolean {
  if (!user) return false
  if (user.isAdmin || user.isWorkflowAdmin) return true

  const role = getEffectiveRole(user.ruoloCod || '', user.area, user.areaCod)
  if (!role) return true

  const archVal = d['GII_arch'] ?? d['gii_arch'] ?? d['GII_ARCH']
  if (archVal !== null && archVal !== undefined && archVal !== '' && Number(archVal) === 1) return false

  const areaCode = normalizeAreaCode(user.areaCod || user.area)
  const isAmmArea = areaCode === 'AMM'
  if (role === 'DA' || role === 'RIA' || role === 'IA') {
    if (!isInFaseSanzionatoria(d)) return false
    if (role === 'IA') {
      return isPracticeAssignedToCurrentIa(d, user)
    }
    return true
  }

  if (role === 'IT') {
    const meUser = String(user.username || '').trim()
    const meName = String(user.fullName ?? user.nome ?? user.displayName ?? '').trim()
    const opRaw = d['origine_pratica']
    const opNum = opRaw !== null && opRaw !== undefined && opRaw !== '' ? Number(opRaw) : null
    const tiUser = String(pickField(d, 'it_assegnato_username') ?? '').trim()
    const tiName = String(d['it_assegnato_nome'] ?? '').trim()
    const assignedToMe = equalsUser(tiUser, meUser) || equalsUser(tiName, meUser) || (meName ? equalsUser(tiName, meName) : false)
    const creatorVals = [d['created_user'], d['Creator'], d['creator'], d['username'], d['user_name'], d['utente'], d['utente_ins'], d['created_by'], d['submitter'], d['owner']]
    const createdByMe = creatorVals.some(v => equalsUser(v, meUser) || (meName ? equalsUser(v, meName) : false))
    const hasTiWorkflow = hasRuoloData(d, 'IT')

    if (opNum === 1) {
      if (!tiUser && !tiName && !hasTiWorkflow) return false
      if (tiUser || tiName) return assignedToMe
      return false
    }
    if (opNum === 2) {
      if (tiUser || tiName) return assignedToMe
      if (createdByMe) return true
      return hasTiWorkflow
    }
  }

  return true
}

function isWaitingForIaAfterRia (d: any): boolean {
  const riaLast = getRoleLastTouchMs(d, 'RIA')
  const iaLast = getRoleLastTouchMs(d, 'IA')
  return hasRuoloData(d, 'IA') && (
    iaLast === null || riaLast === null || iaLast > riaLast
  )
}

function isAttesaMia (d: any, user: GiiUserInfo | null): boolean {
  if (!user || user.isAdmin || user.isWorkflowAdmin) return false
  const role = getEffectiveRole(user.ruoloCod || '', user.area, user.areaCod)
  if (role === 'DA') return false
  const statoField = getStatoFieldForRuolo(role)
  const val = d[statoField]
  const n = val != null && val !== '' ? Number(val) : null

  // DT: dopo la presa in carico (n===2) la pratica è ancora da gestire dal ruolo corrente.
  if (role === 'DT' && n === 2) return true

  if ((role === 'IT' || role === 'IA') && n === 2) {
    if (role === 'IA') return isPracticeAssignedToCurrentIa(d, user)
    const meUser = String(user.username || '').trim()
    const meName = String(user.fullName ?? user.nome ?? user.displayName ?? '').trim()
    const tiUser = String(pickField(d, 'it_assegnato_username') ?? '').trim()
    const tiName = String(d['it_assegnato_nome'] ?? '').trim()
    return equalsUser(tiUser, meUser) || equalsUser(tiName, meUser) || (meName ? equalsUser(tiName, meName) : false)
  }

  if (role === 'RIA' && n === 2) return !isWaitingForIaAfterRia(d)
  if (role === 'CS' && getTiIstruttoriaInfo(d).isInTiIstruttoria) return false
  return n === 0 || n === 1 || n === 3
}

function isAttesaAltri (d: any, user: GiiUserInfo | null): boolean {
  if (!user || user.isAdmin || user.isWorkflowAdmin) return false
  const role = getEffectiveRole(user.ruoloCod || '', user.area, user.areaCod)
  if (role === 'DA') return false
  const statoField = getStatoFieldForRuolo(role)
  const val = d[statoField]
  const n = val != null && val !== '' ? Number(val) : null
  if (role === 'CS' && getTiIstruttoriaInfo(d).isInTiIstruttoria) return true
  if (role === 'DT' && n === 2) return false
  if ((role === 'IT' || role === 'IA') && n === 2) return !isAttesaMia(d, user)
  if (role === 'RIA' && n === 2) return isWaitingForIaAfterRia(d)
  return n === 2 || n === 4
}

function labelEsito (v: any): string {
  const n = v !== null && v !== undefined && v !== '' ? Number(v) : null
  if (n === 1) return 'Integrazione richiesta'
  if (n === 2) return 'Approvata'
  if (n === 3) return 'Respinta'
  return n !== null && Number.isFinite(n) ? String(n) : String(v ?? '')
}

function statoNumFromEsito (esito: number): number {
  if (esito === 1) return 3
  if (esito === 2) return 4
  if (esito === 3) return 5
  return 4
}

function isBozzaDeterminazioneTrasmessaRiaReport (d: any): boolean {
  const stato = String(pickField(d, 'determinazione_stato') || '').trim().toUpperCase()
  if (stato === 'TRASMESSA_RIA' || stato === 'BOZZA_TRASMESSA_RIA') return true
  const statoRia = roleNumValue(d, 'RIA', 'stato')
  const statoIa = roleNumValue(d, 'IA', 'stato')
  const esitoIa = roleNumValue(d, 'IA', 'esito')
  const riaOpen = statoRia === 1 || statoRia === 2
  return riaOpen && esitoIa === 2 && statoIa === 4
}

function getFwdDest (role: string, d: any): string {
  switch (role) {
    case 'IT': return 'CS'
    case 'CS': return 'RIT'
    case 'RIT': return 'DT'
    case 'DT': return 'RIA'
    case 'RIA': return isBozzaDeterminazioneTrasmessaRiaReport(d) ? 'IA' : ''
    case 'IA': return isBozzaDeterminazioneTrasmessaRiaReport(d) ? 'RIA' : ''
    default: return ''
  }
}

function getIntegDest (role: string): string {
  switch (role) {
    case 'CS': return 'IT'
    case 'RIT': return 'IT'
    case 'DT': return 'RIT'
    case 'RIA': return 'RIT'
    case 'IA': return 'RIA'
    default: return ''
  }
}

function computeSintetico (d: any): { ruolo: string; label: string; statoForChip: number | null } {
  const scanOrder = ['IA', 'RIA', 'DT', 'RIT', 'CS', 'IT', 'TR']
  const statoDaPrendere = 1
  const statoPresa = 2
  const statoIntegrazione = 3
  const statoApprovata = 4
  const statoRespinta = 5
  const esitoIntegrazione = 1
  const esitoApprovata = 2
  const esitoRespinta = 3

  const tiInfo = getTiIstruttoriaInfo(d)
  if ((tiInfo as any).awaitingRetakeByCs) return { ruolo: 'CS', label: 'Trasmesso', statoForChip: statoDaPrendere }
  if ((tiInfo as any).hasAssignedTi && tiInfo.isInTiIstruttoria) {
    const opRaw = pickField(d, 'origine_pratica')
    const isOrigineTi = (opRaw === 2 || opRaw === '2')
    const csNeverTouched = !hasRuoloData(d, 'CS')
    if (isOrigineTi && csNeverTouched) return { ruolo: 'IT', label: 'In carico', statoForChip: statoPresa }
    const statoTiNum = (tiInfo as any).statoTiNum
    if (statoTiNum !== null && Number.isFinite(statoTiNum)) {
      if (statoTiNum === statoDaPrendere) return { ruolo: 'IT', label: 'Da prendere in carico', statoForChip: statoDaPrendere }
      if (statoTiNum === statoPresa) return { ruolo: 'IT', label: 'In carico', statoForChip: statoPresa }
      return { ruolo: 'IT', label: 'In carico', statoForChip: null }
    }
    return { ruolo: 'IT', label: 'Trasmesso', statoForChip: statoDaPrendere }
  }

  for (const role of scanOrder) {
    if (!hasRuoloData(d, role)) continue
    const stateOnly = isStateOnlyWorkflowRole(role)
    const statoRaw = pickField(d, `stato_${role}`)
    const esitoRaw = stateOnly ? null : pickField(d, `esito_${role}`)
    const statoNum = statoRaw !== null && statoRaw !== undefined && statoRaw !== '' ? Number(statoRaw) : null
    const esitoNum = esitoRaw !== null && esitoRaw !== undefined && esitoRaw !== '' ? Number(esitoRaw) : null

    if (esitoNum !== null && Number.isFinite(esitoNum)) {
      if (esitoNum === esitoApprovata) {
        if (role === 'DT') return { ruolo: 'DT', label: 'Approvato', statoForChip: statoApprovata }
        const dest = getFwdDest(role, d)
        if (dest) {
          if (hasRuoloData(d, dest)) {
            if (statoNum === statoDaPrendere) return { ruolo: role, label: 'Trasmesso', statoForChip: statoDaPrendere }
            if (statoNum === statoPresa) return { ruolo: role, label: 'In carico', statoForChip: statoPresa }
            continue
          }
          return { ruolo: dest, label: 'Trasmesso', statoForChip: statoDaPrendere }
        }
      }
      if (esitoNum === esitoIntegrazione) {
        const dest = getIntegDest(role)
        if (dest) {
          const destEsitoRaw = isStateOnlyWorkflowRole(dest) ? null : pickField(d, `esito_${dest}`)
          const destEsitoNum = destEsitoRaw !== null && destEsitoRaw !== undefined && destEsitoRaw !== '' ? Number(destEsitoRaw) : null
          if (destEsitoNum == null) {
            if (hasRuoloData(d, dest)) {
              const destStatoRaw = pickField(d, `stato_${dest}`)
              const destStatoNum = destStatoRaw !== null && destStatoRaw !== undefined && destStatoRaw !== '' ? Number(destStatoRaw) : null
              if (destStatoNum === statoDaPrendere) return { ruolo: dest, label: 'Trasmesso', statoForChip: statoDaPrendere }
              if (destStatoNum === statoPresa) return { ruolo: dest, label: 'In carico', statoForChip: statoPresa }
            }
            return { ruolo: dest, label: 'Trasmesso', statoForChip: statoDaPrendere }
          }
          if (statoNum === statoDaPrendere) return { ruolo: role, label: 'Trasmesso', statoForChip: statoDaPrendere }
          if (statoNum === statoPresa) return { ruolo: role, label: 'In carico', statoForChip: statoPresa }
          continue
        }
      }
      if (esitoNum === esitoRespinta) return { ruolo: role, label: 'Respinto', statoForChip: statoRespinta }
      return { ruolo: role, label: labelEsito(esitoNum), statoForChip: statoNumFromEsito(esitoNum) }
    }

    if (statoNum !== null && Number.isFinite(statoNum)) {
      if (statoNum === statoDaPrendere) return { ruolo: role, label: 'Trasmesso', statoForChip: statoDaPrendere }
      if (statoNum === statoPresa) return { ruolo: role, label: 'In carico', statoForChip: statoPresa }
      if (statoNum === statoApprovata) {
        const dest = getFwdDest(role, d)
        if (dest) {
          if (hasRuoloData(d, dest)) continue
          return { ruolo: dest, label: 'Trasmesso', statoForChip: statoDaPrendere }
        }
      }
      if (statoNum === statoIntegrazione) return { ruolo: role, label: 'In attesa di integrazioni', statoForChip: statoIntegrazione }
      if (statoNum === statoRespinta) return { ruolo: role, label: 'Respinto', statoForChip: statoRespinta }
      return { ruolo: role, label: statoLabel(statoNum), statoForChip: statoNum }
    }

    return { ruolo: role, label: 'In carico', statoForChip: null }
  }

  const op = pickField(d, 'origine_pratica')
  const opNum = op !== null && op !== undefined && op !== '' ? Number(op) : null
  if (opNum === 2) return { ruolo: 'IT', label: 'In carico', statoForChip: statoPresa }
  return { ruolo: 'CS', label: 'Da prendere in carico', statoForChip: statoDaPrendere }
}

function getActiveRole (d: any): string {
  return computeSintetico(d).ruolo
}

function roleNumValue (d: any, role: string, field: 'stato' | 'esito'): number | null {
  const v = pickField(d, `${field}_${role}`)
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function isRoleApproved (d: any, role: string): boolean {
  return roleNumValue(d, role, 'esito') === 2 || roleNumValue(d, role, 'stato') === 4
}

function isNotificaPerfezionataReport (d: any): boolean {
  const esito = String(pickField(d, 'notifica_esito') || '').trim().toUpperCase()
  return (esito === 'NOTIFICATA' || esito === 'COMPIUTA_GIACENZA') && meaningful(pickField(d, 'notifica_data'))
}

function isAttoAccertamentoDefinitivoReport (d: any): boolean {
  return meaningful(pickField(d, 'accertamento_numero')) && meaningful(pickField(d, 'accertamento_data'))
}

function isDeterminazioneAdottataReport (d: any): boolean {
  const stato = String(pickField(d, 'determinazione_stato') || '').trim().toUpperCase()
  return stato === 'ADOTTATA' || (meaningful(pickField(d, 'determinazione_numero')) && meaningful(pickField(d, 'determinazione_data')))
}

function getRuoloPressoCuiSiTrova (d: any): string {
  return getActiveRole(d)
}

function faseProcedimentaleLabel (d: any): string {
  if (isNotificaPerfezionataReport(d)) return 'Sanzione notificata'
  if (isAttoAccertamentoDefinitivoReport(d) || isDeterminazioneAdottataReport(d)) return 'Fase sanzionatoria'
  if (isInFaseSanzionatoria(d) || isRoleApproved(d, 'DT')) return 'Istruttoria amministrativa'
  const ruolo = getRuoloPressoCuiSiTrova(d)
  if (ruolo === 'DT' || hasRuoloData(d, 'DT')) return 'Approvazione tecnica'
  return 'Istruttoria tecnica'
}

function ruoloPressoLabel (d: any): string {
  const r = String(getRuoloPressoCuiSiTrova(d) || '').toUpperCase()
  if (r === 'TR') return 'Tecnico rilevatore'
  if (r === 'IT') return 'Istruttore tecnico'
  if (r === 'CS') return 'Capo Settore'
  if (r === 'RIT') return 'Responsabile istruttoria tecnica'
  if (r === 'DT') return 'Direttore tecnico'
  if (r === 'RIA') return 'Responsabile istruttoria amministrativa'
  if (r === 'IA') return 'Istruttore amministrativo'
  if (r === 'DA') return 'Direttore amministrativo'
  return 'Non determinato'
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

function cleanNumeroPraticaText (v: any): string {
  return String(v ?? '')
    .trim()
    .replace(/^rapporto\s+tecnico\s+n\.?\s*/i, '')
    .replace(/^rapporto\s+n\.?\s*/i, '')
    .replace(/^rilevazione\s+n\.?\s*/i, '')
    .replace(/^rilevazione\s*/i, '')
    .trim()
}

function buildNumeroRilevazioneReport (d: any): string {
  const stored = cleanNumeroPraticaText(getFirst(d, ['numero_rilevazione', 'Numero_rilevazione', 'NUMERO_RILEVAZIONE', 'cod_pratica', 'Cod_pratica', 'COD_PRATICA'], ''))
  const raw = stored.toUpperCase().replace(/_/g, '-').replace(/\s+/g, '-')
  const oid = getObjectId(d)
  const op = pickField(d, 'origine_pratica')
  let prefix = (op === 2 || op === '2' || String(op).toUpperCase() === 'IT') ? 'IT' : 'TR'
  let oidPart = oid && oid !== '—' ? oid : ''
  let settore = getSettoreCodeFromRecord(d)

  let m = raw.match(/^(TR|IT)-?(\d+)(?:-([A-Z0-9]+))?$/i)
  if (m) {
    prefix = m[1].toUpperCase()
    oidPart = m[2]
    if (!settore && m[3]) settore = normalizeSettoreCode(m[3])
  } else {
    m = raw.match(/^(\d+)-?(TR|IT)(?:-([A-Z0-9]+))?$/i)
    if (m) {
      oidPart = m[1]
      prefix = m[2].toUpperCase()
      if (!settore && m[3]) settore = normalizeSettoreCode(m[3])
    } else if (!oidPart && /^\d+$/.test(raw)) {
      oidPart = raw
    }
  }

  const base = oidPart || stored || '—'
  if (base === '—') return base
  return settore ? `${base}-${prefix}-${settore}` : `${base}-${prefix}`
}

function getNumeroRilevazione (d: any): string {
  return buildNumeroRilevazioneReport(d)
}

function getNumeroRapporto (d: any): string {
  return cleanNumeroPraticaText(getFirst(d, ['numero_rapporto', 'Numero_rapporto', 'NUMERO_RAPPORTO', 'numero_rapporto_tecnico', 'Numero_rapporto_tecnico', 'NUMERO_RAPPORTO_TECNICO', 'num_rapporto', 'codice_rapporto', 'n_rapporto'], '')) || '—'
}

function getNumeroVerbale (d: any): string {
  return cleanNumeroPraticaText(getFirst(d, ['accertamento_numero'], '')) || '—'
}

function isCheckedValue (v: any): boolean {
  if (v === true || v === 1 || v === '1') return true
  const s = String(v ?? '').trim().toLowerCase()
  return s === 'true' || s === 'si' || s === 'sì' || s === 'yes' || s === 'x'
}

function splitMultiValue (v: any): string[] {
  if (v === null || v === undefined || v === '') return []
  if (Array.isArray(v)) return v.map(x => String(x).trim()).filter(Boolean)
  return String(v)
    .split(/[;,|\s]+/)
    .map(x => x.trim())
    .filter(Boolean)
}

const VIOLATION_LABEL_BY_ARTICLE: Record<string, string> = {
  '8': 'Art. 8 - Violazione servizio di reperibilità',
  '12': 'Art. 12 - Negato accesso ai fondi (al personale consortile)',
  '15': 'Art. 15 - Prelievo abusivo d’acqua',
  '16': 'Art. 16 - Presentazione tardiva comunicazione di irrigazione',
  '17': 'Art. 17 - Presentazione tardiva comunicazione di variazione o di rinuncia',
  '27': 'Art. 27 - Spreco d’acqua/uso negligente della risorsa idrica',
  '28': 'Art. 28 - Violazione prescrizioni del consorzio',
  '29': 'Art. 29 - Violazione termini restituzione attrezzature',
  '30': 'Art. 30 - Danneggiamento e/o perdita attrezzature',
  '31': 'Art. 31 - Mancata segnalazione guasti',
  '32': 'Art. 32 - Negato accesso ai fondi (al consorziato)',
  '33': 'Art. 33 - Inosservanza limiti temporali di prelievo',
  '34': 'Art. 34 - Interferenze',
  '35': 'Art. 35 - Manomissione reti di dispensa e allaccio di apparecchi di aspirazione all’idrante',
  '36': 'Art. 36 - Uso attrezzature non autorizzate',
  '37': 'Art. 37 - Uso sistemi di irrigazione incompatibili',
  '39': 'Art. 39 - Danni alle strutture irrigue'
}

function violationLabelByArticle (article: any): string {
  const n = String(Number(article))
  return VIOLATION_LABEL_BY_ARTICLE[n] || (Number.isFinite(Number(article)) ? `Art. ${n}` : '')
}

function formatNormaToken (v: string): string {
  const raw = String(v || '').trim()
  if (!raw) return ''
  const compact = raw.replace(/_/g, '.').replace(/Art/i, 'Art.')
  const m = compact.match(/art\.?\s*(\d+)(?:[\.\-]?(\d+))?/i)
  if (m) return violationLabelByArticle(m[1]) || (m[2] ? `Art. ${m[1]}.${m[2]}` : `Art. ${m[1]}`)
  return raw
}

function uniqueList (items: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  items.forEach(item => {
    const label = String(item || '').trim()
    if (!label) return
    const key = label.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    out.push(label)
  })
  return out
}

function getComune (d: any): string {
  return getFirst(d, ['comune', 'Comune', 'COMUNE', 'comune_infrazione', 'Comune_infrazione'])
}


function getTecnicoRilevatore (d: any): string {
  return getFirst(d, [
    'tecnico_rilevatore', 'Tecnico_rilevatore', 'TECNICO_RILEVATORE',
    'tr_nome', 'TR_nome', 'tecnico_rilevatore_nome', 'nome_tecnico_rilevatore',
    'utente_loggato', 'created_user', 'Creator', 'creator'
  ])
}

function getDataRapportoMs (d: any): number | null {
  return parseToMs(pickField(d, 'data_rilevazione')) ||
    parseToMs(pickField(d, 'dt_rilevazione')) ||
    parseToMs(pickField(d, 'data_rapporto')) ||
    parseToMs(pickField(d, 'dt_rapporto')) ||
    getCreatedMs(d)
}

function getAreaCodeFromRecord (d: any, fallbackArea?: any): 'AMM' | 'AGR' | 'TEC' | '' {
  const raw = getFirst(d, ['area_cod', 'Area_cod', 'AREA_COD', 'area', 'Area'], '')
  return normalizeAreaCode(raw || fallbackArea)
}

function getAreaDisplay (d: any, fallbackArea?: any, domainLabels?: DomainLabelMaps | null): string {
  const code = getAreaCodeFromRecord(d, fallbackArea)
  return getAreaLabelFromCode(code, domainLabels)
}

function getSettoreCodeFromRecord (d: any, fallbackSettore?: any): string {
  const raw = getFirst(d, ['settore_cod', 'Settore_cod', 'SETTORE_COD', 'settore', 'Settore', 'id_settore'], '')
  return normalizeSettoreCode(raw || fallbackSettore)
}

function getSettoreDisplay (d: any, user?: GiiUserInfo | null, domainLabels?: DomainLabelMaps | null): string {
  const code = getSettoreCodeFromRecord(d, user?.settoreCod || user?.settore)
  return getSettoreLabelFromCode(code, domainLabels)
}

function getGiorniFermo (d: any, now: number): string {
  const last = getLastTouchMs(d)
  if (last === null) return '—'
  const days = Math.max(0, Math.floor((now - last) / (24 * 60 * 60 * 1000)))
  return String(days)
}

function getRecordSearchText (d: any, user: GiiUserInfo | null, domainLabels?: DomainLabelMaps | null): string {
  const parts: any[] = []
  Object.keys(d || {}).forEach(k => {
    const v = d[k]
    if (v === null || v === undefined || v === '') return
    parts.push(v)
    const ms = parseToMs(v)
    if (ms !== null) {
      parts.push(formatDate(ms), formatDateTime(ms))
    }
  })
  parts.push(
    getNumeroRilevazione(d),
    getNumeroRapporto(d),
    getNumeroVerbale(d),
    getObjectId(d),
    getTecnicoRilevatore(d),
    getIstruttore(d),
    formatDate(getDataRapportoMs(d)),
    getAreaDisplay(d, user?.areaCod, domainLabels),
    getSettoreDisplay(d, user, domainLabels),
    faseProcedimentaleLabel(d),
    ruoloPressoLabel(d)
  )
  return normalizeText(parts.join(' '))
}

function getIstruttore (d: any): string {
  return getFirst(d, [
    'it_assegnato_nome', 'it_assegnato_username',
    'ia_assegnato_nome', 'ia_assegnato_username'
  ])
}

function formatDate (ms: number | null): string {
  if (!ms) return '—'
  try { return new Date(ms).toLocaleDateString('it-IT') } catch { return '—' }
}

function formatDateTime (ms: number | null): string {
  if (!ms) return '—'
  try { return new Date(ms).toLocaleString('it-IT') } catch { return '—' }
}

function normalizeText (v: any): string {
  return String(v ?? '').trim().toLowerCase()
}

function csvEscape (v: any): string {
  const s = String(v ?? '')
  if (/[;"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

async function queryLayer (view: RuntimeDsView, where: string, pageSize: number): Promise<ReportRecord[]> {
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

function Input (props: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string; cfg: any }) {
  return <input type={props.type || 'text'} value={props.value} onChange={e => props.onChange(e.target.value)} placeholder={props.placeholder} style={{ width: '100%', height: 36, boxSizing: 'border-box', borderRadius: 10, border: `1px solid ${props.cfg.cardBorder}`, background: 'rgba(255,255,255,0.08)', color: props.cfg.textColor, padding: '0 10px', outline: 'none' }} />
}

function Select (props: { value: string; onChange: (v: string) => void; children: any; cfg: any }) {
  const optionStyle = { backgroundColor: '#ffffff', color: '#111827' }
  const children = React.Children.map(props.children, child => {
    if (React.isValidElement(child) && String((child as any).type).toLowerCase() === 'option') {
      const childProps: any = (child as any).props || {}
      return React.cloneElement(child as any, {
        style: { ...(childProps.style || {}), ...optionStyle }
      })
    }
    return child
  })

  return (
    <select
      value={props.value}
      onChange={e => props.onChange(e.target.value)}
      style={{
        width: '100%',
        height: 36,
        boxSizing: 'border-box',
        borderRadius: 10,
        border: `1px solid ${props.cfg.cardBorder}`,
        background: 'rgba(255,255,255,0.08)',
        color: props.cfg.textColor,
        padding: '0 10px',
        outline: 'none'
      }}
    >
      {children}
    </select>
  )
}

function FieldLabel (props: { children: any; cfg: any }) {
  return <label style={{ display: 'block', color: props.cfg.mutedColor, fontSize: 11, fontWeight: 800, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.8 }}>{props.children}</label>
}

export default function Widget (props: AllWidgetProps<IMConfig>) {
  const cfgSrc: any = props.config as any
  const cfg: any = {
    ...defaultConfig,
    ...(cfgSrc?.asMutable ? cfgSrc.asMutable({ deep: true }) : cfgSrc?.toJS ? cfgSrc.toJS() : (cfgSrc || {}))
  }

  const [user, setUser] = React.useState<GiiUserInfo | null>(() => readGiiUser())
  const [records, setRecords] = React.useState<ReportRecord[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string>('')
  const [lastLoad, setLastLoad] = React.useState<number | null>(null)
  const [nonce, setNonce] = React.useState(0)
  const [search, setSearch] = React.useState('')
  const [areaFilter, setAreaFilter] = React.useState('tutte')
  const [settoreFilter, setSettoreFilter] = React.useState('tutte')
  const [fromDate, setFromDate] = React.useState('')
  const [toDate, setToDate] = React.useState('')
  const [situationFilter, setSituationFilter] = React.useState<SituationFilter>('tutte')
  const [faseFilter, setFaseFilter] = React.useState('tutte')
  const [ruoloFilter, setRuoloFilter] = React.useState('tutte')
  const [sortRules, setSortRules] = React.useState<SortRule[]>(DEFAULT_SORT_RULES)
  const [selectedRowId, setSelectedRowId] = React.useState('')
  const [hoveredRowId, setHoveredRowId] = React.useState('')
  const [page, setPage] = React.useState(1)
  const [domainLabels, setDomainLabels] = React.useState<DomainLabelMaps>(EMPTY_DOMAIN_LABELS)

  React.useEffect(() => {
    const hUser = () => setUser(readGiiUser())
    const hRefresh = () => setNonce(n => n + 1)
    window.addEventListener('gii:userLoaded', hUser as any)
    window.addEventListener('gii-force-refresh-selection', hRefresh as any)
    window.addEventListener('gii-report-refresh', hRefresh as any)
    return () => {
      window.removeEventListener('gii:userLoaded', hUser as any)
      window.removeEventListener('gii-force-refresh-selection', hRefresh as any)
      window.removeEventListener('gii-report-refresh', hRefresh as any)
    }
  }, [])

  const view = React.useMemo(() => pickRuntimeViewForUser(user), [user?.username, user?.ruoloLabel, user?.areaCod, user?.settoreCod, user?.isAdmin, user?.isWorkflowAdmin])
  const effectiveRole = getEffectiveRole(user?.ruoloCod || '', user?.area, user?.areaCod)

  // Domini ufficiali AGOL del layer/vista runtime: fonte primaria per label Area/Settore.
  // I record continuano a determinare quali opzioni mostrare; i domini determinano come chiamarle.
  React.useEffect(() => {
    let cancelled = false
    const layerUrl = String(view?.layerUrl || '').trim()
    if (!layerUrl) {
      setDomainLabels(EMPTY_DOMAIN_LABELS)
      return () => { cancelled = true }
    }
    ;(async () => {
      try {
        const labels = await loadDomainLabelMaps(layerUrl)
        if (!cancelled) setDomainLabels(labels)
      } catch (ex) {
        console.warn('[GII-Report] Domini AGOL non disponibili, uso fallback locale:', ex)
        if (!cancelled) setDomainLabels(EMPTY_DOMAIN_LABELS)
      }
    })()
    return () => { cancelled = true }
  }, [view?.layerUrl])

  React.useEffect(() => {
    let cancelled = false
    const run = async () => {
      setError('')
      if (!user?.username) {
        setRecords([])
        return
      }
      if (!view) {
        setRecords([])
        setError('Non è stato possibile individuare le pratiche di competenza.')
        return
      }
      setLoading(true)
      try {
        const raw = await queryLayer(view, cfg.whereClause || '1=1', Number(cfg.pageSize || 2000))
        if (cancelled) return
        setRecords(raw.filter(r => isRecordVisibleForCurrentUser(r, user)))
        setLastLoad(Date.now())
        setPage(1)
      } catch (ex: any) {
        if (cancelled) return
        setRecords([])
        setError(String(ex?.message || ex || 'Errore caricamento report'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [view?.layerUrl, user?.username, user?.ruoloLabel, user?.areaCod, user?.settoreCod, user?.isAdmin, cfg.whereClause, cfg.pageSize, nonce])

  const staleMs = Math.max(1, Number(cfg.staleDays || 15)) * 24 * 60 * 60 * 1000
  const now = Date.now()

  const filtered = React.useMemo(() => {
    const q = normalizeText(search)
    const fromMs = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null
    const toMs = toDate ? new Date(`${toDate}T23:59:59`).getTime() : null

    const out = records.filter(r => {
      const last = getLastTouchMs(r)
      const phase = faseProcedimentaleLabel(r)
      const ruoloCorrente = getRuoloPressoCuiSiTrova(r)
      const isStale = last !== null && (now - last) > staleMs

      if (q && !getRecordSearchText(r, user, domainLabels).includes(q)) return false
      if (areaFilter !== 'tutte' && getAreaCodeFromRecord(r, user?.areaCod) !== areaFilter) return false
      if (settoreFilter !== 'tutte' && getSettoreCodeFromRecord(r, user?.settoreCod) !== settoreFilter) return false
      if (fromMs !== null && (last === null || last < fromMs)) return false
      if (toMs !== null && (last === null || last > toMs)) return false
      if (faseFilter !== 'tutte' && phase !== faseFilter) return false
      if (ruoloFilter !== 'tutte' && ruoloCorrente !== ruoloFilter) return false
      if (situationFilter === 'da_gestire' && !isAttesaMia(r, user)) return false
      if (situationFilter === 'attesa_altri' && !isAttesaAltri(r, user)) return false
      if (situationFilter === 'ferme' && !isStale) return false
      if (situationFilter === 'sanzionatoria' && phase !== 'Fase sanzionatoria' && phase !== 'Sanzione notificata') return false
      return true
    })

    const getSortValue = (row: ReportRecord, key: SortKey): any => {
      if (key === 'lastUpdate') return getLastTouchMs(row) || 0
      if (key === 'rilevazioneNumber') return getNumeroRilevazione(row)
      if (key === 'reportNumber') return getNumeroRapporto(row)
      if (key === 'verbaleNumber') return getNumeroVerbale(row)
      if (key === 'reportDate') return getDataRapportoMs(row) || 0
      if (key === 'rilevatore') return getTecnicoRilevatore(row)
      if (key === 'istruttore') return getIstruttore(row)
      if (key === 'area') return getAreaDisplay(row, user?.areaCod, domainLabels)
      if (key === 'settore') return getSettoreDisplay(row, user, domainLabels)
      if (key === 'faseProcedimentale') return faseProcedimentaleLabel(row)
      if (key === 'ruoloCorrente') return ruoloPressoLabel(row)
      if (key === 'giorniFermo') return Number(getGiorniFermo(row, now)) || 0
      return ''
    }

    const rules = sortRules.length ? sortRules : DEFAULT_SORT_RULES
    out.sort((a, b) => {
      for (const rule of rules) {
        const dir = rule.dir === 'asc' ? 1 : -1
        const av = getSortValue(a, rule.key)
        const bv = getSortValue(b, rule.key)
        const cmp = (typeof av === 'string' || typeof bv === 'string')
          ? String(av || '').localeCompare(String(bv || ''), 'it', { numeric: true, sensitivity: 'base' })
          : ((av || 0) - (bv || 0))
        if (cmp !== 0) return cmp * dir
      }
      return getNumeroRilevazione(a).localeCompare(getNumeroRilevazione(b), 'it', { numeric: true, sensitivity: 'base' })
    })

    return out
  }, [records, search, areaFilter, settoreFilter, fromDate, toDate, situationFilter, faseFilter, ruoloFilter, sortRules, user?.username, user?.ruoloLabel, user?.areaCod, user?.settoreCod, cfg.staleDays, domainLabels])

  const tableRows = Math.max(5, Number(cfg.tableRows || 25))
  const pageCount = Math.max(1, Math.ceil(filtered.length / tableRows))
  const safePage = Math.min(page, pageCount)
  const pageRows = filtered.slice((safePage - 1) * tableRows, safePage * tableRows)

  React.useEffect(() => {
    if (!selectedRowId) return
    if (!filtered.some(r => getObjectId(r) === selectedRowId)) setSelectedRowId('')
  }, [filtered, selectedRowId])

  React.useEffect(() => { setPage(1) }, [search, areaFilter, settoreFilter, fromDate, toDate, situationFilter, faseFilter, ruoloFilter, sortRules])

  const fasiDisponibili = React.useMemo(() => {
    const set = new Set<string>()
    for (const r of records) set.add(faseProcedimentaleLabel(r))
    const order = ['Istruttoria tecnica', 'Approvazione tecnica', 'Istruttoria amministrativa', 'Fase sanzionatoria', 'Sanzione notificata']
    return Array.from(set).filter(Boolean).sort((a, b) => {
      const ia = order.indexOf(a)
      const ib = order.indexOf(b)
      if (ia >= 0 && ib >= 0) return ia - ib
      if (ia >= 0) return -1
      if (ib >= 0) return 1
      return a.localeCompare(b, 'it')
    })
  }, [records])

  const ruoliDisponibili = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const r of records) {
      const code = getRuoloPressoCuiSiTrova(r)
      if (!code) continue
      map.set(code, ruoloPressoLabel(r))
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1], 'it'))
  }, [records])

  const areeDisponibili = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const r of records) {
      const settoreCode = getSettoreCodeFromRecord(r, user?.settoreCod)
      if (settoreFilter !== 'tutte' && settoreCode !== settoreFilter) continue
      const code = getAreaCodeFromRecord(r, user?.areaCod)
      if (!code) continue
      map.set(code, getAreaDisplay(r, user?.areaCod, domainLabels))
    }
    const order = ['AMM', 'AGR', 'TEC']
    return Array.from(map.entries()).sort((a, b) => {
      const ia = order.indexOf(a[0])
      const ib = order.indexOf(b[0])
      if (ia >= 0 && ib >= 0) return ia - ib
      if (ia >= 0) return -1
      if (ib >= 0) return 1
      return a[1].localeCompare(b[1], 'it')
    })
  }, [records, settoreFilter, user?.areaCod, user?.settoreCod, domainLabels])

  const settoriDisponibili = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const r of records) {
      const areaCode = getAreaCodeFromRecord(r, user?.areaCod)
      if (areaFilter !== 'tutte' && areaCode !== areaFilter) continue
      const code = getSettoreCodeFromRecord(r, user?.settoreCod)
      if (!code) continue
      map.set(code, getSettoreDisplay(r, user, domainLabels))
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1], 'it', { numeric: true, sensitivity: 'base' }))
  }, [records, areaFilter, user?.settoreCod, user?.areaCod, domainLabels])

  React.useEffect(() => {
    if (areaFilter === 'tutte' || areeDisponibili.length === 0) return
    if (!areeDisponibili.some(([code]) => code === areaFilter)) setAreaFilter('tutte')
  }, [areaFilter, areeDisponibili])

  React.useEffect(() => {
    if (settoreFilter === 'tutte' || areaFilter !== 'tutte' || areeDisponibili.length !== 1) return
    setAreaFilter(areeDisponibili[0][0])
  }, [settoreFilter, areaFilter, areeDisponibili])

  React.useEffect(() => {
    if (settoreFilter === 'tutte' || settoriDisponibili.length === 0) return
    if (!settoriDisponibili.some(([code]) => code === settoreFilter)) setSettoreFilter('tutte')
  }, [settoreFilter, settoriDisponibili])

  const attesaMia = records.filter(r => isAttesaMia(r, user)).length
  const attesaAltri = records.filter(r => isAttesaAltri(r, user)).length
  const ferme = records.filter(r => {
    const last = getLastTouchMs(r)
    return last !== null && (now - last) > staleMs
  }).length

  const userLabel = user?.username
    ? `${user.fullName || user.username} · ${effectiveRole || user.ruoloLabel || '?'}${normalizeAreaCode(user.areaCod || user.area) ? ` · ${normalizeAreaCode(user.areaCod || user.area)}` : ''}${normalizeSettoreCode(user.settoreCod || user.settore) ? ` · ${normalizeSettoreCode(user.settoreCod || user.settore)}` : ''}`
    : 'Accesso in caricamento…'

  const clearFilters = () => {
    setSearch('')
    setAreaFilter('tutte')
    setSettoreFilter('tutte')
    setFromDate('')
    setToDate('')
    setSituationFilter('tutte')
    setFaseFilter('tutte')
    setRuoloFilter('tutte')
    setSortRules(DEFAULT_SORT_RULES)
    setSelectedRowId('')
    setPage(1)
  }

  const isDefaultSort = sortRules.length === 1 && sortRules[0].key === 'lastUpdate' && sortRules[0].dir === 'desc'

  const handleSortHeaderClick = (key: SortKey) => {
    setSortRules(current => {
      const hasOnlyDefault = current.length === 1 && current[0].key === 'lastUpdate' && current[0].dir === 'desc'
      const base = current.length ? current : DEFAULT_SORT_RULES
      const effectiveBase = hasOnlyDefault && key !== 'lastUpdate' ? [] : base
      const index = effectiveBase.findIndex(rule => rule.key === key)

      if (index >= 0) {
        const activeRule = effectiveBase[index]

        // L'ordinamento predefinito è già "Ultimo aggiornamento ▼".
        // Se l'utente clicca per prima cosa quella intestazione, deve vedere
        // un cambio reale: passiamo a "Ultimo aggiornamento ▲" invece di
        // rimuovere la regola e tornare visivamente allo stesso ordinamento.
        if (hasOnlyDefault && key === 'lastUpdate' && activeRule.dir === 'desc') {
          return [{ key: 'lastUpdate', dir: 'asc' }]
        }

        if (activeRule.dir === 'asc') {
          const next = [...effectiveBase]
          next[index] = { ...activeRule, dir: 'desc' }
          return next
        }

        const next = effectiveBase.filter((_, i) => i !== index)
        return next.length ? next : DEFAULT_SORT_RULES
      }

      return [...effectiveBase, { key, dir: 'asc' }]
    })
  }

  const exportCsv = () => {
    const headers = [
      'N. rilevazione',
      'N. rapporto',
      'N. atto',
      'Data rilevazione',
      'Tecnico rilevatore',
      'Istruttore tecnico',
      'Area',
      'Settore',
      'Fase procedimentale',
      'Competenza attuale',
      'Ultimo aggiornamento',
      'Giorni di fermo'
    ]
    const rows = filtered.map(r => [
      getNumeroRilevazione(r),
      getNumeroRapporto(r),
      getNumeroVerbale(r),
      formatDate(getDataRapportoMs(r)),
      getTecnicoRilevatore(r),
      getIstruttore(r),
      getAreaDisplay(r, user?.areaCod, domainLabels),
      getSettoreDisplay(r, user, domainLabels),
      faseProcedimentaleLabel(r),
      ruoloPressoLabel(r),
      formatDateTime(getLastTouchMs(r)),
      getGiorniFermo(r, now)
    ])
    const csv = [headers, ...rows].map(row => row.map(csvEscape).join(';')).join('\r\n')
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gii_report_pratiche_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const th = (label: string, key?: SortKey, align: 'left' | 'center' | 'right' = 'left') => {
    const activeIndex = key ? sortRules.findIndex(rule => rule.key === key) : -1
    const activeRule = activeIndex >= 0 ? sortRules[activeIndex] : null
    const justify = align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start'
    return (
      <th
        style={{ padding: '9px 7px', color: activeRule ? cfg.textColor : cfg.mutedColor, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: `1px solid ${cfg.cardBorder}`, cursor: key ? 'pointer' : 'default', whiteSpace: 'normal', lineHeight: 1.15, verticalAlign: 'bottom', textAlign: align, userSelect: 'none' }}
        onClick={() => { if (key) handleSortHeaderClick(key) }}
        title={key ? 'Ordina / aggiungi all’ordinamento multiplo' : undefined}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: justify, gap: 4, width: '100%', minWidth: 0 }}>
          <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
          {activeRule && (
            <span aria-hidden='true' style={{ display: 'inline-flex', alignItems: 'center', gap: 2, flexShrink: 0, color: cfg.accentColor, fontSize: 10, fontWeight: 900, lineHeight: 1 }}>
              <span style={{ display: 'inline-block', transform: activeRule.dir === 'asc' ? 'translateY(-1px)' : 'translateY(1px)' }}>{activeRule.dir === 'asc' ? '▲' : '▼'}</span>
              <span style={{ minWidth: 12, height: 12, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px', fontSize: 8.5, fontWeight: 900, background: cfg.accentColor, color: '#111827' }}>{activeIndex + 1}</span>
            </span>
          )}
        </span>
      </th>
    )
  }

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden', color: cfg.textColor, boxSizing: 'border-box', padding: 16 }}>
      <div style={{ height: '100%', background: cfg.panelBg, border: `1px solid ${cfg.cardBorder}`, borderRadius: 22, padding: 16, boxShadow: '0 18px 60px rgba(0,0,0,0.22)', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 10, flexShrink: 0, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', minWidth: 0 }}>
            <div style={{ color: cfg.mutedColor, fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>Quadro di sintesi delle fasi procedimentali delle pratiche di competenza.</div>
            {lastLoad && <div style={{ color: cfg.mutedColor, fontSize: 12, whiteSpace: 'nowrap' }}>Ultimo aggiornamento: {new Date(lastLoad).toLocaleString('it-IT')}</div>}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end', flexShrink: 0 }}>
            <button onClick={() => setNonce(n => n + 1)} style={{ border: `1px solid ${cfg.cardBorder}`, background: 'rgba(255,255,255,0.08)', color: cfg.textColor, borderRadius: 12, padding: '8px 12px', fontWeight: 700, cursor: 'pointer' }}>Aggiorna</button>
            <button onClick={exportCsv} disabled={filtered.length === 0} style={{ border: `1px solid ${cfg.cardBorder}`, background: filtered.length ? cfg.accentColor : 'rgba(255,255,255,0.08)', color: filtered.length ? '#111827' : cfg.mutedColor, borderRadius: 12, padding: '8px 12px', fontWeight: 800, cursor: filtered.length ? 'pointer' : 'not-allowed' }}>Esporta CSV</button>
          </div>
        </div>

        {loading && <div style={{ padding: 10, marginBottom: 10, borderRadius: 14, background: 'rgba(255,255,255,0.08)', color: cfg.mutedColor, flexShrink: 0 }}>Caricamento report…</div>}
        {error && <div style={{ padding: 10, marginBottom: 10, borderRadius: 14, background: 'rgba(127,29,29,0.40)', border: '1px solid rgba(248,113,113,0.35)', color: '#fecaca', flexShrink: 0 }}>{error}</div>}

        <section style={{ background: cfg.cardBg, border: `1px solid ${cfg.cardBorder}`, borderRadius: 18, padding: 12, marginBottom: 10, flexShrink: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, alignItems: 'end' }}>
            <div>
              <FieldLabel cfg={cfg}>Cerca</FieldLabel>
              <Input value={search} onChange={setSearch} placeholder='Cerca n. rapporto…' cfg={cfg} />
            </div>
            <div>
              <FieldLabel cfg={cfg}>Area</FieldLabel>
              <Select value={areaFilter} onChange={setAreaFilter} cfg={cfg}>
                <option value='tutte'>Tutte</option>
                {areeDisponibili.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
              </Select>
            </div>
            <div>
              <FieldLabel cfg={cfg}>Settore</FieldLabel>
              <Select value={settoreFilter} onChange={setSettoreFilter} cfg={cfg}>
                <option value='tutte'>Tutti</option>
                {settoriDisponibili.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
              </Select>
            </div>
            <div>
              <FieldLabel cfg={cfg}>Dal</FieldLabel>
              <Input value={fromDate} onChange={setFromDate} type='date' cfg={cfg} />
            </div>
            <div>
              <FieldLabel cfg={cfg}>Al</FieldLabel>
              <Input value={toDate} onChange={setToDate} type='date' cfg={cfg} />
            </div>
            <div>
              <FieldLabel cfg={cfg}>Situazione</FieldLabel>
              <Select value={situationFilter} onChange={v => setSituationFilter(v as SituationFilter)} cfg={cfg}>
                <option value='tutte'>Tutte</option>
                <option value='da_gestire'>Da gestire</option>
                <option value='attesa_altri'>In attesa di altri</option>
                <option value='ferme'>Ferme</option>
                <option value='sanzionatoria'>Fase sanzionatoria</option>
              </Select>
            </div>
            <div>
              <FieldLabel cfg={cfg}>Fase procedimentale</FieldLabel>
              <Select value={faseFilter} onChange={setFaseFilter} cfg={cfg}>
                <option value='tutte'>Tutte</option>
                {fasiDisponibili.map(f => <option key={f} value={f}>{f}</option>)}
              </Select>
            </div>
            <div>
              <FieldLabel cfg={cfg}>Competenza attuale</FieldLabel>
              <Select value={ruoloFilter} onChange={setRuoloFilter} cfg={cfg}>
                <option value='tutte'>Tutti</option>
                {ruoliDisponibili.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
              </Select>
            </div>
            <div>
              <FieldLabel cfg={cfg}>&nbsp;</FieldLabel>
              <button onClick={clearFilters} style={{ width: '100%', height: 36, border: `1px solid ${cfg.cardBorder}`, background: 'rgba(255,255,255,0.08)', color: cfg.textColor, borderRadius: 10, padding: '7px 10px', fontWeight: 700, cursor: 'pointer' }}>Pulisci filtri</button>
            </div>
          </div>
        </section>

        <section style={{ background: cfg.cardBg, border: `1px solid ${cfg.cardBorder}`, borderRadius: 18, padding: 12, flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 8, flexShrink: 0 }}>
            <h3 style={{ margin: 0, fontSize: 15, color: cfg.textColor }}>Sintesi procedimentale</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <div style={{ color: cfg.mutedColor, fontSize: 12 }}>Pagina {safePage} di {pageCount}</div>
              <button
                onClick={() => setSortRules(DEFAULT_SORT_RULES)}
                disabled={isDefaultSort}
                title='Ripristina ordinamento predefinito'
                style={{ width: 36, height: 36, border: `1px solid ${isDefaultSort ? cfg.cardBorder : cfg.accentColor}`, background: isDefaultSort ? 'rgba(255,255,255,0.04)' : cfg.accentColor, color: isDefaultSort ? cfg.mutedColor : '#111827', borderRadius: 8, padding: 0, fontSize: 17, fontWeight: 900, lineHeight: '34px', textAlign: 'center', cursor: isDefaultSort ? 'not-allowed' : 'pointer', boxShadow: isDefaultSort ? 'none' : '0 0 0 2px rgba(254,235,34,0.18)' }}
              >↺</button>
            </div>
          </div>
          <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, tableLayout: 'fixed', flexShrink: 0 }}>
              <colgroup>
                <col style={{ width: '7%' }} />
                <col style={{ width: '7%' }} />
                <col style={{ width: '7%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '9%' }} />
                <col style={{ width: '9%' }} />
                <col style={{ width: '6%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '5%' }} />
              </colgroup>
              <thead style={{ background: cfg.cardBg }}>
                <tr style={{ textAlign: 'left' }}>
                  {th('N. rilevazione', 'rilevazioneNumber')}
                  {th('N. rapporto', 'reportNumber')}
                  {th('N. atto', 'verbaleNumber')}
                  {th('Data rilevazione', 'reportDate')}
                  {th('Tecnico rilevatore', 'rilevatore')}
                  {th('Istruttore tecnico', 'istruttore')}
                  {th('Area', 'area')}
                  {th('Settore', 'settore')}
                  {th('Fase procedimentale', 'faseProcedimentale')}
                  {th('Competenza attuale', 'ruoloCorrente')}
                  {th('Ultimo aggiornamento', 'lastUpdate')}
                  {th('Giorni di fermo', 'giorniFermo', 'center')}
                </tr>
              </thead>
            </table>
            <div style={{ overflowY: 'auto', overflowX: 'hidden', flex: '1 1 auto', minHeight: 0 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '7%' }} />
                <col style={{ width: '7%' }} />
                <col style={{ width: '7%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '9%' }} />
                <col style={{ width: '9%' }} />
                <col style={{ width: '6%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '5%' }} />
              </colgroup>
              <tbody>
                {pageRows.map((r, i) => {
                  const oid = getObjectId(r)
                  const last = getLastTouchMs(r)
                  const selected = selectedRowId === oid
                  const hovered = hoveredRowId === oid
                  const rowBg = selected ? 'rgba(139,92,246,0.20)' : hovered ? 'rgba(255,255,255,0.09)' : 'transparent'
                  return (
                    <tr
                      key={`${oid}-${i}`}
                      tabIndex={0}
                      role='button'
                      aria-selected={selected}
                      onClick={() => setSelectedRowId(current => current === oid ? '' : oid)}
                      onMouseEnter={() => setHoveredRowId(oid)}
                      onMouseLeave={() => setHoveredRowId(current => current === oid ? '' : current)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setSelectedRowId(current => current === oid ? '' : oid)
                        }
                      }}
                      style={{ borderBottom: `1px solid rgba(255,255,255,0.07)`, background: rowBg, boxShadow: selected ? `inset 3px 0 0 ${cfg.accentColor}` : 'none', cursor: 'pointer', outline: 'none', transition: 'background 120ms ease, box-shadow 120ms ease' }}
                    >
                      <td title={getNumeroRilevazione(r)} style={{ padding: '8px 7px', color: cfg.textColor, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getNumeroRilevazione(r)}</td>
                      <td title={getNumeroRapporto(r)} style={{ padding: '8px 7px', color: cfg.mutedColor, fontWeight: getNumeroRapporto(r) !== '—' ? 800 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getNumeroRapporto(r)}</td>
                      <td title={getNumeroVerbale(r)} style={{ padding: '8px 7px', color: cfg.mutedColor, fontWeight: getNumeroVerbale(r) !== '—' ? 800 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getNumeroVerbale(r)}</td>
                      <td style={{ padding: '8px 7px', color: cfg.mutedColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatDate(getDataRapportoMs(r))}</td>
                      <td title={getTecnicoRilevatore(r)} style={{ padding: '8px 7px', color: cfg.mutedColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getTecnicoRilevatore(r)}</td>
                      <td title={getIstruttore(r)} style={{ padding: '8px 7px', color: cfg.mutedColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getIstruttore(r)}</td>
                      <td title={getAreaDisplay(r, user?.areaCod, domainLabels)} style={{ padding: '8px 7px', color: cfg.mutedColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getAreaDisplay(r, user?.areaCod, domainLabels)}</td>
                      <td title={getSettoreDisplay(r, user, domainLabels)} style={{ padding: '8px 7px', color: cfg.mutedColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getSettoreDisplay(r, user, domainLabels)}</td>
                      <td title={faseProcedimentaleLabel(r)} style={{ padding: '8px 7px', color: cfg.mutedColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{faseProcedimentaleLabel(r)}</td>
                      <td title={ruoloPressoLabel(r)} style={{ padding: '8px 7px', color: cfg.mutedColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ruoloPressoLabel(r)}</td>
                      <td style={{ padding: '8px 7px', color: cfg.mutedColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatDateTime(last)}</td>
                      <td style={{ padding: '8px 7px', color: cfg.mutedColor, textAlign: 'center', whiteSpace: 'nowrap' }}>{getGiorniFermo(r, now)}</td>
                    </tr>
                  )
                })}
                {pageRows.length === 0 && (
                  <tr><td colSpan={12} style={{ padding: 14, color: cfg.mutedColor }}>Nessuna pratica corrisponde ai filtri impostati.</td></tr>
                )}
              </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap', flexShrink: 0 }}>
            <div style={{ color: cfg.mutedColor, fontSize: 12 }}>Mostrate {pageRows.length} pratiche su {filtered.length} risultati.</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button disabled={safePage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} style={{ border: `1px solid ${cfg.cardBorder}`, background: 'rgba(255,255,255,0.08)', color: safePage <= 1 ? cfg.mutedColor : cfg.textColor, borderRadius: 10, padding: '7px 10px', fontWeight: 700, cursor: safePage <= 1 ? 'not-allowed' : 'pointer' }}>Indietro</button>
              <button disabled={safePage >= pageCount} onClick={() => setPage(p => Math.min(pageCount, p + 1))} style={{ border: `1px solid ${cfg.cardBorder}`, background: 'rgba(255,255,255,0.08)', color: safePage >= pageCount ? cfg.mutedColor : cfg.textColor, borderRadius: 10, padding: '7px 10px', fontWeight: 700, cursor: safePage >= pageCount ? 'not-allowed' : 'pointer' }}>Avanti</button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
