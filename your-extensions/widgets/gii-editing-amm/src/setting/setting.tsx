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
  wrap: { padding: '0 12px 32px', fontSize: 13, background: '#1a1f2e', minHeight: '100%', color: '#e5e7eb' } as React.CSSProperties,
  sec: { fontSize: 11, fontWeight: 700, color: '#93c5fd', textTransform: 'uppercase' as const, letterSpacing: 1.2, borderBottom: '1px solid rgba(255,255,255,0.10)', paddingBottom: 6, marginBottom: 14, marginTop: 22, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } as React.CSSProperties,
  lbl: { fontSize: 11.5, fontWeight: 600, color: '#d1d5db', display: 'block', marginBottom: 4, marginTop: 10 } as React.CSSProperties,
  hint: { fontSize: 10.5, color: '#a0aec0', marginTop: 3, lineHeight: 1.4 } as React.CSSProperties,
  inp: { width: '100%', padding: '5px 8px', fontSize: 12, border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, outline: 'none', boxSizing: 'border-box' as const, background: 'rgba(255,255,255,0.07)', color: '#e5e7eb' } as React.CSSProperties,
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } as React.CSSProperties,
  row3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 } as React.CSSProperties,
  card: { border: '1px solid rgba(255,255,255,0.10)', borderRadius: 10, padding: 10, marginBottom: 8, background: 'rgba(255,255,255,0.04)' } as React.CSSProperties
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

      <Acc id='stile' label='🎨 Stile' open={isOpen('stile')} onToggle={() => toggle('stile')} />
      {isOpen('stile') && <div>
        <div style={P.row3}>
          <div><label style={P.lbl}>Titolo</label><NumInp value={parseNum(cfgJs.titleFontSize, defaultConfig.titleFontSize)} onChange={n => patch({ titleFontSize: n })} min={10} unit='px' /></div>
          <div><label style={P.lbl}>Label</label><NumInp value={parseNum(cfgJs.labelFontSize, defaultConfig.labelFontSize)} onChange={n => patch({ labelFontSize: n })} min={9} unit='px' /></div>
          <div><label style={P.lbl}>Valori</label><NumInp value={parseNum(cfgJs.valueFontSize, defaultConfig.valueFontSize)} onChange={n => patch({ valueFontSize: n })} min={10} unit='px' /></div>
        </div>
        <div style={P.row3}>
          <div><label style={P.lbl}>Padding</label><NumInp value={parseNum(cfgJs.panelPadding, defaultConfig.panelPadding)} onChange={n => patch({ panelPadding: n })} min={0} unit='px' /></div>
          <div><label style={P.lbl}>Bordo</label><NumInp value={parseNum(cfgJs.panelBorderWidth, defaultConfig.panelBorderWidth)} onChange={n => patch({ panelBorderWidth: n })} min={0} unit='px' /></div>
          <div><label style={P.lbl}>Raggio</label><NumInp value={parseNum(cfgJs.panelBorderRadius, defaultConfig.panelBorderRadius)} onChange={n => patch({ panelBorderRadius: n })} min={0} unit='px' /></div>
        </div>
        <label style={P.lbl}>Colore principale</label>
        <ColInp value={cfgJs.primaryColor} onChange={v => patch({ primaryColor: v })} />
        <label style={P.lbl}>Sfondo pannello</label>
        <ColInp value={cfgJs.panelBg} onChange={v => patch({ panelBg: v })} />
        <label style={P.lbl}>Colore bordo</label>
        <ColInp value={cfgJs.panelBorderColor} onChange={v => patch({ panelBorderColor: v })} />
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
