# GII — Servizio revisione redazionale 02

Versione Python per Azure Functions, compatibile con `widgets_120_patch_revisione_ai.zip`.

Questa è la versione da installare. Sostituisce entrambi i pacchetti denominati `gii-ai-review-service_01.zip`: il primo prototipo Python e la successiva variante Node.js/App Service. Poiché non sono stati installati, non occorre migrare o disinstallare nulla.

## Funzionamento

Il widget invia esclusivamente il contenuto del campo `descrizione_fatti`, insieme al token ArcGIS dell'utente nel bearer header. Il servizio:

1. verifica la sessione tramite Portal Self, l'organizzazione CBSM e la presenza di un ruolo IT/TI in `GII_utenti`;
2. chiede al modello una revisione strettamente redazionale;
3. esegue una seconda chiamata separata per confrontare originale e revisione in sei categorie fattuali;
4. confronta inoltre, senza AI, numeri, date, codici contenenti cifre e unità riconosciute;
5. restituisce originale, proposta, ambiguità, controlli e l'esito `accettabile` atteso dal widget.

Il servizio non legge né modifica la pratica. L'accettazione aggiorna soltanto la bozza del widget; il normale pulsante **Salva** registra il testo. Nessun nuovo campo AGOL e nessun nuovo passaggio nell'iter.

I controlli automatici sono deliberatamente conservativi e non certificano l'equivalenza giuridica. Una proposta può essere applicata soltanto quando entrambi i controlli AI, il confronto letterale e l'assenza di ambiguità hanno esito positivo; l'IT deve comunque leggerla e accettarla esplicitamente.

## Struttura

| File | Scopo |
| --- | --- |
| `function_app.py` | Trigger HTTP `/api/review` e `/api/health`, CORS e contratto del widget |
| `service.py` | Autenticazione ArcGIS, accesso Azure, timeout e limiti |
| `review_logic.py` | Prompt, schemi Pydantic e controlli deterministici |
| `host.json` | Configurazione Azure Functions e riduzione dei dati nei log HTTP |
| `requirements.txt` | Dipendenze Python |
| `local.settings.example.json` | Esempio locale senza segreti |
| `tests/test_service.py` | Test automatici con servizi simulati |

La struttura usa il modello di programmazione Python v2, raccomandato da Microsoft per le nuove Function App.

## Variabili applicative

| Variabile | Contenuto |
| --- | --- |
| `AZURE_OPENAI_ENDPOINT` | Radice HTTPS della risorsa, senza `/openai/v1` |
| `AZURE_OPENAI_DEPLOYMENT` | Nome effettivo del deployment usato per la revisione |
| `AZURE_OPENAI_VERIFY_DEPLOYMENT` | Facoltativo: deployment della verifica; vuoto usa il precedente |
| `AZURE_OPENAI_API_KEY` | Solo per sviluppo/fallback; lasciare vuota con Managed Identity |
| `ARCGIS_PORTAL_URL` | `https://cbsm-hub.maps.arcgis.com` |
| `ARCGIS_ALLOWED_ORG_ID` | ID effettivo dell'organizzazione CBSM, obbligatorio |
| `ARCGIS_USERS_LAYER_URL` | URL completo della tabella/vista utenti, incluso `/FeatureServer/0` |
| `ALLOWED_ORIGINS` | Origini esatte di builder e app, separate da virgola e senza slash finale |
| `FUNCTIONS_WORKER_PROCESS_COUNT` | Usare `1` nella prima installazione affinché i limiti in memoria abbiano un unico processo |

Nel file di esempio, `vH5RykSdaAwiEGOJ` è ricavato dagli URL dei servizi nel JSON allegato. Verificare nel portale che coincida con l'ID dell'organizzazione prima della pubblicazione. Il dominio dell'applicazione è invece ancora un segnaposto.

La tabella/vista configurata deve essere leggibile dall'IT e contenere `username`, `ruolo_cod` e `tipo_record`. Se `GII_utenti` non è direttamente leggibile, predisporre una vista privata minima con questi campi e configurarne l'URL. Il servizio non usa un token amministrativo sostitutivo.

## Prova locale

1. Creare un ambiente Python supportato da Azure Functions e installare `requirements.txt`.
2. Copiare `local.settings.example.json` in `local.settings.json` e compilare i valori. Non condividere questo file se contiene una chiave.
3. Avviare con Azure Functions Core Tools: `func start`.
4. Verificare `http://localhost:7071/api/health`. Un esito positivo conferma la configurazione di base, non ancora l'autorizzazione reale al modello.
5. Eseguire i test dalla radice del progetto: `python -m unittest discover -s tests -v`.

Il widget richiede un endpoint HTTPS. Per la prova integrata utilizzare la Function pubblicata oppure un proxy HTTPS locale fidato.

## Pubblicazione su Azure Functions

1. Creare o selezionare la risorsa Azure OpenAI/Foundry nella geografia e con le condizioni di trattamento approvate dal CBSM. Creare un deployment che supporti Responses API e Structured Outputs; il nome non è fissato nel codice.
2. Creare una Function App Python v2 su **Flex Consumption** per questo carico saltuario, scegliendo una versione Python attualmente supportata. L'impostazione `functionTimeout` del pacchetto è tre minuti; il servizio applica internamente 120 secondi.
3. Abilitare la Managed Identity della Function App e assegnarle sulla risorsa del modello il ruolo di inferenza appropriato, normalmente `Cognitive Services OpenAI User` per Azure OpenAI.
4. Inserire le variabili applicative sopra elencate. Con Managed Identity non configurare `AZURE_OPENAI_API_KEY`.
5. Configurare CORS della Function App con le stesse origini esatte elencate in `ALLOWED_ORIGINS`, mai con `*`. Il codice esegue un secondo controllo applicativo dell'origine.
6. Pubblicare con build remota, così Azure installa `requirements.txt`. Non pubblicare `local.settings.json`; `.funcignore` lo esclude.
7. Verificare `https://NOME-FUNCTION.azurewebsites.net/api/health`, quindi effettuare una revisione con un account CBSM IT.
8. Nei setting di **entrambe** le istanze `gii-editing-tec` (`widget_1358` e `widget_1375`) inserire `https://NOME-FUNCTION.azurewebsites.net/api/review` e abilitare la revisione redazionale.

La funzione HTTP usa `ANONYMOUS` soltanto a livello di chiave Functions perché il widget non deve contenere un function key. L'accesso applicativo non è anonimo: è obbligatorio il token utente ArcGIS, poi verificato contro organizzazione e ruolo gestionale.

## Sicurezza, costi e limiti

- La chiave del modello non compare nel widget né nel JSON Experience Builder. Con Managed Identity non è necessaria neppure nelle impostazioni della Function.
- Token, username, testo e risposta del modello non vengono scritti deliberatamente nei log applicativi. Application Insights e le impostazioni della piattaforma devono restare configurati senza raccolta di body e header di autorizzazione.
- Il servizio passa al modello soltanto il testo della descrizione; non invia token, username, altri campi della pratica o allegati.
- `store=False` viene trasmesso all'API, ma non sostituisce la verifica contrattuale e amministrativa delle condizioni del deployment scelto.
- Ogni revisione effettua **due chiamate al modello**: una per la forma e una per il confronto. Configurare quote, budget e allarmi anche sulla risorsa Azure.
- Il limite applicativo è 20 revisioni/ora per utente, una alla volta per utente e quattro concorrenti per processo. È un freno, non un tetto di spesa garantito.
- I limiti sono in memoria e si azzerano al riavvio o allo scale-out. In produzione, per limiti globali o più istanze/processi, occorre un gateway o uno store condiviso. Nella prima installazione mantenere un solo processo e configurare le quote Azure.
- Il client OpenAI ha retry automatici disabilitati per evitare duplicazioni silenziose. L'annullamento del widget scarta la risposta; una chiamata già ricevuta dal provider può comunque essere conteggiata.

## Contratto HTTP

`POST /api/review`

Header obbligatori:

- `Authorization: Bearer <token ArcGIS dell'IT>`
- `Content-Type: application/json`
- origine presente nella lista autorizzata

Richiesta: `{"testo":"Descrizione scritta dall'IT"}`. Campi ulteriori vengono rifiutati. Limite: 8.000 unità UTF-16, ulteriormente ridotto dal widget alla lunghezza del campo ArcGIS quando disponibile.

Risposta 200: `version`, `request_id`, `originale`, `testo_revisionato`, `controlli`, `ambiguita`, `elementi_protetti_invariati`, `accettabile`. Se `accettabile=false`, il widget mostra la proposta e i dubbi ma disabilita l'applicazione.

Errori: 400 input, 401 sessione, 403 origine/organizzazione/ruolo, 413 richiesta eccessiva, 415 formato, 429 limite, 502 dipendenza/modello, 504 timeout. Gli errori esterni sono restituiti in forma generica.

## Verifiche eseguite

Sono stati superati 48 test con Python 3.12 e le versioni installate dai vincoli di `requirements.txt`. Coprono:

- revisione e confronto separati;
- modifiche di date, orari, superfici, codici, unità, segni, omissioni e duplicazioni;
- scambio di attribuzione fra numeri identici, demandato e simulato nel confronto AI;
- ambiguità, incertezza, output fuori schema, incompleto o eccessivo;
- sessioni anonime/disabilitate/esterne, utenti non censiti, TR e record Rubrica;
- contratto HTTP, CORS, dimensioni, timeout, limiti e oscuramento degli errori;
- chiamate reali attraverso l'SDK OpenAI Python verso un trasporto simulato, verificando schemi strict, `store=false` e i due deployment.

Non è stata eseguita una chiamata a un modello Azure reale né una pubblicazione. Il collaudo operativo dovrà verificare Managed Identity, CORS, lettura della tabella utenti, entrambe le istanze del widget e qualità linguistica su testi CBSM campione.

Riferimenti ufficiali: [Azure Functions Python](https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-python), [Flex Consumption](https://learn.microsoft.com/en-us/azure/azure-functions/flex-consumption-plan), [Structured Outputs](https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/structured-outputs), [API v1](https://learn.microsoft.com/en-us/azure/foundry/openai/api-version-lifecycle), [Managed Identity](https://learn.microsoft.com/en-us/azure/app-service/overview-managed-identity), [Portal Self Esri](https://developers.arcgis.com/rest/users-groups-and-items/portal-self/).
