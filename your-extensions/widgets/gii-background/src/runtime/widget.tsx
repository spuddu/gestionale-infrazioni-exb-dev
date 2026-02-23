/** @jsx jsx */
import { React, jsx, type AllWidgetProps } from 'jimu-core'
import type { IMConfig } from '../config'
import { defaultConfig } from '../config'

export default function Widget(props: AllWidgetProps<IMConfig>) {
  const cfg: any = { ...defaultConfig, ...(props.config as any) }

  return (
    <div style={{
      width:'100%', height:'100%',
      background:`linear-gradient(${cfg.bgGradAngle}deg,${cfg.bgGradStart} 0%,${cfg.bgGradMid} 40%,${cfg.bgGradEnd} 100%)`,
      position:'relative', overflow:'hidden'
    }}>
      {cfg.showCircles && Array.from({ length: cfg.circleCount ?? 3 }).map((_, i) => {
        const count  = cfg.circleCount ?? 3
        const base   = cfg.circleBaseSize ?? 700
        const sz     = base - i * Math.floor(base / count * 0.6)
        const op     = Math.max(0.01, (cfg.circleOpacity ?? 0.08) - i * 0.01)
        const thick  = cfg.circleThickness ?? 1
        const hex    = (cfg.circleColor ?? '#60a5fa').replace('#','')
        const r = parseInt(hex.slice(0,2),16), g = parseInt(hex.slice(2,4),16), b = parseInt(hex.slice(4,6),16)
        const hexEnd = (cfg.circleColorEnd ?? '#a78bfa').replace('#','')
        const r2 = parseInt(hexEnd.slice(0,2),16), g2 = parseInt(hexEnd.slice(2,4),16), b2 = parseInt(hexEnd.slice(4,6),16)
        return (
          <div key={i} style={{
            position:'absolute', top:-200+i*80, right:-200+i*80,
            width:sz, height:sz, borderRadius:'50%',
            zIndex:0,
            border:`${thick}px solid rgba(${r},${g},${b},${op})`,
            background: cfg.circleGradient
              ? `radial-gradient(circle,rgba(${r2},${g2},${b2},${Math.max(0.01,op*0.15)}) 0%,transparent 70%)`
              : undefined,
            pointerEvents:'none'
          }}/>
        )
      })}
      <div style={{ position:'absolute',bottom:-100,left:-80,width:400,height:400,borderRadius:'50%',background:'radial-gradient(circle,rgba(59,130,246,0.08) 0%,transparent 70%)',pointerEvents:'none' }}/>
      {cfg.showWave && (
        <svg style={{ position:'absolute',bottom:0,left:0,right:0,width:'100%',opacity:0.07,pointerEvents:'none' }} viewBox="0 0 1440 200" preserveAspectRatio="none">
          <path d="M0,100 C180,60 360,140 540,100 C720,60 900,140 1080,100 C1260,60 1380,120 1440,100 L1440,200 L0,200 Z" fill="#60a5fa"/>
          <path d="M0,130 C200,90 400,160 600,130 C800,100 1000,160 1200,130 C1350,105 1400,140 1440,130 L1440,200 L0,200 Z" fill="#3b82f6"/>
        </svg>
      )}
    </div>
  )
}
