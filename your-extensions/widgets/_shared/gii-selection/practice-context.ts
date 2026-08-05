const GII_PRACTICE_CONTEXT_USERNAME_KEY = 'GII_PRACTICE_CONTEXT_USERNAME'
const GII_PRACTICE_CONTEXT_EPOCH_KEY = 'GII_PRACTICE_CONTEXT_EPOCH'
const GII_SELECTED_CONTEXT_USERNAME_KEY = 'GII_SELECTED_CONTEXT_USERNAME'
const GII_SELECTED_CONTEXT_EPOCH_KEY = 'GII_SELECTED_CONTEXT_EPOCH'

const PRACTICE_SESSION_KEYS = [
  'GII_SELECTED_OID',
  'GII_SELECTED_GLOBALID',
  'GII_SELECTED_REPORT_CODE',
  'GII_SELECTED_DS_ID',
  'GII_SELECTED_LAYER_URL',
  'GII_SELECTED_SERVICE_URL',
  'GII_SELECTED_IDFIELD',
  'GII_SELECTED_VIEW_NAME',
  'GII_SELECTED_DATA',
  GII_SELECTED_CONTEXT_USERNAME_KEY,
  GII_SELECTED_CONTEXT_EPOCH_KEY,
  'GII_EDIT_INTENT',
  'GII_OPEN_PRACTICE_INTENT',
  'GII_OPEN_PRACTICE_REQUESTED',
  'GII_RESTORE_SELECTION_AFTER_EDIT',
  'GII_AFTER_WORKFLOW_NAV'
] as const

export type GiiPracticeContextStamp = {
  practiceContextUsername: string
  practiceContextEpoch: number
}

function normalizeUsername (value: any): string {
  return String(value ?? '').trim().toLowerCase()
}

function normalizeEpoch (value: any): number {
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : 0
}

function readStoredEpoch (): number {
  if (typeof window === 'undefined') return 0
  try { return normalizeEpoch(window.sessionStorage.getItem(GII_PRACTICE_CONTEXT_EPOCH_KEY)) } catch { return 0 }
}

function writePracticeContextOwner (username: string, epoch: number): void {
  if (typeof window === 'undefined') return
  try { window.sessionStorage.setItem(GII_PRACTICE_CONTEXT_USERNAME_KEY, normalizeUsername(username)) } catch {}
  try { window.sessionStorage.setItem(GII_PRACTICE_CONTEXT_EPOCH_KEY, String(Math.max(1, normalizeEpoch(epoch) || 1))) } catch {}
}

export function getGiiPracticeContextStamp (): GiiPracticeContextStamp {
  if (typeof window === 'undefined') return { practiceContextUsername: '', practiceContextEpoch: 0 }
  let username = ''
  let epoch = 0
  try { username = normalizeUsername(window.sessionStorage.getItem(GII_PRACTICE_CONTEXT_USERNAME_KEY)) } catch {}
  epoch = readStoredEpoch()
  return { practiceContextUsername: username, practiceContextEpoch: epoch }
}

export function stampGiiPracticePayload<T extends Record<string, any>> (
  payload: T,
  originStamp?: GiiPracticeContextStamp | null
): T & GiiPracticeContextStamp {
  const candidate = originStamp || payload as any
  const candidateUsername = normalizeUsername((candidate as any)?.practiceContextUsername)
  const candidateEpoch = normalizeEpoch((candidate as any)?.practiceContextEpoch)
  const stamp = candidateUsername && candidateEpoch
    ? { practiceContextUsername: candidateUsername, practiceContextEpoch: candidateEpoch }
    : getGiiPracticeContextStamp()
  return { ...payload, ...stamp }
}

export function isGiiPracticePayloadCurrent (payload: any): boolean {
  const current = getGiiPracticeContextStamp()
  if (!current.practiceContextUsername || !current.practiceContextEpoch) return false
  const username = normalizeUsername(payload?.practiceContextUsername)
  const epoch = normalizeEpoch(payload?.practiceContextEpoch)
  return !!username && !!epoch && username === current.practiceContextUsername && epoch === current.practiceContextEpoch
}

export function writeGiiPracticeSelectionContext (): GiiPracticeContextStamp {
  const stamp = getGiiPracticeContextStamp()
  if (typeof window === 'undefined') return stamp
  try { window.sessionStorage.setItem(GII_SELECTED_CONTEXT_USERNAME_KEY, stamp.practiceContextUsername) } catch {}
  try { window.sessionStorage.setItem(GII_SELECTED_CONTEXT_EPOCH_KEY, String(stamp.practiceContextEpoch || 0)) } catch {}
  return stamp
}


export function clearGiiPracticeSelectionContext (): void {
  if (typeof window === 'undefined') return
  try { window.sessionStorage.removeItem(GII_SELECTED_CONTEXT_USERNAME_KEY) } catch {}
  try { window.sessionStorage.removeItem(GII_SELECTED_CONTEXT_EPOCH_KEY) } catch {}
}

export function isGiiPracticeSelectionContextCurrent (): boolean {
  if (typeof window === 'undefined') return false
  const current = getGiiPracticeContextStamp()
  if (!current.practiceContextUsername || !current.practiceContextEpoch) return false
  let username = ''
  let epoch = 0
  try { username = normalizeUsername(window.sessionStorage.getItem(GII_SELECTED_CONTEXT_USERNAME_KEY)) } catch {}
  try { epoch = normalizeEpoch(window.sessionStorage.getItem(GII_SELECTED_CONTEXT_EPOCH_KEY)) } catch {}
  return username === current.practiceContextUsername && epoch === current.practiceContextEpoch
}

export function isGiiPracticeContextStampCurrent (stamp: GiiPracticeContextStamp | null | undefined): boolean {
  return isGiiPracticePayloadCurrent(stamp)
}

function clearWindowPracticeCaches (): void {
  if (typeof window === 'undefined') return
  const w: any = window as any
  for (const key of [
    '__giiEdit',
    '__giiSelection',
    '__giiSelectedFeatureCache',
    '__giiRuntimeDsProxyCache',
    '__giiEditSectionCounts',
    '__giiEditSectionBadgeDetails'
  ]) {
    try { delete w[key] } catch { try { w[key] = null } catch {} }
  }
}

function dispatchPracticeContextReset (previousUsername: string, currentUsername: string): void {
  if (typeof window === 'undefined') return
  const detail = {
    reason: 'account-change',
    previousUsername,
    currentUsername,
    ...getGiiPracticeContextStamp()
  }
  try { window.dispatchEvent(new CustomEvent('gii-selection-changed', { detail: null })) } catch {}
  try { window.dispatchEvent(new CustomEvent('gii-edit-intent-changed', { detail: null })) } catch {}
  try { window.dispatchEvent(new CustomEvent('gii-force-refresh-selection', { detail })) } catch {}
  try {
    window.dispatchEvent(new CustomEvent('gii:edit-section-counts', {
      detail: { counts: {}, badgeDetails: {}, ...getGiiPracticeContextStamp() }
    }))
  } catch {}
  try { window.dispatchEvent(new CustomEvent('gii-practice-context-reset', { detail })) } catch {}
}

export function clearGiiPracticeContext (previousUsername = '', currentUsername = '', nextEpoch?: number): void {
  if (typeof window === 'undefined') return
  for (const key of PRACTICE_SESSION_KEYS) {
    try { window.sessionStorage.removeItem(key) } catch {}
  }
  clearWindowPracticeCaches()
  if (currentUsername) writePracticeContextOwner(currentUsername, nextEpoch || readStoredEpoch() || 1)
  dispatchPracticeContextReset(previousUsername, currentUsername)
}

/**
 * Collega selezione, intent di editing e cache condivise all'account autenticato.
 * Il primo caricamento nella scheda registra soltanto il proprietario. Un reset
 * viene eseguito esclusivamente quando lo username realmente cambia.
 */
export function syncGiiPracticeContextUsername (usernameRaw: any): boolean {
  if (typeof window === 'undefined') return false
  const currentUsername = normalizeUsername(usernameRaw)
  if (!currentUsername) return false

  let previousUsername = ''
  try {
    previousUsername = normalizeUsername(window.sessionStorage.getItem(GII_PRACTICE_CONTEXT_USERNAME_KEY))
  } catch {}

  const currentEpoch = readStoredEpoch()

  if (!previousUsername) {
    writePracticeContextOwner(currentUsername, currentEpoch || 1)
    return false
  }

  if (previousUsername === currentUsername) {
    if (!currentEpoch) writePracticeContextOwner(currentUsername, 1)
    return false
  }

  const nextEpoch = Math.max(1, currentEpoch + 1)
  clearGiiPracticeContext(previousUsername, currentUsername, nextEpoch)
  return true
}
