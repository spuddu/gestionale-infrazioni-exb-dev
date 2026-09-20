/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { jsx } from 'jimu-core'
import AnteprimaPdfViewer from '../anteprima-pdf-viewer'
import GiiDocumentSidebar from './document-sidebar'
import type { GiiDocumentSidebarProps } from './document-sidebar'

type Props = GiiDocumentSidebarProps & {
  url: string | null
  fileName: string
  title: string
  subtitle?: string
  loading: boolean
  error?: string | null
  emptyText: string
  onClose?: () => void
  viewerBackgroundColor?: string
  pdfHeaderBackgroundColor?: string
  pdfPageAreaBackgroundColor?: string
  pdfThumbnailsBackgroundColor?: string
  pdfToolbarBackgroundColor?: string
  previewBorderColor?: string
  previewBorderWidth?: number
  previewBorderRadius?: number
}

export default function GiiDocumentViewer (props: Props) {
  const {
    url,
    fileName,
    title,
    subtitle,
    loading,
    error,
    emptyText,
    onClose,
    viewerBackgroundColor,
    pdfHeaderBackgroundColor,
    pdfPageAreaBackgroundColor,
    pdfThumbnailsBackgroundColor,
    pdfToolbarBackgroundColor,
    previewBorderColor,
    previewBorderWidth,
    previewBorderRadius,
    ...sidebarProps
  } = props
  const safeViewerBackgroundColor = String(viewerBackgroundColor || '#282828').trim() || '#282828'
  const safePreviewBorderWidth = Math.max(0, Number(previewBorderWidth ?? 0) || 0)
  const safePreviewBorderRadius = Math.max(0, Number(previewBorderRadius ?? 0) || 0)

  return (
    <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', alignItems: 'stretch', overflow: 'hidden', background: safeViewerBackgroundColor }}>
      <div style={{ flex: '1 1 auto', minWidth: 0, minHeight: 0, boxSizing: 'border-box', border: safePreviewBorderWidth > 0 ? `${safePreviewBorderWidth}px solid ${previewBorderColor || '#c6d7ea'}` : 'none', borderRadius: safePreviewBorderRadius, overflow: 'hidden' }}>
        <AnteprimaPdfViewer
          url={url}
          fileName={fileName}
          title={title}
          subtitle={subtitle}
          loading={loading}
          error={error}
          emptyText={emptyText}
          onClose={onClose}
          headerBackgroundColor={pdfHeaderBackgroundColor}
          pageAreaBackgroundColor={pdfPageAreaBackgroundColor}
          thumbnailsBackgroundColor={pdfThumbnailsBackgroundColor}
          toolbarBackgroundColor={pdfToolbarBackgroundColor}
        />
      </div>
      <GiiDocumentSidebar {...sidebarProps} />
    </div>
  )
}
