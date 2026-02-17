/** @jsx jsx */
import { React, jsx } from 'jimu-core'
import type { AllWidgetSettingProps } from 'jimu-for-builder'
import { TextInput } from 'jimu-ui'
import { SettingSection } from 'jimu-ui/advanced/setting-components'
import type { IMConfig } from '../config'

type Props = AllWidgetSettingProps<IMConfig>

export default function Setting (props: Props) {
  const { config, onSettingChange } = props

  const set = (patch: { clientSecret?: string }) => {
    onSettingChange({ id: props.id, config: { ...config, ...patch } })
  }

  return (
    <div>
      <SettingSection title='Autenticazione AGOL'>
        <div style={{ marginBottom: 6, fontSize: 12, fontWeight: 700 }}>Client Secret</div>
        <TextInput
          type='password'
          value={config?.clientSecret ?? ''}
          onChange={(e: any) => set({ clientSecret: e.target.value })}
          placeholder='Incolla il Client Secret AGOL'
          style={{ width: '100%' }}
        />
        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>
          Recupera da AGOL → Contenuto → Application ExB Developer Local → Credenziali → Segreto client.
        </div>
      </SettingSection>
    </div>
  )
}
