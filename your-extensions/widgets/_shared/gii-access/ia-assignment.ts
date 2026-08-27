/**
 * Regole condivise per l'assegnazione delle pratiche all'Istruttore amministrativo.
 *
 * Principi:
 * - lo username, quando presente nel record, è l'identificativo autoritativo;
 * - il nominativo è usato come fallback solo se lo username non è valorizzato;
 * - il confronto è sempre case-insensitive e ignora gli spazi esterni;
 * - tutti i widget usano esclusivamente i campi IA correnti.
 */

export interface GiiAssignmentUserLike {
  username?: any
  fullName?: any
  full_name?: any
  nome?: any
  displayName?: any
  profiloCod?: any
  profilo_cod?: any
  ruoloCod?: any
  ruolo_cod?: any
  ruoloLabel?: any
  role?: any
  areaCod?: any
  area_cod?: any
  areaLabel?: any
  area?: any
}

export interface GiiIaAssignment {
  username: string
  name: string
}

function normalizeRoleCode (value: any): string {
  return String(value ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_')
}

function normalizeAreaCode (value: any): string {
  const raw = String(value ?? '').trim().toUpperCase()
  if (raw === '1') return 'AMM'
  if (raw === '2') return 'AGR'
  if (raw === '3') return 'TEC'
  if (raw === 'AMMINISTRATIVA' || raw === 'AMMINISTRAZIONE') return 'AMM'
  if (raw === 'AGRARIA' || raw === 'AGRICOLA' || raw === 'AGRICOLTURA') return 'AGR'
  if (raw === 'TECNICA' || raw === 'TECNICO') return 'TEC'
  return raw
}

/** Verifica il profilo operativo dell'Istruttore amministrativo. */
export function isGiiIaUser (user: GiiAssignmentUserLike | null | undefined): boolean {
  const role = normalizeRoleCode(
    user?.profiloCod ?? user?.profilo_cod ?? user?.ruoloCod ?? user?.ruolo_cod
  )
  return role === 'IA'
}

const IA_USERNAME_FIELDS = ['ia_assegnato_username']

const IA_NAME_FIELDS = ['ia_assegnato_nome']

export function normalizeGiiIdentity (value: any): string {
  return String(value ?? '').trim().toLowerCase()
}

function pickFirstNonEmptyAttrCI (data: Record<string, any> | null | undefined, fieldNames: string[]): string {
  if (!data || typeof data !== 'object') return ''
  const keys = Object.keys(data)
  for (const requested of fieldNames) {
    const requestedKey = String(requested || '').toLowerCase()
    const actualKey = keys.find(key => String(key).toLowerCase() === requestedKey)
    if (!actualKey) continue
    const value = String(data[actualKey] ?? '').trim()
    if (value) return value
  }
  return ''
}

export function getIaAssignment (data: Record<string, any> | null | undefined): GiiIaAssignment {
  return {
    username: pickFirstNonEmptyAttrCI(data, IA_USERNAME_FIELDS),
    name: pickFirstNonEmptyAttrCI(data, IA_NAME_FIELDS)
  }
}

export function hasIaAssignment (data: Record<string, any> | null | undefined): boolean {
  const assignment = getIaAssignment(data)
  return !!assignment.username || !!assignment.name
}

function getUserUsername (user: GiiAssignmentUserLike | null | undefined): string {
  return String(user?.username ?? '').trim()
}

function getUserDisplayNames (user: GiiAssignmentUserLike | null | undefined): string[] {
  const values = [
    user?.fullName,
    user?.full_name,
    user?.nome,
    user?.displayName
  ]
    .map(value => String(value ?? '').trim())
    .filter(Boolean)

  return Array.from(new Set(values.map(normalizeGiiIdentity)))
}

/**
 * Verifica l'assegnazione all'Istruttore amministrativo corrente.
 *
 * Se il record contiene lo username dell'assegnatario, il nominativo non può
 * sovrascriverlo: ciò evita che un'omonimia conceda accesso a una pratica
 * assegnata a un altro account. Il nominativo viene considerato soltanto nei
 * record in cui lo username non è valorizzato.
 */
export function isPracticeAssignedToCurrentIa (
  data: Record<string, any> | null | undefined,
  user: GiiAssignmentUserLike | null | undefined
): boolean {
  const assignment = getIaAssignment(data)
  const currentUsername = normalizeGiiIdentity(getUserUsername(user))

  if (assignment.username) {
    return !!currentUsername && normalizeGiiIdentity(assignment.username) === currentUsername
  }

  if (!assignment.name) return false

  const assignedName = normalizeGiiIdentity(assignment.name)
  const displayNames = getUserDisplayNames(user)
  if (displayNames.includes(assignedName)) return true

  return !!currentUsername && assignedName === currentUsername
}

function sqlEscape (value: string): string {
  return String(value || '').replace(/'/g, "''")
}

/**
 * Genera la clausola SQL equivalente alla regola applicativa, da usare nei
 * layer di mappa. I nomi campo sono quelli ufficiali esposti dalla vista AGOL.
 */
export function buildIaAssignmentWhereClause (user: GiiAssignmentUserLike | null | undefined): string {
  const username = getUserUsername(user)
  const displayNames = getUserDisplayNames(user)
  const fallbackValues = Array.from(new Set([
    ...displayNames,
    normalizeGiiIdentity(username)
  ].filter(Boolean)))

  const usernameMatch = username
    ? `UPPER(ia_assegnato_username) = UPPER('${sqlEscape(username)}')`
    : ''

  const nameMatch = fallbackValues.length
    ? fallbackValues
      .map(value => `UPPER(ia_assegnato_nome) = UPPER('${sqlEscape(value)}')`)
      .join(' OR ')
    : ''

  if (usernameMatch && nameMatch) {
    return `(${usernameMatch} OR ((ia_assegnato_username IS NULL OR ia_assegnato_username = '') AND (${nameMatch})))`
  }
  if (usernameMatch) return `(${usernameMatch})`
  if (nameMatch) return `((ia_assegnato_username IS NULL OR ia_assegnato_username = '') AND (${nameMatch}))`
  return '1=0'
}
