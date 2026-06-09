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
  const panelBorderColor = String(cfg.panelBorderColor || '#c5d9f1')
  const controlBackgroundColor = String(cfg.controlBackgroundColor || '#ffffff')
  const controlTextColor = String(cfg.controlTextColor || '#111827')
  const controlBorderColor = String(cfg.controlBorderColor || '#aac4e0')
  const controlFontSize = Number(cfg.controlFontSize || 13)
  const readonlyBackgroundColor = String(cfg.readonlyBackgroundColor || '#eef4fb')
  const readonlyTextColor = String(cfg.readonlyTextColor || '#3f4d5a')
  const tableHeaderBackgroundColor = String(cfg.tableHeaderBackgroundColor || '#1F4E79')
  const tableHeaderTextColor = String(cfg.tableHeaderTextColor || '#ffffff')
  const tableTextColor = String(cfg.tableTextColor || '#111827')
  const tableFontSize = Number(cfg.tableFontSize || 12)
  const primaryButtonBackgroundColor = String(cfg.primaryButtonBackgroundColor || '#1F4E79')
  const primaryButtonTextColor = String(cfg.primaryButtonTextColor || '#ffffff')
  const secondaryButtonBackgroundColor = String(cfg.secondaryButtonBackgroundColor || '#e0e0e0')
  const secondaryButtonTextColor = String(cfg.secondaryButtonTextColor || '#333333')
  const dangerButtonBackgroundColor = String(cfg.dangerButtonBackgroundColor || '#c00000')
  const dangerButtonTextColor = String(cfg.dangerButtonTextColor || '#ffffff')
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
        <div style={sectionTitle}>Schede e bordi</div>

        <label style={lbl}>Colore bordi schede e tabella</label>
        <div style={colorRow}>
          <input style={colorInp} type='color' value={panelBorderColor} onChange={(e) => set('panelBorderColor', e.target.value)} aria-label='Colore bordi schede e tabella' />
          <input style={inp} value={panelBorderColor} onChange={(e) => set('panelBorderColor', e.target.value)} placeholder='#c5d9f1' />
        </div>
      </div>

      <div style={section}>
        <div style={sectionTitle}>Campi e controlli</div>

        <label style={lbl}>Colore di sfondo</label>
        <div style={colorRow}>
          <input style={colorInp} type='color' value={controlBackgroundColor} onChange={(e) => set('controlBackgroundColor', e.target.value)} aria-label='Colore di sfondo campi e controlli' />
          <input style={inp} value={controlBackgroundColor} onChange={(e) => set('controlBackgroundColor', e.target.value)} placeholder='#ffffff' />
        </div>

        <label style={lbl}>Colore testo</label>
        <div style={colorRow}>
          <input style={colorInp} type='color' value={controlTextColor} onChange={(e) => set('controlTextColor', e.target.value)} aria-label='Colore testo campi e controlli' />
          <input style={inp} value={controlTextColor} onChange={(e) => set('controlTextColor', e.target.value)} placeholder='#111827' />
        </div>

        <label style={lbl}>Colore bordo</label>
        <div style={colorRow}>
          <input style={colorInp} type='color' value={controlBorderColor} onChange={(e) => set('controlBorderColor', e.target.value)} aria-label='Colore bordo campi e controlli' />
          <input style={inp} value={controlBorderColor} onChange={(e) => set('controlBorderColor', e.target.value)} placeholder='#aac4e0' />
        </div>

        <label style={lbl}>Dimensione testo (px)</label>
        <input style={inp} type='number' min={9} max={24} step={0.5} value={controlFontSize} onChange={(e) => set('controlFontSize', Number(e.target.value || 13))} />

        <label style={lbl}>Sfondo campi bloccati</label>
        <div style={colorRow}>
          <input style={colorInp} type='color' value={readonlyBackgroundColor} onChange={(e) => set('readonlyBackgroundColor', e.target.value)} aria-label='Sfondo campi bloccati' />
          <input style={inp} value={readonlyBackgroundColor} onChange={(e) => set('readonlyBackgroundColor', e.target.value)} placeholder='#eef4fb' />
        </div>

        <label style={lbl}>Testo campi bloccati</label>
        <div style={colorRow}>
          <input style={colorInp} type='color' value={readonlyTextColor} onChange={(e) => set('readonlyTextColor', e.target.value)} aria-label='Colore testo campi bloccati' />
          <input style={inp} value={readonlyTextColor} onChange={(e) => set('readonlyTextColor', e.target.value)} placeholder='#3f4d5a' />
        </div>
      </div>

      <div style={section}>
        <div style={sectionTitle}>Tabella Nuovi Prezzi</div>

        <label style={lbl}>Colore intestazione</label>
        <div style={colorRow}>
          <input style={colorInp} type='color' value={tableHeaderBackgroundColor} onChange={(e) => set('tableHeaderBackgroundColor', e.target.value)} aria-label='Colore intestazione tabella' />
          <input style={inp} value={tableHeaderBackgroundColor} onChange={(e) => set('tableHeaderBackgroundColor', e.target.value)} placeholder='#1F4E79' />
        </div>

        <label style={lbl}>Colore testo intestazione</label>
        <div style={colorRow}>
          <input style={colorInp} type='color' value={tableHeaderTextColor} onChange={(e) => set('tableHeaderTextColor', e.target.value)} aria-label='Colore testo intestazione tabella' />
          <input style={inp} value={tableHeaderTextColor} onChange={(e) => set('tableHeaderTextColor', e.target.value)} placeholder='#ffffff' />
        </div>

        <label style={lbl}>Colore testo righe</label>
        <div style={colorRow}>
          <input style={colorInp} type='color' value={tableTextColor} onChange={(e) => set('tableTextColor', e.target.value)} aria-label='Colore testo righe tabella' />
          <input style={inp} value={tableTextColor} onChange={(e) => set('tableTextColor', e.target.value)} placeholder='#111827' />
        </div>

        <label style={lbl}>Dimensione testo tabella (px)</label>
        <input style={inp} type='number' min={9} max={22} step={0.5} value={tableFontSize} onChange={(e) => set('tableFontSize', Number(e.target.value || 12))} />
      </div>

      <div style={section}>
        <div style={sectionTitle}>Pulsanti</div>

        <label style={lbl}>Sfondo pulsanti Aggiorna / Modifica</label>
        <div style={colorRow}>
          <input style={colorInp} type='color' value={primaryButtonBackgroundColor} onChange={(e) => set('primaryButtonBackgroundColor', e.target.value)} aria-label='Sfondo pulsanti principali' />
          <input style={inp} value={primaryButtonBackgroundColor} onChange={(e) => set('primaryButtonBackgroundColor', e.target.value)} placeholder='#1F4E79' />
        </div>
        <label style={lbl}>Testo pulsanti Aggiorna / Modifica</label>
        <div style={colorRow}>
          <input style={colorInp} type='color' value={primaryButtonTextColor} onChange={(e) => set('primaryButtonTextColor', e.target.value)} aria-label='Testo pulsanti principali' />
          <input style={inp} value={primaryButtonTextColor} onChange={(e) => set('primaryButtonTextColor', e.target.value)} placeholder='#ffffff' />
        </div>

        <label style={lbl}>Sfondo pulsante Annulla</label>
        <div style={colorRow}>
          <input style={colorInp} type='color' value={secondaryButtonBackgroundColor} onChange={(e) => set('secondaryButtonBackgroundColor', e.target.value)} aria-label='Sfondo pulsante Annulla' />
          <input style={inp} value={secondaryButtonBackgroundColor} onChange={(e) => set('secondaryButtonBackgroundColor', e.target.value)} placeholder='#e0e0e0' />
        </div>
        <label style={lbl}>Testo pulsante Annulla</label>
        <div style={colorRow}>
          <input style={colorInp} type='color' value={secondaryButtonTextColor} onChange={(e) => set('secondaryButtonTextColor', e.target.value)} aria-label='Testo pulsante Annulla' />
          <input style={inp} value={secondaryButtonTextColor} onChange={(e) => set('secondaryButtonTextColor', e.target.value)} placeholder='#333333' />
        </div>

        <label style={lbl}>Sfondo pulsante Elimina</label>
        <div style={colorRow}>
          <input style={colorInp} type='color' value={dangerButtonBackgroundColor} onChange={(e) => set('dangerButtonBackgroundColor', e.target.value)} aria-label='Sfondo pulsante Elimina' />
          <input style={inp} value={dangerButtonBackgroundColor} onChange={(e) => set('dangerButtonBackgroundColor', e.target.value)} placeholder='#c00000' />
        </div>
        <label style={lbl}>Testo pulsante Elimina</label>
        <div style={colorRow}>
          <input style={colorInp} type='color' value={dangerButtonTextColor} onChange={(e) => set('dangerButtonTextColor', e.target.value)} aria-label='Testo pulsante Elimina' />
          <input style={inp} value={dangerButtonTextColor} onChange={(e) => set('dangerButtonTextColor', e.target.value)} placeholder='#ffffff' />
        </div>
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
