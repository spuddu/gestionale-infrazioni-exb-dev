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
          placeholder='#rrggbb oppure rgba(...)'
        />
        <input
          type='color'
          value={hex}
          onChange={(e) => props.onChange((e.target as HTMLInputElement).value)}
          title='Pick color'
          style={{ width: 44, height: 34, padding: 0, border: '1px solid rgba(0,0,0,0.2)', borderRadius: 8 }}
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
      {fields.map(f => (
        <option key={f.name} value={f.name}>
          {f.alias ? `${f.alias} (${f.name})` : f.name}
        </option>
      ))}
    </select>
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
    props.onSettingChange({ id: props.id, useDataSources })
  }

  // Legge i campi dal primo datasource selezionato (vale per tutti se hanno schema coerente)
  const useDsImm: any = props.useDataSources ?? Immutable([])
  const useDsJs: any[] = asJs(useDsImm) || []
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

  // --- Filter tabs labels (per dataSourceId)
  const getTabs = (): any[] => {
    const t = asJs(cfg.filterTabs) || []
    return Array.isArray(t) ? t : []
  }

  const setTabLabel = (dataSourceId: string, label: string) => {
    const tabs = getTabs()
    const idx = tabs.findIndex(x => String(x?.dataSourceId || '') === dataSourceId)
    const next = [...tabs]

    if (!label || !label.trim()) {
      if (idx >= 0) next.splice(idx, 1)
    } else {
      if (idx >= 0) next[idx] = { ...next[idx], dataSourceId, label }
      else next.push({ dataSourceId, label })
    }

    update('filterTabs', Immutable(next))
  }

  // helpers lettura con fallback
  const getNum = (key: string, fallback: number) => parseNum(cfg?.[key], fallback)
  const getStr = (key: string, fallback = '') => String(cfg?.[key] ?? fallback)

  const getCol = (k: string, fallback: number) => {
    const col = cfg?.colWidths?.[k]
    return parseNum(col, fallback)
  }

  return (
    <div style={{ padding: 12 }}>
      <SettingSection title='Fonte dati'>
        <SettingRow>
          <div style={{ width: '100%' }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Layer / View</div>
            <DataSourceSelector
              widgetId={props.id}
              useDataSources={props.useDataSources as any}
              types={dsTypes}
              isMultiple={true}
              mustUseDataSource={true}
              onChange={onDsChange}
            />
            <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
              Se selezioni più datasource, il widget mostra i “Filtri” come schede (tab).
            </div>
          </div>
        </SettingRow>

        {useDsJs.length > 1 && (
          <SettingSection title='Etichette Filtri (tab)'>
            {useDsJs.map((u, i) => {
              const dsId = String(u?.dataSourceId || '')
              const defaultLabel = `Filtro ${i + 1}`
              const tabs = getTabs()
              const custom = tabs.find(x => String(x?.dataSourceId || '') === dsId)?.label || ''
              return (
                <RowStack
                  key={dsId || i}
                  label={getStr('','') || `Filtro ${i + 1}`}
                  help={`Datasource: ${dsId}`}
                >
                  <input
                    style={inputStyle}
                    value={custom}
                    onChange={(e) => setTabLabel(dsId, (e.target as HTMLInputElement).value)}
                    placeholder={`Lascia vuoto per usare “${defaultLabel}”/label vista`}
                  />
                </RowStack>
              )
            })}
          </SettingSection>
        )}
      </SettingSection>

      <SettingSection title='Campi'>
        <RowStack label='Campo pratica'>
          <FieldSelect value={getStr('fieldPratica', '')} fields={fields} onChange={(v) => update('fieldPratica', v)} />
        </RowStack>

        <RowStack label='Campo data rilevazione'>
          <FieldSelect value={getStr('fieldDataRilevazione', '')} fields={fields} onChange={(v) => update('fieldDataRilevazione', v)} />
        </RowStack>

        <RowStack label='Campo ufficio'>
          <FieldSelect value={getStr('fieldUfficio', '')} fields={fields} onChange={(v) => update('fieldUfficio', v)} />
        </RowStack>

        <RowStack label='Campo stato presa in carico'>
          <FieldSelect value={getStr('fieldStatoPresa', '')} fields={fields} onChange={(v) => update('fieldStatoPresa', v)} />
        </RowStack>

        <RowStack label='Campo data presa in carico'>
          <FieldSelect value={getStr('fieldDataPresa', '')} fields={fields} onChange={(v) => update('fieldDataPresa', v)} />
        </RowStack>
      </SettingSection>

      <SettingSection title='Query / Ordinamento di default'>
        <RowStack label='Filtro (WHERE)'>
          <input
            style={inputStyle}
            value={getStr('whereClause', '1=1')}
            onChange={(e) => update('whereClause', (e.target as HTMLInputElement).value)}
          />
        </RowStack>

        <RowStack label='Page size'>
          <input
            style={inputStyle}
            type='number'
            value={String(getNum('pageSize', 200))}
            onChange={(e) => update('pageSize', parseNum((e.target as HTMLInputElement).value, 200))}
          />
        </RowStack>

        <RowStack label='Ordina per campo (default)'>
          <FieldSelect value={getStr('orderByField', '')} fields={fields} onChange={(v) => update('orderByField', v)} />
        </RowStack>

        <RowStack label='Direzione (default)'>
          <select
            style={inputStyle}
            value={getStr('orderByDir', 'ASC')}
            onChange={(e) => update('orderByDir', (e.target as HTMLSelectElement).value)}
          >
            <option value='ASC'>ASC</option>
            <option value='DESC'>DESC</option>
          </select>
        </RowStack>
      </SettingSection>

      <SettingSection title='Testi'>
        <RowStack label='Etichetta stato “Da prendere in carico”'>
          <input style={inputStyle} value={getStr('labelDaPrendere', 'Da prendere in carico')} onChange={(e) => update('labelDaPrendere', (e.target as HTMLInputElement).value)} />
        </RowStack>

        <RowStack label='Etichetta stato “Presa in carico”'>
          <input style={inputStyle} value={getStr('labelPresa', 'Presa in carico')} onChange={(e) => update('labelPresa', (e.target as HTMLInputElement).value)} />
        </RowStack>

        <RowStack label='Testo bottone (attivo)'>
          <input style={inputStyle} value={getStr('labelBtnTakeAttivo', 'Prendi in carico')} onChange={(e) => update('labelBtnTakeAttivo', (e.target as HTMLInputElement).value)} />
        </RowStack>

        <RowStack label='Testo bottone (disattivo)'>
          <input style={inputStyle} value={getStr('labelBtnTakeDisattivo', 'Già in carico')} onChange={(e) => update('labelBtnTakeDisattivo', (e.target as HTMLInputElement).value)} />
        </RowStack>

        <RowStack label='Messaggio conferma presa in carico'>
          <input style={inputStyle} value={getStr('confirmMessage', 'Vuoi prendere in carico questa pratica?')} onChange={(e) => update('confirmMessage', (e.target as HTMLInputElement).value)} />
        </RowStack>

        <RowStack label='Messaggio successo'>
          <input style={inputStyle} value={getStr('msgSuccess', 'Presa in carico salvata.')} onChange={(e) => update('msgSuccess', (e.target as HTMLInputElement).value)} />
        </RowStack>

        <RowStack label='Prefisso messaggio errore'>
          <input style={inputStyle} value={getStr('msgErrorPrefix', 'Errore salvataggio: ')} onChange={(e) => update('msgErrorPrefix', (e.target as HTMLInputElement).value)} />
        </RowStack>
      </SettingSection>

      <SettingSection title='Layout'>
        <SettingRow>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
            <input type='checkbox' checked={cfg.showHeader !== false} onChange={(e) => update('showHeader', (e.target as HTMLInputElement).checked)} />
            <span style={{ fontWeight: 700 }}>Mostra intestazioni</span>
          </label>
        </SettingRow>

        <RowStack label='Gap colonne (px)'>
          <input style={inputStyle} type='number' value={String(getNum('gap', 12))} onChange={(e) => update('gap', parseNum((e.target as HTMLInputElement).value, 12))} />
        </RowStack>

        <RowStack label='Padding sinistro prima colonna (px)'>
          <input style={inputStyle} type='number' value={String(getNum('paddingLeftFirstCol', 0))} onChange={(e) => update('paddingLeftFirstCol', parseNum((e.target as HTMLInputElement).value, 0))} />
        </RowStack>

        <RowStack label='Larghezza bottone (colonna Azioni)'>
          <input style={inputStyle} type='number' value={String(getNum('btnWidth', 160))} onChange={(e) => update('btnWidth', parseNum((e.target as HTMLInputElement).value, 160))} />
        </RowStack>

        <SettingSection title='Larghezze colonne (px)'>
          <RowStack label='N. pratica'>
            <input style={inputStyle} type='number' value={String(getCol('pratica', 140))} onChange={(e) => updateIn(['colWidths', 'pratica'], parseNum((e.target as HTMLInputElement).value, 140))} />
          </RowStack>
          <RowStack label='Data'>
            <input style={inputStyle} type='number' value={String(getCol('data', 140))} onChange={(e) => updateIn(['colWidths', 'data'], parseNum((e.target as HTMLInputElement).value, 140))} />
          </RowStack>
          <RowStack label='Ufficio'>
            <input style={inputStyle} type='number' value={String(getCol('ufficio', 180))} onChange={(e) => updateIn(['colWidths', 'ufficio'], parseNum((e.target as HTMLInputElement).value, 180))} />
          </RowStack>
          <RowStack label='Stato'>
            <input style={inputStyle} type='number' value={String(getCol('stato', 220))} onChange={(e) => updateIn(['colWidths', 'stato'], parseNum((e.target as HTMLInputElement).value, 220))} />
          </RowStack>
          <RowStack label='Dt. presa'>
            <input style={inputStyle} type='number' value={String(getCol('dt_presa', 180))} onChange={(e) => updateIn(['colWidths', 'dt_presa'], parseNum((e.target as HTMLInputElement).value, 180))} />
          </RowStack>
        </SettingSection>
      </SettingSection>

      <SettingSection title='Stile righe (lista)'>
        <RowStack label='Spazio tra record (px)'>
          <input style={inputStyle} type='number' value={String(getNum('rowGap', 8))} onChange={(e) => update('rowGap', parseNum((e.target as HTMLInputElement).value, 8))} />
        </RowStack>

        <RowStack label='Padding orizzontale riga (px)'>
          <input style={inputStyle} type='number' value={String(getNum('rowPaddingX', 12))} onChange={(e) => update('rowPaddingX', parseNum((e.target as HTMLInputElement).value, 12))} />
        </RowStack>

        <RowStack label='Padding verticale riga (px)'>
          <input style={inputStyle} type='number' value={String(getNum('rowPaddingY', 10))} onChange={(e) => update('rowPaddingY', parseNum((e.target as HTMLInputElement).value, 10))} />
        </RowStack>

        <RowStack label='Altezza minima riga (px)'>
          <input style={inputStyle} type='number' value={String(getNum('rowMinHeight', 44))} onChange={(e) => update('rowMinHeight', parseNum((e.target as HTMLInputElement).value, 44))} />
        </RowStack>

        <RowStack label='Radius riga (px)'>
          <input style={inputStyle} type='number' value={String(getNum('rowRadius', 12))} onChange={(e) => update('rowRadius', parseNum((e.target as HTMLInputElement).value, 12))} />
        </RowStack>

        <RowStack label='Border width riga (px)'>
          <input style={inputStyle} type='number' value={String(getNum('rowBorderWidth', 1))} onChange={(e) => update('rowBorderWidth', parseNum((e.target as HTMLInputElement).value, 1))} />
        </RowStack>

        <RowStack label='Border color riga (es. rgba o hex)'>
          <input style={inputStyle} value={getStr('rowBorderColor', 'rgba(0,0,0,0.08)')} onChange={(e) => update('rowBorderColor', (e.target as HTMLInputElement).value)} />
        </RowStack>

        <ColorControl label='Zebra even background' value={getStr('zebraEvenBg', '#ffffff')} onChange={(v) => update('zebraEvenBg', v)} />
        <ColorControl label='Zebra odd background' value={getStr('zebraOddBg', '#fbfbfb')} onChange={(v) => update('zebraOddBg', v)} />
        <ColorControl label='Hover background' value={getStr('hoverBg', '#f2f6ff')} onChange={(v) => update('hoverBg', v)} />
        <ColorControl label='Selected background' value={getStr('selectedBg', '#eaf2ff')} onChange={(v) => update('selectedBg', v)} />
        <ColorControl label='Selected border color' value={getStr('selectedBorderColor', '#2f6fed')} onChange={(v) => update('selectedBorderColor', v)} />
        <RowStack label='Selected border width (px)'>
          <input style={inputStyle} type='number' value={String(getNum('selectedBorderWidth', 2))} onChange={(e) => update('selectedBorderWidth', parseNum((e.target as HTMLInputElement).value, 2))} />
        </RowStack>
      </SettingSection>

      <SettingSection title='Chip “Stato pratica” — stile testo e box'>
        <RowStack label='Font size (px)'>
          <input style={inputStyle} type='number' value={String(getNum('statoChipFontSize', 12))} onChange={(e) => update('statoChipFontSize', parseNum((e.target as HTMLInputElement).value, 12))} />
        </RowStack>

        <RowStack label='Font weight'>
          <select style={inputStyle} value={String(getNum('statoChipFontWeight', 600))} onChange={(e) => update('statoChipFontWeight', parseNum((e.target as HTMLSelectElement).value, 600))}>
            <option value='300'>300</option>
            <option value='400'>400</option>
            <option value='500'>500</option>
            <option value='600'>600</option>
            <option value='700'>700</option>
            <option value='800'>800</option>
          </select>
        </RowStack>

        <RowStack label='Font style'>
          <select style={inputStyle} value={getStr('statoChipFontStyle', 'normal')} onChange={(e) => update('statoChipFontStyle', (e.target as HTMLSelectElement).value)}>
            <option value='normal'>normal</option>
            <option value='italic'>italic</option>
          </select>
        </RowStack>

        <RowStack label='Text transform'>
          <select style={inputStyle} value={getStr('statoChipTextTransform', 'none')} onChange={(e) => update('statoChipTextTransform', (e.target as HTMLSelectElement).value)}>
            <option value='none'>none</option>
            <option value='uppercase'>uppercase</option>
            <option value='lowercase'>lowercase</option>
            <option value='capitalize'>capitalize</option>
          </select>
        </RowStack>

        <RowStack label='Letter spacing (px)'>
          <input style={inputStyle} type='number' value={String(getNum('statoChipLetterSpacing', 0))} onChange={(e) => update('statoChipLetterSpacing', parseNum((e.target as HTMLInputElement).value, 0))} />
        </RowStack>

        <RowStack label='Radius (px)'>
          <input style={inputStyle} type='number' value={String(getNum('statoChipRadius', 999))} onChange={(e) => update('statoChipRadius', parseNum((e.target as HTMLInputElement).value, 999))} />
        </RowStack>

        <RowStack label='Padding X (px)'>
          <input style={inputStyle} type='number' value={String(getNum('statoChipPadX', 10))} onChange={(e) => update('statoChipPadX', parseNum((e.target as HTMLInputElement).value, 10))} />
        </RowStack>

        <RowStack label='Padding Y (px)'>
          <input style={inputStyle} type='number' value={String(getNum('statoChipPadY', 4))} onChange={(e) => update('statoChipPadY', parseNum((e.target as HTMLInputElement).value, 4))} />
        </RowStack>

        <RowStack label='Border width (px)'>
          <input style={inputStyle} type='number' value={String(getNum('statoChipBorderW', 1))} onChange={(e) => update('statoChipBorderW', parseNum((e.target as HTMLInputElement).value, 1))} />
        </RowStack>
      </SettingSection>

      <SettingSection title='Chip “Stato pratica” — colori'>
        <SettingRow>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Da prendere in carico</div>
        </SettingRow>
        <ColorControl label='Background' value={getStr('statoBgDaPrendere', '#fff7e6')} onChange={(v) => update('statoBgDaPrendere', v)} />
        <ColorControl label='Text' value={getStr('statoTextDaPrendere', '#7a4b00')} onChange={(v) => update('statoTextDaPrendere', v)} />
        <ColorControl label='Border' value={getStr('statoBorderDaPrendere', '#ffd18a')} onChange={(v) => update('statoBorderDaPrendere', v)} />

        <SettingRow>
          <div style={{ fontWeight: 800, marginTop: 10, marginBottom: 6 }}>Presa in carico</div>
        </SettingRow>
        <ColorControl label='Background' value={getStr('statoBgPresa', '#eaf7ef')} onChange={(v) => update('statoBgPresa', v)} />
        <ColorControl label='Text' value={getStr('statoTextPresa', '#1f6b3a')} onChange={(v) => update('statoTextPresa', v)} />
        <ColorControl label='Border' value={getStr('statoBorderPresa', '#9ad2ae')} onChange={(v) => update('statoBorderPresa', v)} />

        <SettingRow>
          <div style={{ fontWeight: 800, marginTop: 10, marginBottom: 6 }}>Altro</div>
        </SettingRow>
        <ColorControl label='Background' value={getStr('statoBgAltro', '#f2f2f2')} onChange={(v) => update('statoBgAltro', v)} />
        <ColorControl label='Text' value={getStr('statoTextAltro', '#333333')} onChange={(v) => update('statoTextAltro', v)} />
        <ColorControl label='Border' value={getStr('statoBorderAltro', '#d0d0d0')} onChange={(v) => update('statoBorderAltro', v)} />
      </SettingSection>
    </div>
  )
}
