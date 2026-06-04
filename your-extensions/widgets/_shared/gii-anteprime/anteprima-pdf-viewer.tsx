/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx } from 'jimu-core'

type Props = {
  url: string | null
  fileName?: string
  title?: string
  subtitle?: string
  loading?: boolean
  error?: string | null
  emptyText?: string
  onDownload?: () => void
  onClose?: () => void
  style?: React.CSSProperties
}

let pdfJsPromise: Promise<any> | null = null

function loadPdfJs (): Promise<any> {
  if (!pdfJsPromise) {
    // In ExB il worker generato da pdfjs-dist/webpack può restare appeso o non essere servito correttamente.
    // Carichiamo quindi il worker entry nel bundle principale: PDF.js userà il fake worker locale,
    // senza tentare di scaricare un file worker da /widgets/chunks.
    // @ts-ignore - le dichiarazioni dei moduli legacy possono non essere risolte dal TS di Experience Builder.
    pdfJsPromise = Promise.all([
      // @ts-ignore - le dichiarazioni dei moduli legacy possono non essere risolte dal TS di Experience Builder.
      import('pdfjs-dist/legacy/build/pdf.js'),
      // @ts-ignore - le dichiarazioni dei moduli legacy possono non essere risolte dal TS di Experience Builder.
      import('pdfjs-dist/legacy/build/pdf.worker.entry.js')
    ]).then(([pdfjs]) => pdfjs)
  }
  return pdfJsPromise
}

function cleanPdfUrl (url?: string | null): string {
  return String(url || '').split('#')[0]
}

function fallbackFileName (url?: string | null, fileName?: string): string {
  const explicit = String(fileName || '').trim()
  if (explicit) return explicit.endsWith('.pdf') ? explicit : `${explicit}.pdf`
  const hash = String(url || '').split('#')[1]
  if (hash) return hash.endsWith('.pdf') ? hash : `${hash}.pdf`
  return 'rapporto.pdf'
}

function clampInt (value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.max(min, Math.min(max, Math.round(value)))
}

function printPdfUrl (url?: string | null): void {
  const src = cleanPdfUrl(url)
  if (!src) return
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  iframe.style.opacity = '0'
  iframe.src = src
  let printed = false
  const cleanup = () => {
    window.setTimeout(() => {
      try { iframe.remove() } catch {}
    }, 60000)
  }
  const doPrint = () => {
    if (printed) return
    printed = true
    try {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
    } catch {
      try { window.open(src, '_blank', 'noopener,noreferrer') } catch {}
    }
    cleanup()
  }
  iframe.onload = () => { window.setTimeout(doPrint, 300) }
  document.body.appendChild(iframe)
  window.setTimeout(doPrint, 1500)
}

function downloadPdfUrl (url?: string | null, fileName?: string): void {
  const src = cleanPdfUrl(url)
  if (!src) return
  const link = document.createElement('a')
  link.href = src
  link.download = fallbackFileName(url, fileName)
  link.rel = 'noopener noreferrer'
  document.body.appendChild(link)
  link.click()
  link.remove()
}

function PdfPageThumbnail (props: { pdfDoc: any; pageNumber: number; active: boolean; onSelect: () => void }): any {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)

  React.useEffect(() => {
    let cancelled = false
    let task: any = null
    ;(async () => {
      try {
        const canvas = canvasRef.current
        const doc = props.pdfDoc
        if (!canvas || !doc) return
        const page = await doc.getPage(props.pageNumber)
        if (cancelled) return
        const baseViewport = page.getViewport({ scale: 1 })
        const targetWidth = 88
        const scale = targetWidth / Math.max(1, baseViewport.width)
        const viewport = page.getViewport({ scale })
        const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1))
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        canvas.width = Math.max(1, Math.floor(viewport.width * dpr))
        canvas.height = Math.max(1, Math.floor(viewport.height * dpr))
        canvas.style.width = `${Math.floor(viewport.width)}px`
        canvas.style.height = `${Math.floor(viewport.height)}px`
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.clearRect(0, 0, viewport.width, viewport.height)
        task = page.render({ canvasContext: ctx, viewport })
        await task.promise
      } catch (ex: any) {
        const name = String(ex?.name || '')
        if (!cancelled && name !== 'RenderingCancelledException') {
          // Nessuna diagnostica: se una miniatura fallisce, il viewer principale resta utilizzabile.
        }
      }
    })()
    return () => {
      cancelled = true
      try { task?.cancel?.() } catch {}
    }
  }, [props.pdfDoc, props.pageNumber])

  return (
    <button
      type='button'
      onClick={props.onSelect}
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 5,
        padding: 7,
        borderRadius: 8,
        border: props.active ? '2px solid #60a5fa' : '1px solid rgba(255,255,255,0.16)',
        background: props.active ? 'rgba(96,165,250,0.20)' : '#2f2f2f',
        color: '#fff',
        cursor: 'pointer',
        boxSizing: 'border-box'
      }}
      title={`Vai a pagina ${props.pageNumber}`}
    >
      <canvas ref={canvasRef} style={{ display: 'block', background: '#fff', boxShadow: '0 0 8px rgba(0,0,0,0.45)' }} />
      <span style={{ fontSize: 11, fontWeight: 800 }}>Pagina {props.pageNumber}</span>
    </button>
  )
}

export default function AnteprimaPdfViewer (props: Props): any {
  const viewerRef = React.useRef<HTMLDivElement | null>(null)
  const pageHostRef = React.useRef<HTMLDivElement | null>(null)
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const canvasSecondRef = React.useRef<HTMLCanvasElement | null>(null)
  const renderTaskRef = React.useRef<any[]>([])
  const pdfDocRef = React.useRef<any>(null)
  const pageScrollAfterRenderRef = React.useRef<'top' | 'bottom' | null>(null)
  const panStateRef = React.useRef<{ pointerId: number; startX: number; startY: number; scrollLeft: number; scrollTop: number } | null>(null)
  const renderedUrlRef = React.useRef<string | null>(null)

  const url = props.url || null
  const fileName = fallbackFileName(url, props.fileName)

  const [pdfDoc, setPdfDoc] = React.useState<any>(null)
  const [pageNumber, setPageNumber] = React.useState(1)
  const [pageInput, setPageInput] = React.useState('1')
  const [pageCount, setPageCount] = React.useState(0)
  const [zoom, setZoom] = React.useState(100)
  const [zoomInput, setZoomInput] = React.useState('100')
  const [fitBaseZoom, setFitBaseZoom] = React.useState(100)
  const [fitMode, setFitMode] = React.useState<'height' | 'width'>('height')
  const [internalLoading, setInternalLoading] = React.useState(false)
  const [internalError, setInternalError] = React.useState<string | null>(null)
  const [fitReady, setFitReady] = React.useState(false)
  const [twoPageView, setTwoPageView] = React.useState(false)
  const [isPanning, setIsPanning] = React.useState(false)

  const externalLoading = !!props.loading
  const effectiveLoading = externalLoading || internalLoading
  const effectiveError = props.error || internalError
  const urlPending = !!url && cleanPdfUrl(url) !== renderedUrlRef.current

  const clampZoom = React.useCallback((value: number) => clampInt(value, 25, 400), [])
  const clampPage = React.useCallback((value: number) => clampInt(value, 1, Math.max(1, pageCount || 1)), [pageCount])
  const pageStep = twoPageView ? 2 : 1
  const getTwoPageStart = React.useCallback((page: number, total: number): number => {
    const maxPage = Math.max(1, total || 1)
    const current = clampInt(page, 1, maxPage)

    // In vista affiancata la pagina corrente deve restare sempre visibile.
    // Se l'utente attiva la vista dalla pagina finale, non mostriamo una pagina singola:
    // arretriamo di una pagina e visualizziamo l'ultima coppia disponibile.
    if (maxPage <= 1) return current
    if (current >= maxPage) return maxPage - 1
    return current
  }, [])
  const visiblePages = React.useMemo(() => {
    const maxPage = Math.max(1, pageCount || 1)
    const first = clampInt(pageNumber, 1, maxPage)
    if (!twoPageView || pageCount <= 1) return [first]
    const spreadStart = getTwoPageStart(first, pageCount)
    return [spreadStart, Math.min(pageCount, spreadStart + 1)]
  }, [getTwoPageStart, pageCount, pageNumber, twoPageView])

  React.useEffect(() => {
    setZoomInput(String(zoom))
  }, [zoom])

  React.useEffect(() => {
    setPageInput(String(pageNumber))
  }, [pageNumber])

  React.useEffect(() => {
    let cancelled = false
    const src = cleanPdfUrl(url)

    try { renderTaskRef.current.forEach(task => task?.cancel?.()) } catch {}
    renderTaskRef.current = []

    const previousDoc = pdfDocRef.current
    pdfDocRef.current = null
    setPdfDoc(null)
    setPageCount(0)
    setPageNumber(1)
    setInternalError(null)

    if (!src) {
      setInternalLoading(false)
      try { previousDoc?.destroy?.() } catch {}
      return () => { cancelled = true }
    }

    setInternalLoading(true)
    ;(async () => {
      try {
        const pdfjs = await loadPdfJs()
        if (cancelled) return
        const loadingTask = pdfjs.getDocument({ url: src })
        const timeout = new Promise((_, reject) => window.setTimeout(() => reject(new Error('Timeout caricamento PDF.')), 15000))
        const doc = await Promise.race([loadingTask.promise, timeout])
        if (cancelled) {
          try { doc?.destroy?.() } catch {}
          return
        }

        const totalPages = Number(doc.numPages || 0)

        if (cancelled) {
          try { doc?.destroy?.() } catch {}
          return
        }

        try { previousDoc?.destroy?.() } catch {}
        pdfDocRef.current = doc
        pageScrollAfterRenderRef.current = 'top'
        renderedUrlRef.current = cleanPdfUrl(src)

        // Apertura al 100% relativo alla massima altezza disponibile.
        // La base reale viene calcolata appena il contenitore è misurabile.
        setZoom(100)
        setFitBaseZoom(100)
        setPageCount(totalPages)
        setPageNumber(1)
        setFitReady(false)
        setPdfDoc(doc)
      } catch (ex: any) {
        if (!cancelled) setInternalError(ex?.message || String(ex))
      } finally {
        if (!cancelled) setInternalLoading(false)
      }
    })()

    return () => {
      cancelled = true
      try { renderTaskRef.current.forEach(task => task?.cancel?.()) } catch {}
      renderTaskRef.current = []
    }
  }, [url])

  const computeFitBaseZoom = React.useCallback(async (modeOverride?: 'height' | 'width'): Promise<number> => {
    const doc = pdfDocRef.current || pdfDoc
    const host = pageHostRef.current
    if (!doc || !host) return 100

    try {
      const mode = modeOverride || fitMode
      const pages = visiblePages.length > 0 ? visiblePages : [pageNumber]
      const viewports = await Promise.all(pages.map(async n => {
        const page = await doc.getPage(n)
        return page.getViewport({ scale: 1 })
      }))

      const gap = pages.length > 1 ? 18 : 0
      const totalWidth = viewports.reduce((sum, vp) => sum + vp.width, 0) + gap
      const maxHeight = viewports.reduce((max, vp) => Math.max(max, vp.height), 0)

      const rect = host.getBoundingClientRect()
      const cs = window.getComputedStyle(host)
      const padX = (parseFloat(cs.paddingLeft || '0') || 0) + (parseFloat(cs.paddingRight || '0') || 0)
      const padY = (parseFloat(cs.paddingTop || '0') || 0) + (parseFloat(cs.paddingBottom || '0') || 0)
      const availableWidth = Math.max(80, rect.width - padX)
      const availableHeight = Math.max(80, rect.height - padY)

      // Nel nostro viewer 100% è relativo alla modalità scelta:
      // - altezza: pagina adattata alla massima altezza visibile;
      // - larghezza: pagina/coppia di pagine adattata alla massima larghezza visibile.
      const fitByHeight = (availableHeight / Math.max(1, maxHeight)) * 100
      const fitByWidth = (availableWidth / Math.max(1, totalWidth)) * 100
      return Math.max(1, Math.floor(mode === 'width' ? fitByWidth : fitByHeight))
    } catch {
      return 100
    }
  }, [fitMode, pageNumber, pdfDoc, visiblePages])

  const recomputeFitBaseZoom = React.useCallback(async () => {
    const nextBase = await computeFitBaseZoom()
    setFitBaseZoom(nextBase)
  }, [computeFitBaseZoom])

  const applyFitMode = React.useCallback(async (mode: 'height' | 'width') => {
    setFitMode(mode)
    const nextBase = await computeFitBaseZoom(mode)
    setFitBaseZoom(nextBase)
    setZoom(100)
    pageScrollAfterRenderRef.current = 'top'
    window.setTimeout(() => {
      const h = pageHostRef.current
      if (!h) return
      h.scrollLeft = 0
      h.scrollTop = 0
    }, 0)
  }, [computeFitBaseZoom])

  React.useEffect(() => {
    if (!pdfDoc || effectiveLoading || effectiveError) return
    const t = window.setTimeout(() => { void recomputeFitBaseZoom() }, 0)
    return () => { window.clearTimeout(t) }
  }, [effectiveError, effectiveLoading, pdfDoc, recomputeFitBaseZoom, visiblePages])

  React.useEffect(() => {
    if (!pdfDoc) return
    const onResize = () => { void recomputeFitBaseZoom() }
    window.addEventListener('resize', onResize)
    return () => { window.removeEventListener('resize', onResize) }
  }, [pdfDoc, recomputeFitBaseZoom])

  React.useEffect(() => {
    const doc = pdfDocRef.current || pdfDoc
    const canvases = [canvasRef.current, canvasSecondRef.current]
    if (!doc || !canvases[0] || effectiveLoading || effectiveError) return

    let cancelled = false
    ;(async () => {
      try {
        try { renderTaskRef.current.forEach(task => task?.cancel?.()) } catch {}
        renderTaskRef.current = []
        const dpr = Math.max(1, Math.min(2.5, window.devicePixelRatio || 1))
        const scale = (Math.max(1, fitBaseZoom) / 100) * (clampZoom(zoom) / 100)

        await Promise.all(visiblePages.map(async (pageNo, idx) => {
          const canvas = canvases[idx]
          if (!canvas) return
          const page = await doc.getPage(pageNo)
          if (cancelled) return
          const viewport = page.getViewport({ scale })
          const ctx = canvas.getContext('2d')
          if (!ctx) return

          canvas.width = Math.max(1, Math.floor(viewport.width * dpr))
          canvas.height = Math.max(1, Math.floor(viewport.height * dpr))
          canvas.style.width = `${Math.floor(viewport.width)}px`
          canvas.style.height = `${Math.floor(viewport.height)}px`
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
          ctx.clearRect(0, 0, viewport.width, viewport.height)

          const task = page.render({ canvasContext: ctx, viewport })
          renderTaskRef.current[idx] = task
          await task.promise
        }))

        if (!cancelled) {
          setFitReady(true)
          const scrollMode = pageScrollAfterRenderRef.current
          if (scrollMode) {
            pageScrollAfterRenderRef.current = null
            window.setTimeout(() => {
              const host = pageHostRef.current
              if (!host) return
              if (scrollMode === 'top') host.scrollTop = 0
              else host.scrollTop = Math.max(0, host.scrollHeight - host.clientHeight)
            }, 0)
          }
        }
      } catch (ex: any) {
        const name = String(ex?.name || '')
        if (!cancelled && name !== 'RenderingCancelledException') setInternalError(ex?.message || String(ex))
      }
    })()

    return () => {
      cancelled = true
      try { renderTaskRef.current.forEach(task => task?.cancel?.()) } catch {}
      renderTaskRef.current = []
    }
  }, [clampZoom, effectiveError, effectiveLoading, fitBaseZoom, pdfDoc, visiblePages, zoom])

  React.useEffect(() => {
    return () => {
      try { renderTaskRef.current.forEach(task => task?.cancel?.()) } catch {}
      renderTaskRef.current = []
      try { pdfDocRef.current?.destroy?.() } catch {}
    }
  }, [])

  const commitZoomInput = React.useCallback(() => {
    const raw = String(zoomInput || '').trim().replace(',', '.')
    if (!raw) {
      setZoomInput(String(zoom))
      return
    }
    const next = clampZoom(Number(raw))
    setZoom(next)
    setZoomInput(String(next))
  }, [clampZoom, zoom, zoomInput])

  const commitPageInput = React.useCallback(() => {
    const raw = String(pageInput || '').trim()
    if (!raw) {
      setPageInput(String(pageNumber))
      return
    }
    const next = clampPage(Number(raw))
    setPageNumber(next)
    setPageInput(String(next))
  }, [clampPage, pageInput, pageNumber])

  const onDownload = React.useCallback(() => {
    if (!url) return
    if (props.onDownload) props.onDownload()
    else downloadPdfUrl(url, fileName)
  }, [fileName, props, url])

  const onPrint = React.useCallback(() => {
    if (!url) return
    printPdfUrl(url)
  }, [url])

  const onFullscreen = React.useCallback(async () => {
    try {
      const el = viewerRef.current
      if (!el) return
      const docAny = document as any
      const currentFs = document.fullscreenElement || docAny.webkitFullscreenElement || docAny.msFullscreenElement
      if (currentFs === el) {
        if (document.exitFullscreen) await document.exitFullscreen()
        else if (docAny.webkitExitFullscreen) await docAny.webkitExitFullscreen()
        else if (docAny.msExitFullscreen) await docAny.msExitFullscreen()
        return
      }
      const req = (el as any).requestFullscreen || (el as any).webkitRequestFullscreen || (el as any).msRequestFullscreen
      if (req) await req.call(el)
    } catch {}
  }, [])

  const showToolbar = !!url && !effectiveLoading && !effectiveError && !!pdfDoc
  const canPrev = pageNumber > 1
  const canNext = pageCount > 0 && (twoPageView ? pageNumber + pageStep <= pageCount : pageNumber < pageCount)

  const onMainWheel = React.useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (!pdfDoc || effectiveLoading || effectiveError) return

    if (e.shiftKey) {
      e.preventDefault()
      e.stopPropagation()
      setZoom(v => clampZoom(v + (e.deltaY < 0 ? 10 : -10)))
      return
    }

    const host = pageHostRef.current
    if (!host || pageCount <= 1) return

    const tolerance = 4
    const atTop = host.scrollTop <= tolerance
    const atBottom = host.scrollTop + host.clientHeight >= host.scrollHeight - tolerance

    if (e.deltaY > 0 && atBottom && canNext) {
      e.preventDefault()
      pageScrollAfterRenderRef.current = 'top'
      setPageNumber(v => clampPage(v + pageStep))
      return
    }

    if (e.deltaY < 0 && atTop && canPrev) {
      e.preventDefault()
      pageScrollAfterRenderRef.current = 'bottom'
      setPageNumber(v => clampPage(v - pageStep))
    }
  }, [canNext, canPrev, clampPage, clampZoom, effectiveError, effectiveLoading, pageCount, pageStep, pdfDoc])

  const onPanStart = React.useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!pdfDoc || effectiveLoading || effectiveError || e.button !== 0) return
    const host = pageHostRef.current
    if (!host) return

    panStateRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      scrollLeft: host.scrollLeft,
      scrollTop: host.scrollTop
    }
    setIsPanning(true)

    try { host.setPointerCapture(e.pointerId) } catch {}
    e.preventDefault()
  }, [effectiveError, effectiveLoading, pdfDoc])

  const onPanMove = React.useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const pan = panStateRef.current
    const host = pageHostRef.current
    if (!pan || !host || pan.pointerId !== e.pointerId) return

    host.scrollLeft = pan.scrollLeft - (e.clientX - pan.startX)
    host.scrollTop = pan.scrollTop - (e.clientY - pan.startY)
    e.preventDefault()
  }, [])

  const endPan = React.useCallback((pointerId?: number) => {
    const pan = panStateRef.current
    const host = pageHostRef.current
    if (!pan) return
    if (pointerId != null && pan.pointerId !== pointerId) return

    try { host?.releasePointerCapture?.(pan.pointerId) } catch {}
    panStateRef.current = null
    setIsPanning(false)
  }, [])

  React.useEffect(() => {
    const onWindowPointerUp = () => { endPan() }
    window.addEventListener('pointerup', onWindowPointerUp)
    window.addEventListener('pointercancel', onWindowPointerUp)
    return () => {
      window.removeEventListener('pointerup', onWindowPointerUp)
      window.removeEventListener('pointercancel', onWindowPointerUp)
    }
  }, [endPan])

  return (
    <div
      ref={viewerRef}
      style={{
        width: '100%',
        height: '100%',
        minWidth: 0,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        boxSizing: 'border-box',
        borderRadius: 12,
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.12)',
        background: '#282828',
        color: '#fff',
        ...(props.style || {})
      }}
    >
      {(props.title || props.subtitle) && (
        <div style={{ flex: '0 0 auto', width: '100%', boxSizing: 'border-box', padding: props.subtitle ? '6px 14px 7px' : '7px 14px', background: '#282828', borderBottom: '1px solid rgba(255,255,255,0.12)', color: '#fff', textAlign: 'center', lineHeight: 1.2 }}>
          {props.title && <div style={{ fontSize: 12, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{props.title}</div>}
          {props.subtitle && <div style={{ marginTop: 2, fontSize: 10, color: 'rgba(255,255,255,0.78)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{props.subtitle}</div>}
        </div>
      )}
      <div style={{ flex: '1 1 0', width: '100%', maxWidth: '100%', minWidth: 0, minHeight: 0, display: 'flex', background: '#282828', overflow: 'hidden', boxSizing: 'border-box' }}>
        {showToolbar && pageCount > 1 && (
          <div style={{ flex: '0 0 124px', width: 124, maxWidth: 124, minWidth: 124, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: 10, boxSizing: 'border-box', borderRight: '1px solid rgba(255,255,255,0.12)', background: '#1f1f1f' }}>
            <div style={{ display: 'grid', gap: 9 }}>
              {Array.from({ length: pageCount }, (_, i) => i + 1).map(n => (
                <PdfPageThumbnail
                  key={n}
                  pdfDoc={pdfDoc}
                  pageNumber={n}
                  active={visiblePages.includes(n)}
                  onSelect={() => setPageNumber(n)}
                />
              ))}
            </div>
          </div>
        )}
        <div
          ref={pageHostRef}
          onWheel={onMainWheel}
          onPointerDown={onPanStart}
          onPointerMove={onPanMove}
          onPointerUp={(e) => endPan(e.pointerId)}
          onPointerCancel={(e) => endPan(e.pointerId)}
          style={{ flex: '1 1 0', width: 0, maxWidth: '100%', minWidth: 0, minHeight: 0, position: 'relative', background: '#282828', overflow: 'auto', padding: 12, cursor: isPanning ? 'grabbing' : 'grab', userSelect: 'none', touchAction: 'none', boxSizing: 'border-box', overscrollBehavior: 'contain' as any }}
          title='Trascina per spostarti; scorri per cambiare pagina; usa Shift + rotellina per lo zoom'
        >
          {(effectiveLoading || urlPending || !fitReady) && !effectiveError && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.76)', fontSize: 14, pointerEvents: 'none' }}>Generazione anteprima…</div>}
          {!effectiveLoading && effectiveError && <div style={{ color: '#fca5a5', fontSize: 14, padding: 20, textAlign: 'center' }}>{effectiveError}</div>}
          {!effectiveLoading && !effectiveError && !url && <div style={{ color: 'rgba(255,255,255,0.64)', fontSize: 14, padding: 20, textAlign: 'center' }}>{props.emptyText || 'Nessun dato disponibile per l\'anteprima.'}</div>}
          {!effectiveLoading && !effectiveError && url && (
            <div style={{ width: 'max-content', minWidth: '100%', minHeight: '100%', display: fitReady ? 'flex' : 'none', alignItems: 'center', justifyContent: 'center', gap: 18, boxSizing: 'border-box' }}>
              <canvas ref={canvasRef} style={{ display: 'block', flex: '0 0 auto', background: '#fff', boxShadow: '0 0 18px rgba(0,0,0,0.50)' }} />
              {twoPageView && visiblePages.length > 1 && <canvas ref={canvasSecondRef} style={{ display: 'block', flex: '0 0 auto', background: '#fff', boxShadow: '0 0 18px rgba(0,0,0,0.50)' }} />}
            </div>
          )}
        </div>
      </div>

      {showToolbar && (
        <div style={{ flex: '0 0 auto', alignSelf: 'stretch', width: '100%', maxWidth: '100%', minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap', padding: '9px 12px', background: '#3c3c3c', color: '#fff', boxSizing: 'border-box', overflowX: 'auto', overflowY: 'hidden', position: 'relative', zIndex: 2 }}>
          <button type='button' disabled={!canPrev} onClick={() => setPageNumber(v => clampPage(v - pageStep))} style={{ ...btnStyle, opacity: canPrev ? 1 : 0.45, cursor: canPrev ? 'pointer' : 'not-allowed' }} title='Pagina precedente'>‹</button>
          <span style={{ fontSize: 12, fontWeight: 800 }}>Pagina</span>
          <input
            type='text'
            inputMode='numeric'
            value={pageInput}
            onChange={(e) => setPageInput(e.currentTarget.value.replace(/[^0-9]/g, ''))}
            onBlur={commitPageInput}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); commitPageInput() }
              else if (e.key === 'Escape') setPageInput(String(pageNumber))
            }}
            style={inputStyle}
            title='Numero pagina'
          />
          <span style={{ fontSize: 12, fontWeight: 800 }}>di {pageCount || 1}</span>
          <button type='button' disabled={!canNext} onClick={() => setPageNumber(v => clampPage(v + pageStep))} style={{ ...btnStyle, opacity: canNext ? 1 : 0.45, cursor: canNext ? 'pointer' : 'not-allowed' }} title='Pagina successiva'>›</button>

          <button
            type='button'
            onClick={() => {
              setTwoPageView(v => {
                const next = !v
                if (next) {
                  setPageNumber(current => getTwoPageStart(current, pageCount))
                }
                pageScrollAfterRenderRef.current = 'top'
                return next
              })
            }}
            style={{ ...btnStyle, width: 34, minWidth: 34, padding: 0 }}
            title={twoPageView ? 'Passa alla vista a pagina singola' : 'Passa alla vista a pagine affiancate'}
            aria-label={twoPageView ? 'Passa alla vista a pagina singola' : 'Passa alla vista a pagine affiancate'}
          >
            {twoPageView ? (
              <svg width='18' height='18' viewBox='0 0 24 24' aria-hidden='true' focusable='false'>
                <rect x='7' y='4' width='10' height='16' rx='1.4' fill='none' stroke='currentColor' strokeWidth='1.8' />
                <path d='M10 7h4M10 10h4M10 13h4M10 16h3' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
              </svg>
            ) : (
              <svg width='18' height='18' viewBox='0 0 24 24' aria-hidden='true' focusable='false'>
                <rect x='4' y='5' width='7' height='14' rx='1.2' fill='none' stroke='currentColor' strokeWidth='1.8' />
                <rect x='13' y='5' width='7' height='14' rx='1.2' fill='none' stroke='currentColor' strokeWidth='1.8' />
                <path d='M6.5 8h2M6.5 11h2M6.5 14h2M15.5 8h2M15.5 11h2M15.5 14h2' fill='none' stroke='currentColor' strokeWidth='1.35' strokeLinecap='round' />
              </svg>
            )}
          </button>

          <span style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.18)' }} />

          <span style={{ fontSize: 12, fontWeight: 800 }}>Zoom</span>
          <input
            type='text'
            inputMode='numeric'
            value={zoomInput}
            onChange={(e) => setZoomInput(e.currentTarget.value.replace(/[^0-9]/g, ''))}
            onBlur={commitZoomInput}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); commitZoomInput() }
              else if (e.key === 'Escape') setZoomInput(String(zoom))
            }}
            style={{ ...inputStyle, width: 62 }}
            title='Percentuale zoom'
          />
          <span style={{ fontSize: 12, fontWeight: 800 }}>%</span>
          <button type='button' onClick={() => setZoom(v => clampZoom(v - 10))} style={btnStyle} title='Riduci zoom'>−</button>
          <input
            type='range'
            min={25}
            max={400}
            step={5}
            value={zoom}
            onChange={(e) => setZoom(clampZoom(Number(e.currentTarget.value)))}
            style={{ width: 160, maxWidth: '32vw' }}
            aria-label='Zoom PDF'
          />
          <button type='button' onClick={() => setZoom(v => clampZoom(v + 10))} style={btnStyle} title='Aumenta zoom'>+</button>
          <button
            type='button'
            onClick={() => { void applyFitMode('height') }}
            style={{ ...btnStyle, width: 34, minWidth: 34, padding: 0 }}
            title='Adatta alla massima altezza visibile'
            aria-label='Adatta altezza'
          >
            <svg width='18' height='18' viewBox='0 0 24 24' aria-hidden='true' focusable='false'>
              <path d='M7 4.5h10M7 19.5h10' fill='none' stroke='currentColor' strokeWidth='1.9' strokeLinecap='round' />
              <path d='M12 7.2v9.6' fill='none' stroke='currentColor' strokeWidth='1.9' strokeLinecap='round' />
              <path d='M9.4 9.6 12 7l2.6 2.6M9.4 14.4 12 17l2.6-2.6' fill='none' stroke='currentColor' strokeWidth='1.9' strokeLinecap='round' strokeLinejoin='round' />
            </svg>
          </button>
          <button
            type='button'
            onClick={() => { void applyFitMode('width') }}
            style={{ ...btnStyle, width: 34, minWidth: 34, padding: 0 }}
            title='Adatta alla massima larghezza visibile'
            aria-label='Adatta larghezza'
          >
            <svg width='18' height='18' viewBox='0 0 24 24' aria-hidden='true' focusable='false'>
              <path d='M4.5 7v10M19.5 7v10' fill='none' stroke='currentColor' strokeWidth='1.9' strokeLinecap='round' />
              <path d='M7.2 12h9.6' fill='none' stroke='currentColor' strokeWidth='1.9' strokeLinecap='round' />
              <path d='M9.6 9.4 7 12l2.6 2.6M14.4 9.4 17 12l-2.6 2.6' fill='none' stroke='currentColor' strokeWidth='1.9' strokeLinecap='round' strokeLinejoin='round' />
            </svg>
          </button>

          <span style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.18)' }} />

          <button
            type='button'
            onClick={onDownload}
            style={{ ...btnStyle, width: 34, minWidth: 34, padding: 0 }}
            title='Scarica PDF'
            aria-label='Scarica PDF'
          >
            <svg width='18' height='18' viewBox='0 0 24 24' aria-hidden='true' focusable='false'>
              <path d='M12 4v10' fill='none' stroke='currentColor' strokeWidth='1.9' strokeLinecap='round' />
              <path d='M8.5 10.5 12 14l3.5-3.5' fill='none' stroke='currentColor' strokeWidth='1.9' strokeLinecap='round' strokeLinejoin='round' />
              <path d='M5.5 18.5h13' fill='none' stroke='currentColor' strokeWidth='1.9' strokeLinecap='round' />
            </svg>
          </button>
          <button
            type='button'
            onClick={onPrint}
            style={{ ...btnStyle, width: 34, minWidth: 34, padding: 0 }}
            title='Stampa PDF'
            aria-label='Stampa PDF'
          >
            <svg width='18' height='18' viewBox='0 0 24 24' aria-hidden='true' focusable='false'>
              <path d='M7 8V4.5h10V8' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' />
              <path d='M7 17H5.5A2.5 2.5 0 0 1 3 14.5V11a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v3.5A2.5 2.5 0 0 1 18.5 17H17' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' />
              <path d='M7 14h10v5.5H7z' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinejoin='round' />
              <path d='M17.5 11.5h.01' fill='none' stroke='currentColor' strokeWidth='2.4' strokeLinecap='round' />
            </svg>
          </button>
          <button
            type='button'
            onClick={() => { void onFullscreen() }}
            style={{ ...btnStyle, width: 34, minWidth: 34, padding: 0 }}
            title='Schermo intero'
            aria-label='Schermo intero'
          >
            <svg width='18' height='18' viewBox='0 0 24 24' aria-hidden='true' focusable='false'>
              <path d='M8.5 4.5h-4v4M15.5 4.5h4v4M8.5 19.5h-4v-4M15.5 19.5h4v-4' fill='none' stroke='currentColor' strokeWidth='1.9' strokeLinecap='round' strokeLinejoin='round' />
              <path d='M4.5 8.5 9 4.5M19.5 8.5 15 4.5M4.5 15.5 9 19.5M19.5 15.5 15 19.5' fill='none' stroke='currentColor' strokeWidth='1.9' strokeLinecap='round' strokeLinejoin='round' />
            </svg>
          </button>
          {props.onClose && (
            <button type='button' onClick={props.onClose} style={closeBtnStyle} title='Chiudi anteprima'>
              <span style={closeBtnTextStyle}>Chiudi</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  minWidth: 30,
  height: 30,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 12,
  fontWeight: 800,
  color: '#fff',
  background: '#3b3b3b',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 8,
  padding: '0 12px',
  cursor: 'pointer'
}

const closeBtnStyle: React.CSSProperties = {
  ...btnStyle,
  background: '#1d4ed8',
  border: '1px solid #1d4ed8'
}

const closeBtnTextStyle: React.CSSProperties = {
  display: 'inline-block',
  transform: 'translate(-1px, 2px)'
}

const inputStyle: React.CSSProperties = {
  width: 48,
  height: 30,
  padding: '0 6px',
  textAlign: 'right',
  fontSize: 12,
  fontWeight: 800,
  color: '#fff',
  background: '#3b3b3b',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 8,
  boxSizing: 'border-box'
}
