/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx } from 'jimu-core'
import { type AllWidgetSettingProps } from 'jimu-for-builder'
import { defaultConfig, type IMConfig } from '../config'

const P = {
  wrap: { padding: '0 12px 32px', fontSize: 13, background: '#1a1f2e', minHeight: '100%', color: '#e5e7eb' } as React.CSSProperties,
  sec: { fontSize: 11, fontWeight: 700, color: '#93c5fd', textTransform: 'uppercase' as const, letterSpacing: 1.2, borderBottom: '1px solid rgba(255,255,255,0.10)', paddingBottom: 6, marginBottom: 14, marginTop: 22 } as React.CSSProperties,
  lbl: { fontSize: 11.5, fontWeight: 600, color: '#d1d5db', display: 'block', marginBottom: 4, marginTop: 10 } as React.CSSProperties,
  hint: { fontSize: 10.5, color: '#a0aec0', marginTop: 3, lineHeight: 1.4 } as React.CSSProperties,
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } as React.CSSProperties,
  inp: { width: '100%', padding: '5px 8px', fontSize: 12, border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, outline: 'none', boxSizing: 'border-box' as const, background: 'rgba(255,255,255,0.07)', color: '#e5e7eb' } as React.CSSProperties,
  check: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#d1d5db', cursor: 'pointer', marginTop: 8 } as React.CSSProperties
}

function Inp (p: { value: string | number; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return <input type={p.type || 'text'} value={p.value} onChange={e => p.onChange(e.target.value)} placeholder={p.placeholder} style={P.inp} />
}

function NumInp (p: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number }) {
  return <input type='number' value={p.value} min={p.min} max={p.max} step={p.step || 1} onChange={e => p.onChange(Number(e.target.value))} style={P.inp} />
}

function ColInp (p: { value: string; onChange: (v: string) => void }) {
  const hexVal = /^#[0-9a-fA-F]{3,8}$/.test(p.value) ? p.value : '#1d4ed8'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <input type='color' value={hexVal} onChange={e => p.onChange(e.target.value)}
        style={{ width: 32, height: 28, padding: 2, border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, cursor: 'pointer', background: 'transparent', flexShrink: 0 }} />
      <input type='text' value={p.value} onChange={e => p.onChange(e.target.value)} placeholder='#rrggbb o rgba(...)' style={{ ...P.inp, flex: 1, fontSize: 11 }} />
    </div>
  )
}

function Check (p: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label style={P.check}>
      <input type='checkbox' checked={p.value} onChange={e => p.onChange(e.target.checked)} />
      {p.label}
    </label>
  )
}

export default function Setting (props: AllWidgetSettingProps<IMConfig>) {
  const cfgSrc: any = props.config as any
  const cfg: any = {
    ...defaultConfig,
    ...(cfgSrc?.asMutable ? cfgSrc.asMutable({ deep: true }) : cfgSrc?.toJS ? cfgSrc.toJS() : (cfgSrc || {}))
  }

  const update = (key: string, value: any) => {
    props.onSettingChange({
      id: props.id,
      config: props.config.set ? props.config.set(key as any, value) : ({ ...cfg, [key]: value } as any)
    })
  }

  React.useEffect(() => {
    if ((props as any).useDataSourcesEnabled || ((props as any).useDataSources?.length || 0) > 0) {
      props.onSettingChange({ id: props.id, useDataSources: [] as any, useDataSourcesEnabled: false as any })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={P.wrap}>
      <div style={P.sec}>Contenuto</div>
      <label style={P.lbl}>Titolo</label>
      <Inp value={cfg.title} onChange={v => update('title', v)} />
      <label style={P.lbl}>Sottotitolo</label>
      <Inp value={cfg.subtitle} onChange={v => update('subtitle', v)} />

      <div style={P.sec}>Query</div>
      <label style={P.lbl}>Where clause aggiuntiva</label>
      <Inp value={cfg.whereClause || '1=1'} onChange={v => update('whereClause', v)} placeholder='1=1' />
      <div style={P.hint}>La dashboard usa automaticamente le pratiche di competenza dell’utente collegato.</div>
      <div style={P.row2}>
        <div>
          <label style={P.lbl}>Limite record</label>
          <NumInp value={Number(cfg.pageSize || 2000)} min={100} step={100} onChange={v => update('pageSize', v)} />
        </div>
        <div>
          <label style={P.lbl}>Soglia pratiche ferme, giorni</label>
          <NumInp value={Number(cfg.staleDays || 15)} min={1} onChange={v => update('staleDays', v)} />
        </div>
      </div>
      <Check value={cfg.showTechnicalInfo === true} onChange={v => update('showTechnicalInfo', v)} label='Mostra informazioni tecniche sull’ambito dati' />

      <div style={P.sec}>Colori</div>
      <label style={P.lbl}>Colore accento</label>
      <ColInp value={cfg.accentColor || '#fefe2a'} onChange={v => update('accentColor', v)} />
      <label style={P.lbl}>Sfondo pannello</label>
      <ColInp value={cfg.panelBg || 'rgba(11,26,48,0.92)'} onChange={v => update('panelBg', v)} />
      <label style={P.lbl}>Sfondo card</label>
      <ColInp value={cfg.cardBg || 'rgba(255,255,255,0.08)'} onChange={v => update('cardBg', v)} />
      <label style={P.lbl}>Bordo card</label>
      <ColInp value={cfg.cardBorder || 'rgba(255,255,255,0.14)'} onChange={v => update('cardBorder', v)} />
      <label style={P.lbl}>Testo</label>
      <ColInp value={cfg.textColor || '#ffffff'} onChange={v => update('textColor', v)} />
      <label style={P.lbl}>Testo secondario</label>
      <ColInp value={cfg.mutedColor || 'rgba(255,255,255,0.70)'} onChange={v => update('mutedColor', v)} />
    </div>
  )
}
