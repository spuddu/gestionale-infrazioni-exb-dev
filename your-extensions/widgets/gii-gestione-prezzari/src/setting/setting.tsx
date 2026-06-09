/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx } from 'jimu-core'
import type { AllWidgetSettingProps } from 'jimu-for-builder'
import type { IMConfig } from '../config'

const box: React.CSSProperties = { padding: '12px', background: '#1a1f2e', minHeight: '100%', color: '#e5e7eb', boxSizing: 'border-box', overflowX: 'hidden' }
const section: React.CSSProperties = { marginTop: 12, padding: 10, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, background: 'rgba(255,255,255,0.04)', boxSizing: 'border-box' }
const sectionTitle: React.CSSProperties = { fontSize: 12.5, fontWeight: 700, color: '#93c5fd', marginBottom: 8 }
const lbl: React.CSSProperties = { fontSize: 11.5, fontWeight: 600, color: '#d1d5db', display: 'block', marginBottom: 4, marginTop: 10 }
const inp: React.CSSProperties = { width: '100%', minWidth: 0, padding: '6px 8px', fontSize: 12, border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, outline: 'none', boxSizing: 'border-box', background: 'rgba(255,255,255,0.07)', color: '#e5e7eb' }
const colorRow: React.CSSProperties = { display: 'grid', gridTemplateColumns: '58px minmax(0, 1fr)', gap: 8, alignItems: 'center' }
const colorInp: React.CSSProperties = { width: 48, height: 34, padding: 2, border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, background: 'rgba(255,255,255,0.07)', boxSizing: 'border-box', cursor: 'pointer' }
const hint: React.CSSProperties = { fontSize: 10.5, color: '#a0aec0', marginTop: 4, lineHeight: 1.5 }

export default function Setting(props: AllWidgetSettingProps<IMConfig>) {
  const cfg: any = props.config || {}
  const titleColor = String(cfg.titleColor || '#1F4E79')
  const titleFontSize = Number(cfg.titleFontSize || 15)
  const sectionTitleColor = String(cfg.sectionTitleColor || '#1F4E79')
  const sectionTitleFontSize = Number(cfg.sectionTitleFontSize || 12.5)
  const toolbarLabelColor = String(cfg.toolbarLabelColor || '#1F4E79')
  const toolbarLabelFontSize = Number(cfg.toolbarLabelFontSize || 11.5)
  const detailCardBackgroundColor = String(cfg.detailCardBackgroundColor || '#f5f9ff')
  const recordsCardBackgroundColor = String(cfg.recordsCardBackgroundColor || '#f5f9ff')
  const set = (k: string, v: any) => props.onSettingChange({ id: props.id, config: (props.config as any)?.set ? (props.config as any).set(k, v) : { ...cfg, [k]: v } as any })
  return (
    <div style={box}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#93c5fd', marginBottom: 8 }}>Configurazione widget</div>

      <div style={section}>
        <div style={sectionTitle}>Titolo principale</div>

        <label style={lbl}>Titolo</label>
        <input style={inp} value={cfg.title || ''} onChange={(e) => set('title', e.target.value)} />

        <label style={lbl}>Colore titolo principale</label>
        <div style={colorRow}>
          <input style={colorInp} type='color' value={titleColor} onChange={(e) => set('titleColor', e.target.value)} aria-label='Colore titolo principale' />
          <input style={inp} value={titleColor} onChange={(e) => set('titleColor', e.target.value)} placeholder='#1F4E79' />
        </div>

        <label style={lbl}>Dimensione titolo principale (px)</label>
        <input style={inp} type='number' min={10} max={36} step={1} value={titleFontSize} onChange={(e) => set('titleFontSize', Number(e.target.value || 15))} />
      </div>

      <div style={section}>
        <div style={sectionTitle}>Etichette barra superiore</div>

        <label style={lbl}>Colore etichetta Filtro codice / descrizione</label>
        <div style={colorRow}>
          <input style={colorInp} type='color' value={toolbarLabelColor} onChange={(e) => set('toolbarLabelColor', e.target.value)} aria-label='Colore etichetta barra superiore' />
          <input style={inp} value={toolbarLabelColor} onChange={(e) => set('toolbarLabelColor', e.target.value)} placeholder='#1F4E79' />
        </div>

        <label style={lbl}>Dimensione etichetta Filtro codice / descrizione (px)</label>
        <input style={inp} type='number' min={10} max={24} step={0.5} value={toolbarLabelFontSize} onChange={(e) => set('toolbarLabelFontSize', Number(e.target.value || 11.5))} />

        <div style={hint}>Queste impostazioni si applicano alle etichette della barra superiore e dei campi principali.</div>
      </div>

      <div style={section}>
        <div style={sectionTitle}>Titoli interni pannelli</div>

        <label style={lbl}>Colore titoli interni pannelli</label>
        <div style={colorRow}>
          <input style={colorInp} type='color' value={sectionTitleColor} onChange={(e) => set('sectionTitleColor', e.target.value)} aria-label='Colore titoli interni pannelli' />
          <input style={inp} value={sectionTitleColor} onChange={(e) => set('sectionTitleColor', e.target.value)} placeholder='#1F4E79' />
        </div>

        <label style={lbl}>Dimensione titoli interni pannelli (px)</label>
        <input style={inp} type='number' min={10} max={24} step={0.5} value={sectionTitleFontSize} onChange={(e) => set('sectionTitleFontSize', Number(e.target.value || 12.5))} />

        <div style={hint}>Queste impostazioni si applicano ai titoli dei pannelli di modifica.</div>
      </div>

      <div style={section}>
        <div style={sectionTitle}>Scheda dettaglio Nuovo Prezzo</div>
        <label style={lbl}>Colore di sfondo</label>
        <div style={colorRow}>
          <input style={colorInp} type='color' value={detailCardBackgroundColor} onChange={(e) => set('detailCardBackgroundColor', e.target.value)} aria-label='Colore di sfondo della scheda dettaglio nuovo prezzo' />
          <input style={inp} value={detailCardBackgroundColor} onChange={(e) => set('detailCardBackgroundColor', e.target.value)} placeholder='#f5f9ff' />
        </div>
        <div style={hint}>Imposta lo sfondo della scheda usata per modificare il dettaglio di un Nuovo Prezzo.</div>
      </div>

      <div style={section}>
        <div style={sectionTitle}>Scheda Nuovi Prezzi salvati</div>
        <label style={lbl}>Colore di sfondo</label>
        <div style={colorRow}>
          <input style={colorInp} type='color' value={recordsCardBackgroundColor} onChange={(e) => set('recordsCardBackgroundColor', e.target.value)} aria-label='Colore di sfondo della scheda nuovi prezzi salvati' />
          <input style={inp} value={recordsCardBackgroundColor} onChange={(e) => set('recordsCardBackgroundColor', e.target.value)} placeholder='#f5f9ff' />
        </div>
        <div style={hint}>Imposta lo sfondo della scheda in cui sono visualizzati i Nuovi Prezzi già salvati.</div>
      </div>

      <div style={section}>
        <div style={sectionTitle}>Tabelle</div>

        <label style={lbl}>URL tabella nuovi prezzi</label>
        <input style={inp} value={cfg.serviceUrl || ''} onChange={(e) => set('serviceUrl', e.target.value)} placeholder='https://services2.arcgis.com/.../FeatureServer/0' />

        <label style={lbl}>URL tabella analisi nuovi prezzi</label>
        <input style={inp} value={cfg.detailTableUrl || ''} onChange={(e) => set('detailTableUrl', e.target.value)} placeholder='https://services2.arcgis.com/.../FeatureServer/0' />
      </div>

      <div style={hint}>Questo widget mostra il catalogo dei Nuovi Prezzi e consente di modificare la testata, attivare/disattivare ed eliminare un prezzo solo se non è usato in altre analisi.</div>
    </div>
  )
}
