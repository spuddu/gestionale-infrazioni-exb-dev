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
  const sectionTitleColor = String(cfg.sectionTitleColor || '#1F4E79')
  const sectionTitleFontSize = Number(cfg.sectionTitleFontSize || 12.5)
  const toolbarLabelColor = String(cfg.toolbarLabelColor || '#1F4E79')
  const toolbarLabelFontSize = Number(cfg.toolbarLabelFontSize || 11.5)
  const leftPanelBackgroundColor = String(cfg.leftPanelBackgroundColor || '#f5f9ff')
  const detailCardBackgroundColor = String(cfg.detailCardBackgroundColor || '#f5f9ff')
  const recordsCardBackgroundColor = String(cfg.recordsCardBackgroundColor || '#f5f9ff')
  const leftColumnWidthPct = Number(cfg.leftColumnWidthPct || 25)
  const centerColumnWidthPct = Number(cfg.centerColumnWidthPct || 45)
  const rightColumnWidthPct = Number(cfg.rightColumnWidthPct || 30)
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

        <label style={lbl}>Colore etichette Prezzario / Cerca</label>
        <div style={colorRow}>
          <input style={colorInp} type='color' value={toolbarLabelColor} onChange={(e) => set('toolbarLabelColor', e.target.value)} aria-label='Colore etichette barra superiore' />
          <input style={inp} value={toolbarLabelColor} onChange={(e) => set('toolbarLabelColor', e.target.value)} placeholder='#1F4E79' />
        </div>

        <label style={lbl}>Dimensione etichette Prezzario / Cerca (px)</label>
        <input style={inp} type='number' min={10} max={24} step={0.5} value={toolbarLabelFontSize} onChange={(e) => set('toolbarLabelFontSize', Number(e.target.value || 11.5))} />

        <div style={hint}>Queste impostazioni si applicano solo alle etichette sopra la combo del prezzario e sopra la casella di ricerca.</div>
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

        <div style={hint}>Queste impostazioni si applicano ai titoli dei pannelli e alle etichette del riquadro dettaglio.</div>
      </div>

      <div style={section}>
        <div style={sectionTitle}>Larghezza colonne</div>

        <label style={lbl}>Colonna sinistra (%)</label>
        <input style={inp} type='number' min={10} max={70} step={1} value={leftColumnWidthPct} onChange={(e) => set('leftColumnWidthPct', Number(e.target.value || 25))} />

        <label style={lbl}>Colonna centrale (%)</label>
        <input style={inp} type='number' min={10} max={70} step={1} value={centerColumnWidthPct} onChange={(e) => set('centerColumnWidthPct', Number(e.target.value || 45))} />

        <label style={lbl}>Colonna destra (%)</label>
        <input style={inp} type='number' min={10} max={70} step={1} value={rightColumnWidthPct} onChange={(e) => set('rightColumnWidthPct', Number(e.target.value || 30))} />

        <div style={hint}>Le tre larghezze vengono normalizzate automaticamente e si applicano sia alla barra superiore sia ai tre pannelli sottostanti.</div>
      </div>

      <div style={section}>
        <div style={sectionTitle}>Pannello di navigazione</div>
        <label style={lbl}>Colore di sfondo del pannello sinistro</label>
        <div style={colorRow}>
          <input style={colorInp} type='color' value={leftPanelBackgroundColor} onChange={(e) => set('leftPanelBackgroundColor', e.target.value)} aria-label='Colore di sfondo del pannello sinistro' />
          <input style={inp} value={leftPanelBackgroundColor} onChange={(e) => set('leftPanelBackgroundColor', e.target.value)} placeholder='#f5f9ff' />
        </div>
        <div style={hint}>Imposta lo sfondo del pannello sinistro dedicato alla navigazione per livelli.</div>
      </div>

      <div style={section}>
        <div style={sectionTitle}>Scheda dettaglio voce</div>
        <label style={lbl}>Colore di sfondo</label>
        <div style={colorRow}>
          <input style={colorInp} type='color' value={detailCardBackgroundColor} onChange={(e) => set('detailCardBackgroundColor', e.target.value)} aria-label='Colore di sfondo della scheda dettaglio voce' />
          <input style={inp} value={detailCardBackgroundColor} onChange={(e) => set('detailCardBackgroundColor', e.target.value)} placeholder='#f5f9ff' />
        </div>
        <div style={hint}>Imposta lo sfondo della scheda in cui sono visualizzati i dati della voce selezionata.</div>
      </div>

      <div style={section}>
        <div style={sectionTitle}>Scheda elenco voci</div>
        <label style={lbl}>Colore di sfondo</label>
        <div style={colorRow}>
          <input style={colorInp} type='color' value={recordsCardBackgroundColor} onChange={(e) => set('recordsCardBackgroundColor', e.target.value)} aria-label='Colore di sfondo della scheda elenco voci' />
          <input style={inp} value={recordsCardBackgroundColor} onChange={(e) => set('recordsCardBackgroundColor', e.target.value)} placeholder='#f5f9ff' />
        </div>
        <div style={hint}>Imposta lo sfondo della scheda in cui sono visualizzate le voci del prezzario.</div>
      </div>

      <div style={section}>
        <div style={sectionTitle}>Tabelle</div>

        <label style={lbl}>URL articoli prezzario regionale</label>
        <input style={inp} value={cfg.regionaleArticoliUrl || ''} onChange={(e) => set('regionaleArticoliUrl', e.target.value)} placeholder='https://services2.arcgis.com/.../FeatureServer/0' />

        <label style={lbl}>URL analisi prezzario regionale</label>
        <input style={inp} value={cfg.regionaleAnalisiUrl || ''} onChange={(e) => set('regionaleAnalisiUrl', e.target.value)} placeholder='https://services2.arcgis.com/.../FeatureServer/0' />

        <label style={lbl}>URL articoli prezzario interno</label>
        <input style={inp} value={cfg.internoArticoliUrl || ''} onChange={(e) => set('internoArticoliUrl', e.target.value)} placeholder='https://services2.arcgis.com/.../FeatureServer/0' />

        <label style={lbl}>URL analisi prezzario interno</label>
        <input style={inp} value={cfg.internoAnalisiUrl || ''} onChange={(e) => set('internoAnalisiUrl', e.target.value)} placeholder='https://services2.arcgis.com/.../FeatureServer/0' />

        <label style={lbl}>URL tabella nuovi prezzi</label>
        <input style={inp} value={cfg.nuoviPrezziUrl || ''} onChange={(e) => set('nuoviPrezziUrl', e.target.value)} placeholder='https://services2.arcgis.com/.../FeatureServer/0' />

        <label style={lbl}>URL tabella analisi nuovi prezzi</label>
        <input style={inp} value={cfg.nuoviPrezziAnalisiUrl || ''} onChange={(e) => set('nuoviPrezziAnalisiUrl', e.target.value)} placeholder='https://services2.arcgis.com/.../FeatureServer/0' />

        <label style={lbl}>URL dati generali per struttura nuovi prezzi</label>
        <input style={inp} value={cfg.datiGeneraliUrl || ''} onChange={(e) => set('datiGeneraliUrl', e.target.value)} placeholder='https://services2.arcgis.com/.../FeatureServer/0' />

        <label style={lbl}>URL parametri attrezzature (risarcimento Art.30)</label>
        <input style={inp} value={cfg.attrezzatureParametriUrl || ''} onChange={(e) => set('attrezzatureParametriUrl', e.target.value)} placeholder='https://services2.arcgis.com/.../GII_VIEW_EB_PARAMETRI_ART30/FeatureServer' />
      </div>

      <div style={hint}>Widget di sola consultazione con albero Capitolo / Sottocapitolo, elenco voci e scheda dettaglio. La combo del prezzario mostra automaticamente le sorgenti che hanno almeno l'URL articoli configurato. La sorgente attrezzature (vista su GII_PARAMETRI_SANZIONI filtrata su categoria_parametro='ATTREZZATURA') è un elenco piatto senza capitoli/analisi.</div>
    </div>
  )
}
