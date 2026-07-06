// =================================================================
// rapporto-nota-spese-summary.ts
// Logica condivisa per il riepilogo "nota spese" del rapporto tecnico:
// sintesi Art.30 (da campi diretti sul record, non da righe di dettaglio),
// raggruppamento delle righe di dettaglio per casistica, calcolo del
// totale reale e della dicitura "(Vedi nota/note spese allegata/e)".
// Estratta da gii-editing-ti/gii-azioni (copie identiche, mai unificate).
// =================================================================

export type NsCat = 'AT' | 'PR' | 'RU' | 'SL' | 'PF'
export type NsSummary = { totaleAT: number, totalePR: number, totaleRU: number, totaleSL: number, totalePF: number, percentualeSpeseGenerali: number, importoSpeseGenerali: number, totaleComplessivo: number }
export type NsRow = { objectid: number, categoria_costo: NsCat, origine_voce_snapshot: string, codice_voce_snapshot: string, descrizione_snapshot: string, unita_misura_snapshot: string, prezzo_unitario_snapshot: number, quantita: number, importo_riga: number, anno_prezzario_snapshot?: number | null, ordine: number, note: string, codice_casistica?: string | null }
export type NsGroup = { codiceCasistica: string, label: string, rows: Record<NsCat, NsRow[]>, summary: NsSummary }

export type NotaSpeseConfig = {
  detailUrl?: string
  parametriUrl?: string
  parametroCode?: string
}

type Art30Row = { codice: string, descrizione: string, quantita: number, valoreUnitario: number | null, importo: number | null }
type Art30CauzioneDetail = { unitaMisura: string, quantita: number, valoreUnitario: number, importo: number }
type Art30Summary = { hasData: boolean, rows: Art30Row[], rimborso: number, cauzione: number, cauzioneQuantita: number | null, cauzioneValoreUnitario: number | null, cauzioneUnitaMisura: string, netto: number, text: string }

const NS_CATS: NsCat[] = ['AT', 'PR', 'RU', 'SL', 'PF']

const NS_CASISTICA_META: Record<string, { order: number, label: string }> = {
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
    const quantitaMatch = text.match(/\s+\u2014\s+Quantit\u00e0:\s*([0-9.,]+)/i)
    if (!quantitaMatch || quantitaMatch.index == null) continue
    const prefix = text.slice(0, quantitaMatch.index).trim()
    const codiceMatch = prefix.match(/^(.*?)\s+\u2014\s+Codice:\s*(.+)$/i)
    const descrizione = String(codiceMatch?.[1] || prefix).trim()
    const codice = String(codiceMatch?.[2] || '').trim()
    const quantita = parseArt30Number(quantitaMatch[1])
    if (!descrizione || quantita == null || quantita <= 0) continue
    const valoreUnitarioMatch = text.match(/Valore unitario:\s*([0-9.,]+)/i)
    const importoMatch = text.match(/Importo:\s*([0-9.,]+)/i)
    out.push({
      codice,
      descrizione,
      quantita,
      valoreUnitario: parseArt30Number(valoreUnitarioMatch?.[1]),
      importo: parseArt30Number(importoMatch?.[1])
    })
  }
  return out
}

function parseArt30CauzioneDetailForPdf (raw: any): Art30CauzioneDetail | null {
  for (const line of String(raw ?? '').split(/\r?\n/)) {
    const text = line.trim()
    if (!/^Decurtazione della cauzione\b/i.test(text)) continue
    const unitaMisuraMatch = text.match(/U\.M\.:\s*([^\u2014|]+?)(?:\s+(?:\u2014|\|)|$)/i)
    const quantitaMatch = text.match(/Quantit\u00e0:\s*([0-9.,]+)/i)
    const valoreUnitarioMatch = text.match(/Valore unitario:\s*([0-9.,]+)/i)
    const importoMatch = text.match(/Importo:\s*-?\s*([0-9.,]+)/i)
    const quantita = parseArt30Number(quantitaMatch?.[1])
    const valoreUnitario = parseArt30Number(valoreUnitarioMatch?.[1])
    const importo = parseArt30Number(importoMatch?.[1])
    if (quantita == null || quantita <= 0 || valoreUnitario == null || valoreUnitario < 0 || importo == null || importo < 0) return null
    return {
      unitaMisura: String(unitaMisuraMatch?.[1] || 'n.').trim() || 'n.',
      quantita,
      valoreUnitario,
      importo
    }
  }
  return null
}

function qtyArt30It (value: number): string {
  return Number(value).toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 4 })
}

export function buildArt30RapportoSummary (data: Record<string, any>): Art30Summary {
  const detailRaw = pickAttrCI(data, ['attrezzature_rimborso_dettaglio'])
  const rows = parseArt30DetailForPdf(detailRaw)
  const cauzioneDetail = parseArt30CauzioneDetailForPdf(detailRaw)
  const rimborsoSalvato = parseArt30Number(pickAttrCI(data, ['attrezzature_rimborso_importo']))
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
  const hasData = rows.length > 0 || rimborsoSalvato != null || cauzioneSalvata != null || nettoSalvato != null || cauzioneAttiva
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
    cauzioneQuantita: cauzioneDetail?.quantita ?? null,
    cauzioneValoreUnitario: cauzioneDetail?.valoreUnitario ?? null,
    cauzioneUnitaMisura: cauzioneDetail?.unitaMisura || 'n.',
    netto,
    text: `Art. 30 - ${parts.join('; ')}.`
  }
}

function normalizeNsCasistica (v: any): string { return String(v ?? '').trim() }
function cloneEmptyNsRows (): Record<NsCat, NsRow[]> { return { AT: [], PR: [], RU: [], SL: [], PF: [] } }

function buildNsSummaryForRows (rows: Record<NsCat, NsRow[]>, percentualeSpeseGenerali: number): NsSummary {
  const sumCat = (cat: NsCat) => roundMoney((rows[cat] || []).reduce((sum, r) => sum + roundMoney(Number(r.importo_riga) || 0), 0))
  const totaleAT = sumCat('AT')
  const totalePR = sumCat('PR')
  const totaleRU = sumCat('RU')
  const totaleSL = sumCat('SL')
  const totalePF = sumCat('PF')
  const imponibile = roundMoney(totaleAT + totalePR + totaleRU + totaleSL + totalePF)
  const pct = Number.isFinite(percentualeSpeseGenerali) ? roundMoney(percentualeSpeseGenerali) : 15
  const importoSpeseGenerali = roundMoney(imponibile * pct / 100)
  return {
    totaleAT, totalePR, totaleRU, totaleSL, totalePF,
    percentualeSpeseGenerali: pct,
    importoSpeseGenerali,
    totaleComplessivo: roundMoney(imponibile + importoSpeseGenerali)
  }
}

export function buildNotaSpeseGroups (
  rowsByCategory: Record<NsCat, NsRow[]> | undefined,
  globalSummary: NsSummary | undefined
): NsGroup[] {
  const byCode = new Map<string, Record<NsCat, NsRow[]>>()
  for (const cat of NS_CATS) {
    for (const row of (rowsByCategory?.[cat] || [])) {
      const code = normalizeNsCasistica(row.codice_casistica) || '__NON_COLLEGATA__'
      if (!byCode.has(code)) byCode.set(code, cloneEmptyNsRows())
      byCode.get(code)![cat].push({ ...row, categoria_costo: cat })
    }
  }

  const pct = Number(globalSummary?.percentualeSpeseGenerali)
  const groups = Array.from(byCode.entries()).map(([code, rows]) => {
    const meta = NS_CASISTICA_META[code]
    return {
      codiceCasistica: code,
      label: meta?.label || (code === '__NON_COLLEGATA__' ? 'Nota spese non collegata a violazione' : 'Nota spese collegata'),
      rows,
      summary: buildNsSummaryForRows(rows, Number.isFinite(pct) ? pct : 15)
    }
  })
  groups.sort((a, b) => (NS_CASISTICA_META[a.codiceCasistica]?.order ?? 999) - (NS_CASISTICA_META[b.codiceCasistica]?.order ?? 999))
  return groups
}

export function buildNotaSpesePrintGroups (
  rowsByCategory: Record<NsCat, NsRow[]> | undefined,
  globalSummary: NsSummary | undefined,
  dataSnapshot: Record<string, any> | undefined
): NsGroup[] {
  const groups = buildNotaSpeseGroups(rowsByCategory, globalSummary)
  const art30Summary = buildArt30RapportoSummary(dataSnapshot || {})
  const out = groups.slice()
  if (art30Summary.hasData && !out.some(group => group.codiceCasistica === 'C104_ATTREZZATURE_DANNEGGIATE')) {
    out.push({
      codiceCasistica: 'C104_ATTREZZATURE_DANNEGGIATE',
      label: NS_CASISTICA_META.C104_ATTREZZATURE_DANNEGGIATE.label,
      rows: cloneEmptyNsRows(),
      summary: buildNsSummaryForRows(cloneEmptyNsRows(), Number(globalSummary?.percentualeSpeseGenerali) || 15)
    })
    out.sort((a, b) => (NS_CASISTICA_META[a.codiceCasistica]?.order ?? 999) - (NS_CASISTICA_META[b.codiceCasistica]?.order ?? 999))
  }
  return out
}

function escapeSqlString (v: any): string { return String(v ?? '').replace(/'/g, "''") }
function parentGlobalidWhere (parentGlobalId: string): string {
  const raw = String(parentGlobalId || '').trim()
  const noBraces = raw.replace(/^\{/, '').replace(/\}$/, '')
  const values = Array.from(new Set([raw, noBraces, `{${noBraces}}`].filter(Boolean)))
  return values.map(v => `parent_globalid = '${escapeSqlString(v)}'`).join(' OR ')
}

function loadEsriModule<T = any> (path: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = (window as any).require
    if (!req) { reject(new Error('AMD require non disponibile')); return }
    req([path], (mod: T) => resolve(mod), (err: any) => reject(err))
  })
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
): Promise<{ rowsByCategory: Record<NsCat, NsRow[]>, percentualeSpeseGenerali: number }> {
  const empty = { rowsByCategory: cloneEmptyNsRows(), percentualeSpeseGenerali: 15 }
  const detailUrl = String(config?.detailUrl || '').trim()
  if (!detailUrl || !data) return empty
  const parentGlobalId = String(pickAttrCI(data, ['GlobalID', 'globalid', 'GLOBALID', 'global_id']) || '').trim()
  if (!parentGlobalId) return empty

  try {
    const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
    const detailPromise = (async () => {
      const fl = new FeatureLayer({ url: detailUrl })
      if (typeof fl.load === 'function') await fl.load()
      const where = parentGlobalidWhere(parentGlobalId)
      const res = await fl.queryFeatures({ where, outFields: ['*'], returnGeometry: false })
      return (res?.features || []).map((f: any) => f.attributes || {})
    })()

    const parametriUrl = String(config?.parametriUrl || '').trim()
    const percPromise = (async () => {
      if (!parametriUrl) return 15
      try {
        const pCode = config?.parametroCode || 'SPESE_GENERALI_PERC'
        const pfl = new FeatureLayer({ url: parametriUrl })
        if (typeof pfl.load === 'function') await pfl.load()
        const pRes = await pfl.queryFeatures({ where: `codice_parametro = '${escapeSqlString(pCode)}'`, outFields: ['valore_num'], returnGeometry: false })
        const pVal = pRes?.features?.[0]?.attributes?.valore_num
        return (pVal != null) ? (Number(pVal) || 15) : 15
      } catch { return 15 }
    })()

    const [rawRows, pct] = await Promise.all([detailPromise, percPromise])
    const rowsByCategory = cloneEmptyNsRows()
    for (const attrs of rawRows as any[]) {
      const cat = String(pickAttrCI(attrs, ['categoria_costo']) || '').trim() as NsCat
      if (!NS_CATS.includes(cat)) continue
      rowsByCategory[cat].push(attrs as NsRow)
    }
    return { rowsByCategory, percentualeSpeseGenerali: Number(pct) || 15 }
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
export async function applyNotaSpeseToRapportoMap (
  map: Record<string, string>,
  data: Record<string, any>,
  config: NotaSpeseConfig | undefined,
  docOptions: { includeNotaSpese?: boolean, selectedNotaSpeseKeys?: Record<string, boolean> }
): Promise<{ allGroups: NsGroup[], selectedGroups: NsGroup[] }> {
  const { rowsByCategory, percentualeSpeseGenerali } = await queryNotaSpeseRowsForPractice(data, config)
  const globalSummary = buildNsSummaryForRows(rowsByCategory, percentualeSpeseGenerali)
  const nsGroups = buildNotaSpeseGroups(rowsByCategory, globalSummary)
  const art30Summary = buildArt30RapportoSummary(data || {})
  const allGroups = buildNotaSpesePrintGroups(rowsByCategory, globalSummary, data)
  const selectedNotaSpeseKeys = docOptions.selectedNotaSpeseKeys || {}
  const selectedGroups = allGroups.filter(group => selectedNotaSpeseKeys[group.codiceCasistica] !== false)

  const totaleNoteSpeseDaGruppi = roundMoney(nsGroups.reduce((sum, group) => sum + roundMoney(Number(group?.summary?.totaleComplessivo) || 0), 0))
  const totaleNoteSpeseSalvato = roundMoney(parseArt30Number(pickAttrCI(data, ['ns_totale_complessivo'])) ?? 0)
  const totaleNoteSpese = nsGroups.length > 0 ? totaleNoteSpeseDaGruppi : totaleNoteSpeseSalvato
  const hasRimborso = nsGroups.length > 0 || totaleNoteSpese !== 0 || art30Summary.hasData
  const totaleRimborso = roundMoney(totaleNoteSpese + (art30Summary.hasData ? art30Summary.netto : 0))
  const includeNotaSpese = docOptions.includeNotaSpese !== false

  map.importo_rimborso = hasRimborso ? moneyIt(totaleRimborso) : ''
  map.riepilogo_art30 = art30Summary.text
  map.nota_spese_label = !includeNotaSpese ? '' : selectedGroups.length > 1
    ? '(Vedi note spese allegate)'
    : (selectedGroups.length === 1 ? '(Vedi nota spese allegata)' : '')

  return { allGroups, selectedGroups }
}
