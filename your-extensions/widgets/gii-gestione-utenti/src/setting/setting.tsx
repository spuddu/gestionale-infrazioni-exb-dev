/** @jsx jsx */
import { React, jsx } from 'jimu-core'
import type { AllWidgetSettingProps } from 'jimu-for-builder'
import type { IMConfig } from '../config'

type Props = AllWidgetSettingProps<IMConfig>

export default function Setting (props: Props) {
  const { config, onSettingChange } = props

  const onSecretChange = (e: any) => {
    onSettingChange({
      id: props.id,
      config: { ...config, clientSecret: e.target.value }
    })
  }

  return (
    <div style={{ padding: 12 }}>
      <div style={{ fontWeight: 'bold', marginBottom: 6, fontSize: 13 }}>
        Client Secret AGOL
      </div>
      <input
        type='password'
        value={config?.clientSecret ?? ''}
        onChange={onSecretChange}
        placeholder='Incolla il Client Secret AGOL'
        style={{ width: '100%', padding: '5px 8px', border: '1px solid #aaa', borderRadius: 4, fontSize: 13 }}
      />
      <div style={{ fontSize: 11, color: '#999', marginTop: 6 }}>
        AGOL → Contenuto → Application ExB Developer Local → Credenziali → Segreto client
      </div>
    </div>
  )
}
