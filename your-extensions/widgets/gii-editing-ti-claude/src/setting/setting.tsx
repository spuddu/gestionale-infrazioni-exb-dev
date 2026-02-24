/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx, Immutable, DataSourceTypes, type UseDataSource } from 'jimu-core'
import type { AllWidgetSettingProps } from 'jimu-for-builder'
import { DataSourceSelector } from 'jimu-ui/advanced/data-source-selector'
import type { IMConfig } from '../config'
import { defaultConfig } from '../config'

function asJs<T=any>(v:any):T { return v?.asMutable?v.asMutable({deep:true}):v }

const P = {
  wrap:  { padding:'0 12px 32px', fontSize:13, background:'#1a1f2e', minHeight:'100%', color:'#e5e7eb' } as React.CSSProperties,
  sec:   { fontSize:11, fontWeight:700, color:'#93c5fd', textTransform:'uppercase' as const, letterSpacing:1.2, borderBottom:'1px solid rgba(255,255,255,0.10)', paddingBottom:6, marginBottom:14, marginTop:22, cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center' } as React.CSSProperties,
  lbl:   { fontSize:11.5, fontWeight:600, color:'#d1d5db', display:'block', marginBottom:4, marginTop:10 } as React.CSSProperties,
  hint:  { fontSize:10.5, color:'#a0aec0', marginTop:3, lineHeight:1.5 } as React.CSSProperties,
  inp:   { width:'100%', padding:'5px 8px', fontSize:12, border:'1px solid rgba(255,255,255,0.15)', borderRadius:6, outline:'none', boxSizing:'border-box' as const, background:'rgba(255,255,255,0.07)', color:'#e5e7eb' } as React.CSSProperties,
  chk:   { display:'flex', alignItems:'center', gap:8, fontSize:12, color:'#d1d5db', cursor:'pointer', marginTop:10 } as React.CSSProperties,
}

function Acc(p: { id:string; label:string; open:boolean; onToggle:()=>void }) {
  return (
    <div style={P.sec} onClick={p.onToggle}>
      <span>{p.label}</span>
      <span style={{ fontSize:10, color:'#a0aec0' }}>{p.open?'▲':'▼'}</span>
    </div>
  )
}

export default function Setting(props: AllWidgetSettingProps<IMConfig>) {
  const cfg: any = { ...defaultConfig, ...asJs(props.config) }
  const [openSec, setOpenSec] = React.useState<string>('datasource')
  const toggle = (id:string) => setOpenSec(s => s===id ? '' : id)
  const isOpen = (id:string) => openSec===id

  const set = (key:string, value:any) => {
    const base = props.config || Immutable(defaultConfig) as any
    props.onSettingChange({ id:props.id, config: base.set ? base.set(key, value) : { ...cfg, [key]:value } as any })
  }

  const onDsChange = (useDataSources: UseDataSource[]) =>
    props.onSettingChange({ id:props.id, useDataSources: useDataSources as any })
  const onToggleDs = (enabled: boolean) =>
    props.onSettingChange({ id:props.id, useDataSourcesEnabled: enabled })

  return (
    <div style={P.wrap}>

      {/* === DATASOURCE === */}
      <Acc id='datasource' label='📊 Datasource' open={isOpen('datasource')} onToggle={()=>toggle('datasource')}/>
      {isOpen('datasource') && <div>
        <div style={P.hint}>Feature layer delle pratiche TI. Serve per visualizzare i dettagli del record selezionato.</div>
        <div style={{ marginTop:10 }}>
          <DataSourceSelector
            widgetId={props.id}
            types={Immutable([DataSourceTypes.FeatureLayer])}
            isMultiple={false}
            useDataSources={props.useDataSources as any}
            useDataSourcesEnabled={props.useDataSourcesEnabled}
            onToggleUseDataEnabled={onToggleDs}
            onChange={onDsChange}
            mustUseDataSource
          />
        </div>
      </div>}

      {/* === URL LAYER === */}
      <Acc id='sorgenti' label='🔗 URL Layer' open={isOpen('sorgenti')} onToggle={()=>toggle('sorgenti')}/>
      {isOpen('sorgenti') && <div>
        <label style={P.lbl}>URL Feature Layer madre <span style={{color:'#f87171'}}>*</span></label>
        <input type='text' value={cfg.motherLayerUrl} onChange={e=>set('motherLayerUrl',e.target.value)}
          placeholder='https://services2.arcgis.com/.../FeatureServer/0' style={P.inp}/>
        <div style={P.hint}>URL diretto al layer. Usato per addFeatures (nuova pratica) e updateFeatures (modifica).</div>
        <label style={P.lbl}>URL Tabella Audit Log <span style={{color:'#a0aec0'}}>(opzionale)</span></label>
        <input type='text' value={cfg.auditTableUrl} onChange={e=>set('auditTableUrl',e.target.value)}
          placeholder='https://services2.arcgis.com/.../FeatureServer/1' style={P.inp}/>
        <div style={P.hint}>Se valorizzato, ogni modifica viene tracciata campo per campo. Se vuoto il log viene saltato.</div>
      </div>}

      {/* === MODALITA === */}
      <Acc id='modalita' label='⚙ Modalità' open={isOpen('modalita')} onToggle={()=>toggle('modalita')}/>
      {isOpen('modalita') && <div>
        <label style={P.lbl}>Modalità di visualizzazione</label>
        <select value={cfg.displayMode} onChange={e=>set('displayMode',e.target.value)} style={P.inp}>
          <option value='page' style={{background:'#1a1f2e'}}>Pagina intera</option>
          <option value='overlay' style={{background:'#1a1f2e'}}>Overlay modal</option>
        </select>
        {cfg.displayMode==='page' && <>
          <label style={P.lbl}>Hash pagina di ritorno (tasto Annulla)</label>
          <input type='text' value={cfg.closePageHash} onChange={e=>set('closePageHash',e.target.value)}
            placeholder='elenco-pratiche' style={P.inp}/>
          <div style={P.hint}>L'utente viene reindirizzato a <code style={{color:'#93c5fd'}}>#{cfg.closePageHash}</code> quando clicca Annulla.</div>
        </>}
        <label style={P.chk}>
          <input type='checkbox' checked={!!cfg.showDatiGenerali} onChange={e=>set('showDatiGenerali', e.target.checked)}/>
          Mostra sezione "Dati generali" nel form nuova pratica
        </label>
        <div style={P.hint}>Se attivo, la tab Dati generali mostra tecnico, ufficio e data (read-only).</div>
      </div>}

      {/* === MAPPA === */}
      <Acc id='mappa' label='🗺 Mappa' open={isOpen('mappa')} onToggle={()=>toggle('mappa')}/>
      {isOpen('mappa') && <div>
        <label style={P.lbl}>Basemap</label>
        <select value={cfg.mapBasemap} onChange={e=>set('mapBasemap',e.target.value)} style={P.inp}>
          {[['osm','OpenStreetMap'],['streets','Streets (ESRI)'],['streets-navigation-vector','Streets Navigation'],
            ['satellite','Satellite'],['hybrid','Hybrid (satellite + strade)'],['topo-vector','Topografico']
          ].map(([v,l])=>(
            <option key={v} value={v} style={{background:'#1a1f2e'}}>{l}</option>
          ))}
        </select>
        <label style={P.lbl}>Zoom iniziale</label>
        <input type='number' value={cfg.mapZoom} min={6} max={20}
          onChange={e=>set('mapZoom', Number(e.target.value))} style={{...P.inp, width:80}}/>
      </div>}

      {/* === RESET === */}
      <div style={{marginTop:28, borderTop:'1px solid rgba(255,255,255,0.10)', paddingTop:16}}>
        <button type='button'
          onClick={()=>{ if(window.confirm('Ripristinare i valori predefiniti?')) props.onSettingChange({id:props.id, config:Immutable(defaultConfig) as any}) }}
          style={{padding:'6px 14px', borderRadius:7, border:'1px solid rgba(252,165,165,0.4)', background:'rgba(239,68,68,0.10)', color:'#fca5a5', fontSize:12, cursor:'pointer', fontWeight:600}}>
          ↺ Ripristina predefiniti
        </button>
      </div>

    </div>
  )
}
