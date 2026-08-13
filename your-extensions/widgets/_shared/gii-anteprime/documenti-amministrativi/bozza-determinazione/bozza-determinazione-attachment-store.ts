import {
  isGiiBozzaDeterminazionePdfAttachment,
  isGiiLegacyBozzaDeterminazioneWordAttachment
} from '../../allegati/gii-attachment-viewer'

type BozzaDeterminazioneAttachmentInfo = {
  id: number
  name?: string
  contentType?: string
  keywords?: string
}

function loadEsriModule<T = any> (path: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = (window as any)?.require
    if (!req) { reject(new Error('AMD require non disponibile')); return }
    try { req([path], (mod: T) => resolve(mod), (err: any) => reject(err)) } catch (e) { reject(e) }
  })
}

function normalizedLayerUrl (value: string): string {
  const clean = String(value || '').trim().replace(/\/+$/, '')
  if (!clean) return ''
  if (/\/FeatureServer$/i.test(clean)) return `${clean}/0`
  return clean
}

async function getEsriTokenForUrl (url: string): Promise<string> {
  const clean = normalizedLayerUrl(url)
  if (!clean) return ''
  try {
    const IdentityManager = await loadEsriModule<any>('esri/identity/IdentityManager')
    const cred = IdentityManager?.findCredential?.(clean) || IdentityManager?.findCredential?.(clean.replace(/\/\d+$/, ''))
    return cred?.token ? String(cred.token) : ''
  } catch {
    return ''
  }
}

function normalizeAttachmentInfos (raw: any): BozzaDeterminazioneAttachmentInfo[] {
  const pull = (obj: any): any[] => {
    if (!obj) return []
    if (Array.isArray(obj)) return obj
    if (Array.isArray(obj.attachmentInfos)) return obj.attachmentInfos
    if (Array.isArray(obj.attachments)) return obj.attachments
    return []
  }
  return pull(raw)
    .map((a: any) => ({
      id: Number(a?.id ?? a?.objectId ?? a?.attachmentId),
      name: a?.name,
      contentType: a?.contentType,
      keywords: a?.keywords
    }))
    .filter(a => Number.isFinite(a.id) && a.id > 0)
}

async function queryAttachments (layer: any, oid: number, layerUrl: string): Promise<BozzaDeterminazioneAttachmentInfo[]> {
  if (!oid) return []
  const cleanUrl = normalizedLayerUrl(layerUrl || layer?.url || '')
  const oidField = String(layer?.objectIdField || 'OBJECTID')

  if (layer && typeof layer.queryAttachments === 'function') {
    try {
      const featureRef = { attributes: { [oidField]: oid } }
      let res: any = null
      try {
        res = await layer.queryAttachments(featureRef, { returnMetadata: true, returnUrl: true })
      } catch {
        res = await layer.queryAttachments(featureRef)
      }
      if (Array.isArray(res)) {
        for (const group of res) {
          const parentId = group?.parentObjectId ?? group?.objectId
          if (Number(parentId) === Number(oid)) return normalizeAttachmentInfos(group)
        }
        return normalizeAttachmentInfos(res)
      }
      if (res && typeof res === 'object') {
        if (Array.isArray(res.attachmentGroups)) {
          for (const group of res.attachmentGroups) {
            const parentId = group?.parentObjectId ?? group?.objectId
            if (Number(parentId) === Number(oid)) return normalizeAttachmentInfos(group)
          }
        }
        if ((res as any)[oid]) return normalizeAttachmentInfos((res as any)[oid])
        if ((res as any)[String(oid)]) return normalizeAttachmentInfos((res as any)[String(oid)])
        return normalizeAttachmentInfos(res)
      }
    } catch {
      // fallback REST sotto
    }
  }

  if (!cleanUrl) return []
  const token = await getEsriTokenForUrl(cleanUrl)
  const qs = new URLSearchParams({ f: 'json', objectIds: String(oid), returnMetadata: 'true', returnUrl: 'true' })
  if (token) qs.set('token', token)
  const resp = await fetch(`${cleanUrl}/queryAttachments?${qs.toString()}`, { cache: 'no-store' })
  const json: any = await resp.json().catch(() => ({}))
  if (!resp.ok || json?.error) throw new Error(String(json?.error?.description || json?.error?.message || `HTTP ${resp.status}`))
  if (Array.isArray(json?.attachmentGroups)) {
    for (const group of json.attachmentGroups) {
      const parentId = group?.parentObjectId ?? group?.objectId
      if (Number(parentId) === Number(oid)) return normalizeAttachmentInfos(group)
    }
  }
  if (json && typeof json === 'object') {
    if ((json as any)[oid]) return normalizeAttachmentInfos((json as any)[oid])
    if ((json as any)[String(oid)]) return normalizeAttachmentInfos((json as any)[String(oid)])
  }
  return normalizeAttachmentInfos(json)
}

async function deleteAttachment (oid: number, attachmentId: number, layerUrl: string): Promise<void> {
  const cleanUrl = normalizedLayerUrl(layerUrl)
  if (!oid || !attachmentId || !cleanUrl) return
  const token = await getEsriTokenForUrl(cleanUrl)
  const fd = new FormData()
  fd.append('f', 'json')
  fd.append('attachmentIds', String(attachmentId))
  if (token) fd.append('token', token)
  const resp = await fetch(`${cleanUrl}/${Number(oid)}/deleteAttachments`, { method: 'POST', body: fd })
  const json: any = await resp.json().catch(() => ({}))
  const result = Array.isArray(json?.deleteAttachmentResults) ? json.deleteAttachmentResults[0] : null
  const err = json?.error || result?.error || null
  if (!resp.ok || err || result?.success === false) {
    throw new Error(String(err?.description || err?.message || `HTTP ${resp.status}`))
  }
}

export async function deleteBozzaDeterminazionePdfAttachments (
  layer: any,
  oid: number,
  layerUrl: string
): Promise<number[]> {
  const cleanUrl = normalizedLayerUrl(layer?.url || layerUrl || '')
  if (!oid || !cleanUrl) return []

  const attachments = await queryAttachments(layer, oid, cleanUrl)
  const toDelete = attachments.filter(att =>
    isGiiBozzaDeterminazionePdfAttachment(att as any) ||
    isGiiLegacyBozzaDeterminazioneWordAttachment(att as any)
  )
  const deletedIds: number[] = []

  for (const att of toDelete) {
    const id = Number(att.id)
    if (!Number.isFinite(id) || id <= 0) continue
    await deleteAttachment(oid, id, cleanUrl)
    deletedIds.push(id)
  }

  return deletedIds
}
