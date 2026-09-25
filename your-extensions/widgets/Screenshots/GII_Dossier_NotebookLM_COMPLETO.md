# GII — dossier completo per Gemini Notebook / NotebookLM

Versione aggiornata con il ruolo di Survey123 e del Tecnico rilevatore (TR) come origine del processo.

---

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

---

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

---

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

---

# GII — fascicolo tecnico, dati, mappa e allegati

## Creazione e modifica della pratica tecnica

Il widget `gii-editing-tec` gestisce la creazione e la modifica della parte tecnica della pratica.

Le sezioni configurate nella navigazione sono:

1. **Trasgressore**
2. **Violazione**
3. **Luoghi e dati tecnici**
4. **Nota spese**
5. **Allegati**
6. **Anteprima fascicolo**
7. **Dati generali**

## Trasgressore

La pratica gestisce dati differenti per persona fisica e persona giuridica, inclusi:

- nome e cognome oppure ragione sociale;
- codice fiscale / partita IVA;
- indirizzo;
- comune, provincia e CAP;
- telefono, cellulare, e-mail e PEC;
- qualifica rispetto al fondo;
- domicilio per le notifiche;
- dati del rappresentante legale quando pertinenti.

## Violazione

Il codice gestisce diverse tipologie di violazione collegate agli articoli del Regolamento irriguo.

Sono presenti logiche specifiche per:

- prelievo abusivo d'acqua;
- inosservanza dei termini di presentazione delle comunicazioni;
- altre violazioni;
- superfici dichiarate e irrigate;
- occorrenza;
- gravità;
- descrizione dettagliata;
- circostanze rilevanti;
- collegamenti al riferimento regolamentare.

Il sistema include inoltre la possibilità di consultare il Regolamento irriguo come fonte strutturata.

## Luoghi e dati tecnici

La pratica comprende dati territoriali e tecnici, fra cui:

- descrizione del luogo;
- distretto;
- comizio;
- idrante;
- matricole;
- localizzazione cartografica.

La configurazione collega la scheda tecnica al layer delle infrazioni e a una Web Map.

## Nota spese

La nota spese è integrata nel fascicolo tecnico e dialoga con prezzari e parametri.

Il codice gestisce categorie come:

- attrezzature e trasporti;
- materiali da costruzione;
- risorse umane;
- semilavorati;
- prodotti finiti;
- attrezzature.

Sono presenti widget dedicati a:

- consultazione prezzario;
- gestione prezzari;
- nuovi prezzi;
- analisi nuovi prezzi;
- parametri della nota spese;
- carrello delle voci.

## Allegati

Il GII gestisce gli allegati direttamente nella pratica.

I componenti condivisi prevedono:

- elenco degli allegati;
- anteprima di immagini e PDF;
- gestione documentale integrata nel fascicolo;
- rotazione/visualizzazione delle immagini;
- distinzione fra documentazione tecnica e amministrativa.

## Anteprima fascicolo

È presente un fascicolo composito con viewer dedicato. I componenti condivisi permettono di organizzare:

- documenti tecnici;
- documenti amministrativi;
- allegati;
- elementi di mappa;
- livelli cartografici.

Questo rende possibile consultare la pratica come **fascicolo**, non come semplice insieme di campi.

## Produzione di documenti tecnici

La base contiene builder dedicati a:

- rapporto tecnico;
- nota spese;
- PDF e template documentali.

La generazione documentale riutilizza i dati della pratica.

## Messaggio da usare nella presentazione

> La pratica nasce già strutturata: dati anagrafici, violazione, localizzazione, elementi tecnici, nota spese e documentazione vengono mantenuti nello stesso contesto e accompagnano il procedimento nelle fasi successive.

## Provenienza

Sintesi verificata su:

- `gii-editing-tec/src/runtime/widget.tsx`
- `_shared/gii-anteprime/*`
- widget del prezzario e della nota spese
- configurazione delle pagine Nuova pratica e Modifica pratica

---

# GII — fase amministrativa, documenti, notifica e pagamenti

## Struttura della fase amministrativa

La pagina amministrativa è articolata in sezioni configurate per IA, RIA, DA e ADMIN:

1. **Trasgressore**
2. **Contestazioni**
3. **Iter approvativo**
4. **Notifica**
5. **Pagamento**
6. **Allegati**
7. **Anteprima fascicolo**
8. **Ricorso**
9. **CdA**
10. **Riapertura**
11. **Definizione**
12. **Dati generali**

## Contestazioni e importi

Il codice collega le contestazioni:

- alla norma violata;
- alla norma sanzionatoria;
- ai parametri sanzionatori;
- agli importi dovuti;
- a eventuali rimborsi/risarcimenti;
- alle spese di notifica;
- al totale da pagare.

La configurazione contiene un modulo dedicato ai **parametri sanzionatori**.

## Valutazione dell'Istruttore amministrativo

Il widget amministrativo distingue l'esito:

- **Conforme**
- **Non conforme**

In caso di non conformità il flusso prevede una motivazione e il rientro nel ciclo di integrazione.

Il codice registra gli eventi relativi all'esito e mantiene la storia dei cicli amministrativi.

## Verifica del Responsabile

Il RIA riceve il fascicolo o l'esito dell'integrazione, può validare oppure richiedere integrazioni.

La base distingue:

- verifica dell'istruttoria/fascicolo;
- ciclo della determinazione;
- successivo ciclo dell'atto di accertamento.

## Determinazione

Il codice contiene builder e gestione documentale dedicati alla determinazione.

Gli stati previsti comprendono:

- `BOZZA`
- `TRASMESSA_RIA`
- `VALIDATA_RIA`
- `TRASMESSA_FIRMA_DA`
- `ADOTTATA`
- `NON_SOTTOSCRITTA`

Il sistema gestisce inoltre:

- generazione della bozza;
- caricamento/sostituzione del PDF;
- trasmissione del fascicolo al protocollo;
- acquisizione dei documenti protocollati;
- registrazione di numero e data;
- invio verso la firma del Direttore;
- acquisizione della determinazione adottata.

Il codice effettua controlli per evitare copie concorrenti o incoerenti del documento ufficiale.

## Atto di accertamento

Dopo l'adozione della determinazione il flusso prosegue con l'atto di accertamento.

Sono presenti funzioni per:

- predisposizione dell'atto;
- verifica RIA;
- eventuale rimando per correzione;
- approvazione;
- trasmissione;
- protocollo;
- documento firmato.

## Notifica

La scheda Notifica gestisce:

- modalità di notifica;
- spese di notifica;
- protocollo dell'atto;
- esito della notifica;
- protocollo dell'esito;
- documentazione probatoria.

La fase post-notifica viene abilitata solo quando la notifica risulta perfezionata secondo gli esiti previsti dal codice.

I PDF acquisiti in questa fase confluiscono negli allegati della pratica.

## Pagamento

Il GII gestisce modalità di pagamento tra cui:

- pagoPA;
- bonifico;
- pagamento misto;
- altre modalità.

La scheda pagamento registra l'esecuzione e controlla la coerenza fra:

- totale dovuto;
- importo incassato;
- scadenza;
- stato del pagamento.

## pagoPA

Il codice comprende un flusso specifico per acquisire avvisi pagoPA da PDF.

Sono presenti controlli su:

- QR code;
- IUV;
- codice avviso;
- importo;
- scadenza;
- coerenza fra dati visualizzati e dati codificati.

Il sistema può gestire:

- unica soluzione;
- più rate;
- allegati degli avvisi;
- sostituzione delle posizioni;
- conferma tramite salvataggio.

## Ricorso, CdA, riapertura e definizione

Dopo la notifica la pratica può comprendere:

- registrazione di un ricorso o riesame;
- esito del CdA;
- estremi della deliberazione;
- eventuale rideterminazione;
- riapertura amministrativa;
- definizione finale della pratica.

Il codice specifica che l'esito del CdA e l'eventuale riapertura sono fasi distinte.

## Messaggio da usare nella presentazione

> Il GII non si ferma alla rilevazione o alla verifica tecnica: il fascicolo prosegue nella fase amministrativa, supporta la formazione degli atti, la protocollazione, la notifica, i pagamenti e gli eventuali sviluppi successivi.

## Provenienza

Sintesi verificata su:

- `gii-editing-amm/src/runtime/widget.tsx`
- `_shared/gii-anteprime/documenti-amministrativi/*`
- `_shared/gii-anteprime/allegati/*`
- configurazione della pagina Atto di accertamento

---

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

---

# Brief per la presentazione del GII al CdA

## Obiettivo

Presentare il **Gestionale Infrazioni Irrigue** al Consiglio di Amministrazione del Consorzio di Bonifica della Sardegna Meridionale in modo:

- semplice;
- istituzionale;
- visuale;
- comprensibile anche a chi non utilizza il gestionale;
- centrato sul valore organizzativo e sulla tracciabilità.

La presentazione non deve essere un tutorial del software e non deve percorrere ogni clic dell'iter.

## Messaggio centrale

Il processo **nasce sul campo**, con le rilevazioni effettuate dal Tecnico rilevatore (TR) tramite Survey123, e prosegue nel GII come **percorso unitario, leggibile e tracciabile** fino alle fasi tecniche, amministrative e agli atti.

La presentazione deve quindi far percepire la continuità:

**territorio → Survey123 → GII → istruttoria → atti → esiti**.

## Storia da raccontare

### 1. Il punto di partenza: il territorio

Molte pratiche nascono da una **rilevazione effettuata sul campo dal Tecnico rilevatore (TR) mediante Survey123**.

Questa deve essere la prima immagine concettuale della presentazione: il procedimento non nasce davanti a un computer in ufficio, ma durante il sopralluogo.

Da lì la pratica entra nel GII e coinvolge:

- rilevazione;
- dati territoriali;
- trasgressore;
- contestazioni;
- più responsabilità organizzative;
- documenti;
- eventuali integrazioni;
- atti amministrativi;
- protocollo;
- notifica;
- pagamento;
- possibili sviluppi successivi.

Il problema non è soltanto “digitalizzare un modulo”, ma tenere insieme l'intero procedimento.

### 2. La risposta del GII

Il GII offre:

**una pratica → un fascicolo → un workflow → una storia ricostruibile**

### 3. Cinque macro-fasi da mostrare

Per il CdA usare:

**Rilevazione sul campo / Survey123 → Ingresso nel GII → Istruttoria tecnica → Istruttoria amministrativa → Atti ed esiti**

Non esporre inizialmente tutte le sigle dei ruoli, ma nominare esplicitamente il **TR** perché rappresenta l'origine operativa del processo.

Non esporre inizialmente tutte le sigle dei ruoli.

### 4. Quattro momenti della demo

La demo dal vivo dovrebbe durare circa 4–5 minuti e mostrare soltanto:

1. **La pratica nasce strutturata**  
   Una schermata del fascicolo tecnico con violazione, dati e collegamento al territorio.

2. **Ognuno sa cosa deve fare**  
   Elenco pratiche con “In attesa mia”, fase, stato, eseguito da, trasmesso a.

3. **Il procedimento diventa tracciabile**  
   Dettaglio/iter con eventi, date, mittenti, destinatari e un ciclo di integrazione.

4. **Il fascicolo arriva agli atti**  
   Fase amministrativa con determinazione/atto/notifica e, se opportuno, pagoPA.

## Struttura suggerita: 10 slide

### Slide 1 — Gestionale Infrazioni Irrigue
Sottotitolo suggerito:

**Digitalizzazione e governo dell'iter tecnico-amministrativo**

Visuale: logo CBSM + immagine pulita della Home.

### Slide 2 — Il procedimento nasce sul campo
Visuale principale: tecnico sul territorio / smartphone-tablet / Survey123.

Messaggio:

**La digitalizzazione inizia nel momento della rilevazione.**

Spiegare che il TR raccoglie sul campo i dati che daranno origine alla pratica.

### Slide 3 — Dal campo al fascicolo digitale
Rappresentare in modo semplice:

**Survey123 → GII**

Mostrare il passaggio dalla rilevazione alla pratica strutturata, evitando dettagli tecnici di sincronizzazione o routing.

Messaggio:

**I dati raccolti sul territorio non restano isolati: diventano l'inizio del fascicolo.**

### Slide 4 — Un unico procedimento, più uffici e responsabilità
Schema semplice:

**Rilevazione → Istruttoria tecnica → Istruttoria amministrativa → Atti ed esiti**

### Slide 5 — Ognuno sa cosa deve fare
Usare screenshot Elenco pratiche.

Evidenziare:

- In attesa mia
- Fase istruttoria
- Stato pratica
- Eseguito da
- Trasmesso a
- Ultimo aggiornamento

### Slide 6 — Il procedimento diventa tracciabile
Usare dettaglio/iter.

Messaggio centrale:

**Non vediamo soltanto dove si trova la pratica. Vediamo come ci è arrivata.**

Elementi:

- chi;
- cosa;
- quando;
- a chi;
- eventuale rimando;
- esito dell'integrazione.

### Slide 7 — Dal fascicolo agli atti
Usare schermata amministrativa.

Mostrare visivamente il collegamento fra:

**istruttoria → determinazione → atto → protocollo/notifica → pagamento**

Senza spiegare ogni passaggio.

### Slide 8 — Dalla singola pratica al quadro complessivo
Valorizzare Dashboard, Report e Mappa.

Tre concetti:

- **Monitorare**
- **Localizzare**
- **Riepilogare**

### Slide 9 — Che cosa cambia
Sintetizzare il valore organizzativo:

- continuità dal campo agli uffici;
- fascicolo unitario;
- responsabilità esplicite;
- tracciabilità;
- documentazione collegata;
- visione complessiva dello stato delle pratiche.

### Slide 10 — Dallo sviluppo all'utilizzo operativo
Tre passaggi:

1. Validazione
2. Messa online
3. Avvio operativo

Chiusura suggerita:

**Dal territorio alla conclusione del procedimento, un percorso unico, leggibile e tracciabile.**

## Cosa evitare

Non trasformare le slide in:

- elenco completo delle funzionalità;
- elenco di tutte le sigle TR/IT/CS/RIT/DT/IA/RIA/DA;
- catalogo degli stati tecnici;
- schermate intere non commentate;
- spiegazione di tutti i popup;
- descrizione del codice o dell'architettura ArcGIS;
- percentuali di efficienza non misurate;
- affermazioni quantitative non presenti nelle fonti.

## Stile grafico

Usare come riferimento visivo il GII stesso:

- blu notte / blu istituzionale;
- bianco;
- azzurro;
- verde come accento;
- molto spazio vuoto;
- titoli grandi;
- uno screenshot dominante per slide;
- callout discreti;
- testo ridotto.

## Prompt pronto per Gemini Notebook / NotebookLM

Crea una presentazione istituzionale destinata al Consiglio di Amministrazione del Consorzio di Bonifica della Sardegna Meridionale per illustrare il Gestionale Infrazioni Irrigue (GII).

Basati esclusivamente sulle fonti caricate e sulle immagini reali del gestionale.

Tieni conto di un elemento fondamentale: **il procedimento nasce, nella maggior parte dei casi, da rilevazioni effettuate sul campo dal Tecnico rilevatore (TR) mediante Survey123**. La presentazione deve quindi raccontare la continuità fra attività sul territorio e successiva gestione nel GII.

La presentazione deve durare circa 12–15 minuti ed essere composta indicativamente da 10 slide. Non deve essere un tutorial tecnico né una sequenza completa di tutti i passaggi del workflow.

Racconta il processo come:

**territorio → Survey123 → ingresso nel GII → istruttoria tecnica → istruttoria amministrativa → atti → notifica/pagamento → eventuali sviluppi successivi**

Segui preferibilmente questa struttura:
1. Gestionale Infrazioni Irrigue.
2. Il procedimento nasce sul campo.
3. Dal campo al fascicolo digitale.
4. Un unico procedimento, più uffici e responsabilità.
5. Ognuno sa cosa deve fare.
6. Il procedimento diventa tracciabile.
7. Dal fascicolo agli atti.
8. Dalla singola pratica al quadro complessivo.
9. Che cosa cambia.
10. Dallo sviluppo all'utilizzo operativo.

Dai visibilità al ruolo del TR e a Survey123 nelle prime slide, ma non trasformare la presentazione in una spiegazione tecnica dell'app Survey123.

Utilizza gli screenshot come elementi visuali principali. Quando possibile ritaglia o valorizza la porzione di interfaccia pertinente invece di mostrare schermate intere in piccolo.

Stile: istituzionale, contemporaneo e pulito, coerente con la grafica blu del GII e con il logo CBSM. Molto spazio vuoto, titoli grandi, poco testo e una sola idea principale per slide.

Non inventare risultati, tempi risparmiati, percentuali, indicatori di efficacia o funzionalità non presenti nelle fonti. Non esporre il pubblico a dettagli tecnici inutili, nomi di variabili, URL dei servizi o codici interni degli eventi.
