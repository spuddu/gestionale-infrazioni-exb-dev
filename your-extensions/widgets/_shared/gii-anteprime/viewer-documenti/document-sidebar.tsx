/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx } from 'jimu-core'
import type { GiiAttachmentPrintOption, GiiDocumentPrintOptions, GiiNotaSpesePrintOption } from './document-options'
import { getGiiAttachmentKind } from '../allegati/gii-attachment-viewer'

type DocumentKey = keyof Pick<GiiDocumentPrintOptions, 'includeRapporto' | 'includeNotaSpese' | 'includeMappa' | 'includeAllegatiTecnici' | 'includeAllegaiainistrativi' | 'includePropostaContestazione' | 'includeDeterminazione' | 'includeAttoContestazione'>

export type GiiDocumentSidebarAvailability = {
  notaSpese: boolean
  mappa: boolean
  allegati: boolean
  propostaContestazione?: boolean
  determinazione?: boolean
  attoContestazione?: boolean
}

export type GiiDocumentSidebarProps = {
  width: number
  backgroundColor?: string
  borderColor?: string
  borderWidth?: number
  borderMode?: 'inset' | 'left'
  paddingTop?: number
  paddingRight?: number
  paddingBottom?: number
  paddingLeft?: number
  docsCardBg?: string
  docsCardBorderColor?: string
  docsCardBorderWidth?: number
  docsCardBorderRadius?: number
  docsCardShadow?: string
  docsGroupGap?: number
  docsHeaderBg?: string
  docsHeaderColor?: string
  docsHeaderFontSize?: number
  docsHeaderFontWeight?: number
  docsHeaderPaddingX?: number
  docsHeaderPaddingY?: number
  docsBodyPadding?: number
  docsTextColor?: string
  docsDisabledTextColor?: string
  docOptions: GiiDocumentPrintOptions
  availability: GiiDocumentSidebarAvailability
  busy: boolean
  canUseMap: boolean
  mapPanelAvailable: boolean
  documentChecking?: Partial<Record<DocumentKey, boolean>>
  documentUnavailableExtra?: Partial<Record<DocumentKey, boolean>>
  showAdminDocuments?: boolean
  notaSpeseOptions: GiiNotaSpesePrintOption[]
  attachmentOptions: GiiAttachmentPrintOption[]
  printableLayerTree: any[]
  expandedLayerGroups: Record<string, boolean>
  mapEmptyText: string
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
    backgroundColor,
    borderColor,
    borderWidth,
    borderMode,
    paddingTop,
    paddingRight,
    paddingBottom,
    paddingLeft,
    docsCardBg,
    docsCardBorderColor,
    docsCardBorderWidth,
    docsCardBorderRadius,
    docsCardShadow,
    docsGroupGap,
    docsHeaderBg,
    docsHeaderColor,
    docsHeaderFontSize,
    docsHeaderFontWeight,
    docsHeaderPaddingX,
    docsHeaderPaddingY,
    docsBodyPadding,
    docsTextColor,
    docsDisabledTextColor,
    docOptions,
    availability,
    busy,
    canUseMap,
    mapPanelAvailable,
    documentChecking,
    documentUnavailableExtra,
    showAdminDocuments,
    notaSpeseOptions,
    attachmentOptions,
    printableLayerTree,
    expandedLayerGroups,
    mapEmptyText,
    updateDocOption,
    setNotaSpeseOptionVisible,
    setAttachmentOptionVisible,
    setMapLayerKeysVisible,
    setExpandedLayerGroups,
    onRegenerate
  } = props
  const hasCustomBorder = borderWidth != null || String(borderColor || '').trim() !== ''
  const safeBorderWidth = Math.max(0, Math.min(8, Number(borderWidth) || 0))
  const safeBorderColor = String(borderColor || '#dbe4ef').trim() || '#dbe4ef'
  const safeBorderMode = borderMode === 'left' ? 'left' : 'inset'
  const safeBackgroundColor = String(backgroundColor || '#eef4fb').trim() || '#eef4fb'
  const safePaddingTop = Math.max(0, Math.min(80, Number(paddingTop ?? 10) || 0))
  const safePaddingRight = Math.max(0, Math.min(80, Number(paddingRight ?? 10) || 0))
  const safePaddingBottom = Math.max(0, Math.min(80, Number(paddingBottom ?? 10) || 0))
  const safePaddingLeft = Math.max(0, Math.min(80, Number(paddingLeft ?? 10) || 0))
  const safeDocsCardBg = String(docsCardBg || '#f8fbff').trim() || '#f8fbff'
  const safeDocsCardBorderColor = String(docsCardBorderColor || '#c6d7ea').trim() || '#c6d7ea'
  const safeDocsCardBorderWidth = Math.max(0, Math.min(8, Number(docsCardBorderWidth ?? 1) || 0))
  const safeDocsCardBorderRadius = Math.max(0, Math.min(40, Number(docsCardBorderRadius ?? 8) || 0))
  const safeDocsCardShadow = String(docsCardShadow || '').trim() || 'none'
  const safeDocsGroupGap = Math.max(0, Math.min(40, Number(docsGroupGap ?? 10) || 0))
  const safeDocsHeaderBg = String(docsHeaderBg || 'linear-gradient(90deg, #0d3b66, #155e9d)').trim() || 'linear-gradient(90deg, #0d3b66, #155e9d)'
  const safeDocsHeaderColor = String(docsHeaderColor || '#ffffff').trim() || '#ffffff'
  const safeDocsHeaderFontSize = Math.max(9, Math.min(24, Number(docsHeaderFontSize ?? 12) || 12))
  const safeDocsHeaderFontWeight = Math.max(300, Math.min(900, Number(docsHeaderFontWeight ?? 900) || 900))
  const safeDocsHeaderPaddingX = Math.max(0, Math.min(30, Number(docsHeaderPaddingX ?? 10) || 0))
  const safeDocsHeaderPaddingY = Math.max(0, Math.min(24, Number(docsHeaderPaddingY ?? 7) || 0))
  const safeDocsBodyPadding = Math.max(0, Math.min(30, Number(docsBodyPadding ?? 10) || 0))
  const safeDocsTextColor = String(docsTextColor || '#334155').trim() || '#334155'
  const safeDocsDisabledTextColor = String(docsDisabledTextColor || '#94a3b8').trim() || '#94a3b8'
  const technicalAttachments = attachmentOptions.filter(att => getGiiAttachmentKind(att as any) === 'technical')
  const administrativeAttachments = attachmentOptions.filter(att => getGiiAttachmentKind(att as any) !== 'technical')

  const renderDocCheckbox = (key: DocumentKey, label: string) => {
    const checking = !!documentChecking?.[key]
    const unavailableBase = (
      key === 'includeNotaSpese' ? !availability.notaSpese :
      key === 'includeMappa' ? (!availability.mappa || !canUseMap) :
      key === 'includeAllegatiTecnici' ? technicalAttachments.length === 0 :
      key === 'includeAllegaiainistrativi' ? administrativeAttachments.length === 0 :
      key === 'includePropostaContestazione' ? !availability.propostaContestazione :
      key === 'includeDeterminazione' ? !availability.determinazione :
      key === 'includeAttoContestazione' ? !availability.attoContestazione :
      false
    )
    const unavailable = unavailableBase || !!documentUnavailableExtra?.[key]
    const disabled = busy || checking || unavailable
    const labelText = key === 'includeRapporto'
      ? label
      : `${label}${checking ? ' (...)' : (unavailable ? ' (n.d.)' : '')}`
    return (
      <label key={key} style={{ display: 'flex', width: '100%', minWidth: 0, alignItems: 'flex-start', gap: 7, minHeight: 24, fontSize: 13, color: disabled ? safeDocsDisabledTextColor : safeDocsTextColor, fontWeight: 800, lineHeight: 1.25, whiteSpace: 'normal' }}>
        <input
          type='checkbox'
          checked={!!(docOptions as any)[key]}
          disabled={disabled}
          onChange={e => updateDocOption({ [key]: e.target.checked } as any)}
        />
        <span style={{ flex: '1 1 auto', minWidth: 0, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{labelText}</span>
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
            {children.map((child: any) => renderPrintableLayerNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }


  const renderAttachmentList = (attachments: GiiAttachmentPrintOption[]) => (
    <div style={{ display: 'grid', gap: 5, maxHeight: 180, overflowY: 'auto', overflowX: 'hidden', padding: '6px 8px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', minWidth: 0 }}>
      {attachments.map((att, idx) => {
        const checked = (docOptions.selectedAttachmentIds || {})[String(att.id)] !== false
        const meta = [att.name, att.contentType].filter(Boolean).join(' • ')
        return (
          <label key={att.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 18px', alignItems: 'center', gap: 8, minHeight: 28, fontSize: 12.5, color: safeDocsTextColor, fontWeight: 700, minWidth: 0 }}>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{`Allegato ${idx + 1}`}</span>
              {meta ? <span style={{ display: 'block', overflowWrap: 'anywhere', wordBreak: 'break-word', color: '#64748b', fontSize: 11, fontWeight: 600 }}>{meta}</span> : null}
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
  )

  const renderMapOptions = () => (
    <div style={{ display: 'grid', gap: 9, marginLeft: 0, padding: '8px 0 2px 0', minWidth: 0 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 8, minWidth: 0 }}>
        <label style={{ display: 'grid', minWidth: 0, gap: 4, fontSize: 12, fontWeight: 800, color: safeDocsTextColor }}>
          Layout
          <select value={docOptions.mapLayout} onChange={e => updateDocOption({ mapLayout: e.target.value })} style={{ width: '100%', maxWidth: '100%', minWidth: 0, padding: '7px 8px', border: '1px solid #cbd5e1', borderRadius: 8, boxSizing: 'border-box' }}>
            <option value='A4 Portrait'>A4 Portrait</option>
            <option value='A4 Landscape'>A4 Landscape</option>
            <option value='A3 Portrait'>A3 Portrait</option>
            <option value='A3 Landscape'>A3 Landscape</option>
            <option value='MAP_ONLY'>MAP_ONLY</option>
          </select>
        </label>
        <label style={{ display: 'grid', minWidth: 0, gap: 4, fontSize: 12, fontWeight: 800, color: safeDocsTextColor }}>
          Mappa base
          <select value={docOptions.mapBasemap} onChange={e => updateDocOption({ mapBasemap: e.target.value })} style={{ width: '100%', maxWidth: '100%', minWidth: 0, padding: '7px 8px', border: '1px solid #cbd5e1', borderRadius: 8, boxSizing: 'border-box' }}>
            <option value='satellite'>Ortofoto</option>
            <option value='hybrid'>Ortofoto con etichette</option>
            <option value='topo-vector'>Topografica</option>
            <option value='streets-vector'>Stradale</option>
          </select>
        </label>
        <label style={{ display: 'grid', minWidth: 0, gap: 4, fontSize: 12, fontWeight: 800, color: safeDocsTextColor }}>
          Scala
          <input type='number' min={100} step={100} value={docOptions.mapScale} onChange={e => updateDocOption({ mapScale: Number(e.target.value) || 1000 })} style={{ width: '100%', maxWidth: '100%', minWidth: 0, padding: '7px 8px', border: '1px solid #cbd5e1', borderRadius: 8, boxSizing: 'border-box' }} />
        </label>
      </div>
      <div style={{ display: 'grid', gap: 5, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 900, color: safeDocsTextColor }}>Layer da stampare</div>
        {printableLayerTree.length === 0 ? (
          <div style={{ fontSize: 12.5, color: '#64748b', lineHeight: 1.35 }}>{mapEmptyText}</div>
        ) : (
          <div style={{ display: 'grid', gap: 5, maxHeight: 220, overflowY: 'auto', overflowX: 'hidden', padding: '6px 8px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', minWidth: 0 }}>
            {printableLayerTree.map(node => renderPrintableLayerNode(node))}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <aside style={{ flex: `0 0 ${width}px`, width, maxWidth: '100%', minWidth: 0, minHeight: 0, overflow: 'hidden', background: safeBackgroundColor, ...(hasCustomBorder ? (safeBorderMode === 'left' ? { borderLeft: safeBorderWidth > 0 ? `${safeBorderWidth}px solid ${safeBorderColor}` : 'none' } : { boxShadow: safeBorderWidth > 0 ? `inset 0 0 0 ${safeBorderWidth}px ${safeBorderColor}` : 'none' }) : { borderLeft: '1px solid #dbe4ef' }), color: '#0f172a', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', overflowWrap: 'anywhere' }}>
      <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: `${safePaddingTop}px ${safePaddingRight}px ${safePaddingBottom}px ${safePaddingLeft}px`, boxSizing: 'border-box' }}>
        <div style={{ display: 'grid', gap: safeDocsGroupGap }}>
        <section style={{ border: safeDocsCardBorderWidth > 0 ? `${safeDocsCardBorderWidth}px solid ${safeDocsCardBorderColor}` : 'none', borderRadius: safeDocsCardBorderRadius, background: safeDocsCardBg, boxShadow: safeDocsCardShadow, overflow: 'hidden', minWidth: 0 }}>
          <div style={{ padding: `${safeDocsHeaderPaddingY}px ${safeDocsHeaderPaddingX}px`, background: safeDocsHeaderBg, color: safeDocsHeaderColor, fontSize: safeDocsHeaderFontSize, fontWeight: safeDocsHeaderFontWeight as any, textTransform: 'uppercase', letterSpacing: 0.2 }}>Documenti tecnici</div>
          <div style={{ display: 'grid', gap: 8, padding: safeDocsBodyPadding }}>
            {renderDocCheckbox('includeRapporto', 'Rapporto tecnico')}
            {renderDocCheckbox('includeNotaSpese', 'Nota spese')}
            <div style={{ minWidth: 0 }}>
              {renderDocCheckbox('includeMappa', 'Mappa')}
              {docOptions.includeMappa && mapPanelAvailable && renderMapOptions()}
            </div>
            <div style={{ minWidth: 0 }}>
              {renderDocCheckbox('includeAllegatiTecnici', 'Allegati')}
              {docOptions.includeAllegatiTecnici && technicalAttachments.length > 0 && (
                <div style={{ marginLeft: 0, paddingTop: 6, minWidth: 0 }}>
                  {renderAttachmentList(technicalAttachments)}
                </div>
              )}
            </div>
          </div>
        </section>

        {showAdminDocuments && (
          <section style={{ border: safeDocsCardBorderWidth > 0 ? `${safeDocsCardBorderWidth}px solid ${safeDocsCardBorderColor}` : 'none', borderRadius: safeDocsCardBorderRadius, background: safeDocsCardBg, boxShadow: safeDocsCardShadow, overflow: 'hidden', minWidth: 0 }}>
            <div style={{ padding: `${safeDocsHeaderPaddingY}px ${safeDocsHeaderPaddingX}px`, background: safeDocsHeaderBg, color: safeDocsHeaderColor, fontSize: safeDocsHeaderFontSize, fontWeight: safeDocsHeaderFontWeight as any, textTransform: 'uppercase', letterSpacing: 0.2 }}>Documenti amministrativi</div>
            <div style={{ display: 'grid', gap: 8, padding: safeDocsBodyPadding }}>
              {renderDocCheckbox('includePropostaContestazione', 'Proposta di contestazione')}
              {renderDocCheckbox('includeDeterminazione', 'Determinazione dirigenziale')}
              {renderDocCheckbox('includeAttoContestazione', 'Atto di accertamento/contestazione')}
              <div style={{ minWidth: 0 }}>
                {renderDocCheckbox('includeAllegaiainistrativi', 'Allegati')}
                {docOptions.includeAllegaiainistrativi && administrativeAttachments.length > 0 && (
                  <div style={{ marginLeft: 0, paddingTop: 6, minWidth: 0 }}>
                    {renderAttachmentList(administrativeAttachments)}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </div>

        {docOptions.includeNotaSpese && availability.notaSpese && notaSpeseOptions.length > 0 && (
          <div style={{ display: 'grid', gap: 6, marginTop: 10, paddingTop: 8, borderTop: '1px solid #dbe4ef' }}>
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
      </div>

      <div style={{ flex: '0 0 auto', padding: `0 ${safePaddingRight}px ${safePaddingBottom}px ${safePaddingLeft}px`, background: safeBackgroundColor, boxSizing: 'border-box' }}>
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
      </div>
    </aside>
  )
}
