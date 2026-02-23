import { type ImmutableObject, Immutable } from 'jimu-core'

export interface NavItem {
  id: string
  visible: boolean
  order: number
  label: string
  hashPage: string
  colorBg: string
  colorAccent: string
  colorBgRest: string
  colorBgHover: string
  roles: string[]
  icon: string
}

export interface Config {
  direction: 'vertical' | 'horizontal'
  gap: number
  itemBorderRadius: number
  itemPadding: number
  labelSize: number
  labelWeight: number
  labelFont: string
  items: NavItem[]
}

export const defaultConfig: Config = {
  direction: 'vertical',
  gap: 8,
  itemBorderRadius: 12,
  itemPadding: 14,
  labelSize: 14,
  labelWeight: 600,
  labelFont: "'Trebuchet MS', sans-serif",
  items: [
    { id:'nav_home',      visible:true, order:1, label:'Home',           hashPage:'home',      colorBg:'#0d2444', colorAccent:'#60a5fa', colorBgRest:'rgba(255,255,255,0.05)', colorBgHover:'#0d2444', roles:['*'],                    icon:'home'      },
    { id:'nav_elenco',    visible:true, order:2, label:'Elenco Pratiche',hashPage:'elenco',    colorBg:'#0c329d', colorAccent:'#6fa5fb', colorBgRest:'rgba(255,255,255,0.05)', colorBgHover:'#0c329dee', roles:['*'],                    icon:'elenco'    },
    { id:'nav_nuova',     visible:true, order:3, label:'Nuova Pratica',  hashPage:'nuova',     colorBg:'#7c2d12', colorAccent:'#f97316', colorBgRest:'rgba(255,255,255,0.05)', colorBgHover:'#7c2d12ee', roles:['TI','ADMIN'],           icon:'nuova'     },
    { id:'nav_mappa',     visible:true, order:4, label:'Mappa',          hashPage:'mappa',     colorBg:'#14532d', colorAccent:'#22c55e', colorBgRest:'rgba(255,255,255,0.05)', colorBgHover:'#14532dee', roles:['*'],                    icon:'mappa'     },
    { id:'nav_dashboard', visible:true, order:5, label:'Dashboard',      hashPage:'dashboard', colorBg:'#858519', colorAccent:'#fefe2a', colorBgRest:'rgba(255,255,255,0.05)', colorBgHover:'#858519ee', roles:['RI','DT','DA','ADMIN'], icon:'dashboard' },
    { id:'nav_report',    visible:true, order:6, label:'Report',         hashPage:'report',    colorBg:'#4a1d96', colorAccent:'#b79ffe', colorBgRest:'rgba(255,255,255,0.05)', colorBgHover:'#4a1d96ee', roles:['RI','DT','DA','ADMIN'], icon:'report'    },
  ]
}

export type IMConfig = ImmutableObject<Config>
export const defaultIMConfig: IMConfig = Immutable(defaultConfig) as any
