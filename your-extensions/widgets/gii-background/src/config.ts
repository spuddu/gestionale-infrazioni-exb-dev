import { type ImmutableObject, Immutable } from 'jimu-core'

export interface Config {
  bgGradStart: string; bgGradMid: string; bgGradEnd: string; bgGradAngle: number
  showWave: boolean; showCircles: boolean
  circleCount: number; circleBaseSize: number; circleThickness: number
  circleOpacity: number; circleColor: string
  circleGradient: boolean; circleColorEnd: string
}

export const defaultConfig: Config = {
  bgGradStart: '#0a1628', bgGradMid: '#0d2444', bgGradEnd: '#0a1f3d', bgGradAngle: 160,
  showWave: false, showCircles: true,
  circleCount: 3, circleBaseSize: 700, circleThickness: 1,
  circleOpacity: 0.08, circleColor: '#60a5fa',
  circleGradient: false, circleColorEnd: '#a78bfa'
}

export type IMConfig = ImmutableObject<Config>
export const defaultIMConfig: IMConfig = Immutable(defaultConfig) as any
