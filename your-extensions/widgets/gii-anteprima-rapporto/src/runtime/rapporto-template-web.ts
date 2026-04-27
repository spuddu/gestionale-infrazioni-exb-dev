// =================================================================
// Template HTML nativo per Anteprima Rapporto Tecnico
// =================================================================
// Replica fedele del layout Word (rapporto-template.docx).
// Due pagine A4 esplicite con split esplicito, side-by-side.
// Stessi {{placeholder}} di rapporto-template.ts (gii-azioni).
// Altezze e proporzioni colonne estratte dal docx originale.
// =================================================================

const LOGO_B64 = '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';

const PAGE_CSS = `
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 9pt; color: #333; background: transparent; }
.page {
  width: 210mm; min-height: 297mm; padding: 12mm 15mm 10mm 15mm;
  background: #fff; position: relative;
}
@media print {
  .page { page-break-after: always; padding: 10mm 15mm; }
  .page:last-child { page-break-after: auto; }
}
:root {
  --hdr: #005B8C;
  --bg-label: #DAEAF5;
  --bg-hdr-light: #C5DFF0;
  --border: #8DB3D4;
}
/* ── Logo ── */
.logo-bar { text-align: center; margin-bottom: 4px; }
.logo-bar img { height: 28mm; }
/* ── Titolo ── */
.doc-title { text-align: center; color: var(--hdr); font-size: 10pt; font-weight: bold; margin-bottom: 1px; }
.doc-subtitle { text-align: center; color: var(--hdr); font-size: 7.5pt; font-style: italic; margin-bottom: 6px; }
/* ── Generici tabella ── */
table { border-collapse: collapse; width: 100%; }
td, th { border: 1px solid var(--border); vertical-align: middle; }

/* ═══════════════════ TABELLA 1 — Pagina 1 ═══════════════════ */
/* Banner blu (RAPPORTO TECNICO) */
.t1-banner td { background: var(--hdr); color: #fff; font-weight: bold; font-size: 10pt;
  text-align: center; height: 7mm; padding: 2px; }
/* Riga pratica info (30mm) */
.t1-pratica td { text-align: center; color: var(--hdr); font-weight: bold; font-size: 9pt;
  height: 30mm; line-height: 1.5; padding: 4px; }
/* Riga sottoscritto (6mm) */
.t1-sotto td { height: 6mm; font-size: 8pt; padding: 1px 4px; }
.t1-sotto .lbl { background: var(--bg-label); color: var(--hdr); font-weight: bold; white-space: nowrap; }
/* Riga HA RILEVATO (13.8mm) */
.t1-haril td { text-align: center; font-weight: bold; font-size: 9pt; color: var(--hdr);
  height: 13.8mm; padding: 2px; }
/* Header infrazioni — riga 1: sfondo blu scuro */
.t1-hdr1 th { background: var(--hdr); color: #fff; font-weight: bold; font-size: 7.5pt;
  text-align: center; height: 7mm; padding: 2px 3px; }
/* Header infrazioni — riga 2: sfondo celeste label */
.t1-hdr2 td { background: var(--bg-label); color: var(--hdr); font-weight: bold; font-size: 7.5pt;
  text-align: center; height: 6mm; padding: 1px 3px; }
/* Righe dati articoli (6mm) */
.t1-art td { height: 6mm; font-size: 7.5pt; text-align: center; padding: 1px 3px; }
.t1-art td.desc { text-align: left; font-size: 7pt; }
.t1-art td.chk { font-weight: bold; }
.t1-art:nth-child(odd) td { background: #f5f9fc; }
/* Rimborso */
.t1-rimb td { font-size: 7.5pt; font-weight: bold; color: var(--hdr); background: var(--bg-label);
  height: 6mm; text-align: left; padding: 1px 6px; }
/* Importo (6mm) */
.t1-imp td { height: 6mm; font-size: 8pt; padding: 1px 6px; }
.t1-imp .lbl { font-weight: bold; font-size: 7.5pt; }
.t1-imp .note { font-size: 7pt; font-style: italic; color: #666; }

/* ═══════════════════ TABELLA 2 — Pagina 2 ═══════════════════ */
/* Banner sezione (10mm) */
.t2-banner td { background: var(--hdr); color: #fff; text-align: center;
  font-weight: bold; font-size: 9pt; height: 10mm; padding: 2px; }
/* Label campo (6mm, celeste) */
.t2-flabel td { background: var(--bg-label); color: var(--hdr); font-weight: bold;
  font-size: 8pt; height: 6mm; padding: 2px 6px; }
/* Campi testo con altezze fisse dal docx */
.t2-fval td { height: 35mm; font-size: 8.5pt; padding: 3px 6px; vertical-align: top; white-space: pre-wrap; }
.t2-fval-md td { height: 20mm; font-size: 8.5pt; padding: 3px 6px; vertical-align: top; white-space: pre-wrap; }
/* Sub-label (6mm) */
.t2-sub td { color: var(--hdr); font-weight: bold; font-size: 8pt; height: 6mm; padding: 2px 6px; }
/* Sezione titolo (DATI TRASGRESSORE, Dati generali, Residenza, FIRMATO) */
.t2-sectitle td { background: var(--hdr); color: #fff; text-align: center;
  font-weight: bold; font-size: 9pt; height: 10mm; padding: 2px; }
.t2-subsec td { background: var(--bg-hdr-light); color: var(--hdr); font-weight: bold;
  font-size: 8.5pt; height: 6mm; padding: 2px 6px; }
/* Riga dati trasgressore (6mm, 4 colonne) */
.t2-data td { height: 6mm; font-size: 8.5pt; padding: 2px 6px; }
.t2-data .lbl { background: var(--bg-label); color: var(--hdr); font-weight: bold; font-size: 8pt; white-space: nowrap; }
/* Riga trasgressore presente (6mm, nessun sfondo su label) */
.t2-pres td { height: 6mm; font-size: 8.5pt; padding: 2px 6px; }
.t2-pres .pres-lbl { font-weight: bold; color: var(--hdr); font-size: 8pt; }
.t2-pres .firma-lbl { text-align: center; font-weight: bold; color: var(--hdr); font-size: 8pt; }
/* Firme (6mm) */
.t2-firma td { height: 6mm; font-size: 8.5pt; padding: 2px 6px; }
.t2-firma .lbl { font-weight: bold; color: var(--hdr); }
`;

export const RAPPORTO_WEB_TEMPLATE = `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="utf-8">
<title>Rapporto Tecnico di Rilevazione</title>
<style>${PAGE_CSS}</style>
</head>
<body>

<!-- ═══════════════ PAGINA 1 ═══════════════ -->
<div class="page" id="page1">

  <div class="logo-bar"><img src="data:image/jpeg;base64,${LOGO_B64}" alt="CBSM"></div>
  <div class="doc-title">Violazione delle Norme Generali sulla distribuzione dell&rsquo;acqua ad uso irriguo</div>
  <div class="doc-subtitle">(approvate con delibera del Consiglio dei Delegati n. 7 del 28 giugno 2024)</div>

  <table>
    <colgroup>
      <col style="width:4.8%">  <!-- (x)          447  -->
      <col style="width:43.9%"> <!-- Descrizione  4134 -->
      <col style="width:10.3%"> <!-- Articolo     965  -->
      <col style="width:10.2%"> <!-- Dichiarata   964  -->
      <col style="width:10.2%"> <!-- Irrigata     964  -->
      <col style="width:10.3%"> <!-- Gravità      964  -->
      <col style="width:10.3%"> <!-- Recidiva     967  -->
    </colgroup>
    <!-- Banner -->
    <tr class="t1-banner"><td colspan="7">RAPPORTO TECNICO DI RILEVAZIONE</td></tr>
    <!-- Pratica info -->
    <tr class="t1-pratica"><td colspan="7">N: {{cod_pratica}} &ndash; ANNO: {{anno}}<br>AREA {{area_label}}<br>SETTORE {{settore_label}}</td></tr>
    <!-- Sottoscritto -->
    <tr class="t1-sotto">
      <td class="lbl">Il sottoscritto</td>
      <td colspan="2">{{tecnico_rilevatore}}</td>
      <td class="lbl">il giorno</td>
      <td>{{data_rilevazione}}</td>
      <td class="lbl">alle ore</td>
      <td>{{ora_rilevazione}}</td>
    </tr>
    <!-- HA RILEVATO -->
    <tr class="t1-haril"><td colspan="7">HA RILEVATO LE SEGUENTI INFRAZIONI</td></tr>
    <!-- Header riga 1: Infrazione(colspan 3)=59%, Superfici(colspan 2)=20.4%, Gravità=10.3%, Recidiva=10.3% -->
    <tr class="t1-hdr1">
      <th colspan="3">Infrazione</th>
      <th colspan="2">Superfici (m&sup2;)</th>
      <th>Gravit&agrave;</th>
      <th>Recidiva</th>
    </tr>
    <!-- Header riga 2: sub-labels, sfondo celeste -->
    <tr class="t1-hdr2">
      <td>(x)</td>
      <td>Descrizione</td>
      <td>Articolo</td>
      <td>Dichiarata</td>
      <td>Irrigata</td>
      <td>(da 1 a 4)</td>
      <td>(x)</td>
    </tr>
    <!-- Righe dati articoli -->
    <tr class="t1-art"><td class="chk">{{x_art08}}</td><td class="desc">Violazione servizio reperibilit&agrave;</td><td>8</td><td>{{sup_dich_art08}}</td><td>{{sup_irr_art08}}</td><td>{{grado_art08}}</td><td>{{recidiva_art08}}</td></tr>
    <tr class="t1-art"><td class="chk">{{x_art12}}</td><td class="desc">Negato accesso ai fondi (al personale consortile)</td><td>12</td><td>{{sup_dich_art12}}</td><td>{{sup_irr_art12}}</td><td>{{grado_art12}}</td><td>{{recidiva_art12}}</td></tr>
    <tr class="t1-art"><td class="chk">{{x_art15}}</td><td class="desc">Prelievo abusivo d&rsquo;acqua</td><td>15</td><td>{{sup_dich_art15}}</td><td>{{sup_irr_art15}}</td><td></td><td>{{recidiva_art15}}</td></tr>
    <tr class="t1-art"><td class="chk">{{x_art16}}</td><td class="desc">Inosservanza termini presentazione comunicazioni (comunicazione di irrigazione tardiva)</td><td>16</td><td>{{sup_dich_art16}}</td><td>{{sup_irr_art16}}</td><td>{{grado_art16}}</td><td>{{recidiva_art16}}</td></tr>
    <tr class="t1-art"><td class="chk">{{x_art17}}</td><td class="desc">Inosservanza termini presentazione comunicazioni (comunicazione di variazione o di rinuncia tardive)</td><td>17</td><td>{{sup_dich_art17}}</td><td>{{sup_irr_art17}}</td><td>{{grado_art17}}</td><td>{{recidiva_art17}}</td></tr>
    <tr class="t1-art"><td class="chk">{{x_art27}}</td><td class="desc">Spreco d&rsquo;acqua / Uso negligente risorsa idrica</td><td>27</td><td>{{sup_dich_art27}}</td><td>{{sup_irr_art27}}</td><td>{{grado_art27}}</td><td>{{recidiva_art27}}</td></tr>
    <tr class="t1-art"><td class="chk">{{x_art28}}</td><td class="desc">Violazione prescrizioni del Consorzio</td><td>28</td><td>{{sup_dich_art28}}</td><td>{{sup_irr_art28}}</td><td>{{grado_art28}}</td><td>{{recidiva_art28}}</td></tr>
    <tr class="t1-art"><td class="chk">{{x_art29}}</td><td class="desc">Violazione termini restituzione attrezzature</td><td>29</td><td>{{sup_dich_art29}}</td><td>{{sup_irr_art29}}</td><td>{{grado_art29}}</td><td>{{recidiva_art29}}</td></tr>
    <tr class="t1-art"><td class="chk">{{x_art30}}</td><td class="desc">Danneggiamento e/o perdita attrezzature</td><td>30</td><td>{{sup_dich_art30}}</td><td>{{sup_irr_art30}}</td><td>{{grado_art30}}</td><td>{{recidiva_art30}}</td></tr>
    <tr class="t1-art"><td class="chk">{{x_art31}}</td><td class="desc">Mancata segnalazione guasti</td><td>31</td><td>{{sup_dich_art31}}</td><td>{{sup_irr_art31}}</td><td>{{grado_art31}}</td><td>{{recidiva_art31}}</td></tr>
    <tr class="t1-art"><td class="chk">{{x_art32}}</td><td class="desc">Negato accesso ai fondi (al consorziato)</td><td>32</td><td>{{sup_dich_art32}}</td><td>{{sup_irr_art32}}</td><td>{{grado_art32}}</td><td>{{recidiva_art32}}</td></tr>
    <tr class="t1-art"><td class="chk">{{x_art33}}</td><td class="desc">Inosservanza limiti temporali di prelievo</td><td>33</td><td>{{sup_dich_art33}}</td><td>{{sup_irr_art33}}</td><td>{{grado_art33}}</td><td>{{recidiva_art33}}</td></tr>
    <tr class="t1-art"><td class="chk">{{x_art34}}</td><td class="desc">Interferenze</td><td>34</td><td>{{sup_dich_art34}}</td><td>{{sup_irr_art34}}</td><td>{{grado_art34}}</td><td>{{recidiva_art34}}</td></tr>
    <tr class="t1-art"><td class="chk">{{x_art35}}</td><td class="desc">Manomissione reti di dispensa e allaccio di apparecchi di aspirazione all&rsquo;idrante</td><td>35</td><td>{{sup_dich_art35}}</td><td>{{sup_irr_art35}}</td><td>{{grado_art35}}</td><td>{{recidiva_art35}}</td></tr>
    <tr class="t1-art"><td class="chk">{{x_art36}}</td><td class="desc">Uso attrezzature non autorizzate</td><td>36</td><td>{{sup_dich_art36}}</td><td>{{sup_irr_art36}}</td><td>{{grado_art36}}</td><td>{{recidiva_art36}}</td></tr>
    <tr class="t1-art"><td class="chk">{{x_art37}}</td><td class="desc">Uso sistemi di irrigazione incompatibili</td><td>37</td><td>{{sup_dich_art37}}</td><td>{{sup_irr_art37}}</td><td>{{grado_art37}}</td><td>{{recidiva_art37}}</td></tr>
    <tr class="t1-art"><td class="chk">{{x_art39}}</td><td class="desc">Danni strutture irrigue</td><td>39</td><td>{{sup_dich_art39}}</td><td>{{sup_irr_art39}}</td><td>{{grado_art39}}</td><td>{{recidiva_art39}}</td></tr>
    <!-- Rimborso -->
    <tr class="t1-rimb"><td colspan="7">Rimborso spese e/o risarcimento danni <span style="font-weight:normal;font-style:italic;font-size:6.5pt">(solo per artt. 8, 27, 30) (*)</span></td></tr>
    <!-- Importo -->
    <tr class="t1-imp">
      <td class="lbl">Importo a pi&egrave; di lista (&euro;):</td>
      <td colspan="2">{{importo_rimborso}}</td>
      <td colspan="4" class="note">(Vedi nota spesa allegata)</td>
    </tr>
  </table>

</div>

<!-- ═══════════════ PAGINA 2 ═══════════════ -->
<div class="page" id="page2">

  <!-- DATI DELLA RILEVAZIONE -->
  <table>
    <tr class="t2-banner"><td>DATI DELLA RILEVAZIONE</td></tr>
    <tr class="t2-flabel"><td>Descrizione dettagliata dell&rsquo;infrazione rilevata</td></tr>
    <tr class="t2-fval"><td>{{descrizione_fatti}}</td></tr>
    <tr class="t2-flabel"><td>Altre circostanze rilevanti</td></tr>
    <tr class="t2-fval-md"><td>{{circostanze}}</td></tr>
    <tr class="t2-flabel"><td>Descrizione dei luoghi</td></tr>
    <tr class="t2-fval-md"><td>{{descrizione_luogo}}</td></tr>
    <tr class="t2-flabel"><td>Altri dati</td></tr>
  </table>
  <table>
    <colgroup><col style="width:50%"><col style="width:50%"></colgroup>
    <tr class="t2-sub"><td>Distretto irriguo: {{distretto_irriguo}}</td><td>Comizio: {{comizio}}</td></tr>
  </table>
  <table>
    <colgroup><col style="width:33.3%"><col style="width:33.3%"><col style="width:33.4%"></colgroup>
    <tr class="t2-sub"><td>Idrante: {{idrante}}</td><td>Matricola contatore: {{matricola_contatore}}</td><td>Matricola tessera: {{matricola_tessera}}</td></tr>
  </table>

  <!-- DATI DEL TRASGRESSORE -->
  <table style="margin-top:8px;">
    <tr class="t2-sectitle"><td>DATI DEL TRASGRESSORE</td></tr>
    <tr class="t2-subsec"><td>Dati generali</td></tr>
  </table>
  <table>
    <!-- Proporzioni docx: 1529/4762/1135/1984 = 16.2%/50.6%/12.1%/21.1% -->
    <colgroup>
      <col style="width:16.2%"><col style="width:50.6%"><col style="width:12.1%"><col style="width:21.1%">
    </colgroup>
    <tr class="t2-data"><td class="lbl">Denominazione</td><td>{{denominazione}}</td><td class="lbl">{{cf_piva_label}}</td><td>{{cf_piva}}</td></tr>
  </table>
  <table>
    <tr class="t2-subsec"><td>Residenza</td></tr>
  </table>
  <table>
    <colgroup>
      <col style="width:16.2%"><col style="width:50.6%"><col style="width:12.1%"><col style="width:21.1%">
    </colgroup>
    <tr class="t2-data"><td class="lbl">Via</td><td>{{via}}</td><td class="lbl">n.</td><td>{{civico}}</td></tr>
    <tr class="t2-data"><td class="lbl">Localit&agrave;</td><td>{{localita}}</td><td class="lbl">Comune</td><td>{{citta}}</td></tr>
    <tr class="t2-data"><td class="lbl">Telefono</td><td>{{telefono}}</td><td class="lbl">e-mail/PEC</td><td>{{email_pec}}</td></tr>
  </table>
  <!-- Trasgressore presente — proporzioni docx: 2688/567/4171/1984 = 28.6%/6.0%/44.3%/21.1% -->
  <table>
    <colgroup>
      <col style="width:28.6%"><col style="width:6.0%"><col style="width:44.3%"><col style="width:21.1%">
    </colgroup>
    <tr class="t2-pres">
      <td class="pres-lbl">Il Trasgressore era presente?</td>
      <td>{{presenza_trasgressore}}</td>
      <td class="firma-lbl">Firma del trasgressore</td>
      <td></td>
    </tr>
  </table>

  <!-- FIRMATO -->
  <table style="margin-top:8px;">
    <tr class="t2-sectitle"><td>FIRMATO</td></tr>
  </table>
  <table>
    <!-- Proporzioni docx: 2688/6722 = 28.6%/71.4% -->
    <colgroup><col style="width:28.6%"><col style="width:71.4%"></colgroup>
    <tr class="t2-firma"><td class="lbl">Il Tecnico Rilevatore:</td><td>{{firma_tr}}</td></tr>
    <tr class="t2-firma"><td class="lbl">Il Tecnico Istruttore:</td><td>{{firma_ti}}</td></tr>
    <tr class="t2-firma"><td class="lbl">Il Responsabile del Settore:</td><td>{{firma_rz}}</td></tr>
    <tr class="t2-firma"><td class="lbl">Il Responsabile Istruttore:</td><td>{{firma_ri}}</td></tr>
    <tr class="t2-firma"><td class="lbl">Il Direttore dell&rsquo;Area:</td><td>{{firma_dt}}</td></tr>
  </table>

</div>

</body>
</html>`;
