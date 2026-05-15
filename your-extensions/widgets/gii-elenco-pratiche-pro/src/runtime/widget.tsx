/** @jsx jsx */
/** @jsxFrag React.Fragment */
import {
  React,
  jsx,
  css,
  DataSourceComponent,
  DataSourceStatus,
  type DataRecord,
  type DataSource,
  DataSourceManager,
  SessionManager,
  Immutable
} from 'jimu-core'

import { Loading } from 'jimu-ui'
import type { AllWidgetProps } from 'jimu-core'
import type { IMConfig, ColumnDef } from '../config'
import { defaultConfig, DEFAULT_COLUMNS } from '../config'

type Props = AllWidgetProps<IMConfig>

function getCodPraticaDisplay(rec: DataRecord): string {
  const a: any = rec?.getData?.() || {}
  const oid =
    a?.OBJECTID ?? a?.ObjectId ?? a?.objectid ?? a?.objectId
  // 1=TR, 2=TI (se presente). Se non presente, fallback su datasource id.
  let prefix = 'TR'
  const op = a?.origine_pratica
  if (op === 2 || op === '2') prefix = 'TI'
  else if (op === 1 || op === '1') prefix = 'TR'
  else {
    const dsId = String((rec as any)?.dataSource?.id || '').toLowerCase()
    if (dsId.includes('gii_pratiche') || dsId.includes('schema') || dsId.includes('ti')) prefix = 'TI'
  }
  return oid != null ? `${prefix}-${oid}` : `${prefix}-?`
}

type SortDir = 'ASC' | 'DESC'
type SortItem = { field: string, dir: SortDir }

// Campi virtuali (ordinamento su campi calcolati)
const V_STATO = '__stato_sint__'
const V_ULTIMO = '__ultimo_agg__'
const V_PROSSIMA = '__prossima__'
const V_MITTENTE = '__mittente__'
const V_CAUSALE = '__causale__'
const V_DATA_MSG = '__data_msg__'

/** Normalizza un GlobalID: lowercase, senza graffe, trimmed */
function normGid (v: any): string {
  return String(v ?? '').trim().replace(/^\{|\}$/g, '').toLowerCase()
}

/** Legge un campo dati in modo case-insensitive */
function pickField (d: any, name: string): any {
  if (d == null) return undefined
  if (d[name] !== undefined) return d[name]
  const lc = name.toLowerCase()
  for (const k of Object.keys(d)) {
    if (k.toLowerCase() === lc) return d[k]
  }
  return undefined
}

/** Normalizza label ruolo: RI_AMM → RI-AMM, TI_AMM → TI-AMM */
function labelNorm (s: string): string {
  return String(s || '').replace(/RI_AMM/g, 'RI-AMM').replace(/TI_AMM/g, 'TI-AMM')
}

/** Formatta la causale dal codice LOG in etichetta leggibile */
function formatCausale (evento: string): string {
  const e = String(evento || '').trim().toUpperCase()
  if (!e) return '—'
  if (e === 'CREAZIONE') return 'NUOVO RAPPORTO'
  if (e === 'NUOVA_ASSEGNAZIONE') return 'NUOVA ASSEGNAZIONE'
  if (e === 'INTEGRAZIONE_TRASMESSA') return 'INTEGRAZIONE TRASMESSA'
  if (e === 'INTEGRAZIONE_RICHIESTA') return 'RICHIESTA DI INTEGRAZIONE'
  if (e === 'ISTRUTTORIA_TRASMESSA') return 'ISTRUTTORIA TRASMESSA'
  if (e === 'RAPPORTO_APPROVATO') return 'RAPPORTO APPROVATO'
  if (e === 'SANZIONE_APPROVATA') return 'SANZIONE APPROVATA'
  if (e === 'RESPINTA') return 'RESPINTA'
  if (e === 'ARCHIVIAZIONE') return 'ARCHIVIAZIONE'
  if (e === 'RIMANDA_A_DT') return 'RIMANDA A DT'
  if (e === 'PRESA_IN_CARICO') return 'PRESA IN CARICO'
  return e.replace(/_/g, ' ')
}

function num (v: any, fallback: number): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}
function txt (v: any): string {
  if (v === null || v === undefined) return ''
  return String(v)
}
function asJs<T = any> (v: any): T {
  return v?.asMutable ? v.asMutable({ deep: true }) : v
}

function parseToMs (v: any): number | null {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.getTime()
  const s = String(v)
  const t = Date.parse(s)
  return Number.isNaN(t) ? null : t
}

function formatDateIt (v: any): string {
  if (v === null || v === undefined || v === '') return ''
  let d: Date | null = null
  if (typeof v === 'number') d = new Date(v)
  else if (typeof v === 'string') {
    const t = Date.parse(v)
    if (!Number.isNaN(t)) d = new Date(t)
  } else if (v instanceof Date) d = v
  if (!d || Number.isNaN(d.getTime())) return txt(v)
  return new Intl.DateTimeFormat('it-IT', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  }).format(d)
}



type SelectedFeatureCacheEntry = {
  layerUrl: string
  oid: number
  idFieldName: string
  data: any
  ts: number
  source: 'edit' | 'list' | 'detail' | 'azioni'
}

function getSelectedFeatureCacheBucket (): Record<string, SelectedFeatureCacheEntry> {
  try {
    const w: any = window as any
    w.__giiSelectedFeatureCache = w.__giiSelectedFeatureCache || {}
    return w.__giiSelectedFeatureCache
  } catch {
    return {}
  }
}

function getSelectedFeatureCacheKey (layerUrl: string, oid: any): string {
  return `${String(layerUrl || '').trim()}::${Number(oid)}`
}

function readSelectedFeatureCache (layerUrl: string, oid: any): SelectedFeatureCacheEntry | null {
  try {
    const key = getSelectedFeatureCacheKey(layerUrl, oid)
    const bucket = getSelectedFeatureCacheBucket()
    const e: any = bucket[key]
    if (!e || !e.layerUrl || !Number.isFinite(Number(e.oid))) return null
    return e as SelectedFeatureCacheEntry
  } catch {
    return null
  }
}

function writeSelectedFeatureCache (
  layerUrl: string,
  oid: any,
  idFieldName: string,
  data: any,
  source: 'edit' | 'list' | 'detail' | 'azioni'
): SelectedFeatureCacheEntry | null {
  try {
    const oidNum = Number(oid)
    const url = String(layerUrl || '').trim()
    if (!url || !Number.isFinite(oidNum) || !data || typeof data !== 'object') return null
    const key = getSelectedFeatureCacheKey(url, oidNum)
    const bucket = getSelectedFeatureCacheBucket()
    const prev: any = bucket[key]
    const now = Date.now()
    const holdMs = 15000
    let nextData = { ...(data || {}) }
    let nextSource: 'edit' | 'list' | 'detail' | 'azioni' = source
    let nextTs = now
    if (prev && prev.source === 'edit' && source !== 'edit' && (now - Number(prev.ts || 0) < holdMs)) {
      nextData = { ...(data || {}), ...(prev.data || {}) }
      nextSource = 'edit'
      nextTs = Number(prev.ts || now)
    }
    const next: SelectedFeatureCacheEntry = {
      layerUrl: url,
      oid: oidNum,
      idFieldName: String(idFieldName || prev?.idFieldName || 'OBJECTID') || 'OBJECTID',
      data: nextData,
      ts: nextTs,
      source: nextSource
    }
    bucket[key] = next
    return next
  } catch {
    return null
  }
}

function invalidateRuntimeProxyCache (layerUrl?: string | null) {
  try {
    const url = String(layerUrl || '').trim()
    if (!url) {
      try { delete (window as any).__giiRuntimeDsProxyCache } catch {}
      return
    }
    try {
      const bucket = (window as any).__giiRuntimeDsProxyCache
      if (bucket && typeof bucket === 'object') delete bucket[url]
    } catch {}
  } catch {}
}
function getDsLabel (useDs: any, fallback: string): string {
  const localLabel = String(useDs?.__label || useDs?.label || '').trim()
  if (localLabel) return localLabel
  try {
    const ds = DataSourceManager.getInstance().getDataSource(useDs?.dataSourceId)
    const label = ds?.getLabel?.()
    return (label && String(label).trim()) ? String(label) : fallback
  } catch {
    return fallback
  }
}

function trySelectRecord (ds: any, record: DataRecord, recordId: string) {
  try { ds.selectRecordsByIds?.([recordId]) } catch {}
  try { ds.selectRecordById?.(recordId) } catch {}
  try { ds.setSelectedRecords?.([record]) } catch {}
}

function tryClearSelection (ds: any) {
  try { ds.selectRecordsByIds?.([]) } catch {}
  try { ds.clearSelection?.() } catch {}
  try { ds.setSelectedRecords?.([]) } catch {}
}

function notifySelectionCleared () {
  try {
    sessionStorage.removeItem('GII_SELECTED_OID')
    sessionStorage.removeItem('GII_SELECTED_LAYER_URL')
    sessionStorage.removeItem('GII_SELECTED_SERVICE_URL')
    sessionStorage.removeItem('GII_SELECTED_IDFIELD')
    sessionStorage.removeItem('GII_SELECTED_VIEW_NAME')
    sessionStorage.removeItem('GII_SELECTED_DATA')
    try { delete (window as any).__giiSelection } catch {}
    window.dispatchEvent(new CustomEvent('gii-selection-changed', { detail: null }))
  } catch {}
}

function compareValues (a: any, b: any): number {
  const aNull = (a === null || a === undefined || a === '')
  const bNull = (b === null || b === undefined || b === '')
  if (aNull && bNull) return 0
  if (aNull) return 1
  if (bNull) return -1

  if (typeof a === 'number' && typeof b === 'number') return a - b

  const aStr = String(a)
  const bStr = String(b)

  // date?
  const aDate = Date.parse(aStr)
  const bDate = Date.parse(bStr)
  if (!Number.isNaN(aDate) && !Number.isNaN(bDate)) return aDate - bDate

  return aStr.localeCompare(bStr, 'it', { numeric: true, sensitivity: 'base' })
}

function sortSig (s: SortItem[]): string {
  return (s || []).map(x => `${x.field}:${x.dir}`).join('|')
}

function migrateColumns (cfg: any): ColumnDef[] {
  const raw = cfg?.columns
  const cols: any[] = asJs(raw)
  if (Array.isArray(cols) && cols.length > 0) {
    return cols.map((c: any) => ({
      id: String(c.id || ''),
      label: String(c.label || ''),
      field: String(c.field || ''),
      width: num(c.width, 150)
    }))
  }
  return DEFAULT_COLUMNS.map(c => ({ ...c }))
}

/**
 * Componente figlio di DataSourceComponent — raccoglie i record e li segnala al parent.
 * Usa useEffect con signature stabile per evitare loop infiniti.
 */
function RecordTracker (p: {
  ds: DataSource
  dsId: string
  info: any
  onUpdate: (dsId: string, recs: DataRecord[], ds: DataSource, loading: boolean) => void
}) {
  const recs: DataRecord[] = (p.ds?.getRecords?.() ?? []) as DataRecord[]
  const status = p.info?.status ?? p.ds?.getStatus?.() ?? DataSourceStatus.NotReady
  const isLoading = status === DataSourceStatus.Loading

  // Signature completa: status + conteggio + JSON di tutti i valori del primo record.
  // Cattura il lazy-loading dei campi (quando i valori passano da undefined a valorizzati).
  let dataSig = ''
  if (recs.length > 0) {
    try { dataSig = JSON.stringify(recs[0].getData?.() || {}) }
    catch { dataSig = String(recs.length) }
  }
  const sig = `${status}:${recs.length}:${dataSig}`

  const prevSig = React.useRef('')
  React.useEffect(() => {
    if (sig !== prevSig.current) {
      prevSig.current = sig
      p.onUpdate(p.dsId, recs, p.ds, isLoading)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig])

  return null
}

const GII_PORTAL    = 'https://cbsm-hub.maps.arcgis.com'


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

const GII_RUNTIME_VIEWS: RuntimeDsView[] = [
  {
    key: 'ADMIN',
    // ADMIN usa l'item/vista dedicata GII_VIEW_EB_ADMIN.
    // Nota: l'endpoint REST storico dell'item espone ancora il servizio con nome GII_VIEW_EB_BASE.
    // Non è la vista AMM_ALL e non va sostituito con GII_VIEW_EB_AMM_ALL.
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

// ── LOG + Utenti: tabelle per colonne virtuali Mittente/Causale/Data msg ────
const LOG_TABLE_URL = 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_LOG_EVENTI_CICLI/FeatureServer/0'
const UTENTI_TABLE_URL = 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_utenti/FeatureServer/0'

type LogEntry = {
  utente: string       // utente_operatore (mittente)
  ruolo: string        // ruolo_competente (es. "RZ") (mittente)
  area: string         // area (es. "AGR")
  settore: string      // settore (es. "D1")
  evento: string       // evento_chiusura (causale)
  dt: number | null    // dt_chiusura (epoch ms)
  ruoloDest: string    // ruolo_destinatario (es. "RI")
  utenteDest: string   // utente_destinatario (username)
}
type UtentiEntry = {
  full_name: string
  ruolo: number | null
  ruoloCod: string
  area: number | null
  areaCod: string
  settore: number | null
  settoreCod: string
}

const AREA_FROM_CODE: Record<number, string> = { 1:'AMM', 2:'AGR', 3:'TEC' }
const SETTORE_FROM_CODE: Record<number, string> = { 1:'CR', 2:'GI', 3:'D1', 4:'D2', 5:'D3', 6:'D4', 7:'D5', 8:'D6', 9:'DS' }
const AREA_LABELS: Record<string, string> = { AMM: 'Amministrativa', AGR: 'Agraria', TEC: 'Tecnica' }
const SETTORE_LABELS: Record<string, string> = {
  CR: 'Catasto, Ruoli e Servizi Territoriali',
  GI: 'Gestione irrigua',
  D1: 'Distretto 1 – San Sperate',
  D2: 'Distretto 2 – Serramanna/Pimpisu',
  D3: 'Distretto 3 – San Gavino/Villacidro',
  D4: 'Distretto 4 – Basso Sulcis',
  D5: 'Distretto 5 – Senorbì',
  D6: 'Distretto 6 – Cixerri',
  DS: 'Manutenzione opere di dreno e di scolo'
}

const AREA_FROM_TEXT_CODE: Record<string, 'AMM' | 'AGR' | 'TEC'> = { AMM: 'AMM', AGR: 'AGR', TEC: 'TEC' }
const SETTORE_TEXT_CODES = new Set(['CR', 'GI', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'DS'])

function normalizeTextCode (v: any): string {
  return String(v ?? '').trim().toUpperCase()
}

function resolveAreaCode (area: number | null | undefined, areaCod?: any): 'AMM' | 'AGR' | 'TEC' | '' {
  const code = normalizeTextCode(areaCod)
  if (code && AREA_FROM_TEXT_CODE[code]) return AREA_FROM_TEXT_CODE[code]
  return normalizeAreaCode(area)
}

function resolveSettoreCode (settore: number | null | undefined, settoreCod?: any): string {
  const code = normalizeTextCode(settoreCod)
  if (code === 'CS') return 'DS'
  if (code && SETTORE_TEXT_CODES.has(code)) return code
  return normalizeSettoreCode(settore)
}

function resolveRoleCode (ruolo: number | null | undefined, ruoloCod?: any, ruoloLabel?: any, isAdmin?: boolean): string {
  const code = normalizeTextCode(ruoloCod || ruoloLabel)
  if (code) return code
  if (ruolo != null && RUOLO_LABEL[Number(ruolo)]) return RUOLO_LABEL[Number(ruolo)]
  return isAdmin ? 'ADMIN' : ''
}

/**
 * Formatta una persona (mittente) dal LOG nel formato:
 *   "RUOLO-SETTORE/AREA - Nome Cognome"
 * Usa area/settore dal LOG (dato storico del mittente).
 */
function formatPersona (
  ruolo: string, area: string, settore: string,
  username: string, utentiMap: Map<string, UtentiEntry> | null
): string {
  const prefix = formatRolePrefix(ruolo, area, settore)
  const uname = String(username || '').trim().toLowerCase()
  const utente = utentiMap?.get(uname)
  const nome = String(utente?.full_name || '').trim()
  return nome ? `${prefix} - ${nome}` : prefix
}

/**
 * Formatta il destinatario dal LOG.
 * Usa area/settore dal profilo del destinatario in GII_utenti (non dal LOG,
 * perché il LOG registra area/settore del mittente, non del destinatario).
 * Fallback ai valori del LOG se il destinatario non è in cache.
 */
function formatPersonaDest (
  ruoloDest: string, logArea: string, logSettore: string,
  usernameDest: string, utentiMap: Map<string, UtentiEntry> | null
): string {
  const uname = String(usernameDest || '').trim().toLowerCase()
  const destEntry = utentiMap?.get(uname)
  const destArea = destEntry ? (destEntry.areaCod || AREA_FROM_CODE[destEntry.area ?? 0] || logArea) : logArea
  const destSettore = destEntry ? (destEntry.settoreCod || SETTORE_FROM_CODE[destEntry.settore ?? 0] || logSettore) : logSettore
  const prefix = formatRolePrefix(ruoloDest, destArea, destSettore)
  const nome = String(destEntry?.full_name || '').trim()
  return nome ? `${prefix} - ${nome}` : prefix
}

// Cache globale utenti (sopravvive a re-render ma non a refresh pagina)
let _utentiMapCache: Map<string, UtentiEntry> | null = null
let _utentiMapLoading = false

// Cache dei FeatureLayer caricati: evita di ricreare/caricare lo stesso layer
// a ogni refresh dell'elenco o delle colonne virtuali.
const _loadedFeatureLayerCache: Record<string, Promise<any>> = {}

async function getLoadedFeatureLayer (url: string, outFields?: string[]): Promise<any> {
  const key = String(url || '').trim()
  if (!key) throw new Error('FeatureLayer URL non valorizzato')
  if (!_loadedFeatureLayerCache[key]) {
    _loadedFeatureLayerCache[key] = (async () => {
      const FL = await loadEsriModule<any>('esri/layers/FeatureLayer')
      const layer = new FL({ url: key, outFields: (outFields && outFields.length ? outFields : ['*']) as any })
      if (typeof layer.load === 'function') {
        try { await layer.load() } catch {}
      }
      return layer
    })()
  }
  return _loadedFeatureLayerCache[key]
}

/**
 * Formatta il prefisso ruolo nel formato standard.
 * Es: "RZ-D1", "RI-AGR", "DIR-TEC", "DIR-AMM", "TI-D1", "TI-AMM"
 */
function formatRolePrefix (roleLabel: string, areaLabel: string, settoreLabel: string): string {
  const r = roleLabel.toUpperCase()
  const a = areaLabel.toUpperCase()
  const s = settoreLabel.toUpperCase()
  switch (r) {
    case 'TR':
    case 'RZ':
      return s ? `${r}-${s}` : r
    case 'TI':
      return a === 'AMM' ? 'TI-AMM' : (s ? `TI-${s}` : 'TI')
    case 'RI':
      return a ? `RI-${a}` : 'RI'
    case 'RI_AMM':
      return 'RI-AMM'
    case 'DT':
      return a ? `DIR-${a}` : 'DIR'
    case 'DA':
      return 'DIR-AMM'
    case 'TI_AMM':
      return 'TI-AMM'
    default:
      return r || '?'
  }
}

function loadEsriModule<T = any> (path: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = (window as any).require
    if (!req) {
      reject(new Error('AMD require non disponibile'))
      return
    }
    try {
      req([path], (mod: T) => resolve(mod), (err: any) => reject(err))
    } catch (e) {
      reject(e)
    }
  })
}

function normalizeAreaCode (area: number | null | undefined): 'AMM' | 'AGR' | 'TEC' | '' {
  if (area === 1) return 'AMM'
  if (area === 2) return 'AGR'
  if (area === 3) return 'TEC'
  return ''
}

/** RI con area=AMM → RI_AMM, TI con area=AMM → TI_AMM, altrimenti invariato */
function getEffectiveRole (ruoloLabel: string, area: number | null | undefined): string {
  const r = String(ruoloLabel || '').toUpperCase()
  if (r === 'RI' && area === 1) return 'RI_AMM'
  if (r === 'TI' && area === 1) return 'TI_AMM'
  return r
}

function normalizeSettoreCode (settore: number | null | undefined): string {
  const map: Record<number, string> = { 1: 'CR', 2: 'GI', 3: 'D1', 4: 'D2', 5: 'D3', 6: 'D4', 7: 'D5', 8: 'D6', 9: 'DS' }
  return settore != null ? (map[Number(settore)] || '') : ''
}

function normalizeSearchText (v: any): string {
  return String(v ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function getFirstValue (d: any, names: string[]): any {
  for (const name of names) {
    const v = pickField(d, name)
    if (v !== null && v !== undefined && v !== '') return v
  }
  return ''
}

function getAreaCodeFromRecord (d: any, fallbackArea?: any): 'AMM' | 'AGR' | 'TEC' | '' {
  const raw = getFirstValue(d, ['area_cod', 'Area_cod', 'AREA_COD', 'area', 'Area'])
  const code = normalizeTextCode(raw || fallbackArea)
  if (AREA_FROM_TEXT_CODE[code]) return AREA_FROM_TEXT_CODE[code]
  const n = Number(raw || fallbackArea)
  return Number.isFinite(n) ? normalizeAreaCode(n) : ''
}

function getAreaDisplayFromRecord (d: any, fallbackArea?: any): string {
  const code = getAreaCodeFromRecord(d, fallbackArea)
  return AREA_LABELS[code] || code || '—'
}

function getSettoreCodeFromRecord (d: any, fallbackSettore?: any): string {
  const raw = getFirstValue(d, ['settore_cod', 'Settore_cod', 'SETTORE_COD', 'settore', 'Settore', 'id_settore'])
  const text = normalizeTextCode(raw || fallbackSettore)
  if (text === 'CS') return 'DS'
  if (SETTORE_TEXT_CODES.has(text)) return text
  const n = Number(raw || fallbackSettore)
  return Number.isFinite(n) ? normalizeSettoreCode(n) : ''
}

function getSettoreDisplayFromRecord (d: any, fallbackSettore?: any): string {
  const code = getSettoreCodeFromRecord(d, fallbackSettore)
  return SETTORE_LABELS[code] || code || '—'
}

function getDateOnlyMsFromInput (value: string, endOfDay = false): number | null {
  if (!value) return null
  const t = Date.parse(`${value}T${endOfDay ? '23:59:59' : '00:00:00'}`)
  return Number.isNaN(t) ? null : t
}

function pickReportDateMs (d: any, configuredField?: string): number | null {
  const candidates = [
    configuredField,
    'data_rilevazione', 'dt_rilevazione', 'data_rapporto', 'dt_rapporto',
    'CreationDate', 'creationDate', 'creationdate', 'CREATIONDATE'
  ].filter(Boolean) as string[]
  for (const name of candidates) {
    const ms = parseToMs(pickField(d, name))
    if (ms !== null) return ms
  }
  return null
}

function pickTecnicoIstruttore (d: any): string {
  return String(getFirstValue(d, [
    'ti_assegnato_nome', 'ti_assegnato_name', 'tecnico_istruttore', 'Tecnico_istruttore',
    'istruttore', 'Istruttore', 'ti_assegnato_username', 'ti_assegnato_user', 'ti_assegnato'
  ]) || '')
}

function pickTecnicoRilevatore (d: any): string {
  return String(getFirstValue(d, [
    'tecnico_rilevatore', 'Tecnico_rilevatore', 'TECNICO_RILEVATORE',
    'tr_nome', 'TR_nome', 'tecnico_rilevatore_nome', 'nome_tecnico_rilevatore',
    'utente_loggato', 'created_user', 'Creator', 'creator'
  ]) || '')
}

function pickPraticaSearchText (r: DataRecord, fieldPratica: string): string {
  const d = r.getData?.() || {}
  const parts = [
    getCodPraticaDisplay(r),
    pickField(d, fieldPratica),
    pickField(d, 'OBJECTID'),
    pickField(d, 'objectid'),
    pickField(d, 'objectId'),
    pickField(d, 'numero_rapporto'),
    pickField(d, 'num_rapporto')
  ]
  return normalizeSearchText(parts.filter(v => v !== null && v !== undefined && v !== '').join(' '))
}

function pickTextSearchExtra (d: any, fallbackArea?: any, fallbackSettore?: any): string {
  const parts = [
    pickTecnicoRilevatore(d),
    pickTecnicoIstruttore(d),
    getAreaDisplayFromRecord(d, fallbackArea),
    getSettoreDisplayFromRecord(d, fallbackSettore),
    getAreaCodeFromRecord(d, fallbackArea),
    getSettoreCodeFromRecord(d, fallbackSettore),
    pickField(d, 'ufficio_zona')
  ]
  return normalizeSearchText(parts.filter(Boolean).join(' '))
}

function pickComparableDisplayValue (d: any, field: string, fallbackArea?: any, fallbackSettore?: any): any {
  const f = String(field || '').toLowerCase()
  if (f === 'area' || f === 'area_cod') return getAreaDisplayFromRecord(d, fallbackArea)
  if (f === 'settore' || f === 'settore_cod' || f === 'id_settore') return getSettoreDisplayFromRecord(d, fallbackSettore)
  return pickField(d, field)
}

function pickRuntimeViewForUser (user: GiiUserInfo | null): RuntimeDsView | null {
  if (!user) return null
  const role = resolveRoleCode(user.ruolo, user.ruoloCod, user.ruoloLabel, user.isAdmin)
  const areaCode = resolveAreaCode(user.area, user.areaCod)
  const settoreCode = resolveSettoreCode(user.settore, user.settoreCod)
  if (user.isAdmin || role === 'ADMIN') {
    return GII_RUNTIME_VIEWS.find(v => v.key === 'ADMIN') || null
  }
  const strict = GII_RUNTIME_VIEWS.find(v =>
    v.roles.includes(role) &&
    v.areaCode === areaCode &&
    (v.settoreCode ? v.settoreCode === settoreCode : true)
  )
  if (strict) return strict
  return GII_RUNTIME_VIEWS.find(v => v.roles.includes(role) && v.areaCode === areaCode && !v.settoreCode) || null
}

function makeRuntimeRecord (attrs: any, idFieldName: string, sourceKey: string): DataRecord {
  const id = String(attrs?.[idFieldName] ?? attrs?.OBJECTID ?? attrs?.objectid ?? '')
  return {
    getData: () => attrs,
    getId: () => id,
    dataSource: { id: sourceKey }
  } as any
}

async function createRuntimeFeatureLayerProxy (view: RuntimeDsView, recordsRef: { current: DataRecord[] }): Promise<any> {
  const layer = await getLoadedFeatureLayer(view.layerUrl, ['*'])
  const idFieldName = String(layer?.objectIdField || 'OBJECTID')
  const schemaFields: Record<string, any> = {}
  const fields = Array.isArray(layer?.fields) ? layer.fields : []
  for (const f of fields) {
    if (!f?.name) continue
    schemaFields[String(f.name)] = { alias: String(f.alias || f.name), type: String(f.type || '') }
  }
  const query = async (q: any) => {
    const res = await layer.queryFeatures({
      where: q?.where || '1=1',
      outFields: (Array.isArray(q?.outFields) && q.outFields.length ? q.outFields : ['*']) as any,
      returnGeometry: !!q?.returnGeometry,
      num: q?.pageSize || q?.num || undefined
    })
    const recs = (res?.features || []).map((f: any) => {
      const attrs = f?.attributes || {}
      const oidVal = Number(attrs?.[idFieldName] ?? attrs?.OBJECTID ?? attrs?.objectid)
      if (Number.isFinite(oidVal)) {
        try { writeSelectedFeatureCache(view.layerUrl, oidVal, idFieldName, attrs, 'list') } catch {}
      }
      return makeRuntimeRecord(attrs, idFieldName, view.layerUrl)
    })
    recordsRef.current = recs
    return { records: recs }
  }
  return {
    id: `runtime:${view.key}`,
    getIdField: () => idFieldName,
    getSchema: () => ({ fields: schemaFields, idField: idFieldName }),
    getLabel: () => view.viewName,
    getRecords: () => recordsRef.current,
    getLayer: () => layer,
    getJSAPILayer: () => layer,
    getJsApiLayer: () => layer,
    layer,
    query,
    getDataSourceJson: () => ({ url: view.layerUrl })
  }
}

function publishRuntimeSelection (p: { oid: number, layerUrl: string, serviceUrl: string, idFieldName: string, viewName: string, data?: any }) {
  try {
    sessionStorage.setItem('GII_SELECTED_OID', String(p.oid))
    sessionStorage.setItem('GII_SELECTED_LAYER_URL', p.layerUrl)
    sessionStorage.setItem('GII_SELECTED_SERVICE_URL', p.serviceUrl)
    sessionStorage.setItem('GII_SELECTED_IDFIELD', p.idFieldName)
    sessionStorage.setItem('GII_SELECTED_VIEW_NAME', p.viewName)
    try { sessionStorage.removeItem('GII_SELECTED_DATA') } catch {}
    if (p.data && typeof p.data === 'object') {
      try { writeSelectedFeatureCache(p.layerUrl, p.oid, p.idFieldName, p.data, 'list') } catch {}
    }
    const nextSel: any = {
      oid: p.oid,
      layerUrl: p.layerUrl,
      serviceUrl: p.serviceUrl,
      idFieldName: p.idFieldName,
      viewName: p.viewName,
      ts: Date.now()
    }
    try { (window as any).__giiSelection = nextSel } catch {}
    window.dispatchEvent(new CustomEvent('gii-selection-changed', { detail: nextSel }))
  } catch {}
}


// Best-effort: prova a capire se l'utente è amministratore AGOL (org_admin),
// anche quando l'Header non valorizza isAdmin.
function inferIsOrgAdminFromSession (): boolean {
  try {
    const sm = SessionManager.getInstance()
    const session: any = sm?.getMainSession?.() || sm?.getSessionByUrl?.(GII_PORTAL)
    const role =
      session?.user?.role ??
      session?.userInfo?.role ??
      session?.portalUser?.role ??
      session?.portal?.user?.role ??
      session?.portal?.userInfo?.role ??
      session?.portalSelf?.user?.role ??
      session?.portalSelf?.user?.userRole ??
      session?.userRole

    if (role) {
      const r = String(role).toLowerCase()
      if (r.includes('admin')) return true
    }

    const priv =
      session?.user?.privileges ??
      session?.userInfo?.privileges ??
      session?.portalUser?.privileges ??
      session?.portal?.user?.privileges ??
      session?.portal?.userInfo?.privileges

    if (Array.isArray(priv)) {
      const p = priv.map(x => String(x).toLowerCase())
      if (p.some(x => x.includes('portal:admin') || x.includes('portal:administrator') || x.includes('orgadmin') || x.includes('administrator'))) {
        return true
      }
    }

    if (session?.isAdmin === true) return true
  } catch {}
  return false
}

function computeDsMetaSig (useDsList: any[]): string {
  try {
    return (useDsList || []).map((u: any) => {
      const dsId = String(u?.dataSourceId || '')
      const ds = DataSourceManager.getInstance().getDataSource(dsId)
      const label = String(ds?.getLabel?.() || '')
      const j: any = ds?.getDataSourceJson?.() || (ds as any)?.dataSourceJson
      const url = String(j?.url || '')
      return `${dsId}|${label}|${url}`
    }).join('||')
  } catch {
    return ''
  }
}

function getServiceKeyFromDataSourceId (dsId: string): string {
  try {
    const ds = DataSourceManager.getInstance().getDataSource(dsId)
    const j: any = ds?.getDataSourceJson?.() || (ds as any)?.dataSourceJson
    const url = String(j?.url || '')
    const part = url.split('/rest/services/')[1] || ''
    const name = (part.split('/FeatureServer')[0] || '').trim()
    if (name) return name.toUpperCase()
    const lbl = String(ds?.getLabel?.() || '').trim()
    return lbl ? lbl.toUpperCase() : dsId
  } catch {
    return dsId
  }
}

function getRecordUniqKey (rec: DataRecord, dsId: string, svcCache: Map<string, string>): string {
  const svc = svcCache.get(dsId) || (svcCache.set(dsId, getServiceKeyFromDataSourceId(dsId)), svcCache.get(dsId)!)
  const d: any = rec?.getData?.() || {}
  const gid = d?.GlobalID ?? d?.globalid ?? d?.globalId ?? d?.GLOBALID ?? null
  if (gid !== null && gid !== undefined && String(gid).trim() !== '') return `GID|${String(gid).trim()}`
  const oid = d?.OBJECTID ?? d?.ObjectId ?? d?.objectid ?? d?.objectId ?? null
  if (oid !== null && oid !== undefined && String(oid).trim() !== '') return `${svc}|OID|${String(oid).trim()}`
  const rid = (rec as any)?.getId?.() || (rec as any)?.id || ''
  return `${svc}|RID|${String(rid)}`
}

// Mappa codice ruolo numerico → label (dal widget gestione utenti)
const RUOLO_LABEL: Record<number, string> = {
  1: 'TR', 2: 'TI', 3: 'RZ', 4: 'RI', 5: 'DT', 6: 'DA', 7: 'ADMIN'
}

// Gerarchia priorità per utenti con gruppi multipli (es. admin)
const RUOLO_PRIORITY: Record<number, number> = {
  6: 100, // DA  (massima priorità)
  5: 90,  // DT
  4: 80,  // RI
  3: 70,  // RZ
  2: 60,  // TI
  1: 10   // TR
}

// ── Mappa ruolo/area/settore → dataSourceId consentito ─────────────────────
// Codici domini (numerici):
//   AREA: AMM=1, AGR=2, TEC=3
//   SETTORE: CR=1,GI=2,D1=3,D2=4,D3=5,D4=6,D5=7,D6=8,DS=9
//   RUOLO: TR=1,TI=2,RZ=3,RI=4,DT=5,DA=6
function getAllowedDataSourceIds(
  user: { ruolo: number|null, ruoloCod?: string, ruoloLabel?: string, area: number|null, areaCod?: string, settore: number|null, settoreCod?: string, isAdmin: boolean } | null,
  useDsList: any[]
): string[] | null {
  if (!user) return null

  // Helper: label (titolo) del datasource, normalizzato
  const getLabel = (useDs: any): string => {
    try {
      const ds = DataSourceManager.getInstance().getDataSource(String(useDs?.dataSourceId || ''))
      const label = ds?.getLabel?.()
      return String(label || '')
    } catch { return '' }
  }
  const norm = (s: string) => String(s || '').toUpperCase()

  const AREA_CODE: Record<number, string> = { 1:'AMM', 2:'AGR', 3:'TEC' }
  const SETTORE_CODE: Record<number, string> = { 1:'CR', 2:'GI', 3:'D1', 4:'D2', 5:'D3', 6:'D4', 7:'D5', 8:'D6', 9:'DS' }

  const areaCode = resolveAreaCode(user.area, (user as any).areaCod) || ((user.area != null ? AREA_CODE[user.area] : '') || '')
  const settoreCode = resolveSettoreCode(user.settore, (user as any).settoreCod) || ((user.settore != null ? SETTORE_CODE[user.settore] : '') || '')
  const ruolo = user.ruolo

  const roots = (arr: any[]) => Array.from(new Set(arr.map(u => String(u?.rootDataSourceId || u?.dataSourceId || '')).filter(Boolean)))

  // Admin: preferisci la vista EB_ADMIN (se presente), altrimenti non filtrare
  if (user.isAdmin) {
    const adminMatches = useDsList.filter(u => {
      const L = norm(getLabel(u))
      return L.includes('GII_VIEW_EB_ADMIN') || L.includes('VIEW_EB_ADMIN') || L.includes('_EB_ADMIN') || L.includes('EB_ADMIN')
    })
    const r = roots(adminMatches)
    return r.length ? r : null
  }

  const isEB = (L: string) => L.includes('GII_VIEW_EB_') || L.includes('VIEW_EB_') || L.includes('_EB_')

  // Match "strict" (settore per AGR per TR/TI/RZ, e "tutte" per RI/DT/DA)
  const matchesStrict = useDsList.filter(u => {
    const L = norm(getLabel(u))
    if (!isEB(L)) return false
    if (L.includes('EB_ADMIN')) return false
    if (areaCode && !L.includes(`EB_${areaCode}`)) return false

    if (ruolo != null && ruolo >= 1 && ruolo <= 3) {
      if (areaCode === 'AGR') return settoreCode ? L.includes(`_${settoreCode}`) : true
      return true
    }

    if (ruolo != null && ruolo >= 4 && ruolo <= 6) {
      if (areaCode === 'AGR') return (L.includes('TUTTE') || L.includes('TUTTI') || (!L.includes('_D1') && !L.includes('_D2') && !L.includes('_D3') && !L.includes('_D4') && !L.includes('_D5') && !L.includes('_D6')))
      return true
    }
    return true
  })

  // Loose fallback: qualunque vista EB della stessa area (escluso ADMIN)
  const matchesLoose = matchesStrict.length ? matchesStrict : useDsList.filter(u => {
    const L = norm(getLabel(u))
    if (!isEB(L)) return false
    if (L.includes('EB_ADMIN')) return false
    return areaCode ? L.includes(`EB_${areaCode}`) : true
  })

  const ids = roots(matchesLoose)
  // Se non riusciamo a determinare alcuna vista coerente (label non ancora pronta / nomi non standard),
  // NON filtriamo: lasciamo che sia la condivisione AGOL a fare da guardia.
  return ids.length ? ids : null
}

// ── Selezione DS “singolo” (evita duplicati e mismatch) ───────────────────
// Sceglie UNA vista tra quelle collegate, basandosi sul nome servizio nella URL
// (più stabile del label e degli id interni dataSource_XX).
function pickBestUseDataSourceId(
  user: { ruolo: number | null, ruoloCod?: string, ruoloLabel?: string, area: number | null, areaCod?: string, settore: number | null, settoreCod?: string, gruppo?: string, isAdmin: boolean } | null,
  useDsList: any[]
): string | null {
  if (!user || !Array.isArray(useDsList) || useDsList.length === 0) return null

  const up = (s: any) => String(s || '').toUpperCase()
  const AREA_CODE: Record<number, string> = { 1: 'AMM', 2: 'AGR', 3: 'TEC' }
  const SETTORE_CODE: Record<number, string> = { 1: 'CR', 2: 'GI', 3: 'D1', 4: 'D2', 5: 'D3', 6: 'D4', 7: 'D5', 8: 'D6', 9: 'DS' }

  const areaCode = resolveAreaCode(user.area, (user as any).areaCod) || ((user.area != null ? AREA_CODE[user.area] : '') || '')
  const settoreCode = resolveSettoreCode(user.settore, (user as any).settoreCod) || ((user.settore != null ? SETTORE_CODE[user.settore] : '') || '')
  const ruolo = user.ruolo
  const ruoloLabel = up((user as any)?.ruoloCod || (user as any)?.ruoloLabel)
  const gruppo = up((user as any)?.gruppo)

  const getServiceName = (useDs: any): string => {
    try {
      const ds = DataSourceManager.getInstance().getDataSource(String(useDs?.dataSourceId || ''))
      const j: any = (ds as any)?.getDataSourceJson?.() || (ds as any)?.dataSourceJson
      const url = String(j?.url || '')
      const part = url.split('/rest/services/')[1] || ''
      const name = part.split('/FeatureServer')[0] || ''
      return up(name)
    } catch {
      return ''
    }
  }

  // Fallback su label del DataSource (utile in preview/prime render quando la URL non è ancora pronta)
  const getLabelUp = (useDs: any): string => up(getDsLabel(useDs, ''))

  const items = useDsList.map(u => ({ dsId: String(u?.dataSourceId || ''), name: getServiceName(u) }))
  const findBy = (pred: (n: string) => boolean) => {
    const hit = items.find(x => x.dsId && x.name && pred(x.name))
    return hit?.dsId || null
  }

  // “Admin applicativo”: org_admin oppure ruolo DA/DT/RI oppure gruppo contiene ADMIN.
  const isAppAdmin = user.isAdmin || ruolo === 7 || ruoloLabel === 'ADMIN' || ruoloLabel === 'DA' || ruoloLabel === 'DT' || ruoloLabel === 'RI' || ruoloLabel === 'RI_AMM' || gruppo.includes('ADMIN')
  if (isAppAdmin) {
    const dsAdmin = findBy(n => n.includes('EB_ADMIN') || n.includes('GII_VIEW_EB_ADMIN') || n.includes('VIEW_EB_ADMIN'))
    if (dsAdmin) return dsAdmin

    // Fallback: se il serviceName non è ancora disponibile (preview/prime render),
    // prova a riconoscere la vista ADMIN dal *label* del DataSource.
    const hitByLabel = useDsList.find(u => {
      const L = getLabelUp(u)
      return L.includes('EB_ADMIN') || L.includes('GII_VIEW_EB_ADMIN') || L.includes('VIEW_EB_ADMIN') || L.includes('_EB_ADMIN')
    })
    if (hitByLabel?.dataSourceId) return String(hitByLabel.dataSourceId)
  }

  // area+settore
  if (areaCode) {
    if (settoreCode) {
      const dsAreaSett = findBy(n => n.includes(`EB_${areaCode}_${settoreCode}`) || n.includes(`_${areaCode}_${settoreCode}`))
      if (dsAreaSett) return dsAreaSett
    }
    // viste "TUTTE" per ruoli superiori
    if (ruolo != null && ruolo >= 4 && ruolo <= 6) {
      const dsTutte = findBy(n => n.includes(`EB_${areaCode}_TUTTE`) || n.includes(`EB_${areaCode}_TUTTI`))
      if (dsTutte) return dsTutte
    }
    const dsArea = findBy(n => n.includes(`EB_${areaCode}`) || n.includes(`_${areaCode}`))
    if (dsArea) return dsArea
  }

  // fallback admin view
  if (isAppAdmin) {
    const dsAdminFallback = findBy(n => n.includes('EB_ADMIN') || n.includes('GII_VIEW_EB_ADMIN') || n.includes('VIEW_EB_ADMIN'))
    if (dsAdminFallback) return dsAdminFallback

    const hitByLabel = useDsList.find(u => {
      const L = getLabelUp(u)
      return L.includes('EB_ADMIN') || L.includes('GII_VIEW_EB_ADMIN') || L.includes('VIEW_EB_ADMIN') || L.includes('_EB_ADMIN')
    })
    if (hitByLabel?.dataSourceId) return String(hitByLabel.dataSourceId)
  }

  // Se non troviamo match affidabili, evitiamo di forzare un singolo DS “a caso”.
  // Lasciamo al widget la gestione multi-DS (tabs) o i filtri allowedDsIds.
  return items.length === 1 ? (items[0]?.dsId || null) : null
}

interface GiiUserInfo {
  username: string
  ruolo: number | null       // codice numerico legacy (1-7)
  ruoloCod: string           // codice testuale ufficiale: TR/TI/RZ/RI/DT/DA/ADMIN
  ruoloLabel: string         // compatibilità: coincide col codice ruolo
  area: number | null        // codice numerico legacy
  areaCod: 'AMM' | 'AGR' | 'TEC' | ''
  settore: number | null     // codice numerico legacy
  settoreCod: string
  ufficio: number | null
  gruppo: string
  isAdmin: boolean           // org_admin AGOL o admin workflow
}

// Legge il profilo utente caricato dall'Header (unica fonte).
function readGiiUserFromHeader(): GiiUserInfo | null {
  const cached: any = (window as any).__giiUserRole
  if (!cached?.username) return null

  const ruolo = cached.ruolo != null ? Number(cached.ruolo) : null
  const gruppo = String(cached.gruppo || '')
  const inferredAdmin = inferIsOrgAdminFromSession()
  const inferredAppAdmin = gruppo.toUpperCase().includes('ADMIN')
  const isWorkflowAdmin = (ruolo === 7) || (String(cached.ruoloLabel || '').toUpperCase() === 'ADMIN') || !!cached.isWorkflowAdmin
  const isAdmin = !!cached.isAdmin || inferredAdmin || inferredAppAdmin || isWorkflowAdmin

  const area = cached.area != null ? Number(cached.area) : null
  const settore = cached.settore != null ? Number(cached.settore) : null
  const areaCod = resolveAreaCode(area, cached.areaCod ?? cached.area_cod)
  const settoreCod = resolveSettoreCode(settore, cached.settoreCod ?? cached.settore_cod)
  const ruoloCod = resolveRoleCode(ruolo, cached.ruoloCod ?? cached.ruolo_cod, cached.ruoloLabel, isAdmin)
  let ruoloLabel = ruoloCod || String(cached.ruoloLabel || '')

  // Non forziamo più 'AMM': il ruolo workflow resta quello reale.
  // Se è un admin (org_admin o workflow admin) senza ruolo esplicito, mostriamo 'ADMIN'.
  if ((!ruoloLabel || !ruoloLabel.trim()) && isAdmin) ruoloLabel = 'ADMIN'

  return {
    username: String(cached.username),
    ruolo,
    ruoloCod: ruoloCod || ruoloLabel,
    ruoloLabel,
    area,
    areaCod,
    settore,
    settoreCod,
    ufficio: cached.ufficio != null ? Number(cached.ufficio) : null,
    gruppo,
    isAdmin
  }
}

// Verifica rapida: esiste un utente autenticato (senza chiamate di rete)
function isSignedInNow(): boolean {
  try {
    const sm = SessionManager.getInstance()
    const session: any = sm?.getMainSession?.() || sm?.getSessionByUrl?.(GII_PORTAL)
    const u = session?.username || session?.userId || ''
    return !!u
  } catch { return false }
}

// Determina il campo stato del ruolo corrente
function getStatoFieldForRuolo(ruoloLabel: string): string {
  const r = ruoloLabel.toUpperCase()
  if (r === 'TR') return 'stato_TR'
  if (r === 'TI') return 'stato_TI'
  if (r === 'RZ') return 'stato_RZ'
  if (r === 'RI') return 'stato_RI'
  if (r === 'DT') return 'stato_DT'
  if (r === 'DA') return 'stato_DA'
  if (r === 'RI_AMM') return 'stato_RI_AMM'
  if (r === 'TI_AMM') return 'stato_TI_AMM'
  return 'stato_DT' // fallback
}

// Priorità ordinamento: In attesa mia (0,1,3) prima, poi In lavorazione (2), poi altri
function getPriorityForStato(statoVal: number | null): number {
  if (statoVal === 0 || statoVal === 1 || statoVal === 3) return 0  // In attesa mia → in cima
  if (statoVal === 2) return 1                                       // In lavorazione
  if (statoVal === 4) return 2                                       // Trasmesso
  if (statoVal === 5) return 3                                       // Respinto
  return 4                                                            // null / altri
}

export default function Widget (props: Props) {
  const cfg: any = (props.config ?? defaultConfig) as any

  const useDsImm: any = props.useDataSources ?? Immutable([])
  const useDsJs: any[] = asJs(useDsImm)

  // ── Rilevamento ruolo utente loggato ──────────────────────────────────────
  const [giiUser, setGiiUser] = React.useState<GiiUserInfo | null>(null)
  const [userLoading, setUserLoading] = React.useState(true)
  // notLogged: true quando non c'è utente autenticato → overlay bloccante
  const [notLogged, setNotLogged] = React.useState(false)

  // Firma metadata datasource (label/url) per ricalcolare bestDsId quando ExB popola i datasource
  const [dsMetaSig, setDsMetaSig] = React.useState('')


  // --- Selection bridge boot reset ---
  // La selezione NON deve persistere tra refresh/riapertura pagina.
  // Facciamo il reset UNA sola volta per page-load qui nell'Elenco (source of truth),
  // cosi Azioni non mostra mai il record precedente quando l'Elenco non ha selezione.
  React.useEffect(() => {
    try {
      const w: any = window as any
      if (w.__giiSelBootCleared) return
      w.__giiSelBootCleared = true
    } catch {}
    notifySelectionCleared()
  }, [])

// ── Bootstrap contesto utente (solo dall'Header) ─────────────────────────
React.useEffect(() => {
  let cancelled = false

  const apply = () => {
    if (cancelled) return

    const u = readGiiUserFromHeader()
    if (u) {
      setGiiUser(u)
      setNotLogged(false)
      setUserLoading(false)
      return
    }

    // Nessun profilo dall'Header:
    // - non autenticato → overlay "Accesso richiesto"
    // - autenticato ma profilo non ancora pronto → resta in loading
    if (!isSignedInNow()) {
      setGiiUser(null)
      setNotLogged(true)
      setUserLoading(false)
    } else {
      setGiiUser(null)
      setNotLogged(false)
      setUserLoading(true)
    }
  }

  apply()
  window.addEventListener('gii:userLoaded', apply)
  return () => {
    cancelled = true
    window.removeEventListener('gii:userLoaded', apply)
  }
}, [])

// Vista runtime effettiva per la sessione corrente
  const resolvedView = React.useMemo(
    () => giiUser ? pickRuntimeViewForUser(giiUser) : null,
    [giiUser?.username, giiUser?.ruoloLabel, giiUser?.area, giiUser?.settore, giiUser?.isAdmin]
  )

  const filteredUseDsJs: any[] = React.useMemo(() => {
    if (!resolvedView) return []
    return [{
      dataSourceId: resolvedView.layerUrl,
      mainDataSourceId: resolvedView.layerUrl,
      rootDataSourceId: resolvedView.serviceUrl,
      __label: resolvedView.viewName
    }]
  }, [resolvedView?.layerUrl, resolvedView?.serviceUrl, resolvedView?.viewName])

  const statoRuoloField = giiUser?.isAdmin
    ? null
    : giiUser?.ruoloLabel
      ? getStatoFieldForRuolo(getEffectiveRole(giiUser.ruoloLabel, giiUser.area))
      : null

  // ── Tab ruolo: Tutte / In attesa mia / In attesa di altri ────────────────────
  const ROLE_TABS = [
    { id: 'tutte',        label: 'Tutte le pratiche' },
    { id: 'attesa_mia',   label: 'In attesa mia' },
    { id: 'attesa_altri', label: 'In attesa di altri' },
  ]
  const [activeRoleTab, setActiveRoleTab] = React.useState<string>('tutte')

  // Funzione filtro per tab ruolo
  const passesRoleTab = React.useCallback((r: DataRecord, tabId: string): boolean => {
    if (!statoRuoloField || tabId === 'tutte') return true
    const role = getEffectiveRole(giiUser?.ruoloLabel || '', giiUser?.area)

    const d = r.getData?.() || {}
    const val = d[statoRuoloField]
    const n = val != null ? Number(val) : null

    // Default: come prima
    const isAttesaMiaDefault = (n === 0 || n === 1 || n === 3)
    const isAttesaAltriDefault = (n === 2 || n === 4)

    // Caso TI/TI_AMM: n===2 ("presa in carico") e' *mia* se assegnata al TI loggato.
    if ((role === 'TI' || role === 'TI_AMM') && n === 2) {
      const tiUser = String(d['ti_assegnato_username'] ?? d['ti_assegnato_user'] ?? d['ti_assegnato'] ?? '').trim()
      const tiName = String(d['ti_assegnato_nome'] ?? d['ti_assegnato_name'] ?? '').trim()

      const meUser = String(giiUser?.username || '').trim()
      const meName = String((giiUser as any)?.fullName ?? (giiUser as any)?.nome ?? (giiUser as any)?.displayName ?? '').trim()

      const eq = (a: string, b: string) => !!a && !!b && a.toLowerCase() === b.toLowerCase()
      const isMine = eq(tiUser, meUser) || eq(tiName, meUser) || (meName ? eq(tiName, meName) : false)

      if (tabId === 'attesa_mia') return isMine
      if (tabId === 'attesa_altri') return !isMine
    }

    if (role === 'RZ') {
      const tiInfo = getTiIstruttoriaInfo(d)
      if (tiInfo.isInTiIstruttoria) {
        if (tabId === 'attesa_mia') return false
        if (tabId === 'attesa_altri') return true
      }
    }

    if (tabId === 'attesa_mia') return isAttesaMiaDefault
    if (tabId === 'attesa_altri') return isAttesaAltriDefault
    return true
  }, [statoRuoloField, giiUser?.ruoloLabel, giiUser?.area, giiUser?.username])



  const equalsUser = React.useCallback((a: any, b: any): boolean => {
    const sa = String(a ?? '').trim().toLowerCase()
    const sb = String(b ?? '').trim().toLowerCase()
    return !!sa && !!sb && sa == sb
  }, [])

  const isRecordVisibleForCurrentUser = React.useCallback((r: DataRecord): boolean => {
    if (giiUser?.isAdmin) return true
    const role = getEffectiveRole(giiUser?.ruoloLabel || '', giiUser?.area)
    if (!role) return true

    const d: any = r.getData?.() || {}

    // Rapporti archiviati (GII_arch = 1) non visibili negli elenchi ordinari
    const archVal = d['GII_arch'] ?? d['gii_arch'] ?? d['GII_ARCH']
    if (archVal !== null && archVal !== undefined && archVal !== '' && Number(archVal) === 1) return false

    // DA e ruoli AMM (RI AMM, TI AMM): vedono solo i Rapporti entrati in fase sanzionatoria.
    // area=1 → AMM
    const areaNum = giiUser?.area ?? null
    const isAmmArea = areaNum === 1
    // DA, RI_AMM, TI_AMM: vedono solo i Rapporti entrati in fase sanzionatoria.
    if (role === 'DA' || role === 'RI_AMM' || role === 'TI_AMM' || (isAmmArea && (role === 'RI' || role === 'TI'))) {
      if (!isInFaseSanzionatoria(d)) return false
      // TI_AMM: vede solo le pratiche a lui assegnate (come TI vede solo le sue)
      if (role === 'TI_AMM') {
        const meUser = String(giiUser?.username || '').trim()
        const tiAmmUser = String(d['ti_amm_assegnato_username'] ?? '').trim()
        const tiAmmName = String(d['ti_amm_assegnato_nome'] ?? '').trim()
        if (!tiAmmUser && !tiAmmName) return false  // non ancora assegnata
        return equalsUser(tiAmmUser, meUser) || equalsUser(tiAmmName, meUser)
      }
      return true
    }

    if (role === 'TI') {
      const meUser = String(giiUser?.username || '').trim()
      const meName = String((giiUser as any)?.fullName ?? (giiUser as any)?.nome ?? (giiUser as any)?.displayName ?? '').trim()
      const opRaw = d['origine_pratica']
      const opNum = opRaw !== null && opRaw !== undefined && opRaw !== '' ? Number(opRaw) : null

      const tiUser = String(d['ti_assegnato_username'] ?? d['ti_assegnato_user'] ?? d['ti_assegnato'] ?? '').trim()
      const tiName = String(d['ti_assegnato_nome'] ?? d['ti_assegnato_name'] ?? '').trim()
      const assignedToMe = equalsUser(tiUser, meUser) || equalsUser(tiName, meUser) || (meName ? equalsUser(tiName, meName) : false)

      const creatorVals = [
        d['created_user'], d['Creator'], d['creator'], d['username'], d['user_name'],
        d['utente'], d['utente_ins'], d['created_by'], d['submitter'], d['owner']
      ]
      const createdByMe = creatorVals.some(v => equalsUser(v, meUser) || (meName ? equalsUser(v, meName) : false))

      const hasTiWorkflow = hasRuoloData(d, 'TI')

      // Origine TR: i TI non devono vedere la pratica finché RZ non assegna.
      // E dopo l'assegnazione la vede solo il TI assegnatario.
      if (opNum === 1) {
        if (!tiUser && !tiName && !hasTiWorkflow) return false
        if (tiUser || tiName) return assignedToMe
        return false
      }

      // Origine TI: la vede il TI originatore; se poi viene esplicitamente assegnata,
      // prevale comunque l'assegnazione nominativa.
      if (opNum === 2) {
        if (tiUser || tiName) return assignedToMe
        if (createdByMe) return true
        return hasTiWorkflow
      }
    }

    return true
  }, [giiUser, equalsUser])

  const filterByRoleTab = React.useCallback((recs: DataRecord[]): DataRecord[] => {
    if (!statoRuoloField || activeRoleTab === 'tutte') return recs
    return recs.filter(r => passesRoleTab(r, activeRoleTab))
  }, [statoRuoloField, activeRoleTab, passesRoleTab])

// Ordinamento priorità ruolo: in attesa mia sempre in cima
  const sortByRolePriority = React.useCallback((recs: DataRecord[]): DataRecord[] => {
    if (!statoRuoloField) return recs
    return [...recs].sort((ra, rb) => {
      const da = ra.getData?.() || {}
      const db = rb.getData?.() || {}
      const pa = getPriorityForStato(da[statoRuoloField] != null ? Number(da[statoRuoloField]) : null)
      const pb = getPriorityForStato(db[statoRuoloField] != null ? Number(db[statoRuoloField]) : null)
      return pa - pb
    })
  }, [statoRuoloField])

  // ── Un solo tab effettivo per sessione: la vista runtime scelta dal contesto utente ──
  const tabGroups = React.useMemo(() => {
    if (!resolvedView) return [] as { label: string; dsIndices: number[] }[]
    return [{ label: resolvedView.viewName, dsIndices: [0] }]
  }, [resolvedView?.viewName])

  const hasTabs = false
  const [activeTab, setActiveTab] = React.useState<number>(0)

  // ── Raccolta record dalla sola vista runtime di sessione ──
  const [localSelectedByDs, setLocalSelectedByDs] = React.useState<Record<string, string>>({})
  const dsDataRef = React.useRef<Record<string, { recs: DataRecord[], ds: DataSource | null, loading: boolean }>>({})
  const runtimeRecordsRef = React.useRef<DataRecord[]>([])
  const prevUserRef = React.useRef<string>('')
  const [dsDataVer, setDsDataVer] = React.useState(0)

  React.useEffect(() => {
    const cur = giiUser?.username || ''
    const prev = prevUserRef.current
    if (cur === prev) return
    prevUserRef.current = cur
    runtimeRecordsRef.current = []
    dsDataRef.current = {}
    setLocalSelectedByDs({})
    notifySelectionCleared()
  }, [giiUser?.username])

  const whereClause = txt(cfg.whereClause || '1=1')
  const pageSize = num(cfg.pageSize, 200)
  const isReady = !notLogged && !userLoading && !!giiUser?.username

  const [listRefreshNonce, setListRefreshNonce] = React.useState(0)
  const [lastListRefreshAt, setLastListRefreshAt] = React.useState<number | null>(null)
  React.useEffect(() => {
    const h = () => setListRefreshNonce(n => n + 1)
    window.addEventListener('gii-force-refresh-selection', h as any)
    return () => window.removeEventListener('gii-force-refresh-selection', h as any)
  }, [])

  React.useEffect(() => {
    let cancelled = false
    const load = async () => {
      const key = resolvedView?.layerUrl || '__none__'
      if (!resolvedView || !isReady) {
        runtimeRecordsRef.current = []
        dsDataRef.current[key] = { recs: [], ds: null as any, loading: false }
        setDsDataVer(v => v + 1)
        return
      }

      dsDataRef.current[key] = { recs: [], ds: null as any, loading: true }
      setDsDataVer(v => v + 1)

      try {
        const proxy = await createRuntimeFeatureLayerProxy(resolvedView, runtimeRecordsRef as any)
        const res: any = await proxy.query({ where: whereClause, outFields: ['*'], returnGeometry: false, pageSize })
        if (cancelled) return
        const recs: DataRecord[] = (res?.records || []) as DataRecord[]
        dsDataRef.current[key] = { recs, ds: proxy, loading: false }
        setLastListRefreshAt(Date.now())
        try {
          const w = window as any
          w.__giiRuntimeDsProxyCache = w.__giiRuntimeDsProxyCache || {}
          w.__giiRuntimeDsProxyCache[resolvedView.layerUrl] = proxy
        } catch {}
      } catch {
        if (cancelled) return
        dsDataRef.current[key] = { recs: [], ds: null as any, loading: false }
        setLastListRefreshAt(Date.now())
      }
      if (!cancelled) setDsDataVer(v => v + 1)
    }
    load()
    return () => { cancelled = true }
  }, [resolvedView?.layerUrl, resolvedView?.viewName, isReady, whereClause, pageSize, listRefreshNonce])

  // ── Enrichment: GII_LOG_EVENTI_CICLI + GII_utenti (colonne virtuali Mittente/Causale/Data) ──
  const logMapRef = React.useRef<Map<string, LogEntry>>(new Map())
  const [logVer, setLogVer] = React.useState(0)
  const utentiMapRef = React.useRef<Map<string, UtentiEntry> | null>(_utentiMapCache)
  const lastLogGidSigRef = React.useRef('')
  const logLoadedRef = React.useRef(false)

  // Carica GII_utenti UNA volta (cache globale)
  React.useEffect(() => {
    if (_utentiMapCache) { utentiMapRef.current = _utentiMapCache; return }
    if (_utentiMapLoading) return
    _utentiMapLoading = true
    ;(async () => {
      try {
        const layer = await getLoadedFeatureLayer(UTENTI_TABLE_URL)
        const res = await layer.queryFeatures({
          where: '1=1',
          outFields: ['username', 'full_name', 'ruolo', 'ruolo_cod', 'area', 'area_cod', 'settore', 'settore_cod'],
          returnGeometry: false
        })
        const map = new Map<string, UtentiEntry>()
        for (const f of (res?.features || [])) {
          const a = f?.attributes
          if (a?.username) {
            map.set(String(a.username).trim().toLowerCase(), {
              full_name: String(a.full_name || ''),
              ruolo: a.ruolo ?? null,
              ruoloCod: resolveRoleCode(a.ruolo ?? null, a.ruolo_cod),
              area: a.area ?? null,
              areaCod: resolveAreaCode(a.area ?? null, a.area_cod),
              settore: a.settore ?? null,
              settoreCod: resolveSettoreCode(a.settore ?? null, a.settore_cod)
            })
          }
        }
        _utentiMapCache = map
        utentiMapRef.current = map
        // Ri-trigger render per aggiornare mittente con nomi
        setLogVer(v => v + 1)
      } catch (ex) {
        console.warn('[GII-Elenco] Errore caricamento GII_utenti:', ex)
      } finally {
        _utentiMapLoading = false
      }
    })()
  }, [])

  // Carica GII_LOG_EVENTI_CICLI quando cambia il set di record (dsDataVer)
  React.useEffect(() => {
    // Raccogli tutti i GlobalID dai record caricati
    const gids: string[] = []
    for (const key of Object.keys(dsDataRef.current)) {
      const entry = dsDataRef.current[key]
      if (!entry?.recs) continue
      for (const r of entry.recs) {
        const d = r.getData?.() || {} as any
        const gid = d.GlobalID ?? d.globalid ?? d.globalId ?? d.GLOBALID
        if (gid) gids.push(normGid(gid))
      }
    }
    const sig = gids.sort().join(',')
    if (sig === lastLogGidSigRef.current) return
    lastLogGidSigRef.current = sig
    logLoadedRef.current = false

    if (!gids.length) {
      // Non svuotare logMap se i dati stanno ancora caricando (transizione refresh)
      const anyLoading = Object.values(dsDataRef.current).some((e: any) => e?.loading)
      if (!anyLoading) {
        logMapRef.current = new Map()
        logLoadedRef.current = true
        setLogVer(v => v + 1)
      }
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const layer = await getLoadedFeatureLayer(LOG_TABLE_URL)

        const map = new Map<string, LogEntry>()
        const chunks: string[][] = []
        // Chunk in gruppi da 50 GlobalID per evitare limiti URL
        for (let i = 0; i < gids.length; i += 50) chunks.push(gids.slice(i, i + 50))

        const results = await Promise.all(chunks.map(async chunk => {
          if (cancelled) return [] as any[]
          const inClause = chunk.map(g => `'${g.replace(/'/g, "''")}'`).join(',')
          const res = await layer.queryFeatures({
            where: `parent_globalid IN (${inClause}) AND stato_record = 'CHIUSO'`,
            outFields: ['parent_globalid', 'utente_operatore', 'ruolo_competente', 'area', 'settore', 'evento_chiusura', 'dt_chiusura', 'ruolo_destinatario', 'utente_destinatario'],
            orderByFields: ['dt_chiusura DESC'],
            returnGeometry: false
          })
          return (res?.features || []) as any[]
        }))

        if (cancelled) return
        for (const features of results) {
          for (const f of features) {
            const a = f?.attributes
            const pgid = normGid(a?.parent_globalid)
            // Primo per ogni parent_globalid (ordinato DESC = più recente)
            if (pgid && !map.has(pgid)) {
              const dtRaw = a?.dt_chiusura
              const dtMs = dtRaw ? (typeof dtRaw === 'number' ? dtRaw : Date.parse(String(dtRaw))) : null
              map.set(pgid, {
                utente: String(a?.utente_operatore || ''),
                ruolo: String(a?.ruolo_competente || ''),
                area: String(a?.area || ''),
                settore: String(a?.settore || ''),
                evento: String(a?.evento_chiusura || ''),
                dt: (dtMs && Number.isFinite(dtMs)) ? dtMs : null,
                ruoloDest: String(a?.ruolo_destinatario || ''),
                utenteDest: String(a?.utente_destinatario || '')
              })
            }
          }
        }
        if (!cancelled) {
          logMapRef.current = map
          logLoadedRef.current = true
          setLogVer(v => v + 1)
        }
      } catch (ex) {
        console.warn('[GII-Elenco] Errore caricamento GII_LOG_EVENTI_CICLI:', ex)
        logLoadedRef.current = true
      }
    })()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dsDataVer])

  // Helper: leggi log entry per un record
  const getLogForRecord = React.useCallback((d: any): LogEntry | null => {
    const gid = d?.GlobalID ?? d?.globalid ?? d?.globalId ?? d?.GLOBALID
    if (!gid) return null
    return logMapRef.current.get(normGid(gid)) || null
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logVer])

  // Sort: array (ordinamento multiplo con clic sulle intestazioni)
  const defaultSort: SortItem[] = React.useMemo(() => {
    const f = txt(cfg.orderByField || 'objectid')
    const d = (txt(cfg.orderByDir || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC') as SortDir
    return [{ field: f, dir: d }]
  }, [cfg.orderByField, cfg.orderByDir])

  const [sortState, setSortState] = React.useState<SortItem[]>(defaultSort)

  // ── Filtri integrati nell'elenco ─────────────────────────────────────────────
  const [searchFilter, setSearchFilter] = React.useState('')
  const [areaFilter, setAreaFilter] = React.useState('tutte')
  const [settoreFilter, setSettoreFilter] = React.useState('tutte')
  const [fromDateFilter, setFromDateFilter] = React.useState('')
  const [toDateFilter, setToDateFilter] = React.useState('')
  const [statoFilter, setStatoFilter] = React.useState('tutte')

  // Se cambia il sort default da settings, riallineo SOLO se l'utente non ha un custom sort
  React.useEffect(() => {
    const isCustom = sortSig(sortState) !== sortSig(defaultSort)
    if (!isCustom) setSortState(defaultSort)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortSig(defaultSort)])

  // ── Record fusi per il tab attivo ──
  const clampedTab = Math.min(activeTab, Math.max(0, tabGroups.length - 1))
  const activeGroup = tabGroups[clampedTab] || tabGroups[0]


  // Campi base
  const fieldPratica = txt(cfg.fieldPratica || 'objectid')
  const fieldDataRil = txt(cfg.fieldDataRilevazione || 'data_rilevazione')
  const fieldUfficio = txt(cfg.fieldUfficio || 'ufficio_zona')

  // Nota: i campi DT/DA sono ora acceduti direttamente tramite nome convenzionale
  // (es. `stato_DT`, `presa_in_carico_DA`, ...) dentro computeSintetico/computeUltimoAggMs.

  const presaDaPrendere = num(cfg.presaDaPrendereVal, 1)
  const presaPresa = num(cfg.presaPresaVal, 2)

  const statoDaPrendere = num(cfg.statoDaPrendereVal, 1)
  const statoPresa = num(cfg.statoPresaVal, 2)
  const statoIntegrazione = num(cfg.statoIntegrazioneVal, 3)
  const statoApprovata = num(cfg.statoApprovataVal, 4)
  const statoRespinta = num(cfg.statoRespintaVal, 5)

  const esitoIntegrazione = num(cfg.esitoIntegrazioneVal, 1)
  const esitoApprovata = num(cfg.esitoApprovataVal, 2)
  const esitoRespinta = num(cfg.esitoRespintaVal, 3)

  const labelStato = (v: any): string => {
    const n = Number(v)
    if (!Number.isFinite(n)) return txt(v)
    if (n === statoDaPrendere) return txt(cfg.labelStatoDaPrendere || 'Da prendere')
    if (n === statoPresa) return txt(cfg.labelStatoPresa || 'Presa in carico')
    if (n === statoIntegrazione) return txt(cfg.labelStatoIntegrazione || 'Integrazione richiesta')
    if (n === statoApprovata) return txt(cfg.labelStatoApprovata || 'Approvata')
    if (n === statoRespinta) return txt(cfg.labelStatoRespinta || 'Respinta')
    return String(n)
  }

  const labelEsito = (v: any): string => {
    const n = Number(v)
    if (!Number.isFinite(n)) return txt(v)
    if (n === esitoIntegrazione) return txt(cfg.labelEsitoIntegrazione || 'Integrazione richiesta')
    if (n === esitoApprovata) return txt(cfg.labelEsitoApprovata || 'Approvata')
    if (n === esitoRespinta) return txt(cfg.labelEsitoRespinta || 'Respinta')
    return String(n)
  }

  // ── Chip colors — label-driven, colori da config ─────────────────────────
  const CHIP_YELLOW  = { background: txt(cfg.chipBgGiallo    || '#feeb22'), color: txt(cfg.chipTextGiallo    || '#5a4000'), borderColor: txt(cfg.chipBorderGiallo    || '#c9b800') }
  const CHIP_BLUE    = { background: txt(cfg.chipBgAzzurro   || '#2f6fed'), color: txt(cfg.chipTextAzzurro   || '#ffffff'), borderColor: txt(cfg.chipBorderAzzurro   || '#1d4ed8') }
  const CHIP_GREEN   = { background: txt(cfg.chipBgVerde     || '#009246'), color: txt(cfg.chipTextVerde     || '#ffffff'), borderColor: txt(cfg.chipBorderVerde     || '#006b33') }
  const CHIP_CELESTE = { background: txt(cfg.chipBgCeleste   || '#7dd3fc'), color: txt(cfg.chipTextCeleste   || '#0c4a6e'), borderColor: txt(cfg.chipBorderCeleste   || '#38bdf8') }
  const CHIP_ORANGE  = { background: txt(cfg.chipBgArancione || '#ff6400'), color: txt(cfg.chipTextArancione || '#ffffff'), borderColor: txt(cfg.chipBorderArancione || '#cc5000') }
  const CHIP_RED     = { background: txt(cfg.chipBgRosso     || '#dc2626'), color: txt(cfg.chipTextRosso     || '#ffffff'), borderColor: txt(cfg.chipBorderRosso     || '#991b1b') }
  const CHIP_LILAC   = { background: txt(cfg.chipBgLilla     || '#faf5ff'), color: txt(cfg.chipTextLilla     || '#6b21a8'), borderColor: txt(cfg.chipBorderLilla     || '#d8b4fe') }
  const CHIP_PURPLE  = { background: txt(cfg.chipBgViola     || '#ede9fe'), color: txt(cfg.chipTextViola     || '#4c1d95'), borderColor: txt(cfg.chipBorderViola     || '#a78bfa') }
  const CHIP_NEUTRAL = { background: txt(cfg.chipBgNeutro    || '#f2f2f2'), color: txt(cfg.chipTextNeutro    || '#333333'), borderColor: txt(cfg.chipBorderNeutro    || '#d0d0d0') }

  const getChipStyleByLabel = (label: string) => {
    const l = String(label || '').toLowerCase()
    if (l.startsWith('da prendere'))            return CHIP_YELLOW
    if (l.startsWith('in carico'))              return CHIP_CELESTE
    if (l.startsWith('trasmesso'))              return CHIP_BLUE
    if (l.startsWith('in attesa di'))           return CHIP_ORANGE
    if (l.startsWith('integrazioni richieste') || l.startsWith('integrazione richiesta'))  return CHIP_ORANGE
    if (l.startsWith('integrazion'))            return CHIP_ORANGE
    if (l.startsWith('sanzione approvata'))     return CHIP_PURPLE
    if (l.startsWith('approvato'))              return CHIP_GREEN
    if (l.startsWith('respint'))                return CHIP_RED
    if (l.startsWith('eliminat'))               return CHIP_RED
    if (l.startsWith('verbale notificato'))     return CHIP_PURPLE
    if (l.startsWith('verbale trasmesso'))      return CHIP_GREEN
    if (l.startsWith('verbale da trasmettere')) return CHIP_LILAC
    if (l.includes('in corso di istruttoria'))  return CHIP_NEUTRAL
    return CHIP_NEUTRAL
  }

  // Mantenuta per compatibilità con eventuali usi interni residui
  const getChipStyle = (statoNum: number | null) => {
    if (statoNum === statoDaPrendere)   return CHIP_YELLOW
    if (statoNum === statoPresa)        return CHIP_CELESTE
    if (statoNum === statoIntegrazione) return CHIP_ORANGE
    if (statoNum === statoApprovata)    return CHIP_GREEN
    if (statoNum === statoRespinta)     return CHIP_RED
    return CHIP_NEUTRAL
  }

  // converte esito (1..3) in "stato visuale" per chip (3/4/5)
  const statoNumFromEsito = (esito: number): number => {
    if (esito === esitoIntegrazione) return statoIntegrazione
    if (esito === esitoApprovata) return statoApprovata
    if (esito === esitoRespinta) return statoRespinta
    return statoApprovata
  }

  // Verifica se un ruolo ha dati valorizzati (presa/stato/esito con campo generico)
  const hasRuoloData = (d: any, role: string): boolean => {
    const p = d[`presa_in_carico_${role}`]
    const s = d[`stato_${role}`]
    const e = d[`esito_${role}`]
    return (p !== null && p !== undefined && p !== '')
      || (s !== null && s !== undefined && s !== '')
      || (e !== null && e !== undefined && e !== '')
  }

  const getRoleLastTouchMs = (d: any, role: string): number | null => {
    const vals = [
      parseToMs(d[`dt_presa_in_carico_${role}`]),
      parseToMs(d[`dt_stato_${role}`]),
      parseToMs(d[`dt_esito_${role}`])
    ].filter((v): v is number => v !== null)
    return vals.length ? Math.max(...vals) : null
  }

  // ── Determina se il Rapporto è entrato in fase sanzionatoria ─────────────
  // Indicatore: DT ha approvato e rimandato a RI (esito_DT = ESITO_APPROVATA),
  // oppure il DA ha già ricevuto il verbale.
  // NB: questo threshold è l'unico rilevabile in modo affidabile nel modello dati
  // corrente, dove RI_AMM e TI_AMM condividono i campi nominali con RI e TI.
  const isInFaseSanzionatoria = (d: any): boolean => {
    const meaningful = (v: any) => v !== null && v !== undefined && v !== '' && v !== 0 && v !== '0'
    // Fase sanzionatoria = qualsiasi campo AMM valorizzato
    return meaningful(d['stato_RI_AMM']) || meaningful(d['esito_RI_AMM']) ||
           meaningful(d['stato_TI_AMM']) || meaningful(d['esito_TI_AMM']) ||
           meaningful(d['stato_DA'])     || meaningful(d['esito_DA'])
  }

  // Destinatario di trasmissione positiva per ruolo — dipende dal contesto del record.
  // DT approva e trasmette direttamente a RI_AMM (attiva fase sanzionatoria).
  // RI_AMM punta a TI_AMM in prima assegnazione, a DA dopo che TI_AMM ha restituito.
  // DT approva e trasmette direttamente a RI_AMM (avvia fase sanzionatoria).
  // DA approva e trasmette a TI_AMM (per verbale/PEC).
  const getFwdDest = (role: string, d: any): string => {
    switch (role) {
      case 'TI':     return 'RZ'
      case 'RZ':     return 'RI'
      case 'RI':     return 'DT'
      case 'DT':     return 'RI_AMM'
      case 'RI_AMM': {
        const esitoTiAmm = pickField(d, 'esito_TI_AMM')
        const n = esitoTiAmm !== null && esitoTiAmm !== undefined && esitoTiAmm !== '' ? Number(esitoTiAmm) : null
        return (n !== null) ? 'DA' : 'TI_AMM'
      }
      case 'TI_AMM': return 'RI_AMM'
      case 'DA':     return 'TI_AMM'
      default:       return ''
    }
  }

  // Destinatario di richiesta integrazioni per ruolo
  const getIntegDest = (role: string): string => {
    switch (role) {
      case 'RZ':     return 'TI'
      case 'RI':     return 'TI'
      case 'DT':     return 'RI'
      case 'RI_AMM': return 'RI'
      case 'TI_AMM': return 'RI_AMM'
      case 'DA':     return 'RI_AMM'
      default:       return ''
    }
  }

  // Calcola lo stato storico di un ruolo specifico su questo record.
  // Restituisce null se il ruolo non ha ancora dati (non è ancora stato coinvolto).
  const computeStatoStorico = (d: any, ruolo: string): { label: string, statoForChip: number | null } | null => {
    if (!hasRuoloData(d, ruolo)) return null
    const presaRaw = d[`presa_in_carico_${ruolo}`]
    const statoRaw = d[`stato_${ruolo}`]
    const esitoRaw = d[`esito_${ruolo}`]
    const presaNum = presaRaw !== null && presaRaw !== undefined && presaRaw !== '' ? Number(presaRaw) : null
    const statoNum = statoRaw !== null && statoRaw !== undefined && statoRaw !== '' ? Number(statoRaw) : null
    const esitoNum = esitoRaw !== null && esitoRaw !== undefined && esitoRaw !== '' ? Number(esitoRaw) : null

    if (esitoNum !== null && Number.isFinite(esitoNum)) {
      if (esitoNum === esitoApprovata) {
        if (ruolo === 'DT') return { label: 'Approvato', statoForChip: statoApprovata }
        if (ruolo === 'DA') return { label: 'Sanzione approvata', statoForChip: statoApprovata }
        const dest = getFwdDest(ruolo, d)
        if (dest) return { label: 'Trasmesso', statoForChip: statoApprovata }
      }
      if (esitoNum === esitoIntegrazione) {
        const dest = getIntegDest(ruolo)
        return { label: 'Integrazioni richieste', statoForChip: statoIntegrazione }
      }
      if (esitoNum === esitoRespinta) {
        return { label: 'Respinto', statoForChip: statoRespinta }
      }
      return { label: `${labelEsito(esitoNum)}`, statoForChip: statoNumFromEsito(esitoNum) }
    }
    if (statoNum !== null && Number.isFinite(statoNum)) {
      if (statoNum === statoDaPrendere)   return { label: 'Trasmesso', statoForChip: statoDaPrendere }
      if (statoNum === statoPresa)        return { label: 'In carico', statoForChip: statoPresa }
      if (statoNum === statoApprovata) {
        if (ruolo === 'DT') return { label: 'Approvato', statoForChip: statoApprovata }
        if (ruolo === 'DA') return { label: 'Sanzione approvata', statoForChip: statoApprovata }
        const dest = getFwdDest(ruolo, d)
        if (dest) return { label: 'Trasmesso', statoForChip: statoApprovata }
        return { label: 'Approvato', statoForChip: statoApprovata }
      }
      if (statoNum === statoIntegrazione) return { label: 'In attesa di integrazioni', statoForChip: statoIntegrazione }
      if (statoNum === statoRespinta)     return { label: 'Respinto', statoForChip: statoRespinta }
      return { label: `${labelStato(statoNum)}`, statoForChip: statoNum }
    }
    if (presaNum !== null && Number.isFinite(presaNum)) {
      if (presaNum === presaDaPrendere) return { label: 'Trasmesso', statoForChip: statoDaPrendere }
      if (presaNum === presaPresa)      return { label: 'In carico', statoForChip: statoPresa }
    }
    return { label: 'In carico', statoForChip: null }
  }

  const getTiIstruttoriaInfo = (d: any) => {
    const tiUser = String(d['ti_assegnato_username'] ?? d['ti_assegnato_user'] ?? d['ti_assegnato'] ?? '').trim()
    const higherTouched = hasRuoloData(d, 'RI') || hasRuoloData(d, 'DT') || hasRuoloData(d, 'DA')

    const statoTiRaw = d['stato_TI'] ?? d['stato_ti']
    const presaTiRaw = d['presa_in_carico_TI'] ?? d['presa_in_carico_ti']
    const esitoTiRaw = d['esito_TI'] ?? d['esito_ti']

    const statoTiNum = statoTiRaw !== null && statoTiRaw !== undefined && statoTiRaw !== '' ? Number(statoTiRaw) : null
    const presaTiNum = presaTiRaw !== null && presaTiRaw !== undefined && presaTiRaw !== '' ? Number(presaTiRaw) : null
    const esitoTiNum = esitoTiRaw !== null && esitoTiRaw !== undefined && esitoTiRaw !== '' ? Number(esitoTiRaw) : null

    const tiReturned =
      (esitoTiNum !== null && Number.isFinite(esitoTiNum)) ||
      (statoTiNum === statoApprovata) ||
      (statoTiNum === statoRespinta)

    const tiLastTouchMs = getRoleLastTouchMs(d, 'TI')
    const rzLastTouchMs = getRoleLastTouchMs(d, 'RZ')
    const awaitingRetakeByRz =
      !!tiUser &&
      tiReturned &&
      !higherTouched &&
      tiLastTouchMs !== null &&
      (rzLastTouchMs === null || rzLastTouchMs <= tiLastTouchMs)

    return {
      hasAssignedTi: !!tiUser,
      tiUser,
      higherTouched,
      statoTiNum,
      presaTiNum,
      esitoTiNum,
      tiReturned,
      tiLastTouchMs,
      rzLastTouchMs,
      awaitingRetakeByRz,
      isInTiIstruttoria: !!tiUser && !higherTouched && !tiReturned
    }
  }

  // ── computeSintetico: workflow-aware su tutti i ruoli ──────────────────────
  //
  // Logica:
  //   - Scansiona i ruoli dal più avanzato (DA) al meno avanzato (TR)
  //   - Il primo ruolo con dati valorizzati è il "nodo corrente"
  //   - presa=1 (DA PRENDERE) → il Rapporto è stato trasmesso ma non ancora preso in carico
  //     → "Trasmesso a [ruolo]"  chip arancio
  //   - presa=2 (PRESA) o stato=presa → il ruolo ci sta lavorando
  //     → "Preso in carico [ruolo]"  chip verde
  //
  // Rapporti senza nessun campo workflow:
  //   origine=1 (TR) → implicitamente trasmesso a RZ → "Da prendere in carico RZ"  chip arancio
  //   origine=2 (TI) → TI l'ha creato, non ancora trasmesso → "Da trasmettere a RZ"  chip verde

  const computeSintetico = (d: any): { ruolo: string, label: string, statoForChip: number | null } => {
    const scanOrder = ['DA', 'TI_AMM', 'RI_AMM', 'DT', 'RI', 'RZ', 'TI', 'TR']

    // Caso speciale: assegnazione RZ -> TI.
    // Finche' TI non "restituisce" la pratica, lo stato sintetico segue
    // le voci del file xlsx sul tratto RZ -> TI.
    const tiInfo = getTiIstruttoriaInfo(d)
    if (tiInfo.awaitingRetakeByRz) {
      return { ruolo: 'RZ', label: 'Trasmesso', statoForChip: statoDaPrendere }
    }
    if (tiInfo.hasAssignedTi && tiInfo.isInTiIstruttoria) {
      // TI origine=2 che non ha ancora trasmesso a RZ → "Da trasmettere"
      const opRaw = d['origine_pratica']
      const isOrigineTi = (opRaw === 2 || opRaw === '2')
      const rzNeverTouched = !hasRuoloData(d, 'RZ')
      if (isOrigineTi && rzNeverTouched) {
        return { ruolo: 'TI', label: 'In carico', statoForChip: statoPresa }
      }
      if (tiInfo.statoTiNum !== null && Number.isFinite(tiInfo.statoTiNum)) {
        if (tiInfo.statoTiNum === statoDaPrendere) {
          return { ruolo: 'TI', label: 'Da prendere in carico', statoForChip: statoDaPrendere }
        }
        if (tiInfo.statoTiNum === statoPresa) {
          return { ruolo: 'TI', label: 'In carico', statoForChip: statoPresa }
        }
        return { ruolo: 'TI', label: 'In carico', statoForChip: null }
      }
      if (tiInfo.presaTiNum !== null && Number.isFinite(tiInfo.presaTiNum)) {
        if (tiInfo.presaTiNum === presaDaPrendere) {
          return { ruolo: 'TI', label: 'Da prendere in carico', statoForChip: statoDaPrendere }
        }
        if (tiInfo.presaTiNum === presaPresa) {
          return { ruolo: 'TI', label: 'In carico', statoForChip: statoPresa }
        }
      }
      return { ruolo: 'TI', label: 'Trasmesso', statoForChip: statoDaPrendere }
    }

    // fwdDest e integDest sono ora funzioni dinamiche (dipendono dal record d)

    for (const role of scanOrder) {
      if (!hasRuoloData(d, role)) continue

      const presaRaw = d[`presa_in_carico_${role}`]
      const statoRaw = d[`stato_${role}`]
      const esitoRaw = d[`esito_${role}`]

      const presaNum = presaRaw !== null && presaRaw !== undefined && presaRaw !== '' ? Number(presaRaw) : null
      const statoNum = statoRaw !== null && statoRaw !== undefined && statoRaw !== '' ? Number(statoRaw) : null
      const esitoNum = esitoRaw !== null && esitoRaw !== undefined && esitoRaw !== '' ? Number(esitoRaw) : null

      if (esitoNum !== null && Number.isFinite(esitoNum)) {
        if (esitoNum === esitoApprovata) {
          // Fix F: DT approval → "Approvato" (generic label; displaySintetico overrides per-role)
          if (role === 'DT') return { ruolo: 'DT', label: 'Approvato', statoForChip: statoApprovata }
          if (role === 'DA') return { ruolo: 'DA', label: 'Sanzione approvata', statoForChip: statoApprovata }
          const dest = getFwdDest(role, d)
          if (dest) {
            if (hasRuoloData(d, dest)) {
              // Fix E: se il ruolo corrente è stato riattivato (stato=DA_PRENDERE/PRESA),
              // significa un nuovo ciclo — esito è vecchio, non fare continue
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
            const destEsitoRaw = d[`esito_${dest}`]
            const destEsitoNum = destEsitoRaw !== null && destEsitoRaw !== undefined && destEsitoRaw !== '' ? Number(destEsitoRaw) : null
            if (destEsitoNum == null) {
              if (hasRuoloData(d, dest)) {
                const destStatoRaw = d[`stato_${dest}`]
                const destStatoNum = destStatoRaw !== null && destStatoRaw !== undefined && destStatoRaw !== '' ? Number(destStatoRaw) : null
                if (destStatoNum === statoDaPrendere) return { ruolo: dest, label: 'Trasmesso', statoForChip: statoDaPrendere }
                if (destStatoNum === statoPresa)      return { ruolo: dest, label: 'In carico', statoForChip: statoPresa }
              }
              return { ruolo: dest, label: 'Trasmesso', statoForChip: statoDaPrendere }
            }
            // Fix E: dest ha risposto, ma se il ruolo corrente è stato riattivato, non continuare
            if (statoNum === statoDaPrendere) return { ruolo: role, label: 'Trasmesso', statoForChip: statoDaPrendere }
            if (statoNum === statoPresa) return { ruolo: role, label: 'In carico', statoForChip: statoPresa }
            continue
          }
        }
        return { ruolo: role, label: `${labelEsito(esitoNum)}`, statoForChip: statoNumFromEsito(esitoNum) }
      }

      if (statoNum !== null && Number.isFinite(statoNum)) {
        if (statoNum === statoDaPrendere) {
          return { ruolo: role, label: 'Trasmesso', statoForChip: statoDaPrendere }
        }
        if (statoNum === statoPresa) {
          return { ruolo: role, label: 'In carico', statoForChip: statoPresa }
        }
        if (statoNum === statoApprovata) {
          const dest = getFwdDest(role, d)
          if (dest) {
            if (hasRuoloData(d, dest)) continue
            return { ruolo: dest, label: 'Trasmesso', statoForChip: statoDaPrendere }
          }
        }
        if (statoNum === statoIntegrazione) {
          return { ruolo: role, label: 'In attesa di integrazioni', statoForChip: statoIntegrazione }
        }
        if (statoNum === statoRespinta) {
          return { ruolo: role, label: 'Respinto', statoForChip: statoRespinta }
        }
        return { ruolo: role, label: `${labelStato(statoNum)}`, statoForChip: statoNum }
      }

      if (presaNum !== null && Number.isFinite(presaNum)) {
        if (presaNum === presaDaPrendere) {
          return { ruolo: role, label: 'Trasmesso', statoForChip: statoDaPrendere }
        }
        if (presaNum === presaPresa) {
          return { ruolo: role, label: 'In carico', statoForChip: statoPresa }
        }
      }

      // Ha dati ma valore non riconosciuto
      return { ruolo: role, label: 'In carico', statoForChip: null }
    }

    // Nessun campo workflow → Rapporto appena creato
    const op = d['origine_pratica']
    const opNum = op !== null && op !== undefined && op !== '' ? Number(op) : null
    if (opNum === 2) {
      // TI ha creato il Rapporto, non ancora trasmesso a RZ
      return { ruolo: 'TI', label: 'In carico', statoForChip: statoPresa }
    }
    // origine=1 (TR) o non valorizzato: implicitamente trasmesso a RZ
    return { ruolo: 'RZ', label: 'Da prendere in carico', statoForChip: statoDaPrendere }
  }

  // ── computeUltimoAggMs: considera timestamp di TUTTI i ruoli ──────────────
  const computeUltimoAggMs = (d: any): number | null => {
    const roles = ['TR', 'TI', 'RZ', 'RI', 'DT', 'DA', 'RI_AMM', 'TI_AMM']
    const candidates: number[] = []
    for (const role of roles) {
      const p = parseToMs(d[`dt_presa_in_carico_${role}`])
      const s = parseToMs(d[`dt_stato_${role}`])
      const e = parseToMs(d[`dt_esito_${role}`])
      if (p !== null) candidates.push(p)
      if (s !== null) candidates.push(s)
      if (e !== null) candidates.push(e)
    }
    if (candidates.length === 0) return null
    return Math.max(...candidates)
  }

  const getSortValue = (r: DataRecord, field: string): any => {
    const d = r.getData?.() || {}
    if (field === V_STATO) return computeSintetico(d).label
    if (field === V_ULTIMO) return computeUltimoAggMs(d)
    if (field === V_PROSSIMA) {
      const log = getLogForRecord(d)
      return log?.ruoloDest ? formatPersonaDest(log.ruoloDest, log.area, log.settore, log.utenteDest, utentiMapRef.current) : ''
    }
    if (field === V_MITTENTE) {
      const log = getLogForRecord(d)
      return log ? formatPersona(log.ruolo, log.area, log.settore, log.utente, utentiMapRef.current) : ''
    }
    if (field === V_CAUSALE) {
      const log = getLogForRecord(d)
      return log?.evento || ''
    }
    if (field === V_DATA_MSG) {
      const log = getLogForRecord(d)
      return log?.dt ?? 0
    }
    return d[field]
  }

  const sortRecords = (recs: DataRecord[], sort: SortItem[]): DataRecord[] => {
    if (!sort || sort.length === 0) return recs
    const copy = [...recs]
    copy.sort((ra, rb) => {
      for (const s of sort) {
        const da = ra.getData?.() || {}
        const db = rb.getData?.() || {}
        const a = pickComparableDisplayValue(da, s.field, giiUser?.areaCod || giiUser?.area, giiUser?.settoreCod || giiUser?.settore) ?? getSortValue(ra, s.field)
        const b = pickComparableDisplayValue(db, s.field, giiUser?.areaCod || giiUser?.area, giiUser?.settoreCod || giiUser?.settore) ?? getSortValue(rb, s.field)
        const cmp = compareValues(a, b)
        if (cmp !== 0) return (s.dir === 'ASC' ? cmp : -cmp)
      }
      return 0
    })
    return copy
  }

  const passesIntegratedFilters = React.useCallback((r: DataRecord): boolean => {
    const d = r.getData?.() || {}
    const q = normalizeSearchText(searchFilter)
    const areaCode = getAreaCodeFromRecord(d, giiUser?.areaCod || giiUser?.area)
    const settoreCode = getSettoreCodeFromRecord(d, giiUser?.settoreCod || giiUser?.settore)
    const dateMs = pickReportDateMs(d, fieldDataRil)
    const fromMs = getDateOnlyMsFromInput(fromDateFilter)
    const toMs = getDateOnlyMsFromInput(toDateFilter, true)
    const statoLabel = computeSintetico(d).label

    if (q) {
      const searchText = `${pickPraticaSearchText(r, fieldPratica)} ${pickTextSearchExtra(d, giiUser?.areaCod || giiUser?.area, giiUser?.settoreCod || giiUser?.settore)}`
      if (!searchText.includes(q)) return false
    }
    if (areaFilter !== 'tutte' && areaCode !== areaFilter) return false
    if (settoreFilter !== 'tutte' && settoreCode !== settoreFilter) return false
    if (fromMs !== null && (dateMs === null || dateMs < fromMs)) return false
    if (toMs !== null && (dateMs === null || dateMs > toMs)) return false
    if (statoFilter !== 'tutte' && statoLabel !== statoFilter) return false
    return true
  }, [searchFilter, areaFilter, settoreFilter, fromDateFilter, toDateFilter, statoFilter, giiUser?.areaCod, giiUser?.area, giiUser?.settoreCod, giiUser?.settore, fieldPratica, fieldDataRil])

  const toggleSort = (field: string) => {
    setSortState(prev => {
      const p = [...prev]
      const idx = p.findIndex(x => x.field === field)

      // Ordinamento multiplo sempre attivo, come nel CW utenti:
      // 1° clic = crescente, 2° clic = decrescente, 3° clic = rimuove la colonna dal sort.
      if (idx >= 0) {
        const cur = p[idx]
        if (cur.dir === 'ASC') {
          p[idx] = { field, dir: 'DESC' }
          return p
        }
        p.splice(idx, 1)
        return p.length ? p : defaultSort
      }

      return [...p, { field, dir: 'ASC' }]
    })
  }

  const isCustomSort = sortSig(sortState) !== sortSig(defaultSort)

  const resetIntegratedFilters = React.useCallback(() => {
    setSearchFilter('')
    setAreaFilter('tutte')
    setSettoreFilter('tutte')
    setFromDateFilter('')
    setToDateFilter('')
    setStatoFilter('tutte')
  }, [])

  const hasIntegratedFilters = !!(
    searchFilter.trim() ||
    areaFilter !== 'tutte' ||
    settoreFilter !== 'tutte' ||
    fromDateFilter ||
    toDateFilter ||
    statoFilter !== 'tutte'
  )

  const clearAllSelections = React.useCallback(() => {
    setLocalSelectedByDs({})
    Object.keys(dsDataRef.current).forEach(id => {
      const e = dsDataRef.current[id]
      if (e?.ds) tryClearSelection(e.ds)
    })
    filteredUseDsJs.forEach((u: any) => {
      const dsId = String(u?.dataSourceId || '')
      try {
        const mainDs = DataSourceManager.getInstance().getDataSource(dsId)
        if (mainDs) tryClearSelection(mainDs)
        const parentId = (mainDs as any)?.parentDataSource?.id || (mainDs as any)?.getMainDataSource?.()?.id
        if (parentId) {
          const parentDs = DataSourceManager.getInstance().getDataSource(parentId)
          if (parentDs) tryClearSelection(parentDs)
        }
      } catch {}
    })
    notifySelectionCleared()
  }, [filteredUseDsJs])

  // ── Record fusi per il tab attivo, prima dei filtri integrati ─────────────
  const roleTabRecs = React.useMemo(() => {
    if (!activeGroup) return [] as DataRecord[]
    const svcCache = new Map<string, string>()
    const uniq = new Map<string, DataRecord>()
    for (const di of activeGroup.dsIndices) {
      const dsId = String(filteredUseDsJs[di]?.dataSourceId || '')
      const entry = dsDataRef.current[dsId]
      if (entry?.recs) {
        for (const r of entry.recs) {
          const k = getRecordUniqKey(r, dsId, svcCache)
          if (!uniq.has(k)) uniq.set(k, r)
        }
      }
    }
    const allUniq: DataRecord[] = Array.from(uniq.values())
    const visibleForUser = allUniq.filter(r => isRecordVisibleForCurrentUser(r))
    return filterByRoleTab(visibleForUser)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroup, dsDataVer, activeRoleTab, statoRuoloField, isRecordVisibleForCurrentUser, logVer])

  const filteredRecs = React.useMemo(() => {
    return roleTabRecs.filter(r => passesIntegratedFilters(r))
  }, [roleTabRecs, passesIntegratedFilters])

  const areeDisponibili = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const r of roleTabRecs) {
      const d = r.getData?.() || {}
      const code = getAreaCodeFromRecord(d, giiUser?.areaCod || giiUser?.area)
      if (code) map.set(code, AREA_LABELS[code] || code)
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
  }, [roleTabRecs, giiUser?.areaCod, giiUser?.area])

  const settoriDisponibili = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const r of roleTabRecs) {
      const d = r.getData?.() || {}
      const code = getSettoreCodeFromRecord(d, giiUser?.settoreCod || giiUser?.settore)
      if (code) map.set(code, SETTORE_LABELS[code] || code)
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1], 'it', { numeric: true, sensitivity: 'base' }))
  }, [roleTabRecs, giiUser?.settoreCod, giiUser?.settore])

  const statiDisponibili = React.useMemo(() => {
    const set = new Set<string>()
    for (const r of roleTabRecs) {
      const d = r.getData?.() || {}
      const lbl = computeSintetico(d).label
      if (lbl) set.add(lbl)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'it', { numeric: true, sensitivity: 'base' }))
  }, [roleTabRecs])

  // ── Record fusi, filtrati e ordinati per il tab attivo ──────────────────────
  const mergedRecs = React.useMemo(() => {
    const withPriority = sortByRolePriority(filteredRecs)
    return sortRecords(withPriority, sortState)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredRecs, sortState, sortByRolePriority, logVer])

  // Lookup: record → dsId (via WeakMap su identità oggetto, sopravvive al sort)
  const recDsLookup = React.useMemo(() => {
    const map = new WeakMap<DataRecord, string>()
    if (!activeGroup) return map
    for (const di of activeGroup.dsIndices) {
      const dsId = String(filteredUseDsJs[di]?.dataSourceId || '')
      const entry = dsDataRef.current[dsId]
      if (entry?.recs) {
        for (const r of entry.recs) map.set(r, dsId)
      }
    }
    return map
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroup, dsDataVer])

  React.useEffect(() => {
    const selectedPairs = Object.entries(localSelectedByDs || {})
    if (!selectedPairs.length) return
    const stillVisible = selectedPairs.some(([dsId, rid]) =>
      mergedRecs.some(r => (recDsLookup.get(r) || '') === dsId && String(r.getId?.() ?? '') === String(rid))
    )
    if (!stillVisible) clearAllSelections()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mergedRecs, recDsLookup])

  const ultimoIngressoCodaMs = React.useMemo(() => {
    let best: number | null = null
    for (const r of mergedRecs) {
      try {
        const d = (typeof (r as any)?.getData === 'function') ? (r as any).getData() : ((r as any)?.feature?.attributes || {})
        const sint = computeSintetico(d)
        const ms = getRoleLastTouchMs(d, sint.ruolo) ?? computeUltimoAggMs(d)
        if (ms != null && (best == null || ms > best)) best = ms
      } catch {}
    }
    return best
  }, [mergedRecs])

  // Loading: true solo se TUTTI i DS del tab attivo stanno ancora caricando
  // (non se solo uno manca dall'entry — potrebbe essere che non ha ancora risposto)
  const anyLoading = activeGroup?.dsIndices.every(di => {
    const dsId = String(filteredUseDsJs[di]?.dataSourceId || '')
    const entry = dsDataRef.current[dsId]
    if (!entry) return true // mai aggiornato → stiamo aspettando
    return entry.loading
  }) ?? false

  // layout
  const gap = num(cfg.gap, 12)
  const padFirst = num(cfg.paddingLeftFirstCol, 0)

  // ── Colonne dinamiche da config ──
  const columns = migrateColumns(asJs(cfg))

  const gridCols = columns.map(c => `${c.width}px`).join(' ')
  const minWidth = columns.reduce((sum, c) => sum + c.width, 0) + (gap * Math.max(0, columns.length - 1)) + 24

  const rowGap = num(cfg.rowGap, 8)
  const rowPaddingX = num(cfg.rowPaddingX, 12)
  const rowPaddingY = num(cfg.rowPaddingY, 10)
  const rowMinHeight = num(cfg.rowMinHeight, 44)
  const rowRadius = num(cfg.rowRadius, 12)
  const rowBorderWidth = num(cfg.rowBorderWidth, 1)
  const rowBorderColor = txt(cfg.rowBorderColor || 'rgba(0,0,0,0.08)')

  const chipRadius = num(cfg.statoChipRadius, 999)
  const chipPadX = num(cfg.statoChipPadX, 10)
  const chipPadY = num(cfg.statoChipPadY, 4)
  const chipBorderW = num(cfg.statoChipBorderW, 1)
  const chipFontWeight = num(cfg.statoChipFontWeight, 600)
  const chipFontSize = num(cfg.statoChipFontSize, 12)
  const chipFontStyle = (cfg.statoChipFontStyle === 'italic' ? 'italic' : 'normal') as any
  const chipTextTransform = (['none', 'uppercase', 'lowercase', 'capitalize'].includes(cfg.statoChipTextTransform) ? cfg.statoChipTextTransform : 'none') as any
  const chipLetterSpacing = num(cfg.statoChipLetterSpacing, 0)

  const styles = css`
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;

    .tabBar {
      display: ${hasTabs ? 'flex' : 'none'};
      gap: 8px;
      padding: 8px 12px;
      border-bottom: 1px solid rgba(0,0,0,0.08);
      background: var(--bs-body-bg, #fff);
    }
    .tabBtn {
      border: 1px solid rgba(0,0,0,0.12);
      background: rgba(0,0,0,0.02);
      color: #111827;
      padding: 8px 10px;
      border-radius: 10px;
      cursor: pointer;
      font-weight: 700;
      font-size: 12px;
      white-space: nowrap;
    }
    .tabBtn.active {
      background: #eaf2ff;
      border-color: #2f6fed;
      color: #1d4ed8;
    }

    .integratedFilters {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 10px;
      align-items: end;
      padding: 10px 12px;
      border-bottom: 1px solid rgba(0,0,0,0.08);
      background: rgba(0,0,0,0.015);
    }
    .filterLabel {
      display: block;
      margin-bottom: 5px;
      font-size: 10.5px;
      font-weight: 800;
      line-height: 1;
      color: rgba(0,0,0,0.56);
      text-transform: uppercase;
      letter-spacing: 0.6px;
    }
    .filterInput, .filterSelect {
      width: 100%;
      height: 34px;
      border: 1px solid rgba(0,0,0,0.14);
      border-radius: 10px;
      background: #fff;
      color: #111827;
      padding: 0 10px;
      font-size: 12px;
      outline: none;
      box-sizing: border-box;
    }
    .filterInput:focus, .filterSelect:focus {
      border-color: rgba(47,111,237,0.75);
      box-shadow: 0 0 0 2px rgba(47,111,237,0.12);
    }
    .clearFiltersBtn {
      width: 100%;
      height: 34px;
      border: 1px solid rgba(0,0,0,0.14);
      border-radius: 10px;
      background: ${hasIntegratedFilters ? '#fff' : 'rgba(0,0,0,0.03)'};
      color: ${hasIntegratedFilters ? '#111827' : 'rgba(0,0,0,0.38)'};
      font-size: 12px;
      font-weight: 800;
      cursor: ${hasIntegratedFilters ? 'pointer' : 'not-allowed'};
    }
    .filtersSummary {
      padding: 4px 12px 8px;
      border-bottom: 1px solid rgba(0,0,0,0.06);
      font-size: 11px;
      color: rgba(0,0,0,0.56);
      background: rgba(0,0,0,0.015);
    }

    .viewport { flex: 1; min-height: 0; overflow: auto; }
    .content { min-width: ${minWidth}px; padding: 0 12px 10px; }

    .headerWrap {
      position: sticky;
      top: 0;
      z-index: 2;
      background: var(--bs-body-bg, #fff);
      border-bottom: 1px solid rgba(0,0,0,0.08);
      padding: 6px 12px;
      margin: 0 0 8px 0;
    }

    .gridHeader {
      display: grid;
      grid-template-columns: ${gridCols};
      column-gap: ${gap}px;
      align-items: center;
      min-height: 28px;
    }

    .headerCell {
      display: flex;
      align-items: center;
      min-width: 0;
      font-weight: 700;
      font-size: 12px;
      color: rgba(0,0,0,0.65);
    }

    .hdrBtn {
      width: 100%;
      border: none;
      background: transparent;
      padding: 0;
      margin: 0;
      text-align: left;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: inherit;
      font: inherit;
      line-height: 1;
    }
    .hdrBtn:hover { color: rgba(0,0,0,0.9); }

    .sortBadge {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-size: 12px;
      opacity: 0.9;
      flex: 0 0 auto;
    }
    .sortTri {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      line-height: 1;
    }
    .sortPri {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      border-radius: 4px;
      background: rgba(0,0,0,0.07);
      font-weight: 800;
    }

    .resetSortTabBtn {
      width: 28px;
      height: 28px;
      min-width: 28px;
      border: 1px solid rgba(0,0,0,0.12);
      background: rgba(0,0,0,0.06);
      color: #374151;
      border-radius: 999px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 800;
      line-height: 1;
      padding: 0;
      flex: 0 0 auto;
      transition: background 120ms ease, border-color 120ms ease, color 120ms ease, transform 120ms ease;
    }
    .resetSortTabBtn:hover {
      background: rgba(47,111,237,0.12);
      border-color: rgba(47,111,237,0.35);
      color: #1d4ed8;
    }
    .resetSortTabBtn:active {
      transform: scale(0.97);
    }

    .first { padding-left: ${padFirst}px; }

    .list { display: flex; flex-direction: column; }

    .rowCard {
      display: grid;
      grid-template-columns: ${gridCols};
      column-gap: ${gap}px;
      align-items: center;

      padding: ${rowPaddingY}px ${rowPaddingX}px;
      min-height: ${rowMinHeight}px;

      border-radius: ${rowRadius}px;
      border: ${rowBorderWidth}px solid ${rowBorderColor};

      margin-bottom: ${rowGap}px;
      cursor: pointer;
    }
    .rowCard.even { background: ${txt(cfg.zebraEvenBg || '#ffffff')}; }
    .rowCard.odd  { background: ${txt(cfg.zebraOddBg || '#fbfbfb')}; }
    .rowCard:hover { background: ${txt(cfg.hoverBg || '#f2f6ff')}; }

    .rowCard.selected {
      border-color: ${txt(cfg.selectedBorderColor || '#2f6fed')};
      box-shadow: 0 0 0 ${num(cfg.selectedBorderWidth, 2)}px rgba(47,111,237,0.18);
      background: ${txt(cfg.selectedBg || '#eaf2ff')};
    }

    .cell {
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .chip {
      display: inline-flex;
      align-items: center;
      padding: ${chipPadY}px ${chipPadX}px;
      border-radius: ${chipRadius}px;
      border: ${chipBorderW}px solid rgba(0,0,0,0.12);
      font-weight: ${chipFontWeight};
      font-size: ${chipFontSize}px;
      font-style: ${chipFontStyle};
      text-transform: ${chipTextTransform};
      letter-spacing: ${chipLetterSpacing}px;
      line-height: 1;
      white-space: nowrap;
      max-width: 100%;
    }

    .empty { padding: 14px; color: rgba(0,0,0,0.65); }
  `

  const Header = (p: { label: string, field: string, first?: boolean }) => {
    const idx = sortState.findIndex(x => x.field === p.field)
    const item = idx >= 0 ? sortState[idx] : null
    const dir = item?.dir

    const badge = item
      ? (
        <span className='sortBadge' aria-hidden>
          <span className='sortTri'>{dir === 'ASC' ? '▲' : '▼'}</span>
          <span className='sortPri'>{idx + 1}</span>
        </span>
        )
      : null

    return (
      <div className={`headerCell ${p.first ? 'first' : ''}`}>
        <button
          type='button'
          className='hdrBtn'
          onClick={() => toggleSort(p.field)}
          title='Click: ordina in modalità multipla. Terzo clic: rimuove ordinamento.'
        >
          <span>{p.label}</span>
          {badge}
        </button>
      </div>
    )
  }

  const maskOuterOffset = Number.isFinite(Number(cfg.maskOuterOffset)) ? Number(cfg.maskOuterOffset) : 12
  const maskInnerPadding = Number.isFinite(Number(cfg.maskInnerPadding)) ? Number(cfg.maskInnerPadding) : 8
  const maskBg = String(cfg.maskBg ?? '#ffffff')
  const maskBorderColor = String(cfg.maskBorderColor ?? 'rgba(0,0,0,0.12)')
  const maskBorderWidth = Number.isFinite(Number(cfg.maskBorderWidth)) ? Number(cfg.maskBorderWidth) : 1
  const maskRadius = Number.isFinite(Number(cfg.maskRadius)) ? Number(cfg.maskRadius) : 12

  if (!userLoading && !notLogged && !!giiUser?.username && !resolvedView) {
    return <div style={{ padding: 12 }}>Nessuna vista AGOL associata a ruolo, area e settore dell’utente.</div>
  }

  // Titolo elenco
  const listTitleText = txt(cfg.listTitleText || 'Elenco rapporti di rilevazione')
  const listTitleHeight = num(cfg.listTitleHeight, 28)
  const listTitlePaddingBottom = num(cfg.listTitlePaddingBottom, 10)
  const listTitlePaddingLeft = num(cfg.listTitlePaddingLeft, 0)
  const listTitleFontSize = num(cfg.listTitleFontSize, 14)
  const listTitleFontWeight = num(cfg.listTitleFontWeight, 600)
  const listTitleColor = txt(cfg.listTitleColor || 'rgba(0,0,0,0.85)')

  return (
    <div style={{ width: '100%', height: '100%', boxSizing: 'border-box', padding: maskOuterOffset, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Titolo elenco - sopra l'area bianca */}
      {listTitleText && (
        <div style={{
          height: listTitleHeight,
          paddingBottom: listTitlePaddingBottom,
          paddingLeft: listTitlePaddingLeft,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          boxSizing: 'border-box',
          flex: '0 0 auto'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: listTitleFontSize,
              fontWeight: listTitleFontWeight,
              color: listTitleColor
            }}>
              {listTitleText}
            </span>
            <span style={{ fontSize: Math.max(11, listTitleFontSize - 2), color: 'rgba(0,0,0,0.58)' }}>
              Ultimo aggiornamento: {lastListRefreshAt ? formatDateIt(lastListRefreshAt) : '—'}
            </span>
            <button
              type='button'
              onClick={() => {
                // Deseleziona prima di aggiornare per evitare disallineamento con azioni
                setLocalSelectedByDs({})
                Object.keys(dsDataRef.current).forEach(id => {
                  const e = dsDataRef.current[id]
                  if (e?.ds) tryClearSelection(e.ds)
                })
                notifySelectionCleared()
                setListRefreshNonce(n => n + 1)
              }}
              style={{
                height: 34,
                padding: '0 12px',
                borderRadius: 10,
                border: '1px solid #2f6fed',
                background: '#fff',
                color: '#1d4ed8',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                whiteSpace: 'nowrap'
              }}
            >
              Aggiorna elenco
            </button>
          </div>

        </div>
      )}
      <div
        style={{
          width: '100%',
          flex: '1 1 auto',
          minHeight: 0,
          boxSizing: 'border-box',
          border: `${maskBorderWidth}px solid ${maskBorderColor}`,
          borderRadius: maskRadius,
          background: maskBg,
          padding: maskInnerPadding,
          overflow: 'hidden'
        }}
      >
        <div css={styles} style={{ width: '100%', height: '100%' }}>

          {/* ── Overlay bloccante: copre i dati finche' non c'e' login ── */}
          {(notLogged || userLoading) && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 100,
              background: 'rgba(255,255,255,0.97)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 16, padding: 32, textAlign: 'center',
              borderRadius: maskRadius,
              pointerEvents: 'all'
            }}>
              {userLoading
                ? (
                  <>
                    <Loading />
                    <div style={{ fontSize: 13, color: '#6b7280' }}>Verifica accesso in corso…</div>
                  </>
                )
                : (
                  <>
                    <div style={{ fontSize: 32 }}>🔒</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>
                      Accesso richiesto
                    </div>
                    <div style={{ fontSize: 13, color: '#6b7280', maxWidth: 300, lineHeight: 1.5 }}>
                      Utilizza il pulsante di accesso in alto a destra per entrare con le credenziali CBSM.
                    </div>
                  </>
                )
              }
            </div>
          )}


          {/* Filtri integrati: sostituiscono il vecchio CW ricerca-e-filtri */}
          {!userLoading && !notLogged && (
            <>
              <div className='integratedFilters'>
                <div>
                  <label className='filterLabel'>Cerca</label>
                  <input
                    className='filterInput'
                    value={searchFilter}
                    onChange={(e: any) => setSearchFilter(e?.target?.value || '')}
                    placeholder='Cerca n. rapporto…'
                  />
                </div>
                <div>
                  <label className='filterLabel'>Area</label>
                  <select
                    className='filterSelect'
                    value={areaFilter}
                    onChange={(e: any) => setAreaFilter(e?.target?.value || 'tutte')}
                  >
                    <option value='tutte'>Tutte</option>
                    {areeDisponibili.map(([code, label]) => (
                      <option key={code} value={code}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className='filterLabel'>Settore/Ufficio</label>
                  <select
                    className='filterSelect'
                    value={settoreFilter}
                    onChange={(e: any) => setSettoreFilter(e?.target?.value || 'tutte')}
                  >
                    <option value='tutte'>Tutti</option>
                    {settoriDisponibili.map(([code, label]) => (
                      <option key={code} value={code}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className='filterLabel'>Dal</label>
                  <input
                    className='filterInput'
                    type='date'
                    value={fromDateFilter}
                    onChange={(e: any) => setFromDateFilter(e?.target?.value || '')}
                  />
                </div>
                <div>
                  <label className='filterLabel'>Al</label>
                  <input
                    className='filterInput'
                    type='date'
                    value={toDateFilter}
                    onChange={(e: any) => setToDateFilter(e?.target?.value || '')}
                  />
                </div>
                <div>
                  <label className='filterLabel'>Stato</label>
                  <select
                    className='filterSelect'
                    value={statoFilter}
                    onChange={(e: any) => setStatoFilter(e?.target?.value || 'tutte')}
                  >
                    <option value='tutte'>Tutti</option>
                    {statiDisponibili.map(label => (
                      <option key={label} value={label}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className='filterLabel'>&nbsp;</label>
                  <button
                    type='button'
                    className='clearFiltersBtn'
                    disabled={!hasIntegratedFilters}
                    onClick={() => {
                      if (!hasIntegratedFilters) return
                      resetIntegratedFilters()
                    }}
                  >
                    Pulisci filtri
                  </button>
                </div>
              </div>
              <div className='filtersSummary'>
                Mostrate {mergedRecs.length} pratiche su {roleTabRecs.length} della scheda corrente.
              </div>
            </>
          )}

          {/* ── Tab ruolo: Tutte / In attesa mia / In attesa di altri ── */}
          {!userLoading && statoRuoloField && (
            <div style={{ display: 'flex', gap: 8, padding: '8px 12px', borderBottom: '1px solid rgba(0,0,0,0.08)', alignItems: 'center', flexWrap: 'nowrap' }}>
              <span style={{ fontSize: 11, color: '#6b7280', marginRight: 4, flex: '0 0 auto' }}>
                {`👤 ${labelNorm(getEffectiveRole(giiUser?.ruoloLabel ?? '', giiUser?.area))}`}
              </span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', minWidth: 0, flex: '1 1 auto' }}>
                {ROLE_TABS.map(t => (
                  <button
                    key={t.id}
                    type='button'
                    className={`tabBtn ${activeRoleTab === t.id ? 'active' : ''}`}
                    onClick={() => {
                      setLocalSelectedByDs({})
                      Object.keys(dsDataRef.current).forEach(id => {
                        const e = dsDataRef.current[id]
                        if (e?.ds) tryClearSelection(e.ds)
                      })
                      filteredUseDsJs.forEach((u: any) => {
                        const dsId = String(u?.dataSourceId || '')
                        try {
                          const mainDs = DataSourceManager.getInstance().getDataSource(dsId)
                          if (mainDs) tryClearSelection(mainDs)
                          const parentId = (mainDs as any)?.parentDataSource?.id || (mainDs as any)?.getMainDataSource?.()?.id
                          if (parentId) {
                            const parentDs = DataSourceManager.getInstance().getDataSource(parentId)
                            if (parentDs) tryClearSelection(parentDs)
                          }
                        } catch {}
                      })
                      notifySelectionCleared()
                      setActiveRoleTab(t.id)
                    }}
                  >
                    {t.label}
                    {(() => {
                      if (!activeGroup) return null
                      const svcCache = new Map<string, string>()
                      const uniq = new Map<string, DataRecord>()
                      for (const di of activeGroup.dsIndices) {
                        const dsId = String(filteredUseDsJs[di]?.dataSourceId || '')
                        const entry = dsDataRef.current[dsId]
                        if (entry?.recs) {
                          for (const r of entry.recs) {
                            const k = getRecordUniqKey(r, dsId, svcCache)
                            if (!uniq.has(k)) uniq.set(k, r)
                          }
                        }
                      }
                      const all: DataRecord[] = Array.from(uniq.values())
                      const visibleForUser = all.filter(r => isRecordVisibleForCurrentUser(r))
                      const count = t.id === 'tutte'
                        ? visibleForUser.length
                        : visibleForUser.filter(r => passesRoleTab(r, t.id)).length
                      return count > 0 ? (
                        <span style={{
                          marginLeft: 6, background: activeRoleTab === t.id ? '#2f6fed' : 'rgba(0,0,0,0.1)',
                          color: activeRoleTab === t.id ? '#fff' : '#374151',
                          borderRadius: 999, padding: '1px 7px', fontSize: 11, fontWeight: 700
                        }}>{count}</span>
                      ) : null
                    })()}
                  </button>
                ))}
              </div>
              <button
                type='button'
                className='resetSortTabBtn'
                onClick={() => { if (isCustomSort) setSortState(defaultSort) }}
                disabled={!isCustomSort}
                title='Ripristina ordinamento predefinito'
                aria-label='Ripristina ordinamento predefinito'
                style={{
                  width: 38,
                  minWidth: 38,
                  height: 38,
                  borderRadius: '50%',
                  border: `1px solid ${isCustomSort ? '#2f6fed' : 'rgba(0,0,0,0.14)'}`,
                  background: isCustomSort ? '#2f6fed' : '#fff',
                  color: isCustomSort ? '#fff' : 'rgba(0,0,0,0.32)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  alignSelf: 'center',
                  fontSize: 18,
                  fontWeight: 800,
                  lineHeight: 1,
                  cursor: isCustomSort ? 'pointer' : 'not-allowed',
                  pointerEvents: isCustomSort ? 'auto' : 'none',
                  boxShadow: 'none',
                  flex: '0 0 auto',
                  marginLeft: 'auto'
                }}
              >
                ↺
              </button>
            </div>
          )}

          {/* Indicatore admin: vede tutto senza filtri */}
          {!userLoading && giiUser?.isAdmin && (
            <div style={{ padding: '6px 12px', fontSize: 11, color: '#6b7280', borderBottom: '1px solid rgba(0,0,0,0.06)', background: '#fafafa' }}>
              👤 ADMIN — visualizzazione completa senza filtri ruolo
            </div>
          )}



          {/* Indicatore caricamento ruolo (visibile solo quando loggato ma ancora caricando) */}
          {userLoading && !notLogged && (
            <div style={{ padding: '6px 12px', fontSize: 11, color: '#6b7280' }}>
              Rilevamento ruolo utente…
            </div>
          )}

          {/* ── Tab bar datasource (raggruppati per etichetta) — solo se ci sono tab multiple E non ci sono tab ruolo ── */}
          {hasTabs && !statoRuoloField && (
            <div className='tabBar'>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', minWidth: 0, flex: '1 1 auto' }}>
                {tabGroups.map((g, i) => (
                  <button
                    key={g.label}
                    type='button'
                    className={`tabBtn ${i === activeTab ? 'active' : ''}`}
                    onClick={() => {
                      const curGroup = tabGroups[activeTab]
                      if (curGroup) {
                        curGroup.dsIndices.forEach(di => {
                          const dsId = String(filteredUseDsJs[di]?.dataSourceId || '')
                          const entry = dsDataRef.current[dsId]
                          if (entry?.ds) tryClearSelection(entry.ds)
                        })
                        notifySelectionCleared()
                        setLocalSelectedByDs(prev => {
                          const updated = { ...prev }
                          curGroup.dsIndices.forEach(di => {
                            delete updated[String(filteredUseDsJs[di]?.dataSourceId || '')]
                          })
                          return updated
                        })
                      }
                      setActiveTab(i)
                    }}
                    title={g.label}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Contenuto: record fusi da tutti i DS del tab attivo ── */}
          <div className='viewport'>
            <div className='content'>
              {anyLoading && <Loading />}

              {!anyLoading && mergedRecs.length === 0 && (
                <div className='empty'>{txt(cfg.emptyMessage || 'Nessun record trovato.')}</div>
              )}

              {mergedRecs.length > 0 && (
                <>
                  {cfg.showHeader !== false && (
                    <div className='headerWrap'>
                      <div className='gridHeader'>
                        {columns.map((col, ci) => (
                          <Header key={col.id} first={ci === 0} label={col.label} field={col.field} />
                        ))}
                      </div>
                    </div>
                  )}

                  <div className='list'>
                    {mergedRecs.map((r, idx) => {
                      const d = r.getData?.() || {}
                      const oid = Number(d.OBJECTID)
                      const rid = String(r.getId?.() ?? oid)
                      const recDsId = recDsLookup.get(r) || ''

                      const fp = String(fieldPratica || '').toLowerCase()
                      const pratica = (fp === 'objectid' || fp === 'oid' || fp === 'object_id')
                        ? getCodPraticaDisplay(r)
                        : txt(d[fieldPratica])
                      const dataRil = formatDateIt(d[fieldDataRil])
                      const ufficio = txt(d[fieldUfficio])

                      const sintetico = computeSintetico(d)

                      // ── Label chip differenziata per ruolo (matrici: "stato per gli altri ruoli") ──
                      // Ogni ruolo vede la label specifica dalla sua matrice, non quella generica del nodo attivo.
                      const displaySintetico = (() => {
                        if (!giiUser || giiUser.isAdmin) return sintetico
                        let myRole = getEffectiveRole(giiUser.ruoloLabel || '', giiUser.area)
                        if (!myRole) return sintetico

                        // ── Helper: leggi esito numerico di un ruolo ─────────────────────────
                        const getEsitoNum = (role: string): number | null => {
                          const v = d[`esito_${role}`] ?? d[`ESITO_${role}`]
                          if (v == null || v === '') return null
                          const n = Number(v)
                          return Number.isFinite(n) ? n : null
                        }

                        // ── RZ: tutti i casi della Matrice_RZ ────────────────────────────────
                        if (myRole === 'RZ') {
                          // Safety net: se stato_RZ = DA_PRENDERE, RZ deve agire → sempre "Da prendere in carico"
                          const statoRzRaw = d['stato_RZ'] ?? d['stato_rz'] ?? d['STATO_RZ']
                          const statoRzNum = statoRzRaw != null && statoRzRaw !== '' ? Number(statoRzRaw) : null
                          if (statoRzNum === statoDaPrendere) {
                            return { ruolo: 'RZ', label: 'Da prendere in carico', statoForChip: statoDaPrendere }
                          }
                          // Casi 1 e 3: nodo attivo con stato=da_prendere → "Da prendere in carico"
                          if (sintetico.ruolo === 'RZ' && sintetico.statoForChip === statoDaPrendere) {
                            return { ...sintetico, label: 'Da prendere in carico' }
                          }
                          // Casi 2 e 4: nodo attivo con stato=preso → "Preso in carico"
                          if (sintetico.ruolo === 'RZ' && sintetico.statoForChip === statoPresa) {
                            return { ...sintetico, label: 'In carico' }
                          }
                          // Casi 2/a e 4/b: TI è il nodo attivo (assegnato da RZ)
                          // Solo se RZ è già stato coinvolto (ha dati). Se TI ha auto-creato
                          // e non ha ancora trasmesso, RZ non è coinvolto → fall through a "in corso di istruttoria"
                          if (sintetico.ruolo === 'TI' && hasRuoloData(d, 'RZ')) {
                            const esitoRZ = getEsitoNum('RZ')
                            // Caso 4/b: RZ ha richiesto integrazioni a TI
                            if (esitoRZ === esitoIntegrazione) {
                              return { ruolo: 'RZ', label: 'In attesa di integrazioni', statoForChip: statoIntegrazione }
                            }
                            // Caso 2/a: prima assegnazione a TI (e successive riassegnazioni)
                            return { ruolo: 'RZ', label: 'In attesa di istruttoria', statoForChip: statoPresa }
                          }
                          // Casi 4/a, 4/c e successivi: RZ ha già agito, flusso avanzato
                          const storico = computeStatoStorico(d, 'RZ')
                          if (storico) {
                            // Caso 4/a: RZ ha trasmesso a RI (esito=approvata)
                            if (storico.statoForChip === statoApprovata) {
                              return { ruolo: 'RZ', label: 'Trasmesso', statoForChip: statoApprovata }
                            }
                            // Caso 4/b storico: In attesa di integrazioni (esito=integrazione)
                            if (storico.statoForChip === statoIntegrazione) {
                              return { ruolo: 'RZ', label: 'In attesa di integrazioni', statoForChip: statoIntegrazione }
                            }
                            // Casi 2/b e 4/c: Respinto
                            return { ruolo: 'RZ', ...storico }
                          }
                        }

                        // ── RI_AMM: stessa logica di RZ ma per TI_AMM ────────────────────────
                        if (myRole === 'RI_AMM') {
                          const statoRiAmmRaw = d['stato_RI_AMM'] ?? d['stato_ri_amm'] ?? d['STATO_RI_AMM']
                          const statoRiAmmNum = statoRiAmmRaw != null && statoRiAmmRaw !== '' ? Number(statoRiAmmRaw) : null
                          if (statoRiAmmNum === statoDaPrendere) {
                            return { ruolo: 'RI_AMM', label: 'Da prendere in carico', statoForChip: statoDaPrendere }
                          }
                          if (sintetico.ruolo === 'RI_AMM' && sintetico.statoForChip === statoDaPrendere) {
                            return { ...sintetico, label: 'Da prendere in carico' }
                          }
                          if (sintetico.ruolo === 'RI_AMM' && sintetico.statoForChip === statoPresa) {
                            return { ...sintetico, label: 'In carico' }
                          }
                          // TI_AMM è il nodo attivo (assegnato da RI_AMM)
                          if (sintetico.ruolo === 'TI_AMM' && hasRuoloData(d, 'RI_AMM')) {
                            const esitoRiAmm = getEsitoNum('RI_AMM')
                            if (esitoRiAmm === esitoIntegrazione) {
                              return { ruolo: 'RI_AMM', label: 'In attesa di integrazioni', statoForChip: statoIntegrazione }
                            }
                            return { ruolo: 'RI_AMM', label: 'In attesa di istruttoria', statoForChip: statoPresa }
                          }
                          // RI_AMM ha già agito, flusso avanzato
                          const storicoRiAmm = computeStatoStorico(d, 'RI_AMM')
                          if (storicoRiAmm) {
                            if (storicoRiAmm.statoForChip === statoApprovata) {
                              return { ruolo: 'RI_AMM', label: 'Trasmesso', statoForChip: statoApprovata }
                            }
                            if (storicoRiAmm.statoForChip === statoIntegrazione) {
                              return { ruolo: 'RI_AMM', label: 'In attesa di integrazioni', statoForChip: statoIntegrazione }
                            }
                            return { ruolo: 'RI_AMM', ...storicoRiAmm }
                          }
                        }

                        // ── Altri ruoli: nodo attivo ─────────────────────────────────────────
                        if (sintetico.ruolo === myRole) {
                          // stato=da_prendere → "Da prendere in carico" (vale per tutti i ruoli)
                          if (sintetico.statoForChip === statoDaPrendere) {
                            return { ...sintetico, label: 'Da prendere in carico' }
                          }
                          return sintetico
                        }

                        // ── Ruolo già agito storicamente (o in attesa di agire di nuovo) ────────
                        const storico = computeStatoStorico(d, myRole)
                        if (storico) {
                          // stato_[myRole] = STATO_DA_PRENDERE significa che il ruolo deve agire:
                          // da prospettiva propria è sempre "Da prendere in carico",
                          // non "Trasmesso a [myRole]" (quella è la label per gli altri).
                          if (storico.statoForChip === statoDaPrendere) {
                            return { ruolo: myRole, label: 'Da prendere in carico', statoForChip: statoDaPrendere }
                          }
                          return { ruolo: myRole, ...storico }
                        }

                        // ── Ruolo non ancora raggiunto ───────────────────────────────────────
                        const isSanz = isInFaseSanzionatoria(d)
                        return {
                          ruolo: sintetico.ruolo,
                          label: isSanz
                            ? 'Sanzione in corso di istruttoria'
                            : 'Rapporto in corso di istruttoria',
                          statoForChip: null as number | null
                        }
                      })()

                      const statoLabel = labelNorm(txt(displaySintetico.label))
                      const statoChipNum = displaySintetico.statoForChip

                      const ultimoMs = computeUltimoAggMs(d)
                      const ultimo = ultimoMs ? formatDateIt(ultimoMs) : '—'

                      // Colonne virtuali da LOG
                      const _logEntry = getLogForRecord(d)
                      let mittenteVal: string
                      let destinatario: string
                      let causaleVal: string
                      let dataMsgVal: string
                      if (_logEntry) {
                        mittenteVal = formatPersona(_logEntry.ruolo, _logEntry.area, _logEntry.settore, _logEntry.utente, utentiMapRef.current)
                        destinatario = _logEntry.ruoloDest
                          ? formatPersonaDest(_logEntry.ruoloDest, _logEntry.area, _logEntry.settore, _logEntry.utenteDest, utentiMapRef.current)
                          : '—'
                        causaleVal = formatCausale(_logEntry.evento)
                        dataMsgVal = _logEntry.dt ? formatDateIt(_logEntry.dt) : '—'
                      } else if (!logLoadedRef.current) {
                        // LOG non ancora caricato — mostra trattini (evita flash "NUOVO RAPPORTO")
                        mittenteVal = '—'; destinatario = '—'; causaleVal = '—'; dataMsgVal = '—'
                      } else {
                        // Nessun record LOG: TI auto-assegnato o TR da survey
                        causaleVal = 'NUOVO RAPPORTO'
                        const creator = String(d.Creator ?? d.creator ?? d.CREATOR ?? '').trim()
                        const creatorLc = creator.toLowerCase()
                        const creatorEntry = utentiMapRef.current?.get(creatorLc)
                        if (creatorEntry) {
                          const aLbl = creatorEntry.areaCod || ({ 1:'AMM', 2:'AGR', 3:'TEC' } as Record<number, string>)[creatorEntry.area ?? 0] || ''
                          const sLbl = creatorEntry.settoreCod || ({ 1:'CR', 2:'GI', 3:'D1', 4:'D2', 5:'D3', 6:'D4', 7:'D5', 8:'D6', 9:'DS' } as Record<number, string>)[creatorEntry.settore ?? 0] || ''
                          const rLbl = creatorEntry.ruoloCod || ({ 1:'TR', 2:'TI', 3:'RZ', 4:'RI', 5:'DT', 6:'DA', 7:'ADMIN' } as Record<number, string>)[creatorEntry.ruolo ?? 0] || ''
                          mittenteVal = formatPersona(rLbl, aLbl, sLbl, creator, utentiMapRef.current)
                        } else {
                          mittenteVal = creator || '—'
                        }
                        const cd = d.CreationDate ?? d.creationdate ?? d.creationDate ?? d.CREATIONDATE
                        dataMsgVal = cd ? formatDateIt(cd) : '—'
                        // Destinatario: TR (origine=1) → RZ del settore con nome
                        // TI (origine=2) senza LOG → non ha ancora trasmesso → "—"
                        const opRaw = d.origine_pratica ?? d.ORIGINE_PRATICA
                        const opN = opRaw != null && opRaw !== '' ? Number(opRaw) : null
                        if (opN === 1 && creatorEntry && creatorEntry.area != null) {
                          const aLbl = creatorEntry.areaCod || ({ 1:'AMM', 2:'AGR', 3:'TEC' } as Record<number, string>)[creatorEntry.area ?? 0] || ''
                          const sLbl = creatorEntry.settoreCod || ({ 1:'CR', 2:'GI', 3:'D1', 4:'D2', 5:'D3', 6:'D4', 7:'D5', 8:'D6', 9:'DS' } as Record<number, string>)[creatorEntry.settore ?? 0] || ''
                          let rzUsername = ''
                          if (utentiMapRef.current) {
                            for (const [uname, ue] of utentiMapRef.current) {
                              if (ue.ruolo === 3 && ue.area === creatorEntry.area && ue.settore === creatorEntry.settore) {
                                rzUsername = uname; break
                              }
                            }
                          }
                          destinatario = formatPersona('RZ', aLbl, sLbl, rzUsername, utentiMapRef.current)
                        } else {
                          destinatario = '—'
                        }
                      }

                      const isSel = (localSelectedByDs[recDsId] === rid)
                      const even = idx % 2 === 0

                      return (
                        <div
                          key={`${recDsId}_${rid}`}
                          className={`rowCard ${even ? 'even' : 'odd'} ${isSel ? 'selected' : ''}`}
                          onClick={() => {
                            if (isSel) {
                              // Deseleziona su TUTTI i DS
                              setLocalSelectedByDs({})
                              Object.keys(dsDataRef.current).forEach(id => {
                                const e = dsDataRef.current[id]
                                if (e?.ds) tryClearSelection(e.ds)
                              })
                              // Deseleziona anche su tutti i DS parent via DataSourceManager
                              filteredUseDsJs.forEach((u: any) => {
                                const dsId = String(u?.dataSourceId || '')
                                try {
                                  const mainDs = DataSourceManager.getInstance().getDataSource(dsId)
                                  if (mainDs) tryClearSelection(mainDs)
                                  const parentId = (mainDs as any)?.parentDataSource?.id || (mainDs as any)?.getMainDataSource?.()?.id
                                  if (parentId) {
                                    const parentDs = DataSourceManager.getInstance().getDataSource(parentId)
                                    if (parentDs) tryClearSelection(parentDs)
                                  }
                                } catch {}
                              })
                              notifySelectionCleared()
                            } else {
                              // Pulisci tutte le selezioni precedenti su tutti i DS
                              Object.keys(dsDataRef.current).forEach(id => {
                                const e = dsDataRef.current[id]
                                if (e?.ds) tryClearSelection(e.ds)
                              })
                              notifySelectionCleared()
                              // Seleziona questo record sul suo DS nativo
                              setLocalSelectedByDs({ [recDsId]: rid })
                              const entry = dsDataRef.current[recDsId]
                              if (entry?.ds) trySelectRecord(entry.ds, r, rid)
                              // Notifica azioni del record selezionato
                              try {
                                const idFieldName = String(entry?.ds?.getIdField?.() || 'OBJECTID')
                                const oidVal = Number(r.getData?.()[idFieldName] ?? rid)
                                if (Number.isFinite(oidVal)) {
                                  publishRuntimeSelection({
                                    oid: oidVal,
                                    layerUrl: resolvedView?.layerUrl || recDsId,
                                    serviceUrl: resolvedView?.serviceUrl || recDsId,
                                    idFieldName,
                                    viewName: resolvedView?.viewName || getDsLabel({ __label: '' }, 'Vista runtime'),
                                    data: r.getData?.() || {}
                                  })
                                } else {
                                  notifySelectionCleared()
                                }
                              } catch { notifySelectionCleared() }

                              // Propaga: forza setSelectedRecords con lo stesso record
                              // su TUTTI i DS del gruppo (ExB usa l'interfaccia DataRecord)
                              if (activeGroup) {
                                activeGroup.dsIndices.forEach(di => {
                                  const otherId = String(filteredUseDsJs[di]?.dataSourceId || '')
                                  if (otherId === recDsId) return
                                  const otherEntry = dsDataRef.current[otherId]
                                  if (otherEntry?.ds) {
                                    try { (otherEntry.ds as any).setSelectedRecords?.([r]) } catch {}
                                    try { (otherEntry.ds as any).selectRecordsByIds?.([rid]) } catch {}
                                  }
                                  // Anche sul parent DS (il feature layer principale)
                                  try {
                                    const mainDs = DataSourceManager.getInstance().getDataSource(otherId)
                                    const parentDs = (mainDs as any)?.parentDataSource || (mainDs as any)?.getMainDataSource?.()
                                    if (parentDs) {
                                      try { parentDs.setSelectedRecords?.([r]) } catch {}
                                    }
                                  } catch {}
                                })
                              }
                            }
                          }}
                        >
                          {columns.map((col, ci) => {
                            const f = col.field
                            if (f === V_STATO) {
                              return (
                                <div key={col.id} className={ci === 0 ? 'cell first' : 'cell'} title={statoLabel}>
                                  <span className='chip' style={getChipStyleByLabel(statoLabel)}>
                                    {statoLabel}
                                  </span>
                                </div>
                              )
                            }
                            if (f === V_ULTIMO) {
                              return <div key={col.id} className={ci === 0 ? 'cell first' : 'cell'} title={ultimo}>{ultimo}</div>
                            }
                            if (f === V_PROSSIMA) {
                              return <div key={col.id} className={ci === 0 ? 'cell first' : 'cell'} title={destinatario}>{destinatario}</div>
                            }
                            if (f === V_MITTENTE) {
                              return <div key={col.id} className={ci === 0 ? 'cell first' : 'cell'} title={mittenteVal}>{mittenteVal}</div>
                            }
                            if (f === V_CAUSALE) {
                              return <div key={col.id} className={ci === 0 ? 'cell first' : 'cell'} title={causaleVal}>{causaleVal}</div>
                            }
                            if (f === V_DATA_MSG) {
                              return <div key={col.id} className={ci === 0 ? 'cell first' : 'cell'} title={dataMsgVal}>{dataMsgVal}</div>
                            }
                            const fl = f.toLowerCase()
                            if (fl === 'objectid' || fl === 'oid' || fl === 'object_id') {
                              return <div key={col.id} className={ci === 0 ? 'cell first' : 'cell'} title={pratica}>{pratica}</div>
                            }
                            if (fl.startsWith('data_') || fl.startsWith('dt_')) {
                              const val = formatDateIt(d[f])
                              return <div key={col.id} className={ci === 0 ? 'cell first' : 'cell'} title={val}>{val}</div>
                            }
                            const val = txt(d[f])
                            return <div key={col.id} className={ci === 0 ? 'cell first' : 'cell'} title={val}>{val}</div>
                          })}
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}