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
  const set = (key: string, value: any) => props.onSettingChange({ id: props.id, config: (props.config as any)?.set ? (props.config as any).set(key, value) : { ...cfg, [key]: value } as any })

  return (
    <div style={box}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#93c5fd', marginBottom: 8 }}>Configurazione widget</div>

      <div style={section}>
        <div style={sectionTitle}>Titolo principale</div>
        <label style={lbl}>Titolo</label>
        <input style={inp} value={cfg.title || ''} onChange={(e) => set('title', e.target.value)} />

        <label style={lbl}>Colore titolo principale</label>
        <div style={colorRow}>
          <input style={colorInp} type="color" value={titleColor} onChange={(e) => set('titleColor', e.target.value)} aria-label="Colore titolo principale" />
          <input style={inp} value={titleColor} onChange={(e) => set('titleColor', e.target.value)} placeholder="#1F4E79" />
        </div>

        <label style={lbl}>Dimensione titolo principale (px)</label>
        <input style={inp} type="number" min={10} max={36} step={1} value={titleFontSize} onChange={(e) => set('titleFontSize', Number(e.target.value || 15))} />
      </div>

      <div style={section}>
        <div style={sectionTitle}>Etichette modulo</div>
        <label style={lbl}>Colore etichette</label>
        <div style={colorRow}>
          <input style={colorInp} type="color" value={toolbarLabelColor} onChange={(e) => set('toolbarLabelColor', e.target.value)} aria-label="Colore etichette" />
          <input style={inp} value={toolbarLabelColor} onChange={(e) => set('toolbarLabelColor', e.target.value)} placeholder="#1F4E79" />
        </div>

        <label style={lbl}>Dimensione etichette (px)</label>
        <input style={inp} type="number" min={10} max={24} step={0.5} value={toolbarLabelFontSize} onChange={(e) => set('toolbarLabelFontSize', Number(e.target.value || 11.5))} />
      </div>

      <div style={section}>
        <div style={sectionTitle}>Titoli delle sezioni</div>
        <label style={lbl}>Colore titoli</label>
        <div style={colorRow}>
          <input style={colorInp} type="color" value={sectionTitleColor} onChange={(e) => set('sectionTitleColor', e.target.value)} aria-label="Colore titoli delle sezioni" />
          <input style={inp} value={sectionTitleColor} onChange={(e) => set('sectionTitleColor', e.target.value)} placeholder="#1F4E79" />
        </div>

        <label style={lbl}>Dimensione titoli (px)</label>
        <input style={inp} type="number" min={10} max={24} step={0.5} value={sectionTitleFontSize} onChange={(e) => set('sectionTitleFontSize', Number(e.target.value || 12.5))} />
      </div>

      <div style={section}>
        <div style={sectionTitle}>Scheda dettaglio parametro</div>
        <label style={lbl}>Colore di sfondo</label>
        <div style={colorRow}>
          <input
            style={colorInp}
            type="color"
            value={detailCardBackgroundColor}
            onChange={(e) => set('detailCardBackgroundColor', e.target.value)}
            aria-label="Colore di sfondo della scheda dettaglio parametro"
          />
          <input
            style={inp}
            value={detailCardBackgroundColor}
            onChange={(e) => set('detailCardBackgroundColor', e.target.value)}
            placeholder="#f5f9ff"
          />
        </div>
        <div style={hint}>Imposta lo sfondo della scheda usata per inserire o modificare il dettaglio di un parametro.</div>
      </div>

      <div style={section}>
        <div style={sectionTitle}>Scheda parametri salvati</div>
        <label style={lbl}>Colore di sfondo</label>
        <div style={colorRow}>
          <input
            style={colorInp}
            type="color"
            value={recordsCardBackgroundColor}
            onChange={(e) => set('recordsCardBackgroundColor', e.target.value)}
            aria-label="Colore di sfondo della scheda parametri salvati"
          />
          <input
            style={inp}
            value={recordsCardBackgroundColor}
            onChange={(e) => set('recordsCardBackgroundColor', e.target.value)}
            placeholder="#f5f9ff"
          />
        </div>
        <div style={hint}>Imposta lo sfondo della scheda in cui sono visualizzati i parametri già salvati.</div>
      </div>

      <div style={section}>
        <div style={sectionTitle}>Tabelle e viste editabili</div>

        <label style={lbl}>URL tabella parametri nota spese</label>
        <input style={inp} value={cfg.serviceUrl || ''} onChange={(e) => set('serviceUrl', e.target.value)} placeholder="https://services2.arcgis.com/.../FeatureServer/0" />
        <div style={hint}>Utilizzata dai Responsabili istruttoria tecnica delle Aree Agraria e Tecnica e dall'Amministratore.</div>

        <label style={lbl}>URL vista editabile sanzioni, riduzioni e cauzione (AMM)</label>
        <input style={inp} value={cfg.serviceUrlSanzioniAmm || ''} onChange={(e) => set('serviceUrlSanzioniAmm', e.target.value)} placeholder="https://services2.arcgis.com/.../FeatureServer/0" />
        <div style={hint}>Vista filtrata sulle categorie SANZIONE, RIDUZIONE e CAUZIONE. Utilizzata dal RIA e dall'ADMIN.</div>

        <label style={lbl}>URL vista editabile attrezzature (AGR/TEC)</label>
        <input style={inp} value={cfg.serviceUrlAttrezzatureAgrTec || ''} onChange={(e) => set('serviceUrlAttrezzatureAgrTec', e.target.value)} placeholder="https://services2.arcgis.com/.../FeatureServer/0" />
        <div style={hint}>Vista filtrata sulla categoria ATTREZZATURA. Utilizzata dai Responsabili istruttoria tecnica delle Aree Agraria e Tecnica e dall'Amministratore.</div>
      </div>

      <div style={hint}>Il profilo corrente è sempre letto dal cw header. Codice e categoria del parametro restano bloccati durante la modifica di un record esistente.</div>
    </div>
  )
}
