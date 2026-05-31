/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx, getAppStore } from 'jimu-core'
import { type AllWidgetSettingProps } from 'jimu-for-builder'
import { defaultConfig, type IMConfig, type NavItem } from '../config'

const P = {
  wrap: { padding:'0 12px 32px', fontSize:13, background:'#1a1f2e', minHeight:'100%', color:'#e5e7eb' } as React.CSSProperties,
  sec: { fontSize:11, fontWeight:700, color:'#93c5fd', textTransform:'uppercase' as const, letterSpacing:1.2, borderBottom:'1px solid rgba(255,255,255,0.10)', paddingBottom:6, marginBottom:14, marginTop:22 } as React.CSSProperties,
  lbl: { fontSize:11.5, fontWeight:600, color:'#d1d5db', display:'block', marginBottom:4, marginTop:10 } as React.CSSProperties,
  hint: { fontSize:10.5, color:'#a0aec0', marginTop:3, lineHeight:1.4 } as React.CSSProperties,
  row2: { display:'grid', gridTemplateColumns:'repeat(2, minmax(0, 1fr))', gap:8, minWidth:0 } as React.CSSProperties,
  row3: { display:'grid', gridTemplateColumns:'repeat(3, minmax(0, 1fr))', gap:6, minWidth:0 } as React.CSSProperties,
  inp: { width:'100%', padding:'5px 8px', fontSize:12, border:'1px solid rgba(255,255,255,0.15)', borderRadius:6, outline:'none', boxSizing:'border-box' as const, background:'rgba(255,255,255,0.07)', color:'#e5e7eb' } as React.CSSProperties,
  check: { display:'flex', alignItems:'center', gap:8, fontSize:12, color:'#d1d5db', cursor:'pointer', marginTop:8 } as React.CSSProperties
}

function Inp (p: { value: string | number, onChange: (v: string) => void, type?: string, placeholder?: string }) {
  return <input type={p.type || 'text'} value={p.value} onChange={e => p.onChange(e.target.value)} placeholder={p.placeholder} style={P.inp} />
}
function NumInp (p: { value: number, onChange: (v: number) => void, min?: number, max?: number, step?: number, unit?: string }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:3, minWidth:0, width:'100%' }}>
      <input type='number' value={p.value} min={p.min} max={p.max} step={p.step || 1}
        onChange={e => p.onChange(Number(e.target.value))} style={{ ...P.inp, width:52, minWidth:0, padding:'5px 4px', textAlign:'center' }} />
      {p.unit && <span style={{ fontSize:10, color:'#a0aec0', flexShrink:0 }}>{p.unit}</span>}
    </div>
  )
}
function ColInp (p: { value: string, onChange: (v: string) => void }) {
  const hexVal = /^#[0-9a-fA-F]{3,8}$/.test(p.value) ? p.value : '#1d4ed8'
  return (
    <div style={{ display:'flex', alignItems:'center', gap:7 }}>
      <input type='color' value={hexVal} onChange={e => p.onChange(e.target.value)}
        style={{ width:32, height:28, padding:2, border:'1px solid rgba(255,255,255,0.15)', borderRadius:6, cursor:'pointer', background:'transparent', flexShrink:0 }} />
      <input type='text' value={p.value} onChange={e => p.onChange(e.target.value)}
        placeholder='#rrggbb o rgba(...)' style={{ ...P.inp, flex:1, fontSize:11 }} />
    </div>
  )
}
function Check (p: { value: boolean, onChange: (v: boolean) => void, label: string }) {
  return (
    <label style={P.check}>
      <input type='checkbox' checked={p.value} onChange={e => p.onChange(e.target.checked)} />
      {p.label}
    </label>
  )
}
function Sel (p: { value: string, onChange: (v: string) => void, options: Array<{ value: string, label: string }> }) {
  return (
    <select value={p.value} onChange={e => p.onChange(e.target.value)} style={{ ...P.inp, cursor:'pointer' }}>
      {p.options.map(o => <option key={o.value} value={o.value} style={{ background:'#1a1f2e', color:'#e5e7eb' }}>{o.label}</option>)}
    </select>
  )
}

function PageSel (p: { value: string, onChange: (v: string) => void }) {
  const pages = React.useMemo(() => {
    try {
      const state: any = getAppStore()?.getState?.()
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
          const value = pg?.name || appConfig?.historyLabels?.page?.[pageId] || pageId
          return { value: String(value), label: String(label) }
        })
        .sort((a, b) => a.label.localeCompare(b.label, 'it'))
    } catch {
      return []
    }
  }, [])

  if (pages.length === 0) {
    return (
      <div>
        <Inp value={p.value} onChange={p.onChange} placeholder='inserisci il nome/ID della pagina' />
        <div style={{ ...P.hint, color:'#f87171', marginTop:4 }}>
          ⚠ Impossibile leggere le pagine. Inserisci manualmente il valore che vedi nell&apos;URL.
        </div>
      </div>
    )
  }

  return (
    <div>
      <select value={p.value} onChange={e => p.onChange(e.target.value)} style={{ ...P.inp, cursor:'pointer' }}>
        <option value='' style={{ background:'#1a1f2e', color:'#9ca3af' }}>— seleziona una pagina —</option>
        {pages.map(pg => (
          <option key={pg.value} value={pg.value} style={{ background:'#1a1f2e', color:'#e5e7eb' }}>{pg.label}</option>
        ))}
      </select>
      {p.value && <div style={{ fontSize:10, color:'#a0aec0', marginTop:3 }}>Target: {p.value}</div>}
    </div>
  )
}

function SectionSel (p: { value: string, onChange: (v: string) => void }) {
  const sections = React.useMemo(() => {
    try {
      const state: any = getAppStore()?.getState?.()
      const appConfig = state?.appStateInBuilder?.appConfig ?? state?.appConfig
      const raw: any = appConfig?.sections ?? {}
      const map: Record<string, any> =
        raw?.asMutable ? raw.asMutable({ deep: true }) :
        raw?.toJS ? raw.toJS() :
        raw
      return Object.entries(map).map(([id, s]: [string, any]) => ({
        value: id,
        label: `${s?.label || id} (${(s?.views || []).length} viste)`
      })).sort((a, b) => a.value.localeCompare(b.value))
    } catch { return [] }
  }, [])
  return (
    <select value={p.value} onChange={e => p.onChange(e.target.value)} style={{ ...P.inp, cursor:'pointer' }}>
      <option value='' style={{ background:'#1a1f2e', color:'#9ca3af' }}>— nessuna (navigazione pagine) —</option>
      {sections.map(s => (
        <option key={s.value} value={s.value} style={{ background:'#1a1f2e', color:'#e5e7eb' }}>{s.label}</option>
      ))}
    </select>
  )
}

function ViewSel (p: { value: string, onChange: (v: string) => void, sectionId: string }) {
  const views = React.useMemo(() => {
    if (!p.sectionId) return []
    try {
      const state: any = getAppStore()?.getState?.()
      const appConfig = state?.appStateInBuilder?.appConfig ?? state?.appConfig
      const rawSections: any = appConfig?.sections ?? {}
      const sectionsMap: Record<string, any> =
        rawSections?.asMutable ? rawSections.asMutable({ deep: true }) :
        rawSections?.toJS ? rawSections.toJS() :
        rawSections
      const sec = sectionsMap[p.sectionId]
      if (!sec?.views?.length) return []
      const rawViews: any = appConfig?.views ?? {}
      const viewsMap: Record<string, any> =
        rawViews?.asMutable ? rawViews.asMutable({ deep: true }) :
        rawViews?.toJS ? rawViews.toJS() :
        rawViews
      return (sec.views as string[]).map((vid: string) => ({
        value: vid,
        label: viewsMap[vid]?.label || vid
      }))
    } catch { return [] }
  }, [p.sectionId])

  if (!p.sectionId) return <div style={P.hint}>Configura prima la sezione a livello widget.</div>
  if (views.length === 0) return <div style={{ ...P.hint, color:'#f87171' }}>Nessuna vista trovata nella sezione.</div>
  return (
    <select value={p.value} onChange={e => p.onChange(e.target.value)} style={{ ...P.inp, cursor:'pointer' }}>
      <option value='' style={{ background:'#1a1f2e', color:'#9ca3af' }}>— nessuna —</option>
      {views.map(v => (
        <option key={v.value} value={v.value} style={{ background:'#1a1f2e', color:'#e5e7eb' }}>{v.label} ({v.value})</option>
      ))}
    </select>
  )
}

const FONTS = [
  { value:"'Crimson Pro', Georgia, serif", label:'Crimson Pro (serif)' },
  { value:"'Source Sans 3', 'Segoe UI', sans-serif", label:'Source Sans 3 (sans)' },
  { value:'Georgia, serif', label:'Georgia' },
  { value:"'Times New Roman', serif", label:'Times New Roman' },
  { value:"'Trebuchet MS', sans-serif", label:'Trebuchet MS' },
  { value:"'Palatino Linotype', serif", label:'Palatino Linotype' },
  { value:"'Courier New', monospace", label:'Courier New' },
  { value:'Impact, sans-serif', label:'Impact' }
]
const WEIGHTS = [300, 400, 500, 600, 700, 800, 900].map(w => ({ value:String(w), label:String(w) }))
const ROLE_OPTIONS = [
  { value:'*', label:'Tutti' }, { value:'TR', label:'TR' }, { value:'TI', label:'TI' },
  { value:'TI_AMM', label:'TI_AMM' }, { value:'RZ', label:'RZ' }, { value:'RI', label:'RI' },
  { value:'RI_AMM', label:'RI_AMM' }, { value:'DT', label:'DT' }, { value:'DA', label:'DA' },
  { value:'ADMIN', label:'ADMIN' }
]
const ICON_OPTIONS = [
  { value:'home', label:'🏠 Home' },
  { value:'elenco', label:'📋 Elenco' },
  { value:'nuova', label:'➕ Nuova' },
  { value:'mappa', label:'🗺 Mappa' },
  { value:'dashboard', label:'📊 Dashboard' },
  { value:'report', label:'📄 Report' }
]

function makeNewItem (order: number): NavItem {
  return {
    id: `nav_custom_${Date.now()}`,
    visible: true,
    order,
    label: 'Nuova voce',
    hashPage: '',
    section: '',
    viewId: '',
    collapseSidebar: false,
    colorBg: '#1e3a5f',
    colorAccent: '#60a5fa',
    colorBgRest: 'rgba(255,255,255,0.05)',
    colorBgHover: '#1e3a5fee',
    roles: ['*'],
    icon: 'home'
  }
}

export default function Setting (props: AllWidgetSettingProps<IMConfig>) {
  const cfg: any = { ...defaultConfig, ...(props.config as any) }
  const items: NavItem[] = Array.isArray(cfg.items) ? cfg.items.map((i:any) => ({ ...i })) : defaultConfig.items
  const [openItem, setOpenItem] = React.useState<string | null>(null)

  const set = (key: string, value: any) => props.onSettingChange({ id: props.id, config: { ...cfg, [key]: value } as any })
  const setItem = (idx: number, patch: Partial<NavItem>) => set('items', items.map((it, i) => i === idx ? { ...it, ...patch } : it))
  const moveItem = (id: string, dir: -1 | 1) => {
    const ordered = items
      .map((it, rawIndex) => ({ ...it, rawIndex }))
      .sort((a, b) => {
        const ao = Number.isFinite(Number(a.order)) ? Number(a.order) : a.rawIndex
        const bo = Number.isFinite(Number(b.order)) ? Number(b.order) : b.rawIndex
        return ao === bo ? a.rawIndex - b.rawIndex : ao - bo
      })

    const from = ordered.findIndex(it => it.id === id)
    const to = from + dir
    if (from < 0 || to < 0 || to >= ordered.length) return

    const current = ordered[from]
    const target = ordered[to]
    const currentOrder = Number.isFinite(Number(current.order)) ? Number(current.order) : from
    const targetOrder = Number.isFinite(Number(target.order)) ? Number(target.order) : to

    const next = items.map(it => {
      if (it.id === current.id) return { ...it, order: targetOrder }
      if (it.id === target.id) return { ...it, order: currentOrder }
      return { ...it }
    })
    set('items', next)
  }
  const addItem = () => {
    const maxOrder = items.reduce((m, it) => Math.max(m, it.order), 0)
    const newItem = makeNewItem(maxOrder + 1)
    set('items', [...items, newItem])
    setOpenItem(newItem.id)
  }
  const removeItem = (id: string) => {
    if (!window.confirm('Rimuovere questa voce dal nav orizzontale?')) return
    set('items', items.filter(it => it.id !== id))
    setOpenItem(null)
  }

  const sorted = [...items].sort((a, b) => a.order - b.order)

  return (
    <div style={P.wrap}>
      <div style={P.sec}>⚙ Layout</div>
      <div style={P.row3}>
        <div><label style={P.lbl}>Gap</label><NumInp value={cfg.gap} onChange={v => set('gap', v)} min={0} max={24} unit='px' /></div>
        <div><label style={P.lbl}>Larghezza pulsanti</label><NumInp value={cfg.itemWidth} onChange={v => set('itemWidth', v)} min={80} max={400} unit='px' /></div>
        <div><label style={P.lbl}>Altezza pulsanti</label><NumInp value={cfg.itemHeight} onChange={v => set('itemHeight', v)} min={28} max={100} unit='px' /></div>
      </div>
      <div style={P.row3}>
        <div><label style={P.lbl}>Bordi arrot.</label><NumInp value={cfg.itemBorderRadius} onChange={v => set('itemBorderRadius', v)} min={0} max={30} unit='px' /></div>
        <div><label style={P.lbl}>Padding orizz.</label><NumInp value={cfg.itemPaddingX} onChange={v => set('itemPaddingX', v)} min={0} max={40} unit='px' /></div>
        <div><label style={P.lbl}>Padding vert.</label><NumInp value={cfg.itemPaddingY} onChange={v => set('itemPaddingY', v)} min={0} max={30} unit='px' /></div>
      </div>
      <div style={P.row2}>
        <div><label style={P.lbl}>Dimensione icona</label><NumInp value={cfg.iconSize} onChange={v => set('iconSize', v)} min={10} max={32} unit='px' /></div>
        <div><label style={P.lbl}>Box icona</label><NumInp value={cfg.iconBoxSize} onChange={v => set('iconBoxSize', v)} min={18} max={40} unit='px' /></div>
      </div>
      <label style={P.lbl}>Font etichette</label>
      <Sel value={cfg.labelFont} onChange={v => set('labelFont', v)} options={FONTS} />
      <div style={P.row2}>
        <div><label style={P.lbl}>Dimensione etichetta</label><NumInp value={cfg.labelSize} onChange={v => set('labelSize', v)} min={10} max={22} unit='px' /></div>
        <div><label style={P.lbl}>Peso etichetta</label><Sel value={String(cfg.labelWeight)} onChange={v => set('labelWeight', Number(v))} options={WEIGHTS} /></div>
      </div>

      <div style={P.sec}>🎨 Colori tab</div>
      <Check value={!!cfg.tabUseCustomColors} onChange={v => set('tabUseCustomColors', v)} label='Usa colori globali per tutte le tab' />
      <div style={{ opacity: cfg.tabUseCustomColors ? 1 : 0.55 }}>
        <div style={P.row2}>
          <div><label style={P.lbl}>Bordo normale</label><ColInp value={cfg.tabBorderColorRest || 'rgba(255,255,255,0.10)'} onChange={v => set('tabBorderColorRest', v)} /></div>
          <div><label style={P.lbl}>Bordo hover/attivo</label><ColInp value={cfg.tabBorderColorActive || '#3d77c9'} onChange={v => set('tabBorderColorActive', v)} /></div>
        </div>
        <div style={P.row2}>
          <div><label style={P.lbl}>Sfondo normale</label><ColInp value={cfg.tabBgColorRest || 'rgba(255,255,255,0.05)'} onChange={v => set('tabBgColorRest', v)} /></div>
          <div><label style={P.lbl}>Sfondo hover/attivo</label><ColInp value={cfg.tabBgColorHover || '#1d3557'} onChange={v => set('tabBgColorHover', v)} /></div>
        </div>
        <div style={P.row2}>
          <div><label style={P.lbl}>Testo normale</label><ColInp value={cfg.tabTextColorRest || 'rgba(255,255,255,0.92)'} onChange={v => set('tabTextColorRest', v)} /></div>
          <div><label style={P.lbl}>Testo hover/attivo</label><ColInp value={cfg.tabTextColorActive || '#ffffff'} onChange={v => set('tabTextColorActive', v)} /></div>
        </div>
        <div style={P.hint}>Se disattivato, restano validi i colori configurati sulle singole voci di navigazione.</div>
      </div>

      <div style={P.sec}>↔ Colori SidebarResetButton</div>
      <Check value={!!cfg.sidebarResetUseCustomColors} onChange={v => set('sidebarResetUseCustomColors', v)} label='Usa colori personalizzati per il pulsante reset sidebar' />
      <div style={{ opacity: cfg.sidebarResetUseCustomColors ? 1 : 0.55 }}>
        <div style={P.row3}>
          <div><label style={P.lbl}>Bordo</label><ColInp value={cfg.sidebarResetBorderColor || '#3d77c9'} onChange={v => set('sidebarResetBorderColor', v)} /></div>
          <div><label style={P.lbl}>Sfondo normale</label><ColInp value={cfg.sidebarResetBgColorRest || 'rgba(255,255,255,0.05)'} onChange={v => set('sidebarResetBgColorRest', v)} /></div>
          <div><label style={P.lbl}>Sfondo hover</label><ColInp value={cfg.sidebarResetBgColorHover || '#1d3557'} onChange={v => set('sidebarResetBgColorHover', v)} /></div>
        </div>
        <div style={P.hint}>Se disattivato, il pulsante reset eredita i colori della tab attiva.</div>
      </div>

      <div style={P.sec}>🔗 Voci di navigazione</div>

      <label style={P.lbl}>Sezione target (per navigazione a viste)</label>
      <SectionSel value={cfg.sectionId || ''} onChange={v => set('sectionId', v)} />
      <div style={P.hint}>Se configurata, i pulsanti con Vista impostata switcheranno la vista nella sezione invece di navigare tra pagine.</div>

      {cfg.sectionId && <>
        <label style={P.lbl}>ID Barra laterale (per collapse/expand)</label>
        <Inp value={cfg.sidebarWidgetId || ''} onChange={v => set('sidebarWidgetId', v)} placeholder='es. widget_1357' />
        <div style={P.hint}>L'ID del widget Barra laterale che contiene la Sezione. Se configurato, i pulsanti con "Nascondi pannello" attivo chiuderanno il pannello laterale.</div>
      </>}

      <div style={{ marginTop: 14 }} />
      <button type='button' onClick={addItem}
        style={{ width:'100%', padding:'8px', borderRadius:8, border:'1px dashed rgba(147,197,253,0.4)', background:'rgba(59,130,246,0.08)', color:'#93c5fd', fontSize:12, fontWeight:600, cursor:'pointer', marginBottom:12, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
        ＋ Aggiungi voce
      </button>

      {sorted.map((item, si) => {
        const ri = items.findIndex(it => it.id === item.id)
        const isCustom = item.id.startsWith('nav_custom_')
        const isO = openItem === item.id
        return (
          <div key={item.id} style={{ border:'1px solid rgba(255,255,255,0.10)', borderRadius:10, padding:'10px 12px', marginBottom:8, background:'rgba(255,255,255,0.04)', opacity:item.visible ? 1 : 0.55 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', userSelect:'none' as const }} onClick={() => setOpenItem(isO ? null : item.id)}>
              <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
                <div style={{ width:12, height:12, borderRadius:3, background:item.colorBg, flexShrink:0, border:`1px solid ${item.colorAccent}` }} />
                <span style={{ fontWeight:600, fontSize:12, color:'#e5e7eb', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const }}>{item.label}</span>
                {!item.visible && <span style={{ fontSize:10, color:'#a0aec0', fontStyle:'italic', flexShrink:0 }}>(nascosta)</span>}
                {isCustom && <span style={{ fontSize:9, color:'#6b7280', fontStyle:'italic', flexShrink:0 }}>custom</span>}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:3, flexShrink:0 }}>
                {si > 0 && <button type='button' onClick={e => { e.stopPropagation(); moveItem(item.id, -1) }} style={{ padding:'1px 5px', fontSize:11, border:'1px solid rgba(255,255,255,0.15)', borderRadius:4, background:'rgba(255,255,255,0.05)', color:'#d1d5db', cursor:'pointer' }}>↑</button>}
                {si < sorted.length - 1 && <button type='button' onClick={e => { e.stopPropagation(); moveItem(item.id, 1) }} style={{ padding:'1px 5px', fontSize:11, border:'1px solid rgba(255,255,255,0.15)', borderRadius:4, background:'rgba(255,255,255,0.05)', color:'#d1d5db', cursor:'pointer' }}>↓</button>}
                <span style={{ fontSize:10, color:'#a0aec0', marginLeft:2 }}>{isO ? '▲' : '▼'}</span>
              </div>
            </div>

            {isO && <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid rgba(255,255,255,0.08)' }}>
              <Check value={item.visible} onChange={v => setItem(ri, { visible:v })} label='Visibile' />
              <label style={P.lbl}>Etichetta</label>
              <Inp value={item.label} onChange={v => setItem(ri, { label:v })} />
              <label style={P.lbl}>Icona</label>
              <Sel value={item.icon || 'home'} onChange={v => setItem(ri, { icon:v })} options={ICON_OPTIONS} />
              <label style={P.lbl}>Pagina di destinazione</label>
              <PageSel value={item.hashPage} onChange={v => setItem(ri, { hashPage:v })} />
              <label style={P.lbl}>Sezione (tab editing)</label>
              <Inp value={item.section || ''} onChange={v => setItem(ri, { section:v })} placeholder='es. anagrafica, violazione, luogo' />
              <div style={P.hint}>Se vuota, la voce naviga solo alla pagina/vista e il tab editing viene ignorato.</div>
              {cfg.sectionId && <>
                <label style={P.lbl}>Vista nella sezione</label>
                <ViewSel value={item.viewId || ''} onChange={v => setItem(ri, { viewId:v })} sectionId={cfg.sectionId} />
                <div style={P.hint}>Se impostata, il pulsante switcha la vista nella sezione invece di navigare a una pagina.</div>
                {cfg.sidebarWidgetId && <label style={{ ...P.lbl, display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, cursor: 'pointer' }}>
                  <input type='checkbox' checked={!!item.collapseSidebar} onChange={e => setItem(ri, { collapseSidebar: e.target.checked })} />
                  Mostra pannello laterale
                </label>}
              </>}
              <div style={P.row2}>
                <div><label style={P.lbl}>Colore sfondo</label><ColInp value={item.colorBg} onChange={v => {
                  const hex = /^#[0-9a-fA-F]{6}$/.test(v) ? v : item.colorBg
                  const r = parseInt(hex.slice(1, 3), 16)
                  const g = parseInt(hex.slice(3, 5), 16)
                  const b = parseInt(hex.slice(5, 7), 16)
                  setItem(ri, { colorBg:v, colorBgHover:`${hex}ee`, colorBgRest:`rgba(${r},${g},${b},0.25)` })
                }} /></div>
                <div><label style={P.lbl}>Colore accento</label><ColInp value={item.colorAccent} onChange={v => setItem(ri, { colorAccent:v })} /></div>
              </div>
              <div style={P.row2}>
                <div><label style={P.lbl}>Sfondo a riposo</label><ColInp value={item.colorBgRest || 'rgba(255,255,255,0.05)'} onChange={v => setItem(ri, { colorBgRest:v })} /></div>
                <div><label style={P.lbl}>Sfondo hover/attivo</label><ColInp value={item.colorBgHover || `${item.colorBg}ee`} onChange={v => setItem(ri, { colorBgHover:v })} /></div>
              </div>
              <label style={P.lbl}>Ruoli visibili</label>
              <div style={{ display:'flex', flexWrap:'wrap' as const, gap:5, marginTop:4 }}>
                {ROLE_OPTIONS.map(ro => {
                  const isAll = ro.value === '*'
                  const checked = isAll ? item.roles.includes('*') : (!item.roles.includes('*') && item.roles.includes(ro.value))
                  return (
                    <label key={ro.value} style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, cursor:'pointer', background:checked ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.06)', border:`1px solid ${checked ? '#93c5fd' : 'rgba(255,255,255,0.12)'}`, borderRadius:6, padding:'3px 8px', color:checked ? '#93c5fd' : '#9ca3af', userSelect:'none' as const }}>
                      <input type='checkbox' checked={checked} style={{ display:'none' }} onChange={() => {
                        let next = [...item.roles]
                        if (isAll) next = checked ? [] : ['*']
                        else {
                          if (next.includes('*')) next = []
                          if (checked) next = next.filter(r => r !== ro.value)
                          else next = [...next, ro.value]
                        }
                        setItem(ri, { roles: next })
                      }} />
                      {ro.label}
                    </label>
                  )
                })}
              </div>
              <div style={{ marginTop:14, paddingTop:10, borderTop:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', gap:8 }}>
                <button type='button' onClick={() => removeItem(item.id)}
                  style={{ padding:'5px 12px', borderRadius:7, border:'1px solid rgba(252,165,165,0.4)', background:'rgba(239,68,68,0.10)', color:'#fca5a5', fontSize:11, cursor:'pointer', fontWeight:600 }}>
                  🗑 Rimuovi voce
                </button>
              </div>
            </div>}
          </div>
        )
      })}

      <div style={{ marginTop:24, paddingTop:14, borderTop:'1px solid rgba(255,255,255,0.08)' }}>
        <button type='button'
          onClick={() => { if (window.confirm('Ripristinare i valori predefiniti? Le voci personalizzate saranno perse.')) props.onSettingChange({ id: props.id, config: defaultConfig as any }) }}
          style={{ padding:'6px 14px', borderRadius:7, border:'1px solid rgba(252,165,165,0.4)', background:'rgba(239,68,68,0.10)', color:'#fca5a5', fontSize:12, cursor:'pointer', fontWeight:600 }}>
          ↺ Ripristina predefiniti
        </button>
      </div>
    </div>
  )
}
