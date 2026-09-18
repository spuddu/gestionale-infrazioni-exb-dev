export const ADMINISTRATIVE_RIMANDO_TARGET_OPTIONS = [
  'Bozza di determinazione',
  'Contestazioni',
  'Dati del trasgressore',
  'Allegati',
  'Altro'
] as const

export function buildAdministrativeRimandoNote (targets: readonly string[], motivationRaw: any): string {
  const cleanTargets = Array.from(new Set((targets || []).map(v => String(v || '').trim()).filter(Boolean)))
  const motivation = String(motivationRaw || '').trim()
  return [
    cleanTargets.length > 0 ? `Oggetto del rimando: ${cleanTargets.join(', ')}` : '',
    motivation ? `Motivazione del rimando: ${motivation}` : ''
  ].filter(Boolean).join('\n')
}
