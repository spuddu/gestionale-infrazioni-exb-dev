import { React, Immutable, type UseDataSource, DataSourceTypes } from 'jimu-core'
import type { AllWidgetSettingProps } from 'jimu-for-builder'
import { DataSourceSelector } from 'jimu-ui/advanced/data-source-selector'

export default function Setting(props: AllWidgetSettingProps<any>) {

  const onToggleUseDataEnabled = (useDataSourcesEnabled: boolean) => {
    props.onSettingChange({
      id: props.id,
      useDataSourcesEnabled
    })
  }

  const onDataSourceChange = (useDataSources: UseDataSource[]) => {
    props.onSettingChange({
      id: props.id,
      useDataSources
    })
  }

  return (
    <div className="p-2">
      <DataSourceSelector
        types={Immutable([DataSourceTypes.FeatureLayer])}
        useDataSources={props.useDataSources}
        useDataSourcesEnabled={props.useDataSourcesEnabled}
        onToggleUseDataEnabled={onToggleUseDataEnabled}
        onChange={onDataSourceChange}
        widgetId={props.id}
      />
    </div>
  )
}
