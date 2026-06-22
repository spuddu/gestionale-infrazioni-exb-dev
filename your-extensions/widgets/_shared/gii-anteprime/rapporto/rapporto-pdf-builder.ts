// Compatibilità percorso storico.
// Il builder del Rapporto tecnico è stato spostato in:
// _shared/gii-anteprime/documenti-tecnici/rapporto/rapporto-pdf-builder

export {
  buildRapportoPdf,
  buildRapportoIterPlaceholders,
  loadRapportoIterCicliForPdf
} from '../documenti-tecnici/rapporto/rapporto-pdf-builder'

export type {
  RapportoIterCicloPdf
} from '../documenti-tecnici/rapporto/rapporto-pdf-builder'
