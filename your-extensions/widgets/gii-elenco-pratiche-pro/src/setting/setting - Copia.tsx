/** @jsx jsx */
import { React, jsx, Immutable, DataSourceTypes, DataSourceManager } from 'jimu-core'
import type { AllWidgetSettingProps } from 'jimu-for-builder'
import { DataSourceSelector } from 'jimu-ui/advanced/data-source-selector'
import { SettingSection, SettingRow } from 'jimu-ui/advanced/setting-components'
import type { IMConfig } from '../config'
import { defaultConfig } from '../config'

type Props = AllWidgetSettingProps<IMConfig>

const RowStack = (props: { label: string, children: React.ReactNode }) => {
  return (
    <SettingRow>
      <div style={{ width: '100%' }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>{props.label}</div>
        {props.children}
      </div>
    </SettingRow>
  )
}

const parseNum = (v: any, fallback: number): number => {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

const isHexColor = (v: string): boolean => /^#[0-9A-Fa-f]{6}$/.test(v)
const normalizeHex = (v: string): string => {
  const s = (v || '').trim()
  if (isHexColor(s)) return s
  const m = s.match(/^#([0-9A-Fa-f]{3})$/)
  if (m) {
    const r = m[1][0]; const g = m[1][1]; const b = m[1][2]
    return `#${r}${r}${g}${g}${b}${b}`
  }
  return ''
}

const ColorRow = (props: {
  label: string
  value: string
  presets: string[]
  onChange: (v: string) => void
}) => {
  const vNorm = normalizeHex(props.value)
  const pickerValue = vNorm || '#000000'

  return (
    <RowStack label={props.label}>
      <div style={{ display: 'grid', gridTemplateColumns: '42px 1fr', gap: 10, alignItems: 'center' }}>
        <input
          type='color'
          value={pickerValue}
          onChange={(e) => props.onChange((e.target as HTMLInputElement).value)}
          title='Scegli colore'
          style={{ width: 42, height: 34, padding: 0, border: 'none', background: 'transparent' }}
        />
        <input
          style={{ width: '100%', padding: '6px 8px' }}
          value={props.value || ''}
          placeholder='#RRGGBB'
          onChange={(e) => props.onChange((e.target as HTMLInputElement).value)}
        />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
        {props.presets.map((c) => (
          <button
            key={c}
            type='button'
            onClick={() => props.onChange(c)}
            title={c}
            style={{
              width: 18,
              height: 18,
              borderRadius: 4,
              border: '1px solid rgba(0,0,0,0.2)',
              background: c,
              cursor: 'pointer'
            }}
          />
        ))}
      </div>
    </RowStack>
  )
}

export default function Setting (props: Props) {
  const cfg: any = (props.config ?? defaultConfig) as any

  const update = (key: string, value: any) => {
    props.onSettingChange({
      id: props.id,
      config: cfg.set(key, value)
    })
  }

  const updateIn = (path: any[], value: any) => {
    props.onSettingChange({
      id: props.id,
      config: cfg.setIn(path, value)
    })
  }

  const dsTypes = Immutable([DataSourceTypes.FeatureLayer]) as any

  const onDsChange = (useDataSources: any) => {
    props.onSettingChange({ id: props.id, useDataSources })
  }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '6px 8px' }

  // -----------------------------
  // Campi disponibili dal datasource
  // -----------------------------
  const [orderFields, setOrderFields] = React.useState<Array<{ name: string, label: string }>>([])

  React.useEffect(() => {
    let canceled = false

    async function loadFields () {
      try {
        const uds = props.useDataSources?.[0]
        if (!uds) { if (!canceled) setOrderFields([]); return }

        const dsm = DataSourceManager.getInstance()
        let ds: any = dsm.getDataSource(uds.dataSourceId)

        if (!ds && (dsm as any).createDataSourceByUseDataSource) {
          ds = await (dsm as any).createDataSourceByUseDataSource(uds)
        }

        const schema = ds?.getSchema?.()
        const fieldsObj = schema?.fields || {}
        const names = Object.keys(fieldsObj)

        const items = names.map((n) => {
          const f = fieldsObj[n] || {}
          const label = (f.alias || f.label || n) as string
          return { name: n, label: label || n }
        }).sort((a, b) => a.label.localeCompare(b.label, 'it'))

        if (!canceled) setOrderFields(items)
      } catch {
        if (!canceled) setOrderFields([])
      }
    }

    loadFields()
    return () => { canceled = true }
  }, [props.useDataSources])

  // palette base
  const palette = [
    '#ffffff', '#000000', '#f2f2f2', '#d0d0d0', '#333333',
    '#eaf2ff', '#2f6fed',
    '#fff7e6', '#ffd18a',
    '#eaf7ef', '#9ad2ae',
    '#ffe5e5', '#ff8a8a'
  ]

  return (
    <div style={{ padding: 12 }}>
      <SettingSection title='Fonte dati'>
        <SettingRow>
          <div style={{ width: '100%' }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Layer / View</div>
            <DataSourceSelector
              widgetId={props.id}
              useDataSources={props.useDataSources as any}
              types={dsTypes}
              isMultiple={false}
              mustUseDataSource={true}
              onChange={onDsChange}
            />
          </div>
        </SettingRow>
      </SettingSection>

      <SettingSection title='Campi (nomi esatti)'>
        <RowStack label='Campo pratica (es. objectid / numero_pratica)'>
          <input style={inputStyle} value={cfg.fieldPratica || ''} onChange={(e) => update('fieldPratica', (e.target as HTMLInputElement).value)} />
        </RowStack>

        <RowStack label='Campo data rilevazione (es. data_rilevazione)'>
          <input style={inputStyle} value={cfg.fieldDataRilevazione || ''} onChange={(e) => update('fieldDataRilevazione', (e.target as HTMLInputElement).value)} />
        </RowStack>

        <RowStack label='Campo ufficio (es. ufficio_zona)'>
          <input style={inputStyle} value={cfg.fieldUfficio || ''} onChange={(e) => update('fieldUfficio', (e.target as HTMLInputElement).value)} />
        </RowStack>

        <RowStack label='Campo stato presa in carico (es. presa_in_carico_DIR_AGR)'>
          <input style={inputStyle} value={cfg.fieldStatoPresa || ''} onChange={(e) => update('fieldStatoPresa', (e.target as HTMLInputElement).value)} />
        </RowStack>

        <RowStack label='Campo data presa in carico (es. dt_presa_in_carico_DIR_AGR)'>
          <input style={inputStyle} value={cfg.fieldDataPresa || ''} onChange={(e) => update('fieldDataPresa', (e.target as HTMLInputElement).value)} />
        </RowStack>
      </SettingSection>

      <SettingSection title='Query / Ordinamento'>
        <RowStack label='Filtro (WHERE)'>
          <input style={inputStyle} value={cfg.whereClause || '1=1'} onChange={(e) => update('whereClause', (e.target as HTMLInputElement).value)} />
        </RowStack>

        <RowStack label='Page size'>
          <input
            style={inputStyle}
            type='number'
            value={String(cfg.pageSize ?? 50)}
            onChange={(e) => update('pageSize', parseNum((e.target as HTMLInputElement).value, 50))}
          />
        </RowStack>

        <RowStack label='Ordina per campo (orderByField)'>
          <select
            style={inputStyle}
            value={cfg.orderByField || ''}
            onChange={(e) => update('orderByField', (e.target as HTMLSelectElement).value)}
          >
            <option value=''>— nessuno —</option>
            {orderFields.map(f => (
              <option key={f.name} value={f.name}>
                {f.label} ({f.name})
              </option>
            ))}
          </select>
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
            Se la lista è vuota, seleziona prima il Layer/View.
          </div>
        </RowStack>

        <RowStack label='Direzione ordine (ASC/DESC)'>
          <select style={inputStyle} value={(cfg.orderByDir || 'ASC') as any} onChange={(e) => update('orderByDir', (e.target as HTMLSelectElement).value)}>
            <option value='ASC'>ASC</option>
            <option value='DESC'>DESC</option>
          </select>
        </RowStack>
      </SettingSection>

      <SettingSection title='Stile Stato pratica (chip)'>
        <RowStack label='Border-radius chip (px)'>
          <input
            style={inputStyle}
            type='number'
            value={String(cfg.statoChipRadius ?? 999)}
            onChange={(e) => update('statoChipRadius', parseNum((e.target as HTMLInputElement).value, 999))}
          />
        </RowStack>

        <RowStack label='Padding orizzontale chip (px)'>
          <input
            style={inputStyle}
            type='number'
            value={String(cfg.statoChipPadX ?? 10)}
            onChange={(e) => update('statoChipPadX', parseNum((e.target as HTMLInputElement).value, 10))}
          />
        </RowStack>

        <RowStack label='Padding verticale chip (px)'>
          <input
            style={inputStyle}
            type='number'
            value={String(cfg.statoChipPadY ?? 4)}
            onChange={(e) => update('statoChipPadY', parseNum((e.target as HTMLInputElement).value, 4))}
          />
        </RowStack>

        <RowStack label='Spessore bordo chip (px)'>
          <input
            style={inputStyle}
            type='number'
            value={String(cfg.statoChipBorderW ?? 1)}
            onChange={(e) => update('statoChipBorderW', parseNum((e.target as HTMLInputElement).value, 1))}
          />
        </RowStack>

        {/* ✅ Formato testo */}
        <SettingRow>
          <div style={{ width: '100%', fontWeight: 700, marginTop: 6, opacity: 0.85 }}>
            Formato testo chip
          </div>
        </SettingRow>

        <RowStack label='Peso font (font-weight)'>
          <select style={inputStyle} value={String(cfg.statoChipFontWeight ?? 600)} onChange={(e) => update('statoChipFontWeight', parseNum((e.target as HTMLSelectElement).value, 600))}>
            <option value='400'>400 (normale)</option>
            <option value='500'>500</option>
            <option value='600'>600 (semibold)</option>
            <option value='700'>700 (bold)</option>
          </select>
        </RowStack>

        <RowStack label='Dimensione font (px)'>
          <input
            style={inputStyle}
            type='number'
            value={String(cfg.statoChipFontSize ?? 12)}
            onChange={(e) => update('statoChipFontSize', parseNum((e.target as HTMLInputElement).value, 12))}
          />
        </RowStack>

        <RowStack label='Stile font (italic)'>
          <select style={inputStyle} value={cfg.statoChipFontStyle || 'normal'} onChange={(e) => update('statoChipFontStyle', (e.target as HTMLSelectElement).value)}>
            <option value='normal'>Normal</option>
            <option value='italic'>Italic</option>
          </select>
        </RowStack>

        <RowStack label='Trasformazione testo'>
          <select style={inputStyle} value={cfg.statoChipTextTransform || 'none'} onChange={(e) => update('statoChipTextTransform', (e.target as HTMLSelectElement).value)}>
            <option value='none'>Nessuna</option>
            <option value='uppercase'>MAIUSCOLO</option>
            <option value='capitalize'>Iniziali maiuscole</option>
          </select>
        </RowStack>

        <RowStack label='Letter-spacing (px)'>
          <input
            style={inputStyle}
            type='number'
            value={String(cfg.statoChipLetterSpacing ?? 0)}
            onChange={(e) => update('statoChipLetterSpacing', parseNum((e.target as HTMLInputElement).value, 0))}
          />
        </RowStack>

        <SettingRow>
          <div style={{ width: '100%', fontWeight: 700, marginTop: 6, opacity: 0.8 }}>
            Da prendere in carico
          </div>
        </SettingRow>
        <ColorRow label='Sfondo' value={cfg.statoBgDaPrendere || ''} presets={palette} onChange={(v) => update('statoBgDaPrendere', v)} />
        <ColorRow label='Testo' value={cfg.statoTextDaPrendere || ''} presets={palette} onChange={(v) => update('statoTextDaPrendere', v)} />
        <ColorRow label='Bordo' value={cfg.statoBorderDaPrendere || ''} presets={palette} onChange={(v) => update('statoBorderDaPrendere', v)} />

        <SettingRow>
          <div style={{ width: '100%', fontWeight: 700, marginTop: 6, opacity: 0.8 }}>
            Presa in carico
          </div>
        </SettingRow>
        <ColorRow label='Sfondo' value={cfg.statoBgPresa || ''} presets={palette} onChange={(v) => update('statoBgPresa', v)} />
        <ColorRow label='Testo' value={cfg.statoTextPresa || ''} presets={palette} onChange={(v) => update('statoTextPresa', v)} />
        <ColorRow label='Bordo' value={cfg.statoBorderPresa || ''} presets={palette} onChange={(v) => update('statoBorderPresa', v)} />

        <SettingRow>
          <div style={{ width: '100%', fontWeight: 700, marginTop: 6, opacity: 0.8 }}>
            Altri valori
          </div>
        </SettingRow>
        <ColorRow label='Sfondo' value={cfg.statoBgAltro || ''} presets={palette} onChange={(v) => update('statoBgAltro', v)} />
        <ColorRow label='Testo' value={cfg.statoTextAltro || ''} presets={palette} onChange={(v) => update('statoTextAltro', v)} />
        <ColorRow label='Bordo' value={cfg.statoBorderAltro || ''} presets={palette} onChange={(v) => update('statoBorderAltro', v)} />
      </SettingSection>
    </div>
  )
}
