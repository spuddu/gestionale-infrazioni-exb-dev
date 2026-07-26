// =================================================================
// fascicolo-builder.ts
// PUNTO UNICO di costruzione del fascicolo documentale. Nessun widget deve
// costruire il PDF autonomamente: azioni, editing-ti ed editing-amm chiamano
// tutti buildFascicolo(...) con lo stesso oid e le stesse opzioni, e ottengono
// lo stesso identico risultato — a prescindere da dove è stato aperto.
//
// Principio: il builder non riceve mai 'data' da un widget. Fa lui stesso una
// query fresca e completa (con geometria) sul mother layer — confermato
// leggibile da tutti i ruoli, tecnici e amministrativi — eliminando alla
// radice il problema dei permessi differenziati per vista/area.
// =================================================================

import { PDFDocument } from 'pdf-lib'
import { buildPlaceholderMap, type UtenteCached } from './documenti-tecnici/rapporto/rapporto-placeholder-map'
import { applyNotaSpeseQueryResultToRapportoMap, queryNotaSpeseRowsForPractice, buildArt30RapportoSummary, type NotaSpeseConfig } from './documenti-tecnici/rapporto/rapporto-nota-spese-summary'
import { buildRapportoPdf, loadRapportoIterCicliForPdf, type RapportoIterCicloPdf } from './documenti-tecnici/rapporto/rapporto-pdf-builder'
import { buildNotaSpesePdf, type NotaSpeseData } from './documenti-tecnici/rapporto/notaspese-pdf-builder'
import { buildVerbalePdfBlob, type LayerFieldInfo } from './documenti-amministrativi/proposta-contestazione/proposta-contestazione-data-map'
import { RAPPORTO_TECHNICAL_BODY_BOX, drawRapportoTechnicalHeadersByPage, attachmentTechnicalDocumentTitle, wrapMapPdfBlobWithRapportoTechnicalHeader } from './documenti-tecnici/rapporto/technical-document-header'
import { listGiiPrintableMapLayers, ensureGiiPrintableMapLayersReady, computePrintExtentForView, buildGiiMapLegendItemsForView, type GiiPrintableMapLayerItem } from './viewer-documenti/map-layers'

// Mother layer: stesso URL usato da gii-editing-ti, confermato leggibile da
// tutti i ruoli (tecnici e amministrativi). Unica fonte dati del builder.
const FASCICOLO_MOTHER_LAYER_URL = 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_INFRAZIONI_VIEW_ALL/FeatureServer/0'

let _cachedLayer: any = null

/** Risolve (una sola volta per sessione) il layer sorgente unico dei dati. */
async function resolveReadableLayer (): Promise<{ layer: any, url: string }> {
  if (_cachedLayer) return { layer: _cachedLayer, url: FASCICOLO_MOTHER_LAYER_URL }
  const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
  const layer = new FeatureLayer({ url: FASCICOLO_MOTHER_LAYER_URL })
  if (typeof layer.load === 'function') await layer.load()
  _cachedLayer = layer
  return { layer, url: FASCICOLO_MOTHER_LAYER_URL }
}

export type FascicoloDocumentSelection = {
  includeTecnici: boolean           // rapporto tecnico + mappa (se disponibile) + allegati
  includeAmministrativi: boolean    // proposta di contestazione (+ determinazione, quando implementata qui)
  includeMappa?: boolean            // default: true se includeTecnici e la geometria è disponibile
  includeRapporto?: boolean         // default: true — se false, la pagina del rapporto tecnico non viene inclusa (anche se nota spese/allegati sì)
  includeNotaSpese?: boolean        // default: true — se false, nessuna nota spesa viene inclusa
  selectedAttachmentIds?: number[]  // undefined = tutti gli allegati stampabili
  selectedNotaSpeseKeys?: Record<string, boolean> // undefined = tutte (solo se includeNotaSpese non è false)
}

export type FascicoloBuildParams = {
  oid: number
  profile: { username: string, fullName: string }
  selection: FascicoloDocumentSelection
  notaSpeseConfig?: NotaSpeseConfig
  // 'view' è una MapView live, già montata dal widget chiamante (es. gii-azioni la riceve
  // come prop da un map widget ExB collegato). Se assente, la sezione mappa viene omessa:
  // senza una view reale non è possibile leggere layer/legenda (vedi buildMappaSection).
  mapConfig?: {
    printServiceUrl?: string
    basemapId?: string
    view?: any
    mapLayerVisibility?: Record<string, boolean>
    mapBasemap?: string
    mapScale?: number
    mapLayout?: string
    mapLocalizationLayerUrl?: string
  }
  fileNamePrefix?: string // es. 'fascicolo' oppure 'documenti' — solo cosmetico, non cambia il contenuto
}

type AttachmentInfo = { id: number, name: string, contentType: string, url?: string, keywords?: string }

function pickAttrCI (data: any, names: string[]): any {
  if (!data) return null
  for (const n of names) { if (data[n] != null && data[n] !== '') return data[n] }
  return null
}

function loadEsriModule<T = any> (path: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = (window as any).require
    if (!req) { reject(new Error('AMD require non disponibile')); return }
    req([path], (mod: T) => resolve(mod), (err: any) => reject(err))
  })
}

/** Recupera (senza sfidare l'utente) una credenziale già registrata da IdentityManager per l'URL indicato. */
async function getEsriTokenForUrl (url: string): Promise<string> {
  try {
    const IdentityManager = await loadEsriModule<any>('esri/identity/IdentityManager')
    const cred = IdentityManager?.findCredential?.(url) || IdentityManager?.findCredential?.(url.replace(/\/\d+$/, ''))
    return cred?.token ? String(cred.token) : ''
  } catch {
    return ''
  }
}

/** Appende il token già registrato all'URL, se disponibile, per evitare la sfida automatica di IdentityManager (che qui apre il banner nativo del browser invece di usare silenziosamente la sessione esistente). */
async function withToken (url: string): Promise<string> {
  const token = await getEsriTokenForUrl(url)
  if (!token) return url
  return `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`
}

/** Query fresca e completa del record, con geometria e definizione campi (per alias/domini). Unica fonte dati per tutto il builder. */
async function queryFascicoloRecord (oid: number): Promise<{ attrs: Record<string, any>, geometry: any | null, fields: LayerFieldInfo[], resolvedUrl: string }> {
  const { layer, url } = await resolveReadableLayer()
  const idField = String(layer.objectIdField || 'OBJECTID')
  const res = await layer.queryFeatures({ where: `${idField} = ${Number(oid)}`, outFields: ['*'], returnGeometry: true, num: 1 })
  const feature = res?.features?.[0]
  if (!feature) throw new Error(`Pratica con OID ${oid} non trovata su ${url}.`)
  const fields: LayerFieldInfo[] = (layer.fields || []).map((f: any) => ({
    name: String(f.name), type: String(f.type || ''), alias: String(f.alias || f.name), domain: f.domain || null, editable: f.editable !== false
  }))
  return { attrs: feature.attributes || {}, geometry: feature.geometry || null, fields, resolvedUrl: url }
}

async function queryFascicoloAttachments (oid: number): Promise<{ attachments: AttachmentInfo[], resolvedUrl: string }> {
  const { layer, url } = await resolveReadableLayer()
  if (typeof layer.queryAttachments !== 'function') return { attachments: [], resolvedUrl: url }
  let res: any = null
  try {
    res = await layer.queryAttachments({ objectIds: [Number(oid)], returnMetadata: true, returnUrl: true })
  } catch {
    return { attachments: [], resolvedUrl: url }
  }
  // Forma confermata in ArcGIS Maps SDK for JS 4.34: oggetto mappa { [objectId]: AttachmentInfo[] }.
  // Le altre due forme (array di gruppi, oppure { attachmentGroups: [...] }) sono mantenute come
  // fallback per compatibilità con eventuali altre versioni/contesti, ma non sono quella osservata.
  let infos: any[] = []
  if (res && Array.isArray(res[String(oid)])) {
    infos = res[String(oid)]
  } else if (Array.isArray(res)) {
    const group = res.find(g => Number(g?.parentObjectId ?? g?.objectId) === Number(oid)) || res[0]
    infos = group?.attachmentInfos || group?.infos || []
  } else if (Array.isArray(res?.attachmentGroups)) {
    const group = res.attachmentGroups.find((g: any) => Number(g?.parentObjectId ?? g?.objectId) === Number(oid)) || res.attachmentGroups[0]
    infos = group?.attachmentInfos || group?.infos || []
  }
  const attachments = infos.map((a: any) => ({
    id: Number(a.id ?? a.attachmentId),
    name: String(a.name ?? a.attachmentName ?? ''),
    contentType: String(a.contentType ?? ''),
    url: a.url ? String(a.url) : undefined,
    keywords: String(a.keywords ?? '')
  })).filter((a: AttachmentInfo) => Number.isFinite(a.id))
  return { attachments, resolvedUrl: url }
}

async function fetchAttachmentBlob (att: AttachmentInfo, oid: number, resolvedUrl: string): Promise<Blob> {
  const raw = att.url || `${resolvedUrl}/${Number(oid)}/attachments/${att.id}`
  const url = await withToken(raw)
  const resp = await fetch(url, { credentials: 'omit' })
  if (!resp.ok) throw new Error(`Caricamento allegato fallito (HTTP ${resp.status}): ${att.name}`)
  return await resp.blob()
}

function isImageAttachment (att: AttachmentInfo): boolean {
  const ct = att.contentType.toLowerCase()
  const name = att.name.toLowerCase()
  return ct.includes('image') || /\.(jpe?g|png)$/i.test(name)
}

async function ensureUtentiCache (): Promise<Map<string, UtenteCached> | null> {
  try {
    const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
    const layer = new FeatureLayer({ url: 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_utenti/FeatureServer/0' })
    if (typeof layer.load === 'function') await layer.load()
    const res = await layer.queryFeatures({ where: '1=1', outFields: ['*'], returnGeometry: false })
    const map = new Map<string, UtenteCached>()
    for (const f of (res?.features || [])) {
      const a = f.attributes || {}
      const username = String(a.username || '').trim().toLowerCase()
      if (!username) continue
      map.set(username, a as UtenteCached)
    }
    return map
  } catch {
    return null
  }
}

async function buildRapportoSection (attrs: Record<string, any>, notaSpeseConfig: NotaSpeseConfig | undefined, selection: FascicoloDocumentSelection): Promise<Array<{ blob: Blob, fileName: string }>> {
  const items: Array<{ blob: Blob, fileName: string }> = []
  const emptyNsQueryResult = { rowsByCategory: {} as any, percentualeSpeseGenerali: 15 }
  const [utentiCache, cicli, nsQueryResult] = await Promise.all([
    ensureUtentiCache(),
    loadRapportoIterCicliForPdf(pickAttrCI(attrs, ['globalid', 'GlobalID', 'GLOBALID'])).catch((): RapportoIterCicloPdf[] => []),
    queryNotaSpeseRowsForPractice(attrs, notaSpeseConfig).catch(() => emptyNsQueryResult)
  ])
  const map = buildPlaceholderMap(attrs, utentiCache, cicli)
  const { selectedGroups } = applyNotaSpeseQueryResultToRapportoMap(map, attrs, nsQueryResult, {
    includeNotaSpese: selection.includeNotaSpese !== false,
    selectedNotaSpeseKeys: selection.selectedNotaSpeseKeys
  })
  const base = String(map.cod_pratica || 'rapporto').replace(/[^a-zA-Z0-9_-]/g, '_')
  if (selection.includeRapporto !== false) {
    const rapportoBytes = await buildRapportoPdf(map)
    items.push({ blob: new Blob([rapportoBytes as any], { type: 'application/pdf' }), fileName: `rapporto_tecnico_${base}.pdf` })
  }

  if (selectedGroups.length) {
    const art30Summary = buildArt30RapportoSummary(attrs)
    const luogoData = 'Cagliari, ' + new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const hasRealRaRows = selectedGroups.some(group => ((group.rows as any)?.RA || []).length > 0)

    for (let i = 0; i < selectedGroups.length; i++) {
      const group = selectedGroups[i]
      const groupHasRealRaRows = ((group.rows as any)?.RA || []).length > 0
      const nsData: NotaSpeseData = {
        cod_pratica: map.cod_pratica || '',
        area_label: map.area_label || '',
        settore_label: map.settore_label || '',
        codice_casistica: group.codiceCasistica,
        titolo_nota: group.label,
        rows: group.rows,
        summary: group.summary,
        art30: !hasRealRaRows && group.codiceCasistica === 'C104_ATTREZZATURE_DANNEGGIATE' && art30Summary.hasData
          ? {
              rows: art30Summary.rows.map(row => ({
                codice: row.codice,
                descrizione: row.descrizione,
                quantita: row.quantita,
                valore_unitario: row.valoreUnitario,
                importo: row.importo ?? ((row.valoreUnitario ?? 0) * row.quantita)
              })),
              rimborso: art30Summary.rimborso,
              cauzione: art30Summary.cauzione,
              cauzione_quantita: art30Summary.cauzioneQuantita,
              cauzione_valore_unitario: art30Summary.cauzioneValoreUnitario,
              cauzione_unita_misura: art30Summary.cauzioneUnitaMisura,
              netto: art30Summary.netto
            }
          : null,
        luogo_data: luogoData,
        firma_nome: map.iter_compilazione_nome || map.generato_da || '',
        rapporto_respinto: map.rapporto_respinto,
        rapporto_approvato: map.rapporto_approvato,
        rapporto_istruttoria: map.rapporto_istruttoria
      } as any
      const bytes = await buildNotaSpesePdf(nsData)
      const suffix = groupHasRealRaRows ? '_risarcimento_attrezzature' : (selectedGroups.length > 1 ? `_nota_${i + 1}` : '')
      items.push({ blob: new Blob([bytes as any], { type: 'application/pdf' }), fileName: `nota_spese_${base}${suffix}.pdf` })
    }
  }
  return items
}

function isGeneratedAdminDocument (att: AttachmentInfo): boolean {
  const kw = (att.keywords || '').toUpperCase()
  return kw.includes('GII_PROPOSTA_CONTESTAZIONE') || kw.includes('GII_BOZZA_DETERMINAZIONE')
}

/**
 * pdf-lib (embedJpg/embedPng) disegna i pixel grezzi dell'immagine senza applicare
 * il tag EXIF di orientamento, a differenza dei visualizzatori standard — risultato:
 * foto scattate in verticale/ruotate dal telefono appaiono storte nel PDF. Correggiamo
 * facendo decodificare l'immagine al browser stesso (che applica l'orientamento EXIF
 * con l'opzione 'from-image') e ridisegnandola su canvas, ottenendo byte già orientati
 * correttamente. Fallback silenzioso ai byte originali se l'API non è disponibile.
 */
async function normalizeAttachmentImageBytes (bytes: Uint8Array, isPng: boolean): Promise<Uint8Array> {
  try {
    const mimeType = isPng ? 'image/png' : 'image/jpeg'
    const blob = new Blob([bytes as any], { type: mimeType })
    const bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' } as any)
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return bytes
    ctx.drawImage(bitmap, 0, 0)
    const outBlob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, mimeType, 0.92))
    if (!outBlob) return bytes
    return new Uint8Array(await outBlob.arrayBuffer())
  } catch {
    return bytes
  }
}

async function buildAllegatiSection (oid: number, selection: FascicoloDocumentSelection, numeroRapportoTecnico: string): Promise<{ blob: Blob, fileName: string } | null> {
  const { attachments: allRaw, resolvedUrl } = await queryFascicoloAttachments(oid)
  const all = allRaw.filter(a => !isGeneratedAdminDocument(a))
  const selected = selection.selectedAttachmentIds ? all.filter(a => selection.selectedAttachmentIds!.includes(a.id)) : all
  if (!selected.length) return null

  const out = await PDFDocument.create()
  let added = 0
  let imageIndex = 0
  const pageTitles: string[] = []
  for (const att of selected) {
    const blob = await fetchAttachmentBlob(att, oid, resolvedUrl)
    const bytes = new Uint8Array(await blob.arrayBuffer())
    if (att.contentType.toLowerCase().includes('pdf') || att.name.toLowerCase().endsWith('.pdf')) {
      const src = await PDFDocument.load(bytes)
      const pages = await out.copyPages(src, src.getPageIndices())
      pages.forEach(pg => { out.addPage(pg); added++; pageTitles.push('') })
    } else if (isImageAttachment(att)) {
      imageIndex++
      const isPng = att.contentType.toLowerCase().includes('png') || att.name.toLowerCase().endsWith('.png')
      const orientedBytes = await normalizeAttachmentImageBytes(bytes, isPng)
      const img = isPng
        ? await out.embedPng(orientedBytes)
        : await out.embedJpg(orientedBytes)
      const page = out.addPage([595.28, 841.89])
      const box = RAPPORTO_TECHNICAL_BODY_BOX
      const scale = Math.min(box.width / Math.max(1, img.width), box.height / Math.max(1, img.height))
      const w = img.width * scale
      const h = img.height * scale
      page.drawImage(img, { x: box.x + (box.width - w) / 2, y: box.y + (box.height - h) / 2, width: w, height: h })
      pageTitles.push(attachmentTechnicalDocumentTitle(imageIndex, numeroRapportoTecnico))
      added++
    }
  }
  if (!added) return null
  await drawRapportoTechnicalHeadersByPage(out, index => pageTitles[index] || attachmentTechnicalDocumentTitle(index + 1, numeroRapportoTecnico))
  const bytes = await out.save()
  return { blob: new Blob([bytes as any], { type: 'application/pdf' }), fileName: `allegati_${numeroRapportoTecnico}.pdf`.replace(/[^a-zA-Z0-9_.-]/g, '_') }
}

function normalizeArcgisLayerUrl (raw?: string | null): string {
  const url = String(raw || '').trim()
  if (!url) return ''
  const match = url.match(/^([^?#]*)([?#].*)?$/)
  const base = String(match?.[1] || '').replace(/\/+$/, '')
  const suffix = String(match?.[2] || '')
  if (/\/(FeatureServer|MapServer)$/i.test(base)) return `${base}/0${suffix}`
  return `${base}${suffix}`
}

function comparableArcgisLayerUrl (raw: any): string {
  return normalizeArcgisLayerUrl(String(raw || '')).split(/[?#]/)[0].replace(/\/+$/, '').toLowerCase()
}

function sameArcgisLayerUrl (a: any, b: any): boolean {
  const aa = comparableArcgisLayerUrl(a)
  const bb = comparableArcgisLayerUrl(b)
  return !!aa && !!bb && aa === bb
}

function normalizePrintableLayerTitle (raw: any): string {
  return String(raw || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function printableLayerIsLocalization (item: GiiPrintableMapLayerItem, mapLocalizationLayerUrl?: string): boolean {
  if (!item?.layer) return false
  if (sameArcgisLayerUrl(item.layer?.url, mapLocalizationLayerUrl)) return true
  const title = normalizePrintableLayerTitle(item.title || item.layer?.title || item.layer?.id || item.layer?.name)
  return title.includes('localizz') && title.includes('infraz')
}

function mapBasemapLabel (value: any): string {
  const key = String(value || '').trim().toLowerCase()
  if (key === 'satellite') return 'Ortofoto'
  if (key === 'hybrid') return 'Ortofoto con etichette'
  if (key === 'topo-vector') return 'Topografica'
  if (key === 'streets-vector') return 'Stradale'
  return String(value || '').trim()
}

function mapPrintPointGeometry (target: any, Point: any): any | null {
  if (!target) return null
  const sr = target.spatialReference || { wkid: 4326 }
  const lon = Number(target.longitude ?? (sr?.wkid === 4326 ? target.x : NaN))
  const lat = Number(target.latitude ?? (sr?.wkid === 4326 ? target.y : NaN))
  if (Number.isFinite(lon) && Number.isFinite(lat) && !(lon === 0 && lat === 0)) {
    return new Point({ longitude: lon, latitude: lat, spatialReference: { wkid: 4326 } })
  }
  const x = Number(target.x)
  const y = Number(target.y)
  if (Number.isFinite(x) && Number.isFinite(y) && !(x === 0 && y === 0)) {
    return new Point({ x, y, spatialReference: sr })
  }
  return null
}

function delay (ms: number): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, ms))
}

/**
 * Esporta la pagina mappa usando una MapView live fornita dal widget chiamante
 * (es. gii-azioni la riceve come prop da un map widget ExB collegato). Riusa
 * integralmente la logica di lettura layer/legenda già collaudata in map-layers.ts
 * (listGiiPrintableMapLayers, buildGiiMapLegendItemsForView, ecc.) — nessuna
 * duplicazione, nessuna reinvenzione.
 *
 * Non è possibile fare questa esportazione in modo puramente headless (senza
 * nessuna view): il servizio di stampa ArcGIS richiede una view reale da cui
 * derivare spatialReference/extent, e la lettura di layer/legenda in questo
 * codebase è strutturalmente legata a oggetti Esri live (view.map.layers), non
 * a una configurazione statica serializzabile. Se manca la view, la sezione
 * mappa viene omessa (comportamento attuale in gii-editing-amm).
 */
async function buildMappaSection (
  view: any | null,
  geometry: any | null,
  mapConfig: { printServiceUrl?: string, mapLayerVisibility?: Record<string, boolean>, mapBasemap?: string, mapScale?: number, mapLayout?: string, mapLocalizationLayerUrl?: string } | undefined,
  numeroRapportoTecnico: string
): Promise<{ blob: Blob, fileName: string } | null> {
  const serviceUrl = String(mapConfig?.printServiceUrl || '').trim()
  if (!view || !geometry || !serviceUrl) {
    return null
  }
  try {
    const PrintTemplate = await loadEsriModule<any>('esri/rest/support/PrintTemplate')
    const PrintParameters = await loadEsriModule<any>('esri/rest/support/PrintParameters')
    const print = await loadEsriModule<any>('esri/rest/print')
    const Basemap = await loadEsriModule<any>('esri/Basemap').catch((): null => null)
    const Graphic = await loadEsriModule<any>('esri/Graphic').catch((): null => null)
    const Point = await loadEsriModule<any>('esri/geometry/Point').catch((): null => null)
    const SimpleMarkerSymbol = await loadEsriModule<any>('esri/symbols/SimpleMarkerSymbol').catch((): null => null)
    const symbolUtils = await loadEsriModule<any>('esri/symbols/support/symbolUtils').catch((): null => null)
    const ExtentCtor = await loadEsriModule<any>('esri/geometry/Extent').catch((): null => null)

    const opts = {
      mapLayerVisibility: mapConfig?.mapLayerVisibility || {},
      mapBasemap: mapConfig?.mapBasemap,
      mapScale: mapConfig?.mapScale,
      mapLayout: mapConfig?.mapLayout,
      mapTarget: geometry
    }

    await ensureGiiPrintableMapLayersReady(view)
    const layers = listGiiPrintableMapLayers(view)
    const localizationLayerKeys = new Set(layers.filter(item => printableLayerIsLocalization(item, mapConfig?.mapLocalizationLayerUrl)).map(item => item.key))
    const hasLocalizationLayerControl = localizationLayerKeys.size > 0
    const localizationRequested = !hasLocalizationLayerControl || layers.some(item => {
      if (!localizationLayerKeys.has(item.key)) return false
      return opts.mapLayerVisibility?.[item.key] !== false
    })
    const oldVisibilityMap = new Map<any, boolean>()
    const oldDefinitionMap = new Map<any, any>()
    layers.forEach(item => {
      ;[item.layer, ...(item.ancestors || [])].forEach(layer => {
        if (layer && !oldVisibilityMap.has(layer)) oldVisibilityMap.set(layer, layer.visible !== false)
      })
      if (localizationLayerKeys.has(item.key) && item.layer && !oldDefinitionMap.has(item.layer)) {
        try { oldDefinitionMap.set(item.layer, item.layer.definitionExpression) } catch {}
      }
    })
    const oldBasemap = view?.map?.basemap
    const oldScale = Number(view?.scale)
    const oldViewpoint = (() => { try { return view?.viewpoint?.clone ? view.viewpoint.clone() : view?.viewpoint } catch { return null } })()
    let printMarker: any = null
    try {
      layers.forEach(item => {
        if (item.layer && Object.prototype.hasOwnProperty.call(opts.mapLayerVisibility || {}, item.key)) {
          const visible = !!opts.mapLayerVisibility[item.key]
          const isLocalizationLayer = localizationLayerKeys.has(item.key)
          if (visible && !isLocalizationLayer) {
            ;(item.ancestors || []).forEach(layer => { try { layer.visible = true } catch {} })
          }
          item.layer.visible = isLocalizationLayer ? false : visible
          if (isLocalizationLayer) {
            try { item.layer.definitionExpression = '1 = 0' } catch {}
          }
        }
      })
      if (opts.mapBasemap && view?.map) {
        try {
          const bm = Basemap?.fromId ? Basemap.fromId(String(opts.mapBasemap)) : String(opts.mapBasemap)
          view.map.basemap = bm || String(opts.mapBasemap)
          if (typeof view.map.basemap?.load === 'function') await view.map.basemap.load().catch(() => {})
          await view.when?.()
          try {
            const baseLayer = view.map.basemap?.baseLayers?.getItemAt?.(0)
            if (baseLayer && typeof view.whenLayerView === 'function') await Promise.race([view.whenLayerView(baseLayer), delay(300)])
          } catch {}
          try { view.requestRender?.() } catch {}
        } catch {
          try { view.map.basemap = String(opts.mapBasemap) } catch {}
        }
      }
      const requestedScale = Number(opts.mapScale)
      const printTargetGeometry = Point && opts.mapTarget ? mapPrintPointGeometry(opts.mapTarget, Point) : null
      if (typeof view.goTo === 'function') {
        if (opts.mapTarget) {
          try { await view.goTo({ target: printTargetGeometry || opts.mapTarget, scale: Number.isFinite(requestedScale) && requestedScale > 0 ? requestedScale : undefined }, { animate: false }) } catch {}
        } else if (Number.isFinite(requestedScale) && requestedScale > 0) {
          try { await view.goTo({ scale: requestedScale }, { animate: false }) } catch {}
        }
      }
      try { await view.when?.() } catch {}
      try { view.requestRender?.() } catch {}
      // Attesa robusta che la view sia effettivamente "ferma" (nessuna richiesta di tile/feature
      // in corso) prima di stampare. I layer appena resi visibili (erano nascosti fino a un attimo
      // prima) non hanno ancora feature caricate per l'estensione corrente: aspettare solo il primo
      // layer della mappa (comportamento precedente, ereditato) non è sufficiente in generale.
      const waitForViewIdle = async (timeoutMs: number): Promise<void> => {
        const start = Date.now()
        while (view?.updating && (Date.now() - start) < timeoutMs) {
          await delay(100)
        }
      }
      await waitForViewIdle(4000)
      if (typeof view.whenLayerView === 'function' && view.map?.layers?.length) {
        try { await Promise.race([view.whenLayerView(view.map.layers.getItemAt(0)), delay(400)]) } catch {}
      }
      await delay(250)
      if (localizationRequested && opts.mapTarget && Graphic && Point && SimpleMarkerSymbol && view?.graphics) {
        try {
          const pointGeometry = printTargetGeometry || mapPrintPointGeometry(opts.mapTarget, Point)
          if (pointGeometry) {
            const symbol = new SimpleMarkerSymbol({
              style: 'circle',
              color: [220, 38, 38, 220],
              size: 9,
              xoffset: 0,
              yoffset: 0,
              outline: { color: [255, 255, 255, 255], width: 1.5 }
            })
            printMarker = new Graphic({ geometry: pointGeometry, symbol, attributes: { source: 'gii-fascicolo-print-marker' } })
            view.graphics.add(printMarker)
            try { view.requestRender?.() } catch {}
            await delay(120)
          }
        } catch {}
      }
      // Seconda attesa idle dopo l'aggiunta del marker (view.graphics.add può innescare un
      // ulteriore ciclo di update) e prima del calcolo finale di extent/legenda/stampa.
      await waitForViewIdle(2000)

      const printScale = Number(opts.mapScale) || Number(view?.scale) || 0
      const printExtent = (printScale > 0 ? computePrintExtentForView(view, printScale, opts.mapLayout) ?? undefined : undefined) as { xmin: number; ymin: number; xmax: number; ymax: number; spatialReference?: any } | undefined


      const legendItems = await buildGiiMapLegendItemsForView(view, layers, { ...opts, symbolUtils, printExtent, ExtentCtor }, localizationLayerKeys, localizationRequested)

      const template = new PrintTemplate({
        format: 'pdf',
        layout: opts.mapLayout || 'A4 Portrait',
        layoutOptions: { titleText: '', authorText: '', copyrightText: '' },
        exportOptions: { dpi: 96 },
        scalePreserved: true,
        outScale: Number(opts.mapScale) || Number(view?.scale) || undefined
      })
      const params = new PrintParameters({ view, template })
      const result = await print.execute(serviceUrl, params)
      const url = String(result?.url || result?.href || '')
      if (!url) {
        return null
      }
      const resp = await fetch(url)
      if (!resp.ok) return null
      const rawBlob = await resp.blob()
      const wrapped = await wrapMapPdfBlobWithRapportoTechnicalHeader(rawBlob, `ELABORATO CARTOGRAFICO ALLEGATO AL RAPPORTO TECNICO DI RILEVAZIONE N. ${numeroRapportoTecnico}`, {
        scale: Number(opts.mapScale) || Number(view?.scale) || null,
        basemapLabel: mapBasemapLabel(opts.mapBasemap || view?.map?.basemap?.title || view?.map?.basemap?.id),
        legendItems,
        sourceLayout: opts.mapLayout
      })
      return { blob: wrapped, fileName: `mappa_${numeroRapportoTecnico}.pdf`.replace(/[^a-zA-Z0-9_.-]/g, '_') }
    } finally {
      if (printMarker && view?.graphics) {
        try { view.graphics.remove(printMarker) } catch {}
      }
      oldDefinitionMap.forEach((definition, layer) => { try { layer.definitionExpression = definition } catch {} })
      oldVisibilityMap.forEach((visible, layer) => { try { layer.visible = visible } catch {} })
      try { if (oldBasemap && view?.map) view.map.basemap = oldBasemap } catch {}
      if (typeof view?.goTo === 'function') {
        if (oldViewpoint) {
          try { await view.goTo(oldViewpoint, { animate: false }) } catch {}
        } else if (Number.isFinite(oldScale) && oldScale > 0) {
          try { await view.goTo({ scale: oldScale }, { animate: false }) } catch {}
        }
      }
    }
  } catch (err) {
    // Non blocca il resto del fascicolo se la mappa fallisce: sezione omessa.
    return null
  }
}

function getNumeroRapportoTecnico (attrs: Record<string, any>): string {
  return String(pickAttrCI(attrs, ['numero_rapporto_tecnico', 'n_rapporto']) || '').trim() || '-'
}

/**
 * Punto unico di generazione del fascicolo documentale. Chiamato identicamente
 * da editing-ti, editing-amm e azioni: nessuno di loro passa dati propri, solo
 * l'OID e le opzioni scelte dall'utente (selezione documenti/allegati/nota spese).
 */
export async function buildFascicolo (params: FascicoloBuildParams): Promise<{ blob: Blob, fileName: string }> {
  const { attrs, geometry, fields } = await queryFascicoloRecord(params.oid)
  const numeroRapportoTecnico = getNumeroRapportoTecnico(attrs)
  const items: Array<{ blob: Blob, fileName: string }> = []

  if (params.selection.includeTecnici) {
    const rapportoItems = await buildRapportoSection(attrs, params.notaSpeseConfig, params.selection)
    rapportoItems.forEach(item => items.push(item))

    const wantsMappa = params.selection.includeMappa !== false
    if (wantsMappa) {
      const mappaItem = await buildMappaSection(params.mapConfig?.view, geometry, params.mapConfig, numeroRapportoTecnico)
      if (mappaItem) items.push(mappaItem)
    }

    const allegatiItem = await buildAllegatiSection(params.oid, params.selection, numeroRapportoTecnico)
    if (allegatiItem) items.push(allegatiItem)
  }

  if (params.selection.includeAmministrativi) {
    items.push(await buildVerbalePdfBlob(attrs, fields, params.profile))
  }

  if (!items.length) throw new Error('Nessun documento selezionato da includere nel fascicolo.')

  const blob = items.length === 1 ? items[0].blob : await mergePdfItems(items)
  const prefix = params.fileNamePrefix || 'fascicolo'
  const safe = String(numeroRapportoTecnico || params.oid).replace(/[^a-zA-Z0-9_-]/g, '_')
  return { blob, fileName: `${prefix}_${safe}.pdf` }
}

async function mergePdfItems (items: Array<{ blob: Blob, fileName: string }>): Promise<Blob> {
  const merged = await PDFDocument.create()
  for (const item of items) {
    const src = await PDFDocument.load(new Uint8Array(await item.blob.arrayBuffer()))
    const pages = await merged.copyPages(src, src.getPageIndices())
    pages.forEach(pg => merged.addPage(pg))
  }
  const bytes = await merged.save()
  return new Blob([bytes as any], { type: 'application/pdf' })
}
