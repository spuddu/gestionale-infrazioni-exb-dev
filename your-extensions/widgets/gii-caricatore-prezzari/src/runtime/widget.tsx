/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx, type AllWidgetProps } from 'jimu-core'
import type { IMConfig } from '../config'

const { Fragment } = React

function loadEsriModule<T = any>(path: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = (window as any).require
    if (!req) { reject(new Error('AMD require non disponibile')); return }
    try { req([path], (mod: T) => resolve(mod), (err: any) => reject(err)) } catch (e) { reject(e) }
  })
}

function normalizeUrl(raw: any): string {
  const s = String(raw || '').trim()
  if (!s) return ''
  try {
    const u = new URL(s)
    u.search = ''
    u.hash = ''
    let out = u.toString().replace(/\/$/, '')
    if (/\/(FeatureServer|MapServer)$/i.test(out)) out += '/0'
    return out
  } catch { return '' }
}

function normalizeGiiAccessCode(v: any): string {
  return String(v ?? '').trim().toUpperCase().replace(/-/g, '_')
}

function getGiiOperationalProfileCode(): string {
  const u: any = (window as any).__giiUserRole || {}

  const direct = normalizeGiiAccessCode(u?.profiloCod ?? u?.profilo_cod ?? u?.profileCode ?? u?.profile_code)
  if (direct) return direct

  const role = normalizeGiiAccessCode(u?.ruoloCod ?? u?.ruolo_cod ?? u?.roleCod ?? u?.roleCode ?? u?.role_code)
  const area = normalizeGiiAccessCode(u?.areaCod ?? u?.area_cod ?? u?.areaCode ?? u?.area_code)
  if (role === 'TI' && area === 'AMM') return 'TI_AMM'
  if (role === 'RI' && area === 'AMM') return 'RI_AMM'
  if (role) return role

  const roleNum = Number(u?.ruolo)
  const areaNum = Number(u?.area)
  if (roleNum === 7) return 'ADMIN'
  if (roleNum === 4 && areaNum === 1) return 'RI_AMM'
  if (roleNum === 2 && areaNum === 1) return 'TI_AMM'
  if (roleNum === 1) return 'TR'
  if (roleNum === 2) return 'TI'
  if (roleNum === 3) return 'RZ'
  if (roleNum === 4) return 'RI'
  if (roleNum === 5) return 'DT'
  if (roleNum === 6) return 'DA'

  const label = normalizeGiiAccessCode([
    u?.profiloLabel,
    u?.ruoloLabel,
    u?.roleLabel,
    u?.ruolo_nome,
    u?.ruolo
  ].filter(Boolean).join(' '))
  if (!label) return ''
  if (/ADMIN|AMMINISTRATORE/.test(label)) return 'ADMIN'
  if (/RI_AMM|RESPONSABILE.*ISTRUTTORIA.*AMMINISTRATIV/.test(label)) return 'RI_AMM'
  if (/TI_AMM|TECNICO.*ISTRUTTOR.*AMMINISTRATIV/.test(label)) return 'TI_AMM'
  if (/^RI$|(^|[^A-Z])RI([^A-Z]|$)|RESPONSABILE.*ISTRUTTORIA/.test(label)) return 'RI'
  if (/^TI$|(^|[^A-Z])TI([^A-Z]|$)|TECNICO.*ISTRUTTOR/.test(label)) return 'TI'
  if (/^TR$|(^|[^A-Z])TR([^A-Z]|$)|TECNICO.*RILEVATORE/.test(label)) return 'TR'
  if (/^RZ$|(^|[^A-Z])RZ([^A-Z]|$)|RESPONSABILE.*ZONA/.test(label)) return 'RZ'
  if (/^DT$|(^|[^A-Z])DT([^A-Z]|$)|DIRETTORE.*TECNICO/.test(label)) return 'DT'
  if (/^DA$|(^|[^A-Z])DA([^A-Z]|$)|DIRETTORE.*AMMINISTRATIVO/.test(label)) return 'DA'
  return ''
}

function isRiOrAdminUser(): boolean {
  const profiloCod = getGiiOperationalProfileCode()
  return profiloCod === 'RI' || profiloCod === 'ADMIN'
}

const LAYER_CACHE: Record<string, any> = {}
async function getLayer(urlRaw: any): Promise<any> {
  const url = normalizeUrl(urlRaw)
  if (!url) throw new Error('URL tabella non configurato.')
  if (LAYER_CACHE[url]) return LAYER_CACHE[url]
  const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
  const fl = new FeatureLayer({ url })
  try { if (typeof fl.load === 'function') await fl.load() } catch {}
  LAYER_CACHE[url] = fl
  return fl
}

function num(v: any): number { const n = Number(v); return Number.isFinite(n) ? n : 0 }
function round(v: number, d = 2): number { const f = Math.pow(10, d); return Math.round((Number(v) + Number.EPSILON) * f) / f }
function esc(v: string): string { return String(v || '').replace(/'/g, "''") }
function trimText(v: any): string { return String(v ?? '').trim() }
function toDateLabel(v: any): string {
  if (v == null || v === '') return ''
  try {
    const d = new Date(v)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleString('it-IT')
  } catch { return '' }
}
function boolLike(v: any): boolean { return String(v ?? '').trim() === '1' || num(v) === 1 }
function importTypeLabel(v: any): string {
  const s = trimText(v)
  if (s === '1') return 'Regionale'
  if (s === '2') return 'Interno'
  return s || '—'
}

function decodeHtmlEntities(v: any): string {
  const s = String(v ?? '')
  if (!s || s.indexOf('&') < 0) return s
  try {
    const el = document.createElement('textarea')
    el.innerHTML = s
    return String(el.value || '')
  } catch {
    return s
      .replace(/&quot;/gi, '"')
      .replace(/&#34;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/gi, "'")
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&amp;/gi, '&')
  }
}
function sanitizeText(v: any): string {
  return decodeHtmlEntities(v)
    .replace(/\u0000/g, '')
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .replace(/\r\n?/g, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[<>]/g, ' ')
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, ' ')
    .trim()
}
function getFieldMap(fl: any): Record<string, any> {
  const out: Record<string, any> = {}
  ;((fl?.fields || []) as any[]).forEach((f: any) => {
    const name = String(f?.name || '')
    if (name) out[name] = f
  })
  return out
}
function fieldTypeName(f: any): string { return String(f?.type || '').toLowerCase() }
function truncateForField(v: string, f: any): string {
  const len = Number(f?.length || 0)
  return len > 0 ? String(v).slice(0, len) : String(v)
}
function prepareAttrsForLayer(fl: any, attrs: any): any {
  const fieldMap = getFieldMap(fl)
  const out: any = {}
  Object.keys(attrs || {}).forEach((k) => {
    const f = fieldMap[k]
    if (!f) return
    const raw = attrs[k]
    if (raw == null) { out[k] = raw; return }
    const t = fieldTypeName(f)
    if (t.includes('string')) {
      out[k] = truncateForField(sanitizeText(String(raw)), f)
      return
    }
    if ((t.includes('integer') || t.includes('double') || t.includes('single') || t.includes('small')) && typeof raw === 'string') {
      const n = Number(String(raw).replace(',', '.'))
      out[k] = Number.isFinite(n) ? n : raw
      return
    }
    if (t.includes('date') && raw instanceof Date) {
      out[k] = raw.getTime()
      return
    }
    out[k] = raw
  })
  return out
}
function formatApplyEditsError(err: any): string {
  if (!err) return 'Errore sconosciuto.'
  const msg = String(err?.message || err?.description || err || '').trim()
  const details = Array.isArray(err?.details) ? err.details.map((x: any) => String(x || '').trim()).filter(Boolean) : []
  return [msg, ...details].filter(Boolean).join(' | ') || 'Errore sconosciuto.'
}

async function queryRows(urlRaw: any, where = '1=1', orderBy = 'OBJECTID DESC'): Promise<any[]> {
  const fl = await getLayer(urlRaw)
  const q = fl.createQuery ? fl.createQuery() : {}
  q.where = where
  q.outFields = ['*']
  q.returnGeometry = false
  if (orderBy) q.orderByFields = [orderBy]
  const res = await fl.queryFeatures(q)
  return (res?.features || []).map((f: any) => ({ ...f.attributes, objectid: Number(f.attributes?.OBJECTID || f.attributes?.objectid || 0) }))
}
async function queryAllObjectIds(urlRaw: any, where = '1=1'): Promise<number[]> {
  const fl = await getLayer(urlRaw)
  const q = fl.createQuery ? fl.createQuery() : {}
  q.where = where
  q.returnGeometry = false
  if (typeof fl.queryObjectIds === 'function') {
    const ids = await fl.queryObjectIds(q)
    return Array.isArray(ids) ? ids.map((x: any) => Number(x)).filter((x: number) => Number.isFinite(x) && x > 0) : []
  }
  const oidField = String(fl?.objectIdField || 'OBJECTID')
  q.outFields = [oidField]
  const res = await fl.queryFeatures(q)
  return (res?.features || []).map((f: any) => Number(f?.attributes?.[oidField] || 0)).filter((x: number) => Number.isFinite(x) && x > 0)
}
async function addFeatureAndReturnObjectId(urlRaw: any, attrs: any): Promise<number> {
  const fl = await getLayer(urlRaw)
  const prepared = prepareAttrsForLayer(fl, attrs)
  const res = await fl.applyEdits({ addFeatures: [{ attributes: prepared }] } as any)
  const row = res?.addFeatureResults?.[0]
  if (row?.error) throw new Error(formatApplyEditsError(row.error) || 'Salvataggio non riuscito.')
  const oid = Number(row?.objectId || row?.objectID || 0)
  if (!oid) throw new Error('OBJECTID del record inserito non restituito dal servizio.')
  return oid
}
async function deleteObjectIds(urlRaw: any, objectIds: number[]): Promise<void> {
  if (!objectIds.length) return
  const fl = await getLayer(urlRaw)
  const oidField = String(fl?.objectIdField || 'OBJECTID')
  const Graphic = await loadEsriModule<any>('esri/Graphic')
  for (let i = 0; i < objectIds.length; i += 200) {
    const chunk = objectIds.slice(i, i + 200)
    const dels = chunk.map((id) => new Graphic({ attributes: { [oidField]: id } }))
    const res = await fl.applyEdits({ deleteFeatures: dels } as any)
    const bad = (res?.deleteFeatureResults || []).find((r: any) => r?.error)
    if (bad?.error) throw new Error(formatApplyEditsError(bad.error) || 'Eliminazione non riuscita.')
  }
}
async function deleteWhere(urlRaw: any, where: string): Promise<number> {
  const ids = await queryAllObjectIds(urlRaw, where)
  await deleteObjectIds(urlRaw, ids)
  return ids.length
}
async function updateRows(urlRaw: any, attrsList: any[]): Promise<void> {
  if (!attrsList.length) return
  const fl = await getLayer(urlRaw)
  const prepared = attrsList.map((attrs) => ({ attributes: prepareAttrsForLayer(fl, attrs) }))
  for (let i = 0; i < prepared.length; i += 200) {
    const batch = prepared.slice(i, i + 200)
    const res = await fl.applyEdits({ updateFeatures: batch } as any)
    const bad = (res?.updateFeatureResults || []).find((x: any) => x?.error)
    if (bad?.error) throw new Error(formatApplyEditsError(bad.error) || 'Aggiornamento non riuscito.')
  }
}
async function addOneByOne(fl: any, attrsList: any[], startIndex: number, total: number, label: string, onProgress?: (done: number, total: number) => void): Promise<void> {
  const createdIds: number[] = []
  for (let i = 0; i < attrsList.length; i++) {
    const attrs = prepareAttrsForLayer(fl, attrsList[i])
    const res = await fl.applyEdits({ addFeatures: [{ attributes: attrs }] } as any)
    const row = res?.addFeatureResults?.[0]
    if (row?.error) {
      if (createdIds.length) {
        try { await deleteObjectIds(fl.url, createdIds) } catch {}
      }
      throw new Error(`${label} riga ${startIndex + i + 1}: ${formatApplyEditsError(row.error)}`)
    }
    const oid = Number(row?.objectId || row?.objectID || 0)
    if (oid) createdIds.push(oid)
    if (onProgress) onProgress(startIndex + i + 1, total)
  }
}
async function addInChunks(urlRaw: string, attrsList: any[], label: string, onProgress?: (done: number, total: number) => void, preferredChunkSize = 250): Promise<void> {
  if (!attrsList.length) return
  const fl = await getLayer(urlRaw)
  const total = attrsList.length
  const tryRange = async (start: number, endExclusive: number, chunkSize: number): Promise<void> => {
    for (let i = start; i < endExclusive; i += chunkSize) {
      const rawSlice = attrsList.slice(i, Math.min(i + chunkSize, endExclusive))
      const slice = rawSlice.map((attrs) => ({ attributes: prepareAttrsForLayer(fl, attrs) }))
      try {
        const res = await fl.applyEdits({ addFeatures: slice } as any)
        const bad = (res?.addFeatureResults || []).find((x: any) => x?.error)
        if (bad?.error) {
          if (rawSlice.length === 1) {
            await addOneByOne(fl, rawSlice, i, total, label, onProgress)
          } else {
            const smaller = Math.max(1, Math.floor(chunkSize / 2))
            await tryRange(i, i + rawSlice.length, smaller)
          }
        } else if (onProgress) {
          onProgress(Math.min(i + rawSlice.length, total), total)
        }
      } catch (e: any) {
        const msg = String(e?.message || e || '')
        if (/failed to fetch/i.test(msg) || /network/i.test(msg)) {
          if (rawSlice.length === 1) throw new Error(`${label} riga ${i + 1}: ${msg || 'Failed to fetch'}`)
          const smaller = Math.max(1, Math.floor(chunkSize / 2))
          await tryRange(i, i + rawSlice.length, smaller)
        } else throw e
      }
    }
  }
  await tryRange(0, total, Math.max(1, preferredChunkSize))
}

function inferCategory(famiglia: string, codice: string, descr: string): string {
  const tok = String(famiglia || codice || '').trim().toUpperCase()
  const d = String(descr || '').trim().toUpperCase()
  if (tok.startsWith('RU')) return 'MANODOPERA'
  if (tok.startsWith('AT')) return /TRASPORT/.test(d) ? 'TRASPORTO' : 'NOLO'
  if (tok.startsWith('PR') || tok.startsWith('SL')) return 'MATERIALI'
  return 'MATERIALI'
}
function normalizeCategory(v: any): string {
  const s = String(v || '').trim().toUpperCase()
  if (s === 'NOLI') return 'NOLO'
  if (s === 'TRASPORTI') return 'TRASPORTO'
  if (s === 'MATERIALE') return 'MATERIALI'
  return s
}
function decodeBytes(data: Uint8Array): string {
  try { return new TextDecoder('windows-1252').decode(data) } catch { return new TextDecoder('utf-8').decode(data) }
}
async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const W: any = window as any
  if (!W.DecompressionStream) throw new Error('Il browser non supporta DecompressionStream per importare lo zip.')
  const ds = new W.DecompressionStream('deflate-raw')
  const ab = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer
  const stream = new Blob([ab]).stream().pipeThrough(ds)
  const buf = await new Response(stream).arrayBuffer()
  return new Uint8Array(buf)
}
async function unzipEntries(file: File): Promise<Array<{ name: string; data: Uint8Array }>> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const out: Array<{ name: string; data: Uint8Array }> = []
  const readU16 = (o: number) => bytes[o] | (bytes[o + 1] << 8)
  const readU32 = (o: number) => (bytes[o]) | (bytes[o + 1] << 8) | (bytes[o + 2] << 16) | (bytes[o + 3] << 24)
  let off = 0
  while (off + 30 <= bytes.length) {
    const sig = readU32(off) >>> 0
    if (sig !== 0x04034b50) break
    const flags = readU16(off + 6)
    const method = readU16(off + 8)
    if ((flags & 0x08) !== 0) throw new Error('Zip con data descriptor non supportato.')
    const compSize = readU32(off + 18) >>> 0
    const nameLen = readU16(off + 26)
    const extraLen = readU16(off + 28)
    const name = decodeBytes(bytes.slice(off + 30, off + 30 + nameLen))
    const dataStart = off + 30 + nameLen + extraLen
    const dataEnd = dataStart + compSize
    const comp = bytes.slice(dataStart, dataEnd)
    let data: Uint8Array
    if (method === 0) data = comp
    else if (method === 8) data = await inflateRaw(comp)
    else throw new Error(`Metodo ZIP non supportato: ${method}`)
    out.push({ name, data })
    off = dataEnd
  }
  return out
}
function parsePipeCsv(text: string): string[][] {
  return text.split(/\r?\n/).filter(Boolean).slice(1).map((line) => line.split('|').map((x) => x.trim()))
}
function zipBaseName(path: string): string {
  const norm = String(path || '').replace(/\\/g, '/')
  const parts = norm.split('/')
  return String(parts[parts.length - 1] || '').trim()
}
function progressivoFromCode(code: string): string {
  const m = String(code || '').trim().match(/\.([^.]+)$/)
  return String(m?.[1] || '').trim()
}

type ImportRow = {
  objectid: number
  tipo_prezzario?: any
  anno_prezzario?: any
  descrizione_import?: string
  file_origine?: string
  file_articoli?: string
  file_analisi?: string
  data_import?: any
  utente_import?: string
  articoli_importati?: any
  analisi_importate?: any
  stato_import?: any
  attivo?: any
  note?: string
}
type ParsedArticolo = {
  codice_articolo: string
  descrizione: string
  um: string
  prezzo: number
  famiglia: string
  capitolo: string
  sottocapitolo: string
  progressivo_articolo: string
  note: string
  attivo: string
}
type ParsedAnalisi = {
  codice_articolo_parent: string
  ordine_riga: number
  categoria: string
  codice_elemento: string
  descrizione_elemento: string
  um: string
  quantita: number
  prezzo_unitario: number
  importo: number
  note: string
}

async function parseOfficialRegionalZip(file: File): Promise<{ articoli: ParsedArticolo[]; analisi: ParsedAnalisi[]; artFile: string; anaFile: string }> {
  const entries = await unzipEntries(file)
  const artEntry = entries.find((e) => /anagrafica_articoli_prezzario\.csv$/i.test(zipBaseName(e.name))) || entries.find((e) => /anagrafica/i.test(zipBaseName(e.name)))
  const anaEntry = entries.find((e) => /analisi_prezzario\.csv$/i.test(zipBaseName(e.name))) || entries.find((e) => /analisi/i.test(zipBaseName(e.name)))
  if (!artEntry || !anaEntry) throw new Error('Nel pacchetto non trovo i due CSV attesi (anagrafica articoli e analisi prezzario).')
  if (zipBaseName(artEntry.name) === zipBaseName(anaEntry.name)) throw new Error('Il CSV analisi non è stato individuato correttamente nello ZIP.')

  const artRows = parsePipeCsv(decodeBytes(artEntry.data))
  const anaRows = parsePipeCsv(decodeBytes(anaEntry.data))

  const articoli: ParsedArticolo[] = artRows.map((r) => {
    const codice = trimText(r[0])
    const famiglia = trimText(r[1]).toUpperCase()
    const capitolo = trimText(r[2])
    const sottocapitolo = trimText(r[3])
    const descrizione = trimText(r[4])
    return {
      codice_articolo: codice,
      descrizione,
      um: trimText(r[5]),
      prezzo: round(num(String(r[10] || '').replace(/\./g, '').replace(',', '.')), 4),
      famiglia,
      capitolo,
      sottocapitolo,
      progressivo_articolo: progressivoFromCode(codice),
      note: '',
      attivo: '1'
    }
  }).filter((r) => !!r.codice_articolo && !!r.descrizione)

  const artMap = new Map<string, ParsedArticolo>()
  articoli.forEach((a) => artMap.set(a.codice_articolo, a))
  const orderMap = new Map<string, number>()

  const analisi: ParsedAnalisi[] = anaRows.map((r) => {
    const codiceParent = trimText(r[0])
    const codiceElemento = trimText(r[1])
    const art = artMap.get(codiceElemento)
    const nextOrder = (orderMap.get(codiceParent) || 0) + 1
    orderMap.set(codiceParent, nextOrder)
    return {
      codice_articolo_parent: codiceParent,
      ordine_riga: nextOrder,
      categoria: normalizeCategory(art?.famiglia ? inferCategory(art.famiglia, codiceElemento, art.descrizione) : ''),
      codice_elemento: codiceElemento,
      descrizione_elemento: trimText(art?.descrizione || ''),
      um: trimText(art?.um || ''),
      quantita: num(String(r[2] || '').replace(/\./g, '').replace(',', '.')),
      prezzo_unitario: round(num(String(r[3] || '').replace(/\./g, '').replace(',', '.')), 4),
      importo: round(num(String(r[4] || '').replace(/\./g, '').replace(',', '.')), 4),
      note: ''
    }
  }).filter((r) => !!r.codice_articolo_parent && !!r.codice_elemento)

  return { articoli, analisi, artFile: zipBaseName(artEntry.name), anaFile: zipBaseName(anaEntry.name) }
}

function urlsByType(cfg: any, typeCode: string): { articoliUrl: string; analisiUrl: string } {
  if (String(typeCode) === '2') {
    return { articoliUrl: String(cfg.internoArticoliUrl || '').trim(), analisiUrl: String(cfg.internoAnalisiUrl || '').trim() }
  }
  return { articoliUrl: String(cfg.regionaleArticoliUrl || '').trim(), analisiUrl: String(cfg.regionaleAnalisiUrl || '').trim() }
}

async function cleanupImportRow(importUrl: string, row: ImportRow, cfg: any): Promise<{ articoli: number; analisi: number; meta: number }> {
  const typeCode = trimText(row.tipo_prezzario)
  const { articoliUrl, analisiUrl } = urlsByType(cfg, typeCode)
  if (!articoliUrl || !analisiUrl) throw new Error(`URL tabelle non configurati per il tipo ${importTypeLabel(typeCode)}.`)
  const whereChildren = `objectid_import = ${Number(row.objectid || 0)}`
  const deletedArticoli = await deleteWhere(articoliUrl, whereChildren)
  const deletedAnalisi = await deleteWhere(analisiUrl, whereChildren)
  await deleteObjectIds(importUrl, [Number(row.objectid || 0)])
  return { articoli: deletedArticoli, analisi: deletedAnalisi, meta: 1 }
}

async function setOnlyOneActiveForType(importUrl: string, allRows: ImportRow[], typeCode: string, targetObjectId: number): Promise<void> {
  const rows = allRows.filter((r) => trimText(r.tipo_prezzario) === trimText(typeCode))
  if (!rows.length) return
  const updates = rows.map((r) => ({ objectid: r.objectid, attivo: String(r.objectid) === String(targetObjectId) ? '1' : '0' }))
  const fl = await getLayer(importUrl)
  const oidField = String(fl?.objectIdField || 'OBJECTID')
  await updateRows(importUrl, updates.map((r) => ({ [oidField]: r.objectid, attivo: r.attivo })))
}

const styles = `
.gpw { font-family: Arial, sans-serif; font-size: 13px; padding: 12px; height: 100%; display:flex; flex-direction:column; gap:10px; box-sizing:border-box; }
.gpw-title { font-size:15px; font-weight:700; color:#1F4E79; border-bottom:2px solid #1F4E79; padding-bottom:6px; }
.gpw-card { background:var(--gpw-detail-card-background, #f5f9ff); border:1px solid #c5d9f1; border-radius:6px; padding:12px; }
.gpw-grid { display:grid; grid-template-columns:minmax(280px,1.35fr) 170px 120px minmax(260px,1.2fr); gap:10px; }
.gpw-field { display:flex; flex-direction:column; gap:3px; }
.gpw-label { font-size:var(--gpw-toolbar-label-font-size, 11px); font-weight:700; color:var(--gpw-toolbar-label-color, #1F4E79); }
.gpw-input, .gpw-select { width:100%; height:38px; min-height:38px; padding:7px 10px; border:1px solid #aac4e0; border-radius:4px; font-size:13px; box-sizing:border-box; background:#fff; }
.gpw-input:focus, .gpw-select:focus { outline:none; border-color:#1F4E79; box-shadow:0 0 0 3px rgba(31,78,121,0.12); }
.gpw-file-row { display:grid; grid-template-columns:auto 1fr; gap:8px; align-items:center; }
.gpw-file-display { position:relative; display:flex; align-items:center; height:38px; min-height:38px; padding:0 34px 0 10px; border:1px solid #aac4e0; border-radius:4px; background:#fff; color:#111827; box-sizing:border-box; overflow:hidden; }
.gpw-file-display-empty { color:#6b7280; }
.gpw-file-name { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.gpw-file-clear { position:absolute; right:8px; top:50%; transform:translateY(-50%); width:22px; height:22px; border:none; border-radius:999px; background:transparent; color:#6b7280; cursor:pointer; font-size:15px; line-height:22px; padding:0; }
.gpw-file-clear:hover { background:#eef4fb; color:#1F4E79; }
.gpw-file-picker-btn { height:38px; min-height:38px; padding:0 14px; border:1px solid #1F4E79; border-radius:4px; background:#fff; color:#1F4E79; font-size:13px; font-weight:700; cursor:pointer; white-space:nowrap; }
.gpw-file-picker-btn:hover { background:#eef4fb; }
.gpw-file-native { display:none; }
.gpw-btns { display:flex; gap:8px; flex-wrap:wrap; }
.gpw-btns-inline { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
.gpw-btn { min-height:38px; padding:7px 16px; border:none; border-radius:4px; font-size:13px; cursor:pointer; font-weight:700; }
.gpw-primary { background:#1F4E79; color:#fff; }
.gpw-secondary { background:#375623; color:#fff; }
.gpw-warning { background:#b45f06; color:#fff; }
.gpw-danger { background:#c00; color:#fff; }
.gpw-table-wrap { flex:1; min-height:0; overflow:auto; border:1px solid #c5d9f1; border-radius:6px; background:var(--gpw-records-card-background, #f5f9ff); }
.gpw-table { width:100%; border-collapse:collapse; font-size:12px; }
.gpw-table th { background:#1F4E79; color:#fff; padding:7px 8px; text-align:left; position:sticky; top:0; z-index:1; white-space:nowrap; }
.gpw-table td { padding:6px 8px; border-bottom:1px solid #e0eaf4; vertical-align:middle; }
.gpw-table tbody tr:nth-child(odd) td { background:var(--gpw-records-card-background, #f5f9ff); }
.gpw-table tbody tr:nth-child(even) td { background:linear-gradient(rgba(255,255,255,0.55), rgba(255,255,255,0.55)), var(--gpw-records-card-background, #f5f9ff); }
.gpw-msg { padding:7px 12px; border-radius:4px; font-size:12px; font-weight:700; }
.gpw-msg-ok { background:#e2efda; color:#375623; border:1px solid #b8d4b0; }
.gpw-msg-err { background:#fce4e4; color:#c00; border:1px solid #f5b8b8; }
`

export default function Widget(props: AllWidgetProps<IMConfig>) {
  const cfg: any = props.config || {}
  const importUrl = String(cfg.importUrl || '').trim()
  const title = String(cfg.title || 'GII - Caricatore Prezzari')
  const titleColor = String(cfg.titleColor || '#1F4E79')
  const titleFontSize = Number(cfg.titleFontSize || 15)
  const sectionTitleColor = String(cfg.sectionTitleColor || '#1F4E79')
  const sectionTitleFontSize = Number(cfg.sectionTitleFontSize || 12.5)
  const toolbarLabelColor = String(cfg.toolbarLabelColor || '#1F4E79')
  const toolbarLabelFontSize = Number(cfg.toolbarLabelFontSize || 11.5)
  const detailCardBackgroundColor = String(cfg.detailCardBackgroundColor || '#f5f9ff')
  const recordsCardBackgroundColor = String(cfg.recordsCardBackgroundColor || '#f5f9ff')
  const [rows, setRows] = React.useState<ImportRow[]>([])
  const [loading, setLoading] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [msg, setMsg] = React.useState<{ text: string; ok: boolean } | null>(null)
  const [isRi, setIsRi] = React.useState<boolean>(isRiOrAdminUser())
  const [typeCode, setTypeCode] = React.useState('1')
  const [file, setFile] = React.useState<File | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)
  const [anno, setAnno] = React.useState('')
  const [descrizione, setDescrizione] = React.useState('')
  const [activateAfterImport, setActivateAfterImport] = React.useState(true)
  const [progress, setProgress] = React.useState('')

  React.useEffect(() => {
    const refresh = () => setIsRi(isRiOrAdminUser())
    refresh()
    window.addEventListener('gii:userLoaded', refresh)
    return () => window.removeEventListener('gii:userLoaded', refresh)
  }, [])
  React.useEffect(() => { if (!msg) return; const t = window.setTimeout(() => setMsg(null), 7000); return () => window.clearTimeout(t) }, [msg])

  const load = React.useCallback(async () => {
    if (!importUrl) { setRows([]); return }
    setLoading(true)
    try {
      const rr = await queryRows(importUrl, '1=1', 'anno_prezzario DESC, OBJECTID DESC')
      setRows(rr as any)
    } catch (e: any) {
      setMsg({ text: 'Errore caricamento: ' + (e?.message ?? e), ok: false })
    }
    setLoading(false)
  }, [importUrl])

  React.useEffect(() => { void load() }, [load])

  const applyFileDefaults = React.useCallback((selected: File | null) => {
    setFile(selected)
    if (!selected) return
    const name = String(selected.name || '')
    const matchYear = name.match(/(20\d{2})/)
    const year = matchYear?.[1] || ''
    if (!anno.trim() && year) setAnno(year)
    if (!descrizione.trim()) {
      if (typeCode === '1' && year) setDescrizione(`Prezzario regionale ${year}`)
      else if (typeCode === '1') setDescrizione('Prezzario regionale')
    }
  }, [anno, descrizione, typeCode])

  const openFileDialog = React.useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const clearSelectedFile = React.useCallback(() => {
    setFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  React.useEffect(() => {
    if (typeCode === '1' && !descrizione.trim() && anno.trim()) setDescrizione(`Prezzario regionale ${anno.trim()}`)
  }, [typeCode, anno, descrizione])

  const onImport = async () => {
    if (!importUrl) { setMsg({ text: 'Configura l\'URL della tabella import prezzari.', ok: false }); return }
    const year = Number(anno)
    const desc = trimText(descrizione)
    if (!file) { setMsg({ text: 'Seleziona un file zip da importare.', ok: false }); return }
    if (!year || year < 2000 || year > 2100) { setMsg({ text: 'Anno non valido.', ok: false }); return }
    if (!desc) { setMsg({ text: 'Indica una descrizione.', ok: false }); return }
    if (typeCode !== '1') { setMsg({ text: 'L\'import del prezzario interno non è ancora disponibile in questo widget.', ok: false }); return }

    const { articoliUrl, analisiUrl } = urlsByType(cfg, typeCode)
    if (!articoliUrl || !analisiUrl) { setMsg({ text: 'Configura gli URL delle tabelle del prezzario regionale.', ok: false }); return }

    let createdImportId = 0
    setSaving(true)
    setProgress('Lettura zip…')
    try {
      const allRows = importUrl ? await queryRows(importUrl, '1=1', 'anno_prezzario DESC, OBJECTID DESC') : []
      const sameYear = (allRows as ImportRow[]).filter((r) => trimText(r.tipo_prezzario) === typeCode && num(r.anno_prezzario) === year)
      if (sameYear.length) {
        if (!window.confirm(`Esiste già un import ${importTypeLabel(typeCode)} per l'anno ${year}. Sostituirlo?`)) { setSaving(false); setProgress(''); return }
        setProgress('Eliminazione versione precedente…')
        for (const row of sameYear) await cleanupImportRow(importUrl, row, cfg)
      }

      const parsed = await parseOfficialRegionalZip(file)
      setProgress('Registrazione import…')
      createdImportId = await addFeatureAndReturnObjectId(importUrl, {
        tipo_prezzario: typeCode,
        anno_prezzario: String(year),
        descrizione_import: desc,
        file_origine: String(file.name || ''),
        file_articoli: parsed.artFile,
        file_analisi: parsed.anaFile,
        data_import: Date.now(),
        utente_import: String((window as any).__giiUserRole?.username || (window as any).__giiUserRole?.utente || ''),
        articoli_importati: String(parsed.articoli.length),
        analisi_importate: String(parsed.analisi.length),
        attivo: activateAfterImport ? '1' : '0',
        note: `Importato da widget il ${new Date().toLocaleString('it-IT')}`
      })

      setProgress(`Import articoli 0/${parsed.articoli.length}…`)
      await addInChunks(articoliUrl, parsed.articoli.map((r) => ({ ...r, objectid_import: createdImportId, anno_prezzario: String(year) })), 'Articolo prezzario', (done, total) => setProgress(`Import articoli ${done}/${total}…`))

      setProgress(`Import analisi 0/${parsed.analisi.length}…`)
      await addInChunks(analisiUrl, parsed.analisi.map((r) => ({ ...r, objectid_import: createdImportId, anno_prezzario: String(year) })), 'Analisi prezzario', (done, total) => setProgress(`Import analisi ${done}/${total}…`), 100)

      const refreshed = await queryRows(importUrl, '1=1', 'anno_prezzario DESC, OBJECTID DESC') as ImportRow[]
      if (activateAfterImport) await setOnlyOneActiveForType(importUrl, refreshed, typeCode, createdImportId)
      await load()
      setMsg({ text: `Import completato: ${parsed.articoli.length} articoli e ${parsed.analisi.length} righe di analisi.`, ok: true })
      setFile(null)
      setProgress('')
    } catch (e: any) {
      try {
        if (createdImportId) {
          const row = { objectid: createdImportId, tipo_prezzario: typeCode } as ImportRow
          await cleanupImportRow(importUrl, row, cfg)
        }
      } catch {}
      setMsg({ text: 'Errore import: ' + (e?.message ?? e), ok: false })
    } finally {
      setSaving(false)
      setProgress('')
    }
  }

  const onToggleActive = async (r: ImportRow) => {
    if (!importUrl) return
    setSaving(true)
    try {
      const allRows = await queryRows(importUrl, '1=1', 'anno_prezzario DESC, OBJECTID DESC') as ImportRow[]
      const oidField = String((await getLayer(importUrl))?.objectIdField || 'OBJECTID')
      if (boolLike(r.attivo)) {
        await updateRows(importUrl, [{ [oidField]: r.objectid, attivo: '0' }])
        setMsg({ text: `Import ${importTypeLabel(r.tipo_prezzario)} ${num(r.anno_prezzario)} disattivato.`, ok: true })
      } else {
        await setOnlyOneActiveForType(importUrl, allRows, trimText(r.tipo_prezzario), r.objectid)
        setMsg({ text: `Import ${importTypeLabel(r.tipo_prezzario)} ${num(r.anno_prezzario)} attivato.`, ok: true })
      }
      await load()
    } catch (e: any) {
      setMsg({ text: 'Errore: ' + (e?.message ?? e), ok: false })
    }
    setSaving(false)
  }

  const onDelete = async (r: ImportRow) => {
    if (boolLike(r.attivo)) { setMsg({ text: 'Disattiva prima l\'import attivo, poi eliminalo.', ok: false }); return }
    if (!window.confirm(`Eliminare l'import ${importTypeLabel(r.tipo_prezzario)} ${num(r.anno_prezzario)} e tutti i record collegati?`)) return
    setSaving(true)
    try {
      setProgress('Eliminazione record collegati…')
      const deleted = await cleanupImportRow(importUrl, r, cfg)
      await load()
      setMsg({ text: `Import eliminato. Rimossi: ${deleted.articoli} articoli, ${deleted.analisi} analisi, ${deleted.meta} record import.`, ok: true })
    } catch (e: any) {
      setMsg({ text: 'Errore: ' + (e?.message ?? e), ok: false })
    } finally {
      setSaving(false)
      setProgress('')
    }
  }

  if (!isRi) return <div style={{ padding: 12, fontFamily: 'Arial, sans-serif', color: '#7a1c1c', background: '#fce4e4', border: '1px solid #f5b8b8', borderRadius: 6 }}>Widget riservato al Responsabile Istruttore (RI) o all'Amministratore (ADMIN).</div>

  return (
    <Fragment>
      <style>{styles}</style>
      <div className='gpw' style={{ '--gpw-toolbar-label-color': toolbarLabelColor, '--gpw-toolbar-label-font-size': `${toolbarLabelFontSize}px`, '--gpw-section-title-color': sectionTitleColor, '--gpw-section-title-font-size': `${sectionTitleFontSize}px`, '--gpw-detail-card-background': detailCardBackgroundColor, '--gpw-records-card-background': recordsCardBackgroundColor } as React.CSSProperties}>
        <div className='gpw-title' style={{ color: titleColor, fontSize: titleFontSize }}>{title}</div>
        {(!importUrl || !cfg.regionaleArticoliUrl || !cfg.regionaleAnalisiUrl) ? <div className='gpw-msg gpw-msg-err'>Configura almeno la tabella import e le due tabelle del prezzario regionale nel setting del widget.</div> : null}
        {msg && <div className={`gpw-msg ${msg.ok ? 'gpw-msg-ok' : 'gpw-msg-err'}`}>{msg.text}</div>}

        <div className='gpw-card'>
          <div className='gpw-grid'>
            <div className='gpw-field'>
              <div className='gpw-label'>File zip</div>
              <div className='gpw-file-row'>
                <button type='button' className='gpw-file-picker-btn' onClick={openFileDialog}>Scegli file</button>
                <div className={`gpw-file-display ${file ? '' : 'gpw-file-display-empty'}`} title={file?.name || 'Nessun file selezionato'}>
                  <span className='gpw-file-name'>{file?.name || 'Nessun file selezionato'}</span>
                  {file ? <button type='button' className='gpw-file-clear' aria-label='Rimuovi file selezionato' onClick={clearSelectedFile}>×</button> : null}
                </div>
                <input ref={fileInputRef} className='gpw-file-native' type='file' accept='.zip' onChange={(e) => applyFileDefaults(((e.target as HTMLInputElement).files || [])[0] || null)} />
              </div>
            </div>
            <div className='gpw-field'>
              <div className='gpw-label'>Tipo prezzario</div>
              <select className='gpw-select' value={typeCode} onChange={(e) => setTypeCode((e.target as HTMLSelectElement).value)}>
                <option value='1'>Regionale</option>
                <option value='2'>Interno</option>
              </select>
            </div>
            <div className='gpw-field'>
              <div className='gpw-label'>Anno</div>
              <input className='gpw-input' value={anno} onChange={(e) => setAnno(e.target.value)} />
            </div>
            <div className='gpw-field'>
              <div className='gpw-label'>Descrizione import</div>
              <input className='gpw-input' value={descrizione} onChange={(e) => setDescrizione(e.target.value)} />
            </div>
          </div>

          <div style={{ marginTop: 10, padding: '8px 10px', background: '#fff8e1', border: '1px solid #f3d48b', borderRadius: 4, color: '#6b4e00', fontSize: 12, lineHeight: 1.5 }}>
            <b>Istruzioni:</b> per il <b>prezzario regionale</b> carica lo <b>ZIP originale</b> contenente i due CSV ufficiali <b>SAR24_anagrafica_articoli_prezzario.csv</b> e <b>SAR24_analisi_prezzario.csv</b>.
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><input type='checkbox' checked={activateAfterImport} onChange={(e) => setActivateAfterImport((e.target as HTMLInputElement).checked)} /> Attiva subito dopo l'import</label>
            <div className='gpw-btns'>
              <button className='gpw-btn gpw-primary' disabled={saving || !file} onClick={onImport}>{saving ? 'Import in corso…' : 'Importa prezzario'}</button>
            </div>
          </div>
          {progress ? <div style={{ marginTop: 8, fontSize: sectionTitleFontSize, color: sectionTitleColor, fontWeight: 700 }}>{progress}</div> : null}
        </div>

        <div className='gpw-table-wrap'>
          <table className='gpw-table'>
            <thead><tr><th>Anno</th><th>Tipo</th><th>Descrizione</th><th>Stato</th><th>File</th><th>Articoli</th><th>Analisi</th><th>Importato il</th><th>Azioni</th></tr></thead>
            <tbody>
              {rows.length === 0 ? <tr><td colSpan={9} style={{ padding: 16, textAlign: 'center', color: '#6b7280' }}>{loading ? 'Caricamento…' : 'Nessun import registrato.'}</td></tr> : rows.map((r) => (
                <tr key={r.objectid}>
                  <td>{num(r.anno_prezzario) || ''}</td>
                  <td>{importTypeLabel(r.tipo_prezzario)}</td>
                  <td>{r.descrizione_import || ''}</td>
                  <td>{boolLike(r.attivo) ? 'Attivo' : 'Disattivato'}</td>
                  <td>{r.file_origine || ''}</td>
                  <td>{num(r.articoli_importati) || 0}</td>
                  <td>{num(r.analisi_importate) || 0}</td>
                  <td>{toDateLabel(r.data_import)}</td>
                  <td>
                    <div className='gpw-btns-inline'>
                      <button className={`gpw-btn ${boolLike(r.attivo) ? 'gpw-warning' : 'gpw-secondary'}`} disabled={saving} onClick={() => void onToggleActive(r)}>{boolLike(r.attivo) ? 'Disattiva' : 'Attiva'}</button>
                      <button className='gpw-btn gpw-danger' disabled={saving} onClick={() => void onDelete(r)}>Elimina</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Fragment>
  )
}
