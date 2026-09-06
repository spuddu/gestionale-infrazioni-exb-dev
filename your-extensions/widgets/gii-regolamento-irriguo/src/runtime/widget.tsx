/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx, type AllWidgetProps } from 'jimu-core'
import type { IMConfig } from '../config'
import {
  SECTION_DEFS,
  RCP_SECTION,
  DELIBERA_META,
  ARTICOLO_MIN,
  ARTICOLO_MAX,
  RCP_NUMBERS,
  sezioneForGeneralArticleNumber,
  type Articolo
} from './regolamento-structure'

const { Fragment, useState, useMemo, useRef, useEffect } = React

type RegolamentoRow = {
  codice_articolo: string
  numero_articolo: any
  titolo_articolo: string
  testo_articolo: string
  atto_regolamento: string
  anno_riferimento: any
  data_validita_da: any
  data_validita_a: any
  attivo: any
}

type NormalizedCandidate = {
  article: Articolo
  fromMs: number
}

type LoadState = {
  loading: boolean
  error: string
  articoli: Articolo[]
  missingGeneralNumbers: number[]
  missingRcpNumbers: number[]
}

function num(v: any): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function normalizeColumnPercents(leftRaw: any, rightRaw: any): [number, number] {
  const clamp = (n: number, min: number, max: number): number => Math.min(max, Math.max(min, n))
  let left = clamp(num(leftRaw) || 28, 15, 60)
  let right = clamp(num(rightRaw) || 72, 40, 85)
  const total = left + right
  if (!Number.isFinite(total) || total <= 0) return [28, 72]
  left = (left / total) * 100
  right = (right / total) * 100
  return [left, right]
}

function stripAccents(s: string): string {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function norm(s: string): string {
  return stripAccents(String(s || '')).toLowerCase()
}

function pickAttrCI(obj: any, keys: string[]): any {
  if (!obj || typeof obj !== 'object') return undefined
  const lower = new Map<string, any>()
  Object.keys(obj).forEach(k => lower.set(String(k).toLowerCase(), obj[k]))
  for (const key of keys) {
    const k = String(key || '').toLowerCase()
    if (lower.has(k)) return lower.get(k)
  }
  return undefined
}

function normalizeFeatureLayerUrl(raw: any): string {
  const s = String(raw || '').trim()
  if (!s) return ''
  try {
    const u = new URL(s)
    if (!/^https?:$/i.test(u.protocol)) return ''
    u.search = ''
    u.hash = ''
    return u.toString().replace(/\/+$/, '')
  } catch {
    return ''
  }
}

function normalizeLookupTableUrl(raw: any): string {
  let url = normalizeFeatureLayerUrl(raw)
  if (!url) return ''
  if (/\/(FeatureServer|MapServer)$/i.test(url)) url = `${url}/0`
  return url
}

function loadEsriModule<T = any>(path: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = (window as any).require
    if (!req) {
      reject(new Error('AMD require non disponibile'))
      return
    }
    try {
      req([path], (mod: T) => resolve(mod), (err: any) => reject(err))
    } catch (e) {
      reject(e)
    }
  })
}

function dateMs(v: any): number | null {
  if (v == null || v === '') return null
  try {
    const n = Number(v)
    const d = Number.isFinite(n) && n > 0 ? new Date(n) : new Date(String(v))
    return Number.isNaN(d.getTime()) ? null : d.getTime()
  } catch {
    return null
  }
}

function rowUsable(row: RegolamentoRow, refMs: number): boolean {
  const active = String(row.attivo ?? '').trim().toLowerCase()
  if (active && !['1', 'true', 'sì', 'si', 'yes'].includes(active)) return false
  const from = dateMs(row.data_validita_da)
  const to = dateMs(row.data_validita_a)
  if (from != null && from > refMs) return false
  if (to != null && to < refMs) return false
  return true
}

function normalizeRegolamentoArticle(row: any): NormalizedCandidate | null {
  const codice = String(pickAttrCI(row, ['codice_articolo']) || '').trim().toUpperCase()
  const titolo = String(pickAttrCI(row, ['titolo_articolo']) || '').trim()
  const testo = String(pickAttrCI(row, ['testo_articolo']) || '').trim()
  const fromMs = dateMs(pickAttrCI(row, ['data_validita_da'])) ?? 0

  const generalMatch = codice.match(/^ART0*(\d{1,2})$/)
  if (generalMatch) {
    const n = Number(generalMatch[1])
    if (!Number.isInteger(n) || n < ARTICOLO_MIN || n > ARTICOLO_MAX) return null
    return {
      article: {
        id: String(n),
        codice,
        numero: String(n),
        titolo,
        sezione: sezioneForGeneralArticleNumber(n),
        testo,
        kind: 'general'
      },
      fromMs
    }
  }

  const rcpMatch = codice.match(/^RCP0*(\d{1,2})$/)
  if (rcpMatch) {
    const n = Number(rcpMatch[1])
    if (!RCP_NUMBERS.includes(n as any)) return null
    return {
      article: {
        id: `RCP-${n}`,
        codice,
        numero: String(n),
        titolo,
        sezione: RCP_SECTION.nome,
        testo,
        kind: 'rcp'
      },
      fromMs
    }
  }

  return null
}

async function queryRegolamentoRows(rawUrl: any): Promise<any[]> {
  const url = normalizeLookupTableUrl(rawUrl)
  if (!url) throw new Error('URL della tabella GII_REGOLAMENTO_ARTICOLI non configurato.')
  const esriRequest = await loadEsriModule<any>('esri/request')
  const response = await esriRequest(`${url}/query`, {
    query: {
      f: 'json',
      where: 'attivo = 1',
      outFields: '*',
      returnGeometry: false,
      orderByFields: 'numero_articolo ASC'
    },
    responseType: 'json'
  })
  const data = response?.data || response || {}
  if (data?.error) throw new Error(String(data.error?.message || 'Errore nel caricamento della tabella del regolamento.'))
  return (Array.isArray(data?.features) ? data.features : []).map((f: any) => f?.attributes || {})
}

function emptyLoadState(urlPresent: boolean): LoadState {
  return {
    loading: urlPresent,
    error: '',
    articoli: [],
    missingGeneralNumbers: Array.from({ length: ARTICOLO_MAX }, (_, i) => i + 1),
    missingRcpNumbers: [...RCP_NUMBERS]
  }
}

function useRegolamentoArticles(rawUrl: any): LoadState {
  const url = normalizeLookupTableUrl(rawUrl)
  const [state, setState] = useState<LoadState>(() => emptyLoadState(!!url))

  useEffect(() => {
    let cancelled = false
    if (!url) {
      setState({ ...emptyLoadState(false), error: 'URL della tabella GII_REGOLAMENTO_ARTICOLI non configurato.' })
      return () => { cancelled = true }
    }

    setState(prev => ({ ...prev, loading: true, error: '' }))
    queryRegolamentoRows(url).then(rows => {
      const refMs = Date.now()
      const candidates: NormalizedCandidate[] = rows
        .filter((raw: any) => rowUsable({
          codice_articolo: String(pickAttrCI(raw, ['codice_articolo']) || ''),
          numero_articolo: pickAttrCI(raw, ['numero_articolo']),
          titolo_articolo: String(pickAttrCI(raw, ['titolo_articolo']) || ''),
          testo_articolo: String(pickAttrCI(raw, ['testo_articolo']) || ''),
          atto_regolamento: String(pickAttrCI(raw, ['atto_regolamento']) || ''),
          anno_riferimento: pickAttrCI(raw, ['anno_riferimento']),
          data_validita_da: pickAttrCI(raw, ['data_validita_da']),
          data_validita_a: pickAttrCI(raw, ['data_validita_a']),
          attivo: pickAttrCI(raw, ['attivo'])
        }, refMs))
        .map(normalizeRegolamentoArticle)
        .filter(Boolean) as NormalizedCandidate[]

      const bestById = new Map<string, NormalizedCandidate>()
      candidates.forEach(candidate => {
        const old = bestById.get(candidate.article.id)
        if (!old || candidate.fromMs >= old.fromMs) bestById.set(candidate.article.id, candidate)
      })

      const articoli = Array.from(bestById.values())
        .map(x => x.article)
        .sort((a, b) => {
          if (a.kind !== b.kind) return a.kind === 'general' ? -1 : 1
          return Number(a.numero) - Number(b.numero)
        })

      const generalPresent = new Set(articoli.filter(a => a.kind === 'general').map(a => Number(a.numero)))
      const rcpPresent = new Set(articoli.filter(a => a.kind === 'rcp').map(a => Number(a.numero)))
      const missingGeneralNumbers = Array.from({ length: ARTICOLO_MAX }, (_, i) => i + 1).filter(n => !generalPresent.has(n))
      const missingRcpNumbers = RCP_NUMBERS.filter(n => !rcpPresent.has(n)) as number[]

      if (!cancelled) setState({ loading: false, error: '', articoli, missingGeneralNumbers, missingRcpNumbers })
    }).catch((e: any) => {
      if (!cancelled) setState({ ...emptyLoadState(false), error: e?.message || String(e) })
    })

    return () => { cancelled = true }
  }, [url])

  return state
}

function isListMarker(line: string): boolean {
  return /^[a-z]\)\s/.test(line) || /^[A-Z]\.\s/.test(line) || /^(I{1,3}|IV)\.\s/.test(line)
}

function splitParagraphs(testo: string): Array<{ type: 'p', text: string } | { type: 'list', items: string[] }> {
  const blocks = String(testo || '').split(/\n\n+/)
  const out: Array<{ type: 'p', text: string } | { type: 'list', items: string[] }> = []
  blocks.forEach((block) => {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
    if (!lines.length) return
    if (lines.length > 1 && lines.every((l) => isListMarker(l))) {
      out.push({ type: 'list', items: lines })
    } else if (lines.length > 1 && lines.slice(1).every((l) => isListMarker(l))) {
      out.push({ type: 'p', text: lines[0] })
      out.push({ type: 'list', items: lines.slice(1) })
    } else {
      out.push({ type: 'p', text: lines.join(' ') })
    }
  })
  return out
}

const REF_RE = /\b(artt?\.|articoli|articolo)\s+((?:\d{1,2}\s*(?:,|e|-|\u2013)\s*)*\d{1,2})\b/gi

function renderTextWithRefs(text: string, onJump: (id: string) => void, keyPrefix: string, articlesById: Record<string, Articolo>): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  let lastIndex = 0
  let m: RegExpExecArray | null
  let idx = 0
  REF_RE.lastIndex = 0

  while ((m = REF_RE.exec(text))) {
    const [full, prefix, numsPart] = m
    const start = m.index
    if (start > lastIndex) nodes.push(text.slice(lastIndex, start))

    const numbers = (numsPart.match(/\d{1,2}/g) || []).filter((n) => {
      const v = Number(n)
      return v >= ARTICOLO_MIN && v <= ARTICOLO_MAX && !!articlesById[String(v)]
    })

    if (!numbers.length) {
      nodes.push(full)
    } else {
      let cursor = 0
      const pieces: React.ReactNode[] = []
      const numRe = /\d{1,2}/g
      let nm: RegExpExecArray | null
      while ((nm = numRe.exec(numsPart))) {
        const v = Number(nm[0])
        if (nm.index > cursor) pieces.push(numsPart.slice(cursor, nm.index))
        if (v >= ARTICOLO_MIN && v <= ARTICOLO_MAX && articlesById[String(v)]) {
          pieces.push(
            <button key={`${keyPrefix}-ref-${idx++}`} className='gri-ref-link' onClick={(e) => { e.stopPropagation(); onJump(String(v)) }}>
              {nm[0]}
            </button>
          )
        } else {
          pieces.push(nm[0])
        }
        cursor = nm.index + nm[0].length
      }
      if (cursor < numsPart.length) pieces.push(numsPart.slice(cursor))
      nodes.push(prefix)
      nodes.push(' ')
      nodes.push(...pieces)
    }
    lastIndex = start + full.length
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex))
  return nodes
}

function highlightSearch(text: string, term: string, keyPrefix: string): React.ReactNode[] {
  const t = norm(term)
  const nt = norm(text)
  if (!t || !nt.includes(t)) return [text]

  const out: React.ReactNode[] = []
  let cursor = 0
  let idx = 0
  while (true) {
    const pos = nt.indexOf(t, cursor)
    if (pos < 0) {
      out.push(text.slice(cursor))
      break
    }
    if (pos > cursor) out.push(text.slice(cursor, pos))
    out.push(<mark key={`${keyPrefix}-hl-${idx++}`} className='gri-mark'>{text.slice(pos, pos + term.length)}</mark>)
    cursor = pos + term.length
  }
  return out
}

function articleShortLabel(a: Articolo): string {
  return a.kind === 'rcp' ? `Punto ${a.numero}` : `Art. ${a.numero}`
}

function articleFullLabel(a: Articolo): string {
  return a.kind === 'rcp' ? `Regolamento condotte private — Punto ${a.numero}` : `Art. ${a.numero}`
}

function articleMatchesSearch(a: Articolo, term: string): boolean {
  if (!term) return true
  const t = norm(term)
  const referenceLabel = a.kind === 'rcp' ? `punto ${a.numero}` : `art. ${a.numero}`
  return norm(a.sezione).includes(t) ||
    norm(a.titolo).includes(t) ||
    norm(a.testo).includes(t) ||
    norm(referenceLabel).includes(t) ||
    norm(a.numero).includes(t) ||
    norm(a.codice).includes(t)
}

function highlightSearch2(text: string, search: string, articleId: string, key: string, onJump: (id: string) => void, articlesById: Record<string, Articolo>): React.ReactNode[] {
  const withRefs = renderTextWithRefs(text, onJump, `${articleId}-${key}`, articlesById)
  const term = search.trim()
  if (term.length < 2) return withRefs
  const out: React.ReactNode[] = []
  withRefs.forEach((node, i) => {
    if (typeof node === 'string') out.push(...highlightSearch(node, term, `${articleId}-${key}-${i}`))
    else out.push(node)
  })
  return out
}

export default function Widget(props: AllWidgetProps<IMConfig>) {
  const cfg: any = props.config || {}
  const title = String(cfg.title || 'Regolamento irriguo')
  const titleColor = String(cfg.titleColor || '#1F4E79')
  const titleFontSize = num(cfg.titleFontSize) || 15
  const sectionTitleColor = String(cfg.sectionTitleColor || '#1F4E79')
  const sectionTitleFontSize = num(cfg.sectionTitleFontSize) || 13
  const accentColor = String(cfg.accentColor || '#1F4E79')
  const leftPanelBackgroundColor = String(cfg.leftPanelBackgroundColor || '#ffffff')
  const contentBackgroundColor = String(cfg.contentBackgroundColor || '#ffffff')
  const pdfUrl = String(cfg.pdfUrl || '').trim()
  const tableUrl = String(cfg.regolamentoArticoliUrl || '').trim()
  const [leftPct, rightPct] = useMemo(
    () => normalizeColumnPercents(cfg.leftColumnWidthPct, cfg.rightColumnWidthPct),
    [cfg.leftColumnWidthPct, cfg.rightColumnWidthPct]
  )
  const defaultColumnPercents = useMemo<[number, number]>(() => [leftPct, rightPct], [leftPct, rightPct])
  const [columnPercents, setColumnPercents] = useState<[number, number]>(defaultColumnPercents)
  const [draggingSplitter, setDraggingSplitter] = useState(false)
  const gridRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setColumnPercents(defaultColumnPercents)
  }, [defaultColumnPercents])

  const loadState = useRegolamentoArticles(tableUrl)
  const allArticles = loadState.articoli
  const generalArticles = useMemo(() => allArticles.filter(a => a.kind === 'general'), [allArticles])
  const rcpArticles = useMemo(() => allArticles.filter(a => a.kind === 'rcp'), [allArticles])
  const articlesById = useMemo(
    () => allArticles.reduce((acc, a) => { acc[a.id] = a; return acc }, {} as Record<string, Articolo>),
    [allArticles]
  )

  const sections = useMemo(() => {
    const general = SECTION_DEFS
      .map(s => ({ id: s.id, nome: s.nome, articoli: generalArticles.filter(a => a.sezione === s.nome) }))
      .filter(s => s.articoli.length > 0)
    const rcp = rcpArticles.length ? [{ id: RCP_SECTION.id, nome: RCP_SECTION.nome, articoli: rcpArticles }] : []
    return [...general, ...rcp]
  }, [generalArticles, rcpArticles])

  const [selectedId, setSelectedId] = useState<string>('')
  const [search, setSearch] = useState('')
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})
  const contentRef = useRef<HTMLDivElement>(null)
  const articleButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  useEffect(() => {
    if (!allArticles.length) return
    if (!selectedId || !articlesById[selectedId]) setSelectedId(allArticles[0].id)
  }, [allArticles, articlesById, selectedId])

  const flatOrder = useMemo(() => allArticles.map((a) => a.id), [allArticles])
  const selected = selectedId ? articlesById[selectedId] : undefined
  const searchActive = search.trim().length >= 2

  const visibleSections = useMemo(() => {
    if (!searchActive) return sections
    const term = search.trim()
    return sections
      .map((s) => ({ ...s, articoli: s.articoli.filter((a) => articleMatchesSearch(a, term)) }))
      .filter((s) => s.articoli.length > 0)
  }, [sections, search, searchActive])

  const totalMatches = useMemo(() => {
    if (!searchActive) return 0
    return visibleSections.reduce((acc, s) => acc + s.articoli.length, 0)
  }, [visibleSections, searchActive])

  const jumpTo = (id: string) => {
    const target = articlesById[id]
    if (target && !searchActive) {
      const targetSection = sections.find((s) => s.nome === target.sezione)
      if (targetSection) {
        setExpandedSections((prev) => prev[targetSection.id] ? prev : { ...prev, [targetSection.id]: true })
      }
    }
    setSelectedId(id)
    if (contentRef.current) contentRef.current.scrollTop = 0
  }

  useEffect(() => {
    if (!selectedId) return
    const button = articleButtonRefs.current[selectedId]
    if (!button) return
    const raf = window.requestAnimationFrame(() => {
      button.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    })
    return () => window.cancelAnimationFrame(raf)
  }, [selectedId, expandedSections, searchActive])

  const toggleSection = (id: string) => setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }))

  useEffect(() => {
    if (!searchActive) return
    const stillVisible = visibleSections.some((s) => s.articoli.some((a) => a.id === selectedId))
    if (!stillVisible && visibleSections.length && visibleSections[0].articoli.length) {
      setSelectedId(visibleSections[0].articoli[0].id)
    }
  }, [searchActive, visibleSections, selectedId])

  const curIndex = flatOrder.indexOf(selectedId)
  const prevId = curIndex > 0 ? flatOrder[curIndex - 1] : null
  const nextId = curIndex >= 0 && curIndex < flatOrder.length - 1 ? flatOrder[curIndex + 1] : null
  const panelHeadStyle: React.CSSProperties = { color: sectionTitleColor, fontSize: sectionTitleFontSize, fontWeight: 700 }

  const missingWarnings: string[] = []
  if (loadState.missingGeneralNumbers.length) missingWarnings.push(`artt. ${loadState.missingGeneralNumbers.join(', ')}`)
  if (loadState.missingRcpNumbers.length) missingWarnings.push(`condotte private: punti ${loadState.missingRcpNumbers.join(', ')}`)

  const layoutVars: React.CSSProperties = {
    ['--gri-left-col' as any]: `${columnPercents[0].toFixed(2)}%`,
    ['--gri-right-col' as any]: `${columnPercents[1].toFixed(2)}%`,
    ['--gri-split-col' as any]: '12px',
    ['--gri-left-panel-background' as any]: leftPanelBackgroundColor,
    ['--gri-right-panel-background' as any]: contentBackgroundColor
  }

  const columnsDirty = Math.abs(columnPercents[0] - defaultColumnPercents[0]) > 0.05 || Math.abs(columnPercents[1] - defaultColumnPercents[1]) > 0.05
  const indexDirty = Object.values(expandedSections).some(Boolean)

  const resetColumnPercents = React.useCallback(() => {
    setColumnPercents(defaultColumnPercents)
  }, [defaultColumnPercents])

  const resetIndex = React.useCallback(() => {
    setExpandedSections({})
  }, [])

  const startResize = React.useCallback((evt: React.MouseEvent<HTMLDivElement>) => {
    evt.preventDefault()
    evt.stopPropagation()
    const host = gridRef.current
    if (!host) return
    const startX = evt.clientX
    const startCols = [...columnPercents] as [number, number]
    const hostWidth = Math.max(host.getBoundingClientRect().width - 12, 300)
    const MIN_LEFT = 15
    const MIN_RIGHT = 40
    const clamp = (v: number, mn: number, mx: number) => Math.min(mx, Math.max(mn, v))
    const round2 = (v: number) => Math.round(v * 100) / 100
    const onMove = (moveEvt: MouseEvent) => {
      const deltaPct = ((moveEvt.clientX - startX) / hostWidth) * 100
      const nextLeft = clamp(startCols[0] + deltaPct, MIN_LEFT, 100 - MIN_RIGHT)
      const nextRight = 100 - nextLeft
      setColumnPercents([round2(nextLeft), round2(nextRight)])
    }
    const onUp = () => {
      setDraggingSplitter(false)
      document.body.style.removeProperty('cursor')
      document.body.style.removeProperty('user-select')
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    setDraggingSplitter(true)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [columnPercents])

  const toolbarCounter = loadState.loading
    ? 'Caricamento articoli…'
    : loadState.error
      ? 'Caricamento non disponibile'
      : searchActive
        ? (totalMatches === 0 ? 'Nessun articolo trovato' : `${totalMatches} ${totalMatches === 1 ? 'articolo trovato' : 'articoli trovati'}`)
        : `${allArticles.length.toLocaleString('it-IT')} articoli caricati`

  return (
    <Fragment>
      <style>{styles}</style>
      <div className='gri-root' style={layoutVars}>
        <div className='gri-title' style={{ color: titleColor, fontSize: titleFontSize }}>{title}</div>
        <div className='gri-meta'>
          <span>{DELIBERA_META.delibera}</span>
          {pdfUrl ? <a className='gri-pdf-link' href={pdfUrl} target='_blank' rel='noreferrer'>Apri il testo integrale (PDF)</a> : null}
        </div>

        {loadState.error ? <div className='gri-msg gri-msg-err'>{loadState.error}</div> : null}
        {!loadState.loading && !loadState.error && missingWarnings.length ? (
          <div className='gri-msg gri-msg-warn'>Tabella incompleta: mancano {missingWarnings.join('; ')}.</div>
        ) : null}

        <div className='gri-toolbar'>
          <div className='gri-field gri-grid-left'>
            <div className='gri-label'>Cerca</div>
            <div className='gri-search-wrap'>
              <input
                className='gri-input gri-search-input'
                placeholder='parola, numero, titolo o sezione…'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button
                type='button'
                className='gri-clear-btn'
                aria-label='Pulisci ricerca'
                title='Pulisci ricerca'
                onClick={() => setSearch('')}
                disabled={!search}
                style={!search ? { cursor: 'default', opacity: 0.45 } : undefined}
              >
                ×
              </button>
            </div>
          </div>
          <div className='gri-split-spacer' />
          <div className='gri-toolbar-meta gri-grid-right' style={{ paddingBottom: 8 }}>
            <div className='gri-toolbar-meta-inner'>
              <button
                type='button'
                className={`gri-cols-reset-btn ${columnsDirty ? 'active' : ''}`}
                onClick={resetColumnPercents}
                disabled={!columnsDirty}
                title='Ripristina larghezze colonne'
                aria-label='Ripristina larghezze colonne'
              >
                <svg viewBox='0 0 14 16' width='12' height='14' aria-hidden='true' style={{ display: 'block' }}>
                  <rect x='1' y='2' width='4' height='12' rx='1' fill='currentColor' />
                  <rect x='9' y='2' width='4' height='12' rx='1' fill='currentColor' />
                </svg>
              </button>
              <span className='gri-toolbar-counter' title={toolbarCounter}>{toolbarCounter}</span>
            </div>
          </div>
        </div>

        <div className='gri-layout' ref={gridRef}>
          <div className='gri-panel gri-grid-left'>
            <div className='gri-panel-head' style={panelHeadStyle}>
              <div className='gri-panel-head-row'>
                <span>Indice regolamento</span>
                <div className='gri-panel-head-actions'>
                  <button
                    type='button'
                    className={`gri-nav-reset-btn ${indexDirty ? 'active' : ''}`}
                    onClick={resetIndex}
                    disabled={!indexDirty}
                    title='Reimposta indice'
                    aria-label='Reimposta indice'
                  >
                    <svg viewBox='0 0 64 64' width='18' height='18' aria-hidden='true' style={{ display: 'block' }}>
                      <circle cx='12.5' cy='17' r='4.8' fill='currentColor' opacity='0.9' />
                      <circle cx='12.5' cy='32' r='4.8' fill='currentColor' opacity='0.9' />
                      <circle cx='12.5' cy='47' r='4.8' fill='currentColor' opacity='0.9' />
                      <rect x='22' y='12' width='34' height='10' rx='5' fill='currentColor' opacity='0.95' />
                      <rect x='22' y='27' width='34' height='10' rx='5' fill='currentColor' opacity='0.95' />
                      <rect x='22' y='42' width='34' height='10' rx='5' fill='currentColor' opacity='0.95' />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <div className='gri-panel-body gri-panel-body-pad'>
              {visibleSections.map((s) => {
                const expanded = searchActive ? true : !!expandedSections[s.id]
                return (
                  <div key={s.id} className='gri-sezione'>
                    <div className='gri-sezione-row'>
                      <button className='gri-sezione-head' style={panelHeadStyle} onClick={() => toggleSection(s.id)}>
                        <span>{s.nome}</span>
                      </button>
                      <button className='gri-tree-toggle' onClick={() => toggleSection(s.id)} aria-label='Espandi/collassa sezione'>{expanded ? '−' : '+'}</button>
                    </div>
                    {expanded ? (
                      <div className='gri-articoli-list'>
                        {s.articoli.map((a) => {
                          const active = a.id === selectedId
                          return (
                            <button
                              key={a.id}
                              ref={(el) => { articleButtonRefs.current[a.id] = el }}
                              className={`gri-art-btn ${active ? 'active' : ''}`}
                              style={active ? { background: accentColor, color: '#fff' } : undefined}
                              onClick={() => jumpTo(a.id)}
                            >
                              <span className='gri-art-num'>{articleShortLabel(a)}</span>
                              <span className='gri-art-title'>{highlightSearch(a.titolo, searchActive ? search.trim() : '', `toc-${a.id}`)}</span>
                            </button>
                          )
                        })}
                      </div>
                    ) : null}
                  </div>
                )
              })}
              {searchActive && !visibleSections.length ? <div className='gri-empty'>Nessun articolo corrisponde alla ricerca.</div> : null}
            </div>
          </div>

          <div className={`gri-col-resizer ${draggingSplitter ? 'dragging' : ''}`} onMouseDown={startResize} title='Ridimensiona colonne indice e contenuto' aria-hidden='true' />

          <div className='gri-panel gri-grid-right'>
            <div className='gri-panel-head' style={panelHeadStyle}>Testo articolo</div>
            <div className='gri-panel-body gri-panel-body-article'>
              {!selected ? (
                <div className='gri-empty'>{loadState.loading ? 'Caricamento del regolamento…' : 'Seleziona un articolo dall’indice.'}</div>
              ) : (
                <>
                  <div className='gri-article-scroll' ref={contentRef}>
                    <div className='gri-article'>
                      <div className='gri-breadcrumb'>{selected.sezione}</div>
                      <div className='gri-article-head' style={{ color: titleColor }}>
                        <span className='gri-article-num'>{articleFullLabel(selected)}</span>
                        <span className='gri-article-title'>{selected.titolo}</span>
                      </div>
                      <div className='gri-article-body'>
                        {splitParagraphs(selected.testo).map((block, bi) => {
                          if (block.type === 'list') {
                            return (
                              <ul key={`b-${bi}`} className='gri-list'>
                                {block.items.map((item, ii) => <li key={`b-${bi}-${ii}`}>{highlightSearch2(item, search, selected.id, `${bi}-${ii}`, jumpTo, articlesById)}</li>)}
                              </ul>
                            )
                          }
                          return <p key={`b-${bi}`}>{highlightSearch2(block.text, search, selected.id, `${bi}`, jumpTo, articlesById)}</p>
                        })}
                      </div>
                    </div>
                  </div>
                  <div className='gri-nav-buttons'>
                    <button className='gri-nav-btn' disabled={!prevId} onClick={() => prevId && jumpTo(prevId)}>← Articolo precedente</button>
                    <button className='gri-nav-btn' disabled={!nextId} onClick={() => nextId && jumpTo(nextId)}>Articolo successivo →</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  )
}

const styles = `
.gri-root { font-size:13px; padding:12px; height:100%; width:100%; display:flex; flex-direction:column; gap:10px; box-sizing:border-box; font-family:inherit; overflow:hidden; }
.gri-title { font-size:15px; font-weight:700; color:#1F4E79; border-bottom:2px solid #1F4E79; padding-bottom:6px; line-height:1.3; }
.gri-meta { display:flex; align-items:center; gap:14px; font-size:11.5px; color:#6b7280; margin-top:-5px; flex-wrap:wrap; }
.gri-pdf-link { color:#1f6fb2; text-decoration:underline; }
.gri-msg { padding:7px 12px; border-radius:6px; font-size:12px; font-weight:700; }
.gri-msg-err { background:#fce4e4; color:#c00; border:1px solid #f5b8b8; }
.gri-msg-warn { background:#fff7ed; color:#92400e; border:1px solid #fed7aa; }
.gri-toolbar { display:grid; grid-template-columns:minmax(0,var(--gri-left-col,28%)) var(--gri-split-col,12px) minmax(0,var(--gri-right-col,72%)); gap:0; align-items:end; column-gap:0; }
.gri-grid-left { grid-column:1; min-width:0; }
.gri-grid-right { grid-column:3; min-width:0; }
.gri-split-spacer { grid-column:2; width:100%; min-width:0; }
.gri-field { display:flex; flex-direction:column; gap:3px; min-width:0; width:100%; }
.gri-label { font-size:11px; font-weight:700; color:#1F4E79; }
.gri-input { width:100%; height:40px; min-height:40px; padding:8px 10px; border:1px solid #aac4e0; border-radius:6px; font-size:13px; line-height:22px; box-sizing:border-box; background:#fff; font-family:inherit; }
.gri-search-wrap { position:relative; width:100%; min-width:0; display:block; }
.gri-input.gri-search-input { display:block; width:100%; min-width:0; padding-right:40px; }
.gri-clear-btn { position:absolute; right:6px; top:50%; transform:translateY(-50%); width:28px; height:28px; min-height:28px; border:none; background:transparent; color:#6d88a6; border-radius:999px; cursor:pointer; font-size:18px; line-height:1; display:inline-flex; align-items:center; justify-content:center; padding:0; font-family:inherit; }
.gri-clear-btn:hover:not(:disabled) { background:#eef5fd; color:#1F4E79; }
.gri-clear-btn:focus { outline:none; box-shadow:0 0 0 2px rgba(31,78,121,0.18); }
.gri-toolbar-meta { display:flex; align-items:flex-end; justify-content:flex-end; justify-self:stretch; min-width:0; width:100%; overflow:visible; }
.gri-toolbar-meta-inner { display:flex; align-items:center; justify-content:flex-end; gap:8px; width:100%; min-width:0; }
.gri-toolbar-counter { display:block; width:100%; max-width:none; margin-left:0; color:#8fa7c0; text-align:right; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-size:11.5px; line-height:1.2; font-weight:600; }
.gri-cols-reset-btn { width:28px; height:28px; border:1px solid #aac4e0; background:#fff; color:#8aa4bf; border-radius:999px; cursor:default; font-size:15px; line-height:1; display:inline-flex; align-items:center; justify-content:center; opacity:0.75; flex:0 0 auto; }
.gri-cols-reset-btn.active { background:#ffd700; color:#000; border-color:#ffd700; cursor:pointer; opacity:1; }
.gri-cols-reset-btn.active:hover { background:#ffd700; border-color:#ffd700; }
.gri-cols-reset-btn:disabled { pointer-events:none; }
.gri-layout { flex:1; min-height:0; display:grid; grid-template-columns:minmax(0,var(--gri-left-col,28%)) var(--gri-split-col,12px) minmax(0,var(--gri-right-col,72%)); gap:0; column-gap:0; align-items:stretch; }
.gri-panel { min-height:0; border:1px solid #c5d9f1; border-radius:8px; background:#fff; display:flex; flex-direction:column; overflow:hidden; }
.gri-panel.gri-grid-left, .gri-panel.gri-grid-left .gri-panel-body { background:var(--gri-left-panel-background,#ffffff); }
.gri-panel.gri-grid-right, .gri-panel.gri-grid-right .gri-panel-body { background:var(--gri-right-panel-background,#ffffff); }
.gri-panel-head { min-height:49px; box-sizing:border-box; padding:10px 12px; background:#f5f9ff; border-bottom:1px solid #dbe7f4; font-weight:700; color:#1F4E79; border-top-left-radius:8px; border-top-right-radius:8px; display:flex; align-items:center; }
.gri-panel-head-row { width:100%; display:flex; align-items:center; justify-content:space-between; gap:8px; }
.gri-panel-head-actions { display:flex; align-items:center; gap:6px; }
.gri-panel-body { flex:1; min-height:0; overflow:auto; border-bottom-left-radius:8px; border-bottom-right-radius:8px; }
.gri-panel-body-article { overflow:hidden; display:flex; flex-direction:column; }
.gri-article-scroll { flex:1; min-height:0; overflow:auto; }
.gri-panel-body-pad { padding:8px; }
.gri-nav-reset-btn { width:28px; height:28px; border:1px solid #aac4e0; background:#fff; color:#8aa4bf; border-radius:999px; cursor:default; font-size:15px; line-height:1; display:inline-flex; align-items:center; justify-content:center; opacity:0.75; flex:0 0 auto; }
.gri-nav-reset-btn.active { background:#1F4E79; color:#fff; border-color:#1F4E79; cursor:pointer; opacity:1; }
.gri-nav-reset-btn.active:hover { background:#295f92; border-color:#295f92; }
.gri-nav-reset-btn:disabled { pointer-events:none; }
.gri-col-resizer { position:relative; width:100%; min-width:0; cursor:col-resize; user-select:none; touch-action:none; }
.gri-col-resizer::before { content:''; position:absolute; top:0; bottom:0; left:50%; transform:translateX(-50%); width:2px; background:#3d77c9; border-radius:999px; }
.gri-col-resizer:hover::before, .gri-col-resizer.dragging::before { background:#c5d9f1; }
.gri-col-resizer::after { content:''; position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:8px; height:56px; border-radius:999px; background:rgba(61,119,201,0.18); }
.gri-col-resizer:hover::after, .gri-col-resizer.dragging::after { background:rgba(61,119,201,0.08); }
.gri-sezione { margin-bottom:4px; }
.gri-sezione-row { display:grid; grid-template-columns:1fr auto; gap:6px; align-items:center; }
.gri-sezione-head { width:100%; text-align:left; border:none; background:transparent; padding:8px 10px; border-radius:6px; cursor:pointer; font-family:inherit; font-size:13px !important; color:#123; }
.gri-sezione-head:hover { background:#eef5ff; }
.gri-tree-toggle { width:34px; height:34px; border:none; background:transparent; border-radius:6px; cursor:pointer; color:#1F4E79; font-weight:700; font-size:13px; font-family:inherit; }
.gri-tree-toggle:hover { background:#eef5ff; }
.gri-articoli-list { margin-left:12px; padding:4px 0 4px 8px; border-left:2px solid #dbe7f4; display:flex; flex-direction:column; gap:4px; }
.gri-art-btn { width:100%; text-align:left; border:none; background:transparent; padding:8px 10px; border-radius:6px; cursor:pointer; display:flex; flex-direction:column; align-items:flex-start; gap:2px; color:#123; font-family:inherit; font-size:13px; }
.gri-art-btn:hover { background:#eef5ff; }
.gri-art-btn.active { color:#fff; }
.gri-art-num { font-size:12.5px; line-height:1.2; font-weight:700; color:#516273; }
.gri-art-btn.active .gri-art-num { color:#fff; }
.gri-art-title { font-size:13px; line-height:1.35; color:inherit; }
.gri-empty { padding:16px; color:#6b7280; text-align:center; font-size:13px; }
.gri-article { width:100%; box-sizing:border-box; padding:12px; display:flex; flex-direction:column; gap:10px; }
.gri-breadcrumb { font-size:11.5px; text-transform:uppercase; letter-spacing:0.03em; color:#8fa7c0; font-weight:700; }
.gri-article-head { display:flex; flex-direction:column; gap:2px; padding-bottom:10px; border-bottom:1px solid #dbe7f4; }
.gri-article-num { font-size:13px; font-weight:700; opacity:0.8; }
.gri-article-title { font-size:18px; font-weight:700; line-height:1.3; }
.gri-article-body { font-size:13px; line-height:1.55; color:#1f2937; }
.gri-article-body p { margin:0 0 12px; }
.gri-list { margin:0 0 14px; padding-left:20px; }
.gri-list li { margin-bottom:8px; }
.gri-ref-link { display:inline; padding:0 1px; border:none; background:transparent; color:#1f6fb2; text-decoration:underline; cursor:pointer; font:inherit; }
.gri-ref-link:hover { color:#17558c; }
.gri-mark { background:#fde68a; color:inherit; padding:0 1px; border-radius:2px; }
.gri-art-btn.active .gri-mark { background:#fff3a6; color:#123; }
.gri-nav-buttons { flex:0 0 auto; display:flex; justify-content:space-between; gap:10px; margin-top:0; padding:10px 12px; border-top:1px solid #dbe7f4; background:var(--gri-right-panel-background,#ffffff); }
.gri-nav-btn { flex:0 0 auto; padding:8px 14px; font-size:13px; border:1px solid #aac4e0; border-radius:6px; background:#fff; color:#1F4E79; cursor:pointer; font-weight:700; font-family:inherit; }
.gri-nav-btn:disabled { opacity:0.45; cursor:default; }
.gri-nav-btn:not(:disabled):hover { background:#eef5ff; }
`
