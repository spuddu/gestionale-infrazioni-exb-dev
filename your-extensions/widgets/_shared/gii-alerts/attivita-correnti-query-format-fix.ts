// Workaround mirato per GII_ATTIVITA_CORRENTI e relative viste per area:
// su queste risorse ArcGIS Online puo' restituire 400 alle query pbf, mentre
// la stessa query in JSON funziona correttamente.
//
// La registrazione effettiva e la gestione delle chiamate concorrenti sono
// centralizzate in _shared/gii-arcgis/json-query-format.ts.

import { ensureJsonOnlyQueryFormat } from '../gii-arcgis/json-query-format'

// Copre la tabella base e GII_VIEW_ATTIVITA_CORRENTI_AMM / _AGR / _TEC.
const ATTIVITA_CORRENTI_URL_PATTERN = /GII_(VIEW_)?ATTIVITA_CORRENTI(_AMM|_AGR|_TEC)?\/FeatureServer/i

export async function ensureAttivitaCorrentiJsonOnlyQueryFormat (): Promise<void> {
  await ensureJsonOnlyQueryFormat({
    key: 'attivita-correnti',
    urls: ATTIVITA_CORRENTI_URL_PATTERN,
    label: 'le attività correnti'
  })
}
