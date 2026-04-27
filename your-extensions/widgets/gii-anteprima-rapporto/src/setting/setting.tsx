/** @jsx jsx */
import { React, jsx, css } from 'jimu-core'
import { type AllWidgetSettingProps } from 'jimu-for-builder'
import { TextInput } from 'jimu-ui'
import { type IMConfig } from '../config'

export default function Setting (props: AllWidgetSettingProps<IMConfig>) {
  const { config, onConfigChange } = props

  const setVal = (key: string, val: string) => {
    onConfigChange(config.set(key as any, val) as any)
  }

  return (
    <div css={css`padding:12px; label{display:block;margin-bottom:12px;font-size:13px;}`}>
      <label>
        URL Feature Layer Rapporti (opzionale — usa la selezione corrente se vuoto)
        <TextInput
          size='sm'
          value={(config as any)?.dsUrl || ''}
          onChange={e => setVal('dsUrl', (e.target as HTMLInputElement).value)}
          style={{ marginTop: 4 }}
        />
      </label>
    </div>
  )
}
