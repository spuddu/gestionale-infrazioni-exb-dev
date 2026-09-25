# GII — iter e workflow

## Principio generale

Il GII implementa un workflow strutturato: la pratica non viene semplicemente “salvata”, ma passa fra ruoli e fasi, con registrazione degli eventi e apertura dell'attività per il destinatario successivo.

Il codice distingue il **flusso ordinario** dai **cicli di integrazione**.


## Fase 0 — Rilevazione sul campo con Survey123

Prima del workflow interno del GII esiste una fase essenziale: la **rilevazione sul territorio**.

Il **Tecnico rilevatore (TR)** utilizza Survey123 per raccogliere i dati della rilevazione direttamente sul campo. È da questa attività che nasce, nella maggior parte dei casi, la pratica che verrà poi gestita nel GII.

Per il CdA è importante rendere visibile questo punto perché chiarisce che la digitalizzazione non comincia negli uffici: **inizia nel momento stesso della rilevazione**.

La catena narrativa da usare è:

**TR sul campo → Survey123 → pratica nel GII → istruttoria tecnica → istruttoria amministrativa → conclusione**

Il dettaglio tecnico del routing Survey123 non è contenuto nel pacchetto Experience Builder analizzato e va quindi presentato come contesto operativo del progetto.

## Macro-fasi

Per una presentazione istituzionale il workflow può essere sintetizzato in quattro blocchi:

1. **Rilevazione sul campo con Survey123**
2. **Ingresso e formazione della pratica nel GII**
3. **Istruttoria tecnica**
4. **Istruttoria amministrativa**
5. **Atti, notifica, pagamento ed eventuali fasi successive**

## Catena tecnica ordinaria

Il routing implementato nel widget Azioni prevede in sequenza:

**IT → CS → RIT → DT → RIA**

Gli eventi positivi registrati dal codice sono:

- IT: `ISTRUTTORIA_TRASMESSA_VERIFICA`
- CS: `ISTRUTTORIA_VERIFICATA`
- RIT: `ISTRUTTORIA_TECNICA_VALIDATA`
- DT: `ISTRUTTORIA_TECNICA_APPROVATA`

Nel caso in cui l'Istruttore tecnico sia anche l'autore originario della rilevazione, il primo invio al Capo Settore viene distinto come:

- `NUOVA_RILEVAZIONE_TRASMESSA`

## Ingresso nella fase amministrativa

L'approvazione del DT apre il passaggio alla responsabilità amministrativa.

Nel codice sono presenti, fra gli altri, gli eventi:

- `ISTRUTTORIA_AMMINISTRATIVA_ASSEGNATA`
- `ISTRUTTORIA_CONFORME`
- `ISTRUTTORIA_NON_CONFORME`
- `FASCICOLO_TRASMESSO_VERIFICA`
- `ISTRUTTORIA_AMMINISTRATIVA_VALIDATA`
- `ATTO_ACCERTAMENTO_TRASMESSO_VERIFICA`
- `ATTO_ACCERTAMENTO_APPROVATO`

Il workflow amministrativo distingue inoltre il ciclo della determinazione/fascicolo dal ciclo dell'atto di accertamento.

## Cicli di integrazione

Uno dei punti più rilevanti del modello è la gestione esplicita dei rimandi.

Il sistema registra eventi come:

- `ISTRUTTORIA_RIMANDATA_INTEGRAZIONE`
- `FASCICOLO_RIMANDATO_INTEGRAZIONE`
- `ATTO_ACCERTAMENTO_RIMANDATO_INTEGRAZIONE`

Durante la risalita di un'integrazione il codice applica una regola unitaria: finché l'esito deve ancora raggiungere il ruolo che aveva richiesto l'integrazione, i passaggi intermedi vengono registrati come:

- `ESITO_INTEGRAZIONE_TRASMESSO`

Quando l'esito raggiunge il richiedente e il procedimento riparte, il workflow torna all'evento positivo ordinario del livello competente.

## Allarmi e attività correnti

Il codice separa il significato dell'evento interno dal messaggio operativo mostrato al destinatario.

Fra i titoli utilizzati per gli ingressi risultano:

- **Nuova rilevazione ricevuta**
- **Nuova istruttoria ricevuta**
- **Richiesta integrazione ricevuta**
- **Esito integrazione ricevuto**
- **Nuovo fascicolo ricevuto**
- **Atto di accertamento ricevuto**

L'obiettivo è far capire all'utente **perché la pratica è arrivata sulla sua scrivania**, senza obbligarlo a conoscere la codifica tecnica degli eventi.

## Tracciabilità

La base contiene strutture dedicate a:

- attività correnti;
- log degli eventi/cicli;
- ruolo competente;
- ruolo destinatario;
- operatore;
- data di apertura e chiusura;
- note;
- fase;
- campi modificati.

Questo permette di ricostruire non solo lo stato attuale ma anche il percorso compiuto dalla pratica.

## Messaggio da usare nella presentazione

Una formulazione efficace è:

> Il GII non si limita a sapere “dove si trova” una pratica: conserva anche come ci è arrivata, chi è intervenuto e quali eventuali integrazioni sono state richieste e restituite.

## Provenienza

Sintesi verificata principalmente su:

- `gii-azioni/src/runtime/widget.tsx`
- `gii-editing-amm/src/runtime/widget.tsx`
- `_shared/gii-alerts/gii-alerts.ts`
- `_shared/gii-workflow/administrative-rimando.ts`
