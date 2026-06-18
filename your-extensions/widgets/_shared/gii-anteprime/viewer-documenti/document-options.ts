export type GiiDocumentPrintOptions = {
  includeRapporto: boolean
  includeNotaSpese: boolean
  includeMappa: boolean
  includeAllegati: boolean
  selectedNotaSpeseKeys?: Record<string, boolean>
  selectedAttachmentIds?: Record<string, boolean>
  mapLayout: string
  mapScale: number
  mapTitle: string
  mapBasemap: string
  mapLayerVisibility: Record<string, boolean>
  mapTarget?: any
  mapSelectedOid?: number | null
  mapSelectedIdFieldName?: string
  mapLocalizationLayerUrl?: string
}

export type GiiAttachmentPrintOption = {
  id: number
  name?: string
  size?: number
  contentType?: string
  url?: string
}

export type GiiNotaSpesePrintOption = {
  key: string
  label: string
}

export function defaultGiiDocumentPrintOptions (): GiiDocumentPrintOptions {
  return {
    includeRapporto: true,
    includeNotaSpese: false,
    includeMappa: false,
    includeAllegati: false,
    mapLayout: 'A4 Portrait',
    mapScale: 1000,
    mapTitle: '',
    mapBasemap: 'satellite',
    mapLayerVisibility: {}
  }
}

export function cloneGiiDocumentPrintOptions (opts?: GiiDocumentPrintOptions | null): GiiDocumentPrintOptions {
  const base = opts || defaultGiiDocumentPrintOptions()
  return {
    ...base,
    selectedNotaSpeseKeys: { ...(base.selectedNotaSpeseKeys || {}) },
    selectedAttachmentIds: { ...(base.selectedAttachmentIds || {}) },
    mapLayerVisibility: { ...(base.mapLayerVisibility || {}) }
  }
}

export function setGiiNotaSpesePrintOptionVisible (opts: GiiDocumentPrintOptions, key: string, visible: boolean): GiiDocumentPrintOptions {
  return {
    ...opts,
    selectedNotaSpeseKeys: {
      ...(opts.selectedNotaSpeseKeys || {}),
      [String(key)]: visible
    }
  }
}

export function setGiiAttachmentPrintOptionVisible (opts: GiiDocumentPrintOptions, id: number, visible: boolean): GiiDocumentPrintOptions {
  return {
    ...opts,
    selectedAttachmentIds: {
      ...(opts.selectedAttachmentIds || {}),
      [String(id)]: visible
    }
  }
}

export function setGiiMapLayerKeysVisible (opts: GiiDocumentPrintOptions, keys: string[], visible: boolean): GiiDocumentPrintOptions {
  const nextVisibility = { ...(opts.mapLayerVisibility || {}) }
  keys.forEach(key => { nextVisibility[key] = visible })
  return {
    ...opts,
    mapLayerVisibility: nextVisibility
  }
}
