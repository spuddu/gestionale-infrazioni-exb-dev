/** @jsx jsx */
import { React, jsx, Immutable, DataSourceTypes, DataSourceManager, type UseDataSource } from 'jimu-core'
import type { AllWidgetSettingProps } from 'jimu-for-builder'
import { DataSourceSelector } from 'jimu-ui/advanced/data-source-selector'
import { SettingSection } from 'jimu-ui/advanced/setting-components'
import { NumericInput, Switch, TextInput } from 'jimu-ui'
import type { IMConfig, TabConfig } from '../config'
import { defaultConfig } from '../config'

type Props = AllWidgetSettingProps<IMConfig>

type FieldOpt = { name: string; alias: string; type?: string }

const PRESET_COLORS = [
  '#000000', '#ffffff', '#0078da', '#328c54', '#e75a05', '#d13438', '#6f42c1',
  '#f2f2f2', '#e5e7eb', '#f6f7f9', '#eaf2ff'
]

const isHexColor = (s: string) => /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test((s || '').trim())

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 8px',
  borderRadius: 8,
  border: '1px solid rgba(0,0,0,0.2)'
}

const miniBtnStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 10,
  border: '1px solid rgba(0,0,0,0.2)',
  background: '#f6f7f9',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 700,
  color: '#111'
}

const labelStyle: React.CSSProperties = {
  fontWeight: 700,
  marginBottom: 6,
  whiteSpace: 'normal',
  wordBreak: 'keep-all',
  overflowWrap: 'normal'
}

const helpStyle: React.CSSProperties = {
  fontSize: 12,
  opacity: 0.75,
  marginBottom: 8,
  whiteSpace: 'normal',
  wordBreak: 'keep-all',
  overflowWrap: 'normal'
}

// Migra dai vecchi campi fissi alle nuove tab
function migrateLegacyFields(cfg: any): TabConfig[] {
  let tabs: TabConfig[] = []
  
  // Se ha già tabs, usa quelle
  if (Array.isArray(cfg.tabs) && cfg.tabs.length > 0) {
    tabs = cfg.tabs
  } else {
    // Altrimenti migra dai campi legacy
    tabs = [
      {
        id: 'anagrafica',
        label: 'Anagrafica',
        fields: Array.isArray(cfg.anagraficaFields) ? cfg.anagraficaFields : []
      },
      {
        id: 'violazione',
        label: 'Violazione',
        fields: Array.isArray(cfg.violazioneFields) ? cfg.violazioneFields : []
      },
      {
        id: 'iter',
        label: 'Iter',
        fields: Array.isArray(cfg.iterExtraFields) ? cfg.iterExtraFields : [],
        isIterTab: true
      },
      {
        id: 'allegati',
        label: 'Allegati',
        fields: Array.isArray(cfg.allegatiFields) ? cfg.allegatiFields : []
      },
      {
        id: 'azioni',
        label: 'Azioni',
        fields: []
      }
    ]
  }
  
  // Rimuovi locked dalla tab azioni se esiste (per retrocompatibilità)
  return tabs.map(tab => {
    if (tab.id === 'azioni') {
      const { locked, ...rest } = tab
      return rest
    }
    return tab
  })
.map(tab => ({ ...tab, hideEmpty: (tab as any).hideEmpty ?? (tab.id === 'violazione') }))
}

function asJs<T = any> (v: any): T {
  return v?.asMutable ? v.asMutable({ deep: true }) : v
}

function parseNum (v: any, fallback: number): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function RowBlock (props: { label: string, help?: string, children: React.ReactNode }) {
  return (
    <div style={{ width: '100%', marginBottom: 12 }}>
      <div style={labelStyle}>{props.label}</div>
      {props.help && <div style={helpStyle}>{props.help}</div>}
      {props.children}
    </div>
  )
}

// TabsManager per gestire tab dinamiche
function TabsManager (props: { tabs: TabConfig[], onChange: (tabs: TabConfig[]) => void }) {
  const [dragFrom, setDragFrom] = React.useState<number | null>(null)
  const [dragOver, setDragOver] = React.useState<number | null>(null)

  const tabs = Array.isArray(props.tabs) ? props.tabs : []

  const updateTab = (index: number, updates: Partial<TabConfig>) => {
    const next = tabs.map((t, i) => i === index ? { ...t, ...updates } : t)
    props.onChange(next)
  }

  const removeTab = (index: number) => {
    const tab = tabs[index]
    if (tab?.locked) return
    const next = tabs.filter((_, i) => i !== index)
    props.onChange(next)
  }

  const addTab = () => {
    const newId = `tab_${Date.now()}`
    const newTab: TabConfig = {
      id: newId,
      label: 'Nuova Tab',
      fields: []
    }
    props.onChange([...tabs, newTab])
  }

  const reorder = (from: number, to: number) => {
    if (from === to) return
    const arr = [...tabs]
    const [moved] = arr.splice(from, 1)
    arr.splice(to, 0, moved)
    props.onChange(arr)
  }

  const handleDragStart = (index: number) => {
    setDragFrom(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOver(index)
  }

  const handleDrop = (index: number) => {
    if (dragFrom !== null && dragFrom !== index) {
      reorder(dragFrom, index)
    }
    setDragFrom(null)
    setDragOver(null)
  }

  const handleDragEnd = () => {
    setDragFrom(null)
    setDragOver(null)
  }

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '5px 8px',
    borderRadius: 6,
    border: '1px solid rgba(0,0,0,0.12)',
    background: '#fff',
    marginBottom: 6
  }

  const dragOverStyle: React.CSSProperties = {
    ...rowStyle,
    borderColor: '#0078da',
    background: '#eaf2ff'
  }

  const handleStyle: React.CSSProperties = {
    cursor: 'grab',
    fontSize: 16,
    color: 'rgba(0,0,0,0.5)',
    userSelect: 'none',
    padding: '0 3px'
  }

  const inputSty: React.CSSProperties = {
    flex: 1,
    padding: '4px 7px',
    borderRadius: 5,
    border: '1px solid rgba(0,0,0,0.2)',
    fontSize: 12
  }

  const btnStyle: React.CSSProperties = {
    padding: '4px 8px',
    borderRadius: 5,
    border: '1px solid rgba(0,0,0,0.2)',
    background: '#f6f7f9',
    cursor: 'pointer',
    fontSize: 11,
    fontWeight: 700
  }

  const removeBtnStyle: React.CSSProperties = {
    ...btnStyle,
    background: '#fee',
    color: '#d13438'
  }

  return (
    <div style={{ width: '100%' }}>
      <div style={{ marginBottom: 8 }}>
        {tabs.map((tab, index) => {
          const isDragging = dragFrom === index
          const isOver = dragOver === index
          const style = isOver ? dragOverStyle : rowStyle

          return (
            <div
              key={tab.id}
              draggable={!tab.locked}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={() => handleDrop(index)}
              onDragEnd={handleDragEnd}
              style={{
                ...style,
                opacity: isDragging ? 0.5 : 1
              }}
            >
              {!tab.locked && (
                <span style={handleStyle} title="Trascina per riordinare">
                  ☰
                </span>
              )}
              
              <input
                type="text"
                style={inputSty}
                value={tab.label}
                onChange={(e) => updateTab(index, { label: e.target.value })}
                placeholder="Nome tab"
                disabled={tab.locked && tab.id === 'azioni'}
              />

              {tab.locked && (
                <span style={{ fontSize: 10, opacity: 0.6, whiteSpace: 'nowrap' }}>
                  [Bloccata]
                </span>
              )}

              {!tab.locked && (
                <button
                  type='button'
                  style={removeBtnStyle}
                  onClick={() => removeTab(index)}
                  title="Rimuovi tab"
                >
                  ✕
                </button>
              )}
            </div>
          )
        })}
      </div>

      <button
        type='button'
        style={{
          ...btnStyle,
          width: '100%',
          background: '#eaf2ff',
          color: '#0078da',
          borderColor: '#0078da'
        }}
        onClick={addTab}
      >
        + Aggiungi Tab
      </button>
    </div>
  )
}

function ColorControl (props: { label: string, value: string, onChange: (v: string) => void }) {
  const v = props.value || ''
  const hex = isHexColor(v) ? v : '#000000'

  return (
    <RowBlock label={props.label}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', width: '100%' }}>
        <input
          type='text'
          style={{ ...inputStyle, flex: 1 }}
          value={v}
          onChange={(e) => props.onChange((e.target as HTMLInputElement).value)}
          placeholder='#rrggbb'
        />
        <input
          type='color'
          value={hex}
          onChange={(e) => props.onChange((e.target as HTMLInputElement).value)}
          title='Scegli colore'
          style={{ width: 44, height: 34, padding: 0, border: '1px solid rgba(0,0,0,0.2)', borderRadius: 10 }}
        />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
        {PRESET_COLORS.map(c => (
          <button
            key={c}
            type='button'
            onClick={() => props.onChange(c)}
            title={c}
            style={{
              width: 22,
              height: 22,
              borderRadius: 7,
              border: '1px solid rgba(0,0,0,0.18)',
              background: c,
              cursor: 'pointer'
            }}
          />
        ))}
      </div>
    </RowBlock>
  )
}

function NumberControl (props: { label: string, value: number, min?: number, max?: number, step?: number, onChange: (v: number) => void }) {
  return (
    <RowBlock label={props.label}>
      <input
        type='number'
        style={inputStyle}
        value={Number.isFinite(props.value) ? props.value : 0}
        min={props.min}
        max={props.max}
        step={props.step ?? 1}
        onChange={(e) => props.onChange(parseNum((e.target as HTMLInputElement).value, props.value))}
      />
    </RowBlock>
  )
}

function TextControl (props: { label: string, value: string, onChange: (v: string) => void }) {
  return (
    <RowBlock label={props.label}>
      <input
        type='text'
        style={inputStyle}
        value={props.value}
        onChange={(e) => props.onChange((e.target as HTMLInputElement).value)}
      />
    </RowBlock>
  )
}

function normalizeStrArray (v: any): string[] {
  const js = asJs<any>(v)
  const arr = Array.isArray(js) ? js : []
  return arr.map(x => String(x)).filter(Boolean)
}

function FieldPicker (props: {
  tab: TabConfig
  allFields: FieldOpt[]
  onChange: (fields: string[]) => void
  onTabPatch: (patch: Partial<TabConfig>) => void
}) {
  const { tab, allFields, onTabPatch } = props
  const title = tab.label
  const help = tab.isIterTab 
    ? 'In "Iter" i blocchi DT/DA sono sempre visibili. Qui aggiungi campi extra sotto i blocchi.'
    : undefined
  
  const [q, setQ] = React.useState('')
  const [open, setOpen] = React.useState(false)
  const [dragFrom, setDragFrom] = React.useState<number | null>(null)
  const [dragOver, setDragOver] = React.useState<number | null>(null)
  const wrapRef = React.useRef<HTMLDivElement>(null)

  const selected = Array.isArray(tab.fields) ? tab.fields : []
  const selectedSet = React.useMemo(() => new Set(selected), [selected])

  React.useEffect(() => {
    if (!open) return
    const onDown = (ev: MouseEvent) => {
      const el = wrapRef.current
      const target = ev.target as any
      if (!el) return
      if (!el.contains(target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown, true)
    return () => document.removeEventListener('mousedown', onDown, true)
  }, [open])

  const filtered = React.useMemo(() => {
    const qq = (q || '').trim().toLowerCase()
    const list = Array.isArray(allFields) ? allFields : []
    if (!qq) return list
    return list.filter(f =>
      (f.alias || '').toLowerCase().includes(qq) ||
      (f.name || '').toLowerCase().includes(qq)
    )
  }, [q, allFields])

  const toggle = (name: string) => {
    if (!name) return
    const has = selectedSet.has(name)
    const next = has ? selected.filter(x => x !== name) : [...selected, name]
    props.onChange(next)
  }

  const bulkSelect = (mode: 'add' | 'remove') => {
    const names = filtered.map(f => f.name).filter(Boolean)
    if (!names.length) return
    if (mode === 'add') {
      const next = Array.from(new Set([...selected, ...names]))
      props.onChange(next)
    } else {
      const rm = new Set(names)
      const next = selected.filter(n => !rm.has(n))
      props.onChange(next)
    }
  }

  const remove = (name: string) => {
    const next = selected.filter(x => x !== name)
    props.onChange(next)
  }

  const reorder = (from: number, to: number) => {
    if (from === to) return
    const arr = [...selected]
    const [moved] = arr.splice(from, 1)
    arr.splice(to, 0, moved)
    props.onChange(arr)
  }

  const selectedOpts = React.useMemo(() => {
    const map = new Map<string, FieldOpt>()
    ;(Array.isArray(allFields) ? allFields : []).forEach(f => map.set(f.name, f))
    return selected.map(n => map.get(n) || { name: n, alias: n })
  }, [selected, allFields])

  const preview = (() => {
    if (!selectedOpts.length) return 'Seleziona...'
    const first = selectedOpts[0]
    const a = (first.alias || first.name || '').trim()
    if (selectedOpts.length === 1) return a
    return `${a} +${selectedOpts.length - 1}`
  })()

  const triggerStyle: React.CSSProperties = {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 10px',
    border: '1px solid rgba(255,255,255,0.18)',
    borderRadius: 10,
    background: 'rgba(255,255,255,0.06)',
    color: '#fff',
    cursor: 'pointer',
    boxSizing: 'border-box',
    userSelect: 'none'
  }

  const badgeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 10px',
    borderRadius: 999,
    background: '#ffffff',
    color: '#111',
    fontSize: 12,
    fontWeight: 800
  }

  const popupStyle: React.CSSProperties = {
    position: 'absolute',
    zIndex: 1000,
    top: 'calc(100% + 8px)',
    left: 0,
    right: 0,
    borderRadius: 12,
    border: '1px solid rgba(0,0,0,0.15)',
    background: '#fff',
    boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
    padding: 10,
    boxSizing: 'border-box'
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%' }}>
      <div
        style={triggerStyle}
        role='button'
        tabIndex={0}
        onClick={() => setOpen(v => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') setOpen(v => !v)
        }}
        title='Seleziona campi'
      >
        <div style={badgeStyle}>{selected.length} selezionati</div>
        <div style={{ flex: 1, minWidth: 0, fontSize: 12, opacity: 0.95, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {preview}
        </div>
        <div style={{ fontWeight: 900, opacity: 0.9 }}>{open ? '▲' : '▼'}</div>
      </div>

      {open && (
        <div style={popupStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
            <div style={{ fontWeight: 900, fontSize: 13, color: '#111' }}>{title} — selezione campi</div>
            <button
              type='button'
              onClick={() => setOpen(false)}
              style={{ border: '1px solid rgba(0,0,0,0.2)', borderRadius: 10, padding: '6px 10px', background: '#fff', cursor: 'pointer' }}
            >
              Chiudi
            </button>
          </div>

          {help && (
            <div style={{ fontSize: 12, color: '#111', opacity: 0.75, marginBottom: 10 }}>
              {help}
            </div>
          )}

          
          {/* Opzioni tab */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <input
              type='checkbox'
              checked={!!tab.hideEmpty}
              onChange={(e) => onTabPatch({ hideEmpty: (e.target as HTMLInputElement).checked })}
            />
            <span style={{ fontSize: 12, fontWeight: 800, color: '#111' }}>Nascondi campi vuoti (solo questa tab)</span>
          </div>

{/* Selected (order) */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 6, color: '#111' }}>Selezionati (ordine)</div>
            <div style={{ border: '1px solid rgba(0,0,0,0.12)', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {selectedOpts.map((f, idx) => {
                  const alias = (f.alias || f.name || '').trim()
                  const name = f.name
                  const bg = idx % 2 === 0 ? '#ffffff' : '#fbfbfb'
                  const isOver = dragOver === idx
                  return (
                    <div
                      key={name}
                      title={`${alias} (${name}) - trascina per riordinare`}
                      draggable
                      onDragStart={() => setDragFrom(idx)}
                      onDragEnter={() => setDragOver(idx)}
                      onDragOver={(e) => {
                        e.preventDefault()
                      }}
                      onDrop={(e) => {
                        e.preventDefault()
                        const from = dragFrom
                        const to = idx
                        if (from !== null) reorder(from, to)
                        setDragFrom(null)
                        setDragOver(null)
                      }}
                      onDragEnd={() => {
                        setDragFrom(null)
                        setDragOver(null)
                      }}
                      style={{
                        display: 'flex',
                        gap: 8,
                        alignItems: 'center',
                        padding: '7px 10px',
                        borderBottom: '1px solid rgba(0,0,0,0.06)',
                        background: bg,
                        color: '#111',
                        outline: isOver ? '2px dashed rgba(47,111,237,0.9)' : 'none',
                        outlineOffset: -2,
                        cursor: 'grab'
                      }}
                    >
                      <div style={{ width: 22, textAlign: 'center', fontWeight: 900, opacity: 0.85, userSelect: 'none', cursor: 'grab', fontSize: 16, lineHeight: '16px' }}>≡</div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 900, fontSize: 12, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{alias}</div>
                      </div>

                      <button
                        type='button'
                        onClick={() => remove(name)}
                        title='Rimuovi'
                        style={{ border: '1px solid rgba(0,0,0,0.15)', borderRadius: 8, padding: '4px 8px', cursor: 'pointer', background: '#fff', color: '#111' }}
                      >
                        ✕
                      </button>
                    </div>
                  )
                })}
                {!selectedOpts.length && (
                  <div style={{ padding: 10, fontSize: 12, opacity: 0.75, color: '#111' }}>Nessun campo selezionato.</div>
                )}
              </div>
            </div>

            <div style={{ marginTop: 8, fontSize: 11, opacity: 0.75, color: '#111' }}>
              Suggerimento: trascina i campi per cambiare l’ordine.
            </div>
          </div>

          {/* All fields */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 6, color: '#111' }}>Tutti i campi</div>
            <input
              type='text'
              value={q}
              onChange={(e) => setQ((e.target as HTMLInputElement).value)}
              style={{ ...inputStyle, marginBottom: 8, color: '#111', background: '#fff' }}
              placeholder='Cerca per alias o nome...'
            />
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <button
                type='button'
                onClick={() => bulkSelect('add')}
                style={{ ...miniBtnStyle }}
                title='Seleziona tutti i campi filtrati (in base alla ricerca)'
              >
                Seleziona tutti
              </button>
              <button
                type='button'
                onClick={() => bulkSelect('remove')}
                style={{ ...miniBtnStyle }}
                title='Deseleziona tutti i campi filtrati (in base alla ricerca)'
              >
                Deseleziona tutti
              </button>
            </div>

            <div style={{ border: '1px solid rgba(0,0,0,0.12)', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
              <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                {filtered.map((f, idx) => {
                  const checked = selectedSet.has(f.name)
                  const bg = idx % 2 === 0 ? '#ffffff' : '#fbfbfb'
                  const alias = (f.alias || f.name || '').trim()
                  const name = f.name
                  return (
                    <label
                      key={name}
                      title={name}
                      style={{
                        display: 'flex',
                        gap: 8,
                        alignItems: 'center',
                        padding: '7px 10px',
                        borderBottom: '1px solid rgba(0,0,0,0.06)',
                        background: bg,
                        cursor: 'pointer',
                        color: '#111'
                      }}
                    >
                      <input
                        type='checkbox'
                        checked={checked}
                        onChange={() => toggle(name)}
                      />
                      <div style={{ display: 'grid' }}>
                        <div style={{ fontWeight: 800, fontSize: 12, color: '#111' }}>{alias}</div>
                      </div>
                    </label>
                  )
                })}
                {!filtered.length && (
                  <div style={{ padding: 10, fontSize: 12, opacity: 0.75, color: '#111' }}>Nessun campo.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


function PresetManager (props: {
  presets: any[]
  activePresetId: string
  onSetActive: (id: string) => void
  onApply: (p: any) => void
  onSaveNew: (name: string) => void
  onUpdateActive: (id: string) => void
  onDelete: (id: string) => void
}) {
  const { presets } = props
  const [name, setName] = React.useState('')
  const active = (presets || []).find(p => String(p.id) === String(props.activePresetId)) as any

  const btn: React.CSSProperties = {
    border: '1px solid rgba(0,0,0,0.18)',
    background: '#fff',
    borderRadius: 8,
    padding: '5px 8px',
    fontSize: 11,
    fontWeight: 800,
    cursor: 'pointer',
    color: '#111',
    whiteSpace: 'nowrap'
  }
  const btnDisabled: React.CSSProperties = { ...btn, opacity: 0.45, cursor: 'not-allowed' }

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {/* Select dropdown a tutta larghezza */}
      <div>
        <select
          value={props.activePresetId || ''}
          onChange={(e) => props.onSetActive((e.target as HTMLSelectElement).value)}
          style={{ 
            padding: '6px 10px', 
            borderRadius: 10, 
            border: '1px solid rgba(0,0,0,0.18)', 
            fontSize: 13, 
            width: '100%',
            background: '#fff', 
            color: '#111' 
          }}
          title='Seleziona un preset'
        >
          <option value=''>— nessun preset —</option>
          {(presets || []).map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))
}
        </select>
      </div>

      {/* Bottoni azioni preset */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button type='button' style={active ? btn : btnDisabled} disabled={!active} onClick={() => active && props.onApply(active)}>
          Applica
        </button>
        <button type='button' style={active ? btn : btnDisabled} disabled={!active} onClick={() => active && props.onUpdateActive(active.id)}>
          Aggiorna
        </button>
        <button type='button' style={active ? btn : btnDisabled} disabled={!active} onClick={() => active && props.onDelete(active.id)}>
          Elimina
        </button>
      </div>

      {/* Salva nuovo preset */}
      <div style={{ display: 'grid', gap: 6 }}>
        <input
          type='text'
          value={name}
          onChange={(e) => setName((e.target as HTMLInputElement).value)}
          placeholder='Nome nuovo preset (es. DIR, RI...)'
          style={{ 
            padding: '6px 10px', 
            borderRadius: 8, 
            border: '1px solid rgba(0,0,0,0.18)', 
            fontSize: 12, 
            width: '100%',
            background: '#fff', 
            color: '#111' 
          }}
        />
        <button
          type='button'
          style={name.trim() ? { ...btn, width: '100%' } : { ...btnDisabled, width: '100%' }}
          disabled={!name.trim()}
          onClick={() => {
            const nm = name.trim()
            if (!nm) return
            props.onSaveNew(nm)
            setName('')
          }}
          title='Salva come nuovo preset'
        >
          Salva come nuovo
        </button>
      </div>

      {active && (
        <div style={{ fontSize: 12, opacity: 0.75, color: '#111' }}>
          Preset attivo: <b>{active.name}</b>
        </div>
      )}
    </div>
  )
}

export default function Setting (props: Props) {
  const dsTypes = Immutable([DataSourceTypes.FeatureLayer])

  const cfgJs: any = { ...defaultConfig, ...(asJs(props.config) as any || {}) }
  const baseCfg = props.config || (Immutable(defaultConfig) as any)

  const setCfgPatch = (patch: Record<string, any>) => {
    let next = baseCfg
    Object.entries(patch).forEach(([k, v]) => {
      if (k === 'rejectReasons' || k === 'tabs' || k === 'anagraficaFields' || k === 'violazioneFields' || k === 'allegatiFields' || k === 'iterExtraFields' || k === 'presets') {
        next = next.set(k, Immutable((v || []) as any) as any)
      } else {
        next = next.set(k, v)
      }
    })
    props.onSettingChange({ id: props.id, config: next })
  }

  const onMainDsChange = (useDataSources: UseDataSource[]) => {
    props.onSettingChange({ id: props.id, useDataSources: useDataSources as any })
  }

  const onToggleUseDataEnabled = (useDataSourcesEnabled: boolean) => {
    props.onSettingChange({ id: props.id, useDataSourcesEnabled })
  }

  // Legge i campi dal primo datasource selezionato
  const useDsImm: any = props.useDataSources ?? Immutable([])
  const useDsJs: any[] = asJs(useDsImm) || []
  const primaryDsId = String(useDsJs?.[0]?.dataSourceId || '')

  const [fields, setFields] = React.useState<FieldOpt[]>([])

  React.useEffect(() => {
    let cancelled = false

    const load = async () => {
      if (!primaryDsId) {
        if (!cancelled) setFields([])
        return
      }

      try {
        const dsm = DataSourceManager.getInstance()
        const ds: any = dsm.getDataSource(primaryDsId)
        const schema = ds?.getSchema?.()
        const fobj = schema?.fields || {}
        const opts: FieldOpt[] = Object.keys(fobj).map((name) => {
          const f = fobj[name] || {}
          return {
            name,
            alias: String(f.alias || f.label || f.title || name),
            type: String(f.type || '')
          }
        }).sort((a, b) => (a.alias || a.name).localeCompare((b.alias || b.name), 'it', { sensitivity: 'base' }))

        if (!cancelled) setFields(opts)
      } catch {
        if (!cancelled) setFields([])
      }
    }

    load()
    return () => { cancelled = true }
  }, [primaryDsId])

  const reasons = normalizeStrArray(cfgJs.rejectReasons ?? defaultConfig.rejectReasons)

  // Migra e normalizza tabs
  const tabs = migrateLegacyFields(cfgJs)

  const updateTab = (index: number, updates: Partial<TabConfig>) => {
    const next = tabs.map((t, i) => i === index ? { ...t, ...updates } : t)
    setCfgPatch({ tabs: next })
  }

  const updateTabFields = (index: number, fields: string[]) => {
    updateTab(index, { fields })
  }

  return (
    <div className='p-3' style={{ width: '100%' }}>
      <SettingSection title='Dati'>
        <RowBlock
          label='Data source (selezione multipla)'
          help='Seleziona una o più Data View / feature layer. Il runtime userà automaticamente quella “attiva” (quella che ha la selezione corrente).'
        >
          <div style={{ width: '100%' }}>
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
          </div>
        </RowBlock>

        <RowBlock label='Ruolo' help='DT = Direttore Tecnico, DA = Direttore Amministrativo.'>
          <select
            style={inputStyle}
            value={(cfgJs.roleCode || 'DT').toString().toUpperCase()}
            onChange={(e) => setCfgPatch({ roleCode: (e.target as HTMLSelectElement).value })}
          >
            <option value='DT'>DT</option>
            <option value='DA'>DA</option>
          </select>
        </RowBlock>

        <RowBlock label='Testo bottone “Prendi in carico”'>
          <input
            type='text'
            style={inputStyle}
            value={cfgJs.buttonText ?? 'Prendi in carico'}
            onChange={(e) => setCfgPatch({ buttonText: (e.target as HTMLInputElement).value })}
          />
        </RowBlock>
      </SettingSection>

      <SettingSection title='Gestione Tab'>
        <RowBlock
          label='Configurazione Tab'
          help='Modifica i nomi, aggiungi/rimuovi tab, e riordina trascinando.'
        >
          <TabsManager
            tabs={tabs}
            onChange={(newTabs) => setCfgPatch({ tabs: newTabs })}
          />
        </RowBlock>
      </SettingSection>

      <SettingSection title='Campi per Tab'>
        <RowBlock
          label='Selezione e ordine campi'
          help='Spunta i campi che vuoi visualizzare in ciascuna tab e usa ↑ ↓ per l’ordine. Se una tab è vuota, il runtime usa un fallback “auto”.'
        >
          {!primaryDsId
            ? <div style={{ fontSize: 12, opacity: 0.75 }}>Seleziona prima un Data Source.</div>
            : null}
        </RowBlock>


        {tabs.map((tab, index) => {
          // Skip la tab Azioni che non ha campi configurabili
          if (tab.id === 'azioni') return null
          
          return (
            <FieldPicker
              key={tab.id}
              tab={tab}
              allFields={fields}
              onChange={(fields) => updateTabFields(index, fields)}
              onTabPatch={(patch) => updateTab(index, patch)}
            />
          )
        })}
      </SettingSection>
      <SettingSection title='Titolo pratica'>
        <TextControl label='Testo titolo' value={String(cfgJs.detailTitlePrefix ?? defaultConfig.detailTitlePrefix)} onChange={(v) => setCfgPatch({ detailTitlePrefix: v })} />
        <NumberControl label='Altezza riga (px)' value={parseNum(cfgJs.detailTitleHeight, defaultConfig.detailTitleHeight)} min={0} max={60} step={1} onChange={(v) => setCfgPatch({ detailTitleHeight: v })} />
        <NumberControl label='Spaziatura inferiore (px)' value={parseNum(cfgJs.detailTitlePaddingBottom, defaultConfig.detailTitlePaddingBottom)} min={0} max={30} step={1} onChange={(v) => setCfgPatch({ detailTitlePaddingBottom: v })} />
        <NumberControl label='Padding sinistro (px)' value={parseNum(cfgJs.detailTitlePaddingLeft, defaultConfig.detailTitlePaddingLeft)} min={0} max={50} step={1} onChange={(v) => setCfgPatch({ detailTitlePaddingLeft: v })} />
        <NumberControl label='Dimensione font (px)' value={parseNum(cfgJs.detailTitleFontSize, defaultConfig.detailTitleFontSize)} min={10} max={24} step={1} onChange={(v) => setCfgPatch({ detailTitleFontSize: v })} />
        <NumberControl label='Peso font' value={parseNum(cfgJs.detailTitleFontWeight, defaultConfig.detailTitleFontWeight)} min={100} max={900} step={100} onChange={(v) => setCfgPatch({ detailTitleFontWeight: v })} />
        <ColorControl label='Colore testo' value={String(cfgJs.detailTitleColor ?? defaultConfig.detailTitleColor)} onChange={(v) => setCfgPatch({ detailTitleColor: v })} />
      </SettingSection>

      <SettingSection title='Maschera (bordi e spazi)'>
        <NumberControl label='Offset esterno (px)' value={parseNum(cfgJs.maskOuterOffset, defaultConfig.maskOuterOffset)} min={0} max={50} step={1} onChange={(v) => setCfgPatch({ maskOuterOffset: v })} />
        <NumberControl label='Padding interno (px)' value={parseNum(cfgJs.maskInnerPadding, defaultConfig.maskInnerPadding)} min={0} max={50} step={1} onChange={(v) => setCfgPatch({ maskInnerPadding: v, panelPadding: v })} />
        <ColorControl label='Sfondo maschera' value={String(cfgJs.maskBg ?? defaultConfig.maskBg)} onChange={(v) => setCfgPatch({ maskBg: v, panelBg: v })} />
        <ColorControl label='Colore bordo maschera' value={String(cfgJs.maskBorderColor ?? defaultConfig.maskBorderColor)} onChange={(v) => setCfgPatch({ maskBorderColor: v, panelBorderColor: v })} />
        <NumberControl label='Spessore bordo (px)' value={parseNum(cfgJs.maskBorderWidth, defaultConfig.maskBorderWidth)} min={0} max={10} step={1} onChange={(v) => setCfgPatch({ maskBorderWidth: v, panelBorderWidth: v })} />
        <NumberControl label='Raggio bordo (px)' value={parseNum(cfgJs.maskBorderRadius, defaultConfig.maskBorderRadius)} min={0} max={30} step={1} onChange={(v) => setCfgPatch({ maskBorderRadius: v, panelBorderRadius: v })} />
        <ColorControl label='Colore divisori' value={String(cfgJs.dividerColor ?? defaultConfig.dividerColor)} onChange={(v) => setCfgPatch({ dividerColor: v })} />
      </SettingSection>

      <SettingSection title='Testi'>
        <NumberControl label='Dimensione titolo (px)' value={parseNum(cfgJs.titleFontSize, defaultConfig.titleFontSize)} min={12} max={20} step={1} onChange={(v) => setCfgPatch({ titleFontSize: v })} />
        <NumberControl label='Dimensione stato (px)' value={parseNum(cfgJs.statusFontSize, defaultConfig.statusFontSize)} min={11} max={18} step={1} onChange={(v) => setCfgPatch({ statusFontSize: v })} />
        <NumberControl label='Dimensione messaggi/avvisi (px)' value={parseNum(cfgJs.msgFontSize, defaultConfig.msgFontSize)} min={12} max={20} step={1} onChange={(v) => setCfgPatch({ msgFontSize: v })} />
      </SettingSection>

      <SettingSection title='Colori pulsanti'>
        <ColorControl label='Prendi in carico' value={String(cfgJs.takeColor ?? defaultConfig.takeColor)} onChange={(v) => setCfgPatch({ takeColor: v })} />
        <ColorControl label='Integrazione' value={String(cfgJs.integrazioneColor ?? defaultConfig.integrazioneColor)} onChange={(v) => setCfgPatch({ integrazioneColor: v })} />
        <ColorControl label='Approva' value={String(cfgJs.approvaColor ?? defaultConfig.approvaColor)} onChange={(v) => setCfgPatch({ approvaColor: v })} />
        <ColorControl label='Respingi' value={String(cfgJs.respingiColor ?? defaultConfig.respingiColor)} onChange={(v) => setCfgPatch({ respingiColor: v })} />
        <ColorControl label='Trasmetti a DA' value={String(cfgJs.trasmettiColor ?? defaultConfig.trasmettiColor)} onChange={(v) => setCfgPatch({ trasmettiColor: v })} />
      </SettingSection>

      <SettingSection title='Motivazioni respinta'>
        <RowBlock label='Voci elenco (menu a tendina)' help='Queste voci popolano il campo “Motivazione” quando fai “Respingi”.'>
          <div style={{ display: 'grid', gap: 8 }}>
            {reasons.map((r: string, idx: number) => {
              const isEven = idx % 2 === 0
              const bg = isEven ? (cfgJs.reasonsZebraEvenBg || defaultConfig.reasonsZebraEvenBg) : (cfgJs.reasonsZebraOddBg || defaultConfig.reasonsZebraOddBg)
              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    gap: 8,
                    alignItems: 'center',
                    padding: 8,
                    background: bg,
                    border: `${parseNum(cfgJs.reasonsRowBorderWidth, defaultConfig.reasonsRowBorderWidth)}px solid ${cfgJs.reasonsRowBorderColor || defaultConfig.reasonsRowBorderColor}`,
                    borderRadius: parseNum(cfgJs.reasonsRowRadius, defaultConfig.reasonsRowRadius)
                  }}
                >
                  <input
                    type='text'
                    style={{ ...inputStyle, flex: 1, margin: 0 }}
                    value={r}
                    onChange={(e) => {
                      const v = (e.target as HTMLInputElement).value
                      const next = reasons.slice()
                      next[idx] = v
                      setCfgPatch({ rejectReasons: next })
                    }}
                  />
                  <button
                    type='button'
                    onClick={() => {
                      const next = reasons.slice()
                      next.splice(idx, 1)
                      setCfgPatch({ rejectReasons: next })
                    }}
                    style={{
                      border: '1px solid rgba(0,0,0,0.2)',
                      borderRadius: 8,
                      padding: '6px 10px',
                      cursor: 'pointer'
                    }}
                    title='Rimuovi'
                  >
                    ✕
                  </button>
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
            <button
              type='button'
              onClick={() => setCfgPatch({ rejectReasons: [...reasons, ''] })}
              style={{
                border: '1px solid rgba(0,0,0,0.2)',
                borderRadius: 10,
                padding: '8px 12px',
                cursor: 'pointer',
                fontWeight: 800
              }}
            >
              + Aggiungi voce
            </button>
          </div>
        </RowBlock>
<RowBlock
          label='Gestione preset'
          help='Salva/carica set di campi selezionati per le TAB (utile per ruoli diversi: DIR, RI, ecc.).'
        >
          <PresetManager
            presets={(cfgJs.presets || []) as any[]}
            activePresetId={String(cfgJs.activePresetId || '')}
            onSetActive={(id) => setCfgPatch({ activePresetId: id })}
            onApply={(p) => {
              // Applica le tab dal preset
              if (Array.isArray(p.tabs)) {
                setCfgPatch({ tabs: p.tabs, activePresetId: p.id || '' })
              } else {
                // Fallback per vecchi preset con campi separati
                const migrated = migrateLegacyFields({
                  anagraficaFields: p.anagraficaFields || [],
                  violazioneFields: p.violazioneFields || [],
                  allegatiFields: p.allegatiFields || [],
                  iterExtraFields: p.iterExtraFields || []
                })
                setCfgPatch({ tabs: migrated, activePresetId: p.id || '' })
              }
            }}
            onSaveNew={(name) => {
              const id = String(Date.now())
              const next = [
                ...(cfgJs.presets || []),
                {
                  id,
                  name,
                  tabs
                }
              ]
              setCfgPatch({ presets: next, activePresetId: id })
            }}
            onUpdateActive={(id) => {
              const list = (cfgJs.presets || []) as any[]
              const next = list.map(p => p.id === id
                ? { ...p, tabs }
                : p
              )
              setCfgPatch({ presets: next })
            }}
            onDelete={(id) => {
              const list = (cfgJs.presets || []) as any[]
              const next = list.filter(p => p.id !== id)
              const nextActive = String(cfgJs.activePresetId || '') === id ? '' : String(cfgJs.activePresetId || '')
              setCfgPatch({ presets: next, activePresetId: nextActive })
            }}
          />
        </RowBlock>

      </SettingSection>

      {/* ── SEZIONE EDITING TI ─────────────────────────────────────── */}
      <SettingSection title='Editing TI'>

        <RowBlock label='Mostra pulsanti Modifica'>
          <Switch
            checked={cfgJs.showEditButtons !== false}
            onChange={(_: any, v: boolean) => setCfgPatch({ showEditButtons: v })}
          />
        </RowBlock>

        <RowBlock label='Colore pulsante "Modifica (overlay)"'>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type='color'
              value={cfgJs.editOverlayColor || '#7c3aed'}
              onChange={(e: any) => setCfgPatch({ editOverlayColor: e.target.value })}
              style={{ width: 36, height: 28, border: 'none', padding: 0, cursor: 'pointer' }}
            />
            <TextInput value={cfgJs.editOverlayColor || '#7c3aed'}
              onChange={(e: any) => setCfgPatch({ editOverlayColor: e.target.value })}
              style={{ width: 90 }}
            />
          </div>
        </RowBlock>

        <RowBlock label='Colore pulsante "Modifica (pagina)"'>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type='color'
              value={cfgJs.editPageColor || '#5b21b6'}
              onChange={(e: any) => setCfgPatch({ editPageColor: e.target.value })}
              style={{ width: 36, height: 28, border: 'none', padding: 0, cursor: 'pointer' }}
            />
            <TextInput value={cfgJs.editPageColor || '#5b21b6'}
              onChange={(e: any) => setCfgPatch({ editPageColor: e.target.value })}
              style={{ width: 90 }}
            />
          </div>
        </RowBlock>

        <RowBlock label='ID pagina editing (per navigazione)'>
          <TextInput
            value={cfgJs.editPageId || 'editing-ti'}
            onChange={(e: any) => setCfgPatch({ editPageId: e.target.value })}
            placeholder='editing-ti'
            style={{ width: '100%' }}
          />
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
            Inserisci l'ID della pagina ExB dedicata all'editing completo (con mappa).
          </div>
        </RowBlock>

        <RowBlock label='Campo presa in carico TI'>
          <TextInput
            value={cfgJs.fieldPresaTI || 'presa_in_carico_TI'}
            onChange={(e: any) => setCfgPatch({ fieldPresaTI: e.target.value })}
            placeholder='presa_in_carico_TI'
            style={{ width: '100%' }}
          />
        </RowBlock>

        <RowBlock label='Campo stato TI'>
          <TextInput
            value={cfgJs.fieldStatoTI || 'stato_TI'}
            onChange={(e: any) => setCfgPatch({ fieldStatoTI: e.target.value })}
            placeholder='stato_TI'
            style={{ width: '100%' }}
          />
        </RowBlock>

        <RowBlock label='Valore presa_in_carico_TI richiesto per editing'>
          <NumericInput
            value={cfgJs.editPresaRequiredVal ?? 2}
            min={0} max={10} step={1}
            onChange={(v: any) => setCfgPatch({ editPresaRequiredVal: Number(v) })}
            style={{ width: 70 }}
          />
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
            Default 2 = "Presa in carico". Il TI deve aver preso in carico la pratica.
          </div>
        </RowBlock>

        <RowBlock label='Valore minimo stato_TI per editing'>
          <NumericInput
            value={cfgJs.editMinStato ?? 2}
            min={0} max={10} step={1}
            onChange={(v: any) => setCfgPatch({ editMinStato: Number(v) })}
            style={{ width: 70 }}
          />
        </RowBlock>

        <RowBlock label='Valore massimo stato_TI per editing'>
          <NumericInput
            value={cfgJs.editMaxStato ?? 2}
            min={0} max={10} step={1}
            onChange={(v: any) => setCfgPatch({ editMaxStato: Number(v) })}
            style={{ width: 70 }}
          />
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
            Il pulsante è abilitato solo se stato_TI è compreso tra min e max (inclusi).
            Es. min=2 max=2 significa "solo quando ancora in lavorazione".
          </div>
        </RowBlock>

      </SettingSection>
    </div>
  )
}