# GII — pacchetto fonti per Gemini Notebook / NotebookLM

## Scopo del pacchetto

Questo pacchetto traduce in forma leggibile il **codice reale dei widget GII** e il **config.json di ArcGIS Experience Builder** forniti il 25/09/2026.

È stato preparato per consentire a Gemini Notebook / NotebookLM di comprendere il Gestionale Infrazioni Irrigue senza dover interpretare direttamente migliaia di righe di TypeScript, TSX e JSON.

Le fonti di partenza sono:

- `widgets_136(5).zip`
- `config(20260925-081023).json`

La configurazione dichiara **ArcGIS Experience Builder 1.19.0** e contiene le pagine e le istanze dei custom widget del GII.


## Integrazione fondamentale: Survey123 e Tecnico rilevatore

La base Experience Builder fornita descrive soprattutto ciò che accade **dopo l'ingresso della rilevazione nel GII**. Per la presentazione al CdA va però esplicitato un elemento a monte, fornito come contesto progettuale:

- molte pratiche hanno origine da **rilevazioni effettuate sul campo con Survey123**;
- il primo attore del processo è il **Tecnico rilevatore (TR)**;
- i dati raccolti sul territorio alimentano il successivo percorso nel GII.

Questa informazione non deriva direttamente dal pacchetto dei widget Experience Builder, ma è essenziale per raccontare correttamente il processo end-to-end.

## Come usarlo in NotebookLM

Caricare come fonti almeno questi documenti:

1. `01_GII_Panoramica_e_architettura.md`
2. `02_GII_Iter_e_workflow.md`
3. `03_GII_Ruoli_visibilita_e_responsabilita.md`
4. `04_GII_Fascicolo_tecnico_e_dati.md`
5. `05_GII_Fase_amministrativa_documenti_pagamenti.md`
6. `06_GII_Monitoraggio_mappa_report_regolamento.md`
7. `07_BRIEF_PRESENTAZIONE_CDA.md`

Caricare inoltre come fonti le **schermate reali del gestionale** che si vogliono usare nella presentazione.

In alternativa, `GII_Dossier_NotebookLM_COMPLETO.md` riunisce in un'unica fonte i documenti 01–07.

## Regola importante

Questi documenti descrivono ciò che è ricavabile dalla base software fornita. Non costituiscono un manuale normativo né sostituiscono le decisioni organizzative del Consorzio.

Per una presentazione al CdA è preferibile usare il codice come **fonte di verità sulle funzionalità**, ma raccontare il sistema in termini di:

- governo del procedimento;
- responsabilità;
- tracciabilità;
- fascicolo unico;
- supporto alle decisioni e alle attività degli uffici.

Non trasformare la presentazione in una spiegazione tecnica dei widget o dei campi del database.
