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
  const title = String(cfg.title || 'Regolamento irriguo')
  const titleColor = String(cfg.titleColor || '#1F4E79')
  const titleFontSize = Number(cfg.titleFontSize || 15)
  const sectionTitleColor = String(cfg.sectionTitleColor || '#1F4E79')
  const sectionTitleFontSize = Number(cfg.sectionTitleFontSize || 13)
  const accentColor = String(cfg.accentColor || '#1F4E79')
  const leftPanelBackgroundColor = String(cfg.leftPanelBackgroundColor || '#ffffff')
  const contentBackgroundColor = String(cfg.contentBackgroundColor || '#ffffff')
  const leftColumnWidthPct = Number(cfg.leftColumnWidthPct || 28)
  const rightColumnWidthPct = Number(cfg.rightColumnWidthPct || 72)
  const regolamentoArticoliUrl = String(cfg.regolamentoArticoliUrl || '')
  const pdfUrl = String(cfg.pdfUrl || '')
  const set = (k: string, v: any) => props.onSettingChange({ id: props.id, config: (props.config as any)?.set ? (props.config as any).set(k, v) : { ...cfg, [k]: v } as any })

  return (
    <div style={box}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#93c5fd', marginBottom: 8 }}>Configurazione widget</div>

      <div style={section}>
        <div style={sectionTitle}>Titolo principale</div>

        <label style={lbl}>Titolo</label>
        <input style={inp} value={title} onChange={(e) => set('title', e.target.value)} />

        <label style={lbl}>Colore titolo</label>
        <div style={colorRow}>
          <input style={colorInp} type='color' value={titleColor} onChange={(e) => set('titleColor', e.target.value)} aria-label='Colore titolo' />
          <input style={inp} value={titleColor} onChange={(e) => set('titleColor', e.target.value)} placeholder='#1F4E79' />
        </div>

        <label style={lbl}>Dimensione titolo (px)</label>
        <input style={inp} type='number' min={10} max={36} step={1} value={titleFontSize} onChange={(e) => set('titleFontSize', Number(e.target.value || 15))} />
      </div>

      <div style={section}>
        <div style={sectionTitle}>Titoli di sezione (indice)</div>

        <label style={lbl}>Colore titoli di sezione</label>
        <div style={colorRow}>
          <input style={colorInp} type='color' value={sectionTitleColor} onChange={(e) => set('sectionTitleColor', e.target.value)} aria-label='Colore titoli di sezione' />
          <input style={inp} value={sectionTitleColor} onChange={(e) => set('sectionTitleColor', e.target.value)} placeholder='#1F4E79' />
        </div>

        <label style={lbl}>Dimensione titoli di sezione (px)</label>
        <input style={inp} type='number' min={10} max={24} step={0.5} value={sectionTitleFontSize} onChange={(e) => set('sectionTitleFontSize', Number(e.target.value || 13))} />
      </div>

      <div style={section}>
        <div style={sectionTitle}>Colore di accento</div>
        <label style={lbl}>Usato per l'articolo attivo nell'indice e per i rimandi cliccabili nel testo</label>
        <div style={colorRow}>
          <input style={colorInp} type='color' value={accentColor} onChange={(e) => set('accentColor', e.target.value)} aria-label='Colore di accento' />
          <input style={inp} value={accentColor} onChange={(e) => set('accentColor', e.target.value)} placeholder='#1F4E79' />
        </div>
      </div>

      <div style={section}>
        <div style={sectionTitle}>Larghezza colonne</div>

        <label style={lbl}>Colonna indice (%)</label>
        <input style={inp} type='number' min={15} max={60} step={1} value={leftColumnWidthPct} onChange={(e) => set('leftColumnWidthPct', Number(e.target.value || 28))} />

        <label style={lbl}>Colonna contenuto (%)</label>
        <input style={inp} type='number' min={40} max={85} step={1} value={rightColumnWidthPct} onChange={(e) => set('rightColumnWidthPct', Number(e.target.value || 72))} />

        <div style={hint}>Le due larghezze definiscono la posizione iniziale del separatore. Nel runtime le colonne possono essere ridimensionate trascinando il divisore e ripristinate con l'apposito pulsante.</div>
      </div>

      <div style={section}>
        <div style={sectionTitle}>Sfondo pannelli</div>

        <label style={lbl}>Sfondo pannello indice</label>
        <div style={colorRow}>
          <input style={colorInp} type='color' value={leftPanelBackgroundColor} onChange={(e) => set('leftPanelBackgroundColor', e.target.value)} aria-label='Sfondo pannello indice' />
          <input style={inp} value={leftPanelBackgroundColor} onChange={(e) => set('leftPanelBackgroundColor', e.target.value)} placeholder='#ffffff' />
        </div>

        <label style={lbl}>Sfondo pannello contenuto</label>
        <div style={colorRow}>
          <input style={colorInp} type='color' value={contentBackgroundColor} onChange={(e) => set('contentBackgroundColor', e.target.value)} aria-label='Sfondo pannello contenuto' />
          <input style={inp} value={contentBackgroundColor} onChange={(e) => set('contentBackgroundColor', e.target.value)} placeholder='#ffffff' />
        </div>
      </div>


      <div style={section}>
        <div style={sectionTitle}>Fonte articoli</div>
        <label style={lbl}>URL tabella GII_REGOLAMENTO_ARTICOLI</label>
        <input style={inp} value={regolamentoArticoliUrl} onChange={(e) => set('regolamentoArticoliUrl', e.target.value)} placeholder='https://.../GII_VIEW_EB_REGOLAMENTO_ARTICOLI/FeatureServer/0' />
        <div style={hint}>Tutte le voci del regolamento leggono numero, titolo e testo da questa tabella, la stessa fonte usata dagli altri componenti del Gestionale.</div>
      </div>

      <div style={section}>
        <div style={sectionTitle}>Documento originale</div>
        <label style={lbl}>URL PDF (opzionale)</label>
        <input style={inp} value={pdfUrl} onChange={(e) => set('pdfUrl', e.target.value)} placeholder='https://www.cbsm.it/.../Regolamento_irriguo_CdD_007-2024.pdf' />
        <div style={hint}>Se valorizzato, mostra nell'intestazione un link "Scarica il testo integrale (PDF)" che apre il documento originale in una nuova scheda.</div>
      </div>

      <div style={hint}>Widget di sola consultazione. Gli artt. 1-45 delle Norme generali e i punti 1-2 del distinto regolamento sulle condotte private provengono tutti dalla tabella configurata. I codici RCP01/RCP02 mantengono separata la numerazione del regolamento sulle condotte private.</div>
    </div>
  )
}
