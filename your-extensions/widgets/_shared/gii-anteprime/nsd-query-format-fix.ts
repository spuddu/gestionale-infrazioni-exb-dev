// Workaround mirato per GII_VIEW_EB_NOTA_SPESE_DETTAGLIO: su questa vista
// ArcGIS Online puo' restituire 400 alle query pbf dopo modifiche allo schema,
// mentre la stessa query in JSON funziona correttamente.
//
// La registrazione effettiva e la gestione delle chiamate concorrenti sono
// centralizzate in _shared/gii-arcgis/json-query-format.ts.

import { ensureJsonOnlyQueryFormat } from '../gii-arcgis/json-query-format'

const NSD_URL_PATTERN = /GII_VIEW_EB_NOTA_SPESE_DETTAGLIO\/FeatureServer/i

export async function ensureNsdJsonOnlyQueryFormat (): Promise<void> {
  await ensureJsonOnlyQueryFormat({
    key: 'nota-spese-dettaglio',
    urls: NSD_URL_PATTERN,
    label: 'la vista di dettaglio della nota spese'
  })
}
