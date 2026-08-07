// Workaround mirato per GII_INFRAZIONI_VIEW_ALL.
//
// 1) La vista puo' restituire HTTP 400 alle query PBF usate da FeatureLayerView2D
//    e FeatureTable: si forza quindi JSON.
// 2) La WebMap storica contiene il filtro `req_point <> 0`. Il campo req_point,
//    pero', viene scritto solo al salvataggio di gii-editing-ti e puo' essere NULL
//    nelle nuove rilevazioni Survey123. La finalita' del filtro resta corretta
//    (mostrare solo pratiche che richiedono un punto), ma il criterio deve essere
//    ricalcolato dalle violazioni correnti, come fa computeReqPoint().
//
// L'interceptor e' installato dallo Header prima della pagina Mappa e riscrive
// soltanto il predicato legacy nelle query dirette a questa vista.

import { ensureJsonOnlyQueryFormat } from '../gii-arcgis/json-query-format'
import { buildReqPointSqlWhereClause } from '../gii-anteprime/req-point'

const INFRAZIONI_VIEW_ALL_URL_PATTERN = /GII_INFRAZIONI_VIEW_ALL\/FeatureServer/i

function rewriteLegacyReqPointWhere (rawWhere: any): string {
  const where = String(rawWhere ?? '')
  if (!where) return where
  const computed = buildReqPointSqlWhereClause()
  return where
    .replace(/\breq_point\s*(?:<>|!=)\s*0\b/gi, computed)
    .replace(/\breq_point\s*=\s*1\b/gi, computed)
}

function rewriteInfrazioniRequest (params: any): void {
  const query = params?.requestOptions?.query
  if (!query || typeof query.where !== 'string') return
  const nextWhere = rewriteLegacyReqPointWhere(query.where)
  if (nextWhere !== query.where) query.where = nextWhere
}

export async function ensureInfrazioniViewAllJsonOnlyQueryFormat (): Promise<void> {
  await ensureJsonOnlyQueryFormat({
    key: 'infrazioni-view-all',
    urls: INFRAZIONI_VIEW_ALL_URL_PATTERN,
    label: 'la vista cartografica generale delle infrazioni',
    beforeRequest: rewriteInfrazioniRequest
  })
}
