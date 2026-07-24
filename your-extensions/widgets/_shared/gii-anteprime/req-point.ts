// Logica centralizzata per decidere se una pratica GII richiede (e quindi deve mostrare)
// un punto in mappa — usata da tutti i widget/viewer che decidono se mostrare il punto in
// mappa o la mappa nel fascicolo: gii-editing-ti (scheda "Luoghi e dati tecnici"), gii-azioni
// e gii-editing-amm (anteprima fascicolo), e in prospettiva gii-dettaglio-pratiche.
//
// Estratta da gii-editing-ti (unica copia originale, non duplicata altrove prima d'ora).
//
// IMPORTANTE: il campo salvato `req_point` (0/1) NON è la fonte di verità da leggere qui.
// Viene scritto solo al salvataggio da gii-editing-ti, quindi per le pratiche appena arrivate
// da survey (TR) e mai ancora modificate da un TI può restare vuoto/non significativo pur
// avendo coordinate reali. La fonte di verità è invece SEMPRE il ricalcolo di questa funzione
// a partire dal tipo di violazione presente negli attributi correnti del record.

// Articoli (norma3) per cui è richiesta la localizzazione in mappa.
export const NORMA3_REQ_POINT = new Set([
  'Art12', 'Art27', 'Art28', 'Art31', 'Art32', 'Art33', 'Art34', 'Art35', 'Art36', 'Art37', 'Art39'
])

// Whitelist degli articoli norma3 validi (stessa lista delle chiavi di NORMA3_TO_VFIELD in
// gii-editing-ti — qui riportata a parte perché quella mappa serve anche ad altro, specifico
// di editing-ti, e non va spostata per intero).
const NORMA3_VALID_CODES = new Set([
  'Art8', 'Art12', 'Art27', 'Art28', 'Art29', 'Art30', 'Art31', 'Art32',
  'Art33', 'Art34', 'Art35', 'Art36', 'Art37', 'Art39'
])

function parseMultiSelect (val: any): string[] {
  if (!val) return []
  if (Array.isArray(val)) return val.map(String).map(s => s.trim()).filter(Boolean)

  // Survey123 può salvare il select_multiple come:
  // - stringa separata da spazio: "Art8 Art12"
  // - stringa separata da virgola/punto e virgola: "Art8, Art12"
  // - etichette più estese: "Art. 8 - ...; Art. 12 - ..."
  // Qui teniamo la stringa intera e la spezziamo in modo permissivo: il filtro
  // finale resta comunque limitato agli articoli ammessi in NORMA3_VALID_CODES.
  const s = String(val || '').trim()
  if (!s) return []

  const artMatches = s.match(/Art\.?\s*0?\d{1,2}/gi)
  if (artMatches && artMatches.length > 0) return artMatches.map(x => x.trim()).filter(Boolean)

  return s.split(/[\s;,|\n]+/g).map(x => x.trim()).filter(Boolean)
}

function canonicalNorma3Code (value: any): string {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  const m = raw.match(/^art\.?\s*0?(\d{1,2})$/i) || raw.match(/^0?(\d{1,2})$/)
  if (!m) return raw
  return `Art${Number(m[1])}`
}

export function parseNorma3Codes (val: any): string[] {
  const out: string[] = []
  const add = (token: any): void => {
    const code = canonicalNorma3Code(token)
    if (code && NORMA3_VALID_CODES.has(code) && !out.includes(code)) out.push(code)
  }
  parseMultiSelect(val).forEach(add)
  return out
}

// Ricalcola se la pratica richiede un punto in mappa, dagli attributi correnti del record —
// non dal campo salvato req_point. Vedi nota in testa al file.
export function computeReqPoint (attrs: Record<string, any>): 0 | 1 {
  const p = String(attrs?.norma15_parziale ?? '')
  const t = String(attrs?.norma15_totale ?? '')
  if (p === 'Art15.1' || p === 'Art15.2') return 1
  if (t === 'Art15.3' || t === 'Art15.4') return 1

  const norma3 = parseNorma3Codes(attrs?.norma_violata3)
  if (norma3.some(v => NORMA3_REQ_POINT.has(v))) return 1
  return 0
}
