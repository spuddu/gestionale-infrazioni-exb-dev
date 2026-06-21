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
    ...sidebarProps
  } = props
  const safeViewerBackgroundColor = String(viewerBackgroundColor || '#282828').trim() || '#282828'

  return (
    <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', alignItems: 'stretch', overflow: 'hidden', background: safeViewerBackgroundColor }}>
      <div style={{ flex: '1 1 auto', minWidth: 0, minHeight: 0 }}>
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
