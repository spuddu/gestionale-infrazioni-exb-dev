/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx } from 'jimu-core'
import type { GiiAttachmentPrintOption, GiiDocumentPrintOptions, GiiNotaSpesePrintOption } from './document-options'

type DocumentKey = keyof Pick<GiiDocumentPrintOptions, 'includeRapporto' | 'includeNotaSpese' | 'includeMappa' | 'includeAllegati'>

export type GiiDocumentSidebarAvailability = {
  notaSpese: boolean
  mappa: boolean
  allegati: boolean
}

export type GiiDocumentSidebarProps = {
  width: number
  docOptions: GiiDocumentPrintOptions
  availability: GiiDocumentSidebarAvailability
  busy: boolean
  canUseMap: boolean
  mapPanelAvailable: boolean
  documentChecking?: Partial<Record<DocumentKey, boolean>>
  documentUnavailableExtra?: Partial<Record<DocumentKey, boolean>>
  notaSpeseOptions: GiiNotaSpesePrintOption[]
  attachmentOptions: GiiAttachmentPrintOption[]
  printableLayerTree: any[]
  expandedLayerGroups: Record<string, boolean>
  mapEmptyText: string
  regenerateHint?: string
  updateDocOption: (patch: Partial<GiiDocumentPrintOptions>) => void
  setNotaSpeseOptionVisible: (key: string, visible: boolean) => void
  setAttachmentOptionVisible: (id: number, visible: boolean) => void
  setMapLayerKeysVisible: (keys: string[], visible: boolean) => void
  setExpandedLayerGroups: (updater: (prev: Record<string, boolean>) => Record<string, boolean>) => void
  onRegenerate: () => void
}

function collectSidebarLayerKeys (node: any): string[] {
  const out: string[] = []
  const walk = (current: any) => {
    const itemKey = current?.item?.key
    if (itemKey) out.push(String(itemKey))
    const children = Array.isArray(current?.children) ? current.children : []
    children.forEach(walk)
  }
  walk(node)
  return out
}

export default function GiiDocumentSidebar (props: GiiDocumentSidebarProps) {
  const {
    width,
    docOptions,
    availability,
    busy,
    canUseMap,
    mapPanelAvailable,
    documentChecking,
    documentUnavailableExtra,
    notaSpeseOptions,
    attachmentOptions,
    printableLayerTree,
    expandedLayerGroups,
    mapEmptyText,
    regenerateHint,
    updateDocOption,
    setNotaSpeseOptionVisible,
    setAttachmentOptionVisible,
    setMapLayerKeysVisible,
    setExpandedLayerGroups,
    onRegenerate
  } = props

  const renderDocCheckbox = (key: DocumentKey, label: string) => {
    const checking = !!documentChecking?.[key]
    const unavailableBase = (
      key === 'includeNotaSpese' ? !availability.notaSpese :
      key === 'includeMappa' ? (!availability.mappa || !canUseMap) :
      key === 'includeAllegati' ? !availability.allegati :
      false
    )
    const unavailable = unavailableBase || !!documentUnavailableExtra?.[key]
    const disabled = busy || checking || unavailable
    const labelText = key === 'includeRapporto'
      ? label
      : `${label}${checking ? ' (...)' : (unavailable ? ' (n.d.)' : '')}`
    return (
      <label key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, minHeight: 24, fontSize: 13, color: disabled ? '#94a3b8' : '#334155', fontWeight: 800, whiteSpace: 'nowrap' }}>
        <input
          type='checkbox'
          checked={!!(docOptions as any)[key]}
          disabled={disabled}
          onChange={e => updateDocOption({ [key]: e.target.checked } as any)}
        />
        <span>{labelText}</span>
      </label>
    )
  }

  const renderPrintableLayerNode = (node: any, depth = 0): any => {
    const children = Array.isArray(node?.children) ? node.children : []
    const leafKeys = collectSidebarLayerKeys(node)
    const checkedCount = leafKeys.filter(key => docOptions.mapLayerVisibility[key] !== false).length
    const checked = leafKeys.length > 0 && checkedCount === leafKeys.length
    const partial = checkedCount > 0 && checkedCount < leafKeys.length
    const hasChildren = children.length > 0
    const expanded = !!expandedLayerGroups[node.key]
    const row = (
      <div key={node.key} style={{ display: 'grid', gridTemplateColumns: '16px minmax(0, 1fr) 18px', alignItems: 'center', gap: 8, minHeight: 24, paddingLeft: depth * 18, fontSize: 13, color: '#334155', fontWeight: hasChildren ? 800 : 600 }}>
        {hasChildren ? (
          <button
            type='button'
            onClick={() => setExpandedLayerGroups(prev => ({ ...prev, [node.key]: !prev[node.key] }))}
            aria-label={expanded ? 'Comprimi gruppo layer' : 'Espandi gruppo layer'}
            style={{ border: 0, background: 'transparent', padding: 0, width: 16, height: 20, lineHeight: '20px', cursor: 'pointer', color: '#334155', fontSize: 12 }}
          >
            {expanded ? '▼' : '▶'}
          </button>
        ) : (
          <span style={{ width: 16, height: 20 }} />
        )}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.title}</span>
        <input
          type='checkbox'
          checked={checked}
          disabled={busy || leafKeys.length === 0}
          ref={(el) => { if (el) el.indeterminate = partial }}
          onClick={e => { e.stopPropagation() }}
          onChange={e => setMapLayerKeysVisible(leafKeys, e.target.checked)}
        />
      </div>
    )
    if (!hasChildren) return row
    return (
      <div key={node.key} style={{ display: 'grid', gap: 4 }}>
        {row}
        {expanded && (
          <div style={{ display: 'grid', gap: 4 }}>
            {children.map(child => renderPrintableLayerNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <aside style={{ flex: `0 0 ${width}px`, width, minHeight: 0, overflow: 'auto', padding: 10, background: '#eef4fb', borderLeft: '1px solid #dbe4ef', color: '#0f172a', display: 'grid', alignContent: 'start', gap: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 900, color: '#0f172a' }}>Documenti</div>
      <div style={{ display: 'grid', gap: 8 }}>
        {renderDocCheckbox('includeRapporto', 'Rapporto tecnico')}
        {renderDocCheckbox('includeNotaSpese', 'Nota spese')}
        {renderDocCheckbox('includeMappa', 'Mappa')}
        {renderDocCheckbox('includeAllegati', 'Allegati')}
      </div>

      {docOptions.includeNotaSpese && availability.notaSpese && notaSpeseOptions.length > 0 && (
        <div style={{ display: 'grid', gap: 6, paddingTop: 8, borderTop: '1px solid #dbe4ef' }}>
          <div style={{ fontSize: 12, fontWeight: 900, color: '#334155' }}>Note spese da stampare</div>
          <div style={{ display: 'grid', gap: 5, maxHeight: 170, overflow: 'auto', padding: '6px 8px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff' }}>
            {notaSpeseOptions.map((item, idx) => {
              const checked = (docOptions.selectedNotaSpeseKeys || {})[item.key] !== false
              return (
                <label key={item.key} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 18px', alignItems: 'center', gap: 8, minHeight: 28, fontSize: 12.5, color: '#334155', fontWeight: 700 }}>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{`Nota spese ${idx + 1}`}</span>
                    <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#64748b', fontSize: 11, fontWeight: 600 }}>{item.label}</span>
                  </span>
                  <input
                    type='checkbox'
                    checked={checked}
                    disabled={busy}
                    onChange={e => setNotaSpeseOptionVisible(item.key, e.target.checked)}
                  />
                </label>
              )
            })}
          </div>
        </div>
      )}

      {docOptions.includeAllegati && availability.allegati && (
        <div style={{ display: 'grid', gap: 6, paddingTop: 8, borderTop: '1px solid #dbe4ef' }}>
          <div style={{ fontSize: 12, fontWeight: 900, color: '#334155' }}>Allegati da aprire</div>
          <div style={{ display: 'grid', gap: 5, maxHeight: 180, overflow: 'auto', padding: '6px 8px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff' }}>
            {attachmentOptions.map((att, idx) => {
              const checked = (docOptions.selectedAttachmentIds || {})[String(att.id)] !== false
              const meta = [att.name, att.contentType].filter(Boolean).join(' • ')
              return (
                <label key={att.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 18px', alignItems: 'center', gap: 8, minHeight: 28, fontSize: 12.5, color: '#334155', fontWeight: 700 }}>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{`Allegato ${idx + 1}`}</span>
                    {meta ? <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#64748b', fontSize: 11, fontWeight: 600 }}>{meta}</span> : null}
                  </span>
                  <input
                    type='checkbox'
                    checked={checked}
                    disabled={busy}
                    onChange={e => setAttachmentOptionVisible(att.id, e.target.checked)}
                  />
                </label>
              )
            })}
          </div>
        </div>
      )}

      {docOptions.includeMappa && mapPanelAvailable && (
        <div style={{ display: 'grid', gap: 9, paddingTop: 8, borderTop: '1px solid #dbe4ef' }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: '#0f172a' }}>Stampa mappa</div>
          <label style={{ display: 'grid', gap: 4, fontSize: 12, fontWeight: 800, color: '#334155' }}>
            Titolo
            <input type='text' value={docOptions.mapTitle} onChange={e => updateDocOption({ mapTitle: e.target.value })} style={{ padding: '7px 9px', border: '1px solid #cbd5e1', borderRadius: 8 }} />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 0.8fr', gap: 8 }}>
            <label style={{ display: 'grid', gap: 4, fontSize: 12, fontWeight: 800, color: '#334155' }}>
              Layout
              <select value={docOptions.mapLayout} onChange={e => updateDocOption({ mapLayout: e.target.value })} style={{ minWidth: 0, padding: '7px 8px', border: '1px solid #cbd5e1', borderRadius: 8 }}>
                <option value='A4 Portrait'>A4 Portrait</option>
                <option value='A4 Landscape'>A4 Landscape</option>
                <option value='A3 Portrait'>A3 Portrait</option>
                <option value='A3 Landscape'>A3 Landscape</option>
                <option value='MAP_ONLY'>MAP_ONLY</option>
              </select>
            </label>
            <label style={{ display: 'grid', gap: 4, fontSize: 12, fontWeight: 800, color: '#334155' }}>
              Mappa base
              <select value={docOptions.mapBasemap} onChange={e => updateDocOption({ mapBasemap: e.target.value })} style={{ minWidth: 0, padding: '7px 8px', border: '1px solid #cbd5e1', borderRadius: 8 }}>
                <option value='satellite'>Ortofoto</option>
                <option value='hybrid'>Ortofoto con etichette</option>
                <option value='topo-vector'>Topografica</option>
                <option value='streets-vector'>Stradale</option>
              </select>
            </label>
            <label style={{ display: 'grid', gap: 4, fontSize: 12, fontWeight: 800, color: '#334155' }}>
              Scala
              <input type='number' min={100} step={100} value={docOptions.mapScale} onChange={e => updateDocOption({ mapScale: Number(e.target.value) || 1000 })} style={{ minWidth: 0, padding: '7px 8px', border: '1px solid #cbd5e1', borderRadius: 8 }} />
            </label>
          </div>
          <div style={{ display: 'grid', gap: 5 }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: '#334155' }}>Layer da stampare</div>
            {printableLayerTree.length === 0 ? (
              <div style={{ fontSize: 12.5, color: '#64748b', lineHeight: 1.35 }}>{mapEmptyText}</div>
            ) : (
              <div style={{ display: 'grid', gap: 5, maxHeight: 220, overflow: 'auto', padding: '6px 8px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff' }}>
                {printableLayerTree.map(node => renderPrintableLayerNode(node))}
              </div>
            )}
          </div>
        </div>
      )}

      <button
        type='button'
        disabled={busy}
        onClick={onRegenerate}
        style={{
          width: '100%',
          minHeight: 34,
          border: '1px solid #1d4ed8',
          borderRadius: 8,
          background: busy ? '#93c5fd' : '#2563eb',
          color: '#fff',
          fontSize: 13,
          fontWeight: 900,
          cursor: busy ? 'default' : 'pointer'
        }}
      >
        {busy ? 'Rigenerazione...' : 'Rigenera documento'}
      </button>
      {regenerateHint ? (
        <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.35, fontWeight: 700 }}>
          {regenerateHint}
        </div>
      ) : null}
    </aside>
  )
}
