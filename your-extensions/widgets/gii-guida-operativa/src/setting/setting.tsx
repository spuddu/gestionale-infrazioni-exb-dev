/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx } from 'jimu-core'
import type { AllWidgetSettingProps } from 'jimu-for-builder'
import type { IMConfig } from '../config'

const { Fragment } = React

const box: React.CSSProperties = { padding: 12, background: '#1a1f2e', minHeight: '100%', color: '#e5e7eb', boxSizing: 'border-box' }
const section: React.CSSProperties = { marginTop: 12, padding: 10, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, background: 'rgba(255,255,255,0.04)' }
const sectionTitle: React.CSSProperties = { fontSize: 12.5, fontWeight: 700, color: '#93c5fd', marginBottom: 8 }
const lbl: React.CSSProperties = { fontSize: 11.5, fontWeight: 600, color: '#d1d5db', display: 'block', marginBottom: 4, marginTop: 9 }
const inp: React.CSSProperties = { width: '100%', padding: '6px 8px', fontSize: 12, border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, outline: 'none', boxSizing: 'border-box', background: 'rgba(255,255,255,0.07)', color: '#e5e7eb' }
const colorRow: React.CSSProperties = { display: 'grid', gridTemplateColumns: '58px 1fr', gap: 8, alignItems: 'center' }
const colorInp: React.CSSProperties = { width: 48, height: 34, padding: 2, border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, background: 'rgba(255,255,255,0.07)', boxSizing: 'border-box', cursor: 'pointer' }
const hint: React.CSSProperties = { fontSize: 10.5, color: '#a0aec0', marginTop: 5, lineHeight: 1.45 }

export default function Setting(props: AllWidgetSettingProps<IMConfig>): React.ReactElement {
  const cfg: any = props.config || {}
  const set = (k: string, v: any) => props.onSettingChange({ id: props.id, config: (props.config as any)?.set ? (props.config as any).set(k, v) : { ...cfg, [k]: v } as any })
  const color = (key: string, fallback: string, label: string) => {
    const value = String(cfg[key] || fallback)
    return <Fragment><label style={lbl}>{label}</label><div style={colorRow}><input type='color' style={colorInp} value={value} onChange={(e) => set(key, e.target.value)} /><input style={inp} value={value} onChange={(e) => set(key, e.target.value)} /></div></Fragment>
  }
  const num = (key: string, fallback: number, label: string, min = 0, max = 100) => <Fragment><label style={lbl}>{label}</label><input style={inp} type='number' min={min} max={max} step={1} value={cfg[key] == null ? fallback : Number(cfg[key])} onChange={(e) => set(key, Number(e.target.value || 0))} /></Fragment>

  return <div style={box}>
    <div style={{ fontSize: 13, fontWeight: 700, color: '#93c5fd' }}>Configurazione Guida operativa</div>

    <div style={section}>
      <div style={sectionTitle}>Intestazione</div>
      <label style={lbl}>Titolo</label><input style={inp} value={String(cfg.title || 'Guida operativa')} onChange={(e) => set('title', e.target.value)} />
      <label style={{ ...lbl, display:'flex', alignItems:'center', gap:8 }}><input type='checkbox' checked={cfg.showTitleSubtitle !== false} onChange={e=>set('showTitleSubtitle',e.target.checked)}/> Mostra sottotitolo / descrizione</label>
      <label style={{ ...lbl, display:'flex', alignItems:'center', gap:8 }}><input type='checkbox' checked={cfg.showTitleDivider !== false} onChange={e=>set('showTitleDivider',e.target.checked)}/> Mostra separatore sotto il titolo</label>
      <label style={lbl}>Sottotitolo</label><textarea style={{ ...inp, minHeight: 64, resize: 'vertical' }} value={String(cfg.subtitle || '')} onChange={(e) => set('subtitle', e.target.value)} />
      {color('titleColor', '#1F4E79', 'Colore titolo')}
      {color('titleDividerColor', '#1F4E79', 'Colore separatore sotto il titolo')}
      {num('titleDividerWidth', 2, 'Spessore separatore titolo (px; 0 = nascosto)', 0, 8)}
      {color('accentColor', '#1F4E79', 'Colore di accento')}
      {color('textColor', '#1f2937', 'Colore testo')}
      {color('mutedColor', '#64748b', 'Colore testo secondario')}
    </div>

    <div style={section}>
      <div style={sectionTitle}>Tipografia</div>
      {num('titleFontSize', 22, 'Titolo Guida operativa (px)', 16, 40)}
      {num('titleIconSize', 26, 'Dimensione icona titolo (px)', 16, 48)}
      {color('subtitleColor', '#475569', 'Colore descrizione sotto il separatore')}
      {num('subtitleFontSize', 14, 'Dimensione descrizione sotto il separatore (px)', 10, 30)}
      {num('bodyFontSize', 15, 'Testo principale (px)', 12, 22)}
      {num('indexFontSize', 14, 'Indice e ricerca (px)', 11, 20)}
      <div style={hint}>Titoli di capitolo e sezione, tabelle, procedure e testi secondari vengono proporzionati automaticamente a questi valori.</div>
    </div>

    <div style={section}>
      <div style={sectionTitle}>Pannelli</div>
      {color('leftPanelBackgroundColor', '#ffffff', 'Sfondo indice')}
      {color('contentBackgroundColor', '#ffffff', 'Sfondo contenuto')}
      {color('panelHeaderBackgroundColor', '#f5f9ff', 'Sfondo testate pannelli')}
      {color('panelBorderColor', '#c5d9f1', 'Colore bordi pannelli')}
      {num('panelBorderWidth', 1, 'Spessore bordi pannelli (px)', 0, 8)}
      {color('separatorColor', '#dbe7f4', 'Colore separatori interni')}
      {num('separatorWidth', 1, 'Spessore separatori interni (px)', 1, 8)}
      {num('panelRadius', 8, 'Radius pannelli (px)', 0, 30)}
      {num('leftColumnWidthPct', 28, 'Larghezza iniziale indice (%)', 15, 60)}
      {color('splitterColor', '#3d77c9', 'Colore divisore')}
      {num('splitterWidth', 2, 'Spessore divisore (px)', 1, 8)}
      <div style={hint}>Nel runtime il divisore è trascinabile; doppio clic ripristina la larghezza configurata.</div>
    </div>

    <div style={section}>
      <div style={sectionTitle}>Ricerca e ruolo</div>
      <label style={lbl}>Placeholder ricerca</label><input style={inp} value={String(cfg.searchPlaceholder || 'Cerca nella guida…')} onChange={(e) => set('searchPlaceholder', e.target.value)} />
      <label style={{ ...lbl, display: 'flex', alignItems: 'center', gap: 7 }}><input type='checkbox' checked={cfg.showRoleFilter !== false} onChange={(e) => set('showRoleFilter', e.target.checked)} /> Mostra filtro per ruolo</label>
      <label style={lbl}>Filtro iniziale</label><select style={inp} value={String(cfg.defaultRoleMode || 'all')} onChange={(e) => set('defaultRoleMode', e.target.value)}><option value='all'>Tutti i contenuti</option><option value='current'>Ruolo corrente</option></select>
      <label style={{ ...lbl, display: 'flex', alignItems: 'center', gap: 7 }}><input type='checkbox' checked={cfg.showVersion !== false} onChange={(e) => set('showVersion', e.target.checked)} /> Mostra versione della base</label>
      <label style={lbl}>URL manuale scaricabile</label><input style={inp} value={String(cfg.manualDownloadUrl || '')} onChange={(e) => set('manualDownloadUrl', e.target.value)} placeholder='https://…/Manuale_GII.docx' />
      <div style={hint}>Se l’URL è vuoto il pulsante “Scarica manuale” non viene mostrato.</div>
    </div>

    <div style={section}>
      <div style={sectionTitle}>Padding esterno</div>
      {num('outerPaddingTop', 12, 'Superiore (px)', 0, 80)}
      {num('outerPaddingRight', 12, 'Destro (px)', 0, 80)}
      {num('outerPaddingBottom', 12, 'Inferiore (px)', 0, 80)}
      {num('outerPaddingLeft', 12, 'Sinistro (px)', 0, 80)}
    </div>

    <div style={section}>
      <div style={sectionTitle}>Padding indice</div>
      {num('indexPaddingTop', 8, 'Superiore (px)', 0, 80)}
      {num('indexPaddingRight', 8, 'Destro (px)', 0, 80)}
      {num('indexPaddingBottom', 8, 'Inferiore (px)', 0, 80)}
      {num('indexPaddingLeft', 8, 'Sinistro (px)', 0, 80)}
    </div>

    <div style={section}>
      <div style={sectionTitle}>Padding contenuto</div>
      {num('contentPaddingTop', 12, 'Superiore (px)', 0, 80)}
      {num('contentPaddingRight', 12, 'Destro (px)', 0, 80)}
      {num('contentPaddingBottom', 12, 'Inferiore (px)', 0, 80)}
      {num('contentPaddingLeft', 12, 'Sinistro (px)', 0, 80)}
    </div>
  </div>
}
