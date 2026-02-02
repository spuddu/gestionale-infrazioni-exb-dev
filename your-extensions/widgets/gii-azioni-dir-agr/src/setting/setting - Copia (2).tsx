/** @jsx jsx */
import { React, jsx, Immutable, DataSourceTypes, type UseDataSource } from 'jimu-core'
import type { AllWidgetSettingProps } from 'jimu-for-builder'
import { DataSourceSelector } from 'jimu-ui/advanced/data-source-selector'
import { SettingSection, SettingRow } from 'jimu-ui/advanced/setting-components'
import { TextInput } from 'jimu-ui'
import type { IMConfig } from '../config'

type RowStackProps = {
  label: string
  hint?: string
  children: React.ReactNode
}

const RowStack = (props: RowStackProps) => {
  return (
    <div style={{ width: '100%' }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
        {props.label}
      </div>
      {props.hint && (
        <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 8 }}>
          {props.hint}
        </div>
      )}
      {props.children}
    </div>
  )
}

export default function Setting (props: AllWidgetSettingProps<IMConfig>) {
  const dsTypes = Immutable([DataSourceTypes.FeatureLayer])

  // ✅ Multi-selezione: DataSourceSelector restituisce UseDataSource[]
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

  const roleSuffix = (props.config as any)?.roleSuffix ? (props.config as any).roleSuffix : 'DIR_AGR'
  const buttonText = (props.config as any)?.buttonText ? (props.config as any).buttonText : 'Prendi in carico'

  const onRoleSuffixChange = (e: any) => {
    const v = ((e?.target?.value ?? '') as string).trim().toUpperCase()
    props.onSettingChange({ id: props.id, config: props.config.set('roleSuffix', v) })
  }

  const onButtonTextChange = (e: any) => {
    const v = ((e?.target?.value ?? '') as string)
    props.onSettingChange({ id: props.id, config: props.config.set('buttonText', v) })
  }

  return (
    <div className='p-3'>
      <SettingSection title='Dati'>
        <SettingRow>
          <RowStack
            label='Data source (selezione multipla)'
            hint='Seleziona una o più view/feature layer. Il widget userà quella “attiva” in base alla tua logica nel runtime.'
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

      <SettingSection title='Azione: Presa in carico'>
        <SettingRow>
          <RowStack label='Suffisso ruolo (es. DIR_AGR)'>
            <TextInput value={roleSuffix} onChange={onRoleSuffixChange} placeholder='DIR_AGR' />
          </RowStack>
        </SettingRow>

        <SettingRow>
          <RowStack label='Testo bottone'>
            <TextInput value={buttonText} onChange={onButtonTextChange} placeholder='Prendi in carico' />
          </RowStack>
        </SettingRow>
      </SettingSection>
    </div>
  )
}
