/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx } from 'jimu-core'
import type { AllWidgetSettingProps } from 'jimu-for-builder'
import type { IMConfig } from '../config'

const DEFAULT_SERVICE_URL = 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_utenti/FeatureServer/0'

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
  const titleColor = String(cfg.titleColor || '#93c5fd')
  const titleFontSize = Number(cfg.titleFontSize || 15)
  const fieldLabelColor = String(cfg.fieldLabelColor || '#1F4E79')
  const fieldLabelFontSize = Number(cfg.fieldLabelFontSize || 11)
  const detailCardBackgroundColor = String(cfg.detailCardBackgroundColor || '#f5f9ff')
  const recordsCardBackgroundColor = String(cfg.recordsCardBackgroundColor || '#f5f9ff')
  const tableHeaderBackgroundColor = String(cfg.tableHeaderBackgroundColor || '#1F4E79')
  const tableHeaderTextColor = String(cfg.tableHeaderTextColor || '#ffffff')
  const tableFontSize = Number(cfg.tableFontSize || 12)

  const set = (key: string, value: any) => props.onSettingChange({
    id: props.id,
    config: (props.config as any)?.set
      ? (props.config as any).set(key, value)
      : { ...cfg, [key]: value } as any
  })

  return (
    <div style={box}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#93c5fd', marginBottom: 8 }}>Configurazione widget</div>

      <div style={section}>
        <div style={sectionTitle}>Titolo principale</div>

        <label style={lbl}>Titolo</label>
        <input style={inp} value={cfg.title || ''} onChange={(e) => set('title', e.target.value)} placeholder='GII – Gestione Utenti' />

        <label style={lbl}>Colore titolo principale</label>
        <div style={colorRow}>
          <input style={colorInp} type='color' value={titleColor} onChange={(e) => set('titleColor', e.target.value)} aria-label='Colore titolo principale' />
          <input style={inp} value={titleColor} onChange={(e) => set('titleColor', e.target.value)} placeholder='#93c5fd' />
        </div>

        <label style={lbl}>Dimensione titolo principale (px)</label>
        <input style={inp} type='number' min={10} max={36} step={1} value={titleFontSize} onChange={(e) => set('titleFontSize', Number(e.target.value || 15))} />
      </div>

      <div style={section}>
        <div style={sectionTitle}>Etichette della maschera</div>

        <label style={lbl}>Colore etichette</label>
        <div style={colorRow}>
          <input style={colorInp} type='color' value={fieldLabelColor} onChange={(e) => set('fieldLabelColor', e.target.value)} aria-label='Colore etichette della maschera' />
          <input style={inp} value={fieldLabelColor} onChange={(e) => set('fieldLabelColor', e.target.value)} placeholder='#1F4E79' />
        </div>

        <label style={lbl}>Dimensione etichette (px)</label>
        <input style={inp} type='number' min={9} max={24} step={0.5} value={fieldLabelFontSize} onChange={(e) => set('fieldLabelFontSize', Number(e.target.value || 11))} />
      </div>

      <div style={section}>
        <div style={sectionTitle}>Scheda dettaglio utente</div>
        <label style={lbl}>Colore di sfondo</label>
        <div style={colorRow}>
          <input style={colorInp} type='color' value={detailCardBackgroundColor} onChange={(e) => set('detailCardBackgroundColor', e.target.value)} aria-label='Colore di sfondo della scheda dettaglio utente' />
          <input style={inp} value={detailCardBackgroundColor} onChange={(e) => set('detailCardBackgroundColor', e.target.value)} placeholder='#f5f9ff' />
        </div>
        <div style={hint}>Imposta lo sfondo della scheda usata per inserire o modificare un utente.</div>
      </div>

      <div style={section}>
        <div style={sectionTitle}>Scheda utenti salvati</div>
        <label style={lbl}>Colore di sfondo</label>
        <div style={colorRow}>
          <input style={colorInp} type='color' value={recordsCardBackgroundColor} onChange={(e) => set('recordsCardBackgroundColor', e.target.value)} aria-label='Colore di sfondo della scheda utenti salvati' />
          <input style={inp} value={recordsCardBackgroundColor} onChange={(e) => set('recordsCardBackgroundColor', e.target.value)} placeholder='#f5f9ff' />
        </div>
        <div style={hint}>Imposta lo sfondo dell'area in cui compaiono i profili utente già registrati.</div>
      </div>

      <div style={section}>
        <div style={sectionTitle}>Tabella utenti</div>

        <label style={lbl}>Colore intestazione</label>
        <div style={colorRow}>
          <input style={colorInp} type='color' value={tableHeaderBackgroundColor} onChange={(e) => set('tableHeaderBackgroundColor', e.target.value)} aria-label='Colore intestazione tabella utenti' />
          <input style={inp} value={tableHeaderBackgroundColor} onChange={(e) => set('tableHeaderBackgroundColor', e.target.value)} placeholder='#1F4E79' />
        </div>

        <label style={lbl}>Colore testo intestazione</label>
        <div style={colorRow}>
          <input style={colorInp} type='color' value={tableHeaderTextColor} onChange={(e) => set('tableHeaderTextColor', e.target.value)} aria-label='Colore testo intestazione tabella utenti' />
          <input style={inp} value={tableHeaderTextColor} onChange={(e) => set('tableHeaderTextColor', e.target.value)} placeholder='#ffffff' />
        </div>

        <label style={lbl}>Dimensione testo tabella (px)</label>
        <input style={inp} type='number' min={9} max={22} step={0.5} value={tableFontSize} onChange={(e) => set('tableFontSize', Number(e.target.value || 12))} />
      </div>

      <div style={section}>
        <div style={sectionTitle}>Servizio utenti e credenziali AGOL</div>

        <label style={lbl}>URL tabella GII_utenti</label>
        <input style={inp} value={cfg.serviceUrl || ''} onChange={(e) => set('serviceUrl', e.target.value)} placeholder={DEFAULT_SERVICE_URL} />
        <div style={hint}>Layer o vista editabile utilizzata per caricare e aggiornare i profili del gestionale.</div>

        <label style={lbl}>Client Secret AGOL</label>
        <input
          style={inp}
          type='password'
          value={cfg.clientSecret || ''}
          onChange={(e) => set('clientSecret', e.target.value)}
          placeholder='Incolla il Client Secret AGOL'
        />
        <div style={hint}>AGOL → Contenuto → Application ExB Developer Local → Credenziali → Segreto client. Viene usato solo come fallback quando la sessione ExB non fornisce già un token.</div>
      </div>
    </div>
  )
}
