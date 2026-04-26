/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx } from 'jimu-core'
import type { AllWidgetSettingProps } from 'jimu-for-builder'
import type { IMConfig } from '../config'

const sectionStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8,
  padding: 14,
  display: 'grid',
  gap: 12
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: '#fff',
  marginBottom: 4,
  display: 'block'
}

const hintStyle: React.CSSProperties = {
  fontSize: 10,
  color: 'rgba(255,255,255,0.55)',
  marginTop: 2
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 10px',
  border: '1px solid rgba(255,255,255,0.2)',
  borderRadius: 6,
  fontSize: 13,
  boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.08)',
  color: '#fff'
}

const colorRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10
}

const colorInputStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  padding: 0,
  border: '2px solid rgba(255,255,255,0.3)',
  borderRadius: 6,
  cursor: 'pointer',
  background: 'none'
}

const checkboxRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  cursor: 'pointer'
}

export default function Setting (props: AllWidgetSettingProps<IMConfig>) {
  const cfg: any = props.config || {}

  const onPropChange = (key: string, value: any) => {
    props.onSettingChange({ id: props.id, config: props.config.set(key, value) })
  }

  const barBg = String(cfg.barBg || '#ffffff')
  const isTransparent = barBg === 'transparent'

  return (
    <div style={{ padding: 12, display: 'grid', gap: 16 }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: 8 }}>
        GII — Nota Spese Carrello
      </div>

      {/* NAVIGAZIONE */}
      <div style={sectionStyle}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#90caf9', marginBottom: 2 }}>Navigazione</div>
        <div>
          <label style={labelStyle}>Pagina di ritorno</label>
          <input
            value={cfg.returnPageSlug || ''}
            onChange={(e) => onPropChange('returnPageSlug', e.target.value)}
            placeholder='modifica-rapporto'
            style={inputStyle}
          />
          <div style={hintStyle}>Slug o label della pagina ExB su cui tornare dopo Conferma/Annulla. Es: "modifica-rapporto" o "page_20".</div>
        </div>
      </div>

      {/* ASPETTO */}
      <div style={sectionStyle}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#90caf9', marginBottom: 2 }}>Aspetto barra</div>

        <div>
          <label style={labelStyle}>Sfondo barra</label>
          <div style={colorRowStyle}>
            {!isTransparent && (
              <React.Fragment>
                <input
                  type='color'
                  value={barBg}
                  onChange={(e) => onPropChange('barBg', e.target.value)}
                  style={colorInputStyle}
                />
                <input
                  value={barBg}
                  onChange={(e) => onPropChange('barBg', e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                  placeholder='#ffffff'
                />
              </React.Fragment>
            )}
          </div>
          <div style={{ ...checkboxRowStyle, marginTop: 6 }} onClick={() => onPropChange('barBg', isTransparent ? '#ffffff' : 'transparent')}>
            <input type='checkbox' checked={isTransparent} readOnly style={{ cursor: 'pointer', accentColor: '#90caf9' }} />
            <span style={{ fontSize: 12, color: '#fff' }}>Trasparente</span>
          </div>
        </div>

        <div>
          <label style={labelStyle}>Bordo barra</label>
          <div style={colorRowStyle}>
            <input
              type='color'
              value={cfg.barBorderColor || '#c5d9f1'}
              onChange={(e) => onPropChange('barBorderColor', e.target.value)}
              style={colorInputStyle}
            />
            <input
              value={cfg.barBorderColor || '#c5d9f1'}
              onChange={(e) => onPropChange('barBorderColor', e.target.value)}
              style={{ ...inputStyle, flex: 1 }}
              placeholder='#c5d9f1'
            />
          </div>
          <div style={hintStyle}>Colore del bordo attorno alla barra.</div>
        </div>
      </div>
    </div>
  )
}
