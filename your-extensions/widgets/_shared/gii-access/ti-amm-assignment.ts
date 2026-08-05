/**
 * Regole condivise per l'assegnazione delle pratiche al Tecnico istruttore
 * amministrativo.
 *
 * Principi:
 * - lo username, quando presente nel record, è l'identificativo autoritativo;
 * - il nominativo è usato solo come fallback per record storici privi di username;
 * - il confronto è sempre case-insensitive e ignora gli spazi esterni;
 * - tutti i widget usano gli stessi alias storici dei campi.
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
  ruolo?: any
  role?: any
  areaCod?: any
  area_cod?: any
  areaLabel?: any
  area?: any
}

export interface GiiTiAmmAssignment {
  username: string
  name: string
}

function normalizeRoleCode (value: any): string {
  const raw = String(value ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_')
  if (!raw) return ''
  if (raw === '2') return 'TI'
  if (raw === '4') return 'RI'
  if (raw === 'TI_AMM' || raw.includes('TECNICO_ISTRUTTORE_AMMINISTRATIVO')) return 'TI_AMM'
  if (raw === 'RI_AMM' || raw.includes('RESPONSABILE_ISTRUTTORIA_AMMINISTRATIVA')) return 'RI_AMM'
  if (raw === 'TI' || raw.includes('TECNICO_ISTRUTTORE')) return 'TI'
  if (raw === 'RI' || raw.includes('RESPONSABILE_ISTRUTTORIA')) return 'RI'
  return raw
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

/** Restituisce il profilo TI_AMM anche quando ruolo e area sono esposti separatamente. */
export function isGiiTiAmmUser (user: GiiAssignmentUserLike | null | undefined): boolean {
  const role = normalizeRoleCode(
    user?.profiloCod ?? user?.profilo_cod ?? user?.ruoloCod ?? user?.ruolo_cod ?? user?.ruoloLabel ?? user?.ruolo ?? user?.role
  )
  if (role === 'TI_AMM') return true
  const area = normalizeAreaCode(user?.areaCod ?? user?.area_cod ?? user?.areaLabel ?? user?.area)
  return role === 'TI' && area === 'AMM'
}

const TI_AMM_USERNAME_FIELDS = [
  'ti_amm_assegnato_username',
  'ti_amm_assegnato_user',
  'ti_amm_assegnato',
  'ti_amm_username',
  'utente_TI_AMM',
  'utente_ti_amm'
]

const TI_AMM_NAME_FIELDS = [
  'ti_amm_assegnato_nome',
  'ti_amm_assegnato_name'
]

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

export function getTiAmmAssignment (data: Record<string, any> | null | undefined): GiiTiAmmAssignment {
  return {
    username: pickFirstNonEmptyAttrCI(data, TI_AMM_USERNAME_FIELDS),
    name: pickFirstNonEmptyAttrCI(data, TI_AMM_NAME_FIELDS)
  }
}

export function hasTiAmmAssignment (data: Record<string, any> | null | undefined): boolean {
  const assignment = getTiAmmAssignment(data)
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
 * Verifica l'assegnazione al TI_AMM corrente.
 *
 * Se il record contiene lo username dell'assegnatario, il nominativo non può
 * sovrascriverlo: ciò evita che un'omonimia conceda accesso a una pratica
 * assegnata a un altro account. Il nominativo viene considerato soltanto nei
 * record storici in cui lo username non è valorizzato.
 */
export function isPracticeAssignedToCurrentTiAmm (
  data: Record<string, any> | null | undefined,
  user: GiiAssignmentUserLike | null | undefined
): boolean {
  const assignment = getTiAmmAssignment(data)
  const currentUsername = normalizeGiiIdentity(getUserUsername(user))

  if (assignment.username) {
    return !!currentUsername && normalizeGiiIdentity(assignment.username) === currentUsername
  }

  if (!assignment.name) return false

  const assignedName = normalizeGiiIdentity(assignment.name)
  const displayNames = getUserDisplayNames(user)
  if (displayNames.includes(assignedName)) return true

  // Compatibilità con record storici in cui nel campo nominativo è stato
  // memorizzato lo username anziché il nome completo.
  return !!currentUsername && assignedName === currentUsername
}

function sqlEscape (value: string): string {
  return String(value || '').replace(/'/g, "''")
}

/**
 * Genera la clausola SQL equivalente alla regola applicativa, da usare nei
 * layer di mappa. I nomi campo sono quelli ufficiali esposti dalla vista AGOL.
 */
export function buildTiAmmAssignmentWhereClause (user: GiiAssignmentUserLike | null | undefined): string {
  const username = getUserUsername(user)
  const displayNames = getUserDisplayNames(user)
  const fallbackValues = Array.from(new Set([
    ...displayNames,
    normalizeGiiIdentity(username)
  ].filter(Boolean)))

  const usernameMatch = username
    ? `UPPER(ti_amm_assegnato_username) = UPPER('${sqlEscape(username)}')`
    : ''

  const nameMatch = fallbackValues.length
    ? fallbackValues
      .map(value => `UPPER(ti_amm_assegnato_nome) = UPPER('${sqlEscape(value)}')`)
      .join(' OR ')
    : ''

  if (usernameMatch && nameMatch) {
    return `(${usernameMatch} OR ((ti_amm_assegnato_username IS NULL OR ti_amm_assegnato_username = '') AND (${nameMatch})))`
  }
  if (usernameMatch) return `(${usernameMatch})`
  if (nameMatch) return `((ti_amm_assegnato_username IS NULL OR ti_amm_assegnato_username = '') AND (${nameMatch}))`
  return '1=0'
}
