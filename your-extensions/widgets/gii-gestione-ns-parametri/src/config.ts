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
  /**
   * Ambito dell'istanza: 'tecnico' = Nota spese e Attrezzature (RIT, da Gestione prezzari);
   * 'amministrativo' = Sanzioni e cauzione (RIA, card Parametri sanzionatori);
   * 'tutti' o vuoto = tutte le schede consentite al ruolo (comportamento precedente).
   */
  ambito?: 'tutti' | 'tecnico' | 'amministrativo'
  title?: string
  /** Sottotitolo personalizzato. Vuoto = descrizione della card Home. */
  subtitleText?: string
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
