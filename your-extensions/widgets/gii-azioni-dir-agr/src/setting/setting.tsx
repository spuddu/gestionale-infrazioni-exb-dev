/** @jsx jsx */
import { React, jsx, Immutable, DataSourceTypes, type UseDataSource } from 'jimu-core'
import type { AllWidgetSettingProps } from 'jimu-for-builder'
import { DataSourceSelector } from 'jimu-ui/advanced/data-source-selector'
import { SettingSection, SettingRow } from 'jimu-ui/advanced/setting-components'
import { TextInput } from 'jimu-ui'
import type { IMConfig } from '../config'

export default function Setting (props: AllWidgetSettingProps<IMConfig>) {
  // ✅ DataSourceSelector.onChange vuole UseDataSource[], NON IMUseDataSource[]
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
        <SettingRow label='Data source principale (TAB_AGR_DIR_DA_PRENDERE)'>
          <DataSourceSelector
            widgetId={props.id}
            types={Immutable([DataSourceTypes.FeatureLayer])}
            useDataSources={props.useDataSources as any}
            useDataSourcesEnabled={props.useDataSourcesEnabled}
            onToggleUseDataEnabled={onToggleUseDataEnabled}
            onChange={onMainDsChange}
            mustUseDataSource
          />
        </SettingRow>
      </SettingSection>

      <SettingSection title='Azione: Presa in carico'>
        <SettingRow label='Suffisso ruolo (es. DIR_AGR)'>
          <TextInput value={roleSuffix} onChange={onRoleSuffixChange} placeholder='DIR_AGR' />
        </SettingRow>

        <SettingRow label='Testo bottone'>
          <TextInput value={buttonText} onChange={onButtonTextChange} placeholder='Prendi in carico' />
        </SettingRow>
      </SettingSection>
    </div>
  )
}
