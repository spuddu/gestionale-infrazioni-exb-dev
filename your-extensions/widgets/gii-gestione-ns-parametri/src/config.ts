import { type ImmutableObject } from 'jimu-core'

export interface Config {
  showTitleSubtitle?: boolean
  showTitleDivider?: boolean
  /** Parametri tecnici usati per la nota spese. */
  serviceUrl?: string
  /** Vista editabile AMM filtrata su SANZIONE, RIDUZIONE e CAUZIONE. */
  serviceUrlSanzioniAmm?: string
  /** Vista editabile AGR/TEC filtrata su ATTREZZATURA. */
  serviceUrlAttrezzatureAgrTec?: string
  title?: string
  titleColor?: string
  titleFontSize?: number
  titleIconSize?: number
  titleDividerColor?: string
  titleDividerWidth?: number
  subtitleColor?: string
  subtitleFontSize?: number
  sectionTitleColor?: string
  sectionTitleFontSize?: number
  toolbarLabelColor?: string
  toolbarLabelFontSize?: number
  /** Colore di sfondo della scheda di dettaglio del parametro. */
  detailCardBackgroundColor?: string
  /** Colore di sfondo della scheda che contiene i parametri salvati. */
  recordsCardBackgroundColor?: string
}

export type IMConfig = ImmutableObject<Config>
