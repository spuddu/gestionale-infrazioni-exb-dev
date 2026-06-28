/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx, Immutable, DataSourceTypes, type UseDataSource } from 'jimu-core'
import type { AllWidgetSettingProps } from 'jimu-for-builder'
import { DataSourceSelector } from 'jimu-ui/advanced/data-source-selector'
import type { IMConfig, SummaryFieldConfig } from '../config'
import { defaultConfig, defaultSummaryFields } from '../config'

type Props = AllWidgetSettingProps<IMConfig>

function asJs<T = any> (v: any): T {
  return v?.asMutable ? v.asMutable({ deep: true }) : v
}

const P = {
  wrap: { padding: '0 10px 32px', fontSize: 13, background: '#1a1f2e', minHeight: '100%', color: '#e5e7eb' } as React.CSSProperties,
  sec: { fontSize: 11, fontWeight: 700, color: '#93c5fd', textTransform: 'uppercase' as const, letterSpacing: 1.2, borderBottom: '1px solid rgba(255,255,255,0.10)', paddingBottom: 6, marginBottom: 14, marginTop: 22, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } as React.CSSProperties,
  lbl: { fontSize: 11.5, fontWeight: 600, color: '#d1d5db', display: 'block', marginBottom: 5, marginTop: 12, lineHeight: 1.25 } as React.CSSProperties,
  hint: { fontSize: 10.5, color: '#a0aec0', marginTop: 3, lineHeight: 1.4 } as React.CSSProperties,
  inp: { width: '100%', padding: '6px 8px', fontSize: 12, border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, outline: 'none', boxSizing: 'border-box' as const, background: 'rgba(255,255,255,0.07)', color: '#e5e7eb' } as React.CSSProperties,
  row2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', columnGap: 10, rowGap: 4, alignItems: 'start' } as React.CSSProperties,
  row3: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', columnGap: 10, rowGap: 4, alignItems: 'start' } as React.CSSProperties,
  card: { border: '1px solid rgba(255,255,255,0.10)', borderRadius: 10, padding: 12, marginBottom: 10, background: 'rgba(255,255,255,0.04)' } as React.CSSProperties
}

function Inp (p: { value: string | number, onChange: (v: string) => void, placeholder?: string }) {
  return <input type='text' value={p.value ?? ''} onChange={e => p.onChange(e.target.value)} placeholder={p.placeholder} style={P.inp} />
}

function NumInp (p: { value: number, onChange: (v: number) => void, min?: number, max?: number, step?: number, unit?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <input type='number' value={p.value} min={p.min} max={p.max} step={p.step || 1} onChange={e => p.onChange(Number(e.target.value))} style={{ ...P.inp, width: 74 }} />
      {p.unit && <span style={{ fontSize: 11, color: '#a0aec0', flexShrink: 0 }}>{p.unit}</span>}
    </div>
  )
}

function ColInp (p: { value: string, onChange: (v: string) => void }) {
  const hexVal = /^#[0-9a-fA-F]{3,8}$/.test(String(p.value || '')) ? String(p.value) : '#0d3b66'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <input type='color' value={hexVal} onChange={e => p.onChange(e.target.value)} style={{ width: 30, height: 26, padding: 2, border: '1px solid rgba(255,255,255,0.15)', borderRadius: 5, cursor: 'pointer', background: 'transparent', flexShrink: 0 }} />
      <input type='text' value={p.value || ''} onChange={e => p.onChange(e.target.value)} placeholder='#rrggbb o rgba(...)' style={{ ...P.inp, flex: 1, fontSize: 11 }} />
    </div>
  )
}

function Check (p: { value: boolean, onChange: (v: boolean) => void, label: string }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#d1d5db', cursor: 'pointer', marginTop: 8 }}>
      <input type='checkbox' checked={!!p.value} onChange={e => p.onChange(e.target.checked)} />
      {p.label}
    </label>
  )
}

function Acc (p: { id: string, label: string, open: boolean, onToggle: () => void }) {
  return (
    <div style={P.sec} onClick={p.onToggle}>
      <span>{p.label}</span>
      <span style={{ fontSize: 10, color: '#a0aec0' }}>{p.open ? '▲' : '▼'}</span>
    </div>
  )
}

function SectionBox (p: { title?: string, hint?: string, children?: React.ReactNode }) {
  return (
    <div style={P.card}>
      {p.title && <div style={{ fontSize: 12, fontWeight: 800, color: '#93c5fd', marginBottom: 6 }}>{p.title}</div>}
      {p.hint && <div style={{ ...P.hint, marginTop: 0, marginBottom: 8 }}>{p.hint}</div>}
      {p.children}
    </div>
  )
}

function parseNum (v: any, fb: number): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : fb
}

function normalizeFields (v: any): SummaryFieldConfig[] {
  const arr = Array.isArray(asJs(v)) ? asJs<any[]>(v) : []
  return arr.map((x: any) => ({ name: String(x?.name || '').trim(), label: String(x?.label || x?.name || '').trim() }))
}

export default function Setting (props: Props) {
  const [openSec, setOpenSec] = React.useState<string>('datasource')
  const cfgJs: any = { ...defaultConfig, ...asJs(props.config) }
  const fields = normalizeFields(cfgJs.summaryFields)
  const baseCfg = props.config || ((Immutable as any)(defaultConfig) as any)

  const patch = (obj: Record<string, any>) => {
    let next = baseCfg
    Object.entries(obj).forEach(([k, v]) => {
      if (k === 'summaryFields') next = next.set(k, (Immutable as any)((v || []) as any) as any)
      else next = next.set(k, v)
    })
    props.onSettingChange({ id: props.id, config: next })
  }

  const onDsChange = (useDataSources: UseDataSource[]) => {
    props.onSettingChange({ id: props.id, useDataSources: useDataSources as any, useDataSourcesEnabled: true })
  }

  const onToggleDs = (useDataSourcesEnabled: boolean) => {
    props.onSettingChange({ id: props.id, useDataSourcesEnabled })
  }

  const isOpen = (id: string) => openSec === id
  const toggle = (id: string) => setOpenSec(s => s === id ? '' : id)

  const setField = (idx: number, key: keyof SummaryFieldConfig, value: string) => {
    const next = fields.slice()
    next[idx] = { ...(next[idx] || { name: '', label: '' }), [key]: value }
    patch({ summaryFields: next })
  }

  const removeField = (idx: number) => {
    const next = fields.slice()
    next.splice(idx, 1)
    patch({ summaryFields: next })
  }

  return (
    <div style={P.wrap}>
      <Acc id='datasource' label='📊 Fonte dati' open={isOpen('datasource')} onToggle={() => toggle('datasource')} />
      {isOpen('datasource') && <div>
        <div style={P.hint}>Collega la stessa vista usata dall’Area Amministrativa. Il widget lavora solo su record già selezionati, oppure sui dati passati da gii-azioni.</div>
        <div style={{ marginTop: 10 }}>
          <DataSourceSelector
            types={(Immutable as any)([DataSourceTypes.FeatureLayer])}
            useDataSources={props.useDataSources}
            useDataSourcesEnabled={props.useDataSourcesEnabled}
            onChange={onDsChange}
            onToggleUseDataEnabled={onToggleDs}
            widgetId={props.id}
            isMultiple={false}
            mustUseDataSource
          />
        </div>
      </div>}


      <Acc id='sanzioni' label='⚖️ Parametri sanzionatori' open={isOpen('sanzioni')} onToggle={() => toggle('sanzioni')} />
      {isOpen('sanzioni') && <div>
        <div style={P.hint}>URL delle tabelle AGOL usate solo in consultazione. Non modificano workflow, salvataggi o gii-header.</div>
        <label style={P.lbl}>GII_PARAMETRI_SANZIONI</label>
        <Inp value={cfgJs.parametriSanzioniUrl || ''} onChange={v => patch({ parametriSanzioniUrl: v })} placeholder='https://.../FeatureServer/0' />
        <label style={P.lbl}>GII_REGOLAMENTO_ARTICOLI</label>
        <Inp value={cfgJs.regolamentoArticoliUrl || ''} onChange={v => patch({ regolamentoArticoliUrl: v })} placeholder='https://.../FeatureServer/0' />
        <label style={P.lbl}>GII_REGOLAMENTO_RACCORDI</label>
        <Inp value={cfgJs.regolamentoRaccordiUrl || ''} onChange={v => patch({ regolamentoRaccordiUrl: v })} placeholder='https://.../FeatureServer/0' />
      </div>}

      <Acc id='testi' label='📝 Testi' open={isOpen('testi')} onToggle={() => toggle('testi')} />
      {isOpen('testi') && <div>
        <label style={P.lbl}>Titolo</label>
        <Inp value={cfgJs.title} onChange={v => patch({ title: v })} />
        <label style={P.lbl}>Sottotitolo</label>
        <Inp value={cfgJs.subtitle} onChange={v => patch({ subtitle: v })} />
        <label style={P.lbl}>Prefisso titolo pratica</label>
        <Inp value={cfgJs.detailTitlePrefix} onChange={v => patch({ detailTitlePrefix: v })} />
      </div>}

      <Acc id='riepilogo' label='🧾 Campi riepilogo' open={isOpen('riepilogo')} onToggle={() => toggle('riepilogo')} />
      {isOpen('riepilogo') && <div>
        <div style={P.hint}>Campi mostrati in sola lettura nella scheda amministrativa. I campi non presenti nel record compariranno come “—”.</div>
        <div style={{ marginTop: 8 }}>
          {fields.map((f, idx) => (
            <div key={`${idx}-${f.name}`} style={P.card}>
              <div style={P.row2}>
                <div>
                  <label style={P.lbl}>Nome campo</label>
                  <Inp value={f.name} onChange={v => setField(idx, 'name', v)} />
                </div>
                <div>
                  <label style={P.lbl}>Etichetta</label>
                  <Inp value={f.label} onChange={v => setField(idx, 'label', v)} />
                </div>
              </div>
              <button type='button' onClick={() => removeField(idx)} style={{ marginTop: 8, padding: '5px 9px', borderRadius: 7, border: '1px solid rgba(252,165,165,0.4)', background: 'rgba(239,68,68,0.10)', color: '#fca5a5', fontSize: 12, cursor: 'pointer' }}>Rimuovi</button>
            </div>
          ))}
        </div>
        <button type='button' onClick={() => patch({ summaryFields: [...fields, { name: '', label: '' }] })} style={{ marginTop: 8, width: '100%', padding: '7px', borderRadius: 8, border: '1px dashed rgba(147,197,253,0.4)', background: 'rgba(59,130,246,0.08)', color: '#93c5fd', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>＋ Aggiungi campo</button>
        <button type='button' onClick={() => patch({ summaryFields: defaultSummaryFields })} style={{ marginTop: 8, width: '100%', padding: '7px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.05)', color: '#e5e7eb', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Ripristina campi base</button>
      </div>}

      <Acc id='stile-maschera' label='🎨 Maschera generale' open={isOpen('stile-maschera')} onToggle={() => toggle('stile-maschera')} />
      {isOpen('stile-maschera') && <div>
        <SectionBox title='Contenitore maschera' hint='Aspetto del pannello generale del verbale.'>
          <div style={P.row2}><div><label style={P.lbl}>Sfondo maschera</label><ColInp value={cfgJs.maskBg || defaultConfig.maskBg} onChange={v => patch({ maskBg: v })} /></div><div><label style={P.lbl}>Colore bordo</label><ColInp value={cfgJs.maskBorderColor || defaultConfig.maskBorderColor} onChange={v => patch({ maskBorderColor: v })} /></div></div>
          <div style={P.row3}>
            <div><label style={P.lbl}>Spessore bordo</label><NumInp value={parseNum(cfgJs.maskBorderWidth, defaultConfig.maskBorderWidth)} onChange={n => patch({ maskBorderWidth: n })} min={0} max={8} unit='px' /></div>
            <div><label style={P.lbl}>Arrotondamento</label><NumInp value={parseNum(cfgJs.maskBorderRadius, defaultConfig.maskBorderRadius)} onChange={n => patch({ maskBorderRadius: n })} min={0} max={40} unit='px' /></div>
            <div><label style={P.lbl}>Padding interno</label><NumInp value={parseNum(cfgJs.maskInnerPadding, defaultConfig.maskInnerPadding)} onChange={n => patch({ maskInnerPadding: n })} min={0} max={40} unit='px' /></div>
          </div>
        </SectionBox>
        <SectionBox title='Barra superiore e messaggi' hint='Titolo del verbale, sottotitolo e messaggi di stato.'>
          <div style={P.row3}>
            <div><label style={P.lbl}>Titolo</label><NumInp value={parseNum(cfgJs.titleFontSize, defaultConfig.titleFontSize)} onChange={n => patch({ titleFontSize: n })} min={10} max={28} unit='px' /></div>
            <div><label style={P.lbl}>Sottotitolo</label><NumInp value={parseNum(cfgJs.subtitleFontSize, defaultConfig.subtitleFontSize)} onChange={n => patch({ subtitleFontSize: n })} min={9} max={24} unit='px' /></div>
            <div><label style={P.lbl}>Messaggi</label><NumInp value={parseNum(cfgJs.msgFontSize, defaultConfig.msgFontSize)} onChange={n => patch({ msgFontSize: n })} min={9} max={24} unit='px' /></div>
          </div>
        </SectionBox>
        <SectionBox title='Card principali con intestazione blu' hint='Aspetto delle sezioni principali della maschera: Istruttoria amministrativa, Verifica dati automatici, Predisposizione verbale, Pagamento, Protocollo e chiusura.'>
          <div style={P.row2}><div><label style={P.lbl}>Sfondo corpo card</label><ColInp value={cfgJs.formCardBg || defaultConfig.formCardBg} onChange={v => patch({ formCardBg: v })} /></div><div><label style={P.lbl}>Bordo card</label><ColInp value={cfgJs.formCardBorderColor || defaultConfig.formCardBorderColor} onChange={v => patch({ formCardBorderColor: v })} /></div></div>
          <div style={P.row3}>
            <div><label style={P.lbl}>Spessore bordo</label><NumInp value={parseNum(cfgJs.formCardBorderWidth, defaultConfig.formCardBorderWidth)} onChange={n => patch({ formCardBorderWidth: n })} min={0} max={8} unit='px' /></div>
            <div><label style={P.lbl}>Arrotondamento card</label><NumInp value={parseNum(cfgJs.formCardBorderRadius, defaultConfig.formCardBorderRadius)} onChange={n => patch({ formCardBorderRadius: n })} min={0} max={40} unit='px' /></div>
            <div><label style={P.lbl}>Spazio tra card</label><NumInp value={parseNum(cfgJs.formSectionGap, defaultConfig.formSectionGap)} onChange={n => patch({ formSectionGap: n })} min={0} max={40} unit='px' /></div>
          </div>
          <label style={P.lbl}>Ombra card CSS</label><Inp value={cfgJs.formCardShadow || defaultConfig.formCardShadow} onChange={v => patch({ formCardShadow: v })} placeholder='0 1px 3px rgba(15, 23, 42, 0.08)' />
        </SectionBox>
        <SectionBox title='Intestazioni delle card principali' hint='Barre blu con il titolo della sezione.'>
          <label style={P.lbl}>Sfondo intestazione card</label><Inp value={cfgJs.formCardHeaderBg || defaultConfig.formCardHeaderBg} onChange={v => patch({ formCardHeaderBg: v })} placeholder='linear-gradient(90deg, #0d3b66, #155e9d)' />
          <div style={P.row2}><div><label style={P.lbl}>Colore testo intestazione</label><ColInp value={cfgJs.formCardHeaderColor || defaultConfig.formCardHeaderColor} onChange={v => patch({ formCardHeaderColor: v })} /></div><div><label style={P.lbl}>Dimensione testo</label><NumInp value={parseNum(cfgJs.formCardHeaderFontSize, defaultConfig.formCardHeaderFontSize)} onChange={n => patch({ formCardHeaderFontSize: n })} min={8} max={24} unit='px' /></div></div>
          <div style={P.row3}>
            <div><label style={P.lbl}>Peso testo</label><NumInp value={parseNum(cfgJs.formCardHeaderFontWeight, defaultConfig.formCardHeaderFontWeight)} onChange={n => patch({ formCardHeaderFontWeight: n })} min={300} max={900} step={100} /></div>
            <div><label style={P.lbl}>Padding X intestazione</label><NumInp value={parseNum(cfgJs.formCardHeaderPaddingX, defaultConfig.formCardHeaderPaddingX)} onChange={n => patch({ formCardHeaderPaddingX: n })} min={0} max={30} unit='px' /></div>
            <div><label style={P.lbl}>Padding Y intestazione</label><NumInp value={parseNum(cfgJs.formCardHeaderPaddingY, defaultConfig.formCardHeaderPaddingY)} onChange={n => patch({ formCardHeaderPaddingY: n })} min={0} max={24} unit='px' /></div>
          </div>
          <div style={P.row2}><div><label style={P.lbl}>Padding corpo card</label><NumInp value={parseNum(cfgJs.formCardBodyPadding, defaultConfig.formCardBodyPadding)} onChange={n => patch({ formCardBodyPadding: n })} min={0} max={30} unit='px' /></div><div><label style={P.lbl}>Dimensione importi</label><NumInp value={parseNum(cfgJs.amountFontSize, defaultConfig.amountFontSize)} onChange={n => patch({ amountFontSize: n })} min={10} max={32} unit='px' /></div></div>
        </SectionBox>
      </div>}

      <Acc id='stile-campi' label='🎨 Campi input e testi' open={isOpen('stile-campi')} onToggle={() => toggle('stile-campi')} />
      {isOpen('stile-campi') && <div>
        <SectionBox title='Etichette dei campi' hint='Etichette sopra input, combo e textarea.'>
          <div style={P.row2}><div><label style={P.lbl}>Colore etichette</label><ColInp value={cfgJs.formLabelColor || defaultConfig.formLabelColor} onChange={v => patch({ formLabelColor: v })} /></div><div><label style={P.lbl}>Dimensione testo</label><NumInp value={parseNum(cfgJs.formLabelFontSize, defaultConfig.formLabelFontSize)} onChange={n => patch({ formLabelFontSize: n })} min={8} max={24} unit='px' /></div></div>
          <div style={P.row2}><div><label style={P.lbl}>Peso testo</label><NumInp value={parseNum(cfgJs.formLabelFontWeight, defaultConfig.formLabelFontWeight)} onChange={n => patch({ formLabelFontWeight: n })} min={300} max={900} step={100} /></div><div><label style={P.lbl}>Distanza da campo</label><NumInp value={parseNum(cfgJs.formLabelMarginBottom, defaultConfig.formLabelMarginBottom)} onChange={n => patch({ formLabelMarginBottom: n })} min={0} max={20} unit='px' /></div></div>
        </SectionBox>
        <SectionBox title='Input / combo / textarea' hint='Campi compilabili e campi bloccati.'>
          <div style={P.row2}><div><label style={P.lbl}>Sfondo campo</label><ColInp value={cfgJs.formFieldBg || defaultConfig.formFieldBg} onChange={v => patch({ formFieldBg: v })} /></div><div><label style={P.lbl}>Colore testo</label><ColInp value={cfgJs.formFieldColor || defaultConfig.formFieldColor} onChange={v => patch({ formFieldColor: v })} /></div></div>
          <div style={P.row2}><div><label style={P.lbl}>Colore bordo</label><ColInp value={cfgJs.formFieldBorderColor || defaultConfig.formFieldBorderColor} onChange={v => patch({ formFieldBorderColor: v })} /></div><div><label style={P.lbl}>Sfondo campo bloccato</label><ColInp value={cfgJs.formFieldDisabledBg || defaultConfig.formFieldDisabledBg} onChange={v => patch({ formFieldDisabledBg: v })} /></div></div>
          <div style={P.row2}><div><label style={P.lbl}>Colore testo campo bloccato</label><ColInp value={cfgJs.formFieldDisabledColor || defaultConfig.formFieldDisabledColor} onChange={v => patch({ formFieldDisabledColor: v })} /></div><div /></div>
          <div style={P.row3}>
            <div><label style={P.lbl}>Dimensione testo</label><NumInp value={parseNum(cfgJs.formFieldFontSize, defaultConfig.formFieldFontSize)} onChange={n => patch({ formFieldFontSize: n })} min={8} max={24} unit='px' /></div>
            <div><label style={P.lbl}>Altezza campo</label><NumInp value={parseNum(cfgJs.formFieldHeight, defaultConfig.formFieldHeight)} onChange={n => patch({ formFieldHeight: n })} min={24} max={60} unit='px' /></div>
            <div><label style={P.lbl}>Padding orizzontale</label><NumInp value={parseNum(cfgJs.formFieldPaddingX, defaultConfig.formFieldPaddingX)} onChange={n => patch({ formFieldPaddingX: n })} min={0} max={30} unit='px' /></div>
          </div>
          <div style={P.row3}>
            <div><label style={P.lbl}>Spessore bordo</label><NumInp value={parseNum(cfgJs.formFieldBorderWidth, defaultConfig.formFieldBorderWidth)} onChange={n => patch({ formFieldBorderWidth: n })} min={0} max={8} unit='px' /></div>
            <div><label style={P.lbl}>Arrotondamento</label><NumInp value={parseNum(cfgJs.formFieldBorderRadius, defaultConfig.formFieldBorderRadius)} onChange={n => patch({ formFieldBorderRadius: n })} min={0} max={30} unit='px' /></div>
          </div>
        </SectionBox>
      </div>}

      <Acc id='stile-istruttoria' label='🎨 Istruttoria amministrativa' open={isOpen('stile-istruttoria')} onToggle={() => toggle('stile-istruttoria')} />
      {isOpen('stile-istruttoria') && <div>
        <SectionBox title='Dettagli pratica e workflow' hint='Card espandibile che contiene il riepilogo delle fasi.'>
          <div style={P.row2}>
            <div><label style={P.lbl}>Sfondo card espandibile</label><ColInp value={cfgJs.formExpandableCardBg || defaultConfig.formExpandableCardBg} onChange={v => patch({ formExpandableCardBg: v })} /></div>
            <div><label style={P.lbl}>Bordo card espandibile</label><ColInp value={cfgJs.formExpandableCardBorderColor || defaultConfig.formExpandableCardBorderColor} onChange={v => patch({ formExpandableCardBorderColor: v })} /></div>
          </div>
          <div style={P.row2}><div><label style={P.lbl}>Spessore bordo</label><NumInp value={parseNum(cfgJs.formExpandableCardBorderWidth, defaultConfig.formExpandableCardBorderWidth)} onChange={n => patch({ formExpandableCardBorderWidth: n })} min={0} max={8} unit='px' /></div></div>
        </SectionBox>
        <SectionBox title='Fase tecnica / Fase amministrativa' hint='Riquadri interni al workflow.'>
          <div style={P.row2}>
            <div><label style={P.lbl}>Sfondo card fasi</label><ColInp value={cfgJs.formPhaseCardBg || defaultConfig.formPhaseCardBg} onChange={v => patch({ formPhaseCardBg: v })} /></div>
            <div><label style={P.lbl}>Bordo card fasi</label><ColInp value={cfgJs.formPhaseCardBorderColor || defaultConfig.formPhaseCardBorderColor} onChange={v => patch({ formPhaseCardBorderColor: v })} /></div>
          </div>
          <div style={P.row2}>
            <div><label style={P.lbl}>Spessore bordo</label><NumInp value={parseNum(cfgJs.formPhaseCardBorderWidth, defaultConfig.formPhaseCardBorderWidth)} onChange={n => patch({ formPhaseCardBorderWidth: n })} min={0} max={8} unit='px' /></div>
            <div><label style={P.lbl}>Colore titolo fase</label><ColInp value={cfgJs.formPhaseCardTitleColor || defaultConfig.formPhaseCardTitleColor} onChange={v => patch({ formPhaseCardTitleColor: v })} /></div>
          </div>
        </SectionBox>
        <SectionBox title='Rapporto / Competenza / Istruttoria tecnica / Stati amministrativi' hint='Sottocard interne ai riquadri Fase tecnica e Fase amministrativa.'>
          <div style={P.row2}>
            <div><label style={P.lbl}>Sfondo sottocard</label><ColInp value={cfgJs.formWorkflowBadgeBg || defaultConfig.formWorkflowBadgeBg} onChange={v => patch({ formWorkflowBadgeBg: v })} /></div>
            <div><label style={P.lbl}>Bordo sottocard</label><ColInp value={cfgJs.formWorkflowBadgeBorderColor || defaultConfig.formWorkflowBadgeBorderColor} onChange={v => patch({ formWorkflowBadgeBorderColor: v })} /></div>
          </div>
          <div style={P.row3}>
            <div><label style={P.lbl}>Spessore bordo</label><NumInp value={parseNum(cfgJs.formWorkflowBadgeBorderWidth, defaultConfig.formWorkflowBadgeBorderWidth)} onChange={n => patch({ formWorkflowBadgeBorderWidth: n })} min={0} max={8} unit='px' /></div>
            <div><label style={P.lbl}>Titolo sottocard</label><ColInp value={cfgJs.formWorkflowBadgeTitleColor || defaultConfig.formWorkflowBadgeTitleColor} onChange={v => patch({ formWorkflowBadgeTitleColor: v })} /></div>
            <div><label style={P.lbl}>Etichette righe</label><ColInp value={cfgJs.formWorkflowBadgeLabelColor || defaultConfig.formWorkflowBadgeLabelColor} onChange={v => patch({ formWorkflowBadgeLabelColor: v })} /></div>
          </div>
          <div style={P.row2}>
            <div><label style={P.lbl}>Valori righe</label><ColInp value={cfgJs.formWorkflowBadgeValueColor || defaultConfig.formWorkflowBadgeValueColor} onChange={v => patch({ formWorkflowBadgeValueColor: v })} /></div>
            <div><label style={P.lbl}>Valori evidenziati</label><ColInp value={cfgJs.formWorkflowBadgeHighlightColor || defaultConfig.formWorkflowBadgeHighlightColor} onChange={v => patch({ formWorkflowBadgeHighlightColor: v })} /></div>
          </div>
        </SectionBox>
      </div>}

      <Acc id='stile-verifica' label='🎨 1. Verifica dati automatici' open={isOpen('stile-verifica')} onToggle={() => toggle('stile-verifica')} />
      {isOpen('stile-verifica') && <div>
        <SectionBox title='Atto amministrativo e riepilogo economico' hint='Riquadri automatici: Tipo atto, Oggetto, importi, dettaglio calcolo, stati e totali.'>
          <div style={P.row2}>
            <div><label style={P.lbl}>Sfondo riquadro normale</label><ColInp value={cfgJs.statusSummaryNormalBg || defaultConfig.statusSummaryNormalBg} onChange={v => patch({ statusSummaryNormalBg: v })} /></div>
            <div><label style={P.lbl}>Bordo riquadro normale</label><ColInp value={cfgJs.statusSummaryNormalBorderColor || defaultConfig.statusSummaryNormalBorderColor} onChange={v => patch({ statusSummaryNormalBorderColor: v })} /></div>
          </div>
          <div style={P.row2}>
            <div><label style={P.lbl}>Sfondo riquadro automatico</label><ColInp value={cfgJs.statusSummaryAutoBg || defaultConfig.statusSummaryAutoBg} onChange={v => patch({ statusSummaryAutoBg: v })} /></div>
            <div><label style={P.lbl}>Bordo riquadro automatico</label><ColInp value={cfgJs.statusSummaryAutoBorderColor || defaultConfig.statusSummaryAutoBorderColor} onChange={v => patch({ statusSummaryAutoBorderColor: v })} /></div>
          </div>
          <div style={P.row2}>
            <div><label style={P.lbl}>Sfondo riquadro attenzione</label><ColInp value={cfgJs.statusSummaryWarnBg || defaultConfig.statusSummaryWarnBg} onChange={v => patch({ statusSummaryWarnBg: v })} /></div>
            <div><label style={P.lbl}>Bordo riquadro attenzione</label><ColInp value={cfgJs.statusSummaryWarnBorderColor || defaultConfig.statusSummaryWarnBorderColor} onChange={v => patch({ statusSummaryWarnBorderColor: v })} /></div>
          </div>
          <div style={P.row2}>
            <div><label style={P.lbl}>Sfondo riquadro totale</label><Inp value={cfgJs.statusSummaryTotalBg || defaultConfig.statusSummaryTotalBg} onChange={v => patch({ statusSummaryTotalBg: v })} placeholder='linear-gradient(...) oppure #rrggbb' /></div>
            <div><label style={P.lbl}>Bordo riquadro totale</label><ColInp value={cfgJs.statusSummaryTotalBorderColor || defaultConfig.statusSummaryTotalBorderColor} onChange={v => patch({ statusSummaryTotalBorderColor: v })} /></div>
          </div>
          <div style={P.row3}>
            <div><label style={P.lbl}>Spessore bordo riquadri</label><NumInp value={parseNum(cfgJs.statusSummaryBorderWidth, defaultConfig.statusSummaryBorderWidth)} onChange={n => patch({ statusSummaryBorderWidth: n })} min={0} max={8} unit='px' /></div>
            <div><label style={P.lbl}>Etichetta riquadro</label><ColInp value={cfgJs.statusSummaryLabelColor || defaultConfig.statusSummaryLabelColor} onChange={v => patch({ statusSummaryLabelColor: v })} /></div>
            <div><label style={P.lbl}>Valore riquadro</label><ColInp value={cfgJs.statusSummaryValueColor || defaultConfig.statusSummaryValueColor} onChange={v => patch({ statusSummaryValueColor: v })} /></div>
          </div>
          <div style={P.row3}>
            <div><label style={P.lbl}>Nota riquadro</label><ColInp value={cfgJs.statusSummaryHintColor || defaultConfig.statusSummaryHintColor} onChange={v => patch({ statusSummaryHintColor: v })} /></div>
            <div><label style={P.lbl}>Etichetta totale</label><Inp value={cfgJs.statusSummaryTotalLabelColor || defaultConfig.statusSummaryTotalLabelColor} onChange={v => patch({ statusSummaryTotalLabelColor: v })} placeholder='rgba(...) oppure #rrggbb' /></div>
            <div><label style={P.lbl}>Valore totale</label><ColInp value={cfgJs.statusSummaryTotalValueColor || defaultConfig.statusSummaryTotalValueColor} onChange={v => patch({ statusSummaryTotalValueColor: v })} /></div>
          </div>
          <label style={P.lbl}>Nota totale</label><Inp value={cfgJs.statusSummaryTotalHintColor || defaultConfig.statusSummaryTotalHintColor} onChange={v => patch({ statusSummaryTotalHintColor: v })} placeholder='rgba(...) oppure #rrggbb' />
        </SectionBox>
      </div>}

      <Acc id='stile-verbale' label='🎨 2. Predisposizione verbale' open={isOpen('stile-verbale')} onToggle={() => toggle('stile-verbale')} />
      {isOpen('stile-verbale') && <div>
        <SectionBox title='Riquadro Tipo atto / Oggetto' hint='Card interna azzurrina all’inizio della sezione Predisposizione verbale.'>
          <div style={P.row2}>
            <div><label style={P.lbl}>Sfondo card</label><ColInp value={cfgJs.verbaleInfoCardBg || defaultConfig.verbaleInfoCardBg} onChange={v => patch({ verbaleInfoCardBg: v })} /></div>
            <div><label style={P.lbl}>Bordo card</label><ColInp value={cfgJs.verbaleInfoCardBorderColor || defaultConfig.verbaleInfoCardBorderColor} onChange={v => patch({ verbaleInfoCardBorderColor: v })} /></div>
          </div>
          <div style={P.row3}>
            <div><label style={P.lbl}>Spessore bordo</label><NumInp value={parseNum(cfgJs.verbaleInfoCardBorderWidth, defaultConfig.verbaleInfoCardBorderWidth)} onChange={n => patch({ verbaleInfoCardBorderWidth: n })} min={0} max={8} unit='px' /></div>
            <div><label style={P.lbl}>Etichette TIPO/OGGETTO</label><ColInp value={cfgJs.verbaleInfoLabelColor || defaultConfig.verbaleInfoLabelColor} onChange={v => patch({ verbaleInfoLabelColor: v })} /></div>
            <div><label style={P.lbl}>Testo Tipo atto</label><ColInp value={cfgJs.verbaleInfoTipoTextColor || defaultConfig.verbaleInfoTipoTextColor} onChange={v => patch({ verbaleInfoTipoTextColor: v })} /></div>
          </div>
          <div style={P.row2}><div><label style={P.lbl}>Testo Oggetto</label><ColInp value={cfgJs.verbaleInfoOggettoTextColor || defaultConfig.verbaleInfoOggettoTextColor} onChange={v => patch({ verbaleInfoOggettoTextColor: v })} /></div></div>
        </SectionBox>
        <SectionBox title='Stato verbale / Numero / Data' hint='Usa gli stessi riquadri configurati in “1. Verifica dati automatici”.' />
        <SectionBox title='Note amministrative' hint='Textarea e campi usano i colori della sezione “Campi input e testi”.' />
      </div>}

      <Acc id='stile-pagamento' label='🎨 3. Pagamento' open={isOpen('stile-pagamento')} onToggle={() => toggle('stile-pagamento')} />
      {isOpen('stile-pagamento') && <div>
        <SectionBox title='Importo / scadenza / stato pagamento' hint='Usa i riquadri automatici configurati in “1. Verifica dati automatici”.' />
        <SectionBox title='Dati pagoPA e dati bonifico' hint='Card espandibili: usano le impostazioni di “Istruttoria amministrativa → Dettagli pratica e workflow”.' />
        <SectionBox title='Campi di pagamento' hint='Le combo Modalità pagamento e Stato pagamento usano le impostazioni di “Campi input e testi”.' />
      </div>}

      <Acc id='stile-notifica' label='🎨 4-5. Protocollo e chiusura' open={isOpen('stile-notifica')} onToggle={() => toggle('stile-notifica')} />
      {isOpen('stile-notifica') && <div>
        <SectionBox title='Protocollo e notifica' hint='Input, date, combo e textarea usano le impostazioni di “Campi input e testi”.' />
        <SectionBox title='Completamento istruttoria amministrativa' hint='I riquadri riepilogativi usano le impostazioni di “1. Verifica dati automatici”.' />
      </div>}

      <Acc id='stile-norme' label='🎨 Norme e calcolo' open={isOpen('stile-norme')} onToggle={() => toggle('stile-norme')} />
      {isOpen('stile-norme') && <div>
        <SectionBox title='Contenitore casistica e parametri' hint='Aspetto del contenitore delle casistiche, dei separatori e dei valori dei parametri.'>
          <div style={P.row3}>
            <div><label style={P.lbl}>Sfondo gruppo casistica</label><ColInp value={cfgJs.normGroupBg || defaultConfig.normGroupBg} onChange={v => patch({ normGroupBg: v })} /></div>
            <div><label style={P.lbl}>Bordo gruppo casistica</label><ColInp value={cfgJs.normGroupBorderColor || defaultConfig.normGroupBorderColor} onChange={v => patch({ normGroupBorderColor: v })} /></div>
            <div><label style={P.lbl}>Spessore bordo gruppo</label><NumInp value={parseNum(cfgJs.normGroupBorderWidth, defaultConfig.normGroupBorderWidth)} onChange={n => patch({ normGroupBorderWidth: n })} min={0} max={8} unit='px' /></div>
          </div>
          <div style={P.row2}>
            <div><label style={P.lbl}>Separatore blocchi sanzione</label><ColInp value={cfgJs.normBlockSeparatorColor || defaultConfig.normBlockSeparatorColor} onChange={v => patch({ normBlockSeparatorColor: v })} /></div>
            <div><label style={P.lbl}>Separatore voci parametro</label><ColInp value={cfgJs.normVoceSeparatorColor || defaultConfig.normVoceSeparatorColor} onChange={v => patch({ normVoceSeparatorColor: v })} /></div>
          </div>
          <div style={P.row3}>
            <div><label style={P.lbl}>Testo voce parametro</label><ColInp value={cfgJs.normVoceLabelColor || defaultConfig.normVoceLabelColor} onChange={v => patch({ normVoceLabelColor: v })} /></div>
            <div><label style={P.lbl}>Valore parametro trovato</label><ColInp value={cfgJs.normParametroOkColor || defaultConfig.normParametroOkColor} onChange={v => patch({ normParametroOkColor: v })} /></div>
            <div><label style={P.lbl}>Valore parametro mancante</label><ColInp value={cfgJs.normParametroMissingColor || defaultConfig.normParametroMissingColor} onChange={v => patch({ normParametroMissingColor: v })} /></div>
          </div>
        </SectionBox>
        <SectionBox title='Norme violate' hint='Aspetto dedicato alle card apribili delle norme violate.'>
          <div style={P.row3}>
            <div><label style={P.lbl}>Sfondo card</label><ColInp value={cfgJs.normViolataCardBg || defaultConfig.normViolataCardBg} onChange={v => patch({ normViolataCardBg: v })} /></div>
            <div><label style={P.lbl}>Bordo card</label><ColInp value={cfgJs.normViolataBorderColor || defaultConfig.normViolataBorderColor} onChange={v => patch({ normViolataBorderColor: v })} /></div>
            <div><label style={P.lbl}>Spessore bordo</label><NumInp value={parseNum(cfgJs.normViolataBorderWidth, defaultConfig.normViolataBorderWidth)} onChange={n => patch({ normViolataBorderWidth: n })} min={0} max={8} unit='px' /></div>
          </div>
          <div style={P.row3}>
            <div><label style={P.lbl}>Sfondo intestazione</label><ColInp value={cfgJs.normViolataHeaderBg || defaultConfig.normViolataHeaderBg} onChange={v => patch({ normViolataHeaderBg: v })} /></div>
            <div><label style={P.lbl}>Testo intestazione</label><ColInp value={cfgJs.normViolataHeaderTextColor || defaultConfig.normViolataHeaderTextColor} onChange={v => patch({ normViolataHeaderTextColor: v })} /></div>
            <div><label style={P.lbl}>Freccia</label><ColInp value={cfgJs.normViolataArrowColor || defaultConfig.normViolataArrowColor} onChange={v => patch({ normViolataArrowColor: v })} /></div>
          </div>
          <div style={P.row2}>
            <div><label style={P.lbl}>Sfondo corpo</label><ColInp value={cfgJs.normViolataBodyBg || defaultConfig.normViolataBodyBg} onChange={v => patch({ normViolataBodyBg: v })} /></div>
            <div><label style={P.lbl}>Titolo articolo</label><ColInp value={cfgJs.normViolataArticleTitleColor || defaultConfig.normViolataArticleTitleColor} onChange={v => patch({ normViolataArticleTitleColor: v })} /></div>
          </div>
          <div style={P.row2}>
            <div><label style={P.lbl}>Testo articolo</label><ColInp value={cfgJs.normViolataArticleTextColor || defaultConfig.normViolataArticleTextColor} onChange={v => patch({ normViolataArticleTextColor: v })} /></div>
            <div><label style={P.lbl}>Meta articolo</label><ColInp value={cfgJs.normViolataArticleMetaColor || defaultConfig.normViolataArticleMetaColor} onChange={v => patch({ normViolataArticleMetaColor: v })} /></div>
          </div>
        </SectionBox>
        <SectionBox title='Norme sanzionatorie' hint='Aspetto dedicato alle card apribili delle norme sanzionatorie.'>
          <div style={P.row3}>
            <div><label style={P.lbl}>Sfondo card</label><ColInp value={cfgJs.normSanzionatoriaCardBg || defaultConfig.normSanzionatoriaCardBg} onChange={v => patch({ normSanzionatoriaCardBg: v })} /></div>
            <div><label style={P.lbl}>Bordo card</label><ColInp value={cfgJs.normSanzionatoriaBorderColor || defaultConfig.normSanzionatoriaBorderColor} onChange={v => patch({ normSanzionatoriaBorderColor: v })} /></div>
            <div><label style={P.lbl}>Spessore bordo</label><NumInp value={parseNum(cfgJs.normSanzionatoriaBorderWidth, defaultConfig.normSanzionatoriaBorderWidth)} onChange={n => patch({ normSanzionatoriaBorderWidth: n })} min={0} max={8} unit='px' /></div>
          </div>
          <div style={P.row3}>
            <div><label style={P.lbl}>Sfondo intestazione</label><ColInp value={cfgJs.normSanzionatoriaHeaderBg || defaultConfig.normSanzionatoriaHeaderBg} onChange={v => patch({ normSanzionatoriaHeaderBg: v })} /></div>
            <div><label style={P.lbl}>Testo intestazione</label><ColInp value={cfgJs.normSanzionatoriaHeaderTextColor || defaultConfig.normSanzionatoriaHeaderTextColor} onChange={v => patch({ normSanzionatoriaHeaderTextColor: v })} /></div>
            <div><label style={P.lbl}>Freccia</label><ColInp value={cfgJs.normSanzionatoriaArrowColor || defaultConfig.normSanzionatoriaArrowColor} onChange={v => patch({ normSanzionatoriaArrowColor: v })} /></div>
          </div>
          <div style={P.row2}>
            <div><label style={P.lbl}>Sfondo corpo</label><ColInp value={cfgJs.normSanzionatoriaBodyBg || defaultConfig.normSanzionatoriaBodyBg} onChange={v => patch({ normSanzionatoriaBodyBg: v })} /></div>
            <div><label style={P.lbl}>Titolo articolo</label><ColInp value={cfgJs.normSanzionatoriaArticleTitleColor || defaultConfig.normSanzionatoriaArticleTitleColor} onChange={v => patch({ normSanzionatoriaArticleTitleColor: v })} /></div>
          </div>
          <div style={P.row2}>
            <div><label style={P.lbl}>Testo articolo</label><ColInp value={cfgJs.normSanzionatoriaArticleTextColor || defaultConfig.normSanzionatoriaArticleTextColor} onChange={v => patch({ normSanzionatoriaArticleTextColor: v })} /></div>
            <div><label style={P.lbl}>Meta articolo</label><ColInp value={cfgJs.normSanzionatoriaArticleMetaColor || defaultConfig.normSanzionatoriaArticleMetaColor} onChange={v => patch({ normSanzionatoriaArticleMetaColor: v })} /></div>
          </div>
        </SectionBox>
      </div>}

      <Acc id='opzioni' label='⚙️ Opzioni' open={isOpen('opzioni')} onToggle={() => toggle('opzioni')} />
      {isOpen('opzioni') && <div>
        <Check value={cfgJs.showRoleBox !== false} onChange={v => patch({ showRoleBox: v })} label='Mostra profilo operativo' />
        <Check value={cfgJs.showWorkflowBox !== false} onChange={v => patch({ showWorkflowBox: v })} label='Mostra stato workflow amministrativo' />
      </div>}

      <div style={{ marginTop: 24, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <button type='button' onClick={() => { if (window.confirm('Ripristinare la configurazione predefinita?')) props.onSettingChange({ id: props.id, config: (Immutable as any)(defaultConfig) as any }) }} style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid rgba(252,165,165,0.4)', background: 'rgba(239,68,68,0.10)', color: '#fca5a5', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>↺ Ripristina predefiniti</button>
      </div>
    </div>
  )
}
