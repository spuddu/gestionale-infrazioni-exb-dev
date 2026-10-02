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
  const titleFontSize = Number(cfg.mainTitleFontSize || 18)
  const sectionTitleColor = String(cfg.sectionTitleColor || '#1F4E79')
  const sectionTitleFontSize = Number(cfg.sectionHeaderFontSize || 15)
  const bodyFontSize = Number(cfg.bodyFontSize || 15)
  const indexFontSize = Number(cfg.indexFontSize || 14)
  const accentColor = String(cfg.accentColor || '#1F4E79')
  const subtitleColor = String(cfg.subtitleColor || '#475569')
  const subtitleFontSize = Number(cfg.subtitleFontSize || 14)
  const approvalMetaColor = String(cfg.approvalMetaColor || '#475569')
  const approvalMetaFontSize = Number(cfg.approvalMetaFontSize || 13)
  const approvalMetaFontWeight = Number(cfg.approvalMetaFontWeight || 600)
  const titleDividerColor = String(cfg.titleDividerColor || '#1F4E79')
  const titleDividerWidth = cfg.titleDividerWidth == null ? 2 : Number(cfg.titleDividerWidth)
  const leftPanelBackgroundColor = String(cfg.leftPanelBackgroundColor || '#ffffff')
  const contentBackgroundColor = String(cfg.contentBackgroundColor || '#ffffff')
  const panelRadius = cfg.panelRadius == null ? 8 : Number(cfg.panelRadius)
  const panelBorderWidth = cfg.panelBorderWidth == null ? 1 : Number(cfg.panelBorderWidth)
  const panelBorderColor = String(cfg.panelBorderColor || '#c5d9f1')
  const panelHeaderBackgroundColor = String(cfg.panelHeaderBackgroundColor || '#f5f9ff')
  const separatorColor = String(cfg.separatorColor || '#dbe7f4')
  const separatorWidth = cfg.separatorWidth == null ? 1 : Number(cfg.separatorWidth)
  const controlRadius = cfg.controlRadius == null ? 6 : Number(cfg.controlRadius)
  const controlBorderWidth = cfg.controlBorderWidth == null ? 1 : Number(cfg.controlBorderWidth)
  const controlBorderColor = String(cfg.controlBorderColor || '#aac4e0')
  const controlBackgroundColor = String(cfg.controlBackgroundColor || '#ffffff')
  const controlHoverBackgroundColor = String(cfg.controlHoverBackgroundColor || '#eef5ff')
  const splitterColor = String(cfg.splitterColor || '#3d77c9')
  const splitterWidth = cfg.splitterWidth == null ? 2 : Number(cfg.splitterWidth)
  const outerPaddingTop = cfg.outerPaddingTop == null ? 12 : Number(cfg.outerPaddingTop)
  const outerPaddingRight = cfg.outerPaddingRight == null ? 12 : Number(cfg.outerPaddingRight)
  const outerPaddingBottom = cfg.outerPaddingBottom == null ? 12 : Number(cfg.outerPaddingBottom)
  const outerPaddingLeft = cfg.outerPaddingLeft == null ? 12 : Number(cfg.outerPaddingLeft)
  const indexPaddingTop = cfg.indexPaddingTop == null ? 8 : Number(cfg.indexPaddingTop)
  const indexPaddingRight = cfg.indexPaddingRight == null ? 8 : Number(cfg.indexPaddingRight)
  const indexPaddingBottom = cfg.indexPaddingBottom == null ? 8 : Number(cfg.indexPaddingBottom)
  const indexPaddingLeft = cfg.indexPaddingLeft == null ? 8 : Number(cfg.indexPaddingLeft)
  const articlePaddingTop = cfg.articlePaddingTop == null ? 12 : Number(cfg.articlePaddingTop)
  const articlePaddingRight = cfg.articlePaddingRight == null ? 12 : Number(cfg.articlePaddingRight)
  const articlePaddingBottom = cfg.articlePaddingBottom == null ? 12 : Number(cfg.articlePaddingBottom)
  const articlePaddingLeft = cfg.articlePaddingLeft == null ? 12 : Number(cfg.articlePaddingLeft)
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

        <label style={lbl}>Sottotitolo</label>
        <input style={inp} value={String((cfg as any).subtitleText || '')} onChange={(e) => set('subtitleText', e.target.value)} placeholder='Vuoto = usa la descrizione della card Home' />

        <label style={lbl}>Colore titolo</label>
        <div style={colorRow}>
          <input style={colorInp} type='color' value={titleColor} onChange={(e) => set('titleColor', e.target.value)} aria-label='Colore titolo' />
          <input style={inp} value={titleColor} onChange={(e) => set('titleColor', e.target.value)} placeholder='#1F4E79' />
        </div>

        <label style={lbl}>Dimensione titolo (px)</label>
        <input style={inp} type='number' min={10} max={36} step={1} value={titleFontSize} onChange={(e) => set('mainTitleFontSize', Number(e.target.value || 18))} />
        <label style={lbl}>Dimensione icona titolo (px)</label>
        <input style={inp} type='number' min={16} max={48} step={1} value={Number(cfg.titleIconSize || 23)} onChange={(e) => set('titleIconSize', Number(e.target.value || 23))} />

        <label style={{ ...lbl, display:'flex', alignItems:'center', gap:8 }}><input type='checkbox' checked={cfg.showTitleSubtitle !== false} onChange={e=>set('showTitleSubtitle',e.target.checked)}/> Mostra sottotitolo / descrizione</label>
        <label style={{ ...lbl, display:'flex', alignItems:'center', gap:8 }}><input type='checkbox' checked={cfg.showTitleDivider !== false} onChange={e=>set('showTitleDivider',e.target.checked)}/> Mostra separatore sotto il titolo</label>
        <label style={lbl}>Colore descrizione sotto il separatore</label>
        <div style={colorRow}>
          <input style={colorInp} type='color' value={subtitleColor} onChange={(e) => set('subtitleColor', e.target.value)} aria-label='Colore descrizione' />
          <input style={inp} value={subtitleColor} onChange={(e) => set('subtitleColor', e.target.value)} />
        </div>
        <label style={lbl}>Dimensione descrizione sotto il separatore (px)</label>
        <input style={inp} type='number' min={10} max={30} step={1} value={subtitleFontSize} onChange={(e) => set('subtitleFontSize', Number(e.target.value || 14))} />

        <div style={{ ...sectionTitle, marginTop: 16, marginBottom: 0 }}>Delibera di approvazione</div>
        <label style={lbl}>Colore testo delibera</label>
        <div style={colorRow}>
          <input style={colorInp} type='color' value={approvalMetaColor} onChange={(e) => set('approvalMetaColor', e.target.value)} aria-label='Colore testo delibera' />
          <input style={inp} value={approvalMetaColor} onChange={(e) => set('approvalMetaColor', e.target.value)} />
        </div>
        <label style={lbl}>Dimensione testo delibera (px)</label>
        <input style={inp} type='number' min={9} max={24} step={1} value={approvalMetaFontSize} onChange={(e) => set('approvalMetaFontSize', Number(e.target.value || 13))} />
        <label style={lbl}>Peso testo delibera</label>
        <input style={inp} type='number' min={100} max={900} step={100} value={approvalMetaFontWeight} onChange={(e) => set('approvalMetaFontWeight', Number(e.target.value || 600))} />
        <div style={hint}>Il testo della delibera è allineato sulla destra della stessa riga del titolo e mantiene dimensione, colore e peso indipendenti dal titolo.</div>

        <label style={lbl}>Colore separatore sotto il titolo</label>
        <div style={colorRow}>
          <input style={colorInp} type='color' value={titleDividerColor} onChange={(e) => set('titleDividerColor', e.target.value)} aria-label='Colore separatore titolo' />
          <input style={inp} value={titleDividerColor} onChange={(e) => set('titleDividerColor', e.target.value)} />
        </div>

        <label style={lbl}>Spessore separatore titolo (px)</label>
        <input style={inp} type='number' min={0} max={8} step={1} value={titleDividerWidth} onChange={(e) => set('titleDividerWidth', Number(e.target.value || 0))} />
      </div>

      <div style={section}>
        <div style={sectionTitle}>Titoli di sezione (indice)</div>

        <label style={lbl}>Colore titoli di sezione</label>
        <div style={colorRow}>
          <input style={colorInp} type='color' value={sectionTitleColor} onChange={(e) => set('sectionTitleColor', e.target.value)} aria-label='Colore titoli di sezione' />
          <input style={inp} value={sectionTitleColor} onChange={(e) => set('sectionTitleColor', e.target.value)} placeholder='#1F4E79' />
        </div>

        <label style={lbl}>Dimensione titoli di sezione (px)</label>
        <input style={inp} type='number' min={10} max={24} step={0.5} value={sectionTitleFontSize} onChange={(e) => set('sectionHeaderFontSize', Number(e.target.value || 15))} />
      </div>

      <div style={section}>
        <div style={sectionTitle}>Testo di consultazione</div>
        <label style={lbl}>Dimensione testo articoli (px)</label>
        <input style={inp} type='number' min={12} max={22} step={1} value={bodyFontSize} onChange={(e) => set('bodyFontSize', Number(e.target.value || 15))} />
        <label style={lbl}>Dimensione indice articoli (px)</label>
        <input style={inp} type='number' min={11} max={20} step={1} value={indexFontSize} onChange={(e) => set('indexFontSize', Number(e.target.value || 14))} />
        <div style={hint}>Metadati, numeri articolo, titoli articolo e controlli secondari vengono proporzionati automaticamente a questi valori.</div>
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
        <div style={sectionTitle}>Schede e pannelli</div>

        <label style={lbl}>Radius schede (px)</label>
        <input style={inp} type='number' min={0} max={40} step={1} value={panelRadius} onChange={(e) => set('panelRadius', Number(e.target.value || 0))} />

        <label style={lbl}>Spessore bordo schede (px)</label>
        <input style={inp} type='number' min={0} max={8} step={1} value={panelBorderWidth} onChange={(e) => set('panelBorderWidth', Number(e.target.value || 0))} />

        <label style={lbl}>Colore bordo schede</label>
        <div style={colorRow}>
          <input style={colorInp} type='color' value={panelBorderColor} onChange={(e) => set('panelBorderColor', e.target.value)} aria-label='Colore bordo schede' />
          <input style={inp} value={panelBorderColor} onChange={(e) => set('panelBorderColor', e.target.value)} />
        </div>

        <label style={lbl}>Sfondo intestazioni schede</label>
        <div style={colorRow}>
          <input style={colorInp} type='color' value={panelHeaderBackgroundColor} onChange={(e) => set('panelHeaderBackgroundColor', e.target.value)} aria-label='Sfondo intestazioni schede' />
          <input style={inp} value={panelHeaderBackgroundColor} onChange={(e) => set('panelHeaderBackgroundColor', e.target.value)} />
        </div>
      </div>

      <div style={section}>
        <div style={sectionTitle}>Spaziature</div>

        <div style={{ ...lbl, marginTop: 0 }}>Padding esterno widget (px)</div>
        <label style={lbl}>Superiore</label>
        <input style={inp} type='number' min={0} max={80} step={1} value={outerPaddingTop} onChange={(e) => set('outerPaddingTop', Number(e.target.value || 0))} />
        <label style={lbl}>Destro</label>
        <input style={inp} type='number' min={0} max={80} step={1} value={outerPaddingRight} onChange={(e) => set('outerPaddingRight', Number(e.target.value || 0))} />
        <label style={lbl}>Inferiore</label>
        <input style={inp} type='number' min={0} max={80} step={1} value={outerPaddingBottom} onChange={(e) => set('outerPaddingBottom', Number(e.target.value || 0))} />
        <label style={lbl}>Sinistro</label>
        <input style={inp} type='number' min={0} max={80} step={1} value={outerPaddingLeft} onChange={(e) => set('outerPaddingLeft', Number(e.target.value || 0))} />

        <div style={{ ...lbl, marginTop: 14 }}>Padding interno pannello indice (px)</div>
        <label style={lbl}>Superiore</label>
        <input style={inp} type='number' min={0} max={80} step={1} value={indexPaddingTop} onChange={(e) => set('indexPaddingTop', Number(e.target.value || 0))} />
        <label style={lbl}>Destro</label>
        <input style={inp} type='number' min={0} max={80} step={1} value={indexPaddingRight} onChange={(e) => set('indexPaddingRight', Number(e.target.value || 0))} />
        <label style={lbl}>Inferiore</label>
        <input style={inp} type='number' min={0} max={80} step={1} value={indexPaddingBottom} onChange={(e) => set('indexPaddingBottom', Number(e.target.value || 0))} />
        <label style={lbl}>Sinistro</label>
        <input style={inp} type='number' min={0} max={80} step={1} value={indexPaddingLeft} onChange={(e) => set('indexPaddingLeft', Number(e.target.value || 0))} />

        <div style={{ ...lbl, marginTop: 14 }}>Padding interno pannello contenuto (px)</div>
        <label style={lbl}>Superiore</label>
        <input style={inp} type='number' min={0} max={80} step={1} value={articlePaddingTop} onChange={(e) => set('articlePaddingTop', Number(e.target.value || 0))} />
        <label style={lbl}>Destro</label>
        <input style={inp} type='number' min={0} max={80} step={1} value={articlePaddingRight} onChange={(e) => set('articlePaddingRight', Number(e.target.value || 0))} />
        <label style={lbl}>Inferiore</label>
        <input style={inp} type='number' min={0} max={80} step={1} value={articlePaddingBottom} onChange={(e) => set('articlePaddingBottom', Number(e.target.value || 0))} />
        <label style={lbl}>Sinistro</label>
        <input style={inp} type='number' min={0} max={80} step={1} value={articlePaddingLeft} onChange={(e) => set('articlePaddingLeft', Number(e.target.value || 0))} />

        <div style={hint}>I valori predefiniti riproducono le spaziature attuali del widget.</div>
      </div>

      <div style={section}>
        <div style={sectionTitle}>Separatori interni</div>

        <label style={lbl}>Colore separatori</label>
        <div style={colorRow}>
          <input style={colorInp} type='color' value={separatorColor} onChange={(e) => set('separatorColor', e.target.value)} aria-label='Colore separatori' />
          <input style={inp} value={separatorColor} onChange={(e) => set('separatorColor', e.target.value)} />
        </div>

        <label style={lbl}>Spessore separatori (px)</label>
        <input style={inp} type='number' min={0} max={8} step={1} value={separatorWidth} onChange={(e) => set('separatorWidth', Number(e.target.value || 0))} />
        <div style={hint}>Controlla le linee tra intestazioni e contenuti, tra articolo e navigazione e la guida verticale dell'indice.</div>
      </div>

      <div style={section}>
        <div style={sectionTitle}>Campi e pulsanti</div>

        <label style={lbl}>Radius controlli (px)</label>
        <input style={inp} type='number' min={0} max={30} step={1} value={controlRadius} onChange={(e) => set('controlRadius', Number(e.target.value || 0))} />

        <label style={lbl}>Spessore bordo controlli (px)</label>
        <input style={inp} type='number' min={0} max={8} step={1} value={controlBorderWidth} onChange={(e) => set('controlBorderWidth', Number(e.target.value || 0))} />

        <label style={lbl}>Colore bordo controlli</label>
        <div style={colorRow}>
          <input style={colorInp} type='color' value={controlBorderColor} onChange={(e) => set('controlBorderColor', e.target.value)} aria-label='Colore bordo controlli' />
          <input style={inp} value={controlBorderColor} onChange={(e) => set('controlBorderColor', e.target.value)} />
        </div>

        <label style={lbl}>Sfondo controlli</label>
        <div style={colorRow}>
          <input style={colorInp} type='color' value={controlBackgroundColor} onChange={(e) => set('controlBackgroundColor', e.target.value)} aria-label='Sfondo controlli' />
          <input style={inp} value={controlBackgroundColor} onChange={(e) => set('controlBackgroundColor', e.target.value)} />
        </div>

        <label style={lbl}>Sfondo hover</label>
        <div style={colorRow}>
          <input style={colorInp} type='color' value={controlHoverBackgroundColor} onChange={(e) => set('controlHoverBackgroundColor', e.target.value)} aria-label='Sfondo hover' />
          <input style={inp} value={controlHoverBackgroundColor} onChange={(e) => set('controlHoverBackgroundColor', e.target.value)} />
        </div>
      </div>

      <div style={section}>
        <div style={sectionTitle}>Divisore colonne</div>

        <label style={lbl}>Colore linea divisore</label>
        <div style={colorRow}>
          <input style={colorInp} type='color' value={splitterColor} onChange={(e) => set('splitterColor', e.target.value)} aria-label='Colore linea divisore' />
          <input style={inp} value={splitterColor} onChange={(e) => set('splitterColor', e.target.value)} />
        </div>

        <label style={lbl}>Spessore linea divisore (px)</label>
        <input style={inp} type='number' min={1} max={10} step={1} value={splitterWidth} onChange={(e) => set('splitterWidth', Number(e.target.value || 1))} />
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
