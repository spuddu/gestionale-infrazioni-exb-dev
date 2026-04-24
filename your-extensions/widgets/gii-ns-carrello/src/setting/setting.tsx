/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx } from 'jimu-core'
import type { AllWidgetSettingProps } from 'jimu-for-builder'
import type { IMConfig } from '../config'

export default function Setting (props: AllWidgetSettingProps<IMConfig>) {
  const cfg: any = props.config || {}

  const onPropChange = (key: string, value: any) => {
    props.onSettingChange({ id: props.id, config: props.config.set(key, value) })
  }

  return (
    <div style={{ padding: 10, display: 'grid', gap: 12 }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#1F4E79', marginBottom: 4 }}>Slug pagina ritorno</div>
        <input
          value={cfg.returnPageSlug || ''}
          onChange={(e) => onPropChange('returnPageSlug', e.target.value)}
          placeholder='modifica-rapporto'
          style={{ width: '100%', padding: '5px 8px', border: '1px solid #aac4e0', borderRadius: 4, fontSize: 13, boxSizing: 'border-box' }}
        />
        <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>Slug della pagina ExB da raggiungere al clic su "Conferma" o "Annulla".</div>
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#1F4E79', marginBottom: 4 }}>Sfondo barra</div>
        <input
          value={cfg.barBg || '#ffffff'}
          onChange={(e) => onPropChange('barBg', e.target.value)}
          style={{ width: '100%', padding: '5px 8px', border: '1px solid #aac4e0', borderRadius: 4, fontSize: 13, boxSizing: 'border-box' }}
        />
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#1F4E79', marginBottom: 4 }}>Colore bordo barra</div>
        <input
          value={cfg.barBorderColor || '#c5d9f1'}
          onChange={(e) => onPropChange('barBorderColor', e.target.value)}
          style={{ width: '100%', padding: '5px 8px', border: '1px solid #aac4e0', borderRadius: 4, fontSize: 13, boxSizing: 'border-box' }}
        />
      </div>
    </div>
  )
}
