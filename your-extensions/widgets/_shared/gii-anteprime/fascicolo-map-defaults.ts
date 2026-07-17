// Default della mappa headless usata per generare l'elaborato cartografico del fascicolo —
// un'unica fonte di verità condivisa da tutti i widget che la usano (gii-editing-ti,
// gii-editing-amm, e in prospettiva qualunque altro), invece di richiedere che lo stesso
// valore venga configurato separatamente nel setting di ciascun widget/ciascuna pagina.
//
// Questa mappa non è mai collegata a un widget Mappa dell'app: viene costruita da zero, una
// volta, solo da questi valori statici (più il punto della pratica quando disponibile).
//
// Se in futuro un widget avesse davvero bisogno di un valore diverso, può comunque passare
// il proprio mapConfig: quei valori hanno sempre priorità su questi default (vedi merge in
// anteprima-panel.tsx), quindi questo file resta un default, non un vincolo rigido.
export const FASCICOLO_MAP_DEFAULTS = {
  basemap: 'satellite',
  // WebMap "Rapporto di rilevazione_Editing_map" — porta con sé tutti i layer di
  // riferimento (Catasto, Schema ENAS, Schema CBSM, Comprensorio CBSM), non solo il basemap.
  // Usata da tutti i widget, indipendentemente da un collegamento a un widget Mappa ExB.
  webMapItemId: 'ebb5e0d0d2d649daa2e124bd96514245',
  officeLonWgs84: 0,
  officeLatWgs84: 0,
  mapLayerTitle: 'Localizzazione infrazioni',
  mapLayerUrl: 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_MAPPA_LOCALIZZAZIONE/FeatureServer/0',
  mapLayerId: 'dataSource_44-508bfb3780d64a92852f09236381af8f',
  mapLayerLayerId: '0'
}

// Servizio pubblico standard Esri per la stampa mappa — stesso valore ovunque, non ha senso
// configurarlo per singolo widget.
export const DEFAULT_PRINT_SERVICE_URL = 'https://utility.arcgisonline.com/arcgis/rest/services/Utilities/PrintingTools/GPServer/Export%20Web%20Map%20Task'
