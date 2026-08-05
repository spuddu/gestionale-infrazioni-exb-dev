// Installa interceptor mirati di esri/config che forzano JSON sulle sole risorse
// ArcGIS Online per le quali le query pbf risultano incompatibili.
//
// Experience Builder include ogni modulo condiviso nel bundle del singolo widget:
// per evitare installazioni duplicate e race condition il registro e' conservato
// su window e contiene la Promise di installazione, non un semplice flag booleano.
// Tutti i chiamanti concorrenti attendono quindi la stessa installazione completa.

function loadEsriModule<T = any> (path: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = (window as any).require
    if (!req) {
      reject(new Error('AMD require non disponibile'))
      return
    }
    req([path], (mod: T) => resolve(mod), (err: any) => reject(err))
  })
}

type JsonQueryFormatRegistry = Record<string, Promise<void> | undefined>

export interface JsonOnlyQueryFormatOptions {
  /** Chiave globale stabile e univoca per questa famiglia di servizi. */
  key: string
  /** Pattern applicato da esri/request agli URL da correggere. */
  urls: RegExp
  /** Etichetta leggibile usata esclusivamente nel warning diagnostico. */
  label: string
}

const REGISTRY_KEY = '__giiJsonOnlyQueryFormatInstallations'

function getRegistry (): JsonQueryFormatRegistry {
  const w = window as any
  if (!w[REGISTRY_KEY] || typeof w[REGISTRY_KEY] !== 'object') {
    w[REGISTRY_KEY] = Object.create(null)
  }
  return w[REGISTRY_KEY] as JsonQueryFormatRegistry
}

/**
 * Garantisce che l'interceptor indicato sia realmente installato prima che il
 * chiamante costruisca o interroghi il FeatureLayer interessato.
 *
 * In caso di errore l'installazione non blocca il flusso applicativo: viene
 * emesso un warning e la voce di registro viene rimossa, consentendo un nuovo
 * tentativo alla chiamata successiva.
 */
export async function ensureJsonOnlyQueryFormat (
  options: JsonOnlyQueryFormatOptions
): Promise<void> {
  const registry = getRegistry()
  const existing = registry[options.key]
  if (existing) {
    await existing
    return
  }

  let installation: Promise<void>
  installation = (async () => {
    const esriConfig = await loadEsriModule<any>('esri/config')
    const interceptors = esriConfig?.request?.interceptors
    if (!Array.isArray(interceptors)) {
      throw new Error('Registro interceptor di esri/request non disponibile')
    }

    // Deve precedere gli interceptor registrati da Experience Builder: inserire
    // in coda con push() rende inefficace la modifica dei metadati della risposta.
    interceptors.splice(0, 0, {
      urls: options.urls,
      after: (response: any) => {
        if (response?.data?.supportedQueryFormats) {
          response.data.supportedQueryFormats = 'JSON'
        }
      }
    })
  })().catch((error) => {
    // La Promise registrata non propaga l'errore ai chiamanti: il workaround non
    // deve impedire il normale flusso applicativo. La voce viene rimossa per
    // consentire un nuovo tentativo alla chiamata successiva.
    if (registry[options.key] === installation) {
      delete registry[options.key]
    }
    console.warn(`[GII] Impossibile forzare le query JSON per ${options.label}.`, error)
  })

  registry[options.key] = installation
  await installation
}
