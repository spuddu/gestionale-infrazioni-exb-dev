/** @jsx jsx */
import { React, jsx, Immutable, type ImmutableObject, type UseDataSource, DataSourceTypes } from 'jimu-core'
import { type AllWidgetSettingProps } from 'jimu-for-builder'
import { SettingSection, SettingRow } from 'jimu-ui/advanced/setting-components'
import { DataSourceSelector } from 'jimu-ui/advanced/data-source-selector'
import { Label, Switch, TextInput, NumericInput, Select, Option } from 'jimu-ui'

import defaultConfig, { type Config } from '../config'

type IMConfig = ImmutableObject<Config>
type Props = AllWidgetSettingProps<IMConfig>

const rowStackStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  gap: 6
}

const helpStyle: React.CSSProperties = {
  fontSize: 12,
  opacity: 0.75,
  lineHeight: 1.25
}

const colorRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10
}

const colorInputStyle: React.CSSProperties = {
  width: 34,
  height: 28,
  padding: 0,
  border: 'none',
  background: 'transparent',
  cursor: 'pointer'
}

function safeHex (v: any, fallback = '#000000'): string {
  const s = String(v ?? '').trim()
  return /^#([0-9a-fA-F]{6})$/.test(s) ? s : fallback
}

export default class Setting extends React.PureComponent<Props> {
  private getConfig (): Config {
    const base = defaultConfig
    const cur = (this.props.config?.asMutable?.({ deep: true }) ?? {}) as Partial<Config>
    return { ...base, ...cur } as Config
  }

  private updateConfig<K extends keyof Config> (key: K, value: Config[K]): void {
    const cfg = this.props.config ?? Immutable(defaultConfig)
    this.props.onSettingChange({
      id: this.props.id,
      config: cfg.set(key as string, value as any)
    })
  }

  private onDataSourceChange = (useDataSources: UseDataSource[]): void => {
    this.props.onSettingChange({ id: this.props.id, useDataSources })
  }

  private renderStackRow (label: string, control: React.ReactNode, help?: string): JSX.Element {
    return (
      <SettingRow>
        <div style={rowStackStyle}>
          <Label style={{ margin: 0 }}>{label}</Label>
          {help && <div style={helpStyle}>{help}</div>}
          <div>{control}</div>
        </div>
      </SettingRow>
    )
  }

  private renderColorRow (label: string, key: keyof Config, help?: string): JSX.Element {
    const cfg = this.getConfig()
    const hex = safeHex((cfg as any)[key], '#2d7ff9')
    return this.renderStackRow(
      label,
      <div style={colorRowStyle}>
        <input
          type='color'
          value={hex}
          style={colorInputStyle}
          onChange={(e) => this.updateConfig(key as any, e.target.value as any)}
        />
        <TextInput
          value={hex}
          onChange={(e) => this.updateConfig(key as any, e.target.value as any)}
          style={{ width: '100%' }}
          placeholder='#RRGGBB'
        />
      </div>,
      help
    )
  }

  render (): JSX.Element {
    const cfg = this.getConfig()

    return (
      <div className='gii-elenco-pratiche-pro-setting' style={{ padding: 12 }}>
        {/* Sorgente dati */}
        <SettingSection title='Sorgente dati'>
          {this.renderStackRow(
            'Feature layer / view',
            <DataSourceSelector
              types={[DataSourceTypes.FeatureLayer]}
              useDataSources={this.props.useDataSources as any}
              mustUseDataSource
              onChange={this.onDataSourceChange}
              widgetId={this.props.id}
            />
          )}
        </SettingSection>

        {/* Campi */}
        <SettingSection title='Colonne (mockup)'>
          {this.renderStackRow(
            'Mostra intestazione colonne',
            <Switch
              checked={!!cfg.showHeader}
              onChange={(e) => this.updateConfig('showHeader', e.target.checked)}
            />,
            'Se disattivi, restano solo le righe.'
          )}

          {this.renderStackRow(
            'Campo N.pratica',
            <TextInput
              value={cfg.fieldPratica}
              onChange={(e) => this.updateConfig('fieldPratica', e.target.value)}
              style={{ width: '100%' }}
              placeholder='objectid'
            />,
            'Deve essere il FIELD NAME del layer/view.'
          )}

          {this.renderStackRow(
            'Campo Data rilevazione',
            <TextInput
              value={cfg.fieldDataRilevazione}
              onChange={(e) => this.updateConfig('fieldDataRilevazione', e.target.value)}
              style={{ width: '100%' }}
              placeholder='data_rilevazione'
            />
          )}

          {this.renderStackRow(
            'Campo Ufficio',
            <TextInput
              value={cfg.fieldUfficioZona}
              onChange={(e) => this.updateConfig('fieldUfficioZona', e.target.value)}
              style={{ width: '100%' }}
              placeholder='ufficio_zona'
            />
          )}

          {this.renderStackRow(
            'Campo Stato (presa_in_carico)',
            <TextInput
              value={cfg.fieldPresaInCarico}
              onChange={(e) => this.updateConfig('fieldPresaInCarico', e.target.value)}
              style={{ width: '100%' }}
              placeholder='presa_in_carico_DIR_AGR'
            />
          )}

          {this.renderStackRow(
            'Campo Data presa in carico',
            <TextInput
              value={cfg.fieldDtPresaInCarico}
              onChange={(e) => this.updateConfig('fieldDtPresaInCarico', e.target.value)}
              style={{ width: '100%' }}
              placeholder='dt_presa_in_carico_DIR_AGR'
            />
          )}

          {this.renderStackRow(
            'Valore “da prendere in carico”',
            <NumericInput
              value={cfg.valoreDaPrendere}
              onChange={(v) => this.updateConfig('valoreDaPrendere', Number(v))}
              style={{ width: '100%' }}
              min={0}
              step={1}
            />
          )}

          {this.renderStackRow(
            'Valore “presa in carico”',
            <NumericInput
              value={cfg.valorePresa}
              onChange={(v) => this.updateConfig('valorePresa', Number(v))}
              style={{ width: '100%' }}
              min={0}
              step={1}
            />
          )}
        </SettingSection>

        {/* Ordinamento */}
        <SettingSection title='Query e ordinamento'>
          {this.renderStackRow(
            'Max record (page size)',
            <NumericInput
              value={cfg.pageSize}
              onChange={(v) => this.updateConfig('pageSize', Number(v))}
              style={{ width: '100%' }}
              min={1}
              step={1}
            />
          )}

          {this.renderStackRow(
            'Order by field',
            <TextInput
              value={cfg.orderBy}
              onChange={(e) => this.updateConfig('orderBy', e.target.value)}
              style={{ width: '100%' }}
              placeholder='objectid'
            />
          )}

          {this.renderStackRow(
            'Order direction',
            <Select
              value={cfg.orderDir}
              onChange={(e) => this.updateConfig('orderDir', e.target.value as any)}
              style={{ width: '100%' }}
            >
              <Option value='ASC'>ASC</Option>
              <Option value='DESC'>DESC</Option>
            </Select>
          )}
        </SettingSection>

        {/* Spaziatura e larghezze */}
        <SettingSection title='Spaziatura e larghezze'>
          {this.renderStackRow(
            'Padding sinistro prima colonna (px)',
            <NumericInput
              value={cfg.paddingLeftFirstCol}
              onChange={(v) => this.updateConfig('paddingLeftFirstCol', Number(v))}
              style={{ width: '100%' }}
              min={0}
              step={1}
            />,
            'Vale per righe e intestazione.'
          )}

          {this.renderStackRow(
            'Larghezza colonna N.pratica (px)',
            <NumericInput
              value={cfg.colWPratica}
              onChange={(v) => this.updateConfig('colWPratica', Number(v))}
              style={{ width: '100%' }}
              min={40}
              step={5}
            />
          )}

          {this.renderStackRow(
            'Larghezza colonna Data (px)',
            <NumericInput
              value={cfg.colWData}
              onChange={(v) => this.updateConfig('colWData', Number(v))}
              style={{ width: '100%' }}
              min={60}
              step={5}
            />
          )}

          {this.renderStackRow(
            'Larghezza colonna Stato (px)',
            <NumericInput
              value={cfg.colWStato}
              onChange={(v) => this.updateConfig('colWStato', Number(v))}
              style={{ width: '100%' }}
              min={60}
              step={5}
            />
          )}

          {this.renderStackRow(
            'Larghezza colonna Ufficio (px)',
            <NumericInput
              value={cfg.colWUfficio}
              onChange={(v) => this.updateConfig('colWUfficio', Number(v))}
              style={{ width: '100%' }}
              min={60}
              step={5}
            />
          )}

          {this.renderStackRow(
            'Larghezza colonna Azioni (px)',
            <NumericInput
              value={cfg.colWAzioni}
              onChange={(v) => this.updateConfig('colWAzioni', Number(v))}
              style={{ width: '100%' }}
              min={80}
              step={5}
            />
          )}

          {this.renderStackRow(
            'Larghezza pulsante (px)',
            <NumericInput
              value={cfg.btnWidth}
              onChange={(v) => this.updateConfig('btnWidth', Number(v))}
              style={{ width: '100%' }}
              min={80}
              step={5}
            />,
            'Rimane fissa anche quando il pulsante è disabilitato.'
          )}
        </SettingSection>

        {/* Stili */}
        <SettingSection title='Stili'>
          {this.renderStackRow(
            'Zebra rows',
            <Switch
              checked={!!cfg.zebra}
              onChange={(e) => this.updateConfig('zebra', e.target.checked)}
            />
          )}

          {this.renderColorRow('Zebra colore 1', 'zebraColor1', 'Usato sulle righe pari/dispari (se zebra attivo).')}
          {this.renderColorRow('Zebra colore 2', 'zebraColor2')}

          {this.renderColorRow('Hover background', 'hoverBg', 'Colore al passaggio del mouse.')}
          {this.renderColorRow('Selected background', 'selectedBg')}

          {this.renderColorRow('Selected border color', 'selectedBorderColor')}
          {this.renderStackRow(
            'Selected border width (px)',
            <NumericInput
              value={cfg.selectedBorderWidth}
              onChange={(v) => this.updateConfig('selectedBorderWidth', Number(v))}
              style={{ width: '100%' }}
              min={0}
              step={1}
            />
          )}
        </SettingSection>
      </div>
    )
  }
}
