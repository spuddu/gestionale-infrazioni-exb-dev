/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx, type AllWidgetProps } from 'jimu-core'
import type { IMConfig } from '../config'
import { GiiPageTitle } from '../../../_shared/gii-ui/page-title'
import {
  GUIDE_CHAPTERS,
  GUIDE_QUICK_LINKS,
  GUIDE_VERSION,
  type GuideBlock,
  type GuideChapter,
  type GuideRole
} from './guide-content'
import { GUIDE_FIGURES } from './guide-figures'
import { getGuideStepHelp } from './guide-step-help'

const { Fragment, useEffect, useMemo, useRef, useState } = React

type PanelMode = 'index' | 'quick'
type SearchHit = {
  key: string
  chapterId: string
  anchorId?: string
  title: string
  context: string
  score: number
}

const ROLE_LABELS: Record<string, string> = {
  TR: 'Tecnico rilevatore',
  IT: 'Istruttore tecnico',
  CS: 'Capo Settore',
  RIT: 'Responsabile dell’istruttoria tecnica',
  DT: 'Direttore Aree Agraria e Tecnica',
  IA: 'Istruttore amministrativo',
  RIA: 'Responsabile dell’istruttoria amministrativa',
  DA: 'Direttore Area AA.GG. e P.F.',
  ADMIN: 'Amministratore del sistema'
}

const ROLE_ORDER = ['TR', 'IT', 'CS', 'RIT', 'DT', 'IA', 'RIA', 'DA', 'ADMIN']

function FigureIcon (): React.ReactElement {
  return (
    <svg
      width='18'
      height='18'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.8'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden='true'
      focusable='false'
    >
      <rect x='3' y='4' width='18' height='16' rx='2' />
      <circle cx='8.5' cy='9' r='1.5' />
      <path d='M4.5 18l5-5 3.5 3.5 2.5-2.5 4 4' />
    </svg>
  )
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

function stripAccents(value: string): string {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function norm(value: string): string {
  return stripAccents(value).toLowerCase().replace(/\s+/g, ' ').trim()
}

function getCurrentRoles(): string[] {
  try {
    const cached: any = (window as any).__giiUserRole
    if (!cached) return []
    const out = new Set<string>()
    const add = (v: any) => {
      const s = String(v || '').trim().toUpperCase().replace(/[\s-]+/g, '_')
      if (ROLE_ORDER.includes(s)) out.add(s)
      if (s === 'ADMIN') out.add('ADMIN')
    }
    add(cached.ruoloCod ?? cached.ruolo_cod ?? cached.profiloCod ?? cached.profilo_cod)
    if (cached.isAdmin || cached.isWorkflowAdmin) out.add('ADMIN')
    const assignments = Array.isArray(cached.assignments) ? cached.assignments : []
    assignments.forEach((a: any) => add(a?.ruoloCod ?? a?.ruolo_cod ?? a?.profiloCod ?? a?.profilo_cod))
    return Array.from(out)
  } catch {
    return []
  }
}

function chapterMatchesRole(chapter: GuideChapter, role: string): boolean {
  if (!role) return true
  const roles = chapter.roles || ['*']
  return roles.includes('*') || roles.includes(role as GuideRole)
}

function blockText(block: GuideBlock): string {
  if (block.type === 'table') return [block.headers.join(' '), ...block.rows.map(r => r.join(' '))].join(' ')
  if (block.type === 'callout') return `${block.title} ${block.text}`
  return block.text
}

function trimSnippet(text: string, query: string, max = 180): string {
  const clean = String(text || '').replace(/\s+/g, ' ').trim()
  if (!clean || clean.length <= max) return clean
  const q = norm(query)
  const n = norm(clean)
  const idx = q ? n.indexOf(q) : -1
  const start = idx > 45 ? idx - 45 : 0
  const raw = clean.slice(start, start + max)
  return `${start > 0 ? '…' : ''}${raw}${start + max < clean.length ? '…' : ''}`
}

function buildSearchHits(chapters: GuideChapter[], query: string): SearchHit[] {
  const q = norm(query)
  if (q.length < 2) return []
  const terms = q.split(' ').filter(Boolean)
  const hits: SearchHit[] = []
  chapters.forEach((chapter) => {
    const chapterNorm = norm(chapter.title)
    if (terms.every(t => chapterNorm.includes(t))) {
      hits.push({
        key: `${chapter.id}:chapter`,
        chapterId: chapter.id,
        title: chapter.title,
        context: 'Capitolo',
        score: 120
      })
    }
    let currentHeading = chapter.title
    let currentAnchor: string | undefined
    chapter.blocks.forEach((block, index) => {
      if (block.type === 'heading2' || block.type === 'heading3') {
        currentHeading = block.text
        currentAnchor = block.id
      }
      const text = blockText(block)
      const n = norm(text)
      if (!n || !terms.every(t => n.includes(t))) return
      let score = 20
      if (block.type === 'heading2' || block.type === 'heading3') score += 70
      if (n.startsWith(q)) score += 25
      if (n.includes(q)) score += 20
      hits.push({
        key: `${chapter.id}:${index}`,
        chapterId: chapter.id,
        anchorId: block.type === 'heading2' || block.type === 'heading3' ? block.id : currentAnchor,
        title: block.type === 'heading2' || block.type === 'heading3' ? block.text : currentHeading,
        context: trimSnippet(text, query),
        score
      })
    })
  })
  const seen = new Set<string>()
  return hits
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, 'it'))
    .filter((h) => {
      const k = `${h.chapterId}|${h.anchorId || ''}|${h.title}|${h.context}`
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
    .slice(0, 80)
}

function roleBadges(chapter: GuideChapter, accent: string): React.ReactNode {
  const roles = chapter.roles || []
  if (roles.includes('*')) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
      {roles.filter(r => r !== '*').map(r => (
        <span key={r} style={{
          fontSize: 12.5,
          fontWeight: 700,
          lineHeight: 1,
          padding: '4px 6px',
          borderRadius: 999,
          color: accent,
          background: `${accent}10`,
          border: `1px solid ${accent}28`
        }}>{ROLE_LABELS[r] || r}</span>
      ))}
    </div>
  )
}

function SearchIcon(): React.ReactElement {
  return <svg viewBox='0 0 24 24' width='17' height='17' fill='none' stroke='currentColor' strokeWidth='1.9' strokeLinecap='round'><circle cx='11' cy='11' r='7'/><line x1='16.3' y1='16.3' x2='21' y2='21'/></svg>
}

function Chevron({ open }: { open: boolean }): React.ReactElement {
  return <svg viewBox='0 0 20 20' width='15' height='15' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s ease' }}><polyline points='7 4 13 10 7 16'/></svg>
}

function Arrow({ dir }: { dir: 'left' | 'right' }): React.ReactElement {
  return <svg viewBox='0 0 20 20' width='15' height='15' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' style={{ transform: dir === 'left' ? 'rotate(180deg)' : undefined }}><line x1='4' y1='10' x2='16' y2='10'/><polyline points='11 5 16 10 11 15'/></svg>
}

export default function Widget(props: AllWidgetProps<IMConfig>): React.ReactElement {
  const cfg: any = props.config || {}
  const title = String(cfg.title || 'Guida operativa')
  const subtitle = String(cfg.subtitle || "Procedure e riferimenti per l'utilizzo del Gestionale Infrazioni Irrigue")
  const accent = String(cfg.accentColor || '#1F4E79')
  const titleColor = String(cfg.titleColor || '#1F4E79')
  const titleDividerColor = String(cfg.titleDividerColor || '#1F4E79')
  const titleDividerWidth = Math.max(0, Number(cfg.titleDividerWidth ?? 2))
  const titleIconSize = Math.max(16, Number(cfg.titleIconSize ?? 26))
  const textColor = String(cfg.textColor || '#1f2937')
  const configuredMutedColor = String(cfg.mutedColor || '#475569')
  const mutedColor = configuredMutedColor.toLowerCase() === '#64748b' ? '#475569' : configuredMutedColor
  const leftBg = String(cfg.leftPanelBackgroundColor || '#ffffff')
  const contentBg = String(cfg.contentBackgroundColor || '#ffffff')
  const borderColor = String(cfg.panelBorderColor || '#c5d9f1')
  const panelBorderWidth = Math.max(0, cfg.panelBorderWidth == null ? 1 : Number(cfg.panelBorderWidth))
  const headerBg = String(cfg.panelHeaderBackgroundColor || '#f5f9ff')
  const separatorColor = String(cfg.separatorColor || '#dbe7f4')
  const separatorWidth = Math.max(1, cfg.separatorWidth == null ? 1 : Number(cfg.separatorWidth))
  const radius = cfg.panelRadius == null ? 8 : Number(cfg.panelRadius)
  const splitterColor = String(cfg.splitterColor || '#3d77c9')
  const splitterWidth = cfg.splitterWidth == null ? 2 : Number(cfg.splitterWidth)
  const showRoleFilter = cfg.showRoleFilter !== false
  const showVersion = cfg.showVersion !== false
  const searchPlaceholder = String(cfg.searchPlaceholder || 'Cerca nella guida…')
  const manualDownloadUrl = String(cfg.manualDownloadUrl || '').trim()
  const titleFontSize = clamp(Number(cfg.titleFontSize ?? 22), 16, 40)
  const bodyFontSize = clamp(Number(cfg.bodyFontSize ?? 15), 12, 22)
  const indexFontSize = clamp(Number(cfg.indexFontSize ?? 14), 11, 20)
  const subtitleFontSize = Math.max(10, Number(cfg.subtitleFontSize ?? Math.max(12, bodyFontSize - 1)))
  const subtitleColor = String(cfg.subtitleColor || mutedColor)
  const chapterTitleFontSize = bodyFontSize + 10
  const heading2FontSize = bodyFontSize + 5
  const heading3FontSize = bodyFontSize + 2
  const leadFontSize = bodyFontSize + 1
  const tableFontSize = Math.max(12, bodyFontSize - 1)
  const secondaryFontSize = Math.max(13, indexFontSize - 1)
  const contentPaddingTop = Number(cfg.contentPaddingTop ?? 18)
  const contentPaddingRight = Number(cfg.contentPaddingRight ?? 22)
  const contentPaddingBottom = Number(cfg.contentPaddingBottom ?? 22)
  const contentPaddingLeft = Number(cfg.contentPaddingLeft ?? 22)
  const contentPadding = `${contentPaddingTop}px ${contentPaddingRight}px ${contentPaddingBottom}px ${contentPaddingLeft}px`
  // Il salto esplicito dall'indice porta il titolo quasi in cima.
  // Lo ScrollSpy manuale usa una linea anticipata ma non troppo bassa: circa il
  // 15% dell'altezza del pannello. In questo modo il titolo di sezione si attiva
  // quando è ancora ben visibile, ma tornando verso l'alto resta nuovamente
  // raggiungibile anche l'introduzione / titolo principale del capitolo.
  const scrollTargetOffsetPx = 12
  const scrollSpyActivationRatio = 0.15

  const initialWidth = clamp(Number(cfg.leftColumnWidthPct || 31), 22, 48)
  const [leftWidth, setLeftWidth] = useState(initialWidth)
  const [activeChapterId, setActiveChapterId] = useState(GUIDE_CHAPTERS[0]?.id || '')
  const [panelMode, setPanelMode] = useState<PanelMode>('index')
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([GUIDE_CHAPTERS[0]?.id || '']))
  const [query, setQuery] = useState('')
  const currentRoles = useMemo(() => getCurrentRoles(), [])
  const preferredRole = currentRoles[0] || ''
  const [roleFilter, setRoleFilter] = useState<string>(() => cfg.defaultRoleMode === 'current' ? preferredRole : '')
  const [pendingAnchor, setPendingAnchor] = useState<string>('')
  const [activeAnchorId, setActiveAnchorId] = useState<string>(() => {
    const first = GUIDE_CHAPTERS[0]?.blocks.find((b: GuideBlock) => b.type === 'heading2')
    if (!first || !('id' in first)) return ''
    return first.id || ''
  })
  const shellRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const runwayRef = useRef<HTMLDivElement>(null)
  const leftScrollRef = useRef<HTMLDivElement>(null)
  const scrollSyncFrame = useRef<number | null>(null)
  const lastContentScrollTopRef = useRef(0)
  const activeAnchorRef = useRef(activeAnchorId)
  const programmaticAnchorRef = useRef<string>('')
  const programmaticScrollUntilRef = useRef(0)
  const dragging = useRef(false)
  const [splitterHover, setSplitterHover] = useState(false)
  const [splitterActive, setSplitterActive] = useState(false)
  const [scrollRunwayHeight, setScrollRunwayHeight] = useState(0)
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(() => new Set())

  // Spazio di scorrimento finale (scroll runway). Serve a permettere anche agli
  // ultimi paragrafi del capitolo di raggiungere la stessa linea ScrollSpy dei
  // paragrafi precedenti. Senza questo spazio, a fine pagina gli ultimi titoli
  // potrebbero non arrivare mai alla linea di attivazione.
  useEffect(() => {
    const root = contentRef.current
    if (!root) return

    let frame: number | null = null
    const updateRunway = () => {
      if (frame != null) window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => {
        frame = null
        const liveRoot = contentRef.current
        if (!liveRoot) return
        const headings = Array.from(liveRoot.querySelectorAll('[data-guide-nav-anchor]')) as HTMLElement[]
        if (!headings.length) {
          setScrollRunwayHeight(0)
          return
        }

        const rootRect = liveRoot.getBoundingClientRect()
        const lastHeading = headings[headings.length - 1]
        const lastRect = lastHeading.getBoundingClientRect()
        const lastTop = liveRoot.scrollTop + (lastRect.top - rootRect.top)
        const currentRunway = runwayRef.current?.offsetHeight || 0
        const contentHeightWithoutRunway = Math.max(0, liveRoot.scrollHeight - currentRunway)

        // Altezza minima necessaria affinché l'ultimo titolo possa arrivare a
        // scrollSpyOffsetPx dal bordo superiore del pannello. Se il contenuto
        // successivo è già sufficiente, non aggiungiamo spazio inutile.
        const needed = Math.max(0, Math.ceil(
          lastTop - (liveRoot.clientHeight * scrollSpyActivationRatio) + liveRoot.clientHeight - contentHeightWithoutRunway + 8
        ))
        setScrollRunwayHeight(prev => Math.abs(prev - needed) <= 1 ? prev : needed)
      })
    }

    updateRunway()
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateRunway) : null
    observer?.observe(root)
    window.addEventListener('resize', updateRunway)
    return () => {
      if (frame != null) window.cancelAnimationFrame(frame)
      observer?.disconnect()
      window.removeEventListener('resize', updateRunway)
    }
  }, [activeChapterId, bodyFontSize, heading2FontSize, contentPaddingTop, contentPaddingRight, contentPaddingBottom, contentPaddingLeft])

  useEffect(() => {
    if (!GUIDE_CHAPTERS.some(c => c.id === activeChapterId)) setActiveChapterId(GUIDE_CHAPTERS[0]?.id || '')
  }, [activeChapterId])

  useEffect(() => {
    activeAnchorRef.current = activeAnchorId
  }, [activeAnchorId])

  useEffect(() => {
    setExpandedSteps(new Set())
  }, [activeChapterId])

  const visibleChapters = useMemo(() => GUIDE_CHAPTERS.filter(c => chapterMatchesRole(c, roleFilter)), [roleFilter])
  const activeChapter = useMemo(() => GUIDE_CHAPTERS.find(c => c.id === activeChapterId) || GUIDE_CHAPTERS[0], [activeChapterId])
  const searchHits = useMemo(() => buildSearchHits(visibleChapters, query), [visibleChapters, query])

  useEffect(() => {
    if (!pendingAnchor) return
    const requestedAnchor = pendingAnchor
    const timer = window.setTimeout(() => {
      const root = contentRef.current
      if (!root) {
        setPendingAnchor('')
        return
      }

      if (requestedAnchor === '__TOP__') {
        root.scrollTop = 0
        lastContentScrollTopRef.current = 0
        activeAnchorRef.current = ''
        setActiveAnchorId('')
        setPendingAnchor('')
        window.requestAnimationFrame(() => window.requestAnimationFrame(() => { programmaticAnchorRef.current = '' }))
        return
      }

      const el = root.querySelector(`[data-guide-anchor="${requestedAnchor}"]`) as HTMLElement | null
      if (el) {
        const rootRect = root.getBoundingClientRect()
        const elRect = el.getBoundingClientRect()
        const targetTop = root.scrollTop + (elRect.top - rootRect.top) - scrollTargetOffsetPx
        root.scrollTop = Math.max(0, targetTop)
        lastContentScrollTopRef.current = root.scrollTop
        const wanted = programmaticAnchorRef.current
        if (wanted) { activeAnchorRef.current = wanted; setActiveAnchorId(wanted) }
      }
      setPendingAnchor('')
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => { programmaticAnchorRef.current = '' }))
    }, 0)
    return () => window.clearTimeout(timer)
  }, [activeChapterId, pendingAnchor])

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!dragging.current || !shellRef.current) return
      const rect = shellRef.current.getBoundingClientRect()
      if (!rect.width) return
      const usableWidth = Math.max(rect.width - 12, 300)
      const pct = ((e.clientX - rect.left) / usableWidth) * 100
      setLeftWidth(clamp(pct, 15, 60))
    }
    const up = () => { dragging.current = false; setSplitterActive(false); document.body.style.cursor = ''; document.body.style.userSelect = '' }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
  }, [])

  const sectionAnchorFor = (chapterId: string, anchorId?: string): string => {
    const chapter = GUIDE_CHAPTERS.find(c => c.id === chapterId)
    if (!chapter) return ''
    const headings = chapter.blocks.filter((b): b is Extract<GuideBlock, { type: 'heading2' | 'heading3' }> => b.type === 'heading2' || b.type === 'heading3')
    if (!anchorId) {
      const first = headings.find(h => h.type === 'heading2')
      if (!first) return ''
    return first.id || ''
    }
    const idx = chapter.blocks.findIndex((b: GuideBlock) => (b.type === 'heading2' || b.type === 'heading3') && b.id === anchorId)
    if (idx < 0) return ''
    for (let i = idx; i >= 0; i -= 1) {
      const b = chapter.blocks[i]
      if (b.type === 'heading2') return b.id
    }
    return ''
  }

  const resolveSectionAnchor = (chapterId: string, sourceText: string): string => {
    const chapter = GUIDE_CHAPTERS.find(c => c.id === chapterId)
    if (!chapter) return ''
    const match = String(sourceText || '').match(/Cap\.\s*(\d+)(?:\.(\d+))?/i)
    if (!match) return sectionAnchorFor(chapterId)
    if (!match[2]) return sectionAnchorFor(chapterId)
    const prefix = `${match[1]}.${match[2]}`
    const heading = chapter.blocks.find((b: GuideBlock) =>
      b.type === 'heading2' && String(b.text).trim().startsWith(prefix)
    )
    if (!heading || !('id' in heading)) return sectionAnchorFor(chapterId)
    return heading.id || sectionAnchorFor(chapterId)
  }

  const quickLinkAnchor = (q: typeof GUIDE_QUICK_LINKS[number]): string => resolveSectionAnchor(q.targetChapterId, q.description)

  const openChapter = (chapterId: string, anchorId?: string) => {
    const requestedAnchor = anchorId || ''
    const navAnchor = requestedAnchor ? sectionAnchorFor(chapterId, requestedAnchor) : ''
    programmaticAnchorRef.current = navAnchor
    programmaticScrollUntilRef.current = Date.now() + 700
    setActiveChapterId(chapterId)
    activeAnchorRef.current = navAnchor
    setActiveAnchorId(navAnchor)
    setExpanded(new Set([chapterId]))
    setPendingAnchor(requestedAnchor || '__TOP__')
  }

  const handleContentScroll = () => {
    const root = contentRef.current
    if (!root) return

    // Throttle a un aggiornamento per frame: evita raffiche di setState durante
    // wheel/trackpad e mantiene lo scrollspy legato alla posizione reale del pannello.
    if (scrollSyncFrame.current != null) return
    scrollSyncFrame.current = window.requestAnimationFrame(() => {
      scrollSyncFrame.current = null
      const liveRoot = contentRef.current
      if (!liveRoot) return

      const commitActiveAnchor = (anchorId: string) => {
        activeAnchorRef.current = anchorId
        setActiveAnchorId(prev => prev === anchorId ? prev : anchorId)
      }

      // Durante un salto esplicito dall'indice / "Come faccio a…" conserviamo
      // l'ancora richiesta finché il pannello non è stato posizionato.
      if (Date.now() < programmaticScrollUntilRef.current) {
        const wanted = programmaticAnchorRef.current
        if (wanted) commitActiveAnchor(wanted)
        return
      }

      // Il titolo principale del capitolo rappresenta l'inizio reale della pagina.
      // Se il pannello e' tornato in cima, deve prevalere sempre, anche quando
      // il primo sottoparagrafo si trova gia' sopra la linea ScrollSpy del 15%.
      if (liveRoot.scrollTop <= 2) {
        commitActiveAnchor('')
        return
      }

      const headings = Array.from(liveRoot.querySelectorAll('[data-guide-nav-anchor]')) as HTMLElement[]
      if (!headings.length) {
        commitActiveAnchor('')
        return
      }

      const rootRect = liveRoot.getBoundingClientRect()
      const activationY = liveRoot.scrollTop + (liveRoot.clientHeight * scrollSpyActivationRatio)
      let candidate = ''

      // Criterio ScrollSpy: i titoli sono ordinati dall'alto verso il basso;
      // è attiva l'ultima sezione il cui titolo ha superato la linea di
      // attivazione posta al 15% dell'altezza del pannello.
      // Finché il primo titolo non la supera resta attiva l'introduzione del capitolo.
      for (const heading of headings) {
        const rect = heading.getBoundingClientRect()
        const headingTop = liveRoot.scrollTop + (rect.top - rootRect.top)
        if (headingTop <= activationY + 0.5) {
          candidate = String(heading.dataset.guideNavAnchor || '')
        } else {
          break
        }
      }

      commitActiveAnchor(candidate)
    })
  }



  useEffect(() => {
    return () => {
      if (scrollSyncFrame.current != null) window.cancelAnimationFrame(scrollSyncFrame.current)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const host = leftScrollRef.current
      const selected = host?.querySelector('[data-guide-left-selected="true"]') as HTMLElement | null
      if (!host || !selected) return
      const hostRect = host.getBoundingClientRect()
      const selectedRect = selected.getBoundingClientRect()
      if (selectedRect.top < hostRect.top) host.scrollTop -= hostRect.top - selectedRect.top + 8
      else if (selectedRect.bottom > hostRect.bottom) host.scrollTop += selectedRect.bottom - hostRect.bottom + 8
    }, 0)
    return () => window.clearTimeout(timer)
  }, [panelMode, activeChapterId, activeAnchorId])

  const chapterIndex = GUIDE_CHAPTERS.findIndex(c => c.id === activeChapter?.id)
  const previousChapter = chapterIndex > 0 ? GUIDE_CHAPTERS[chapterIndex - 1] : null
  const nextChapter = chapterIndex >= 0 && chapterIndex < GUIDE_CHAPTERS.length - 1 ? GUIDE_CHAPTERS[chapterIndex + 1] : null

  const chapterHeadings = (chapter: GuideChapter) => chapter.blocks.filter((b): b is Extract<GuideBlock, { type: 'heading2' | 'heading3' }> => b.type === 'heading2' || b.type === 'heading3')

  const renderTextWithChapterLinks = (text: string): React.ReactNode => {
    const parts: React.ReactNode[] = []
    const re = /(Cap\.\s*(\d+)(?:\.(\d+))?)/gi
    let last = 0
    let match: RegExpExecArray | null
    while ((match = re.exec(text)) !== null) {
      if (match.index > last) parts.push(text.slice(last, match.index))
      const chapterNo = Number(match[2])
      const sectionNo = match[3]
      const target = GUIDE_CHAPTERS.find(c => c.title.startsWith(`${chapterNo}.`))
      let anchor: string | undefined
      if (target && sectionNo) {
        const prefix = `${chapterNo}.${sectionNo}`
        const h = target.blocks.find((b: any) => (b.type === 'heading2' || b.type === 'heading3') && String(b.text).startsWith(prefix)) as any
        anchor = h?.id
      }
      if (target) {
        parts.push(<button key={`${match.index}-${match[0]}`} type='button' onClick={() => openChapter(target.id, anchor)} style={{ border: 0, padding: 0, background: 'transparent', color: accent, font: 'inherit', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2 }}>{match[0]}</button>)
      } else parts.push(match[0])
      last = re.lastIndex
    }
    if (last < text.length) parts.push(text.slice(last))
    return parts.length ? parts : text
  }

  const toggleStep = (key: string) => {
    setExpandedSteps(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const renderFigureAsset = (figureKey: string, keyPrefix: string, compact = false): React.ReactNode => {
    const figure = GUIDE_FIGURES[figureKey]
    if (!figure) return null
    return (
      <figure key={`${keyPrefix}-${figureKey}`} style={{ margin: compact ? '12px 0 4px' : '18px 0 22px', padding: compact ? 8 : 10, border: `1px solid ${borderColor}`, borderRadius: Math.max(6, radius), background: '#ffffff' }}>
        <div style={{ display: 'grid', gap: 12 }}>
          {figure.images.map((image, imageIndex) => (
            <div key={`${figureKey}-${imageIndex}`} style={{ minWidth: 0 }}>
              {image.label ? <div style={{ margin: '0 0 6px', color: titleColor, fontSize: tableFontSize, fontWeight: 800 }}>{image.label}</div> : null}
              <img
                src={image.src}
                alt={image.alt}
                loading='lazy'
                draggable={false}
                style={{ display: 'block', width: '100%', height: 'auto', border: `1px solid ${borderColor}`, borderRadius: Math.max(5, radius - 2), background: '#ffffff' }}
              />
            </div>
          ))}
        </div>
        <figcaption style={{ marginTop: 9, color: mutedColor, fontSize: tableFontSize, lineHeight: 1.45, fontStyle: 'italic', fontWeight: 600 }}>
          {figure.caption}
        </figcaption>
      </figure>
    )
  }

  const renderBlocks = (blocks: GuideBlock[]) => {
    const nodes: React.ReactNode[] = []
    let i = 0
    let currentSectionTitle = ''
    while (i < blocks.length) {
      const b = blocks[i]
      if (b.type === 'step') {
        const stepStartIndex = i
        const steps: Extract<GuideBlock, { type: 'step' }>[] = []
        while (i < blocks.length && blocks[i].type === 'step') {
          steps.push(blocks[i] as Extract<GuideBlock, { type: 'step' }>)
          i += 1
        }
        nodes.push(
          <ol key={`steps-${stepStartIndex}`} style={{ listStyle: 'none', padding: 0, margin: '10px 0 18px', display: 'grid', gap: 8 }}>
            {steps.map((s, idx) => {
              const stepKey = `${activeChapter?.id || 'chapter'}:${stepStartIndex + idx}`
              const isOpen = expandedSteps.has(stepKey)
              const help = getGuideStepHelp(s.text, currentSectionTitle, activeChapter?.title || '')
              if (!help) {
                return (
                  <li key={stepKey} style={{ display: 'grid', gridTemplateColumns: '28px minmax(0,1fr)', gap: 10, alignItems: 'start', lineHeight: 1.55, padding: '4px 2px' }}>
                    <span style={{ width: 26, height: 26, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', background: accent, fontSize: Math.max(12, bodyFontSize - 3), fontWeight: 800, marginTop: 1 }}>{s.number ?? idx + 1}</span>
                    <span style={{ fontSize: bodyFontSize, lineHeight: 1.55, fontWeight: 500 }}>{renderTextWithChapterLinks(s.text)}</span>
                  </li>
                )
              }
              return (
                <li key={stepKey} style={{ border: `1px solid ${isOpen ? '#b8c4d2' : `${borderColor}aa`}`, borderRadius: Math.max(6, radius), background: '#fff', overflow: 'hidden' }}>
                  <button
                    type='button'
                    aria-expanded={isOpen}
                    onClick={() => toggleStep(stepKey)}
                    style={{ width: '100%', border: 0, background: isOpen ? '#f8fafc' : '#fff', color: textColor, padding: '9px 10px', cursor: 'pointer', display: 'grid', gridTemplateColumns: '28px minmax(0,1fr) 20px', gap: 10, alignItems: 'start', textAlign: 'left', font: 'inherit' }}
                  >
                    <span style={{ width: 26, height: 26, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', background: accent, fontSize: Math.max(12, bodyFontSize - 3), fontWeight: 800, marginTop: 1 }}>{s.number ?? idx + 1}</span>
                    <span style={{ fontSize: bodyFontSize, lineHeight: 1.55, fontWeight: 600 }}>{s.label || s.text}</span>
                    <span style={{ color: '#64748b', display: 'flex', justifyContent: 'center', paddingTop: 5 }}><Chevron open={isOpen} /></span>
                  </button>
                  {isOpen ? (
                    <div style={{ margin: '0 10px 10px 48px', padding: '10px 12px', borderLeft: '3px solid #94a3b8', background: '#f8fafc', borderRadius: 4 }}>
                      <div style={{ color: '#475569', fontSize: Math.max(12.5, bodyFontSize - 1.5), fontWeight: 800, marginBottom: 6 }}>Come si fa</div>
                      {help.paragraphs.map((p, pi) => <p key={`${stepKey}-p-${pi}`} style={{ fontSize: bodyFontSize, lineHeight: 1.58, color: textColor, margin: pi ? '7px 0 0' : 0, fontWeight: 500 }}>{renderTextWithChapterLinks(p)}</p>)}
                      {help.bullets?.length ? <div style={{ marginTop: 8 }}>{help.bullets.map((item, bi) => <div key={`${stepKey}-b-${bi}`} style={{ display: 'grid', gridTemplateColumns: '12px minmax(0,1fr)', gap: 7, margin: '5px 0', fontSize: bodyFontSize, lineHeight: 1.5 }}><span style={{ color: '#64748b', fontWeight: 900 }}>•</span><span>{renderTextWithChapterLinks(item)}</span></div>)}</div> : null}
                      {help.figure ? renderFigureAsset(help.figure, `${stepKey}-help`, true) : null}
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ol>
        )
        continue
      }

      if (b.type === 'heading2') {
        currentSectionTitle = ''
        const selected = activeAnchorId === b.id
        nodes.push(<h2 key={b.id} data-guide-anchor={b.id} data-guide-nav-anchor={b.id} onClick={() => { setActiveAnchorId(b.id); setExpanded(prev => { const next = new Set(prev); if (activeChapter?.id) next.add(activeChapter.id); return next }) }} style={{ color: selected ? accent : titleColor, fontSize: heading2FontSize, lineHeight: 1.25, margin: '26px 0 10px', paddingBottom: 7, paddingLeft: selected ? 11 : 0, paddingRight: selected ? 6 : 0, borderBottom: `1px solid ${selected ? accent : borderColor}`, background: selected ? `${accent}12` : 'transparent', boxShadow: selected ? `inset 3px 0 0 ${accent}` : 'none', borderRadius: selected ? 4 : 0, boxSizing: 'border-box' }}>{b.text}</h2>)
      } else if (b.type === 'heading3') {
        currentSectionTitle = b.text
        const selected = activeAnchorId === b.id
        nodes.push(<h3 key={b.id} data-guide-anchor={b.id} style={{ color: selected ? accent : titleColor, fontSize: heading3FontSize, lineHeight: 1.3, margin: '20px 0 8px', paddingLeft: selected ? 11 : 0, paddingRight: selected ? 6 : 0, background: selected ? `${accent}12` : 'transparent', boxShadow: selected ? `inset 3px 0 0 ${accent}` : 'none', borderRadius: selected ? 4 : 0, boxSizing: 'border-box' }}>{b.text}</h3>)
      } else if (b.type === 'lead') {
        nodes.push(<p key={`lead-${i}`} style={{ fontSize: leadFontSize, lineHeight: 1.65, color: '#1f2937', margin: '3px 0 16px', fontWeight: 600 }}>{renderTextWithChapterLinks(b.text)}</p>)
      } else if (b.type === 'paragraph') {
        nodes.push(<p key={`p-${i}`} style={{ fontSize: bodyFontSize, lineHeight: 1.62, margin: '8px 0', color: textColor, fontWeight: 500 }}>{renderTextWithChapterLinks(b.text)}</p>)
      } else if (b.type === 'bullet') {
        nodes.push(<div key={`bullet-${i}`} style={{ display: 'grid', gridTemplateColumns: '12px minmax(0,1fr)', gap: 8, margin: '6px 0', fontSize: bodyFontSize, lineHeight: 1.58, color: textColor, fontWeight: 500 }}><span style={{ color: accent, fontWeight: 900 }}>•</span><span>{renderTextWithChapterLinks(b.text)}</span></div>)
      } else if (b.type === 'figure') {
        const renderedFigure = renderFigureAsset(b.text, `fig-${i}`)
        if (renderedFigure) nodes.push(renderedFigure)
        else nodes.push(<div key={`fig-${i}`} style={{ margin: '14px 0', padding: '12px 14px', border: `1px dashed ${borderColor}`, borderRadius: Math.max(5, radius - 1), color: mutedColor, background: '#f8fafc', fontSize: tableFontSize, fontStyle: 'italic', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 9 }}><span style={{ color: accent }}><FigureIcon /></span><span>{b.text}</span></div>)
      } else if (b.type === 'callout') {
        const attention = norm(b.title).includes('attenzione')
        const after = norm(b.title).includes('cosa accade dopo')
        const calloutAccent = attention ? '#a16207' : after ? '#166534' : '#0284c7'
        nodes.push(<div key={`call-${i}`} style={{ margin: '14px 0', border: `1px solid ${calloutAccent}33`, borderLeft: `4px solid ${calloutAccent}`, borderRadius: radius, background: `${calloutAccent}0b`, padding: '11px 13px' }}><div style={{ color: calloutAccent, fontWeight: 800, fontSize: Math.max(12.5, bodyFontSize - 1.5), marginBottom: b.text ? 5 : 0 }}>{b.title}</div>{b.text ? <div style={{ fontSize: bodyFontSize, lineHeight: 1.56, color: textColor }}>{renderTextWithChapterLinks(b.text)}</div> : null}</div>)
      } else if (b.type === 'table') {
        nodes.push(
          <div key={`table-${i}`} style={{ margin: '14px 0 18px', overflowX: 'auto', border: `1px solid ${borderColor}`, borderRadius: radius }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: tableFontSize, color: textColor, minWidth: 520, fontWeight: 500 }}>
              <thead><tr>{b.headers.map((h, hi) => <th key={hi} style={{ textAlign: 'left', verticalAlign: 'top', padding: '9px 10px', color: titleColor, background: headerBg, borderBottom: `1px solid ${borderColor}`, fontWeight: 800 }}>{h}</th>)}</tr></thead>
              <tbody>{b.rows.map((row, ri) => <tr key={ri}>{row.map((cell, ci) => <td key={ci} style={{ verticalAlign: 'top', padding: '8px 10px', borderBottom: ri < b.rows.length - 1 ? `1px solid ${borderColor}88` : 'none', background: ri % 2 ? '#fbfdff' : '#ffffff', lineHeight: 1.5, whiteSpace: 'pre-line' }}>{renderTextWithChapterLinks(cell)}</td>)}</tr>)}</tbody>
            </table>
          </div>
        )
      }
      i += 1
    }
    return nodes
  }

  const outerPadding = `${Number(cfg.outerPaddingTop ?? 12)}px ${Number(cfg.outerPaddingRight ?? 12)}px ${Number(cfg.outerPaddingBottom ?? 12)}px ${Number(cfg.outerPaddingLeft ?? 12)}px`
  const indexPadding = `${Number(cfg.indexPaddingTop ?? 10)}px ${Number(cfg.indexPaddingRight ?? 10)}px ${Number(cfg.indexPaddingBottom ?? 10)}px ${Number(cfg.indexPaddingLeft ?? 10)}px`

  const buttonStyle: React.CSSProperties = {
    border: `1px solid ${borderColor}`,
    background: '#fff',
    color: titleColor,
    borderRadius: 6,
    minHeight: 31,
    padding: '6px 10px',
    fontSize: Math.max(12.5, indexFontSize - 1),
    fontWeight: 700,
    cursor: 'pointer'
  }

  return (
    <div style={{ width: '100%', height: '100%', minHeight: 0, boxSizing: 'border-box', padding: outerPadding, color: textColor, fontWeight: 500, fontFamily: "'Avenir Next', Avenir, 'Segoe UI', sans-serif" }}>
      <div style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
        <GiiPageTitle
          showSubtitle={(cfg as any).showTitleSubtitle !== false}
          showDivider={(cfg as any).showTitleDivider !== false}
          title={title}
          subtitle={subtitle}
          fallbackIcon='guida'
          titleColor={titleColor}
          titleFontSize={titleFontSize}
          titleFontWeight={800}
          subtitleColor={subtitleColor}
          subtitleFontSize={subtitleFontSize}
          iconSize={titleIconSize}
          dividerColor={titleDividerColor}
          dividerWidth={titleDividerWidth}
          rightContent={<div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {showVersion ? <span style={{ fontSize: Math.max(11.5, indexFontSize - 2), color: mutedColor, background: '#fff', border: `1px solid ${borderColor}`, borderRadius: 999, padding: '5px 8px', fontWeight: 600 }}>Base {GUIDE_VERSION}</span> : null}
            {manualDownloadUrl ? <button type='button' style={buttonStyle} onClick={() => window.open(manualDownloadUrl, '_blank', 'noopener,noreferrer')}>Scarica manuale</button> : null}
          </div>}
          style={{ flex: '0 0 auto', padding: '1px 2px 4px' }}
        />

        <div ref={shellRef} style={{ flex: '1 1 auto', minHeight: 0, display: 'grid', gridTemplateColumns: `minmax(0, ${leftWidth}fr) 12px minmax(0, ${100 - leftWidth}fr)`, gap: 0, alignItems: 'stretch' }}>
          <aside style={{ gridColumn: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', background: leftBg, border: `${panelBorderWidth}px solid ${borderColor}`, borderRadius: radius, overflow: 'hidden' }}>
            <div style={{ minHeight: 49, boxSizing: 'border-box', padding: '10px 12px', background: headerBg, borderBottom: `${separatorWidth}px solid ${separatorColor}`, fontWeight: 800, color: titleColor, borderTopLeftRadius: radius, borderTopRightRadius: radius, display: 'flex', alignItems: 'center' }}>
              Indice guida
            </div>
            <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', background: leftBg }}>
              <div style={{ padding: indexPadding, borderBottom: `${separatorWidth}px solid ${separatorColor}`, background: leftBg }}>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: mutedColor, pointerEvents: 'none', display: 'flex' }}><SearchIcon /></span>
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={searchPlaceholder} aria-label='Cerca nella guida' style={{ width: '100%', height: 40, boxSizing: 'border-box', border: `1px solid #aac4e0`, borderRadius: 6, background: '#fff', color: textColor, padding: '0 40px 0 34px', fontSize: indexFontSize, fontWeight: 600, outline: 'none' }} />
                  {query ? <button type='button' onClick={() => setQuery('')} aria-label='Pulisci ricerca' title='Pulisci ricerca' style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', width: 28, height: 28, border: 0, borderRadius: 999, background: 'transparent', color: '#6d88a6', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button> : null}
                </div>

                {showRoleFilter ? <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr auto', gap: 6 }}>
                  <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} aria-label='Filtra la guida per ruolo' style={{ height: 36, minWidth: 0, border: `1px solid #aac4e0`, borderRadius: 6, background: '#fff', color: textColor, padding: '0 8px', fontSize: indexFontSize, fontWeight: 600 }}>
                    <option value=''>Tutti i ruoli</option>
                    {preferredRole ? <option value={preferredRole}>Il mio ruolo: {ROLE_LABELS[preferredRole] || preferredRole}</option> : null}
                    {ROLE_ORDER.filter(r => r !== preferredRole).map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </select>
                  {roleFilter ? <button type='button' style={{ ...buttonStyle, minHeight: 36, padding: '4px 9px' }} onClick={() => setRoleFilter('')}>Tutti</button> : null}
                </div> : null}

                {!query ? <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                  <button type='button' onClick={() => setPanelMode('index')} style={{ ...buttonStyle, background: panelMode === 'index' ? accent : '#fff', color: panelMode === 'index' ? '#fff' : titleColor, borderColor: panelMode === 'index' ? accent : borderColor }}>Indice</button>
                  <button type='button' onClick={() => setPanelMode('quick')} style={{ ...buttonStyle, background: panelMode === 'quick' ? accent : '#fff', color: panelMode === 'quick' ? '#fff' : titleColor, borderColor: panelMode === 'quick' ? accent : borderColor }}>Come faccio a…</button>
                </div> : null}
              </div>

              <div ref={leftScrollRef} style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', padding: indexPadding, borderBottomLeftRadius: radius, borderBottomRightRadius: radius }}>
                {query ? (
                  <div>
                    <div style={{ fontSize: secondaryFontSize, color: mutedColor, margin: '0 2px 8px', fontWeight: 600 }}>{searchHits.length ? `${searchHits.length} risultati` : 'Nessun risultato'}</div>
                    <div style={{ display: 'grid', gap: 6 }}>
                      {searchHits.map(hit => {
                        const hitSectionAnchor = sectionAnchorFor(hit.chapterId, hit.anchorId)
                        const selected = hit.chapterId === activeChapter?.id && (hitSectionAnchor ? hitSectionAnchor === activeAnchorId : !activeAnchorId)
                        return <button key={hit.key} type='button' data-guide-left-selected={selected ? 'true' : undefined} onClick={() => openChapter(hit.chapterId, hit.anchorId)} style={{ textAlign: 'left', border: `1px solid ${selected ? accent : borderColor}`, borderRadius: 7, background: selected ? `${accent}12` : '#fff', boxShadow: selected ? `inset 3px 0 0 ${accent}` : 'none', padding: '9px 10px', cursor: 'pointer', color: textColor }}><div style={{ fontSize: indexFontSize, fontWeight: 800, color: selected ? accent : titleColor, lineHeight: 1.3 }}>{hit.title}</div>{hit.context && hit.context !== 'Capitolo' ? <div style={{ marginTop: 4, color: mutedColor, fontSize: secondaryFontSize, lineHeight: 1.4, fontWeight: 500 }}>{hit.context}</div> : null}</button>
                      })}
                    </div>
                  </div>
                ) : panelMode === 'quick' ? (
                  <div style={{ display: 'grid', gap: 6 }}>
                    {GUIDE_QUICK_LINKS.filter(q => visibleChapters.some(c => c.id === q.targetChapterId)).map((q, qi) => {
                      const anchorId = quickLinkAnchor(q)
                      const selected = q.targetChapterId === activeChapter?.id && !!anchorId && anchorId === activeAnchorId
                      return (
                        <button key={`${q.targetChapterId}-${qi}`} type='button' data-guide-left-selected={selected ? 'true' : undefined} onClick={() => openChapter(q.targetChapterId, anchorId || undefined)} style={{ textAlign: 'left', border: `1px solid ${selected ? accent : borderColor}`, borderRadius: 7, background: selected ? `${accent}12` : '#fff', boxShadow: selected ? `inset 3px 0 0 ${accent}` : 'none', padding: '9px 10px', cursor: 'pointer' }}>
                          <div style={{ color: selected ? accent : titleColor, fontSize: indexFontSize, fontWeight: 800, lineHeight: 1.35 }}>{q.label}</div>
                          <div style={{ color: mutedColor, fontSize: secondaryFontSize, marginTop: 3, lineHeight: 1.35, fontWeight: 500 }}>{q.description}</div>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 3 }}>
                    {visibleChapters.map(chapter => {
                      const heads = chapterHeadings(chapter).filter(h => h.type === 'heading2')
                      const isOpen = expanded.has(chapter.id)
                      const toggleChapter = () => setExpanded(prev => prev.has(chapter.id) ? new Set() : new Set([chapter.id]))
                      return <div key={chapter.id} style={{ borderRadius: 7, overflow: 'hidden', border: '1px solid transparent', background: 'transparent' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: heads.length ? '25px minmax(0,1fr)' : 'minmax(0,1fr)', alignItems: 'stretch' }}>
                          {heads.length ? <button type='button' aria-label={isOpen ? 'Comprimi capitolo' : 'Espandi capitolo'} onClick={toggleChapter} style={{ border: 0, background: 'transparent', color: mutedColor, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Chevron open={isOpen} /></button> : null}
                          <button type='button' data-guide-left-selected={chapter.id === activeChapter?.id && !activeAnchorId ? 'true' : undefined} onClick={() => openChapter(chapter.id)} style={{ border: 0, borderRadius: 5, background: chapter.id === activeChapter?.id && !activeAnchorId ? `${accent}12` : 'transparent', boxShadow: chapter.id === activeChapter?.id && !activeAnchorId ? `inset 3px 0 0 ${accent}` : 'none', color: chapter.id === activeChapter?.id && !activeAnchorId ? accent : textColor, textAlign: 'left', padding: '8px 8px 8px 7px', cursor: 'pointer', fontSize: indexFontSize, fontWeight: chapter.id === activeChapter?.id && !activeAnchorId ? 800 : 700, lineHeight: 1.35 }}>{chapter.title}</button>
                        </div>
                        {isOpen && heads.length ? <div style={{ padding: '0 8px 7px 29px', display: 'grid', gap: 1 }}>{heads.map(h => {
                          const selected = chapter.id === activeChapter?.id && h.id === activeAnchorId
                          return <button key={h.id} type='button' data-guide-left-selected={selected ? 'true' : undefined} onClick={() => openChapter(chapter.id, h.id)} style={{ border: 0, borderRadius: 5, background: selected ? `${accent}12` : 'transparent', boxShadow: selected ? `inset 3px 0 0 ${accent}` : 'none', color: selected ? accent : mutedColor, textAlign: 'left', padding: '5px 7px', cursor: 'pointer', fontSize: secondaryFontSize, fontWeight: selected ? 800 : 600, lineHeight: 1.4 }}>{h.text}</button>
                        })}</div> : null}
                      </div>
                    })}
                  </div>
                )}
              </div>
            </div>
          </aside>

          <div
            role='separator'
            aria-orientation='vertical'
            title='Ridimensiona colonne indice e contenuto'
            onMouseEnter={() => setSplitterHover(true)}
            onMouseLeave={() => setSplitterHover(false)}
            onMouseDown={(e) => { e.preventDefault(); dragging.current = true; setSplitterActive(true); document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none' }}
            onDoubleClick={() => setLeftWidth(initialWidth)}
            style={{ gridColumn: 2, position: 'relative', width: '100%', minWidth: 0, cursor: 'col-resize', userSelect: 'none', touchAction: 'none' }}
          >
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', transform: 'translateX(-50%)', width: Math.max(1, splitterWidth), background: splitterHover || splitterActive ? '#c5d9f1' : splitterColor, borderRadius: 999 }} />
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 8, height: 56, borderRadius: 999, background: splitterHover || splitterActive ? 'rgba(61,119,201,0.08)' : 'rgba(61,119,201,0.18)' }} />
          </div>

          <section style={{ gridColumn: 3, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', background: contentBg, border: `${panelBorderWidth}px solid ${borderColor}`, borderRadius: radius, overflow: 'hidden' }}>
            <div style={{ minHeight: 49, boxSizing: 'border-box', padding: '10px 12px', background: headerBg, borderBottom: `${separatorWidth}px solid ${separatorColor}`, fontWeight: 800, color: titleColor, borderTopLeftRadius: radius, borderTopRightRadius: radius, display: 'flex', alignItems: 'center' }}>
              Contenuto guida
            </div>
            <main ref={contentRef} onScroll={handleContentScroll} style={{ flex: '1 1 auto', minWidth: 0, minHeight: 0, overflowY: 'auto', background: contentBg, padding: contentPadding, boxSizing: 'border-box', position: 'relative', borderBottomLeftRadius: radius, borderBottomRightRadius: radius }}>
              {activeChapter ? <Fragment>
                <div style={{ maxWidth: 1040, margin: '0 auto' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 5 }}>
                    <div style={{ minWidth: 0 }}>
                      <h1 style={{ color: !activeAnchorId ? accent : titleColor, fontSize: chapterTitleFontSize, lineHeight: 1.22, margin: 0, fontWeight: 800, paddingLeft: !activeAnchorId ? 11 : 0, paddingRight: !activeAnchorId ? 6 : 0, background: !activeAnchorId ? `${accent}12` : 'transparent', boxShadow: !activeAnchorId ? `inset 3px 0 0 ${accent}` : 'none', borderRadius: !activeAnchorId ? 4 : 0, boxSizing: 'border-box' }}>{activeChapter.title}</h1>
                      {roleBadges(activeChapter, accent)}
                    </div>
                    <button type='button' onClick={() => { activeAnchorRef.current = ''; programmaticAnchorRef.current = ''; setActiveAnchorId(''); programmaticScrollUntilRef.current = Date.now() + 250; if (contentRef.current) contentRef.current.scrollTop = 0 }} style={{ ...buttonStyle, flexShrink: 0 }} title='Torna all’inizio del capitolo'>Inizio ↑</button>
                  </div>
                  <div style={{ marginTop: 13 }}>{renderBlocks(activeChapter.blocks)}</div>
                  <div style={{ marginTop: 28, paddingTop: 14, borderTop: `1px solid ${borderColor}`, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>{previousChapter ? <button type='button' onClick={() => openChapter(previousChapter.id)} style={{ ...buttonStyle, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 7, textAlign: 'left' }}><Arrow dir='left' /><span>{previousChapter.title}</span></button> : null}</div>
                    <div>{nextChapter ? <button type='button' onClick={() => openChapter(nextChapter.id)} style={{ ...buttonStyle, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 7, textAlign: 'right' }}><span>{nextChapter.title}</span><Arrow dir='right' /></button> : null}</div>
                  </div>
                  <div ref={runwayRef} aria-hidden='true' style={{ height: scrollRunwayHeight, pointerEvents: 'none' }} />
                </div>
              </Fragment> : null}
            </main>
          </section>
        </div>
      </div>
    </div>
  )
}
