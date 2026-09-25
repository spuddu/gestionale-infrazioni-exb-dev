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
