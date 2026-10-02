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

        <label style={lbl}>Sottotitolo</label>
        <input style={inp} value={String((cfg as any).subtitleText || '')} onChange={(e) => set('subtitleText', e.target.value)} placeholder='Vuoto = usa la descrizione della card Home' />

        <label style={lbl}>Colore titolo</label>
        <div style={colorRow}>
          <input
            style={colorInp}
            type='color'
            value={titleColor}
            onChange={(e) => set('titleColor', e.target.value)}
            aria-label='Colore titolo'
          />
          <input
            style={inp}
            value={titleColor}
            onChange={(e) => set('titleColor', e.target.value)}
            placeholder='#1F4E79'
          />
        </div>

        <label style={lbl}>Dimensione titolo (px)</label>
        <input
          style={inp}
          type='number'
          min={10}
          max={36}
          step={1}
          value={titleFontSize}
          onChange={(e) => set('titleFontSize', Number(e.target.value || 15))}
        />

        <label style={{ ...lbl, display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type='checkbox' checked={cfg.showTitleSubtitle !== false} onChange={(e) => set('showTitleSubtitle', e.target.checked)} />
          Mostra sottotitolo / descrizione
        </label>
        <label style={lbl}>Colore descrizione sotto il separatore</label>
        <div style={colorRow}>
          <input style={colorInp} type='color' value={String(cfg.subtitleColor || '#475569')} onChange={(e) => set('subtitleColor', e.target.value)} aria-label='Colore descrizione' />
          <input style={inp} value={String(cfg.subtitleColor || '#475569')} onChange={(e) => set('subtitleColor', e.target.value)} />
        </div>
        <label style={lbl}>Dimensione descrizione sotto il separatore (px)</label>
        <input style={inp} type='number' min={10} max={30} step={1} value={Number(cfg.subtitleFontSize || Math.max(12, titleFontSize - 2))} onChange={(e) => set('subtitleFontSize', Number(e.target.value || 13))} />
        <label style={{ ...lbl, display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type='checkbox' checked={cfg.showTitleDivider !== false} onChange={(e) => set('showTitleDivider', e.target.checked)} />
          Mostra separatore sotto il titolo
        </label>
        <label style={lbl}>Colore separatore titolo</label>
        <div style={colorRow}>
          <input style={colorInp} type='color' value={String(cfg.titleDividerColor || titleColor)} onChange={(e) => set('titleDividerColor', e.target.value)} aria-label='Colore separatore titolo' />
          <input style={inp} value={String(cfg.titleDividerColor || titleColor)} onChange={(e) => set('titleDividerColor', e.target.value)} />
        </div>
        <label style={lbl}>Spessore separatore titolo (px)</label>
        <input style={inp} type='number' min={0} max={8} step={1} value={Number(cfg.titleDividerWidth ?? 2)} onChange={(e) => set('titleDividerWidth', Math.max(0, Number(e.target.value || 0)))} />
      </div>


      <div style={section}>
        <div style={sectionTitle}>Tabelle</div>

        <label style={lbl}>URL tabella voci prezzario</label>
        <input style={inp} value={cfg.serviceUrl || ''} onChange={(e) => set('serviceUrl', e.target.value)} placeholder='https://services2.arcgis.com/.../FeatureServer/0' />

        <label style={lbl}>URL tabella prezzari caricati</label>
        <input style={inp} value={cfg.prezzariUrl || ''} onChange={(e) => set('prezzariUrl', e.target.value)} placeholder='https://services2.arcgis.com/.../FeatureServer/0' />
      </div>


      <div style={hint}>Questo widget permette al Responsabile istruttoria tecnica di rivedere le voci del prezzario ufficiale importato, correggere categoria e decidere se renderle selezionabili nella nota spese.</div>

    </div>
  )
}
