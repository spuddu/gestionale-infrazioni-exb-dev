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
