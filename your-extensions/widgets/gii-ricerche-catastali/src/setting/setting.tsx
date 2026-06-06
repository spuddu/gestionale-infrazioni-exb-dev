/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx, DataSourceManager, getAppStore, SessionManager } from 'jimu-core'
import type { AllWidgetSettingProps } from 'jimu-for-builder'
import { MapWidgetSelector } from 'jimu-ui/advanced/setting-components'
import type { IMConfig } from '../config'
import { defaultConfig } from '../config'

type Props = AllWidgetSettingProps<IMConfig>
type FieldOpt = { name: string; alias: string; type?: string }
type MapLayerOpt = { key: string; title: string; url: string; id: string; layerId: string; geometryType: string; fields?: FieldOpt[] }

const FIELD_SCHEMA_CACHE: Record<string, FieldOpt[]> = {}
const SERVICE_META_CACHE: Record<string, any> = {}

function asJs<T = any>(v: any): T {
  return v?.asMutable ? v.asMutable({ deep: true }) : v
}


function normalizeFieldList(raw: any): FieldOpt[] {
  const list: any[] = Array.isArray(raw)
    ? raw
    : (raw && typeof raw === 'object' ? Object.values(asJs(raw)) : [])
  const seen = new Set<string>()
  const out: FieldOpt[] = []
  list.forEach((f: any) => {
    const name = String(f?.name || f?.fieldName || f?.jimuName || '').trim()
    if (!name) return
    const key = name.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    out.push({
      name,
      alias: String(f?.alias || f?.label || f?.title || f?.name || f?.fieldName || name).trim(),
      type: String(f?.type || f?.esriType || '')
    })
  })
  return out.sort((a, b) => (a.alias || a.name).localeCompare(b.alias || b.name, 'it', { sensitivity: 'base' }))
}

function toImmutableCfg(base: any, patch: Record<string, any>) {
  let next = base?.set ? base : { ...(base || {}) }
  Object.entries(patch).forEach(([k, v]) => {
    const val = Array.isArray(v) ? [...(v as any)] : v
    next = next?.set ? next.set(k, val) : { ...next, [k]: val }
  })
  return next
}

function parseNum(v: any, fb: number, min?: number, max?: number): number {
  let n = Number(v)
  if (!Number.isFinite(n)) n = fb
  if (typeof min === 'number') n = Math.max(min, n)
  if (typeof max === 'number') n = Math.min(max, n)
  return n
}

function normalizeFeatureLayerUrl(raw: any): string {
  const str = String(raw || '').trim()
  if (!str) return ''
  try {
    const u = new URL(str)
    u.search = ''
    u.hash = ''
    return u.toString().replace(/\/$/, '')
  } catch {
    return str.replace(/[?#].*$/, '').replace(/\/$/, '')
  }
}

function composeLayerUrl(raw: any, layerIdRaw?: any): string {
  const url = normalizeFeatureLayerUrl(raw)
  if (!url) return ''
  if (/\/(FeatureServer|MapServer)\/\d+$/i.test(url)) return url
  const layerId = String(layerIdRaw ?? '').trim()
  if (layerId && /\/(FeatureServer|MapServer)$/i.test(url)) return `${url}/${layerId}`
  return url
}

function getLayerIdFromUrl(raw: any): string {
  const m = String(raw || '').match(/\/(?:FeatureServer|MapServer)\/(\d+)(?:[/?#]|$)/i)
  return m?.[1] || ''
}

function getLayerIdFromDataSourceId(raw: any): string {
  const s = String(raw || '').trim()
  if (!s) return ''
  const patterns = [
    /(?:^|[-_])layer[-_](\d+)$/i,
    /(?:^|[-_])sublayer[-_](\d+)$/i,
    /(?:^|[-_])(\d+)$/
  ]
  for (const re of patterns) {
    const m = s.match(re)
    if (m?.[1] !== undefined) return String(m[1])
  }
  return ''
}

function firstNonEmpty(...values: any[]): string {
  for (const v of values) {
    const s = String(v ?? '').trim()
    if (s) return s
  }
  return ''
}

function loadEsriModule<T = any>(path: string): Promise<T> {
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


function getServiceBaseUrl(raw: any): string {
  const url = normalizeFeatureLayerUrl(raw)
  return url.replace(/\/(FeatureServer|MapServer)\/\d+$/i, '/$1')
}

function isServiceRootUrl(raw: any): boolean {
  return /\/(FeatureServer|MapServer)$/i.test(normalizeFeatureLayerUrl(raw))
}

async function getTokenForUrl(url: string): Promise<string> {
  const cleanUrl = String(url || '').trim()
  try {
    const sm: any = SessionManager.getInstance()
    const session: any = sm?.getSessionByUrl?.(cleanUrl) || sm?.getSessionByUrl?.('https://cbsm-hub.maps.arcgis.com') || sm?.getMainSession?.()
    const token = session?.token || session?.credential?.token
    if (token) return String(token)
  } catch {}
  try {
    const IdentityManager = await loadEsriModule<any>('esri/identity/IdentityManager')
    const cred = IdentityManager?.findCredential?.(cleanUrl) || IdentityManager?.findCredential?.(getServiceBaseUrl(cleanUrl))
    if (cred?.token) return String(cred.token)
  } catch {}
  return ''
}

async function restJson(urlRaw: string, params?: Record<string, any>): Promise<any> {
  const url = normalizeFeatureLayerUrl(urlRaw)
  if (!url) return null
  const token = await getTokenForUrl(url)
  const qs = new URLSearchParams()
  qs.set('f', 'json')
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v) !== '') qs.set(k, String(v))
  })
  if (token && !qs.has('token')) qs.set('token', token)

  try {
    const request = await loadEsriModule<any>('esri/request')
    const query: Record<string, string> = {}
    qs.forEach((v, k) => { query[k] = v })
    const response = await request(url, {
      query,
      responseType: 'json'
    })
    const data = response?.data || response
    if (data?.error) throw new Error(data.error.message || 'Errore REST ArcGIS')
    return data
  } catch (firstError) {
    const finalUrl = `${url}${url.includes('?') ? '&' : '?'}${qs.toString()}`
    // credentials:'omit' — il token è già nell'URL; 'include' causa CORS su localhost con AGOL
    const res = await fetch(finalUrl, { credentials: 'omit' })
    const data = await res.json()
    if (data?.error) throw new Error(data.error.message || 'Errore REST ArcGIS')
    return data
  }
}

async function readFieldsFromLayerRest(urlRaw: string): Promise<FieldOpt[]> {
  const url = normalizeFeatureLayerUrl(urlRaw)
  if (!url) return []
  const cacheKey = url.toLowerCase()
  if (FIELD_SCHEMA_CACHE[cacheKey]) return FIELD_SCHEMA_CACHE[cacheKey]
  try {
    const meta = await restJson(url)
    const fields = normalizeFieldList(meta?.fields)
    if (fields.length) {
      FIELD_SCHEMA_CACHE[cacheKey] = fields
      return fields
    }
  } catch {}
  return []
}

async function expandServiceSublayerOptions(options: MapLayerOpt[]): Promise<MapLayerOpt[]> {
  const expanded: MapLayerOpt[] = []
  const base = uniqueMapLayerOptions(options || [])

  for (const opt of base) {
    const rootUrl = normalizeFeatureLayerUrl(opt.url)
    if (!isServiceRootUrl(rootUrl)) {
      expanded.push(opt)
      continue
    }

    const subOptions: MapLayerOpt[] = []
    try {
      const cacheKey = rootUrl.toLowerCase()
      const service = SERVICE_META_CACHE[cacheKey] || await restJson(rootUrl)
      SERVICE_META_CACHE[cacheKey] = service
      const layers = Array.isArray(service?.layers) ? service.layers : []
      for (const lyr of layers) {
        const subId = String(lyr?.id ?? '').trim()
        if (!subId) continue
        const subUrl = `${rootUrl}/${subId}`
        const fields = normalizeFieldList(lyr?.fields)
        const geometryType = String(lyr?.geometryType || '').trim()
        const subTitle = [opt.title, String(lyr?.name || lyr?.title || `Layer ${subId}`).trim()].filter(Boolean).join(' / ')
        subOptions.push({
          key: `${opt.key}|sublayer|${subId}`,
          title: subTitle,
          url: subUrl,
          id: `${opt.id || opt.key}_sublayer_${subId}`,
          layerId: subId,
          geometryType,
          fields
        })
      }
    } catch {}

    if (subOptions.length) expanded.push(...subOptions)
    else expanded.push(opt)
  }

  return uniqueMapLayerOptions(expanded)
}

async function setMapLayerOptionsExpanded(
  opts: MapLayerOpt[],
  apply: (items: MapLayerOpt[]) => void,
  setLoading: (v: boolean) => void,
  setError: (v: string) => void,
  isCancelled: () => boolean
): Promise<void> {
  const base = uniqueMapLayerOptions(opts || [])
  apply(base)
  if (!base.length) return
  try {
    setLoading(true)
    const expanded = await expandServiceSublayerOptions(base)
    if (isCancelled()) return
    apply(expanded)
    setError(expanded.length ? '' : 'Nessun Feature Layer trovato nella mappa selezionata.')
  } catch (e: any) {
    if (!isCancelled()) setError(e?.message || String(e || 'Errore caricamento sublayer'))
  } finally {
    if (!isCancelled()) setLoading(false)
  }
}

function isFeatureLayerJson(layer: any): boolean {
  const layerType = String(layer?.layerType || layer?.type || '').toLowerCase()
  const url = String(layer?.url || '').toLowerCase()
  return (
    layerType.includes('feature') ||
    layerType.includes('mapservice') ||
    layerType.includes('map-image') ||
    /\/(?:feature|map)server(?:\/\d+)?(?:[/?#]|$)/i.test(url)
  )
}

function uniqueMapLayerOptions(items: MapLayerOpt[]): MapLayerOpt[] {
  const seen = new Set<string>()
  const out: MapLayerOpt[] = []
  for (const item of items || []) {
    const key = [item.id, normalizeFeatureLayerUrl(item.url), item.layerId, item.title].join('|').toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(item)
  }
  return out.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'it', { sensitivity: 'base' }))
}

function collectFeatureLayersFromWebMapJson(webmapJson: any): MapLayerOpt[] {
  const out: MapLayerOpt[] = []
  const visit = (layer: any, path: string[] = [], parentUrl = '') => {
    if (!layer) return
    const children = [
      ...(Array.isArray(layer?.layers) ? layer.layers : []),
      ...(Array.isArray(layer?.featureCollection?.layers) ? layer.featureCollection.layers : [])
    ]
    const rawLayerId = layer?.layerId ?? layer?.sourceLayerId ?? getLayerIdFromUrl(layer?.url) ?? ''
    const inheritedUrl = normalizeFeatureLayerUrl(layer?.url || layer?.layerDefinition?.source?.url || parentUrl || '')
    if (isFeatureLayerJson(layer)) {
      const rawTitle = String(layer?.title || layer?.name || layer?.layerDefinition?.name || `Layer ${out.length + 1}`).trim()
      const title = [...path, rawTitle].filter(Boolean).join(' / ') || `Layer ${out.length + 1}`
      const layerId = String(rawLayerId).trim()
      const url = composeLayerUrl(inheritedUrl, layerId)
      const id = String(layer?.id || layer?.itemId || '').trim()
      const geometryType = String(layer?.geometryType || layer?.layerDefinition?.geometryType || '').trim()
      const fields = normalizeFieldList(layer?.fields || layer?.layerDefinition?.fields || layer?.popupInfo?.fieldInfos)
      const key = `${id || `json_${out.length}`}|${url || title}|${layerId}`
      out.push({ key, title, url, id, layerId, geometryType, fields })
    }
    children.forEach((child: any) => visit(child, layer?.title ? [...path, String(layer.title)] : path, inheritedUrl))
  }
  ;[
    ...(Array.isArray(webmapJson?.operationalLayers) ? webmapJson.operationalLayers : []),
    ...(Array.isArray(webmapJson?.baseMap?.baseMapLayers) ? webmapJson.baseMap.baseMapLayers : [])
  ].forEach((layer: any) => visit(layer, []))
  return uniqueMapLayerOptions(out)
}

function collectFeatureLayerOptionFromDsJson(dsJson: any, fallbackId = ''): MapLayerOpt | null {
  const ds = asJs(dsJson || {})
  const type = String(ds?.type || ds?.jimuChildId || '').toLowerCase()
  const id = String(ds?.id || fallbackId || '').trim()
  const url = normalizeFeatureLayerUrl(ds?.url || ds?.sourceUrl || ds?.itemData?.url || ds?.source?.url || '')
  const layerId = firstNonEmpty(
    ds?.layerId,
    ds?.sourceLayerId,
    ds?.jimuChildId,
    getLayerIdFromUrl(url),
    getLayerIdFromDataSourceId(id),
    getLayerIdFromDataSourceId(fallbackId)
  )
  const fullUrl = composeLayerUrl(url, layerId)
  const looksFeature = type.includes('feature') || /\/(feature|map)server(?:\/\d+)?(?:[/?#]|$)/i.test(fullUrl)
  if (!looksFeature && !url) return null
  const title = String(ds?.sourceLabel || ds?.label || ds?.title || ds?.name || ds?.itemId || fallbackId || `Layer ${layerId || ''}`).trim() || `Layer ${layerId || ''}`
  const geometryType = String(ds?.geometryType || ds?.schema?.geometryType || ds?.sourceSchema?.geometryType || '').trim()
  const fields = normalizeFieldList(ds?.schema?.fields || ds?.sourceSchema?.fields || ds?.fields || ds?.itemData?.fields || ds?.layerDefinition?.fields)
  const key = `${id || `ds_${title}`}|${fullUrl || title}|${layerId}`
  return { key, title, url: fullUrl, id, layerId, geometryType, fields }
}

function collectFeatureLayersFromDataSourceManager(webMapDataSourceId: string): MapLayerOpt[] {
  const scopedId = String(webMapDataSourceId || '').trim()
  if (!scopedId) return []
  const out: MapLayerOpt[] = []
  const seen: any[] = []
  const pushDs = (dsAny: any, fallbackId = '') => {
    if (!dsAny || seen.indexOf(dsAny) >= 0) return
    seen.push(dsAny)
    try {
      const json = asJs(dsAny?.getDataSourceJson?.() || dsAny?.dataSourceJson || dsAny?.sourceJson || dsAny || {})
      const opt = collectFeatureLayerOptionFromDsJson(json, fallbackId || String(dsAny?.id || dsAny?.dataSourceId || ''))
      if (opt) out.push(opt)
    } catch {}
    const childCandidates: any[] = []
    try {
      const children = dsAny?.getChildDataSources?.()
      if (Array.isArray(children)) childCandidates.push(...children)
      else if (children && typeof children === 'object') childCandidates.push(...Object.values(asJs(children)))
    } catch {}
    try {
      const children = dsAny?.childDataSources
      if (Array.isArray(children)) childCandidates.push(...children)
      else if (children && typeof children === 'object') childCandidates.push(...Object.values(asJs(children)))
    } catch {}
    try {
      const children = dsAny?.dataSources
      if (Array.isArray(children)) childCandidates.push(...children)
      else if (children && typeof children === 'object') childCandidates.push(...Object.values(asJs(children)))
    } catch {}
    childCandidates.forEach((child: any, idx: number) => pushDs(child, `${fallbackId || webMapDataSourceId}_child_${idx}`))
  }
  try {
    const dsm: any = DataSourceManager.getInstance()
    const root = webMapDataSourceId ? dsm.getDataSource(webMapDataSourceId) : null
    pushDs(root, webMapDataSourceId)
    const all: any = dsm.getDataSources?.() || dsm.dataSources || dsm._dataSources
    const values: any[] = Array.isArray(all) ? all : (all && typeof all === 'object' ? Object.values(asJs(all)) : [])
    values.forEach((dsAny: any, idx: number) => {
      let json: any = {}
      try { json = asJs(dsAny?.getDataSourceJson?.() || dsAny?.dataSourceJson || dsAny || {}) } catch {}
      const parentId = String(json?.parentDataSourceId || json?.rootDataSourceId || dsAny?.parentDataSourceId || '').trim()
      const id = String(json?.id || dsAny?.id || dsAny?.dataSourceId || '').trim()
      if (!webMapDataSourceId || parentId === webMapDataSourceId || id.indexOf(`${webMapDataSourceId}-`) === 0 || id.indexOf(`${webMapDataSourceId}_`) === 0) {
        pushDs(dsAny, id || `manager_${idx}`)
      }
    })
  } catch {}
  return uniqueMapLayerOptions(out)
}

function collectFeatureLayersFromAppConfigDataSources(appConfig: any, webMapDataSourceId: string): MapLayerOpt[] {
  const scopedId = String(webMapDataSourceId || '').trim()
  if (!scopedId) return []
  const out: MapLayerOpt[] = []
  try {
    const dataSources: any = asJs(appConfig?.dataSources || {})
    Object.entries(dataSources || {}).forEach(([id, raw]: [string, any]) => {
      const ds = asJs(raw || {})
      const parentId = String(ds?.parentDataSourceId || ds?.rootDataSourceId || '').trim()
      const dsId = String(ds?.id || id || '').trim()
      const isScoped = parentId === scopedId || dsId === scopedId || dsId.indexOf(`${scopedId}-`) === 0 || dsId.indexOf(`${scopedId}_`) === 0
      if (!isScoped) return
      const opt = collectFeatureLayerOptionFromDsJson({ ...ds, id: ds?.id || id }, id)
      if (opt) out.push(opt)
    })
  } catch {}
  return uniqueMapLayerOptions(out)
}

function getBuilderAppConfigForSetting(): any {
  try {
    const state: any = getAppStore()?.getState?.()
    const candidates = [
      state?.appStateInBuilder?.appConfig,
      state?.appStateInBuilder?.appConfig?.asMutable ? state.appStateInBuilder.appConfig.asMutable({ deep: true }) : null,
      state?.appConfig
    ]
    for (const c of candidates) {
      const js = asJs(c)
      if (js?.widgets || js?.dataSources) return js
    }
  } catch {}
  return {}
}


type MapInfo = { dataSourceId: string; itemId: string; label: string; portalUrl: string }

function addUniqueString(list: string[], value: any) {
  const s = String(value || '').trim()
  if (s && list.indexOf(s) < 0) list.push(s)
}

function collectDataSourceIdsFromObject(raw: any, maxDepth = 5): string[] {
  const ids: string[] = []
  const seen: any[] = []
  const visit = (node: any, depth: number, keyName = '') => {
    if (node === null || node === undefined || depth > maxDepth) return
    const value = asJs<any>(node)
    if (typeof value === 'string') {
      if (/dataSourceId|dataSourceIds|webMapDataSourceId|webmapDataSourceId|mainDataSourceId/i.test(keyName)) addUniqueString(ids, value)
      return
    }
    if (typeof value !== 'object') return
    if (seen.indexOf(value) >= 0) return
    seen.push(value)
    if (Array.isArray(value)) {
      value.forEach((item, idx) => visit(item, depth + 1, keyName || String(idx)))
      return
    }
    Object.entries(value).forEach(([k, v]: [string, any]) => {
      if (/^(dataSourceId|webMapDataSourceId|webmapDataSourceId|mainDataSourceId)$/i.test(k)) addUniqueString(ids, v)
      else if (/^(dataSourceIds|webMapDataSourceIds|webmapDataSourceIds)$/i.test(k) && Array.isArray(asJs(v))) {
        asJs<any[]>(v).forEach(item => addUniqueString(ids, item))
      }
      visit(v, depth + 1, k)
    })
  }
  visit(raw, 0)
  return ids
}

function getDataSourceInfoById(appConfig: any, dataSourceId: string): MapInfo {
  const id = String(dataSourceId || '').trim()
  let itemId = ''
  let label = ''
  let portalUrl = 'https://cbsm-hub.maps.arcgis.com'
  try {
    const ds: any = id ? DataSourceManager.getInstance().getDataSource(id) : null
    const json = asJs<any>(ds?.getDataSourceJson?.() || ds?.dataSourceJson || {})
    itemId = String(json?.itemId || json?.sourceItemId || ds?.itemId || '').trim()
    label = String(ds?.getLabel?.() || json?.label || json?.sourceLabel || json?.title || '').trim()
    portalUrl = String(json?.portalUrl || json?.portal?.url || portalUrl).trim() || portalUrl
  } catch {}
  try {
    const dataSources: any = asJs(appConfig?.dataSources || {})
    const json = asJs<any>(dataSources?.[id] || {})
    if (!itemId) itemId = String(json?.itemId || json?.sourceItemId || '').trim()
    if (!label) label = String(json?.label || json?.sourceLabel || json?.title || json?.itemId || '').trim()
    portalUrl = String(json?.portalUrl || json?.portal?.url || portalUrl).trim() || portalUrl
  } catch {}
  return { dataSourceId: id, itemId, label, portalUrl }
}

function getMapInfosFromAppConfig(appConfig: any, mapWidgetId: string): MapInfo[] {
  const widgets = asJs<Record<string, any>>(appConfig?.widgets || {})
  const widget = asJs<any>(widgets?.[mapWidgetId] || {})
  if (!mapWidgetId || !widget) return []

  const ids: string[] = []
  const useSources = asJs<any[]>(widget?.useDataSources || widget?.config?.useDataSources || []) || []
  useSources.forEach((u: any) => addUniqueString(ids, u?.dataSourceId || u?.mainDataSourceId))
  addUniqueString(ids, widget?.config?.dataSourceId)
  addUniqueString(ids, widget?.config?.webMapDataSourceId)
  addUniqueString(ids, widget?.config?.webmapDataSourceId)
  collectDataSourceIdsFromObject(widget?.config || {}).forEach(id => addUniqueString(ids, id))

  // Tiene solo data source effettivamente legate al widget Mappa selezionato.
  // Non usa più l'elenco globale dei DataSourceManager, perché in Builder include anche layer AGOL non presenti nella mappa.
  const infos = ids.map(id => getDataSourceInfoById(appConfig, id)).filter(info => !!info.dataSourceId)
  const seen = new Set<string>()
  return infos.filter(info => {
    const key = info.dataSourceId.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function getFieldsFromDataSourceById(dataSourceId: string, appConfig?: any): FieldOpt[] {
  const id = String(dataSourceId || '').trim()
  if (!id) return []
  const candidates: any[] = []

  try {
    const dsm: any = DataSourceManager.getInstance()
    const direct = dsm.getDataSource?.(id)
    if (direct) candidates.push(direct)
    const all: any = dsm.getDataSources?.() || dsm.dataSources || dsm._dataSources
    const values: any[] = Array.isArray(all) ? all : (all && typeof all === 'object' ? Object.values(asJs(all)) : [])
    values.forEach((dsAny: any) => {
      let json: any = {}
      try { json = asJs(dsAny?.getDataSourceJson?.() || dsAny?.dataSourceJson || dsAny || {}) } catch {}
      const dsId = String(json?.id || dsAny?.id || dsAny?.dataSourceId || '').trim()
      if (dsId === id) candidates.push(dsAny)
    })
  } catch {}

  try {
    const dataSources = asJs<Record<string, any>>(appConfig?.dataSources || {})
    if (dataSources?.[id]) candidates.push({ dataSourceJson: dataSources[id] })
  } catch {}

  for (const dsAny of candidates) {
    try {
      const json = asJs(dsAny?.getDataSourceJson?.() || dsAny?.dataSourceJson || dsAny?.sourceJson || dsAny || {})
      const fields = normalizeFieldList(
        dsAny?.getSchema?.()?.fields ||
        json?.schema?.fields ||
        json?.sourceSchema?.fields ||
        dsAny?.schema?.fields ||
        json?.fields ||
        json?.itemData?.fields ||
        json?.layerDefinition?.fields
      )
      if (fields.length) return fields
    } catch {}
  }
  return []
}

function getMapInfoFromAppConfig(appConfig: any, mapWidgetId: string): { dataSourceId: string; itemId: string; label: string; portalUrl: string } {
  const widgets = asJs<Record<string, any>>(appConfig?.widgets || {})
  const widget = asJs<any>(widgets?.[mapWidgetId] || {})
  const useDs = asJs<any[]>(widget?.useDataSources || widget?.config?.useDataSources || []) || []
  const dataSourceId = String(useDs?.[0]?.dataSourceId || widget?.config?.dataSourceId || widget?.config?.webMapDataSourceId || '').trim()
  let itemId = ''
  let label = ''
  let portalUrl = 'https://cbsm-hub.maps.arcgis.com'
  try {
    const ds: any = dataSourceId ? DataSourceManager.getInstance().getDataSource(dataSourceId) : null
    const json = asJs<any>(ds?.getDataSourceJson?.() || ds?.dataSourceJson || {})
    itemId = String(json?.itemId || json?.sourceItemId || ds?.itemId || '').trim()
    label = String(ds?.getLabel?.() || json?.label || json?.sourceLabel || '').trim()
    portalUrl = String(json?.portalUrl || json?.portal?.url || portalUrl).trim() || portalUrl
  } catch {}
  try {
    const dataSources: any = asJs(appConfig?.dataSources || {})
    const json = asJs<any>(dataSources?.[dataSourceId] || {})
    if (!itemId) itemId = String(json?.itemId || json?.sourceItemId || '').trim()
    if (!label) label = String(json?.label || json?.sourceLabel || json?.title || '').trim()
    portalUrl = String(json?.portalUrl || json?.portal?.url || portalUrl).trim() || portalUrl
  } catch {}
  return { dataSourceId, itemId, label, portalUrl }
}

async function readWebMapFeatureLayers(portalItemId: string, portalUrl?: string): Promise<MapLayerOpt[]> {
  const itemId = String(portalItemId || '').trim()
  if (!itemId) return []
  const cleanPortalUrl = String(portalUrl || 'https://cbsm-hub.maps.arcgis.com').trim().replace(/\/$/, '') || 'https://cbsm-hub.maps.arcgis.com'
  try {
    const [PortalItem, Portal] = await Promise.all([
      loadEsriModule<any>('esri/portal/PortalItem'),
      loadEsriModule<any>('esri/portal/Portal')
    ])
    const portal = new Portal({ url: cleanPortalUrl })
    const item = new PortalItem({ id: itemId, portal })
    if (typeof item.load === 'function') await item.load()
    const data = await item.fetchData('json')
    const opts = collectFeatureLayersFromWebMapJson(data)
    if (opts.length) return opts
  } catch {}
  return []
}

async function readFeatureLayerFields(urlRaw: string, preferredTitle?: string): Promise<FieldOpt[]> {
  const url = normalizeFeatureLayerUrl(urlRaw)
  if (!url) return []
  const cacheKey = url.toLowerCase()
  if (FIELD_SCHEMA_CACHE[cacheKey]) return FIELD_SCHEMA_CACHE[cacheKey]

  if (!isServiceRootUrl(url)) {
    const fields = await readFieldsFromLayerRest(url)
    if (fields.length) {
      FIELD_SCHEMA_CACHE[cacheKey] = fields
      return fields
    }
  }

  if (isServiceRootUrl(url)) {
    try {
      const serviceKey = url.toLowerCase()
      const service = SERVICE_META_CACHE[serviceKey] || await restJson(url)
      SERVICE_META_CACHE[serviceKey] = service
      const layers = Array.isArray(service?.layers) ? service.layers : []
      const pref = compactFieldKey(preferredTitle || '')
      const ordered = [...layers].sort((a: any, b: any) => {
        const ak = compactFieldKey(a?.name || a?.title || '')
        const bk = compactFieldKey(b?.name || b?.title || '')
        const as = pref && (pref.includes(ak) || ak.includes(pref)) ? -1 : 0
        const bs = pref && (pref.includes(bk) || bk.includes(pref)) ? -1 : 0
        return as - bs
      })
      for (const lyr of ordered) {
        const id = String(lyr?.id ?? '').trim()
        if (!id) continue
        const fields = normalizeFieldList(lyr?.fields)
        if (fields.length) {
          FIELD_SCHEMA_CACHE[`${url}/${id}`.toLowerCase()] = fields
          FIELD_SCHEMA_CACHE[cacheKey] = fields
          return fields
        }
        const restFields = await readFieldsFromLayerRest(`${url}/${id}`)
        if (restFields.length) {
          FIELD_SCHEMA_CACHE[cacheKey] = restFields
          return restFields
        }
      }
    } catch {}
  }

  try {
    const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
    const layer = new FeatureLayer({ url: isServiceRootUrl(url) ? `${url}/0` : url, outFields: ['*'] })
    // Timeout 8s su layer.load(): in ExB Builder può non completare mai se il token non è disponibile
    if (typeof layer.load === 'function') {
      await Promise.race([
        layer.load(),
        new Promise<void>((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000))
      ])
    }
    const fields = normalizeFieldList(layer?.fields)
    if (fields.length) {
      FIELD_SCHEMA_CACHE[cacheKey] = fields
      return fields
    }
  } catch {}

  return []
}

function compactFieldKey(v: any): string {
  return String(v || '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

function candidateFieldKeys(kind: 'comune' | 'sezione' | 'foglio' | 'mappale'): string[] {
  if (kind === 'comune') {
    // Il Comune deve essere il campo descrittivo/nome, non il codice catastale, ISTAT o Belfiore.
    return [
      'nomecomune', 'nomcomune', 'denominazionecomune', 'denomcomune', 'descomune', 'desccomune',
      'comunedesc', 'comunedenominazione', 'comuneamm', 'nomecom', 'nomcom', 'dencom',
      'denominazione', 'descrizionecomune', 'descrcomune', 'comune'
    ]
  }
  if (kind === 'sezione') return ['sezione', 'sez', 'sezcens', 'sezionecensuaria', 'sezionecatastale', 'codsezione', 'codsez']
  if (kind === 'foglio') return ['foglio', 'fg', 'numfoglio', 'numerofoglio', 'fog', 'codfoglio', 'codfog']
  return ['mappale', 'particella', 'part', 'mapp', 'numappale', 'nummappale', 'numero', 'num', 'codmappale']
}

function isComuneCodeLikeField(field: FieldOpt | undefined | null): boolean {
  const key = `${compactFieldKey(field?.name)} ${compactFieldKey(field?.alias)}`
  return /codicecatastale|codcat|belfiore|codicebelfiore|codicecomune|codcomune|codistat|istatcomune|codiceistat|codcom|istat/.test(key)
}

function comuneNameScore(field: FieldOpt | undefined | null): number {
  if (!field || isComuneCodeLikeField(field)) return -1000
  const name = compactFieldKey(field.name)
  const alias = compactFieldKey(field.alias)
  const both = `${name} ${alias}`
  const type = String(field.type || '').toLowerCase()
  let score = 0
  if (/string/.test(type)) score += 8
  if (name === 'nomecomune' || alias === 'nomecomune') score += 120
  if (name === 'denominazionecomune' || alias === 'denominazionecomune') score += 115
  if (name === 'comune' || alias === 'comune') score += 95
  if (/nome.*comune|comune.*nome/.test(both)) score += 90
  if (/denominazione.*comune|comune.*denominazione/.test(both)) score += 88
  if (/descrizione.*comune|comune.*descrizione|desc.*comune|comune.*desc/.test(both)) score += 75
  if (/dencom|nomcom|nomecom|comunedesc|comunedenominazione/.test(both)) score += 70
  if (/comune/.test(both)) score += 45
  return score
}

function findFieldOpt(fields: FieldOpt[], name: string): FieldOpt | undefined {
  const key = compactFieldKey(name)
  return fields.find(f => compactFieldKey(f.name) === key || compactFieldKey(f.alias) === key)
}

function suggestComuneNameField(fields: FieldOpt[], fallback: string): string {
  if (!fields.length) return fallback
  const current = findFieldOpt(fields, fallback)
  if (current && !isComuneCodeLikeField(current) && comuneNameScore(current) >= 45) return current.name || fallback

  let best: FieldOpt | undefined
  let bestScore = -1000
  fields.forEach(f => {
    const score = comuneNameScore(f)
    if (score > bestScore) {
      best = f
      bestScore = score
    }
  })
  return best && bestScore >= 45 ? best.name : (current?.name || fallback)
}

function fieldExists(fields: FieldOpt[], name: string): boolean {
  return !!findFieldOpt(fields, name)
}

function suggestField(fields: FieldOpt[], kind: 'comune' | 'sezione' | 'foglio' | 'mappale', fallback: string): string {
  if (!fields.length) return fallback
  if (kind === 'comune') return suggestComuneNameField(fields, fallback)
  if (fieldExists(fields, fallback)) {
    const f = findFieldOpt(fields, fallback)
    return f?.name || fallback
  }
  const candidates = candidateFieldKeys(kind)
  for (const c of candidates) {
    const exact = fields.find(f => compactFieldKey(f.name) === c || compactFieldKey(f.alias) === c)
    if (exact?.name) return exact.name
  }
  for (const c of candidates) {
    const partial = fields.find(f => {
      const n = compactFieldKey(f.name)
      const a = compactFieldKey(f.alias)
      return n.endsWith(c) || a.endsWith(c) || n.includes(c) || a.includes(c)
    })
    if (partial?.name) return partial.name
  }
  return fallback
}

const P = {
  wrap: { padding: '0 12px 34px', fontSize: 13, background: '#111827', minHeight: '100%', color: '#e5e7eb', overflowY: 'auto' as const, overflowX: 'hidden' as const, boxSizing: 'border-box' as const, maxWidth: '100%' } as React.CSSProperties,
  sec: { fontSize: 12, fontWeight: 800, color: '#bfdbfe', textTransform: 'uppercase' as const, letterSpacing: 0.9, borderBottom: '1px solid rgba(255,255,255,0.14)', padding: '10px 0 8px', margin: '18px 0 12px' } as React.CSSProperties,
  box: { border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.045)', borderRadius: 10, padding: 10, marginBottom: 12, boxSizing: 'border-box' as const, maxWidth: '100%' } as React.CSSProperties,
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, minWidth: 0 } as React.CSSProperties,
  lbl: { fontSize: 12, fontWeight: 700, color: '#d1d5db', display: 'block', marginBottom: 5, marginTop: 10, overflowWrap: 'anywhere' as const, lineHeight: 1.25 } as React.CSSProperties,
  hint: { fontSize: 11.5, color: '#9ca3af', marginTop: 4, lineHeight: 1.45 } as React.CSSProperties,
  inp: { width: '100%', minWidth: 0, height: 34, padding: '0 9px', fontSize: 12, border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, outline: 'none', boxSizing: 'border-box' as const, background: 'rgba(255,255,255,0.07)', color: '#e5e7eb' } as React.CSSProperties,
  sel: { width: '100%', minWidth: 0, height: 34, padding: '0 9px', fontSize: 12, border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, outline: 'none', boxSizing: 'border-box' as const, background: '#1f2937', color: '#e5e7eb', colorScheme: 'dark' } as React.CSSProperties,
  opt: { backgroundColor: '#111827', color: '#e5e7eb' } as React.CSSProperties,
  check: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#d1d5db', cursor: 'pointer', marginTop: 9, lineHeight: 1.35 } as React.CSSProperties,
  preview: { marginTop: 12, padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.04)', fontSize: 11.5, color: '#a0aec0', lineHeight: 1.55 } as React.CSSProperties
}

function TextInput(p: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={P.lbl}>{p.label}</span>
      <input type='text' value={p.value || ''} placeholder={p.placeholder} onChange={e => p.onChange(e.currentTarget.value)} style={P.inp} />
    </label>
  )
}

function NumInput(p: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={P.lbl}>{p.label}</span>
      <input type='number' value={p.value} min={p.min} max={p.max} step={p.step || 1} onChange={e => p.onChange(parseNum(e.currentTarget.value, p.value, p.min, p.max))} style={P.inp} />
    </label>
  )
}

function Check(p: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={P.check}>
      <input type='checkbox' checked={p.value} onChange={e => p.onChange(e.currentTarget.checked)} />
      <span>{p.label}</span>
    </label>
  )
}

function FieldSelect(p: { label: string; value: string; fields: FieldOpt[]; onChange: (v: string) => void; fallback: string }) {
  const value = p.value || p.fallback
  const hasFields = p.fields.length > 0
  const hasCurrent = p.fields.some(f => f.name === value)
  return (
    <label style={{ display: 'block' }}>
      <span style={P.lbl}>{p.label}</span>
      <select
        value={value}
        onChange={e => p.onChange(e.currentTarget.value)}
        style={{ ...P.sel, cursor: hasFields ? 'pointer' : 'default' }}
      >
        {!hasCurrent && <option value={value} style={P.opt}>{value}</option>}
        {!hasFields && <option value={`${value}__no_fields__`} disabled style={P.opt}>Elenco campi non ancora caricato</option>}
        {p.fields.map(f => <option key={f.name} value={f.name} style={P.opt}>{f.alias ? `${f.alias} (${f.name})` : f.name}</option>)}
      </select>
    </label>
  )
}

function buildFieldSuggestionPatch(fields: FieldOpt[], cfg: any): Record<string, any> {
  const patch: Record<string, any> = {}
  if (!fields.length) return patch
  const cComune = String(cfg.fieldComune || 'COMUNE')
  const cSezione = String(cfg.fieldSezione || 'SEZIONE')
  const cFoglio = String(cfg.fieldFoglio || 'FOGLIO')
  const cMappale = String(cfg.fieldMappale || 'MAPPALE')
  const sComune = suggestField(fields, 'comune', cComune)
  const sSezione = suggestField(fields, 'sezione', cSezione)
  const sFoglio = suggestField(fields, 'foglio', cFoglio)
  const sMappale = suggestField(fields, 'mappale', cMappale)
  const currentComune = findFieldOpt(fields, cComune)
  if ((!fieldExists(fields, cComune) || isComuneCodeLikeField(currentComune)) && sComune !== cComune) patch.fieldComune = sComune
  if (!fieldExists(fields, cSezione) && sSezione !== cSezione) patch.fieldSezione = sSezione
  if (!fieldExists(fields, cFoglio) && sFoglio !== cFoglio) patch.fieldFoglio = sFoglio
  if (!fieldExists(fields, cMappale) && sMappale !== cMappale) patch.fieldMappale = sMappale
  return patch
}

function LayerSelect(p: {
  value: string
  options: MapLayerOpt[]
  loading: boolean
  disabled: boolean
  onChange: (key: string) => void
}) {
  return (
    <select value={p.value || ''} disabled={p.disabled || p.loading} onChange={e => p.onChange(e.currentTarget.value)} style={{ ...P.sel, cursor: p.disabled || p.loading ? 'not-allowed' : 'pointer' }}>
      <option value='' style={P.opt}>{p.loading ? 'Caricamento layer…' : '- Seleziona layer catastale -'}</option>
      {p.options.map(o => <option key={o.key} value={o.key} style={P.opt}>{o.title}</option>)}
    </select>
  )
}

export default function Setting(props: Props) {
  const cfg = { ...asJs<any>(defaultConfig), ...(asJs<any>(props.config) || {}) }
  const mapWidgetId = (asJs<string[]>(cfg.useMapWidgetIds || []) || [])[0] || ''
  const selectedLayerKeyCfg = String((cfg as any).layerKey || '')

  const [schemaFields, setSchemaFields] = React.useState<FieldOpt[]>([])
  const [schemaLabel, setSchemaLabel] = React.useState('')
  const [schemaLoading, setSchemaLoading] = React.useState(false)
  const [mapLayerOptions, setMapLayerOptions] = React.useState<MapLayerOpt[]>([])
  const [mapLayerLoading, setMapLayerLoading] = React.useState(false)
  const [mapLayerError, setMapLayerError] = React.useState('')
  const [mapLabel, setMapLabel] = React.useState('')

  // Ref per leggere cfg.layerTitle dentro l'effect senza aggiungerlo alle dipendenze (evita loop)
  const layerTitleRef = React.useRef('')
  layerTitleRef.current = String(cfg.layerTitle || '')

  const setCfg = (patch: Record<string, any>) => {
    props.onSettingChange({
      id: props.id,
      config: toImmutableCfg(props.config || defaultConfig, patch) as any
    })
  }

  const selectedMapLayerKey = React.useMemo(() => {
    const cfgUrl = normalizeFeatureLayerUrl(cfg.layerUrl || '')
    const cfgTitle = String(cfg.layerTitle || '').trim().toLowerCase()
    const cfgId = String((cfg as any).layerId || '').trim()
    // URL è stabile sia prima che dopo expandServiceSublayerOptions (la key stringa può cambiare per i sublayer)
    return mapLayerOptions.find(o =>
      (!!cfgUrl && normalizeFeatureLayerUrl(o.url) === cfgUrl) ||
      (!!selectedLayerKeyCfg && o.key === selectedLayerKeyCfg) ||
      (!!cfgId && o.id === cfgId) ||
      (!!cfgTitle && o.title.toLowerCase() === cfgTitle)
    )?.key || ''
  }, [mapLayerOptions, selectedLayerKeyCfg, cfg.layerUrl, cfg.layerTitle, (cfg as any).layerId])

  React.useEffect(() => {
    let cancelled = false
    const appConfig = getBuilderAppConfigForSetting()
    const mapInfos = getMapInfosFromAppConfig(appConfig, mapWidgetId)
    const mapLabelText = mapInfos.map(info => info.label || info.itemId || info.dataSourceId).filter(Boolean).join(' / ')
    setMapLabel(mapLabelText)

    if (!mapWidgetId) {
      setMapLayerOptions([])
      setMapLayerError('')
      setMapLayerLoading(false)
      return () => { cancelled = true }
    }

    ;(async () => {
      setMapLayerLoading(true)
      setMapLayerError('')

      const collected: MapLayerOpt[] = []

      // Carica esclusivamente i layer collegati al widget Mappa selezionato.
      // Non interroga più l'elenco globale dei data source, altrimenti compaiono layer AGOL non presenti nella mappa.
      for (const mapInfo of mapInfos) {
        try { collected.push(...collectFeatureLayersFromDataSourceManager(mapInfo.dataSourceId)) } catch {}
        try { collected.push(...collectFeatureLayersFromAppConfigDataSources(appConfig, mapInfo.dataSourceId)) } catch {}
        if (mapInfo.itemId) {
          try {
            collected.push(...await readWebMapFeatureLayers(mapInfo.itemId, mapInfo.portalUrl))
          } catch (e: any) {
            // La lettura della WebMap è un supporto aggiuntivo: non deve bloccare le altre fonti.
          }
        }
      }

      if (cancelled) return

      const base = uniqueMapLayerOptions(collected).filter(o => {
        const hasUrl = !!normalizeFeatureLayerUrl(o.url)
        const hasFields = normalizeFieldList(o.fields).length > 0
        const hasId = !!String(o.id || '').trim()
        return hasUrl || hasFields || hasId
      })

      if (!base.length) {
        setMapLayerOptions([])
        setMapLayerError(mapInfos.length ? 'Nessun layer selezionabile rilevato nel widget Mappa selezionato.' : 'Non riesco a leggere la WebMap dal widget Mappa selezionato.')
        setMapLayerLoading(false)
        return
      }

      try {
        const expanded = await expandServiceSublayerOptions(base)
        if (cancelled) return
        setMapLayerOptions(expanded)
        setMapLayerError(expanded.length ? '' : 'Nessun Feature Layer trovato nella mappa selezionata.')
      } catch (e: any) {
        if (cancelled) return
        setMapLayerOptions(base)
        setMapLayerError(base.length ? '' : (e?.message || String(e || 'Errore caricamento layer')))
      } finally {
        if (!cancelled) setMapLayerLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, [mapWidgetId])

  React.useEffect(() => {
    let cancelled = false
    const selectedOpt = mapLayerOptions.find(o => o.key === selectedMapLayerKey)
    const appConfig = getBuilderAppConfigForSetting()
    const layerUrlRaw = cfg.layerUrl || selectedOpt?.url || ''
    const layerSubId = (cfg as any).layerLayerId || selectedOpt?.layerId || getLayerIdFromUrl(layerUrlRaw) || getLayerIdFromDataSourceId(selectedOpt?.id)
    const url = composeLayerUrl(layerUrlRaw, layerSubId)
    const fieldsFromConfig = normalizeFieldList(selectedOpt?.fields || getFieldsFromDataSourceById(selectedOpt?.id || '', appConfig))
    setSchemaFields([])
    setSchemaLabel('')
    setSchemaLoading(false)

    if (fieldsFromConfig.length) {
      // Usa ref per il titolo: non deve essere una dipendenza dell'effect (evita loop)
      const label = String(layerTitleRef.current || selectedOpt?.title || '')
      setSchemaFields(fieldsFromConfig)
      setSchemaLabel(label)
      const patch = buildFieldSuggestionPatch(fieldsFromConfig, cfg)
      if (Object.keys(patch).length) setCfg(patch)
      return () => { cancelled = true }
    }

    if (!url) return () => { cancelled = true }

    const cached = FIELD_SCHEMA_CACHE[url.toLowerCase()]
    if (cached?.length) {
      setSchemaFields(cached)
      setSchemaLabel(String(layerTitleRef.current || selectedOpt?.title || ''))
      const patch = buildFieldSuggestionPatch(cached, cfg)
      if (Object.keys(patch).length) setCfg(patch)
      return () => { cancelled = true }
    }

    setSchemaLoading(true)
    readFeatureLayerFields(url, String(layerTitleRef.current || selectedOpt?.title || ''))
      .then(fields => {
        if (cancelled) return
        setSchemaFields(fields)
        setSchemaLabel(String(layerTitleRef.current || selectedOpt?.title || ''))
        const patch = buildFieldSuggestionPatch(fields, cfg)
        if (Object.keys(patch).length) setCfg(patch)
      })
      .finally(() => { setSchemaLoading(false) })
    return () => { cancelled = true }
  }, [cfg.layerUrl, selectedMapLayerKey, mapLayerOptions])

  const onMapSelect = (ids: string[]) => {
    setCfg({
      useMapWidgetIds: ids,
      layerKey: '',
      layerId: '',
      layerLayerId: '',
      layerUrl: '',
      layerTitle: ''
    })
  }

  const onLayerSelect = (key: string) => {
    const opt = mapLayerOptions.find(o => o.key === key)
    if (!opt) {
      setCfg({ layerKey: '', layerId: '', layerLayerId: '', layerUrl: '', layerTitle: '' })
      return
    }
    const fields = normalizeFieldList(opt.fields || getFieldsFromDataSourceById(opt.id, getBuilderAppConfigForSetting()))
    const patch: Record<string, any> = {
      layerKey: opt.key,
      layerId: opt.id,
      layerLayerId: opt.layerId || getLayerIdFromUrl(opt.url) || getLayerIdFromDataSourceId(opt.id),
      layerUrl: composeLayerUrl(opt.url, opt.layerId || getLayerIdFromUrl(opt.url) || getLayerIdFromDataSourceId(opt.id)),
      layerTitle: opt.title
    }
    if (fields.length) {
      patch.fieldComune = suggestField(fields, 'comune', String(cfg.fieldComune || 'COMUNE'))
      patch.fieldSezione = suggestField(fields, 'sezione', String(cfg.fieldSezione || 'SEZIONE'))
      patch.fieldFoglio = suggestField(fields, 'foglio', String(cfg.fieldFoglio || 'FOGLIO'))
      patch.fieldMappale = suggestField(fields, 'mappale', String(cfg.fieldMappale || 'MAPPALE'))
    }
    setCfg(patch)
  }

  return (
    <div style={P.wrap}>
      <div style={P.sec}>Mappa e layer catastale</div>
      <div style={P.box}>
        <span style={P.lbl}>Widget Mappa</span>
        <MapWidgetSelector onSelect={onMapSelect} useMapWidgetIds={asJs(cfg.useMapWidgetIds || [])} />
        <div style={P.hint}>Seleziona il widget Mappa già presente nella pagina. Da quella mappa verranno letti i layer disponibili.</div>
        {!!mapLabel && <div style={P.hint}>Mappa rilevata: <b style={{ color: '#e5e7eb' }}>{mapLabel}</b></div>}

        <span style={{ ...P.lbl, marginTop: 12 }}>Layer catastale nella mappa</span>
        <LayerSelect
          value={selectedMapLayerKey}
          options={mapLayerOptions}
          loading={mapLayerLoading}
          disabled={!mapWidgetId || mapLayerOptions.length === 0}
          onChange={onLayerSelect}
        />
        {!mapWidgetId && <div style={P.hint}>Seleziona prima il widget Mappa.</div>}
        {mapWidgetId && !mapLayerLoading && mapLayerOptions.length === 0 && <div style={P.hint}>Nessun layer selezionabile rilevato nella mappa.</div>}
        {mapLayerError && <div style={{ ...P.hint, color: '#fca5a5' }}>{mapLayerError}</div>}
        {(cfg.layerTitle || cfg.layerUrl) && <div style={P.preview}>Layer selezionato: <b style={{ color: '#e5e7eb' }}>{cfg.layerTitle || '—'}</b>{cfg.layerUrl ? <><br />URL: {cfg.layerUrl}</> : null}</div>}
      </div>

      <div style={P.sec}>Campi catastali</div>
      <div style={P.box}>
        {schemaLoading && <div style={P.hint}>Lettura schema campi del layer selezionato…</div>}
        {!!schemaLabel && <div style={P.hint}>Schema letto da: <b style={{ color: '#e5e7eb' }}>{schemaLabel}</b></div>}
        {!schemaLoading && !schemaFields.length && <div style={P.hint}>Seleziona un layer catastale dalla mappa per compilare l’elenco dei campi.</div>}
        <div style={P.grid2}>
          <FieldSelect label='Campo Comune (nome)' value={String(cfg.fieldComune || 'COMUNE')} fields={schemaFields} onChange={v => setCfg({ fieldComune: v })} fallback='COMUNE' />
          <FieldSelect label='Campo Sezione' value={String(cfg.fieldSezione || 'SEZIONE')} fields={schemaFields} onChange={v => setCfg({ fieldSezione: v })} fallback='SEZIONE' />
          <FieldSelect label='Campo Foglio' value={String(cfg.fieldFoglio || 'FOGLIO')} fields={schemaFields} onChange={v => setCfg({ fieldFoglio: v })} fallback='FOGLIO' />
          <FieldSelect label='Campo Mappale' value={String(cfg.fieldMappale || 'MAPPALE')} fields={schemaFields} onChange={v => setCfg({ fieldMappale: v })} fallback='MAPPALE' />
        </div>
        <div style={P.hint}>Per il Comune selezionare il campo con il nome descrittivo del Comune, non il codice catastale/ISTAT/Belfiore.</div>
        <Check label='Mostra anche il filtro Sezione' value={cfg.mostraSezione !== false} onChange={v => setCfg({ mostraSezione: v })} />
        <Check label='Richiedi almeno il Foglio per eseguire la ricerca' value={cfg.richiediFoglioPerRicerca !== false} onChange={v => setCfg({ richiediFoglioPerRicerca: v })} />
      </div>

      <div style={P.sec}>Comportamento ricerca</div>
      <div style={P.box}>
        <Check label='Evidenzia risultati' value={cfg.evidenziaRisultati !== false} onChange={v => setCfg({ evidenziaRisultati: v })} />
        <Check label='Zoom ai risultati' value={cfg.zoomAllaRicerca !== false} onChange={v => setCfg({ zoomAllaRicerca: v })} />
        <div style={P.grid2}>
          <NumInput label='Massimo feature ricerca' value={parseNum(cfg.maxResultFeatures, 500, 1, 5000)} min={1} max={5000} onChange={v => setCfg({ maxResultFeatures: v })} />
          <NumInput label='Massimo valori lista' value={parseNum(cfg.maxDistinctValues, 5000, 50, 20000)} min={50} max={20000} onChange={v => setCfg({ maxDistinctValues: v })} />
          <NumInput label='Scala zoom singolo punto' value={parseNum(cfg.zoomScale, 2500, 0, 500000)} min={0} max={500000} onChange={v => setCfg({ zoomScale: v })} />
        </div>
      </div>

      <div style={P.sec}>Fallback tecnico</div>
      <div style={P.box}>
        <TextInput label='URL layer selezionato' value={String(cfg.layerUrl || '')} onChange={v => setCfg({ layerUrl: v })} placeholder='Compilato automaticamente dalla scelta del layer in mappa' />
        <TextInput label='Titolo layer selezionato' value={String(cfg.layerTitle || '')} onChange={v => setCfg({ layerTitle: v })} placeholder='Compilato automaticamente dalla scelta del layer in mappa' />
        <div style={P.hint}>Questi campi restano disponibili solo come fallback. Normalmente basta scegliere il widget Mappa e poi il layer catastale dalla combo.</div>
      </div>
    </div>
  )
}
