/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx, type AllWidgetProps, SessionManager } from 'jimu-core'
import type { IMConfig } from '../config'
import { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'

const { Fragment } = React


type TransferActionIconName = 'import' | 'export'

function TransferActionIcon (props: { name: TransferActionIconName, size?: number }): React.ReactElement {
  const size = Number(props.size || 18)
  if (props.name === 'import') {
    return (
      <svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true' focusable='false'>
        <path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'/>
        <path d='M17 8l-5-5-5 5'/>
        <path d='M12 3v12'/>
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

function transferActionButtonStyle (disabled: boolean): React.CSSProperties {
  return {
    width: 32,
    height: 32,
    padding: 0,
    boxSizing: 'border-box',
    borderRadius: 7,
    border: `1.5px solid ${disabled ? '#e5e7eb' : '#0d3b66'}`,
    background: disabled ? '#e5e7eb' : '#ffffff',
    color: disabled ? '#9ca3af' : '#0d3b66',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
    flex: '0 0 auto',
    opacity: disabled ? 0.6 : 1
  }
}





type NewRecordButtonProps = {
  onClick: (event: any) => void
  disabled?: boolean
  title: string
}

function NewRecordButton (props: NewRecordButtonProps) {
  const disabled = !!props.disabled
  return (
    <button
      type='button'
      disabled={disabled}
      onClick={props.onClick}
      title={props.title}
      aria-label={props.title}
      style={{
        width: 32,
        height: 32,
        minHeight: 32,
        boxSizing: 'border-box',
        padding: 0,
        borderRadius: 7,
        border: disabled ? '1.5px solid #e5e7eb' : '1.5px solid #0d3b66',
        background: disabled ? '#e5e7eb' : '#ffffff',
        color: disabled ? '#9ca3af' : '#0d3b66',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 1,
        whiteSpace: 'nowrap',
        flex: '0 0 auto',
        opacity: disabled ? 0.6 : 1
      }}
    >
      <svg width={19} height={19} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true' focusable='false'>
        <path d='M21 13.1v5.9c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2v-4'/>
        <path d='M3 15V5c0-1.1.9-2 2-2h5.9'/>
        <path d='M16.5 3v9'/>
        <path d='M12 7.5h9'/>
      </svg>
    </button>
  )
}

type RecordActionButtonProps = {
  onClick: (event: any) => void
  disabled?: boolean
  title?: string
  ariaLabel?: string
  marginRight?: number
}

function recordActionStyle (color: string, disabled: boolean, marginRight = 0): React.CSSProperties {
  return {
    border: 'none',
    background: 'transparent',
    color,
    cursor: disabled ? 'not-allowed' : 'pointer',
    width: 30,
    height: 30,
    padding: 0,
    boxSizing: 'border-box',
    marginRight,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
    opacity: disabled ? 0.45 : 1
  }
}

function RecordEditButton (props: RecordActionButtonProps) {
  const disabled = !!props.disabled
  const title = props.title || 'Modifica'
  const ariaLabel = props.ariaLabel || title
  return (
    <button type='button' disabled={disabled} onClick={props.onClick} title={title} aria-label={ariaLabel} style={recordActionStyle('#0d3b66', disabled, props.marginRight ?? 4)}>
      <svg width={18} height={18} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true' focusable='false'>
        <path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7'/>
        <path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'/>
      </svg>
    </button>
  )
}

function RecordDuplicateButton (props: RecordActionButtonProps) {
  const disabled = !!props.disabled
  const title = props.title || 'Nuova assegnazione'
  const ariaLabel = props.ariaLabel || title
  return (
    <button type='button' disabled={disabled} onClick={props.onClick} title={title} aria-label={ariaLabel} style={recordActionStyle('#0d3b66', disabled, props.marginRight ?? 4)}>
      <svg width={18} height={18} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true' focusable='false'>
        <rect x='9' y='9' width='11' height='11' rx='2'/>
        <path d='M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1'/>
        <path d='M14.5 12v5'/>
        <path d='M12 14.5h5'/>
      </svg>
    </button>
  )
}

function RecordDeleteButton (props: RecordActionButtonProps) {
  const disabled = !!props.disabled
  const title = props.title || 'Elimina'
  const ariaLabel = props.ariaLabel || title
  return (
    <button type='button' disabled={disabled} onClick={props.onClick} title={title} aria-label={ariaLabel} style={recordActionStyle('#b42318', disabled, props.marginRight ?? 0)}>
      <svg width={18} height={18} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true' focusable='false'>
        <path d='M3 6h18'/>
        <path d='M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'/>
        <path d='M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6'/>
        <path d='M10 11v6'/>
        <path d='M14 11v6'/>
      </svg>
    </button>
  )
}

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
  'GII_AGR_D1_IT': 'd2538065685a4e278418d9d4ee63b4f5',
  'GII_AGR_D1_CS': '77e930cf78684ec28554cb47e09de22c',
  'GII_AGR_D2_TR': 'be5397892089463f9de53c39bfe867d5',
  'GII_AGR_D2_IT': 'b69f51f2b4dc48e5bcd945a0e006a521',
  'GII_AGR_D2_CS': '80a5260795cf43cca065815fe6e868ab',
  'GII_AGR_D3_TR': 'e8b70407a2cd4f79936d95e4ee2d66d8',
  'GII_AGR_D3_IT': 'd9df51a9ad09458cb7d6677101f8a64c',
  'GII_AGR_D3_CS': '6bc744628d2742e082d319d302cae2ef',
  'GII_AGR_D4_TR': '98a0edc68f1e4eb3ac06991862407082',
  'GII_AGR_D4_IT': '56a0e66617cc4bbb9415e520f503ad32',
  'GII_AGR_D4_CS': '40c17e737f5d40cbbdfe0fe28f702446',
  'GII_AGR_D5_TR': 'd0b21d5c77d54f71a951162c102337bf',
  'GII_AGR_D5_IT': '8c201a0905ff4cb7999f375d21962acb',
  'GII_AGR_D5_CS': '29c74c75fe724258809b2bcaf27d7e21',
  'GII_AGR_D6_TR': 'd4f997fcc65140b585f9784f36b82efb',
  'GII_AGR_D6_IT': 'f82bc26c62cf49328fc101f83121d1a7',
  'GII_AGR_D6_CS': '62e5ca9cb9e04de7b446cf97d287b815',
  'GII_AGR_DIR': 'efd1d706a54249c785fc2d85fa8a672b',
  'GII_AGR_RIT': '4eb266a8da414fe6a47bc16f66c58e6a',
  'GII_AMM_DIR': '317c399ad1984c4392a6341d129fda89',
  'GII_AMM_RIA': '73ab7007181c447a89ba5a91f417acb0',
  'GII_AMM_IA': '51d72060aa0540ab9b707fadb2dcca50',
  'GII_TEC_DIR': '720b7ca166d5465e884ea3ad684029b8',
  'GII_TEC_DS_CS': '7ff515bb66894ee79ce70a9b8f248b94',
  'GII_TEC_DS_IT': 'f204e16c17ff47a3984bedd5b6d4a6d9',
  'GII_TEC_DS_TR': 'ca0fd1f481014871bee270a89bf53bcb',
  'GII_TEC_RIT': 'e0cde3526baf4215811c211c7fda43fb',
}

const AGOL_PORTAL = 'https://cbsm-hub.maps.arcgis.com'
const CLIENT_ID   = '1t9qSylui7Nt4Hca'

const MSG_UTENTE_AGOL_VALIDO =
  `Utente AGOL valido richiesto.
` +
  `Inserire lo username di un utente AGOL già presente e validato nell'organizzazione cbsm-hub.
` +
  `Se l'utente non esiste ancora, crearlo o invitarlo prima su ArcGIS Online, quindi riprovare.`

// Ottieni anzitutto il token UTENTE della sessione ExB: le operazioni di
// amministrazione dell'organizzazione devono ereditare identità e privilegi
// dell'utente autenticato. Il token applicativo resta solo un fallback.
async function getAGOLToken(clientSecret: string): Promise<string> {
  try {
    const sm: any = SessionManager.getInstance()
    const session: any = sm?.getMainSession?.() || sm?.getSessionByUrl?.(AGOL_PORTAL)
    if (session) {
      if (typeof session.token === 'string' && session.token) return session.token
      if (typeof session.getToken === 'function') {
        const token = String(await session.getToken(`${AGOL_PORTAL}/sharing/rest`) || '')
        if (token) return token
      }
    }
  } catch (e) {
    console.warn('getAGOLToken SessionManager fallback:', e)
  }

  try {
    const esriId = await loadEsriModule<any>('esri/identity/IdentityManager')
    const creds = (esriId.credentials || []) as any[]
    const matching = creds
      .filter((c: any) => {
        const server = String(c?.server || '').toLowerCase()
        return server.includes('cbsm-hub.maps.arcgis.com') || server.includes('arcgis.com/sharing/rest')
      })
      .sort((a: any, b: any) => Number(b?.expires || 0) - Number(a?.expires || 0))
    if (matching[0]?.token) return matching[0].token
  } catch (e) {
    console.warn('getAGOLToken IdentityManager fallback:', e)
  }

  try {
    if (!clientSecret) return ''
    const body = new URLSearchParams({
      client_id:     CLIENT_ID,
      client_secret: clientSecret,
      grant_type:    'client_credentials',
      f:             'json',
    })
    const res  = await fetch(`${AGOL_PORTAL}/sharing/rest/oauth2/token`, { method: 'POST', body })
    const json = await res.json()
    if (!res.ok || json?.error) return ''
    return String(json?.access_token || '')
  } catch (e) {
    console.error('getAGOLToken error:', e)
    return ''
  }
}

type AgolOrganizationMember = {
  username: string
  firstName: string
  lastName: string
  fullName: string
  email: string
  disabled: boolean
}

async function fetchAgolOrganizationMembers(token: string): Promise<AgolOrganizationMember[]> {
  if (!token) throw new Error('Token AGOL non disponibile')

  const selfParams = new URLSearchParams({ f: 'json', token })
  const selfRes = await fetch(`${AGOL_PORTAL}/sharing/rest/portals/self?${selfParams.toString()}`)
  const selfJson = await selfRes.json()
  if (!selfRes.ok || selfJson?.error || !selfJson?.id) throw new Error('Organizzazione AGOL non disponibile')

  // Elenco ufficiale dei membri dell'organizzazione. Questo endpoint restituisce
  // direttamente gli utenti dell'ORG e supporta start/num per la paginazione;
  // non dipende dall'indice della ricerca utenti.
  const usernames = new Map<string, any>()
  let start = 1
  let guard = 0
  while (start > 0 && guard < 500) {
    guard += 1
    const params = new URLSearchParams({
      f: 'json', token, start: String(start), num: '100', sortField: 'fullName', sortOrder: 'asc'
    })
    const res = await fetch(`${AGOL_PORTAL}/sharing/rest/portals/${encodeURIComponent(selfJson.id)}/users?${params.toString()}`)
    const json = await res.json()
    const rows = Array.isArray(json?.users) ? json.users : null
    if (!res.ok || json?.error || !rows) {
      const detail = String(json?.error?.message || json?.message || '').trim()
      throw new Error(detail ? `Elenco membri AGOL non disponibile: ${detail}` : 'Elenco membri AGOL non disponibile')
    }

    for (const u of rows) {
      const username = String(u?.username || '').trim()
      if (username) usernames.set(username.toLowerCase(), u)
    }

    const nextStart = Number(json?.nextStart)
    if (!Number.isFinite(nextStart) || nextStart <= 0 || nextStart === start) break
    start = nextStart
  }

  // La risposta della ricerca non espone sempre e-mail e stato del membro.
  // Completo quindi ogni voce interrogando il profilo AGOL del singolo utente.
  const rawUsers = Array.from(usernames.values())
  const members: AgolOrganizationMember[] = []
  const batchSize = 20
  for (let i = 0; i < rawUsers.length; i += batchSize) {
    const batch = rawUsers.slice(i, i + batchSize)
    const details = await Promise.all(batch.map(async (u: any) => {
      const username = String(u?.username || '').trim()
      try {
        const params = new URLSearchParams({ f: 'json', token })
        const res = await fetch(`${AGOL_PORTAL}/sharing/rest/community/users/${encodeURIComponent(username)}?${params.toString()}`)
        const json = await res.json()
        if (res.ok && !json?.error) return json
      } catch (_) {}
      return u
    }))

    for (const u of details) {
      const username = String(u?.username || '').trim()
      if (!username) continue
      members.push({
        username,
        firstName: String(u?.firstName || '').trim(),
        lastName: String(u?.lastName || '').trim(),
        fullName: String(u?.fullName || '').trim(),
        email: String(u?.email || '').trim().toLowerCase(),
        disabled: !!u?.disabled
      })
    }
  }

  return members.sort((a, b) => {
    const an = (a.fullName || composeFullName(a.firstName, a.lastName) || a.username).toLocaleLowerCase('it')
    const bn = (b.fullName || composeFullName(b.firstName, b.lastName) || b.username).toLocaleLowerCase('it')
    return an.localeCompare(bn, 'it')
  })
}

async function fetchAgolUserProfile(username: string, token: string): Promise<AgolOrganizationMember> {
  const cleanUsername = String(username || '').trim()
  if (!cleanUsername) throw new Error('Username AGOL non disponibile')
  if (!token) throw new Error('Token AGOL non disponibile')
  const params = new URLSearchParams({ f: 'json', token })
  const res = await fetch(`${AGOL_PORTAL}/sharing/rest/community/users/${encodeURIComponent(cleanUsername)}?${params.toString()}`)
  const json = await res.json()
  if (!res.ok || json?.error || !json?.username) {
    const detail = String(json?.error?.message || json?.message || '').trim()
    throw new Error(detail ? `Profilo AGOL non disponibile: ${detail}` : 'Profilo AGOL non disponibile')
  }
  return {
    username: String(json.username || '').trim(),
    firstName: String(json.firstName || '').trim(),
    lastName: String(json.lastName || '').trim(),
    fullName: String(json.fullName || '').trim(),
    email: String(json.email || '').trim().toLowerCase(),
    disabled: !!json.disabled
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

// ── Ruoli applicativi: il codice testuale è l'unica chiave del ruolo ─────────
const RUOLI = [
  { code: 'TR',    desc: 'Tecnico rilevatore' },
  { code: 'IT',    desc: 'Istruttore tecnico' },
  { code: 'IA',    desc: 'Istruttore amministrativo' },
  { code: 'CS',    desc: 'Capo Settore' },
  { code: 'RIT',   desc: 'Responsabile istruttoria tecnica' },
  { code: 'RIA',   desc: 'Responsabile istruttoria amministrativa' },
  { code: 'DT',    desc: 'Direttore tecnico' },
  { code: 'DA',    desc: 'Direttore amministrativo' },
  { code: 'ADMIN', desc: 'Amministratore' },
] as const

type RuoloCod = typeof RUOLI[number]['code']

function normalizeRuoloCod(value: any): RuoloCod | null {
  const code = String(value ?? '').trim().toUpperCase()
  if (!code) return null
  return RUOLI.some(item => item.code === code) ? code as RuoloCod : null
}

function ruoloItem(code: any): (typeof RUOLI)[number] | undefined {
  const normalized = normalizeRuoloCod(code)
  return normalized ? RUOLI.find(item => item.code === normalized) : undefined
}

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
function getAreePerRuolo(ruoloCod: string | null | undefined): number[] {
  switch (normalizeRuoloCod(ruoloCod)) {
    case 'TR': return [2, 3]
    case 'IT': return [2, 3]
    case 'IA': return [1]
    case 'CS': return [2, 3]
    case 'RIT': return [2, 3]
    case 'RIA': return [1]
    case 'DT': return [2, 3]
    case 'DA': return [1]
    case 'ADMIN': return []
    default: return []
  }
}

function getSettoriPerRuoloArea(ruoloCod: string | null | undefined, area: number): number[] {
  const ruolo = normalizeRuoloCod(ruoloCod)
  if (ruolo === 'DT' || ruolo === 'DA' || ruolo === 'ADMIN') return []
  if (ruolo === 'RIT') {                             // RIT → settore fisso per area tecnica
    if (area === 2) return [2]                         // AGR → GI
    if (area === 3) return [9]                         // TEC → DS
    return []
  }
  if (ruolo === 'RIA') return area === 1 ? [1] : []    // RIA → CR
  if (ruolo === 'IA' && area === 1) return [1]         // IA → CR
  if (area === 2) return [3, 4, 5, 6, 7, 8]           // AGR → D1-D6
  if (area === 3) return [9]                           // TEC → DS
  return []
}

function getUfficiPerAreaSettore(area: number, settore: number): Ufficio[] {
  return UFFICI.filter(u => u.aree.includes(area) && u.settori.includes(settore))
}

function calcolaGruppo(ruoloCod: string | null | undefined, area: number, settore: number): string {
  const r = normalizeRuoloCod(ruoloCod) || ''
  if (r === 'ADMIN') return ''
  const a = AREE.find(x => x.value === area)?.label ?? ''
  const s = SETTORI.find(x => x.value === settore)?.label ?? ''
  if (a === 'AGR') {
    if (['TR','IT','CS'].includes(r)) return `GII_AGR_${s}_${r}`
    if (r === 'RIT') return 'GII_AGR_RIT'
    if (r === 'DT') return 'GII_AGR_DIR'
  }
  if (a === 'TEC') {
    if (['TR','IT','CS'].includes(r)) return `GII_TEC_${s}_${r}`
    if (r === 'RIT') return 'GII_TEC_RIT'
    if (r === 'DT') return 'GII_TEC_DIR'
  }
  if (a === 'AMM') {
    if (r === 'DA') return 'GII_AMM_DIR'
    if (r === 'IA') return 'GII_AMM_IA'
    if (r === 'RIA') return 'GII_AMM_RIA'
  }
  return ''
}

function codeOf(list: Array<{ value: number; code: string }>, value: number | null | undefined): string | null {
  if (value == null) return null
  return list.find(x => x.value === value)?.code ?? null
}

function normalizeSettoreCod(value: any): string | null {
  const code = String(value ?? '').trim().toUpperCase()
  return code || null
}

function valueOf(list: Array<{ value: number; code: string }>, code: any): number | null {
  const normalized = String(code ?? '').trim().toUpperCase()
  if (!normalized) return null
  return list.find(x => x.code === normalized)?.value ?? null
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

function labelForRuoloCod(code: any, domainMap?: DomainLabelMap | null): string {
  const normalized = normalizeRuoloCod(code)
  if (!normalized) return ''
  const item = ruoloItem(normalized)
  return getDomainLabel(domainMap, 'ruolo_cod', normalized) || item?.desc || normalized
}

function optionLabelForRuolo(item: (typeof RUOLI)[number], domainMap?: DomainLabelMap | null): string {
  return getDomainLabel(domainMap, 'ruolo_cod', item.code) || item.desc || item.code
}

function dash(value: string): string {
  return String(value || '').trim() || '—'
}

const TITOLI_UTENTE: Array<{ code: string; label: string }> = [
  { code: 'SIG', label: 'Sig.' },
  { code: 'SIGRA', label: 'Sig.ra' },
  { code: 'DOTT', label: 'Dott.' },
  { code: 'DOTTSSA', label: 'Dott.ssa' },
  { code: 'ING', label: 'Ing.' },
  { code: 'ARCH', label: 'Arch.' },
  { code: 'GEOM', label: 'Geom.' },
  { code: 'RAG', label: 'Rag.' },
  { code: 'AVV', label: 'Avv.' },
  { code: 'PROF', label: 'Prof.' },
  { code: 'PROFSSA', label: 'Prof.ssa' },
  { code: 'PER_AGR', label: 'Per. Agr.' },
  { code: 'PER_IND', label: 'Per. Ind.' }
]

function normalizePersonPart(value: any): string {
  return String(value ?? '').trim().replace(/\s+/g, ' ')
}

function composeFullName(nome: any, cognome: any): string {
  return [normalizePersonPart(nome), normalizePersonPart(cognome)].filter(Boolean).join(' ')
}

function personNameKey(nome: any, cognome: any): string {
  const n = normalizePersonPart(nome).toLocaleLowerCase('it')
  const c = normalizePersonPart(cognome).toLocaleLowerCase('it')
  return n && c ? `${n}|${c}` : ''
}

function dateToYmd(value: any): string {
  if (value == null || value === '') return ''
  try {
    const d = value instanceof Date ? value : (typeof value === 'number' ? new Date(value) : new Date(String(value)))
    if (Number.isNaN(d.getTime())) return ''
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  } catch { return '' }
}

function ymdToTimestamp(value: any): number | null {
  const ymd = String(value || '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null
  const [y,m,d] = ymd.split('-').map(Number)
  const dt = new Date(y, m - 1, d, 12, 0, 0, 0)
  return Number.isNaN(dt.getTime()) ? null : dt.getTime()
}

function formatBirthDate(value: any): string {
  const ymd = dateToYmd(value)
  if (!ymd) return ''
  const [y,m,d] = ymd.split('-')
  return `${d}/${m}/${y}`
}

function hasBirthDateField(fl: any): boolean {
  return Array.isArray(fl?.fields) && fl.fields.some((f: any) => String(f?.name || '').toLowerCase() === 'data_nascita')
}

async function updatePersonBirthDates(serviceUrl: string, values: Record<number, string>): Promise<void> {
  const entries = Object.entries(values || {}).filter(([oid, value]) => Number(oid) > 0 && /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')))
  if (entries.length === 0) return
  const fl = await getFL(serviceUrl)
  if (!hasBirthDateField(fl)) throw new Error('Campo data di nascita non disponibile')
  const updateFeatures = entries.map(([oid, value]) => ({ attributes: { OBJECTID: Number(oid), data_nascita: ymdToTimestamp(value) } }))
  const res = await fl.applyEdits({ updateFeatures })
  const err = (res?.updateFeatureResults || []).find((r: any) => r?.error)?.error
  if (err) throw new Error(err.description || err.message || 'Aggiornamento non completato')
}

async function updateAgolIdentityForUsername(serviceUrl: string, username: string, member: AgolOrganizationMember): Promise<void> {
  const cleanUsername = String(username || '').trim()
  if (!cleanUsername) throw new Error('Username AGOL non disponibile')
  const fl = await getFL(serviceUrl)
  const escapedUsername = cleanUsername.replace(/'/g, "''")
  const result = await fl.queryFeatures({
    where: `username = '${escapedUsername}'`,
    outFields: ['OBJECTID','username'],
    returnGeometry: false
  })
  const features = Array.isArray(result?.features) ? result.features : []
  if (features.length === 0) throw new Error('Nessun utente gestionale corrispondente allo username AGOL')
  const nome = normalizePersonPart(member.firstName)
  const cognome = normalizePersonPart(member.lastName)
  const fullName = composeFullName(nome, cognome) || String(member.fullName || '').trim()
  const email = String(member.email || '').trim().toLowerCase()
  const updateFeatures = features.map((feature: any) => ({ attributes: {
    OBJECTID: Number(feature?.attributes?.OBJECTID),
    nome,
    cognome,
    full_name: fullName,
    email: email || null
  }}))
  const res = await fl.applyEdits({ updateFeatures })
  const err = (res?.updateFeatureResults || []).find((r: any) => r?.error)?.error
  if (err) throw new Error(err.description || err.message || 'Aggiornamento dati AGOL non completato')
}

// ── Tipi ───────────────────────────────────────────────────────────────────
interface UtenteForm {
  objectid?: number
  existingObjectId?: number | null
  username: string
  nome: string
  cognome: string
  titolo: string
  email: string
  data_nascita: string
  full_name: string
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
  nome: string
  cognome: string
  titolo: string
  email: string
  data_nascita: string
  full_name: string
  area: number | null
  settore: number | null
  ufficio: number | null
  ruolo_cod: string | null
  area_cod: string | null
  settore_cod: string | null
  gruppo: string
  gruppo_precedente: string
}

type SortField = 'username' | 'full_name' | 'email' | 'ruolo_cod' | 'area' | 'settore' | 'ufficio' | 'gruppo'
type SortDirection = 'asc' | 'desc'
interface SortRule { field: SortField; dir: SortDirection }
type AgolSortField = 'fullName' | 'username' | 'email'
interface AgolSortRule { field: AgolSortField; dir: SortDirection }

const SORTABLE_COLUMNS: Array<{ field: SortField; label: string }> = [
  { field: 'full_name', label: 'Nome completo' },
  { field: 'username', label: 'Username' },
  { field: 'email', label: 'E-mail' },
  { field: 'ruolo_cod', label: 'Ruolo' },
  { field: 'area', label: 'Area' },
  { field: 'settore', label: 'Settore' },
  { field: 'ufficio', label: 'Ufficio' },
  { field: 'gruppo', label: 'Gruppo' },
]

const emptyForm = (): UtenteForm => ({
  existingObjectId: null, username: '', nome: '', cognome: '', titolo: '', email: '', data_nascita: '', full_name: '',
  area: null, settore: null, ufficio: null,
  ruolo_cod: null, area_cod: null, settore_cod: null,
  gruppo: '', gruppo_precedente: '',
})

// ── FeatureLayer ───────────────────────────────────────────────────────────
let _fl: any = null
let _flUrl = ''

function disposeFL(): void {
  const fl = _fl
  _fl = null
  _flUrl = ''
  try {
    if (fl && typeof fl.destroy === 'function') fl.destroy()
  } catch {}
}

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
  const outFields = ['OBJECTID','username','nome','cognome','titolo','email','full_name','area','settore','ufficio','ruolo_cod','area_cod','settore_cod','gruppo','gruppo_precedente','tipo_record']
  if (hasBirthDateField(fl)) outFields.push('data_nascita')
  const res = await fl.queryFeatures({
    // La stessa tabella contiene anche i contatti della Rubrica.
    // Gestione Utenti deve mostrare esclusivamente i profili applicativi: i record
    // storici restano con tipo_record NULL; l'eventuale codice UTENTE è accettato
    // per compatibilità, mentre RUBRICA viene sempre escluso.
    where: `(tipo_record IS NULL OR tipo_record = 'UTENTE')`,
    outFields,
    returnGeometry: false,
  })
  return (res.features ?? []).map((f: any) => {
    const a = f.attributes
    return {
      objectid:  a.OBJECTID ?? a.objectid,
      username:  a.username  ?? '',
      nome:      a.nome      ?? '',
      cognome:   a.cognome   ?? '',
      titolo:    a.titolo    ?? '',
      email:     a.email     ?? '',
      data_nascita: dateToYmd(a.data_nascita),
      full_name: a.full_name ?? composeFullName(a.nome, a.cognome),
      area:        a.area    != null ? Number(a.area)    : valueOf(AREE, a.area_cod),
      settore:     a.settore != null ? Number(a.settore) : valueOf(SETTORI, a.settore_cod),
      ufficio:     a.ufficio != null ? Number(a.ufficio) : null,
      ruolo_cod:   normalizeRuoloCod(a.ruolo_cod),
      area_cod:    textOrNull(a.area_cod)    ?? codeOf(AREE,    a.area),
      settore_cod: normalizeSettoreCod(a.settore_cod) ?? codeOf(SETTORI, a.settore),
      gruppo:      a.gruppo  ?? '',
      gruppo_precedente: a.gruppo_precedente ?? '',
    }
  })
}

function sameUsername(a: any, b: any): boolean {
  return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase()
}

function sameAssignment(a: Pick<UtenteRecord, 'username' | 'ruolo_cod' | 'area' | 'settore' | 'ufficio'>, b: Pick<UtenteForm, 'username' | 'ruolo_cod' | 'area' | 'settore' | 'ufficio'>): boolean {
  const n = (v: any) => v == null || v === '' ? null : Number(v)
  return sameUsername(a.username, b.username) &&
    normalizeRuoloCod(a.ruolo_cod) === normalizeRuoloCod(b.ruolo_cod) &&
    n(a.area) === n(b.area) &&
    n(a.settore) === n(b.settore) &&
    n(a.ufficio) === n(b.ufficio)
}

function sameUserFormValues(a: UtenteRecord, b: UtenteForm): boolean {
  const text = (v: any) => String(v ?? '').trim().replace(/\s+/g, ' ')
  const email = (v: any) => text(v).toLowerCase()
  const n = (v: any) => v == null || v === '' ? null : Number(v)
  return sameUsername(a.username, b.username) &&
    text(a.nome) === text(b.nome) &&
    text(a.cognome) === text(b.cognome) &&
    text(a.titolo) === text(b.titolo) &&
    email(a.email) === email(b.email) &&
    text(a.data_nascita) === text(b.data_nascita) &&
    normalizeRuoloCod(a.ruolo_cod) === normalizeRuoloCod(b.ruolo_cod) &&
    n(a.area) === n(b.area) &&
    n(a.settore) === n(b.settore) &&
    n(a.ufficio) === n(b.ufficio) &&
    text(a.gruppo) === text(b.gruppo)
}

type ExclusiveRoleConflict = {
  objectid: number
  username: string
  full_name: string
  nome: string
  cognome: string
}

function exclusiveRoleWhere(form: Pick<UtenteForm, 'ruolo_cod' | 'area' | 'settore'>): string | null {
  const ruolo = normalizeRuoloCod(form.ruolo_cod)
  const area = Number(form.area ?? 0)
  const settore = Number(form.settore ?? 0)

  // I ruoli apicali sono titolarità organizzative esclusive.
  // CS: esclusivo per area + settore; RIT: per area tecnica; RIA: per area;
  // DT: per area; DA: unico nell'intero gestionale.
  if (ruolo === 'CS' && area && settore) {
    return `UPPER(ruolo_cod) = 'CS' AND ((area = ${area}) OR UPPER(area_cod) = '${codeOf(AREE, area) || ''}') AND ((settore = ${settore}) OR UPPER(settore_cod) = '${codeOf(SETTORI, settore) || ''}')`
  }
  if ((ruolo === 'RIT' || ruolo === 'RIA') && area) {
    return `UPPER(ruolo_cod) = '${ruolo}' AND ((area = ${area}) OR UPPER(area_cod) = '${codeOf(AREE, area) || ''}')`
  }
  if (ruolo === 'DT' && area) {
    return `UPPER(ruolo_cod) = 'DT' AND ((area = ${area}) OR UPPER(area_cod) = '${codeOf(AREE, area) || ''}')`
  }
  if (ruolo === 'DA') {
    return `UPPER(ruolo_cod) = 'DA'`
  }
  return null
}

async function findExclusiveRoleConflict(serviceUrl: string, form: Pick<UtenteForm, 'ruolo_cod' | 'area' | 'settore'>, excludeObjectId?: number | null): Promise<ExclusiveRoleConflict | null> {
  const scopeWhere = exclusiveRoleWhere(form)
  if (!scopeWhere) return null

  const fl = await getFL(serviceUrl)
  const exclude = excludeObjectId != null ? ` AND OBJECTID <> ${Number(excludeObjectId)}` : ''
  const res = await fl.queryFeatures({
    where: `(tipo_record IS NULL OR tipo_record = 'UTENTE') AND (${scopeWhere})${exclude}`,
    outFields: ['OBJECTID','username','full_name','nome','cognome','area','settore','ruolo_cod','area_cod','settore_cod'],
    returnGeometry: false,
    num: 5,
  })
  const f = (res.features || [])[0]
  if (!f) return null
  const a = f.attributes || {}
  return {
    objectid: Number(a.OBJECTID ?? a.objectid ?? 0),
    username: String(a.username || '').trim(),
    full_name: String(a.full_name || '').trim(),
    nome: String(a.nome || '').trim(),
    cognome: String(a.cognome || '').trim(),
  }
}

function exclusiveRoleConflictMessage(conflict: ExclusiveRoleConflict): string {
  const fullName = conflict.full_name || composeFullName(conflict.nome, conflict.cognome) || conflict.username || 'un altro utente'
  const account = conflict.username && conflict.username.toLowerCase() !== fullName.toLowerCase() ? ` (${conflict.username})` : ''
  return (
    `Ruolo apicale già assegnato.\n\n` +
    `La medesima funzione, nello stesso ambito organizzativo, risulta già attribuita a ${fullName}${account}. ` +
    `I ruoli apicali devono avere un unico titolare.\n\n` +
    `Prima di assegnare questa funzione a un altro utente è necessario revocarla al titolare corrente. ` +
    `La revoca provvederà anche al riallineamento dei relativi gruppi AGOL.`
  )
}

async function otherAssignmentRequiresGroup(serviceUrl: string, username: string, gruppo: string, excludeObjectId?: number | null): Promise<boolean> {
  const cleanUsername = String(username || '').trim()
  const cleanGroup = String(gruppo || '').trim()
  if (!cleanUsername || !cleanGroup) return false
  const fl = await getFL(serviceUrl)
  const escapedUsername = cleanUsername.replace(/'/g, "''")
  const res = await fl.queryFeatures({
    where: `username = '${escapedUsername}'`,
    outFields: ['OBJECTID','username','gruppo','tipo_record'],
    returnGeometry: false,
  })
  return (res.features || []).some((f: any) => {
    const a = f?.attributes || {}
    const oid = Number(a.OBJECTID ?? a.objectid ?? 0)
    if (excludeObjectId != null && oid === Number(excludeObjectId)) return false
    if (!sameUsername(a.username, cleanUsername)) return false
    return String(a.gruppo || '').trim() === cleanGroup
  })
}

async function saveUtente(form: UtenteForm, serviceUrl: string): Promise<void> {
  const fl = await getFL(serviceUrl)
  const fullName = composeFullName(form.nome, form.cognome)
  const attrs: any = {
    username:          form.username,
    nome:              normalizePersonPart(form.nome),
    cognome:           normalizePersonPart(form.cognome),
    titolo:            String(form.titolo || '').trim() || null,
    email:             String(form.email || '').trim().toLowerCase() || null,
    full_name:         fullName,
    area:              form.area,
    settore:           form.settore,
    ufficio:           form.ufficio,
    ruolo_cod:         normalizeRuoloCod(form.ruolo_cod),
    area_cod:          codeOf(AREE, form.area),
    settore_cod:       codeOf(SETTORI, form.settore),
    gruppo:            form.gruppo || null,
    gruppo_precedente: form.gruppo_precedente || null,
  }
  // Le funzioni anagrafiche (destinatario e-mail / firmatario) sono indipendenti
  // dall'accesso al gestionale: in modifica non vanno mai azzerate.
  if (hasBirthDateField(fl)) attrs.data_nascita = ymdToTimestamp(form.data_nascita)
  if (form.objectid == null) attrs.tipo_record = 'UTENTE'

  const targetObjectId = form.objectid ?? form.existingObjectId ?? null
  if (targetObjectId != null) {
    attrs.OBJECTID = targetObjectId
    const res = await fl.applyEdits({ updateFeatures: [{ attributes: attrs }] })
    if (res.updateFeatureResults?.[0]?.error)
      throw new Error(res.updateFeatureResults[0].error.description)
    return
  }

  // Un nominativo già presente viene riutilizzato solo se l'operatore lo ha
  // selezionato esplicitamente. La sola coincidenza di nome e cognome non basta:
  // potrebbe trattarsi di un omonimo.
  const res = await fl.applyEdits({ addFeatures: [{ attributes: attrs }] })
  if (res.addFeatureResults?.[0]?.error)
    throw new Error(res.addFeatureResults[0].error.description)

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
  if (!objectid) throw new Error('Profilo utente non valido')
  if (!token) throw new Error('Sessione non disponibile')

  const fl = await getFL(serviceUrl)
  const current = await fl.queryFeatures({
    where: `OBJECTID = ${Number(objectid)}`,
    outFields: ['OBJECTID','uso_email','firmatario'],
    returnGeometry: false
  })
  const attrs = current?.features?.[0]?.attributes || {}
  const hasEmailUse = !!String(attrs.uso_email ?? '').trim()
  const isSigner = Number(attrs.firmatario ?? 0) === 1

  // Se la stessa persona svolge anche altre funzioni anagrafiche, viene rimosso
  // soltanto il profilo applicativo. Il record resta unico e continua a essere
  // usato come destinatario e/o firmatario.
  if (hasEmailUse || isSigner) {
    const res = await fl.applyEdits({ updateFeatures: [{ attributes: {
      OBJECTID: objectid,
      username: null,
      area: null,
      settore: null,
      ufficio: null,
      gruppo: null,
      gruppo_precedente: null,
      ruolo_cod: null,
      area_cod: null,
      settore_cod: null,
      tipo_record: 'RUBRICA'
    } }] })
    const err = res?.updateFeatureResults?.[0]?.error
    if (err) throw new Error(err.description || err.message || 'Operazione non completata')
    return
  }

  // Nessun altro utilizzo: elimina il record anagrafico.
  const body = new URLSearchParams({ f: 'json', token, objectIds: String(objectid) })
  const cleanUrl = String(serviceUrl || DEFAULT_SERVICE_URL).trim().replace(/\/$/, '')
  const res = await fetch(`${cleanUrl}/deleteFeatures`, { method: 'POST', body })
  const json = await res.json()
  if (!res.ok || json?.error) throw new Error(friendlyDeleteErrorMessage(json?.error ?? json))
  const del = Array.isArray(json?.deleteResults) ? json.deleteResults[0] : null
  if (!del || del.success !== true) throw new Error(friendlyDeleteErrorMessage(del?.error ?? json))
}

// ── Export CSV ────────────────────────────────────────────────────────────
function exportCSV(utenti: UtenteRecord[], domainLabels?: DomainLabelMap): void {
  // Per Survey123: se un utente ha un solo ufficio assegnato come TR,
  // esporta il relativo nome su tutte le sue righe. Se gli uffici TR sono
  // più di uno, lascia vuoto: il Survey richiederà la scelta all'operatore.
  const trOfficesByUsername = new Map<string, Set<number>>()
  utenti.forEach(u => {
    const username = String(u.username ?? '').trim()
    if (!username || normalizeRuoloCod(u.ruolo_cod) !== 'TR' || u.ufficio == null) return
    const offices = trOfficesByUsername.get(username) ?? new Set<number>()
    offices.add(Number(u.ufficio))
    trOfficesByUsername.set(username, offices)
  })

  const trUfficioAutoByUsername = new Map<string, string>()
  trOfficesByUsername.forEach((offices, username) => {
    if (offices.size !== 1) {
      trUfficioAutoByUsername.set(username, '')
      return
    }
    const officeId = Array.from(offices)[0]
    trUfficioAutoByUsername.set(username, labelForUfficio(officeId, domainLabels))
  })

  const rows = utenti.map(u => {
    const area    = u.area_cod    ?? codeOf(AREE, u.area) ?? labelForDomainItem(AREE, u.area, domainLabels, 'area_cod', 'area')
    const settore = u.settore_cod ?? codeOf(SETTORI, u.settore) ?? labelForDomainItem(SETTORI, u.settore, domainLabels, 'settore_cod', 'settore')
    const ufficio = labelForUfficio(u.ufficio, domainLabels)
    const ruolo   = normalizeRuoloCod(u.ruolo_cod) || ''
    // id_ufficio: valore numerico (codice ufficio)
    const id_uff  = u.ufficio ?? ''
    const gruppo  = u.gruppo ?? ''
    const ufficioTrAuto = trUfficioAutoByUsername.get(String(u.username ?? '').trim()) ?? ''
    // Escaping celle con virgole
    const esc = (v: any) => {
      const s = String(v ?? '')
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"` : s
    }
    return [u.username, u.nome, u.cognome, u.titolo, u.email, formatBirthDate(u.data_nascita), u.full_name, area, settore, ufficio, ruolo, id_uff, gruppo, ufficioTrAuto]
      .map(esc).join(',')
  })

  const csv = ['username,nome,cognome,titolo,email,data_nascita,full_name,area_cod,settore_cod,ufficio,ruolo_cod,id_ufficio,gruppo,ufficio_tr_auto', ...rows].join('\n')
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
    case 'email': return u.email ?? ''
    case 'ruolo_cod': return labelForRuoloCod(u.ruolo_cod, domainLabels)
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
  .ggu { font-size: 13px; padding: 12px; height: 100%; display: flex; flex-direction: column; gap: 10px; box-sizing: border-box; }
  .ggu-title { font-size: var(--ggu-title-font-size, 15px); font-weight: bold; color: var(--ggu-title-color, #93c5fd); border-bottom: 2px solid var(--ggu-title-color, #93c5fd); padding-bottom: 6px; margin: 0; }
  .ggu-form { background: var(--ggu-detail-card-background, #f5f9ff); border: 1px solid #c5d9f1; border-radius: 6px; padding: 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .ggu-form-users {
    grid-template-columns: repeat(12, minmax(0, 1fr));
    align-items: end;
  }
  .ggu-user-section { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 10px; align-items: end; padding: 12px; border: 1px solid #c5d9f1; border-radius: 6px; background: #fff; }
  .ggu-user-section-title { grid-column: 1 / -1; font-size: 12px; font-weight: 700; color: #0d3b66; padding-bottom: 4px; border-bottom: 1px solid #dbe7f3; }
  .ggu-agol-account-row { grid-template-columns: repeat(20, minmax(0, 1fr)); }
  .ggu-agol-account-row .ggu-user-username { grid-column: span 3; }
  .ggu-agol-account-row .ggu-user-name { grid-column: span 3; }
  .ggu-agol-account-row .ggu-user-surname { grid-column: span 3; }
  .ggu-agol-account-row .ggu-user-email { grid-column: span 3; }
  .ggu-agol-account-actions { grid-column: 18 / span 3; display: flex; justify-content: flex-end; align-items: end; }
  .ggu-agol-account-actions .ggu-btn { white-space: nowrap; width: calc((100% - 8px) / 2); min-width: 0; padding-left: 6px; padding-right: 6px; display: inline-flex; align-items: center; justify-content: center; text-align: center; }
  .ggu-management-section { grid-template-columns: repeat(20, minmax(0, 1fr)); }
  .ggu-management-section .ggu-user-role { grid-column: span 3; }
  .ggu-management-section .ggu-user-area { grid-column: span 3; }
  .ggu-management-section .ggu-user-sector { grid-column: span 6; }
  .ggu-management-section .ggu-user-office { grid-column: span 3; }
  .ggu-management-section .ggu-user-group { grid-column: span 2; }
  .ggu-management-section > .ggu-btns { grid-column: span 3; display: flex; gap: 8px; padding-top: 0; align-items: end; justify-content: stretch; }
  .ggu-management-section > .ggu-btns .ggu-btn { flex: 1 1 0; min-width: 0; padding-left: 6px; padding-right: 6px; white-space: nowrap; }
  .ggu-management-section .ggu-user-birth-slot { grid-column: 1 / -1; min-height: 0; }
  .ggu-form-users .ggu-user-birth-slot .ggu-birth-field { width: 160px; }
  .ggu-form-directory { grid-template-columns: repeat(20, minmax(0, 1fr)); justify-content: stretch; align-items: end; column-gap: 8px; row-gap: 8px; }
  .ggu-form-directory .ggu-dir-person { grid-column: span 3; }
  .ggu-form-directory .ggu-dir-kind { grid-column: span 2; }
  .ggu-form-directory .ggu-dir-title { grid-column: span 2; }
  .ggu-form-directory .ggu-dir-name { grid-column: span 3; }
  .ggu-form-directory .ggu-dir-surname { grid-column: span 3; }
  .ggu-form-directory .ggu-dir-birth { grid-column: span 2; }
  .ggu-form-directory .ggu-dir-email { grid-column: span 3; }
  .ggu-form-directory .ggu-dir-usage { grid-column: span 3; }
  .ggu-form-directory.ggu-dir-email-new.ggu-dir-altro .ggu-dir-name { grid-column: span 5; }
  .ggu-form-directory.ggu-dir-email-edit.ggu-dir-altro .ggu-dir-name { grid-column: span 5; }
  .ggu-form-directory.ggu-dir-firm-new .ggu-dir-person { grid-column: span 3; }
  .ggu-form-directory.ggu-dir-firm-new .ggu-dir-name,
  .ggu-form-directory.ggu-dir-firm-new .ggu-dir-surname,
  .ggu-form-directory.ggu-dir-firm-edit .ggu-dir-name,
  .ggu-form-directory.ggu-dir-firm-edit .ggu-dir-surname { grid-column: span 3; }
  .ggu-form-directory > .ggu-btns { grid-column: -4 / -1; grid-row: 1; display: flex; gap: 8px; padding-top: 0; align-items: end; justify-content: stretch; }
  .ggu-form-directory > .ggu-btns .ggu-btn { flex: 1 1 0; min-width: 0; white-space: nowrap; }
  .ggu-directory-table th, .ggu-directory-table td { padding-left: 4px; padding-right: 4px; }
  .ggu-directory-table .ggu-col-denomination { width: 23%; }
  .ggu-directory-table .ggu-col-email { width: 22%; }
  .ggu-directory-table .ggu-col-usage { width: 18%; }
  .ggu-directory-table .ggu-col-title { width: 10%; }
  .ggu-directory-table .ggu-col-name { width: 18%; }
  .ggu-directory-table .ggu-col-surname { width: 20%; }
  .ggu-directory-table .ggu-col-birth { width: 13%; white-space: nowrap; }
  .ggu-directory-table .ggu-directory-spacer { width: auto; }
  .ggu-directory-table .ggu-actions-col { width: 1%; }
  .ggu-directory-table.ggu-directory-firm-table .ggu-actions-head { text-align: left !important; }
  .ggu-required-note { grid-column: 1 / -1; font-size: 11px; color: #64748b; font-style: italic; margin-top: -2px; }
  .ggu-homonym-dates { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; padding: 10px; border: 1px solid #c5d9f1; border-radius: 5px; background: #ffffff; }
  .ggu-homonym-dates-title { grid-column: 1 / -1; font-size: 12px; font-weight: 700; color: #1F4E79; }
  .ggu-modal-head.ggu-modal-head-info { background: #1F4E79; }
  .ggu-modal.ggu-agol-modal { width: min(1180px, calc(100vw - 48px)); max-width: 1180px; }
  .ggu-agol-search { margin-bottom: 6px; }
  .ggu-agol-count { margin: 0 0 8px; font-size: 12px; color: #64748b; }
  .ggu-agol-list { max-height: min(68vh, 680px); overflow: auto; border: 1px solid #d6e2ef; border-radius: 5px; }
  .ggu-agol-row { display: grid; grid-template-columns: minmax(260px, 1.35fr) minmax(220px, 1fr) minmax(300px, 1.45fr) 118px; gap: 14px; align-items: center; padding: 8px 12px; border-bottom: 1px solid #e6edf5; }
  .ggu-agol-row:last-child { border-bottom: none; }
  .ggu-agol-row-head { font-size: 11px; font-weight: 700; color: #1F4E79; background: #f5f9ff; position: sticky; top: 0; z-index: 1; }
  .ggu-agol-sortable { cursor: pointer; user-select: none; }
  .ggu-agol-sortable:hover { filter: brightness(0.9); }
  .ggu-agol-cell { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ggu-agol-member-disabled { opacity: 0.55; }
  .ggu-agol-select { padding: 5px 12px; white-space: nowrap; width: 100%; }
  .ggu-agol-loading, .ggu-agol-empty { padding: 18px; text-align: center; color: #64748b; }
  .ggu-homonym-choice { display: flex; flex-direction: column; gap: 10px; }
  .ggu-homonym-choice .ggu-select { margin-top: 2px; }
  .ggu-homonym-note { font-size: 12px; color: #526579; line-height: 1.35; }
  .ggu-homonym-selected { padding: 8px 10px; border: 1px solid #d6e2ef; border-radius: 4px; background: #f8fbff; font-size: 12px; line-height: 1.35; }
  .ggu-homonym-warning { color: #8a4b08; font-weight: 700; }
  .ggu-field { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
  .ggu-birth-field { width: 160px; max-width: 100%; justify-self: start; }
  .ggu-birth-field .ggu-input { width: 160px; max-width: 100%; }
  @media (max-width: 1100px) {
    .ggu-form-users { grid-template-columns: 1fr 1fr; }
    .ggu-user-section { grid-template-columns: 1fr 1fr; }
    .ggu-agol-account-row .ggu-user-username, .ggu-agol-account-row .ggu-user-name, .ggu-agol-account-row .ggu-user-surname,
    .ggu-agol-account-row .ggu-user-email, .ggu-agol-account-actions, .ggu-management-section .ggu-user-role,
    .ggu-management-section .ggu-user-area, .ggu-management-section .ggu-user-sector, .ggu-management-section .ggu-user-office,
    .ggu-management-section .ggu-user-group, .ggu-management-section .ggu-user-birth-slot { grid-column: span 1; }
    .ggu-user-section-title, .ggu-homonym-dates, .ggu-required-note, .ggu-btns { grid-column: 1 / -1; }
    .ggu-form-directory, .ggu-form-directory.ggu-dir-email-new, .ggu-form-directory.ggu-dir-email-edit, .ggu-form-directory.ggu-dir-firm-new, .ggu-form-directory.ggu-dir-firm-edit { grid-template-columns: 1fr 1fr; }
    .ggu-form-directory .ggu-dir-person, .ggu-form-directory .ggu-dir-kind, .ggu-form-directory .ggu-dir-title, .ggu-form-directory .ggu-dir-name, .ggu-form-directory .ggu-dir-surname, .ggu-form-directory .ggu-dir-email, .ggu-form-directory .ggu-dir-usage, .ggu-form-directory .ggu-dir-birth,
    .ggu-form-directory.ggu-dir-email-new.ggu-dir-altro .ggu-dir-name, .ggu-form-directory.ggu-dir-email-edit.ggu-dir-altro .ggu-dir-name,
    .ggu-form-directory.ggu-dir-firm-new .ggu-dir-person, .ggu-form-directory.ggu-dir-firm-new .ggu-dir-name, .ggu-form-directory.ggu-dir-firm-new .ggu-dir-surname,
    .ggu-form-directory.ggu-dir-firm-edit .ggu-dir-name, .ggu-form-directory.ggu-dir-firm-edit .ggu-dir-surname { grid-column: span 1; }
    .ggu-form-directory .ggu-dir-person { grid-column: span 1; }
    .ggu-form-directory > .ggu-btns { grid-column: 1 / -1; grid-row: auto; }
  }
  .ggu-label { font-size: var(--ggu-field-label-font-size, 11px); font-weight: bold; color: var(--ggu-field-label-color, #1F4E79); }
  .ggu-input, .ggu-select { width: 100%; padding: 5px 8px; border: 1px solid #aac4e0; border-radius: 4px; font-size: 13px; box-sizing: border-box; background: #fff; }
  .ggu-input:focus, .ggu-select:focus { outline: none; border-color: #1F4E79; }
  .ggu-input.ggu-required-missing:not(:disabled), .ggu-select.ggu-required-missing:not(:disabled) { border: 1px solid #dc2626; background: #fff; color: #7f1d1d; }
  .ggu-input:disabled, .ggu-select:disabled { background: #e8f0e9; color: #375623; font-style: italic; border-color: #b8d4b0; }
  .ggu-btns { display: flex; gap: 8px; grid-column: 1 / -1; padding-top: 4px; }
  .ggu-btn { padding: 6px 18px; border: none; border-radius: 4px; font-size: clamp(9px, calc(0.6vw + 4px), 13px); cursor: pointer; font-weight: bold; }
  .ggu-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .ggu-btn-save { background: #1F4E79; color: #fff; }
  .ggu-btn-save:hover:not(:disabled) { background: #16375a; }
  .ggu-btn-outline { background: #fff; color: #0d3b66; border: 1px solid #0d3b66; }
  .ggu-btn-outline:hover:not(:disabled) { background: #f5f9ff; }
  .ggu-sync-table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .ggu-sync-table th, .ggu-sync-table td { padding: 7px 8px; border-bottom: 1px solid #e5e7eb; text-align: left; vertical-align: top; }
  .ggu-sync-table th { color: #0d3b66; font-weight: 700; }
  .ggu-btn-cancel { background: #e0e0e0; color: #333; }
  .ggu-btn-cancel:hover:not(:disabled) { background: #ccc; }
  .ggu-btn-new { background: #375623; color: #fff; }
  .ggu-btn-new:hover { background: #264018; }
  .ggu-btn-export { background: #1B6584; color: #fff; }
  .ggu-btn-export:hover:not(:disabled) { background: #134d63; }
  .ggu-btn-reset-sort { width: 32px; height: 32px; min-width: 32px; min-height: 32px; padding: 0; box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; border-radius: 7px; border: 1px solid #6fa3d3; background: #1F4E79; color: #fff; font-size: 18px; line-height: 1; }
  .ggu-btn-reset-sort:hover:not(:disabled) { background: #16375a; border-color: #93c5fd; }
  .ggu-btn-reset-sort:disabled { background: #e5e7eb; color: #94a3b8; border-color: #cbd5e1; opacity: 1; }
  .ggu-toolbar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; width: 100%; }
  .ggu-toolbar-left { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .ggu-toolbar-right { margin-left: auto; display: flex; gap: 8px; align-items: center; }
  .ggu-toolbar-reset-right { margin-left: auto; }
  .ggu-filter-toolbar-btn { height: 32px; min-height: 32px; padding: 0 11px; box-sizing: border-box; border-radius: 7px; border: 1px solid #6fa3d3; background: #fff; color: #0d3b66; display: inline-flex; align-items: center; justify-content: center; gap: 6px; font-size: 12px; font-weight: 700; line-height: 1; cursor: pointer; white-space: nowrap; }
  .ggu-filter-toolbar-btn:hover { background: #f5f9ff; border-color: #3d77c9; }
  .ggu-filter-toolbar-btn.ggu-filter-toolbar-btn-open { background: #1F4E79; color: #fff; border-color: #1F4E79; }
  .ggu-filter-toolbar-btn.ggu-filter-toolbar-btn-open:hover { background: #16375a; }
  .ggu-filter-toolbar-btn.ggu-filter-toolbar-btn-active:not(.ggu-filter-toolbar-btn-open) { box-shadow: inset 0 -3px 0 #3d77c9; }
  .ggu-filter-panel { width: 100%; flex: 0 0 auto; margin-top: -5px; margin-bottom: -5px; padding: 4px 0; box-sizing: border-box; border: 1px solid #eef4fb; border-radius: 10px; background: #eef4fb; }
  .ggu-filter-grid { display: grid; grid-template-columns: minmax(190px, 1.45fr) repeat(4, minmax(120px, 0.8fr)) minmax(180px, 1.15fr) auto; gap: 6px; align-items: end; padding: 0; }
  .ggu-filter-field { min-width: 0; }
  .ggu-filter-field .ggu-label { display: block; font-size: 13px; font-weight: 800; color: #374151; margin-bottom: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ggu-filter-field .ggu-input, .ggu-filter-field .ggu-select { width: 100%; min-width: 0; height: 30px; min-height: 30px; padding: 0 8px; border: 1px solid rgba(0,0,0,0.16); border-radius: 8px; background: #fff; color: #111827; font-size: 14px; font-style: normal; line-height: 30px; box-sizing: border-box; outline: none; }
  .ggu-filter-select-wrap { position: relative; width: 100%; min-width: 0; }
  .ggu-filter-select-wrap .ggu-select { appearance: none; -webkit-appearance: none; padding-right: 28px; cursor: pointer; }
  .ggu-filter-select-chevron { position: absolute; right: 7px; top: 50%; transform: translateY(-50%); color: rgba(0,0,0,0.55); font-size: 18px; pointer-events: none; line-height: 1; }
  .ggu-filter-field .ggu-input:focus, .ggu-filter-field .ggu-select:focus { border-color: rgba(0,0,0,0.30); outline: none; }
  .ggu-filter-actions { display: flex; align-items: end; gap: 6px; }
  .ggu-filter-actions .ggu-filter-action-btn { height: 30px; min-height: 30px; border: 1px solid rgba(0,0,0,0.16); border-radius: 8px; padding: 0 12px; background: rgba(0,0,0,0.06); color: #1f2937; font-size: 12px; font-weight: 600; line-height: 1; cursor: pointer; white-space: nowrap; box-sizing: border-box; }
  .ggu-filter-actions .ggu-filter-action-btn:hover:not(:disabled) { background: rgba(0,0,0,0.10); }
  .ggu-filter-actions .ggu-filter-action-btn:disabled { opacity: 0.45; cursor: default; }
  .ggu-filter-count { margin-top: 7px; padding: 0 8px; font-size: 11px; color: #526579; font-weight: 600; }
  @media (max-width: 1250px) {
    .ggu-filter-grid { grid-template-columns: repeat(3, minmax(150px, 1fr)); }
    .ggu-filter-actions { justify-content: flex-start; }
  }
  .ggu-table-wrap { flex: 1; overflow-y: auto; border: 1px solid #c5d9f1; border-radius: 6px; min-height: 0; background: var(--ggu-records-card-background, #f5f9ff); }
  .ggu-table { width: 100%; border-collapse: collapse; font-size: var(--ggu-table-font-size, 12px); }
  .ggu-table th { background: var(--ggu-table-header-background, #1F4E79); color: var(--ggu-table-header-text, #fff); padding: 7px 8px; text-align: left; position: sticky; top: 0; z-index: 1; white-space: nowrap; }
  .ggu-table th.ggu-sortable { cursor: pointer; user-select: none; }
  .ggu-table th.ggu-sortable:hover { filter: brightness(0.9); }
  .ggu-actions-col { width: 1%; white-space: nowrap; text-align: right !important; }
  .ggu-users-identity-col { width: 10.5528%; }
  .ggu-users-role-col { white-space: nowrap; min-width: 125px; }
  .ggu-actions-head { text-align: left !important; }
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
  .ggu-modal-head { background: #c00; color: #fff; font-weight: 700; font-size: 18px; padding: 12px 16px; }
  .ggu-modal-body { color: #2b2b2b; font-size: 15px; line-height: 1.5; padding: 16px; white-space: pre-line; }
  .ggu-modal-actions { display: flex; justify-content: flex-end; gap: 8px; padding: 0 16px 16px 16px; }
  .ggu-modal-close { background: #1F4E79; color: #fff; border: none; border-radius: 5px; padding: 7px 18px; font-size: 15px; font-weight: 700; cursor: pointer; }
  .ggu-modal-close:hover { background: #16375a; }
  .ggu-modal-cancel { background: #e0e0e0; color: #333; border: none; border-radius: 5px; padding: 7px 18px; font-size: 15px; font-weight: 700; cursor: pointer; }
  .ggu-modal-cancel:hover { background: #ccc; }
  .ggu-modal-danger { background: #c00; color: #fff; border: none; border-radius: 5px; padding: 7px 18px; font-size: 15px; font-weight: 700; cursor: pointer; }
  .ggu-modal-danger:hover { background: #a00000; }
  .ggu-edit-lock-zone { position: fixed; z-index: 2147483000; background: rgba(0, 0, 0, 0.52); pointer-events: auto; touch-action: none; }
  .ggu.ggu-editing-global-lock { position: relative; }
  .ggu.ggu-editing-global-lock::before { content: ''; position: absolute; inset: 0; z-index: 5; background: rgba(15, 23, 42, 0.22); border-radius: 8px; pointer-events: auto; }
  .ggu.ggu-editing-global-lock .ggu-form { position: relative; z-index: 10; pointer-events: auto; }
  .ggu-gruppo { font-family: monospace; font-size: 11px; background: #e2efda; padding: 2px 6px; border-radius: 3px; color: #375623; white-space: nowrap; }
  .ggu-empty { text-align: center; color: #888; padding: 20px; font-style: italic; }
  .ggu-dir-tabs { display: flex; gap: 6px; border-bottom: 1px solid #c5d9f1; margin-bottom: 8px; }
  .ggu-dir-tab { border: none; border-bottom: 3px solid transparent; background: transparent; color: #526579; font-size: 12px; font-weight: 700; padding: 7px 11px 6px; cursor: pointer; }
  .ggu-dir-tab:hover { color: #1F4E79; }
  .ggu-dir-tab:disabled { cursor: default; opacity: 0.55; }
  .ggu-dir-tab-active { color: #1F4E79; border-bottom-color: #1F4E79; }
`


// ── Anagrafica: destinatari e-mail e firmatari ──────────────────────────────
type RubricaUsoOption = { code: string; label: string }
type DirectoryTab = 'email' | 'firmatari'
type DirectorySortField = 'denomination' | 'email' | 'birth' | 'usage' | 'title' | 'name' | 'surname'
interface DirectorySortRule { field: DirectorySortField; dir: SortDirection }
type DirectoryRecord = {
  objectid: number
  username: string
  nome: string
  cognome: string
  titolo: string
  full_name: string
  email: string
  data_nascita: string
  uso_email: string
  firmatario: number
  tipo_record: string
  tipo_soggetto: string
}
type DirectoryForm = {
  objectid?: number
  existingObjectId?: number | null
  nome: string
  cognome: string
  titolo: string
  full_name: string
  email: string
  data_nascita: string
  uso_email: string
  tipo_soggetto: string
}

const RUBRICA_TIPO = 'RUBRICA'
const RUBRICA_DETERMINA_A = 'DETERMINA_A'
const RUBRICA_DETERMINA_CC = 'DETERMINA_CC'
const RUBRICA_PROTOCOLLO_A = 'PROTOCOLLO_A'
const RUBRICA_PERSONA_FISICA = 'PERSONA_FISICA'
const RUBRICA_ALTRO = 'ALTRO'

function rubricaClean(value: any): string { return String(value ?? '').trim() }
function rubricaEmailValida(value: string): boolean { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rubricaClean(value)) }
function directoryEmptyForm(): DirectoryForm { return { existingObjectId: null, nome: '', cognome: '', titolo: '', full_name: '', email: '', data_nascita: '', uso_email: '', tipo_soggetto: '' } }
function directoryDisplayName(r: Partial<DirectoryRecord>): string {
  return rubricaClean(r.full_name) || composeFullName(r.nome, r.cognome) || rubricaClean(r.username) || rubricaClean(r.email) || 'Nominativo senza nome'
}
function directoryDisplayLabel(r: DirectoryRecord, records: DirectoryRecord[]): string {
  const base = composeFullName(r.nome, r.cognome) || directoryDisplayName(r)
  const key = personNameKey(r.nome, r.cognome)
  if (!key) return base
  const omonimi = records.filter(x => personNameKey(x.nome, x.cognome) === key)
  const birth = formatBirthDate(r.data_nascita)
  return omonimi.length > 1 && birth ? `${base} — ${birth}` : base
}
function splitLegacyFullName(value: string): { nome: string; cognome: string } {
  const parts = rubricaClean(value).split(/\s+/).filter(Boolean)
  if (parts.length < 2) return { nome: parts[0] || '', cognome: '' }
  return { nome: parts.slice(0, -1).join(' '), cognome: parts[parts.length - 1] }
}

function rubricaWorkflowRole(): string {
  try {
    const c: any = (window as any).__giiUserRole || {}
    let role = rubricaClean(c.profiloCod ?? c.profilo_cod ?? c.ruoloCod ?? c.ruolo_cod).toUpperCase()
    const directArea = rubricaClean(c.areaCod ?? c.area_cod ?? c.areaLabel).toUpperCase()
    const numericArea = ({ 1:'AMM', 2:'AGR', 3:'TEC' } as any)[Number(c.area)] || ''
    const area = directArea || numericArea
    return role
  } catch { return '' }
}

function rubricaUsoOptions(fl: any): RubricaUsoOption[] {
  const field = (fl?.fields || []).find((f: any) => rubricaClean(f?.name).toLowerCase() === 'uso_email')
  const coded = field?.domain?.codedValues
  if (Array.isArray(coded) && coded.length) {
    return coded
      .map((x: any) => ({ code: rubricaClean(x.code), label: rubricaClean(x.name) || rubricaClean(x.code) }))
      .filter((x: RubricaUsoOption) => !!x.code)
  }
  return [
    { code: RUBRICA_DETERMINA_A, label: 'Destinatario determina' },
    { code: RUBRICA_DETERMINA_CC, label: 'Copia conoscenza determina' },
    { code: RUBRICA_PROTOCOLLO_A, label: 'Destinatario protocollo' }
  ]
}

async function fetchDirectory(serviceUrl: string): Promise<{ records: DirectoryRecord[]; usages: RubricaUsoOption[] }> {
  const fl = await getFL(serviceUrl)
  const outFields = ['OBJECTID','username','nome','cognome','titolo','full_name','email','uso_email','firmatario','tipo_record','tipo_soggetto']
  if (hasBirthDateField(fl)) outFields.push('data_nascita')
  const res = await fl.queryFeatures({
    where: '1=1',
    outFields,
    returnGeometry: false,
    orderByFields: ['full_name ASC']
  })
  const records = (res?.features || []).map((f: any) => {
    const a = f?.attributes || {}
    const legacy = splitLegacyFullName(a.full_name)
    return {
      objectid: Number(a.OBJECTID ?? a.objectid),
      username: rubricaClean(a.username),
      nome: rubricaClean(a.nome) || legacy.nome,
      cognome: rubricaClean(a.cognome) || legacy.cognome,
      titolo: rubricaClean(a.titolo),
      full_name: rubricaClean(a.full_name) || composeFullName(a.nome, a.cognome),
      email: rubricaClean(a.email),
      data_nascita: dateToYmd(a.data_nascita),
      uso_email: rubricaClean(a.uso_email),
      firmatario: Number(a.firmatario ?? 0),
      tipo_record: rubricaClean(a.tipo_record),
      tipo_soggetto: rubricaClean(a.tipo_soggetto) || (rubricaClean(a.cognome) || rubricaClean(a.username) ? RUBRICA_PERSONA_FISICA : RUBRICA_ALTRO)
    }
  }) as DirectoryRecord[]
  return { records, usages: rubricaUsoOptions(fl) }
}

async function saveDirectoryFunction(serviceUrl: string, tab: DirectoryTab, form: DirectoryForm, writeBirthDate: boolean, preserveUserData: boolean): Promise<void> {
  const fl = await getFL(serviceUrl)
  const nome = normalizePersonPart(form.nome)
  const cognome = normalizePersonPart(form.cognome)
  const isPerson = tab === 'firmatari' || rubricaClean(form.tipo_soggetto) === RUBRICA_PERSONA_FISICA
  const fullName = isPerson ? (composeFullName(nome, cognome) || rubricaClean(form.full_name)) : (nome || rubricaClean(form.full_name))
  const targetObjectId = form.objectid ?? form.existingObjectId ?? null
  const attrs: any = {}
  if (!preserveUserData) {
    attrs.nome = nome || null
    attrs.cognome = cognome || null
    attrs.titolo = rubricaClean(form.titolo) || null
    attrs.full_name = fullName || null
    attrs.tipo_soggetto = tab === 'firmatari' ? RUBRICA_PERSONA_FISICA : (rubricaClean(form.tipo_soggetto) || null)
    if (writeBirthDate && hasBirthDateField(fl)) attrs.data_nascita = ymdToTimestamp(form.data_nascita)
  }
  if (tab === 'email') {
    if (!preserveUserData) attrs.email = rubricaClean(form.email).toLowerCase() || null
    attrs.uso_email = rubricaClean(form.uso_email) || null
  } else {
    attrs.firmatario = 1
  }

  if (targetObjectId != null) {
    attrs.OBJECTID = targetObjectId
    const res = await fl.applyEdits({ updateFeatures: [{ attributes: attrs }] })
    const err = res?.updateFeatureResults?.[0]?.error
    if (err) throw new Error(err.description || err.message || 'Salvataggio non completato')
    return
  }

  Object.assign(attrs, {
    tipo_record: RUBRICA_TIPO,
    username: null,
    area: null,
    settore: null,
    ufficio: null,
    gruppo: null,
    gruppo_precedente: null,
    ruolo_cod: null,
    area_cod: null,
    settore_cod: null,
    tipo_soggetto: tab === 'firmatari' ? RUBRICA_PERSONA_FISICA : (rubricaClean(form.tipo_soggetto) || null),
    firmatario: tab === 'firmatari' ? 1 : 0,
    uso_email: tab === 'email' ? rubricaClean(form.uso_email) : null,
    email: tab === 'email' ? rubricaClean(form.email).toLowerCase() : null
  })
  const res = await fl.applyEdits({ addFeatures: [{ attributes: attrs }] })
  const err = res?.addFeatureResults?.[0]?.error
  if (err) throw new Error(err.description || err.message || 'Salvataggio non completato')
}

async function removeDirectoryFunction(serviceUrl: string, tab: DirectoryTab, record: DirectoryRecord): Promise<void> {
  const fl = await getFL(serviceUrl)
  const hasUserProfile = !!rubricaClean(record.username)
  const hasOtherFunction = tab === 'email' ? record.firmatario === 1 : !!rubricaClean(record.uso_email)
  if (!hasUserProfile && !hasOtherFunction && record.tipo_record === RUBRICA_TIPO) {
    const Graphic = await loadEsriModule<any>('esri/Graphic')
    const res = await fl.applyEdits({ deleteFeatures: [new Graphic({ attributes: { OBJECTID: record.objectid } })] })
    const err = res?.deleteFeatureResults?.[0]?.error
    if (err) throw new Error(err.description || err.message || 'Operazione non completata')
    return
  }
  const attrs: any = { OBJECTID: record.objectid }
  if (tab === 'email') attrs.uso_email = null
  else attrs.firmatario = 0
  const res = await fl.applyEdits({ updateFeatures: [{ attributes: attrs }] })
  const err = res?.updateFeatureResults?.[0]?.error
  if (err) throw new Error(err.description || err.message || 'Operazione non completata')
}

function RubricaWidget(props: AllWidgetProps<IMConfig>) {
  const cfg: any = props.config || {}
  const serviceUrl = rubricaClean(cfg.serviceUrl || DEFAULT_SERVICE_URL) || DEFAULT_SERVICE_URL
  const title = rubricaClean(cfg.title || 'Rubrica') || 'Rubrica'
  const titleColor = String(cfg.titleColor || '#93c5fd')
  const titleFontSize = Number(cfg.titleFontSize || 15)
  const fieldLabelColor = String(cfg.fieldLabelColor || '#1F4E79')
  const fieldLabelFontSize = Number(cfg.fieldLabelFontSize || 11)
  const detailCardBackgroundColor = String(cfg.detailCardBackgroundColor || '#f5f9ff')
  const recordsCardBackgroundColor = String(cfg.recordsCardBackgroundColor || '#f5f9ff')
  const tableHeaderBackgroundColor = String(cfg.tableHeaderBackgroundColor || '#1F4E79')
  const tableHeaderTextColor = String(cfg.tableHeaderTextColor || '#ffffff')
  const tableFontSize = Number(cfg.tableFontSize || 12)

  const [tab, setTab] = useState<DirectoryTab>('email')
  const [records, setRecords] = useState<DirectoryRecord[]>([])
  const [usages, setUsages] = useState<RubricaUsoOption[]>([])
  const [form, setForm] = useState<DirectoryForm>(directoryEmptyForm())
  const [initialEditForm, setInitialEditForm] = useState<DirectoryForm | null>(null)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [errorPopup, setErrorPopup] = useState<string | null>(null)
  const [deleteItem, setDeleteItem] = useState<DirectoryRecord | null>(null)
  const [selectedObjectId, setSelectedObjectId] = useState<number | null>(null)
  const [birthDateSupported, setBirthDateSupported] = useState(false)
  const [homonymPromptOpen, setHomonymPromptOpen] = useState(false)
  const [homonymConfirmedKey, setHomonymConfirmedKey] = useState('')
  const [homonymReuseId, setHomonymReuseId] = useState<number | null>(null)
  const [pendingBirthDates, setPendingBirthDates] = useState<Record<number, string>>({})
  const [validationAttempted, setValidationAttempted] = useState(false)
  const [directorySortRules, setDirectorySortRules] = useState<DirectorySortRule[]>([])
  const popupCloseRef = useRef<HTMLButtonElement | null>(null)
  const confirmCancelRef = useRef<HTMLButtonElement | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [editLockRects, setEditLockRects] = useState<GguLockRect[]>([])
  const role = rubricaWorkflowRole()
  const allowed = !role || role === 'RIA' || role === 'ADMIN'

  const visibleRecords = useMemo(() => {
    return records.filter(r => tab === 'email' ? !!r.uso_email : r.firmatario === 1)
  }, [records, tab])
  const selectableExisting = useMemo(() => {
    return records.filter(r => tab === 'email' ? !r.uso_email : r.firmatario !== 1)
      .sort((a,b) => directoryDisplayName(a).localeCompare(directoryDisplayName(b), 'it'))
  }, [records, tab])

  const showMsg = (text: string, ok: boolean) => {
    if (!ok) { setMsg(null); setDeleteItem(null); setErrorPopup(text.replace(/^Errore:\s*/i, '')); return }
    setErrorPopup(null); setDeleteItem(null); setMsg({ text, ok })
    window.setTimeout(() => setMsg(null), 3500)
  }

  const loadDirectory = React.useCallback(async () => {
    setLoading(true)
    try {
      const fl = await getFL(serviceUrl)
      setBirthDateSupported(hasBirthDateField(fl))
      const data = await fetchDirectory(serviceUrl)
      setRecords(data.records); setUsages(data.usages)
      setSelectedObjectId(sel => data.records.some(r => r.objectid === sel) ? sel : null)
    } catch (e: any) { showMsg(`Caricamento non riuscito: ${e?.message || e}`, false) }
    finally { setLoading(false) }
  }, [serviceUrl])

  useEffect(() => { if (allowed) void loadDirectory() }, [allowed, loadDirectory])
  useEffect(() => { setEditing(false); setForm(directoryEmptyForm()); setInitialEditForm(null); setDeleteItem(null); setSelectedObjectId(null); setMsg(null); setHomonymPromptOpen(false); setHomonymConfirmedKey(''); setHomonymReuseId(null); setPendingBirthDates({}); setValidationAttempted(false); setDirectorySortRules([]) }, [tab])

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
      const idsToMask = [
        'widget_840', // GII Header
        'widget_1454' // GII Navigazione - Rubrica
      ]
      const next: GguLockRect[] = []
      for (const id of idsToMask) {
        const el = findGguWidgetElement(doc, id)
        const rect = el ? getVisibleGguLockRect(el, id, viewW, viewH, win) : null
        if (rect) next.push(rect)
      }
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
        for (const id of ['widget_840', 'widget_1454']) {
          const el = findGguWidgetElement(doc, id)
          if (el && !observed.has(el)) { observed.add(el); ro.observe(el) }
        }
        if (rootRef.current && !observed.has(rootRef.current)) ro.observe(rootRef.current)
      }
    } catch { ro = null }

    const blockEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault(); event.stopPropagation()
        if (typeof (event as any).stopImmediatePropagation === 'function') (event as any).stopImmediatePropagation()
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
    if (!errorPopup && !deleteItem) return
    const previousActive = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.setTimeout(() => { if (deleteItem) confirmCancelRef.current?.focus(); else popupCloseRef.current?.focus() }, 0)
    const blockEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation() } }
    document.addEventListener('keydown', blockEscape, true)
    return () => { document.removeEventListener('keydown', blockEscape, true); document.body.style.overflow = previousOverflow; previousActive?.focus?.() }
  }, [errorPopup, deleteItem])

  const handlePopupKeyDown = (event: any) => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); return }
    if (event.key === 'Tab') { event.preventDefault(); if (deleteItem) confirmCancelRef.current?.focus(); else popupCloseRef.current?.focus() }
  }

  const usageLabel = (code: string) => usages.find(x => x.code === code)?.label || code || '—'

  const directorySortValue = (r: DirectoryRecord, field: DirectorySortField): string => {
    switch (field) {
      case 'denomination': return r.tipo_soggetto === RUBRICA_ALTRO ? (r.nome || directoryDisplayName(r)) : (composeFullName(r.nome, r.cognome) || directoryDisplayName(r))
      case 'email': return r.email
      case 'birth': return r.data_nascita
      case 'usage': return usageLabel(r.uso_email)
      case 'title': return TITOLI_UTENTE.find(t => t.code === r.titolo)?.label || r.titolo
      case 'name': return r.nome
      case 'surname': return r.cognome
      default: return ''
    }
  }

  const sortedVisibleRecords = useMemo(() => {
    if (directorySortRules.length === 0) return visibleRecords
    const arr = [...visibleRecords]
    arr.sort((a, b) => {
      for (const rule of directorySortRules) {
        const cmp = compareText(directorySortValue(a, rule.field), directorySortValue(b, rule.field))
        if (cmp !== 0) return rule.dir === 'asc' ? cmp : -cmp
      }
      return a.objectid - b.objectid
    })
    return arr
  }, [visibleRecords, directorySortRules, usages])

  const toggleDirectorySort = (field: DirectorySortField) => {
    setDirectorySortRules(prev => {
      const idx = prev.findIndex(r => r.field === field)
      if (idx < 0) return [...prev, { field, dir: 'asc' }]
      const next = [...prev]
      if (next[idx].dir === 'asc') { next[idx] = { field, dir: 'desc' }; return next }
      next.splice(idx, 1)
      return next
    })
  }

  const directorySortBadge = (field: DirectorySortField) => {
    const idx = directorySortRules.findIndex(r => r.field === field)
    if (idx < 0) return null
    const rule = directorySortRules[idx]
    return <span className="ggu-sort-ind"><span>{rule.dir === 'asc' ? '▲' : '▼'}</span><span className="ggu-sort-order">{idx + 1}</span></span>
  }

  const resetDirectorySort = () => setDirectorySortRules([])
  const onNew = () => {
    setSelectedObjectId(null)
    setInitialEditForm(null)
    setForm({ ...directoryEmptyForm(), uso_email: tab === 'email' ? (usages[0]?.code || RUBRICA_DETERMINA_A) : '', tipo_soggetto: tab === 'firmatari' ? RUBRICA_PERSONA_FISICA : '' })
    setHomonymPromptOpen(false); setHomonymConfirmedKey(''); setHomonymReuseId(null); setPendingBirthDates({}); setValidationAttempted(false)
    setMsg(null); setEditing(true)
  }
  const onEdit = (r: DirectoryRecord) => {
    setSelectedObjectId(r.objectid)
    const nextForm: DirectoryForm = { objectid:r.objectid, existingObjectId:null, nome:r.nome, cognome:r.cognome, titolo:r.titolo, full_name:r.full_name, email:r.email, data_nascita:r.data_nascita, uso_email:r.uso_email, tipo_soggetto:r.tipo_soggetto || (r.cognome || r.username ? RUBRICA_PERSONA_FISICA : RUBRICA_ALTRO) }
    setForm(nextForm)
    setInitialEditForm(nextForm)
    setHomonymPromptOpen(false); setHomonymConfirmedKey(''); setHomonymReuseId(null); setPendingBirthDates({}); setValidationAttempted(false)
    setMsg(null); setEditing(true)
  }
  const onChooseExisting = (value: string) => {
    const oid = Number(value) || 0
    setHomonymPromptOpen(false); setHomonymConfirmedKey(''); setHomonymReuseId(null); setPendingBirthDates({})
    if (!oid) { setForm(f => ({ ...directoryEmptyForm(), uso_email: f.uso_email })); return }
    const r = records.find(x => x.objectid === oid)
    if (!r) return
    setForm(f => ({ ...f, existingObjectId:r.objectid, nome:r.nome, cognome:r.cognome, titolo:r.titolo, full_name:r.full_name, email:r.email, data_nascita:r.data_nascita, tipo_soggetto:r.tipo_soggetto || (r.cognome || r.username ? RUBRICA_PERSONA_FISICA : RUBRICA_ALTRO) }))
  }
  const onCancel = () => { setEditing(false); setForm(directoryEmptyForm()); setInitialEditForm(null); setHomonymPromptOpen(false); setHomonymConfirmedKey(''); setHomonymReuseId(null); setPendingBirthDates({}); setValidationAttempted(false) }

  const rubricaEditDirty = useMemo(() => {
    if (!editing || form.objectid == null || !initialEditForm) return false
    const fields: Array<keyof DirectoryForm> = ['nome','cognome','titolo','full_name','email','data_nascita','uso_email','tipo_soggetto']
    return fields.some(field => rubricaClean(form[field]) !== rubricaClean(initialEditForm[field]))
  }, [editing, form, initialEditForm])

  const rubricaTargetId = form.objectid ?? form.existingObjectId ?? null
  const rubricaIsPerson = tab === 'firmatari' || form.tipo_soggetto === RUBRICA_PERSONA_FISICA
  const rubricaNameKey = rubricaIsPerson ? personNameKey(form.nome, form.cognome) : ''
  const rubricaHomonyms = rubricaNameKey ? records.filter(r => r.objectid !== rubricaTargetId && personNameKey(r.nome, r.cognome) === rubricaNameKey) : []
  const rubricaReusableHomonyms = tab === 'firmatari' ? rubricaHomonyms.filter(r => r.firmatario !== 1) : rubricaHomonyms
  const rubricaExistingSigners = tab === 'firmatari' ? rubricaHomonyms.filter(r => r.firmatario === 1) : []
  const rubricaCurrentRecord = rubricaTargetId != null ? records.find(r => r.objectid === rubricaTargetId) : null
  const rubricaBirthEditable = !rubricaCurrentRecord?.username
  const creatingRubricaHomonym = form.objectid == null && form.existingObjectId == null && rubricaHomonyms.length > 0
  const rubricaHomonymConfirmed = creatingRubricaHomonym && homonymConfirmedKey === rubricaNameKey
  useEffect(() => {
    if (homonymConfirmedKey && rubricaNameKey !== homonymConfirmedKey) {
      setHomonymConfirmedKey('')
      setHomonymReuseId(null)
      setPendingBirthDates({})
    }
  }, [rubricaNameKey, homonymConfirmedKey])
  const showRubricaBirthDate = !!form.data_nascita || (rubricaHomonyms.length > 0 && rubricaBirthEditable && form.existingObjectId == null && (form.objectid != null || rubricaHomonymConfirmed))
  const rubricaManagedMissingBirth = rubricaHomonymConfirmed ? rubricaHomonyms.filter(r => !r.username && !r.data_nascita) : []
  const promptRubricaHomonym = () => {
    if (!creatingRubricaHomonym || rubricaHomonymConfirmed) return
    const reusePool = tab === 'firmatari' ? rubricaReusableHomonyms : rubricaHomonyms
    setHomonymReuseId(prev => reusePool.some(r => r.objectid === prev) ? prev : (reusePool[0]?.objectid ?? null))
    setHomonymPromptOpen(true)
  }

  const onSave = async () => {
    setValidationAttempted(true)
    const nome = normalizePersonPart(form.nome)
    const cognome = normalizePersonPart(form.cognome)
    const tipoSoggetto = tab === 'firmatari' ? RUBRICA_PERSONA_FISICA : rubricaClean(form.tipo_soggetto)
    const isPerson = tipoSoggetto === RUBRICA_PERSONA_FISICA
    const fullName = isPerson ? (composeFullName(nome, cognome) || rubricaClean(form.full_name)) : (nome || rubricaClean(form.full_name))
    if (tab === 'email' && !tipoSoggetto) { showMsg('Selezionare il tipo di destinatario.', false); return }
    if (isPerson && (!nome || !cognome)) { showMsg('Inserire nome e cognome del nominativo.', false); return }
    if (!isPerson && !nome) { showMsg('Inserire la denominazione del destinatario.', false); return }
    if (tab === 'firmatari' && !rubricaClean(form.titolo)) { showMsg('Selezionare il titolo del firmatario.', false); return }
    const targetId = form.objectid ?? form.existingObjectId ?? null
    const nameKey = isPerson ? personNameKey(nome, cognome) : ''
    const homonyms = nameKey ? records.filter(r => r.objectid !== targetId && personNameKey(r.nome, r.cognome) === nameKey) : []
    const currentRecord = targetId != null ? records.find(r => r.objectid === targetId) : null
    const canEditBirthDate = !currentRecord?.username
    const originalKey = currentRecord ? personNameKey(currentRecord.nome, currentRecord.cognome) : ''
    const creatingHomonym = targetId == null && homonyms.length > 0
    const editingIntoHomonym = targetId != null && homonyms.length > 0 && canEditBirthDate && originalKey !== nameKey
    const homonymOperation = creatingHomonym || editingIntoHomonym
    if (creatingHomonym && homonymConfirmedKey !== nameKey) {
      const reusePool = tab === 'firmatari' ? homonyms.filter(r => r.firmatario !== 1) : homonyms
      setHomonymReuseId(prev => reusePool.some(r => r.objectid === prev) ? prev : (reusePool[0]?.objectid ?? null))
      setHomonymPromptOpen(true)
      return
    }
    const managedMissingBirth = homonymOperation ? homonyms.filter(r => !r.username && !r.data_nascita) : []
    if (homonymOperation && (!form.data_nascita || managedMissingBirth.some(r => !pendingBirthDates[r.objectid]))) {
      showMsg('Per distinguere correttamente gli omonimi, è necessario indicare la data di nascita di tutti i nominativi.', false)
      return
    }
    if (homonymOperation && !birthDateSupported) { showMsg('La gestione degli omonimi richiede il campo data di nascita, non disponibile nella configurazione corrente. Contattare l’amministratore.', false); return }
    const datesToCheck = [form.data_nascita, ...homonyms.map(r => r.data_nascita).filter(Boolean), ...managedMissingBirth.map(r => pendingBirthDates[r.objectid]).filter(Boolean)].filter(Boolean)
    if (new Set(datesToCheck).size !== datesToCheck.length) { showMsg('Le date di nascita indicate coincidono. Verificare i nominativi omonimi e inserire date diverse.', false); return }

    if (tab === 'email') {
      const email = rubricaClean(form.email).toLowerCase()
      const usage = rubricaClean(form.uso_email)
      if (!rubricaEmailValida(email)) { showMsg('Inserire un indirizzo e-mail valido per il destinatario.', false); return }
      if (!usage) { showMsg('Selezionare l’utilizzo previsto per l’indirizzo e-mail.', false); return }
      if (usage === RUBRICA_DETERMINA_A || usage === RUBRICA_PROTOCOLLO_A) {
        const otherMain = records.find(r => r.uso_email === usage && r.objectid !== targetId)
        if (otherMain) { showMsg(`È già configurato un ${usageLabel(usage)}: “${directoryDisplayName(otherMain)}”. Per questo utilizzo è consentito un solo destinatario.`, false); return }
      }
    }

    if (targetId == null && tab === 'email') {
      const normEmail = rubricaClean(form.email).toLowerCase()
      const existingByEmail = normEmail ? records.find(r => r.email.toLowerCase() === normEmail) : null
      if (existingByEmail && personNameKey(existingByEmail.nome, existingByEmail.cognome) !== nameKey) {
        showMsg('L’indirizzo e-mail inserito è già associato a un altro nominativo. Verificare il destinatario selezionato.', false); return
      }
    }

    setSaving(true)
    try {
      if (managedMissingBirth.length > 0) {
        const values: Record<number, string> = {}
        managedMissingBirth.forEach(r => { values[r.objectid] = pendingBirthDates[r.objectid] })
        await updatePersonBirthDates(serviceUrl, values)
      }
      await saveDirectoryFunction(serviceUrl, tab, { ...form, nome, cognome: isPerson ? cognome : '', full_name: fullName, tipo_soggetto: tipoSoggetto }, targetId == null || canEditBirthDate, !!currentRecord?.username)
      setEditing(false); setForm(directoryEmptyForm()); setInitialEditForm(null); setValidationAttempted(false); await loadDirectory()
      showMsg(form.objectid != null ? (tab === 'email' ? 'Destinatario aggiornato.' : 'Firmatario aggiornato.') : (tab === 'email' ? 'Destinatario salvato.' : 'Firmatario salvato.'), true)
    } catch (e: any) { showMsg(`Errore: ${e?.message || e}`, false) }
    finally { setSaving(false) }
  }

  const confirmRemove = async () => {
    if (!deleteItem) return
    const record = deleteItem
    setDeleteItem(null); setSaving(true)
    try {
      await removeDirectoryFunction(serviceUrl, tab, record)
      setSelectedObjectId(sel => sel === record.objectid ? null : sel)
      await loadDirectory()
      showMsg(tab === 'email' ? 'Destinatario rimosso.' : 'Firmatario rimosso.', true)
    } catch (e: any) { showMsg(`Errore: ${e?.message || e}`, false) }
    finally { setSaving(false) }
  }

  const editLockPortal = editing && !errorPopup && !deleteItem && editLockRects.length > 0 && typeof document !== 'undefined' ? createPortal(
    <Fragment>
      {editLockRects.map(rect => <div key={rect.key} className="ggu-edit-lock-zone" aria-hidden="true"
        style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
        onPointerDown={(e) => { e.preventDefault(); e.stopPropagation() }} onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
        onClick={(e) => { e.preventDefault(); e.stopPropagation() }} onDoubleClick={(e) => { e.preventDefault(); e.stopPropagation() }}
        onWheel={(e) => { e.preventDefault(); e.stopPropagation() }} onTouchStart={(e) => { e.preventDefault(); e.stopPropagation() }} />)}
    </Fragment>, getGlobalOverlayHost() || document.body) : null

  const homonymPromptPortal = homonymPromptOpen && typeof document !== 'undefined' ? createPortal(
    <div className="ggu-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="ggu-directory-homonym-title"
      onClick={(e) => { e.preventDefault(); e.stopPropagation() }} onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}>
      <div className="ggu-modal" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
        <div className="ggu-modal-head ggu-modal-head-info" id="ggu-directory-homonym-title">Nominativo già presente</div>
        <div className="ggu-modal-body ggu-homonym-choice">
          {tab === 'firmatari' && rubricaExistingSigners.length > 0 && rubricaReusableHomonyms.length === 0 ? (
            <div>{rubricaExistingSigners.length > 1 ? 'Esistono già firmatari con lo stesso nome e cognome.' : 'Esiste già un firmatario con lo stesso nome e cognome.'} Se si tratta della stessa persona, non è necessario aggiungerla nuovamente. Se invece è un omonimo distinto, registralo come omonimo.</div>
          ) : (
            <>
              <div>{rubricaHomonyms.length > 1 ? 'Esistono già nominativi con lo stesso nome e cognome.' : 'Esiste già un nominativo con lo stesso nome e cognome.'} È la stessa persona?</div>
              {rubricaReusableHomonyms.length > 1 && <select className="ggu-select" value={homonymReuseId || ''} onChange={e => setHomonymReuseId(Number(e.target.value) || null)}>
                {rubricaReusableHomonyms.map(r => <option key={r.objectid} value={r.objectid}>{directoryDisplayLabel(r, records)}</option>)}
              </select>}
            </>
          )}
        </div>
        <div className="ggu-modal-actions">
          <button className="ggu-modal-cancel" onClick={() => setHomonymPromptOpen(false)}>Correggi dati</button>
          {rubricaReusableHomonyms.length > 0 && <button className="ggu-modal-close" onClick={() => { const oid = homonymReuseId || rubricaReusableHomonyms[0]?.objectid; if (oid) onChooseExisting(String(oid)); setHomonymPromptOpen(false) }}>Riutilizza nominativo</button>}
          <button className="ggu-modal-close" onClick={() => { setHomonymConfirmedKey(rubricaNameKey); setHomonymPromptOpen(false) }}>Registra omonimo</button>
        </div>
      </div>
    </div>, getGlobalOverlayHost() || document.body) : null

  const errorPopupPortal = errorPopup && typeof document !== 'undefined' ? createPortal(
    <div className="ggu-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="ggu-directory-error-title"
      onClick={(e) => { e.preventDefault(); e.stopPropagation() }} onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
      onWheel={(e) => { e.preventDefault(); e.stopPropagation() }} onTouchMove={(e) => { e.preventDefault(); e.stopPropagation() }}
      onKeyDown={handlePopupKeyDown} tabIndex={-1}>
      <div className="ggu-modal" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
        <div className="ggu-modal-head" id="ggu-directory-error-title">Operazione non completata</div>
        <div className="ggu-modal-body">{errorPopup}</div>
        <div className="ggu-modal-actions"><button ref={popupCloseRef} className="ggu-modal-close" onClick={() => setErrorPopup(null)}>Ho capito</button></div>
      </div>
    </div>, document.body) : null

  const deleteConfirmPortal = deleteItem && typeof document !== 'undefined' ? createPortal(
    <div className="ggu-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="ggu-directory-delete-title"
      onClick={(e) => { e.preventDefault(); e.stopPropagation() }} onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
      onWheel={(e) => { e.preventDefault(); e.stopPropagation() }} onTouchMove={(e) => { e.preventDefault(); e.stopPropagation() }}
      onKeyDown={handlePopupKeyDown} tabIndex={-1}>
      <div className="ggu-modal" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
        <div className="ggu-modal-head" id="ggu-directory-delete-title">Conferma</div>
        <div className="ggu-modal-body">{tab === 'email' ? `Rimuovere “${directoryDisplayName(deleteItem)}” dai destinatari e-mail?` : `Rimuovere “${directoryDisplayName(deleteItem)}” dai firmatari?`}</div>
        <div className="ggu-modal-actions">
          <button ref={confirmCancelRef} className="ggu-modal-cancel" onClick={() => setDeleteItem(null)}>Annulla</button>
          <button className="ggu-modal-danger" onClick={confirmRemove}>Rimuovi</button>
        </div>
      </div>
    </div>, document.body) : null

  return (
    <Fragment>
      <style>{styles}</style>{editLockPortal}{homonymPromptPortal}{errorPopupPortal}{deleteConfirmPortal}
      <div ref={rootRef} className={`ggu ${editing ? 'ggu-editing-global-lock' : ''}`} style={{
        '--ggu-title-color': titleColor, '--ggu-title-font-size': `${titleFontSize}px`, '--ggu-field-label-color': fieldLabelColor,
        '--ggu-field-label-font-size': `${fieldLabelFontSize}px`, '--ggu-detail-card-background': detailCardBackgroundColor,
        '--ggu-records-card-background': recordsCardBackgroundColor, '--ggu-table-header-background': tableHeaderBackgroundColor,
        '--ggu-table-header-text': tableHeaderTextColor, '--ggu-table-font-size': `${tableFontSize}px`
      } as React.CSSProperties}>
        <div className="ggu-title">{title}</div>
        {!allowed ? <div className="ggu-msg ggu-msg-err">Il profilo corrente non è abilitato a questa gestione.</div> : <Fragment>
          <div className="ggu-dir-tabs">
            <button className={`ggu-dir-tab ${tab === 'email' ? 'ggu-dir-tab-active' : ''}`} disabled={editing} onClick={() => setTab('email')}>Destinatari e-mail</button>
            <button className={`ggu-dir-tab ${tab === 'firmatari' ? 'ggu-dir-tab-active' : ''}`} disabled={editing} onClick={() => setTab('firmatari')}>Firmatari</button>
          </div>
          {msg && <div className={`ggu-msg ${msg.ok ? 'ggu-msg-ok' : 'ggu-msg-err'}`}>{msg.text}</div>}
          {!editing && <div className="ggu-toolbar"><div className="ggu-toolbar-left"><NewRecordButton onClick={onNew} disabled={loading || saving} title={tab === 'email' ? 'Aggiungi destinatario' : 'Aggiungi firmatario'} /></div><button className="ggu-btn ggu-btn-reset-sort ggu-toolbar-reset-right" onClick={resetDirectorySort} disabled={directorySortRules.length === 0} title="Reset ordinamento" aria-label="Reset ordinamento">↺</button></div>}

          {editing && <div className={`ggu-form ggu-form-directory ${tab === 'email' ? (form.objectid ? 'ggu-dir-email-edit' : 'ggu-dir-email-new') : (form.objectid ? 'ggu-dir-firm-edit' : 'ggu-dir-firm-new')} ${showRubricaBirthDate ? 'ggu-has-birth' : ''} ${tab === 'email' && form.tipo_soggetto === RUBRICA_ALTRO ? 'ggu-dir-altro' : ''}`}>
            {!form.objectid && <div className="ggu-field ggu-dir-person">
              <div className="ggu-label">Nominativo già presente</div>
              <select className="ggu-select" value={form.existingObjectId || ''} onChange={e => onChooseExisting(e.target.value)}>
                <option value="">— nuovo nominativo —</option>
                {selectableExisting.map(r => <option key={r.objectid} value={r.objectid}>{directoryDisplayLabel(r, records)}</option>)}
              </select>
            </div>}
            {tab === 'email' && <div className="ggu-field ggu-dir-kind"><div className="ggu-label">Tipo{!rubricaCurrentRecord?.username ? ' *' : ''}</div><select className={`ggu-select${validationAttempted && !rubricaCurrentRecord?.username && !form.tipo_soggetto ? ' ggu-required-missing' : ''}`} value={form.tipo_soggetto} disabled={!!rubricaCurrentRecord?.username} onChange={e => setForm(f => ({...f,tipo_soggetto:e.target.value,cognome:e.target.value === RUBRICA_ALTRO ? '' : f.cognome,titolo:e.target.value === RUBRICA_ALTRO ? '' : f.titolo,data_nascita:e.target.value === RUBRICA_ALTRO ? '' : f.data_nascita,full_name:e.target.value === RUBRICA_ALTRO ? f.nome : composeFullName(f.nome,f.cognome)}))}><option value="">— seleziona —</option><option value={RUBRICA_PERSONA_FISICA}>Persona fisica</option><option value={RUBRICA_ALTRO}>Altro</option></select></div>}
            {tab === 'firmatari' && <div className="ggu-field ggu-dir-title"><div className="ggu-label">Titolo{!rubricaCurrentRecord?.username ? ' *' : ''}</div><select className={`ggu-select${validationAttempted && !rubricaCurrentRecord?.username && !rubricaClean(form.titolo) ? ' ggu-required-missing' : ''}`} value={form.titolo} disabled={!!rubricaCurrentRecord?.username} onChange={e => setForm(f => ({...f,titolo:e.target.value}))}><option value="">—</option>{TITOLI_UTENTE.map(t => <option key={t.code} value={t.code}>{t.label}</option>)}</select></div>}
            <div className="ggu-field ggu-dir-name"><div className="ggu-label">{tab === 'email' && form.tipo_soggetto === RUBRICA_ALTRO ? `Denominazione${!rubricaCurrentRecord?.username ? ' *' : ''}` : `Nome${!rubricaCurrentRecord?.username ? ' *' : ''}`}</div><input className={`ggu-input${validationAttempted && !rubricaCurrentRecord?.username && !normalizePersonPart(form.nome) ? ' ggu-required-missing' : ''}`} value={form.nome} disabled={!!rubricaCurrentRecord?.username} onChange={e => setForm(f => ({...f,nome:e.target.value,full_name:(tab === 'email' && f.tipo_soggetto === RUBRICA_ALTRO) ? e.target.value : composeFullName(e.target.value,f.cognome)}))} onBlur={form.tipo_soggetto === RUBRICA_ALTRO ? undefined : promptRubricaHomonym} /></div>
            {(tab === 'firmatari' || form.tipo_soggetto !== RUBRICA_ALTRO) && <div className="ggu-field ggu-dir-surname"><div className="ggu-label">Cognome{!rubricaCurrentRecord?.username ? ' *' : ''}</div><input className={`ggu-input${validationAttempted && !rubricaCurrentRecord?.username && !normalizePersonPart(form.cognome) ? ' ggu-required-missing' : ''}`} value={form.cognome} disabled={!!rubricaCurrentRecord?.username} onChange={e => setForm(f => ({...f,cognome:e.target.value,full_name:composeFullName(f.nome,e.target.value)}))} onBlur={promptRubricaHomonym} /></div>}
            {showRubricaBirthDate && rubricaIsPerson && <div className="ggu-field ggu-dir-birth ggu-birth-field"><div className="ggu-label">Data di nascita{rubricaHomonyms.length > 0 && rubricaBirthEditable ? ' *' : ''}</div><input className={`ggu-input${validationAttempted && rubricaBirthEditable && rubricaHomonyms.length > 0 && !form.data_nascita ? ' ggu-required-missing' : ''}`} type="date" value={form.data_nascita} disabled={!rubricaBirthEditable} onChange={e => setForm(f => ({...f,data_nascita:e.target.value}))} /></div>}
            {tab === 'email' && <Fragment>
              <div className="ggu-field ggu-dir-email"><div className="ggu-label">E-mail{!rubricaCurrentRecord?.username ? ' *' : ''}</div><input className={`ggu-input${validationAttempted && !rubricaCurrentRecord?.username && !rubricaEmailValida(rubricaClean(form.email).toLowerCase()) ? ' ggu-required-missing' : ''}`} type="email" value={form.email} disabled={!!rubricaCurrentRecord?.username} onChange={e => setForm(f => ({...f,email:e.target.value}))} /></div>
              <div className="ggu-field ggu-dir-usage"><div className="ggu-label">Utilizzo *</div><select className={`ggu-select${validationAttempted && !rubricaClean(form.uso_email) ? ' ggu-required-missing' : ''}`} value={form.uso_email} onChange={e => setForm(f => ({...f,uso_email:e.target.value}))}><option value="">— seleziona —</option>{usages.map(u => <option key={u.code} value={u.code}>{u.label}</option>)}</select></div>
            </Fragment>}
            {rubricaManagedMissingBirth.length > 0 && <div className="ggu-homonym-dates">
              <div className="ggu-homonym-dates-title">Per distinguere correttamente gli omonimi, completare anche la data di nascita {rubricaManagedMissingBirth.length > 1 ? 'dei nominativi già presenti' : 'del nominativo già presente'}.</div>
              {rubricaManagedMissingBirth.map((r, i) => <div className="ggu-field ggu-birth-field" key={r.objectid}><div className="ggu-label">{directoryDisplayName(r)}{rubricaManagedMissingBirth.length > 1 ? ` (${i + 1})` : ''} *</div><input className={`ggu-input${validationAttempted && !pendingBirthDates[r.objectid] ? ' ggu-required-missing' : ''}`} type="date" value={pendingBirthDates[r.objectid] || ''} onChange={e => setPendingBirthDates(v => ({ ...v, [r.objectid]: e.target.value }))} /></div>)}
            </div>}
            <div className="ggu-required-note">* campo obbligatorio</div>
            <div className="ggu-btns"><button className="ggu-btn ggu-btn-save" onClick={onSave} disabled={saving || (form.objectid != null && !rubricaEditDirty)} title={form.objectid != null && !rubricaEditDirty ? 'Nessuna modifica da salvare' : undefined}>{saving ? (form.objectid != null ? 'Aggiornamento...' : 'Salvataggio...') : (form.objectid != null ? 'Aggiorna' : 'Salva')}</button><button className="ggu-btn ggu-btn-cancel" onClick={onCancel} disabled={saving}>Annulla</button></div>
          </div>}

          <div className="ggu-table-wrap">{loading ? <div className="ggu-empty">Caricamento...</div> : <table className={`ggu-table ggu-directory-table ${tab === 'firmatari' ? 'ggu-directory-firm-table' : 'ggu-directory-email-table'}`}>
            <thead>{tab === 'email' ? <tr><th className="ggu-col-denomination ggu-sortable" onClick={() => toggleDirectorySort('denomination')} title="Clic: aggiungi/inverti/rimuovi ordinamento">Denominazione{directorySortBadge('denomination')}</th><th className="ggu-col-email ggu-sortable" onClick={() => toggleDirectorySort('email')} title="Clic: aggiungi/inverti/rimuovi ordinamento">E-mail{directorySortBadge('email')}</th><th className="ggu-col-birth ggu-sortable" onClick={() => toggleDirectorySort('birth')} title="Clic: aggiungi/inverti/rimuovi ordinamento">Data di nascita{directorySortBadge('birth')}</th><th className="ggu-col-usage ggu-sortable" onClick={() => toggleDirectorySort('usage')} title="Clic: aggiungi/inverti/rimuovi ordinamento">Utilizzo{directorySortBadge('usage')}</th><th className="ggu-directory-spacer"></th><th className="ggu-actions-col ggu-actions-head">Azioni</th></tr> : <tr><th className="ggu-col-title ggu-sortable" onClick={() => toggleDirectorySort('title')} title="Clic: aggiungi/inverti/rimuovi ordinamento">Titolo{directorySortBadge('title')}</th><th className="ggu-col-name ggu-sortable" onClick={() => toggleDirectorySort('name')} title="Clic: aggiungi/inverti/rimuovi ordinamento">Nome{directorySortBadge('name')}</th><th className="ggu-col-surname ggu-sortable" onClick={() => toggleDirectorySort('surname')} title="Clic: aggiungi/inverti/rimuovi ordinamento">Cognome{directorySortBadge('surname')}</th><th className="ggu-col-birth ggu-sortable" onClick={() => toggleDirectorySort('birth')} title="Clic: aggiungi/inverti/rimuovi ordinamento">Data di nascita{directorySortBadge('birth')}</th><th className="ggu-directory-spacer"></th><th className="ggu-actions-col ggu-actions-head">Azioni</th></tr>}</thead>
            <tbody>
              {sortedVisibleRecords.length === 0 && <tr><td colSpan={6} className="ggu-empty">{tab === 'email' ? 'Nessun destinatario presente' : 'Nessun firmatario presente'}</td></tr>}
              {sortedVisibleRecords.map(r => <tr key={r.objectid} className={selectedObjectId === r.objectid || form.objectid === r.objectid ? 'ggu-sel' : ''} onClick={() => setSelectedObjectId(r.objectid)} onDoubleClick={() => onEdit(r)}>
                {tab === 'email' ? <Fragment><td>{r.tipo_soggetto === RUBRICA_ALTRO ? (r.nome || directoryDisplayName(r) || '—') : (composeFullName(r.nome, r.cognome) || directoryDisplayName(r) || '—')}</td><td>{r.email || '—'}</td><td>{r.data_nascita ? formatBirthDate(r.data_nascita) : '—'}</td><td>{usageLabel(r.uso_email)}</td></Fragment> : <Fragment><td>{TITOLI_UTENTE.find(t => t.code === r.titolo)?.label || r.titolo || '—'}</td><td>{r.nome || '—'}</td><td>{r.cognome || '—'}</td><td>{r.data_nascita ? formatBirthDate(r.data_nascita) : '—'}</td></Fragment>}
                <td className="ggu-directory-spacer"></td><td className="ggu-actions-col"><RecordEditButton onClick={(e) => {e.stopPropagation();onEdit(r)}} title="Modifica" ariaLabel="Modifica"/><RecordDeleteButton onClick={(e) => {e.stopPropagation();setDeleteItem(r)}} title="Rimuovi" ariaLabel="Rimuovi"/></td>
              </tr>)}
            </tbody>
          </table>}</div>
        </Fragment>}
      </div>
    </Fragment>
  )
}

// ── Widget ─────────────────────────────────────────────────────────────────
function UtentiWidget(props: AllWidgetProps<IMConfig>) {
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
  const [noticePopup, setNoticePopup] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<UtenteRecord | null>(null)
  const popupCloseRef = useRef<HTMLButtonElement | null>(null)
  const confirmCancelRef = useRef<HTMLButtonElement | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [editLockRects, setEditLockRects] = useState<GguLockRect[]>([])
  const [selectedObjectId, setSelectedObjectId] = useState<number | null>(null)
  const [people, setPeople] = useState<DirectoryRecord[]>([])
  const [birthDateSupported, setBirthDateSupported] = useState(false)
  const [homonymPromptOpen, setHomonymPromptOpen] = useState(false)
  const [homonymConfirmedKey, setHomonymConfirmedKey] = useState('')
  const [homonymReuseId, setHomonymReuseId] = useState<number | null>(null)
  const [pendingBirthDates, setPendingBirthDates] = useState<Record<number, string>>({})
  const [userValidationAttempted, setUserValidationAttempted] = useState(false)
  const [sortRules, setSortRules] = useState<SortRule[]>([])
  const [domainLabels, setDomainLabels] = useState<DomainLabelMap>({})
  const [agolMemberPickerOpen, setAgolMemberPickerOpen] = useState(false)
  const [agolMembersLoading, setAgolMembersLoading] = useState(false)
  const [agolMembers, setAgolMembers] = useState<AgolOrganizationMember[]>([])
  const [agolMemberSearch, setAgolMemberSearch] = useState('')
  const [agolSortRules, setAgolSortRules] = useState<AgolSortRule[]>([])
  const [selectedAgolUsername, setSelectedAgolUsername] = useState('')
  const [assignmentSourceObjectId, setAssignmentSourceObjectId] = useState<number | null>(null)
  const [agolSyncPreview, setAgolSyncPreview] = useState<{ member: AgolOrganizationMember; changes: Array<{ field: string; current: string; agol: string }> } | null>(null)
  const [agolSyncLoading, setAgolSyncLoading] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filterSearch, setFilterSearch] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [filterArea, setFilterArea] = useState('')
  const [filterSettore, setFilterSettore] = useState('')
  const [filterUfficio, setFilterUfficio] = useState('')
  const [filterGruppo, setFilterGruppo] = useState('')

  const originalEditedUser = useMemo(() => (
    form.objectid != null ? utenti.find(u => u.objectid === form.objectid) ?? null : null
  ), [form.objectid, utenti])

  const hasEffectiveEditChanges = useMemo(() => {
    if (form.objectid == null) return true
    if (!originalEditedUser) return false
    return !sameUserFormValues(originalEditedUser, form)
  }, [form, originalEditedUser])

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
    if (!errorPopup && !deleteConfirm && !agolMemberPickerOpen && !agolSyncPreview) return

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
  }, [errorPopup, deleteConfirm, agolMemberPickerOpen, agolSyncPreview])

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
      setBirthDateSupported(hasBirthDateField(fl))
      const [rows, directory] = await Promise.all([fetchUtenti(serviceUrl), fetchDirectory(serviceUrl)])
      setUtenti(rows)
      setPeople(directory.records)
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

  const normalizeFilterText = (value: any) => String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('it-IT')
    .replace(/\s+/g, ' ')

  const searchMatchesUser = (u: UtenteRecord) => {
    const needle = normalizeFilterText(filterSearch)
    if (!needle) return true

    // Cerca sugli stessi dati che concorrono al nominativo mostrato in tabella,
    // oltre a username ed e-mail. I singoli termini possono comparire in punti
    // diversi del nominativo e il confronto non distingue gli accenti.
    const displayName = composeFullName(u.nome, u.cognome) || u.full_name || ''
    const haystack = normalizeFilterText([
      u.username,
      displayName,
      u.full_name,
      u.nome,
      u.cognome,
      u.email
    ].filter(Boolean).join(' '))
    const terms = needle.split(' ').filter(Boolean)
    return terms.every(term => haystack.includes(term))
  }

  const roleFilterOptions = useMemo(() => {
    const available = new Set(utenti.filter(searchMatchesUser).map(u => String(u.ruolo_cod || '').trim()).filter(Boolean))
    return RUOLI.filter(r => available.has(r.code))
  }, [utenti, filterSearch])

  const areaFilterOptions = useMemo(() => {
    const vals = new Set(utenti.filter(u => searchMatchesUser(u) && (!filterRole || u.ruolo_cod === filterRole)).map(u => u.area).filter((v): v is number => v != null))
    return AREE.filter(a => vals.has(a.value))
  }, [utenti, filterSearch, filterRole])

  const settoreFilterOptions = useMemo(() => {
    const areaValue = filterArea ? Number(filterArea) : null
    const vals = new Set(utenti.filter(u => searchMatchesUser(u) && (!filterRole || u.ruolo_cod === filterRole) && (areaValue == null || u.area === areaValue)).map(u => u.settore).filter((v): v is number => v != null))
    return SETTORI.filter(item => vals.has(item.value))
  }, [utenti, filterSearch, filterRole, filterArea])

  const ufficioFilterOptions = useMemo(() => {
    const areaValue = filterArea ? Number(filterArea) : null
    const settoreValue = filterSettore ? Number(filterSettore) : null
    const vals = new Set(utenti.filter(u => searchMatchesUser(u) && (!filterRole || u.ruolo_cod === filterRole) && (areaValue == null || u.area === areaValue) && (settoreValue == null || u.settore === settoreValue)).map(u => u.ufficio).filter((v): v is number => v != null))
    return UFFICI.filter(item => vals.has(item.value))
  }, [utenti, filterSearch, filterRole, filterArea, filterSettore])

  const gruppoFilterOptions = useMemo(() => {
    const areaValue = filterArea ? Number(filterArea) : null
    const settoreValue = filterSettore ? Number(filterSettore) : null
    const ufficioValue = filterUfficio ? Number(filterUfficio) : null
    const vals = new Set(utenti.filter(u => searchMatchesUser(u) && (!filterRole || u.ruolo_cod === filterRole) && (areaValue == null || u.area === areaValue) && (settoreValue == null || u.settore === settoreValue) && (ufficioValue == null || u.ufficio === ufficioValue)).map(u => String(u.gruppo || '').trim()).filter(Boolean))
    return Array.from(vals).sort((a, b) => a.localeCompare(b, 'it', { sensitivity: 'base' }))
  }, [utenti, filterSearch, filterRole, filterArea, filterSettore, filterUfficio])

  const filteredUtenti = useMemo(() => {
    const areaValue = filterArea ? Number(filterArea) : null
    const settoreValue = filterSettore ? Number(filterSettore) : null
    const ufficioValue = filterUfficio ? Number(filterUfficio) : null
    return utenti.filter(u =>
      searchMatchesUser(u) &&
      (!filterRole || u.ruolo_cod === filterRole) &&
      (areaValue == null || u.area === areaValue) &&
      (settoreValue == null || u.settore === settoreValue) &&
      (ufficioValue == null || u.ufficio === ufficioValue) &&
      (!filterGruppo || u.gruppo === filterGruppo)
    )
  }, [utenti, filterSearch, filterRole, filterArea, filterSettore, filterUfficio, filterGruppo])

  useEffect(() => {
    if (selectedObjectId != null && !filteredUtenti.some(u => u.objectid === selectedObjectId)) {
      setSelectedObjectId(null)
    }
  }, [filteredUtenti, selectedObjectId])

  const sortedUtenti = useMemo(() => {
    if (sortRules.length === 0) return filteredUtenti
    const arr = [...filteredUtenti]
    arr.sort((a, b) => {
      for (const rule of sortRules) {
        const cmp = compareText(sortValue(a, rule.field, domainLabels), sortValue(b, rule.field, domainLabels))
        if (cmp !== 0) return rule.dir === 'asc' ? cmp : -cmp
      }
      return a.objectid - b.objectid
    })
    return arr
  }, [filteredUtenti, sortRules, domainLabels])

  const filtersActive = !!(filterSearch.trim() || filterRole || filterArea || filterSettore || filterUfficio || filterGruppo)
  const resetFilters = () => {
    setFilterSearch('')
    setFilterRole('')
    setFilterArea('')
    setFilterSettore('')
    setFilterUfficio('')
    setFilterGruppo('')
  }

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
  const onRuoloChange = (val: string | null) => {
    const ruoloCod = normalizeRuoloCod(val)

    // In modifica, se si torna esattamente al ruolo originario, ripristina anche
    // l'intera cascata originaria. In questo modo il form torna realmente
    // identico allo stato iniziale e il pulsante Aggiorna si disabilita.
    if (form.objectid != null && originalEditedUser && ruoloCod === normalizeRuoloCod(originalEditedUser.ruolo_cod)) {
      const isAdminOriginale = normalizeRuoloCod(originalEditedUser.ruolo_cod) === 'ADMIN'
      setForm(f => ({
        ...f,
        ruolo_cod: normalizeRuoloCod(originalEditedUser.ruolo_cod),
        area: isAdminOriginale ? null : originalEditedUser.area,
        settore: isAdminOriginale ? null : originalEditedUser.settore,
        ufficio: isAdminOriginale ? null : originalEditedUser.ufficio,
        area_cod: isAdminOriginale ? null : (originalEditedUser.area_cod ?? codeOf(AREE, originalEditedUser.area)),
        settore_cod: isAdminOriginale ? null : (originalEditedUser.settore_cod ?? codeOf(SETTORI, originalEditedUser.settore)),
        gruppo: isAdminOriginale ? '' : originalEditedUser.gruppo
      }))
      return
    }

    // ADMIN: non assegnare automaticamente area/settore/ufficio né gruppi.
    // L'utente admin (owner) ha già privilegi nativi e, se serve, può essere messo manualmente nei gruppi AGOL.
    if (ruoloCod === 'ADMIN') {
      setForm(f => ({ ...f, ruolo_cod: 'ADMIN', area: null, settore: null, ufficio: null, area_cod: null, settore_cod: null, gruppo: '' }))
      return
    }
    const aree = ruoloCod ? getAreePerRuolo(ruoloCod) : []
    const areaAuto = aree.length === 1 ? aree[0] : null
    const settori = ruoloCod && areaAuto ? getSettoriPerRuoloArea(ruoloCod, areaAuto) : []
    const settoreAuto = settori.length === 1 ? settori[0] : null
    const isCagliari = !!ruoloCod && (['RIT','RIA','DT','DA'].includes(ruoloCod) || (ruoloCod === 'IA' && areaAuto === 1))
    const ufficioAuto = isCagliari ? 1 : null
    const gr = ruoloCod && areaAuto ? calcolaGruppo(ruoloCod, areaAuto, settoreAuto ?? 0) : ''
    setForm(f => ({ ...f, ruolo_cod: ruoloCod, area: areaAuto, settore: settoreAuto, ufficio: ufficioAuto, area_cod: codeOf(AREE, areaAuto), settore_cod: codeOf(SETTORI, settoreAuto), gruppo: gr }))
  }

  const onAreaChange = (val: number | null) => {
    const ruoloCod = normalizeRuoloCod(form.ruolo_cod)
    if (!ruoloCod) return

    // Se si torna all'area iniziale (con lo stesso ruolo iniziale), ripristina
    // anche settore, ufficio e gruppo originali invece di lasciare la cascata
    // ricalcolata/azzerata dal cambio precedente.
    if (form.objectid != null && originalEditedUser &&
        ruoloCod === normalizeRuoloCod(originalEditedUser.ruolo_cod) &&
        Number(val) === Number(originalEditedUser.area)) {
      setForm(f => ({
        ...f,
        area: originalEditedUser.area,
        settore: originalEditedUser.settore,
        ufficio: originalEditedUser.ufficio,
        area_cod: originalEditedUser.area_cod ?? codeOf(AREE, originalEditedUser.area),
        settore_cod: originalEditedUser.settore_cod ?? codeOf(SETTORI, originalEditedUser.settore),
        gruppo: originalEditedUser.gruppo
      }))
      return
    }

    const settori = val ? getSettoriPerRuoloArea(ruoloCod, val) : []
    const settoreAuto = settori.length === 1 ? settori[0] : null
    const isCagliari = ['RIT','RIA','DT','DA'].includes(ruoloCod) || (ruoloCod === 'IA' && val === 1)
    const ufficioAuto = isCagliari ? 1 : null
    const gr = val ? calcolaGruppo(ruoloCod, val, settoreAuto ?? 0) : ''
    setForm(f => ({ ...f, area: val, settore: settoreAuto, ufficio: ufficioAuto, area_cod: codeOf(AREE, val), settore_cod: codeOf(SETTORI, settoreAuto), gruppo: gr }))
  }

  const onSettoreChange = (val: number | null) => {
    const ruoloCod = normalizeRuoloCod(form.ruolo_cod)
    if (!ruoloCod || !form.area) return

    // Stesso principio per il settore: tornando al valore iniziale, ripristina
    // l'ufficio e il gruppo originari se ruolo e area sono quelli iniziali.
    if (form.objectid != null && originalEditedUser &&
        ruoloCod === normalizeRuoloCod(originalEditedUser.ruolo_cod) &&
        Number(form.area) === Number(originalEditedUser.area) &&
        Number(val) === Number(originalEditedUser.settore)) {
      setForm(f => ({
        ...f,
        settore: originalEditedUser.settore,
        ufficio: originalEditedUser.ufficio,
        settore_cod: originalEditedUser.settore_cod ?? codeOf(SETTORI, originalEditedUser.settore),
        gruppo: originalEditedUser.gruppo
      }))
      return
    }

    const uffici = val ? getUfficiPerAreaSettore(form.area, val) : []
    const ufficioAuto = uffici.length === 1 ? uffici[0].value : null
    const gr = val ? calcolaGruppo(ruoloCod, form.area, val) : ''
    setForm(f => ({ ...f, settore: val, ufficio: ufficioAuto, settore_cod: codeOf(SETTORI, val), gruppo: gr }))
  }

  const onUfficioChange = (val: number | null) => {
    setForm(f => ({ ...f, ufficio: val }))
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const registeredAgolUsernames = useMemo(() => (
    new Set(utenti.map(u => String(u.username || '').trim().toLowerCase()).filter(Boolean))
  ), [utenti])

  const visibleAgolMembers = useMemo(() => {
    const term = agolMemberSearch.trim().toLocaleLowerCase('it')
    const arr = agolMembers.filter(m => {
      if (!term) return true
      return [m.fullName, m.firstName, m.lastName, m.username, m.email].some(v => String(v || '').toLocaleLowerCase('it').includes(term))
    })
    if (agolSortRules.length === 0) return arr
    arr.sort((a, b) => {
      for (const rule of agolSortRules) {
        const av = rule.field === 'fullName' ? (a.fullName || composeFullName(a.firstName, a.lastName)) : (a[rule.field] || '')
        const bv = rule.field === 'fullName' ? (b.fullName || composeFullName(b.firstName, b.lastName)) : (b[rule.field] || '')
        const cmp = compareText(String(av), String(bv))
        if (cmp !== 0) return rule.dir === 'asc' ? cmp : -cmp
      }
      return compareText(a.username, b.username)
    })
    return arr
  }, [agolMembers, agolMemberSearch, agolSortRules])

  const toggleAgolSort = (field: AgolSortField) => {
    setAgolSortRules(prev => {
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

  const agolSortBadge = (field: AgolSortField) => {
    const idx = agolSortRules.findIndex(r => r.field === field)
    if (idx < 0) return null
    const rule = agolSortRules[idx]
    return (
      <span className="ggu-sort-ind">
        <span>{rule.dir === 'asc' ? '▲' : '▼'}</span>
        <span className="ggu-sort-order">{idx + 1}</span>
      </span>
    )
  }

  const registeredAgolCount = useMemo(() => (
    agolMembers.filter(m => registeredAgolUsernames.has(m.username.toLowerCase())).length
  ), [agolMembers, registeredAgolUsernames])

  const availableAgolCount = Math.max(0, agolMembers.length - registeredAgolCount)

  const onNew = async () => {
    setSelectedObjectId(null)
    setForm(emptyForm())
    setSelectedAgolUsername('')
    setAssignmentSourceObjectId(null)
    setHomonymPromptOpen(false)
    setHomonymConfirmedKey('')
    setHomonymReuseId(null)
    setPendingBirthDates({})
    setUserValidationAttempted(false)
    setAgolMemberSearch('')
    setAgolSortRules([])
    setAgolMemberPickerOpen(true)
    setAgolMembersLoading(true)
    try {
      const token = await getAGOLToken(props.config?.clientSecret ?? '')
      const members = await fetchAgolOrganizationMembers(token)
      setAgolMembers(members)
    } catch (e) {
      console.error('fetchAgolOrganizationMembers error:', e)
      setAgolMemberPickerOpen(false)
      showMsg('Impossibile caricare i membri AGOL.', false)
    } finally {
      setAgolMembersLoading(false)
    }
  }

  const chooseAgolMember = (member: AgolOrganizationMember) => {
    if (member.disabled) return
    const nome = normalizePersonPart(member.firstName)
    const cognome = normalizePersonPart(member.lastName)
    const nextForm = {
      ...emptyForm(),
      username: member.username,
      nome,
      cognome,
      email: member.email,
      full_name: composeFullName(nome, cognome) || member.fullName
    }
    setForm(nextForm)
    setSelectedAgolUsername(member.username)
    setAssignmentSourceObjectId(null)
    setUserValidationAttempted(false)
    setAgolMemberPickerOpen(false)
    setEditing(true)

    // Dopo la selezione AGOL verifica subito i possibili omonimi/duplicati
    // esclusivamente per coincidenza di nome + cognome normalizzati. L'e-mail
    // non è una chiave di identità: può essere condivisa da più membri AGOL.
    const key = personNameKey(nome, cognome)
    const matches = key ? people.filter(r => personNameKey(r.nome, r.cognome) === key) : []
    if (matches.length > 0) {
      const firstAssociable = matches.find(r => !rubricaClean(r.username)) || matches[0]
      setHomonymReuseId(firstAssociable?.objectid ?? null)
      setHomonymConfirmedKey('')
      setPendingBirthDates({})
      setHomonymPromptOpen(true)
    }
  }

  const onDuplicateAssignment = (u: UtenteRecord) => {
    setSelectedObjectId(u.objectid)
    const isAdmin = normalizeRuoloCod(u.ruolo_cod) === 'ADMIN'
    setForm({
      ...emptyForm(),
      username:          u.username,
      nome:              u.nome,
      cognome:           u.cognome,
      titolo:            u.titolo,
      email:             u.email,
      data_nascita:      u.data_nascita,
      full_name:         composeFullName(u.nome, u.cognome),
      area:              isAdmin ? null : u.area,
      settore:           isAdmin ? null : u.settore,
      ufficio:           isAdmin ? null : u.ufficio,
      ruolo_cod:         normalizeRuoloCod(u.ruolo_cod),
      area_cod:          isAdmin ? null : (u.area_cod ?? codeOf(AREE, u.area)),
      settore_cod:       isAdmin ? null : (u.settore_cod ?? codeOf(SETTORI, u.settore)),
      gruppo:            isAdmin ? '' : u.gruppo,
      gruppo_precedente: '',
    })
    setAssignmentSourceObjectId(u.objectid)
    setSelectedAgolUsername(u.username)
    setHomonymPromptOpen(false); setHomonymConfirmedKey(''); setHomonymReuseId(null); setPendingBirthDates({}); setUserValidationAttempted(false)
    setEditing(true)
  }

  const onEdit = (u: UtenteRecord) => {
    setSelectedObjectId(u.objectid)
    const isAdmin = normalizeRuoloCod(u.ruolo_cod) === 'ADMIN'
    setForm({
      objectid:          u.objectid,
      existingObjectId:  null,
      username:          u.username,
      nome:              u.nome,
      cognome:           u.cognome,
      titolo:            u.titolo,
      email:             u.email,
      data_nascita:      u.data_nascita,
      full_name:         composeFullName(u.nome, u.cognome),
      area:              isAdmin ? null : u.area,
      settore:           isAdmin ? null : u.settore,
      ufficio:           isAdmin ? null : u.ufficio,
      ruolo_cod:         normalizeRuoloCod(u.ruolo_cod),
      area_cod:          isAdmin ? null    : (u.area_cod ?? codeOf(AREE, u.area)),
      settore_cod:       isAdmin ? null    : (u.settore_cod ?? codeOf(SETTORI, u.settore)),
      gruppo:            isAdmin ? ''   : u.gruppo,
      gruppo_precedente: isAdmin ? ''   : u.gruppo,  // salva il gruppo attuale → PA lo userà per la rimozione
    })
    setHomonymPromptOpen(false); setHomonymConfirmedKey(''); setHomonymReuseId(null); setPendingBirthDates({}); setUserValidationAttempted(false); setSelectedAgolUsername(''); setAssignmentSourceObjectId(null)
    setEditing(true)
  }

  const onChooseExistingUser = (value: string) => {
    const oid = Number(value) || 0
    setHomonymPromptOpen(false); setHomonymConfirmedKey(''); setHomonymReuseId(null); setPendingBirthDates({})
    if (!oid) { setForm(f => ({ ...emptyForm(), username: f.username, area: f.area, settore: f.settore, ufficio: f.ufficio, ruolo_cod: f.ruolo_cod, area_cod: f.area_cod, settore_cod: f.settore_cod, gruppo: f.gruppo, gruppo_precedente: f.gruppo_precedente })); return }
    const r = people.find(x => x.objectid === oid)
    if (!r) return
    setForm(f => ({ ...f, existingObjectId: r.objectid, nome: r.nome, cognome: r.cognome, titolo: r.titolo, full_name: r.full_name, email: r.email || f.email, data_nascita: r.data_nascita }))
  }

  const userTargetId = form.objectid ?? form.existingObjectId ?? null
  const userNameKey = personNameKey(form.nome, form.cognome)
  const userHomonyms = userNameKey ? people.filter(r => r.objectid !== userTargetId && personNameKey(r.nome, r.cognome) === userNameKey) : []
  const creatingUserHomonym = assignmentSourceObjectId == null && form.objectid == null && form.existingObjectId == null && userHomonyms.length > 0
  const userHomonymConfirmed = creatingUserHomonym && homonymConfirmedKey === userNameKey
  useEffect(() => {
    if (homonymConfirmedKey && userNameKey !== homonymConfirmedKey) {
      setHomonymConfirmedKey('')
      setHomonymReuseId(null)
      setPendingBirthDates({})
    }
  }, [userNameKey, homonymConfirmedKey])
  const showUserBirthDate = !!form.data_nascita || (userHomonyms.length > 0 && form.existingObjectId == null && (form.objectid != null || userHomonymConfirmed))
  const userManagedMissingBirth = userHomonymConfirmed ? userHomonyms.filter(r => !r.data_nascita) : []
  const selectedHomonymRecord = homonymReuseId != null ? userHomonyms.find(r => r.objectid === homonymReuseId) : null
  const selectedHomonymAssociable = !!selectedHomonymRecord && !rubricaClean(selectedHomonymRecord.username)
  const promptUserHomonym = () => {
    if (!creatingUserHomonym || userHomonymConfirmed) return
    setHomonymReuseId(prev => userHomonyms.some(r => r.objectid === prev) ? prev : (userHomonyms[0]?.objectid ?? null))
    setHomonymPromptOpen(true)
  }

  const onCheckAgolSync = async () => {
    if (!form.objectid || !form.username.trim()) return
    setAgolSyncLoading(true)
    try {
      const token = await getAGOLToken(props.config?.clientSecret ?? '')
      const member = await fetchAgolUserProfile(form.username, token)
      const agolNome = normalizePersonPart(member.firstName)
      const agolCognome = normalizePersonPart(member.lastName)
      const agolEmail = String(member.email || '').trim().toLowerCase()
      const changes: Array<{ field: string; current: string; agol: string }> = []
      if (normalizePersonPart(form.nome) !== agolNome) changes.push({ field: 'Nome', current: normalizePersonPart(form.nome), agol: agolNome })
      if (normalizePersonPart(form.cognome) !== agolCognome) changes.push({ field: 'Cognome', current: normalizePersonPart(form.cognome), agol: agolCognome })
      if (String(form.email || '').trim().toLowerCase() !== agolEmail) changes.push({ field: 'E-mail', current: String(form.email || '').trim(), agol: member.email || '' })
      if (changes.length === 0) {
        setNoticePopup('I dati dell’utente coincidono già con quelli presenti in AGOL. Non è necessario alcun aggiornamento.')
      } else {
        setAgolSyncPreview({ member, changes })
      }
    } catch (e: any) {
      showMsg('Impossibile verificare i dati AGOL: ' + (e?.message ?? e), false)
    } finally {
      setAgolSyncLoading(false)
    }
  }

  const confirmAgolSync = async () => {
    const preview = agolSyncPreview
    if (!preview || !form.username.trim()) return
    setAgolSyncPreview(null)
    setAgolSyncLoading(true)
    try {
      await updateAgolIdentityForUsername(serviceUrl, form.username, preview.member)
      const nome = normalizePersonPart(preview.member.firstName)
      const cognome = normalizePersonPart(preview.member.lastName)
      const email = String(preview.member.email || '').trim().toLowerCase()
      setForm(f => ({ ...f, nome, cognome, email, full_name: composeFullName(nome, cognome) || preview.member.fullName }))
      await load()
      showMsg('Dati account AGOL sincronizzati.', true)
    } catch (e: any) {
      showMsg('Impossibile sincronizzare i dati AGOL: ' + (e?.message ?? e), false)
    } finally {
      setAgolSyncLoading(false)
    }
  }

  const onCancel = () => { setSelectedAgolUsername(''); setAssignmentSourceObjectId(null); setForm(emptyForm()); setHomonymPromptOpen(false); setHomonymConfirmedKey(''); setHomonymReuseId(null); setPendingBirthDates({}); setUserValidationAttempted(false); setEditing(false) }

  const onSave = async () => {
    setUserValidationAttempted(true)
    if (!form.username.trim())       { showMsg('Username AGOL obbligatorio', false); return }
    if (!normalizePersonPart(form.nome))    { showMsg('Nome obbligatorio', false); return }
    if (!normalizePersonPart(form.cognome)) { showMsg('Cognome obbligatorio', false); return }
    if (!normalizeRuoloCod(form.ruolo_cod)) { showMsg('Ruolo obbligatorio', false); return }
    const normalizedEmail = String(form.email || '').trim().toLowerCase()
    const isIa = normalizeRuoloCod(form.ruolo_cod) === 'IA' && form.area === 1
    if (isIa && !normalizedEmail) { showMsg('Per l’Istruttore amministrativo è necessario indicare l’indirizzo e-mail.', false); return }
    if (normalizedEmail && !rubricaEmailValida(normalizedEmail)) { showMsg('Inserire un indirizzo e-mail valido per il destinatario.', false); return }
    // ADMIN: non richiede area/settore/ufficio e non gestisce gruppi (ha privilegi nativi AGOL).
    if (normalizeRuoloCod(form.ruolo_cod) !== 'ADMIN') {
      if (!form.area)             { showMsg('Area obbligatoria', false); return }
      const settoriPrevisti = getSettoriPerRuoloArea(form.ruolo_cod, form.area)
      if (settoriPrevisti.length > 0 && !form.settore) { showMsg('Settore obbligatorio', false); return }
      if (!form.ufficio)          { showMsg('Ufficio obbligatorio', false); return }
    }
    const duplicateAssignment = utenti.find(u =>
      u.objectid !== form.objectid &&
      u.objectid !== assignmentSourceObjectId &&
      sameAssignment(u, form)
    )
    // In modalità Nuova assegnazione il record sorgente va incluso nel controllo:
    // se non è stata modificata alcuna funzione, la copia è identica e va bloccata.
    const sourceAssignment = assignmentSourceObjectId != null ? utenti.find(u => u.objectid === assignmentSourceObjectId) : null
    if (duplicateAssignment || (sourceAssignment && sameAssignment(sourceAssignment, form))) {
      showMsg('Assegnazione già presente. L’utente risulta già registrato con la medesima funzione e il medesimo ambito organizzativo.', false)
      return
    }

    // I ruoli apicali (CS, RIT, RIA, DT, DA) sono responsabilità esclusive
    // nel rispettivo ambito. Il controllo è live sul layer e precede qualsiasi
    // side effect sui gruppi AGOL, così un tentativo non valido non modifica
    // né GII_utenti né le appartenenze ai gruppi.
    try {
      const exclusiveConflict = await findExclusiveRoleConflict(serviceUrl, form, form.objectid)
      if (exclusiveConflict) {
        showMsg(exclusiveRoleConflictMessage(exclusiveConflict), false)
        return
      }
    } catch (e: any) {
      showMsg("Impossibile verificare l'esclusività del ruolo apicale: " + (e?.message ?? e), false)
      return
    }

    const targetId = form.objectid ?? form.existingObjectId ?? null
    const nameKey = personNameKey(form.nome, form.cognome)
    const homonyms = nameKey ? people.filter(r => r.objectid !== targetId && personNameKey(r.nome, r.cognome) === nameKey) : []
    const currentPerson = form.objectid != null ? people.find(r => r.objectid === form.objectid) : null
    const originalKey = currentPerson ? personNameKey(currentPerson.nome, currentPerson.cognome) : ''
    const creatingHomonym = assignmentSourceObjectId == null && form.objectid == null && form.existingObjectId == null && homonyms.length > 0
    const editingIntoHomonym = form.objectid != null && homonyms.length > 0 && originalKey !== nameKey
    const homonymOperation = creatingHomonym || editingIntoHomonym
    if (creatingHomonym && homonymConfirmedKey !== nameKey) {
      const reusePool = homonyms
      setHomonymReuseId(prev => reusePool.some(r => r.objectid === prev) ? prev : (reusePool[0]?.objectid ?? null))
      setHomonymPromptOpen(true)
      return
    }
    const managedMissingBirth = homonymOperation ? homonyms.filter(r => !r.data_nascita) : []
    if (homonymOperation && (!form.data_nascita || managedMissingBirth.some(r => !pendingBirthDates[r.objectid]))) {
      showMsg('Per distinguere correttamente gli omonimi, è necessario indicare la data di nascita di tutti i nominativi.', false)
      return
    }
    if (homonymOperation && !birthDateSupported) { showMsg('La gestione degli omonimi richiede il campo data di nascita, non disponibile nella configurazione corrente. Contattare l’amministratore.', false); return }
    const datesToCheck = [form.data_nascita, ...homonyms.map(r => r.data_nascita).filter(Boolean), ...managedMissingBirth.map(r => pendingBirthDates[r.objectid]).filter(Boolean)].filter(Boolean)
    if (new Set(datesToCheck).size !== datesToCheck.length) { showMsg('Le date di nascita indicate coincidono. Verificare i nominativi omonimi e inserire date diverse.', false); return }
    setSaving(true)
    try {
      if (managedMissingBirth.length > 0) {
        const values: Record<number, string> = {}
        managedMissingBirth.forEach(r => { values[r.objectid] = pendingBirthDates[r.objectid] })
        await updatePersonBirthDates(serviceUrl, values)
      }
      // Sanitize: ADMIN è trasversale (mai area/settore/ufficio/gruppo)
      const normalizedNome = normalizePersonPart(form.nome)
      const normalizedCognome = normalizePersonPart(form.cognome)
      const computedFullName = composeFullName(normalizedNome, normalizedCognome)
      const normalizedEmail = String(form.email || '').trim().toLowerCase()
      const formSan = normalizeRuoloCod(form.ruolo_cod) === 'ADMIN'
        ? { ...form, username: form.username.trim(), nome: normalizedNome, cognome: normalizedCognome, email: normalizedEmail, full_name: computedFullName, area: null, settore: null, ufficio: null, ruolo_cod: 'ADMIN', area_cod: null, settore_cod: null, gruppo: '', gruppo_precedente: '' }
        : { ...form, username: form.username.trim(), nome: normalizedNome, cognome: normalizedCognome, email: normalizedEmail, full_name: computedFullName }

      const token = await getAGOLToken(props.config?.clientSecret ?? '')
      const isUpdate = formSan.objectid != null

      // Gestione gruppi: solo se esiste un gruppo target (per ADMIN è sempre vuoto).
      // In modifica riallinea sempre il gruppo target: se l'utente risulta già membro,
      // addUsers viene trattato come operazione idempotente; se non è membro, viene aggiunto.
      if (isUpdate) {
        if (formSan.gruppo_precedente && formSan.gruppo_precedente !== formSan.gruppo) {
          const stillRequired = await otherAssignmentRequiresGroup(serviceUrl, formSan.username, formSan.gruppo_precedente, formSan.objectid)
          if (!stillRequired) await removeUserFromGroup(formSan.username, formSan.gruppo_precedente, token)
        }
        if (formSan.gruppo) await addUserToGroup(formSan.username, formSan.gruppo, token)
      } else {
        // Nuovo utente o nuova assegnazione. Se il medesimo gruppo è già richiesto
        // da un'altra assegnazione dello stesso username, l'appartenenza AGOL esiste
        // già e non viene ripetuta. Un gruppo diverso viene invece assegnato come al
        // primo inserimento.
        if (formSan.gruppo) {
          const alreadyRequired = await otherAssignmentRequiresGroup(serviceUrl, formSan.username, formSan.gruppo)
          if (!alreadyRequired) await addUserToGroup(formSan.username, formSan.gruppo, token)
        }
      }

      await saveUtente(formSan, serviceUrl)
      // Il riallineamento AGOL resta una modifica in sospeso finché l'utente non
      // conferma il normale salvataggio del form. Solo a questo punto i dati
      // identificativi vengono propagati a tutte le assegnazioni dello username.
      showMsg(formSan.objectid ? 'Utente aggiornato' : (assignmentSourceObjectId != null ? 'Nuova assegnazione aggiunta' : 'Utente aggiunto'), true)
      setSelectedAgolUsername(''); setAssignmentSourceObjectId(null); setEditing(false); setUserValidationAttempted(false); setForm(emptyForm()); await load()
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
      if (u.gruppo) {
        const stillRequired = await otherAssignmentRequiresGroup(serviceUrl, u.username, u.gruppo, u.objectid)
        if (!stillRequired) await removeUserFromGroup(u.username, u.gruppo, token)
      }
      await deleteUtente(u.objectid, token, serviceUrl)
      setSelectedObjectId(sel => sel === u.objectid ? null : sel)
      showMsg('Utente eliminato', true)
      await load()
    } catch (e: any) { showMsg('Errore: ' + (e?.message ?? e), false) }
    setSaving(false)
  }

  // ── Opzioni combo filtrate ────────────────────────────────────────────────
  const areeDisp    = form.ruolo_cod ? AREE.filter(a => getAreePerRuolo(form.ruolo_cod).includes(a.value)) : []
  const settoriDisp = form.ruolo_cod && form.area ? SETTORI.filter(s => getSettoriPerRuoloArea(form.ruolo_cod, form.area!).includes(s.value)) : []
  const ufficiDisp  = form.area && form.settore ? getUfficiPerAreaSettore(form.area, form.settore) : []

  const isAreaAuto     = areeDisp.length === 1
  const currentRole = normalizeRuoloCod(form.ruolo_cod)
  const isSettoreFisso = !!currentRole && (
    currentRole === 'DT' || currentRole === 'DA' || currentRole === 'ADMIN' ||
    (currentRole === 'RIT' || currentRole === 'RIA') ||
    (currentRole === 'IA' && form.area === 1)
  )
  const isUfficioFisso = !!currentRole && (
    (currentRole === 'RIT' || currentRole === 'RIA') || currentRole === 'DT' || currentRole === 'DA' ||
    (currentRole === 'IA' && form.area === 1)
  )

  const labelRuolo = (code: any) => labelForRuoloCod(code, domainLabels)
  const labelArea = (val: number | null | undefined) => labelForDomainItem(AREE, val, domainLabels, 'area_cod', 'area')
  const labelSettore = (val: number | null | undefined) => labelForDomainItem(SETTORI, val, domainLabels, 'settore_cod', 'settore')
  const labelUfficio = (val: number | null | undefined) => labelForUfficio(val, domainLabels)
  const isNewAgolRegistration = !!selectedAgolUsername && form.objectid == null
  const agolIdentityReadOnly = !!selectedAgolUsername || !!form.objectid || assignmentSourceObjectId != null

  const homonymPromptPortal = homonymPromptOpen && typeof document !== 'undefined'
    ? createPortal(
      <div className="ggu-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="ggu-user-homonym-title"
        onClick={(event) => { event.preventDefault(); event.stopPropagation() }} onMouseDown={(event) => { event.preventDefault(); event.stopPropagation() }}>
        <div className="ggu-modal" onClick={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()}>
          <div className="ggu-modal-head ggu-modal-head-info" id="ggu-user-homonym-title">Possibile nominativo già presente</div>
          <div className="ggu-modal-body ggu-homonym-choice">
            <div>{isNewAgolRegistration
              ? (userHomonyms.length > 1 ? 'Sono presenti più nominativi con lo stesso nome e cognome del membro AGOL selezionato.' : 'È già presente un nominativo con lo stesso nome e cognome del membro AGOL selezionato.')
              : (userHomonyms.length > 1 ? 'Sono già presenti più nominativi con lo stesso nome e cognome.' : 'È già presente un nominativo con lo stesso nome e cognome.')}</div>
            {isNewAgolRegistration && <div className="ggu-homonym-note">Verificare se si tratta della stessa persona. L'indirizzo e-mail è mostrato solo come informazione e non viene utilizzato per stabilire la corrispondenza.</div>}
            {userHomonyms.length > 1 && <select className="ggu-select" value={homonymReuseId || ''} onChange={e => setHomonymReuseId(Number(e.target.value) || null)}>
              {userHomonyms.map(r => <option key={r.objectid} value={r.objectid}>{`${directoryDisplayLabel(r, people)} — ${r.username ? `Utente: ${r.username}` : 'Rubrica'}${r.email ? ` — ${r.email}` : ''}`}</option>)}
            </select>}
            {selectedHomonymRecord && <div className="ggu-homonym-selected">
              <div><strong>{directoryDisplayName(selectedHomonymRecord)}</strong></div>
              {selectedHomonymRecord.data_nascita && <div>Data di nascita: {formatBirthDate(selectedHomonymRecord.data_nascita)}</div>}
              <div>{selectedHomonymRecord.username ? `Utente gestionale: ${selectedHomonymRecord.username}` : 'Nominativo presente in Rubrica'}</div>
              {selectedHomonymRecord.email && <div>E-mail: {selectedHomonymRecord.email}</div>}
              {isNewAgolRegistration && !selectedHomonymAssociable && <div className="ggu-homonym-warning">Questo nominativo è già associato a un altro account AGOL e non può essere riutilizzato.</div>}
            </div>}
          </div>
          <div className="ggu-modal-actions">
            {isNewAgolRegistration ? <>
              <button className="ggu-modal-cancel" onClick={() => { setHomonymPromptOpen(false); setHomonymConfirmedKey(''); setHomonymReuseId(null); setPendingBirthDates({}); setSelectedAgolUsername(''); setForm(emptyForm()); setEditing(false); setAgolMemberPickerOpen(true) }}>Torna ai membri AGOL</button>
              <button className="ggu-modal-close" disabled={!selectedHomonymAssociable} title={selectedHomonymAssociable ? 'Associa il membro AGOL al nominativo selezionato' : 'Il nominativo selezionato è già associato a un altro account AGOL'} onClick={() => { const oid = homonymReuseId || userHomonyms.find(r => !r.username)?.objectid; if (oid) onChooseExistingUser(String(oid)); setHomonymPromptOpen(false) }}>Associa al nominativo</button>
              <button className="ggu-modal-close" onClick={() => { setHomonymConfirmedKey(userNameKey); setHomonymReuseId(null); setHomonymPromptOpen(false) }}>Crea nuovo nominativo</button>
            </> : <>
              <button className="ggu-modal-cancel" onClick={() => setHomonymPromptOpen(false)}>Correggi dati</button>
              <button className="ggu-modal-close" onClick={() => { setHomonymConfirmedKey(userNameKey); setHomonymReuseId(null); setHomonymPromptOpen(false) }}>Registra omonimo</button>
            </>}
          </div>
        </div>
      </div>,
      getGlobalOverlayHost() || document.body
    )
    : null

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

  const editLockPortal = editing && !errorPopup && !deleteConfirm && !agolSyncPreview && editLockRects.length > 0 && typeof document !== 'undefined'
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

  const agolMemberPickerPortal = agolMemberPickerOpen && typeof document !== 'undefined'
    ? createPortal(
      <div className="ggu-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="ggu-agol-picker-title" onClick={(event) => { event.preventDefault(); event.stopPropagation() }}>
        <div className="ggu-modal ggu-agol-modal" onClick={(event) => event.stopPropagation()}>
          <div className="ggu-modal-head ggu-modal-head-info" id="ggu-agol-picker-title">Seleziona membro AGOL</div>
          <div className="ggu-modal-body">
            <input className="ggu-input ggu-agol-search" value={agolMemberSearch} onChange={e => setAgolMemberSearch(e.target.value)} placeholder="Cerca per nome, cognome, username o e-mail" autoFocus />
            {!agolMembersLoading && <div className="ggu-agol-count">{agolMembers.length} membri AGOL · {registeredAgolCount} già registrati · {availableAgolCount} disponibili</div>}
            <div className="ggu-agol-list">
              <div className="ggu-agol-row ggu-agol-row-head">
                <div className="ggu-agol-sortable" onClick={() => toggleAgolSort('fullName')} title="Clic: aggiungi/inverti/rimuovi ordinamento">Nome{agolSortBadge('fullName')}</div>
                <div className="ggu-agol-sortable" onClick={() => toggleAgolSort('username')} title="Clic: aggiungi/inverti/rimuovi ordinamento">Username{agolSortBadge('username')}</div>
                <div className="ggu-agol-sortable" onClick={() => toggleAgolSort('email')} title="Clic: aggiungi/inverti/rimuovi ordinamento">E-mail{agolSortBadge('email')}</div>
                <div></div>
              </div>
              {agolMembersLoading && <div className="ggu-agol-loading">Caricamento membri...</div>}
              {!agolMembersLoading && visibleAgolMembers.length === 0 && <div className="ggu-agol-empty">Nessun membro corrispondente.</div>}
              {!agolMembersLoading && visibleAgolMembers.map(member => {
                const alreadyRegistered = registeredAgolUsernames.has(member.username.toLowerCase())
                const notSelectable = member.disabled || alreadyRegistered
                return (
                  <div className={`ggu-agol-row ${notSelectable ? 'ggu-agol-member-disabled' : ''}`} key={member.username}>
                    <div className="ggu-agol-cell" title={member.fullName || composeFullName(member.firstName, member.lastName)}>{member.fullName || composeFullName(member.firstName, member.lastName) || '—'}</div>
                    <div className="ggu-agol-cell" title={member.username}>{member.username}</div>
                    <div className="ggu-agol-cell" title={member.email}>{member.email || '—'}</div>
                    <button className="ggu-btn ggu-btn-save ggu-agol-select" disabled={notSelectable} onClick={() => chooseAgolMember(member)}>{alreadyRegistered ? 'Già registrato' : (member.disabled ? 'Disabilitato' : 'Seleziona')}</button>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="ggu-modal-actions"><button className="ggu-modal-cancel" onClick={() => setAgolMemberPickerOpen(false)}>Annulla</button></div>
        </div>
      </div>,
      document.body
    )
    : null

  const agolSyncPreviewPortal = agolSyncPreview && typeof document !== 'undefined'
    ? createPortal(
      <div className="ggu-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="ggu-agol-sync-title"
        onClick={(event) => { event.preventDefault(); event.stopPropagation() }} onMouseDown={(event) => { event.preventDefault(); event.stopPropagation() }}>
        <div className="ggu-modal" onClick={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()}>
          <div className="ggu-modal-head ggu-modal-head-info" id="ggu-agol-sync-title">Sincronizza da AGOL</div>
          <div className="ggu-modal-body">
            <div style={{ marginBottom: 10 }}>Sono state rilevate differenze nei dati identificativi. Aggiornare tutte le assegnazioni dello stesso account?</div>
            <table className="ggu-sync-table">
              <thead><tr><th>Campo</th><th>Gestionale</th><th>AGOL</th></tr></thead>
              <tbody>{agolSyncPreview.changes.map(c => <tr key={c.field}><td>{c.field}</td><td>{c.current || '—'}</td><td>{c.agol || '—'}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="ggu-modal-actions">
            <button className="ggu-modal-cancel" onClick={() => setAgolSyncPreview(null)}>Annulla</button>
            <button className="ggu-btn ggu-btn-save" onClick={confirmAgolSync}>Sincronizza</button>
          </div>
        </div>
      </div>,
      document.body
    )
    : null

  const noticePopupPortal = noticePopup && typeof document !== 'undefined'
    ? createPortal(
      <div className="ggu-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="ggu-notice-title"
        onClick={(event) => { event.preventDefault(); event.stopPropagation() }} onMouseDown={(event) => { event.preventDefault(); event.stopPropagation() }}>
        <div className="ggu-modal" onClick={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()}>
          <div className="ggu-modal-head ggu-modal-head-info" id="ggu-notice-title">Dati già aggiornati</div>
          <div className="ggu-modal-body">{noticePopup}</div>
          <div className="ggu-modal-actions"><button className="ggu-modal-close" onClick={() => setNoticePopup(null)}>Ho capito</button></div>
        </div>
      </div>,
      document.body
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
          <div className="ggu-modal-body">{`Rimuovere il profilo utente "${deleteConfirm.username}" dal gestionale?\n\nIl nominativo resterà disponibile se è utilizzato anche come destinatario e-mail o firmatario.`}</div>
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
      {homonymPromptPortal}
      {errorPopupPortal}
      {deleteConfirmPortal}
      {agolMemberPickerPortal}
      {agolSyncPreviewPortal}
      {noticePopupPortal}
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
          <Fragment>
            <div className="ggu-toolbar">
              <div className="ggu-toolbar-left">
                <NewRecordButton onClick={onNew} title='Nuovo utente' />
                <button type='button' onClick={() => exportCSV(sortedUtenti, domainLabels)} disabled={sortedUtenti.length === 0} title='Esporta utenti.csv' aria-label='Esporta utenti.csv' style={transferActionButtonStyle(sortedUtenti.length === 0)}><TransferActionIcon name='export' /></button>
              </div>
              <div className="ggu-toolbar-right">
                <button
                  type="button"
                  className={`ggu-filter-toolbar-btn${filtersOpen ? ' ggu-filter-toolbar-btn-open' : ''}${filtersActive ? ' ggu-filter-toolbar-btn-active' : ''}`}
                  onClick={() => setFiltersOpen(v => !v)}
                  title={filtersOpen ? 'Chiudi filtri' : 'Apri filtri'}
                  aria-label={filtersOpen ? 'Chiudi filtri' : 'Apri filtri'}
                  aria-expanded={filtersOpen}
                >
                  <span>Filtri</span>
                  <span
                    aria-hidden="true"
                    style={{
                      display: 'inline-block',
                      transformOrigin: '50% 50%',
                      transform: filtersOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.18s ease'
                    }}
                  >▾</span>
                </button>
                <button className="ggu-btn ggu-btn-reset-sort" onClick={resetSort}
                  disabled={sortRules.length === 0} title="Reset ordinamento" aria-label="Reset ordinamento">↺</button>
              </div>
            </div>

            {filtersOpen && (
              <div className="ggu-filter-panel">
                <div className="ggu-filter-grid">
                  <div className="ggu-filter-field ggu-filter-search">
                    <div className="ggu-label">Cerca utente</div>
                    <input className="ggu-input" value={filterSearch} placeholder="Nome, username o e-mail" onChange={e => setFilterSearch(e.target.value)} />
                  </div>
                  <div className="ggu-filter-field">
                    <div className="ggu-label">Ruolo</div>
                    <div className="ggu-filter-select-wrap">
                      <select className="ggu-select" value={filterRole} onChange={e => { setFilterRole(e.target.value); setFilterArea(''); setFilterSettore(''); setFilterUfficio(''); setFilterGruppo('') }}>
                        <option value="">Tutti</option>
                        {roleFilterOptions.map(r => <option key={r.code} value={r.code}>{labelRuolo(r.code)}</option>)}
                      </select>
                      <span className="ggu-filter-select-chevron">▾</span>
                    </div>
                  </div>
                  <div className="ggu-filter-field">
                    <div className="ggu-label">Area</div>
                    <div className="ggu-filter-select-wrap">
                      <select className="ggu-select" value={filterArea} onChange={e => { setFilterArea(e.target.value); setFilterSettore(''); setFilterUfficio(''); setFilterGruppo('') }}>
                        <option value="">Tutte</option>
                        {areaFilterOptions.map(a => <option key={a.value} value={a.value}>{labelArea(a.value)}</option>)}
                      </select>
                      <span className="ggu-filter-select-chevron">▾</span>
                    </div>
                  </div>
                  <div className="ggu-filter-field">
                    <div className="ggu-label">Settore</div>
                    <div className="ggu-filter-select-wrap">
                      <select className="ggu-select" value={filterSettore} onChange={e => { setFilterSettore(e.target.value); setFilterUfficio(''); setFilterGruppo('') }}>
                        <option value="">Tutti</option>
                        {settoreFilterOptions.map(item => <option key={item.value} value={item.value}>{labelSettore(item.value)}</option>)}
                      </select>
                      <span className="ggu-filter-select-chevron">▾</span>
                    </div>
                  </div>
                  <div className="ggu-filter-field">
                    <div className="ggu-label">Ufficio</div>
                    <div className="ggu-filter-select-wrap">
                      <select className="ggu-select" value={filterUfficio} onChange={e => { setFilterUfficio(e.target.value); setFilterGruppo('') }}>
                        <option value="">Tutti</option>
                        {ufficioFilterOptions.map(item => <option key={item.value} value={item.value}>{labelUfficio(item.value)}</option>)}
                      </select>
                      <span className="ggu-filter-select-chevron">▾</span>
                    </div>
                  </div>
                  <div className="ggu-filter-field ggu-filter-group">
                    <div className="ggu-label">Gruppo</div>
                    <div className="ggu-filter-select-wrap">
                      <select className="ggu-select" value={filterGruppo} onChange={e => setFilterGruppo(e.target.value)}>
                        <option value="">Tutti</option>
                        {gruppoFilterOptions.map(group => <option key={group} value={group}>{group}</option>)}
                      </select>
                      <span className="ggu-filter-select-chevron">▾</span>
                    </div>
                  </div>
                  <div className="ggu-filter-actions">
                    <button className="ggu-filter-action-btn" onClick={resetFilters} disabled={!filtersActive}>Azzera filtri</button>
                  </div>
                </div>
                <div className="ggu-filter-count">{`${sortedUtenti.length} assegnazioni mostrate su ${utenti.length}`}</div>
              </div>
            )}
          </Fragment>
        )}

        {editing && (
          <div className="ggu-form ggu-form-users">
            <div className="ggu-user-section ggu-agol-account-row">
              <div className="ggu-user-section-title">Dati account AGOL</div>
              <div className="ggu-field ggu-user-username">
                <div className="ggu-label">Username AGOL</div>
                <input className="ggu-input" value={form.username} disabled={agolIdentityReadOnly}
                  title="Username del membro selezionato in ArcGIS Online"
                  onChange={e => setForm(f => ({ ...f, username: e.target.value.trim() }))} />
              </div>
              <div className="ggu-field ggu-user-name">
                <div className="ggu-label">Nome</div>
                <input className="ggu-input" value={form.nome} disabled={agolIdentityReadOnly}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} onBlur={promptUserHomonym} />
              </div>
              <div className="ggu-field ggu-user-surname">
                <div className="ggu-label">Cognome</div>
                <input className="ggu-input" value={form.cognome} disabled={agolIdentityReadOnly}
                  onChange={e => setForm(f => ({ ...f, cognome: e.target.value }))} onBlur={promptUserHomonym} />
              </div>
              <div className="ggu-field ggu-user-email">
                <div className="ggu-label">E-mail</div>
                <input className="ggu-input" type="email" value={form.email} disabled={agolIdentityReadOnly}
                  placeholder="nome.cognome@dominio.it"
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="ggu-agol-account-actions">
                {form.objectid != null && <button className="ggu-btn ggu-btn-outline" onClick={onCheckAgolSync} disabled={saving || agolSyncLoading}>{agolSyncLoading ? 'Sincronizzo...' : 'Sincronizza'}</button>}
              </div>
            </div>

            <div className="ggu-user-section ggu-management-section">
              <div className="ggu-user-section-title">Assegnazione gestionale</div>
              {showUserBirthDate && <div className="ggu-user-birth-slot">
                <div className="ggu-field ggu-birth-field">
                  <div className="ggu-label">Data di nascita{userHomonyms.length > 0 ? ' *' : ''}</div>
                  <input className={`ggu-input${userValidationAttempted && userHomonyms.length > 0 && !form.data_nascita ? ' ggu-required-missing' : ''}`} type="date" value={form.data_nascita} onChange={e => setForm(f => ({ ...f, data_nascita: e.target.value }))} />
                </div>
              </div>}
              {userManagedMissingBirth.length > 0 && <div className="ggu-homonym-dates">
                <div className="ggu-homonym-dates-title">Completare anche la data di nascita {userManagedMissingBirth.length > 1 ? 'dei nominativi già presenti' : 'del nominativo già presente'}.</div>
                {userManagedMissingBirth.map((r, i) => <div className="ggu-field ggu-birth-field" key={r.objectid}><div className="ggu-label">{directoryDisplayName(r)}{userManagedMissingBirth.length > 1 ? ` (${i + 1})` : ''} *</div><input className={`ggu-input${userValidationAttempted && !pendingBirthDates[r.objectid] ? ' ggu-required-missing' : ''}`} type="date" value={pendingBirthDates[r.objectid] || ''} onChange={e => setPendingBirthDates(v => ({ ...v, [r.objectid]: e.target.value }))} /></div>)}
              </div>}
              <div className="ggu-field ggu-user-role">
                <div className="ggu-label">Ruolo *</div>
                <select className={`ggu-select${userValidationAttempted && !form.ruolo_cod ? ' ggu-required-missing' : ''}`} value={form.ruolo_cod ?? ''}
                  onChange={e => onRuoloChange(e.target.value || null)}>
                  <option value="">— seleziona —</option>
                  {RUOLI.map(r => <option key={r.code} value={r.code}>{optionLabelForRuolo(r, domainLabels)}</option>)}
                </select>
              </div>
              <div className="ggu-field ggu-user-area">
                <div className="ggu-label">Area{currentRole && currentRole !== 'ADMIN' && !isAreaAuto ? ' *' : ''}</div>
                {currentRole === 'ADMIN'
                  ? <input className="ggu-input" disabled value="—" />
                  : <select className={`ggu-select${userValidationAttempted && currentRole != null && !isAreaAuto && !form.area ? ' ggu-required-missing' : ''}`} value={form.area ?? ''}
                      disabled={!currentRole || isAreaAuto}
                      onChange={e => onAreaChange(e.target.value ? Number(e.target.value) : null)}>
                      <option value="">— seleziona —</option>
                      {areeDisp.map(a => <option key={a.value} value={a.value}>{optionLabelForDomainItem(a, domainLabels, 'area_cod', 'area')}</option>)}
                    </select>
                }
              </div>
              <div className="ggu-field ggu-user-sector">
                <div className="ggu-label">Settore{currentRole && form.area && getSettoriPerRuoloArea(currentRole, form.area).length > 0 && !isSettoreFisso ? ' *' : ''}</div>
                {isSettoreFisso
                  ? <input className="ggu-input" disabled value={dash(labelSettore(form.settore))} />
                  : <select className={`ggu-select${userValidationAttempted && currentRole != null && form.area != null && settoriDisp.length > 0 && !isSettoreFisso && !form.settore ? ' ggu-required-missing' : ''}`} value={form.settore ?? ''}
                      disabled={!form.area || settoriDisp.length === 0}
                      onChange={e => onSettoreChange(e.target.value ? Number(e.target.value) : null)}>
                      <option value="">— seleziona —</option>
                      {settoriDisp.map(s => <option key={s.value} value={s.value}>{optionLabelForDomainItem(s, domainLabels, 'settore_cod', 'settore')}</option>)}
                    </select>
                }
              </div>
              <div className="ggu-field ggu-user-office">
                <div className="ggu-label">Ufficio{currentRole && currentRole !== 'ADMIN' && !isUfficioFisso ? ' *' : ''}</div>
                {currentRole === 'ADMIN'
                  ? <input className="ggu-input" disabled value="—" />
                  : (isUfficioFisso
                    ? <input className="ggu-input" disabled value={labelUfficio(form.ufficio) || 'Cagliari'} />
                    : <select className={`ggu-select${userValidationAttempted && currentRole != null && !isUfficioFisso && !form.ufficio ? ' ggu-required-missing' : ''}`} value={form.ufficio ?? ''}
                        disabled={!form.settore || ufficiDisp.length === 0}
                        onChange={e => onUfficioChange(e.target.value ? Number(e.target.value) : null)}>
                        <option value="">— seleziona —</option>
                        {ufficiDisp.map(u => <option key={u.value} value={u.value}>{labelUfficio(u.value) || u.label}</option>)}
                      </select>
                  )
                }
              </div>
              <div className="ggu-field ggu-user-group">
                <div className="ggu-label">Gruppo</div>
                <input className="ggu-input" disabled value={form.gruppo} />
              </div>
              <div className="ggu-btns">
                <button className="ggu-btn ggu-btn-save" onClick={onSave}
                  disabled={saving || agolSyncLoading || (form.objectid != null && !hasEffectiveEditChanges)}
                  title={form.objectid != null && !hasEffectiveEditChanges ? 'Nessuna modifica da salvare' : undefined}>
                  {saving ? 'Salvataggio...' : form.objectid ? 'Aggiorna' : 'Salva'}
                </button>
                <button className="ggu-btn ggu-btn-cancel" onClick={onCancel} disabled={saving || agolSyncLoading}>Annulla</button>
              </div>
              <div className="ggu-required-note">* campo obbligatorio</div>
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
                      <th key={col.field} className={`ggu-sortable${['full_name', 'username', 'email'].includes(col.field) ? ' ggu-users-identity-col' : ''}${col.field === 'ruolo_cod' ? ' ggu-users-role-col' : ''}`} onClick={() => toggleSort(col.field)}
                        title="Clic: aggiungi/inverti/rimuovi ordinamento">
                        {col.label}{sortBadge(col.field)}
                      </th>
                    ))}
                    <th className="ggu-actions-col ggu-actions-head">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedUtenti.length === 0 && (
                    <tr><td colSpan={9} className="ggu-empty">{utenti.length === 0 ? 'Nessun utente presente' : 'Nessuna assegnazione corrisponde ai filtri impostati'}</td></tr>
                  )}
                  {sortedUtenti.map(u => (
                    <tr key={u.objectid}
                      className={selectedObjectId === u.objectid || form.objectid === u.objectid ? 'ggu-sel' : ''}
                      onClick={() => setSelectedObjectId(u.objectid)}
                      onDoubleClick={() => onEdit(u)}>
                      <td className="ggu-users-identity-col">{directoryDisplayLabel(({...u, uso_email:'', firmatario:0, tipo_record:'UTENTE'} as any), people)}</td>
                      <td className="ggu-users-identity-col">{u.username}</td>
                      <td className="ggu-users-identity-col">{u.email || '—'}</td>
                      <td className="ggu-users-role-col">{dash(labelRuolo(u.ruolo_cod))}</td>
                      <td>{dash(labelArea(u.area))}</td>
                      <td>{dash(labelSettore(u.settore))}</td>
                      <td>{dash(labelUfficio(u.ufficio))}</td>
                      <td><span className="ggu-gruppo">{dash(u.gruppo)}</span></td>
                      <td className="ggu-actions-col">
                        <RecordDuplicateButton onClick={(e) => { e.stopPropagation(); onDuplicateAssignment(u) }} title='Nuova assegnazione' ariaLabel='Nuova assegnazione' />
                        <RecordEditButton onClick={(e) => { e.stopPropagation(); onEdit(u) }} title='Modifica utente' ariaLabel='Modifica utente' />
                        <RecordDeleteButton onClick={(e) => { e.stopPropagation(); onDelete(u) }} title='Elimina utente' ariaLabel='Elimina utente' />
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


export default function Widget(props: AllWidgetProps<IMConfig>) {
  useEffect(() => {
    // Il cambio account dell'Header porta prima a una pagina neutra, così i widget
    // della pagina corrente possono rilasciare le risorse ArcGIS ancora legate alla
    // sessione precedente. Il FeatureLayer di GII_utenti è una cache di modulo e
    // sopravviverebbe allo smontaggio React se non venisse distrutto esplicitamente.
    return () => { disposeFL() }
  }, [])

  const mode = String((props.config as any)?.mode || 'utenti').trim().toLowerCase()
  return mode === 'rubrica' ? <RubricaWidget {...props} /> : <UtentiWidget {...props} />
}
