export type GuideRole = '*' | 'TR' | 'IT' | 'CS' | 'RIT' | 'DT' | 'IA' | 'RIA' | 'DA' | 'ADMIN'

export type GuideBlock =
  | { type: 'heading2' | 'heading3'; id: string; text: string }
  | { type: 'lead' | 'paragraph' | 'bullet' | 'figure'; text: string }
  | { type: 'step'; number: number | null; text: string }
  | { type: 'callout'; title: string; text: string }
  | { type: 'table'; headers: string[]; rows: string[][] }

export interface GuideChapter { id: string; order: number; title: string; roles: GuideRole[]; blocks: GuideBlock[] }
export interface GuideQuickLink { label: string; description: string; targetChapterId: string }

export const GUIDE_VERSION = '29 settembre 2026'

export const GUIDE_CHAPTERS: GuideChapter[] = [
  {
    "id": "come-usare-questo-manuale",
    "order": 0,
    "title": "Come usare questo manuale",
    "roles": [
      "*"
    ],
    "blocks": [
      {
        "type": "callout",
        "title": "Finalità del manuale",
        "text": "Questa guida descrive il lavoro reale nel GII: come una pratica arriva a ciascun ruolo, quali controlli eseguire, quali dati possono essere modificati, quali comandi usare, che cosa viene registrato e a chi passa la pratica dopo ogni azione. Le procedure sono state ricostruite dalla base applicativa allegata e non da versioni precedenti o da ipotesi sul significato dei ruoli."
      },
      {
        "type": "lead",
        "text": "Il manuale è pensato sia per una lettura lineare, così da comprendere l’intero procedimento, sia per la consultazione per attività. Le sezioni operative seguono il percorso reale della pratica e non l’ordine tecnico dei componenti dell’applicazione."
      },
      {
        "type": "callout",
        "title": "Survey123 non è il GII",
        "text": "Il Tecnico rilevatore non opera nel GII pubblicato. Una rilevazione può arrivare al GII da Survey123; da quel momento il manuale descrive il lavoro interno al GII. Non sono quindi illustrate le modalità di compilazione di Survey123."
      }
    ]
  },
  {
    "id": "cap-1-accesso-ruoli-e-visibilita",
    "order": 1,
    "title": "1. Accesso, ruoli e visibilità",
    "roles": [
      "*"
    ],
    "blocks": [
      {
        "type": "lead",
        "text": "L’accesso non dipende soltanto dall’account ArcGIS Online: il profilo deve risultare abilitato nel GII con almeno un’assegnazione valida. Le funzioni e le pratiche visibili dipendono dalle assegnazioni associate all’utente."
      },
      {
        "type": "heading2",
        "id": "cap-1-accesso-ruoli-e-visibilita-1-1-chi-puo-accedere-al-gii",
        "text": "1.1 Chi può accedere al GII"
      },
      {
        "type": "table",
        "headers": [
          "Ruolo",
          "Accesso al GII",
          "Perimetro operativo principale"
        ],
        "rows": [
          [
            "Tecnico rilevatore",
            "No, se dispone soltanto del ruolo di Tecnico rilevatore",
            "Origina la rilevazione tramite Survey123; la rilevazione entra poi nel GII."
          ],
          [
            "Istruttore tecnico",
            "Sì",
            "Pratiche del proprio ambito tecnico; lavora le pratiche assegnate e può creare una nuova pratica."
          ],
          [
            "Capo Settore",
            "Sì",
            "Pratiche del settore/ufficio di competenza; assegna le rilevazioni provenienti dal Tecnico rilevatore e verifica le istruttorie."
          ],
          [
            "Responsabile dell’istruttoria tecnica",
            "Sì",
            "Pratiche dell’area tecnica di competenza; valida e, quando previsto, interviene su Occorrenza e Grado di gravità."
          ],
          [
            "Direttore d’Area",
            "Sì",
            "Pratiche dell’area tecnica di competenza; approva, rimanda o respinge la fase tecnica."
          ],
          [
            "Istruttore amministrativo",
            "Sì",
            "Pratiche amministrative assegnate allo specifico Istruttore amministrativo."
          ],
          [
            "Responsabile dell’istruttoria amministrativa",
            "Sì",
            "Pratiche della fase amministrativa; assegna, verifica e dispone eventuali integrazioni."
          ],
          [
            "Direttore Area AA.GG. e P.F.",
            "Sì",
            "Consultazione della fase amministrativa e ricezione dei documenti da firmare secondo il flusso documentale."
          ],
          [
            "Amministratore",
            "Sì",
            "Visualizzazione completa e funzioni di amministrazione/configurazione previste."
          ]
        ]
      },
      {
        "type": "callout",
        "title": "Account non abilitato",
        "text": "Se l’utente è autenticato su ArcGIS Online ma non possiede un’assegnazione GII abilitata, l’applicazione segnala che l’account non è abilitato per l’accesso al gestionale. L’appartenenza amministrativa all’organizzazione ArcGIS Online, da sola, non sostituisce la registrazione nel GII."
      },
      {
        "type": "heading2",
        "id": "cap-1-accesso-ruoli-e-visibilita-1-2-utenti-con-piu-assegnazioni",
        "text": "1.2 Utenti con più assegnazioni"
      },
      {
        "type": "paragraph",
        "text": "Uno stesso account può avere più assegnazioni gestionali. Le funzioni di navigazione considerano l’insieme dei ruoli associati all’utente; la visibilità delle pratiche resta comunque vincolata all’area, al settore, all’ufficio e, per l’Istruttore amministrativo, alla specifica assegnazione della pratica."
      },
      {
        "type": "heading2",
        "id": "cap-1-accesso-ruoli-e-visibilita-1-3-perimetro-delle-pratiche",
        "text": "1.3 Perimetro delle pratiche"
      },
      {
        "type": "bullet",
        "text": "L’Istruttore tecnico e il Capo Settore vedono le pratiche del proprio ambito tecnico/settoriale configurato; nell’area AGR il sistema distingue i settori D1-D6, mentre nell’area TEC opera il settore DS."
      },
      {
        "type": "bullet",
        "text": "Il Responsabile dell’istruttoria tecnica e il Direttore d’Area operano sul perimetro della propria area tecnica, AGR o TEC."
      },
      {
        "type": "bullet",
        "text": "Il Responsabile dell’istruttoria amministrativa e il Direttore Area AA.GG. e P.F. operano nel perimetro amministrativo."
      },
      {
        "type": "bullet",
        "text": "L’Istruttore amministrativo vede le pratiche amministrative a lui assegnate; l’assegnazione personale è quindi parte del filtro operativo."
      },
      {
        "type": "bullet",
        "text": "L’Amministratore dispone della visualizzazione completa senza i filtri di ruolo applicati agli altri profili."
      },
      {
        "type": "heading2",
        "id": "cap-1-accesso-ruoli-e-visibilita-1-4-funzioni-di-navigazione-per-ruolo",
        "text": "1.4 Funzioni di navigazione per ruolo"
      },
      {
        "type": "table",
        "headers": [
          "Funzione",
          "Ruoli che la vedono nel menu"
        ],
        "rows": [
          [
            "Home",
            "Tutti gli utenti abilitati"
          ],
          [
            "Elenco pratiche",
            "Tutti"
          ],
          [
            "Nuova pratica",
            "Istruttore tecnico, Amministratore"
          ],
          [
            "Mappa",
            "Tutti"
          ],
          [
            "Gestione Prezzari",
            "Responsabile dell’istruttoria tecnica, Amministratore"
          ],
          [
            "Parametri sanzionatori",
            "Responsabile dell’istruttoria amministrativa, Amministratore"
          ],
          [
            "Rubrica",
            "Responsabile dell’istruttoria amministrativa, Amministratore"
          ],
          [
            "Dashboard",
            "Tutti"
          ],
          [
            "Report",
            "Tutti"
          ],
          [
            "Gestione Utenti",
            "Amministratore"
          ],
          [
            "Regolamento irriguo",
            "Tutti"
          ],
          [
            "Atto di accertamento",
            "Istruttore amministrativo, Amministratore dalla Home; la lavorazione è comunque raggiunta anche dal workflow della pratica"
          ]
        ]
      }
    ]
  },
  {
    "id": "cap-2-orientarsi-home-elenco-pratiche-dettaglio-e-allarmi",
    "order": 2,
    "title": "2. Orientarsi: Home, Elenco pratiche, Dettaglio e allarmi",
    "roles": [
      "*"
    ],
    "blocks": [
      {
        "type": "lead",
        "text": "Il punto operativo ordinario è l’Elenco pratiche. Home e menu portano alle funzioni generali; l’Elenco separa ciò che richiede un intervento dell’utente da ciò che è in lavorazione presso altri ruoli."
      },
      {
        "type": "heading2",
        "id": "cap-2-orientarsi-home-elenco-pratiche-dettaglio-e-allarmi-2-1-home",
        "text": "2.1 Home"
      },
      {
        "type": "paragraph",
        "text": "La Home espone le schede coerenti con il profilo corrente. Le voci principali sono Elenco pratiche, Nuova pratica, Mappa, Dashboard, Report, Gestione prezzari, Parametri sanzionatori, Rubrica, Gestione utenti, Regolamento irriguo e, per l’Istruttore amministrativo e l’Amministratore, Atto di accertamento."
      },
      {
        "type": "figure",
        "text": "Figura – Home del GII e funzioni disponibili per ruolo"
      },
      {
        "type": "heading2",
        "id": "cap-2-orientarsi-home-elenco-pratiche-dettaglio-e-allarmi-2-2-elenco-pratiche-le-tre-viste-operative",
        "text": "2.2 Elenco pratiche: le tre viste operative"
      },
      {
        "type": "table",
        "headers": [
          "Scheda",
          "Cosa contiene",
          "Quando usarla"
        ],
        "rows": [
          [
            "In attesa mia",
            "Solo le pratiche sulle quali il ruolo corrente deve agire adesso.",
            "È la vista di lavoro quotidiana."
          ],
          [
            "In attesa di altri",
            "Pratiche visibili all’utente ma attualmente in carico o in attesa di un altro ruolo. Le pratiche respinte/chiuse non restano qui.",
            "Per seguire le pratiche già trasmesse e capire dove si trovano."
          ],
          [
            "Tutte le pratiche",
            "L’insieme delle pratiche accessibili al profilo, comprese quelle respinte o concluse.",
            "Per ricerca, consultazione storica e ricostruzione dell’iter."
          ]
        ]
      },
      {
        "type": "paragraph",
        "text": "Il tipo pratica è mostrato come “Rilevazione” finché non esiste un numero ufficiale di rapporto tecnico; dopo la formalizzazione diventa “Rapporto tecnico”. Tra le informazioni principali figurano Fase istruttoria, Stato pratica, Eseguito da, Trasmesso a e Ultimo aggiornamento."
      },
      {
        "type": "paragraph",
        "text": "Lo stato sintetico del ruolo è normalizzato in etichette operative: Da prendere in carico, In carico, Rimandato, Trasmesso, Istruttoria assegnata e Respinto. Non va confuso con il singolo evento registrato nell’Iter."
      },
      {
        "type": "heading3",
        "id": "cap-2-orientarsi-home-elenco-pratiche-dettaglio-e-allarmi-filtrare-l-elenco-pratiche",
        "text": "Filtrare l’Elenco pratiche"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Aprire Elenco pratiche e scegliere anzitutto la scheda coerente con lo scopo: In attesa mia, In attesa di altri o Tutte le pratiche."
      },
      {
        "type": "step",
        "number": 2,
        "text": "Aprire il pannello filtri quando serve restringere l’elenco e impostare uno o più criteri disponibili."
      },
      {
        "type": "step",
        "number": 3,
        "text": "Ordinare le colonne utili; per il lavoro corrente è normalmente utile mantenere visibile l’Ultimo aggiornamento."
      },
      {
        "type": "step",
        "number": 4,
        "text": "Per azzerare la ricerca utilizzare Pulisci filtri: questo evita che una pratica risulti apparentemente “scomparsa” a causa di un filtro rimasto attivo."
      },
      {
        "type": "step",
        "number": 5,
        "text": "Selezionare la pratica per popolare Dettaglio pratica e Azioni."
      },
      {
        "type": "figure",
        "text": "Figura – Elenco pratiche con schede e pannello filtri"
      },
      {
        "type": "callout",
        "title": "Amministratore",
        "text": "L’amministratore vede un’indicazione esplicita di visualizzazione completa senza filtri ruolo. Questa vista è utile per assistenza e controllo, ma non modifica il normale perimetro degli altri utenti."
      },
      {
        "type": "heading2",
        "id": "cap-2-orientarsi-home-elenco-pratiche-dettaglio-e-allarmi-2-3-dettaglio-pratica-consultare-senza-lavorare",
        "text": "2.3 Dettaglio pratica: consultare senza lavorare"
      },
      {
        "type": "paragraph",
        "text": "Il Dettaglio pratica serve alla consultazione. Le schede principali sono Trasgressore, Violazione, Luoghi e dati, Mappa, Nota spese, Allegati e Iter. Le modifiche operative si eseguono invece nelle funzioni di istruttoria aperte dal workflow."
      },
      {
        "type": "bullet",
        "text": "Violazione: riepiloga gli articoli e, quando disponibile, consente di leggere il testo regolamentare associato."
      },
      {
        "type": "bullet",
        "text": "Mappa: visualizza il punto della pratica; se non è stato impostato, il sistema lo segnala."
      },
      {
        "type": "bullet",
        "text": "Nota spese: mostra i costi registrati, comprese le casistiche Art. 30."
      },
      {
        "type": "bullet",
        "text": "Allegati: separa la documentazione tecnica e amministrativa e consente l’apertura dei file senza modificarli."
      },
      {
        "type": "bullet",
        "text": "Iter: ricostruisce cicli, passaggi, modifiche ai dati e variazioni degli allegati."
      },
      {
        "type": "heading2",
        "id": "cap-2-orientarsi-home-elenco-pratiche-dettaglio-e-allarmi-2-4-allarmi-e-scadenze",
        "text": "2.4 Allarmi e scadenze"
      },
      {
        "type": "paragraph",
        "text": "La campanella nell’intestazione compare quando esistono allarmi. Il pannello “Allarmi e scadenze” mostra la pratica, il tipo di evento, il mittente, il ruolo, la data e, per le scadenze, il termine rilevante. Il comando Apri pratica porta alla pratica interessata."
      },
      {
        "type": "heading3",
        "id": "cap-2-orientarsi-home-elenco-pratiche-dettaglio-e-allarmi-gestire-un-allarme-di-workflow",
        "text": "Gestire un allarme di workflow"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Aprire la campanella e leggere il titolo dell’allarme, il mittente e la pratica."
      },
      {
        "type": "step",
        "number": 2,
        "text": "Usare Apri pratica. Il sistema porta all’Elenco pratiche e forza l’aggiornamento necessario a rendere individuabile la pratica anche se la vista precedente o i filtri l’avrebbero esclusa."
      },
      {
        "type": "step",
        "number": 3,
        "text": "Se la pratica è “Da prendere in carico”, usare Prendi in carico prima di modificare i dati o proseguire il workflow."
      },
      {
        "type": "step",
        "number": 4,
        "text": "Dopo la presa in carico l’allarme operativo corrente viene rimosso."
      },
      {
        "type": "step",
        "number": 5,
        "text": "Gli allarmi che non rappresentano una presa in carico possono, quando previsto, essere archiviati dal pannello."
      },
      {
        "type": "callout",
        "title": "Attenzione",
        "text": "Gli allarmi di workflow che richiedono la presa in carico non vanno trattati come semplici promemoria: la loro chiusura deriva dall’azione operativa sulla pratica."
      }
    ]
  },
  {
    "id": "cap-3-il-ciclo-completo-della-pratica",
    "order": 3,
    "title": "3. Il ciclo completo della pratica",
    "roles": [
      "*"
    ],
    "blocks": [
      {
        "type": "lead",
        "text": "Il flusso ordinario è una catena di responsabilità. Le integrazioni possono far retrocedere temporaneamente la pratica e poi risalire fino al richiedente; soltanto a quel punto riprende il percorso ordinario."
      },
      {
        "type": "table",
        "headers": [
          "Fase",
          "Passaggio ordinario",
          "Risultato"
        ],
        "rows": [
          [
            "Origine",
            "Tecnico rilevatore tramite Survey123 → Capo Settore, oppure l’Istruttore tecnico crea direttamente la pratica nel GII",
            "Rilevazione disponibile nel GII."
          ],
          [
            "Istruttoria tecnica",
            "Istruttore tecnico → Capo Settore",
            "Istruttoria trasmessa per verifica; per una pratica creata dall’Istruttore tecnico la prima trasmissione è una nuova rilevazione."
          ],
          [
            "Verifica",
            "Capo Settore → Responsabile dell’istruttoria tecnica",
            "Istruttoria verificata; alla prima verifica positiva viene generato, se assente, il numero ufficiale di rapporto tecnico."
          ],
          [
            "Validazione",
            "Responsabile dell’istruttoria tecnica → Direttore d’Area",
            "Istruttoria tecnica validata."
          ],
          [
            "Approvazione",
            "Direttore d’Area → Responsabile dell’istruttoria amministrativa",
            "Istruttoria tecnica approvata; ingresso nel circuito amministrativo."
          ],
          [
            "Assegnazione amministrativa",
            "Responsabile dell’istruttoria amministrativa → Istruttore amministrativo",
            "Istruttoria amministrativa assegnata."
          ],
          [
            "Istruttoria amministrativa",
            "L’Istruttore amministrativo prepara la proposta e trasmette il fascicolo → Responsabile dell’istruttoria amministrativa",
            "Fascicolo trasmesso per verifica."
          ],
          [
            "Validazione amministrativa",
            "Responsabile dell’istruttoria amministrativa → Istruttore amministrativo",
            "Istruttoria amministrativa validata; l’Istruttore amministrativo prosegue gli adempimenti documentali."
          ],
          [
            "Atto di accertamento",
            "L’Istruttore amministrativo prepara → il Responsabile dell’istruttoria amministrativa verifica → l’Istruttore amministrativo completa firma e protocollo",
            "Atto approvato, firmato e protocollato."
          ],
          [
            "Post-notifica",
            "L’Istruttore amministrativo o l’ufficio amministrativo registra esito, pagamento, ricorso/CdA, riaperture e definizione",
            "Pratica definita secondo l’esito effettivo."
          ]
        ]
      },
      {
        "type": "callout",
        "title": "Regola delle integrazioni",
        "text": "Quando un ruolo sta soltanto facendo risalire l’esito di un’integrazione richiesta da un superiore, l’evento è “ESITO INTEGRAZIONE TRASMESSO”. La normale verifica/validazione/approvazione riprende quando l’esito arriva al ruolo che aveva richiesto l’integrazione."
      },
      {
        "type": "figure",
        "text": "Figura – Schema generale del workflow tecnico-amministrativo"
      }
    ]
  },
  {
    "id": "cap-4-nuova-rilevazione-e-nuova-pratica",
    "order": 4,
    "title": "4. Nuova rilevazione e nuova pratica",
    "roles": [
      "CS",
      "IT",
      "ADMIN"
    ],
    "blocks": [
      {
        "type": "heading2",
        "id": "cap-4-nuova-rilevazione-e-nuova-pratica-4-1-caso-a-rilevazione-proveniente-dal-tr",
        "text": "4.1 Caso A: rilevazione proveniente dal Tecnico rilevatore"
      },
      {
        "type": "paragraph",
        "text": "Una rilevazione effettuata dal Tecnico rilevatore tramite Survey123 entra nel GII e viene indirizzata al Capo Settore. Il Capo Settore riceve l’allarme “Nuova rilevazione ricevuta”. In questo caso la pratica non è ancora assegnata a un Istruttore tecnico."
      },
      {
        "type": "heading3",
        "id": "cap-4-nuova-rilevazione-e-nuova-pratica-cs-assegnare-una-rilevazione-proveniente-dal-tr",
        "text": "Capo Settore — assegnare una rilevazione proveniente dal Tecnico rilevatore"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Aprire l’allarme “Nuova rilevazione ricevuta” oppure entrare in Elenco pratiche → In attesa mia e selezionare la rilevazione."
      },
      {
        "type": "step",
        "number": 2,
        "text": "Controllare nel Dettaglio gli elementi già rilevati, in particolare trasgressore, violazione, localizzazione, dati tecnici e allegati."
      },
      {
        "type": "step",
        "number": 3,
        "text": "Usare Prendi in carico se lo stato del Capo Settore è Da prendere in carico."
      },
      {
        "type": "step",
        "number": 4,
        "text": "Aprire Gestisci istruttoria. Per una rilevazione proveniente dal Tecnico rilevatore e non ancora assegnata, scegliere l’azione di assegnazione all’Istruttore tecnico."
      },
      {
        "type": "step",
        "number": 5,
        "text": "Selezionare l’Istruttore tecnico competente tra quelli disponibili per il contesto della pratica e confermare."
      },
      {
        "type": "step",
        "number": 6,
        "text": "Verificare che la pratica esca da In attesa mia e passi al destinatario."
      },
      {
        "type": "callout",
        "title": "Cosa accade dopo",
        "text": "L’Istruttore tecnico riceve una pratica assegnata da prendere in carico. L’assegnazione viene tracciata nell’Iter e il destinatario viene registrato."
      },
      {
        "type": "callout",
        "title": "Attenzione",
        "text": "Se la rilevazione è stata creata direttamente da un Istruttore tecnico, il Capo Settore non deve assegnarla di nuovo: il sistema riconosce già l’Istruttore tecnico associato."
      },
      {
        "type": "heading2",
        "id": "cap-4-nuova-rilevazione-e-nuova-pratica-4-2-caso-b-pratica-creata-direttamente-dall-it",
        "text": "4.2 Caso B: pratica creata direttamente dall’Istruttore tecnico"
      },
      {
        "type": "paragraph",
        "text": "La funzione Nuova pratica è disponibile all’Istruttore tecnico e all’Amministratore. L’Istruttore tecnico che crea la pratica viene associato direttamente come istruttore e la pratica nasce già in carico: non è necessaria una successiva presa in carico dello stesso Istruttore tecnico."
      },
      {
        "type": "heading3",
        "id": "cap-4-nuova-rilevazione-e-nuova-pratica-it-creare-una-nuova-pratica",
        "text": "Istruttore tecnico — creare una nuova pratica"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Aprire Nuova pratica dalla Home o dal menu."
      },
      {
        "type": "step",
        "number": 2,
        "text": "Verificare i Dati generali proposti dal profilo: Area, Settore, Ufficio di zona, Istruttore tecnico e Data rilevazione. Correggere soltanto i dati che l’interfaccia consente effettivamente di modificare."
      },
      {
        "type": "step",
        "number": 3,
        "text": "Compilare il Trasgressore scegliendo il tipo di soggetto e i dati anagrafici pertinenti; gestire anche il domicilio per le notifiche quando diverso."
      },
      {
        "type": "step",
        "number": 4,
        "text": "Compilare Violazione selezionando gli articoli/casistiche effettivamente accertati e i dati richiesti per quelle casistiche."
      },
      {
        "type": "step",
        "number": 5,
        "text": "Compilare Luoghi e dati tecnici e impostare il punto sulla mappa quando richiesto dalla violazione."
      },
      {
        "type": "step",
        "number": 6,
        "text": "Compilare la Nota spese se la violazione rientra nelle casistiche che la attivano."
      },
      {
        "type": "step",
        "number": 7,
        "text": "Premere Salva. Il primo salvataggio crea la pratica e assegna l’identificativo; da questo momento diventano disponibili anche allegati e anteprima fascicolo."
      },
      {
        "type": "step",
        "number": 8,
        "text": "Aggiungere o modificare gli allegati necessari e salvare nuovamente, perché le modifiche agli allegati diventano definitive con il salvataggio complessivo della pratica."
      },
      {
        "type": "step",
        "number": 9,
        "text": "Quando l’istruttoria tecnica è completa, tornare alle Azioni e usare il comando di trasmissione della nuova rilevazione al Capo Settore."
      },
      {
        "type": "callout",
        "title": "Cosa accade dopo",
        "text": "Il Capo Settore riceve “Nuova rilevazione ricevuta”. A differenza del caso in cui la rilevazione proviene dal Tecnico rilevatore, l’Istruttore tecnico è già associato: il Capo Settore deve procedere alla verifica, non a una nuova assegnazione."
      },
      {
        "type": "figure",
        "text": "Figura – Creazione di una nuova pratica da parte dell’Istruttore tecnico"
      }
    ]
  },
  {
    "id": "cap-5-istruttoria-tecnica-dell-it",
    "order": 5,
    "title": "5. Istruttoria tecnica dell’Istruttore tecnico",
    "roles": [
      "IT",
      "ADMIN"
    ],
    "blocks": [
      {
        "type": "lead",
        "text": "L’Istruttore tecnico è il principale ruolo di compilazione della fase tecnica. Può lavorare una pratica quando è assegnata al suo username ed è in carico. Una pratica rimandata per integrazione torna modificabile soltanto dopo una nuova presa in carico."
      },
      {
        "type": "heading2",
        "id": "cap-5-istruttoria-tecnica-dell-it-5-1-dati-tecnici-modificabili",
        "text": "5.1 Dati tecnici modificabili"
      },
      {
        "type": "table",
        "headers": [
          "Sezione",
          "Contenuto operativo"
        ],
        "rows": [
          [
            "Dati generali",
            "Area, Settore, Ufficio di zona; riferimenti del Tecnico rilevatore; data rilevazione; Istruttore tecnico; data di trasmissione al Capo Settore."
          ],
          [
            "Trasgressore",
            "Persona fisica o giuridica, dati fiscali e recapiti, qualifica/rapporto con il fondo, domicilio per notifiche, rappresentante legale e relative informazioni, note."
          ],
          [
            "Violazione",
            "Articoli e fattispecie selezionate; superfici; tipo di abuso; occorrenza; descrizione dettagliata; circostanze rilevanti; presenza del trasgressore."
          ],
          [
            "Luoghi e dati tecnici",
            "Descrizione luogo, Distretto, Comizio, Idrante, matricole, localizzazione cartografica."
          ],
          [
            "Nota spese",
            "Costi collegati alle violazioni abilitate, quantità, attrezzature, eventuali cauzioni/risarcimenti, riepilogo."
          ],
          [
            "Allegati",
            "Documentazione tecnica, con aggiunta, rimozione, sostituzione e rotazione; le variazioni diventano definitive con Salva."
          ],
          [
            "Anteprima fascicolo",
            "Consultazione del fascicolo costruito con i dati correnti e la documentazione disponibile."
          ]
        ]
      },
      {
        "type": "heading2",
        "id": "cap-5-istruttoria-tecnica-dell-it-5-2-controlli-al-salvataggio",
        "text": "5.2 Controlli al salvataggio"
      },
      {
        "type": "bullet",
        "text": "Codice fiscale della persona fisica, se valorizzato: 16 caratteri."
      },
      {
        "type": "bullet",
        "text": "Partita IVA della persona giuridica, se valorizzata: 11 cifre."
      },
      {
        "type": "bullet",
        "text": "Eventuali matricole/tessere soggette a controllo non possono essere duplicate dove il sistema applica l’univocità."
      },
      {
        "type": "bullet",
        "text": "Art. 15: il tipo Parziale/Totale è obbligatorio. Nel caso Parziale, superficie dichiarata e irrigata devono essere positive e la superficie irrigata deve risultare superiore a quella dichiarata; nel caso Totale la superficie irrigata deve essere positiva e la dichiarata viene ricondotta a zero."
      },
      {
        "type": "bullet",
        "text": "Art. 16: la superficie dichiarata deve essere positiva."
      },
      {
        "type": "bullet",
        "text": "Art. 17: va selezionata la fattispecie; per la variazione tardiva sono richieste le superfici dichiarata e variata; per la rinuncia tardiva è richiesta la dichiarata e le altre superfici pertinenti vengono ricondotte a zero."
      },
      {
        "type": "bullet",
        "text": "Se è stata selezionata almeno una violazione, va indicata la presenza/assenza del trasgressore quando il campo è richiesto."
      },
      {
        "type": "bullet",
        "text": "Per le violazioni che richiedono la localizzazione, l’assenza del punto mappa impedisce il salvataggio."
      },
      {
        "type": "bullet",
        "text": "Le tessere/matricole previste in alcune Note spese devono rispettare il formato a 5 cifre."
      },
      {
        "type": "bullet",
        "text": "Una Nota spese iniziata ma incompleta deve essere completata oppure eliminata prima di poter proseguire."
      },
      {
        "type": "heading3",
        "id": "cap-5-istruttoria-tecnica-dell-it-it-completare-e-trasmettere-l-istruttoria-tecnica",
        "text": "Istruttore tecnico — completare e trasmettere l’istruttoria tecnica"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Aprire la pratica da In attesa mia. Se è Da prendere in carico, usare Prendi in carico."
      },
      {
        "type": "step",
        "number": 2,
        "text": "Entrare nella lavorazione tecnica e verificare, una sezione alla volta, Trasgressore, Violazione, Luoghi e dati tecnici, Nota spese e Allegati."
      },
      {
        "type": "step",
        "number": 3,
        "text": "Correggere i dati e premere Salva. Risolvere gli eventuali controlli bloccanti mostrati dal sistema."
      },
      {
        "type": "step",
        "number": 4,
        "text": "Controllare l’Anteprima fascicolo e, se necessario, riaprire la sezione che contiene il dato da correggere."
      },
      {
        "type": "step",
        "number": 5,
        "text": "Tornare alle Azioni. Se è la prima trasmissione di una pratica creata direttamente dall’Istruttore tecnico, usare Trasmetti nuova rilevazione; negli altri casi usare Trasmetti istruttoria."
      },
      {
        "type": "step",
        "number": 6,
        "text": "Confermare la trasmissione al Capo Settore."
      },
      {
        "type": "callout",
        "title": "Cosa accade dopo",
        "text": "Il Capo Settore diventa il ruolo competente. L’Iter registra “Nuova rilevazione trasmessa” oppure “Istruttoria trasmessa per verifica” a seconda del caso."
      }
    ]
  },
  {
    "id": "cap-6-verifica-del-capo-settore",
    "order": 6,
    "title": "6. Verifica del Capo Settore",
    "roles": [
      "CS",
      "ADMIN"
    ],
    "blocks": [
      {
        "type": "lead",
        "text": "Il Capo Settore può trovarsi davanti a due casi differenti che producono lo stesso allarme “Nuova rilevazione ricevuta”: una rilevazione proveniente dal Tecnico rilevatore e ancora da assegnare oppure una nuova pratica già creata e istruita da un Istruttore tecnico. La presenza o meno dell’Istruttore tecnico assegnato determina cosa fare."
      },
      {
        "type": "heading2",
        "id": "cap-6-verifica-del-capo-settore-6-1-distinguere-i-due-casi",
        "text": "6.1 Distinguere i due casi"
      },
      {
        "type": "table",
        "headers": [
          "Caso",
          "Segnale operativo",
          "Azione del Capo Settore"
        ],
        "rows": [
          [
            "Rilevazione proveniente dal Tecnico rilevatore",
            "Non risulta ancora un Istruttore tecnico assegnato.",
            "Prendere in carico e assegnare un Istruttore tecnico."
          ],
          [
            "Nuova pratica creata dall’Istruttore tecnico",
            "L’Istruttore tecnico creatore è già associato alla pratica.",
            "Prendere in carico e procedere direttamente alla verifica; non riassegnare."
          ]
        ]
      },
      {
        "type": "heading3",
        "id": "cap-6-verifica-del-capo-settore-cs-verificare-l-istruttoria",
        "text": "Capo Settore — verificare l’istruttoria"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Aprire la pratica da In attesa mia e usare Prendi in carico, se richiesto."
      },
      {
        "type": "step",
        "number": 2,
        "text": "Consultare Dettaglio pratica e verificare coerenza di trasgressore, violazioni, localizzazione, Nota spese, allegati e Iter."
      },
      {
        "type": "step",
        "number": 3,
        "text": "Aprire Gestisci istruttoria."
      },
      {
        "type": "step",
        "number": 4,
        "text": "Se la pratica è corretta, scegliere Conforme e confermare la trasmissione al Responsabile istruttoria tecnica."
      },
      {
        "type": "step",
        "number": 5,
        "text": "Se servono correzioni, usare il rimando per integrazione verso l’Istruttore tecnico e inserire la motivazione richiesta."
      },
      {
        "type": "step",
        "number": 6,
        "text": "Soltanto nella prima valutazione, quando consentito, è disponibile il respingimento della rilevazione; dopo che la pratica ha assunto la forma di rapporto tecnico il respingimento segue il diverso contesto di istruttoria previsto dal workflow."
      },
      {
        "type": "callout",
        "title": "Cosa accade dopo",
        "text": "Con esito positivo il sistema registra “Istruttoria verificata” e invia la pratica al Responsabile dell’istruttoria tecnica. Alla prima verifica positiva viene generato, se non esiste già, il numero ufficiale del rapporto tecnico e la relativa data."
      },
      {
        "type": "figure",
        "text": "Figura – Gestisci istruttoria del Capo Settore"
      }
    ]
  },
  {
    "id": "cap-7-validazione-del-responsabile-istruttoria-tecnica",
    "order": 7,
    "title": "7. Validazione del Responsabile istruttoria tecnica",
    "roles": [
      "RIT",
      "ADMIN"
    ],
    "blocks": [
      {
        "type": "lead",
        "text": "Il Responsabile dell’istruttoria tecnica riceve la pratica verificata dal Capo Settore. Nella lavorazione tecnica il suo potere di modifica è limitato: può intervenire sui dati di Occorrenza e Grado di gravità, mentre le altre sezioni tecniche restano in sola lettura."
      },
      {
        "type": "heading3",
        "id": "cap-7-validazione-del-responsabile-istruttoria-tecnica-rit-validare-una-pratica",
        "text": "Responsabile dell’istruttoria tecnica — validare una pratica"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Aprire l’allarme o In attesa mia, selezionare la pratica e usare Prendi in carico."
      },
      {
        "type": "step",
        "number": 2,
        "text": "Consultare il fascicolo tecnico e l’Iter per verificare il percorso già svolto."
      },
      {
        "type": "step",
        "number": 3,
        "text": "Se necessario aprire la lavorazione tecnica: modificare soltanto Occorrenza e Grado di gravità, gli unici dati tecnici operativi riservati al Responsabile dell’istruttoria tecnica nella base analizzata, quindi Salva."
      },
      {
        "type": "step",
        "number": 4,
        "text": "Aprire Gestisci istruttoria."
      },
      {
        "type": "step",
        "number": 5,
        "text": "Se l’istruttoria è corretta, scegliere Conforme e confermare la trasmissione al Direttore d’Area."
      },
      {
        "type": "step",
        "number": 6,
        "text": "Se servono integrazioni, rimandare la pratica all’Istruttore tecnico con motivazione. Il Responsabile dell’istruttoria tecnica non dispone di un respingimento finale analogo a quello del Direttore d’Area."
      },
      {
        "type": "callout",
        "title": "Cosa accade dopo",
        "text": "Con esito positivo viene registrato “Istruttoria validata” e il Direttore d’Area riceve la pratica."
      }
    ]
  },
  {
    "id": "cap-8-approvazione-del-direttore-d-area",
    "order": 8,
    "title": "8. Approvazione del Direttore d’Area",
    "roles": [
      "DT",
      "ADMIN"
    ],
    "blocks": [
      {
        "type": "lead",
        "text": "Il Direttore d’Area conclude la fase di approvazione tecnica. Non modifica i dati dell’istruttoria tecnica: consulta la pratica, la approva, richiede un’integrazione oppure la respinge nei casi previsti."
      },
      {
        "type": "heading3",
        "id": "cap-8-approvazione-del-direttore-d-area-dt-approvare-integrare-o-respingere",
        "text": "Direttore d’Area — approvare, integrare o respingere"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Aprire la pratica ricevuta e usare Prendi in carico."
      },
      {
        "type": "step",
        "number": 2,
        "text": "Controllare il fascicolo, la Nota spese, gli allegati e l’Iter."
      },
      {
        "type": "step",
        "number": 3,
        "text": "Aprire Gestisci istruttoria."
      },
      {
        "type": "step",
        "number": 4,
        "text": "Per l’esito positivo selezionare Conforme e confermare: la pratica entra nella fase amministrativa ed è trasmessa al Responsabile dell’istruttoria amministrativa."
      },
      {
        "type": "step",
        "number": 5,
        "text": "Per una richiesta di integrazione selezionare l’esito negativo/da integrare e indicare gli aspetti da correggere. Se la richiesta riguarda esclusivamente Occorrenza e/o Grado di gravità, il sistema la instrada al Responsabile dell’istruttoria tecnica; negli altri casi tecnici la instrada all’Istruttore tecnico."
      },
      {
        "type": "step",
        "number": 6,
        "text": "Quando ricorrono i presupposti del workflow, il Direttore d’Area può respingere l’istruttoria tecnica. Il respingimento chiude il normale avanzamento verso la fase amministrativa."
      },
      {
        "type": "callout",
        "title": "Cosa accade dopo",
        "text": "Con approvazione positiva viene registrata “Istruttoria approvata” e il Responsabile dell’istruttoria amministrativa riceve la pratica nella fase amministrativa."
      }
    ]
  },
  {
    "id": "cap-9-integrazioni-tecniche",
    "order": 9,
    "title": "9. Integrazioni tecniche",
    "roles": [
      "IT",
      "CS",
      "RIT",
      "DT",
      "RIA",
      "ADMIN"
    ],
    "blocks": [
      {
        "type": "lead",
        "text": "Le integrazioni non sono semplici “ritorni indietro”: il sistema conserva chi ha richiesto la correzione e costruisce la risalita attraverso i ruoli necessari. Gli intermediari non devono attribuirsi una verifica/validazione ordinaria se stanno soltanto inoltrando l’esito dell’integrazione."
      },
      {
        "type": "table",
        "headers": [
          "Richiedente",
          "Destinazione iniziale",
          "Risalita dell’esito",
          "Quando riprende il flusso ordinario"
        ],
        "rows": [
          [
            "Capo Settore",
            "Istruttore tecnico",
            "Istruttore tecnico → Capo Settore",
            "Al Capo Settore, che verifica nuovamente."
          ],
          [
            "Responsabile dell’istruttoria tecnica",
            "Istruttore tecnico",
            "Istruttore tecnico → Capo Settore → Responsabile dell’istruttoria tecnica",
            "Quando l’esito arriva al Responsabile dell’istruttoria tecnica richiedente."
          ],
          [
            "Direttore d’Area",
            "Istruttore tecnico oppure Responsabile dell’istruttoria tecnica se solo Occorrenza/Grado",
            "Se Istruttore tecnico: Istruttore tecnico → Capo Settore → Responsabile dell’istruttoria tecnica → Direttore d’Area. Se Responsabile dell’istruttoria tecnica: Responsabile dell’istruttoria tecnica → Direttore d’Area.",
            "Al Direttore d’Area richiedente."
          ],
          [
            "Responsabile dell’istruttoria amministrativa — integrazione tecnica",
            "Responsabile dell’istruttoria tecnica",
            "Responsabile dell’istruttoria tecnica → Direttore d’Area → Responsabile dell’istruttoria amministrativa",
            "Al Responsabile dell’istruttoria amministrativa, che riprende la verifica amministrativa; il rientro non viene inoltrato automaticamente all’Istruttore amministrativo."
          ]
        ]
      },
      {
        "type": "heading3",
        "id": "cap-9-integrazioni-tecniche-ruolo-destinatario-rispondere-a-una-richiesta-di-integrazione",
        "text": "Ruolo destinatario — rispondere a una richiesta di integrazione"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Aprire l’allarme “Richiesta integrazione ricevuta” e la pratica."
      },
      {
        "type": "step",
        "number": 2,
        "text": "Usare Prendi in carico. Finché la pratica è soltanto rimandata e non ripresa, i dati restano bloccati secondo le regole del ruolo."
      },
      {
        "type": "step",
        "number": 3,
        "text": "Leggere la motivazione del rimando e verificare nell’Iter chi ha originato la richiesta e quali aspetti sono stati indicati."
      },
      {
        "type": "step",
        "number": 4,
        "text": "Aprire la lavorazione consentita al proprio ruolo, correggere soltanto i dati richiesti e salvare."
      },
      {
        "type": "step",
        "number": 5,
        "text": "Tornare a Gestisci istruttoria e trasmettere l’esito. Se il ruolo corrente è un passaggio intermedio della risalita, l’evento registrato è “ESITO INTEGRAZIONE TRASMESSO”."
      },
      {
        "type": "step",
        "number": 6,
        "text": "Controllare che la pratica sia passata al ruolo successivo della catena."
      },
      {
        "type": "callout",
        "title": "Cosa accade dopo",
        "text": "Il destinatario successivo riceve “Esito integrazione ricevuto” durante la risalita. Quando l’esito raggiunge il richiedente originario, quel ruolo torna a esprimere la propria normale verifica/validazione/approvazione."
      },
      {
        "type": "callout",
        "title": "Attenzione",
        "text": "Un Istruttore tecnico che risponde a un’integrazione richiesta dal Responsabile dell’istruttoria tecnica non salta il Capo Settore: ritrasmette comunque al Capo Settore. Analogamente, un’integrazione tecnica chiesta dal Responsabile dell’istruttoria amministrativa passa dal Responsabile dell’istruttoria tecnica al Direttore d’Area prima di tornare al Responsabile dell’istruttoria amministrativa."
      }
    ]
  },
  {
    "id": "cap-10-ingresso-nella-fase-amministrativa-e-assegnazione",
    "order": 10,
    "title": "10. Ingresso nella fase amministrativa e assegnazione",
    "roles": [
      "RIA",
      "IA",
      "ADMIN"
    ],
    "blocks": [
      {
        "type": "lead",
        "text": "Dopo l’approvazione del Direttore d’Area la pratica entra nella fase amministrativa. Il Responsabile dell’istruttoria amministrativa è il primo responsabile del nuovo circuito e assegna l’istruttoria a un Istruttore amministrativo."
      },
      {
        "type": "heading3",
        "id": "cap-10-ingresso-nella-fase-amministrativa-e-assegnazione-ria-assegnare-una-nuova-istruttoria-amministrativa",
        "text": "Responsabile dell’istruttoria amministrativa — assegnare una nuova istruttoria amministrativa"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Aprire l’allarme relativo al nuovo fascicolo/alla nuova istruttoria e la pratica da In attesa mia."
      },
      {
        "type": "step",
        "number": 2,
        "text": "Usare Prendi in carico."
      },
      {
        "type": "step",
        "number": 3,
        "text": "Consultare il fascicolo tecnico e l’Iter per verificare che la fase tecnica sia stata approvata."
      },
      {
        "type": "step",
        "number": 4,
        "text": "Aprire Gestisci istruttoria e scegliere l’azione di assegnazione."
      },
      {
        "type": "step",
        "number": 5,
        "text": "Selezionare l’Istruttore amministrativo e confermare."
      },
      {
        "type": "step",
        "number": 6,
        "text": "Verificare il passaggio della pratica all’Istruttore amministrativo assegnato."
      },
      {
        "type": "callout",
        "title": "Cosa accade dopo",
        "text": "Il sistema registra “Istruttoria assegnata”, imposta l’Istruttore amministrativo destinatario e rende la pratica da prendere in carico per quell’Istruttore amministrativo. Il Responsabile dell’istruttoria amministrativa non modifica direttamente i dati amministrativi nella scheda dell’Istruttore amministrativo: usa le azioni di workflow per assegnare, validare o rimandare."
      },
      {
        "type": "heading2",
        "id": "cap-10-ingresso-nella-fase-amministrativa-e-assegnazione-10-1-riassegnazione-e-riapertura",
        "text": "10.1 Riassegnazione e riapertura"
      },
      {
        "type": "paragraph",
        "text": "La normale assegnazione iniziale è distinta dall’avvio di una nuova istruttoria amministrativa dopo una riapertura. In quest’ultimo caso il Responsabile dell’istruttoria amministrativa seleziona l’Istruttore amministrativo per il nuovo ciclo e il sistema azzera i dati di chiusura amministrativa necessari a ripartire, conservando invece la storia di ricorso, CdA e riapertura."
      }
    ]
  },
  {
    "id": "cap-11-istruttoria-amministrativa-dell-ia",
    "order": 11,
    "title": "11. Istruttoria amministrativa dell’Istruttore amministrativo",
    "roles": [
      "IA",
      "ADMIN"
    ],
    "blocks": [
      {
        "type": "lead",
        "text": "L’Istruttore amministrativo lavora soltanto le pratiche assegnate al proprio account e modifica i dati amministrativi quando la pratica è effettivamente In carico. Dopo una trasmissione al Responsabile dell’istruttoria amministrativa la scheda diventa in sola lettura; se la pratica viene rimandata, occorre una nuova presa in carico prima di poterla modificare."
      },
      {
        "type": "heading2",
        "id": "cap-11-istruttoria-amministrativa-dell-ia-11-1-struttura-della-lavorazione-amministrativa",
        "text": "11.1 Struttura della lavorazione amministrativa"
      },
      {
        "type": "table",
        "headers": [
          "Sezione",
          "Uso"
        ],
        "rows": [
          [
            "Trasgressore",
            "Consultazione dei dati anagrafici e tecnici già acquisiti."
          ],
          [
            "Contestazioni",
            "Dati amministrativi, importi calcolati, estremi di accertamento, note, valori sanzionatori e informazioni di base del procedimento."
          ],
          [
            "Iter approvativo",
            "Esito dell’Istruttore amministrativo, rimandi/rientri, proposta/determinazione e attività di verifica con il Responsabile dell’istruttoria amministrativa."
          ],
          [
            "Notifica",
            "Preparazione dell’Atto, modalità di pagamento, tipo/spese di notifica, protocollo ed esito della notifica."
          ],
          [
            "Pagamento",
            "Piano/posizioni di pagamento e stato del pagamento."
          ],
          [
            "Allegati",
            "Documentazione amministrativa e tecnica archiviata nella pratica."
          ],
          [
            "Anteprima fascicolo",
            "Composizione del fascicolo in base ai dati e documenti disponibili."
          ],
          [
            "Ricorso",
            "Registrazione del ricorso/riesame post-notifica."
          ],
          [
            "CdA",
            "Esito della decisione e, se previsto, importo/termine rideterminato."
          ],
          [
            "Riapertura",
            "Ordine e motivazione della riapertura; compilazione riservata al Responsabile dell’istruttoria amministrativa e all’Amministratore."
          ],
          [
            "Definizione",
            "Incasso e modalità finale di definizione della pratica."
          ],
          [
            "Dati generali",
            "Riferimenti generali della pratica e del workflow."
          ]
        ]
      },
      {
        "type": "heading2",
        "id": "cap-11-istruttoria-amministrativa-dell-ia-11-2-importi-calcolati-e-dati-manuali",
        "text": "11.2 Importi calcolati e dati manuali"
      },
      {
        "type": "paragraph",
        "text": "Le sanzioni di base/ridotte, i danni e i riepiloghi collegati ai parametri configurati sono calcolati dal sistema. L’Istruttore amministrativo deve concentrarsi sui dati amministrativi che l’interfaccia abilita e non tentare di “correggere a mano” valori che il sistema ricalcola dalla pratica e dai parametri."
      },
      {
        "type": "heading3",
        "id": "cap-11-istruttoria-amministrativa-dell-ia-ia-esprimere-l-esito-dell-istruttoria-amministrativa",
        "text": "Istruttore amministrativo — esprimere l’esito dell’istruttoria amministrativa"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Aprire la pratica assegnata e usare Prendi in carico."
      },
      {
        "type": "step",
        "number": 2,
        "text": "Controllare Trasgressore, Contestazioni, allegati e Iter; completare le note o i dati amministrativi modificabili."
      },
      {
        "type": "step",
        "number": 3,
        "text": "Aprire Gestisci istruttoria nella sezione Iter approvativo."
      },
      {
        "type": "step",
        "number": 4,
        "text": "Scegliere Conforme se il fascicolo può proseguire alla predisposizione della proposta/determinazione; scegliere Non conforme se occorre un’integrazione tramite Responsabile dell’istruttoria amministrativa."
      },
      {
        "type": "step",
        "number": 5,
        "text": "In caso di Non conforme, compilare la motivazione richiesta e confermare il rimando al Responsabile dell’istruttoria amministrativa."
      },
      {
        "type": "step",
        "number": 6,
        "text": "In caso di Conforme, confermare: il sistema registra l’esito dell’Istruttore amministrativo e apre la fase di predisposizione della proposta/determinazione, senza spostare immediatamente la pratica al Responsabile dell’istruttoria amministrativa."
      },
      {
        "type": "step",
        "number": 7,
        "text": "Proseguire con la generazione della bozza e, solo quando il fascicolo è pronto, usare Trasmetti fascicolo al Responsabile."
      },
      {
        "type": "callout",
        "title": "Cosa accade dopo",
        "text": "Il passaggio al Responsabile dell’istruttoria amministrativa avviene con la trasmissione esplicita del fascicolo, non con il semplice esito Conforme dell’Istruttore amministrativo."
      }
    ]
  },
  {
    "id": "cap-12-verifica-ria-e-cicli-di-integrazione-amministrativa-tecnica",
    "order": 12,
    "title": "12. Verifica del Responsabile dell’istruttoria amministrativa e cicli di integrazione amministrativa/tecnica",
    "roles": [
      "RIA",
      "IA",
      "RIT",
      "DT",
      "CS",
      "IT",
      "ADMIN"
    ],
    "blocks": [
      {
        "type": "lead",
        "text": "Il Responsabile dell’istruttoria amministrativa riceve il fascicolo predisposto dall’Istruttore amministrativo e decide se validarlo o chiedere correzioni. Una non conformità può essere amministrativa, con ritorno all’Istruttore amministrativo, oppure tecnica, con instradamento al Responsabile dell’istruttoria tecnica e successiva risalita via Direttore d’Area."
      },
      {
        "type": "heading3",
        "id": "cap-12-verifica-ria-e-cicli-di-integrazione-amministrativa-tecnica-ria-verificare-il-fascicolo-trasmesso-dall-ia",
        "text": "Responsabile dell’istruttoria amministrativa — verificare il fascicolo trasmesso dall’Istruttore amministrativo"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Aprire l’allarme “Nuovo fascicolo ricevuto” e usare Prendi in carico."
      },
      {
        "type": "step",
        "number": 2,
        "text": "Consultare Iter approvativo, fascicolo e allegati; verificare l’esito dell’Istruttore amministrativo e la documentazione predisposta."
      },
      {
        "type": "step",
        "number": 3,
        "text": "Aprire Gestisci istruttoria."
      },
      {
        "type": "step",
        "number": 4,
        "text": "Se il fascicolo è conforme, scegliere Conforme e confermare la validazione: la pratica torna all’Istruttore amministrativo assegnato per gli adempimenti successivi."
      },
      {
        "type": "step",
        "number": 5,
        "text": "Se non è conforme, scegliere Non conforme. Indicare gli aspetti che richiedono integrazione/rettifica nelle sezioni proposte."
      },
      {
        "type": "step",
        "number": 6,
        "text": "Confermare. Il sistema individua automaticamente la destinazione: Istruttore amministrativo per aspetti amministrativi, Responsabile dell’istruttoria tecnica per aspetti tecnici."
      },
      {
        "type": "callout",
        "title": "Cosa accade dopo",
        "text": "Con esito positivo viene registrata “Istruttoria validata” e l’Istruttore amministrativo riceve “Fascicolo ricevuto”. Con esito negativo si apre il corrispondente ciclo di integrazione."
      },
      {
        "type": "callout",
        "title": "Attenzione",
        "text": "Durante la verifica dell’Atto di accertamento la non conformità è limitata alla correzione amministrativa dell’Atto e rientra all’Istruttore amministrativo; non viene aperta una nuova integrazione tecnica dell’istruttoria."
      },
      {
        "type": "heading2",
        "id": "cap-12-verifica-ria-e-cicli-di-integrazione-amministrativa-tecnica-12-1-integrazione-amministrativa-ia-ria",
        "text": "12.1 Integrazione amministrativa tra Istruttore amministrativo e Responsabile dell’istruttoria amministrativa"
      },
      {
        "type": "paragraph",
        "text": "Se l’Istruttore amministrativo ha dichiarato Non conforme, il fascicolo risale al Responsabile dell’istruttoria amministrativa. Il Responsabile dell’istruttoria amministrativa può gestire l’integrazione e trasmetterne l’esito all’Istruttore amministrativo. L’Istruttore amministrativo riceve l’esito, prende nuovamente in carico, effettua le correzioni e ripete la propria valutazione. Durante questo ciclo l’assegnazione all’Istruttore amministrativo resta quella della pratica."
      },
      {
        "type": "heading2",
        "id": "cap-12-verifica-ria-e-cicli-di-integrazione-amministrativa-tecnica-12-2-integrazione-tecnica-chiesta-dal-ria",
        "text": "12.2 Integrazione tecnica chiesta dal Responsabile dell’istruttoria amministrativa"
      },
      {
        "type": "paragraph",
        "text": "Quando il Responsabile dell’istruttoria amministrativa segnala un problema tecnico, la pratica viene inviata al Responsabile dell’istruttoria tecnica. Il Responsabile dell’istruttoria tecnica la integra nei limiti del proprio ruolo o la instrada nel percorso tecnico necessario. La risalita prevista è Responsabile dell’istruttoria tecnica → Direttore d’Area → Responsabile dell’istruttoria amministrativa. Al ritorno dal Direttore d’Area il Responsabile dell’istruttoria amministrativa riprende la propria verifica; il sistema non inoltra automaticamente l’esito all’Istruttore amministrativo."
      }
    ]
  },
  {
    "id": "cap-13-determinazione",
    "order": 13,
    "title": "13. Determinazione",
    "roles": [
      "IA",
      "RIA",
      "DA",
      "ADMIN"
    ],
    "blocks": [
      {
        "type": "lead",
        "text": "La determinazione è un flusso documentale a più passaggi. Il GII genera documenti, verifica le versioni caricate e registra gli estremi; alcune operazioni esterne — conversione Word/PDF, protocollazione e firma — avvengono fuori dal GII e vengono poi acquisite nel gestionale."
      },
      {
        "type": "heading2",
        "id": "cap-13-determinazione-13-1-dall-esito-ia-alla-trasmissione-al-ria",
        "text": "13.1 Dall’esito dell’Istruttore amministrativo alla trasmissione al Responsabile dell’istruttoria amministrativa"
      },
      {
        "type": "heading3",
        "id": "cap-13-determinazione-ia-preparare-la-proposta-di-contestazione",
        "text": "Istruttore amministrativo — preparare la proposta di contestazione"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Dopo aver espresso esito Conforme, verificare che lo stato della determinazione sia in fase di bozza."
      },
      {
        "type": "step",
        "number": 2,
        "text": "Usare Genera bozza per creare il documento Word; se i dati cambiano e il sistema segnala che la bozza è da rigenerare, usare Rigenera bozza."
      },
      {
        "type": "step",
        "number": 3,
        "text": "Aprire il Word esternamente, completare o modificare il testo dove previsto e convertirlo in PDF fuori dal GII."
      },
      {
        "type": "step",
        "number": 4,
        "text": "Caricare il PDF della proposta/bozza usando l’azione disponibile. Il sistema consente il caricamento del PDF soltanto dopo la generazione Word corrente."
      },
      {
        "type": "step",
        "number": 5,
        "text": "Controllare l’Anteprima fascicolo e la completezza della documentazione."
      },
      {
        "type": "step",
        "number": 6,
        "text": "Usare Trasmetti fascicolo al Responsabile."
      },
      {
        "type": "callout",
        "title": "Cosa accade dopo",
        "text": "La pratica diventa in sola lettura per l’Istruttore amministrativo e il Responsabile dell’istruttoria amministrativa riceve “Nuovo fascicolo ricevuto”. L’evento di workflow è “Fascicolo trasmesso per verifica”."
      },
      {
        "type": "heading2",
        "id": "cap-13-determinazione-13-2-validazione-ria-e-ritorno-all-ia",
        "text": "13.2 Validazione del Responsabile dell’istruttoria amministrativa e ritorno all’Istruttore amministrativo"
      },
      {
        "type": "paragraph",
        "text": "Se il Responsabile dell’istruttoria amministrativa valida il fascicolo, la pratica torna all’Istruttore amministrativo e la proposta viene rigenerata in versione approvata, senza la filigrana di bozza. Se il Responsabile dell’istruttoria amministrativa rimanda il fascicolo, l’Istruttore amministrativo dovrà riprenderlo in carico, correggere i dati, esprimere nuovamente l’esito e rigenerare la documentazione necessaria."
      },
      {
        "type": "heading2",
        "id": "cap-13-determinazione-13-3-trasmissione-al-protocollo-e-acquisizione-del-fascicolo-protocollato",
        "text": "13.3 Trasmissione al protocollo e acquisizione del fascicolo protocollato"
      },
      {
        "type": "heading3",
        "id": "cap-13-determinazione-ia-inviare-e-riacquisire-il-fascicolo-protocollato",
        "text": "Istruttore amministrativo — inviare e riacquisire il fascicolo protocollato"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Dopo la validazione del Responsabile dell’istruttoria amministrativa usare Trasmetti fascicolo al protocollo. Il GII prepara il messaggio e memorizza la composizione esatta del fascicolo trasmesso."
      },
      {
        "type": "step",
        "number": 2,
        "text": "Eseguire la protocollazione tramite il sistema esterno previsto dall’Ente."
      },
      {
        "type": "step",
        "number": 3,
        "text": "Al ritorno, selezionare insieme tutti i PDF protocollati richiesti dal GII."
      },
      {
        "type": "step",
        "number": 4,
        "text": "Il sistema confronta il numero di file, i nomi/documenti attesi e gli estremi di protocollo; verifica inoltre la coerenza del protocollo sui documenti che devono condividerlo."
      },
      {
        "type": "step",
        "number": 5,
        "text": "Se la verifica è superata, i PDF protocollati sostituiscono le copie precedenti e gli estremi del fascicolo vengono acquisiti."
      },
      {
        "type": "step",
        "number": 6,
        "text": "Premere Salva per registrare definitivamente i dati di protocollo nella pratica."
      },
      {
        "type": "callout",
        "title": "Attenzione",
        "text": "Non caricare i documenti uno alla volta quando la procedura richiede il rientro completo del fascicolo: la verifica si basa sul manifest dei documenti effettivamente trasmessi."
      },
      {
        "type": "heading2",
        "id": "cap-13-determinazione-13-4-determinazione-definitiva-e-trasmissione-al-direttore",
        "text": "13.4 Determinazione definitiva e trasmissione al Direttore"
      },
      {
        "type": "heading3",
        "id": "cap-13-determinazione-ia-completare-la-determinazione-dopo-il-protocollo",
        "text": "Istruttore amministrativo — completare la determinazione dopo il protocollo"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Dopo aver salvato gli estremi di protocollo, usare Genera/Aggiorna determinazione per produrre il Word aggiornato."
      },
      {
        "type": "step",
        "number": 2,
        "text": "Convertire esternamente il Word in PDF e caricare il PDF definitivo con l’azione prevista."
      },
      {
        "type": "step",
        "number": 3,
        "text": "Il sistema verifica la corrispondenza del documento e acquisisce automaticamente numero e data della determinazione quando presenti e coerenti."
      },
      {
        "type": "step",
        "number": 4,
        "text": "Salvare. Dal numero di determinazione il sistema deriva il numero dell’Atto di accertamento nel formato previsto."
      },
      {
        "type": "step",
        "number": 5,
        "text": "Usare Prepara e-mail al Direttore per predisporre la trasmissione secondo la Rubrica configurata."
      },
      {
        "type": "callout",
        "title": "Cosa accade dopo",
        "text": "La determinazione entra nel flusso di adozione e diventa la base per l’Atto di accertamento."
      },
      {
        "type": "callout",
        "title": "Sostituzione del PDF della determinazione",
        "text": "La copia ufficiale archiviata può essere sostituita finché l’Atto non è avanzato oltre i limiti previsti. La sostituzione non riapre l’istruttoria. Se la determinazione risulta adottata ma manca il PDF, è prevista la funzione di ripristino del PDF purché corrisponda agli estremi già registrati."
      }
    ]
  },
  {
    "id": "cap-14-atto-di-accertamento",
    "order": 14,
    "title": "14. Atto di accertamento",
    "roles": [
      "IA",
      "RIA",
      "DA",
      "ADMIN"
    ],
    "blocks": [
      {
        "type": "lead",
        "text": "L’Atto di accertamento si prepara dopo l’adozione della determinazione. Prima della bozza devono essere definiti i dati di pagamento e notifica necessari a comporre correttamente il documento."
      },
      {
        "type": "heading2",
        "id": "cap-14-atto-di-accertamento-14-1-prerequisiti",
        "text": "14.1 Prerequisiti"
      },
      {
        "type": "bullet",
        "text": "Modalità di pagamento valorizzata."
      },
      {
        "type": "bullet",
        "text": "Modalità di notifica prevista valorizzata."
      },
      {
        "type": "bullet",
        "text": "Spese di notifica valorizzate; il valore 0,00 è ammesso ma deve essere espresso se non vi sono spese."
      },
      {
        "type": "bullet",
        "text": "Determinazione nello stato che consente l’avvio dell’Atto."
      },
      {
        "type": "heading3",
        "id": "cap-14-atto-di-accertamento-ia-preparare-e-trasmettere-la-bozza-dell-atto",
        "text": "Istruttore amministrativo — preparare e trasmettere la bozza dell’Atto"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Aprire la sezione Notifica e completare, nell’ordine consentito dall’interfaccia, Modalità di pagamento, Tipo di notifica e Spese di notifica."
      },
      {
        "type": "step",
        "number": 2,
        "text": "Salvare i dati richiesti."
      },
      {
        "type": "step",
        "number": 3,
        "text": "Usare Genera bozza Word dell’Atto."
      },
      {
        "type": "step",
        "number": 4,
        "text": "Aprire il Word esternamente, convertirlo in PDF e usare Carica la bozza PDF dell’Atto di accertamento."
      },
      {
        "type": "step",
        "number": 5,
        "text": "Controllare la versione caricata e l’Anteprima fascicolo."
      },
      {
        "type": "step",
        "number": 6,
        "text": "Usare Trasmetti Atto per la verifica."
      },
      {
        "type": "callout",
        "title": "Cosa accade dopo",
        "text": "Il Responsabile dell’istruttoria amministrativa riceve “Atto di accertamento ricevuto” e prende in carico la verifica. L’Istruttore amministrativo non può proseguire la modifica dell’Atto finché il Responsabile dell’istruttoria amministrativa non si pronuncia."
      },
      {
        "type": "heading2",
        "id": "cap-14-atto-di-accertamento-14-2-verifica-del-ria",
        "text": "14.2 Verifica del Responsabile dell’istruttoria amministrativa"
      },
      {
        "type": "heading3",
        "id": "cap-14-atto-di-accertamento-ria-verificare-l-atto",
        "text": "Responsabile dell’istruttoria amministrativa — verificare l’Atto"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Aprire l’allarme e usare Prendi in carico."
      },
      {
        "type": "step",
        "number": 2,
        "text": "Controllare la bozza dell’Atto rispetto alla pratica e alla determinazione approvata."
      },
      {
        "type": "step",
        "number": 3,
        "text": "Aprire Gestisci istruttoria."
      },
      {
        "type": "step",
        "number": 4,
        "text": "Se conforme, approvare l’Atto: la pratica torna all’Istruttore amministrativo e viene registrato “Atto di accertamento approvato”."
      },
      {
        "type": "step",
        "number": 5,
        "text": "Se non conforme, rimandare l’Atto all’Istruttore amministrativo per integrazione amministrativa indicando la motivazione."
      },
      {
        "type": "callout",
        "title": "Cosa accade dopo",
        "text": "L’Istruttore amministrativo riceve “Atto di accertamento ricevuto”."
      },
      {
        "type": "heading2",
        "id": "cap-14-atto-di-accertamento-14-3-versione-senza-filigrana-firma-e-protocollo",
        "text": "14.3 Versione senza filigrana, firma e protocollo"
      },
      {
        "type": "heading3",
        "id": "cap-14-atto-di-accertamento-ia-completare-l-atto-approvato",
        "text": "Istruttore amministrativo — completare l’Atto approvato"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Dopo l’approvazione del Responsabile dell’istruttoria amministrativa usare Genera Atto senza filigrana; se necessario usare Rigenera Atto senza filigrana."
      },
      {
        "type": "step",
        "number": 2,
        "text": "Convertire il Word in PDF e caricare il PDF senza filigrana. Il sistema verifica che corrisponda ai contenuti approvati dal Responsabile dell’istruttoria amministrativa e lo identifica come versione da firmare."
      },
      {
        "type": "step",
        "number": 3,
        "text": "Usare Prepara e-mail dell’Atto di accertamento al Direttore."
      },
      {
        "type": "step",
        "number": 4,
        "text": "Dopo la firma digitale esterna, usare Carica il PDF firmato digitalmente dal Direttore."
      },
      {
        "type": "step",
        "number": 5,
        "text": "Il sistema verifica l’integrità del contenuto, la presenza di una firma digitale e che l’identità del firmatario sia presente nella Rubrica dei firmatari. L’Amministratore può superare il solo disallineamento di identità, non l’assenza della firma o l’integrità del documento."
      },
      {
        "type": "step",
        "number": 6,
        "text": "Usare Trasmetti l’Atto firmato al protocollo."
      },
      {
        "type": "step",
        "number": 7,
        "text": "Al ritorno dal protocollo caricare insieme i PDF richiesti. Il sistema verifica manifest, marcature di protocollo e conservazione della firma dell’Atto."
      },
      {
        "type": "step",
        "number": 8,
        "text": "Salvare gli estremi acquisiti. Solo dopo il completamento del protocollo dell’Atto si attivano le operazioni definitive di notifica."
      },
      {
        "type": "callout",
        "title": "Attenzione",
        "text": "La firma e la protocollazione non avvengono dentro il GII: il gestionale prepara e controlla il flusso, poi acquisisce le versioni ritornate dai sistemi esterni."
      }
    ]
  },
  {
    "id": "cap-15-modalita-di-pagamento-e-avvisi-pagopa",
    "order": 15,
    "title": "15. Modalità di pagamento e avvisi pagoPA",
    "roles": [
      "IA",
      "RIA",
      "ADMIN"
    ],
    "blocks": [
      {
        "type": "lead",
        "text": "La preparazione del pagamento è legata al totale dovuto e allo stato dell’Atto. Finché l’Atto non è bloccato dai passaggi successivi, l’Istruttore amministrativo e l’Amministratore possono predisporre il piano e i relativi documenti."
      },
      {
        "type": "heading2",
        "id": "cap-15-modalita-di-pagamento-e-avvisi-pagopa-15-1-modalita-supportate",
        "text": "15.1 Modalità supportate"
      },
      {
        "type": "paragraph",
        "text": "La base analizzata gestisce modalità riconducibili a pagoPA, bonifico, modalità mista e altro. Il dettaglio delle posizioni dipende dalla modalità scelta. Se il totale dovuto è pari a zero, non è richiesto un piano di posizioni di pagamento."
      },
      {
        "type": "heading2",
        "id": "cap-15-modalita-di-pagamento-e-avvisi-pagopa-15-2-piano-non-pagopa",
        "text": "15.2 Piano non pagoPA"
      },
      {
        "type": "heading3",
        "id": "cap-15-modalita-di-pagamento-e-avvisi-pagopa-impostare-un-piano-di-pagamento-manuale",
        "text": "Impostare un piano di pagamento manuale"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Indicare Numero rate concesse: 0 significa sola unica soluzione; il valore 1 non costituisce un piano rateale valido; da 2 in su il sistema crea l’unica soluzione e le rate numerate."
      },
      {
        "type": "step",
        "number": 2,
        "text": "Usare Imposta piano; se esistono già posizioni modificabili, usare Aggiorna piano."
      },
      {
        "type": "step",
        "number": 3,
        "text": "Per ciascuna posizione compilare Modalità, Importo dovuto e Scadenza. Se richiesto dalla modalità, aggiungere i riferimenti di pagamento disponibili."
      },
      {
        "type": "step",
        "number": 4,
        "text": "Usare Aggiorna sulla posizione dopo le modifiche."
      },
      {
        "type": "step",
        "number": 5,
        "text": "Caricare l’eventuale documento collegato alla posizione, ad esempio avviso pagoPA o bollettino, quando l’interfaccia lo richiede."
      },
      {
        "type": "step",
        "number": 6,
        "text": "Verificare che il riepilogo segnali le posizioni come complete e coerenti con il totale da pagare, quindi salvare la pratica."
      },
      {
        "type": "callout",
        "title": "Attenzione",
        "text": "La ricostruzione del piano è bloccata quando risultano già registrati pagamenti o dati che renderebbero incoerente la sostituzione delle posizioni."
      },
      {
        "type": "heading2",
        "id": "cap-15-modalita-di-pagamento-e-avvisi-pagopa-15-3-caricamento-batch-degli-avvisi-pagopa",
        "text": "15.3 Caricamento batch degli avvisi pagoPA"
      },
      {
        "type": "heading3",
        "id": "cap-15-modalita-di-pagamento-e-avvisi-pagopa-ia-caricare-gli-avvisi-pagopa",
        "text": "Istruttore amministrativo — caricare gli avvisi pagoPA"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Selezionare la modalità pagoPA e usare Carica avvisi pagoPA."
      },
      {
        "type": "step",
        "number": 2,
        "text": "Selezionare insieme tutti i PDF prodotti: l’avviso per l’unica soluzione e, se previste, tutte le rate."
      },
      {
        "type": "step",
        "number": 3,
        "text": "Il GII legge il QR code e ricava importo, codice avviso/IUV ed Ente Creditore; dal PDF ricava la scadenza."
      },
      {
        "type": "step",
        "number": 4,
        "text": "Il sistema verifica che il codice fiscale dell’Ente Creditore sia quello atteso, che i codici siano validi e univoci, che l’unica soluzione corrisponda al totale dovuto e che le rate, se presenti, siano almeno due e sommino al totale con l’eventuale arrotondamento centesimale."
      },
      {
        "type": "step",
        "number": 5,
        "text": "Controllare la configurazione ricostruita automaticamente."
      },
      {
        "type": "step",
        "number": 6,
        "text": "Salvare la pratica: la sostituzione/caricamento batch è predisposta prima del salvataggio e diventa definitiva con Salva."
      },
      {
        "type": "callout",
        "title": "Cosa accade dopo",
        "text": "Con posizioni complete il sistema può portare lo stato del pagamento alla condizione “Generato” prevista dal flusso; se il piano è incompleto resta da generare/completare."
      },
      {
        "type": "heading2",
        "id": "cap-15-modalita-di-pagamento-e-avvisi-pagopa-15-4-sostituire-avvisi-pagopa-esistenti",
        "text": "15.4 Sostituire avvisi pagoPA esistenti"
      },
      {
        "type": "heading3",
        "id": "cap-15-modalita-di-pagamento-e-avvisi-pagopa-sostituire-un-piano-pagopa",
        "text": "Sostituire un piano pagoPA"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Usare nuovamente Carica avvisi pagoPA e selezionare il nuovo set completo."
      },
      {
        "type": "step",
        "number": 2,
        "text": "Leggere il riepilogo di sostituzione: il sistema indica se sostituirà la posizione attuale oppure più posizioni e i relativi documenti."
      },
      {
        "type": "step",
        "number": 3,
        "text": "Confermare Sostituisci avvisi."
      },
      {
        "type": "step",
        "number": 4,
        "text": "Controllare il nuovo piano ricostruito."
      },
      {
        "type": "step",
        "number": 5,
        "text": "Premere Salva. Se si annulla prima del salvataggio, il piano precedente viene ripristinato."
      },
      {
        "type": "callout",
        "title": "Attenzione",
        "text": "La sostituzione non è consentita quando sulle posizioni risultano già dati di pagamento che non possono essere persi."
      },
      {
        "type": "heading2",
        "id": "cap-15-modalita-di-pagamento-e-avvisi-pagopa-15-5-generatore-avvisi-pagopa-solo-test",
        "text": "15.5 Generatore avvisi pagoPA — SOLO TEST"
      },
      {
        "type": "callout",
        "title": "Funzione di prova attiva nella base analizzata",
        "text": "Nella configurazione allegata è abilitato il comando Genera avvisi TEST. Produce PDF di prova che vengono soltanto scaricati e non sono acquisiti automaticamente nella pratica. Serve a collaudare il flusso di lettura/caricamento: per usarli occorre chiudere il generatore e passare poi da Carica avvisi pagoPA. Non sostituisce il processo operativo reale di emissione pagoPA."
      },
      {
        "type": "bullet",
        "text": "Il generatore precompila, quando disponibili, destinatario, codice fiscale/P. IVA, indirizzo e causale dalla pratica."
      },
      {
        "type": "bullet",
        "text": "Consente Unica soluzione oppure Piano rateale; nel piano rateale genera anche l’avviso dell’unica soluzione."
      },
      {
        "type": "bullet",
        "text": "Importi e scadenze possono essere modificati per i test prima di generare i PDF."
      }
    ]
  },
  {
    "id": "cap-16-protocollo-notifica-e-pagamento",
    "order": 16,
    "title": "16. Protocollo, notifica e pagamento",
    "roles": [
      "IA",
      "RIA",
      "ADMIN"
    ],
    "blocks": [
      {
        "type": "heading2",
        "id": "cap-16-protocollo-notifica-e-pagamento-16-1-registrare-l-esito-della-notifica",
        "text": "16.1 Registrare l’esito della notifica"
      },
      {
        "type": "lead",
        "text": "La sezione Protocollo e notifica diventa operativa dopo che l’Atto firmato è rientrato dal protocollo con numero e data completi."
      },
      {
        "type": "heading3",
        "id": "cap-16-protocollo-notifica-e-pagamento-ia-registrare-la-notifica",
        "text": "Istruttore amministrativo — registrare la notifica"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Verificare che gli estremi di protocollo dell’Atto siano presenti e in sola lettura."
      },
      {
        "type": "step",
        "number": 2,
        "text": "Selezionare l’esito della notifica tra quelli disponibili."
      },
      {
        "type": "step",
        "number": 3,
        "text": "Usare Carica documentazione esito notifica e caricare il PDF protocollato che prova l’esito: ad esempio relata, ricevute PEC, avviso di ricevimento postale o altra prova prevista."
      },
      {
        "type": "step",
        "number": 4,
        "text": "Il sistema estrae, quando leggibili, numero e data del protocollo dell’esito di notifica e archivia il documento tra gli Allegati."
      },
      {
        "type": "step",
        "number": 5,
        "text": "Premere Salva."
      },
      {
        "type": "callout",
        "title": "Cosa accade dopo",
        "text": "Gli esiti perfezionati (Notificata o Compiuta giacenza) abilitano il percorso post-notifica. Esiti come Non notificata o Irreperibile bloccano le fasi successive; con Altro occorre descrivere l’esito e la fase successiva resta bloccata finché non esiste un esito conclusivo."
      },
      {
        "type": "heading2",
        "id": "cap-16-protocollo-notifica-e-pagamento-16-2-stato-del-pagamento",
        "text": "16.2 Stato del pagamento"
      },
      {
        "type": "paragraph",
        "text": "Dopo il perfezionamento della notifica il pannello Pagamento mostra il piano e il totale in sola lettura e consente di aggiornare lo stato del pagamento e le note. La registrazione dell’importo effettivamente incassato, della data e dei riferimenti avviene invece nella sezione Definizione/Incasso."
      },
      {
        "type": "heading2",
        "id": "cap-16-protocollo-notifica-e-pagamento-16-3-allarmi-post-notifica",
        "text": "16.3 Allarmi post-notifica"
      },
      {
        "type": "table",
        "headers": [
          "Allarme",
          "Quando compare / significato"
        ],
        "rows": [
          [
            "Pagamento in scadenza / scaduto",
            "Esiste un importo dovuto non integralmente pagato e la scadenza si avvicina o è superata."
          ],
          [
            "Ricorso presentato oltre il termine",
            "È registrato un ricorso e la data supera il termine previsto."
          ],
          [
            "Termine ricorso in scadenza / scaduto",
            "Non risulta un ricorso e la scadenza del termine si avvicina o è superata."
          ],
          [
            "Scadenza rideterminata in scadenza / scaduta",
            "Esiste un importo o termine rideterminato a seguito dell’esito successivo."
          ],
          [
            "Pratica da definire",
            "I termini post-notifica risultano trascorsi ma la pratica non è stata ancora definita."
          ]
        ]
      },
      {
        "type": "paragraph",
        "text": "La configurazione corrente usa una soglia di preavviso di 5 giorni e aggiorna periodicamente gli allarmi."
      }
    ]
  },
  {
    "id": "cap-17-ricorso-cda-riapertura-e-definizione",
    "order": 17,
    "title": "17. Ricorso, CdA, riapertura e definizione",
    "roles": [
      "IA",
      "RIA",
      "DA",
      "ADMIN"
    ],
    "blocks": [
      {
        "type": "heading2",
        "id": "cap-17-ricorso-cda-riapertura-e-definizione-17-1-ricorso-riesame-post-notifica",
        "text": "17.1 Ricorso / riesame post-notifica"
      },
      {
        "type": "heading3",
        "id": "cap-17-ricorso-cda-riapertura-e-definizione-registrare-un-ricorso",
        "text": "Registrare un ricorso"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Aprire la scheda Ricorso dopo il perfezionamento della notifica."
      },
      {
        "type": "step",
        "number": 2,
        "text": "Indicare se il ricorso/istanza è stato presentato e completare, quando applicabili, data di presentazione, protocollo, presentatore, codice fiscale/P. IVA, eventuale sospensione del pagamento, oggetto/motivazione e note."
      },
      {
        "type": "step",
        "number": 3,
        "text": "Verificare l’indicazione del termine e l’eventuale segnalazione di presentazione tardiva."
      },
      {
        "type": "step",
        "number": 4,
        "text": "Premere Salva."
      },
      {
        "type": "heading2",
        "id": "cap-17-ricorso-cda-riapertura-e-definizione-17-2-esito-del-cda",
        "text": "17.2 Esito del CdA"
      },
      {
        "type": "heading3",
        "id": "cap-17-ricorso-cda-riapertura-e-definizione-registrare-l-esito-del-cda",
        "text": "Registrare l’esito del CdA"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Aprire la scheda CdA."
      },
      {
        "type": "step",
        "number": 2,
        "text": "Registrare l’esito e gli estremi della decisione/atto."
      },
      {
        "type": "step",
        "number": 3,
        "text": "Se l’esito ridetermina l’importo o la scadenza, compilare i nuovi valori e le note pertinenti."
      },
      {
        "type": "step",
        "number": 4,
        "text": "Registrare l’operatore/data di definizione dell’esito quando previsto e salvare."
      },
      {
        "type": "step",
        "number": 5,
        "text": "Se la decisione richiede una nuova istruttoria, non tentare di modificare direttamente il ciclo chiuso: passare alla Riapertura."
      },
      {
        "type": "heading2",
        "id": "cap-17-ricorso-cda-riapertura-e-definizione-17-3-riapertura-amministrativa",
        "text": "17.3 Riapertura amministrativa"
      },
      {
        "type": "paragraph",
        "text": "La Riapertura è consultabile nella fase amministrativa ma la compilazione è riservata al Responsabile dell’istruttoria amministrativa e all’Amministratore. Registra il fatto che una nuova istruttoria amministrativa deve essere avviata su indicazione del Direttore Area AA.GG. e P.F. dopo l’esito del CdA, conservando lo storico precedente."
      },
      {
        "type": "heading3",
        "id": "cap-17-ricorso-cda-riapertura-e-definizione-ria-riaprire-e-avviare-un-nuovo-ciclo-amministrativo",
        "text": "Responsabile dell’istruttoria amministrativa — riaprire e avviare un nuovo ciclo amministrativo"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Aprire la scheda Riapertura e registrare l’ordine di riapertura, la causa, la data, il soggetto che l’ha disposto, gli estremi autorizzativi e la motivazione."
      },
      {
        "type": "step",
        "number": 2,
        "text": "Salvare la riapertura."
      },
      {
        "type": "step",
        "number": 3,
        "text": "Tornare a Gestisci istruttoria e usare Avvia nuova istruttoria amministrativa."
      },
      {
        "type": "step",
        "number": 4,
        "text": "Selezionare l’Istruttore amministrativo per il nuovo ciclo e confermare."
      },
      {
        "type": "step",
        "number": 5,
        "text": "Verificare che la pratica risulti da prendere in carico per l’Istruttore amministrativo nel nuovo ciclo."
      },
      {
        "type": "callout",
        "title": "Cosa accade dopo",
        "text": "I dati che devono ripartire per la nuova istruttoria vengono riaperti, mentre la storia di ricorso, CdA e riapertura resta disponibile nell’Iter e nelle relative sezioni."
      },
      {
        "type": "heading2",
        "id": "cap-17-ricorso-cda-riapertura-e-definizione-17-4-incasso-e-definizione",
        "text": "17.4 Incasso e definizione"
      },
      {
        "type": "heading3",
        "id": "cap-17-ricorso-cda-riapertura-e-definizione-registrare-l-incasso-e-definire-la-pratica",
        "text": "Registrare l’incasso e definire la pratica"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Aprire Definizione."
      },
      {
        "type": "step",
        "number": 2,
        "text": "Nella sezione Incasso compilare insieme importo incassato, data e dettagli/riferimenti. Il sistema richiede coerenza: non lasciare uno dei tre elementi isolato."
      },
      {
        "type": "step",
        "number": 3,
        "text": "Controllare lo stato di pagamento proposto: importo pari o superiore al totale porta a Pagato; un importo positivo ma inferiore porta a Parziale. Eventuali eccedenze vengono segnalate."
      },
      {
        "type": "step",
        "number": 4,
        "text": "Selezionare la modalità di definizione coerente con l’esito reale: ad esempio Pagata, Archiviata, Annullata, Avviata a riscossione o Definita dopo ricorso."
      },
      {
        "type": "step",
        "number": 5,
        "text": "Completare le note e salvare."
      },
      {
        "type": "callout",
        "title": "Attenzione",
        "text": "Nella base analizzata non è presente un modulo autonomo di riscossione coattiva. Il GII registra l’esito “Avviata a riscossione” nella definizione e i dati di incasso, ma non è dimostrato un ulteriore procedimento di riscossione interno al gestionale."
      }
    ]
  },
  {
    "id": "cap-18-nota-spese",
    "order": 18,
    "title": "18. Nota spese",
    "roles": [
      "IT",
      "RIT",
      "ADMIN"
    ],
    "blocks": [
      {
        "type": "lead",
        "text": "La Nota spese si attiva soltanto per le violazioni che la prevedono nell’implementazione corrente, tra cui le casistiche collegate agli artt. 8, 27, 30 e 39. Non è un semplice campo importo: viene costruita con voci di prezzario, quantità e regole specifiche per le attrezzature."
      },
      {
        "type": "heading2",
        "id": "cap-18-nota-spese-18-1-avviare-una-nota-spese",
        "text": "18.1 Avviare una Nota spese"
      },
      {
        "type": "heading3",
        "id": "cap-18-nota-spese-it-creare-o-completare-una-nota-spese",
        "text": "Istruttore tecnico — creare o completare una Nota spese"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Aprire la pratica tecnica e la sezione Nota spese."
      },
      {
        "type": "step",
        "number": 2,
        "text": "Selezionare la violazione/casistica cui associare la spesa. Per l’Art. 30, selezionare anche l’attrezzatura interessata quando richiesto."
      },
      {
        "type": "step",
        "number": 3,
        "text": "Usare Sfoglia prezzario. Il comando è disponibile dopo il primo salvataggio della pratica e soltanto quando esiste una casistica pertinente; non è utilizzabile in sola lettura."
      },
      {
        "type": "step",
        "number": 4,
        "text": "Nel Browser nota spese cercare le voci, aggiungerle al carrello e confermare la selezione."
      },
      {
        "type": "step",
        "number": 5,
        "text": "Al rientro nella pratica impostare le quantità delle voci selezionate e completare gli eventuali dati specifici."
      },
      {
        "type": "step",
        "number": 6,
        "text": "Controllare il riepilogo per categoria, le spese generali e il totale."
      },
      {
        "type": "step",
        "number": 7,
        "text": "Premere Salva per rendere definitive le variazioni."
      },
      {
        "type": "callout",
        "title": "Cosa accade dopo",
        "text": "Le voci selezionate vengono memorizzate nella Nota spese della pratica e sono consultabili anche dal Dettaglio pratica."
      },
      {
        "type": "heading2",
        "id": "cap-18-nota-spese-18-2-categorie-di-costo",
        "text": "18.2 Categorie di costo"
      },
      {
        "type": "table",
        "headers": [
          "Codice/logica",
          "Significato operativo"
        ],
        "rows": [
          [
            "AT",
            "Attrezzature e trasporti."
          ],
          [
            "PR",
            "Prestazioni/risorse previste dal prezzario."
          ],
          [
            "RU",
            "Risorse umane/manodopera secondo il catalogo disponibile."
          ],
          [
            "SL",
            "Lavorazioni/costi pertinenti alla struttura configurata."
          ],
          [
            "PF",
            "Voci forfettarie/pertinenti al catalogo disponibile."
          ],
          [
            "RA",
            "Risarcimento attrezzature, usato in particolare nelle casistiche non recuperabili dell’Art. 30."
          ]
        ]
      },
      {
        "type": "heading2",
        "id": "cap-18-nota-spese-18-3-art-30-attrezzature-recuperabili-e-non-recuperabili",
        "text": "18.3 Art. 30: attrezzature recuperabili e non recuperabili"
      },
      {
        "type": "bullet",
        "text": "Attrezzatura recuperabile: si costruiscono i costi di riparazione per ogni singola attrezzatura; possono esistere più istanze dello stesso tipo, numerate separatamente."
      },
      {
        "type": "bullet",
        "text": "Per le tessere elettroniche/matricole soggette a controllo è richiesto il formato a 5 cifre."
      },
      {
        "type": "bullet",
        "text": "Quando configurato, il sistema applica la decurtazione della cauzione e la evidenzia nel riepilogo."
      },
      {
        "type": "bullet",
        "text": "Attrezzatura non recuperabile: si seleziona l’attrezzatura di origine e si usa la voce di risarcimento attrezzatura al posto dei costi di riparazione."
      },
      {
        "type": "bullet",
        "text": "Il riepilogo distingue la logica di Decurtazione cauzione da quella di Risarcimento attrezzatura."
      },
      {
        "type": "heading2",
        "id": "cap-18-nota-spese-18-4-browser-e-carrello",
        "text": "18.4 Browser e carrello"
      },
      {
        "type": "heading3",
        "id": "cap-18-nota-spese-selezionare-voci-dal-browser-nota-spese",
        "text": "Selezionare voci dal Browser nota spese"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Scegliere il prezzario/sorgente disponibile e cercare per codice, descrizione o struttura gerarchica."
      },
      {
        "type": "step",
        "number": 2,
        "text": "Selezionare una voce e usare Aggiungi. La stessa voce non può essere aggiunta due volte con la stessa chiave."
      },
      {
        "type": "step",
        "number": 3,
        "text": "Controllare il badge/contatore delle voci aggiunte."
      },
      {
        "type": "step",
        "number": 4,
        "text": "Per rimuovere una singola voce usare il comando di eliminazione nel carrello; per azzerare tutto usare Svuota e confermare."
      },
      {
        "type": "step",
        "number": 5,
        "text": "Usare Conferma (#) per riportare le voci nella Nota spese; usare Annulla per uscire senza applicare la selezione."
      }
    ]
  },
  {
    "id": "cap-19-prezzari-e-nuovi-prezzi",
    "order": 19,
    "title": "19. Prezzari e nuovi prezzi",
    "roles": [
      "RIT",
      "ADMIN"
    ],
    "blocks": [
      {
        "type": "lead",
        "text": "La Gestione Prezzari è riservata al Responsabile dell’istruttoria tecnica e all’Amministratore. Comprende caricamento del prezzario regionale, gestione delle voci create internamente come “nuovi prezzi”, analisi prezzi, parametri e consultazione."
      },
      {
        "type": "heading2",
        "id": "cap-19-prezzari-e-nuovi-prezzi-19-1-caricare-un-prezzario-regionale",
        "text": "19.1 Caricare un prezzario regionale"
      },
      {
        "type": "heading3",
        "id": "cap-19-prezzari-e-nuovi-prezzi-rit-admin-importare-un-prezzario",
        "text": "Responsabile dell’istruttoria tecnica e Amministratore — importare un prezzario"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Aprire Gestione Prezzari → Prezzari."
      },
      {
        "type": "step",
        "number": 2,
        "text": "Selezionare il file ZIP del prezzario regionale. Il pacchetto deve contenere i CSV attesi per anagrafica articoli e analisi del prezzario."
      },
      {
        "type": "step",
        "number": 3,
        "text": "Controllare/compilare Anno e Descrizione; il sistema può proporli in base al file. L’anno deve essere nel formato valido previsto."
      },
      {
        "type": "step",
        "number": 4,
        "text": "Scegliere se attivare subito il prezzario dopo l’import."
      },
      {
        "type": "step",
        "number": 5,
        "text": "Avviare l’importazione. Se esiste già lo stesso anno regionale, confermare la sostituzione: i dati precedenti di quell’import vengono rimossi prima di caricare il nuovo pacchetto."
      },
      {
        "type": "step",
        "number": 6,
        "text": "Al termine controllare nella tabella anno, tipo, descrizione, stato, nome file e conteggi di articoli/analisi."
      },
      {
        "type": "step",
        "number": 7,
        "text": "Usare il comando di attivazione per rendere attivo il prezzario desiderato. Il sistema mantiene una sola importazione attiva per tipo."
      },
      {
        "type": "step",
        "number": 8,
        "text": "Per eliminare un import, disattivarlo e quindi confermare l’eliminazione."
      },
      {
        "type": "callout",
        "title": "Attenzione",
        "text": "La voce “prezzario interno” esiste come tipo, ma l’importazione del prezzario interno non è implementata nel caricatore corrente. Non descriverla come procedura disponibile."
      },
      {
        "type": "heading2",
        "id": "cap-19-prezzari-e-nuovi-prezzi-19-2-creare-un-nuovo-prezzo",
        "text": "19.2 Creare un nuovo prezzo"
      },
      {
        "type": "lead",
        "text": "La creazione effettiva avviene in Analisi prezzi. La pagina Voci interne serve soprattutto a consultare e modificare l’anagrafica dei nuovi prezzi esistenti."
      },
      {
        "type": "heading3",
        "id": "cap-19-prezzari-e-nuovi-prezzi-rit-admin-creare-un-nuovo-prezzo-elementare",
        "text": "Responsabile dell’istruttoria tecnica e Amministratore — creare un nuovo prezzo elementare"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Aprire Gestione Prezzari → Analisi prezzi."
      },
      {
        "type": "step",
        "number": 2,
        "text": "Avviare un nuovo record e scegliere Tipologia = ELEMENTARE."
      },
      {
        "type": "step",
        "number": 3,
        "text": "Indicare Anno listino."
      },
      {
        "type": "step",
        "number": 4,
        "text": "Selezionare Super capitolo, Capitolo e Sub capitolo tra i valori configurati. Il sistema genera il Codice del nuovo prezzo e lo mantiene in sola lettura."
      },
      {
        "type": "step",
        "number": 5,
        "text": "Compilare Descrizione, Unità di misura e Prezzo unitario; aggiungere eventuali Note."
      },
      {
        "type": "step",
        "number": 6,
        "text": "Lasciare Attivo se la voce deve essere immediatamente utilizzabile come componente."
      },
      {
        "type": "step",
        "number": 7,
        "text": "Salvare."
      },
      {
        "type": "callout",
        "title": "Cosa accade dopo",
        "text": "Il nuovo prezzo elementare diventa disponibile nella consultazione e, se attivo, può essere selezionato come componente di altri prezzi analizzati."
      },
      {
        "type": "heading3",
        "id": "cap-19-prezzari-e-nuovi-prezzi-rit-admin-creare-un-nuovo-prezzo-analizzato",
        "text": "Responsabile dell’istruttoria tecnica e Amministratore — creare un nuovo prezzo analizzato"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Aprire Gestione Prezzari → Analisi prezzi e creare un nuovo record."
      },
      {
        "type": "step",
        "number": 2,
        "text": "Scegliere Tipologia = ANALIZZATA."
      },
      {
        "type": "step",
        "number": 3,
        "text": "Compilare Anno listino, gerarchia, Descrizione, Unità di misura e Note. Il Prezzo unitario non si digita manualmente: è calcolato dalla somma delle righe dell’analisi."
      },
      {
        "type": "step",
        "number": 4,
        "text": "Salvare l’intestazione per ottenere il nuovo prezzo."
      },
      {
        "type": "step",
        "number": 5,
        "text": "Usare Nuova riga nell’analisi."
      },
      {
        "type": "step",
        "number": 6,
        "text": "Scegliere l’Origine della componente: REGIONALE, INTERNO oppure NUOVO PREZZO."
      },
      {
        "type": "step",
        "number": 7,
        "text": "Cercare la voce sorgente digitando almeno i caratteri richiesti, selezionarla e verificare codice, descrizione, UM e prezzo unitario proposti."
      },
      {
        "type": "step",
        "number": 8,
        "text": "Inserire Quantità maggiore di zero e, se utile, Note. Salvare la riga; l’importo della riga viene calcolato come Quantità × Prezzo unitario."
      },
      {
        "type": "step",
        "number": 9,
        "text": "Ripetere per tutte le componenti. È possibile modificare/eliminare le righe e spostarle su/giù per cambiarne l’ordine."
      },
      {
        "type": "step",
        "number": 10,
        "text": "Controllare il Prezzo unitario complessivo del nuovo prezzo, ricalcolato come somma degli importi delle righe."
      },
      {
        "type": "callout",
        "title": "Attenzione",
        "text": "Un prezzo non può usare sé stesso come componente. Se un nuovo prezzo è inattivo, resta consultabile ma non può essere selezionato come nuova componente. Un prezzo già referenziato da altre analisi non può essere eliminato."
      },
      {
        "type": "heading2",
        "id": "cap-19-prezzari-e-nuovi-prezzi-19-3-modificare-voci-interne",
        "text": "19.3 Modificare Voci interne"
      },
      {
        "type": "heading3",
        "id": "cap-19-prezzari-e-nuovi-prezzi-rit-admin-modificare-un-nuovo-prezzo-esistente",
        "text": "Responsabile dell’istruttoria tecnica e Amministratore — modificare un nuovo prezzo esistente"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Aprire Gestione Prezzari → Voci interne."
      },
      {
        "type": "step",
        "number": 2,
        "text": "Cercare/selezionare il nuovo prezzo da modificare."
      },
      {
        "type": "step",
        "number": 3,
        "text": "Modificare Descrizione, Unità di misura, stato Attivo e Note. Per i prezzi ELEMENTARI è modificabile anche il prezzo; per gli ANALIZZATI il prezzo resta derivato dall’analisi."
      },
      {
        "type": "step",
        "number": 4,
        "text": "Salvare le modifiche."
      },
      {
        "type": "step",
        "number": 5,
        "text": "Per eliminare la voce usare Elimina; se la voce è già utilizzata come componente di altre analisi, il sistema blocca l’eliminazione."
      },
      {
        "type": "heading2",
        "id": "cap-19-prezzari-e-nuovi-prezzi-19-4-parametri",
        "text": "19.4 Parametri"
      },
      {
        "type": "paragraph",
        "text": "La pagina Parametri mostra dataset differenti in base al ruolo. Responsabile dell’istruttoria tecnica dell’area tecnica gestisce i Parametri Nota spese e i Prezzi attrezzature; Responsabile dell’istruttoria amministrativa gestisce Sanzioni, riduzioni e cauzione; Amministratore può accedere a tutte le categorie."
      },
      {
        "type": "heading3",
        "id": "cap-19-prezzari-e-nuovi-prezzi-creare-o-modificare-un-parametro",
        "text": "Creare o modificare un parametro"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Aprire Gestione Prezzari/Parametri o Parametri sanzionatori secondo il ruolo."
      },
      {
        "type": "step",
        "number": 2,
        "text": "Selezionare il dataset pertinente."
      },
      {
        "type": "step",
        "number": 3,
        "text": "Usare Nuovo per creare un parametro oppure Modifica su una riga esistente."
      },
      {
        "type": "step",
        "number": 4,
        "text": "Compilare descrizione, anno di riferimento, valore numerico o testuale secondo il tipo, stato Attivo, periodo di validità e note."
      },
      {
        "type": "step",
        "number": 5,
        "text": "Per i Prezzi attrezzature selezionare il tipo di attrezzatura e indicare il Valore unitario (€)."
      },
      {
        "type": "step",
        "number": 6,
        "text": "Salvare. Se necessario usare Esporta CSV per estrarre l’elenco corrente."
      },
      {
        "type": "heading2",
        "id": "cap-19-prezzari-e-nuovi-prezzi-19-5-consultazione-prezzari",
        "text": "19.5 Consultazione prezzari"
      },
      {
        "type": "heading3",
        "id": "cap-19-prezzari-e-nuovi-prezzi-consultare-una-voce-di-prezzario",
        "text": "Consultare una voce di prezzario"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Aprire Consultazione prezzari."
      },
      {
        "type": "step",
        "number": 2,
        "text": "Selezionare la sorgente disponibile: Prezzario regionale, Prezzario interno se presente nei dati, Nuovi prezzi oppure Attrezzature (risarcimento Art. 30)."
      },
      {
        "type": "step",
        "number": 3,
        "text": "Usare Cerca per codice, descrizione, famiglia, capitolo o sottocapitolo, oppure navigare l’albero dei livelli."
      },
      {
        "type": "step",
        "number": 4,
        "text": "Selezionare famiglia/capitolo/sottocapitolo per restringere l’elenco; usare Tutte le voci per tornare all’insieme completo."
      },
      {
        "type": "step",
        "number": 5,
        "text": "Ordinare l’elenco per codice, descrizione, unità di misura o prezzo, se utile."
      },
      {
        "type": "step",
        "number": 6,
        "text": "Selezionare una voce per aprirne il dettaglio. Quando la sorgente dispone dell’analisi, consultare le componenti e gli importi associati."
      }
    ]
  },
  {
    "id": "cap-20-mappa",
    "order": 20,
    "title": "20. Mappa",
    "roles": [
      "*"
    ],
    "blocks": [
      {
        "type": "lead",
        "text": "La Mappa è una funzione trasversale di consultazione territoriale. Le ricerche disponibili nella configurazione corrente sono Dati catastali, Opere CBSM e Infrazioni."
      },
      {
        "type": "heading2",
        "id": "cap-20-mappa-20-1-dati-catastali",
        "text": "20.1 Dati catastali"
      },
      {
        "type": "heading3",
        "id": "cap-20-mappa-cercare-una-particella-catastale",
        "text": "Cercare una particella catastale"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Aprire Mappa e selezionare Dati catastali."
      },
      {
        "type": "step",
        "number": 2,
        "text": "Selezionare Comune, che è obbligatorio."
      },
      {
        "type": "step",
        "number": 3,
        "text": "Restringere progressivamente con Sezione, Foglio e Mappale. Le liste sono a cascata: le scelte precedenti condizionano quelle successive."
      },
      {
        "type": "step",
        "number": 4,
        "text": "Usare Cerca."
      },
      {
        "type": "step",
        "number": 5,
        "text": "Consultare i risultati e la geometria evidenziata sulla mappa; azzerare i criteri per una nuova ricerca."
      },
      {
        "type": "heading2",
        "id": "cap-20-mappa-20-2-opere-cbsm",
        "text": "20.2 Opere CBSM"
      },
      {
        "type": "heading3",
        "id": "cap-20-mappa-cercare-un-opera",
        "text": "Cercare un’opera"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Selezionare Opere CBSM."
      },
      {
        "type": "step",
        "number": 2,
        "text": "Impostare uno o più criteri tra Stato, Tipo e Nome; anche in questo caso le liste possono filtrarsi a cascata."
      },
      {
        "type": "step",
        "number": 3,
        "text": "Usare Cerca e consultare i risultati evidenziati sulla mappa."
      },
      {
        "type": "heading2",
        "id": "cap-20-mappa-20-3-infrazioni",
        "text": "20.3 Infrazioni"
      },
      {
        "type": "heading3",
        "id": "cap-20-mappa-cercare-una-pratica-sulla-mappa",
        "text": "Cercare una pratica sulla mappa"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Selezionare Infrazioni."
      },
      {
        "type": "step",
        "number": 2,
        "text": "Impostare almeno un criterio tra Articolo violato, Tipo pratica, Numero pratica, Nominativo/Ragione sociale e CF/P. IVA."
      },
      {
        "type": "step",
        "number": 3,
        "text": "Se si usa Numero pratica, scegliere il tipo coerente quando necessario: rilevazione, rapporto o accertamento/atto."
      },
      {
        "type": "step",
        "number": 4,
        "text": "Usare Cerca. La ricerca applica anche il perimetro di visibilità del ruolo corrente."
      },
      {
        "type": "step",
        "number": 5,
        "text": "Consultare il conteggio e le pratiche visualizzate; quando i risultati sono molti il sistema può indicare che sta mostrando solo i primi elementi."
      },
      {
        "type": "step",
        "number": 6,
        "text": "Azzerare la ricerca prima di una nuova interrogazione se i criteri precedenti non devono essere mantenuti."
      },
      {
        "type": "callout",
        "title": "Attenzione",
        "text": "La mappa non amplia i permessi dell’utente: una ricerca per infrazioni restituisce soltanto le pratiche comprese nel perimetro del profilo corrente."
      }
    ]
  },
  {
    "id": "cap-21-dashboard-e-report",
    "order": 21,
    "title": "21. Dashboard e Report",
    "roles": [
      "*"
    ],
    "blocks": [
      {
        "type": "heading2",
        "id": "cap-21-dashboard-e-report-21-1-dashboard",
        "text": "21.1 Dashboard"
      },
      {
        "type": "paragraph",
        "text": "La Dashboard rispetta la stessa visibilità delle pratiche del profilo. Dispone di due viste: Quadro operativo e Statistiche."
      },
      {
        "type": "bullet",
        "text": "Quadro operativo: mostra Pratiche di competenza, In attesa mia, In attesa di altri, pratiche ferme oltre 15 giorni e pratiche in fase sanzionatoria, oltre a distribuzioni per fase/ruolo e pratiche aggiornate di recente."
      },
      {
        "type": "bullet",
        "text": "Statistiche: consente di scegliere un periodo, filtrare per Ufficio e Tipologia di infrazione e analizzare Uffici di zona, tipologie, andamento temporale, distribuzione per fase, ruolo competente, pratiche critiche e sintesi operativa."
      },
      {
        "type": "bullet",
        "text": "Aggiorna ricarica il quadro; Azzera filtri elimina i filtri statistici selezionati."
      },
      {
        "type": "heading3",
        "id": "cap-21-dashboard-e-report-usare-la-dashboard-per-il-lavoro-quotidiano",
        "text": "Usare la Dashboard per il lavoro quotidiano"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Aprire Dashboard e restare su Quadro operativo per verificare il carico corrente."
      },
      {
        "type": "step",
        "number": 2,
        "text": "Controllare In attesa mia e le pratiche ferme oltre 15 giorni per individuare le priorità operative."
      },
      {
        "type": "step",
        "number": 3,
        "text": "Usare Statistiche quando serve leggere il fenomeno per periodo, ufficio o tipologia di infrazione."
      },
      {
        "type": "step",
        "number": 4,
        "text": "Cliccare i filtri interattivi di Ufficio/Infrazione per restringere l’analisi e usare Azzera filtri per tornare al perimetro completo."
      },
      {
        "type": "step",
        "number": 5,
        "text": "Usare Aggiorna quando è necessario ricaricare i dati dopo lavorazioni recenti."
      },
      {
        "type": "heading2",
        "id": "cap-21-dashboard-e-report-21-2-report-pratiche",
        "text": "21.2 Report pratiche"
      },
      {
        "type": "heading3",
        "id": "cap-21-dashboard-e-report-consultare-ed-esportare-il-report",
        "text": "Consultare ed esportare il Report"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Aprire Report."
      },
      {
        "type": "step",
        "number": 2,
        "text": "Impostare uno o più filtri: Cerca n. rapporto, Area, Settore, Dal/Al, Situazione, Fase procedimentale e Competenza attuale."
      },
      {
        "type": "step",
        "number": 3,
        "text": "Per Situazione scegliere, quando utile, In attesa mia, In attesa di altri, Ferme o Fase sanzionatoria."
      },
      {
        "type": "step",
        "number": 4,
        "text": "Consultare la Sintesi procedimentale. Le colonne comprendono N. rilevazione, N. rapporto, N. atto, Data rilevazione, Tecnico rilevatore, Istruttore tecnico, Area, Settore, Fase procedimentale, Competenza attuale, Ultimo aggiornamento e Giorni di fermo."
      },
      {
        "type": "step",
        "number": 5,
        "text": "Ordinare le colonne secondo l’analisi desiderata oppure usare il reset dell’ordinamento."
      },
      {
        "type": "step",
        "number": 6,
        "text": "Usare Esporta CSV per ottenere i record filtrati. Il file usa separatore punto e virgola ed è predisposto per l’apertura nei comuni strumenti di foglio elettronico."
      },
      {
        "type": "step",
        "number": 7,
        "text": "Usare Pulisci filtri per ripristinare l’insieme delle pratiche di competenza."
      }
    ]
  },
  {
    "id": "cap-22-rubrica-e-regolamento-irriguo",
    "order": 22,
    "title": "22. Rubrica e Regolamento irriguo",
    "roles": [
      "*"
    ],
    "blocks": [
      {
        "type": "heading2",
        "id": "cap-22-rubrica-e-regolamento-irriguo-22-1-rubrica",
        "text": "22.1 Rubrica"
      },
      {
        "type": "lead",
        "text": "La Rubrica è disponibile al Responsabile dell’istruttoria amministrativa e all’Amministratore e alimenta due funzioni distinte: destinatari e-mail e firmatari autorizzati. Le identità già presenti come utenti gestionali possono essere riutilizzate senza duplicare la persona."
      },
      {
        "type": "heading3",
        "id": "cap-22-rubrica-e-regolamento-irriguo-aggiungere-un-destinatario-e-mail",
        "text": "Aggiungere un destinatario e-mail"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Aprire Rubrica → Destinatari e-mail e usare Aggiungi destinatario."
      },
      {
        "type": "step",
        "number": 2,
        "text": "Scegliere Tipo: Persona fisica oppure Altro. Per Altro si usa Denominazione; per una persona si usano Nome e Cognome."
      },
      {
        "type": "step",
        "number": 3,
        "text": "Compilare E-mail e Utilizzo. Gli utilizzi predefiniti comprendono Destinatario determina, Copia conoscenza determina e Destinatario protocollo."
      },
      {
        "type": "step",
        "number": 4,
        "text": "Quando il sistema rileva un omonimo, verificare se si tratta della stessa persona e riutilizzarla oppure confermare l’omonimo distinto; la data di nascita viene utilizzata come discriminante quando richiesta."
      },
      {
        "type": "step",
        "number": 5,
        "text": "Salvare."
      },
      {
        "type": "callout",
        "title": "Attenzione",
        "text": "Per gli utilizzi principali che devono avere un solo destinatario attivo, il sistema controlla eventuali duplicazioni e chiede di risolverle."
      },
      {
        "type": "heading3",
        "id": "cap-22-rubrica-e-regolamento-irriguo-aggiungere-un-firmatario",
        "text": "Aggiungere un firmatario"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Aprire Rubrica → Firmatari e usare Aggiungi firmatario."
      },
      {
        "type": "step",
        "number": 2,
        "text": "Selezionare il Titolo e compilare Nome e Cognome."
      },
      {
        "type": "step",
        "number": 3,
        "text": "Gestire la Data di nascita se necessaria per distinguere omonimi."
      },
      {
        "type": "step",
        "number": 4,
        "text": "Salvare. Il nominativo diventa parte dell’elenco usato dal controllo della firma digitale dell’Atto."
      },
      {
        "type": "paragraph",
        "text": "La rimozione da una funzione della Rubrica non elimina automaticamente la persona se è ancora utilizzata come utente gestionale o nell’altra funzione della Rubrica."
      },
      {
        "type": "heading2",
        "id": "cap-22-rubrica-e-regolamento-irriguo-22-2-regolamento-irriguo",
        "text": "22.2 Regolamento irriguo"
      },
      {
        "type": "heading3",
        "id": "cap-22-rubrica-e-regolamento-irriguo-cercare-e-consultare-il-regolamento",
        "text": "Cercare e consultare il Regolamento"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Aprire Regolamento irriguo."
      },
      {
        "type": "step",
        "number": 2,
        "text": "Usare Cerca digitando una parola, un numero di articolo, un titolo o una sezione. Durante la ricerca l’indice mostra soltanto le sezioni/articoli corrispondenti."
      },
      {
        "type": "step",
        "number": 3,
        "text": "In alternativa espandere/collassare le sezioni dell’Indice regolamento e selezionare l’articolo desiderato."
      },
      {
        "type": "step",
        "number": 4,
        "text": "Leggere il Testo articolo nel pannello di destra. I riferimenti ad altri articoli riconosciuti nel testo possono essere usati per la navigazione interna."
      },
      {
        "type": "step",
        "number": 5,
        "text": "Usare Articolo precedente / Articolo successivo per scorrere la sequenza."
      },
      {
        "type": "step",
        "number": 6,
        "text": "Usare Reimposta indice o Pulisci ricerca quando si vuole tornare alla vista completa."
      },
      {
        "type": "step",
        "number": 7,
        "text": "Se disponibile, usare Apri il testo integrale (PDF) per consultare il documento completo."
      }
    ]
  },
  {
    "id": "cap-23-gestione-utenti",
    "order": 23,
    "title": "23. Gestione utenti",
    "roles": [
      "ADMIN"
    ],
    "blocks": [
      {
        "type": "lead",
        "text": "Gestione Utenti è riservata all’Amministratore. Il GII non crea l’account ArcGIS Online: l’utente deve esistere già nell’organizzazione. La funzione registra l’assegnazione gestionale e sincronizza l’appartenenza ai gruppi ArcGIS Online previsti."
      },
      {
        "type": "heading2",
        "id": "cap-23-gestione-utenti-23-1-creare-un-nuovo-utente-gestionale",
        "text": "23.1 Creare un nuovo utente gestionale"
      },
      {
        "type": "heading3",
        "id": "cap-23-gestione-utenti-admin-aggiungere-un-utente",
        "text": "Amministratore — aggiungere un utente"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Verificare prima che la persona possieda già un account valido nell’organizzazione ArcGIS Online."
      },
      {
        "type": "step",
        "number": 2,
        "text": "Aprire Gestione Utenti e usare Nuovo utente."
      },
      {
        "type": "step",
        "number": 3,
        "text": "Usare il selettore dei membri ArcGIS Online e cercare per nome, cognome, username o e-mail; scegliere Seleziona sul membro corretto. Membri già registrati o disabilitati sono segnalati."
      },
      {
        "type": "step",
        "number": 4,
        "text": "Controllare i dati identificativi importati dall’account."
      },
      {
        "type": "step",
        "number": 5,
        "text": "Nella sezione Assegnazione gestionale selezionare Ruolo."
      },
      {
        "type": "step",
        "number": 6,
        "text": "Compilare Area, Settore e Ufficio quando richiesti. Alcune combinazioni sono automatiche/fisse in base al ruolo."
      },
      {
        "type": "step",
        "number": 7,
        "text": "Controllare il Gruppo calcolato dal sistema."
      },
      {
        "type": "step",
        "number": 8,
        "text": "Salvare. Prima di aggiornare i gruppi il sistema verifica l’esistenza e la validità dell’account ArcGIS Online."
      },
      {
        "type": "step",
        "number": 9,
        "text": "Verificare il messaggio Utente aggiunto e la comparsa della riga nell’elenco."
      },
      {
        "type": "callout",
        "title": "Attenzione",
        "text": "Non digitare uno username inesistente confidando che il GII lo crei: l’account deve essere creato o invitato prima su ArcGIS Online."
      },
      {
        "type": "heading2",
        "id": "cap-23-gestione-utenti-23-2-regole-di-assegnazione",
        "text": "23.2 Regole di assegnazione"
      },
      {
        "type": "table",
        "headers": [
          "Ruolo",
          "Area/Settore attesi dalla configurazione"
        ],
        "rows": [
          [
            "Tecnico rilevatore, Istruttore tecnico, Capo Settore",
            "Area AGR o TEC; per AGR settori D1-D6, per TEC settore DS."
          ],
          [
            "Responsabile dell’istruttoria tecnica",
            "Area AGR o TEC; settore coerente con l’area tecnica."
          ],
          [
            "Istruttore amministrativo",
            "Area AMM e contesto amministrativo configurato."
          ],
          [
            "Responsabile dell’istruttoria amministrativa",
            "Area AMM e contesto amministrativo configurato."
          ],
          [
            "Direttore d’Area",
            "Area AGR o TEC; nessun settore operativo da selezionare quando non previsto."
          ],
          [
            "Direttore Area AA.GG. e P.F.",
            "Area AMM."
          ],
          [
            "Amministratore",
            "Nessuna area/settore/ufficio richiesti."
          ]
        ]
      },
      {
        "type": "heading2",
        "id": "cap-23-gestione-utenti-23-3-modificare-e-sincronizzare",
        "text": "23.3 Modificare e sincronizzare"
      },
      {
        "type": "heading3",
        "id": "cap-23-gestione-utenti-modificare-un-utente",
        "text": "Modificare un utente"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Selezionare la riga e usare Modifica utente, oppure fare doppio clic sulla riga."
      },
      {
        "type": "step",
        "number": 2,
        "text": "Cambiare l’assegnazione consentita e usare Aggiorna."
      },
      {
        "type": "step",
        "number": 3,
        "text": "Se i dati anagrafici dell’account ArcGIS Online sono cambiati, usare Sincronizza. Il sistema mostra le differenze tra Gestionale e AGOL prima di applicarle a tutte le assegnazioni dello stesso account."
      },
      {
        "type": "step",
        "number": 4,
        "text": "Confermare la sincronizzazione soltanto dopo aver verificato le differenze."
      },
      {
        "type": "heading2",
        "id": "cap-23-gestione-utenti-23-4-aggiungere-una-seconda-assegnazione",
        "text": "23.4 Aggiungere una seconda assegnazione"
      },
      {
        "type": "heading3",
        "id": "cap-23-gestione-utenti-aggiungere-una-nuova-assegnazione-allo-stesso-account",
        "text": "Aggiungere una nuova assegnazione allo stesso account"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Sulla riga dell’utente usare Nuova assegnazione."
      },
      {
        "type": "step",
        "number": 2,
        "text": "Il sistema riutilizza l’identità dell’account e apre una nuova combinazione ruolo/area/settore/ufficio."
      },
      {
        "type": "step",
        "number": 3,
        "text": "Compilare i dati della nuova assegnazione."
      },
      {
        "type": "step",
        "number": 4,
        "text": "Salvare. Una duplicazione identica di assegnazione viene bloccata."
      },
      {
        "type": "heading2",
        "id": "cap-23-gestione-utenti-23-5-eliminare-un-profilo-gestionale",
        "text": "23.5 Eliminare un profilo gestionale"
      },
      {
        "type": "heading3",
        "id": "cap-23-gestione-utenti-rimuovere-un-assegnazione-utente",
        "text": "Rimuovere un’assegnazione utente"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Usare Elimina utente sulla riga da rimuovere."
      },
      {
        "type": "step",
        "number": 2,
        "text": "Leggere il messaggio di conferma e scegliere Elimina."
      },
      {
        "type": "step",
        "number": 3,
        "text": "Il sistema rimuove il profilo/assegnazione gestionale e aggiorna i gruppi pertinenti."
      },
      {
        "type": "step",
        "number": 4,
        "text": "Il nominativo non viene eliminato dalla Rubrica se è ancora usato come destinatario e-mail o firmatario."
      }
    ]
  },
  {
    "id": "cap-24-allegati-fascicolo-e-iter",
    "order": 24,
    "title": "24. Allegati, fascicolo e Iter",
    "roles": [
      "*"
    ],
    "blocks": [
      {
        "type": "heading2",
        "id": "cap-24-allegati-fascicolo-e-iter-24-1-allegati",
        "text": "24.1 Allegati"
      },
      {
        "type": "paragraph",
        "text": "Nelle schede di lavorazione tecnica e amministrativa gli allegati possono essere aggiunti, eliminati, sostituiti e, per le immagini supportate, ruotati. Le operazioni sono preparate nella sessione corrente e diventano definitive con Salva, salvo i flussi documentali speciali che effettuano una propria acquisizione verificata."
      },
      {
        "type": "heading3",
        "id": "cap-24-allegati-fascicolo-e-iter-gestire-un-allegato-ordinario",
        "text": "Gestire un allegato ordinario"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Aprire la scheda Allegati della pratica in lavorazione."
      },
      {
        "type": "step",
        "number": 2,
        "text": "Usare il comando di aggiunta per selezionare il file oppure il comando di sostituzione/eliminazione sulla riga esistente."
      },
      {
        "type": "step",
        "number": 3,
        "text": "Aprire il viewer per controllare il documento. Se si tratta di un’immagine e serve correggere l’orientamento, usare i pulsanti di rotazione disponibili nel viewer."
      },
      {
        "type": "step",
        "number": 4,
        "text": "Continuare le altre modifiche della pratica se necessario."
      },
      {
        "type": "step",
        "number": 5,
        "text": "Premere Salva per rendere definitive le variazioni."
      },
      {
        "type": "step",
        "number": 6,
        "text": "Verificare il nuovo elenco degli allegati e, se utile, l’Iter per il tracciamento della modifica."
      },
      {
        "type": "heading2",
        "id": "cap-24-allegati-fascicolo-e-iter-24-2-anteprima-fascicolo",
        "text": "24.2 Anteprima fascicolo"
      },
      {
        "type": "paragraph",
        "text": "L’Anteprima fascicolo costruisce la vista del fascicolo sulla base dei dati e dei documenti già disponibili. Nella creazione tecnica diventa utilizzabile soltanto dopo il primo salvataggio, perché prima non esiste ancora un’identità persistente della pratica. Durante i flussi di protocollo la composizione del fascicolo viene invece trattata in modo controllato e verificata al rientro."
      },
      {
        "type": "heading2",
        "id": "cap-24-allegati-fascicolo-e-iter-24-3-iter-non-solo-passaggi-tra-ruoli",
        "text": "24.3 Iter: non solo passaggi tra ruoli"
      },
      {
        "type": "paragraph",
        "text": "L’Iter è il registro operativo per ricostruire chi ha fatto cosa, quando e con quale effetto. I cicli mostrano l’evento, lo stato In corso/Chiuso, Avviato da, Trasmesso a, date di apertura/chiusura, note, campi modificati manualmente e variazioni degli allegati."
      },
      {
        "type": "bullet",
        "text": "I campi di stato, timestamp e assegnazione gestiti automaticamente dal workflow non vengono duplicati nell’elenco “Campi modificati”: il loro cambiamento è rappresentato dall’evento del ciclo."
      },
      {
        "type": "bullet",
        "text": "Le variazioni contenutistiche della pratica vengono invece evidenziate come campi modificati."
      },
      {
        "type": "bullet",
        "text": "Per gli allegati l’Iter distingue aggiunta, rimozione e sostituzione."
      },
      {
        "type": "bullet",
        "text": "Se la pratica è storica e manca un ciclo di creazione esplicito, il sistema può costruire un passaggio iniziale sintetico per mantenere leggibile la cronologia."
      },
      {
        "type": "bullet",
        "text": "Nella scheda Iter è possibile invertire l’ordine temporale; l’impostazione iniziale mostra normalmente gli eventi più recenti per primi."
      },
      {
        "type": "heading3",
        "id": "cap-24-allegati-fascicolo-e-iter-ricostruire-una-modifica-con-l-iter",
        "text": "Ricostruire una modifica con l’Iter"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Aprire Dettaglio pratica → Iter."
      },
      {
        "type": "step",
        "number": 2,
        "text": "Individuare il ciclo corrispondente al periodo o al ruolo interessato."
      },
      {
        "type": "step",
        "number": 3,
        "text": "Leggere Avviato da e Trasmesso a per capire il passaggio di responsabilità."
      },
      {
        "type": "step",
        "number": 4,
        "text": "Controllare Campi modificati per vedere quali dati sostanziali sono stati valorizzati o cambiati."
      },
      {
        "type": "step",
        "number": 5,
        "text": "Controllare le modifiche agli allegati."
      },
      {
        "type": "step",
        "number": 6,
        "text": "Se il ciclo è un rimando, leggere la motivazione e seguire i successivi eventi “Esito integrazione trasmesso” fino al ruolo che aveva richiesto la correzione."
      }
    ]
  },
  {
    "id": "cap-25-allarmi-stati-ed-eventi-riferimento-operativo",
    "order": 25,
    "title": "25. Allarmi, stati ed eventi: riferimento operativo",
    "roles": [
      "*"
    ],
    "blocks": [
      {
        "type": "heading2",
        "id": "cap-25-allarmi-stati-ed-eventi-riferimento-operativo-25-1-allarmi-di-workflow",
        "text": "25.1 Allarmi di workflow"
      },
      {
        "type": "table",
        "headers": [
          "Allarme",
          "Destinatario tipico",
          "Cosa significa / cosa fare"
        ],
        "rows": [
          [
            "Nuova rilevazione ricevuta",
            "Capo Settore",
            "Può essere una rilevazione proveniente dal Tecnico rilevatore e ancora da assegnare oppure una pratica creata dall’Istruttore tecnico, che risulta già associato. Controllare l’assegnazione prima di agire."
          ],
          [
            "Nuova istruttoria ricevuta",
            "Ruolo successivo del flusso tecnico/amministrativo",
            "Aprire la pratica, prendere in carico e svolgere la verifica prevista per il proprio ruolo."
          ],
          [
            "Richiesta integrazione ricevuta",
            "Ruolo cui è stata rimandata la pratica",
            "Prendere in carico, leggere motivazione/Iter, correggere i dati consentiti e ritrasmettere l’esito."
          ],
          [
            "Esito integrazione ricevuto",
            "Ruolo intermedio o richiedente",
            "Se intermedio, inoltrare nel percorso previsto; se richiedente originario, riprendere la propria normale verifica."
          ],
          [
            "Nuovo fascicolo ricevuto",
            "Responsabile dell’istruttoria amministrativa",
            "Fascicolo amministrativo trasmesso dall’Istruttore amministrativo per verifica."
          ],
          [
            "Fascicolo ricevuto",
            "Istruttore amministrativo",
            "Fascicolo restituito/validato dal Responsabile dell’istruttoria amministrativa per gli adempimenti successivi."
          ],
          [
            "Atto di accertamento ricevuto",
            "Responsabile dell’istruttoria amministrativa o Istruttore amministrativo",
            "Atto trasmesso al Responsabile dell’istruttoria amministrativa per verifica oppure Atto approvato restituito all’Istruttore amministrativo."
          ]
        ]
      },
      {
        "type": "heading2",
        "id": "cap-25-allarmi-stati-ed-eventi-riferimento-operativo-25-2-eventi-principali-dell-iter",
        "text": "25.2 Eventi principali dell’Iter"
      },
      {
        "type": "table",
        "headers": [
          "Evento mostrato",
          "Significato operativo"
        ],
        "rows": [
          [
            "Nuova rilevazione trasmessa",
            "L’Istruttore tecnico ha trasmesso al Capo Settore una pratica creata direttamente nel GII."
          ],
          [
            "Istruttoria assegnata",
            "È stata assegnata una pratica a un istruttore; in fase amministrativa il Responsabile dell’istruttoria amministrativa assegna l’Istruttore amministrativo."
          ],
          [
            "Istruttoria trasmessa per verifica",
            "L’Istruttore tecnico ha completato e trasmesso la propria istruttoria al Capo Settore."
          ],
          [
            "Istruttoria verificata",
            "Il Capo Settore ha espresso esito positivo e ha trasmesso al Responsabile dell’istruttoria tecnica."
          ],
          [
            "Istruttoria validata",
            "Il Responsabile dell’istruttoria tecnica ha espresso esito positivo e ha trasmesso al Direttore d’Area; in fase amministrativa indica la validazione del Responsabile dell’istruttoria amministrativa."
          ],
          [
            "Istruttoria approvata",
            "Il Direttore d’Area ha approvato la fase tecnica e ha trasmesso al Responsabile dell’istruttoria amministrativa."
          ],
          [
            "Istruttoria rimandata per integrazione",
            "È stata aperta una richiesta di integrazione sulla fase tecnica."
          ],
          [
            "Fascicolo rimandato per integrazione",
            "È stata aperta una richiesta di integrazione sul fascicolo amministrativo."
          ],
          [
            "Esito integrazione trasmesso",
            "Un ruolo sta facendo risalire la risposta a una richiesta di integrazione."
          ],
          [
            "Fascicolo trasmesso per verifica",
            "L’Istruttore amministrativo ha trasmesso il fascicolo al Responsabile dell’istruttoria amministrativa."
          ],
          [
            "Atto di accertamento trasmesso per verifica",
            "L’Istruttore amministrativo ha trasmesso la bozza dell’Atto al Responsabile dell’istruttoria amministrativa."
          ],
          [
            "Atto di accertamento rimandato per integrazione",
            "Il Responsabile dell’istruttoria amministrativa ha richiesto una correzione amministrativa dell’Atto."
          ],
          [
            "Atto di accertamento approvato",
            "Il Responsabile dell’istruttoria amministrativa ha approvato l’Atto e lo ha restituito all’Istruttore amministrativo."
          ],
          [
            "Istruttoria respinta",
            "Il flusso tecnico è stato respinto nel punto in cui il workflow consente tale esito."
          ]
        ]
      },
      {
        "type": "heading2",
        "id": "cap-25-allarmi-stati-ed-eventi-riferimento-operativo-25-3-stati-sintetici-nell-elenco",
        "text": "25.3 Stati sintetici nell’Elenco"
      },
      {
        "type": "table",
        "headers": [
          "Stato",
          "Interpretazione"
        ],
        "rows": [
          [
            "Da prendere in carico",
            "Il ruolo corrente è destinatario della pratica ma non ha ancora formalizzato la presa in carico."
          ],
          [
            "In carico",
            "Il ruolo corrente ha preso in carico la pratica e può svolgere le attività abilitate."
          ],
          [
            "Rimandato",
            "La pratica è in un ciclo di integrazione/rettifica."
          ],
          [
            "Trasmesso",
            "Il ruolo ha completato il proprio passaggio e la pratica è in attesa del destinatario."
          ],
          [
            "Istruttoria assegnata",
            "La pratica è stata associata a un istruttore nel passaggio di assegnazione."
          ],
          [
            "Respinto",
            "Il percorso ordinario è stato interrotto da un esito di respingimento previsto dal workflow."
          ]
        ]
      }
    ]
  },
  {
    "id": "cap-26-indice-rapido-come-faccio-a",
    "order": 26,
    "title": "26. Indice rapido “Come faccio a…”",
    "roles": [
      "*"
    ],
    "blocks": [
      {
        "type": "table",
        "headers": [
          "Attività",
          "Dove leggere la procedura"
        ],
        "rows": [
          [
            "Come assegno una nuova rilevazione?",
            "Cap. 4.1 — il Capo Settore distingue l’origine della rilevazione e, quando necessario, assegna l’Istruttore tecnico."
          ],
          [
            "Come creo una nuova pratica?",
            "Cap. 4.2 — creazione di una nuova pratica da parte dell’Istruttore tecnico o dell’Amministratore."
          ],
          [
            "Come completo un’istruttoria tecnica?",
            "Cap. 5 — controllo sezioni, Salva, Anteprima, trasmissione."
          ],
          [
            "Come richiedo un’integrazione?",
            "Cap. 6-9 e 12 — usare Gestisci istruttoria dal ruolo che dispone del rimando."
          ],
          [
            "Come rispondo a una richiesta di integrazione?",
            "Cap. 9 — presa in carico, correzione, salvataggio e risalita."
          ],
          [
            "Come preparo una Nota spese?",
            "Cap. 18 — selezione casistica, Browser prezzario, quantità e Salva."
          ],
          [
            "Come creo un nuovo prezzo?",
            "Cap. 19.2 — Analisi prezzi, elementare o analizzato."
          ],
          [
            "Come genero la determinazione?",
            "Cap. 13 — esito dell’Istruttore amministrativo, Word, PDF, verifica del Responsabile dell’istruttoria amministrativa, protocollo e versione definitiva."
          ],
          [
            "Come sostituisco un PDF della determinazione?",
            "Cap. 13.4 — sostituzione della copia ufficiale entro i limiti del workflow."
          ],
          [
            "Come preparo l’Atto di accertamento?",
            "Cap. 14 — prerequisiti, bozza, verifica del Responsabile dell’istruttoria amministrativa, versione pulita, firma e protocollo."
          ],
          [
            "Come carico gli avvisi pagoPA?",
            "Cap. 15.3 — caricamento batch e controlli automatici."
          ],
          [
            "Come sostituisco gli avvisi pagoPA?",
            "Cap. 15.4 — sostituzione, controllo e Salva."
          ],
          [
            "Come registro una notifica?",
            "Cap. 16.1 — esito, prova protocollata e Salva."
          ],
          [
            "Come registro un pagamento?",
            "Cap. 16.2 e 17.4 — stato pagamento e successivo Incasso/Definizione."
          ],
          [
            "Come registro un ricorso?",
            "Cap. 17.1 — dati del ricorso/riesame post-notifica."
          ],
          [
            "Come registro l’esito del CdA?",
            "Cap. 17.2 — decisione, importo/scadenza rideterminati e note."
          ],
          [
            "Come riapro una pratica?",
            "Cap. 17.3 — riapertura da parte del Responsabile dell’istruttoria amministrativa e nuova assegnazione all’Istruttore amministrativo."
          ],
          [
            "Come definisco una pratica?",
            "Cap. 17.4 — Incasso e causa di definizione."
          ],
          [
            "Come cerco una pratica sulla mappa?",
            "Cap. 20.3 — ricerca Infrazioni con almeno un criterio."
          ],
          [
            "Come esportare un report?",
            "Cap. 21.2 — filtri Report ed Esporta CSV."
          ],
          [
            "Come aggiungo un firmatario?",
            "Cap. 22.1 — Rubrica → Firmatari."
          ],
          [
            "Come creo o modifico un utente?",
            "Cap. 23 — account AGOL esistente, assegnazione e sincronizzazione."
          ],
          [
            "Come ricostruisco chi ha modificato una pratica?",
            "Cap. 24.3 — Iter, cicli, campi e allegati modificati."
          ]
        ]
      }
    ]
  },
  {
    "id": "cap-27-limiti-e-comportamenti-non-presenti-nella-base-analizzata",
    "order": 27,
    "title": "27. Limiti e comportamenti non presenti nella base analizzata",
    "roles": [
      "*"
    ],
    "blocks": [
      {
        "type": "lead",
        "text": "Questa sezione evita di attribuire al GII funzioni che non risultano dimostrate nella base corrente."
      },
      {
        "type": "bullet",
        "text": "Il Tecnico rilevatore non utilizza il GII pubblicato come ruolo operativo: Survey123 è lo strumento esterno da cui può originare la rilevazione."
      },
      {
        "type": "bullet",
        "text": "Il caricatore corrente non implementa l’importazione di un prezzario interno, anche se altre parti del sistema possono consultare dati classificati come prezzario interno se già presenti."
      },
      {
        "type": "bullet",
        "text": "Non risulta un modulo autonomo di riscossione coattiva: la fase finale consente di registrare “Avviata a riscossione” e i dati di incasso/definizione."
      },
      {
        "type": "bullet",
        "text": "Firma digitale, conversione Word→PDF e protocollazione avvengono mediante strumenti esterni; il GII prepara, verifica e acquisisce i documenti di ritorno."
      },
      {
        "type": "bullet",
        "text": "Il Direttore Area AA.GG. e P.F. non dispone, nella base analizzata, di una generica azione di workflow analoga a quelle disponibili per l’Istruttore tecnico, il Capo Settore, il Responsabile dell’istruttoria tecnica, il Direttore d’Area e il Responsabile dell’istruttoria amministrativa. Il suo intervento documentale è rappresentato soprattutto dalla firma dei documenti e dalla consultazione o dalle indicazioni che vengono poi registrate nei flussi amministrativi."
      },
      {
        "type": "bullet",
        "text": "Il generatore di avvisi pagoPA abilitato nella configurazione corrente è marcato “SOLO TEST” e non costituisce il sistema reale di emissione pagoPA."
      },
      {
        "type": "bullet",
        "text": "Le funzioni che dipendono da servizi, tabelle o configurazioni esterne mostrano messaggi di indisponibilità se la relativa fonte non è raggiungibile; il manuale descrive il comportamento previsto quando tali fonti sono disponibili."
      },
      {
        "type": "callout",
        "title": "Criterio in caso di dubbio operativo",
        "text": "Se una pratica presenta una combinazione di stato, ruolo o documenti non riconducibile alle procedure descritte, usare anzitutto Dettaglio → Iter e gli allarmi per ricostruire il ciclo corrente. Non forzare un’azione da una fase diversa; se il sistema non offre il comando previsto, occorre verificare lo stato effettivo della pratica con l’amministratore."
      }
    ]
  },
  {
    "id": "appendice-a-checklist-per-ruolo",
    "order": 128,
    "title": "Appendice A — Checklist per ruolo",
    "roles": [
      "*"
    ],
    "blocks": [
      {
        "type": "table",
        "headers": [
          "Ruolo",
          "Checklist sintetica"
        ],
        "rows": [
          [
            "Tecnico rilevatore",
            "Effettua la rilevazione in Survey123. Non accede al GII se dispone soltanto del ruolo di Tecnico rilevatore."
          ],
          [
            "Istruttore tecnico",
            "Prende in carico le assegnazioni; compila/corregge tecnica; Nota spese; allegati; salva; trasmette al Capo Settore; risponde alle integrazioni."
          ],
          [
            "Capo Settore",
            "Distingue una rilevazione proveniente dal Tecnico rilevatore da una pratica creata direttamente dall’Istruttore tecnico; assegna l’Istruttore tecnico solo quando la rilevazione proveniente dal Tecnico rilevatore non è ancora assegnata; verifica; rimanda; alla prima valutazione può respingere; trasmette al Responsabile dell’istruttoria tecnica."
          ],
          [
            "Responsabile dell’istruttoria tecnica",
            "Prende in carico; consulta; può modificare Occorrenza e Grado; valida verso il Direttore d’Area; rimanda all’Istruttore tecnico; gestisce i rientri e le integrazioni tecniche richieste dal Responsabile dell’istruttoria amministrativa."
          ],
          [
            "Direttore d’Area",
            "Prende in carico; approva verso il Responsabile dell’istruttoria amministrativa; può chiedere un’integrazione all’Istruttore tecnico o al Responsabile dell’istruttoria tecnica, secondo gli aspetti da correggere; può respingere."
          ],
          [
            "Responsabile dell’istruttoria amministrativa",
            "Assegna l’Istruttore amministrativo; verifica il fascicolo; valida o instrada le integrazioni; verifica l’Atto; gestisce la riapertura; configura i parametri sanzionatori e la Rubrica."
          ],
          [
            "Istruttore amministrativo",
            "Prende in carico le proprie pratiche; svolge istruttoria amm.; genera proposta/determinazione; gestisce Atto, pagoPA, protocollo, notifica, pagamento, ricorso/CdA/definizione nei limiti previsti."
          ],
          [
            "Direttore Area AA.GG. e P.F.",
            "Consulta il perimetro amministrativo; firma i documenti nel flusso esterno; le indicazioni di riapertura vengono registrate dal Responsabile dell’istruttoria amministrativa."
          ],
          [
            "Amministratore",
            "Assistenza e visibilità completa; Gestione utenti; accesso alle configurazioni funzionali previste; può operare sulle funzioni gestionali abilitate all’amministratore."
          ]
        ]
      }
    ]
  },
  {
    "id": "appendice-b-regola-pratica-per-distinguere-consultazione-e-lavorazione",
    "order": 129,
    "title": "Appendice B — Regola pratica per distinguere consultazione e lavorazione",
    "roles": [
      "*"
    ],
    "blocks": [
      {
        "type": "table",
        "headers": [
          "Se vuoi…",
          "Usa…",
          "Nota"
        ],
        "rows": [
          [
            "Capire dove si trova la pratica",
            "Elenco pratiche + Stato pratica/Fase istruttoria",
            "Controlla In attesa mia / In attesa di altri."
          ],
          [
            "Leggere dati senza cambiarli",
            "Dettaglio pratica",
            "Trasgressore, Violazione, Luoghi e dati, Mappa, Nota spese, Allegati, Iter."
          ],
          [
            "Modificare dati tecnici",
            "Lavorazione istruttoria tecnica",
            "Solo quando il ruolo e lo stato lo consentono."
          ],
          [
            "Modificare dati amministrativi",
            "Lavorazione amministrativa",
            "Operativa soprattutto per l’Istruttore amministrativo e l’Amministratore; il Responsabile dell’istruttoria amministrativa e il Direttore Area AA.GG. e P.F. usano le proprie azioni di workflow e le sezioni riservate."
          ],
          [
            "Far avanzare o rimandare la pratica",
            "Azioni / Gestisci istruttoria",
            "Non usare la semplice modifica dei dati come sostituto della trasmissione."
          ],
          [
            "Ricostruire chi ha fatto cosa",
            "Iter",
            "Leggere ciclo, evento, mittente/destinatario, campi e allegati modificati."
          ],
          [
            "Controllare scadenze",
            "Allarmi e scadenze + Dashboard",
            "Gli allarmi di workflow e quelli post-notifica hanno finalità diverse."
          ]
        ]
      }
    ]
  },
  {
    "id": "conclusione",
    "order": 130,
    "title": "Conclusione",
    "roles": [
      "*"
    ],
    "blocks": [
      {
        "type": "paragraph",
        "text": "Il GII separa in modo netto tre momenti: consultare la pratica, modificarne i dati quando il ruolo è autorizzato, e far avanzare il workflow con una specifica azione. Per evitare errori operativi conviene sempre verificare prima la scheda “In attesa mia”, leggere l’Iter quando la pratica proviene da un rimando e usare Salva prima di eseguire la successiva azione di workflow quando sono state apportate modifiche ai dati o agli allegati."
      },
      {
        "type": "paragraph",
        "text": "Per le procedure documentali amministrative, il principio è analogo: il GII conserva la versione attesa, prepara il passaggio verso sistemi esterni, verifica i documenti di ritorno e registra gli estremi necessari a proseguire. Quando una funzione non è abilitata dallo stato corrente, non va sostituita con una procedura manuale inventata: occorre individuare nell’Iter quale passaggio manca o quale ruolo deve ancora intervenire."
      }
    ]
  }
] as GuideChapter[]

export const GUIDE_QUICK_LINKS: GuideQuickLink[] = [
  {
    "label": "Come assegno una nuova rilevazione?",
    "description": "Cap. 4.1 — il Capo Settore distingue l’origine della rilevazione e, quando necessario, assegna l’Istruttore tecnico.",
    "targetChapterId": "cap-4-nuova-rilevazione-e-nuova-pratica"
  },
  {
    "label": "Come creo una nuova pratica?",
    "description": "Cap. 4.2 — creazione di una nuova pratica da parte dell’Istruttore tecnico o dell’Amministratore.",
    "targetChapterId": "cap-4-nuova-rilevazione-e-nuova-pratica"
  },
  {
    "label": "Come completo un’istruttoria tecnica?",
    "description": "Cap. 5 — controllo sezioni, Salva, Anteprima, trasmissione.",
    "targetChapterId": "cap-5-istruttoria-tecnica-dell-it"
  },
  {
    "label": "Come richiedo un’integrazione?",
    "description": "Cap. 6-9 e 12 — usare Gestisci istruttoria dal ruolo che dispone del rimando.",
    "targetChapterId": "cap-6-verifica-del-capo-settore"
  },
  {
    "label": "Come rispondo a una richiesta di integrazione?",
    "description": "Cap. 9 — presa in carico, correzione, salvataggio e risalita.",
    "targetChapterId": "cap-9-integrazioni-tecniche"
  },
  {
    "label": "Come preparo una Nota spese?",
    "description": "Cap. 18 — selezione casistica, Browser prezzario, quantità e Salva.",
    "targetChapterId": "cap-18-nota-spese"
  },
  {
    "label": "Come creo un nuovo prezzo?",
    "description": "Cap. 19.2 — Analisi prezzi, elementare o analizzato.",
    "targetChapterId": "cap-19-prezzari-e-nuovi-prezzi"
  },
  {
    "label": "Come genero la determinazione?",
    "description": "Cap. 13 — esito dell’Istruttore amministrativo, Word, PDF, verifica del Responsabile dell’istruttoria amministrativa, protocollo e versione definitiva.",
    "targetChapterId": "cap-13-determinazione"
  },
  {
    "label": "Come sostituisco un PDF della determinazione?",
    "description": "Cap. 13.4 — sostituzione della copia ufficiale entro i limiti del workflow.",
    "targetChapterId": "cap-13-determinazione"
  },
  {
    "label": "Come preparo l’Atto di accertamento?",
    "description": "Cap. 14 — prerequisiti, bozza, verifica del Responsabile dell’istruttoria amministrativa, versione pulita, firma e protocollo.",
    "targetChapterId": "cap-14-atto-di-accertamento"
  },
  {
    "label": "Come carico gli avvisi pagoPA?",
    "description": "Cap. 15.3 — caricamento batch e controlli automatici.",
    "targetChapterId": "cap-15-modalita-di-pagamento-e-avvisi-pagopa"
  },
  {
    "label": "Come sostituisco gli avvisi pagoPA?",
    "description": "Cap. 15.4 — sostituzione, controllo e Salva.",
    "targetChapterId": "cap-15-modalita-di-pagamento-e-avvisi-pagopa"
  },
  {
    "label": "Come registro una notifica?",
    "description": "Cap. 16.1 — esito, prova protocollata e Salva.",
    "targetChapterId": "cap-16-protocollo-notifica-e-pagamento"
  },
  {
    "label": "Come registro un pagamento?",
    "description": "Cap. 16.2 e 17.4 — stato pagamento e successivo Incasso/Definizione.",
    "targetChapterId": "cap-16-protocollo-notifica-e-pagamento"
  },
  {
    "label": "Come registro un ricorso?",
    "description": "Cap. 17.1 — dati del ricorso/riesame post-notifica.",
    "targetChapterId": "cap-17-ricorso-cda-riapertura-e-definizione"
  },
  {
    "label": "Come registro l’esito del CdA?",
    "description": "Cap. 17.2 — decisione, importo/scadenza rideterminati e note.",
    "targetChapterId": "cap-17-ricorso-cda-riapertura-e-definizione"
  },
  {
    "label": "Come riapro una pratica?",
    "description": "Cap. 17.3 — riapertura da parte del Responsabile dell’istruttoria amministrativa e nuova assegnazione all’Istruttore amministrativo.",
    "targetChapterId": "cap-17-ricorso-cda-riapertura-e-definizione"
  },
  {
    "label": "Come definisco una pratica?",
    "description": "Cap. 17.4 — Incasso e causa di definizione.",
    "targetChapterId": "cap-17-ricorso-cda-riapertura-e-definizione"
  },
  {
    "label": "Come cerco una pratica sulla mappa?",
    "description": "Cap. 20.3 — ricerca Infrazioni con almeno un criterio.",
    "targetChapterId": "cap-20-mappa"
  },
  {
    "label": "Come esportare un report?",
    "description": "Cap. 21.2 — filtri Report ed Esporta CSV.",
    "targetChapterId": "cap-21-dashboard-e-report"
  },
  {
    "label": "Come aggiungo un firmatario?",
    "description": "Cap. 22.1 — Rubrica → Firmatari.",
    "targetChapterId": "cap-22-rubrica-e-regolamento-irriguo"
  },
  {
    "label": "Come creo o modifico un utente?",
    "description": "Cap. 23 — account AGOL esistente, assegnazione e sincronizzazione.",
    "targetChapterId": "cap-23-gestione-utenti"
  },
  {
    "label": "Come ricostruisco chi ha modificato una pratica?",
    "description": "Cap. 24.3 — Iter, cicli, campi e allegati modificati.",
    "targetChapterId": "cap-24-allegati-fascicolo-e-iter"
  }
] as GuideQuickLink[]
