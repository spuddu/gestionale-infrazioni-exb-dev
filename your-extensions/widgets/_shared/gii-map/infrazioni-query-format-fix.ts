// Workaround mirato per GII_INFRAZIONI_VIEW_ALL: il layer operativo del WebMap
// puo' restituire HTTP 400 alle query PBF usate da FeatureLayerView2D / FeatureTable.
// Il problema e' analogo a quelli gia' rilevati sulle viste Nota spese e Attivita'
// correnti: per questa risorsa si forza quindi il formato JSON.
//
// L'interceptor viene installato dallo Header, montato globalmente prima della
// pagina Mappa, cosi' resta attivo anche quando Experience Builder ricrea il
// MapView a seguito di un cambio della resource session.

import { ensureJsonOnlyQueryFormat } from '../gii-arcgis/json-query-format'

const INFRAZIONI_VIEW_ALL_URL_PATTERN = /GII_INFRAZIONI_VIEW_ALL\/FeatureServer/i

export async function ensureInfrazioniViewAllJsonOnlyQueryFormat (): Promise<void> {
  await ensureJsonOnlyQueryFormat({
    key: 'infrazioni-view-all',
    urls: INFRAZIONI_VIEW_ALL_URL_PATTERN,
    label: 'la vista cartografica generale delle infrazioni'
  })
}
