# Gestionale Infrazioni Irrigue — panoramica e architettura funzionale

## Il vero punto di partenza: il campo

Il GII va raccontato come parte di un processo più ampio che **nasce sul territorio**.

Molte pratiche hanno origine dalle rilevazioni effettuate dal **Tecnico rilevatore (TR)** mediante **Survey123**. La rilevazione sul campo costituisce quindi l'ingresso naturale del procedimento: i dati raccolti vengono poi presi in carico dal Gestionale Infrazioni Irrigue e accompagnati nelle successive fasi tecniche e amministrative.

Per una presentazione al CdA, la rappresentazione più corretta è quindi:

**Sopralluogo sul campo → Survey123 → ingresso nel GII → istruttoria tecnica → istruttoria amministrativa → atti ed esiti**

Questa informazione è contesto progettuale integrativo e non è ricavata dal solo pacchetto Experience Builder analizzato.

## Che cos'è

Il **Gestionale Infrazioni Irrigue (GII)** è un'applicazione realizzata in **ArcGIS Experience Builder 1.19** per gestire in un unico ambiente il procedimento collegato alle infrazioni irrigue.

La configurazione e i widget forniti mostrano che il GII non è soltanto una maschera di inserimento dati. L'applicazione riunisce:

- creazione e modifica della pratica;
- istruttoria tecnica;
- istruttoria amministrativa;
- assegnazioni e passaggi fra ruoli;
- localizzazione cartografica;
- fascicolo documentale;
- allegati;
- nota spese e prezzari;
- determinazione e atto di accertamento;
- protocollo e notifica;
- pagamenti;
- ricorsi, esito CdA, eventuale riapertura e definizione;
- dashboard e report;
- consultazione del Regolamento irriguo;
- gestione utenti, ruoli, rubrica e parametri.

## Principali aree dell'applicazione

Dalla configurazione risultano pagine dedicate a:

- **Home**
- **Elenco pratiche**
- **Nuova pratica**
- **Modifica pratica**
- **Mappa**
- **Dashboard**
- **Report**
- **Gestione prezzari**
- **Gestione utenti**
- **Rubrica**
- **Regolamento irriguo**
- **Atto di accertamento**

Sono inoltre presenti pagine o sezioni tecniche interne per voci di prezzario, analisi prezzi, parametri, consultazione e browser della nota spese.

## Home come punto di accesso

La Home è configurata con accessi rapidi profilati. Le card principali comprendono:

- Elenco pratiche — “Consulta stati, assegnazioni e istruttorie”
- Nuova pratica — “Avvia una nuova istruttoria tecnica”
- Mappa — “Localizza pratiche e rilevazioni sul territorio”
- Gestione prezzari — “Gestisci voci, analisi e nuovi prezzi”
- Parametri sanzionatori — “Configura sanzioni, riduzioni e cauzioni”
- Rubrica — “Gestisci destinatari e firmatari”
- Dashboard — “Analizza lo stato complessivo delle pratiche”
- Report — “Consulta dati riepilogativi e statistiche”
- Regolamento irriguo — “Cerca e consulta le norme del servizio irriguo”

Alcune funzioni sono mostrate solo a determinati ruoli.

## Struttura applicativa

Il progetto usa custom widget dedicati, tra cui:

- `gii-elenco-pratiche-pro`
- `gii-dettaglio-pratiche`
- `gii-azioni`
- `gii-editing-tec`
- `gii-editing-amm`
- `gii-dashboard`
- `gii-report-pratiche`
- `gii-ricerche-mappa`
- `gii-regolamento-irriguo`
- `gii-gestione-utenti`
- widget per prezzari, analisi prezzi, parametri e rubrica
- componenti condivisi per allegati, documenti, mappa, workflow, allarmi e attività correnti.

L'applicazione utilizza viste e servizi ArcGIS differenziati per contesto operativo e profilo, oltre a Web Map dedicate.

## Idea chiave per il CdA

La caratteristica da far emergere non è il numero dei widget, ma il fatto che il GII realizza un **ambiente unitario** nel quale una pratica può essere seguita:

**dalla rilevazione → all'istruttoria → agli atti → alla notifica e agli esiti successivi**

mantenendo insieme dati, documenti, responsabilità e storia del procedimento.

## Provenienza

Sintesi verificata su:

- `config(20260925-081023).json`
- manifest e runtime dei custom widget contenuti in `widgets_136(5).zip`
