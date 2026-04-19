/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx } from 'jimu-core'
import type { AllWidgetSettingProps } from 'jimu-for-builder'
import type { IMConfig } from '../config'

const box: React.CSSProperties = { padding: '12px', background: '#1a1f2e', minHeight: '100%', color: '#e5e7eb', boxSizing: 'border-box' }
const section: React.CSSProperties = { marginTop: 12, padding: 10, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, background: 'rgba(255,255,255,0.04)' }
const sectionTitle: React.CSSProperties = { fontSize: 12.5, fontWeight: 700, color: '#93c5fd', marginBottom: 8 }
const lbl: React.CSSProperties = { fontSize: 11.5, fontWeight: 600, color: '#d1d5db', display: 'block', marginBottom: 4, marginTop: 10 }
const inp: React.CSSProperties = { width: '100%', padding: '6px 8px', fontSize: 12, border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, outline: 'none', boxSizing: 'border-box', background: 'rgba(255,255,255,0.07)', color: '#e5e7eb' }
const colorRow: React.CSSProperties = { display: 'grid', gridTemplateColumns: '58px 1fr', gap: 8, alignItems: 'center' }
const colorInp: React.CSSProperties = { width: 48, height: 34, padding: 2, border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, background: 'rgba(255,255,255,0.07)', boxSizing: 'border-box', cursor: 'pointer' }
const hint: React.CSSProperties = { fontSize: 10.5, color: '#a0aec0', marginTop: 4, lineHeight: 1.5 }

export default function Setting(props: AllWidgetSettingProps<IMConfig>) {
  const cfg: any = props.config || {}
  const titleColor = String(cfg.titleColor || '#1F4E79')
  const titleFontSize = Number(cfg.titleFontSize || 15)
  const set = (k: string, v: any) => props.onSettingChange({ id: props.id, config: (props.config as any)?.set ? (props.config as any).set(k, v) : { ...cfg, [k]: v } as any })

  return (
    <div style={box}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#93c5fd', marginBottom: 8 }}>Configurazione widget</div>

      <div style={section}>
        <div style={sectionTitle}>Titolo</div>

        <label style={lbl}>Titolo</label>
        <input style={inp} value={cfg.title || ''} onChange={(e) => set('title', e.target.value)} />

        <label style={lbl}>Colore titolo</label>
        <div style={colorRow}>
          <input style={colorInp} type='color' value={titleColor} onChange={(e) => set('titleColor', e.target.value)} aria-label='Colore titolo' />
          <input style={inp} value={titleColor} onChange={(e) => set('titleColor', e.target.value)} placeholder='#1F4E79' />
        </div>

        <label style={lbl}>Dimensione titolo (px)</label>
        <input style={inp} type='number' min={10} max={36} step={1} value={titleFontSize} onChange={(e) => set('titleFontSize', Number(e.target.value || 15))} />
      </div>

      <div style={section}>
        <div style={sectionTitle}>Tabelle</div>

        <label style={lbl}>URL tabella import prezzari</label>
        <input style={inp} value={cfg.importUrl || ''} onChange={(e) => set('importUrl', e.target.value)} placeholder='https://services2.arcgis.com/.../FeatureServer/0' />

        <label style={lbl}>URL articoli prezzario regionale</label>
        <input style={inp} value={cfg.regionaleArticoliUrl || ''} onChange={(e) => set('regionaleArticoliUrl', e.target.value)} placeholder='https://services2.arcgis.com/.../FeatureServer/1' />

        <label style={lbl}>URL analisi prezzario regionale</label>
        <input style={inp} value={cfg.regionaleAnalisiUrl || ''} onChange={(e) => set('regionaleAnalisiUrl', e.target.value)} placeholder='https://services2.arcgis.com/.../FeatureServer/2' />

        <label style={lbl}>URL articoli prezzario interno</label>
        <input style={inp} value={cfg.internoArticoliUrl || ''} onChange={(e) => set('internoArticoliUrl', e.target.value)} placeholder='https://services2.arcgis.com/.../FeatureServer/3' />

        <label style={lbl}>URL analisi prezzario interno</label>
        <input style={inp} value={cfg.internoAnalisiUrl || ''} onChange={(e) => set('internoAnalisiUrl', e.target.value)} placeholder='https://services2.arcgis.com/.../FeatureServer/4' />
      </div>

      <div style={hint}>Il widget carica i prezzari nelle nuove tabelle definitive. Al momento l'import automatico è attivo per il prezzario regionale da ZIP CSV ufficiale; la gestione degli import interni è predisposta per gli step successivi.</div>
    </div>
  )
}
