/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx, ReactRedux, type IMState } from 'jimu-core'
import { type AllWidgetSettingProps } from 'jimu-for-builder'
import { defaultConfig, type IMConfig, type CardConfig, type GroupOffset } from '../config'

// ── Stili base (panel scuro) ──────────────────────────────────────────────────
const P = {
  wrap:    { padding:'0 12px 32px', fontSize:13, background:'#1a1f2e', minHeight:'100%', color:'#e5e7eb', boxSizing:'border-box' as const } as React.CSSProperties,
  sec:     { fontSize:11, fontWeight:700, color:'#93c5fd', textTransform:'uppercase' as const, letterSpacing:1.2, borderBottom:'1px solid rgba(255,255,255,0.10)', paddingBottom:6, marginBottom:14, marginTop:22, cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center' } as React.CSSProperties,
  lbl:     { fontSize:11.5, fontWeight:600, color:'#d1d5db', display:'block', marginBottom:4, marginTop:10 } as React.CSSProperties,
  hint:    { fontSize:10.5, color:'#a0aec0', marginTop:3, lineHeight:1.4 } as React.CSSProperties,
  row2:    { display:'grid', gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)', gap:8, alignItems:'start' } as React.CSSProperties,
  row3:    { display:'grid', gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)', gap:7, alignItems:'start' } as React.CSSProperties,
  inp:     { width:'100%', padding:'5px 8px', fontSize:12, border:'1px solid rgba(255,255,255,0.15)', borderRadius:6, outline:'none', boxSizing:'border-box' as const, background:'rgba(255,255,255,0.07)', color:'#e5e7eb' } as React.CSSProperties,
  check:   { display:'flex', alignItems:'center', gap:8, fontSize:12, color:'#d1d5db', cursor:'pointer', marginTop:8 } as React.CSSProperties,
  cardBox: { border:'1px solid rgba(255,255,255,0.10)', borderRadius:10, padding:'10px 12px', marginBottom:8, background:'rgba(255,255,255,0.04)' } as React.CSSProperties,
}

// ── Micro-componenti ──────────────────────────────────────────────────────────
function Inp(p: { value:string|number; onChange:(v:string)=>void; type?:string; placeholder?:string }) {
  return <input type={p.type||'text'} value={p.value} onChange={e=>p.onChange(e.target.value)} placeholder={p.placeholder} style={P.inp}/>
}
function NumInp(p: { value:number; onChange:(v:number)=>void; min?:number; max?:number; step?:number; unit?:string }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:4, minWidth:0 }}>
      <input type='number' value={p.value} min={p.min} max={p.max} step={p.step||1}
        onChange={e=>p.onChange(Number(e.target.value))} style={{ ...P.inp, width:58, padding:'5px 6px' }}/>
      {p.unit && <span style={{ fontSize:11, color:'#a0aec0', flexShrink:0 }}>{p.unit}</span>}
    </div>
  )
}
function ColInp(p: { value:string; onChange:(v:string)=>void }) {
  const toHex = (n: number) => {
    const v = Math.max(0, Math.min(255, Math.round(n)))
    return v.toString(16).padStart(2, '0')
  }

  const normalizeToHexPreview = (raw: string): string | null => {
    const s = String(raw || '').trim()
    if (!s) return null

    // Hex (#rgb / #rrggbb / #rrggbbaa)
    if (/^#[0-9a-fA-F]{3}$/.test(s)) {
      const r = s[1], g = s[2], b = s[3]
      return `#${r}${r}${g}${g}${b}${b}`
    }
    if (/^#[0-9a-fA-F]{6}$/.test(s)) return s
    if (/^#[0-9a-fA-F]{8}$/.test(s)) return s.slice(0, 7) // input[type=color] non gestisce alpha

    // rgb/rgba()
    const m = s.match(/^rgba?\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})(?:\s*,\s*([0-9.]+)\s*)?\)$/i)
    if (m) {
      const r = Number(m[1]); const g = Number(m[2]); const b = Number(m[3])
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`
    }

    // keyword comuni
    if (s.toLowerCase() === 'transparent') return '#000000'
    if (s.toLowerCase() === 'white') return '#ffffff'
    if (s.toLowerCase() === 'black') return '#000000'

    return null
  }

  const parseAlpha = (raw: string): number => {
    const s = String(raw || '').trim()
    if (!s) return 1
    if (s.toLowerCase() === 'transparent') return 0
    const m = s.match(/^rgba\(\s*[0-9]{1,3}\s*,\s*[0-9]{1,3}\s*,\s*[0-9]{1,3}\s*,\s*([0-9.]+)\s*\)$/i)
    if (m) {
      const a = Number(m[1])
      return isFinite(a) ? Math.max(0, Math.min(1, a)) : 1
    }
    if (/^#[0-9a-fA-F]{8}$/.test(s)) {
      const aa = parseInt(s.slice(7, 9), 16)
      return isFinite(aa) ? Math.max(0, Math.min(1, aa / 255)) : 1
    }
    return 1
  }

  const hexToRgb = (hex: string): { r:number; g:number; b:number } => {
    const h = hex.replace('#','')
    const r = parseInt(h.slice(0,2), 16)
    const g = parseInt(h.slice(2,4), 16)
    const b = parseInt(h.slice(4,6), 16)
    return { r, g, b }
  }

  const rgbaFromHex = (hex: string, a: number): string => {
    const { r, g, b } = hexToRgb(hex)
    const aa = Math.max(0, Math.min(1, a))
    return `rgba(${r},${g},${b},${aa})`
  }

  const raw = String(p.value || '').trim()
  const hexVal = normalizeToHexPreview(p.value) ?? '#1d4ed8'
  const alpha = parseAlpha(p.value)
  const aPct = Math.round(alpha * 100)
  const isHex8 = /^#[0-9a-fA-F]{8}$/.test(raw)
  const alphaHex = isHex8 ? raw.slice(7, 9) : ''

  const onPick = (hex: string) => {
    // Se alpha < 100%, salva come rgba mantenendo l'alpha corrente
    if (alpha < 1) {
      p.onChange(rgbaFromHex(hex, alpha))
      return
    }
    // Se l'utente stava usando #rrggbbaa, preserva il canale alpha (100% → 'ff')
    if (isHex8) {
      p.onChange(`${hex}${alphaHex || 'ff'}`)
      return
    }
    p.onChange(hex)
  }

  const onAlpha = (pct: number) => {
    const a = Math.max(0, Math.min(1, pct / 100))
    if (a >= 1) {
      // a 100%: torna a #rrggbb (più pulito)
      p.onChange(hexVal)
      return
    }
    p.onChange(rgbaFromHex(hexVal, a))
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6, minWidth:0 }}>
      <div style={{ display:'flex', alignItems:'center', gap:7, minWidth:0 }}>
        {/* Swatch unico: anteprima reale (supporta alpha) + click per aprire il picker RGB */}
        <div
          title='Clicca per scegliere il colore'
          style={{
            width:28, height:28, borderRadius:6,
            border:'1px solid rgba(255,255,255,0.18)',
            overflow:'hidden',
            position:'relative',
            backgroundImage:
              'linear-gradient(45deg, rgba(255,255,255,0.12) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.12) 75%, rgba(255,255,255,0.12)),' +
              'linear-gradient(45deg, rgba(255,255,255,0.12) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.12) 75%, rgba(255,255,255,0.12))',
            backgroundSize: '8px 8px',
            backgroundPosition: '0 0, 4px 4px',
            flexShrink:0,
            cursor:'pointer'
          }}
        >
          <div style={{ width:'100%', height:'100%', background: (p.value || 'transparent') }} />
          {/* Input invisibile sopra la swatch (apre il picker nativo) */}
          <input
            type='color'
            value={hexVal}
            onChange={e=>onPick(e.target.value)}
            style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0, cursor:'pointer' }}
            aria-label='Scegli colore'
          />
        </div>

        {/* Valore completo (anche rgba/alpha) */}
        <input
          type='text'
          value={p.value}
          onChange={e=>p.onChange(e.target.value)}
          placeholder='#rrggbb oppure rgba(r,g,b,a)'
          style={{ ...P.inp, flex:'1 1 auto', minWidth:0, fontSize:10.5, padding:'5px 6px' }}
        />
      </div>

      {/* Slider trasparenza */}
      <div style={{ display:'flex', alignItems:'center', gap:7, minWidth:0 }}>
        <span style={{ fontSize:10, color:'#a0aec0', width:16, textAlign:'center' as const }}>α</span>
        <input
          type='range'
          min={0}
          max={100}
          step={1}
          value={aPct}
          onChange={e=>onAlpha(Number(e.target.value))}
          style={{ flex:'1 1 auto', minWidth:0 }}
        />
        <span style={{ fontSize:10, color:'#a0aec0', width:34, textAlign:'right' as const }}>{aPct}%</span>
      </div>
    </div>
  )
}
function Check(p: { value:boolean; onChange:(v:boolean)=>void; label:string }) {
  return (
    <label style={P.check}>
      <input type='checkbox' checked={p.value} onChange={e=>p.onChange(e.target.checked)}/>
      {p.label}
    </label>
  )
}
function Sel(p: { value:string; onChange:(v:string)=>void; options:Array<{value:string;label:string}> }) {
  return (
    <select value={p.value} onChange={e=>p.onChange(e.target.value)} style={{ ...P.inp, cursor:'pointer' }}>
      {p.options.map(o=><option key={o.value} value={o.value} style={{ background:'#1a1f2e', color:'#e5e7eb' }}>{o.label}</option>)}
    </select>
  )
}

function ColorNumRow(p: {
  colorLabel: string; colorValue: string; onColorChange: (v:string)=>void
  numLabel: string; numValue: number; onNumChange: (v:number)=>void
  min?: number; max?: number; step?: number; unit?: string
}) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) 88px', gap:8, alignItems:'start', marginTop:2 }}>
      <div style={{ minWidth:0 }}>
        <label style={P.lbl}>{p.colorLabel}</label>
        <ColInp value={p.colorValue} onChange={p.onColorChange}/>
      </div>
      <div style={{ minWidth:0 }}>
        <label style={P.lbl}>{p.numLabel}</label>
        <NumInp value={p.numValue} onChange={p.onNumChange} min={p.min} max={p.max} step={p.step} unit={p.unit}/>
      </div>
    </div>
  )
}
// ── Selezione pagina ExB ──────────────────────────────────────────────────────
function getPagesMapFromAppConfig(appConfig: any): Record<string, any> {
  const rawPages: any = appConfig?.pages ?? {}
  return rawPages?.asMutable ? rawPages.asMutable({ deep: true }) :
    rawPages?.toJS ? rawPages.toJS() :
      rawPages
}

function resolvePageIdFromAppConfig(appConfig: any, pageTokenRaw: string): string | null {
  const tok0 = (pageTokenRaw || '').trim()
  if (!tok0) return null

  let tok = tok0.replace(/^#+\/?/, '').replace(/^\/+/, '')
  if (tok.startsWith('page/')) tok = tok.slice(5)

  try {
    const pagesMap = getPagesMapFromAppConfig(appConfig)
    if (pagesMap && pagesMap[tok]) return tok

    const hist = appConfig?.historyLabels?.page || {}
    for (const [pageId, pg] of Object.entries(pagesMap || {})) {
      if (!pg) continue
      if ((pg as any).name === tok) return pageId
      if (hist && (hist as any)[pageId] === tok) return pageId
      if ((pg as any).label === tok || (pg as any).title === tok) return pageId
    }
  } catch { /* ignore */ }

  return null
}

function listVisiblePagesFromAppConfig(appConfig: any): Array<{ pageId: string; label: string; token: string }> {
  try {
    if (!appConfig) return []

    const pagesMap = getPagesMapFromAppConfig(appConfig)
    const pageOrder: string[] =
      Array.isArray(appConfig?.pageOrder) ? appConfig.pageOrder :
      Array.isArray(appConfig?.pagesOrder) ? appConfig.pagesOrder :
      Array.isArray(appConfig?.pageNavOrder) ? appConfig.pageNavOrder :
      []

    const entries = Object.entries(pagesMap || {})
      .filter(([, pg]: any) => pg?.isVisible !== false)
      .map(([pageId, pg]: [string, any]) => {
        const label = String(pg?.label || pg?.title || pg?.name || pageId)
        const token = String(pg?.name || appConfig?.historyLabels?.page?.[pageId] || pageId)
        const ord = pageOrder.length ? pageOrder.indexOf(pageId) : -1
        return { pageId, label, token, ord }
      })

    const hasOrd = entries.some(e => e.ord >= 0)
    return (hasOrd
      ? entries.sort((a, b) => a.ord - b.ord || a.label.localeCompare(b.label, 'it'))
      : entries.sort((a, b) => a.label.localeCompare(b.label, 'it'))
    ).map(({ pageId, label, token }) => ({ pageId, label, token }))
  } catch {
    return []
  }
}


function listAllPagesFromAppConfig(appConfig: any): Array<{ pageId: string; label: string; token: string; visible: boolean }> {
  try {
    if (!appConfig) return []

    const pagesMap = getPagesMapFromAppConfig(appConfig)
    const pageOrder: string[] =
      Array.isArray(appConfig?.pageOrder) ? appConfig.pageOrder :
      Array.isArray(appConfig?.pagesOrder) ? appConfig.pagesOrder :
      Array.isArray(appConfig?.pageNavOrder) ? appConfig.pageNavOrder :
      []

    const entries = Object.entries(pagesMap || {})
      .map(([pageId, pg]: [string, any]) => {
        const label = String(pg?.label || pg?.title || pg?.name || pageId)
        const token = String(pg?.name || appConfig?.historyLabels?.page?.[pageId] || pageId)
        const ord = pageOrder.length ? pageOrder.indexOf(pageId) : -1
        const visible = (pg?.isVisible !== false)
        return { pageId, label, token, ord, visible }
      })

    const hasOrd = entries.some(e => e.ord >= 0)
    const sorted = (hasOrd
      ? entries.sort((a, b) => a.ord - b.ord || a.label.localeCompare(b.label, 'it'))
      : entries.sort((a, b) => a.label.localeCompare(b.label, 'it'))
    )

    return sorted.map(({ pageId, label, token, visible }) => ({ pageId, label, token, visible }))
  } catch {
    return []
  }
}


const AUTO_CARD_PALETTE: Array<{ bg: string; accent: string }> = [
  { bg: '#0c329d', accent: '#6fa5fb' },
  { bg: '#14532d', accent: '#22c55e' },
  { bg: '#7c2d12', accent: '#f97316' },
  { bg: '#4a1d96', accent: '#b79ffe' },
  { bg: '#0f766e', accent: '#2dd4bf' },
  { bg: '#7c3aed', accent: '#c4b5fd' },
  { bg: '#b45309', accent: '#fbbf24' },
  { bg: '#0f172a', accent: '#93c5fd' }
]

function hashToIndex(s: string, mod: number): number {
  let h = 0
  const str = String(s || '')
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return mod ? (h % mod) : 0
}

function PageSel(p: { value:string; onChange:(v:string)=>void; options:Array<{value:string;label:string}> }) {
  const pages = p.options || []
  if (pages.length === 0) {
    return (
      <div>
        <Inp value={p.value} onChange={p.onChange} placeholder='inserisci il nome/ID della pagina'/>
        <div style={{ ...P.hint, color:'#f87171', marginTop:4 }}>
          ⚠ Impossibile leggere le pagine dell'app. Inserisci manualmente il valore che vedi nell&apos;URL quando apri la pagina (es: .../page/NOME-PAGINA).
        </div>
      </div>
    )
  }

  return (
    <div>
      <select
        value={p.value}
        onChange={e=>p.onChange(e.target.value)}
        style={{ ...P.inp, cursor:'pointer' }}
      >
        <option value='' style={{ background:'#1a1f2e', color:'#9ca3af' }}>— seleziona una pagina —</option>
        {pages.map(pg=>(
          <option key={pg.value} value={pg.value} style={{ background:'#1a1f2e', color:'#e5e7eb' }}>
            {pg.label}
          </option>
        ))}
      </select>

      {p.value && <div style={{ fontSize:10, color:'#a0aec0', marginTop:3 }}>Target: {p.value}</div>}
      <div style={P.hint}>Scegli la pagina che si apre al click sulla card.</div>
    </div>
  )
}

// ── Nudge (frecce posizione) ──────────────────────────────────────────────────
const STEP = 4

function Nudge(p: { label:string; icon:string; value:GroupOffset; onChange:(v:GroupOffset)=>void }) {
  const { x, y } = p.value
  const mv = (dx:number, dy:number) => p.onChange({ x:x+dx, y:y+dy })
  const reset = () => p.onChange({ x:0, y:0 })
  const moved = x!==0 || y!==0

  const Btn = (bp: { onClick:()=>void; children:React.ReactNode; title?:string }) => (
    <button type='button' onClick={bp.onClick} title={bp.title}
      style={{ width:22, height:22, borderRadius:5, border:'1px solid rgba(255,255,255,0.15)', background:'rgba(255,255,255,0.07)', color:'#d1d5db', fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
      {bp.children}
    </button>
  )

  return (
    <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:8, padding:'8px', marginTop:8, display:'grid', gridTemplateColumns:'minmax(0,1fr)', gap:7, width:'100%', maxWidth:'100%', boxSizing:'border-box' }}>

      {/* Riga titolo compatta */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:7, minWidth:0 }}>
          <span style={{ fontSize:14, flexShrink:0 }}>{p.icon}</span>
          <span style={{ fontSize:10, fontWeight:700, color: moved ? '#93c5fd' : '#a0aec0', lineHeight:1.25, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const }}>
            {p.label}
          </span>
        </div>
        {moved && (
          <span style={{ fontSize:9, color:'#a0aec0', flexShrink:0 }}>
            {x!==0?`X${x>0?'+':''}${x}`:''}
            {x!==0&&y!==0?' ':''}
            {y!==0?`Y${y>0?'+':''}${y}`:''}
          </span>
        )}
      </div>

      {/* Comandi: frecce a sinistra, campi X/Y dentro la larghezza disponibile */}
      <div style={{ display:'grid', gridTemplateColumns:'70px minmax(0,1fr)', gap:8, alignItems:'center', width:'100%', maxWidth:'100%', minWidth:0 }}>
        <div style={{ display:'grid', gridTemplateColumns:'22px 22px 22px', gridTemplateRows:'22px 22px 22px', gap:2, flexShrink:0 }}>
          <div/><Btn onClick={()=>mv(0,-STEP)} title='Su'>↑</Btn><div/>
          <Btn onClick={()=>mv(-STEP,0)} title='Sinistra'>←</Btn>
          <button type='button' onClick={reset} title='Azzera'
            style={{ width:22, height:22, borderRadius:5, border:'1px solid rgba(255,255,255,0.10)', background:'transparent', color: moved?'#f87171':'#6b7280', fontSize:10, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            ↺
          </button>
          <Btn onClick={()=>mv(STEP,0)} title='Destra'>→</Btn>
          <div/><Btn onClick={()=>mv(0,STEP)} title='Giù'>↓</Btn><div/>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)', gap:6, minWidth:0 }}>
          <div style={{ minWidth:0 }}>
            <label style={{ fontSize:10, color:'#a0aec0', display:'block', marginBottom:2 }}>X</label>
            <input type='number' value={x} step={1} onChange={e=>p.onChange({ x:Number(e.target.value), y })}
              style={{ ...P.inp, width:'100%', minWidth:0, padding:'3px 5px', fontSize:11 }}/>
          </div>
          <div style={{ minWidth:0 }}>
            <label style={{ fontSize:10, color:'#a0aec0', display:'block', marginBottom:2 }}>Y</label>
            <input type='number' value={y} step={1} onChange={e=>p.onChange({ x, y:Number(e.target.value) })}
              style={{ ...P.inp, width:'100%', minWidth:0, padding:'3px 5px', fontSize:11 }}/>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Costanti ──────────────────────────────────────────────────────────────────
const FONTS = [
  { value:"'Crimson Pro', Georgia, serif",           label:'Crimson Pro (serif)' },
  { value:"'Source Sans 3', 'Segoe UI', sans-serif", label:'Source Sans 3 (sans)' },
  { value:"Georgia, serif",                          label:'Georgia' },
  { value:"'Times New Roman', serif",                label:'Times New Roman' },
  { value:"'Trebuchet MS', sans-serif",              label:'Trebuchet MS' },
  { value:"'Palatino Linotype', serif",              label:'Palatino Linotype' },
  { value:"'Courier New', monospace",                label:'Courier New' },
  { value:"Impact, sans-serif",                      label:'Impact' },
]
const WEIGHTS = [300,400,500,600,700,800,900].map(w=>({
  value:String(w),
  label:`${w} — ${['Thin','Regular','Medium','SemiBold','Bold','ExtraBold','Black'][[300,400,500,600,700,800,900].indexOf(w)]}`
}))
const ROLE_OPTIONS = [
  {value:'*',label:'Tutti'},{value:'TR',label:'TR'},{value:'TI',label:'TI'},
  {value:'RZ',label:'RZ'},{value:'RI',label:'RI'},{value:'DT',label:'DT'},
  {value:'DA',label:'DA'},{value:'RI_AMM',label:'RI_AMM'},
  {value:'TI_AMM',label:'TI_AMM'},{value:'ADMIN',label:'ADMIN'}
]

let _newCardCounter = 0

// ── Main Setting ──────────────────────────────────────────────────────────────
export default function Setting(props: AllWidgetSettingProps<IMConfig>) {
  const cfg: any = { ...defaultConfig, ...(props.config as any) }
  const cards: CardConfig[] = Array.isArray(cfg.cards) ? cfg.cards.map((c:any)=>({...c})) : defaultConfig.cards
  const excludedPageIds: string[] = Array.isArray(cfg.excludedPageIds) ? cfg.excludedPageIds.map((s:any)=>String(s)) : []

  // AppConfig dell'Experience che stai editando (non quello del Builder).
  // UseSelector assicura il re-render quando ExB aggiorna appConfig (es. dopo “Ripristina default”).
  const appConfig = ReactRedux.useSelector((state: IMState) => {
    const s: any = state as any
    return s?.appStateInBuilder?.appConfig ?? s?.appConfig
  })

  const pages = React.useMemo(() => listVisiblePagesFromAppConfig(appConfig), [appConfig])
  const pagesAll = React.useMemo(() => listAllPagesFromAppConfig(appConfig), [appConfig])
  const visiblePageIdSet = React.useMemo(() => new Set(pages.map(p => p.pageId)), [pages])
  const pageOptions = React.useMemo(() => pagesAll.map(p => ({ value: p.token, label: p.visible ? p.label : `${p.label} (non visibile)` })), [pagesAll])
  const resolvePageId = React.useCallback((tok: string) => resolvePageIdFromAppConfig(appConfig, tok), [appConfig])

  const [openSec,  setOpenSec]  = React.useState<string>('cards')
  const [openCard, setOpenCard] = React.useState<string|null>(null)

  const [dragFrom, setDragFrom] = React.useState<number|null>(null)
  const [dragOver, setDragOver] = React.useState<number|null>(null)

  const setCfg = (patch: any) =>
    props.onSettingChange({ id:props.id, config:{ ...cfg, ...patch } as any })

  const set = (key:string, value:any) => setCfg({ [key]: value })
  const setCard = (cardId:string, patch:Partial<CardConfig>) =>
    set('cards', cards.map(c=>c.id===cardId?{...c,...patch}:c))
  const setCardsOrderFromSorted = (sorted: CardConfig[]) => {
    // Assicura un ordine coerente: 0..n-1 sulla lista ordinata
    const orderById = new Map<string, number>()
    sorted.forEach((c, i) => orderById.set(c.id, i))
    const next = cards.map((c) => ({ ...c, order: orderById.has(c.id) ? (orderById.get(c.id) as number) : (Number(c.order) || 0) }))
    set('cards', next)
  }

  const moveCardSorted = (fromSi: number, toSi: number) => {
    const sorted = [...cards].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))
    if (fromSi < 0 || toSi < 0 || fromSi >= sorted.length || toSi >= sorted.length) return
    if (fromSi === toSi) return
    const [it] = sorted.splice(fromSi, 1)
    sorted.splice(toSi, 0, it)
    setCardsOrderFromSorted(sorted)
  }

  const nudgeCard = (si: number, dir: -1 | 1) => moveCardSorted(si, si + dir)
  const addCard = () => {
    _newCardCounter++
    const newCard: CardConfig = {
      id: `card_custom_${Date.now()}`,
      visible: true,
      order: Math.max(...cards.map(c=>c.order), 0) + 1,
      label: `Nuova sezione ${_newCardCounter}`,
      desc: 'Descrizione della sezione',
      hashPage: '',
      colorBg: '#1e3a5f',
      colorAccent: '#60a5fa',
      colorBgRest: 'rgba(30,58,95,0.25)',
      colorBgHover: '',
      roles: ['*']
    }
    const next = [...cards, newCard]
    set('cards', next)
    setOpenCard(newCard.id)
  }

  const removeCard = (cardId:string) => {
    const card = cards.find(c=>c.id===cardId)
    if (!card) return
    if (!window.confirm('Rimuovere questa card?')) return

    // Se la card punta a una pagina reale, la escludiamo dall'autogenerazione
    // così non ricompare automaticamente.
    const pid = resolvePageId(card.hashPage)
    const nextExcluded = pid && !excludedPageIds.includes(pid)
      ? [...excludedPageIds, pid]
      : excludedPageIds

    setCfg({
      cards: cards.filter(c => c.id !== cardId),
      excludedPageIds: nextExcluded
    })
    setOpenCard(null)
  }

  
  // ── Migrazione (una tantum): se lo "Sfondo hover" era solo il default derivato dal colore sezione,
  // lo rendiamo "automatico" (valore vuoto), così cambiando "Colore sezione" cambia anche l'hover.
  React.useEffect(() => {
    let changed = false
    const nextCards = cards.map((c: any) => {
      const bg   = String(c.colorBg || '').trim().toLowerCase()
      const hov  = String(c.colorBgHover || '').trim().toLowerCase()
      const rest = String(c.colorBgRest || '').trim()

      let out: any = c
      let localChanged = false

      // Hover: se era solo il default derivato dal colore sezione, rendilo "automatico" (vuoto)
      if (bg && /^#[0-9a-f]{6}$/.test(bg) && hov === `${bg}ee`) {
        out = { ...out, colorBgHover: '' }
        localChanged = true
      }

      // Riposo: se mancante, allinea al valore effettivo usato nelle card di default
      if (!rest) {
        out = { ...out, colorBgRest: '#192e4d' }
        localChanged = true
      }

      if (localChanged) changed = true
      return out
    })
    if (changed) setCfg({ cards: nextCards })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

// ── Auto-sync: aggiunge automaticamente le pagine mancanti come cards ──
  const pagesKey = pages.map(p => p.pageId).join('|')
  const cardsKey = cards.map(c => `${c.id}:${c.hashPage}`).join('|')
  const excludedKey = excludedPageIds.join('|')
  React.useEffect(() => {
    // Prima render: attiva l'auto-sync una volta (e poi quando cambiano le pagine).
    if (!pages.length) return

    // Copertura: pagine già presenti nelle cards.
    const covered = new Set<string>()
    for (const c of cards) {
      const pid = resolvePageId(c.hashPage)
      if (pid) covered.add(pid)
    }

    const excluded = new Set(excludedPageIds)
    const missing = pages.filter(pg => !excluded.has(pg.pageId) && !covered.has(pg.pageId))
    if (!missing.length) {
      return
    }

    const maxOrder = Math.max(0, ...cards.map(c => Number(c.order) || 0))
    const toAdd: CardConfig[] = missing.map((pg, i) => {
      const idx = hashToIndex(pg.pageId, AUTO_CARD_PALETTE.length)
      const pal = AUTO_CARD_PALETTE[idx]
      const bg = pal.bg
      const accent = pal.accent
      return {
        id: `card_page_${pg.pageId}`,
        visible: true,
        order: maxOrder + 1 + i,
        label: pg.label,
        desc: `Apri la pagina “${pg.label}”`,
        hashPage: pg.token,
        colorBg: bg,
        colorAccent: accent,
        colorBgRest: '#192e4d',
        colorBgHover: '',
        roles: ['*']
      }
    })

    // IMPORTANTE: salviamo davvero le nuove cards in config,
    // così compaiono nel Setting e puoi rimuoverle/riordinarle.
    setCfg({ cards: [...cards, ...toAdd] })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagesKey, cardsKey, excludedKey])

  const Acc = (p:{id:string;label:string}) => (
    <div style={P.sec} onClick={()=>setOpenSec(openSec===p.id?'':p.id)}>
      <span>{p.label}</span>
      <span style={{ fontSize:12, color:'#a0aec0', fontWeight:400 }}>{openSec===p.id?'▲':'▼'}</span>
    </div>
  )

  const sortedCards = [...cards].sort((a,b)=>a.order-b.order)

  const getOffset = (key:string): GroupOffset => {
    const v = cfg[key]
    if (v && typeof v.x==='number') return { x:v.x, y:v.y }
    if (v && typeof (v as any).get==='function') return { x:(v as any).get('x')||0, y:(v as any).get('y')||0 }
    return { x:0, y:0 }
  }

  return (
    <div style={P.wrap}>

      {/* ═══ POSIZIONE ═══ */}
      <Acc id='posizione' label='🧭 Posizione elementi'/>
      {openSec==='posizione' && <div>
        <div style={{ fontSize:11, color:'#4b9dd4', lineHeight:1.5, background:'rgba(59,130,246,0.08)', borderRadius:8, padding:'7px 10px', marginBottom:4 }}>
          Sposta i blocchi rispetto al contenitore del widget (utile per allineare orologio e cards).
        </div>
        <Nudge label='Orologio + Data'  icon='🕐' value={getOffset('offsetClock')}  onChange={v=>set('offsetClock',v)}/>
        <Nudge label='Sezione + Cards'  icon='🃏' value={getOffset('offsetCards')}  onChange={v=>set('offsetCards',v)}/>
        <div style={{ marginTop:10 }}>
          <button type='button'
            onClick={()=>{ set('offsetClock',{x:0,y:0}); set('offsetCards',{x:0,y:0}); }}
            style={{ padding:'4px 12px', borderRadius:6, border:'1px solid rgba(255,255,255,0.15)', background:'rgba(255,255,255,0.05)', color:'#9ca3af', fontSize:11, cursor:'pointer' }}>
            ↺ Azzera
          </button>
        </div>
      </div>}

      {/* ═══ SFONDO ═══ */}
      <Acc id='sfondo' label='🎨 Sfondo'/>
      {openSec==='sfondo' && <div>
        <div style={{ fontSize:10, fontWeight:700, color:'#93c5fd', textTransform:'uppercase' as const, letterSpacing:1, marginBottom:8, marginTop:4 }}>Gradiente di sfondo</div>
        <label style={P.lbl}>Colore inizio</label><ColInp value={cfg.bgGradStart} onChange={v=>set('bgGradStart',v)}/>
        <label style={P.lbl}>Colore centrale</label><ColInp value={cfg.bgGradMid} onChange={v=>set('bgGradMid',v)}/>
        <label style={P.lbl}>Colore finale</label><ColInp value={cfg.bgGradEnd} onChange={v=>set('bgGradEnd',v)}/>
        <label style={P.lbl}>Angolo</label>
        <NumInp value={cfg.bgGradAngle} onChange={v=>set('bgGradAngle',v)} min={0} max={360} unit='°'/>

        <div style={{ height:1, background:'rgba(255,255,255,0.08)', margin:'14px 0 10px' }}/>
        <div style={{ fontSize:10, fontWeight:700, color:'#93c5fd', textTransform:'uppercase' as const, letterSpacing:1, marginBottom:8 }}>Cerchi decorativi</div>
        <Check value={cfg.showWave??false} onChange={v=>set('showWave',v)} label='Mostra onda decorativa (in basso)'/>
        <Check value={cfg.showCircles} onChange={v=>set('showCircles',v)} label='Mostra cerchi decorativi'/>
        {cfg.showCircles && <>
          <div style={P.row2}>
            <div><label style={P.lbl}>Numero cerchi</label><NumInp value={cfg.circleCount??3} onChange={v=>set('circleCount',v)} min={1} max={8}/></div>
            <div><label style={P.lbl}>Dimensione base</label><NumInp value={cfg.circleBaseSize??700} onChange={v=>set('circleBaseSize',v)} min={100} max={1400} unit='px'/></div>
          </div>
          <div style={P.row2}>
            <div><label style={P.lbl}>Spessore bordo</label><NumInp value={cfg.circleThickness??1} onChange={v=>set('circleThickness',v)} min={0.5} max={8} step={0.5} unit='px'/></div>
            <div><label style={P.lbl}>Opacità</label><NumInp value={Math.round((cfg.circleOpacity??0.08)*100)} onChange={v=>set('circleOpacity',v/100)} min={1} max={80} unit='%'/></div>
          </div>
          <label style={P.lbl}>Colore cerchi</label>
          <ColInp value={cfg.circleColor??'#60a5fa'} onChange={v=>set('circleColor',v)}/>
          <Check value={cfg.circleGradient??false} onChange={v=>set('circleGradient',v)} label='Riempimento radiale (effetto glow)'/>
          {cfg.circleGradient && <>
            <label style={P.lbl}>Colore glow secondario</label>
            <ColInp value={cfg.circleColorEnd??'#a78bfa'} onChange={v=>set('circleColorEnd',v)}/>
          </>}
        </>}
      </div>}

      {/* ═══ LABEL SEZIONE ═══ */}
      
      {/* ═══ OROLOGIO ═══ */}
      <Acc id='clock' label='🕐 Orologio e data'/>
      {openSec==='clock' && <div>
        <Check value={cfg.showClock??true} onChange={v=>set('showClock',v)} label='Mostra orologio e data'/>
        {(cfg.showClock??true) && <>
          <ColorNumRow
            colorLabel='Colore ora'
            colorValue={cfg.clockColor??'#ffffff'}
            onColorChange={v=>set('clockColor',v)}
            numLabel='Dim. ora'
            numValue={cfg.clockSize??22}
            onNumChange={v=>set('clockSize',v)}
            min={12}
            max={48}
            unit='px'
          />
          <ColorNumRow
            colorLabel='Colore data'
            colorValue={cfg.dateColor??'rgba(147,197,253,0.7)'}
            onColorChange={v=>set('dateColor',v)}
            numLabel='Dim. data'
            numValue={cfg.dateSize??11.5}
            onNumChange={v=>set('dateSize',v)}
            min={9}
            max={22}
            unit='px'
          />
        </>}
      </div>}

<Acc id='seclabel' label='🏷 Etichetta sezione'/>
      {openSec==='seclabel' && <div>
        <label style={P.lbl}>Testo</label><Inp value={cfg.sectionLabelText} onChange={v=>set('sectionLabelText',v)}/>
        <label style={P.lbl}>Colore</label><ColInp value={cfg.sectionLabelColor} onChange={v=>set('sectionLabelColor',v)}/>
        <div style={P.row2}>
          <div style={{ minWidth:0 }}><label style={P.lbl}>Dim.</label><NumInp value={cfg.sectionLabelSize} onChange={v=>set('sectionLabelSize',v)} min={8} max={20} unit='px'/></div>
          <div style={{ minWidth:0 }}><label style={P.lbl}>Spaziatura</label><NumInp value={cfg.sectionLabelSpacing} onChange={v=>set('sectionLabelSpacing',v)} min={0} max={10} step={0.5} unit='px'/></div>
        </div>
      </div>}

      {/* ═══ LAYOUT CARDS ═══ */}

      <Acc id='cardlayout' label='📐 Layout cards'/>
      {openSec==='cardlayout' && <div>
        <div style={P.row2}>
          <div><label style={P.lbl}>Spaziatura</label><NumInp value={cfg.cardsGap} onChange={v=>set('cardsGap',v)} min={0} max={40} unit='px'/></div>
          <div><label style={P.lbl}>Largh. minima</label><NumInp value={cfg.cardMinWidth} onChange={v=>set('cardMinWidth',v)} min={120} max={500} unit='px'/></div>
        </div>
        <div style={P.row2}>
          <div><label style={P.lbl}>Bordi arrot.</label><NumInp value={cfg.cardBorderRadius} onChange={v=>set('cardBorderRadius',v)} min={0} max={40} unit='px'/></div>
          <div><label style={P.lbl}>Padding</label><NumInp value={cfg.cardPadding} onChange={v=>set('cardPadding',v)} min={8} max={60} unit='px'/></div>
        </div>
      </div>}

      {/* ═══ TESTI CARDS ═══ */}
      <Acc id='cardtext' label='🔤 Testi cards (globale)'/>
      {openSec==='cardtext' && <div>
        <label style={P.lbl}>Font titolo</label>
        <Sel value={cfg.cardLabelFont} onChange={v=>set('cardLabelFont',v)} options={FONTS}/>
        <div style={P.row2}>
          <div><label style={P.lbl}>Dimensione titolo</label><NumInp value={cfg.cardLabelSize} onChange={v=>set('cardLabelSize',v)} min={10} max={32} unit='px'/></div>
          <div><label style={P.lbl}>Peso titolo</label><Sel value={String(cfg.cardLabelWeight)} onChange={v=>set('cardLabelWeight',Number(v))} options={WEIGHTS}/></div>
        </div>
        <label style={P.lbl}>Dimensione descrizione</label>
        <NumInp value={cfg.cardDescSize} onChange={v=>set('cardDescSize',v)} min={9} max={20} unit='px'/>
        <label style={P.lbl}>Testo pulsante CTA</label>
        <Inp value={cfg.cardCtaText} onChange={v=>set('cardCtaText',v)}/>
        <div style={P.row2}>
          <div><label style={P.lbl}>Dimensione CTA</label><NumInp value={cfg.cardCtaSize} onChange={v=>set('cardCtaSize',v)} min={8} max={18} unit='px'/></div>
          <div><label style={P.lbl}>Spaziatura CTA</label><NumInp value={cfg.cardCtaSpacing} onChange={v=>set('cardCtaSpacing',v)} min={0} max={8} step={0.5} unit='px'/></div>
        </div>
      </div>}

      {/* ═══ CARDS SINGOLE ═══ */}
      <Acc id='cards' label='🃏 Cards (singole)'/>
      {openSec==='cards' && <div>
        {/* Pulsante aggiungi */}
        <button type='button' onClick={addCard}
          style={{ width:'100%', padding:'8px', borderRadius:8, border:'1px dashed rgba(147,197,253,0.4)', background:'rgba(59,130,246,0.08)', color:'#93c5fd', fontSize:12, fontWeight:600, cursor:'pointer', marginBottom:12, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
          ＋ Aggiungi nuova card
        </button>

        {sortedCards.map((card,si)=>{
          const isCustom=card.id.startsWith('card_custom_') || card.id.startsWith('card_page_')
          const isO=openCard===card.id
          return (
            <div key={card.id} style={{ ...P.cardBox, opacity:card.visible?1:0.55 }}>
              {/* Header */}
              <div
                style={{
                  display:'flex',alignItems:'center',justifyContent:'space-between',
                  cursor:'pointer',userSelect:'none' as const,
                  borderRadius:6,
                  padding:'2px 4px',
                  margin:'-2px -4px',
                  border: (dragFrom!==null && dragOver===si && dragFrom!==si) ? '1px dashed rgba(147,197,253,0.65)' : '1px solid transparent'
                }}
                onClick={()=>setOpenCard(isO?null:card.id)}
                onDragOver={e=>{ if(dragFrom!==null) e.preventDefault() }}
                onDragEnter={e=>{ if(dragFrom!==null){ e.preventDefault(); setDragOver(si) } }}
                onDragLeave={e=>{ if(dragFrom!==null) setDragOver(null) }}
                onDrop={e=>{
                  if(dragFrom===null) return
                  e.preventDefault()
                  e.stopPropagation()
                  moveCardSorted(dragFrom, si)
                  setDragFrom(null)
                  setDragOver(null)
                }}>
                <div style={{ display:'flex',alignItems:'center',gap:8,minWidth:0 }}>
                  <button
                    type='button'
                    title='Trascina per riordinare'
                    draggable
                    onClick={e=>e.stopPropagation()}
                    onDragStart={e=>{
                      e.stopPropagation()
                      setDragFrom(si)
                      setDragOver(si)
                      try { e.dataTransfer.setData('text/plain', card.id) } catch {}
                      e.dataTransfer.effectAllowed = 'move'
                    }}
                    onDragEnd={e=>{
                      setDragFrom(null)
                      setDragOver(null)
                    }}
                    style={{
                      width:22,height:22,
                      borderRadius:5,
                      border:'1px solid rgba(255,255,255,0.15)',
                      background:'rgba(255,255,255,0.05)',
                      color:'#a0aec0',
                      cursor:'grab',
                      display:'flex',alignItems:'center',justifyContent:'center',
                      fontSize:12,
                      flexShrink:0
                    }}
                  >
                    ⋮⋮
                  </button>
                  <div style={{ width:12,height:12,borderRadius:3,background:card.colorBg,flexShrink:0,border:`1px solid ${card.colorAccent}` }}/>
                  <span style={{ fontWeight:600,fontSize:12,color:'#e5e7eb',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const }}>{card.label||card.id}</span>
                  {!card.visible && <span style={{ fontSize:10,color:'#a0aec0',fontStyle:'italic',flexShrink:0 }}>(nascosta)</span>}
                </div>
                <div style={{ display:'flex',alignItems:'center',gap:3,flexShrink:0 }}>
                  {si>0 && <button type='button' onClick={e=>{e.stopPropagation();nudgeCard(si,-1)}} style={{ padding:'1px 5px',fontSize:11,border:'1px solid rgba(255,255,255,0.15)',borderRadius:4,background:'rgba(255,255,255,0.05)',color:'#d1d5db',cursor:'pointer' }}>↑</button>}
                  {si<sortedCards.length-1 && <button type='button' onClick={e=>{e.stopPropagation();nudgeCard(si,1)}} style={{ padding:'1px 5px',fontSize:11,border:'1px solid rgba(255,255,255,0.15)',borderRadius:4,background:'rgba(255,255,255,0.05)',color:'#d1d5db',cursor:'pointer' }}>↓</button>}
                  <span style={{ fontSize:10,color:'#a0aec0',marginLeft:2 }}>{isO?'▲':'▼'}</span>
                </div>
              </div>

              {/* Body */}
              {isO && <div style={{ marginTop:10,paddingTop:10,borderTop:'1px solid rgba(255,255,255,0.08)' }}>
                <Check value={card.visible} onChange={v=>setCard(card.id,{visible:v})} label='Visibile'/>
                <label style={P.lbl}>Etichetta</label><Inp value={card.label} onChange={v=>setCard(card.id,{label:v})}/>
                <label style={P.lbl}>Descrizione</label>
                <textarea value={card.desc} onChange={e=>setCard(card.id,{desc:e.target.value})} rows={2} style={{ ...P.inp,resize:'vertical',fontFamily:'inherit' }}/>

                <label style={P.lbl}>Pagina di destinazione</label>
                <PageSel value={card.hashPage} onChange={v=>setCard(card.id,{hashPage:v})} options={pageOptions}/>

                {(() => {
                  const pid = resolvePageId(card.hashPage)
                  if (pid && !visiblePageIdSet.has(pid)) {
                    return <div style={P.hint}>Pagina non visibile: la card non verrà mostrata in homepage (ma resta configurata qui).</div>
                  }
                  return null
                })()}

                <label style={P.lbl}>Colore sezione</label>
                <ColInp value={card.colorBg} onChange={v=>setCard(card.id,{colorBg:v})}/>
                <div style={P.hint}>Usato per l’hover automatico se “Sfondo hover” è vuoto.</div>

                <label style={P.lbl}>Colore accento</label>
                <ColInp value={card.colorAccent} onChange={v=>setCard(card.id,{colorAccent:v})}/>

                <label style={P.lbl}>Sfondo a riposo</label>
                <ColInp value={card.colorBgRest||'rgba(255,255,255,0.05)'} onChange={v=>setCard(card.id,{colorBgRest:v})}/>

                <label style={P.lbl}>Sfondo hover</label>
                <ColInp value={String(card.colorBgHover||'')} onChange={v=>setCard(card.id,{colorBgHover:v})}/>
                <div style={P.hint}>Vuoto = automatico, derivato dal “Colore sezione”.</div>

                <label style={P.lbl}>Ruoli visibili</label>
                <div style={{ display:'flex',flexWrap:'wrap' as const,gap:5,marginTop:4 }}>
                  {ROLE_OPTIONS.map(ro=>{
                    const isAll=ro.value==='*'
                    const checked=isAll?card.roles.includes('*'):(!card.roles.includes('*')&&card.roles.includes(ro.value))
                    return (
                      <label key={ro.value} style={{ display:'flex',alignItems:'center',gap:4,fontSize:11,cursor:'pointer',
                        background:checked?'rgba(59,130,246,0.25)':'rgba(255,255,255,0.06)',
                        border:`1px solid ${checked?'#93c5fd':'rgba(255,255,255,0.12)'}`,
                        borderRadius:6,padding:'3px 8px',color:checked?'#93c5fd':'#9ca3af',userSelect:'none' as const }}>
                        <input type='checkbox' checked={checked} style={{ display:'none' }} onChange={()=>{
                          let next=[...card.roles]
                          if(isAll){next=checked?[]:['*']}
                          else{if(next.includes('*'))next=[];if(checked)next=next.filter(r=>r!==ro.value);else next=[...next,ro.value]}
                          setCard(card.id,{roles:next})
                        }}/>
                        {ro.label}
                      </label>
                    )
                  })}
                </div>

                {/* Rimuovi — solo per card personalizzate */}
                {isCustom && (
                  <button type='button' onClick={()=>removeCard(card.id)}
                    style={{ marginTop:14,padding:'5px 12px',borderRadius:6,border:'1px solid rgba(252,165,165,0.4)',background:'rgba(239,68,68,0.10)',color:'#fca5a5',fontSize:11,cursor:'pointer',fontWeight:600 }}>
                    🗑 Rimuovi questa card
                  </button>
                )}
              </div>}
            </div>
          )
        })}
      </div>}

      {/* ═══ FOOTER ═══ */}
      <Acc id='footer' label='📄 Footer'/>
      {openSec==='footer' && <div>
        <Check value={cfg.showFooter} onChange={v=>set('showFooter',v)} label='Mostra footer'/>
        {cfg.showFooter && <>
          <label style={P.lbl}>Testo sinistro</label><Inp value={cfg.footerLeft} onChange={v=>set('footerLeft',v)} placeholder="usa {year} per l'anno"/>
          <label style={P.lbl}>Testo destro</label><Inp value={cfg.footerRight} onChange={v=>set('footerRight',v)}/>
          <ColorNumRow
            colorLabel='Colore'
            colorValue={cfg.footerColor}
            onColorChange={v=>set('footerColor',v)}
            numLabel='Dimensione'
            numValue={cfg.footerSize}
            onNumChange={v=>set('footerSize',v)}
            min={8}
            max={16}
            unit='px'
          />
        </>}
      </div>}

      {/* Reset globale */}
      <div style={{ marginTop:28,borderTop:'1px solid rgba(255,255,255,0.10)',paddingTop:16 }}>
        <button type='button'
          onClick={()=>{ if(window.confirm('Ripristinare tutti i valori predefiniti?')) props.onSettingChange({id:props.id,config:defaultConfig as any}) }}
          style={{ padding:'6px 14px',borderRadius:7,border:'1px solid rgba(252,165,165,0.4)',background:'rgba(239,68,68,0.10)',color:'#fca5a5',fontSize:12,cursor:'pointer',fontWeight:600 }}>
          ↺ Ripristina predefiniti
        </button>
      </div>
    </div>
  )
}
