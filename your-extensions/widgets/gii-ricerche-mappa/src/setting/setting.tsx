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

function isBasemapOrImageText(raw: any): boolean {
  const text = String(raw || '').toLowerCase()
  if (!text) return false
  return /basemap|base\s*map|world[_\s-]*imagery|imagery|immagini|satellite|orthophoto|ortofoto|ortofoto|raster|hillshade|shaded\s*relief|terrain|elevation|topographic|topo\b|streets|navigation|oceans|labels|reference|vectortile|vector\s*tile|tileserver|tile\s*server|webtile|wmts|wms/.test(text)
}

function isBasemapOrImageLayerJson(layer: any, path: string[] = []): boolean {
  const layerType = String(layer?.layerType || layer?.type || '').toLowerCase()
  const url = String(layer?.url || layer?.styleUrl || '').toLowerCase()
  const title = [...path, String(layer?.title || layer?.name || layer?.layerDefinition?.name || '')].filter(Boolean).join(' / ')

  if (/vector|tile|tiled|webtile|wmts|wms|imagery|raster|elevation|bing|openstreetmap/.test(layerType)) return true
  if (isBasemapOrImageText(title) || isBasemapOrImageText(url)) return true
  return false
}

function isBasemapOrImageOption(opt: MapLayerOpt | null | undefined): boolean {
  if (!opt) return false
  const text = [opt.title, opt.url, opt.geometryType, opt.id].filter(Boolean).join(' ')
  return isBasemapOrImageText(text)
}

function isCandidateMapLayerOption(opt: MapLayerOpt | null | undefined): boolean {
  if (!opt) return false
  if (isBasemapOrImageOption(opt)) return false
  return !!normalizeFeatureLayerUrl(opt.url) || normalizeFieldList(opt.fields).length > 0 || !!String(opt.id || '').trim()
}

function isSelectableSearchLayerOption(opt: MapLayerOpt | null | undefined): boolean {
  if (!opt) return false
  if (isBasemapOrImageOption(opt)) return false
  const url = normalizeFeatureLayerUrl(opt.url)
  const hasFields = normalizeFieldList(opt.fields).length > 0
  const hasConcreteServiceLayer = /\/(FeatureServer|MapServer)\/\d+$/i.test(url)
  const isFeatureServiceRoot = /\/FeatureServer$/i.test(url)
  return hasFields || hasConcreteServiceLayer || isFeatureServiceRoot
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

function isFeatureLayerJson(layer: any, path: string[] = []): boolean {
  if (isBasemapOrImageLayerJson(layer, path)) return false
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
    if (isBasemapOrImageLayerJson(layer, path)) return
    if (isFeatureLayerJson(layer, path)) {
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
    ...(Array.isArray(webmapJson?.operationalLayers) ? webmapJson.operationalLayers : [])
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
  if (isBasemapOrImageText(`${type} ${title} ${fullUrl} ${geometryType}`)) return null
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

function LayerSelect(p: {
  value: string
  options: MapLayerOpt[]
  loading: boolean
  disabled: boolean
  onChange: (key: string) => void
}) {
  return (
    <select value={p.value || ''} disabled={p.disabled || p.loading} onChange={e => p.onChange(e.currentTarget.value)} style={{ ...P.sel, cursor: p.disabled || p.loading ? 'not-allowed' : 'pointer' }}>
      <option value='' style={P.opt}>{p.loading ? 'Caricamento layer…' : '- Seleziona layer -'}</option>
      {p.options.map(o => <option key={o.key} value={o.key} style={P.opt}>{o.title}</option>)}
    </select>
  )
}


type GenericSearch = {
  id: string
  title: string
  layerKey: string
  layerId: string
  layerLayerId: string
  layerUrl: string
  layerTitle: string
  fields: GenericSearchField[]
  searchType?: 'generic' | 'pratica'
}

type GenericSearchField = {
  id: string
  fieldName: string
  label: string
  controlType: 'combo' | 'text' | 'number' | 'date'
  operator: 'equals' | 'contains' | 'startsWith'
  required: boolean
  cascade: boolean
}

function makeId(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function normalizeGenericFields(raw: any): GenericSearchField[] {
  const list = Array.isArray(asJs(raw)) ? asJs<any[]>(raw) : []
  return list.map((f: any, idx: number) => ({
    id: String(f?.id || makeId(`campo_${idx + 1}`)),
    fieldName: String(f?.fieldName || f?.name || '').trim(),
    label: String(f?.label || f?.alias || f?.fieldName || f?.name || `Campo ${idx + 1}`).trim(),
    controlType: (['combo', 'text', 'number', 'date'].includes(String(f?.controlType)) ? String(f.controlType) : 'combo') as any,
    operator: (['equals', 'contains', 'startsWith'].includes(String(f?.operator)) ? String(f.operator) : 'equals') as any,
    required: f?.required === true,
    cascade: f?.cascade !== false
  })).filter(f => f.fieldName || f.label)
}


function hydrateBlankSearchFields(search: GenericSearch, fields: FieldOpt[]): GenericSearchField[] {
  if (!fields.length || !search?.fields?.length) return search.fields || []
  const used = new Set((search.fields || []).map(f => String(f.fieldName || '').trim()).filter(Boolean))
  let changed = false
  const next = search.fields.map((f, idx) => {
    if (String(f.fieldName || '').trim()) return f
    const candidate = fields.find(x => x.name && !used.has(x.name)) || fields[0]
    if (!candidate?.name) return f
    used.add(candidate.name)
    changed = true
    return {
      ...f,
      fieldName: candidate.name,
      label: f.label && !/^Campo\s+\d+$/i.test(f.label) && f.label !== 'CAMPO' ? f.label : (candidate.alias || candidate.name || `Campo ${idx + 1}`)
    }
  })
  return changed ? next : search.fields
}

function normalizeGenericSearches(cfg: any): GenericSearch[] {
  const raw = asJs<any[]>(cfg?.searches || [])
  if (Array.isArray(raw) && raw.length) {
    return raw.map((s: any, idx: number) => ({
      id: String(s?.id || makeId(`ricerca_${idx + 1}`)),
      title: String(s?.title || s?.layerTitle || `Ricerca ${idx + 1}`).trim(),
      layerKey: String(s?.layerKey || ''),
      layerId: String(s?.layerId || ''),
      layerLayerId: String(s?.layerLayerId || ''),
      layerUrl: String(s?.layerUrl || ''),
      layerTitle: String(s?.layerTitle || ''),
      fields: normalizeGenericFields(s?.fields),
      searchType: s?.searchType === 'pratica' ? 'pratica' : 'generic'
    }))
  }

  // Migrazione leggera dal vecchio widget catastale, se il config esiste già.
  if (cfg?.layerUrl || cfg?.layerTitle || cfg?.fieldComune || cfg?.fieldFoglio || cfg?.fieldMappale) {
    const fields: GenericSearchField[] = []
    const add = (fieldName: string, label: string, required = false) => {
      const name = String(fieldName || '').trim()
      if (!name) return
      fields.push({ id: makeId('campo'), fieldName: name, label, controlType: 'combo', operator: 'equals', required, cascade: true })
    }
    add(String(cfg.fieldComune || 'COMUNE'), 'Comune')
    if (cfg.mostraSezione !== false) add(String(cfg.fieldSezione || 'SEZIONE'), 'Sezione')
    add(String(cfg.fieldFoglio || 'FOGLIO'), 'Foglio', cfg.richiediFoglioPerRicerca !== false)
    add(String(cfg.fieldMappale || 'MAPPALE'), 'Mappale')
    return [{
      id: makeId('ricerca_catastale'),
      title: 'Ricerca catastale',
      layerKey: String(cfg.layerKey || ''),
      layerId: String(cfg.layerId || ''),
      layerLayerId: String(cfg.layerLayerId || ''),
      layerUrl: String(cfg.layerUrl || ''),
      layerTitle: String(cfg.layerTitle || ''),
      fields
    }]
  }
  return []
}

function findConfiguredLayerKey(search: GenericSearch, options: MapLayerOpt[]): string {
  const cfgKey = String(search.layerKey || '').trim()
  const cfgUrl = normalizeFeatureLayerUrl(search.layerUrl || '')
  const cfgTitle = String(search.layerTitle || '').trim().toLowerCase()
  const cfgId = String(search.layerId || '').trim()

  // La stessa fonte può essere presente più volte in mappa con titoli/filtri diversi
  // (es. "Opere CBSM / Tutte" e "Opere CBSM / Attive"). In questi casi l'URL è identico:
  // quindi la chiave salvata della voce selezionata deve avere sempre priorità sull'URL.
  const byKey = cfgKey ? options.find(o => o.key === cfgKey) : null
  if (byKey) return byKey.key

  const byIdAndUrl = cfgId && cfgUrl ? options.find(o => o.id === cfgId && normalizeFeatureLayerUrl(o.url) === cfgUrl) : null
  if (byIdAndUrl) return byIdAndUrl.key

  const byTitle = cfgTitle ? options.find(o => o.title.toLowerCase() === cfgTitle) : null
  if (byTitle) return byTitle.key

  const byId = cfgId ? options.find(o => o.id === cfgId) : null
  if (byId) return byId.key

  const byUrl = cfgUrl ? options.find(o => normalizeFeatureLayerUrl(o.url) === cfgUrl) : null
  return byUrl?.key || ''
}

function SmallButton(p: { children: any; onClick: () => void; danger?: boolean; disabled?: boolean }) {
  return (
    <button
      type='button'
      disabled={p.disabled}
      onClick={p.onClick}
      style={{
        height: 30,
        border: `1px solid ${p.danger ? 'rgba(220,38,38,0.55)' : 'rgba(59,130,246,0.55)'}`,
        borderRadius: 8,
        background: p.danger ? 'rgba(220,38,38,0.12)' : 'rgba(59,130,246,0.13)',
        color: p.danger ? '#fecaca' : '#bfdbfe',
        fontSize: 12,
        fontWeight: 800,
        padding: '0 10px',
        cursor: p.disabled ? 'not-allowed' : 'pointer'
      }}
    >{p.children}</button>
  )
}

function StyledSelect(p: { value: string; onChange: (v: string) => void; children: any; disabled?: boolean }) {
  return <select value={p.value || ''} disabled={p.disabled} onChange={e => p.onChange(e.currentTarget.value)} style={{ ...P.sel, cursor: p.disabled ? 'not-allowed' : 'pointer' }}>{p.children}</select>
}

function ColorInput(p: { label: string; value: string; onChange: (v: string) => void }) {
  const isHex = /^#[0-9a-fA-F]{3,8}$/.test(p.value)
  return (
    <label style={{ display: 'block' }}>
      <span style={P.lbl}>{p.label}</span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input
          type='color'
          value={isHex ? p.value : '#ffffff'}
          onChange={e => p.onChange(e.currentTarget.value)}
          style={{ width: 32, height: 28, border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, background: 'none', cursor: 'pointer', padding: 2, boxSizing: 'border-box' }}
        />
        <input
          type='text'
          value={p.value}
          onChange={e => p.onChange(e.currentTarget.value)}
          style={{ flex: 1, height: 28, border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, background: 'rgba(0,0,0,0.2)', color: '#e5e7eb', fontSize: 11, padding: '0 6px', outline: 'none', fontFamily: 'monospace', minWidth: 0 }}
        />
      </div>
    </label>
  )
}

export default function Setting(props: Props) {
  const cfg = { ...asJs<any>(defaultConfig), ...(asJs<any>(props.config) || {}) }
  const searches = React.useMemo(() => normalizeGenericSearches(cfg), [props.config])
  const mapWidgetId = (asJs<string[]>(cfg.useMapWidgetIds || []) || [])[0] || ''

  const [mapLayerOptions, setMapLayerOptions] = React.useState<MapLayerOpt[]>([])
  const [mapLayerLoading, setMapLayerLoading] = React.useState(false)
  const [mapLayerError, setMapLayerError] = React.useState('')
  const [mapLabel, setMapLabel] = React.useState('')
  const [openSearchId, setOpenSearchId] = React.useState('')
  const [dragId, setDragId] = React.useState<string | null>(null)
  const [dragOverId, setDragOverId] = React.useState<string | null>(null)
  const [schemaBySearch, setSchemaBySearch] = React.useState<Record<string, FieldOpt[]>>({})
  const [schemaLoadingBySearch, setSchemaLoadingBySearch] = React.useState<Record<string, boolean>>({})

  const setCfg = (patch: Record<string, any>) => {
    props.onSettingChange({
      id: props.id,
      config: toImmutableCfg(props.config || defaultConfig, patch) as any
    })
  }

  const setSearches = (items: GenericSearch[]) => setCfg({ searches: items, selectedSearchId: cfg.selectedSearchId || items[0]?.id || '' })
  const moveSearch = (fromId: string, toId: string) => {
    if (fromId === toId) return
    const arr = [...searches]
    const fromIdx = arr.findIndex(s => s.id === fromId)
    const toIdx = arr.findIndex(s => s.id === toId)
    if (fromIdx < 0 || toIdx < 0) return
    const [item] = arr.splice(fromIdx, 1)
    arr.splice(toIdx, 0, item)
    setSearches(arr)
  }
  const updateSearch = (id: string, patch: Partial<GenericSearch>) => setSearches(searches.map(s => s.id === id ? { ...s, ...patch } : s))
  const updateField = (searchId: string, fieldId: string, patch: Partial<GenericSearchField>) => {
    setSearches(searches.map(s => s.id === searchId ? { ...s, fields: s.fields.map(f => f.id === fieldId ? { ...f, ...patch } : f) } : s))
  }


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
      for (const mapInfo of mapInfos) {
        try { collected.push(...collectFeatureLayersFromDataSourceManager(mapInfo.dataSourceId)) } catch {}
        try { collected.push(...collectFeatureLayersFromAppConfigDataSources(appConfig, mapInfo.dataSourceId)) } catch {}
        if (mapInfo.itemId) {
          try { collected.push(...await readWebMapFeatureLayers(mapInfo.itemId, mapInfo.portalUrl)) } catch {}
        }
      }
      if (cancelled) return
      const base = uniqueMapLayerOptions(collected).filter(isCandidateMapLayerOption)
      if (!base.length) {
        setMapLayerOptions([])
        setMapLayerError(mapInfos.length ? 'Nessun layer selezionabile rilevato nel widget Mappa selezionato.' : 'Non riesco a leggere la WebMap dal widget Mappa selezionato.')
        setMapLayerLoading(false)
        return
      }
      try {
        const expanded = uniqueMapLayerOptions(await expandServiceSublayerOptions(base)).filter(isSelectableSearchLayerOption)
        if (cancelled) return
        setMapLayerOptions(expanded)
        setMapLayerError(expanded.length ? '' : 'Nessun layer interrogabile trovato nella mappa selezionata.')
      } catch (e: any) {
        if (cancelled) return
        const fallback = base.filter(isSelectableSearchLayerOption)
        setMapLayerOptions(fallback)
        setMapLayerError(fallback.length ? '' : (e?.message || String(e || 'Errore caricamento layer')))
      } finally {
        if (!cancelled) setMapLayerLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [mapWidgetId])

  const loadFieldsForSearch = React.useCallback(async (search: GenericSearch) => {
    const selectedKey = findConfiguredLayerKey(search, mapLayerOptions)
    const selectedOpt = mapLayerOptions.find(o => o.key === selectedKey)
    const appConfig = getBuilderAppConfigForSetting()
    const fieldsFromConfig = normalizeFieldList(selectedOpt?.fields || getFieldsFromDataSourceById(selectedOpt?.id || search.layerId || '', appConfig))
    if (fieldsFromConfig.length) {
      setSchemaBySearch(prev => ({ ...prev, [search.id]: fieldsFromConfig }))
      const hydrated = hydrateBlankSearchFields(search, fieldsFromConfig)
      if (hydrated !== search.fields) updateSearch(search.id, { fields: hydrated })
      return
    }
    const layerSubId = search.layerLayerId || selectedOpt?.layerId || getLayerIdFromUrl(search.layerUrl || selectedOpt?.url) || getLayerIdFromDataSourceId(selectedOpt?.id || search.layerId)
    const url = composeLayerUrl(search.layerUrl || selectedOpt?.url || '', layerSubId)
    if (!url) return
    const cached = FIELD_SCHEMA_CACHE[url.toLowerCase()]
    if (cached?.length) {
      setSchemaBySearch(prev => ({ ...prev, [search.id]: cached }))
      const hydrated = hydrateBlankSearchFields(search, cached)
      if (hydrated !== search.fields) updateSearch(search.id, { fields: hydrated })
      return
    }
    setSchemaLoadingBySearch(prev => ({ ...prev, [search.id]: true }))
    try {
      const fields = await readFeatureLayerFields(url, search.layerTitle || selectedOpt?.title || '')
      setSchemaBySearch(prev => ({ ...prev, [search.id]: fields }))
      const hydrated = hydrateBlankSearchFields(search, fields)
      if (hydrated !== search.fields) updateSearch(search.id, { fields: hydrated })
    } finally {
      setSchemaLoadingBySearch(prev => ({ ...prev, [search.id]: false }))
    }
  }, [mapLayerOptions])

  React.useEffect(() => {
    const current = searches.find(s => s.id === openSearchId)
    if (current) loadFieldsForSearch(current)
  }, [openSearchId, searches, loadFieldsForSearch])

  const onMapSelect = (ids: string[]) => setCfg({ useMapWidgetIds: ids, searches: searches.map(s => ({ ...s, layerKey: '', layerId: '', layerLayerId: '', layerUrl: '', layerTitle: '' })) })

  const addSearch = () => {
    const item: GenericSearch = {
      id: makeId('ricerca'),
      title: `Ricerca ${searches.length + 1}`,
      layerKey: '',
      layerId: '',
      layerLayerId: '',
      layerUrl: '',
      layerTitle: '',
      fields: []
    }
    setSearches([...searches, item])
    setOpenSearchId(item.id)
  }

  const duplicateSearch = (search: GenericSearch) => {
    const item: GenericSearch = { ...search, id: makeId('ricerca'), title: `${search.title || 'Ricerca'} copia`, fields: search.fields.map(f => ({ ...f, id: makeId('campo') })) }
    setSearches([...searches, item])
    setOpenSearchId(item.id)
  }

  const deleteSearch = (id: string) => {
    const next = searches.filter(s => s.id !== id)
    setSearches(next)
    setOpenSearchId(current => current === id ? '' : current)
  }

  const onLayerSelect = (search: GenericSearch, key: string) => {
    const opt = mapLayerOptions.find(o => o.key === key)
    if (!opt) {
      updateSearch(search.id, { layerKey: '', layerId: '', layerLayerId: '', layerUrl: '', layerTitle: '', fields: [] })
      return
    }
    const layerLayerId = opt.layerId || getLayerIdFromUrl(opt.url) || getLayerIdFromDataSourceId(opt.id)
    const layerUrl = composeLayerUrl(opt.url, layerLayerId)
    const currentKey = findConfiguredLayerKey(search, mapLayerOptions)
    const isDifferentLayer = currentKey !== opt.key || normalizeFeatureLayerUrl(search.layerUrl) !== normalizeFeatureLayerUrl(layerUrl)
    updateSearch(search.id, {
      layerKey: opt.key,
      layerId: opt.id,
      layerLayerId,
      layerUrl,
      layerTitle: opt.title,
      // I campi di ricerca sono specifici del layer: quando si cambia layer si azzerano
      // per evitare che restino campi del layer precedente (es. "Stato") su un layer diverso.
      fields: isDifferentLayer ? [] : search.fields
    })
    const fields = normalizeFieldList(opt.fields || getFieldsFromDataSourceById(opt.id, getBuilderAppConfigForSetting()))
    if (fields.length) {
      setSchemaBySearch(prev => ({ ...prev, [search.id]: fields }))
      const nextFields = isDifferentLayer ? [] : hydrateBlankSearchFields(search, fields)
      if (!isDifferentLayer && nextFields !== search.fields) updateSearch(search.id, { fields: nextFields })
    }
    else window.setTimeout(() => loadFieldsForSearch({ ...search, layerKey: opt.key, layerId: opt.id, layerLayerId, layerUrl, layerTitle: opt.title }), 0)
  }

  const addField = (search: GenericSearch) => {
    const fields = schemaBySearch[search.id] || []
    const first = fields.find(f => f.name) || null
    const field: GenericSearchField = {
      id: makeId('campo'),
      fieldName: first?.name || '',
      label: first?.alias || first?.name || `Campo ${search.fields.length + 1}`,
      controlType: 'combo',
      operator: 'equals',
      required: false,
      cascade: true
    }
    updateSearch(search.id, { fields: [...search.fields, field] })
  }

  const removeField = (search: GenericSearch, fieldId: string) => updateSearch(search.id, { fields: search.fields.filter(f => f.id !== fieldId) })

  const moveField = (search: GenericSearch, fieldId: string, delta: number) => {
    const arr = [...search.fields]
    const idx = arr.findIndex(f => f.id === fieldId)
    const nextIdx = idx + delta
    if (idx < 0 || nextIdx < 0 || nextIdx >= arr.length) return
    const [item] = arr.splice(idx, 1)
    arr.splice(nextIdx, 0, item)
    updateSearch(search.id, { fields: arr })
  }

  return (
    <div style={P.wrap}>
      <div style={P.sec}>Widget Mappa</div>
      <div style={P.box}>
        <span style={P.lbl}>Widget Mappa</span>
        <MapWidgetSelector onSelect={onMapSelect} useMapWidgetIds={asJs(cfg.useMapWidgetIds || [])} />
        <div style={P.hint}>Seleziona il widget Mappa. Le ricerche potranno usare solo i layer presenti in quella mappa.</div>
        {!!mapLabel && <div style={P.hint}>Mappa rilevata: <b style={{ color: '#e5e7eb' }}>{mapLabel}</b></div>}
        {mapLayerLoading && <div style={P.hint}>Caricamento layer della mappa…</div>}
        {mapLayerError && <div style={{ ...P.hint, color: '#fca5a5' }}>{mapLayerError}</div>}
      </div>

      <div style={P.sec}>Ricerche configurate</div>
      <div style={P.box}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={P.hint}>{searches.length ? `${searches.length} ricerche configurate.` : 'Nessuna ricerca configurata.'}</div>
        </div>

        {searches.map((search, searchIndex) => {
          const isOpen = openSearchId === search.id
          const fields = schemaBySearch[search.id] || []
          const layerKey = findConfiguredLayerKey(search, mapLayerOptions)
          const schemaLoading = !!schemaLoadingBySearch[search.id]
          return (
            <div
              key={search.id}
              draggable
              onDragStart={() => { setDragId(search.id); setDragOverId(null) }}
              onDragOver={e => { e.preventDefault(); setDragOverId(search.id) }}
              onDrop={() => { if (dragId) moveSearch(dragId, search.id); setDragId(null); setDragOverId(null) }}
              onDragEnd={() => { setDragId(null); setDragOverId(null) }}
              style={{ border: `1px solid ${dragOverId === search.id ? 'rgba(47,111,237,0.6)' : 'rgba(255,255,255,0.12)'}`, borderRadius: 10, marginBottom: 12, overflow: 'hidden', background: 'rgba(255,255,255,0.035)', opacity: dragId === search.id ? 0.5 : 1 }}
            >
              <button
                type='button'
                onClick={() => setOpenSearchId(isOpen ? '' : search.id)}
                style={{ width: '100%', minHeight: 38, border: 0, background: 'rgba(59,130,246,0.13)', color: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px', cursor: 'pointer', gap: 6 }}
              >
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', cursor: 'grab', userSelect: 'none' }} title='Trascina per riordinare'>⠿</span>
                <span style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.7, flex: 1, textAlign: 'left' }}>{search.title || `Ricerca ${searchIndex + 1}`}</span>
                <span style={{ fontSize: 12, color: '#bfdbfe' }}>{isOpen ? '▴' : '▾'}</span>
              </button>

              {isOpen && (
                <div style={{ padding: 10 }}>
                  <TextInput label='Titolo ricerca' value={search.title} onChange={v => updateSearch(search.id, { title: v })} placeholder='Es. Dati pratica' />
                  {search.searchType === 'pratica' ? (
                    <div style={{ ...P.hint, marginTop: 10, borderRadius: 6, padding: '8px 10px', background: 'rgba(47,111,237,0.10)', color: '#93c5fd' }}>
                      Ricerca pratica — i campi di ricerca (tipo pratica, nominativo, CF/PIVA, articoli violati) sono predefiniti e non richiedono configurazione aggiuntiva.
                    </div>
                  ) : (
                    <React.Fragment>
                  <span style={{ ...P.lbl, marginTop: 12 }}>Layer da interrogare</span>
                  <LayerSelect value={layerKey} options={mapLayerOptions} loading={mapLayerLoading} disabled={!mapWidgetId || mapLayerOptions.length === 0} onChange={key => onLayerSelect(search, key)} />
                  {search.layerTitle && <div style={{ ...P.preview, wordBreak: 'break-all' }}>Layer selezionato: <b style={{ color: '#e5e7eb' }}>{search.layerTitle}</b>{search.layerUrl ? <><br />URL: {search.layerUrl}</> : null}</div>}
                  {schemaLoading && <div style={P.hint}>Lettura schema campi del layer selezionato…</div>}
                  {!schemaLoading && search.layerUrl && !fields.length && <div style={{ ...P.hint, color: '#fca5a5' }}>Elenco campi non ancora caricato per il layer selezionato.</div>}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, marginBottom: 8 }}>
                    <div style={{ ...P.lbl, margin: 0 }}>Campi di ricerca</div>
                  </div>

                  {!search.fields.length && <div style={P.hint}>Aggiungi almeno un campo da usare nella ricerca.</div>}
                  {search.fields.map((f, idx) => {
                    const fOpt = fields.find(x => x.name === f.fieldName)
                    return (
                      <div key={f.id} style={{ border: '1px solid rgba(255,255,255,0.10)', borderRadius: 9, padding: 9, marginBottom: 8, background: 'rgba(0,0,0,0.10)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, minWidth: 0 }}>
                          <FieldSelect
                            label='Campo layer'
                            value={f.fieldName}
                            fields={fields}
                            onChange={v => {
                              const opt = fields.find(x => x.name === v)
                              updateField(search.id, f.id, { fieldName: v, label: f.label && f.label !== f.fieldName ? f.label : (opt?.alias || opt?.name || v) })
                            }}
                            fallback={f.fieldName || 'CAMPO'}
                          />
                          <TextInput label='Etichetta' value={f.label || fOpt?.alias || f.fieldName} onChange={v => updateField(search.id, f.id, { label: v })} />
                        </div>
                        <div style={P.grid2}>
                          <label style={{ display: 'block' }}>
                            <span style={P.lbl}>Tipo controllo</span>
                            <StyledSelect value={f.controlType} onChange={v => updateField(search.id, f.id, { controlType: v as any })}>
                              <option value='combo' style={P.opt}>Combo ricercabile</option>
                              <option value='text' style={P.opt}>Testo libero</option>
                              <option value='number' style={P.opt}>Numero</option>
                              <option value='date' style={P.opt}>Data</option>
                            </StyledSelect>
                          </label>
                          <label style={{ display: 'block' }}>
                            <span style={P.lbl}>Confronto</span>
                            <StyledSelect value={f.operator} onChange={v => updateField(search.id, f.id, { operator: v as any })} disabled={f.controlType === 'number' || f.controlType === 'date'}>
                              <option value='equals' style={P.opt}>Uguale a</option>
                              <option value='contains' style={P.opt}>Contiene</option>
                              <option value='startsWith' style={P.opt}>Inizia con</option>
                            </StyledSelect>
                          </label>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 6 }}>
                          <Check label='Obbligatorio' value={f.required === true} onChange={v => updateField(search.id, f.id, { required: v })} />
                          <Check label='Filtra i campi successivi' value={f.cascade !== false} onChange={v => updateField(search.id, f.id, { cascade: v })} />
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 6 }}>
                          <SmallButton onClick={() => moveField(search, f.id, -1)} disabled={idx === 0}>Su</SmallButton>
                          <SmallButton onClick={() => moveField(search, f.id, 1)} disabled={idx === search.fields.length - 1}>Giù</SmallButton>
                          <div style={{ flex: 1 }} />
                          <SmallButton danger onClick={() => removeField(search, f.id)}>Rimuovi</SmallButton>
                        </div>
                      </div>
                    )
                  })}
                  <SmallButton onClick={() => addField(search)} disabled={!search.layerUrl}>Aggiungi campo</SmallButton>
                    </React.Fragment>
                  )}
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap', marginTop: 12 }}>
                    {search.searchType !== 'pratica' && <SmallButton onClick={() => duplicateSearch(search)}>Duplica ricerca</SmallButton>}
                    <SmallButton danger onClick={() => deleteSearch(search.id)}>Elimina ricerca</SmallButton>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: searches.length ? 4 : 0 }}>
          <SmallButton onClick={() => {
            const item: GenericSearch = {
              id: makeId('infrazioni'),
              title: 'Infrazioni',
              layerKey: '',
              layerId: '',
              layerLayerId: '',
              layerUrl: '',
              layerTitle: '',
              fields: [],
              searchType: 'pratica'
            }
            setSearches([...searches, item])
            setOpenSearchId(item.id)
          }} disabled={!mapWidgetId}>Aggiungi ricerca Infrazioni</SmallButton>
          <SmallButton onClick={addSearch} disabled={!mapWidgetId}>Aggiungi ricerca</SmallButton>
        </div>
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

      <div style={P.sec}>Stile risultati</div>
      <div style={P.box}>
        <div style={{ fontSize: 12, fontWeight: 800, color: '#dbeafe', marginBottom: 2 }}>Elementi puntuali</div>
        <div style={P.grid2}>
          <ColorInput label='Colore punto' value={String(cfg.pointColor || '#dc2626')} onChange={v => setCfg({ pointColor: v })} />
          <ColorInput label='Colore bordo' value={String(cfg.pointOutlineColor || '#ffffff')} onChange={v => setCfg({ pointOutlineColor: v })} />
          <NumInput label='Trasparenza punto (%)' value={parseNum(cfg.pointTransparency, 0, 0, 100)} min={0} max={100} onChange={v => setCfg({ pointTransparency: v })} />
          <NumInput label='Dimensione punto (px)' value={parseNum(cfg.pointSize, 18, 1, 64)} min={1} max={64} step={0.5} onChange={v => setCfg({ pointSize: v })} />
          <NumInput label='Spessore bordo (px)' value={parseNum(cfg.pointOutlineWidth, 2.5, 0, 12)} min={0} max={12} step={0.5} onChange={v => setCfg({ pointOutlineWidth: v })} />
        </div>

        <div style={{ fontSize: 12, fontWeight: 800, color: '#dbeafe', marginTop: 16, marginBottom: 2 }}>Elementi poligonali</div>
        <div style={P.grid2}>
          <ColorInput label='Colore riempimento' value={String(cfg.polygonFillColor || '#ff6400')} onChange={v => setCfg({ polygonFillColor: v })} />
          <ColorInput label='Colore contorno' value={String(cfg.polygonOutlineColor || '#ff6400')} onChange={v => setCfg({ polygonOutlineColor: v })} />
          <NumInput label='Trasparenza riempimento (%)' value={parseNum(cfg.polygonFillTransparency, 88, 0, 100)} min={0} max={100} onChange={v => setCfg({ polygonFillTransparency: v })} />
          <NumInput label='Spessore contorno (px)' value={parseNum(cfg.polygonOutlineWidth, 2, 0, 12)} min={0} max={12} step={0.5} onChange={v => setCfg({ polygonOutlineWidth: v })} />
        </div>
        <div style={P.hint}>Per gli elementi lineari vengono utilizzati il colore e lo spessore del contorno poligonale.</div>
        <div style={{ marginTop: 10 }}>
          <SmallButton onClick={() => setCfg({
            pointColor: '#dc2626', pointTransparency: 0, pointSize: 18,
            pointOutlineColor: '#ffffff', pointOutlineWidth: 2.5,
            polygonFillColor: '#ff6400', polygonFillTransparency: 88,
            polygonOutlineColor: '#ff6400', polygonOutlineWidth: 2
          })}>Ripristina stile predefinito</SmallButton>
        </div>
      </div>

      <div style={P.sec}>Personalizzazione colori</div>
      <div style={P.box}>
        <div style={P.grid2}>
          <NumInput label='Arrotondamento bordi (px)' value={parseNum(cfg.borderRadius, 8, 0, 32)} min={0} max={32} onChange={v => setCfg({ borderRadius: v })} />
          <NumInput label='Altezza campi (px)' value={parseNum(cfg.fieldHeight, 28, 20, 48)} min={20} max={48} onChange={v => setCfg({ fieldHeight: v })} />
          <NumInput label='Padding orizzontale (px)' value={parseNum(cfg.paddingH, 8, 0, 40)} min={0} max={40} onChange={v => setCfg({ paddingH: v })} />
          <NumInput label='Padding verticale (px)' value={parseNum(cfg.paddingV, 6, 0, 40)} min={0} max={40} onChange={v => setCfg({ paddingV: v })} />
          <TextInput label='Etichetta selezione ricerca' value={String(cfg.searchLabel || 'Tipo ricerca')} onChange={v => setCfg({ searchLabel: v })} />
        </div>
        <div style={{ ...P.grid2, marginTop: 8 }}>
          <ColorInput label='Sfondo widget' value={String(cfg.colorBackground || '#ffffff')} onChange={v => setCfg({ colorBackground: v })} />
          <ColorInput label='Bordo widget' value={String(cfg.colorBorder || 'rgba(0,0,0,0.12)')} onChange={v => setCfg({ colorBorder: v })} />
          <ColorInput label='Testo label' value={String(cfg.colorLabel || '#374151')} onChange={v => setCfg({ colorLabel: v })} />
          <ColorInput label='Bordo campi' value={String(cfg.colorFieldBorder || 'rgba(0,0,0,0.16)')} onChange={v => setCfg({ colorFieldBorder: v })} />
          <ColorInput label='Sfondo campi' value={String(cfg.colorFieldBackground || '#ffffff')} onChange={v => setCfg({ colorFieldBackground: v })} />
          <ColorInput label='Testo campi' value={String(cfg.colorFieldText || '#111827')} onChange={v => setCfg({ colorFieldText: v })} />
          <ColorInput label='Pulsante Cerca' value={String(cfg.colorBtnPrimary || '#2f6fed')} onChange={v => setCfg({ colorBtnPrimary: v })} />
          <ColorInput label='Testo Cerca' value={String(cfg.colorBtnPrimaryText || '#ffffff')} onChange={v => setCfg({ colorBtnPrimaryText: v })} />
          <ColorInput label='Pulsante Annulla' value={String(cfg.colorBtnGhost || 'rgba(0,0,0,0.06)')} onChange={v => setCfg({ colorBtnGhost: v })} />
          <ColorInput label='Testo Annulla' value={String(cfg.colorBtnGhostText || '#1f2937')} onChange={v => setCfg({ colorBtnGhostText: v })} />
        </div>
        <div style={{ marginTop: 10 }}>
          <SmallButton onClick={() => setCfg({
            colorBackground: '#ffffff', colorBorder: 'rgba(0,0,0,0.12)',
            colorLabel: '#374151', colorFieldBorder: 'rgba(0,0,0,0.16)',
            colorFieldBackground: '#ffffff', colorFieldText: '#111827',
            colorBtnPrimary: '#2f6fed', colorBtnPrimaryText: '#ffffff',
            colorBtnGhost: 'rgba(0,0,0,0.06)', colorBtnGhostText: '#1f2937',
            borderRadius: 8, paddingH: 8, paddingV: 6, searchLabel: 'Tipo ricerca', fieldHeight: 28
          })}>Ripristina valori predefiniti</SmallButton>
        </div>
      </div>
    </div>
  )
}
