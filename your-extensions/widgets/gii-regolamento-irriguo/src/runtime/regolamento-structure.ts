// Struttura di navigazione del Regolamento irriguo.
// Nessun titolo o testo normativo è duplicato nel widget: tutti i contenuti
// (artt. 1-45 delle Norme generali e punti 1-2 del regolamento sulle condotte
// private) sono caricati dalla tabella GII_REGOLAMENTO_ARTICOLI configurata.

export type ArticleKind = 'general' | 'rcp'

export type Articolo = {
  id: string
  codice: string
  numero: string
  titolo: string
  sezione: string
  testo: string
  kind: ArticleKind
}

export type SezioneDef = {
  id: string
  nome: string
  min?: number
  max?: number
  codes?: string[]
}

export const DELIBERA_META = {
  titoloDocumento: "Norme generali sulla distribuzione dell'acqua ad uso irriguo",
  delibera: 'Delibera del Consiglio dei Delegati n. 7 del 28 giugno 2024',
  pagine: 7
}

export const SECTION_DEFS: SezioneDef[] = [
  { id: 'generali', nome: 'Disposizioni generali', min: 1, max: 12 },
  { id: 'invernale', nome: 'Erogazione nel periodo invernale', min: 13, max: 14 },
  { id: 'comunicazione', nome: 'Comunicazione di irrigazione', min: 15, max: 20 },
  { id: 'contributi', nome: 'Contributi', min: 21, max: 26 },
  { id: 'obblighi', nome: 'Obblighi e divieti', min: 27, max: 37 },
  { id: 'responsabilita', nome: 'Responsabilità', min: 38, max: 40 },
  { id: 'sanzioni', nome: 'Sanzioni', min: 41, max: 45 }
]

export const RCP_SECTION: SezioneDef = {
  id: 'condotte-private',
  nome: 'Regolamento condotte private',
  codes: ['RCP01', 'RCP02']
}

export function sezioneForGeneralArticleNumber (n: number): string {
  const found = SECTION_DEFS.find(s => s.min != null && s.max != null && n >= s.min && n <= s.max)
  return found?.nome || 'Norme generali'
}

export const ARTICOLO_MIN = 1
export const ARTICOLO_MAX = 45
export const RCP_NUMBERS = [1, 2] as const
