/** @jsx jsx */
import { React, jsx, Immutable, DataSourceTypes, DataSourceManager } from 'jimu-core'
import type { AllWidgetSettingProps } from 'jimu-for-builder'
import { DataSourceSelector } from 'jimu-ui/advanced/data-source-selector'
import { SettingSection, SettingRow } from 'jimu-ui/advanced/setting-components'
import { IMConfig, defaultConfig } from '../config'

type Props = AllWidgetSettingProps<IMConfig>

type FieldOpt = { name: string; alias: string; type?: string }

const PRESET_COLORS = [
  '#000000', '#ffffff', '#2f6fed', '#1f6b3a', '#e75a05', '#7a4b00',
  '#f2f2f2', '#d0d0d0', '#ffd18a', '#9ad2ae', '#eaf2ff', '#fbfbfb',
  '#f1f6ff', '#fff7e6', '#eaf7ef'
]

const isHexColor = (s: string) => /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test((s || '').trim())

const RowStack = (props: { label: string, children: React.ReactNode, help?: string }) => {
  return (
    <SettingRow>
      <div style={{ width: '100%' }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>{props.label}</div>
        {props.help && <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>{props.help}</div>}
        {props.children}
      </div>
    </SettingRow>
  )
}

const inputStyle: React.CSSProperties = { width: '100%', padding: '6px 8px' }

const parseNum = (v: any, fallback: number): number => {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function asJs<T = any> (v: any): T {
  return v?.asMutable ? v.asMutable({ deep: true }) : v
}

function ColorControl (props: { label: string, value: string, onChange: (v: string) => void }) {
  const v = props.value || ''
  const hex = isHexColor(v) ? v : '#000000'

  return (
    <RowStack label={props.label}>
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
          title='Selettore colore'
          style={{ width: 44, height: 34, padding: 0, border: 'none', background: 'transparent' }}
        />
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            type='button'
            onClick={() => props.onChange(c)}
            title={c}
            style={{
              width: 18,
              height: 18,
              borderRadius: 6,
              border: '1px solid rgba(0,0,0,0.25)',
              background: c,
              cursor: 'pointer'
            }}
          />
        ))}
      </div>
    </RowStack>
  )
}

function FieldSelect (props: { value: string, fields: FieldOpt[], onChange: (v: string) => void, placeholder?: string }) {
  const { fields, value } = props
  const has = Array.isArray(fields) && fields.length > 0

  if (!has) {
    return (
      <input
        style={inputStyle}
        value={value || ''}
        onChange={(e) => props.onChange((e.target as HTMLInputElement).value)}
        placeholder={props.placeholder || 'Nome campo (testo libero)'}
      />
    )
  }

  const norm = (value || '').trim()

  return (
    <select
      style={inputStyle}
      value={norm}
      onChange={(e) => props.onChange((e.target as HTMLSelectElement).value)}
    >
      <option value=''>— seleziona —</option>
      {fields.map((f) => (
        <option key={f.name} value={f.name}>
          {f.alias} ({f.name})
        </option>
      ))}
    </select>
  )
}

function NumInput (props: { value: any, onChange: (n: number) => void, step?: number, min?: number, max?: number }) {
  const v = parseNum(props.value, 0)
  return (
    <input
      type='number'
      style={inputStyle}
      value={String(v)}
      step={props.step ?? 1}
      min={props.min}
      max={props.max}
      onChange={(e) => props.onChange(parseNum((e.target as HTMLInputElement).value, 0))}
    />
  )
}

export default function Setting (props: Props) {
  const cfg: any = (props.config ?? defaultConfig) as any

  const update = (key: string, value: any) => {
    props.onSettingChange({
      id: props.id,
      config: cfg.set ? cfg.set(key, value) : Immutable(cfg).set(key, value)
    })
  }

  const updateIn = (path: any[], value: any) => {
    const c = cfg.setIn ? cfg : Immutable(cfg)
    props.onSettingChange({
      id: props.id,
      config: c.setIn(path, value)
    })
  }

  // Datasource selector
  const dsTypes = Immutable([DataSourceTypes.FeatureLayer]) as any

  const onDsChange = (useDataSources: any) => {
    // PATCH ATOMICA: un solo onSettingChange.
    const udsJs: any[] = asJs(useDataSources ?? Immutable([]))
    const prevTabs: any[] = asJs(cfg.filterTabs ?? Immutable([]))
    const dsm = DataSourceManager.getInstance()

    const nextTabs = udsJs.map((u) => {
      const dsId = String(u?.dataSourceId || '')
      const prev = prevTabs.find(t => String(t?.dataSourceId || '') === dsId)
      if (prev) return prev

      // label default: ds label o fallback
      let label = ''
      try {
        const ds: any = dsm.getDataSource(dsId)
        label = String(ds?.getLabel?.() || '')
      } catch {}
      label = label && label.trim() ? label.trim() : 'Filtro'
      return { dataSourceId: dsId, label }
    })

    const c = cfg.set ? cfg : Immutable(cfg)
    props.onSettingChange({
      id: props.id,
      useDataSources,
      config: c.set('filterTabs', nextTabs)
    })
  }

  // Legge i campi dal primo datasource selezionato (vale per tutti se hanno schema coerente)
  const useDsImm: any = props.useDataSources ?? Immutable([])
  const useDsJs: any[] = asJs(useDsImm)
  const primaryDsId = String(useDsJs?.[0]?.dataSourceId || '')

  const [fields, setFields] = React.useState<FieldOpt[]>([])

  React.useEffect(() => {
    let cancelled = false

    const load = async () => {
      if (!primaryDsId) {
        if (!cancelled) setFields([])
        return
      }

      try {
        const dsm = DataSourceManager.getInstance()
        const ds: any = dsm.getDataSource(primaryDsId)
        const schema = ds?.getSchema?.()
        const fobj = schema?.fields || {}
        const opts: FieldOpt[] = Object.keys(fobj).map((name) => {
          const f = fobj[name] || {}
          return {
            name,
            alias: String(f.alias || name),
            type: String(f.type || '')
          }
        }).sort((a, b) => (a.alias || a.name).localeCompare((b.alias || b.name), 'it', { sensitivity: 'base' }))

        if (!cancelled) setFields(opts)
      } catch {
        if (!cancelled) setFields([])
      }
    }

    load()
    return () => { cancelled = true }
  }, [primaryDsId])

  return (
    <div style={{ width: '100%' }}>
      <SettingSection title='Fonte dati'>
        <SettingRow flow='wrap'>
          <div style={{ width: '100%' }}>
            <DataSourceSelector
              widgetId={props.id}
              useDataSources={props.useDataSources as any}
              types={dsTypes}
              isMultiple={true}
              mustUseDataSource={true}
              onChange={onDsChange}
            />
            <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
              Se selezioni più datasource, il widget mostra i filtri come schede (tab).
            </div>
          </div>
        </SettingRow>
      </SettingSection>

      {useDsJs.length > 1 && (
        <SettingSection title='Etichette filtri (tab)'>
          {useDsJs.map((u, i) => {
            const dsId = String(u?.dataSourceId || '')
            const tab = (asJs(cfg.filterTabs ?? Immutable([])) as any[]).find(t => String(t?.dataSourceId || '') === dsId) || { dataSourceId: dsId, label: '' }
            return (
              <RowStack
                key={dsId || i}
                label={`Filtro ${i + 1}`}
                help={`Datasource: ${dsId}`}
              >
                <input
                  style={inputStyle}
                  value={String(tab.label || '')}
                  onChange={(e) => {
                    const v = (e.target as HTMLInputElement).value
                    const tabs = (asJs(cfg.filterTabs ?? Immutable([])) as any[]).map(t => ({ ...t }))
                    const idx = tabs.findIndex(t => String(t?.dataSourceId || '') === dsId)
                    if (idx >= 0) tabs[idx].label = v
                    else tabs.push({ dataSourceId: dsId, label: v })
                    update('filterTabs', tabs)
                  }}
                  placeholder='Etichetta tab'
                />
              </RowStack>
            )
          })}
        </SettingSection>
      )}

      <SettingSection title='Campi (mapping layer)'>
        <RowStack label='N. pratica'>
          <FieldSelect value={cfg.fieldPratica} fields={fields} onChange={(v) => update('fieldPratica', v)} />
        </RowStack>

        <RowStack label='Data rilevazione'>
          <FieldSelect value={cfg.fieldDataRilevazione} fields={fields} onChange={(v) => update('fieldDataRilevazione', v)} />
        </RowStack>

        <RowStack label='Ufficio'>
          <FieldSelect value={cfg.fieldUfficio} fields={fields} onChange={(v) => update('fieldUfficio', v)} />
        </RowStack>

        <SettingRow>
          <div style={{ width: '100%', fontWeight: 800, marginTop: 8 }}>DT (Direttore Tecnico/Agrario)</div>
        </SettingRow>

        <RowStack label='presa_in_carico_DT'>
          <FieldSelect value={cfg.fieldPresaDT} fields={fields} onChange={(v) => update('fieldPresaDT', v)} />
        </RowStack>
        <RowStack label='dt_presa_in_carico_DT'>
          <FieldSelect value={cfg.fieldDtPresaDT} fields={fields} onChange={(v) => update('fieldDtPresaDT', v)} />
        </RowStack>
        <RowStack label='stato_DT'>
          <FieldSelect value={cfg.fieldStatoDT} fields={fields} onChange={(v) => update('fieldStatoDT', v)} />
        </RowStack>
        <RowStack label='dt_stato_DT'>
          <FieldSelect value={cfg.fieldDtStatoDT} fields={fields} onChange={(v) => update('fieldDtStatoDT', v)} />
        </RowStack>
        <RowStack label='esito_DT'>
          <FieldSelect value={cfg.fieldEsitoDT} fields={fields} onChange={(v) => update('fieldEsitoDT', v)} />
        </RowStack>
        <RowStack label='dt_esito_DT'>
          <FieldSelect value={cfg.fieldDtEsitoDT} fields={fields} onChange={(v) => update('fieldDtEsitoDT', v)} />
        </RowStack>

        <SettingRow>
          <div style={{ width: '100%', fontWeight: 800, marginTop: 8 }}>DA (Direttore Area Amministrativa)</div>
        </SettingRow>

        <RowStack label='presa_in_carico_DA'>
          <FieldSelect value={cfg.fieldPresaDA} fields={fields} onChange={(v) => update('fieldPresaDA', v)} />
        </RowStack>
        <RowStack label='dt_presa_in_carico_DA'>
          <FieldSelect value={cfg.fieldDtPresaDA} fields={fields} onChange={(v) => update('fieldDtPresaDA', v)} />
        </RowStack>
        <RowStack label='stato_DA'>
          <FieldSelect value={cfg.fieldStatoDA} fields={fields} onChange={(v) => update('fieldStatoDA', v)} />
        </RowStack>
        <RowStack label='dt_stato_DA'>
          <FieldSelect value={cfg.fieldDtStatoDA} fields={fields} onChange={(v) => update('fieldDtStatoDA', v)} />
        </RowStack>
        <RowStack label='esito_DA'>
          <FieldSelect value={cfg.fieldEsitoDA} fields={fields} onChange={(v) => update('fieldEsitoDA', v)} />
        </RowStack>
        <RowStack label='dt_esito_DA'>
          <FieldSelect value={cfg.fieldDtEsitoDA} fields={fields} onChange={(v) => update('fieldDtEsitoDA', v)} />
        </RowStack>
      </SettingSection>

      <SettingSection title='Domini e label'>
        <RowStack label='presa_in_carico: valore "Da prendere in carico"'>
          <NumInput value={cfg.presaDaPrendereVal} onChange={(n) => update('presaDaPrendereVal', n)} />
        </RowStack>
        <RowStack label='presa_in_carico: valore "Presa in carico"'>
          <NumInput value={cfg.presaPresaVal} onChange={(n) => update('presaPresaVal', n)} />
        </RowStack>
        <RowStack label='Label "Da prendere in carico"'>
          <input style={inputStyle} value={String(cfg.labelPresaDaPrendere || '')} onChange={(e) => update('labelPresaDaPrendere', (e.target as HTMLInputElement).value)} />
        </RowStack>
        <RowStack label='Label "Presa in carico"'>
          <input style={inputStyle} value={String(cfg.labelPresaPresa || '')} onChange={(e) => update('labelPresaPresa', (e.target as HTMLInputElement).value)} />
        </RowStack>

        <SettingRow>
          <div style={{ width: '100%', fontWeight: 800, marginTop: 8 }}>Stato (1..5)</div>
        </SettingRow>

        <RowStack label='Valore stato: Da prendere (1)'>
          <NumInput value={cfg.statoDaPrendereVal} onChange={(n) => update('statoDaPrendereVal', n)} />
        </RowStack>
        <RowStack label='Valore stato: Presa in carico (2)'>
          <NumInput value={cfg.statoPresaVal} onChange={(n) => update('statoPresaVal', n)} />
        </RowStack>
        <RowStack label='Valore stato: Integrazione richiesta (3)'>
          <NumInput value={cfg.statoIntegrazioneVal} onChange={(n) => update('statoIntegrazioneVal', n)} />
        </RowStack>
        <RowStack label='Valore stato: Approvata (4)'>
          <NumInput value={cfg.statoApprovataVal} onChange={(n) => update('statoApprovataVal', n)} />
        </RowStack>
        <RowStack label='Valore stato: Respinta (5)'>
          <NumInput value={cfg.statoRespintaVal} onChange={(n) => update('statoRespintaVal', n)} />
        </RowStack>

        <RowStack label='Label stato: Da prendere'>
          <input style={inputStyle} value={String(cfg.labelStatoDaPrendere || '')} onChange={(e) => update('labelStatoDaPrendere', (e.target as HTMLInputElement).value)} />
        </RowStack>
        <RowStack label='Label stato: Presa in carico'>
          <input style={inputStyle} value={String(cfg.labelStatoPresa || '')} onChange={(e) => update('labelStatoPresa', (e.target as HTMLInputElement).value)} />
        </RowStack>
        <RowStack label='Label stato: Integrazione richiesta'>
          <input style={inputStyle} value={String(cfg.labelStatoIntegrazione || '')} onChange={(e) => update('labelStatoIntegrazione', (e.target as HTMLInputElement).value)} />
        </RowStack>
        <RowStack label='Label stato: Approvata'>
          <input style={inputStyle} value={String(cfg.labelStatoApprovata || '')} onChange={(e) => update('labelStatoApprovata', (e.target as HTMLInputElement).value)} />
        </RowStack>
        <RowStack label='Label stato: Respinta'>
          <input style={inputStyle} value={String(cfg.labelStatoRespinta || '')} onChange={(e) => update('labelStatoRespinta', (e.target as HTMLInputElement).value)} />
        </RowStack>

        <SettingRow>
          <div style={{ width: '100%', fontWeight: 800, marginTop: 8 }}>Esito (1..3)</div>
        </SettingRow>

        <RowStack label='Valore esito: Integrazione richiesta (1)'>
          <NumInput value={cfg.esitoIntegrazioneVal} onChange={(n) => update('esitoIntegrazioneVal', n)} />
        </RowStack>
        <RowStack label='Valore esito: Approvata (2)'>
          <NumInput value={cfg.esitoApprovataVal} onChange={(n) => update('esitoApprovataVal', n)} />
        </RowStack>
        <RowStack label='Valore esito: Respinta (3)'>
          <NumInput value={cfg.esitoRespintaVal} onChange={(n) => update('esitoRespintaVal', n)} />
        </RowStack>

        <RowStack label='Label esito: Integrazione richiesta'>
          <input style={inputStyle} value={String(cfg.labelEsitoIntegrazione || '')} onChange={(e) => update('labelEsitoIntegrazione', (e.target as HTMLInputElement).value)} />
        </RowStack>
        <RowStack label='Label esito: Approvata'>
          <input style={inputStyle} value={String(cfg.labelEsitoApprovata || '')} onChange={(e) => update('labelEsitoApprovata', (e.target as HTMLInputElement).value)} />
        </RowStack>
        <RowStack label='Label esito: Respinta'>
          <input style={inputStyle} value={String(cfg.labelEsitoRespinta || '')} onChange={(e) => update('labelEsitoRespinta', (e.target as HTMLInputElement).value)} />
        </RowStack>
      </SettingSection>

      <SettingSection title='Contenuti e intestazioni'>
        <RowStack label='Where clause'>
          <input
            style={inputStyle}
            value={String(cfg.whereClause || '')}
            onChange={(e) => update('whereClause', (e.target as HTMLInputElement).value)}
            placeholder='1=1'
          />
        </RowStack>

        <RowStack label='Page size'>
          <NumInput value={cfg.pageSize} onChange={(n) => update('pageSize', n)} min={1} step={1} />
        </RowStack>

        <RowStack label='Ordina di default per campo'>
          <FieldSelect value={cfg.orderByField} fields={fields} onChange={(v) => update('orderByField', v)} placeholder='objectid' />
        </RowStack>

        <RowStack label='Direzione ordinamento default'>
          <select style={inputStyle} value={String(cfg.orderByDir || 'DESC')} onChange={(e) => update('orderByDir', (e.target as HTMLSelectElement).value)}>
            <option value='DESC'>DESC</option>
            <option value='ASC'>ASC</option>
          </select>
        </RowStack>

        <RowStack label='Mostra header colonne'>
          <select style={inputStyle} value={String(cfg.showHeader !== false)} onChange={(e) => update('showHeader', (e.target as HTMLSelectElement).value === 'true')}>
            <option value='true'>Sì</option>
            <option value='false'>No</option>
          </select>
        </RowStack>

        <RowStack label='Header: N. pratica'>
          <input style={inputStyle} value={String(cfg.headerPratica || '')} onChange={(e) => update('headerPratica', (e.target as HTMLInputElement).value)} />
        </RowStack>
        <RowStack label='Header: Data rilev.'>
          <input style={inputStyle} value={String(cfg.headerData || '')} onChange={(e) => update('headerData', (e.target as HTMLInputElement).value)} />
        </RowStack>
        <RowStack label='Header: Stato sintetico'>
          <input style={inputStyle} value={String(cfg.headerStato || '')} onChange={(e) => update('headerStato', (e.target as HTMLInputElement).value)} />
        </RowStack>
        <RowStack label='Header: Ufficio'>
          <input style={inputStyle} value={String(cfg.headerUfficio || '')} onChange={(e) => update('headerUfficio', (e.target as HTMLInputElement).value)} />
        </RowStack>
        <RowStack label='Header: Ultimo agg.'>
          <input style={inputStyle} value={String(cfg.headerUltimoAgg || '')} onChange={(e) => update('headerUltimoAgg', (e.target as HTMLInputElement).value)} />
        </RowStack>
        <RowStack label='Header: Prossima azione'>
          <input style={inputStyle} value={String(cfg.headerProssima || '')} onChange={(e) => update('headerProssima', (e.target as HTMLInputElement).value)} />
        </RowStack>
      </SettingSection>

      <SettingSection title='Layout colonne'>
        <RowStack label='Gap colonne (px)'>
          <NumInput value={cfg.gap} onChange={(n) => update('gap', n)} min={0} step={1} />
        </RowStack>
        <RowStack label='Padding sinistra prima colonna (px)'>
          <NumInput value={cfg.paddingLeftFirstCol} onChange={(n) => update('paddingLeftFirstCol', n)} min={0} step={1} />
        </RowStack>

        <SettingRow>
          <div style={{ width: '100%', fontWeight: 800, marginTop: 8 }}>Larghezze colonne (px)</div>
        </SettingRow>

        <RowStack label='Pratica'>
          <NumInput value={cfg.colWidths?.pratica} onChange={(n) => updateIn(['colWidths', 'pratica'], n)} min={40} step={1} />
        </RowStack>
        <RowStack label='Data'>
          <NumInput value={cfg.colWidths?.data} onChange={(n) => updateIn(['colWidths', 'data'], n)} min={40} step={1} />
        </RowStack>
        <RowStack label='Stato sintetico'>
          <NumInput value={cfg.colWidths?.stato} onChange={(n) => updateIn(['colWidths', 'stato'], n)} min={60} step={1} />
        </RowStack>
        <RowStack label='Ufficio'>
          <NumInput value={cfg.colWidths?.ufficio} onChange={(n) => updateIn(['colWidths', 'ufficio'], n)} min={60} step={1} />
        </RowStack>
        <RowStack label='Ultimo agg.'>
          <NumInput value={cfg.colWidths?.ultimo} onChange={(n) => updateIn(['colWidths', 'ultimo'], n)} min={60} step={1} />
        </RowStack>
        <RowStack label='Prossima azione'>
          <NumInput value={cfg.colWidths?.prossima} onChange={(n) => updateIn(['colWidths', 'prossima'], n)} min={80} step={1} />
        </RowStack>
      </SettingSection>

      <SettingSection title='Stile righe'>
        <RowStack label='Row gap (px)'>
          <NumInput value={cfg.rowGap} onChange={(n) => update('rowGap', n)} min={0} step={1} />
        </RowStack>
        <RowStack label='Padding X (px)'>
          <NumInput value={cfg.rowPaddingX} onChange={(n) => update('rowPaddingX', n)} min={0} step={1} />
        </RowStack>
        <RowStack label='Padding Y (px)'>
          <NumInput value={cfg.rowPaddingY} onChange={(n) => update('rowPaddingY', n)} min={0} step={1} />
        </RowStack>
        <RowStack label='Row min height (px)'>
          <NumInput value={cfg.rowMinHeight} onChange={(n) => update('rowMinHeight', n)} min={24} step={1} />
        </RowStack>
        <RowStack label='Row radius (px)'>
          <NumInput value={cfg.rowRadius} onChange={(n) => update('rowRadius', n)} min={0} step={1} />
        </RowStack>
        <RowStack label='Row border width (px)'>
          <NumInput value={cfg.rowBorderWidth} onChange={(n) => update('rowBorderWidth', n)} min={0} step={1} />
        </RowStack>
        <RowStack label='Row border color'>
          <input style={inputStyle} value={String(cfg.rowBorderColor || '')} onChange={(e) => update('rowBorderColor', (e.target as HTMLInputElement).value)} placeholder='rgba(...) o #rrggbb' />
        </RowStack>

        <ColorControl label='Zebra: pari (bg)' value={String(cfg.zebraEvenBg || '')} onChange={(v) => update('zebraEvenBg', v)} />
        <ColorControl label='Zebra: dispari (bg)' value={String(cfg.zebraOddBg || '')} onChange={(v) => update('zebraOddBg', v)} />
        <ColorControl label='Hover (bg)' value={String(cfg.hoverBg || '')} onChange={(v) => update('hoverBg', v)} />
        <ColorControl label='Selected (bg)' value={String(cfg.selectedBg || '')} onChange={(v) => update('selectedBg', v)} />
        <ColorControl label='Selected border color' value={String(cfg.selectedBorderColor || '')} onChange={(v) => update('selectedBorderColor', v)} />

        <RowStack label='Selected border width (px)'>
          <NumInput value={cfg.selectedBorderWidth} onChange={(n) => update('selectedBorderWidth', n)} min={0} step={1} />
        </RowStack>
      </SettingSection>

      <SettingSection title='Chip stato sintetico'>
        <RowStack label='Radius'>
          <NumInput value={cfg.statoChipRadius} onChange={(n) => update('statoChipRadius', n)} min={0} step={1} />
        </RowStack>
        <RowStack label='Padding X'>
          <NumInput value={cfg.statoChipPadX} onChange={(n) => update('statoChipPadX', n)} min={0} step={1} />
        </RowStack>
        <RowStack label='Padding Y'>
          <NumInput value={cfg.statoChipPadY} onChange={(n) => update('statoChipPadY', n)} min={0} step={1} />
        </RowStack>
        <RowStack label='Border width'>
          <NumInput value={cfg.statoChipBorderW} onChange={(n) => update('statoChipBorderW', n)} min={0} step={1} />
        </RowStack>
        <RowStack label='Font size'>
          <NumInput value={cfg.statoChipFontSize} onChange={(n) => update('statoChipFontSize', n)} min={8} step={1} />
        </RowStack>
        <RowStack label='Font weight'>
          <NumInput value={cfg.statoChipFontWeight} onChange={(n) => update('statoChipFontWeight', n)} min={100} step={50} />
        </RowStack>
        <RowStack label='Text transform'>
          <select style={inputStyle} value={String(cfg.statoChipTextTransform || 'none')} onChange={(e) => update('statoChipTextTransform', (e.target as HTMLSelectElement).value)}>
            <option value='none'>none</option>
            <option value='uppercase'>uppercase</option>
            <option value='lowercase'>lowercase</option>
            <option value='capitalize'>capitalize</option>
          </select>
        </RowStack>
        <RowStack label='Letter spacing (px)'>
          <NumInput value={cfg.statoChipLetterSpacing} onChange={(n) => update('statoChipLetterSpacing', n)} step={0.1} />
        </RowStack>

        <SettingRow>
          <div style={{ width: '100%', fontWeight: 800, marginTop: 8 }}>Colori</div>
        </SettingRow>

        <ColorControl label='Da prendere: bg' value={String(cfg.statoBgDaPrendere || '')} onChange={(v) => update('statoBgDaPrendere', v)} />
        <ColorControl label='Da prendere: text' value={String(cfg.statoTextDaPrendere || '')} onChange={(v) => update('statoTextDaPrendere', v)} />
        <ColorControl label='Da prendere: border' value={String(cfg.statoBorderDaPrendere || '')} onChange={(v) => update('statoBorderDaPrendere', v)} />

        <ColorControl label='Presa in carico: bg' value={String(cfg.statoBgPresa || '')} onChange={(v) => update('statoBgPresa', v)} />
        <ColorControl label='Presa in carico: text' value={String(cfg.statoTextPresa || '')} onChange={(v) => update('statoTextPresa', v)} />
        <ColorControl label='Presa in carico: border' value={String(cfg.statoBorderPresa || '')} onChange={(v) => update('statoBorderPresa', v)} />

        <ColorControl label='Altro: bg' value={String(cfg.statoBgAltro || '')} onChange={(v) => update('statoBgAltro', v)} />
        <ColorControl label='Altro: text' value={String(cfg.statoTextAltro || '')} onChange={(v) => update('statoTextAltro', v)} />
        <ColorControl label='Altro: border' value={String(cfg.statoBorderAltro || '')} onChange={(v) => update('statoBorderAltro', v)} />
      </SettingSection>

      <SettingSection title='Maschera (bordo pannello)'>
        <RowStack label='Outer offset (px)'>
          <NumInput value={cfg.maskOuterOffset} onChange={(n) => update('maskOuterOffset', n)} min={0} step={1} />
        </RowStack>
        <RowStack label='Inner padding (px)'>
          <NumInput value={cfg.maskInnerPadding} onChange={(n) => update('maskInnerPadding', n)} min={0} step={1} />
        </RowStack>
        <RowStack label='Border width (px)'>
          <NumInput value={cfg.maskBorderWidth} onChange={(n) => update('maskBorderWidth', n)} min={0} step={1} />
        </RowStack>
        <RowStack label='Border radius (px)'>
          <NumInput value={cfg.maskRadius} onChange={(n) => update('maskRadius', n)} min={0} step={1} />
        </RowStack>
        <RowStack label='Background'>
          <input style={inputStyle} value={String(cfg.maskBg || '')} onChange={(e) => update('maskBg', (e.target as HTMLInputElement).value)} placeholder='#rrggbb o rgba(...)' />
        </RowStack>
        <RowStack label='Border color'>
          <input style={inputStyle} value={String(cfg.maskBorderColor || '')} onChange={(e) => update('maskBorderColor', (e.target as HTMLInputElement).value)} placeholder='#rrggbb o rgba(...)' />
        </RowStack>
      </SettingSection>

      <SettingSection title='Messaggi'>
        <RowStack label='Empty message'>
          <input style={inputStyle} value={String(cfg.emptyMessage || '')} onChange={(e) => update('emptyMessage', (e.target as HTMLInputElement).value)} />
        </RowStack>
        <RowStack label='Errore: no datasource'>
          <input style={inputStyle} value={String(cfg.errorNoDs || '')} onChange={(e) => update('errorNoDs', (e.target as HTMLInputElement).value)} />
        </RowStack>
      </SettingSection>
    </div>
  )
}
