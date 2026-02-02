/** @jsx jsx */
import { React, jsx, Immutable, DataSourceTypes, type UseDataSource } from 'jimu-core'
import type { AllWidgetSettingProps } from 'jimu-for-builder'
import { DataSourceSelector } from 'jimu-ui/advanced/data-source-selector'
import { SettingSection, SettingRow } from 'jimu-ui/advanced/setting-components'
import { TextInput, Select, Option } from 'jimu-ui'
import type { IMConfig } from '../config'

type RowStackProps = {
  label: string
  hint?: string
  children: React.ReactNode
}

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 6,
  whiteSpace: 'normal',
  wordBreak: 'normal',
  overflowWrap: 'break-word'
}

const hintStyle: React.CSSProperties = {
  fontSize: 12,
  opacity: 0.75,
  marginBottom: 8,
  whiteSpace: 'normal',
  wordBreak: 'normal',
  overflowWrap: 'break-word'
}

const RowStack = (props: RowStackProps) => {
  return (
    <div style={{ width: '100%', minWidth: 0 }}>
      <div style={labelStyle}>{props.label}</div>
      {props.hint && <div style={hintStyle}>{props.hint}</div>}
      <div style={{ width: '100%', minWidth: 0 }}>
        {props.children}
      </div>
    </div>
  )
}

export default function Setting (props: AllWidgetSettingProps<IMConfig>) {
  const dsTypes = Immutable([DataSourceTypes.FeatureLayer])

  const onMainDsChange = (useDataSources: UseDataSource[]) => {
    props.onSettingChange({
      id: props.id,
      useDataSources: useDataSources as any
    })
  }

  const onToggleUseDataEnabled = (useDataSourcesEnabled: boolean) => {
    props.onSettingChange({
      id: props.id,
      useDataSourcesEnabled
    })
  }

  const roleCode = (props.config as any)?.roleCode ? String((props.config as any).roleCode).trim().toUpperCase() : 'DT'
  const buttonText = (props.config as any)?.buttonText ? (props.config as any).buttonText : 'Prendi in carico'

  const onRoleCodeChange = (e: any) => {
    const v = String(e?.target?.value ?? 'DT').trim().toUpperCase()
    props.onSettingChange({ id: props.id, config: props.config.set('roleCode', v) })
  }

  const onButtonTextChange = (e: any) => {
    const v = ((e?.target?.value ?? '') as string)
    props.onSettingChange({ id: props.id, config: props.config.set('buttonText', v) })
  }

  return (
    <div className='p-3' style={{ width: '100%' }}>
      <SettingSection title='Dati'>
        <SettingRow style={{ width: '100%' }}>
          <RowStack
            label='Data source (selezione multipla)'
            hint='Seleziona una o più Data View / feature layer. Il runtime userà automaticamente quella “attiva” (quella che ha la selezione corrente).'
          >
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
          </RowStack>
        </SettingRow>
      </SettingSection>

      <SettingSection title='Configurazione ruolo'>
        <SettingRow style={{ width: '100%' }}>
          <RowStack
            label='Ruolo'
            hint='DT = Direttore Tecnico. DA = Direttore Amministrativo.'
          >
            <Select value={roleCode} onChange={onRoleCodeChange}>
              <Option value='DT'>DT</Option>
              <Option value='DA'>DA</Option>
            </Select>
          </RowStack>
        </SettingRow>

        <SettingRow style={{ width: '100%' }}>
          <RowStack label='Testo bottone “Prendi in carico”'>
            <TextInput value={buttonText} onChange={onButtonTextChange} placeholder='Prendi in carico' />
          </RowStack>
        </SettingRow>
      </SettingSection>
    </div>
  )
}
