/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx, type AllWidgetProps } from 'jimu-core'
import { defaultConfig, type IMConfig } from '../config'

type RuntimeDsView = {
  key: string
  viewName: string
  itemId: string
  serviceUrl: string
  layerUrl: string
  roles: string[]
  areaCode: 'AMM' | 'AGR' | 'TEC' | ''
  settoreCode: string
}

type GiiUserInfo = {
  username: string
  fullName?: string
  full_name?: string
  nome?: string
  displayName?: string
  ruolo: number | null
  ruoloLabel: string
  area: number | null
  settore: number | null
  gruppo?: string
  isAdmin: boolean
  isWorkflowAdmin?: boolean
}

type ReportRecord = Record<string, any>
type SituationFilter = 'tutte' | 'da_gestire' | 'attesa_altri' | 'ferme' | 'sanzionatoria'
type SortKey = 'lastUpdate' | 'id' | 'violazione' | 'reportDate' | 'rilevatore' | 'istruttore' | 'trasgressore' | 'cfPiva' | 'area' | 'settore' | 'fase' | 'stato' | 'giorniFermo'
type SortDir = 'asc' | 'desc'

const RUOLO_LABEL: Record<number, string> = { 1: 'TR', 2: 'TI', 3: 'RZ', 4: 'RI', 5: 'DT', 6: 'DA', 7: 'ADMIN' }
const AREA_FROM_CODE: Record<number, string> = { 1: 'AMM', 2: 'AGR', 3: 'TEC' }
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
  CR: 'Catasto, ruoli e servizi territoriali',
  GI: 'Gestione irrigua'
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

const GII_RUNTIME_VIEWS: RuntimeDsView[] = [
  {
    key: 'ADMIN',
    viewName: 'GII_VIEW_EB_ADMIN',
    itemId: 'c05409cf4a86471194d6406e9b4d1c65',
    serviceUrl: 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_BASE/FeatureServer',
    layerUrl: 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_BASE/FeatureServer/0',
    roles: ['ADMIN'],
    areaCode: '',
    settoreCode: ''
  },
  {
    key: 'AGR_ALL',
    viewName: 'GII_VIEW_EB_AGR',
    itemId: '777c4456f6104e779e6a02e5875f67c1',
    serviceUrl: 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_AGR/FeatureServer',
    layerUrl: 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_AGR/FeatureServer/0',
    roles: ['RI', 'DT'],
    areaCode: 'AGR',
    settoreCode: ''
  },
  {
    key: 'AGR_D1',
    viewName: 'GII_VIEW_EB_AGR_D1',
    itemId: '3d0899eb7f684698862c1bc590c19d7f',
    serviceUrl: 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_AGR_D1/FeatureServer',
    layerUrl: 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_AGR_D1/FeatureServer/0',
    roles: ['TI', 'RZ'],
    areaCode: 'AGR',
    settoreCode: 'D1'
  },
  {
    key: 'AGR_D2',
    viewName: 'GII_VIEW_EB_AGR_D2',
    itemId: 'f428036dac9e41458f67c1da32efddd5',
    serviceUrl: 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_AGR_D2/FeatureServer',
    layerUrl: 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_AGR_D2/FeatureServer/0',
    roles: ['TI', 'RZ'],
    areaCode: 'AGR',
    settoreCode: 'D2'
  },
  {
    key: 'AGR_D3',
    viewName: 'GII_VIEW_EB_AGR_D3',
    itemId: 'efc0f9aa9d0e4862a87152cd482c2722',
    serviceUrl: 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_AGR_D3/FeatureServer',
    layerUrl: 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_AGR_D3/FeatureServer/0',
    roles: ['TI', 'RZ'],
    areaCode: 'AGR',
    settoreCode: 'D3'
  },
  {
    key: 'AGR_D4',
    viewName: 'GII_VIEW_EB_AGR_D4',
    itemId: 'c724a0cd50b14743a4595313c2afd39a',
    serviceUrl: 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_AGR_D4/FeatureServer',
    layerUrl: 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_AGR_D4/FeatureServer/0',
    roles: ['TI', 'RZ'],
    areaCode: 'AGR',
    settoreCode: 'D4'
  },
  {
    key: 'AGR_D5',
    viewName: 'GII_VIEW_EB_AGR_D5',
    itemId: 'b3405424a8f841648cca63a429991c03',
    serviceUrl: 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_AGR_D5/FeatureServer',
    layerUrl: 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_AGR_D5/FeatureServer/0',
    roles: ['TI', 'RZ'],
    areaCode: 'AGR',
    settoreCode: 'D5'
  },
  {
    key: 'AGR_D6',
    viewName: 'GII_VIEW_EB_AGR_D6',
    itemId: 'f8671e4e6d804735a5a8c0279b7396be',
    serviceUrl: 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_AGR_D6/FeatureServer',
    layerUrl: 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_AGR_D6/FeatureServer/0',
    roles: ['TI', 'RZ'],
    areaCode: 'AGR',
    settoreCode: 'D6'
  },
  {
    key: 'AMM_ALL',
    viewName: 'GII_VIEW_EB_AMM_ALL',
    itemId: '6ffe45dac0e04905ba677e9fcd703238',
    serviceUrl: 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_AMM_ALL/FeatureServer',
    layerUrl: 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_AMM_ALL/FeatureServer/0',
    roles: ['RI', 'TI', 'DA'],
    areaCode: 'AMM',
    settoreCode: ''
  },
  {
    key: 'TEC_ALL',
    viewName: 'GII_VIEW_EB_TEC',
    itemId: '8687bad031ef4de6bd3c8151de8f8cc6',
    serviceUrl: 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_TEC/FeatureServer',
    layerUrl: 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_TEC/FeatureServer/0',
    roles: ['RI', 'DT'],
    areaCode: 'TEC',
    settoreCode: ''
  },
  {
    key: 'TEC_DS',
    viewName: 'GII_VIEW_EB_TEC_DS',
    itemId: '32b0d7b27c154a969eff411826a473af',
    serviceUrl: 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_TEC_DS/FeatureServer',
    layerUrl: 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_TEC_DS/FeatureServer/0',
    roles: ['TI', 'RZ'],
    areaCode: 'TEC',
    settoreCode: 'DS'
  }
]

function loadEsriModule<T = any> (path: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = (window as any).require
    if (!req) { reject(new Error('AMD require non disponibile')); return }
    try { req([path], (mod: T) => resolve(mod), (err: any) => reject(err)) } catch (e) { reject(e) }
  })
}

function normalizeAreaCode (area: number | null | undefined): 'AMM' | 'AGR' | 'TEC' | '' {
  if (area === 1) return 'AMM'
  if (area === 2) return 'AGR'
  if (area === 3) return 'TEC'
  return ''
}

function normalizeSettoreCode (settore: number | null | undefined): string {
  if (settore == null) return ''
  return SETTORE_FROM_CODE[settore] || String(settore || '')
}

function getEffectiveRole (ruoloLabel: string, area: number | null | undefined): string {
  const r = String(ruoloLabel || '').trim().toUpperCase()
  if (r === 'RI' && area === 1) return 'RI_AMM'
  if (r === 'TI' && area === 1) return 'TI_AMM'
  return r
}

function pickRuntimeViewForUser (user: GiiUserInfo | null): RuntimeDsView | null {
  if (!user) return null
  const role = String(user.ruoloLabel || '').trim().toUpperCase()
  const areaCode = normalizeAreaCode(user.area)
  const settoreCode = normalizeSettoreCode(user.settore)
  if (user.isAdmin || user.isWorkflowAdmin || role === 'ADMIN') {
    return GII_RUNTIME_VIEWS.find(v => v.key === 'ADMIN') || null
  }
  const effective = getEffectiveRole(role, user.area)
  const strict = GII_RUNTIME_VIEWS.find(v =>
    v.roles.includes(effective) &&
    v.areaCode === areaCode &&
    (v.settoreCode ? v.settoreCode === settoreCode : true)
  )
  if (strict) return strict
  return GII_RUNTIME_VIEWS.find(v => v.roles.includes(effective) && v.areaCode === areaCode && !v.settoreCode) || null
}

function readGiiUser (): GiiUserInfo | null {
  const cached: any = (window as any).__giiUserRole
  if (!cached?.username) return null
  const ruolo = cached.ruolo != null ? Number(cached.ruolo) : null
  const isAdmin = !!cached.isAdmin || !!cached.isWorkflowAdmin || ruolo === 7 || String(cached.ruoloLabel || '').toUpperCase() === 'ADMIN'
  const ruoloLabel = String(cached.ruoloLabel || (ruolo != null ? (RUOLO_LABEL[ruolo] || '') : (isAdmin ? 'ADMIN' : ''))).toUpperCase()
  return {
    username: String(cached.username || '').trim(),
    fullName: String(cached.fullName || cached.full_name || cached.nome || cached.displayName || cached.username || '').trim(),
    full_name: String(cached.full_name || cached.fullName || '').trim(),
    nome: String(cached.nome || '').trim(),
    displayName: String(cached.displayName || '').trim(),
    ruolo,
    ruoloLabel,
    area: cached.area != null ? Number(cached.area) : null,
    settore: cached.settore != null ? Number(cached.settore) : null,
    gruppo: String(cached.gruppo || ''),
    isAdmin,
    isWorkflowAdmin: !!cached.isWorkflowAdmin
  }
}

function getStatoFieldForRuolo (ruoloLabel: string): string {
  const r = ruoloLabel.toUpperCase()
  if (r === 'TR') return 'stato_TR'
  if (r === 'TI') return 'stato_TI'
  if (r === 'RZ') return 'stato_RZ'
  if (r === 'RI') return 'stato_RI'
  if (r === 'DT') return 'stato_DT'
  if (r === 'DA') return 'stato_DA'
  if (r === 'RI_AMM') return 'stato_RI_AMM'
  if (r === 'TI_AMM') return 'stato_TI_AMM'
  return 'stato_DT'
}

function equalsUser (a: any, b: any): boolean {
  const sa = String(a ?? '').trim().toLowerCase()
  const sb = String(b ?? '').trim().toLowerCase()
  return !!sa && !!sb && sa === sb
}

function hasRuoloData (d: any, role: string): boolean {
  const p = pickField(d, `presa_in_carico_${role}`)
  const s = pickField(d, `stato_${role}`)
  const e = pickField(d, `esito_${role}`)
  return (p !== null && p !== undefined && p !== '') ||
    (s !== null && s !== undefined && s !== '') ||
    (e !== null && e !== undefined && e !== '')
}

function meaningful (v: any): boolean {
  return v !== null && v !== undefined && v !== '' && v !== 0 && v !== '0'
}

function isInFaseSanzionatoria (d: any): boolean {
  return meaningful(pickField(d, 'stato_RI_AMM')) || meaningful(pickField(d, 'esito_RI_AMM')) ||
    meaningful(pickField(d, 'stato_TI_AMM')) || meaningful(pickField(d, 'esito_TI_AMM')) ||
    meaningful(pickField(d, 'stato_DA')) || meaningful(pickField(d, 'esito_DA'))
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
    parseToMs(pickField(d, `dt_esito_${role}`))
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
  ;['DA', 'TI_AMM', 'RI_AMM', 'DT', 'RI', 'RZ', 'TI', 'TR'].forEach(r => candidates.push(getRoleLastTouchMs(d, r)))
  const vals = candidates.filter((v): v is number => v !== null)
  return vals.length ? Math.max(...vals) : null
}

function getCreatedMs (d: any): number | null {
  return parseToMs(d['CreationDate_1']) || parseToMs(d['CreationDate']) || parseToMs(d['created_date']) || parseToMs(d['data_rilevazione'])
}

function getTiIstruttoriaInfo (d: any) {
  const tiUser = String(pickField(d, 'ti_assegnato_username') ?? pickField(d, 'ti_assegnato_user') ?? pickField(d, 'ti_assegnato') ?? '').trim()
  const higherTouched = hasRuoloData(d, 'RI') || hasRuoloData(d, 'DT') || hasRuoloData(d, 'DA')
  const statoTiRaw = pickField(d, 'stato_TI')
  const presaTiRaw = pickField(d, 'presa_in_carico_TI')
  const esitoTiRaw = pickField(d, 'esito_TI')
  const statoTiNum = statoTiRaw !== null && statoTiRaw !== undefined && statoTiRaw !== '' ? Number(statoTiRaw) : null
  const presaTiNum = presaTiRaw !== null && presaTiRaw !== undefined && presaTiRaw !== '' ? Number(presaTiRaw) : null
  const esitoTiNum = esitoTiRaw !== null && esitoTiRaw !== undefined && esitoTiRaw !== '' ? Number(esitoTiRaw) : null
  const tiReturned = (esitoTiNum !== null && Number.isFinite(esitoTiNum)) || statoTiNum === 4 || statoTiNum === 5
  const tiLastTouchMs = getRoleLastTouchMs(d, 'TI')
  const rzLastTouchMs = getRoleLastTouchMs(d, 'RZ')
  const awaitingRetakeByRz = !!tiUser && tiReturned && !higherTouched && tiLastTouchMs !== null && (rzLastTouchMs === null || rzLastTouchMs <= tiLastTouchMs)
  return { hasAssignedTi: !!tiUser, tiUser, higherTouched, statoTiNum, presaTiNum, esitoTiNum, tiReturned, tiLastTouchMs, rzLastTouchMs, awaitingRetakeByRz, isInTiIstruttoria: !!tiUser && !higherTouched && !tiReturned }
}

function isRecordVisibleForCurrentUser (d: any, user: GiiUserInfo | null): boolean {
  if (!user) return false
  if (user.isAdmin || user.isWorkflowAdmin) return true

  const role = getEffectiveRole(user.ruoloLabel || '', user.area)
  if (!role) return true

  const archVal = d['GII_arch'] ?? d['gii_arch'] ?? d['GII_ARCH']
  if (archVal !== null && archVal !== undefined && archVal !== '' && Number(archVal) === 1) return false

  const areaNum = user.area ?? null
  const isAmmArea = areaNum === 1
  if (role === 'DA' || role === 'RI_AMM' || role === 'TI_AMM' || (isAmmArea && (role === 'RI' || role === 'TI'))) {
    if (!isInFaseSanzionatoria(d)) return false
    if (role === 'TI_AMM') {
      const meUser = String(user.username || '').trim()
      const tiAmmUser = String(d['ti_amm_assegnato_username'] ?? '').trim()
      const tiAmmName = String(d['ti_amm_assegnato_nome'] ?? '').trim()
      if (!tiAmmUser && !tiAmmName) return false
      return equalsUser(tiAmmUser, meUser) || equalsUser(tiAmmName, meUser)
    }
    return true
  }

  if (role === 'TI') {
    const meUser = String(user.username || '').trim()
    const meName = String(user.fullName ?? user.nome ?? user.displayName ?? '').trim()
    const opRaw = d['origine_pratica']
    const opNum = opRaw !== null && opRaw !== undefined && opRaw !== '' ? Number(opRaw) : null
    const tiUser = String(pickField(d, 'ti_assegnato_username') ?? pickField(d, 'ti_assegnato_user') ?? pickField(d, 'ti_assegnato') ?? '').trim()
    const tiName = String(d['ti_assegnato_nome'] ?? d['ti_assegnato_name'] ?? '').trim()
    const assignedToMe = equalsUser(tiUser, meUser) || equalsUser(tiName, meUser) || (meName ? equalsUser(tiName, meName) : false)
    const creatorVals = [d['created_user'], d['Creator'], d['creator'], d['username'], d['user_name'], d['utente'], d['utente_ins'], d['created_by'], d['submitter'], d['owner']]
    const createdByMe = creatorVals.some(v => equalsUser(v, meUser) || (meName ? equalsUser(v, meName) : false))
    const hasTiWorkflow = hasRuoloData(d, 'TI')

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

function isAttesaMia (d: any, user: GiiUserInfo | null): boolean {
  if (!user || user.isAdmin || user.isWorkflowAdmin) return false
  const role = getEffectiveRole(user.ruoloLabel || '', user.area)
  const statoField = getStatoFieldForRuolo(role)
  const val = d[statoField]
  const n = val != null && val !== '' ? Number(val) : null

  if ((role === 'TI' || role === 'TI_AMM') && n === 2) {
    const meUser = String(user.username || '').trim()
    const meName = String(user.fullName ?? user.nome ?? user.displayName ?? '').trim()
    const tiUser = role === 'TI_AMM'
      ? String(d['ti_amm_assegnato_username'] ?? '').trim()
      : String(pickField(d, 'ti_assegnato_username') ?? pickField(d, 'ti_assegnato_user') ?? pickField(d, 'ti_assegnato') ?? '').trim()
    const tiName = role === 'TI_AMM'
      ? String(d['ti_amm_assegnato_nome'] ?? '').trim()
      : String(d['ti_assegnato_nome'] ?? d['ti_assegnato_name'] ?? '').trim()
    return equalsUser(tiUser, meUser) || equalsUser(tiName, meUser) || (meName ? equalsUser(tiName, meName) : false)
  }

  if (role === 'RZ' && getTiIstruttoriaInfo(d).isInTiIstruttoria) return false
  return n === 0 || n === 1 || n === 3
}

function isAttesaAltri (d: any, user: GiiUserInfo | null): boolean {
  if (!user || user.isAdmin || user.isWorkflowAdmin) return false
  const role = getEffectiveRole(user.ruoloLabel || '', user.area)
  const statoField = getStatoFieldForRuolo(role)
  const val = d[statoField]
  const n = val != null && val !== '' ? Number(val) : null
  if (role === 'RZ' && getTiIstruttoriaInfo(d).isInTiIstruttoria) return true
  if ((role === 'TI' || role === 'TI_AMM') && n === 2) return !isAttesaMia(d, user)
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

function getFwdDest (role: string, d: any): string {
  switch (role) {
    case 'TI': return 'RZ'
    case 'RZ': return 'RI'
    case 'RI': return 'DT'
    case 'DT': return 'RI_AMM'
    case 'RI_AMM': {
      const esitoTiAmm = pickField(d, 'esito_TI_AMM')
      const n = esitoTiAmm !== null && esitoTiAmm !== undefined && esitoTiAmm !== '' ? Number(esitoTiAmm) : null
      return (n !== null && Number.isFinite(n)) ? 'DA' : 'TI_AMM'
    }
    case 'TI_AMM': return 'RI_AMM'
    case 'DA': return 'TI_AMM'
    default: return ''
  }
}

function getIntegDest (role: string): string {
  switch (role) {
    case 'RZ': return 'TI'
    case 'RI': return 'TI'
    case 'DT': return 'RI'
    case 'RI_AMM': return 'RI'
    case 'TI_AMM': return 'RI_AMM'
    case 'DA': return 'RI_AMM'
    default: return ''
  }
}

function computeSintetico (d: any): { ruolo: string; label: string; statoForChip: number | null } {
  const scanOrder = ['DA', 'TI_AMM', 'RI_AMM', 'DT', 'RI', 'RZ', 'TI', 'TR']
  const statoDaPrendere = 1
  const statoPresa = 2
  const statoIntegrazione = 3
  const statoApprovata = 4
  const statoRespinta = 5
  const presaDaPrendere = 1
  const presaPresa = 2
  const esitoIntegrazione = 1
  const esitoApprovata = 2
  const esitoRespinta = 3

  const tiInfo = getTiIstruttoriaInfo(d)
  if ((tiInfo as any).awaitingRetakeByRz) return { ruolo: 'RZ', label: 'Trasmesso', statoForChip: statoDaPrendere }
  if ((tiInfo as any).hasAssignedTi && tiInfo.isInTiIstruttoria) {
    const opRaw = pickField(d, 'origine_pratica')
    const isOrigineTi = (opRaw === 2 || opRaw === '2')
    const rzNeverTouched = !hasRuoloData(d, 'RZ')
    if (isOrigineTi && rzNeverTouched) return { ruolo: 'TI', label: 'In carico', statoForChip: statoPresa }
    const statoTiNum = (tiInfo as any).statoTiNum
    const presaTiNum = (tiInfo as any).presaTiNum
    if (statoTiNum !== null && Number.isFinite(statoTiNum)) {
      if (statoTiNum === statoDaPrendere) return { ruolo: 'TI', label: 'Da prendere in carico', statoForChip: statoDaPrendere }
      if (statoTiNum === statoPresa) return { ruolo: 'TI', label: 'In carico', statoForChip: statoPresa }
      return { ruolo: 'TI', label: 'In carico', statoForChip: null }
    }
    if (presaTiNum !== null && Number.isFinite(presaTiNum)) {
      if (presaTiNum === presaDaPrendere) return { ruolo: 'TI', label: 'Da prendere in carico', statoForChip: statoDaPrendere }
      if (presaTiNum === presaPresa) return { ruolo: 'TI', label: 'In carico', statoForChip: statoPresa }
    }
    return { ruolo: 'TI', label: 'Trasmesso', statoForChip: statoDaPrendere }
  }

  for (const role of scanOrder) {
    if (!hasRuoloData(d, role)) continue
    const presaRaw = pickField(d, `presa_in_carico_${role}`)
    const statoRaw = pickField(d, `stato_${role}`)
    const esitoRaw = pickField(d, `esito_${role}`)
    const presaNum = presaRaw !== null && presaRaw !== undefined && presaRaw !== '' ? Number(presaRaw) : null
    const statoNum = statoRaw !== null && statoRaw !== undefined && statoRaw !== '' ? Number(statoRaw) : null
    const esitoNum = esitoRaw !== null && esitoRaw !== undefined && esitoRaw !== '' ? Number(esitoRaw) : null

    if (esitoNum !== null && Number.isFinite(esitoNum)) {
      if (esitoNum === esitoApprovata) {
        if (role === 'DT') return { ruolo: 'DT', label: 'Approvato', statoForChip: statoApprovata }
        if (role === 'DA') return { ruolo: 'DA', label: 'Sanzione approvata', statoForChip: statoApprovata }
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
          const destEsitoRaw = pickField(d, `esito_${dest}`)
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

    if (presaNum !== null && Number.isFinite(presaNum)) {
      if (presaNum === presaDaPrendere) return { ruolo: role, label: 'Trasmesso', statoForChip: statoDaPrendere }
      if (presaNum === presaPresa) return { ruolo: role, label: 'In carico', statoForChip: statoPresa }
    }
    return { ruolo: role, label: 'In carico', statoForChip: null }
  }

  const op = pickField(d, 'origine_pratica')
  const opNum = op !== null && op !== undefined && op !== '' ? Number(op) : null
  if (opNum === 2) return { ruolo: 'TI', label: 'In carico', statoForChip: statoPresa }
  return { ruolo: 'RZ', label: 'Da prendere in carico', statoForChip: statoDaPrendere }
}

function getActiveRole (d: any): string {
  return computeSintetico(d).ruolo
}

function faseLabel (role: string): string {
  const r = String(role || '').toUpperCase()
  if (r === 'TR') return 'Rilevazione'
  if (r === 'TI') return 'Istruttoria tecnica'
  if (r === 'RZ') return 'Responsabile di zona'
  if (r === 'RI') return 'Istruttoria d’area'
  if (r === 'DT') return 'Direzione tecnica'
  if (r === 'RI_AMM') return 'Istruttoria amministrativa'
  if (r === 'TI_AMM') return 'Supporto amministrativo'
  if (r === 'DA') return 'Direzione amministrativa'
  return 'Non determinata'
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

function getStatusForRecord (d: any, user: GiiUserInfo | null): string {
  return computeSintetico(d).label
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

function getNumeroRapporto (d: any): string {
  const stored = getFirst(d, ['cod_pratica', 'Cod_pratica', 'COD_PRATICA', 'numero_rapporto', 'Numero_rapporto', 'NUMERO_RAPPORTO'], '')
  if (stored) return stored
  const oid = getObjectId(d)
  if (!oid || oid === '—') return '—'
  const op = pickField(d, 'origine_pratica')
  let prefix = 'TR'
  if (op === 2 || op === '2' || String(op).toUpperCase() === 'TI') prefix = 'TI'
  else if (op === 1 || op === '1' || String(op).toUpperCase() === 'TR') prefix = 'TR'
  return `${prefix}-${oid}`
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

function formatNormaToken (v: string): string {
  const raw = String(v || '').trim()
  if (!raw) return ''
  const compact = raw.replace(/_/g, '.').replace(/Art/i, 'Art.')
  const m = compact.match(/art\.?\s*(\d+)(?:[\.\-]?(\d+))?/i)
  if (m) return m[2] ? `Art. ${m[1]}.${m[2]}` : `Art. ${m[1]}`
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

function getViolazione (d: any): string {
  const items: string[] = []

  const artFields: Array<[string, string]> = [
    ['v_art08', 'Art. 08'],
    ['v_art12', 'Art. 12'],
    ['v_art27', 'Art. 27'],
    ['v_art28', 'Art. 28'],
    ['v_art29', 'Art. 29'],
    ['v_art30', 'Art. 30'],
    ['v_art31', 'Art. 31'],
    ['v_art32', 'Art. 32'],
    ['v_art33', 'Art. 33'],
    ['v_art34', 'Art. 34'],
    ['v_art35', 'Art. 35'],
    ['v_art36', 'Art. 36'],
    ['v_art37', 'Art. 37'],
    ['v_art39', 'Art. 39']
  ]
  artFields.forEach(([field, label]) => {
    if (isCheckedValue(pickField(d, field))) items.push(label)
  })

  const norma15Parziale = getFirst(d, ['norma15_parziale', 'Norma15_parziale'], '')
  const norma15Totale = getFirst(d, ['norma15_totale', 'Norma15_totale'], '')
  if (norma15Parziale || norma15Totale) items.push('Art. 15')

  const norma1617 = getFirst(d, ['norma16_17', 'Norma16_17'], '')
  const art17Tipo = getFirst(d, ['art17_tipo', 'Art17_tipo'], '')
  if (/art\.?\s*16/i.test(norma1617)) items.push('Art. 16')
  if (/art\.?\s*17/i.test(norma1617) || art17Tipo) items.push('Art. 17')

  ;['norma_violata1', 'norma_violata2', 'norma_violata3'].forEach(field => {
    splitMultiValue(pickField(d, field)).forEach(v => items.push(formatNormaToken(v)))
  })

  const direct = getFirst(d, [
    'violazione', 'Violazione', 'VIOLAZIONE',
    'tipo_violazione', 'Tipo_violazione', 'TIPO_VIOLAZIONE',
    'infrazione', 'Infrazione', 'INFRAZIONE',
    'descrizione_violazione', 'Descrizione_violazione'
  ], '')
  if (direct) items.push(direct)

  const cleaned = uniqueList(items)
  if (cleaned.length) return cleaned.join(', ')

  const descr = getFirst(d, ['descrizione_fatti', 'Descrizione_fatti', 'circostanze', 'Circostanze'], '')
  if (descr) return descr.length > 70 ? `${descr.slice(0, 67)}…` : descr
  return '—'
}

function getComune (d: any): string {
  return getFirst(d, ['comune', 'Comune', 'COMUNE', 'comune_infrazione', 'Comune_infrazione'])
}

function getTrasgressore (d: any): string {
  const rag = getFirst(d, ['ragione_sociale', 'Ragione_sociale', 'ditta', 'Ditta'], '')
  if (rag) return rag
  const nome = getFirst(d, ['nome', 'Nome'], '')
  const cognome = getFirst(d, ['cognome', 'Cognome'], '')
  return `${nome} ${cognome}`.trim() || '—'
}

function getCfPiva (d: any): string {
  const cf = getFirst(d, [
    'codice_fiscale', 'Codice_fiscale', 'CODICE_FISCALE', 'codiceFiscale',
    'cod_fiscale', 'cod_fisc', 'cf', 'CF', 'c_f', 'cF'
  ], '')
  const piva = getFirst(d, [
    'piva', 'PIVA', 'p_iva', 'P_IVA', 'partita_iva', 'Partita_iva',
    'PARTITA_IVA', 'partitaIVA', 'partitaIva', 'iva'
  ], '')
  if (cf && piva && cf !== piva) return `${cf} / ${piva}`
  return cf || piva || '—'
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

function getAreaDisplay (d: any, fallbackArea?: number | null): string {
  const raw = getFirst(d, ['area_cod', 'Area_cod', 'AREA_COD', 'area', 'Area'], '')
  let code = String(raw || '').trim().toUpperCase()
  if (!code && fallbackArea != null) code = normalizeAreaCode(fallbackArea)
  if (code === '1') code = 'AMM'
  if (code === '2') code = 'AGR'
  if (code === '3') code = 'TEC'
  return AREA_LABELS[code] || code || '—'
}

function getSettoreCodeFromRecord (d: any, fallbackSettore?: number | null): string {
  const raw = getFirst(d, ['settore_cod', 'Settore_cod', 'SETTORE_COD', 'settore', 'Settore', 'id_settore'], '')
  if (raw) {
    const n = Number(raw)
    if (Number.isFinite(n) && SETTORE_FROM_CODE[n]) return SETTORE_FROM_CODE[n]
    return String(raw).trim().toUpperCase()
  }
  if (fallbackSettore != null) return normalizeSettoreCode(fallbackSettore)
  return ''
}

function getSettoreDisplay (d: any, user?: GiiUserInfo | null): string {
  const code = getSettoreCodeFromRecord(d, user?.settore)
  return SETTORE_LABELS[code] || code || '—'
}

function getGiorniFermo (d: any, now: number): string {
  const last = getLastTouchMs(d)
  if (last === null) return '—'
  const days = Math.max(0, Math.floor((now - last) / (24 * 60 * 60 * 1000)))
  return String(days)
}

function getRecordSearchText (d: any, user: GiiUserInfo | null): string {
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
    getNumeroRapporto(d),
    getViolazione(d),
    getObjectId(d),
    getComune(d),
    getTecnicoRilevatore(d),
    getIstruttore(d),
    getTrasgressore(d),
    getCfPiva(d),
    formatDate(getDataRapportoMs(d)),
    getAreaDisplay(d, user?.area),
    getSettoreDisplay(d, user),
    faseLabel(getActiveRole(d)),
    getStatusForRecord(d, user)
  )
  return normalizeText(parts.join(' '))
}

function getIstruttore (d: any): string {
  return getFirst(d, [
    'ti_assegnato_nome', 'ti_assegnato_name',
    'responsabile_istruttore', 'Responsabile_istruttore', 'RESPONSABILE_ISTRUTTORE',
    'tecnico_istruttore', 'Tecnico_istruttore', 'istruttore', 'Istruttore',
    'ti_assegnato_username', 'ti_assegnato_user', 'ti_assegnato',
    'ti_amm_assegnato_nome', 'ti_amm_assegnato_username'
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

function Pill (props: { children: any; cfg: any }) {
  return <span style={{ padding: '6px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.08)', color: props.cfg.mutedColor, fontSize: 12 }}>{props.children}</span>
}

function Stat (props: { label: string; value: number; cfg: any }) {
  return (
    <div style={{ background: props.cfg.cardBg, border: `1px solid ${props.cfg.cardBorder}`, borderRadius: 14, padding: '12px 14px' }}>
      <div style={{ color: props.cfg.mutedColor, fontSize: 11, textTransform: 'uppercase', fontWeight: 800, letterSpacing: 0.8 }}>{props.label}</div>
      <div style={{ color: props.cfg.textColor, fontSize: 26, fontWeight: 800, marginTop: 3 }}>{props.value}</div>
    </div>
  )
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
  const [settoreFilter, setSettoreFilter] = React.useState('tutte')
  const [fromDate, setFromDate] = React.useState('')
  const [toDate, setToDate] = React.useState('')
  const [statoFilter, setStatoFilter] = React.useState('tutte')
  const [situationFilter, setSituationFilter] = React.useState<SituationFilter>('tutte')
  const [faseFilter, setFaseFilter] = React.useState('tutte')
  const [sortKey, setSortKey] = React.useState<SortKey>('lastUpdate')
  const [sortDir, setSortDir] = React.useState<SortDir>('desc')
  const [page, setPage] = React.useState(1)

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

  const view = React.useMemo(() => pickRuntimeViewForUser(user), [user?.username, user?.ruoloLabel, user?.area, user?.settore, user?.isAdmin, user?.isWorkflowAdmin])
  const effectiveRole = getEffectiveRole(user?.ruoloLabel || '', user?.area)

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
  }, [view?.layerUrl, user?.username, user?.ruoloLabel, user?.area, user?.settore, user?.isAdmin, cfg.whereClause, cfg.pageSize, nonce])

  const staleMs = Math.max(1, Number(cfg.staleDays || 15)) * 24 * 60 * 60 * 1000
  const now = Date.now()

  const filtered = React.useMemo(() => {
    const q = normalizeText(search)
    const fromMs = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null
    const toMs = toDate ? new Date(`${toDate}T23:59:59`).getTime() : null

    const out = records.filter(r => {
      const last = getLastTouchMs(r)
      const phase = getActiveRole(r)
      const status = getStatusForRecord(r, user)
      const isStale = last !== null && (now - last) > staleMs

      if (q && !getRecordSearchText(r, user).includes(q)) return false
      if (settoreFilter !== 'tutte' && getSettoreCodeFromRecord(r, user?.settore) !== settoreFilter) return false
      if (fromMs !== null && (last === null || last < fromMs)) return false
      if (toMs !== null && (last === null || last > toMs)) return false
      if (faseFilter !== 'tutte' && phase !== faseFilter) return false
      if (statoFilter !== 'tutte' && status !== statoFilter) return false
      if (situationFilter === 'da_gestire' && !isAttesaMia(r, user)) return false
      if (situationFilter === 'attesa_altri' && !isAttesaAltri(r, user)) return false
      if (situationFilter === 'ferme' && !isStale) return false
      if (situationFilter === 'sanzionatoria' && !isInFaseSanzionatoria(r)) return false
      return true
    })

    const dir = sortDir === 'asc' ? 1 : -1
    out.sort((a, b) => {
      let av: any
      let bv: any
      if (sortKey === 'lastUpdate') { av = getLastTouchMs(a) || 0; bv = getLastTouchMs(b) || 0 }
      if (sortKey === 'id') { av = getNumeroRapporto(a); bv = getNumeroRapporto(b) }
      if (sortKey === 'violazione') { av = getViolazione(a); bv = getViolazione(b) }
      if (sortKey === 'reportDate') { av = getDataRapportoMs(a) || 0; bv = getDataRapportoMs(b) || 0 }
      if (sortKey === 'rilevatore') { av = getTecnicoRilevatore(a); bv = getTecnicoRilevatore(b) }
      if (sortKey === 'istruttore') { av = getIstruttore(a); bv = getIstruttore(b) }
      if (sortKey === 'trasgressore') { av = getTrasgressore(a); bv = getTrasgressore(b) }
      if (sortKey === 'cfPiva') { av = getCfPiva(a); bv = getCfPiva(b) }
      if (sortKey === 'area') { av = getAreaDisplay(a, user?.area); bv = getAreaDisplay(b, user?.area) }
      if (sortKey === 'settore') { av = getSettoreDisplay(a, user); bv = getSettoreDisplay(b, user) }
      if (sortKey === 'fase') { av = faseLabel(getActiveRole(a)); bv = faseLabel(getActiveRole(b)) }
      if (sortKey === 'stato') { av = getStatusForRecord(a, user); bv = getStatusForRecord(b, user) }
      if (sortKey === 'giorniFermo') { av = Number(getGiorniFermo(a, now)) || 0; bv = Number(getGiorniFermo(b, now)) || 0 }
      if (typeof av === 'string' || typeof bv === 'string') return String(av || '').localeCompare(String(bv || ''), 'it', { numeric: true, sensitivity: 'base' }) * dir
      return ((av || 0) - (bv || 0)) * dir
    })

    return out
  }, [records, search, settoreFilter, fromDate, toDate, statoFilter, situationFilter, faseFilter, sortKey, sortDir, user?.username, user?.ruoloLabel, user?.area, user?.settore, cfg.staleDays])

  const tableRows = Math.max(5, Number(cfg.tableRows || 25))
  const pageCount = Math.max(1, Math.ceil(filtered.length / tableRows))
  const safePage = Math.min(page, pageCount)
  const pageRows = filtered.slice((safePage - 1) * tableRows, safePage * tableRows)

  React.useEffect(() => { setPage(1) }, [search, settoreFilter, fromDate, toDate, statoFilter, situationFilter, faseFilter, sortKey, sortDir])

  const fasiDisponibili = React.useMemo(() => {
    const set = new Set<string>()
    for (const r of records) set.add(getActiveRole(r))
    return Array.from(set).filter(Boolean).sort((a, b) => faseLabel(a).localeCompare(faseLabel(b), 'it'))
  }, [records])

  const statiDisponibili = React.useMemo(() => {
    const set = new Set<string>()
    for (const r of records) set.add(getStatusForRecord(r, user))
    return Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b, 'it'))
  }, [records, user?.username, user?.ruoloLabel, user?.area])

  const settoriDisponibili = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const r of records) {
      const code = getSettoreCodeFromRecord(r, user?.settore)
      if (!code) continue
      map.set(code, getSettoreDisplay(r, user))
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1], 'it', { numeric: true, sensitivity: 'base' }))
  }, [records, user?.settore, user?.area])

  const attesaMia = records.filter(r => isAttesaMia(r, user)).length
  const attesaAltri = records.filter(r => isAttesaAltri(r, user)).length
  const ferme = records.filter(r => {
    const last = getLastTouchMs(r)
    return last !== null && (now - last) > staleMs
  }).length

  const userLabel = user?.username
    ? `${user.fullName || user.username} · ${effectiveRole || user.ruoloLabel || '?'}${normalizeAreaCode(user.area) ? ` · ${normalizeAreaCode(user.area)}` : ''}${normalizeSettoreCode(user.settore) ? ` · ${normalizeSettoreCode(user.settore)}` : ''}`
    : 'Accesso in caricamento…'

  const clearFilters = () => {
    setSearch('')
    setSettoreFilter('tutte')
    setFromDate('')
    setToDate('')
    setStatoFilter('tutte')
    setSituationFilter('tutte')
    setFaseFilter('tutte')
    setSortKey('lastUpdate')
    setSortDir('desc')
    setPage(1)
  }

  const exportCsv = () => {
    const headers = [
      'N. rapporto',
      'Violazione',
      'Tecnico rilevatore',
      'Tecnico istruttore',
      'Trasgressore',
      'C.F./P.IVA',
      'Data rapporto',
      'Area',
      'Settore',
      'Comune',
      'Competenza attuale',
      'Stato',
      'Ultimo aggiornamento',
      'Giorni fermo'
    ]
    const rows = filtered.map(r => [
      getNumeroRapporto(r),
      getViolazione(r),
      getTecnicoRilevatore(r),
      getIstruttore(r),
      getTrasgressore(r),
      getCfPiva(r),
      formatDate(getDataRapportoMs(r)),
      getAreaDisplay(r, user?.area),
      getSettoreDisplay(r, user),
      getComune(r),
      faseLabel(getActiveRole(r)),
      getStatusForRecord(r, user),
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

  const th = (label: string, key?: SortKey) => (
    <th style={{ padding: '10px 8px', color: cfg.mutedColor, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, borderBottom: `1px solid ${cfg.cardBorder}`, cursor: key ? 'pointer' : 'default', whiteSpace: 'nowrap' }} onClick={() => {
      if (!key) return
      if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
      else { setSortKey(key); setSortDir(key === 'lastUpdate' ? 'desc' : 'asc') }
    }}>{label}{key && sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}</th>
  )

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden', color: cfg.textColor, boxSizing: 'border-box', padding: 16 }}>
      <div style={{ height: '100%', background: cfg.panelBg, border: `1px solid ${cfg.cardBorder}`, borderRadius: 22, padding: 16, boxShadow: '0 18px 60px rgba(0,0,0,0.22)', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 10, flexShrink: 0, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', minWidth: 0 }}>
            <div style={{ color: cfg.mutedColor, fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>Elenco consultabile ed esportabile delle pratiche di competenza.</div>
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
              <Input value={search} onChange={setSearch} placeholder='Cerca in tutti i campi…' cfg={cfg} />
            </div>
            <div>
              <FieldLabel cfg={cfg}>Settore/Ufficio</FieldLabel>
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
              <FieldLabel cfg={cfg}>Stato</FieldLabel>
              <Select value={statoFilter} onChange={setStatoFilter} cfg={cfg}>
                <option value='tutte'>Tutti</option>
                {statiDisponibili.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
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
              <FieldLabel cfg={cfg}>Competenza attuale</FieldLabel>
              <Select value={faseFilter} onChange={setFaseFilter} cfg={cfg}>
                <option value='tutte'>Tutte</option>
                {fasiDisponibili.map(f => <option key={f} value={f}>{faseLabel(f)}</option>)}
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
            <h3 style={{ margin: 0, fontSize: 15, color: cfg.textColor }}>Elenco pratiche</h3>
            <div style={{ color: cfg.mutedColor, fontSize: 12 }}>Pagina {safePage} di {pageCount}</div>
          </div>
          <div style={{ overflow: 'auto', flex: '1 1 auto', minHeight: 0 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: cfg.cardBg }}>
                <tr style={{ textAlign: 'left' }}>
                  {th('N. rapporto', 'id')}
                  {th('Violazione', 'violazione')}
                  {th('Tecnico rilevatore', 'rilevatore')}
                  {th('Tecnico istruttore', 'istruttore')}
                  {th('Trasgressore', 'trasgressore')}
                  {th('C.F./P.IVA', 'cfPiva')}
                  {th('Data rapporto', 'reportDate')}
                  {th('Area', 'area')}
                  {th('Settore/Ufficio', 'settore')}
                  {th('Competenza attuale', 'fase')}
                  {th('Stato', 'stato')}
                  {th('Ultimo aggiornamento', 'lastUpdate')}
                  {th('Giorni fermo', 'giorniFermo')}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r, i) => {
                  const oid = getObjectId(r)
                  const last = getLastTouchMs(r)
                  return (
                    <tr key={`${oid}-${i}`} style={{ borderBottom: `1px solid rgba(255,255,255,0.07)` }}>
                      <td style={{ padding: '9px 8px', color: cfg.textColor, fontWeight: 800, whiteSpace: 'nowrap' }}>{getNumeroRapporto(r)}</td>
                      <td style={{ padding: '9px 8px', color: cfg.mutedColor, minWidth: 170 }}>{getViolazione(r)}</td>
                      <td style={{ padding: '9px 8px', color: cfg.mutedColor, minWidth: 150 }}>{getTecnicoRilevatore(r)}</td>
                      <td style={{ padding: '9px 8px', color: cfg.mutedColor, minWidth: 150 }}>{getIstruttore(r)}</td>
                      <td style={{ padding: '9px 8px', color: cfg.mutedColor, minWidth: 180 }}>{getTrasgressore(r)}</td>
                      <td style={{ padding: '9px 8px', color: cfg.mutedColor, minWidth: 120, whiteSpace: 'nowrap' }}>{getCfPiva(r)}</td>
                      <td style={{ padding: '9px 8px', color: cfg.mutedColor, whiteSpace: 'nowrap' }}>{formatDate(getDataRapportoMs(r))}</td>
                      <td style={{ padding: '9px 8px', color: cfg.mutedColor, whiteSpace: 'nowrap' }}>{getAreaDisplay(r, user?.area)}</td>
                      <td style={{ padding: '9px 8px', color: cfg.mutedColor, minWidth: 170 }}>{getSettoreDisplay(r, user)}</td>
                      <td style={{ padding: '9px 8px', color: cfg.mutedColor, minWidth: 145 }}>{faseLabel(getActiveRole(r))}</td>
                      <td style={{ padding: '9px 8px', color: cfg.mutedColor, minWidth: 165 }}>{getStatusForRecord(r, user)}</td>
                      <td style={{ padding: '9px 8px', color: cfg.mutedColor, whiteSpace: 'nowrap' }}>{formatDateTime(last)}</td>
                      <td style={{ padding: '9px 8px', color: cfg.mutedColor, textAlign: 'right', whiteSpace: 'nowrap' }}>{getGiorniFermo(r, now)}</td>
                    </tr>
                  )
                })}
                {pageRows.length === 0 && (
                  <tr><td colSpan={13} style={{ padding: 14, color: cfg.mutedColor }}>Nessuna pratica corrisponde ai filtri impostati.</td></tr>
                )}
              </tbody>
            </table>
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
