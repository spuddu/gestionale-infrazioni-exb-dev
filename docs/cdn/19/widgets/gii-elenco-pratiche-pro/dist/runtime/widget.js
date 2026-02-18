System.register(["jimu-core/emotion","jimu-core","jimu-ui"],function(e,t){var i={},r={},a={};return{setters:[function(e){i.Fragment=e.Fragment,i.jsx=e.jsx,i.jsxs=e.jsxs},function(e){r.DataSourceComponent=e.DataSourceComponent,r.DataSourceManager=e.DataSourceManager,r.DataSourceStatus=e.DataSourceStatus,r.Immutable=e.Immutable,r.React=e.React,r.css=e.css},function(e){a.Button=e.Button,a.Loading=e.Loading}],execute:function(){e((()=>{var e={244:e=>{"use strict";e.exports=r},321:e=>{"use strict";e.exports=a},386:e=>{"use strict";e.exports=i}},t={};function o(i){var r=t[i];if(void 0!==r)return r.exports;var a=t[i]={exports:{}};return e[i](a,a.exports,o),a.exports}o.d=(e,t)=>{for(var i in t)o.o(t,i)&&!o.o(e,i)&&Object.defineProperty(e,i,{enumerable:!0,get:t[i]})},o.o=(e,t)=>Object.prototype.hasOwnProperty.call(e,t),o.r=e=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},o.p="";var n={};return o.p=window.jimuConfig.baseUrl,(()=>{"use strict";o.r(n),o.d(n,{__set_webpack_public_path__:()=>T,default:()=>C});var e=o(386),t=o(244),i=o(321);const r=[{id:"col_pratica",label:"N. pratica",field:"objectid",width:120},{id:"col_data",label:"Data rilev.",field:"data_rilevazione",width:150},{id:"col_stato",label:"Stato sintetico",field:"__stato_sint__",width:220},{id:"col_ufficio",label:"Ufficio",field:"ufficio_zona",width:170},{id:"col_ultimo",label:"Ultimo agg.",field:"__ultimo_agg__",width:170},{id:"col_prossima",label:"Prossima azione",field:"__prossima__",width:240}],a=(0,t.Immutable)({filterTabs:[],columns:r,orderByField:"objectid",orderByDir:"DESC",fieldPratica:"objectid",fieldDataRilevazione:"data_rilevazione",fieldUfficio:"ufficio_zona",fieldPresaDT:"presa_in_carico_DT",fieldDtPresaDT:"dt_presa_in_carico_DT",fieldStatoDT:"stato_DT",fieldDtStatoDT:"dt_stato_DT",fieldEsitoDT:"esito_DT",fieldDtEsitoDT:"dt_esito_DT",fieldPresaDA:"presa_in_carico_DA",fieldDtPresaDA:"dt_presa_in_carico_DA",fieldStatoDA:"stato_DA",fieldDtStatoDA:"dt_stato_DA",fieldEsitoDA:"esito_DA",fieldDtEsitoDA:"dt_esito_DA",presaDaPrendereVal:1,presaPresaVal:2,labelPresaDaPrendere:"Da prendere in carico",labelPresaPresa:"Presa in carico",statoDaPrendereVal:1,statoPresaVal:2,statoIntegrazioneVal:3,statoApprovataVal:4,statoRespintaVal:5,labelStatoDaPrendere:"Da prendere",labelStatoPresa:"Presa in carico",labelStatoIntegrazione:"Integrazione richiesta",labelStatoApprovata:"Approvata",labelStatoRespinta:"Respinta",esitoIntegrazioneVal:1,esitoApprovataVal:2,esitoRespintaVal:3,labelEsitoIntegrazione:"Integrazione richiesta",labelEsitoApprovata:"Approvata",labelEsitoRespinta:"Respinta",whereClause:"1=1",pageSize:200,showHeader:!0,headerPratica:"N. pratica",headerData:"Data rilev.",headerUfficio:"Ufficio",headerStato:"Stato sintetico",headerUltimoAgg:"Ultimo agg.",headerProssima:"Prossima azione",paddingLeftFirstCol:0,gap:12,colWidths:{pratica:120,data:150,stato:220,ufficio:170,ultimo:170,prossima:240},rowGap:8,rowPaddingX:12,rowPaddingY:10,rowMinHeight:44,rowRadius:12,rowBorderWidth:1,rowBorderColor:"rgba(0,0,0,0.08)",zebraEvenBg:"#ffffff",zebraOddBg:"#fbfbfb",hoverBg:"#f2f6ff",selectedBg:"#eaf2ff",selectedBorderColor:"#2f6fed",selectedBorderWidth:2,emptyMessage:"Nessun record trovato (view/filtro/permessi).",errorNoDs:"Configura la fonte dati del widget.",statoChipRadius:999,statoChipPadX:10,statoChipPadY:4,statoChipBorderW:1,statoChipFontWeight:600,statoChipFontSize:12,statoChipFontStyle:"normal",statoChipTextTransform:"none",statoChipLetterSpacing:0,statoBgDaPrendere:"#fff7e6",statoTextDaPrendere:"#7a4b00",statoBorderDaPrendere:"#ffd18a",statoBgPresa:"#eaf7ef",statoTextPresa:"#1f6b3a",statoBorderPresa:"#9ad2ae",statoBgAltro:"#f2f2f2",statoTextAltro:"#333333",statoBorderAltro:"#d0d0d0",maskOuterOffset:12,maskInnerPadding:8,maskBg:"#ffffff",maskBorderColor:"rgba(0,0,0,0.12)",maskBorderWidth:1,maskRadius:12,listTitleText:"Elenco rapporti di rilevazione",listTitleHeight:28,listTitlePaddingBottom:10,listTitlePaddingLeft:0,listTitleFontSize:14,listTitleFontWeight:600,listTitleColor:"rgba(0,0,0,0.85)"});var l=function(e,t,i,r){return new(i||(i=Promise))(function(a,o){function n(e){try{s(r.next(e))}catch(e){o(e)}}function l(e){try{s(r.throw(e))}catch(e){o(e)}}function s(e){var t;e.done?a(e.value):(t=e.value,t instanceof i?t:new i(function(e){e(t)})).then(n,l)}s((r=r.apply(e,t||[])).next())})};function s(e){return new Promise((t,i)=>{const r=window.require;if(r)try{r([e],e=>t(e),e=>i(e))}catch(e){i(e)}else i(new Error("AMD require non disponibile"))})}const d="__stato_sint__",c="__ultimo_agg__",u="__prossima__";function f(e,t){const i=Number(e);return Number.isFinite(i)?i:t}function p(e){return null==e?"":String(e)}function g(e){return(null==e?void 0:e.asMutable)?e.asMutable({deep:!0}):e}function v(e){if(null==e||""===e)return null;if("number"==typeof e&&Number.isFinite(e))return e;if(e instanceof Date)return Number.isNaN(e.getTime())?null:e.getTime();const t=String(e),i=Date.parse(t);return Number.isNaN(i)?null:i}function m(e){if(null==e||""===e)return"";let t=null;if("number"==typeof e)t=new Date(e);else if("string"==typeof e){const i=Date.parse(e);Number.isNaN(i)||(t=new Date(i))}else e instanceof Date&&(t=e);return!t||Number.isNaN(t.getTime())?p(e):new Intl.DateTimeFormat("it-IT",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}).format(t)}function b(e){var t,i,r;try{null===(t=e.selectRecordsByIds)||void 0===t||t.call(e,[])}catch(e){}try{null===(i=e.clearSelection)||void 0===i||i.call(e)}catch(e){}try{null===(r=e.setSelectedRecords)||void 0===r||r.call(e,[])}catch(e){}}function h(e,t){const i=null==e||""===e,r=null==t||""===t;if(i&&r)return 0;if(i)return 1;if(r)return-1;if("number"==typeof e&&"number"==typeof t)return e-t;const a=String(e),o=String(t),n=Date.parse(a),l=Date.parse(o);return Number.isNaN(n)||Number.isNaN(l)?a.localeCompare(o,"it",{numeric:!0,sensitivity:"base"}):n-l}function x(e){return(e||[]).map(e=>`${e.field}:${e.dir}`).join("|")}function D(e){var i,r,a,o,n,l,s,d,c,u;const f=null!==(a=null===(r=null===(i=e.ds)||void 0===i?void 0:i.getRecords)||void 0===r?void 0:r.call(i))&&void 0!==a?a:[],p=null!==(d=null!==(n=null===(o=e.info)||void 0===o?void 0:o.status)&&void 0!==n?n:null===(s=null===(l=e.ds)||void 0===l?void 0:l.getStatus)||void 0===s?void 0:s.call(l))&&void 0!==d?d:t.DataSourceStatus.NotReady,g=p===t.DataSourceStatus.Loading;let v="";if(f.length>0)try{v=JSON.stringify((null===(u=(c=f[0]).getData)||void 0===u?void 0:u.call(c))||{})}catch(e){v=String(f.length)}const m=`${p}:${f.length}:${v}`,b=t.React.useRef("");return t.React.useEffect(()=>{m!==b.current&&(b.current=m,e.onUpdate(e.dsId,f,e.ds,g))},[m]),null}const S="https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_uteniti/FeatureServer/0",y="https://cbsm-hub.maps.arcgis.com",_={1:"TR",2:"TI",3:"RZ",4:"RI",5:"DT",6:"DA"},N={6:100,5:90,4:80,3:70,2:60,1:10};function w(e){return 0===e||1===e||3===e?0:2===e?1:4===e?2:5===e?3:4}function C(o){var n,C,T,j,I,R;const A=null!==(n=o.config)&&void 0!==n?n:a,P=g(null!==(C=o.useDataSources)&&void 0!==C?C:(0,t.Immutable)([])),[B,z]=t.React.useState(null),[$,k]=t.React.useState(!0);t.React.useEffect(()=>{let e=!1;return(()=>{l(this,void 0,void 0,function*(){k(!0);try{const{username:t,isAdmin:i}=yield function(){return l(this,void 0,void 0,function*(){var e,t,i,r,a,o;try{const n=(yield s("esri/identity/IdentityManager")).credentials,l=null!==(t=null===(e=null==n?void 0:n.find)||void 0===e?void 0:e.call(n,e=>{var t;return null===(t=null==e?void 0:e.server)||void 0===t?void 0:t.includes("cbsm-hub")}))&&void 0!==t?t:null==n?void 0:n[0],d=null!==(i=null==l?void 0:l.token)&&void 0!==i?i:"",c=null!==(a=null!==(r=null==l?void 0:l.userId)&&void 0!==r?r:null==l?void 0:l.username)&&void 0!==a?a:"";if(!c||!d)return{username:"",isAdmin:!1};const u=yield fetch(`${y}/sharing/rest/community/self?f=json&token=${encodeURIComponent(d)}`),f=yield u.json(),p="org_admin"===(null==f?void 0:f.role)||(null===(o=null==f?void 0:f.privileges)||void 0===o?void 0:o.includes("portal:admin:viewUsers"))||!1;return{username:String((null==f?void 0:f.username)||c),isAdmin:p}}catch(e){return{username:"",isAdmin:!1}}})}();if(i)z({username:t,ruolo:null,ruoloLabel:"ADMIN",area:null,settore:null,ufficio:null,gruppo:"",isAdmin:!0});else{yield function(){return l(this,void 0,void 0,function*(){var e;try{const t=(yield s("esri/identity/IdentityManager")).credentials;if(null==t?void 0:t.length){const i=null!==(e=t.find(e=>{var t;return null===(t=null==e?void 0:e.server)||void 0===t?void 0:t.includes("cbsm-hub")}))&&void 0!==e?e:t[0];if(null==i?void 0:i.token)return i.token}}catch(e){}return""})}();const i=yield function(e){return l(this,void 0,void 0,function*(){var t,i,r,a,o,n,l,d,c;if(!e)return null;try{const u=new(yield s("esri/layers/FeatureLayer"))({url:S});yield u.load().catch(()=>{});const f=yield u.queryFeatures({where:`username = '${e.replace(/'/g,"''")}'`,outFields:["username","ruolo","area","settore","ufficio","gruppo"],returnGeometry:!1}),p=null!==(t=null==f?void 0:f.features)&&void 0!==t?t:[];if(!p.length)return null;let g=p[0];for(const e of p){const t=Number(null!==(r=null===(i=g.attributes)||void 0===i?void 0:i.ruolo)&&void 0!==r?r:0),s=Number(null!==(o=null===(a=e.attributes)||void 0===a?void 0:a.ruolo)&&void 0!==o?o:0);(null!==(n=N[s])&&void 0!==n?n:0)>(null!==(l=N[t])&&void 0!==l?l:0)&&(g=e)}const v=g.attributes,m=null!=v.ruolo?Number(v.ruolo):null;return{username:e,ruolo:m,ruoloLabel:m&&null!==(d=_[m])&&void 0!==d?d:"",area:null!=v.area?Number(v.area):null,settore:null!=v.settore?Number(v.settore):null,ufficio:null!=v.ufficio?Number(v.ufficio):null,gruppo:String(null!==(c=v.gruppo)&&void 0!==c?c:""),isAdmin:!1}}catch(e){return null}})}(t);e||z(i?Object.assign(Object.assign({},i),{isAdmin:!1}):{username:t,ruolo:null,ruoloLabel:"",area:null,settore:null,ufficio:null,gruppo:"",isAdmin:!1})}}catch(t){e||z(null)}e||k(!1);try{B&&(window.__giiUserRole=B)}catch(e){}})})(),()=>{e=!0}},[]),t.React.useEffect(()=>{if(B)try{window.__giiUserRole=B}catch(e){}},[B]);const F=(null==B?void 0:B.isAdmin)?null:(null==B?void 0:B.ruoloLabel)?function(e){const t=e.toUpperCase();return"TR"===t?"stato_TR":"TI"===t?"stato_TI":"RZ"===t?"stato_RZ":"RI"===t?"stato_RI":"DT"===t?"stato_DT":"DA"===t?"stato_DA":"stato_DT"}(B.ruoloLabel):null,[E,M]=t.React.useState("tutte"),O=t.React.useCallback(e=>F&&"tutte"!==E?e.filter(e=>{var t;const i=((null===(t=e.getData)||void 0===t?void 0:t.call(e))||{})[F],r=null!=i?Number(i):null;return"attesa_mia"===E?0===r||1===r||3===r:"attesa_altri"!==E||(2===r||4===r)}):e,[F,E]),L=t.React.useCallback(e=>F?[...e].sort((e,t)=>{var i,r;const a=(null===(i=e.getData)||void 0===i?void 0:i.call(e))||{},o=(null===(r=t.getData)||void 0===r?void 0:r.call(t))||{};return w(null!=a[F]?Number(a[F]):null)-w(null!=o[F]?Number(o[F]):null)}):e,[F]),V=t.React.useMemo(()=>{const e=g(A.filterTabs)||[],i=[],r=new Map;return P.forEach((a,o)=>{const n=String((null==a?void 0:a.dataSourceId)||""),l=e.find(e=>String((null==e?void 0:e.dataSourceId)||"")===n),s=String((null==l?void 0:l.label)||function(e,i){var r;try{const a=t.DataSourceManager.getInstance().getDataSource(null==e?void 0:e.dataSourceId),o=null===(r=null==a?void 0:a.getLabel)||void 0===r?void 0:r.call(a);return o&&String(o).trim()?String(o):i}catch(e){return i}}(a,`Filtro ${o+1}`));r.has(s)?i[r.get(s)].dsIndices.push(o):(r.set(s,i.length),i.push({label:s,dsIndices:[o]}))}),i},[P.length,A.filterTabs]),W=V.length>1,[U,H]=t.React.useState(0),[G,q]=t.React.useState({}),J=t.React.useRef({}),[X,Y]=t.React.useState(0),Z=t.React.useCallback((e,t,i,r)=>{J.current[e]={recs:t,ds:i,loading:r},Y(e=>e+1)},[]);t.React.useEffect(()=>{const e=[500,1500,3e3].map(e=>setTimeout(()=>{let e=!1;Object.entries(J.current).forEach(([t,i])=>{var r,a,o;if(i.ds){const n=null!==(o=null===(a=(r=i.ds).getRecords)||void 0===a?void 0:a.call(r))&&void 0!==o?o:[];n.length>0&&(J.current[t]=Object.assign(Object.assign({},i),{recs:n,loading:!1}),e=!0)}}),e&&Y(e=>e+1)},e));return()=>e.forEach(e=>clearTimeout(e))},[P.length]);const K=t.React.useMemo(()=>[{field:p(A.orderByField||"objectid"),dir:"ASC"===p(A.orderByDir||"DESC").toUpperCase()?"ASC":"DESC"}],[A.orderByField,A.orderByDir]),[Q,ee]=t.React.useState(K);t.React.useEffect(()=>{x(Q)!==x(K)||ee(K)},[x(K)]);const te=Math.min(U,Math.max(0,V.length-1)),ie=V[te]||V[0],re=o.useDataSources,ae=p(A.whereClause||"1=1"),oe=f(A.pageSize,200),ne=t.React.useMemo(()=>({where:ae,pageSize:oe}),[ae,oe]),le=p(A.fieldPratica||"objectid"),se=p(A.fieldDataRilevazione||"data_rilevazione"),de=p(A.fieldUfficio||"ufficio_zona"),ce=p(A.fieldPresaDT||"presa_in_carico_DT"),ue=p(A.fieldDtPresaDT||"dt_presa_in_carico_DT"),fe=p(A.fieldStatoDT||"stato_DT"),pe=p(A.fieldDtStatoDT||"dt_stato_DT"),ge=p(A.fieldEsitoDT||"esito_DT"),ve=p(A.fieldDtEsitoDT||"dt_esito_DT"),me=p(A.fieldPresaDA||"presa_in_carico_DA"),be=p(A.fieldDtPresaDA||"dt_presa_in_carico_DA"),he=p(A.fieldStatoDA||"stato_DA"),xe=p(A.fieldDtStatoDA||"dt_stato_DA"),De=p(A.fieldEsitoDA||"esito_DA"),Se=p(A.fieldDtEsitoDA||"dt_esito_DA"),ye=f(A.presaDaPrendereVal,1),_e=f(A.presaPresaVal,2),Ne=f(A.statoDaPrendereVal,1),we=f(A.statoPresaVal,2),Ce=f(A.statoIntegrazioneVal,3),Te=f(A.statoApprovataVal,4),je=f(A.statoRespintaVal,5),Ie=f(A.esitoIntegrazioneVal,1),Re=f(A.esitoApprovataVal,2),Ae=f(A.esitoRespintaVal,3),Pe=e=>{const t=Number(e);return Number.isFinite(t)?t===Ne?p(A.labelStatoDaPrendere||"Da prendere"):t===we?p(A.labelStatoPresa||"Presa in carico"):t===Ce?p(A.labelStatoIntegrazione||"Integrazione richiesta"):t===Te?p(A.labelStatoApprovata||"Approvata"):t===je?p(A.labelStatoRespinta||"Respinta"):String(t):p(e)},Be=e=>{const t=Number(e);return Number.isFinite(t)?t===Ie?p(A.labelEsitoIntegrazione||"Integrazione richiesta"):t===Re?p(A.labelEsitoApprovata||"Approvata"):t===Ae?p(A.labelEsitoRespinta||"Respinta"):String(t):p(e)},ze=e=>{const t=null!==e[me]&&void 0!==e[me]&&""!==e[me]||null!==e[he]&&void 0!==e[he]&&""!==e[he]||null!==e[De]&&void 0!==e[De]&&""!==e[De],i=t?"DA":"DT",r=Number(t?e[he]:e[fe]),a=Number(t?e[De]:e[ge]);if(Number.isFinite(a))return{ruolo:i,label:Be(a),statoForChip:$e(a)};if(Number.isFinite(r))return{ruolo:i,label:Pe(r),statoForChip:r};const o=Number(t?e[me]:e[ce]);return Number.isFinite(o)?o===ye?{ruolo:i,label:p(A.labelPresaDaPrendere||"Da prendere in carico"),statoForChip:Ne}:o===_e?{ruolo:i,label:p(A.labelPresaPresa||"Presa in carico"),statoForChip:we}:{ruolo:i,label:String(o),statoForChip:null}:{ruolo:i,label:"\u2014",statoForChip:null}},$e=e=>e===Ie?Ce:e===Re?Te:e===Ae?je:Te,ke=e=>{const t=[v(e[ue]),v(e[pe]),v(e[ve]),v(e[be]),v(e[xe]),v(e[Se])].filter(e=>null!==e);return t&&0!==t.length?Math.max(...t):null},Fe=(e,t)=>{const i=Number("DA"===t?e[me]:e[ce]),r=Number("DA"===t?e[he]:e[fe]),a=Number("DA"===t?e[De]:e[ge]),o=t;return Number.isFinite(i)&&i===ye?`Prendere in carico (${o})`:Number.isFinite(r)&&r===Ce||Number.isFinite(a)&&a===Ie?`Gestire integrazione (${o})`:Number.isFinite(r)&&r===je||Number.isFinite(a)&&a===Ae?`Verificare respinta (${o})`:Number.isFinite(r)&&r===Te||Number.isFinite(a)&&a===Re?`Approvata (${o})`:Number.isFinite(r)&&r===we||Number.isFinite(i)&&i===_e?`Valutare esito (${o})`:`Verificare stato (${o})`},Ee=(e,t)=>{var i;const r=(null===(i=e.getData)||void 0===i?void 0:i.call(e))||{};if(t===d){return ze(r).label}if(t===c)return ke(r);if(t===u){const e=ze(r);return Fe(r,e.ruolo)}return r[t]},Me=x(Q)!==x(K),Oe=t.React.useMemo(()=>{var e;if(!ie)return[];const t=[];for(const i of ie.dsIndices){const r=String((null===(e=P[i])||void 0===e?void 0:e.dataSourceId)||""),a=J.current[r];(null==a?void 0:a.recs)&&t.push(...a.recs)}const i=O(t);return((e,t)=>{if(!t||0===t.length)return e;const i=[...e];return i.sort((e,i)=>{for(const r of t){const t=h(Ee(e,r.field),Ee(i,r.field));if(0!==t)return"ASC"===r.dir?t:-t}return 0}),i})(L(i),Q)},[ie,X,Q,E,F]),Le=t.React.useMemo(()=>{var e;const t=new WeakMap;if(!ie)return t;for(const i of ie.dsIndices){const r=String((null===(e=P[i])||void 0===e?void 0:e.dataSourceId)||""),a=J.current[r];if(null==a?void 0:a.recs)for(const e of a.recs)t.set(e,r)}return t},[ie,X]),Ve=null!==(T=null==ie?void 0:ie.dsIndices.every(e=>{var t;const i=String((null===(t=P[e])||void 0===t?void 0:t.dataSourceId)||""),r=J.current[i];return!r||r.loading}))&&void 0!==T&&T,We=f(A.gap,12),Ue=f(A.paddingLeftFirstCol,0),He=function(e){const t=g(null==e?void 0:e.columns);return Array.isArray(t)&&t.length>0?t.map(e=>({id:String(e.id||""),label:String(e.label||""),field:String(e.field||""),width:f(e.width,150)})):r.map(e=>Object.assign({},e))}(g(A)),Ge=He.map(e=>`${e.width}px`).join(" "),qe=He.reduce((e,t)=>e+t.width,0)+We*Math.max(0,He.length-1)+24,Je=f(A.rowGap,8),Xe=f(A.rowPaddingX,12),Ye=f(A.rowPaddingY,10),Ze=f(A.rowMinHeight,44),Ke=f(A.rowRadius,12),Qe=f(A.rowBorderWidth,1),et=p(A.rowBorderColor||"rgba(0,0,0,0.08)"),tt=f(A.statoChipRadius,999),it=f(A.statoChipPadX,10),rt=f(A.statoChipPadY,4),at=f(A.statoChipBorderW,1),ot=f(A.statoChipFontWeight,600),nt=f(A.statoChipFontSize,12),lt="italic"===A.statoChipFontStyle?"italic":"normal",st=["none","uppercase","lowercase","capitalize"].includes(A.statoChipTextTransform)?A.statoChipTextTransform:"none",dt=f(A.statoChipLetterSpacing,0),ct=t.css`
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;

    .tabBar {
      display: ${W?"flex":"none"};
      gap: 8px;
      padding: 8px 12px;
      border-bottom: 1px solid rgba(0,0,0,0.08);
      background: var(--bs-body-bg, #fff);
    }
    .tabBtn {
      border: 1px solid rgba(0,0,0,0.12);
      background: rgba(0,0,0,0.02);
      color: #111827;
      padding: 8px 10px;
      border-radius: 10px;
      cursor: pointer;
      font-weight: 700;
      font-size: 12px;
      white-space: nowrap;
    }
    .tabBtn.active {
      background: #eaf2ff;
      border-color: #2f6fed;
      color: #1d4ed8;
    }

    .viewport { flex: 1; min-height: 0; overflow: auto; }
    .content { min-width: ${qe}px; padding: 0 12px 10px; }

    .headerWrap {
      position: sticky;
      top: 0;
      z-index: 2;
      background: var(--bs-body-bg, #fff);
      border-bottom: 1px solid rgba(0,0,0,0.08);
      padding: 6px 12px;
      margin: 0 0 8px 0;
    }

    .gridHeader {
      display: grid;
      grid-template-columns: ${Ge};
      column-gap: ${We}px;
      align-items: center;
      min-height: 28px;
    }

    .headerCell {
      display: flex;
      align-items: center;
      min-width: 0;
      font-weight: 700;
      font-size: 12px;
      color: rgba(0,0,0,0.65);
    }

    .hdrBtn {
      width: 100%;
      border: none;
      background: transparent;
      padding: 0;
      margin: 0;
      text-align: left;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: inherit;
      font: inherit;
      line-height: 1;
    }
    .hdrBtn:hover { color: rgba(0,0,0,0.9); }

    .sortBadge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      opacity: 0.85;
    }
    .sortPri {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      border-radius: 4px;
      background: rgba(0,0,0,0.07);
      font-weight: 800;
    }

    .resetBtn {
      padding: 0 10px !important;
      height: 28px !important;
      min-height: 28px !important;
      line-height: 1 !important;
      white-space: nowrap !important;
      font-size: 12px !important;
      font-weight: 700 !important;
    }

    .first { padding-left: ${Ue}px; }

    .list { display: flex; flex-direction: column; }

    .rowCard {
      display: grid;
      grid-template-columns: ${Ge};
      column-gap: ${We}px;
      align-items: center;

      padding: ${Ye}px ${Xe}px;
      min-height: ${Ze}px;

      border-radius: ${Ke}px;
      border: ${Qe}px solid ${et};

      margin-bottom: ${Je}px;
      cursor: pointer;
    }
    .rowCard.even { background: ${p(A.zebraEvenBg||"#ffffff")}; }
    .rowCard.odd  { background: ${p(A.zebraOddBg||"#fbfbfb")}; }
    .rowCard:hover { background: ${p(A.hoverBg||"#f2f6ff")}; }

    .rowCard.selected {
      border-color: ${p(A.selectedBorderColor||"#2f6fed")};
      box-shadow: 0 0 0 ${f(A.selectedBorderWidth,2)}px rgba(47,111,237,0.18);
      background: ${p(A.selectedBg||"#eaf2ff")};
    }

    .cell {
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .chip {
      display: inline-flex;
      align-items: center;
      padding: ${rt}px ${it}px;
      border-radius: ${tt}px;
      border: ${at}px solid rgba(0,0,0,0.12);
      font-weight: ${ot};
      font-size: ${nt}px;
      font-style: ${lt};
      text-transform: ${st};
      letter-spacing: ${dt}px;
      line-height: 1;
      white-space: nowrap;
      max-width: 100%;
    }

    .empty { padding: 14px; color: rgba(0,0,0,0.65); }
  `,ut=t=>{const i=Q.findIndex(e=>e.field===t.field),r=i>=0?Q[i]:null,a=null==r?void 0:r.dir,o=r?(0,e.jsxs)("span",{className:"sortBadge","aria-hidden":!0,children:[(0,e.jsx)("span",{className:"sortPri",children:i+1}),(0,e.jsx)("span",{children:"ASC"===a?"\u2191":"\u2193"})]}):(0,e.jsx)("span",{className:"sortBadge",style:{opacity:.35},"aria-hidden":!0,children:"\u2195"});return(0,e.jsx)("div",{className:"headerCell "+(t.first?"first":""),children:(0,e.jsxs)("button",{type:"button",className:"hdrBtn",onClick:e=>{return i=t.field,r=!0===e.shiftKey,void ee(e=>{const t=[...e],a=t.findIndex(e=>e.field===i);if(a>=0){const e="ASC"===t[a].dir?"DESC":"ASC";return t[a]={field:i,dir:e},r?t:[t[a]]}const o={field:i,dir:"ASC"};return r?[...t,o]:[o]});var i,r},title:"Click: ordina. Shift+Click: ordinamento multiplo.",children:[(0,e.jsx)("span",{children:t.label}),o]})})},ft=Number.isFinite(Number(A.maskOuterOffset))?Number(A.maskOuterOffset):12,pt=Number.isFinite(Number(A.maskInnerPadding))?Number(A.maskInnerPadding):8,gt=String(null!==(j=A.maskBg)&&void 0!==j?j:"#ffffff"),vt=String(null!==(I=A.maskBorderColor)&&void 0!==I?I:"rgba(0,0,0,0.12)"),mt=Number.isFinite(Number(A.maskBorderWidth))?Number(A.maskBorderWidth):1,bt=Number.isFinite(Number(A.maskRadius))?Number(A.maskRadius):12;if(!P.length)return(0,e.jsx)("div",{style:{padding:12},children:p(A.errorNoDs||"Configura la fonte dati del widget.")});const ht=p(A.listTitleText||"Elenco rapporti di rilevazione"),xt=f(A.listTitleHeight,28),Dt=f(A.listTitlePaddingBottom,10),St=f(A.listTitlePaddingLeft,0),yt=f(A.listTitleFontSize,14),_t=f(A.listTitleFontWeight,600),Nt=p(A.listTitleColor||"rgba(0,0,0,0.85)");return(0,e.jsxs)("div",{style:{width:"100%",height:"100%",boxSizing:"border-box",padding:ft,display:"flex",flexDirection:"column",minHeight:0},children:[ht&&(0,e.jsx)("div",{style:{height:xt,paddingBottom:Dt,paddingLeft:St,display:"flex",alignItems:"center",boxSizing:"border-box",flex:"0 0 auto"},children:(0,e.jsx)("span",{style:{fontSize:yt,fontWeight:_t,color:Nt},children:ht})}),(0,e.jsx)("div",{style:{width:"100%",flex:"1 1 auto",minHeight:0,boxSizing:"border-box",border:`${mt}px solid ${vt}`,borderRadius:bt,background:gt,padding:pt,overflow:"hidden"},children:(0,e.jsxs)("div",{css:ct,style:{width:"100%",height:"100%"},children:[P.map((i,r)=>(0,e.jsx)(t.DataSourceComponent,{useDataSource:null==re?void 0:re[r],query:ne,widgetId:o.id,children:(t,r)=>(0,e.jsx)(D,{ds:t,dsId:String((null==i?void 0:i.dataSourceId)||""),info:r,onUpdate:Z})},(null==i?void 0:i.dataSourceId)||r)),!$&&F&&(0,e.jsxs)("div",{style:{display:"flex",gap:8,padding:"8px 12px",borderBottom:"1px solid rgba(0,0,0,0.08)",alignItems:"center",flexWrap:"wrap"},children:[(0,e.jsx)("span",{style:{fontSize:11,color:"#6b7280",marginRight:4},children:(null==B?void 0:B.isAdmin)?"\u{1f464} Admin":`\u{1f464} ${null!==(R=null==B?void 0:B.ruoloLabel)&&void 0!==R?R:""}`}),[{id:"tutte",label:"Tutte le pratiche"},{id:"attesa_mia",label:"In attesa mia"},{id:"attesa_altri",label:"In attesa altri"}].map(t=>(0,e.jsxs)("button",{type:"button",className:"tabBtn "+(E===t.id?"active":""),onClick:()=>M(t.id),children:[t.label,(()=>{var i;if(!ie)return null;const r=[];for(const e of ie.dsIndices){const t=String((null===(i=P[e])||void 0===i?void 0:i.dataSourceId)||""),a=J.current[t];(null==a?void 0:a.recs)&&r.push(...a.recs)}const a="tutte"===t.id?r.length:r.filter(e=>{var i;const r=(null===(i=e.getData)||void 0===i?void 0:i.call(e))||{},a=null!=r[F]?Number(r[F]):null;return"attesa_mia"===t.id?0===a||1===a||3===a:"attesa_altri"===t.id&&(2===a||4===a)}).length;return a>0?(0,e.jsx)("span",{style:{marginLeft:6,background:E===t.id?"#2f6fed":"rgba(0,0,0,0.1)",color:E===t.id?"#fff":"#374151",borderRadius:999,padding:"1px 7px",fontSize:11,fontWeight:700},children:a}):null})()]},t.id))]}),!$&&(null==B?void 0:B.isAdmin)&&(0,e.jsx)("div",{style:{padding:"6px 12px",fontSize:11,color:"#6b7280",borderBottom:"1px solid rgba(0,0,0,0.06)",background:"#fafafa"},children:"\u{1f464} Admin \u2014 visualizzazione completa senza filtri ruolo"}),$&&(0,e.jsx)("div",{style:{padding:"6px 12px",fontSize:11,color:"#6b7280"},children:"Rilevamento ruolo utente\u2026"}),W&&!F&&(0,e.jsx)("div",{className:"tabBar",children:V.map((t,i)=>(0,e.jsx)("button",{type:"button",className:"tabBtn "+(i===U?"active":""),onClick:()=>{const e=V[U];e&&(e.dsIndices.forEach(e=>{var t;const i=String((null===(t=P[e])||void 0===t?void 0:t.dataSourceId)||""),r=J.current[i];(null==r?void 0:r.ds)&&b(r.ds)}),q(t=>{const i=Object.assign({},t);return e.dsIndices.forEach(e=>{var t;delete i[String((null===(t=P[e])||void 0===t?void 0:t.dataSourceId)||"")]}),i})),H(i)},title:t.label,children:t.label},t.label))}),(0,e.jsx)("div",{className:"viewport",children:(0,e.jsxs)("div",{className:"content",children:[Ve&&(0,e.jsx)(i.Loading,{}),!Ve&&0===Oe.length&&(0,e.jsx)("div",{className:"empty",children:p(A.emptyMessage||"Nessun record trovato.")}),Oe.length>0&&(0,e.jsxs)(e.Fragment,{children:[!1!==A.showHeader&&(0,e.jsxs)("div",{className:"headerWrap",children:[(0,e.jsx)("div",{style:{display:"flex",justifyContent:"flex-end",marginBottom:6},children:Me&&(0,e.jsx)(i.Button,{size:"sm",type:"tertiary",className:"resetBtn",onClick:()=>ee(K),title:"Ripristina ordinamento di default","aria-label":"Reset ordinamento",children:"Reset"})}),(0,e.jsx)("div",{className:"gridHeader",children:He.map((t,i)=>(0,e.jsx)(ut,{first:0===i,label:t.label,field:t.field},t.id))})]}),(0,e.jsx)("div",{className:"list",children:Oe.map((i,r)=>{var a,o,n;const l=(null===(a=i.getData)||void 0===a?void 0:a.call(i))||{},s=Number(l.OBJECTID),f=String(null!==(n=null===(o=i.getId)||void 0===o?void 0:o.call(i))&&void 0!==n?n:s),g=Le.get(i)||"",v=String(le||"").toLowerCase(),h="objectid"===v||"oid"===v||"object_id"===v?function(e){var t,i,r,a,o;const n=(null===(t=null==e?void 0:e.getData)||void 0===t?void 0:t.call(e))||{},l=null!==(a=null!==(r=null!==(i=null==n?void 0:n.OBJECTID)&&void 0!==i?i:null==n?void 0:n.ObjectId)&&void 0!==r?r:null==n?void 0:n.objectid)&&void 0!==a?a:null==n?void 0:n.objectId;let s="TR";const d=null==n?void 0:n.origine_pratica;if(2===d||"2"===d)s="TI";else if(1===d||"1"===d)s="TR";else{const t=String((null===(o=null==e?void 0:e.dataSource)||void 0===o?void 0:o.id)||"").toLowerCase();(t.includes("gii_pratiche")||t.includes("schema")||t.includes("ti"))&&(s="TI")}return null!=l?`${s}-${l}`:`${s}-?`}(i):p(l[le]),x=(m(l[se]),p(l[de]),ze(l)),D=p(x.label),S=x.statoForChip,y=ke(l),_=y?m(y):"\u2014",N=Fe(l,x.ruolo),w=G[g]===f,C=r%2==0;return(0,e.jsx)("div",{className:`rowCard ${C?"even":"odd"} ${w?"selected":""}`,onClick:()=>{if(w)q({}),Object.keys(J.current).forEach(e=>{const t=J.current[e];(null==t?void 0:t.ds)&&b(t.ds)}),P.forEach(e=>{var i,r,a;const o=String((null==e?void 0:e.dataSourceId)||"");try{const e=t.DataSourceManager.getInstance().getDataSource(o);e&&b(e);const n=(null===(i=null==e?void 0:e.parentDataSource)||void 0===i?void 0:i.id)||(null===(a=null===(r=null==e?void 0:e.getMainDataSource)||void 0===r?void 0:r.call(e))||void 0===a?void 0:a.id);if(n){const e=t.DataSourceManager.getInstance().getDataSource(n);e&&b(e)}}catch(e){}});else{Object.keys(J.current).forEach(e=>{const t=J.current[e];(null==t?void 0:t.ds)&&b(t.ds)}),q({[g]:f});const e=J.current[g];(null==e?void 0:e.ds)&&function(e,t,i){var r,a,o;try{null===(r=e.selectRecordsByIds)||void 0===r||r.call(e,[i])}catch(e){}try{null===(a=e.selectRecordById)||void 0===a||a.call(e,i)}catch(e){}try{null===(o=e.setSelectedRecords)||void 0===o||o.call(e,[t])}catch(e){}}(e.ds,i,f),ie&&ie.dsIndices.forEach(e=>{var r,a,o,n,l,s,d;const c=String((null===(r=P[e])||void 0===r?void 0:r.dataSourceId)||"");if(c===g)return;const u=J.current[c];if(null==u?void 0:u.ds){try{null===(o=(a=u.ds).setSelectedRecords)||void 0===o||o.call(a,[i])}catch(e){}try{null===(l=(n=u.ds).selectRecordsByIds)||void 0===l||l.call(n,[f])}catch(e){}}try{const e=t.DataSourceManager.getInstance().getDataSource(c),r=(null==e?void 0:e.parentDataSource)||(null===(s=null==e?void 0:e.getMainDataSource)||void 0===s?void 0:s.call(e));if(r)try{null===(d=r.setSelectedRecords)||void 0===d||d.call(r,[i])}catch(e){}}catch(e){}})}},children:He.map((t,i)=>{const r=t.field;if(r===d)return(0,e.jsx)("div",{className:0===i?"cell first":"cell",title:D,children:(0,e.jsx)("span",{className:"chip",style:(a=Number.isFinite(Number(S))?Number(S):null,a===Ne?{background:p(A.statoBgDaPrendere||"#fff7e6"),color:p(A.statoTextDaPrendere||"#7a4b00"),borderColor:p(A.statoBorderDaPrendere||"#ffd18a")}:a===we?{background:p(A.statoBgPresa||"#eaf7ef"),color:p(A.statoTextPresa||"#1f6b3a"),borderColor:p(A.statoBorderPresa||"#9ad2ae")}:{background:p(A.statoBgAltro||"#f2f2f2"),color:p(A.statoTextAltro||"#333333"),borderColor:p(A.statoBorderAltro||"#d0d0d0")}),children:D})},t.id);var a;if(r===c)return(0,e.jsx)("div",{className:0===i?"cell first":"cell",title:_,children:_},t.id);if(r===u)return(0,e.jsx)("div",{className:0===i?"cell first":"cell",title:N,children:N},t.id);const o=r.toLowerCase();if("objectid"===o||"oid"===o||"object_id"===o)return(0,e.jsx)("div",{className:0===i?"cell first":"cell",title:h,children:h},t.id);if(o.startsWith("data_")||o.startsWith("dt_")){const a=m(l[r]);return(0,e.jsx)("div",{className:0===i?"cell first":"cell",title:a,children:a},t.id)}const n=p(l[r]);return(0,e.jsx)("div",{className:0===i?"cell first":"cell",title:n,children:n},t.id)})},`${g}_${f}`)})})]})]})})]})})]})}function T(e){o.p=e}})(),n})())}}});