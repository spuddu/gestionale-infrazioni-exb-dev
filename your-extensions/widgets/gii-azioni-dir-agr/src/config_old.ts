import { ImmutableObject } from 'jimu-core'

export interface Config {
  /**
   * Ruolo del widget:
   * - DT = Direttore Tecnico
   * - DA = Direttore Amministrativo
   */
  roleCode: string
  buttonText: string
}

export type IMConfig = ImmutableObject<Config>
