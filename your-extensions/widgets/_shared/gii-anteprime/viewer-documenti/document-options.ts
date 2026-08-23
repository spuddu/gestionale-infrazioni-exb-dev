export type GiiDocumentPrintOptions = {
  includeRapporto: boolean
  includeNotaSpese: boolean
  includeMappa: boolean
  includeAllegatiTecnici: boolean
  includeAllegatiAmministrativi: boolean
  includePropostaContestazione?: boolean
  includeDeterminazione?: boolean
  includeAttoContestazione?: boolean
  selectedNotaSpeseKeys?: Record<string, boolean>
  selectedAttachmentIds?: Record<string, boolean>
  mapLayout: string
  mapScale: number
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
  keywords?: string
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
    includeAllegatiTecnici: false,
    includeAllegatiAmministrativi: false,
    includePropostaContestazione: false,
    includeDeterminazione: false,
    includeAttoContestazione: false,
    mapLayout: 'A4 Portrait',
    mapScale: 1000,
    mapBasemap: 'satellite',
    mapLayerVisibility: {}
  }
}

export function cloneGiiDocumentPrintOptions (opts?: GiiDocumentPrintOptions | null): GiiDocumentPrintOptions {
  const base = opts || defaultGiiDocumentPrintOptions()
  return {
    ...base,
    includePropostaContestazione: !!base.includePropostaContestazione,
    includeDeterminazione: !!base.includeDeterminazione,
    includeAttoContestazione: !!base.includeAttoContestazione,
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
