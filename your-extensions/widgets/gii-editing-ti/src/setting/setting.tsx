/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx, Immutable, DataSourceTypes, DataSourceManager, type UseDataSource } from 'jimu-core'
import type { AllWidgetSettingProps } from 'jimu-for-builder'
import { DataSourceSelector } from 'jimu-ui/advanced/data-source-selector'
import { MapWidgetSelector } from 'jimu-ui/advanced/setting-components'
import type { IMConfig } from '../config'
import { defaultConfig } from '../config'

function asJs<T=any>(v:any):T { return v?.asMutable?v.asMutable({deep:true}):v }


type FieldOpt = { name: string; alias: string; type?: string }

function toImmutableCfg(base:any, patch:Record<string, any>) {
  let next = base?.set ? base : Immutable(base || {})
  Object.entries(patch).forEach(([k, v]) => {
    const val = Array.isArray(v) ? Immutable(v as any) : v
    next = next.set(k, val)
  })
  return next
}


function parseCoordInput(raw:any): number {
  const s = String(raw ?? '').trim()
  if (!s) return 0
  const normalized = s.replace(/\s+/g, '').replace(',', '.')
  const n = Number(normalized)
  return Number.isFinite(n) ? n : 0
}

function formatCoordInput(v:any): string {
  if (v == null) return ''
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : ''
  const s = String(v).trim()
  return s
}

function getSchemaSnapshot(dsId: string) {
  const ds: any = dsId ? DataSourceManager.getInstance().getDataSource(dsId) : null
  const url = String(ds?.getDataSourceJson?.()?.url || ds?.dataSourceJson?.url || '').trim()
  let label = String(ds?.getLabel?.() || '').trim()
  if (!label && url) {
    try { label = decodeURIComponent(url.split('/').slice(-2, -1)[0] || '') } catch {}
  }
  const fobj = ds?.getSchema?.()?.fields || {}
  const fields: FieldOpt[] = Object.keys(fobj).map(name => {
    const f = fobj[name] || {}
    return { name, alias: String(f.alias || f.label || f.title || name), type: String(f.type || '') }
  }).sort((a, b) => (a.alias || a.name).localeCompare(b.alias || b.name, 'it', { sensitivity: 'base' }))
  return { url, label, fields }
}

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

  const useDsJs:any[] = asJs(props.useDataSources ?? Immutable([])) || []
  const primaryDsId = String(useDsJs?.[0]?.dataSourceId || '')

  React.useEffect(() => {
    if (useDsJs.length > 0) {
      const snap = getSchemaSnapshot(primaryDsId)
      const nextCfg = toImmutableCfg(props.config || Immutable(defaultConfig) as any, {
        schemaLayerUrl: snap.url,
        schemaLayerLabel: snap.label,
        schemaFields: snap.fields
      })
      props.onSettingChange({ id:props.id, useDataSources: Immutable([]) as any, useDataSourcesEnabled:false, config: nextCfg })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useDsJs.length, primaryDsId])

  const onDsChange = (useDataSources: UseDataSource[]) => {
    const useDsJs:any[] = asJs(useDataSources ?? Immutable([])) || []
    const primaryDsId = String(useDsJs?.[0]?.dataSourceId || '')
    const snap = getSchemaSnapshot(primaryDsId)
    const nextCfg = toImmutableCfg(props.config || Immutable(defaultConfig) as any, {
      schemaLayerUrl: snap.url,
      schemaLayerLabel: snap.label,
      schemaFields: snap.fields
    })
    props.onSettingChange({ id:props.id, useDataSources: Immutable([]) as any, useDataSourcesEnabled:false, config: nextCfg })
  }
  const onToggleDs = (_enabled: boolean) =>
    props.onSettingChange({ id:props.id, useDataSourcesEnabled: false })

  return (
    <div style={P.wrap}>

      {/* === DATASOURCE === */}
      <Acc id='datasource' label='📊 Datasource' open={isOpen('datasource')} onToggle={()=>toggle('datasource')}/>
      {isOpen('datasource') && <div>
        <div style={P.hint}>Seleziona il layer solo per acquisire schema e alias. Il widget li salva in config e rimuove le useDataSources legacy dall’istanza.</div>
        <div style={{ marginTop:10 }}>
          <DataSourceSelector
            widgetId={props.id}
            types={Immutable([DataSourceTypes.FeatureLayer])}
            isMultiple={false}
            useDataSources={Immutable([]) as any}
            useDataSourcesEnabled={false as any}
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

        <div style={{marginTop:14, borderTop:'1px solid rgba(255,255,255,0.07)', paddingTop:12}}>
          <div style={{fontSize:11,fontWeight:700,color:'#93c5fd',marginBottom:8}}>Colore sfondo per modalità</div>
          <div style={{display:'grid',gap:10}}>
            <div>
              <label style={P.lbl}>🟢 Nuovo rapporto</label>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <input type='color' value={/^#[0-9a-fA-F]{3,8}$/.test(cfg.modeBgCreate||'') ? cfg.modeBgCreate : '#f0fdf400'}
                  onChange={e=>set('modeBgCreate',e.target.value)}
                  style={{width:30,height:26,padding:2,border:'1px solid rgba(255,255,255,0.15)',borderRadius:5,cursor:'pointer',background:'transparent',flexShrink:0}}/>
                <input type='text' value={cfg.modeBgCreate||'#f0fdf400'} onChange={e=>set('modeBgCreate',e.target.value)}
                  placeholder='#f0fdf400' style={{...P.inp,flex:1,fontSize:11}}/>
              </div>
              <div style={P.hint}>Sfondo quando TI sta creando un nuovo rapporto.</div>
            </div>
            <div>
              <label style={P.lbl}>🔵 Modifica rapporto</label>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <input type='color' value={/^#[0-9a-fA-F]{3,8}$/.test(cfg.modeBgEdit||'') ? cfg.modeBgEdit : '#eff6ff'}
                  onChange={e=>set('modeBgEdit',e.target.value)}
                  style={{width:30,height:26,padding:2,border:'1px solid rgba(255,255,255,0.15)',borderRadius:5,cursor:'pointer',background:'transparent',flexShrink:0}}/>
                <input type='text' value={cfg.modeBgEdit||'#eff6ff'} onChange={e=>set('modeBgEdit',e.target.value)}
                  placeholder='#eff6ff' style={{...P.inp,flex:1,fontSize:11}}/>
              </div>
              <div style={P.hint}>Sfondo quando TI sta modificando un rapporto esistente.</div>
            </div>
          </div>
        </div>
      </div>}


      {/* === NUOVA PRATICA === */}
      <Acc id='nuova' label='🆕 Nuova pratica (inline)' open={isOpen('nuova')} onToggle={()=>toggle('nuova')}/>
      {isOpen('nuova') && <div>
        <label style={P.chk}>
          <input type='checkbox' checked={cfg.enableCreateWithoutSelection !== false} onChange={e=>set('enableCreateWithoutSelection', e.target.checked)}/>
          Abilita creazione senza selezione (pagina "Nuova pratica")
        </label>
        <div style={P.hint}>Se attivo, il widget entra in modalità CREATE quando non c&apos;è alcuna selezione nell&apos;Elenco.</div>

        <label style={P.lbl}>Coordinate ufficio (WGS84)</label>
        <div style={{ display:'flex', gap: 10, alignItems:'center', flexWrap:'wrap' }}>
          <div style={{ flex:'0 0 auto' }}>
            <div style={{ ...P.hint, marginTop: 0 }}>Lon</div>
            <input type='text' inputMode='decimal' value={formatCoordInput(cfg.officeLonWgs84)}
              onChange={e=>set('officeLonWgs84', parseCoordInput(e.target.value))} placeholder='es. 9.123456 o 9,123456' style={{...P.inp, width:160}}/>
          </div>
          <div style={{ flex:'0 0 auto' }}>
            <div style={{ ...P.hint, marginTop: 0 }}>Lat</div>
            <input type='text' inputMode='decimal' value={formatCoordInput(cfg.officeLatWgs84)}
              onChange={e=>set('officeLatWgs84', parseCoordInput(e.target.value))} placeholder='es. 39.123456 o 39,123456' style={{...P.inp, width:160}}/>
          </div>
        </div>
        <div style={P.hint}>Usate come geometria di default quando la localizzazione non è obbligatoria (req_point=0) e l&apos;utente non clicca in mappa. Accetta sia il punto sia la virgola come separatore decimale.</div>
      </div>}


      {/* === MAPPA === */}
      <Acc id='mappa' label='🗺 Mappa' open={isOpen('mappa')} onToggle={()=>toggle('mappa')}/>
      {isOpen('mappa') && <div>
        <label style={P.lbl}>Widget Mappa di pagina</label>
        <div style={{ marginTop: 6 }}>
          <MapWidgetSelector
            onSelect={(ids: string[]) => set('useMapWidgetIds', ids)}
            useMapWidgetIds={cfg.useMapWidgetIds}
          />
        </div>
        <div style={P.hint}>Seleziona il widget Mappa presente nella pagina (es. la mappa accanto). Il widget ascolta i click per la localizzazione della violazione e mostra un segnaposto nel punto cliccato.</div>
      </div>}


      {/* === STILE FORM (label + intestazioni sezione + divisori) === */}
      <Acc id='stileform' label='🎨 Stile form' open={isOpen('stileform')} onToggle={()=>toggle('stileform')}/>
      {isOpen('stileform') && <div>

        <div style={{fontSize:11,fontWeight:700,color:'#93c5fd',marginBottom:8}}>Label dei campi</div>
        <div style={P.hint}>Colore e dimensione delle etichette sopra ogni campo (es. Via, Città, Tecnico istruttore…)</div>
        <div style={{display:'flex',alignItems:'center',gap:6,marginTop:8}}>
          <input type='color' value={/^#[0-9a-fA-F]{3,8}$/.test(cfg.formLabelColor||'') ? cfg.formLabelColor : '#6b7280'}
            onChange={e=>set('formLabelColor',e.target.value)}
            style={{width:30,height:26,padding:2,border:'1px solid rgba(255,255,255,0.15)',borderRadius:5,cursor:'pointer',background:'transparent',flexShrink:0}}/>
          <input type='text' value={cfg.formLabelColor||'#6b7280'} onChange={e=>set('formLabelColor',e.target.value)}
            placeholder='#6b7280' style={{...P.inp,flex:1,fontSize:11}}/>
        </div>
        <label style={P.lbl}>Dimensione font (px)</label>
        <input type='number' value={cfg.formLabelFontSize??12} min={9} max={18}
          onChange={e=>set('formLabelFontSize', Number(e.target.value))} style={{...P.inp, width:80}}/>

        <div style={{marginTop:16,borderTop:'1px solid rgba(255,255,255,0.07)',paddingTop:12}}>
          <div style={{fontSize:11,fontWeight:700,color:'#93c5fd',marginBottom:8}}>Intestazioni di sezione</div>
          <div style={P.hint}>Colore e dimensione dei titoli di gruppo (es. Trasgressore, Art. 15, Descrizione…)</div>
          <div style={{display:'flex',alignItems:'center',gap:6,marginTop:8}}>
            <input type='color' value={/^#[0-9a-fA-F]{3,8}$/.test(cfg.sectionHeaderColor||'') ? cfg.sectionHeaderColor : '#1d4ed8'}
              onChange={e=>set('sectionHeaderColor',e.target.value)}
              style={{width:30,height:26,padding:2,border:'1px solid rgba(255,255,255,0.15)',borderRadius:5,cursor:'pointer',background:'transparent',flexShrink:0}}/>
            <input type='text' value={cfg.sectionHeaderColor||'#1d4ed8'} onChange={e=>set('sectionHeaderColor',e.target.value)}
              placeholder='#1d4ed8' style={{...P.inp,flex:1,fontSize:11}}/>
          </div>
          <label style={P.lbl}>Dimensione font (px)</label>
          <input type='number' value={cfg.sectionHeaderFontSize??11} min={9} max={18}
            onChange={e=>set('sectionHeaderFontSize', Number(e.target.value))} style={{...P.inp, width:80}}/>
        </div>

        <div style={{marginTop:16,borderTop:'1px solid rgba(255,255,255,0.07)',paddingTop:12}}>
          <div style={{fontSize:11,fontWeight:700,color:'#93c5fd',marginBottom:8}}>Divisori tra sezioni</div>
          <div style={P.hint}>Colore e spessore della linea sotto ogni intestazione (Art. 15, Art. 16-17…)</div>
          <div style={{display:'flex',alignItems:'center',gap:6,marginTop:8}}>
            <input type='color' value={/^#[0-9a-fA-F]{3,8}$/.test(cfg.sectionDividerColor||'') ? cfg.sectionDividerColor : '#bfdbfe'}
              onChange={e=>set('sectionDividerColor',e.target.value)}
              style={{width:30,height:26,padding:2,border:'1px solid rgba(255,255,255,0.15)',borderRadius:5,cursor:'pointer',background:'transparent',flexShrink:0}}/>
            <input type='text' value={cfg.sectionDividerColor||'#bfdbfe'} onChange={e=>set('sectionDividerColor',e.target.value)}
              placeholder='#bfdbfe' style={{...P.inp,flex:1,fontSize:11}}/>
          </div>
          <label style={P.lbl}>Spessore (px)</label>
          <input type='number' value={cfg.sectionDividerWidth??2} min={0} max={6}
            onChange={e=>set('sectionDividerWidth', Number(e.target.value))} style={{...P.inp, width:80}}/>
        </div>

        <div style={{marginTop:14,padding:10,borderRadius:8,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
          <div style={{fontSize:10.5,fontWeight:600,color:'#93c5fd',marginBottom:6}}>Anteprima</div>
          <div style={{background:'#fff',borderRadius:6,padding:10}}>
            <div style={{fontSize:cfg.sectionHeaderFontSize??11,fontWeight:700,color:cfg.sectionHeaderColor||'#1d4ed8',textTransform:'uppercase',letterSpacing:1,borderBottom:`${cfg.sectionDividerWidth??2}px solid ${cfg.sectionDividerColor||'#bfdbfe'}`,paddingBottom:4,marginBottom:8}}>
              Trasgressore
            </div>
            <div style={{fontSize:cfg.formLabelFontSize??12,color:cfg.formLabelColor||'#6b7280',marginBottom:4}}>Tipologia soggetto</div>
            <div style={{padding:'5px 8px',borderRadius:6,border:'1px solid rgba(0,0,0,0.15)',fontSize:12,color:'#9ca3af'}}>— seleziona —</div>
            <div style={{fontSize:cfg.formLabelFontSize??12,color:cfg.formLabelColor||'#6b7280',marginBottom:4,marginTop:8}}>Via</div>
            <div style={{padding:'5px 8px',borderRadius:6,border:'1px solid rgba(0,0,0,0.15)',fontSize:12,color:'#374151'}}>Via Roma 1</div>
          </div>
        </div>
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
