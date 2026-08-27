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
  offsetAlertBell: GroupOffset // campanella allarmi

  // ── Opzioni accesso (come Login widget) ──
  loginView: 'popup' | 'redirect'
  redirectAfterSignIn: string
  redirectAfterSignOut: string
  signedInClick: 'signout' | 'menu'

  // ── Menu utente (quando signedInClick === 'menu') ──
  accountMenuShowName: boolean
  accountMenuShowAvatar: boolean
  accountMenuShowProfile: boolean
  accountMenuProfileUrl: string
  accountMenuShowSettings: boolean
  accountMenuSettingsUrl: string

  // ── Compatibilità ExB 1.19 ──
  forceReloadAfterLogoutLogin: boolean

  // ── Allarmi globali ──
  alertsEnabled: boolean
  alertsPracticeLayerUrl: string
  alertsPracticeLayerUrlTecnici: string
  alertsPracticeLayerUrlAgr: string
  alertsPracticeLayerUrlTec: string
  // URL editabili distinte da quelle di lettura sopra (che sono viste "_ALL", sola
  // lettura, condivise con tutti i sotto-ruoli). Usate solo per la normalizzazione
  // testi via applyEdits, e solo per i ruoli "di area" (RIT/DT/RIA/DA). Per i
  // ruoli "di distretto" (IT/CS) la vista corretta è derivata dal settore
  // direttamente in widget.tsx (selectAlertPracticeLayerUrlWrite), non da qui.
  // Se il ruolo corrente non ha comunque accesso in scrittura, il tentativo
  // fallisce silenziosamente senza impattare la lettura degli allarmi.
  alertsPracticeLayerUrlWrite: string
  alertsPracticeLayerUrlWriteAgr: string
  alertsPracticeLayerUrlWriteTec: string
  alertsArchiveTableUrl: string
  alertsArchiveTableUrlTecnici: string
  alertsWarningDays: number
  alertsPollSeconds: number
  alertsOpenPage: string
  alertsHomePage: string
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
  offsetLogo: Z, offsetTitoli: Z, offsetLogin: Z, offsetBanner: Z, offsetAlertBell: Z,
  loginView: 'popup',
  redirectAfterSignIn: '',
  redirectAfterSignOut: '',
  signedInClick: 'signout',
  accountMenuShowName: true,
  accountMenuShowAvatar: true,
  accountMenuShowProfile: true,
  accountMenuProfileUrl: 'https://cbsm-hub.maps.arcgis.com/home/user.html',
  accountMenuShowSettings: true,
  accountMenuSettingsUrl: 'https://cbsm-hub.maps.arcgis.com/home/user.html',
  forceReloadAfterLogoutLogin: true,

  alertsEnabled: true,
  alertsPracticeLayerUrl: 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_AMM_ALL/FeatureServer/0',
  alertsPracticeLayerUrlTecnici: '',
  alertsPracticeLayerUrlAgr: '',
  alertsPracticeLayerUrlTec: '',
  alertsPracticeLayerUrlWrite: 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_AMM/FeatureServer/0',
  alertsPracticeLayerUrlWriteAgr: 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_AGR/FeatureServer/0',
  alertsPracticeLayerUrlWriteTec: 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_TEC/FeatureServer/0',
  alertsArchiveTableUrl: 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_ALLARMI_AMMINISTRATIVI_ARCHIVIATI/FeatureServer/0',
  alertsArchiveTableUrlTecnici: 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_ALLARMI_TECNICI_ARCHIVIATI/FeatureServer/0',
  alertsWarningDays: 5,
  alertsPollSeconds: 60,
  alertsOpenPage: '',
  alertsHomePage: ''

}

export type IMConfig = ImmutableObject<Config>
const toImmutable = Immutable as unknown as <T>(value: T) => ImmutableObject<T>
export const defaultIMConfig: IMConfig = toImmutable(defaultConfig)
