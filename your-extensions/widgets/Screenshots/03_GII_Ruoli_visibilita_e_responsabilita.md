# GII — ruoli, visibilità e responsabilità

## Ruoli applicativi presenti nel codice

La gestione utenti definisce i seguenti ruoli:

- **TR** — Tecnico rilevatore
- **IT** — Istruttore tecnico
- **CS** — Capo Settore
- **RIT** — Responsabile istruttoria tecnica
- **DT** — Direttore tecnico
- **IA** — Istruttore amministrativo
- **RIA** — Responsabile istruttoria amministrativa
- **DA** — Direttore amministrativo
- **ADMIN** — Amministratore


## Il ruolo del Tecnico rilevatore (TR)

Nella narrazione del processo il TR non deve apparire come un ruolo marginale.

È il soggetto che, attraverso **Survey123**, effettua la rilevazione sul campo e dà origine a molte delle pratiche successivamente gestite nel GII.

Per il CdA è utile distinguere:

- **TR / Survey123**: nascita della rilevazione sul territorio;
- **GII**: presa in carico, istruttoria, passaggi di responsabilità, fascicolo e sviluppo amministrativo.

Questo rende evidente la continuità digitale fra attività esterna e gestione interna.

## Assegnazioni organizzative

Il modello utente associa i ruoli a un perimetro organizzativo composto, a seconda del ruolo, da:

- area;
- settore;
- ufficio;
- gruppo applicativo.

Il codice distingue area amministrativa, area agraria e area tecnica, e applica regole diverse per ruoli operativi e apicali.

Sono previste anche assegnazioni multiple per lo stesso account.

## Profilazione delle funzioni

La Home non mostra necessariamente le stesse funzioni a tutti.

Esempi ricavati dalla configurazione:

- **Nuova pratica**: disponibile a IT e ADMIN;
- **Gestione prezzari**: RIT e ADMIN;
- **Parametri sanzionatori**: RIA e ADMIN;
- **Rubrica**: RIA e ADMIN;
- funzioni generali come Elenco pratiche, Mappa, Dashboard, Report e Regolamento irriguo sono configurate per una platea più ampia.

La fase amministrativa dell'atto è configurata per i ruoli IA, RIA, DA e ADMIN.

## Elenco pratiche profilato

Il widget Elenco pratiche usa il profilo e le assegnazioni per determinare il perimetro delle pratiche visibili.

La vista operativa è organizzata in:

- **In attesa mia**
- **In attesa di altri**
- **Tutte**

La classificazione non dipende da un semplice campo statico: il codice tiene conto anche dell'ultimo evento di workflow e del ruolo operativo corrente.

Per le pratiche sono utilizzati concetti come:

- fase istruttoria;
- stato della pratica;
- ruolo competente;
- eseguito da;
- trasmesso a;
- ultimo aggiornamento.

## Amministratore

L'amministratore viene trattato separatamente dalle viste operative dei ruoli ordinari e dispone di funzioni di configurazione e gestione più ampie.

La pagina **Gestione utenti** è inoltre soggetta a restrizione organizzativa nella configurazione Experience Builder.

## Perché è importante

Per il CdA questo può essere raccontato senza entrare nella sigla di ogni ruolo:

> Il gestionale presenta a ciascun operatore il perimetro di lavoro coerente con il suo incarico e rende esplicito chi è il responsabile del passaggio corrente.

Il valore organizzativo è dato dall'unione di:

**profilo → competenza → attività da svolgere → tracciamento del passaggio**

## Provenienza

Sintesi verificata su:

- `gii-gestione-utenti/src/runtime/widget.tsx`
- `gii-elenco-pratiche-pro/src/runtime/widget.tsx`
- `gii-homepage` e relativa configurazione nel `config.json`
- `config(20260925-081023).json`
