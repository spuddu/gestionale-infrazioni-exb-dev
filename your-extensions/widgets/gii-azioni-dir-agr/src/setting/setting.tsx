/** @jsx jsx */
import { React, jsx, Immutable, DataSourceTypes, type UseDataSource } from 'jimu-core'
import type { AllWidgetSettingProps } from 'jimu-for-builder'
import { DataSourceSelector } from 'jimu-ui/advanced/data-source-selector'
import { SettingSection } from 'jimu-ui/advanced/setting-components'
import { Button } from 'jimu-ui'
import type { IMConfig } from '../config'
import { defaultConfig } from '../config'

type Props = AllWidgetSettingProps<IMConfig>

const PRESET_COLORS = [
  '#000000', '#ffffff', '#0078da', '#328c54', '#e75a05', '#d13438', '#6f42c1',
  '#f2f2f2', '#e5e7eb', '#f6f7f9'
]

const isHexColor = (s: string) => /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test((s || '').trim())

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 8px',
  borderRadius: 8,
  border: '1px solid rgba(0,0,0,0.2)'
}

const labelStyle: React.CSSProperties = {
  fontWeight: 700,
  marginBottom: 6,
  whiteSpace: 'normal',
  wordBreak: 'keep-all',
  overflowWrap: 'normal'
}

const helpStyle: React.CSSProperties = {
  fontSize: 12,
  opacity: 0.75,
  marginBottom: 8,
  whiteSpace: 'normal',
  wordBreak: 'keep-all',
  overflowWrap: 'normal'
}

function asJs<T = any> (v: any): T {
  return v?.asMutable ? v.asMutable({ deep: true }) : v
}

function parseNum (v: any, fallback: number): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function RowBlock (props: { label: string, help?: string, children: React.ReactNode }) {
  return (
    <div style={{ width: '100%', marginBottom: 12 }}>
      <div style={labelStyle}>{props.label}</div>
      {props.help && <div style={helpStyle}>{props.help}</div>}
      {props.children}
    </div>
  )
}

function ColorControl (props: { label: string, value: string, onChange: (v: string) => void }) {
  const v = props.value || ''
  const hex = isHexColor(v) ? v : '#000000'

  return (
    <RowBlock label={props.label}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', width: '100%' }}>
        <input
          type='text'
          style={{ ...inputStyle, flex: 1 }}
          value={v}
          onChange={(e) => props.onChange((e.target as HTMLInputElement).value)}
          placeholder='#rrggbb'
        />
        <input
          type='color'
          value={hex}
          onChange={(e) => props.onChange((e.target as HTMLInputElement).value)}
          title='Scegli colore'
          style={{ width: 44, height: 34, padding: 0, border: '1px solid rgba(0,0,0,0.2)', borderRadius: 10 }}
        />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
        {PRESET_COLORS.map(c => (
          <button
            key={c}
            type='button'
            onClick={() => props.onChange(c)}
            title={c}
            style={{
              width: 22,
              height: 22,
              borderRadius: 7,
              border: '1px solid rgba(0,0,0,0.18)',
              background: c,
              cursor: 'pointer'
            }}
          />
        ))}
      </div>
    </RowBlock>
  )
}

function NumberControl (props: { label: string, value: number, min?: number, max?: number, step?: number, onChange: (v: number) => void }) {
  return (
    <RowBlock label={props.label}>
      <input
        type='number'
        style={inputStyle}
        value={Number.isFinite(props.value) ? props.value : 0}
        min={props.min}
        max={props.max}
        step={props.step ?? 1}
        onChange={(e) => props.onChange(parseNum((e.target as HTMLInputElement).value, props.value))}
      />
    </RowBlock>
  )
}

export default function Setting (props: Props) {
  const dsTypes = Immutable([DataSourceTypes.FeatureLayer])

  const cfg = { ...defaultConfig, ...(asJs(props.config) as any || {}) }

  const setCfg = (key: string, value: any) => {
    props.onSettingChange({
      id: props.id,
      config: (props.config || (Immutable(defaultConfig) as any)).set(key, value)
    })
  }

  const setReasons = (reasons: string[]) => {
    props.onSettingChange({
      id: props.id,
      config: (props.config || (Immutable(defaultConfig) as any)).set('rejectReasons', Immutable(reasons) as any)
    })
  }

  const onMainDsChange = (useDataSources: UseDataSource[]) => {
    props.onSettingChange({ id: props.id, useDataSources: useDataSources as any })
  }

  const onToggleUseDataEnabled = (useDataSourcesEnabled: boolean) => {
    props.onSettingChange({ id: props.id, useDataSourcesEnabled })
  }

  const reasons = Array.isArray(cfg.rejectReasons) ? cfg.rejectReasons : defaultConfig.rejectReasons

  return (
    <div className='p-3' style={{ width: '100%' }}>
      <SettingSection title='Dati'>
        <div style={{ width: '100%' }}>
          <RowBlock
            label='Data source (selezione multipla)'
            help='Seleziona una o più Data View / feature layer. Il runtime userà automaticamente quella “attiva” (quella che ha la selezione corrente).'
          >
            <div style={{ minWidth: 320 }}>
              <DataSourceSelector
                widgetId={props.id}
                types={dsTypes}
                isMultiple
                useDataSources={props.useDataSources as any}
                useDataSourcesEnabled={props.useDataSourcesEnabled}
                onToggleUseDataEnabled={onToggleUseDataEnabled}
                onChange={onMainDsChange}
                mustUseDataSource
              />
            </div>
          </RowBlock>

          <RowBlock label='Ruolo' help='DT = Direttore Tecnico, DA = Direttore Amministrativo.'>
            <select
              style={inputStyle}
              value={(cfg.roleCode || 'DT').toString().toUpperCase()}
              onChange={(e) => setCfg('roleCode', (e.target as HTMLSelectElement).value)}
            >
              <option value='DT'>DT</option>
              <option value='DA'>DA</option>
            </select>
          </RowBlock>

          <RowBlock label='Testo bottone “Prendi in carico”'>
            <input
              type='text'
              style={inputStyle}
              value={cfg.buttonText ?? 'Prendi in carico'}
              onChange={(e) => setCfg('buttonText', (e.target as HTMLInputElement).value)}
            />
          </RowBlock>
        </div>
      </SettingSection>

      <SettingSection title='Aspetto pannello'>
        <ColorControl label='Sfondo pannello' value={cfg.panelBg} onChange={(v) => setCfg('panelBg', v)} />
        <ColorControl label='Colore bordo' value={cfg.panelBorderColor} onChange={(v) => setCfg('panelBorderColor', v)} />
        <NumberControl label='Spessore bordo (px)' value={cfg.panelBorderWidth} min={0} max={10} step={1} onChange={(v) => setCfg('panelBorderWidth', v)} />
        <NumberControl label='Raggio bordo (px)' value={cfg.panelBorderRadius} min={0} max={30} step={1} onChange={(v) => setCfg('panelBorderRadius', v)} />
        <NumberControl label='Padding pannello (px)' value={cfg.panelPadding} min={0} max={30} step={1} onChange={(v) => setCfg('panelPadding', v)} />
        <ColorControl label='Colore divisori' value={cfg.dividerColor} onChange={(v) => setCfg('dividerColor', v)} />
      </SettingSection>

      <SettingSection title='Testi'>
        <NumberControl label='Dimensione titolo (px)' value={cfg.titleFontSize} min={12} max={20} step={1} onChange={(v) => setCfg('titleFontSize', v)} />
        <NumberControl label='Dimensione stato (px)' value={cfg.statusFontSize} min={11} max={18} step={1} onChange={(v) => setCfg('statusFontSize', v)} />
        <NumberControl label='Dimensione messaggi/avvisi (px)' value={cfg.msgFontSize} min={12} max={20} step={1} onChange={(v) => setCfg('msgFontSize', v)} />
      </SettingSection>

      <SettingSection title='Colori pulsanti'>
        <ColorControl label='Prendi in carico' value={cfg.takeColor} onChange={(v) => setCfg('takeColor', v)} />
        <ColorControl label='Integrazione' value={cfg.integrazioneColor} onChange={(v) => setCfg('integrazioneColor', v)} />
        <ColorControl label='Approva' value={cfg.approvaColor} onChange={(v) => setCfg('approvaColor', v)} />
        <ColorControl label='Respingi' value={cfg.respingiColor} onChange={(v) => setCfg('respingiColor', v)} />
        <ColorControl label='Trasmetti a DA' value={cfg.trasmettiColor} onChange={(v) => setCfg('trasmettiColor', v)} />
      </SettingSection>

      <SettingSection title='Motivazioni respinta'>
        <RowBlock
          label='Voci elenco (menu a tendina)'
          help='Queste voci popolano il campo “Motivazione” quando fai “Respingi”.'
        >
          <div style={{ display: 'grid', gap: 8 }}>
            {reasons.map((r: string, idx: number) => {
              const isEven = idx % 2 === 0
              const bg = isEven ? (cfg.reasonsZebraEvenBg || defaultConfig.reasonsZebraEvenBg) : (cfg.reasonsZebraOddBg || defaultConfig.reasonsZebraOddBg)
              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    gap: 8,
                    alignItems: 'center',
                    padding: 8,
                    background: bg,
                    border: `${parseNum(cfg.reasonsRowBorderWidth, defaultConfig.reasonsRowBorderWidth)}px solid ${cfg.reasonsRowBorderColor || defaultConfig.reasonsRowBorderColor}`,
                    borderRadius: parseNum(cfg.reasonsRowRadius, defaultConfig.reasonsRowRadius)
                  }}
                >
                  <input
                    type='text'
                    style={{ ...inputStyle, flex: 1, margin: 0 }}
                    value={r}
                    onChange={(e) => {
                      const v = (e.target as HTMLInputElement).value
                      const next = reasons.slice()
                      next[idx] = v
                      setReasons(next)
                    }}
                    placeholder='Motivazione…'
                  />
                  <Button
                    size='sm'
                    onClick={() => {
                      const next = reasons.slice()
                      next.splice(idx, 1)
                      setReasons(next.length ? next : [''])
                    }}
                    title='Rimuovi'
                  >
                    ✕
                  </Button>
                </div>
              )
            })}

            <div style={{ display: 'flex', gap: 8 }}>
              <Button
                onClick={() => setReasons([...reasons, ''])}
              >
                + Aggiungi
              </Button>
              <Button
                onClick={() => setReasons(reasons.map((s: string) => (s || '').trim()).filter((s: string) => s))}
                title='Rimuove righe vuote e spazi'
              >
                Pulisci
              </Button>
              <Button
                onClick={() => setReasons(defaultConfig.rejectReasons)}
                title='Ripristina motivazioni di esempio'
              >
                Reset
              </Button>
            </div>
          </div>
        </RowBlock>

        <div style={{ marginTop: 10 }}>
          <ColorControl label='Zebra: sfondo righe pari' value={cfg.reasonsZebraEvenBg} onChange={(v) => setCfg('reasonsZebraEvenBg', v)} />
          <ColorControl label='Zebra: sfondo righe dispari' value={cfg.reasonsZebraOddBg} onChange={(v) => setCfg('reasonsZebraOddBg', v)} />
          <ColorControl label='Bordo righe: colore' value={cfg.reasonsRowBorderColor} onChange={(v) => setCfg('reasonsRowBorderColor', v)} />
          <NumberControl label='Bordo righe: spessore (px)' value={cfg.reasonsRowBorderWidth} min={0} max={6} step={1} onChange={(v) => setCfg('reasonsRowBorderWidth', v)} />
          <NumberControl label='Bordo righe: raggio (px)' value={cfg.reasonsRowRadius} min={0} max={20} step={1} onChange={(v) => setCfg('reasonsRowRadius', v)} />
        </div>
      </SettingSection>
    </div>
  )
}
