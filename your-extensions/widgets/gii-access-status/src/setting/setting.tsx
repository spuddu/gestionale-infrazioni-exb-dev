/** @jsx jsx */
import { React, jsx } from 'jimu-core'
import { type AllWidgetSettingProps } from 'jimu-for-builder'
import { defaultConfig, type Config, type IMConfig, type TextAlign, type VerticalAlign } from '../config'

const P = {
  wrap: {
    minHeight: '100%', boxSizing: 'border-box' as const, padding: '0 12px 32px',
    background: '#1a1f2e', color: '#e5e7eb', fontSize: 13
  } as React.CSSProperties,
  sec: {
    fontSize: 11, fontWeight: 700, color: '#93c5fd', textTransform: 'uppercase' as const,
    letterSpacing: 1.2, borderBottom: '1px solid rgba(255,255,255,0.10)',
    paddingBottom: 6, marginBottom: 12, marginTop: 20
  } as React.CSSProperties,
  lbl: {
    display: 'block', marginTop: 10, marginBottom: 4,
    fontSize: 11.5, fontWeight: 600, color: '#d1d5db'
  } as React.CSSProperties,
  hint: { marginTop: 3, fontSize: 10.5, lineHeight: 1.4, color: '#9ca3af' } as React.CSSProperties,
  inp: {
    width: '100%', boxSizing: 'border-box' as const, padding: '6px 8px',
    border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6,
    background: 'rgba(255,255,255,0.07)', color: '#e5e7eb', outline: 'none', fontSize: 12
  } as React.CSSProperties,
  row2: { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 8 } as React.CSSProperties,
  box: {
    border: '1px solid rgba(255,255,255,0.10)', borderRadius: 9,
    background: 'rgba(255,255,255,0.04)', padding: '10px 11px', marginTop: 8
  } as React.CSSProperties
}

function plainConfig(config: IMConfig | undefined): Config {
  const raw: any = config as any
  const mutable = raw?.asMutable ? raw.asMutable({ deep: true }) : (raw || {})
  return { ...defaultConfig, ...mutable }
}

function ColorInput(props: { value: string; onChange: (value: string) => void }) {
  const raw = String(props.value || '').trim()
  const pickerValue = /^#[0-9a-fA-F]{6}$/.test(raw) ? raw : '#ffffff'
  return (
    <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
      <input
        type='color'
        value={pickerValue}
        onChange={e => props.onChange(e.target.value)}
        style={{ width: 32, height: 30, padding: 0, border: 0, background: 'transparent', cursor: 'pointer', flexShrink: 0 }}
      />
      <input
        type='text'
        value={props.value}
        onChange={e => props.onChange(e.target.value)}
        style={P.inp}
        placeholder='#ffffff'
      />
    </div>
  )
}

function NumInput(props: {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
}) {
  return (
    <input
      type='number'
      value={props.value}
      min={props.min}
      max={props.max}
      step={props.step ?? 1}
      onChange={e => props.onChange(Number(e.target.value))}
      style={P.inp}
    />
  )
}

export default function Setting(props: AllWidgetSettingProps<IMConfig>) {
  const cfg = plainConfig(props.config)

  const update = (patch: Partial<Config>) => {
    props.onSettingChange({ id: props.id, config: { ...cfg, ...patch } as any })
  }

  return (
    <div style={P.wrap}>
      <div style={P.sec}>Contenuti</div>

      <label style={P.lbl}>Testo durante il controllo</label>
      <input
        type='text'
        value={cfg.checkingTitle}
        onChange={e => update({ checkingTitle: e.target.value })}
        style={P.inp}
      />

      <label style={P.lbl}>Titolo accesso negato</label>
      <input
        type='text'
        value={cfg.deniedTitle}
        onChange={e => update({ deniedTitle: e.target.value })}
        style={P.inp}
      />

      <label style={{ ...P.lbl, display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type='checkbox'
          checked={cfg.showDeniedMessage}
          onChange={e => update({ showDeniedMessage: e.target.checked })}
        />
        Mostra messaggio di accesso negato
      </label>

      {cfg.showDeniedMessage && (
        <>
          <label style={P.lbl}>Messaggio accesso negato</label>
          <textarea
            value={cfg.deniedMessage}
            onChange={e => update({ deniedMessage: e.target.value })}
            rows={3}
            style={{ ...P.inp, resize: 'vertical', minHeight: 66 }}
          />
        </>
      )}

      <div style={P.sec}>Titolo</div>

      <div style={P.row2}>
        <div>
          <label style={P.lbl}>Colore — in corso</label>
          <ColorInput value={cfg.checkingTitleColor} onChange={v => update({ checkingTitleColor: v })} />
        </div>
        <div>
          <label style={P.lbl}>Colore — negato</label>
          <ColorInput value={cfg.deniedTitleColor} onChange={v => update({ deniedTitleColor: v })} />
        </div>
      </div>

      <label style={P.lbl}>Famiglia font</label>
      <input
        type='text'
        value={cfg.titleFontFamily}
        onChange={e => update({ titleFontFamily: e.target.value })}
        style={P.inp}
        placeholder='inherit'
      />
      <div style={P.hint}>Esempi: inherit, Source Sans 3, Segoe UI, Arial.</div>

      <div style={P.row2}>
        <div>
          <label style={P.lbl}>Dimensione</label>
          <NumInput value={cfg.titleFontSize} min={8} max={72} step={1} onChange={v => update({ titleFontSize: v })} />
        </div>
        <div>
          <label style={P.lbl}>Peso</label>
          <select
            value={cfg.titleFontWeight}
            onChange={e => update({ titleFontWeight: Number(e.target.value) })}
            style={{ ...P.inp, cursor: 'pointer' }}
          >
            {[300, 400, 500, 600, 700, 800].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      </div>

      <label style={P.lbl}>Interlinea</label>
      <NumInput value={cfg.titleLineHeight} min={0.8} max={2} step={0.05} onChange={v => update({ titleLineHeight: v })} />

      <div style={P.sec}>Messaggio</div>

      <label style={P.lbl}>Colore</label>
      <ColorInput value={cfg.deniedMessageColor} onChange={v => update({ deniedMessageColor: v })} />

      <label style={P.lbl}>Famiglia font</label>
      <input
        type='text'
        value={cfg.messageFontFamily}
        onChange={e => update({ messageFontFamily: e.target.value })}
        style={P.inp}
        placeholder='inherit'
      />

      <div style={P.row2}>
        <div>
          <label style={P.lbl}>Dimensione</label>
          <NumInput value={cfg.messageFontSize} min={8} max={48} step={1} onChange={v => update({ messageFontSize: v })} />
        </div>
        <div>
          <label style={P.lbl}>Peso</label>
          <select
            value={cfg.messageFontWeight}
            onChange={e => update({ messageFontWeight: Number(e.target.value) })}
            style={{ ...P.inp, cursor: 'pointer' }}
          >
            {[300, 400, 500, 600, 700, 800].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      </div>

      <div style={P.row2}>
        <div>
          <label style={P.lbl}>Interlinea</label>
          <NumInput value={cfg.messageLineHeight} min={0.8} max={2} step={0.05} onChange={v => update({ messageLineHeight: v })} />
        </div>
        <div>
          <label style={P.lbl}>Larghezza max.</label>
          <NumInput value={cfg.messageMaxWidth} min={100} max={1000} step={10} onChange={v => update({ messageMaxWidth: v })} />
        </div>
      </div>

      <label style={P.lbl}>Distanza dal titolo</label>
      <NumInput value={cfg.messageGap} min={0} max={80} step={1} onChange={v => update({ messageGap: v })} />

      <div style={P.sec}>Allineamento</div>

      <div style={P.row2}>
        <div>
          <label style={P.lbl}>Orizzontale</label>
          <select
            value={cfg.textAlign}
            onChange={e => update({ textAlign: e.target.value as TextAlign })}
            style={{ ...P.inp, cursor: 'pointer' }}
          >
            <option value='left'>Sinistra</option>
            <option value='center'>Centro</option>
            <option value='right'>Destra</option>
          </select>
        </div>
        <div>
          <label style={P.lbl}>Verticale</label>
          <select
            value={cfg.verticalAlign}
            onChange={e => update({ verticalAlign: e.target.value as VerticalAlign })}
            style={{ ...P.inp, cursor: 'pointer' }}
          >
            <option value='flex-start'>Alto</option>
            <option value='center'>Centro</option>
            <option value='flex-end'>Basso</option>
          </select>
        </div>
      </div>

      <div style={P.box}>
        <button
          type='button'
          onClick={() => props.onSettingChange({ id: props.id, config: defaultConfig as any })}
          style={{
            width: '100%', padding: '7px 10px', borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.06)',
            color: '#e5e7eb', fontSize: 12, fontWeight: 600, cursor: 'pointer'
          }}
        >
          Ripristina valori predefiniti
        </button>
      </div>
    </div>
  )
}
