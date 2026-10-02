export type GuideRole = '*' | 'TR' | 'IT' | 'CS' | 'RIT' | 'DT' | 'IA' | 'RIA' | 'DA' | 'ADMIN'

export type GuideBlock =
  | { type: 'heading2' | 'heading3'; id: string; text: string }
  | { type: 'lead' | 'paragraph' | 'bullet' | 'figure'; text: string }
  | { type: 'step'; number: number | null; text: string }
  | { type: 'callout'; title: string; text: string }
  | { type: 'table'; headers: string[]; rows: string[][] }

export interface GuideChapter { id: string; order: number; title: string; roles: GuideRole[]; blocks: GuideBlock[] }
export interface GuideQuickLink { label: string; description: string; targetChapterId: string }

export const GUIDE_VERSION = '2 ottobre 2026'

export const GUIDE_CHAPTERS: GuideChapter[] = [
  {
    "id": "come-usare-questo-manuale",
    "order": 0,
    "title": "Come usare questa guida",
    "roles": [
      "*"
    ],
    "blocks": [
      {
        "type": "lead",
        "text": "Questa guida descrive l’utilizzo del Gestionale Infrazioni Irrigue (GII) e accompagna l’utente nelle attività previste per il proprio ruolo, dalla presa in carico della pratica fino alla conclusione del procedimento."
      },
      {
        "type": "paragraph",
        "text": "Per ciascuna fase sono indicate le informazioni disponibili, le operazioni che possono essere eseguite, i controlli da effettuare e gli effetti delle azioni sul successivo iter della pratica."
      },
      {
        "type": "paragraph",
        "text": "Le istruzioni operative contrassegnate dalla freccia possono essere aperte per visualizzare i passaggi di dettaglio e, quando utile, una schermata di riferimento."
      }
    ]
  },
  {
    "id": "cap-1-accesso-ruoli-e-visibilita",
    "order": 1,
    "title": "1. Ruoli e accessibilità",
    "roles": [
      "*"
    ],
    "blocks": [
      {
        "type": "lead",
        "text": "Nel gestionale le attività disponibili e le pratiche visualizzate dipendono dal ruolo assegnato all’utente."
      },
      {
        "type": "heading2",
        "id": "cap-1-accesso-ruoli-e-visibilita-1-1-i-ruoli-del-procedimento",
        "text": "1.1 I ruoli del procedimento"
      },
      {
        "type": "table",
        "headers": [
          "Ruolo",
          "Attività principali"
        ],
        "rows": [
          [
            "Tecnico rilevatore",
            "Effettua la rilevazione sul territorio tramite l’applicazione Esri Survey123, utilizzando il rilevamento Infrazioni predisposto per smartphone e tablet. La rilevazione confluisce quindi nel gestionale e viene successivamente gestita dal Capo Settore."
          ],
          [
            "Istruttore tecnico",
            "Lavora le pratiche assegnate, può creare una nuova pratica, svolge l’istruttoria tecnica e risponde alle eventuali richieste di integrazione, ma non ne apre di nuove."
          ],
          [
            "Capo Settore",
            "Assegna le rilevazioni provenienti dal Tecnico rilevatore, verifica le istruttorie del settore di competenza, può richiedere integrazioni e, nei casi previsti, respingere la pratica."
          ],
          [
            "Responsabile dell’istruttoria tecnica",
            "Valida l’istruttoria tecnica, può richiedere integrazioni e, quando previsto, interviene su Occorrenza e Grado di gravità."
          ],
          [
            "Direttore Aree Agraria e Tecnica",
            "Approva la fase tecnica e può richiedere integrazioni o respingere la pratica nei casi previsti."
          ],
          [
            "Istruttore amministrativo",
            "Svolge l’istruttoria amministrativa sulle pratiche assegnate, può richiedere integrazioni, predispone la documentazione e cura gli adempimenti amministrativi successivi fino alla definizione della pratica."
          ],
          [
            "Responsabile dell’istruttoria amministrativa",
            "Assegna le pratiche all’Istruttore amministrativo, verifica e valida l’istruttoria amministrativa, può richiedere integrazioni e verifica l’Atto di accertamento prima dei successivi adempimenti."
          ],
          [
            "Direttore Area AA.GG. e P.F.",
            "Definisce il procedimento amministrativo mediante l’adozione del provvedimento dirigenziale, sottoscrive la notifica dell’Atto di accertamento e può richiedere integrazioni nei passaggi previsti."
          ],
          [
            "Amministratore del sistema",
            "Dispone della visualizzazione completa e delle funzioni di amministrazione."
          ]
        ]
      },
      {
        "type": "heading2",
        "id": "cap-1-accesso-ruoli-e-visibilita-1-2-utenti-con-piu-ruoli",
        "text": "1.2 Utenti con più ruoli"
      },
      {
        "type": "paragraph",
        "text": "Se a uno stesso utente sono assegnati più ruoli, le funzioni disponibili e le pratiche visibili comprendono quelle previste per ciascun ruolo."
      },
      {
        "type": "heading2",
        "id": "cap-1-accesso-ruoli-e-visibilita-1-3-pratiche-visibili-per-ruolo",
        "text": "1.3 Pratiche visibili per ruolo"
      },
      {
        "type": "table",
        "headers": [
          "Ruolo",
          "Pratiche visibili"
        ],
        "rows": [
          [
            "Istruttore tecnico",
            "Le pratiche a lui assegnate o da lui create nell’Area Agraria o nell’Area Tecnica di competenza."
          ],
          [
            "Capo Settore",
            "Le pratiche del settore di competenza."
          ],
          [
            "Responsabile dell’istruttoria tecnica",
            "Le pratiche dell’Area Agraria o dell’Area Tecnica di competenza."
          ],
          [
            "Direttore Aree Agraria e Tecnica",
            "Le pratiche dell’Area Agraria o dell’Area Tecnica di competenza."
          ],
          [
            "Istruttore amministrativo",
            "Le pratiche della fase amministrativa a lui assegnate."
          ],
          [
            "Responsabile dell’istruttoria amministrativa",
            "Le pratiche della fase amministrativa."
          ],
          [
            "Direttore Area AA.GG. e P.F.",
            "Le pratiche della fase amministrativa."
          ],
          [
            "Amministratore del sistema",
            "Tutte le pratiche."
          ]
        ]
      },
      {
        "type": "heading2",
        "id": "cap-1-accesso-ruoli-e-visibilita-1-4-viste-disponibili-per-ruolo",
        "text": "1.4 Viste disponibili per ruolo"
      },
      {
        "type": "paragraph",
        "text": "La Home mostra a ciascun utente le viste disponibili in base al ruolo assegnato. L’Amministratore del sistema ha accesso a tutte le viste e non viene pertanto ripetuto nella tabella, salvo per Gestione utenti, che costituisce una sua specifica prerogativa."
      },
      {
        "type": "table",
        "headers": [
          "Vista",
          "Ruoli che possono accedere"
        ],
        "rows": [
          [
            "Elenco pratiche",
            "Tutti i ruoli"
          ],
          [
            "Nuova pratica",
            "Istruttore tecnico"
          ],
          [
            "Mappa",
            "Tutti i ruoli"
          ],
          [
            "Gestione prezzari",
            "Responsabile dell’istruttoria tecnica"
          ],
          [
            "Parametri sanzionatori",
            "Responsabile dell’istruttoria amministrativa"
          ],
          [
            "Rubrica",
            "Responsabile dell’istruttoria amministrativa"
          ],
          [
            "Dashboard",
            "Tutti i ruoli"
          ],
          [
            "Report",
            "Tutti i ruoli"
          ],
          [
            "Regolamento irriguo",
            "Tutti i ruoli"
          ],
          [
            "Guida operativa",
            "Tutti i ruoli"
          ],
          [
            "Gestione utenti",
            "Amministratore del sistema"
          ],
          [
            "Atto di accertamento",
            "Istruttore amministrativo"
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
        "text": "Per orientarsi tra le diverse viste disponibili per il proprio ruolo, utilizzare le card presenti nella Home e il navigatore laterale disponibile nelle altre viste.\n\nPer individuare rapidamente le attività da svolgere, utilizzare l’Elenco pratiche. L’elenco separa le pratiche che richiedono un intervento dell’utente da quelle che si trovano in lavorazione presso altri ruoli."
      },
      {
        "type": "heading2",
        "id": "cap-2-orientarsi-home-elenco-pratiche-dettaglio-e-allarmi-2-1-home",
        "text": "2.1 Home"
      },
      {
        "type": "paragraph",
        "text": "La Home mostra le viste disponibili per il proprio ruolo. Selezionando una card si accede direttamente alla relativa vista del gestionale."
      },
      {
        "type": "figure",
        "text": "Figura – Home del gestionale e viste disponibili per ruolo"
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
            "Solo le pratiche che richiedono un intervento dell’utente.",
            "È la vista di lavoro quotidiana."
          ],
          [
            "In attesa di altri",
            "Pratiche visibili all’utente ma attualmente in carico o in attesa di un altro ruolo.",
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
        "text": "Lo stato sintetico del ruolo è normalizzato in etichette operative: Da prendere in carico, In carico, Rimandato, Trasmesso, Istruttoria assegnata e Respinto; per l’Amministratore del sistema può inoltre comparire Archiviata. Non va confuso con il singolo evento registrato nell’Iter."
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
        "text": "Selezionare una pratica per visualizzarne i dettagli e le azioni disponibili."
      },
      {
        "type": "callout",
        "title": "Amministratore del sistema",
        "text": "L’Amministratore del sistema dispone della visualizzazione completa delle pratiche e può quindi supportare le attività di controllo e assistenza."
      },
      {
        "type": "heading2",
        "id": "cap-2-orientarsi-home-elenco-pratiche-dettaglio-e-allarmi-2-3-dettaglio-pratica-consultare-senza-lavorare",
        "text": "2.3 Dettaglio pratica: consultare senza modificare"
      },
      {
        "type": "paragraph",
        "text": "Il Dettaglio pratica consente di consultare le informazioni della pratica selezionata attraverso le relative schede. I dati sono presentati in sola consultazione; le eventuali modifiche si effettuano nelle viste operative previste per il proprio ruolo e per la fase corrente della pratica."
      },
      {
        "type": "step",
        "number": 1,
        "text": "Consultare i dati del trasgressore."
      },
      {
        "type": "step",
        "number": 2,
        "text": "Consultare le violazioni contestate."
      },
      {
        "type": "step",
        "number": 3,
        "text": "Consultare i luoghi e i dati della rilevazione."
      },
      {
        "type": "step",
        "number": 4,
        "text": "Visualizzare la pratica sulla mappa."
      },
      {
        "type": "step",
        "number": 5,
        "text": "Consultare la Nota spese."
      },
      {
        "type": "step",
        "number": 6,
        "text": "Consultare e aprire gli allegati."
      },
      {
        "type": "step",
        "number": 7,
        "text": "Ricostruire l’iter della pratica."
      },
      {
        "type": "heading2",
        "id": "cap-2-orientarsi-home-elenco-pratiche-dettaglio-e-allarmi-2-4-allarmi-e-scadenze",
        "text": "2.4 Allarmi e scadenze"
      },
      {
        "type": "paragraph",
        "text": "La campanella nell’intestazione compare quando sono presenti allarmi. Il pannello “Allarmi e scadenze” mostra la pratica, il tipo di evento, il mittente, il ruolo, la data e, per le scadenze, il termine rilevante."
      },
      {
        "type": "heading3",
        "id": "cap-2-orientarsi-home-elenco-pratiche-dettaglio-e-allarmi-gestire-un-allarme-di-workflow",
        "text": "Gestire un allarme dell’iter"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Aprire la pratica interessata dall’allarme o dalla scadenza."
      },
      {
        "type": "step",
        "number": 2,
        "text": "Archiviare un allarme quando il comando è disponibile."
      },
      {
        "type": "callout",
        "title": "Attenzione",
        "text": "Gli allarmi dell’iter che richiedono la presa in carico non vanno trattati come semplici promemoria: la loro chiusura deriva dall’azione operativa sulla pratica."
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
        "text": "La pratica passa progressivamente da un ruolo al successivo secondo l’iter previsto. Se, durante una verifica, è necessario correggere o integrare dati o documenti, la pratica viene rinviata al ruolo competente. Completata l’integrazione, la pratica viene nuovamente trasmessa attraverso i passaggi previsti fino al ruolo che l’ha richiesta; da quel momento prosegue il normale iter."
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
            "Tecnico rilevatore tramite Survey123 → Capo Settore, oppure l’Istruttore tecnico crea direttamente la pratica nel gestionale",
            "Rilevazione disponibile nel gestionale."
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
            "Responsabile dell’istruttoria tecnica → Direttore Aree Agraria e Tecnica",
            "Istruttoria validata."
          ],
          [
            "Approvazione",
            "Direttore Aree Agraria e Tecnica → Responsabile dell’istruttoria amministrativa",
            "Istruttoria approvata; ingresso nella fase amministrativa."
          ],
          [
            "Assegnazione amministrativa",
            "Responsabile dell’istruttoria amministrativa → Istruttore amministrativo",
            "Istruttoria assegnata."
          ],
          [
            "Istruttoria amministrativa",
            "L’Istruttore amministrativo esprime l’esito; in caso di conformità il gestionale genera la Proposta di contestazione, l’Istruttore amministrativo predispone la bozza di determinazione e trasmette il fascicolo → Responsabile dell’istruttoria amministrativa",
            "Fascicolo trasmesso per verifica."
          ],
          [
            "Validazione amministrativa",
            "Responsabile dell’istruttoria amministrativa → Istruttore amministrativo",
            "Istruttoria validata; l’Istruttore amministrativo prosegue gli adempimenti documentali."
          ],
          [
            "Atto di accertamento",
            "L’Istruttore amministrativo prepara → il Responsabile dell’istruttoria amministrativa verifica → l’Istruttore amministrativo completa firma e protocollo",
            "Atto approvato, firmato e protocollato."
          ],
          [
            "Post-notifica",
            "L’Istruttore amministrativo registra gli eventi successivi alla notifica, compresi pagamento, ricorso, eventuale esito del CdA e definizione della pratica; l’eventuale riapertura segue la procedura descritta nel capitolo 17",
            "Pratica definita secondo l’esito effettivo."
          ]
        ]
      },
      {
        "type": "callout",
        "title": "Regola delle integrazioni",
        "text": "Tutti i ruoli che intervengono nelle fasi di verifica, validazione, approvazione o istruttoria amministrativa possono richiedere integrazioni nei passaggi di propria competenza. L’Istruttore tecnico esegue l’istruttoria e risponde alle richieste ricevute, ma non apre a sua volta richieste di integrazione. Se la richiesta proviene da un ruolo successivo, dopo la correzione l’esito viene trasmesso attraverso i ruoli previsti fino a raggiungere chi ha richiesto l’integrazione. Nei passaggi intermedi viene registrato “Esito integrazione trasmesso”. Quando la risposta arriva al richiedente, quest’ultimo riprende la propria verifica, validazione o approvazione."
      },
      {
        "type": "figure",
        "text": "Figura – Schema generale dell’iter tecnico-amministrativo"
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
        "text": "Una rilevazione effettuata dal Tecnico rilevatore tramite Survey123 entra nel gestionale e viene indirizzata al Capo Settore. Il Capo Settore riceve l’allarme “Nuova rilevazione ricevuta”. In questo caso la pratica non è ancora assegnata a un Istruttore tecnico."
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
        "text": "La funzione Nuova pratica è utilizzata dall’Istruttore tecnico. Quando crea la pratica, viene associato direttamente come istruttore e la pratica nasce già in carico: non è necessaria una successiva presa in carico."
      },
      {
        "type": "paragraph",
        "text": "Se l’Istruttore tecnico opera in più ambiti, prima di iniziare la compilazione deve selezionare quello relativo alla nuova pratica."
      },
      {
        "type": "heading3",
        "id": "cap-4-nuova-rilevazione-e-nuova-pratica-it-creare-una-nuova-pratica",
        "text": "Istruttore tecnico — creare una nuova pratica"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Aprire Nuova pratica dalla Home o dal navigatore laterale."
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
        "text": "L’Istruttore tecnico è il principale ruolo di compilazione della fase tecnica. Può lavorare una pratica quando è assegnata a lui ed è in carico. Se riceve una richiesta di integrazione, può apportare le correzioni richieste dopo una nuova presa in carico, ma non può aprire a sua volta una richiesta di integrazione."
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
      },
      {
        "type": "heading2",
        "id": "cap-5-istruttoria-tecnica-dell-it-5-3-archiviare-una-pratica-creata-per-errore",
        "text": "5.3 Archiviare una pratica creata per errore"
      },
      {
        "type": "paragraph",
        "text": "L’Istruttore tecnico può utilizzare l’azione Elimina esclusivamente per una pratica creata direttamente dallo stesso Istruttore tecnico e mai inoltrata ai livelli successivi dell’istruttoria."
      },
      {
        "type": "step",
        "number": 1,
        "text": "Aprire la pratica interessata e verificare che sia ancora nella fase iniziale di competenza dell’Istruttore tecnico."
      },
      {
        "type": "step",
        "number": 2,
        "text": "Aprire le Azioni e scegliere Elimina."
      },
      {
        "type": "step",
        "number": 3,
        "text": "Inserire la nota obbligatoria che motiva l’archiviazione e confermare."
      },
      {
        "type": "callout",
        "title": "Effetto dell’azione",
        "text": "L’azione Elimina archivia la pratica, registra nell’Iter l’evento “Archiviazione” e la rimuove dagli elenchi ordinari. La pratica resta consultabile dall’Amministratore del sistema."
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
        "text": "Quando ricorrono i casi previsti, il Capo Settore può anche respingere la pratica."
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
        "text": "Se necessario aprire la lavorazione tecnica, modificare soltanto Occorrenza e Grado di gravità e premere Salva."
      },
      {
        "type": "step",
        "number": 4,
        "text": "Aprire Gestisci istruttoria."
      },
      {
        "type": "step",
        "number": 5,
        "text": "Se l’istruttoria è corretta, scegliere Conforme e confermare la trasmissione al Direttore Aree Agraria e Tecnica."
      },
      {
        "type": "step",
        "number": 6,
        "text": "Se servono integrazioni, rimandare la pratica all’Istruttore tecnico con motivazione. Il Responsabile dell’istruttoria tecnica non dispone di un respingimento finale analogo a quello del Direttore Aree Agraria e Tecnica."
      },
      {
        "type": "callout",
        "title": "Cosa accade dopo",
        "text": "Con esito positivo viene registrato “Istruttoria validata” e il Direttore Aree Agraria e Tecnica riceve la pratica."
      }
    ]
  },
  {
    "id": "cap-8-approvazione-del-direttore-d-area",
    "order": 8,
    "title": "8. Approvazione del Direttore Aree Agraria e Tecnica",
    "roles": [
      "DT",
      "ADMIN"
    ],
    "blocks": [
      {
        "type": "lead",
        "text": "Il Direttore Aree Agraria e Tecnica conclude la fase di approvazione tecnica. Non modifica i dati dell’istruttoria tecnica: consulta la pratica, la approva, richiede un’integrazione oppure la respinge nei casi previsti."
      },
      {
        "type": "heading3",
        "id": "cap-8-approvazione-del-direttore-d-area-dt-approvare-integrare-o-respingere",
        "text": "Direttore Aree Agraria e Tecnica — approvare, integrare o respingere"
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
        "text": "Per una richiesta di integrazione selezionare l’esito negativo/da integrare e indicare gli aspetti da correggere. Se la richiesta riguarda esclusivamente Occorrenza e/o Grado di gravità, la pratica viene trasmessa al Responsabile dell’istruttoria tecnica; negli altri casi tecnici viene trasmessa all’Istruttore tecnico."
      },
      {
        "type": "step",
        "number": 6,
        "text": "Quando ricorrono i presupposti dell’iter, il Direttore Aree Agraria e Tecnica può respingere l’istruttoria tecnica. Il respingimento chiude il normale avanzamento verso la fase amministrativa."
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
        "text": "Una richiesta di integrazione può far tornare la pratica a un ruolo precedente per le correzioni necessarie. Dopo la correzione, l’esito viene trasmesso attraverso i ruoli previsti fino a raggiungere chi ha richiesto l’integrazione. I ruoli che ricevono l’esito prima del richiedente lo trasmettono al passaggio successivo; la normale verifica, validazione o approvazione riprende quando la pratica torna al richiedente."
      },
      {
        "type": "table",
        "headers": [
          "Richiedente",
          "Destinazione iniziale",
          "Percorso dell’esito dopo la correzione",
          "Quando riprende il normale iter"
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
            "Direttore Aree Agraria e Tecnica",
            "Istruttore tecnico oppure Responsabile dell’istruttoria tecnica se solo Occorrenza/Grado",
            "Se Istruttore tecnico: Istruttore tecnico → Capo Settore → Responsabile dell’istruttoria tecnica → Direttore Aree Agraria e Tecnica. Se Responsabile dell’istruttoria tecnica: Responsabile dell’istruttoria tecnica → Direttore Aree Agraria e Tecnica.",
            "Al Direttore Aree Agraria e Tecnica richiedente."
          ],
          [
            "Responsabile dell’istruttoria amministrativa — integrazione tecnica",
            "Responsabile dell’istruttoria tecnica",
            "Responsabile dell’istruttoria tecnica → Direttore Aree Agraria e Tecnica → Responsabile dell’istruttoria amministrativa",
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
        "text": "Tornare a Gestisci istruttoria e trasmettere l’esito. Se la richiesta era stata formulata da un ruolo successivo, nei passaggi che precedono il ritorno al richiedente viene registrato l’evento “Esito integrazione trasmesso”."
      },
      {
        "type": "step",
        "number": 6,
        "text": "Controllare che la pratica sia passata al ruolo successivo previsto."
      },
      {
        "type": "callout",
        "title": "Cosa accade dopo",
        "text": "Il ruolo successivo riceve “Esito integrazione ricevuto”. Quando l’esito raggiunge chi aveva richiesto l’integrazione, quel ruolo riprende la propria verifica, validazione o approvazione."
      },
      {
        "type": "callout",
        "title": "Attenzione",
        "text": "Un Istruttore tecnico che risponde a un’integrazione richiesta dal Responsabile dell’istruttoria tecnica non salta il Capo Settore: ritrasmette comunque al Capo Settore. Analogamente, un’integrazione tecnica chiesta dal Responsabile dell’istruttoria amministrativa passa dal Responsabile dell’istruttoria tecnica al Direttore Aree Agraria e Tecnica prima di tornare al Responsabile dell’istruttoria amministrativa."
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
        "text": "Dopo l’approvazione del Direttore Aree Agraria e Tecnica, la pratica entra nella fase amministrativa. Il Responsabile dell’istruttoria amministrativa la prende in carico e la assegna a un Istruttore amministrativo."
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
        "text": "Il sistema registra “Istruttoria assegnata”, imposta l’Istruttore amministrativo destinatario e rende la pratica da prendere in carico per quell’Istruttore amministrativo. Il Responsabile dell’istruttoria amministrativa non modifica direttamente i dati amministrativi nella scheda dell’Istruttore amministrativo: usa le azioni dell’iter per assegnare, validare o rimandare."
      },
      {
        "type": "heading2",
        "id": "cap-10-ingresso-nella-fase-amministrativa-e-assegnazione-10-1-riassegnazione-e-riapertura",
        "text": "10.1 Riassegnazione e riapertura"
      },
      {
        "type": "paragraph",
        "text": "La normale assegnazione iniziale è distinta dall’avvio di una nuova istruttoria amministrativa dopo una riapertura. In quest’ultimo caso il Responsabile dell’istruttoria amministrativa seleziona l’Istruttore amministrativo che svolgerà la nuova istruttoria. Restano disponibili lo storico del ricorso, l’esito del CdA e i dati della riapertura."
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
        "text": "L’Istruttore amministrativo lavora esclusivamente le pratiche a lui assegnate e può modificare i dati amministrativi nelle sezioni e nelle fasi abilitate quando la pratica è effettivamente In carico. Le sezioni Trasgressore, Contestazioni e Dati generali mantengono invece funzione consultiva per i dati in esse riepilogati. Dopo una trasmissione al Responsabile dell’istruttoria amministrativa la scheda diventa in sola lettura; se la pratica viene rimandata, occorre una nuova presa in carico prima di poterla modificare."
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
            "Consultazione in sola lettura degli importi calcolati, degli estremi e valori sanzionatori e delle informazioni di base del procedimento."
          ],
          [
            "Iter approvativo",
            "Esito dell’Istruttore amministrativo, rimandi/rientri, Proposta di contestazione, bozza di determinazione e attività di verifica con il Responsabile dell’istruttoria amministrativa."
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
            "Ordine e motivazione della riapertura; compilazione riservata al Responsabile dell’istruttoria amministrativa."
          ],
          [
            "Definizione",
            "Incasso e modalità finale di definizione della pratica."
          ],
          [
            "Dati generali",
            "Riferimenti generali della pratica e dell’iter."
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
        "text": "Controllare Trasgressore, Contestazioni, allegati e Iter e completare i soli dati resi modificabili nella fase corrente."
      },
      {
        "type": "step",
        "number": 3,
        "text": "Aprire Gestisci istruttoria nella sezione Iter approvativo."
      },
      {
        "type": "step",
        "number": 4,
        "text": "Scegliere Conforme se il fascicolo può proseguire alla predisposizione degli elaborati amministrativi; scegliere Non conforme se occorre un’integrazione tramite Responsabile dell’istruttoria amministrativa."
      },
      {
        "type": "step",
        "number": 5,
        "text": "In caso di Non conforme, compilare la motivazione richiesta e confermare il rimando al Responsabile dell’istruttoria amministrativa."
      },
      {
        "type": "step",
        "number": 6,
        "text": "In caso di Conforme, confermare: il sistema registra l’esito dell’Istruttore amministrativo, genera o aggiorna automaticamente la Proposta di contestazione e apre la fase di predisposizione della bozza di determinazione, senza spostare immediatamente la pratica al Responsabile dell’istruttoria amministrativa."
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
        "text": "Il Responsabile dell’istruttoria amministrativa riceve il fascicolo predisposto dall’Istruttore amministrativo e decide se validarlo o chiedere correzioni. Se le correzioni riguardano aspetti amministrativi, la pratica torna all’Istruttore amministrativo. Se riguardano aspetti tecnici, viene trasmessa al Responsabile dell’istruttoria tecnica; completati i passaggi tecnici necessari, torna al Responsabile dell’istruttoria amministrativa, che riprende la propria verifica."
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
        "text": "Con esito positivo viene registrata “Istruttoria validata” e l’Istruttore amministrativo riceve “Fascicolo ricevuto”. Con esito negativo la pratica viene trasmessa al ruolo competente per le correzioni richieste."
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
        "text": "Se l’Istruttore amministrativo ha dichiarato Non conforme, il fascicolo viene trasmesso al Responsabile dell’istruttoria amministrativa. Il Responsabile dell’istruttoria amministrativa esamina la richiesta e trasmette l’esito all’Istruttore amministrativo. L’Istruttore amministrativo riceve l’esito, prende nuovamente in carico la pratica, effettua le correzioni e ripete la propria valutazione. L’assegnazione all’Istruttore amministrativo resta invariata."
      },
      {
        "type": "heading2",
        "id": "cap-12-verifica-ria-e-cicli-di-integrazione-amministrativa-tecnica-12-2-integrazione-tecnica-chiesta-dal-ria",
        "text": "12.2 Integrazione tecnica chiesta dal Responsabile dell’istruttoria amministrativa"
      },
      {
        "type": "paragraph",
        "text": "Quando il Responsabile dell’istruttoria amministrativa segnala un problema tecnico, la pratica viene trasmessa al Responsabile dell’istruttoria tecnica. Se la correzione può essere effettuata direttamente dal Responsabile dell’istruttoria tecnica, questo completa l’integrazione; negli altri casi la pratica segue i passaggi tecnici necessari. Dopo la correzione, l’esito passa dal Responsabile dell’istruttoria tecnica al Direttore Aree Agraria e Tecnica e quindi torna al Responsabile dell’istruttoria amministrativa, che riprende la propria verifica. L’esito non viene inoltrato automaticamente all’Istruttore amministrativo."
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
        "text": "La determinazione viene predisposta in più passaggi. Il gestionale genera i documenti, verifica le versioni caricate e registra gli estremi; alcune operazioni — conversione Word/PDF, protocollazione e firma — avvengono fuori dal gestionale e i relativi documenti vengono poi acquisiti nel sistema."
      },
      {
        "type": "heading2",
        "id": "cap-13-determinazione-13-1-dall-esito-ia-alla-trasmissione-al-ria",
        "text": "13.1 Dall’esito dell’Istruttore amministrativo alla trasmissione al Responsabile dell’istruttoria amministrativa"
      },
      {
        "type": "heading3",
        "id": "cap-13-determinazione-ia-preparare-la-proposta-di-contestazione",
        "text": "Istruttore amministrativo — predisporre la bozza di determinazione e trasmettere il fascicolo"
      },
      {
        "type": "paragraph",
        "text": "Con l’esito Conforme il gestionale genera o aggiorna automaticamente la Proposta di contestazione e la inserisce nel fascicolo in stato di bozza. L’Istruttore amministrativo non deve predisporre manualmente questo documento: deve invece elaborare la bozza di determinazione."
      },
      {
        "type": "step",
        "number": 1,
        "text": "Dopo aver espresso esito Conforme, verificare che la Proposta di contestazione sia stata generata o aggiornata e che la determinazione sia in fase di bozza."
      },
      {
        "type": "step",
        "number": 2,
        "text": "Usare Genera bozza per creare il documento Word della determinazione; se i dati cambiano e il sistema segnala che la bozza è da rigenerare, usare Rigenera bozza."
      },
      {
        "type": "step",
        "number": 3,
        "text": "Aprire il Word esternamente, completare o modificare il testo dove previsto e convertirlo in PDF fuori dal gestionale."
      },
      {
        "type": "step",
        "number": 4,
        "text": "Caricare il PDF della bozza di determinazione, ottenuto dopo la conversione del documento Word predisposto dal gestionale. Il PDF può essere caricato soltanto dopo aver generato il Word."
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
        "text": "La pratica diventa in sola lettura per l’Istruttore amministrativo e il Responsabile dell’istruttoria amministrativa riceve “Nuovo fascicolo ricevuto”. L’evento registrato nell’Iter è “Fascicolo trasmesso per verifica”."
      },
      {
        "type": "heading2",
        "id": "cap-13-determinazione-13-2-validazione-ria-e-ritorno-all-ia",
        "text": "13.2 Validazione del Responsabile dell’istruttoria amministrativa e ritorno all’Istruttore amministrativo"
      },
      {
        "type": "paragraph",
        "text": "Se il Responsabile dell’istruttoria amministrativa valida il fascicolo, la pratica torna all’Istruttore amministrativo e la Proposta di contestazione viene rigenerata in versione approvata, senza la filigrana di bozza. Se il Responsabile dell’istruttoria amministrativa rimanda il fascicolo, l’Istruttore amministrativo dovrà riprenderlo in carico, correggere i dati, esprimere nuovamente l’esito e rigenerare la documentazione necessaria."
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
        "text": "Dopo la validazione del Responsabile dell’istruttoria amministrativa usare Trasmetti fascicolo al protocollo. Il gestionale prepara il messaggio e memorizza la composizione esatta del fascicolo trasmesso."
      },
      {
        "type": "step",
        "number": 2,
        "text": "Eseguire la protocollazione tramite il sistema esterno previsto dall’Ente."
      },
      {
        "type": "step",
        "number": 3,
        "text": "Al ritorno, selezionare insieme tutti i PDF protocollati richiesti dal gestionale."
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
        "text": "Non caricare i documenti uno alla volta quando la procedura richiede il rientro completo del fascicolo: devono essere caricati insieme tutti i documenti richiesti."
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
        "text": "La determinazione viene quindi adottata secondo il procedimento previsto e costituisce la base per l’Atto di accertamento."
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
        "text": "Il sistema verifica l’integrità del contenuto, la presenza di una firma digitale e che l’identità del firmatario sia presente nella Rubrica dei firmatari. L’Amministratore del sistema può superare il solo disallineamento di identità, non l’assenza della firma o l’integrità del documento."
      },
      {
        "type": "step",
        "number": 6,
        "text": "Usare Trasmetti l’Atto firmato al protocollo."
      },
      {
        "type": "step",
        "number": 7,
        "text": "Al ritorno dal protocollo caricare insieme i PDF richiesti. Il gestionale controlla che siano presenti i documenti richiesti, gli estremi di protocollo e la firma dell’Atto."
      },
      {
        "type": "step",
        "number": 8,
        "text": "Salvare gli estremi acquisiti. Solo dopo il completamento del protocollo dell’Atto si attivano le operazioni definitive di notifica."
      },
      {
        "type": "callout",
        "title": "Attenzione",
        "text": "La firma e la protocollazione avvengono fuori dal gestionale. Una volta completate, le versioni firmate e protocollate vengono acquisite nel sistema."
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
        "text": "La preparazione del pagamento è legata al totale dovuto e allo stato dell’Atto. Finché l’Atto non è bloccato dai passaggi successivi, l’Istruttore amministrativo può predisporre il piano e i relativi documenti."
      },
      {
        "type": "heading2",
        "id": "cap-15-modalita-di-pagamento-e-avvisi-pagopa-15-1-modalita-supportate",
        "text": "15.1 Modalità supportate"
      },
      {
        "type": "paragraph",
        "text": "Le modalità disponibili comprendono pagoPA, bonifico, modalità mista e altro. Il dettaglio delle posizioni dipende dalla modalità scelta. Se il totale dovuto è pari a zero, non è richiesto un piano di posizioni di pagamento."
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
        "text": "Il gestionale legge il QR code e ricava importo, codice avviso/IUV ed Ente Creditore; dal PDF ricava la scadenza."
      },
      {
        "type": "step",
        "number": 4,
        "text": "Il sistema verifica che il codice fiscale dell’Ente Creditore sia quello atteso, che i codici siano validi e univoci, che l’unica soluzione corrisponda al totale dovuto e che le rate, se presenti, siano almeno due e sommino al totale con l’eventuale arrotondamento centesimale."
      },
      {
        "type": "step",
        "number": 5,
        "text": "Controllare il piano ricostruito automaticamente."
      },
      {
        "type": "step",
        "number": 6,
        "text": "Salvare la pratica: la sostituzione/caricamento batch è predisposta prima del salvataggio e diventa definitiva con Salva."
      },
      {
        "type": "callout",
        "title": "Cosa accade dopo",
        "text": "Quando tutte le posizioni sono complete, lo stato del pagamento passa a “Generato”; se il piano è incompleto resta da completare."
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
        "type": "paragraph",
        "text": "Le registrazioni nelle sezioni Protocollo e notifica e l’aggiornamento dello stato del pagamento sono svolti dall’Istruttore amministrativo. Il Responsabile dell’istruttoria amministrativa può consultare tali dati, ma non modificarli nella scheda amministrativa."
      },
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
        "text": "Con gli esiti “Notificata” o “Compiuta giacenza” diventano disponibili le successive attività relative a pagamento, ricorso e definizione della pratica. Con “Non notificata” o “Irreperibile” tali attività non sono ancora disponibili. Se viene scelto “Altro”, occorre descrivere l’esito e registrare successivamente un esito conclusivo."
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
        "text": "Gli allarmi di scadenza vengono segnalati con 5 giorni di preavviso."
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
        "type": "paragraph",
        "text": "Nelle sezioni Ricorso, CdA e Definizione la compilazione è svolta dall’Istruttore amministrativo. Il Responsabile dell’istruttoria amministrativa e il Direttore Area AA.GG. e P.F. accedono a tali informazioni in consultazione. La Riapertura segue invece una regola specifica, descritta nel § 17.3."
      },
      {
        "type": "heading2",
        "id": "cap-17-ricorso-cda-riapertura-e-definizione-17-1-ricorso-riesame-post-notifica",
        "text": "17.1 Ricorso / riesame post-notifica"
      },
      {
        "type": "heading3",
        "id": "cap-17-ricorso-cda-riapertura-e-definizione-registrare-un-ricorso",
        "text": "Istruttore amministrativo — registrare un ricorso"
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
        "text": "Istruttore amministrativo — registrare l’esito del CdA"
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
        "text": "Se la decisione del CdA richiede una nuova istruttoria amministrativa, passare alla sezione Riapertura."
      },
      {
        "type": "heading2",
        "id": "cap-17-ricorso-cda-riapertura-e-definizione-17-3-riapertura-amministrativa",
        "text": "17.3 Riapertura amministrativa"
      },
      {
        "type": "paragraph",
        "text": "La Riapertura è consultabile nella fase amministrativa, mentre la compilazione è riservata al Responsabile dell’istruttoria amministrativa. Registra il fatto che una nuova istruttoria amministrativa deve essere avviata su indicazione del Direttore Area AA.GG. e P.F. dopo l’esito del CdA, conservando lo storico precedente."
      },
      {
        "type": "heading3",
        "id": "cap-17-ricorso-cda-riapertura-e-definizione-ria-riaprire-e-avviare-un-nuovo-ciclo-amministrativo",
        "text": "Responsabile dell’istruttoria amministrativa — riaprire e avviare una nuova istruttoria amministrativa"
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
        "text": "Selezionare l’Istruttore amministrativo che svolgerà la nuova istruttoria e confermare."
      },
      {
        "type": "step",
        "number": 5,
        "text": "Verificare che la pratica risulti da prendere in carico per l’Istruttore amministrativo incaricato della nuova istruttoria."
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
        "text": "Istruttore amministrativo — registrare l’incasso e definire la pratica"
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
        "text": "La Nota spese viene utilizzata per le casistiche collegate agli artt. 8, 27, 30 e 39 del Regolamento. Non è un semplice campo importo: viene costruita con voci di prezzario, quantità e regole specifiche per le attrezzature."
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
        "type": "callout",
        "title": "Consultazione del Responsabile dell’istruttoria tecnica",
        "text": "Il Responsabile dell’istruttoria tecnica può consultare la Nota spese durante la propria fase di validazione, ma non può modificarne categorie, voci, quantità o allegati."
      },
      {
        "type": "heading2",
        "id": "cap-18-nota-spese-18-2-categorie-di-costo",
        "text": "18.2 Categorie di costo"
      },
      {
        "type": "table",
        "headers": [
          "Categoria",
          "Significato operativo"
        ],
        "rows": [
          [
            "Attrezzature e trasporti",
            "Costi relativi ad attrezzature, mezzi e trasporti selezionati dal prezzario."
          ],
          [
            "Materiali da costruzione",
            "Materiali impiegati nelle lavorazioni e valorizzati mediante le voci disponibili nel prezzario."
          ],
          [
            "Risorse umane",
            "Costi del personale e della manodopera previsti dalle voci disponibili."
          ],
          [
            "Semilavorati",
            "Prodotti o lavorazioni intermedie utilizzati nella composizione della Nota spese."
          ],
          [
            "Prodotti finiti",
            "Prodotti finiti selezionati dalle voci disponibili nel prezzario."
          ],
          [
            "Attrezzature",
            "Categoria specifica utilizzata nelle casistiche dell’Art. 30 relative all’attrezzatura non recuperabile; nel riepilogo il relativo importo è rappresentato come Risarcimento attrezzatura."
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
        "text": "Attrezzatura recuperabile: i costi di riparazione vengono calcolati per ogni singola attrezzatura; possono essere registrate più attrezzature dello stesso tipo, ciascuna numerata separatamente."
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
        "text": "Selezionare una voce e usare Aggiungi. La stessa voce non può essere aggiunta due volte al carrello."
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
    "title": "19. Prezzari, nuovi prezzi e parametri",
    "roles": [
      "RIT",
      "RIA",
      "ADMIN"
    ],
    "blocks": [
      {
        "type": "lead",
        "text": "La Gestione Prezzari è di competenza del Responsabile dell’istruttoria tecnica. La gestione dei Parametri sanzionatori è invece di competenza del Responsabile dell’istruttoria amministrativa. Il capitolo riunisce le due funzioni perché entrambe concorrono alla determinazione degli importi utilizzati dal procedimento. Le sezioni 19.1-19.3 e 19.5 riguardano la Gestione Prezzari; la sezione 19.4 distingue i parametri gestiti dai diversi ruoli."
      },
      {
        "type": "heading2",
        "id": "cap-19-prezzari-e-nuovi-prezzi-19-1-caricare-un-prezzario-regionale",
        "text": "19.1 Caricare un prezzario regionale"
      },
      {
        "type": "heading3",
        "id": "cap-19-prezzari-e-nuovi-prezzi-rit-admin-importare-un-prezzario",
        "text": "Responsabile dell’istruttoria tecnica — importare un prezzario"
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
        "text": "Responsabile dell’istruttoria tecnica — creare un nuovo prezzo elementare"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Aprire Gestione Prezzari → Analisi prezzi."
      },
      {
        "type": "step",
        "number": 2,
        "text": "Creare un nuovo prezzo e scegliere Tipologia = ELEMENTARE."
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
        "text": "Responsabile dell’istruttoria tecnica — creare un nuovo prezzo analizzato"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Aprire Gestione Prezzari → Analisi prezzi e creare un nuovo prezzo."
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
        "text": "Responsabile dell’istruttoria tecnica — modificare un nuovo prezzo esistente"
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
        "text": "La pagina Parametri mostra le categorie disponibili per il proprio ruolo. Il Responsabile dell’istruttoria tecnica gestisce i Parametri Nota spese e i Prezzi attrezzature; il Responsabile dell’istruttoria amministrativa gestisce Sanzioni, riduzioni e cauzione."
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
        "text": "Selezionare l’archivio da consultare."
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
        "text": "La Mappa consente di consultare il territorio attraverso le ricerche Dati catastali, Opere CBSM e Infrazioni."
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
        "text": "Se si utilizza Numero pratica, selezionare il Tipo pratica tra Rilevazione, Rapporto tecnico e Atto di accertamento."
      },
      {
        "type": "step",
        "number": 4,
        "text": "Usare Cerca. I risultati comprendono soltanto le pratiche che l’utente è autorizzato a vedere."
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
        "text": "La ricerca per infrazioni mostra soltanto le pratiche che l’utente è autorizzato a vedere."
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
        "text": "Selezionare i filtri interattivi di Ufficio/Infrazione per restringere l’analisi e usare Azzera filtri per tornare all’insieme completo dei dati disponibili."
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
        "text": "Usare Esporta CSV per ottenere i dati filtrati. Il file usa il punto e virgola come separatore ed è predisposto per l’apertura nei comuni strumenti di foglio elettronico."
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
        "text": "La Rubrica è gestita dal Responsabile dell’istruttoria amministrativa e alimenta due funzioni distinte: destinatari e-mail e firmatari autorizzati. Le identità già presenti come utenti gestionali possono essere riutilizzate senza duplicare la persona."
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
        "text": "Per poter essere abilitato all’utilizzo del gestionale, l’utente deve disporre di un account attivo nell’organizzazione ArcGIS Online del Consorzio. L’Amministratore del sistema può quindi registrarlo nel gestionale e associargli il ruolo e l’ambito di competenza previsti. Quando il ruolo lo richiede, il sistema associa inoltre l’utente al gruppo ArcGIS Online necessario per l’accesso alle relative funzioni."
      },
      {
        "type": "heading2",
        "id": "cap-23-gestione-utenti-23-1-creare-un-nuovo-utente-gestionale",
        "text": "23.1 Creare un nuovo utente gestionale"
      },
      {
        "type": "heading3",
        "id": "cap-23-gestione-utenti-admin-aggiungere-un-utente",
        "text": "Amministratore del sistema — aggiungere un utente"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Verificare che la persona sia già presente nell’organizzazione ArcGIS Online."
      },
      {
        "type": "step",
        "number": 2,
        "text": "Aprire Gestione Utenti e usare Nuovo utente."
      },
      {
        "type": "step",
        "number": 3,
        "text": "Cercare la persona per nome, cognome, nome utente o e-mail e scegliere Seleziona sul membro corretto. Le persone già registrate e gli account disabilitati sono segnalati e non possono essere selezionati come nuovo utente."
      },
      {
        "type": "step",
        "number": 4,
        "text": "Controllare i dati identificativi proposti."
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
        "text": "Salvare l’utente. Se per il ruolo è previsto un gruppo ArcGIS Online, il sistema aggiorna automaticamente anche la relativa appartenenza."
      },
      {
        "type": "step",
        "number": 9,
        "text": "Verificare il messaggio Utente aggiunto e la comparsa della riga nell’elenco."
      },
      {
        "type": "callout",
        "title": "Attenzione",
        "text": "Se la persona non compare tra i membri disponibili, deve essere prima aggiunta all’organizzazione ArcGIS Online."
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
          "Ambito organizzativo"
        ],
        "rows": [
          [
            "Tecnico rilevatore, Istruttore tecnico, Capo Settore",
            "Area Agraria con il relativo settore di competenza oppure Area Tecnica con il relativo settore di competenza."
          ],
          [
            "Responsabile dell’istruttoria tecnica",
            "Area Agraria oppure Area Tecnica, con l’ambito tecnico previsto per il ruolo."
          ],
          [
            "Istruttore amministrativo",
            "Area Amministrativa, con il contesto amministrativo previsto per il ruolo."
          ],
          [
            "Responsabile dell’istruttoria amministrativa",
            "Area Amministrativa, con il contesto amministrativo previsto per il ruolo."
          ],
          [
            "Direttore Aree Agraria e Tecnica",
            "Area Agraria oppure Area Tecnica; nessun settore operativo da selezionare quando non previsto."
          ],
          [
            "Direttore Area AA.GG. e P.F.",
            "Area Amministrativa."
          ],
          [
            "Amministratore del sistema",
            "Nessun ambito organizzativo richiesto."
          ]
        ]
      },
      {
        "type": "callout",
        "title": "Ruoli apicali con titolare unico",
        "text": "Per alcuni ruoli apicali il gestionale applica un vincolo di titolarità esclusiva. Può essere presente un solo Capo Settore nello stesso ambito di Area e Settore, un solo Responsabile dell’istruttoria tecnica per ciascuna Area Agraria o Area Tecnica, un solo Responsabile dell’istruttoria amministrativa per l’Area Amministrativa, un solo Direttore Aree Agraria e Tecnica per ciascuna Area Agraria o Area Tecnica e un solo Direttore Area AA.GG. e P.F. nell’intero gestionale. Prima di attribuire a un altro utente uno di questi incarichi occorre revocarlo al titolare corrente."
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
        "text": "Se nome, cognome o e-mail sono cambiati in ArcGIS Online, usare Sincronizza. Prima della conferma il gestionale mostra le differenze rilevate; l’aggiornamento viene applicato a tutte le assegnazioni dello stesso utente."
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
        "text": "Aggiungere un nuovo ruolo allo stesso utente"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Sulla riga dell’utente usare Nuova assegnazione."
      },
      {
        "type": "step",
        "number": 2,
        "text": "Scegliere il nuovo ruolo e il relativo ambito organizzativo."
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
        "text": "L’assegnazione selezionata viene rimossa dal gestionale. Se non esistono altre assegnazioni dello stesso utente che richiedono il medesimo gruppo ArcGIS Online, il sistema aggiorna automaticamente anche la relativa appartenenza."
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
        "text": "Nella lavorazione tecnica, le modifiche agli allegati diventano definitive con Salva. Nella lavorazione amministrativa gli allegati tecnici sono consultabili ma non modificabili; per gli allegati amministrativi ordinari, aggiunta, sostituzione ed eliminazione vengono applicate con il relativo comando, mentre l’eventuale rotazione dell’immagine viene registrata con Salva. Determinazione, Atto di accertamento, documenti di protocollo e notifica e avvisi pagoPA seguono le procedure descritte nei rispettivi capitoli."
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
        "text": "Nella lavorazione tecnica premere Salva per rendere definitive le operazioni predisposte sugli allegati. Nella lavorazione amministrativa Salva registra le eventuali rotazioni preparate nel viewer e le altre modifiche pendenti della pratica; aggiunta, sostituzione ed eliminazione degli allegati amministrativi ordinari sono già applicate dal relativo comando."
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
        "text": "L’Anteprima fascicolo mostra i dati e i documenti già disponibili. Nella creazione tecnica diventa utilizzabile dopo il primo salvataggio della pratica."
      },
      {
        "type": "heading2",
        "id": "cap-24-allegati-fascicolo-e-iter-24-3-iter-non-solo-passaggi-tra-ruoli",
        "text": "24.3 Iter: non solo passaggi tra ruoli"
      },
      {
        "type": "paragraph",
        "text": "L’Iter consente di ricostruire chi ha svolto ciascun passaggio, quando è avvenuto e quale effetto ha prodotto. Per ogni passaggio sono mostrati l’evento, lo stato In corso/Chiuso, Avviato da, Trasmesso a, le date di apertura e chiusura, le note, i campi modificati manualmente e le variazioni degli allegati."
      },
      {
        "type": "bullet",
        "text": "Le variazioni di stato e di assegnazione sono già descritte dagli eventi dell’Iter e non vengono ripetute nell’elenco “Campi modificati”."
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
        "text": "Scorrere gli eventi fino al periodo o al ruolo che si vuole verificare."
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
        "text": "Se si tratta di una richiesta di integrazione, leggere la motivazione e seguire i successivi eventi “Esito integrazione trasmesso” fino al ruolo che aveva richiesto la correzione."
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
        "text": "25.1 Allarmi di iter"
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
            "Ruolo che deve effettuare il passaggio successivo",
            "Aprire la pratica, prendere in carico e svolgere la verifica prevista per il proprio ruolo."
          ],
          [
            "Richiesta integrazione ricevuta",
            "Ruolo cui è stata rimandata la pratica",
            "Prendere in carico, leggere motivazione/Iter, correggere i dati consentiti e ritrasmettere l’esito."
          ],
          [
            "Esito integrazione ricevuto",
            "Ruolo che riceve l’esito o ruolo che ha richiesto l’integrazione",
            "Se l’esito deve ancora raggiungere chi ha richiesto l’integrazione, trasmetterlo al ruolo successivo previsto; se la richiesta era stata formulata dal proprio ruolo, riprendere la verifica."
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
            "L’Istruttore tecnico ha trasmesso al Capo Settore una pratica creata direttamente nel gestionale."
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
            "Il Responsabile dell’istruttoria tecnica ha espresso esito positivo e ha trasmesso al Direttore Aree Agraria e Tecnica; in fase amministrativa indica la validazione del Responsabile dell’istruttoria amministrativa."
          ],
          [
            "Istruttoria approvata",
            "Il Direttore Aree Agraria e Tecnica ha approvato la fase tecnica e ha trasmesso al Responsabile dell’istruttoria amministrativa."
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
            "L’esito di una correzione viene trasmesso verso il ruolo che aveva richiesto l’integrazione."
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
            "La fase tecnica è stata respinta nel passaggio in cui tale esito è previsto."
          ],
          [
            "Archiviazione",
            "L’Istruttore tecnico ha archiviato una pratica creata direttamente e non ancora inoltrata ai livelli successivi dell’istruttoria."
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
            "La pratica è stata assegnata all’utente ma non è ancora stata presa in carico."
          ],
          [
            "In carico",
            "La pratica è stata presa in carico e può essere lavorata."
          ],
          [
            "Rimandato",
            "La pratica è stata rimandata per una correzione o integrazione."
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
            "Il percorso ordinario è stato interrotto da un esito di respingimento."
          ],
          [
            "Archiviata",
            "La pratica è stata archiviata tramite l’azione Elimina. Non compare più negli elenchi ordinari e resta visibile all’Amministratore del sistema."
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
            "Cap. 4.2 — creazione di una nuova pratica da parte dell’Istruttore tecnico."
          ],
          [
            "Come elimino una pratica creata per errore?",
            "Cap. 5.3 — l’azione Elimina archivia una pratica creata direttamente dall’Istruttore tecnico e non ancora inoltrata nel procedimento."
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
            "Cap. 9 — presa in carico, correzione, salvataggio e trasmissione dell’esito fino al ruolo che ha richiesto l’integrazione."
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
            "Cap. 13.4 — sostituzione della copia ufficiale finché l’operazione è consentita."
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
            "Cap. 23 — registrazione dell’utente, ruoli e aggiornamento dei dati."
          ],
          [
            "Come ricostruisco chi ha modificato una pratica?",
            "Cap. 24.3 — Iter, eventi, campi e allegati modificati."
          ]
        ]
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
            "Effettua la rilevazione in Survey123; la rilevazione confluisce nel gestionale e viene successivamente gestita dal Capo Settore."
          ],
          [
            "Istruttore tecnico",
            "Prende in carico le assegnazioni; compila o corregge l’istruttoria tecnica; gestisce Nota spese e allegati; salva; trasmette al Capo Settore; risponde alle richieste di integrazione, ma non ne apre di nuove; quando consentito, usa Elimina per archiviare una propria pratica iniziale creata per errore."
          ],
          [
            "Capo Settore",
            "Distingue una rilevazione proveniente dal Tecnico rilevatore da una pratica creata direttamente dall’Istruttore tecnico; assegna l’Istruttore tecnico solo quando la rilevazione proveniente dal Tecnico rilevatore non è ancora assegnata; verifica; può richiedere integrazioni e, nei casi previsti, respingere la pratica; trasmette al Responsabile dell’istruttoria tecnica."
          ],
          [
            "Responsabile dell’istruttoria tecnica",
            "Prende in carico; consulta; può modificare Occorrenza e Grado; valida verso il Direttore Aree Agraria e Tecnica; può richiedere integrazioni all’Istruttore tecnico; gestisce i rientri e le integrazioni tecniche richieste dal Responsabile dell’istruttoria amministrativa."
          ],
          [
            "Direttore Aree Agraria e Tecnica",
            "Prende in carico; approva verso il Responsabile dell’istruttoria amministrativa; può chiedere un’integrazione all’Istruttore tecnico o al Responsabile dell’istruttoria tecnica, secondo gli aspetti da correggere; può respingere."
          ],
          [
            "Responsabile dell’istruttoria amministrativa",
            "Assegna le pratiche all’Istruttore amministrativo; verifica e valida l’istruttoria amministrativa; può richiedere e indirizzare le integrazioni; verifica l’Atto di accertamento; gestisce la riapertura; configura i parametri sanzionatori e la Rubrica."
          ],
          [
            "Istruttore amministrativo",
            "Prende in carico le pratiche assegnate; svolge l’istruttoria amministrativa; può richiedere integrazioni; esprime l’esito e, in caso di conformità, il gestionale genera o aggiorna la Proposta di contestazione mentre l’Istruttore amministrativo predispone la bozza di determinazione; cura gli adempimenti successivi relativi ad Atto di accertamento, pagoPA, protocollo, notifica, pagamento, ricorso, CdA e definizione."
          ],
          [
            "Direttore Area AA.GG. e P.F.",
            "Definisce il procedimento amministrativo mediante l’adozione del provvedimento dirigenziale; sottoscrive la notifica dell’Atto di accertamento; può richiedere integrazioni nei passaggi previsti; le indicazioni di riapertura vengono registrate dal Responsabile dell’istruttoria amministrativa."
          ],
          [
            "Amministratore del sistema",
            "Gestisce gli utenti e dispone della visibilità completa delle pratiche per le attività di controllo e assistenza."
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
            "Operativa per l’Istruttore amministrativo nelle sezioni abilitate; il Responsabile dell’istruttoria amministrativa usa le proprie azioni dell’iter e la sezione Riapertura secondo la procedura prevista, mentre il Direttore Area AA.GG. e P.F. accede in consultazione."
          ],
          [
            "Far avanzare o rimandare la pratica",
            "Azioni / Gestisci istruttoria",
            "Dopo aver completato e salvato le modifiche, utilizzare le Azioni previste per trasmettere o rimandare la pratica."
          ],
          [
            "Ricostruire chi ha fatto cosa",
            "Iter",
            "Leggere gli eventi registrati, il mittente, il destinatario e le eventuali modifiche a dati e allegati."
          ],
          [
            "Controllare scadenze",
            "Allarmi e scadenze + Dashboard",
            "Gli allarmi dell’iter e quelli post-notifica hanno finalità diverse."
          ]
        ]
      }
    ]
  },
  {
    "id": "conclusione",
    "order": 130,
    "title": "In sintesi",
    "roles": [
      "*"
    ],
    "blocks": [
      {
        "type": "paragraph",
        "text": "Prima di lavorare una pratica, verificare se si trova in “In attesa mia” e, quando proviene da un rimando, consultare l’Iter per capire quale integrazione è stata richiesta."
      },
      {
        "type": "paragraph",
        "text": "Prima di trasmettere o far avanzare la pratica, controllare che le modifiche siano state salvate e che i documenti richiesti siano completi. Se il comando atteso non è disponibile, verificare nell’Iter quale passaggio deve ancora essere completato."
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
    "description": "Cap. 4.2 — creazione di una nuova pratica da parte dell’Istruttore tecnico.",
    "targetChapterId": "cap-4-nuova-rilevazione-e-nuova-pratica"
  },
  {
    "label": "Come elimino una pratica creata per errore?",
    "description": "Cap. 5.3 — l’azione Elimina archivia una pratica creata direttamente dall’Istruttore tecnico e non ancora inoltrata nel procedimento.",
    "targetChapterId": "cap-5-istruttoria-tecnica-dell-it"
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
    "description": "Cap. 9 — presa in carico, correzione, salvataggio e trasmissione dell’esito fino al ruolo che ha richiesto l’integrazione.",
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
    "description": "Cap. 13.4 — sostituzione della copia ufficiale finché l’operazione è consentita.",
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
    "description": "Cap. 23 — registrazione dell’utente, ruoli e aggiornamento dei dati.",
    "targetChapterId": "cap-23-gestione-utenti"
  },
  {
    "label": "Come ricostruisco chi ha modificato una pratica?",
    "description": "Cap. 24.3 — Iter, eventi, campi e allegati modificati.",
    "targetChapterId": "cap-24-allegati-fascicolo-e-iter"
  }
] as GuideQuickLink[]
