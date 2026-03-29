/** @jsx jsx */
import { React, jsx } from 'jimu-core'
import type { AllWidgetSettingProps } from 'jimu-for-builder'
import { defaultConfig, type IMConfig } from '../config'

type Props = AllWidgetSettingProps<IMConfig>

const S = {
  wrap: { padding:'0 12px 24px', fontSize:13, background:'#1a1f2e', minHeight:'100%', color:'#e5e7eb' } as React.CSSProperties,
  sec: { fontSize:11, fontWeight:700, color:'#93c5fd', textTransform:'uppercase' as const, letterSpacing:1.1, borderBottom:'1px solid rgba(255,255,255,0.10)', paddingBottom:6, marginBottom:14, marginTop:22 } as React.CSSProperties,
  lbl: { fontSize:11.5, fontWeight:600, color:'#d1d5db', display:'block', marginBottom:5, marginTop:10 } as React.CSSProperties,
  hint: { fontSize:10.5, color:'#a0aec0', marginTop:4, lineHeight:1.4 } as React.CSSProperties,
  row2: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 } as React.CSSProperties,
  inp: { width:'100%', padding:'6px 8px', fontSize:12, border:'1px solid rgba(255,255,255,0.15)', borderRadius:6, outline:'none', boxSizing:'border-box' as const, background:'rgba(255,255,255,0.07)', color:'#e5e7eb' } as React.CSSProperties,
  check: { display:'flex', alignItems:'center', gap:8, fontSize:12, color:'#d1d5db', cursor:'pointer', marginTop:8 } as React.CSSProperties,
  preview: { marginTop:12, padding:'10px 12px', borderRadius:8, border:'1px solid rgba(255,255,255,0.10)', background:'rgba(255,255,255,0.04)' } as React.CSSProperties
}

function asJs<T = any>(v: any): T {
  return v?.asMutable ? v.asMutable({ deep: true }) : v
}

function parseNum(v: any, fb: number, min?: number, max?: number): number {
  let n = Number(v)
  if (!Number.isFinite(n)) n = fb
  if (typeof min === 'number') n = Math.max(min, n)
  if (typeof max === 'number') n = Math.min(max, n)
  return n
}

function Inp(p: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <input type='text' value={p.value} onChange={e => p.onChange(e.target.value)} placeholder={p.placeholder} style={S.inp} />
}

function NumInp(p: { value: number; onChange: (v: number) => void; min?: number; max?: number; unit?: string }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
      <input
        type='number'
        value={p.value}
        min={p.min}
        max={p.max}
        onChange={e => p.onChange(parseNum(e.target.value, p.value, p.min, p.max))}
        style={{ ...S.inp, width:86 }}
      />
      {p.unit && <span style={{ fontSize:11, color:'#a0aec0', flexShrink:0 }}>{p.unit}</span>}
    </div>
  )
}

function Check(p: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label style={S.check}>
      <input type='checkbox' checked={p.value} onChange={e => p.onChange(e.target.checked)} />
      {p.label}
    </label>
  )
}

export default function Setting(props: Props) {
  const cfg = { ...defaultConfig, ...(asJs<any>(props.config) || {}) }

  const setCfg = (patch: Partial<any>) => {
    props.onSettingChange({
      id: props.id,
      config: {
        ...cfg,
        ...patch
      } as any
    })
  }

  return (
    <div style={S.wrap}>
      <div style={S.sec}>Ricerca</div>
      <label style={S.lbl}>Placeholder ricerca</label>
      <Inp
        value={String(cfg.placeholderRicerca || defaultConfig.placeholderRicerca)}
        onChange={(v) => setCfg({ placeholderRicerca: v })}
        placeholder='Cerca pratica, trasgressore o violazione'
      />
      <div style={S.hint}>Testo mostrato nel campo di ricerca del widget.</div>

      <label style={S.lbl}>Debounce ricerca</label>
      <NumInp
        value={parseNum(cfg.debounceMs, 250, 0, 5000)}
        onChange={(v) => setCfg({ debounceMs: parseNum(v, 250, 0, 5000) })}
        min={0}
        max={5000}
        unit='ms'
      />
      <div style={S.hint}>Tempo di attesa prima di emettere l&apos;evento dopo la digitazione.</div>

      <div style={S.sec}>Controlli visibili</div>
      <Check value={cfg.mostraStato !== false} onChange={(v) => setCfg({ mostraStato: v })} label='Mostra filtro Stato' />
      <Check value={cfg.mostraUfficio !== false} onChange={(v) => setCfg({ mostraUfficio: v })} label='Mostra filtro Ufficio' />
      <Check value={cfg.mostraPeriodo !== false} onChange={(v) => setCfg({ mostraPeriodo: v })} label='Mostra filtro Periodo' />
      <Check value={cfg.mostraOrdinamento !== false} onChange={(v) => setCfg({ mostraOrdinamento: v })} label='Mostra ordinamento' />

      <div style={S.sec}>Anteprima configurazione</div>
      <div style={S.preview}>
        <div style={{ fontSize:12, fontWeight:700, color:'#e5e7eb', marginBottom:6 }}>GII Ricerca e filtri</div>
        <div style={{ fontSize:11, color:'#a0aec0', lineHeight:1.55 }}>
          Placeholder: <b style={{ color:'#e5e7eb' }}>{String(cfg.placeholderRicerca || defaultConfig.placeholderRicerca)}</b><br/>
          Debounce: <b style={{ color:'#e5e7eb' }}>{parseNum(cfg.debounceMs, 250, 0, 5000)} ms</b><br/>
          Stato: <b style={{ color:'#e5e7eb' }}>{cfg.mostraStato !== false ? 'visibile' : 'nascosto'}</b><br/>
          Ufficio: <b style={{ color:'#e5e7eb' }}>{cfg.mostraUfficio !== false ? 'visibile' : 'nascosto'}</b><br/>
          Periodo: <b style={{ color:'#e5e7eb' }}>{cfg.mostraPeriodo !== false ? 'visibile' : 'nascosto'}</b><br/>
          Ordinamento: <b style={{ color:'#e5e7eb' }}>{cfg.mostraOrdinamento !== false ? 'visibile' : 'nascosto'}</b>
        </div>
      </div>
    </div>
  )
}
