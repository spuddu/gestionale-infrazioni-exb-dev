// =================================================================
// rapporto-nota-spese-summary.ts
// Logica condivisa per il riepilogo "nota spese" del rapporto tecnico:
// sintesi Art.30 (da campi diretti sul record, non da righe di dettaglio),
// raggruppamento delle righe di dettaglio per casistica, calcolo del
// totale reale e della dicitura "(Vedi nota/note spese allegata/e)".
// Estratta da gii-editing-ti/gii-azioni (copie identiche, mai unificate).
// =================================================================

import { ensureCachedFeatureLayer } from '../../esri-layer-cache'

export type NsCat = 'AT' | 'PR' | 'RU' | 'SL' | 'PF' | 'RA'
export type NsSummary = { totaleAT: number, totalePR: number, totaleRU: number, totaleSL: number, totalePF: number, totaleRA: number, percentualeSpeseGenerali: number, importoSpeseGenerali: number, totaleComplessivo: number }
export type NsRow = { objectid: number, categoria_costo: NsCat, origine_voce_snapshot: string, codice_voce_snapshot: string, descrizione_snapshot: string, unita_misura_snapshot: string, prezzo_unitario_snapshot: number, quantita: number, importo_riga: number, anno_prezzario_snapshot?: number | null, ordine: number, note: string, codice_casistica?: string | null, riferimento_attrezzatura_id?: string | null }
export type NsGroup = { codiceCasistica: string, label: string, rows: Record<NsCat, NsRow[]>, summary: NsSummary }

export type NotaSpeseConfig = {
  detailUrl?: string
  parametriUrl?: string
  parametroCode?: string
  attrezzatureParametriUrl?: string
}

type Art30Row = { codice: string, descrizione: string, quantita: number, valoreUnitario: number | null, importo: number | null }
type Art30Summary = { hasData: boolean, rows: Art30Row[], rimborso: number, cauzione: number, cauzioneQuantita: number | null, cauzioneValoreUnitario: number | null, cauzioneUnitaMisura: string, netto: number, text: string }

const NS_CATS: NsCat[] = ['AT', 'PR', 'RU', 'SL', 'PF', 'RA']

export const NS_CASISTICA_META: Record<string, { order: number, label: string }> = {
  C100_REPERIBILITA: { order: 8, label: 'Art. 8 - Violazione servizio di reperibilità' },
  C101_SPRECO_ACQUA: { order: 27, label: 'Art. 27 - Spreco d\u2019acqua/uso negligente della risorsa idrica' },
  C104_ATTREZZATURE_DANNEGGIATE: { order: 30, label: 'Art. 30 - Danneggiamento e/o perdita attrezzature' },
  C113_DANNI_STRUTTURE_IRRIGUE: { order: 39, label: 'Art. 39 - Danni alle strutture irrigue' }
}

function pickAttrCI (data: any, names: string[]): any {
  if (!data) return null
  for (const n of names) { if (data[n] != null && data[n] !== '') return data[n] }
  return null
}

function roundMoney (v: number): number {
  if (!Number.isFinite(v)) return 0
  const sign = v < 0 ? -1 : 1
  const abs = Math.abs(v)
  return sign * (Math.round((abs + 1e-9) * 100) / 100)
}

function moneyIt (v: number): string {
  if (!Number.isFinite(v)) return ''
  return roundMoney(v).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' \u20ac'
}

function parseArt30Number (value: any): number | null {
  if (value == null || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const text = String(value).trim()
  if (!text) return null
  const normalized = text.includes(',')
    ? text.replace(/\s/g, '').replace(/\./g, '').replace(',', '.')
    : text.replace(/\s/g, '')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function parseArt30DetailForPdf (raw: any): Art30Row[] {
  const out: Art30Row[] = []
  for (const line of String(raw ?? '').split(/\r?\n/)) {
    const text = line.trim()
    if (!text) continue
    if (/Stato:\s*Recuperabile\b/i.test(text)) continue
    const statoMatch = text.match(/Stato:\s*(Non recuperabile|Recuperabile)/i)
    if (!statoMatch) continue
    const cutIdx = text.search(/\s+\u2014\s+Valore unitario:/i)
    const prefix = cutIdx >= 0 ? text.slice(0, cutIdx).trim() : text
    const codiceMatch = prefix.match(/^(.*?)\s+\u2014\s+Codice:\s*(.+)$/i)
    const descrizione = String(codiceMatch?.[1] || prefix).trim()
    const codice = String(codiceMatch?.[2] || '').trim()
    if (!descrizione) continue
    const valoreUnitarioMatch = text.match(/Valore unitario:\s*([0-9.,]+)/i)
    const valoreUnitario = parseArt30Number(valoreUnitarioMatch?.[1])
    out.push({
      codice,
      descrizione,
      quantita: 1,
      valoreUnitario,
      importo: valoreUnitario
    })
  }
  return out
}

function countCauzioneDecurtataRowsForPdf (raw: any): number {
  let count = 0
  for (const line of String(raw ?? '').split(/\r?\n/)) {
    if (/Cauzione:\s*Decurtata\b/i.test(line)) count++
  }
  return count
}

// Normalizzazione chiave e riconoscimento tipo attrezzatura: stessa logica di gii-editing-ti,
// per restare coerenti sull'etichetta mostrata (es. "Curva di derivazione") a partire dal
// codice/descrizione letti dal catalogo parametri.
export function attrezzaturaKeyPdf (value: any): string {
  return String(value ?? '')
    .trim()
    .toLocaleUpperCase('it-IT')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export function attrezzaturaTipoLabelPdf (value: any): string | null {
  const key = attrezzaturaKeyPdf(value)
  if (!key) return null
  if (key.includes('TESSERA')) return 'Tessera elettronica'
  if (key.includes('CURV')) return 'Curva di derivazione'
  if (key.includes('SIFON')) return 'Sifone'
  if (key.includes('PARATOIA')) return 'Paratoia'
  return null
}

// Catalogo attrezzature Art.30 (codice -> etichetta leggibile), dalla stessa tabella
// parametri (categoria_parametro = 'ATTREZZATURA') già usata per la percentuale spese
// generali — nessuna nuova configurazione necessaria, riusa parametriUrl.
export async function loadAttrezzatureCatalogPdf (parametriUrl: string): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  if (!parametriUrl) return out
  try {
    const pfl = await ensureCachedFeatureLayer(parametriUrl)
    if (!pfl) return out
    const res = await pfl.queryFeatures({
      where: "categoria_parametro = 'ATTREZZATURA'",
      outFields: ['codice_parametro', 'descrizione', 'attivo'],
      returnGeometry: false
    })
    ;(res?.features || []).forEach((f: any) => {
      const a = f?.attributes || {}
      if (a?.attivo != null && a?.attivo !== '' && !(a?.attivo === 1 || a?.attivo === true || /^(1|true|si|s\u00ec|yes)$/i.test(String(a?.attivo).trim()))) return
      const codice = String(a?.codice_parametro ?? '').trim()
      if (!codice) return
      const descrizioneOrigine = String(a?.descrizione ?? codice).trim()
      out.set(codice, attrezzaturaTipoLabelPdf(`${codice} ${descrizioneOrigine}`) || descrizioneOrigine)
    })
  } catch { /* nessun catalogo disponibile: le note recuperabili mostreranno solo il titolo generico */ }
  return out
}

// Estrae il codice tipo (es. "ATT-003") dall'ID istanza composto (es. "ATT-003::ms488i9r2z8"),
// stessa logica di attrezzaturaInstanceTipoCode in gii-editing-ti.
export function attrezzaturaInstanceTipoCodePdf (instanceId: string): string {
  const idx = String(instanceId || '').indexOf('::')
  return idx >= 0 ? instanceId.slice(0, idx) : String(instanceId || '')
}

// Mappa riferimento_attrezzatura_id (codice catalogo) -> etichetta leggibile ("Curva di
// derivazione", numerata "(N)" se più unità dello stesso tipo compaiono nella stessa
// pratica) per le sole attrezzature "recuperabile" — usata per etichettare nel PDF le
// sotto-note spese di Art.30, una per attrezzatura (rapporto 1 a 1).
export function getRecuperabiliAttrezzatureLabelsById (rowsByCategory: Record<NsCat, NsRow[]>, catalog: Map<string, string>): Map<string, string> {
  const out = new Map<string, string>()
  const seen = new Set<string>()
  const items: { id: string, descrizione: string }[] = []
  for (const cat of NS_CATS) {
    for (const row of (rowsByCategory?.[cat] || [])) {
      if (normalizeNsCasistica(row.codice_casistica) !== 'C104_ATTREZZATURE_DANNEGGIATE') continue
      const id = String(row.riferimento_attrezzatura_id || '').trim()
      if (!id || seen.has(id)) continue
      seen.add(id)
      items.push({ id, descrizione: catalog.get(attrezzaturaInstanceTipoCodePdf(id)) || id })
    }
  }
  const totalsByDescrizione: Record<string, number> = {}
  items.forEach(item => { totalsByDescrizione[item.descrizione] = (totalsByDescrizione[item.descrizione] || 0) + 1 })
  const counters: Record<string, number> = {}
  items.forEach(item => {
    if (totalsByDescrizione[item.descrizione] > 1) {
      counters[item.descrizione] = (counters[item.descrizione] || 0) + 1
      out.set(item.id, `${item.descrizione} (${counters[item.descrizione]})`)
    } else {
      out.set(item.id, item.descrizione)
    }
  })
  return out
}

function qtyArt30It (value: number): string {
  return Number(value).toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 4 })
}

export function buildArt30RapportoSummary (data: Record<string, any>): Art30Summary {
  const detailRaw = pickAttrCI(data, ['attrezzature_risarcimento_dettaglio'])
  const rows = parseArt30DetailForPdf(detailRaw)
  const cauzioneCount = countCauzioneDecurtataRowsForPdf(detailRaw)
  const rimborsoSalvato = parseArt30Number(pickAttrCI(data, ['attrezzature_risarcimento_importo']))
  const cauzioneSalvata = parseArt30Number(pickAttrCI(data, ['attrezzature_cauzione_decurtata']))
  const nettoSalvato = parseArt30Number(pickAttrCI(data, ['attrezzature_importo_netto']))
  const cauzionePresente = String(pickAttrCI(data, ['attrezzature_cauzione_presente']) ?? '').trim().toLowerCase()
  const cauzioneAttiva = cauzionePresente === '1' || cauzionePresente === 'true' || cauzionePresente === 'si' || cauzionePresente === 's\u00ec'

  const rimborsoDaRighe = roundMoney(rows.reduce((sum, row) => {
    const importo = row.importo ?? ((row.valoreUnitario ?? 0) * row.quantita)
    return sum + (Number.isFinite(importo) ? importo : 0)
  }, 0))
  const rimborso = roundMoney(rimborsoSalvato ?? rimborsoDaRighe)
  const cauzione = roundMoney(cauzioneAttiva ? (cauzioneSalvata ?? 0) : 0)
  const netto = roundMoney(nettoSalvato ?? (rimborso - cauzione))
  const hasData = rows.length > 0 || cauzioneAttiva || (rimborsoSalvato != null && rimborsoSalvato !== 0) || (nettoSalvato != null && nettoSalvato !== 0)
  if (!hasData) return { hasData: false, rows: [], rimborso: 0, cauzione: 0, cauzioneQuantita: null, cauzioneValoreUnitario: null, cauzioneUnitaMisura: 'n.', netto: 0, text: '' }

  const parts: string[] = rows.map(row => {
    const importo = roundMoney(row.importo ?? ((row.valoreUnitario ?? 0) * row.quantita))
    if (row.valoreUnitario != null) {
      return `${row.descrizione}: n. ${qtyArt30It(row.quantita)} x ${moneyIt(row.valoreUnitario)} = ${moneyIt(importo)}`
    }
    return `${row.descrizione}: n. ${qtyArt30It(row.quantita)} = ${moneyIt(importo)}`
  })

  if (parts.length === 0 && rimborso !== 0) parts.push(`rimborso attrezzature: ${moneyIt(rimborso)}`)
  if (cauzioneAttiva || cauzione !== 0) parts.push(`cauzione: -${moneyIt(Math.abs(cauzione))}`)
  parts.push(`netto Art. 30: ${moneyIt(netto)}`)

  return {
    hasData: true,
    rows,
    rimborso,
    cauzione,
    cauzioneQuantita: cauzioneCount > 0 ? cauzioneCount : null,
    cauzioneValoreUnitario: cauzioneCount > 0 && cauzioneSalvata ? roundMoney((cauzioneSalvata / cauzioneCount)) : null,
    cauzioneUnitaMisura: 'n.',
    netto,
    text: `Art. 30 - ${parts.join('; ')}.`
  }
}

export function normalizeNsCasistica (v: any): string { return String(v ?? '').trim() }
export function cloneEmptyNsRows (): Record<NsCat, NsRow[]> { return { AT: [], PR: [], RU: [], SL: [], PF: [], RA: [] } }

export function buildNsSummaryForRows (rows: Record<NsCat, NsRow[]>, percentualeSpeseGenerali: number): NsSummary {
  const sumCat = (cat: NsCat) => roundMoney((rows[cat] || []).reduce((sum, r) => sum + roundMoney(Number(r.importo_riga) || 0), 0))
  const totaleAT = sumCat('AT')
  const totalePR = sumCat('PR')
  const totaleRU = sumCat('RU')
  const totaleSL = sumCat('SL')
  const totalePF = sumCat('PF')
  const totaleRA = sumCat('RA') // risarcimento attrezzature Art.30: non è soggetto a spese generali, si somma netto
  const imponibile = roundMoney(totaleAT + totalePR + totaleRU + totaleSL + totalePF)
  const pct = Number.isFinite(percentualeSpeseGenerali) ? roundMoney(percentualeSpeseGenerali) : 15
  const importoSpeseGenerali = roundMoney(imponibile * pct / 100)
  return {
    totaleAT, totalePR, totaleRU, totaleSL, totalePF, totaleRA,
    percentualeSpeseGenerali: pct,
    importoSpeseGenerali,
    totaleComplessivo: roundMoney(imponibile + importoSpeseGenerali + totaleRA)
  }
}

export function buildNotaSpeseGroups (
  rowsByCategory: Record<NsCat, NsRow[]> | undefined,
  globalSummary: NsSummary | undefined,
  attrezzatureCatalog?: Map<string, string>
): NsGroup[] {
  const attrezzatureLabels = getRecuperabiliAttrezzatureLabelsById(rowsByCategory || cloneEmptyNsRows(), attrezzatureCatalog || new Map())
  const byCode = new Map<string, Record<NsCat, NsRow[]>>()
  const labelByCode = new Map<string, string>()
  for (const cat of NS_CATS) {
    for (const row of (rowsByCategory?.[cat] || [])) {
      const baseCode = normalizeNsCasistica(row.codice_casistica) || '__NON_COLLEGATA__'
      const riferimentoId = String(row.riferimento_attrezzatura_id || '').trim()
      const isArt30 = baseCode === 'C104_ATTREZZATURE_DANNEGGIATE'
      const code = isArt30 && riferimentoId ? `${baseCode}::${riferimentoId}` : baseCode
      if (isArt30 && riferimentoId) {
        const baseLabel = NS_CASISTICA_META[baseCode]?.label || baseCode
        if (cat === 'RA') {
          // Risarcimento (non recuperabile): l'etichetta usa la descrizione già salvata
          // sulla riga stessa, non la mappa delle recuperabili (che non la contiene).
          labelByCode.set(code, `${baseLabel} \u2014 Attrezzature: ${row.descrizione_snapshot}`)
        } else if (!labelByCode.has(code)) {
          const attrLabel = attrezzatureLabels.get(riferimentoId)
          labelByCode.set(code, attrLabel ? `${baseLabel} \u2014 Rimborso spese riparazione ${attrLabel}` : baseLabel)
        }
      }
      if (!byCode.has(code)) byCode.set(code, cloneEmptyNsRows())
      byCode.get(code)![cat].push({ ...row, categoria_costo: cat })
    }
  }

  const pct = Number(globalSummary?.percentualeSpeseGenerali)
  const groups = Array.from(byCode.entries()).map(([code, rows]) => {
    const meta = NS_CASISTICA_META[code]
    return {
      codiceCasistica: code,
      label: labelByCode.get(code) || meta?.label || (code === '__NON_COLLEGATA__' ? 'Nota spese non collegata a violazione' : 'Nota spese collegata'),
      rows,
      summary: buildNsSummaryForRows(rows, Number.isFinite(pct) ? pct : 15)
    }
  })
  groups.sort((a, b) => {
    const codeA = a.codiceCasistica.split('::')[0]
    const codeB = b.codiceCasistica.split('::')[0]
    // Prima per numero di articolo, sempre — anche per Art.30, che non va mai anteposto
    // ad articoli con numero inferiore solo perché è il risarcimento attrezzature.
    const orderDiff = (NS_CASISTICA_META[codeA]?.order ?? 999) - (NS_CASISTICA_META[codeB]?.order ?? 999)
    if (orderDiff !== 0) return orderDiff
    // Stesso articolo (tipicamente Art.30): la nota condivisa "non recuperabile" va prima
    // di quelle "recuperabile"; tra le recuperabili, ordine alfabetico per nome attrezzatura
    // (già incluso nell'etichetta, col prefisso comune identico per ogni gruppo).
    const aIsNonRecuperabile = (a.rows.RA || []).length > 0
    const bIsNonRecuperabile = (b.rows.RA || []).length > 0
    if (aIsNonRecuperabile !== bIsNonRecuperabile) return aIsNonRecuperabile ? -1 : 1
    return a.label.localeCompare(b.label, 'it')
  })
  return groups
}

export function buildNotaSpesePrintGroups (
  rowsByCategory: Record<NsCat, NsRow[]> | undefined,
  globalSummary: NsSummary | undefined,
  attrezzatureCatalog?: Map<string, string>
): NsGroup[] {
  // Il risarcimento attrezzature (RA) è ormai una categoria reale con righe vere in
  // buildNotaSpeseGroups (ordinata sempre per prima): non serve più costruire qui un
  // gruppo sintetico/vuoto solo per far comparire una pagina PDF.
  return buildNotaSpeseGroups(rowsByCategory, globalSummary, attrezzatureCatalog)
}

function escapeSqlString (v: any): string { return String(v ?? '').replace(/'/g, "''") }
function parentGlobalidWhere (parentGlobalId: string): string {
  const raw = String(parentGlobalId || '').trim()
  const noBraces = raw.replace(/^\{/, '').replace(/\}$/, '')
  const values = Array.from(new Set([raw, noBraces, `{${noBraces}}`].filter(Boolean)))
  return values.map(v => `parent_globalid = '${escapeSqlString(v)}'`).join(' OR ')
}

/**
 * Interroga la tabella di dettaglio nota spese per il record indicato e restituisce
 * le righe raggruppate per categoria di costo, pronte per buildNotaSpeseGroups/buildNotaSpesePrintGroups.
 * Se detailUrl non è configurato, restituisce righe vuote (nessuna nota spese collegata da tabella:
 * l'eventuale Art.30 viene comunque sintetizzato altrove dai campi diretti sul record).
 */
export async function queryNotaSpeseRowsForPractice (
  data: Record<string, any>,
  config?: NotaSpeseConfig
): Promise<{ rowsByCategory: Record<NsCat, NsRow[]>, percentualeSpeseGenerali: number, attrezzatureCatalog: Map<string, string> }> {
  const empty = { rowsByCategory: cloneEmptyNsRows(), percentualeSpeseGenerali: 15, attrezzatureCatalog: new Map<string, string>() }
  const detailUrl = String(config?.detailUrl || '').trim()
  if (!detailUrl || !data) return empty
  const parentGlobalId = String(pickAttrCI(data, ['GlobalID', 'globalid', 'GLOBALID', 'global_id']) || '').trim()
  if (!parentGlobalId) return empty

  try {
    const detailPromise = (async () => {
      const fl = await ensureCachedFeatureLayer(detailUrl)
      if (!fl) return []
      const where = parentGlobalidWhere(parentGlobalId)
      const res = await fl.queryFeatures({ where, outFields: ['*'], returnGeometry: false })
      return (res?.features || []).map((f: any) => f.attributes || {})
    })()

    const parametriUrl = String(config?.parametriUrl || '').trim()
    const percPromise = (async () => {
      if (!parametriUrl) return 15
      try {
        const pCode = config?.parametroCode || 'SPESE_GENERALI_PERC'
        const pfl = await ensureCachedFeatureLayer(parametriUrl)
        if (!pfl) return 15
        const pRes = await pfl.queryFeatures({ where: `codice_parametro = '${escapeSqlString(pCode)}'`, outFields: ['valore_num'], returnGeometry: false })
        const pVal = pRes?.features?.[0]?.attributes?.valore_num
        return (pVal != null) ? (Number(pVal) || 15) : 15
      } catch { return 15 }
    })()
    const catalogPromise = loadAttrezzatureCatalogPdf(String(config?.attrezzatureParametriUrl || '').trim())

    const [rawRows, pct, attrezzatureCatalog] = await Promise.all([detailPromise, percPromise, catalogPromise])
    const rowsByCategory = cloneEmptyNsRows()
    for (const attrs of rawRows as any[]) {
      const cat = String(pickAttrCI(attrs, ['categoria_costo']) || '').trim() as NsCat
      if (!NS_CATS.includes(cat)) continue
      rowsByCategory[cat].push(attrs as NsRow)
    }
    return { rowsByCategory, percentualeSpeseGenerali: Number(pct) || 15, attrezzatureCatalog }
  } catch {
    return empty
  }
}

/**
 * Funzione unica usata da qualunque widget generi il PDF del rapporto tecnico:
 * interroga (se configurato) la tabella dettaglio nota spese, sintetizza l'Art.30
 * dai campi diretti sul record, calcola il totale reale e la dicitura corretta,
 * e aggiorna la mappa placeholder del rapporto di conseguenza.
 * Il widget chiamante non decide più "come": passa solo i dati e le opzioni scelte
 * dall'utente (quali nota spese includere).
 */
export function applyNotaSpeseQueryResultToRapportoMap (
  map: Record<string, string>,
  data: Record<string, any>,
  queryResult: { rowsByCategory: Record<NsCat, NsRow[]>, percentualeSpeseGenerali: number, attrezzatureCatalog?: Map<string, string> },
  docOptions: { includeNotaSpese?: boolean, selectedNotaSpeseKeys?: Record<string, boolean> }
): { allGroups: NsGroup[], selectedGroups: NsGroup[] } {
  const { rowsByCategory, percentualeSpeseGenerali, attrezzatureCatalog } = queryResult
  const globalSummary = buildNsSummaryForRows(rowsByCategory, percentualeSpeseGenerali)
  const nsGroups = buildNotaSpeseGroups(rowsByCategory, globalSummary, attrezzatureCatalog)
  const art30Summary = buildArt30RapportoSummary(data || {})
  const allGroups = buildNotaSpesePrintGroups(rowsByCategory, globalSummary, attrezzatureCatalog)
  const selectedNotaSpeseKeys = docOptions.selectedNotaSpeseKeys || {}
  const includeNotaSpese = docOptions.includeNotaSpese !== false
  const selectedGroups = !includeNotaSpese ? [] : allGroups.filter(group => selectedNotaSpeseKeys[group.codiceCasistica] !== false)

  const hasRealRaRows = nsGroups.some(group => (group.rows.RA || []).length > 0)
  const totaleNoteSpeseGrezzo = roundMoney(nsGroups.reduce((sum, group) => sum + roundMoney(Number(group?.summary?.totaleComplessivo) || 0), 0))
  // Se esistono già righe RA reali (pratiche salvate dopo questo refactor), il totale dei
  // gruppi è già netto: le righe RA includono anche la riga di decurtazione cauzione.
  // Se invece la pratica è legacy (campo flat compilato ma nessuna riga RA sincronizzata
  // ancora, es. non risalvata dopo il refactor), si ricade sul vecchio calcolo: il netto
  // dal riepilogo narrativo si somma a parte, perché i gruppi non contengono nulla da Art.30.
  const totaleNoteSpeseDaGruppi = hasRealRaRows
    ? totaleNoteSpeseGrezzo
    : roundMoney(totaleNoteSpeseGrezzo + (art30Summary.hasData ? art30Summary.netto : 0))
  const totaleNoteSpeseSalvato = roundMoney(parseArt30Number(pickAttrCI(data, ['ns_totale_complessivo'])) ?? 0)
  const totaleNoteSpese = nsGroups.length > 0 ? totaleNoteSpeseDaGruppi : totaleNoteSpeseSalvato
  const hasRimborso = nsGroups.length > 0 || totaleNoteSpese !== 0 || art30Summary.hasData
  const totaleRimborso = totaleNoteSpese

  map.importo_rimborso = hasRimborso ? moneyIt(totaleRimborso) : ''
  map.riepilogo_art30 = art30Summary.text
  map.nota_spese_label = !includeNotaSpese ? '' : selectedGroups.length > 1
    ? '(Vedi note spese allegate)'
    : (selectedGroups.length === 1 ? '(Vedi nota spese allegata)' : '')

  return { allGroups, selectedGroups }
}

export async function applyNotaSpeseToRapportoMap (
  map: Record<string, string>,
  data: Record<string, any>,
  config: NotaSpeseConfig | undefined,
  docOptions: { includeNotaSpese?: boolean, selectedNotaSpeseKeys?: Record<string, boolean> }
): Promise<{ allGroups: NsGroup[], selectedGroups: NsGroup[] }> {
  const queryResult = await queryNotaSpeseRowsForPractice(data, config)
  return applyNotaSpeseQueryResultToRapportoMap(map, data, queryResult, docOptions)
}
