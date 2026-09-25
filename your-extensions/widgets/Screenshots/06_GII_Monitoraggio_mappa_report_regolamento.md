# GII — monitoraggio, mappa, report e strumenti di supporto

## Dashboard

Il widget Dashboard ha due viste:

- **Operativo**
- **Statistiche**

Nel codice sono presenti indicatori e rappresentazioni quali:

- In attesa mia;
- In attesa di altri;
- ripartizione per fase;
- ripartizione per ruolo competente;
- stato delle attività;
- andamento delle rilevazioni;
- distribuzione per ufficio;
- tipologie di infrazione;
- pratiche oltre una soglia temporale;
- elenco delle pratiche recenti.

Sono previsti filtri temporali e filtri interattivi.

### Valore per il CdA

La dashboard rende possibile passare dalla singola pratica a una **lettura complessiva del carico e dello stato dei procedimenti**.

## Report pratiche

Il widget Report è descritto come elenco consultabile ed esportabile delle pratiche di competenza.

Comprende campi e ordinamenti relativi a:

- numero rilevazione;
- numero rapporto;
- numero atto/verbale;
- data;
- rilevatore;
- istruttore;
- area;
- settore;
- fase procedimentale;
- ruolo corrente;
- giorni di fermo;
- ultimo aggiornamento.

Il report può essere filtrato ed esportato in **CSV**.

## Mappa

Il widget Ricerche mappa permette ricerche configurabili sui layer cartografici.

Per le pratiche sono previsti criteri quali:

- articolo;
- tipo pratica;
- numero pratica;
- nominativo;
- codice fiscale / partita IVA.

Il codice supporta:

- rispetto del perimetro del profilo corrente;
- evidenziazione dei risultati;
- zoom alla geometria;
- integrazione con la mappa e con i layer presenti.

La configurazione GII usa Web Map e layer specifici per le infrazioni.

### Valore per il CdA

La pratica mantiene un collegamento con la propria dimensione territoriale: il procedimento può essere letto anche **sulla mappa**.

## Regolamento irriguo

Il widget Regolamento irriguo è una consultazione strutturata con:

- indice;
- articoli del Regolamento;
- regolamento delle condotte private;
- ricerca globale;
- riconoscimento dei riferimenti interni fra articoli;
- navigazione ai rimandi.

Il widget legge i contenuti da una fonte dati dedicata, evitando di incorporare il testo normativo direttamente nell'interfaccia.

## Prezzari e nota spese

Il progetto comprende moduli per:

- caricamento prezzari;
- gestione voci;
- consultazione;
- prezzario interno;
- nuovi prezzi;
- analisi nuovi prezzi;
- parametri della nota spese.

Queste funzioni alimentano la parte economica collegata alle pratiche tecniche.

## Gestione utenti e Rubrica

Sono presenti funzioni dedicate a:

- utenti;
- ruoli;
- assegnazioni;
- gruppi;
- esportazione delle configurazioni utente;
- destinatari;
- firmatari;
- indirizzi utilizzati dai flussi documentali e di trasmissione.

## Messaggio da usare nella presentazione

> Accanto al fascicolo della singola pratica, il GII offre strumenti per leggere il fenomeno nel suo insieme: dove sono le pratiche, in quale fase si trovano, chi le sta gestendo e quali situazioni richiedono attenzione.

## Provenienza

Sintesi verificata su:

- `gii-dashboard/src/runtime/widget.tsx`
- `gii-report-pratiche/src/runtime/widget.tsx`
- `gii-ricerche-mappa/src/runtime/widget.tsx`
- `gii-regolamento-irriguo/src/runtime/widget.tsx`
- widget prezzari e gestione utenti
- `config(20260925-081023).json`
