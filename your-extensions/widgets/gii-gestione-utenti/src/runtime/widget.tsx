/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx, type AllWidgetProps } from 'jimu-core'
import type { IMConfig } from '../config'
import { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'

const { Fragment } = React

const DEFAULT_SERVICE_URL =
  'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_utenti/FeatureServer/0'

// ── loadEsriModule (AMD require) ───────────────────────────────────────────
function loadEsriModule<T = any>(path: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = (window as any).require
    if (!req) { reject(new Error('AMD require non disponibile')); return }
    try {
      req([path], (mod: T) => resolve(mod), (err: any) => reject(err))
    } catch (e) { reject(e) }
  })
}

// ── Mappa gruppo → Group ID AGOL ──────────────────────────────────────────
const GROUP_MAP: Record<string, string> = {
  'GII_AGR_D1_TR': '5f7a1c6083024ed6912642dea33df836',
  'GII_AGR_D1_TI': 'd2538065685a4e278418d9d4ee63b4f5',
  'GII_AGR_D1_RZ': '77e930cf78684ec28554cb47e09de22c',
  'GII_AGR_D2_TR': 'be5397892089463f9de53c39bfe867d5',
  'GII_AGR_D2_TI': 'b69f51f2b4dc48e5bcd945a0e006a521',
  'GII_AGR_D2_RZ': '80a5260795cf43cca065815fe6e868ab',
  'GII_AGR_D3_TR': 'e8b70407a2cd4f79936d95e4ee2d66d8',
  'GII_AGR_D3_TI': 'd9df51a9ad09458cb7d6677101f8a64c',
  'GII_AGR_D3_RZ': '6bc744628d2742e082d319d302cae2ef',
  'GII_AGR_D4_TR': '98a0edc68f1e4eb3ac06991862407082',
  'GII_AGR_D4_TI': '56a0e66617cc4bbb9415e520f503ad32',
  'GII_AGR_D4_RZ': '40c17e737f5d40cbbdfe0fe28f702446',
  'GII_AGR_D5_TR': 'd0b21d5c77d54f71a951162c102337bf',
  'GII_AGR_D5_TI': '8c201a0905ff4cb7999f375d21962acb',
  'GII_AGR_D5_RZ': '29c74c75fe724258809b2bcaf27d7e21',
  'GII_AGR_D6_TR': 'd4f997fcc65140b585f9784f36b82efb',
  'GII_AGR_D6_TI': 'f82bc26c62cf49328fc101f83121d1a7',
  'GII_AGR_D6_RZ': '62e5ca9cb9e04de7b446cf97d287b815',
  'GII_AGR_DIR': 'efd1d706a54249c785fc2d85fa8a672b',
  'GII_AGR_RI': '4eb266a8da414fe6a47bc16f66c58e6a',
  'GII_AMM_DIR': '317c399ad1984c4392a6341d129fda89',
  'GII_AMM_RI': '73ab7007181c447a89ba5a91f417acb0',
  'GII_AMM_TI': '51d72060aa0540ab9b707fadb2dcca50',
  'GII_TEC_DIR': '720b7ca166d5465e884ea3ad684029b8',
  'GII_TEC_DS_RZ': '7ff515bb66894ee79ce70a9b8f248b94',
  'GII_TEC_DS_TI': 'f204e16c17ff47a3984bedd5b6d4a6d9',
  'GII_TEC_DS_TR': 'ca0fd1f481014871bee270a89bf53bcb',
  'GII_TEC_RI': 'e0cde3526baf4215811c211c7fda43fb',
}

const AGOL_PORTAL = 'https://cbsm-hub.maps.arcgis.com'
const CLIENT_ID   = '1t9qSylui7Nt4Hca'

const MSG_UTENTE_AGOL_VALIDO =
  `Utente AGOL valido richiesto.
` +
  `Inserire lo username di un utente AGOL già presente e validato nell'organizzazione cbsm-hub.
` +
  `Se l'utente non esiste ancora, crearlo o invitarlo prima su ArcGIS Online, quindi riprovare.`

// Ottieni token dalla sessione ExB tramite esriId
async function getAGOLToken(clientSecret: string): Promise<string> {
  try {
    // Prova prima con esriId (IdentityManager) già autenticato in ExB
    const esriId = await loadEsriModule<any>('esri/identity/IdentityManager')
    const creds = esriId.credentials as any[]
    if (creds?.length) {
      // Cerca credenziale per il portale
      const cred = creds.find((c: any) =>
        c.server && c.server.includes('cbsm-hub.maps.arcgis.com')
      ) ?? creds[0]
      if (cred?.token) return cred.token
    }
    // Fallback: genera token con client credentials OAuth2
    const body = new URLSearchParams({
      client_id:     CLIENT_ID,
      client_secret: clientSecret,
      grant_type:    'client_credentials',
      f:             'json',
    })
    const res  = await fetch(`${AGOL_PORTAL}/sharing/rest/oauth2/token`, { method: 'POST', body })
    const json = await res.json()
    return json.access_token ?? ''
  } catch (e) {
    console.error('getAGOLToken error:', e)
    return ''
  }
}

async function ensureAgolUserExists(username: string, token: string): Promise<void> {
  const cleanUsername = String(username || '').trim()
  if (!cleanUsername) throw new Error('Username AGOL obbligatorio')
  if (!token) throw new Error('Token AGOL non disponibile: impossibile verificare lo username')

  const body = new URLSearchParams({ f: 'json', token })
  const res = await fetch(`${AGOL_PORTAL}/sharing/rest/community/users/${encodeURIComponent(cleanUsername)}`, {
    method: 'POST', body,
  })
  const json = await res.json()

  if (!res.ok || json?.error || !json?.username) {
    throw new Error(MSG_UTENTE_AGOL_VALIDO)
  }
}

function friendlyAgolGroupErrorMessage(action: 'add' | 'remove', json: any, username: string, gruppo: string): string {
  const cleanUsername = String(username || '').trim()
  const cleanGroup = String(gruppo || '').trim()
  const actionLabel = action === 'add' ? 'aggiungere' : 'rimuovere'
  const groupActionLabel = action === 'add' ? 'aggiunto al' : 'rimosso dal'
  const details = [
    ...(Array.isArray(json?.notAddedDetails) ? json.notAddedDetails : []),
    ...(Array.isArray(json?.notRemovedDetails) ? json.notRemovedDetails : []),
    ...(Array.isArray(json?.errors) ? json.errors : []),
  ]
  const detailError = details.find((d: any) => d?.error || d?.message)?.error ?? details.find((d: any) => d?.message)
  const err = json?.error ?? detailError ?? null
  const code = String(err?.messageCode ?? err?.code ?? '').trim()
  const message = String(err?.message ?? '').trim()

  if (code === 'COM_1206' || /Public users cannot be added/i.test(message)) {
    return (
      `Impossibile ${actionLabel} l'utente AGOL "${cleanUsername}" al gruppo ${cleanGroup}.\n\n` +
      MSG_UTENTE_AGOL_VALIDO
    )
  }

  if (code === 'COM_1211' || /does not exist or is inaccessible/i.test(message)) {
    return (
      `Impossibile ${actionLabel} l'utente AGOL "${cleanUsername}" al gruppo ${cleanGroup}.\n\n` +
      MSG_UTENTE_AGOL_VALIDO
    )
  }

  if (code === '498' || code === '499' || /token/i.test(message)) {
    return (
      `Impossibile ${actionLabel} l'utente AGOL "${cleanUsername}" al gruppo ${cleanGroup}.\n\n` +
      `La sessione/token AGOL non è più valida. Esci e rientra nel gestionale, poi riprova.`
    )
  }

  if (message) {
    return (
      `Impossibile ${actionLabel} l'utente AGOL "${cleanUsername}" al gruppo ${cleanGroup}.\n\n` +
      `L'operazione su ArcGIS Online non è andata a buon fine. ` +
      MSG_UTENTE_AGOL_VALIDO
    )
  }

  return (
    `Impossibile ${actionLabel} l'utente AGOL "${cleanUsername}" al gruppo ${cleanGroup}.\n\n` +
    `L'utente non è stato ${groupActionLabel} gruppo. ` +
    MSG_UTENTE_AGOL_VALIDO
  )
}

function formatAgolError(action: 'add' | 'remove', json: any, username: string, gruppo: string): Error {
  return new Error(friendlyAgolGroupErrorMessage(action, json, username, gruppo))
}

function agolUserEquals(item: any, username: string): boolean {
  const wanted = String(username || '').trim().toLowerCase()
  if (!wanted) return false
  if (typeof item === 'string') return item.trim().toLowerCase() === wanted
  const itemUser = String(item?.username ?? item?.user ?? item?.userName ?? item?.name ?? '').trim().toLowerCase()
  return itemUser === wanted
}

function userWasNotProcessed(value: any, username: string): boolean {
  return Array.isArray(value) && value.some((item: any) => agolUserEquals(item, username))
}

async function isUserInGroup(username: string, groupId: string, token: string): Promise<boolean> {
  let start = 1
  for (let i = 0; i < 20; i++) {
    const body = new URLSearchParams({ f: 'json', token, start: String(start), num: '100' })
    const res = await fetch(`${AGOL_PORTAL}/sharing/rest/community/groups/${groupId}/users`, {
      method: 'POST', body,
    })
    const json = await res.json()
    if (!res.ok || json?.error) return false

    const users = [
      ...(Array.isArray(json?.admins) ? json.admins : []),
      ...(Array.isArray(json?.users) ? json.users : []),
    ]
    if (users.some((u: any) => agolUserEquals(u, username))) return true

    const nextStart = Number(json?.nextStart ?? -1)
    if (!Number.isFinite(nextStart) || nextStart <= 0 || nextStart === start) break
    start = nextStart
  }
  return false
}

// Aggiungi utente a un gruppo AGOL
async function addUserToGroup(username: string, gruppo: string, token: string): Promise<void> {
  const groupId = GROUP_MAP[gruppo]
  if (!groupId) throw new Error(`Gruppo non mappato: ${gruppo}`)
  if (!token) throw new Error('Token AGOL non disponibile: impossibile aggiungere utente al gruppo')
  await ensureAgolUserExists(username, token)

  const body = new URLSearchParams({ users: String(username || '').trim(), f: 'json', token })
  const res = await fetch(`${AGOL_PORTAL}/sharing/rest/community/groups/${groupId}/addUsers`, {
    method: 'POST', body,
  })
  const json = await res.json()

  if (!res.ok || json?.error || json?.errors?.length) {
    throw formatAgolError('add', json, username, gruppo)
  }

  if (userWasNotProcessed(json?.notAdded, username)) {
    const alreadyInGroup = await isUserInGroup(username, groupId, token)
    if (alreadyInGroup) return
    throw formatAgolError('add', json, username, gruppo)
  }
}

// Rimuovi utente da un gruppo AGOL
async function removeUserFromGroup(username: string, gruppo: string, token: string): Promise<void> {
  const groupId = GROUP_MAP[gruppo]
  if (!groupId) throw new Error(`Gruppo non mappato: ${gruppo}`)
  if (!token) throw new Error('Token AGOL non disponibile: impossibile rimuovere utente dal gruppo')

  const body = new URLSearchParams({ users: String(username || '').trim(), f: 'json', token })
  const res = await fetch(`${AGOL_PORTAL}/sharing/rest/community/groups/${groupId}/removeUsers`, {
    method: 'POST', body,
  })
  const json = await res.json()

  if (!res.ok || json?.error || json?.errors?.length) {
    throw formatAgolError('remove', json, username, gruppo)
  }

  if (userWasNotProcessed(json?.notRemoved, username)) {
    const stillInGroup = await isUserInGroup(username, groupId, token)
    if (!stillInGroup) return
    throw formatAgolError('remove', json, username, gruppo)
  }
}

// ── Domini legacy numerici + codici testuali ───────────────────────────────
const RUOLI = [
  { label: 'TR',    code: 'TR',    value: 1, desc: 'Tecnico rilevatore' },
  { label: 'TI',    code: 'TI',    value: 2, desc: 'Tecnico istruttore' },
  { label: 'RZ',    code: 'RZ',    value: 3, desc: 'Responsabile di zona' },
  { label: 'RI',    code: 'RI',    value: 4, desc: 'Responsabile istruttoria' },
  { label: 'DT',    code: 'DT',    value: 5, desc: 'Direttore tecnico' },
  { label: 'DA',    code: 'DA',    value: 6, desc: 'Direttore amministrativo' },
  { label: 'ADMIN', code: 'ADMIN', value: 7, desc: 'Amministratore' },
]

const AREE = [
  { label: 'AMM', code: 'AMM', value: 1, desc: 'Amministrativa' },
  { label: 'AGR', code: 'AGR', value: 2, desc: 'Agraria' },
  { label: 'TEC', code: 'TEC', value: 3, desc: 'Tecnica' },
]

const SETTORI = [
  { label: 'CR', code: 'CR', value: 1, desc: 'Catasto, Ruoli e Servizi Territoriali' },
  { label: 'GI', code: 'GI', value: 2, desc: 'Gestione irrigua' },
  { label: 'D1', code: 'D1', value: 3, desc: 'Distretto 1 (Quartu Sant\'Elena/Villaputzu/Muravera – San Sperate)' },
  { label: 'D2', code: 'D2', value: 4, desc: 'Distretto 2 (Serramanna/Pimpisu)' },
  { label: 'D3', code: 'D3', value: 5, desc: 'Distretto 3 (San Gavino - Villacidro)' },
  { label: 'D4', code: 'D4', value: 6, desc: 'Distretto 4 (Basso Sulcis)' },
  { label: 'D5', code: 'D5', value: 7, desc: 'Distretto 5 (Senorbì)' },
  { label: 'D6', code: 'D6', value: 8, desc: 'Distretto 6 (Cixerri)' },
  { label: 'DS', code: 'DS', value: 9, desc: 'Manutenzione opere di dreno e di scolo' },
]

interface Ufficio { label: string; value: number; aree: number[]; settori: number[] }

const UFFICI: Ufficio[] = [
  { label: 'Cagliari',                               value: 1,  aree: [1,2,3], settori: [1,2,9] },
  { label: 'Quartucciu (loc. Is Forreddus)',         value: 2,  aree: [2],   settori: [3]   },
  { label: 'Muravera',                               value: 3,  aree: [2],   settori: [3]   },
  { label: 'Villaputzu',                             value: 4,  aree: [2],   settori: [3]   },
  { label: 'San Sperate',                            value: 5,  aree: [2],   settori: [3]   },
  { label: 'Serramanna (loc. Pimpisu)',              value: 6,  aree: [2],   settori: [4]   },
  { label: 'San Gavino Monreale',                    value: 7,  aree: [2],   settori: [5]   },
  { label: 'Villacidro',                             value: 8,  aree: [2],   settori: [5]   },
  { label: 'San Giovanni Suergiu (loc. Sa Carabia)',value: 9,  aree: [2],   settori: [6]   },
  { label: 'Masainas',                               value: 10, aree: [2],   settori: [6]   },
  { label: 'Senorbì',                                value: 11, aree: [2],   settori: [7]   },
  { label: 'Iglesias (loc. Sa Stoia)',               value: 12, aree: [2],   settori: [8]   },
  { label: 'Siliqua',                                value: 13, aree: [2],   settori: [8]   },
  { label: 'Villasor',                               value: 14, aree: [3],   settori: [9]   },
  { label: 'San Giovanni Suergiu (loc. Is Samis)',  value: 15, aree: [3],   settori: [9]   },
]

// ── Regole cascata ─────────────────────────────────────────────────────────
function getAreePerRuolo(ruolo: number): number[] {
  switch (ruolo) {
    case 1: return [2, 3]        // TR
    case 2: return [1, 2, 3]     // TI
    case 3: return [2, 3]        // RZ
    case 4: return [1, 2, 3]     // RI
    case 5: return [2, 3]        // DT
    case 6: return [1]           // DA
    case 7: return []            // ADMIN (trasversale) → nessuna area
    default: return []
  }
}

function getSettoriPerRuoloArea(ruolo: number, area: number): number[] {
  if (ruolo === 5 || ruolo === 6 || ruolo === 7) return []          // DT, DA, ADMIN → nessun settore
  if (ruolo === 4) {                                  // RI → settore fisso per area
    if (area === 1) return [1]                        // AMM → CR
    if (area === 2) return [2]                        // AGR → GI
    if (area === 3) return [9]                        // TEC → DS
    return []
  }
  if (ruolo === 2 && area === 1) return [1]           // TI + AMM → CR
  if (area === 2) return [3, 4, 5, 6, 7, 8]          // AGR → D1-D6
  if (area === 3) return [9]                          // TEC → DS
  return []
}

function getUfficiPerAreaSettore(area: number, settore: number): Ufficio[] {
  return UFFICI.filter(u => u.aree.includes(area) && u.settori.includes(settore))
}

function calcolaGruppo(ruolo: number, area: number, settore: number): string {
  const r = RUOLI.find(x => x.value === ruolo)?.label ?? ''
  if (r === 'ADMIN') return ''
  const a = AREE.find(x => x.value === area)?.label ?? ''
  const s = SETTORI.find(x => x.value === settore)?.label ?? ''
  if (a === 'AGR') {
    if (['TR','TI','RZ'].includes(r)) return `GII_AGR_${s}_${r}`
    if (r === 'RI') return 'GII_AGR_RI'
    if (r === 'DT') return 'GII_AGR_DIR'
  }
  if (a === 'TEC') {
    if (['TR','TI','RZ'].includes(r)) return `GII_TEC_${s}_${r}`
    if (r === 'RI') return 'GII_TEC_RI'
    if (r === 'DT') return 'GII_TEC_DIR'
  }
  if (a === 'AMM') {
    if (r === 'DA') return 'GII_AMM_DIR'
    if (r === 'TI') return 'GII_AMM_TI'
    if (r === 'RI') return 'GII_AMM_RI'
  }
  return ''
}

function codeOf(list: Array<{ value: number; code: string }>, value: number | null | undefined): string | null {
  if (value == null) return null
  return list.find(x => x.value === value)?.code ?? null
}

function normalizeSettoreCod(value: any): string | null {
  const c = String(value ?? '').trim().toUpperCase()
  if (!c) return null
  return c === 'CS' ? 'DS' : c
}

function valueOf(list: Array<{ value: number; code: string }>, code: any): number | null {
  const c0 = String(code ?? '').trim().toUpperCase()
  if (!c0) return null
  const c = list === SETTORI ? (normalizeSettoreCod(c0) ?? c0) : c0
  return list.find(x => x.code === c)?.value ?? null
}

function textOrNull(value: string | null | undefined): string | null {
  const v = String(value ?? '').trim()
  return v ? v : null
}

type DomainLabelMap = Record<string, Record<string, string>>
type GguLockRect = { key: string; left: number; top: number; width: number; height: number }

function getGlobalOverlayHost(): HTMLElement | null {
  try {
    const topBody = (window as any)?.top?.document?.body
    if (topBody) return topBody as HTMLElement
  } catch {}
  try {
    if (typeof document !== 'undefined' && document.body) return document.body as HTMLElement
  } catch {}
  return null
}

function findGguWidgetElement(doc: Document, widgetId: string): HTMLElement | null {
  const id = String(widgetId || '').trim()
  if (!id) return null
  const selectors = [
    `[data-widgetid="${id}"]`,
    `[data-widget-id="${id}"]`,
    `[widgetid="${id}"]`,
    `[id="${id}"]`,
    `#${id}`
  ]
  for (const sel of selectors) {
    try {
      const el = doc.querySelector(sel) as HTMLElement | null
      if (el) return el
    } catch {}
  }
  return null
}

function getVisibleGguLockRect(el: HTMLElement, key: string, viewW: number, viewH: number, win: Window): GguLockRect | null {
  try {
    if (!el || !el.isConnected) return null
    const st = win.getComputedStyle?.(el)
    if (st && (st.display === 'none' || st.visibility === 'hidden' || st.opacity === '0')) return null
    const r = el.getBoundingClientRect()
    const left = Math.max(0, Math.floor(r.left))
    const top = Math.max(0, Math.floor(r.top))
    const right = Math.min(viewW, Math.ceil(r.right))
    const bottom = Math.min(viewH, Math.ceil(r.bottom))
    const width = Math.max(0, right - left)
    const height = Math.max(0, bottom - top)
    if (width < 2 || height < 2) return null
    return { key, left, top, width, height }
  } catch {
    return null
  }
}

function buildDomainLabelMap(fields: any[] | undefined): DomainLabelMap {
  const out: DomainLabelMap = {}
  for (const f of fields || []) {
    const fieldName = String(f?.name || '').trim()
    const codedValues = f?.domain?.codedValues
    if (!fieldName || !Array.isArray(codedValues)) continue
    const map: Record<string, string> = {}
    for (const cv of codedValues) {
      const codeRaw = cv?.code
      if (codeRaw === null || codeRaw === undefined || codeRaw === '') continue
      const label = String(cv?.name ?? cv?.label ?? cv?.description ?? codeRaw).trim()
      const rawKey = String(codeRaw).trim()
      if (rawKey) map[rawKey] = label
      const normKey = normalizeSettoreCod(codeRaw) ?? String(codeRaw).trim().toUpperCase()
      if (normKey) map[normKey] = label
    }
    out[fieldName] = map
  }
  return out
}

function getDomainLabel(domainMap: DomainLabelMap | null | undefined, fieldName: string, code: any): string {
  const map = domainMap?.[fieldName]
  if (!map) return ''
  const rawKey = String(code ?? '').trim()
  const normKey = normalizeSettoreCod(code) ?? String(code ?? '').trim().toUpperCase()
  return String(map[rawKey] || map[normKey] || '').trim()
}

function getDomainLabelFromCandidates(domainMap: DomainLabelMap | null | undefined, textField: string, textCode: any, legacyField: string, legacyValue: any): string {
  return getDomainLabel(domainMap, textField, textCode) || getDomainLabel(domainMap, legacyField, legacyValue)
}

function fallbackItemLabel(list: Array<{ label: string; value: number; desc?: string }>, val: number | null | undefined): string {
  if (val == null) return ''
  const item = list.find(x => x.value === val)
  return item?.desc || item?.label || ''
}

function labelForDomainItem(
  list: Array<{ label: string; code: string; value: number; desc?: string }>,
  val: number | null | undefined,
  domainMap: DomainLabelMap | null | undefined,
  textField: string,
  legacyField: string
): string {
  if (val == null) return ''
  const item = list.find(x => x.value === val)
  if (!item) return ''
  return getDomainLabelFromCandidates(domainMap, textField, item.code, legacyField, item.value) || item.desc || item.label
}

function optionLabelForDomainItem(
  item: { label: string; code: string; value: number; desc?: string },
  domainMap: DomainLabelMap | null | undefined,
  textField: string,
  legacyField: string
): string {
  const label = getDomainLabelFromCandidates(domainMap, textField, item.code, legacyField, item.value) || item.desc || item.label
  return label === item.label ? item.label : `${item.label} – ${label}`
}

function dash(value: string): string {
  return String(value || '').trim() || '—'
}

// ── Tipi ───────────────────────────────────────────────────────────────────
interface UtenteForm {
  objectid?: number
  username: string
  full_name: string
  ruolo: number | null
  area: number | null
  settore: number | null
  ufficio: number | null
  ruolo_cod: string | null
  area_cod: string | null
  settore_cod: string | null
  gruppo: string
  gruppo_precedente: string  // usato da PA per rimozione dal vecchio gruppo
}

interface UtenteRecord {
  objectid: number
  username: string
  full_name: string
  ruolo: number | null
  area: number | null
  settore: number | null
  ufficio: number | null
  ruolo_cod: string | null
  area_cod: string | null
  settore_cod: string | null
  gruppo: string
  gruppo_precedente: string
}

type SortField = 'username' | 'full_name' | 'ruolo' | 'area' | 'settore' | 'ufficio' | 'gruppo'
type SortDirection = 'asc' | 'desc'
interface SortRule { field: SortField; dir: SortDirection }

const SORTABLE_COLUMNS: Array<{ field: SortField; label: string }> = [
  { field: 'username', label: 'Username' },
  { field: 'full_name', label: 'Nome' },
  { field: 'ruolo', label: 'Ruolo' },
  { field: 'area', label: 'Area' },
  { field: 'settore', label: 'Settore' },
  { field: 'ufficio', label: 'Ufficio' },
  { field: 'gruppo', label: 'Gruppo' },
]

const emptyForm = (): UtenteForm => ({
  username: '', full_name: '',
  ruolo: null, area: null, settore: null, ufficio: null,
  ruolo_cod: null, area_cod: null, settore_cod: null,
  gruppo: '', gruppo_precedente: '',
})

// ── FeatureLayer ───────────────────────────────────────────────────────────
let _fl: any = null
let _flUrl = ''

async function getFL(serviceUrl: string): Promise<any> {
  const cleanUrl = String(serviceUrl || DEFAULT_SERVICE_URL).trim().replace(/\/$/, '')
  if (_fl && _flUrl === cleanUrl) return _fl
  const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
  _fl = new FeatureLayer({ url: cleanUrl })
  _flUrl = cleanUrl
  await _fl.load().catch(() => {})
  return _fl
}

async function fetchUtenti(serviceUrl: string): Promise<UtenteRecord[]> {
  const fl = await getFL(serviceUrl)
  const res = await fl.queryFeatures({
    where: '1=1',
    outFields: ['OBJECTID','username','full_name','ruolo','area','settore','ufficio','ruolo_cod','area_cod','settore_cod','gruppo','gruppo_precedente'],
    returnGeometry: false,
  })
  return (res.features ?? []).map((f: any) => {
    const a = f.attributes
    return {
      objectid:  a.OBJECTID ?? a.objectid,
      username:  a.username  ?? '',
      full_name: a.full_name ?? '',
      ruolo:       a.ruolo   != null ? Number(a.ruolo)   : valueOf(RUOLI, a.ruolo_cod),
      area:        a.area    != null ? Number(a.area)    : valueOf(AREE, a.area_cod),
      settore:     a.settore != null ? Number(a.settore) : valueOf(SETTORI, a.settore_cod),
      ufficio:     a.ufficio != null ? Number(a.ufficio) : null,
      ruolo_cod:   textOrNull(a.ruolo_cod)   ?? codeOf(RUOLI,   a.ruolo),
      area_cod:    textOrNull(a.area_cod)    ?? codeOf(AREE,    a.area),
      settore_cod: normalizeSettoreCod(a.settore_cod) ?? codeOf(SETTORI, a.settore),
      gruppo:      a.gruppo  ?? '',
      gruppo_precedente: a.gruppo_precedente ?? '',
    }
  })
}

async function saveUtente(form: UtenteForm, serviceUrl: string): Promise<void> {
  const fl = await getFL(serviceUrl)
  const attrs: any = {
    username:          form.username,
    full_name:         form.full_name,
    ruolo:             form.ruolo,
    area:              form.area,
    settore:           form.settore,
    ufficio:           form.ufficio,
    ruolo_cod:         codeOf(RUOLI, form.ruolo),
    area_cod:          codeOf(AREE, form.area),
    settore_cod:       codeOf(SETTORI, form.settore),
    gruppo:            form.gruppo || null,
    gruppo_precedente: form.gruppo_precedente || null,
  }
  if (form.objectid != null) {
    attrs.OBJECTID = form.objectid
    const res = await fl.applyEdits({ updateFeatures: [{ attributes: attrs }] })
    if (res.updateFeatureResults?.[0]?.error)
      throw new Error(res.updateFeatureResults[0].error.description)
  } else {
    const res = await fl.applyEdits({ addFeatures: [{ attributes: attrs }] })
    if (res.addFeatureResults?.[0]?.error)
      throw new Error(res.addFeatureResults[0].error.description)
  }
}

function friendlyDeleteErrorMessage(error: any): string {
  const message = String(error?.description ?? error?.message ?? error ?? '').trim()
  if (/does not support deleting features/i.test(message) || /support deleting/i.test(message)) {
    return (
      `Eliminazione non completata.\n\n` +
      `Il record non è stato eliminato dalla tabella GII_utenti perché il servizio AGOL ha rifiutato l'operazione di cancellazione. ` +
      `Verificare che la cancellazione sia abilitata sul layer e riprovare.`
    )
  }
  return message || 'Eliminazione non completata.'
}

async function deleteUtente(objectid: number, token: string, serviceUrl: string): Promise<void> {
  if (!objectid) throw new Error('OBJECTID utente non valido')
  if (!token) throw new Error('Token AGOL non disponibile: impossibile eliminare il record utente')

  // Uso diretto dell'operazione REST deleteFeatures: evita che il client FeatureLayer
  // blocchi preventivamente la cancellazione in base alle capabilities lette nello schema.
  const body = new URLSearchParams({
    f: 'json',
    token,
    objectIds: String(objectid),
  })
  const cleanUrl = String(serviceUrl || DEFAULT_SERVICE_URL).trim().replace(/\/$/, '')
  const res = await fetch(`${cleanUrl}/deleteFeatures`, { method: 'POST', body })
  const json = await res.json()

  if (!res.ok || json?.error) {
    throw new Error(friendlyDeleteErrorMessage(json?.error ?? json))
  }

  const del = Array.isArray(json?.deleteResults) ? json.deleteResults[0] : null
  if (!del || del.success !== true) {
    throw new Error(friendlyDeleteErrorMessage(del?.error ?? json))
  }
}

// ── Export CSV ────────────────────────────────────────────────────────────
function exportCSV(utenti: UtenteRecord[], domainLabels?: DomainLabelMap): void {
  const rows = utenti.map(u => {
    const area    = u.area_cod    ?? codeOf(AREE, u.area) ?? labelForDomainItem(AREE, u.area, domainLabels, 'area_cod', 'area')
    const settore = u.settore_cod ?? codeOf(SETTORI, u.settore) ?? labelForDomainItem(SETTORI, u.settore, domainLabels, 'settore_cod', 'settore')
    const ufficio = labelForUfficio(u.ufficio, domainLabels)
    const ruolo   = u.ruolo_cod   ?? codeOf(RUOLI, u.ruolo) ?? labelForDomainItem(RUOLI, u.ruolo, domainLabels, 'ruolo_cod', 'ruolo')
    // id_ufficio: valore numerico (codice ufficio)
    const id_uff  = u.ufficio ?? ''
    const gruppo  = u.gruppo ?? ''
    // Escaping celle con virgole
    const esc = (v: any) => {
      const s = String(v ?? '')
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"` : s
    }
    return [u.username, u.full_name, area, settore, ufficio, ruolo, id_uff, gruppo]
      .map(esc).join(',')
  })

  const csv = ['username,full_name,area_cod,settore_cod,ufficio,ruolo,id_ufficio,gruppo', ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = 'utenti.csv'; a.click()
  URL.revokeObjectURL(url)
}

function sortValue(u: UtenteRecord, field: SortField, domainLabels?: DomainLabelMap): string {
  switch (field) {
    case 'username': return u.username ?? ''
    case 'full_name': return u.full_name ?? ''
    case 'ruolo': return labelForDomainItem(RUOLI, u.ruolo, domainLabels, 'ruolo_cod', 'ruolo') || u.ruolo_cod || ''
    case 'area': return labelForDomainItem(AREE, u.area, domainLabels, 'area_cod', 'area') || u.area_cod || ''
    case 'settore': return labelForDomainItem(SETTORI, u.settore, domainLabels, 'settore_cod', 'settore') || u.settore_cod || ''
    case 'ufficio': return labelForUfficio(u.ufficio, domainLabels)
    case 'gruppo': return u.gruppo ?? ''
    default: return ''
  }
}

function labelForUfficio(val: number | null | undefined, domainMap?: DomainLabelMap | null): string {
  if (val == null) return ''
  return getDomainLabel(domainMap, 'ufficio', val) || fallbackItemLabel(UFFICI, val)
}

function compareText(a: string, b: string): number {
  return a.localeCompare(b, 'it', { numeric: true, sensitivity: 'base' })
}

// ── CSS ────────────────────────────────────────────────────────────────────
const styles = `
  .ggu { font-family: Arial, sans-serif; font-size: 13px; padding: 12px; height: 100%; display: flex; flex-direction: column; gap: 10px; box-sizing: border-box; }
  .ggu-title { font-size: var(--ggu-title-font-size, 15px); font-weight: bold; color: var(--ggu-title-color, #93c5fd); border-bottom: 2px solid var(--ggu-title-color, #93c5fd); padding-bottom: 6px; margin: 0; }
  .ggu-form { background: var(--ggu-detail-card-background, #f5f9ff); border: 1px solid #c5d9f1; border-radius: 6px; padding: 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .ggu-field { display: flex; flex-direction: column; gap: 3px; }
  .ggu-label { font-size: var(--ggu-field-label-font-size, 11px); font-weight: bold; color: var(--ggu-field-label-color, #1F4E79); }
  .ggu-input, .ggu-select { width: 100%; padding: 5px 8px; border: 1px solid #aac4e0; border-radius: 4px; font-size: 13px; box-sizing: border-box; background: #fff; }
  .ggu-input:focus, .ggu-select:focus { outline: none; border-color: #1F4E79; }
  .ggu-input:disabled, .ggu-select:disabled { background: #e8f0e9; color: #375623; font-style: italic; border-color: #b8d4b0; }
  .ggu-btns { display: flex; gap: 8px; grid-column: 1 / -1; padding-top: 4px; }
  .ggu-btn { padding: 6px 18px; border: none; border-radius: 4px; font-size: 13px; cursor: pointer; font-weight: bold; }
  .ggu-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .ggu-btn-save { background: #1F4E79; color: #fff; }
  .ggu-btn-save:hover:not(:disabled) { background: #16375a; }
  .ggu-btn-cancel { background: #e0e0e0; color: #333; }
  .ggu-btn-cancel:hover:not(:disabled) { background: #ccc; }
  .ggu-btn-new { background: #375623; color: #fff; }
  .ggu-btn-new:hover { background: #264018; }
  .ggu-btn-export { background: #1B6584; color: #fff; }
  .ggu-btn-export:hover:not(:disabled) { background: #134d63; }
  .ggu-btn-reset-sort { width: 30px; height: 30px; padding: 0; display: inline-flex; align-items: center; justify-content: center; border-radius: 6px; border: 1px solid #6fa3d3; background: #1F4E79; color: #fff; font-size: 16px; line-height: 1; }
  .ggu-btn-reset-sort:hover:not(:disabled) { background: #16375a; border-color: #93c5fd; }
  .ggu-btn-reset-sort:disabled { background: #e5e7eb; color: #94a3b8; border-color: #cbd5e1; opacity: 1; }
  .ggu-toolbar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .ggu-table-wrap { flex: 1; overflow-y: auto; border: 1px solid #c5d9f1; border-radius: 6px; min-height: 0; background: var(--ggu-records-card-background, #f5f9ff); }
  .ggu-table { width: 100%; border-collapse: collapse; font-size: var(--ggu-table-font-size, 12px); }
  .ggu-table th { background: var(--ggu-table-header-background, #1F4E79); color: var(--ggu-table-header-text, #fff); padding: 7px 8px; text-align: left; position: sticky; top: 0; z-index: 1; white-space: nowrap; }
  .ggu-table th.ggu-sortable { cursor: pointer; user-select: none; }
  .ggu-table th.ggu-sortable:hover { filter: brightness(0.9); }
  .ggu-sort-ind { display: inline-flex; align-items: center; gap: 2px; margin-left: 6px; font-size: 10px; opacity: 0.95; }
  .ggu-sort-order { background: rgba(255,255,255,0.18); border-radius: 999px; padding: 0 4px; font-size: 9px; }
  .ggu-table td { padding: 6px 8px; border-bottom: 1px solid #e0eaf4; vertical-align: middle; }
  .ggu-table tbody tr:nth-child(odd) td { background: var(--ggu-records-card-background, #f5f9ff); }
  .ggu-table tbody tr:nth-child(even) td { background: linear-gradient(rgba(255,255,255,0.55), rgba(255,255,255,0.55)), var(--ggu-records-card-background, #f5f9ff); }
  .ggu-table tbody tr { cursor: pointer; }
  .ggu-table tbody tr:hover > td { background: #ddeeff !important; }
  .ggu-table tbody tr.ggu-sel > td { background: #cfe6ff !important; color: #08233f; box-shadow: none; }
  .ggu-table tbody tr.ggu-sel > td:first-child { box-shadow: inset 4px 0 0 #1F4E79; font-weight: 700; }
  .ggu-act { cursor: pointer; font-size: 11px; padding: 2px 8px; border-radius: 3px; border: none; margin-right: 4px; font-weight: bold; }
  .ggu-act-edit { background: #1B6584; color: #fff; }
  .ggu-act-del { background: #c00; color: #fff; }
  .ggu-msg { padding: 7px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; }
  .ggu-msg-ok { background: #e2efda; color: #375623; border: 1px solid #b8d4b0; }
  .ggu-msg-err { background: #fce4e4; color: #c00; border: 1px solid #f5b8b8; }
  .ggu-modal-backdrop { position: fixed; inset: 0; z-index: 2147483647; background: rgba(15, 23, 42, 0.72); display: flex; align-items: center; justify-content: center; padding: 24px; box-sizing: border-box; pointer-events: auto; }
  .ggu-modal { width: min(560px, 100%); background: #fff; border-radius: 10px; border: 1px solid #f5b8b8; box-shadow: 0 18px 48px rgba(15, 23, 42, 0.55); overflow: hidden; pointer-events: auto; }
  .ggu-modal-head { background: #c00; color: #fff; font-weight: 700; font-size: 14px; padding: 12px 16px; }
  .ggu-modal-body { color: #2b2b2b; font-size: 13px; line-height: 1.45; padding: 16px; white-space: pre-line; }
  .ggu-modal-actions { display: flex; justify-content: flex-end; gap: 8px; padding: 0 16px 16px 16px; }
  .ggu-modal-close { background: #1F4E79; color: #fff; border: none; border-radius: 5px; padding: 7px 18px; font-size: 13px; font-weight: 700; cursor: pointer; }
  .ggu-modal-close:hover { background: #16375a; }
  .ggu-modal-cancel { background: #e0e0e0; color: #333; border: none; border-radius: 5px; padding: 7px 18px; font-size: 13px; font-weight: 700; cursor: pointer; }
  .ggu-modal-cancel:hover { background: #ccc; }
  .ggu-modal-danger { background: #c00; color: #fff; border: none; border-radius: 5px; padding: 7px 18px; font-size: 13px; font-weight: 700; cursor: pointer; }
  .ggu-modal-danger:hover { background: #a00000; }
  .ggu-edit-lock-zone { position: fixed; z-index: 2147483000; background: rgba(0, 0, 0, 0.52); pointer-events: auto; touch-action: none; }
  .ggu.ggu-editing-global-lock { position: relative; }
  .ggu.ggu-editing-global-lock::before { content: ''; position: absolute; inset: 0; z-index: 5; background: rgba(15, 23, 42, 0.22); border-radius: 8px; pointer-events: auto; }
  .ggu.ggu-editing-global-lock .ggu-form { position: relative; z-index: 10; pointer-events: auto; }
  .ggu-gruppo { font-family: monospace; font-size: 11px; background: #e2efda; padding: 2px 6px; border-radius: 3px; color: #375623; white-space: nowrap; }
  .ggu-empty { text-align: center; color: #888; padding: 20px; font-style: italic; }
`

// ── Widget ─────────────────────────────────────────────────────────────────
export default function Widget(props: AllWidgetProps<IMConfig>) {
  const cfg: any = props.config || {}
  const serviceUrl = String(cfg.serviceUrl || DEFAULT_SERVICE_URL).trim() || DEFAULT_SERVICE_URL
  const title = String(cfg.title || 'GII – Gestione Utenti')
  const titleColor = String(cfg.titleColor || '#93c5fd')
  const titleFontSize = Number(cfg.titleFontSize || 15)
  const fieldLabelColor = String(cfg.fieldLabelColor || '#1F4E79')
  const fieldLabelFontSize = Number(cfg.fieldLabelFontSize || 11)
  const detailCardBackgroundColor = String(cfg.detailCardBackgroundColor || '#f5f9ff')
  const recordsCardBackgroundColor = String(cfg.recordsCardBackgroundColor || '#f5f9ff')
  const tableHeaderBackgroundColor = String(cfg.tableHeaderBackgroundColor || '#1F4E79')
  const tableHeaderTextColor = String(cfg.tableHeaderTextColor || '#ffffff')
  const tableFontSize = Number(cfg.tableFontSize || 12)

  const [utenti, setUtenti]   = useState<UtenteRecord[]>([])
  const [form, setForm]       = useState<UtenteForm>(emptyForm())
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [msg, setMsg]         = useState<{ text: string; ok: boolean } | null>(null)
  const [errorPopup, setErrorPopup] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<UtenteRecord | null>(null)
  const popupCloseRef = useRef<HTMLButtonElement | null>(null)
  const confirmCancelRef = useRef<HTMLButtonElement | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [editLockRects, setEditLockRects] = useState<GguLockRect[]>([])
  const [selectedObjectId, setSelectedObjectId] = useState<number | null>(null)
  const [sortRules, setSortRules] = useState<SortRule[]>([])
  const [domainLabels, setDomainLabels] = useState<DomainLabelMap>({})

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!editing) {
      setEditLockRects([])
      return
    }

    const host = getGlobalOverlayHost()
    const doc = host?.ownerDocument || document
    const win = doc.defaultView || window

    const computeRects = () => {
      const viewW = Math.max(0, win.innerWidth || doc.documentElement?.clientWidth || 0)
      const viewH = Math.max(0, win.innerHeight || doc.documentElement?.clientHeight || 0)

      // Stessa impostazione del cw editing:
      // blocco gli elementi di navigazione veri e propri, non il widget sidebar.
      // Così il pulsante della barra laterale resta libero.
      const idsToMask = [
        'widget_840', // GII Header
        'widget_963'  // GII Navigazione - Gestione Utenti
      ]

      const next: GguLockRect[] = []
      for (const id of idsToMask) {
        const el = findGguWidgetElement(doc, id)
        const rect = el ? getVisibleGguLockRect(el, id, viewW, viewH, win) : null
        if (rect) next.push(rect)
      }

      // Fallback prudente: se gli id ExB non sono reperibili,
      // blocca almeno header e fascia sinistra fino al widget utenti.
      if (next.length === 0 && rootRef.current) {
        try {
          const r = rootRef.current.getBoundingClientRect()
          const headerH = Math.max(0, Math.floor(r.top))
          const leftW = Math.max(0, Math.floor(r.left))
          if (headerH > 0) next.push({ key: 'fallback-header', left: 0, top: 0, width: viewW, height: headerH })
          if (leftW > 0) next.push({ key: 'fallback-left', left: 0, top: headerH, width: leftW, height: Math.max(0, viewH - headerH) })
        } catch {}
      }

      setEditLockRects(next)
    }

    let raf = 0
    const schedule = () => {
      try { if (raf) win.cancelAnimationFrame(raf) } catch {}
      try { raf = win.requestAnimationFrame(computeRects) } catch { computeRects() }
    }

    schedule()

    let ro: ResizeObserver | null = null
    try {
      if (typeof ResizeObserver !== 'undefined') {
        ro = new ResizeObserver(schedule)
        const observed = new Set<Element>()
        for (const id of ['widget_840', 'widget_963']) {
          const el = findGguWidgetElement(doc, id)
          if (el && !observed.has(el)) {
            observed.add(el)
            ro.observe(el)
          }
        }
        if (rootRef.current && !observed.has(rootRef.current)) ro.observe(rootRef.current)
      }
    } catch { ro = null }

    const blockEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        if (typeof (event as any).stopImmediatePropagation === 'function') {
          ;(event as any).stopImmediatePropagation()
        }
      }
    }

    win.addEventListener('resize', schedule, true)
    win.addEventListener('scroll', schedule, true)
    document.addEventListener('keydown', blockEscape, true)
    const intervalId = win.setInterval(schedule, 300)

    return () => {
      try { if (raf) win.cancelAnimationFrame(raf) } catch {}
      try { ro?.disconnect() } catch {}
      try { win.removeEventListener('resize', schedule, true) } catch {}
      try { win.removeEventListener('scroll', schedule, true) } catch {}
      try { document.removeEventListener('keydown', blockEscape, true) } catch {}
      try { win.clearInterval(intervalId) } catch {}
      setEditLockRects([])
    }
  }, [editing])

  useEffect(() => {
    if (!errorPopup && !deleteConfirm) return

    const previousActive = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    window.setTimeout(() => {
      if (deleteConfirm) confirmCancelRef.current?.focus()
      else popupCloseRef.current?.focus()
    }, 0)

    const blockEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
      }
    }

    document.addEventListener('keydown', blockEscape, true)
    return () => {
      document.removeEventListener('keydown', blockEscape, true)
      document.body.style.overflow = previousOverflow
      previousActive?.focus?.()
    }
  }, [errorPopup, deleteConfirm])

  const handlePopupKeyDown = (event: any) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      return
    }
    if (event.key === 'Tab') {
      event.preventDefault()
      if (deleteConfirm) confirmCancelRef.current?.focus()
      else popupCloseRef.current?.focus()
    }
  }

  const closeErrorPopup = () => setErrorPopup(null)
  const closeDeleteConfirm = () => setDeleteConfirm(null)

  const load = async () => {
    setLoading(true)
    try {
      const fl = await getFL(serviceUrl)
      setDomainLabels(buildDomainLabelMap(fl.fields))
      const rows = await fetchUtenti(serviceUrl)
      setUtenti(rows)
      setSelectedObjectId(sel => rows.some(r => r.objectid === sel) ? sel : null)
    }
    catch (e: any) { showMsg('Errore caricamento: ' + (e?.message ?? e), false) }
    setLoading(false)
  }

  const showMsg = (text: string, ok: boolean) => {
    if (!ok) {
      setMsg(null)
      setDeleteConfirm(null)
      setErrorPopup(text)
      return
    }
    setErrorPopup(null)
    setDeleteConfirm(null)
    setMsg({ text, ok })
    setTimeout(() => setMsg(null), 4000)
  }

  const sortedUtenti = useMemo(() => {
    if (sortRules.length === 0) return utenti
    const arr = [...utenti]
    arr.sort((a, b) => {
      for (const rule of sortRules) {
        const cmp = compareText(sortValue(a, rule.field, domainLabels), sortValue(b, rule.field, domainLabels))
        if (cmp !== 0) return rule.dir === 'asc' ? cmp : -cmp
      }
      return a.objectid - b.objectid
    })
    return arr
  }, [utenti, sortRules, domainLabels])

  const toggleSort = (field: SortField) => {
    setSortRules(prev => {
      const idx = prev.findIndex(r => r.field === field)
      if (idx < 0) return [...prev, { field, dir: 'asc' }]
      const next = [...prev]
      if (next[idx].dir === 'asc') {
        next[idx] = { field, dir: 'desc' }
        return next
      }
      next.splice(idx, 1)
      return next
    })
  }

  const sortBadge = (field: SortField) => {
    const idx = sortRules.findIndex(r => r.field === field)
    if (idx < 0) return null
    const rule = sortRules[idx]
    return (
      <span className="ggu-sort-ind">
        <span>{rule.dir === 'asc' ? '▲' : '▼'}</span>
        <span className="ggu-sort-order">{idx + 1}</span>
      </span>
    )
  }

  const resetSort = () => setSortRules([])

  // ── Cascata ───────────────────────────────────────────────────────────────
  const onRuoloChange = (val: number | null) => {
    // ADMIN: non assegnare automaticamente area/settore/ufficio né gruppi.
    // L'utente admin (owner) ha già privilegi nativi e, se serve, può essere messo manualmente nei gruppi AGOL.
    if (val === 7) {
      setForm(f => ({ ...f, ruolo: 7, area: null, settore: null, ufficio: null, ruolo_cod: 'ADMIN', area_cod: null, settore_cod: null, gruppo: '' }))
      return
    }
    const aree = val ? getAreePerRuolo(val) : []
    const areaAuto = aree.length === 1 ? aree[0] : null
    const settori = val && areaAuto ? getSettoriPerRuoloArea(val, areaAuto) : []
    const settoreAuto = settori.length === 1 ? settori[0] : null
    const isCalgliari = val && (val === 4 || val === 5 || val === 6 || (val === 2 && areaAuto === 1))
    const ufficioAuto = isCalgliari ? 1 : null
    const gr = val && areaAuto ? calcolaGruppo(val, areaAuto, settoreAuto ?? 0) : ''
    setForm(f => ({ ...f, ruolo: val, area: areaAuto, settore: settoreAuto, ufficio: ufficioAuto, ruolo_cod: codeOf(RUOLI, val), area_cod: codeOf(AREE, areaAuto), settore_cod: codeOf(SETTORI, settoreAuto), gruppo: gr }))
  }

  const onAreaChange = (val: number | null) => {
    if (!form.ruolo) return
    const settori = val ? getSettoriPerRuoloArea(form.ruolo, val) : []
    const settoreAuto = settori.length === 1 ? settori[0] : null
    const isCagliari = form.ruolo === 4 || form.ruolo === 5 || form.ruolo === 6 || (form.ruolo === 2 && val === 1)
    const ufficioAuto = isCagliari ? 1 : null
    const gr = form.ruolo && val ? calcolaGruppo(form.ruolo, val, settoreAuto ?? 0) : ''
    setForm(f => ({ ...f, area: val, settore: settoreAuto, ufficio: ufficioAuto, area_cod: codeOf(AREE, val), settore_cod: codeOf(SETTORI, settoreAuto), gruppo: gr }))
  }

  const onSettoreChange = (val: number | null) => {
    if (!form.ruolo || !form.area) return
    const uffici = val ? getUfficiPerAreaSettore(form.area, val) : []
    const ufficioAuto = uffici.length === 1 ? uffici[0].value : null
    const gr = form.ruolo && form.area && val ? calcolaGruppo(form.ruolo, form.area, val) : ''
    setForm(f => ({ ...f, settore: val, ufficio: ufficioAuto, settore_cod: codeOf(SETTORI, val), gruppo: gr }))
  }

  const onUfficioChange = (val: number | null) => {
    setForm(f => ({ ...f, ufficio: val }))
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const onNew = () => { setSelectedObjectId(null); setForm(emptyForm()); setEditing(true) }

  const onEdit = (u: UtenteRecord) => {
    setSelectedObjectId(u.objectid)
    const isAdmin = u.ruolo === 7
    setForm({
      objectid:          u.objectid,
      username:          u.username,
      full_name:         u.full_name,
      ruolo:             u.ruolo,
      area:              isAdmin ? null : u.area,
      settore:           isAdmin ? null : u.settore,
      ufficio:           isAdmin ? null : u.ufficio,
      ruolo_cod:         isAdmin ? 'ADMIN' : (u.ruolo_cod ?? codeOf(RUOLI, u.ruolo)),
      area_cod:          isAdmin ? null    : (u.area_cod ?? codeOf(AREE, u.area)),
      settore_cod:       isAdmin ? null    : (u.settore_cod ?? codeOf(SETTORI, u.settore)),
      gruppo:            isAdmin ? ''   : u.gruppo,
      gruppo_precedente: isAdmin ? ''   : u.gruppo,  // salva il gruppo attuale → PA lo userà per la rimozione
    })
    setEditing(true)
  }

  const onCancel = () => { setForm(emptyForm()); setEditing(false) }

  const onSave = async () => {
    if (!form.username.trim())  { showMsg('Username AGOL obbligatorio', false); return }
    if (!form.full_name.trim()) { showMsg('Nome completo obbligatorio', false); return }
    if (!form.ruolo)            { showMsg('Ruolo obbligatorio', false); return }
    // ADMIN: non richiede area/settore/ufficio e non gestisce gruppi (ha privilegi nativi AGOL).
    if (form.ruolo !== 7) {
      if (!form.area)             { showMsg('Area obbligatoria', false); return }
      const settoriPrevisti = getSettoriPerRuoloArea(form.ruolo, form.area)
      if (settoriPrevisti.length > 0 && !form.settore) { showMsg('Settore obbligatorio', false); return }
      if (!form.ufficio)          { showMsg('Ufficio obbligatorio', false); return }
    }
    setSaving(true)
    try {
      // Sanitize: ADMIN è trasversale (mai area/settore/ufficio/gruppo)
      const formSan = form.ruolo === 7
        ? { ...form, username: form.username.trim(), area: null, settore: null, ufficio: null, ruolo_cod: 'ADMIN', area_cod: null, settore_cod: null, gruppo: '', gruppo_precedente: '' }
        : { ...form, username: form.username.trim() }

      const token = await getAGOLToken(props.config?.clientSecret ?? '')
      const isUpdate = formSan.objectid != null

      // Gestione gruppi: solo se esiste un gruppo target (per ADMIN è sempre vuoto).
      // In modifica riallinea sempre il gruppo target: se l'utente risulta già membro,
      // addUsers viene trattato come operazione idempotente; se non è membro, viene aggiunto.
      if (isUpdate) {
        if (formSan.gruppo_precedente && formSan.gruppo_precedente !== formSan.gruppo) {
          await removeUserFromGroup(formSan.username, formSan.gruppo_precedente, token)
        }
        if (formSan.gruppo) await addUserToGroup(formSan.username, formSan.gruppo, token)
      } else {
        // Nuovo record: aggiungi al gruppo
        if (formSan.gruppo) await addUserToGroup(formSan.username, formSan.gruppo, token)
      }

      await saveUtente(formSan, serviceUrl)
      showMsg(formSan.objectid ? 'Utente aggiornato' : 'Utente aggiunto', true)
      setEditing(false); setForm(emptyForm()); await load()
    } catch (e: any) { showMsg('Errore: ' + (e?.message ?? e), false) }
    setSaving(false)
  }

  const onDelete = async (u: UtenteRecord) => {
    setDeleteConfirm(u)
  }

  const confirmDeleteUtente = async () => {
    const u = deleteConfirm
    if (!u) return
    setDeleteConfirm(null)
    setSaving(true)
    try {
      const token = await getAGOLToken(props.config?.clientSecret ?? '')
      if (u.gruppo) await removeUserFromGroup(u.username, u.gruppo, token)
      await deleteUtente(u.objectid, token, serviceUrl)
      setSelectedObjectId(sel => sel === u.objectid ? null : sel)
      showMsg('Utente eliminato', true)
      await load()
    } catch (e: any) { showMsg('Errore: ' + (e?.message ?? e), false) }
    setSaving(false)
  }

  // ── Opzioni combo filtrate ────────────────────────────────────────────────
  const areeDisp    = form.ruolo ? AREE.filter(a => getAreePerRuolo(form.ruolo!).includes(a.value)) : []
  const settoriDisp = form.ruolo && form.area ? SETTORI.filter(s => getSettoriPerRuoloArea(form.ruolo!, form.area!).includes(s.value)) : []
  const ufficiDisp  = form.area && form.settore ? getUfficiPerAreaSettore(form.area, form.settore) : []

  const isAreaAuto     = areeDisp.length === 1
  const isSettoreFisso = !!form.ruolo && (
    form.ruolo === 5 || form.ruolo === 6 || form.ruolo === 7 ||
    form.ruolo === 4 ||
    (form.ruolo === 2 && form.area === 1)
  )
  const isUfficioFisso = !!form.ruolo && (
    form.ruolo === 4 || form.ruolo === 5 || form.ruolo === 6 ||
    (form.ruolo === 2 && form.area === 1)
  )

  const labelRuolo = (val: number | null | undefined) => labelForDomainItem(RUOLI, val, domainLabels, 'ruolo_cod', 'ruolo')
  const labelArea = (val: number | null | undefined) => labelForDomainItem(AREE, val, domainLabels, 'area_cod', 'area')
  const labelSettore = (val: number | null | undefined) => labelForDomainItem(SETTORI, val, domainLabels, 'settore_cod', 'settore')
  const labelUfficio = (val: number | null | undefined) => labelForUfficio(val, domainLabels)

  const errorPopupPortal = errorPopup && typeof document !== 'undefined'
    ? createPortal(
      <div
        className="ggu-modal-backdrop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ggu-error-title"
        onClick={(event) => { event.preventDefault(); event.stopPropagation() }}
        onMouseDown={(event) => { event.preventDefault(); event.stopPropagation() }}
        onWheel={(event) => { event.preventDefault(); event.stopPropagation() }}
        onTouchMove={(event) => { event.preventDefault(); event.stopPropagation() }}
        onKeyDown={handlePopupKeyDown}
        tabIndex={-1}
      >
        <div className="ggu-modal" onClick={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()}>
          <div className="ggu-modal-head" id="ggu-error-title">Operazione non completata</div>
          <div className="ggu-modal-body">{errorPopup.replace(/^Errore:\s*/i, '')}</div>
          <div className="ggu-modal-actions">
            <button ref={popupCloseRef} className="ggu-modal-close" onClick={closeErrorPopup}>Ho capito</button>
          </div>
        </div>
      </div>,
      document.body
    )
    : null

  const editLockPortal = editing && !errorPopup && !deleteConfirm && editLockRects.length > 0 && typeof document !== 'undefined'
    ? createPortal(
      <Fragment>
        {editLockRects.map(rect => (
          <div
            key={rect.key}
            className="ggu-edit-lock-zone"
            aria-hidden="true"
            style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
            onPointerDown={(event) => { event.preventDefault(); event.stopPropagation() }}
            onMouseDown={(event) => { event.preventDefault(); event.stopPropagation() }}
            onClick={(event) => { event.preventDefault(); event.stopPropagation() }}
            onDoubleClick={(event) => { event.preventDefault(); event.stopPropagation() }}
            onWheel={(event) => { event.preventDefault(); event.stopPropagation() }}
            onTouchStart={(event) => { event.preventDefault(); event.stopPropagation() }}
          />
        ))}
      </Fragment>,
      getGlobalOverlayHost() || document.body
    )
    : null

  const deleteConfirmPortal = deleteConfirm && typeof document !== 'undefined'
    ? createPortal(
      <div
        className="ggu-modal-backdrop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ggu-delete-title"
        onClick={(event) => { event.preventDefault(); event.stopPropagation() }}
        onMouseDown={(event) => { event.preventDefault(); event.stopPropagation() }}
        onWheel={(event) => { event.preventDefault(); event.stopPropagation() }}
        onTouchMove={(event) => { event.preventDefault(); event.stopPropagation() }}
        onKeyDown={handlePopupKeyDown}
        tabIndex={-1}
      >
        <div className="ggu-modal" onClick={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()}>
          <div className="ggu-modal-head" id="ggu-delete-title">Conferma eliminazione</div>
          <div className="ggu-modal-body">{`Eliminare il profilo utente "${deleteConfirm.username}" dal gestionale?\n\nVerrà eliminato solo il record selezionato dalla tabella GII_utenti e l'utente sarà rimosso solo dal gruppo AGOL associato a questo profilo, se presente. Eventuali altri profili dello stesso username resteranno invariati.`}</div>
          <div className="ggu-modal-actions">
            <button ref={confirmCancelRef} className="ggu-modal-cancel" onClick={closeDeleteConfirm}>Annulla</button>
            <button className="ggu-modal-danger" onClick={confirmDeleteUtente}>Elimina</button>
          </div>
        </div>
      </div>,
      document.body
    )
    : null

  return (
    <Fragment>
      <style>{styles}</style>
      {editLockPortal}
      {errorPopupPortal}
      {deleteConfirmPortal}
      <div
        ref={rootRef}
        className={`ggu ${editing ? 'ggu-editing-global-lock' : ''}`}
        style={{
          '--ggu-title-color': titleColor,
          '--ggu-title-font-size': `${titleFontSize}px`,
          '--ggu-field-label-color': fieldLabelColor,
          '--ggu-field-label-font-size': `${fieldLabelFontSize}px`,
          '--ggu-detail-card-background': detailCardBackgroundColor,
          '--ggu-records-card-background': recordsCardBackgroundColor,
          '--ggu-table-header-background': tableHeaderBackgroundColor,
          '--ggu-table-header-text': tableHeaderTextColor,
          '--ggu-table-font-size': `${tableFontSize}px`
        } as React.CSSProperties}
      >
        <div className="ggu-title">{title}</div>

        {msg && <div className={`ggu-msg ${msg.ok ? 'ggu-msg-ok' : 'ggu-msg-err'}`}>{msg.text}</div>}

        {!editing && (
          <div className="ggu-toolbar">
            <button className="ggu-btn ggu-btn-new" onClick={onNew}>+ Nuovo utente</button>
            <button className="ggu-btn ggu-btn-export" onClick={() => exportCSV(sortedUtenti, domainLabels)}
              disabled={utenti.length === 0}>⬇ Esporta utenti.csv</button>
            <button className="ggu-btn ggu-btn-reset-sort" onClick={resetSort}
              disabled={sortRules.length === 0} title="Reset ordinamento" aria-label="Reset ordinamento">↺</button>
          </div>
        )}

        {editing && (
          <div className="ggu-form">
            <div className="ggu-field">
              <div className="ggu-label">Username AGOL *</div>
              <input className="ggu-input" value={form.username}
                placeholder="username AGOL valido"
                title="Inserire lo username di un utente AGOL già presente e validato nell\'organizzazione cbsm-hub"
                onChange={e => setForm(f => ({ ...f, username: e.target.value.trim() }))} />
            </div>
            <div className="ggu-field">
              <div className="ggu-label">Nome completo *</div>
              <input className="ggu-input" value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div className="ggu-field">
              <div className="ggu-label">Ruolo *</div>
              <select className="ggu-select" value={form.ruolo ?? ''}
                onChange={e => onRuoloChange(e.target.value ? Number(e.target.value) : null)}>
                <option value="">— seleziona —</option>
                {RUOLI.map(r => <option key={r.value} value={r.value}>{optionLabelForDomainItem(r, domainLabels, 'ruolo_cod', 'ruolo')}</option>)}
              </select>
            </div>
            <div className="ggu-field">
              <div className="ggu-label">Area *</div>
              {form.ruolo === 7
                ? <input className="ggu-input" disabled value="—" />
                : <select className="ggu-select" value={form.area ?? ''}
                    disabled={!form.ruolo || isAreaAuto}
                    onChange={e => onAreaChange(e.target.value ? Number(e.target.value) : null)}>
                    <option value="">— seleziona —</option>
                    {areeDisp.map(a => <option key={a.value} value={a.value}>{optionLabelForDomainItem(a, domainLabels, 'area_cod', 'area')}</option>)}
                  </select>
              }
            </div>
            <div className="ggu-field">
              <div className="ggu-label">Settore</div>
              {isSettoreFisso
                ? <input className="ggu-input" disabled value={dash(labelSettore(form.settore))} />
                : <select className="ggu-select" value={form.settore ?? ''}
                    disabled={!form.area || settoriDisp.length === 0}
                    onChange={e => onSettoreChange(e.target.value ? Number(e.target.value) : null)}>
                    <option value="">— seleziona —</option>
                    {settoriDisp.map(s => <option key={s.value} value={s.value}>{optionLabelForDomainItem(s, domainLabels, 'settore_cod', 'settore')}</option>)}
                  </select>
              }
            </div>
            <div className="ggu-field">
              <div className="ggu-label">Ufficio *</div>
              {form.ruolo === 7
                ? <input className="ggu-input" disabled value="—" />
                : (isUfficioFisso
                  ? <input className="ggu-input" disabled value={labelUfficio(form.ufficio) || 'Cagliari'} />
                  : <select className="ggu-select" value={form.ufficio ?? ''}
                      disabled={!form.settore || ufficiDisp.length === 0}
                      onChange={e => onUfficioChange(e.target.value ? Number(e.target.value) : null)}>
                      <option value="">— seleziona —</option>
                      {ufficiDisp.map(u => <option key={u.value} value={u.value}>{labelUfficio(u.value) || u.label}</option>)}
                    </select>
                )
              }
            </div>
            <div className="ggu-field">
              <div className="ggu-label">Gruppo</div>
              <input className="ggu-input" disabled value={form.gruppo} />
            </div>
            <div className="ggu-btns">
              <button className="ggu-btn ggu-btn-save" onClick={onSave} disabled={saving}>
                {saving ? 'Salvataggio...' : form.objectid ? 'Aggiorna' : 'Salva'}
              </button>
              <button className="ggu-btn ggu-btn-cancel" onClick={onCancel} disabled={saving}>Annulla</button>
            </div>
          </div>
        )}

        <div className="ggu-table-wrap">
          {loading
            ? <div className="ggu-empty">Caricamento...</div>
            : (
              <table className="ggu-table">
                <thead>
                  <tr>
                    {SORTABLE_COLUMNS.map(col => (
                      <th key={col.field} className="ggu-sortable" onClick={() => toggleSort(col.field)}
                        title="Clic: aggiungi/inverti/rimuovi ordinamento">
                        {col.label}{sortBadge(col.field)}
                      </th>
                    ))}
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {utenti.length === 0 && (
                    <tr><td colSpan={8} className="ggu-empty">Nessun utente presente</td></tr>
                  )}
                  {sortedUtenti.map(u => (
                    <tr key={u.objectid}
                      className={selectedObjectId === u.objectid || form.objectid === u.objectid ? 'ggu-sel' : ''}
                      onClick={() => setSelectedObjectId(u.objectid)}
                      onDoubleClick={() => onEdit(u)}>
                      <td>{u.username}</td>
                      <td>{u.full_name}</td>
                      <td>{dash(labelRuolo(u.ruolo))}</td>
                      <td>{dash(labelArea(u.area))}</td>
                      <td>{dash(labelSettore(u.settore))}</td>
                      <td>{dash(labelUfficio(u.ufficio))}</td>
                      <td><span className="ggu-gruppo">{dash(u.gruppo)}</span></td>
                      <td>
                        <button className="ggu-act ggu-act-edit" onClick={(e) => { e.stopPropagation(); onEdit(u) }}>✎</button>
                        <button className="ggu-act ggu-act-del" onClick={(e) => { e.stopPropagation(); onDelete(u) }}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </div>
      </div>
    </Fragment>
  )
}
