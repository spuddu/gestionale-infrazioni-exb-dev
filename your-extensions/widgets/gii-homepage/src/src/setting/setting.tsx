/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx, getAppStore } from 'jimu-core'
import { type AllWidgetSettingProps } from 'jimu-for-builder'
import { defaultConfig, type IMConfig, type CardConfig, type GroupOffset } from '../config'

// ── Stili base (panel scuro) ──────────────────────────────────────────────────
const P = {
  wrap:    { padding:'0 12px 32px', fontSize:13, background:'#1a1f2e', minHeight:'100%', color:'#e5e7eb' } as React.CSSProperties,
  sec:     { fontSize:11, fontWeight:700, color:'#93c5fd', textTransform:'uppercase' as const, letterSpacing:1.2, borderBottom:'1px solid rgba(255,255,255,0.10)', paddingBottom:6, marginBottom:14, marginTop:22, cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center' } as React.CSSProperties,
  lbl:     { fontSize:11.5, fontWeight:600, color:'#d1d5db', display:'block', marginBottom:4, marginTop:10 } as React.CSSProperties,
  hint:    { fontSize:10.5, color:'#a0aec0', marginTop:3, lineHeight:1.4 } as React.CSSProperties,
  row2:    { display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 } as React.CSSProperties,
  row3:    { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 } as React.CSSProperties,
  inp:     { width:'100%', padding:'5px 8px', fontSize:12, border:'1px solid rgba(255,255,255,0.15)', borderRadius:6, outline:'none', boxSizing:'border-box' as const, background:'rgba(255,255,255,0.07)', color:'#e5e7eb' } as React.CSSProperties,
  check:   { display:'flex', alignItems:'center', gap:8, fontSize:12, color:'#d1d5db', cursor:'pointer', marginTop:8 } as React.CSSProperties,
  cardBox: { border:'1px solid rgba(255,255,255,0.10)', borderRadius:10, padding:'10px 12px', marginBottom:8, background:'rgba(255,255,255,0.04)' } as React.CSSProperties,
}


// ── Util colori (solo colori solidi, niente gradienti) ────────────────────────
function parseColor(raw: any): { r: number; g: number; b: number; a: number } | null {
  const s = String(raw || '').trim()
  if (!s) return null

  const clamp255 = (n: number) => Math.max(0, Math.min(255, n))
  const clamp01 = (n: number) => Math.max(0, Math.min(1, n))

  const low = s.toLowerCase()
  if (low === 'white') return { r: 255, g: 255, b: 255, a: 1 }
  if (low === 'black') return { r: 0, g: 0, b: 0, a: 1 }

  // Hex
  if (/^#[0-9a-fA-F]{3}$/.test(s)) {
    const r = parseInt(s[1] + s[1], 16)
    const g = parseInt(s[2] + s[2], 16)
    const b = parseInt(s[3] + s[3], 16)
    return { r, g, b, a: 1 }
  }
  if (/^#[0-9a-fA-F]{6}$/.test(s)) {
    const r = parseInt(s.slice(1, 3), 16)
    const g = parseInt(s.slice(3, 5), 16)
    const b = parseInt(s.slice(5, 7), 16)
    return { r, g, b, a: 1 }
  }
  if (/^#[0-9a-fA-F]{8}$/.test(s)) {
    const r = parseInt(s.slice(1, 3), 16)
    const g = parseInt(s.slice(3, 5), 16)
    const b = parseInt(s.slice(5, 7), 16)
    const a = clamp01(parseInt(s.slice(7, 9), 16) / 255)
    return { r, g, b, a }
  }

  // rgb/rgba
  const m = s.match(/^rgba?\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})(?:\s*,\s*([0-9.]+)\s*)?\)$/i)
  if (m) {
    const r = clamp255(Number(m[1]))
    const g = clamp255(Number(m[2]))
    const b = clamp255(Number(m[3]))
    const a = m[4] == null ? 1 : clamp01(Number(m[4]))
    return { r, g, b, a }
  }

  return null
}

function toHex6(raw: any, baseRaw?: any): string | null {
  const c = parseColor(raw)
  if (!c) return null

  const base = parseColor(baseRaw) || parseColor('#0d2444') || { r: 13, g: 36, b: 68, a: 1 }

  const h = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
  const hex = (r: number, g: number, b: number) => (`#${h(r)}${h(g)}${h(b)}`).toLowerCase()

  // Se ha alpha, "flatten" sul colore base (così il valore in panel corrisponde a quello visto)
  if (c.a < 0.999) {
    const r = base.r * (1 - c.a) + c.r * c.a
    const g = base.g * (1 - c.a) + c.g * c.a
    const b = base.b * (1 - c.a) + c.b * c.a
    return hex(r, g, b)
  }

  return hex(c.r, c.g, c.b)
}

function firstSolidFromGradient(raw: any): string | null {
  const s = String(raw || '').trim()
  if (!s) return null
  if (!/gradient/i.test(s)) return null
  const m = s.match(/#[0-9a-fA-F]{6,8}/)
  return m ? toHex6(m[0]) : null
}

// ── Micro-componenti ──────────────────────────────────────────────────────────
function Inp(p: { value:string|number; onChange:(v:string)=>void; type?:string; placeholder?:string }) {
  return <input type={p.type||'text'} value={p.value} onChange={e=>p.onChange(e.target.value)} placeholder={p.placeholder} style={P.inp}/>
}
function NumInp(p: { value:number; onChange:(v:number)=>void; min?:number; max?:number; step?:number; unit?:string }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
      <input type='number' value={p.value} min={p.min} max={p.max} step={p.step||1}
        onChange={e=>p.onChange(Number(e.target.value))} style={{ ...P.inp, width:68 }}/>
      {p.unit && <span style={{ fontSize:11, color:'#a0aec0', flexShrink:0 }}>{p.unit}</span>}
    </div>
  )
}
function ColInp(p: { value:string; onChange:(v:string)=>void; base?:string }) {
  const [txt, setTxt] = React.useState<string>(String(p.value || ''))
  React.useEffect(() => { setTxt(String(p.value || '')) }, [p.value])

  const safe = toHex6(txt, p.base) ?? toHex6(p.value, p.base) ?? '#000000'

  return (
    <div style={{ display:'flex', alignItems:'center', gap:7 }}>
      <input
        type='color'
        value={safe}
        onChange={e=>p.onChange(e.target.value)}
        aria-label='Scegli colore'
        style={{
          width:32, height:32,
          borderRadius:6,
          border:'1px solid rgba(255,255,255,0.18)',
          background:'transparent',
          padding:0,
          cursor:'pointer',
          flexShrink:0
        }}
      />
      <input
        type='text'
        value={txt}
        onChange={e=>setTxt(e.target.value)}
        onBlur={()=>{
          const v = toHex6(txt, p.base)
          if (v) p.onChange(v)
          else setTxt(String(p.value || ''))
        }}
        placeholder='#rrggbb'
        style={{ ...P.inp, flex:1, fontSize:11 }}
      />
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
function ImgUpload(p: { value:string; onChange:(v:string)=>void }) {
  const ref = React.useRef<HTMLInputElement|null>(null)
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {p.value && (
        <div style={{ width:64, height:64, borderRadius:10, overflow:'hidden', border:'1px solid rgba(255,255,255,0.15)', background:'#000', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <img src={p.value} alt='preview' style={{ width:'100%', height:'100%', objectFit:'contain' }}/>
        </div>
      )}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap' as const }}>
        <button type='button' onClick={()=>ref.current?.click()}
          style={{ padding:'6px 14px', borderRadius:7, border:'1px solid rgba(147,197,253,0.4)', background:'rgba(59,130,246,0.15)', color:'#93c5fd', fontSize:12, fontWeight:600, cursor:'pointer' }}>
          📁 Scegli dal PC
        </button>
        {p.value && (
          <button type='button' onClick={()=>p.onChange('')}
            style={{ padding:'6px 12px', borderRadius:7, border:'1px solid rgba(252,165,165,0.4)', background:'rgba(239,68,68,0.12)', color:'#fca5a5', fontSize:12, fontWeight:600, cursor:'pointer' }}>
            ✕ Rimuovi
          </button>
        )}
        <input ref={ref} type='file' accept='image/*' style={{ display:'none' }}
          onChange={e=>{ const f=e.target.files?.[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{ if(typeof r.result==='string') p.onChange(r.result) }; r.readAsDataURL(f); if(ref.current) ref.current.value='' }}/>
      </div>
      <div style={P.hint}>PNG, SVG o JPG. Salvato come base64 nella configurazione.</div>
    </div>
  )
}

// ── Selezione pagina ExB ──────────────────────────────────────────────────────
function getBuilderAppConfig(): any {
  try {
    const state: any = getAppStore()?.getState?.()
    return state?.appStateInBuilder?.appConfig ?? state?.appConfig
  } catch {
    return null
  }
}

function getPagesMap(appConfig: any): Record<string, any> {
  const rawPages: any = appConfig?.pages ?? {}
  return rawPages?.asMutable ? rawPages.asMutable({ deep: true }) :
    rawPages?.toJS ? rawPages.toJS() :
      rawPages
}

function resolvePageIdInBuilder(pageTokenRaw: string): string | null {
  const tok0 = (pageTokenRaw || '').trim()
  if (!tok0) return null

  let tok = tok0.replace(/^#+\/?/, '').replace(/^\/+/, '')
  if (tok.startsWith('page/')) tok = tok.slice(5)

  try {
    const appConfig = getBuilderAppConfig()
    const pagesMap = getPagesMap(appConfig)
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

function listVisiblePagesInBuilder(): Array<{ pageId: string; label: string; token: string }> {
  try {
    const appConfig = getBuilderAppConfig()
    if (!appConfig) return []

    const pagesMap = getPagesMap(appConfig)
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

function PageSel(p: { value:string; onChange:(v:string)=>void }) {
  const pages = React.useMemo(() => {
    try {
      const state: any = getAppStore()?.getState?.()

      // In Builder: l'app che stai editando è qui (non l'app del Builder)
      const appConfig = state?.appStateInBuilder?.appConfig ?? state?.appConfig

      const rawPages: any = appConfig?.pages ?? {}
      const pagesMap: Record<string, any> =
        rawPages?.asMutable ? rawPages.asMutable({ deep: true }) :
        rawPages?.toJS ? rawPages.toJS() :
        rawPages

      const entries = Object.entries(pagesMap)
      if (entries.length === 0) return []

      return entries
        .filter(([, pg]: any) => pg?.isVisible !== false)
        .map(([pageId, pg]: [string, any]) => {
          const label = pg?.label || pg?.title || pg?.name || pageId

          // value = quello che conviene salvare per la navigazione (di solito pg.name, cioè lo "slug" in URL)
          const value =
            pg?.name ||
            appConfig?.historyLabels?.page?.[pageId] ||
            pageId

          return { value: String(value), label: String(label) }
        })
        .sort((a, b) => a.label.localeCompare(b.label, 'it'))
    } catch (e) {
      console.warn('GII Homepage: impossibile leggere le pagine', e)
      return []
    }
  }, [])

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
      style={{ width:24, height:24, borderRadius:5, border:'1px solid rgba(255,255,255,0.15)', background:'rgba(255,255,255,0.07)', color:'#d1d5db', fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
      {bp.children}
    </button>
  )

  return (
    <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:8, padding:'8px 10px', marginTop:8, display:'flex', alignItems:'center', gap:10 }}>

      {/* Icona + label — colonna sinistra */}
      <div style={{ flexShrink:0, width:90 }}>
        <div style={{ fontSize:14, marginBottom:2 }}>{p.icon}</div>
        <div style={{ fontSize:10, fontWeight:700, color: moved ? '#93c5fd' : '#a0aec0', lineHeight:1.3, wordBreak:'break-word' as const }}>
          {p.label}
        </div>
        {moved && (
          <div style={{ fontSize:9, color:'#a0aec0', marginTop:2 }}>
            {x!==0?`X${x>0?'+':''}${x}`:''}
            {x!==0&&y!==0?' ':''}
            {y!==0?`Y${y>0?'+':''}${y}`:''}
          </div>
        )}
      </div>

      {/* Croce frecce */}
      <div style={{ display:'grid', gridTemplateColumns:'24px 24px 24px', gridTemplateRows:'24px 24px 24px', gap:3, flexShrink:0 }}>
        <div/><Btn onClick={()=>mv(0,-STEP)} title='Su'>↑</Btn><div/>
        <Btn onClick={()=>mv(-STEP,0)} title='Sinistra'>←</Btn>
        <button type='button' onClick={reset} title='Azzera'
          style={{ width:24, height:24, borderRadius:5, border:'1px solid rgba(255,255,255,0.10)', background:'transparent', color: moved?'#f87171':'#6b7280', fontSize:11, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
          ↺
        </button>
        <Btn onClick={()=>mv(STEP,0)} title='Destra'>→</Btn>
        <div/><Btn onClick={()=>mv(0,STEP)} title='Giù'>↓</Btn><div/>
      </div>

      {/* Campi X/Y */}
      <div style={{ display:'flex', flexDirection:'column', gap:4, flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
          <span style={{ fontSize:10, color:'#a0aec0', width:10 }}>X</span>
          <input type='number' value={x} step={1} onChange={e=>p.onChange({ x:Number(e.target.value), y })}
            style={{ ...P.inp, width:52, padding:'2px 5px', fontSize:11 }}/>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
          <span style={{ fontSize:10, color:'#a0aec0', width:10 }}>Y</span>
          <input type='number' value={y} step={1} onChange={e=>p.onChange({ x, y:Number(e.target.value) })}
            style={{ ...P.inp, width:52, padding:'2px 5px', fontSize:11 }}/>
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
  {value:'DA',label:'DA'},{value:'ADMIN',label:'ADMIN'}
]

let _newCardCounter = 0

// ── Main Setting ──────────────────────────────────────────────────────────────
export default function Setting(props: AllWidgetSettingProps<IMConfig>) {
  const cfg: any = { ...defaultConfig, ...(props.config as any) }
  const cards: CardConfig[] = Array.isArray(cfg.cards) ? cfg.cards.map((c:any)=>({...c})) : defaultConfig.cards
  const excludedPageIds: string[] = Array.isArray(cfg.excludedPageIds) ? cfg.excludedPageIds.map((s:any)=>String(s)) : []

  const [openSec,  setOpenSec]  = React.useState<string>('posizione')
  const [openCard, setOpenCard] = React.useState<string|null>(null)

  const [dragFrom, setDragFrom] = React.useState<number|null>(null)
  const [dragOver, setDragOver] = React.useState<number|null>(null)

  const setCfg = (patch: any) =>
    props.onSettingChange({ id:props.id, config:{ ...cfg, ...patch } as any })

  const set = (key:string, value:any) => setCfg({ [key]: value })
  const setCard = (idx:number, patch:Partial<CardConfig>) =>
    set('cards', cards.map((c,i)=>i===idx?{...c,...patch}:c))
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
      colorBg: '#0c329d',
      colorAccent: '#6fa5fb',
      colorBgRest: '#192e4d',
      colorBgHover: '#0c329d',
      roles: ['*']
    }
    const next = [...cards, newCard]
    set('cards', next)
    setOpenCard(newCard.id)
  }

  const removeCard = (idx:number) => {
    const card = cards[idx]
    if (!card) return
    if (!window.confirm('Rimuovere questa card?')) return

    // Se la card punta a una pagina reale, la escludiamo dall'autogenerazione
    // così non ricompare automaticamente.
    const pid = resolvePageIdInBuilder(card.hashPage)
    const nextExcluded = pid && !excludedPageIds.includes(pid)
      ? [...excludedPageIds, pid]
      : excludedPageIds

    setCfg({
      cards: cards.filter((_, i) => i !== idx),
      excludedPageIds: nextExcluded
    })
    setOpenCard(null)
  }

  
  // ── Migrazione (una tantum): normalizza i colori delle cards (solo solidi, niente alpha/gradienti)
  React.useEffect(() => {
    let changed = false
    const nextCards = cards.map((c: any) => {
      let out: any = c

      const base = cfg.bgGradMid || '#0d2444'
      const nextRest = toHex6(c.colorBgRest, base) || '#192e4d'
      let nextHover = toHex6(c.colorBgHover, base) || toHex6(firstSolidFromGradient(c.colorBgHover), base)

      // Se "Sfondo hover" non è impostato, prova a recuperare il vecchio colore legacy
      if (!nextHover) {
        const legacy = toHex6(c.colorBg, base)
        if (legacy) nextHover = legacy
      }

      // Fallback finale: hover = riposo
      if (!nextHover) nextHover = nextRest

      const curRest = String(c.colorBgRest || '').trim().toLowerCase()
      const curHov  = String(c.colorBgHover || '').trim().toLowerCase()

      if (curRest !== nextRest) { out = { ...out, colorBgRest: nextRest }; changed = true }
      if (curHov  !== nextHover) { out = { ...out, colorBgHover: nextHover }; changed = true }

      return out
    })
    if (changed) setCfg({ cards: nextCards })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])


// ── Auto-sync: aggiunge automaticamente le pagine mancanti come cards ──
  const pages = listVisiblePagesInBuilder()
  const pagesKey = pages.map(p => p.pageId).join('|')
  React.useEffect(() => {
    // Prima render: attiva l'auto-sync una volta (e poi quando cambiano le pagine).
    if (!pages.length) return

    // Copertura: pagine già presenti nelle cards.
    const covered = new Set<string>()
    for (const c of cards) {
      const pid = resolvePageIdInBuilder(c.hashPage)
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
        colorBgHover: bg,
        roles: ['*']
      }
    })

    setCfg({ cards: [...cards, ...toAdd] })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagesKey])

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
          <strong>Riga 1:</strong> Logo+Titoli · Login &nbsp;|&nbsp; <strong>Riga 2:</strong> Banner · Orologio &nbsp;|&nbsp; <strong>Riga 3:</strong> Cards
        </div>
        <Nudge label='Logo + Titoli'    icon='🖼' value={getOffset('offsetLogo')}   onChange={v=>set('offsetLogo',v)}/>
        <Nudge label='Login / Esci'     icon='🔐' value={getOffset('offsetLogin')}  onChange={v=>set('offsetLogin',v)}/>
        <Nudge label='Banner utente'    icon='👤' value={getOffset('offsetBanner')} onChange={v=>set('offsetBanner',v)}/>
        <Nudge label='Orologio + Data'  icon='🕐' value={getOffset('offsetClock')}  onChange={v=>set('offsetClock',v)}/>
        <Nudge label='Sezione + Cards'  icon='🃏' value={getOffset('offsetCards')}  onChange={v=>set('offsetCards',v)}/>
        <div style={{ marginTop:10 }}>
          <button type='button'
            onClick={()=>['offsetLogo','offsetLogin','offsetClock','offsetBanner','offsetCards'].forEach(k=>set(k,{x:0,y:0}))}
            style={{ padding:'4px 12px', borderRadius:6, border:'1px solid rgba(255,255,255,0.15)', background:'rgba(255,255,255,0.05)', color:'#9ca3af', fontSize:11, cursor:'pointer' }}>
            ↺ Azzera tutti
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

      {/* ═══ OROLOGIO ═══ */}
      <Acc id='clock' label='🕐 Orologio e data'/>
      {openSec==='clock' && <div>
        <Check value={cfg.showClock} onChange={v=>set('showClock',v)} label='Mostra orologio e data'/>
        {cfg.showClock && <>
          <div style={P.row2}>
            <div><label style={P.lbl}>Colore ora</label><ColInp value={cfg.clockColor} onChange={v=>set('clockColor',v)}/></div>
            <div><label style={P.lbl}>Dim. ora</label><NumInp value={cfg.clockSize} onChange={v=>set('clockSize',v)} min={12} max={48} unit='px'/></div>
          </div>
          <div style={P.row2}>
            <div><label style={P.lbl}>Colore data</label><ColInp value={cfg.dateColor} onChange={v=>set('dateColor',v)}/></div>
            <div><label style={P.lbl}>Dim. data</label><NumInp value={cfg.dateSize} onChange={v=>set('dateSize',v)} min={9} max={20} unit='px'/></div>
          </div>
        </>}
      </div>}

      {/* ═══ BANNER UTENTE ═══ */}
      <Acc id='user' label='👤 Banner utente'/>
      {openSec==='user' && <div>
        <Check value={cfg.showUserBanner} onChange={v=>set('showUserBanner',v)} label='Mostra banner utente loggato'/>
        {cfg.showUserBanner && <>
          <label style={P.lbl}>Sfondo banner</label><ColInp value={cfg.userBannerBg} onChange={v=>set('userBannerBg',v)}/>
          <label style={P.lbl}>Bordo banner</label><ColInp value={cfg.userBannerBorderColor} onChange={v=>set('userBannerBorderColor',v)}/>
          <label style={P.lbl}>Avatar — colore 1</label><ColInp value={cfg.userAvatarBg1} onChange={v=>set('userAvatarBg1',v)}/>
          <label style={P.lbl}>Avatar — colore 2</label><ColInp value={cfg.userAvatarBg2} onChange={v=>set('userAvatarBg2',v)}/>
          <div style={P.row2}>
            <div><label style={P.lbl}>Colore nome</label><ColInp value={cfg.userNameColor} onChange={v=>set('userNameColor',v)}/></div>
            <div><label style={P.lbl}>Dim. nome</label><NumInp value={cfg.userNameSize} onChange={v=>set('userNameSize',v)} min={10} max={24} unit='px'/></div>
          </div>
          <label style={P.lbl}>Sfondo badge ruolo</label><ColInp value={cfg.userBadgeBg} onChange={v=>set('userBadgeBg',v)}/>
          <label style={P.lbl}>Colore testo badge</label><ColInp value={cfg.userBadgeColor} onChange={v=>set('userBadgeColor',v)}/>
          <label style={P.lbl}>Colore testo info</label><ColInp value={cfg.userInfoColor} onChange={v=>set('userInfoColor',v)}/>
        </>}
      </div>}

      {/* ═══ LABEL SEZIONE ═══ */}
      <Acc id='seclabel' label='🏷 Etichetta sezione'/>
      {openSec==='seclabel' && <div>
        <label style={P.lbl}>Testo</label><Inp value={cfg.sectionLabelText} onChange={v=>set('sectionLabelText',v)}/>
        <div style={P.row3}>
          <div><label style={P.lbl}>Colore</label><ColInp value={cfg.sectionLabelColor} onChange={v=>set('sectionLabelColor',v)}/></div>
          <div><label style={P.lbl}>Dim.</label><NumInp value={cfg.sectionLabelSize} onChange={v=>set('sectionLabelSize',v)} min={8} max={20} unit='px'/></div>
          <div><label style={P.lbl}>Spaziatura</label><NumInp value={cfg.sectionLabelSpacing} onChange={v=>set('sectionLabelSpacing',v)} min={0} max={10} step={0.5} unit='px'/></div>
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
          const ri=cards.findIndex(c=>c.id===card.id)
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
                  <div style={{ width:12,height:12,borderRadius:3,background:(card.colorBgHover || card.colorBgRest || '#192e4d'),flexShrink:0,border:`1px solid ${card.colorAccent}` }}/>
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
                <Check value={card.visible} onChange={v=>setCard(ri,{visible:v})} label='Visibile'/>
                <label style={P.lbl}>Etichetta</label><Inp value={card.label} onChange={v=>setCard(ri,{label:v})}/>
                <label style={P.lbl}>Descrizione</label>
                <textarea value={card.desc} onChange={e=>setCard(ri,{desc:e.target.value})} rows={2} style={{ ...P.inp,resize:'vertical',fontFamily:'inherit' }}/>

                <label style={P.lbl}>Pagina di destinazione</label>
                <PageSel value={card.hashPage} onChange={v=>setCard(ri,{hashPage:v})}/>

                <div>
                  <label style={P.lbl}>Colore bordo / icona</label>
                  <ColInp value={card.colorAccent} onChange={v=>setCard(ri,{colorAccent:v})}/>
                </div>
                <div style={P.row2}>
                  <div><label style={P.lbl}>Sfondo card (riposo)</label><ColInp value={card.colorBgRest||'#192e4d'} base={cfg.bgGradMid} onChange={v=>setCard(ri,{colorBgRest:v})}/></div>
                  <div><label style={P.lbl}>Sfondo card (hover)</label><ColInp value={card.colorBgHover || card.colorBgRest || '#192e4d'} base={cfg.bgGradMid} onChange={v=>setCard(ri,{colorBgHover:v})}/></div>
                </div>

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
                          setCard(ri,{roles:next})
                        }}/>
                        {ro.label}
                      </label>
                    )
                  })}
                </div>

                {/* Rimuovi — solo per card personalizzate */}
                {isCustom && (
                  <button type='button' onClick={()=>removeCard(ri)}
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
          <div style={P.row2}>
            <div><label style={P.lbl}>Colore</label><ColInp value={cfg.footerColor} onChange={v=>set('footerColor',v)}/></div>
            <div><label style={P.lbl}>Dimensione</label><NumInp value={cfg.footerSize} onChange={v=>set('footerSize',v)} min={8} max={16} unit='px'/></div>
          </div>
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
