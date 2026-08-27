import { type ImmutableObject, Immutable } from 'jimu-core'

export interface NavItem {
  id: string
  visible: boolean
  order: number
  label: string
  hashPage: string
  section?: string
  viewId?: string
  collapseSidebar?: boolean
  colorBg: string
  colorAccent: string
  colorBgRest: string
  colorBgHover: string
  roles: string[]
  icon: string
}

export interface Config {
  sectionId: string
  sidebarWidgetId: string
  gap: number
  itemBorderRadius: number
  itemPaddingX: number
  itemPaddingY: number
  itemWidth: number
  itemHeight: number
  iconSize: number
  iconBoxSize: number
  labelSize: number
  labelWeight: number
  labelFont: string
  tabUseCustomColors: boolean
  tabBorderColorRest: string
  tabBorderColorActive: string
  tabBgColorRest: string
  tabBgColorHover: string
  tabTextColorRest: string
  tabTextColorActive: string
  sidebarResetUseCustomColors: boolean
  sidebarResetBorderColor: string
  sidebarResetBgColorRest: string
  sidebarResetBgColorHover: string
  items: NavItem[]
}

export const defaultConfig: Config = {
  sectionId: '',
  sidebarWidgetId: '',
  gap: 8,
  itemBorderRadius: 8,
  itemPaddingX: 14,
  itemPaddingY: 8,
  itemWidth: 180,
  itemHeight: 40,
  iconSize: 16,
  iconBoxSize: 24,
  labelSize: 14,
  labelWeight: 500,
  labelFont: "'Trebuchet MS', sans-serif",
  tabUseCustomColors: false,
  tabBorderColorRest: 'rgba(255,255,255,0.10)',
  tabBorderColorActive: '#3d77c9',
  tabBgColorRest: 'rgba(255,255,255,0.05)',
  tabBgColorHover: '#1d3557',
  tabTextColorRest: 'rgba(255,255,255,0.92)',
  tabTextColorActive: '#ffffff',
  sidebarResetUseCustomColors: false,
  sidebarResetBorderColor: '#3d77c9',
  sidebarResetBgColorRest: 'rgba(255,255,255,0.05)',
  sidebarResetBgColorHover: '#1d3557',
  items: [
    { id:'nav_prezzari',      visible:true, order:1, label:'Prezzari',      hashPage:'Gestione Prezzari', section:'',           colorBg:'#1d4f82', colorAccent:'#3d77c9', colorBgRest:'#1d4f82', colorBgHover:'#2563a7', roles:['RIT','DT','DA','ADMIN'], icon:'home'      },
    { id:'nav_voci_uff',      visible:true, order:2, label:'Voci ufficiali',hashPage:'Gestione Voci Prezzario', section:'',   colorBg:'rgba(255,255,255,0.05)', colorAccent:'#3d77c9', colorBgRest:'rgba(255,255,255,0.05)', colorBgHover:'#1d3557', roles:['RIT','DT','DA','ADMIN'], icon:'elenco'    },
    { id:'nav_voci_int',      visible:true, order:3, label:'Voci interne',  hashPage:'Gestione Prezzario Interno', section:'',colorBg:'rgba(255,255,255,0.05)', colorAccent:'#3d77c9', colorBgRest:'rgba(255,255,255,0.05)', colorBgHover:'#1d3557', roles:['RIT','DT','DA','ADMIN'], icon:'nuova'     },
    { id:'nav_analisi',       visible:true, order:4, label:'Analisi prezzi',hashPage:'Gestione Analisi Prezzario Interno', section:'', colorBg:'rgba(255,255,255,0.05)', colorAccent:'#3d77c9', colorBgRest:'rgba(255,255,255,0.05)', colorBgHover:'#1d3557', roles:['RIT','DT','DA','ADMIN'], icon:'dashboard' },
    { id:'nav_parametri',     visible:true, order:5, label:'Parametri',     hashPage:'Gestione Parametri', section:'',         colorBg:'rgba(255,255,255,0.05)', colorAccent:'#3d77c9', colorBgRest:'rgba(255,255,255,0.05)', colorBgHover:'#1d3557', roles:['RIT','DT','DA','ADMIN'], icon:'report'    },
    { id:'nav_consultazione', visible:true, order:6, label:'Consultazione', hashPage:'Consultazione Prezzario', section:'',    colorBg:'rgba(255,255,255,0.05)', colorAccent:'#3d77c9', colorBgRest:'rgba(255,255,255,0.05)', colorBgHover:'#1d3557', roles:['RIT','DT','DA','ADMIN'], icon:'mappa'     }
  ]
}

export type IMConfig = ImmutableObject<Config>
const toImmutable = Immutable as unknown as <T>(value: T) => ImmutableObject<T>
export const defaultIMConfig: IMConfig = toImmutable(defaultConfig)
