import { GII_ATTACHMENT_KEYWORDS, isGiiPropostaContestazionePdfAttachment, pickLatestGiiAttachment } from '../../allegati/gii-attachment-viewer'

export type PropostaContestazioneAttachmentState = 'DRAFT' | 'APPROVED'

export type PropostaContestazioneAttachmentInfo = {
  id: number
  name?: string
  size?: number
  contentType?: string
  url?: string
  keywords?: string
  created?: number
  creationDate?: number
  createdAt?: number
  lastEditDate?: number
  editDate?: number
  uploadedAt?: number
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

  // Le operazioni sugli allegati appartengono al singolo layer.
  // Le viste amministrative GII espongono il layer operativo come FeatureServer/0.
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

function normalizeAttachmentInfos (raw: any): PropostaContestazioneAttachmentInfo[] {
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
      size: Number(a?.size),
      contentType: a?.contentType,
      url: a?.url,
      keywords: a?.keywords,
      created: Number(a?.created),
      creationDate: Number(a?.creationDate),
      createdAt: Number(a?.createdAt),
      lastEditDate: Number(a?.lastEditDate),
      editDate: Number(a?.editDate),
      uploadedAt: Number(a?.uploadedAt)
    }))
    .filter(a => Number.isFinite(a.id) && a.id > 0)
}

function attachmentKeywords (state: PropostaContestazioneAttachmentState, fileCreatedAt = Date.now()): string {
  return `${GII_ATTACHMENT_KEYWORDS.propostaContestazione}|proposalState=${state}|fileCreatedAt=${fileCreatedAt}`
}

async function queryAttachments (layer: any, oid: number, layerUrl: string): Promise<PropostaContestazioneAttachmentInfo[]> {
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
        for (const g of res) {
          const pid = g?.parentObjectId ?? g?.objectId
          if (Number(pid) === Number(oid)) return normalizeAttachmentInfos(g)
        }
        return normalizeAttachmentInfos(res)
      }
      if (res && typeof res === 'object') {
        if (Array.isArray(res.attachmentGroups)) {
          for (const g of res.attachmentGroups) {
            const pid = g?.parentObjectId ?? g?.objectId
            if (Number(pid) === Number(oid)) return normalizeAttachmentInfos(g)
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
  const queryUrl = `${cleanUrl}/queryAttachments?${qs.toString()}`
  const resp = await fetch(queryUrl, { cache: 'no-store' })
  const rawText = await resp.text().catch(() => '')
  let json: any = {}
  try { json = rawText ? JSON.parse(rawText) : {} } catch { json = { rawResponseText: rawText } }
  if (!resp.ok || json?.error) {
    const diagnostic = {
      operation: 'queryAttachments',
      layerUrl: cleanUrl,
      oid: Number(oid),
      response: {
        httpStatus: resp.status,
        httpStatusText: resp.statusText,
        ok: resp.ok,
        contentType: resp.headers.get('content-type') || '',
        json,
        rawText
      }
    }
    try {
      console.error('[GII][PROPOSTA][queryAttachments] Risposta AGOL completa', diagnostic)
    } catch {}
    const err = json?.error || {}
    const detail = String(
      err?.description ||
      err?.message ||
      (Array.isArray(err?.details) && err.details.length ? err.details.join(' | ') : '') ||
      safeJsonStringify(json) ||
      `HTTP ${resp.status}`
    )
    throw new Error(`queryAttachments non riuscito su ${cleanUrl} · OBJECTID ${Number(oid)} · ${detail}`)
  }
  if (Array.isArray(json?.attachmentGroups)) {
    for (const g of json.attachmentGroups) {
      const pid = g?.parentObjectId ?? g?.objectId
      if (Number(pid) === Number(oid)) return normalizeAttachmentInfos(g)
    }
  }
  if (json && typeof json === 'object') {
    if ((json as any)[oid]) return normalizeAttachmentInfos((json as any)[oid])
    if ((json as any)[String(oid)]) return normalizeAttachmentInfos((json as any)[String(oid)])
  }
  return normalizeAttachmentInfos(json)
}

async function addAttachment (oid: number, file: File, layerUrl: string, state: PropostaContestazioneAttachmentState): Promise<number | null> {
  const cleanUrl = normalizedLayerUrl(layerUrl)
  if (!oid || !file || !cleanUrl) throw new Error('URL del FeatureLayer non disponibile per caricare la Proposta di contestazione.')
  const token = await getEsriTokenForUrl(cleanUrl)
  const fileCreatedAt = Number((file as any)?.lastModified) || Date.now()
  const fd = new FormData()
  fd.append('attachment', file)
  fd.append('f', 'json')
  fd.append('keywords', attachmentKeywords(state, fileCreatedAt))
  if (token) fd.append('token', token)
  const resp = await fetch(`${cleanUrl}/${Number(oid)}/addAttachment`, { method: 'POST', body: fd })
  const json: any = await resp.json().catch(() => ({}))
  const addRes = json?.addAttachmentResult || json
  if (!resp.ok || addRes?.error || json?.error) {
    throw new Error(String(addRes?.error?.message || json?.error?.message || `HTTP ${resp.status}`))
  }
  const id = Number(addRes?.objectId ?? addRes?.id ?? addRes?.attachmentId)
  return Number.isFinite(id) && id > 0 ? id : null
}


function safeJsonStringify (value: any): string {
  try { return JSON.stringify(value) } catch { return String(value) }
}

async function readLayerUpdateAttachmentDiagnostics (layerUrl: string, token: string): Promise<any> {
  const cleanUrl = normalizedLayerUrl(layerUrl)
  if (!cleanUrl) return null
  try {
    const qs = new URLSearchParams({ f: 'json' })
    if (token) qs.set('token', token)
    const resp = await fetch(`${cleanUrl}?${qs.toString()}`, { cache: 'no-store' })
    const json: any = await resp.json().catch(() => ({}))
    if (!resp.ok || json?.error) {
      return {
        httpStatus: resp.status,
        error: json?.error || null
      }
    }
    return {
      httpStatus: resp.status,
      name: json?.name,
      type: json?.type,
      serviceItemId: json?.serviceItemId,
      currentVersion: json?.currentVersion,
      capabilities: json?.capabilities,
      hasAttachments: json?.hasAttachments,
      allowGeometryUpdates: json?.allowGeometryUpdates,
      supportsApplyEditsWithGlobalIds: json?.supportsApplyEditsWithGlobalIds,
      supportsAttachmentsByUploadId: json?.supportsAttachmentsByUploadId,
      ownershipBasedAccessControlForFeatures: json?.ownershipBasedAccessControlForFeatures,
      advancedEditingCapabilities: json?.advancedEditingCapabilities,
      editingInfo: json?.editingInfo
    }
  } catch (error: any) {
    return {
      diagnosticFetchError: error?.message || String(error)
    }
  }
}

async function updateAttachment (oid: number, attachmentId: number, file: File, layerUrl: string): Promise<void> {
  const cleanUrl = normalizedLayerUrl(layerUrl)
  if (!oid || !attachmentId || !file || !cleanUrl) {
    throw new Error('Dati insufficienti per aggiornare la Proposta di contestazione.')
  }
  const token = await getEsriTokenForUrl(cleanUrl)
  const fd = new FormData()
  fd.append('attachmentId', String(attachmentId))
  fd.append('attachment', file)
  fd.append('f', 'json')
  if (token) fd.append('token', token)

  const updateUrl = `${cleanUrl}/${Number(oid)}/updateAttachment`
  const resp = await fetch(updateUrl, { method: 'POST', body: fd, cache: 'no-store' })
  const rawText = await resp.text().catch(() => '')
  let json: any = {}
  try { json = rawText ? JSON.parse(rawText) : {} } catch { json = { rawResponseText: rawText } }

  const updRes = json?.updateAttachmentResult || json
  const updErr = updRes?.error || json?.error || null
  const ok = resp.ok && !updErr && updRes?.success !== false

  if (!ok) {
    const layerDiagnostics = await readLayerUpdateAttachmentDiagnostics(cleanUrl, token)
    const diagnostic = {
      operation: 'updateAttachment',
      layerUrl: cleanUrl,
      updateUrl,
      oid: Number(oid),
      attachmentId: Number(attachmentId),
      file: {
        name: String(file?.name || ''),
        type: String(file?.type || ''),
        size: Number(file?.size || 0),
        lastModified: Number((file as any)?.lastModified || 0)
      },
      response: {
        httpStatus: resp.status,
        httpStatusText: resp.statusText,
        ok: resp.ok,
        contentType: resp.headers.get('content-type') || '',
        json,
        rawText
      },
      layer: layerDiagnostics
    }

    try {
      console.error('[GII][PROPOSTA][updateAttachment] Risposta AGOL completa', diagnostic)
    } catch {}

    const arcgisCode = updErr?.code ?? json?.error?.code ?? null
    const arcgisDescription = updErr?.description || json?.error?.description || ''
    const arcgisMessage = updErr?.message || json?.error?.message || ''
    const responseSummary = safeJsonStringify(json)
    const parts = [
      arcgisCode != null ? `codice ${arcgisCode}` : '',
      arcgisDescription ? String(arcgisDescription) : '',
      arcgisMessage ? String(arcgisMessage) : '',
      !arcgisDescription && !arcgisMessage ? `risposta AGOL: ${responseSummary}` : ''
    ].filter(Boolean)

    throw new Error(
      `updateAttachment non riuscito su ${cleanUrl} · OBJECTID ${Number(oid)} · allegato ${Number(attachmentId)} · ${parts.join(' · ') || `HTTP ${resp.status}`}`
    )
  }
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

export async function replacePropostaContestazionePdfAttachment (
  layer: any,
  oid: number,
  file: File,
  layerUrl: string,
  state: PropostaContestazioneAttachmentState
): Promise<PropostaContestazioneAttachmentInfo[]> {
  const cleanUrl = normalizedLayerUrl(layer?.url || layerUrl || '')
  if (!oid || !file) return []
  if (!cleanUrl) throw new Error('URL del FeatureLayer non disponibile per caricare la Proposta di contestazione.')

  let stage = 'queryAttachments:before'
  let before: PropostaContestazioneAttachmentInfo[] = []
  try {
    before = await queryAttachments(layer, oid, cleanUrl)
  } catch (error: any) {
    try {
      console.error('[GII][PROPOSTA][replace] Errore fase', {
        stage,
        layerUrl: cleanUrl,
        oid: Number(oid),
        message: error?.message || String(error),
        error
      })
    } catch {}
    throw new Error(`${stage} · ${error?.message || String(error)}`)
  }
  const proposalsBefore = before.filter(att => isGiiPropostaContestazionePdfAttachment(att as any))
  const current = pickLatestGiiAttachment(proposalsBefore as any[]) as PropostaContestazioneAttachmentInfo | null

  let keepId: number | null = current?.id && Number(current.id) > 0 ? Number(current.id) : null

  if (keepId) {
    // La Proposta è un unico documento logico: a ogni nuovo ciclo o approvazione
    // ne aggiorniamo il contenuto sullo stesso attachment ID.
    stage = 'updateAttachment'
    try {
      await updateAttachment(oid, keepId, file, cleanUrl)
    } catch (error: any) {
      try {
        console.error('[GII][PROPOSTA][replace] Errore fase', {
          stage,
          layerUrl: cleanUrl,
          oid: Number(oid),
          attachmentId: keepId,
          message: error?.message || String(error),
          error
        })
      } catch {}
      throw new Error(`${stage} · ${error?.message || String(error)}`)
    }
  } else {
    // Solo la prima creazione richiede addAttachment.
    stage = 'addAttachment'
    try {
      keepId = await addAttachment(oid, file, cleanUrl, state)
    } catch (error: any) {
      try {
        console.error('[GII][PROPOSTA][replace] Errore fase', {
          stage,
          layerUrl: cleanUrl,
          oid: Number(oid),
          message: error?.message || String(error),
          error
        })
      } catch {}
      throw new Error(`${stage} · ${error?.message || String(error)}`)
    }
    if (!(keepId && keepId > 0)) {
      throw new Error('La Proposta di contestazione è stata caricata ma non è stato possibile identificarne l’allegato.')
    }
  }

  // Eventuali duplicati lasciati da versioni precedenti vengono ripuliti quando
  // consentito. Il fallimento della cancellazione NON invalida l'aggiornamento
  // del documento corrente.
  stage = 'queryAttachments:after-update'
  let after: PropostaContestazioneAttachmentInfo[] = []
  try {
    after = await queryAttachments(layer, oid, cleanUrl)
  } catch (error: any) {
    try {
      console.error('[GII][PROPOSTA][replace] Errore fase', {
        stage,
        layerUrl: cleanUrl,
        oid: Number(oid),
        attachmentId: keepId,
        message: error?.message || String(error),
        error
      })
    } catch {}
    throw new Error(`${stage} · ${error?.message || String(error)}`)
  }
  const proposalsAfter = after.filter(att => isGiiPropostaContestazionePdfAttachment(att as any))
  for (const att of proposalsAfter) {
    const id = Number(att.id)
    if (!Number.isFinite(id) || id <= 0 || id === keepId) continue
    try {
      await deleteAttachment(oid, id, cleanUrl)
    } catch (cleanupError) {
      try {
        console.warn('[GII][PROPOSTA] Duplicato non eliminato; documento corrente aggiornato correttamente.', {
          oid,
          keepId,
          duplicateId: id,
          cleanupError
        })
      } catch {}
    }
  }

  stage = 'queryAttachments:final'
  let finalList: PropostaContestazioneAttachmentInfo[] = []
  try {
    finalList = await queryAttachments(layer, oid, cleanUrl)
  } catch (error: any) {
    try {
      console.error('[GII][PROPOSTA][replace] Errore fase', {
        stage,
        layerUrl: cleanUrl,
        oid: Number(oid),
        attachmentId: keepId,
        message: error?.message || String(error),
        error
      })
    } catch {}
    throw new Error(`${stage} · ${error?.message || String(error)}`)
  }
  return finalList.filter(att => isGiiPropostaContestazionePdfAttachment(att as any))
}
