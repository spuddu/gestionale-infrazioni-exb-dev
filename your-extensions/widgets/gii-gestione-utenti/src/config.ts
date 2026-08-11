import { type ImmutableObject } from 'jimu-core'

export interface Config {
  /** Modalità del widget: gestione utenti standard oppure Rubrica di servizio. */
  mode?: 'utenti' | 'rubrica'
  /** URL del layer/tabella GII_utenti. */
  serviceUrl?: string
  /** Segreto OAuth dell'applicazione AGOL usato come fallback quando la sessione ExB non espone un token. */
  clientSecret?: string
  /** Titolo principale del widget. */
  title?: string
  titleColor?: string
  titleFontSize?: number
  /** Stile delle etichette della maschera utente. */
  fieldLabelColor?: string
  fieldLabelFontSize?: number
  /** Colore di sfondo della scheda di inserimento/modifica utente. */
  detailCardBackgroundColor?: string
  /** Colore di sfondo della scheda che contiene gli utenti salvati. */
  recordsCardBackgroundColor?: string
  /** Stile dell'intestazione della tabella utenti. */
  tableHeaderBackgroundColor?: string
  tableHeaderTextColor?: string
  tableFontSize?: number
}

export type IMConfig = ImmutableObject<Config>
