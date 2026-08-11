/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx } from 'jimu-core'
import AnteprimaPdfViewer from '../anteprima-pdf-viewer'

export type GiiAttachmentViewerItem = {
  id: number | string
  name?: string
  size?: number
  contentType?: string
  url?: string
  originalUrl?: string
  previewUrl?: string
  keywords?: string
  created?: number
  creationDate?: number
  createdAt?: number
  lastEditDate?: number
  editDate?: number
  uploadedAt?: number
  groupTitle?: string
  readOnly?: boolean
  readOnlyReason?: string
}

export type GiiAttachmentKind = 'technical' | 'administrative' | 'bozza-determinazione' | 'proposta-contestazione' | 'internal-reference'

export const GII_ATTACHMENT_KEYWORDS = {
  technical: 'GII_ALLEGATO_TECNICO',
  administrative: 'GII_ALLEGATO_AMMINISTRATIVO',
  bozzaDeterminazione: 'GII_BOZZA_DETERMINAZIONE_PDF',
  legacyBozzaDeterminazioneWord: 'GII_BOZZA_DETERMINAZIONE_DOCX',
  propostaContestazione: 'GII_PROPOSTA_CONTESTAZIONE_PDF',
  approvedBozzaReference: 'GII_BOZZA_APPROVATA_RI_AMM_REFERENCE'
} as const

function normalizeGiiAttachmentText (value?: string): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function attachmentKeywordHas (item: GiiAttachmentViewerItem | null | undefined, token: string): boolean {
  const haystack = String((item as any)?.keywords || '').toUpperCase()
  return !!token && haystack.includes(String(token).toUpperCase())
}

export function getGiiAttachmentKind (item: GiiAttachmentViewerItem | null | undefined): GiiAttachmentKind {
  const nameKey = normalizeGiiAttachmentText((item as any)?.name)
  if (attachmentKeywordHas(item, GII_ATTACHMENT_KEYWORDS.approvedBozzaReference)) {
    return 'internal-reference'
  }
  if (
    attachmentKeywordHas(item, GII_ATTACHMENT_KEYWORDS.bozzaDeterminazione) ||
    attachmentKeywordHas(item, GII_ATTACHMENT_KEYWORDS.legacyBozzaDeterminazioneWord) ||
    /\bbozza\b.*\bdeterminazione\b/.test(nameKey) ||
    /\bdeterminazione\b.*\bbozza\b/.test(nameKey) ||
    /\bdeterminazione\b.*\bdirigenziale\b/.test(nameKey)
  ) {
    return 'bozza-determinazione'
  }
  if (attachmentKeywordHas(item, GII_ATTACHMENT_KEYWORDS.propostaContestazione) || /\bproposta\b.*\bcontestazione\b/.test(nameKey)) {
    return 'proposta-contestazione'
  }
  if (attachmentKeywordHas(item, GII_ATTACHMENT_KEYWORDS.administrative)) return 'administrative'
  if (attachmentKeywordHas(item, GII_ATTACHMENT_KEYWORDS.technical)) return 'technical'
  return 'technical'
}

export function isGiiApprovedBozzaReferenceAttachment (item: GiiAttachmentViewerItem | null | undefined): boolean {
  return !!item && getGiiAttachmentKind(item) === 'internal-reference'
}

export function isGiiSpecialAdministrativeAttachment (item: GiiAttachmentViewerItem | null | undefined): boolean {
  const kind = getGiiAttachmentKind(item)
  return kind === 'bozza-determinazione' || kind === 'proposta-contestazione' || kind === 'internal-reference'
}

export function isGiiBozzaDeterminazionePdfAttachment (item: GiiAttachmentViewerItem | null | undefined): boolean {
  return getGiiAttachmentKind(item) === 'bozza-determinazione' && !!item && isPdfAttachment(item)
}

export function isGiiLegacyBozzaDeterminazioneWordAttachment (item: GiiAttachmentViewerItem | null | undefined): boolean {
  if (!item || getGiiAttachmentKind(item) !== 'bozza-determinazione') return false
  if (attachmentKeywordHas(item, GII_ATTACHMENT_KEYWORDS.legacyBozzaDeterminazioneWord)) return true
  const name = String(item.name || '').trim().toLowerCase()
  const ct = String(item.contentType || '').trim().toLowerCase()
  return /\.docx?$/.test(name) || ct.includes('msword') || ct.includes('wordprocessingml')
}

export function isGiiPropostaContestazionePdfAttachment (item: GiiAttachmentViewerItem | null | undefined): boolean {
  return getGiiAttachmentKind(item) === 'proposta-contestazione' && !!item && isPdfAttachment(item)
}

function giiAttachmentRecencyValue (item: GiiAttachmentViewerItem | null | undefined): number {
  if (!item) return 0
  for (const value of [item.uploadedAt, item.created, item.creationDate, item.createdAt, item.lastEditDate, item.editDate]) {
    const direct = Number(value)
    if (Number.isFinite(direct) && direct > 0) return direct
  }
  const kw = String(item.keywords || '')
  const m = kw.match(/(?:^|[|;\s])(?:fileCreatedAt|uploadedAt)=(\d{10,})/i)
  if (m) {
    const n = Number(m[1])
    if (Number.isFinite(n) && n > 0) return n
  }
  const id = Number(item.id)
  return Number.isFinite(id) && id > 0 ? id : 0
}

export function pickLatestGiiAttachment<T extends GiiAttachmentViewerItem> (items: T[]): T | null {
  const list = Array.isArray(items) ? items.filter(Boolean) : []
  if (!list.length) return null
  return list.reduce((latest, current) => {
    const a = giiAttachmentRecencyValue(latest)
    const b = giiAttachmentRecencyValue(current)
    if (b > a) return current
    if (b < a) return latest
    const aid = Number(latest?.id)
    const bid = Number(current?.id)
    return Number.isFinite(bid) && (!Number.isFinite(aid) || bid > aid) ? current : latest
  })
}

export function giiAttachmentIdentityKey (item: GiiAttachmentViewerItem | null | undefined): string {
  if (!item) return ''
  return [
    item.id,
    item.name || '',
    item.size ?? '',
    item.contentType || '',
    item.keywords || '',
    item.uploadedAt ?? '',
    item.created ?? '',
    item.creationDate ?? '',
    item.createdAt ?? '',
    item.lastEditDate ?? '',
    item.editDate ?? ''
  ].join('|')
}

export function filterGiiAttachmentsForTechnicalRoles<T extends GiiAttachmentViewerItem> (items: T[]): T[] {
  return (Array.isArray(items) ? items : []).filter(item => !isGiiApprovedBozzaReferenceAttachment(item) && getGiiAttachmentKind(item) === 'technical')
}

export function filterGiiAttachmentsForAdministrativeGenericSection<T extends GiiAttachmentViewerItem> (items: T[]): T[] {
  return (Array.isArray(items) ? items : []).filter(item => !isGiiApprovedBozzaReferenceAttachment(item) && getGiiAttachmentKind(item) === 'administrative')
}

export function filterGiiAttachmentsForAdministrativeFascicolo<T extends GiiAttachmentViewerItem> (items: T[]): T[] {
  return (Array.isArray(items) ? items : []).filter(item => !isGiiSpecialAdministrativeAttachment(item))
}


export type GiiAttachmentViewerProps<T extends GiiAttachmentViewerItem = GiiAttachmentViewerItem> = {
  title?: string
  items: T[]
  loading?: boolean
  busy?: boolean
  error?: string | null
  canEdit?: boolean
  editDisabled?: boolean
  uploadLabel?: string
  uploadInputKey?: number
  emptyMessage?: string
  noOidMessage?: string
  oidAvailable?: boolean
  selectedItemId?: number | string | null
  onSelectedItemChange?: (item: T | null) => void
  onUpload?: (files: File[]) => void | Promise<void>
  onOpen?: (item: T) => void | Promise<void>
  onReplace?: (item: T, file: File) => void | Promise<void>
  onDelete?: (item: T) => void | Promise<void>
  buildPreviewUrl?: (item: T) => Promise<string | null>
  revokePreviewUrl?: (url: string) => void
  rotationDeg?: number
  rotationBusy?: boolean
  canConfirmRotation?: boolean
  onRotateLeft?: (item: T) => void
  onRotateRight?: (item: T) => void
  onConfirmRotation?: (item: T) => void | Promise<void>
  formatBytes?: (size?: number) => string
  labelFontSize?: number
  headerFontSize?: number
  headerBg?: string
  headerColor?: string
  headerBorderColor?: string
  borderRadius?: number
  innerHeaderColor?: string
}

function defaultFormatBytes (value?: number): string {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return ''
  if (n < 1024) return `${Math.round(n)} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function revokeObjectUrlSafe (url?: string | null, custom?: (url: string) => void): void {
  if (!url) return
  const clean = String(url || '').split('#')[0]
  try {
    if (custom) custom(clean)
    else if (/^blob:/i.test(clean)) URL.revokeObjectURL(clean)
  } catch {}
}

function isPdfAttachment (item: GiiAttachmentViewerItem): boolean {
  const ct = String(item.contentType || '').toLowerCase()
  const name = String(item.name || '').toLowerCase()
  return ct === 'application/pdf' || name.endsWith('.pdf')
}

function isImageAttachment (item: GiiAttachmentViewerItem): boolean {
  const ct = String(item.contentType || '').toLowerCase()
  const name = String(item.name || '').toLowerCase()
  return ct.startsWith('image/') || /\.(jpe?g|png|gif|webp|bmp|tif?f)$/i.test(name)
}

function isRotatableImageAttachment (item: GiiAttachmentViewerItem): boolean {
  const ct = String(item.contentType || '').toLowerCase()
  const name = String(item.name || '').toLowerCase()
  return ct.includes('jpeg') || ct.includes('jpg') || ct.includes('png') || /\.(jpe?g|png)$/i.test(name)
}

const ALLOWED_ATTACHMENT_UPLOAD_HINT = 'Formati ammessi: PDF, JPG, PNG, GIF, WEBP, BMP, TIFF.'
const ALLOWED_ATTACHMENT_UPLOAD_ACCEPT = 'application/pdf,image/*'

function isAllowedAttachmentUpload (file: File): boolean {
  const fake = { id: 0, contentType: file.type, name: file.name }
  return isPdfAttachment(fake) || isImageAttachment(fake)
}

function canvasToBlobForAttachment (canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(blob => {
        if (blob) resolve(blob)
        else reject(new Error('Rotazione immagine non riuscita.'))
      }, type, quality)
    } catch (ex) {
      reject(ex)
    }
  })
}

async function rotateImageAttachmentFile (blob: Blob, fileName: string, rotationDeg: number): Promise<File> {
  const contentType = String(blob.type || '').toLowerCase()
  const lowerName = String(fileName || '').toLowerCase()
  const isJpeg = contentType.includes('jpeg') || contentType.includes('jpg') || /\.(jpe?g)$/i.test(lowerName)
  const isPng = contentType.includes('png') || /\.png$/i.test(lowerName)
  if (!isJpeg && !isPng) throw new Error('La rotazione è disponibile solo per immagini JPEG o PNG.')
  if (typeof document === 'undefined') throw new Error('Rotazione immagine non disponibile in questo ambiente.')

  let source: any = null
  let sourceUrl = ''
  let closeSource = () => {}
  try {
    const createBitmap = (window as any)?.createImageBitmap
    if (typeof createBitmap === 'function') {
      source = await createBitmap(blob, { imageOrientation: 'from-image' }).catch((): null => null)
      if (source) closeSource = () => { try { source.close?.() } catch {} }
    }
    if (!source) {
      sourceUrl = URL.createObjectURL(blob)
      source = await new Promise<HTMLImageElement | null>(resolve => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => resolve(null)
        img.src = sourceUrl
      })
      closeSource = () => { try { if (sourceUrl) URL.revokeObjectURL(sourceUrl) } catch {} }
    }
    if (!source) throw new Error('Immagine non leggibile.')

    const srcW = Math.max(1, Math.round(Number(source.width || source.naturalWidth) || 0))
    const srcH = Math.max(1, Math.round(Number(source.height || source.naturalHeight) || 0))
    if (!srcW || !srcH) throw new Error('Dimensioni immagine non valide.')

    const normalizedRotation = ((Math.round(rotationDeg / 90) * 90) % 360 + 360) % 360
    if (normalizedRotation === 0) return new File([blob], fileName || `allegato.${isJpeg ? 'jpg' : 'png'}`, { type: isJpeg ? 'image/jpeg' : 'image/png' })

    const canvas = document.createElement('canvas')
    const swap = normalizedRotation === 90 || normalizedRotation === 270
    canvas.width = swap ? srcH : srcW
    canvas.height = swap ? srcW : srcH
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Rotazione immagine non disponibile.')
    if (normalizedRotation === 90) {
      ctx.translate(canvas.width, 0)
      ctx.rotate(Math.PI / 2)
    } else if (normalizedRotation === 180) {
      ctx.translate(canvas.width, canvas.height)
      ctx.rotate(Math.PI)
    } else if (normalizedRotation === 270) {
      ctx.translate(0, canvas.height)
      ctx.rotate(-Math.PI / 2)
    }
    ctx.drawImage(source, 0, 0, srcW, srcH)

    const outType = isJpeg ? 'image/jpeg' : 'image/png'
    const rotatedBlob = await canvasToBlobForAttachment(canvas, outType, isJpeg ? 0.92 : undefined)
    return new File([rotatedBlob], fileName || `allegato_ruotato.${isJpeg ? 'jpg' : 'png'}`, { type: outType })
  } finally {
    closeSource()
  }
}

function stripQueryHash (value: string): string {
  return String(value || '').split(/[?#]/)[0]
}

function normalizeAttachmentNameKey (value?: string): string {
  return stripQueryHash(String(value || '').trim()).toLowerCase().replace(/\\/g, '/').split('/').pop() || ''
}

function stripLastExtension (name: string): string {
  return String(name || '').replace(/\.[^.\/]+$/, '')
}

function normalizeComparableNameKey (value?: string): string {
  return normalizeAttachmentNameKey(value)
    .replace(/[\[\](){}]/g, ' ')
    .replace(/[._\-\s–—]+/g, ' ')
    .trim()
}

function addOwnerKeyCandidate (out: Set<string>, value?: string): void {
  const key = normalizeAttachmentNameKey(value)
  if (key) out.add(key)
  const comparable = normalizeComparableNameKey(value)
  if (comparable) out.add(comparable)
}

function previewOwnerKeyCandidates (item: GiiAttachmentViewerItem): string[] {
  const name = normalizeAttachmentNameKey(item.name)
  if (!name) return []
  if (!isPdfAttachment(item)) return []
  const withoutPdf = name.replace(/\.pdf$/i, '')
  const stems = new Set<string>()
  const suffixes = [
    /(?:\.|_|-|\s|\s+-\s+|\s+–\s+|\s+—\s+|\(|\[|\{)(preview)(?:\)|\]|\})?$/i,
    /(?:\.|_|-|\s|\s+-\s+|\s+–\s+|\s+—\s+|\(|\[|\{)(anteprima)(?:\)|\]|\})?$/i,
    /(?:\.|_|-|\s|\s+-\s+|\s+–\s+|\s+—\s+|\(|\[|\{)(pdf-preview)(?:\)|\]|\})?$/i,
    /(?:\.|_|-|\s|\s+-\s+|\s+–\s+|\s+—\s+|\(|\[|\{)(preview-pdf)(?:\)|\]|\})?$/i
  ]
  for (const re of suffixes) {
    const stem = withoutPdf.replace(re, '').replace(/[._\-\s–—\[\](){}]+$/g, '').trim()
    if (stem && stem !== withoutPdf) stems.add(stem)
  }
  const out = new Set<string>()
  for (const stem of stems) {
    addOwnerKeyCandidate(out, stem)
    addOwnerKeyCandidate(out, stripLastExtension(stem))
  }
  return Array.from(out).filter(Boolean)
}

function originalKeyCandidates (item: GiiAttachmentViewerItem): string[] {
  const name = normalizeAttachmentNameKey(item.name)
  if (!name) return []
  const out = new Set<string>()
  addOwnerKeyCandidate(out, name)
  addOwnerKeyCandidate(out, stripLastExtension(name))
  return Array.from(out).filter(Boolean)
}

function isDocumentPreviewCandidateOwner (item: GiiAttachmentViewerItem): boolean {
  const ct = String(item.contentType || '').toLowerCase()
  const name = normalizeAttachmentNameKey(item.name)
  if (!name || isPdfAttachment(item) || isImageAttachment(item)) return false
  return /\.(docx?|xlsx?|pptx?|odt|ods|rtf)$/i.test(name) ||
    ct.includes('word') ||
    ct.includes('excel') ||
    ct.includes('spreadsheet') ||
    ct.includes('presentation') ||
    ct.includes('opendocument') ||
    ct === 'application/rtf'
}

function withPdfPreviewCompanions<T extends GiiAttachmentViewerItem> (items: T[]): T[] {
  const originalKeys = new Set<string>()
  for (const item of items) {
    if (!isDocumentPreviewCandidateOwner(item)) continue
    for (const key of originalKeyCandidates(item)) originalKeys.add(key)
  }

  const previewByKey = new Map<string, T>()
  const previewIds = new Set<string>()
  for (const item of items) {
    if (!isPdfAttachment(item)) continue
    const explicitKeys = previewOwnerKeyCandidates(item)
    let keys = explicitKeys

    if (keys.length === 0) {
      const pdfStem = stripLastExtension(normalizeAttachmentNameKey(item.name))
      const possibleKeys = new Set<string>()
      addOwnerKeyCandidate(possibleKeys, pdfStem)
      keys = Array.from(possibleKeys).filter(key => originalKeys.has(key))
    }

    if (keys.length === 0) continue
    const url = String((item as any).previewUrl || (item as any).url || '').trim()
    if (!url) continue
    previewIds.add(String((item as any).id))
    for (const key of keys) {
      if (key && !previewByKey.has(key)) previewByKey.set(key, item)
    }
  }

  return items
    .filter(item => !previewIds.has(String((item as any).id)))
    .map(item => {
      if (item.previewUrl) return item
      let preview: T | undefined
      for (const key of originalKeyCandidates(item)) {
        preview = previewByKey.get(key)
        if (preview) break
      }
      if (!preview) return item
      const url = String((preview as any).previewUrl || (preview as any).url || '').trim()
      if (!url) return item
      return {
        ...item,
        previewUrl: url
      } as T
    })
}

type AttachmentActionIconName = 'open' | 'replace' | 'delete' | 'upload'

function AttachmentActionIcon (props: { name: AttachmentActionIconName, size?: number }): React.ReactElement {
  const size = Number(props.size || 22)
  if (props.name === 'upload') {
    return (
      <svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true' focusable='false'>
        <path d='M21 13.1v5.9c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2v-4'/>
        <path d='M3 15V5c0-1.1.9-2 2-2h5.9'/>
        <path d='M16.5 3v9'/>
        <path d='M12 7.5h9'/>
      </svg>
    )
  }
  if (props.name === 'delete') {
    return (
      <svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true' focusable='false'>
        <path d='M3 6h18'/>
        <path d='M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'/>
        <path d='M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6'/>
        <path d='M10 11v6'/>
        <path d='M14 11v6'/>
      </svg>
    )
  }
  if (props.name === 'replace') {
    return (
      <svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true' focusable='false'>
        <polyline points='17 1 21 5 17 9'/>
        <path d='M3 11V9a4 4 0 0 1 4-4h14'/>
        <polyline points='7 23 3 19 7 15'/>
        <path d='M21 13v2a4 4 0 0 1-4 4H3'/>
      </svg>
    )
  }
  return (
    <svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true' focusable='false'>
      <path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'/>
      <path d='M7 10l5 5 5-5'/>
      <path d='M12 15V3'/>
    </svg>
  )
}

function buttonStyle (opts?: { danger?: boolean, disabled?: boolean }): React.CSSProperties {
  const disabled = !!opts?.disabled
  const danger = !!opts?.danger
  return {
    width: 38,
    height: 36,
    padding: 0,
    boxSizing: 'border-box',
    color: disabled ? '#9ca3af' : (danger ? '#b91c1c' : '#2563eb'),
    whiteSpace: 'nowrap',
    background: disabled ? '#e5e7eb' : '#ffffff',
    border: disabled ? '2px solid #e5e7eb' : (danger ? '2px solid rgba(185,28,28,0.72)' : '2px solid rgba(37,99,235,0.72)'),
    borderRadius: 8,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: '0 0 auto',
    lineHeight: 1
  }
}

export default function GiiAttachmentViewer<T extends GiiAttachmentViewerItem = GiiAttachmentViewerItem> (props: GiiAttachmentViewerProps<T>) {
  const rawItems = Array.isArray(props.items) ? props.items : []
  const items = React.useMemo(() => withPdfPreviewCompanions(rawItems), [rawItems])
  const canEdit = !!props.canEdit && !props.editDisabled
  const busy = !!props.busy
  const oidAvailable = props.oidAvailable !== false
  const formatBytes = props.formatBytes || defaultFormatBytes
  const labelFontSize = Number(props.labelFontSize ?? 12)
  const borderRadius = Number(props.borderRadius ?? 10)
  const [internalSelectedId, setInternalSelectedId] = React.useState<number | string | null>(props.selectedItemId ?? null)
  const selectedId = props.selectedItemId !== undefined ? props.selectedItemId : internalSelectedId
  const selected = React.useMemo(() => {
    if (selectedId == null) return null
    return items.find((it: any) => String(it?.id) === String(selectedId)) || null
  }, [items, selectedId])

  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = React.useState(false)
  const [previewError, setPreviewError] = React.useState<string | null>(null)
  const [uploadFormatError, setUploadFormatError] = React.useState<string | null>(null)
  const replaceInputRef = React.useRef<HTMLInputElement | null>(null)
  const [replaceInputKey, setReplaceInputKey] = React.useState(0)
  const replaceTargetRef = React.useRef<T | null>(null)
  const lastPreviewUrlRef = React.useRef<string | null>(null)
  const [internalRotationDeg, setInternalRotationDeg] = React.useState(0)
  const [internalRotationBusy, setInternalRotationBusy] = React.useState(false)

  React.useEffect(() => {
    setInternalRotationDeg(0)
  }, [selected?.id])

  const setSelected = React.useCallback((item: T | null) => {
    if (props.selectedItemId === undefined) setInternalSelectedId(item?.id ?? null)
    props.onSelectedItemChange?.(item)
  }, [props.selectedItemId, props.onSelectedItemChange])

  React.useEffect(() => {
    if (props.loading) return
    if (!items.length) {
      if (selectedId != null) setSelected(null)
      return
    }
    const exists = selectedId != null && items.some((it: any) => String(it?.id) === String(selectedId))
    if (!exists) setSelected(items[0])
  }, [items, props.loading, selectedId, setSelected])

  React.useEffect(() => {
    let cancelled = false
    const previous = lastPreviewUrlRef.current
    if (previous) revokeObjectUrlSafe(previous, props.revokePreviewUrl)
    lastPreviewUrlRef.current = null
    setPreviewUrl(null)
    setPreviewError(null)
    if (!selected) {
      setPreviewLoading(false)
      return () => { cancelled = true }
    }
    const directPreview = selected.previewUrl || (isPdfAttachment(selected) || isImageAttachment(selected) ? selected.url : '')
    if (directPreview && !props.buildPreviewUrl) {
      lastPreviewUrlRef.current = directPreview
      setPreviewUrl(directPreview)
      setPreviewLoading(false)
      return () => { cancelled = true }
    }
    if (!props.buildPreviewUrl) {
      setPreviewLoading(false)
      return () => { cancelled = true }
    }
    setPreviewLoading(true)
    ;(async () => {
      try {
        const url = await props.buildPreviewUrl!(selected)
        if (cancelled) {
          revokeObjectUrlSafe(url, props.revokePreviewUrl)
          return
        }
        lastPreviewUrlRef.current = url || null
        setPreviewUrl(url || null)
      } catch (e: any) {
        if (!cancelled) setPreviewError(e?.message || String(e))
      } finally {
        if (!cancelled) setPreviewLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [selected?.id, selected?.url, selected?.previewUrl, props.buildPreviewUrl])

  React.useEffect(() => {
    return () => {
      const previous = lastPreviewUrlRef.current
      if (previous) revokeObjectUrlSafe(previous, props.revokePreviewUrl)
      lastPreviewUrlRef.current = null
    }
  }, [])

  const disabledEdit = !canEdit || busy
  const itemEditDisabled = React.useCallback((item: T | null | undefined): boolean => {
    return disabledEdit || !!(item as any)?.readOnly
  }, [disabledEdit])

  const itemReadOnlyReason = React.useCallback((item: T | null | undefined): string => {
    return String((item as any)?.readOnlyReason || '').trim()
  }, [])

  const selectedCanRotate = !!selected && isRotatableImageAttachment(selected)
  const usesExternalRotation = props.rotationDeg !== undefined || !!props.onRotateLeft || !!props.onRotateRight || !!props.onConfirmRotation
  const effectiveRotationDeg = usesExternalRotation ? Number(props.rotationDeg || 0) : internalRotationDeg
  const normalizedRotationDeg = ((Math.round(effectiveRotationDeg / 90) * 90) % 360 + 360) % 360
  const effectiveRotationBusy = !!props.rotationBusy || internalRotationBusy
  const canConfirmExternalRotation = !!props.onConfirmRotation && !!props.canConfirmRotation
  const canConfirmInternalRotation = !props.onConfirmRotation && !!props.onReplace && canEdit && !itemEditDisabled(selected) && normalizedRotationDeg !== 0
  const confirmRotationDisabled = effectiveRotationBusy || normalizedRotationDeg === 0 || !(canConfirmExternalRotation || canConfirmInternalRotation)
  const uploadTitle = String(props.uploadLabel || 'Carica allegato')

  const rotateLeft = React.useCallback(() => {
    if (!selectedCanRotate) return
    if (props.onRotateLeft && selected) props.onRotateLeft(selected)
    else setInternalRotationDeg(v => v - 90)
  }, [props.onRotateLeft, selected, selectedCanRotate])

  const rotateRight = React.useCallback(() => {
    if (!selectedCanRotate) return
    if (props.onRotateRight && selected) props.onRotateRight(selected)
    else setInternalRotationDeg(v => v + 90)
  }, [props.onRotateRight, selected, selectedCanRotate])

  const confirmRotation = React.useCallback(async () => {
    if (!selected || !selectedCanRotate || confirmRotationDisabled) return
    if (props.onConfirmRotation) {
      await props.onConfirmRotation(selected)
      return
    }
    if (!props.onReplace || !previewUrl) return
    setInternalRotationBusy(true)
    try {
      const resp = await fetch(String(previewUrl).split('#')[0], { credentials: 'same-origin' })
      if (!resp.ok) throw new Error(`Caricamento immagine fallito (HTTP ${resp.status}).`)
      const blob = await resp.blob()
      const file = await rotateImageAttachmentFile(blob, selected.name || `allegato_${selected.id}.jpg`, normalizedRotationDeg)
      await props.onReplace(selected, file)
      setInternalRotationDeg(0)
    } finally {
      setInternalRotationBusy(false)
    }
  }, [confirmRotationDisabled, normalizedRotationDeg, previewUrl, props.onConfirmRotation, props.onReplace, selected, selectedCanRotate])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', height: '100%', border: `1px solid ${props.headerBorderColor || '#c5d9f1'}`, borderRadius, background: '#fff', overflow: 'hidden' }}>
      {!oidAvailable ? (
        <div style={{ flex: '1 1 auto', minHeight: 0, padding: 12, color: '#6b7280', fontSize: labelFontSize }}>
          {props.noOidMessage || 'Selezionare una pratica prima di consultare o caricare gli allegati.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12, flex: '1 1 auto', minHeight: 0, height: '100%', overflow: 'hidden', padding: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0, overflow: 'hidden' }}>
            <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ fontWeight: 800, fontSize: Math.max(13, labelFontSize), color: props.innerHeaderColor || '#0f4c81' }}>Elenco allegati</div>
              {props.onUpload && (
                <label title={uploadTitle} aria-label={uploadTitle} style={{ width: 38, height: 36, minHeight: 36, boxSizing: 'border-box', padding: 0, borderRadius: 8, border: disabledEdit ? '2px solid #e5e7eb' : '2px solid rgba(37,99,235,0.72)', background: disabledEdit ? '#e5e7eb' : '#ffffff', color: disabledEdit ? '#9ca3af' : '#2563eb', fontSize: labelFontSize, fontWeight: 600, cursor: disabledEdit ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, whiteSpace: 'nowrap', flex: '0 0 auto', opacity: disabledEdit ? 0.6 : 1 }}>
                  <AttachmentActionIcon name='upload' />
                  <input
                    key={props.uploadInputKey}
                    type='file'
                    multiple
                    accept={ALLOWED_ATTACHMENT_UPLOAD_ACCEPT}
                    disabled={disabledEdit}
                    style={{ display: 'none' }}
                    onChange={(e: any) => {
                      const files = Array.from(e.currentTarget.files || []) as File[]
                      if (!files.length) return
                      const rejected = files.filter(f => !isAllowedAttachmentUpload(f))
                      if (rejected.length) {
                        setUploadFormatError(`Formato non ammesso per: ${rejected.map(f => f.name).join(', ')}. ${ALLOWED_ATTACHMENT_UPLOAD_HINT}`)
                        return
                      }
                      setUploadFormatError(null)
                      void props.onUpload?.(files)
                    }}
                  />
                </label>
              )}
              {props.onReplace && (
                <input
                  key={replaceInputKey}
                  ref={replaceInputRef}
                  type='file'
                  accept={ALLOWED_ATTACHMENT_UPLOAD_ACCEPT}
                  disabled={disabledEdit}
                  style={{ display: 'none' }}
                  onChange={(e: any) => {
                    const file = Array.from(e.currentTarget.files || [])[0] as File | undefined
                    const target = replaceTargetRef.current
                    setReplaceInputKey(k => k + 1)
                    replaceTargetRef.current = null
                    if (!file || !target) return
                    if (!isAllowedAttachmentUpload(file)) {
                      setUploadFormatError(`Formato non ammesso: ${file.name}. ${ALLOWED_ATTACHMENT_UPLOAD_HINT}`)
                      return
                    }
                    setUploadFormatError(null)
                    void props.onReplace?.(target, file)
                  }}
                />
              )}
            </div>

            {props.onUpload && (
              <div style={{ flex: '0 0 auto', fontSize: Math.max(10, labelFontSize - 2), color: '#6b7280', fontWeight: 600 }}>
                {ALLOWED_ATTACHMENT_UPLOAD_HINT}
              </div>
            )}

            {uploadFormatError && <div style={{ flex: '0 0 auto', color: '#b42318', fontSize: labelFontSize, fontWeight: 700 }}>{uploadFormatError}</div>}
            {props.error && <div style={{ flex: '0 0 auto', color: '#b42318', fontSize: labelFontSize, fontWeight: 700 }}>{props.error}</div>}
            {props.loading ? (
              <div style={{ flex: '0 0 auto', color: '#6b7280', fontSize: labelFontSize }}>Caricamento allegati…</div>
            ) : items.length > 0 ? (
              <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', display: 'grid', alignContent: 'start', gap: 8, paddingRight: 2, gridAutoRows: 'max-content' }}>
                {items.map((att, idx) => {
                  const active = selected?.id != null && String(selected.id) === String(att.id)
                  const itemDisabled = itemEditDisabled(att)
                  const groupTitle = String((att as any)?.groupTitle || '').trim()
                  const previousGroupTitle = idx > 0 ? String((items[idx - 1] as any)?.groupTitle || '').trim() : ''
                  const showGroupTitle = !!groupTitle && groupTitle !== previousGroupTitle
                  const row = (
                    <div key={String(att.id)} onClick={() => setSelected(att)} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'start', columnGap: 10, border: `1px solid ${active ? '#2563eb' : 'rgba(0,0,0,0.08)'}`, background: active ? '#eff6ff' : '#fff', borderRadius: 10, padding: '8px 10px', cursor: 'pointer', transition: 'all 0.15s' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: labelFontSize, color: '#111827', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{att.name || `Allegato ${idx + 1}`}</div>
                        {formatBytes(att.size) && <div style={{ fontSize: Math.max(11, labelFontSize - 1), color: '#64748b' }}>{formatBytes(att.size)}</div>}
                        {(att as any)?.readOnly && itemReadOnlyReason(att) && <div style={{ marginTop: 3, fontSize: Math.max(10, labelFontSize - 2), color: '#64748b', fontWeight: 600 }}>{itemReadOnlyReason(att)}</div>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'nowrap', justifyContent: 'flex-end', alignSelf: 'start', whiteSpace: 'nowrap' }}>
                        {props.onOpen && (
                          <button type='button' title='Apri o scarica allegato' aria-label='Apri o scarica allegato' onClick={e => { e.preventDefault(); e.stopPropagation(); void props.onOpen?.(att) }} style={buttonStyle()}>
                            <AttachmentActionIcon name='open' />
                          </button>
                        )}
                        {props.onReplace && (
                          <button type='button' title='Sostituisci allegato' aria-label='Sostituisci allegato' disabled={itemDisabled} onClick={e => { e.preventDefault(); e.stopPropagation(); if (itemDisabled) return; replaceTargetRef.current = att; window.setTimeout(() => { try { replaceInputRef.current?.click() } catch {} }, 0) }} style={buttonStyle({ disabled: itemDisabled })}>
                            <AttachmentActionIcon name='replace' />
                          </button>
                        )}
                        {props.onDelete && (
                          <button type='button' title='Elimina allegato' aria-label='Elimina allegato' disabled={itemDisabled} onClick={e => { e.preventDefault(); e.stopPropagation(); if (itemDisabled) return; void props.onDelete?.(att) }} style={buttonStyle({ danger: true, disabled: itemDisabled })}>
                            <AttachmentActionIcon name='delete' />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                  if (!showGroupTitle) return row
                  return (
                    <React.Fragment key={`grp-${groupTitle}-${String(att.id)}`}>
                      <div style={{ marginTop: idx === 0 ? 0 : 6, padding: '5px 8px', borderRadius: 8, background: '#eef4fb', color: props.innerHeaderColor || '#0f4c81', fontSize: Math.max(11, labelFontSize - 1), fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.25 }}>
                        {groupTitle}
                      </div>
                      {row}
                    </React.Fragment>
                  )
                })}
              </div>
            ) : (
              <div style={{ flex: '0 0 auto', color: '#6b7280', fontSize: labelFontSize }}>{props.emptyMessage || 'Nessun allegato.'}</div>
            )}
          </div>

          <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 12, background: '#282828', display: 'grid', gridTemplateRows: selectedCanRotate && previewUrl ? '34px minmax(0, 1fr) auto' : 'minmax(0, 1fr) auto', gap: 8, overflow: 'hidden', minHeight: 0, height: '100%' }}>
            {selectedCanRotate && previewUrl && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <button type='button' disabled={effectiveRotationBusy} onClick={rotateLeft} title='Ruota a sinistra' aria-label='Ruota a sinistra' style={{ width: 38, height: 34, borderRadius: 9, border: '1px solid rgba(255,255,255,0.28)', background: '#3b3b3b', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: effectiveRotationBusy ? 'not-allowed' : 'pointer', opacity: effectiveRotationBusy ? 0.55 : 1, fontSize: 24, fontWeight: 800, lineHeight: 1, fontFamily: 'Arial, sans-serif' }}>↺</button>
                <button type='button' disabled={confirmRotationDisabled} onClick={() => { void confirmRotation() }} title='Conferma orientamento' aria-label='Conferma orientamento' style={{ width: 38, height: 34, borderRadius: 9, border: !confirmRotationDisabled ? '1px solid #1a7f37' : '1px solid rgba(255,255,255,0.18)', background: !confirmRotationDisabled ? '#1a7f37' : '#3b3b3b', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: confirmRotationDisabled ? 'not-allowed' : 'pointer', opacity: effectiveRotationBusy ? 0.55 : (!confirmRotationDisabled ? 1 : 0.38), fontSize: 20, fontWeight: 900, lineHeight: 1, fontFamily: 'Arial, sans-serif' }}>{effectiveRotationBusy ? '…' : '✓'}</button>
                <button type='button' disabled={effectiveRotationBusy} onClick={rotateRight} title='Ruota a destra' aria-label='Ruota a destra' style={{ width: 38, height: 34, borderRadius: 9, border: '1px solid rgba(255,255,255,0.28)', background: '#3b3b3b', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: effectiveRotationBusy ? 'not-allowed' : 'pointer', opacity: effectiveRotationBusy ? 0.55 : 1, fontSize: 24, fontWeight: 800, lineHeight: 1, fontFamily: 'Arial, sans-serif' }}>↻</button>
              </div>
            )}
            <div style={{ minHeight: 0, width: '100%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {!selected ? (
                <div style={{ fontSize: labelFontSize, color: 'rgba(255,255,255,0.45)', textAlign: 'center' }}>Seleziona un allegato per visualizzare l&apos;anteprima</div>
              ) : previewLoading ? (
                <div style={{ fontSize: labelFontSize, color: 'rgba(255,255,255,0.55)' }}>Caricamento anteprima…</div>
              ) : previewError ? (
                <div style={{ fontSize: labelFontSize, color: 'rgba(255,255,255,0.45)', textAlign: 'center' }}>{previewError}</div>
              ) : previewUrl ? (() => {
                if (isImageAttachment(selected)) return <img src={previewUrl} alt={selected.name || ''} style={{ display: 'block', maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', borderRadius: 6, objectFit: 'contain', transform: `rotate(${Number(effectiveRotationDeg || 0)}deg)`, transformOrigin: 'center center', transition: 'transform 0.16s ease' }}/>
                const pdfPreview = isPdfAttachment(selected) || !!selected.previewUrl || String(previewUrl || '').toLowerCase().includes('.pdf') || /^blob:/i.test(previewUrl)
                if (pdfPreview) {
                  return (
                    <div style={{ width: '100%', height: '100%', minHeight: 0, borderRadius: 6, overflow: 'hidden' }}>
                      <AnteprimaPdfViewer
                        url={previewUrl}
                        fileName={selected.name || 'allegato.pdf'}
                        title='Anteprima allegato'
                        subtitle={selected.name || ''}
                        loading={false}
                        error={null}
                        emptyText='Anteprima PDF non disponibile.'
                        style={{ width: '100%', height: '100%', minHeight: 0 }}
                      />
                    </div>
                  )
                }
                return <div style={{ fontSize: labelFontSize, color: 'rgba(255,255,255,0.45)', textAlign: 'center' }}>Anteprima non disponibile per questo tipo di file.</div>
              })() : (
                <div style={{ fontSize: labelFontSize, color: 'rgba(255,255,255,0.45)', textAlign: 'center' }}>Anteprima PDF non disponibile per questo allegato. Se il file originale non è PDF o immagine, deve essere presente un PDF di anteprima associato.</div>
              )}
            </div>
            {selected && (
              <div style={{ fontSize: Math.max(11, labelFontSize - 1), color: 'rgba(255,255,255,0.78)', textAlign: 'center', wordBreak: 'break-word', maxHeight: 36, overflow: 'hidden' }}>
                {selected.name || `Allegato #${selected.id}`}{formatBytes(selected.size) ? ` • ${formatBytes(selected.size)}` : ''}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
