import { type ImmutableObject, Immutable } from 'jimu-core'

/** Offset posizione (px) applicato come position:relative top/left */
export interface GroupOffset { x: number; y: number }

export interface Config {
  // Logo
  logoUrl: string; logoSize: number; logoRadius: number; logoPadding: number
  logoBgColor: string; logoBgGradient: boolean; logoBgGradEnd: string
  // Ente
  orgName: string; orgNameFont: string; orgNameSize: number
  orgNameWeight: number; orgNameColor: string; orgNameLetterSpacing: number
  // Titolo
  title: string; titleFont: string; titleSize: number
  titleWeight: number; titleColor: string; titleLetterSpacing: number
  // Sfondo header
  headerBgType: 'solid' | 'gradient'
  headerBg: string
  headerGradMid: string; headerGradEnd: string; headerGradAngle: number
  headerBorderBottom: boolean; headerBorderColor: string
  headerPaddingV: number; headerPaddingH: number
  // Sign in
  showSignIn: boolean; signInBg: string; signInColor: string; signInBorderColor: string
  // Banner utente
  showUserBanner: boolean; userBannerBg: string; userBannerBorderColor: string
  userAvatarBg1: string; userAvatarBg2: string
  userNameColor: string; userNameSize: number
  userBadgeBg: string; userBadgeColor: string; userInfoColor: string

  // ── Offset posizione gruppi (come Homepage) ──
  offsetLogo:    GroupOffset   // logo
  offsetTitoli:  GroupOffset   // testi (orgName + title)
  offsetLogin:   GroupOffset   // pulsante accedi/esci
  offsetBanner:  GroupOffset   // banner utente

  // ── Opzioni accesso (come Login widget) ──
  loginView: 'popup' | 'redirect'
  redirectAfterSignIn: string
  redirectAfterSignOut: string
  signedInClick: 'signout' | 'menu'

  // ── Compatibilità ExB 1.19 ──
  forceReloadAfterLogoutLogin: boolean
}

const Z: GroupOffset = { x: 0, y: 0 }

export const defaultConfig: Config = {
  logoUrl: '', logoSize: 56, logoRadius: 10, logoPadding: 4,
  logoBgColor: '#000000', logoBgGradient: true, logoBgGradEnd: '#0048ad',
  orgName: 'Consorzio di Bonifica della Sardegna Meridionale',
  orgNameFont: "'Trebuchet MS', sans-serif",
  orgNameSize: 11, orgNameWeight: 700,
  orgNameColor: 'rgba(147,197,253,0.85)', orgNameLetterSpacing: 2.0,
  title: 'Gestionale Infrazioni Irrigue',
  titleFont: "'Trebuchet MS', sans-serif",
  titleSize: 30, titleWeight: 700, titleColor: '#ffffff', titleLetterSpacing: -0.5,
  headerBgType: 'gradient',
  headerBg: '#0a1628',
  headerGradMid: '#0d2444', headerGradEnd: '#0a1f3d', headerGradAngle: 160,
  headerBorderBottom: true, headerBorderColor: 'rgba(255,255,255,0.08)',
  headerPaddingV: 14, headerPaddingH: 28,
  showSignIn: true,
  signInBg: 'rgba(255,255,255,0.10)', signInColor: '#ffffff',
  signInBorderColor: 'rgba(255,255,255,0.25)',
  // Banner utente (come homepage)
  showUserBanner: true,
  userBannerBg: 'rgba(255,255,255,0.06)', userBannerBorderColor: 'rgba(255,255,255,0.10)',
  userAvatarBg1: '#1d4ed8', userAvatarBg2: '#7c3aed',
  userNameColor: '#ffffff', userNameSize: 14,
  userBadgeBg: 'rgba(59,130,246,0.20)', userBadgeColor: '#93c5fd',
  userInfoColor: 'rgba(147,197,253,0.75)',
  offsetLogo: Z, offsetTitoli: Z, offsetLogin: Z, offsetBanner: Z,
  loginView: 'popup',
  redirectAfterSignIn: '',
  redirectAfterSignOut: '',
  signedInClick: 'signout',
  forceReloadAfterLogoutLogin: true

}

export type IMConfig = ImmutableObject<Config>
export const defaultIMConfig: IMConfig = Immutable(defaultConfig) as any
