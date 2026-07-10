// Cache di sessione per istanze FeatureLayer già caricate (solo l'oggetto layer/schema —
// i DATI restano sempre interrogati freschi ad ogni chiamata con queryFeatures, questa
// cache evita solo il costo di ricreare e ricaricare il layer da zero ogni volta).
// Stesso principio già usato per GII_utenti, generalizzato per qualunque URL di layer.
const _layerCache = new Map<string, any>()
const _layerLoading = new Map<string, boolean>()

function loadEsriModuleForLayerCache<T = any> (path: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = (window as any).require
    if (!req) { reject(new Error('AMD require non disponibile')); return }
    req([path], (mod: T) => resolve(mod), (err: any) => reject(err))
  })
}

export async function ensureCachedFeatureLayer (url: string): Promise<any | null> {
  const key = String(url || '').trim()
  if (!key) return null
  const cached = _layerCache.get(key)
  if (cached) return cached
  if (_layerLoading.get(key)) {
    for (let i = 0; i < 50; i++) {
      await new Promise(r => setTimeout(r, 100))
      const nowCached = _layerCache.get(key)
      if (nowCached) return nowCached
    }
    return null
  }
  _layerLoading.set(key, true)
  try {
    const FeatureLayer = await loadEsriModuleForLayerCache<any>('esri/layers/FeatureLayer')
    const fl = new FeatureLayer({ url: key })
    if (typeof fl?.load === 'function') await fl.load()
    _layerCache.set(key, fl)
    return fl
  } catch {
    return null
  } finally {
    _layerLoading.set(key, false)
  }
}
