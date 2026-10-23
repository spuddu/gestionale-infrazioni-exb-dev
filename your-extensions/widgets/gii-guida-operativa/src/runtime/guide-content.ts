export type GuideRole = '*' | 'TR' | 'IT' | 'CS' | 'RIT' | 'DT' | 'IA' | 'RIA' | 'DA' | 'ADMIN'

export type GuideBlock =
  | { type: 'heading2' | 'heading3'; id: string; text: string }
  | { type: 'lead' | 'paragraph' | 'bullet' | 'figure'; text: string; inlineFigure?: string }
  | { type: 'step'; number: number | null; text: string; label?: string }
  | { type: 'callout'; title: string; text: string }
  | { type: 'table'; headers: string[]; rows: string[][] }

export interface GuideChapter { id: string; order: number; title: string; roles: GuideRole[]; blocks: GuideBlock[] }
export interface GuideQuickLink { label: string; description: string; targetChapterId: string }

export const GUIDE_VERSION = '22 ottobre 2026'

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
        "text": "Questa guida descrive l’utilizzo del gestionale e accompagna l’utente nelle attività previste per il proprio ruolo, dalla presa in carico della pratica fino alla conclusione del procedimento."
      },
      {
        "type": "paragraph",
        "text": "Per ciascuna fase del procedimento la guida indica le informazioni disponibili, le operazioni che l’utente può eseguire, i controlli da effettuare e gli effetti che ciascuna azione produce sul successivo iter della pratica."
      },
      {
        "type": "paragraph",
        "text": "Le istruzioni operative contrassegnate dalla freccia possono essere aperte con un clic: al loro interno sono descritti i passaggi di dettaglio e, quando è utile, è riportata una schermata di riferimento."
      },
      {
        "type": "paragraph",
        "text": "Passando il mouse su una schermata compare la lente di ingrandimento; facendo clic, l’immagine si apre a tutto schermo. Nella vista ingrandita è possibile variare l’ingrandimento con i pulsanti − e + oppure con la rotella del mouse, spostare l’immagine trascinandola con il mouse, riportarla alle dimensioni della finestra con il pulsante Adatta e chiuderla con il pulsante × oppure con il tasto Esc."
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
            "Effettua la rilevazione sul territorio tramite l’applicazione Esri Survey123, utilizzando il rilevamento “Infrazioni” predisposto per smartphone e tablet. Indica sulla mappa il punto dell’infrazione e può aggiungere annotazioni tecniche. I Dati tecnici rilevati, cioè il distretto in cui ricade il punto e gli elementi di rete e i manufatti presenti entro 2 metri dal punto, vengono acquisiti automaticamente e determinano il Settore di competenza. Se dai Dati tecnici risultano più Settori, il Tecnico rilevatore sceglie il Settore a cui inviare la rilevazione. Se non risulta alcun Settore, perché il punto ricade fuori dal comprensorio e non sono presenti reti o manufatti del Consorzio entro 2 metri, la rilevazione non può essere inviata. Quando il Settore di destinazione è stato acquisito correttamente, la rilevazione viene trasmessa al gestionale, che ricava automaticamente i dati catastali dalla posizione del punto, e viene gestita dal Capo Settore competente."
          ],
          [
            "Istruttore tecnico",
            "Lavora le pratiche che gli sono state assegnate e può creare una nuova pratica. Svolge l’istruttoria tecnica, la trasmette al Capo Settore e risponde alle eventuali richieste di integrazione."
          ],
          [
            "Capo Settore",
            "Assegna a un Istruttore tecnico le rilevazioni provenienti dal Tecnico rilevatore, verifica le istruttorie del Settore di competenza e le trasmette al Responsabile dell’istruttoria tecnica. Può richiedere integrazioni e, nei casi previsti, respingere la pratica."
          ],
          [
            "Responsabile dell’istruttoria tecnica",
            "Valida l’istruttoria tecnica e la trasmette al Direttore tecnico. Può richiedere integrazioni e, quando previsto, modifica i dati di Occorrenza e Grado di gravità."
          ],
          [
            "Direttore tecnico",
            "È il direttore competente per la pratica nella fase tecnica. Approva l’istruttoria tecnica trasmettendola al Responsabile dell’istruttoria amministrativa e può richiedere integrazioni oppure, nei casi previsti, respingere la pratica."
          ],
          [
            "Istruttore amministrativo",
            "Svolge l’istruttoria amministrativa sulle pratiche che gli sono state assegnate e può richiedere integrazioni. Predispone la documentazione e cura gli adempimenti amministrativi successivi fino alla definizione della pratica."
          ],
          [
            "Responsabile dell’istruttoria amministrativa",
            "Assegna le pratiche all’Istruttore amministrativo, verifica e valida l’istruttoria amministrativa e può richiedere integrazioni. Verifica inoltre l’Atto di accertamento prima dei successivi adempimenti."
          ],
          [
            "Direttore amministrativo",
            "È il direttore competente per la fase amministrativa. Conclude il procedimento amministrativo con l’adozione del provvedimento dirigenziale e sottoscrive la notifica dell’Atto di accertamento."
          ],
          [
            "Amministratore del sistema",
            "Dispone della visualizzazione completa di tutte le pratiche e delle funzioni di amministrazione del gestionale."
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
        "text": "Se a uno stesso utente sono assegnati più ruoli, le funzioni disponibili e le pratiche visibili comprendono quelle previste per ciascuno dei ruoli assegnati."
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
            "Tecnico rilevatore",
            "Non accede al gestionale e, pertanto, non ha accesso ad alcuna pratica."
          ],
          [
            "Istruttore tecnico",
            "Le pratiche che gli sono state assegnate o che ha creato, nell’Area Agraria o nell’Area Tecnica di competenza."
          ],
          [
            "Capo Settore",
            "Le pratiche del Settore di competenza."
          ],
          [
            "Responsabile dell’istruttoria tecnica",
            "Le pratiche dell’Area Agraria o dell’Area Tecnica di competenza."
          ],
          [
            "Direttore tecnico",
            "Le pratiche dell’Area Agraria o dell’Area Tecnica di competenza."
          ],
          [
            "Istruttore amministrativo",
            "Le pratiche della fase amministrativa che gli sono state assegnate."
          ],
          [
            "Responsabile dell’istruttoria amministrativa",
            "Le pratiche della fase amministrativa."
          ],
          [
            "Direttore amministrativo",
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
        "text": "La Home mostra a ciascun utente le viste disponibili in base al ruolo assegnato. L’Amministratore del sistema ha accesso a tutte le viste e non viene pertanto ripetuto nella tabella sottoriportata, salvo per la vista Gestione utenti, che costituisce una sua specifica prerogativa."
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
          ]
        ]
      },
      {
        "type": "callout",
        "title": "Accesso alle schermate di istruttoria",
        "text": "Le schermate utilizzate per svolgere l’istruttoria tecnica e l’istruttoria amministrativa non compaiono come voci autonome nel menu. Si accede a queste schermate aprendo una pratica dall’Elenco pratiche; le schermate disponibili dipendono dal ruolo dell’utente e dalla fase in cui si trova la pratica."
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
        "text": "Per passare da una vista all’altra tra quelle disponibili per il proprio ruolo, utilizzare le card presenti nella Home oppure il menu laterale presente nelle altre viste.\n\nPer individuare rapidamente le attività da svolgere, utilizzare l’Elenco pratiche, che separa le pratiche che richiedono un intervento dell’utente da quelle che si trovano in lavorazione presso altri ruoli."
      },
      {
        "type": "heading2",
        "id": "cap-2-orientarsi-home-elenco-pratiche-dettaglio-e-allarmi-2-1-home",
        "text": "2.1 Home"
      },
      {
        "type": "paragraph",
        "text": "La Home mostra le viste disponibili per il proprio ruolo. Facendo clic su una card si accede direttamente alla vista corrispondente del gestionale."
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
            "Soltanto le pratiche che richiedono un intervento dell’utente.",
            "È la scheda da utilizzare per il lavoro quotidiano."
          ],
          [
            "In attesa di altri",
            "Le pratiche visibili all’utente che sono in carico a un altro ruolo oppure in attesa della presa in carico da parte di un altro ruolo.",
            "Per seguire le pratiche già trasmesse e verificare presso quale ruolo si trovano."
          ],
          [
            "Tutte le pratiche",
            "Tutte le pratiche accessibili all’utente, comprese quelle respinte o concluse.",
            "Per cercare una pratica, consultare le pratiche passate e ricostruire l’iter di una pratica."
          ]
        ]
      },
      {
        "type": "paragraph",
        "text": "Il tipo della pratica è indicato come “Rilevazione” finché non è stato attribuito il numero ufficiale del rapporto tecnico; dopo l’attribuzione del numero il tipo diventa “Rapporto tecnico”. Tra le informazioni principali dell’elenco figurano Fase istruttoria, Stato pratica, Eseguito da, Trasmesso a e Ultimo aggiornamento."
      },
      {
        "type": "callout",
        "title": "Stato pratica e Iter",
        "text": "Lo Stato pratica indica a che punto si trova la pratica, con le seguenti etichette: Da prendere in carico, In carico, Rimandato, Trasmesso, Istruttoria assegnata e Respinto. L’Amministratore del sistema può vedere anche lo stato Archiviata. Lo Stato pratica non va confuso con i singoli eventi registrati nell’Iter."
      },
      {
        "type": "heading3",
        "id": "cap-2-orientarsi-home-elenco-pratiche-dettaglio-e-allarmi-filtrare-l-elenco-pratiche",
        "text": "Filtrare l’Elenco pratiche"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Aprire l’Elenco pratiche e scegliere la scheda adatta allo scopo: In attesa mia, In attesa di altri oppure Tutte le pratiche.",
        "label": "Scegliere la scheda dell’Elenco pratiche"
      },
      {
        "type": "step",
        "number": 2,
        "text": "Quando occorre restringere l’elenco, aprire il pannello Filtri e impostare uno o più dei criteri disponibili.",
        "label": "Filtrare le pratiche"
      },
      {
        "type": "step",
        "number": 3,
        "text": "Ordinare l’elenco facendo clic sull’intestazione delle colonne di interesse. Per il lavoro quotidiano è utile mantenere visibile la colonna Ultimo aggiornamento.",
        "label": "Ordinare l’elenco"
      },
      {
        "type": "step",
        "number": 4,
        "text": "Per eliminare tutti i filtri impostati utilizzare il pulsante Pulisci filtri. In questo modo si evita che una pratica risulti apparentemente “scomparsa” a causa di un filtro rimasto attivo.",
        "label": "Azzerare i filtri"
      },
      {
        "type": "step",
        "number": 5,
        "text": "Selezionare una pratica per visualizzarne i dettagli e le azioni disponibili.",
        "label": "Selezionare una pratica"
      },
      {
        "type": "callout",
        "title": "Amministratore del sistema",
        "text": "L’Amministratore del sistema dispone della visualizzazione completa di tutte le pratiche e può quindi supportare gli utenti nelle attività di controllo e di assistenza."
      },
      {
        "type": "heading2",
        "id": "cap-2-orientarsi-home-elenco-pratiche-dettaglio-e-allarmi-2-3-dettaglio-pratica-consultare-senza-lavorare",
        "text": "2.3 Dettaglio pratica: consultare senza modificare"
      },
      {
        "type": "paragraph",
        "text": "Il Dettaglio pratica consente di consultare le informazioni della pratica selezionata, suddivise in schede. In questa vista i dati possono essere soltanto consultati: le eventuali modifiche si effettuano nelle viste di lavorazione previste per il proprio ruolo e per la fase in cui si trova la pratica."
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
        "type": "paragraph",
        "text": "Le funzioni richiamate in questo paragrafo soltanto per la consultazione sono descritte in dettaglio nei capitoli dedicati: la Nota spese nel Cap. 18, la Mappa nel Cap. 20 e gli Allegati, l’Anteprima fascicolo e l’Iter nel Cap. 24."
      },
      {
        "type": "heading2",
        "id": "cap-2-orientarsi-home-elenco-pratiche-dettaglio-e-allarmi-2-4-allarmi-e-scadenze",
        "text": "2.4 Allarmi e scadenze"
      },
      {
        "type": "paragraph",
        "text": "Quando sono presenti allarmi, nell’intestazione del gestionale compare la campanella. Facendo clic sulla campanella si apre il pannello “Allarmi e scadenze”, che per ciascun allarme indica la pratica, il tipo di evento, il mittente, il ruolo, la data e, per le scadenze, il termine da rispettare."
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
        "text": "Gli allarmi dell’iter che richiedono la presa in carico di una pratica non devono essere trattati come semplici promemoria: l’allarme si chiude quando viene eseguita l’azione richiesta sulla pratica."
      },
      {
        "type": "paragraph",
        "text": "Per il significato degli allarmi, degli eventi e degli stati sintetici della pratica vedere Cap. 25."
      },
      {
        "type": "heading2",
        "id": "cap-2-orientarsi-home-elenco-pratiche-dettaglio-e-allarmi-2-5-il-logo-del-gestionale",
        "text": "2.5 Il logo del gestionale"
      },
      {
        "type": "paragraph",
        "text": "Il logo del gestionale nasce da un’unica forma, la goccia, ripetuta due volte con orientamenti opposti.",
        "inlineFigure": "Logo del gestionale"
      },
      {
        "type": "paragraph",
        "text": "La goccia blu richiama l’acqua, elemento essenziale dell’attività del Consorzio. La seconda, verde, è la stessa goccia capovolta: con la punta rivolta verso il basso diventa un segnaposto, simbolo di un luogo preciso sul territorio."
      },
      {
        "type": "paragraph",
        "text": "Le due forme, sfalsate in diagonale, si sovrappongono lasciando al centro uno spazio bianco. Il blu e il verde riprendono i colori del Consorzio di Bonifica della Sardegna Meridionale, mantenendo un legame diretto con la sua identità visiva."
      },
      {
        "type": "paragraph",
        "text": "Il Consorzio custodisce un territorio fatto di acqua e campi, di canali e reti irrigue, di alberi disposti in filari a protezione delle colture dal vento. Un territorio in cui ogni elemento ha un luogo, una funzione e una storia."
      },
      {
        "type": "paragraph",
        "text": "Quando viene rilevata un’infrazione, tutto comincia da un punto preciso: un campo, un idrante o un tratto di condotta. È da quel luogo che prende avvio un percorso che coinvolge persone, competenze e responsabilità diverse."
      },
      {
        "type": "paragraph",
        "text": "Il logo di GII racchiude queste due dimensioni. La goccia rappresenta il Consorzio e il suo legame con l’acqua; il segnaposto rappresenta il territorio e il luogo da cui nasce ogni pratica."
      },
      {
        "type": "paragraph",
        "text": "Nel punto in cui le due forme si sovrappongono rimane uno spazio bianco. È il simbolo dell’integrazione: il luogo in cui si incontrano le aree tecniche e amministrative, le persone, le informazioni, i documenti e le decisioni. Elementi distinti che, attraverso GII, diventano parte di un unico procedimento."
      },
      {
        "type": "paragraph",
        "text": "È in questo incontro che prende forma la Gestione Integrata delle Infrazioni: dal primo rilievo sul territorio fino alla conclusione della pratica."
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
        "text": "La pratica passa da un ruolo al successivo secondo l’iter previsto. Se durante una verifica è necessario correggere o integrare dati o documenti, la pratica viene rinviata al ruolo competente per la correzione. Completata l’integrazione, la pratica viene nuovamente trasmessa attraverso i passaggi previsti fino al ruolo che aveva richiesto l’integrazione; da quel momento la pratica prosegue secondo il normale iter."
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
            "Il Tecnico rilevatore invia la rilevazione al Capo Settore tramite Esri Survey123, utilizzando il rilevamento “Infrazioni”. In alternativa, l’Istruttore tecnico crea la pratica direttamente nel gestionale.",
            "La rilevazione è disponibile nel gestionale."
          ],
          [
            "Istruttoria tecnica",
            "Istruttore tecnico → Capo Settore",
            "L’istruttoria è trasmessa per la verifica. Se la pratica è stata creata dall’Istruttore tecnico, la prima trasmissione è registrata come nuova rilevazione."
          ],
          [
            "Verifica",
            "Capo Settore → Responsabile dell’istruttoria tecnica",
            "L’istruttoria è verificata. Alla prima verifica con esito positivo il gestionale attribuisce il numero ufficiale del rapporto tecnico, se non è già stato attribuito."
          ],
          [
            "Validazione",
            "Responsabile dell’istruttoria tecnica → Direttore tecnico",
            "L’istruttoria tecnica è validata."
          ],
          [
            "Approvazione",
            "Direttore tecnico → Responsabile dell’istruttoria amministrativa",
            "L’istruttoria tecnica è approvata e la pratica entra nella fase amministrativa."
          ],
          [
            "Assegnazione amministrativa",
            "Responsabile dell’istruttoria amministrativa → Istruttore amministrativo",
            "L’istruttoria amministrativa è assegnata."
          ],
          [
            "Istruttoria amministrativa",
            "L’Istruttore amministrativo esprime l’esito dell’istruttoria. In caso di esito conforme il gestionale genera la Proposta di contestazione; l’Istruttore amministrativo predispone la bozza di determinazione e trasmette il fascicolo al Responsabile dell’istruttoria amministrativa.",
            "Il fascicolo amministrativo è trasmesso per la verifica."
          ],
          [
            "Validazione amministrativa",
            "Responsabile dell’istruttoria amministrativa → Istruttore amministrativo",
            "L’istruttoria amministrativa è validata e l’Istruttore amministrativo prosegue con gli adempimenti documentali."
          ],
          [
            "Atto di accertamento",
            "L’Istruttore amministrativo prepara l’Atto, il Responsabile dell’istruttoria amministrativa lo verifica e infine l’Istruttore amministrativo cura la firma e il protocollo.",
            "L’Atto è approvato, firmato e protocollato."
          ],
          [
            "Post-notifica",
            "L’Istruttore amministrativo registra gli eventi successivi alla notifica, compresi il pagamento, l’eventuale ricorso, l’eventuale esito del CdA e la definizione della pratica. L’eventuale riapertura segue la procedura descritta nel Cap. 17.",
            "La pratica è definita secondo l’esito effettivo del procedimento."
          ]
        ]
      },
      {
        "type": "figure",
        "text": "Figura – Schema generale dell’iter tecnico-amministrativo"
      },
      {
        "type": "heading3",
        "id": "cap-3-il-ciclo-completo-della-pratica-percorsi-di-integrazione",
        "text": "Percorsi di integrazione"
      },
      {
        "type": "table",
        "headers": [
          "Chi richiede l’integrazione",
          "A chi viene trasmessa",
          "Come torna l’esito"
        ],
        "rows": [
          [
            "Capo Settore",
            "Istruttore tecnico",
            "Istruttore tecnico → Capo Settore"
          ],
          [
            "Responsabile dell’istruttoria tecnica",
            "Istruttore tecnico",
            "Istruttore tecnico → Capo Settore → Responsabile dell’istruttoria tecnica"
          ],
          [
            "Direttore tecnico",
            "L’Istruttore tecnico oppure il Responsabile dell’istruttoria tecnica, in base agli aspetti da correggere",
            "Attraverso i passaggi tecnici previsti, fino al Direttore tecnico"
          ],
          [
            "Istruttore amministrativo",
            "Responsabile dell’istruttoria amministrativa",
            "Il Responsabile dell’istruttoria amministrativa esamina la richiesta; la pratica torna poi all’Istruttore amministrativo per le correzioni necessarie"
          ],
          [
            "Responsabile dell’istruttoria amministrativa — aspetti amministrativi",
            "Istruttore amministrativo",
            "Istruttore amministrativo → Responsabile dell’istruttoria amministrativa"
          ],
          [
            "Responsabile dell’istruttoria amministrativa — aspetti tecnici",
            "Responsabile dell’istruttoria tecnica",
            "Responsabile dell’istruttoria tecnica → Direttore tecnico → Responsabile dell’istruttoria amministrativa. Se sono necessarie correzioni da parte dell’Istruttore tecnico, l’esito passa prima dal Capo Settore e dal Responsabile dell’istruttoria tecnica"
          ]
        ]
      },
      {
        "type": "paragraph",
        "text": "Le trasmissioni, le verifiche e le richieste di integrazione si effettuano tramite le Azioni disponibili per la pratica. I ruoli che devono esprimere una valutazione utilizzano Gestisci istruttoria, che consente di scegliere l’esito previsto e, quando necessario, di indicare la motivazione o gli aspetti da integrare. I comandi da utilizzare in ciascun passaggio sono descritti nei capitoli dedicati ai singoli ruoli."
      },
      {
        "type": "paragraph",
        "text": "Le integrazioni tecniche sono descritte nel Cap. 9. Le fasi amministrative e documentali richiamate nello schema sono descritte nei Cap. 13, Cap. 14, Cap. 15, Cap. 16 e Cap. 17."
      },
      {
        "type": "callout",
        "title": "Regola delle integrazioni",
        "text": "Nella fase tecnica il Capo Settore, il Responsabile dell’istruttoria tecnica e il Direttore tecnico possono richiedere integrazioni nei passaggi di propria competenza. L’Istruttore tecnico svolge l’istruttoria e risponde alle richieste ricevute, ma non può aprire a sua volta una richiesta di integrazione. Nella fase amministrativa l’Istruttore amministrativo e il Responsabile dell’istruttoria amministrativa possono richiedere integrazioni nei passaggi di propria competenza. Quando una richiesta comporta il ritorno della pratica a un ruolo precedente, dopo la correzione l’esito viene trasmesso attraverso i passaggi previsti fino al ruolo che aveva richiesto l’integrazione. Nei passaggi intermedi l’Iter registra l’evento “Esito integrazione trasmesso”. Quando l’esito torna al ruolo che aveva richiesto l’integrazione, questo riprende la propria verifica, validazione o approvazione."
      }
    ]
  },
  {
    "id": "cap-4-nuova-rilevazione-e-nuova-pratica",
    "order": 4,
    "title": "4. Nuova rilevazione e nuova pratica",
    "roles": [
      "CS",
      "IT"
    ],
    "blocks": [
      {
        "type": "heading2",
        "id": "cap-4-nuova-rilevazione-e-nuova-pratica-4-1-caso-a-rilevazione-proveniente-dal-tr",
        "text": "4.1 Caso A: rilevazione proveniente dal Tecnico rilevatore"
      },
      {
        "type": "paragraph",
        "text": "La rilevazione effettuata dal Tecnico rilevatore tramite l’applicazione Esri Survey123, con il rilevamento “Infrazioni”, viene trasmessa al gestionale e indirizzata al Capo Settore del Settore individuato dalla posizione del punto. All’arrivo della rilevazione il gestionale ricava automaticamente dalla posizione del punto i dati catastali (Comune, Sezione, Foglio e Mappale). Il Capo Settore riceve l’allarme “Nuova rilevazione ricevuta”. In questo caso la pratica non è ancora assegnata a un Istruttore tecnico."
      },
      {
        "type": "paragraph",
        "text": "Quando il punto ricade in un’area in cui sono presenti distretti, tratti di rete o manufatti di più Settori, è il Tecnico rilevatore a scegliere nel Survey il Settore della rilevazione. Se l’Istruttore tecnico ritiene che la rilevazione sia di competenza di un altro Settore, lo segnala al proprio Capo Settore con la procedura descritta nel Cap. 5.4; il Capo Settore decide sull’eventuale trasferimento con la procedura descritta nel Cap. 6.2."
      },
      {
        "type": "heading3",
        "id": "cap-4-nuova-rilevazione-e-nuova-pratica-cs-assegnare-una-rilevazione-proveniente-dal-tr",
        "text": "Capo Settore — assegnare una rilevazione proveniente dal Tecnico rilevatore"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Aprire la nuova rilevazione ricevuta.",
        "label": "Aprire la rilevazione ricevuta"
      },
      {
        "type": "step",
        "number": 2,
        "text": "Controllare nel Dettaglio pratica i dati già rilevati, in particolare il trasgressore, la violazione, la localizzazione, i dati tecnici e gli allegati.",
        "label": "Verificare i dati della rilevazione"
      },
      {
        "type": "step",
        "number": 3,
        "text": "Prendere in carico la pratica.",
        "label": "Prendere in carico la pratica"
      },
      {
        "type": "step",
        "number": 4,
        "text": "Assegnare la pratica a un Istruttore tecnico."
      },
      {
        "type": "step",
        "number": 5,
        "text": "Verificare che la pratica esca da In attesa mia e passi a In attesa di altri.",
        "label": "Verificare l’avvenuta assegnazione"
      },
      {
        "type": "callout",
        "title": "Cosa accade dopo",
        "text": "L’Istruttore tecnico riceve la pratica assegnata, che risulta da prendere in carico. L’assegnazione viene registrata nell’Iter insieme al nominativo del destinatario."
      },
      {
        "type": "callout",
        "title": "Attenzione",
        "text": "Se la rilevazione è stata creata direttamente da un Istruttore tecnico, il Capo Settore non deve assegnarla nuovamente, perché l’Istruttore tecnico che l’ha creata è già associato alla pratica."
      },
      {
        "type": "heading2",
        "id": "cap-4-nuova-rilevazione-e-nuova-pratica-4-2-caso-b-pratica-creata-direttamente-dall-it",
        "text": "4.2 Caso B: pratica creata direttamente dall’Istruttore tecnico"
      },
      {
        "type": "paragraph",
        "text": "La funzione Nuova pratica è utilizzata dall’Istruttore tecnico. L’Istruttore tecnico che crea la pratica viene associato automaticamente come istruttore e la pratica risulta già in carico a lui, senza bisogno di una successiva presa in carico."
      },
      {
        "type": "paragraph",
        "text": "Se l’Istruttore tecnico è assegnato a più Settori, prima di iniziare la compilazione deve selezionare il Settore al quale appartiene la nuova pratica. Se è assegnato a un solo Settore, la scelta non viene richiesta."
      },
      {
        "type": "heading3",
        "id": "cap-4-nuova-rilevazione-e-nuova-pratica-it-creare-una-nuova-pratica",
        "text": "Istruttore tecnico — creare una nuova pratica"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Avviare una nuova pratica."
      },
      {
        "type": "step",
        "number": 2,
        "text": "Verificare i Dati generali."
      },
      {
        "type": "step",
        "number": 3,
        "text": "Compilare i dati del Trasgressore.",
        "label": "Compilare il Trasgressore"
      },
      {
        "type": "step",
        "number": 4,
        "text": "Compilare la Violazione."
      },
      {
        "type": "step",
        "number": 5,
        "text": "Compilare Luoghi e dati tecnici."
      },
      {
        "type": "step",
        "number": 6,
        "text": "Salvare la nuova pratica."
      },
      {
        "type": "step",
        "number": 7,
        "text": "Compilare la Nota spese, se prevista.",
        "label": "Compilare la Nota spese"
      },
      {
        "type": "step",
        "number": 8,
        "text": "Gestire gli allegati della pratica.",
        "label": "Gestire gli allegati"
      },
      {
        "type": "step",
        "number": 9,
        "text": "Salvare le modifiche."
      },
      {
        "type": "step",
        "number": 10,
        "text": "Trasmettere la nuova rilevazione al Capo Settore."
      },
      {
        "type": "callout",
        "title": "Cosa accade dopo",
        "text": "Il Capo Settore riceve l’allarme “Nuova rilevazione ricevuta”. A differenza della rilevazione proveniente dal Tecnico rilevatore, in questo caso l’Istruttore tecnico è già associato alla pratica: il Capo Settore deve quindi procedere alla verifica e non a una nuova assegnazione."
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
        "text": "L’Istruttore tecnico è il ruolo che compila la pratica nella fase tecnica. Può lavorare una pratica quando questa gli è stata assegnata e risulta in carico a lui. Se riceve una richiesta di integrazione, può apportare le correzioni richieste dopo aver preso nuovamente in carico la pratica; non può invece aprire a sua volta una richiesta di integrazione."
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
            "Area e Settore, riferimenti del Tecnico rilevatore, data della rilevazione, Istruttore tecnico e data di trasmissione al Capo Settore."
          ],
          [
            "Trasgressore",
            "Persona fisica o giuridica, dati fiscali e recapiti, qualifica o rapporto con il fondo, domicilio per le notifiche, rappresentante legale con le relative informazioni e note."
          ],
          [
            "Violazione",
            "Articoli e fattispecie selezionati, superfici, tipo di abuso, occorrenza, descrizione dettagliata, circostanze rilevanti e presenza del trasgressore."
          ],
          [
            "Luoghi e dati tecnici",
            "Descrizione del luogo, localizzazione sulla mappa con i dati catastali (Comune, Sezione, Foglio e Mappale) ricavati automaticamente dal punto, Dati tecnici rilevati, Annotazioni tecniche del Tecnico rilevatore, matricola del contatore e matricola della tessera."
          ],
          [
            "Nota spese",
            "Costi collegati alle violazioni per le quali è prevista la Nota spese, quantità, attrezzature, eventuali cauzioni o risarcimenti e riepilogo degli importi."
          ],
          [
            "Allegati",
            "Documentazione tecnica, che è possibile aggiungere, rimuovere, sostituire e ruotare; le modifiche agli allegati diventano definitive soltanto con il pulsante Salva."
          ],
          [
            "Anteprima fascicolo",
            "Consultazione del fascicolo composto con i dati attuali della pratica e con la documentazione disponibile."
          ]
        ]
      },
      {
        "type": "paragraph",
        "text": "La compilazione della Nota spese è descritta nel Cap. 18. La gestione degli Allegati e dell’Anteprima fascicolo e la consultazione dell’Iter sono descritte nel Cap. 24."
      },
      {
        "type": "heading2",
        "id": "cap-5-istruttoria-tecnica-dell-it-5-2-controlli-al-salvataggio",
        "text": "5.2 Controlli al salvataggio"
      },
      {
        "type": "bullet",
        "text": "Il codice fiscale della persona fisica, se compilato, deve essere composto da 16 caratteri."
      },
      {
        "type": "bullet",
        "text": "La partita IVA della persona giuridica, se compilata, deve essere composta da 11 cifre."
      },
      {
        "type": "bullet",
        "text": "Nella Nota spese la stessa matricola di tessera elettronica non può essere indicata più di una volta all’interno della stessa pratica."
      },
      {
        "type": "bullet",
        "text": "Art. 15: è obbligatorio indicare se l’abuso è Parziale o Totale. Nel caso di abuso Parziale, le superfici dichiarata e irrigata devono essere maggiori di zero e la superficie irrigata deve essere maggiore di quella dichiarata. Nel caso di abuso Totale, la superficie irrigata deve essere maggiore di zero e quella dichiarata viene automaticamente impostata a zero."
      },
      {
        "type": "bullet",
        "text": "Art. 16: la superficie dichiarata deve essere maggiore di zero."
      },
      {
        "type": "bullet",
        "text": "Art. 17: è obbligatorio selezionare la fattispecie. Nel caso di variazione tardiva devono essere indicate la superficie dichiarata e la superficie variata. Nel caso di rinuncia tardiva deve essere indicata la superficie dichiarata e le altre superfici vengono automaticamente impostate a zero."
      },
      {
        "type": "bullet",
        "text": "Se è stata selezionata almeno una violazione e il campo è richiesto, è obbligatorio indicare se il trasgressore era presente o assente."
      },
      {
        "type": "bullet",
        "text": "Per le violazioni che richiedono la localizzazione sulla mappa, la pratica non può essere salvata se il punto non è stato impostato."
      },
      {
        "type": "bullet",
        "text": "Il punto impostato o spostato deve ricadere nel Settore della pratica: se ricade in un altro Settore, il salvataggio viene bloccato. Se una rilevazione proveniente dal Tecnico rilevatore riguarda un altro Settore, annullare lo spostamento del punto e segnalarlo al Capo Settore con l’azione “Settore non competente”, descritta nel Cap. 5.4."
      },
      {
        "type": "bullet",
        "text": "In alcune Note spese le matricole delle tessere devono essere composte da 5 cifre."
      },
      {
        "type": "bullet",
        "text": "Una Nota spese iniziata ma non completata deve essere completata oppure eliminata prima di poter proseguire."
      },
      {
        "type": "heading3",
        "id": "cap-5-istruttoria-tecnica-dell-it-it-completare-e-trasmettere-l-istruttoria-tecnica",
        "text": "Istruttore tecnico — completare e trasmettere l’istruttoria tecnica"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Prendere in carico la pratica assegnata.",
        "label": "Prendere in carico la pratica"
      },
      {
        "type": "step",
        "number": 2,
        "text": "Aprire la lavorazione tecnica e controllare, una scheda alla volta, Trasgressore, Violazione, Luoghi e dati tecnici, Nota spese e Allegati.",
        "label": "Verificare i dati dell’istruttoria"
      },
      {
        "type": "step",
        "number": 3,
        "text": "Correggere i dati e premere il pulsante Salva. Se il gestionale segnala controlli che bloccano il salvataggio, correggere i dati indicati e salvare nuovamente.",
        "label": "Correggere e salvare i dati"
      },
      {
        "type": "step",
        "number": 4,
        "text": "Controllare l’Anteprima fascicolo e, se necessario, tornare alla scheda che contiene il dato da correggere.",
        "label": "Verificare il fascicolo"
      },
      {
        "type": "step",
        "number": 5,
        "text": "Tornare alle Azioni. Se si tratta della prima trasmissione di una pratica creata direttamente dall’Istruttore tecnico, utilizzare il comando Trasmetti nuova rilevazione; in tutti gli altri casi utilizzare il comando Trasmetti istruttoria.",
        "label": "Trasmettere l’istruttoria tecnica"
      },
      {
        "type": "step",
        "number": 6,
        "text": "Confermare la trasmissione al Capo Settore.",
        "label": "Confermare la trasmissione"
      },
      {
        "type": "callout",
        "title": "Cosa accade dopo",
        "text": "La pratica passa al Capo Settore, che diventa il ruolo competente. L’Iter registra l’evento “Nuova rilevazione trasmessa” oppure l’evento “Istruttoria trasmessa per verifica”, a seconda del caso."
      },
      {
        "type": "heading2",
        "id": "cap-5-istruttoria-tecnica-dell-it-5-3-archiviare-una-pratica-creata-per-errore",
        "text": "5.3 Archiviare una pratica creata per errore"
      },
      {
        "type": "paragraph",
        "text": "L’Istruttore tecnico può utilizzare l’azione Elimina soltanto per una pratica che ha creato direttamente e che non ha mai trasmesso ai livelli successivi dell’istruttoria."
      },
      {
        "type": "step",
        "number": 1,
        "text": "Aprire la pratica interessata e verificare che si trovi ancora nella fase iniziale di competenza dell’Istruttore tecnico.",
        "label": "Verificare che la pratica sia archiviabile"
      },
      {
        "type": "step",
        "number": 2,
        "text": "Aprire le Azioni e scegliere Elimina.",
        "label": "Archiviare la pratica"
      },
      {
        "type": "step",
        "number": 3,
        "text": "Inserire la nota obbligatoria con la motivazione dell’archiviazione e confermare.",
        "label": "Motivare e confermare l’archiviazione"
      },
      {
        "type": "callout",
        "title": "Effetto dell’azione",
        "text": "L’azione Elimina archivia la pratica, registra nell’Iter l’evento “Archiviazione” e rimuove la pratica dagli elenchi ordinari. La pratica resta consultabile dall’Amministratore del sistema."
      },
      {
        "type": "heading2",
        "id": "cap-5-istruttoria-tecnica-dell-it-5-4-rilevazione-di-competenza-di-un-altro-settore",
        "text": "5.4 Rilevazione di competenza di un altro Settore"
      },
      {
        "type": "paragraph",
        "text": "L’Istruttore tecnico lavora soltanto nel Settore della pratica e non può spostare la pratica in un altro Settore. Se ritiene che una rilevazione proveniente dal Tecnico rilevatore sia di competenza di un altro Settore, lo segnala al proprio Capo Settore, che decide se trasferirla."
      },
      {
        "type": "bullet",
        "text": "L’azione è disponibile soltanto per le rilevazioni provenienti dal Tecnico rilevatore, prima che sia stato attribuito il numero del rapporto tecnico, e soltanto se, nel punto della rilevazione, il Tecnico rilevatore ha dovuto scegliere fra più Settori della stessa Area."
      },
      {
        "type": "bullet",
        "text": "Nelle Azioni il nome dell’azione riporta il Settore della pratica, ad esempio “Settore Distretto 2 Serramanna non competente”."
      },
      {
        "type": "heading3",
        "id": "cap-5-istruttoria-tecnica-dell-it-segnalare-settore-non-competente",
        "text": "Istruttore tecnico — segnalare che la rilevazione è di un altro Settore"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Aprire Gestisci istruttoria nell’area Azioni e scegliere l’azione “… non competente”.",
        "label": "Scegliere Settore non competente"
      },
      {
        "type": "step",
        "number": 2,
        "text": "Aprire il menu a tendina Settore ritenuto competente e selezionare il Settore al quale appartiene la rilevazione.",
        "label": "Indicare il Settore competente"
      },
      {
        "type": "step",
        "number": 3,
        "text": "Compilare il campo Motivazione, che è obbligatorio, e confermare.",
        "label": "Motivare e confermare la segnalazione"
      },
      {
        "type": "callout",
        "title": "Attenzione",
        "text": "Se il Capo Settore trasferisce la rilevazione, i dati inseriti durante l’istruttoria vengono persi (modifiche ai dati, Nota spese, allegati aggiunti e spostamento del punto) e vengono ripristinati i valori inviati dal Tecnico rilevatore."
      },
      {
        "type": "callout",
        "title": "Cosa accade dopo",
        "text": "La pratica torna al Capo Settore, che riceve l’allarme “Istruttoria trasmessa – Settore non competente” con l’indicazione del Settore ritenuto competente e della motivazione. L’Iter registra lo stesso evento."
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
        "text": "Il Capo Settore può ricevere l’allarme “Nuova rilevazione ricevuta” in due casi diversi: una rilevazione proveniente dal Tecnico rilevatore, ancora da assegnare, oppure una nuova pratica già creata e istruita da un Istruttore tecnico. Per stabilire come procedere occorre verificare se alla pratica è già associato un Istruttore tecnico."
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
            "Alla pratica non è ancora assegnato un Istruttore tecnico.",
            "Prendere in carico e assegnare un Istruttore tecnico."
          ],
          [
            "Nuova pratica creata dall’Istruttore tecnico",
            "L’Istruttore tecnico che ha creato la pratica è già associato alla pratica.",
            "Prendere in carico la pratica e procedere direttamente alla verifica, senza assegnarla nuovamente."
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
        "text": "Prendere in carico la pratica da verificare.",
        "label": "Prendere in carico la pratica"
      },
      {
        "type": "step",
        "number": 2,
        "text": "Consultare il Dettaglio pratica e verificare la coerenza di trasgressore, violazioni, localizzazione, Nota spese, allegati e Iter.",
        "label": "Verificare l’istruttoria"
      },
      {
        "type": "step",
        "number": 3,
        "text": "Scegliere l’esito della verifica."
      },
      {
        "type": "step",
        "number": 4,
        "text": "Se la pratica è corretta, scegliere Conforme e confermare la trasmissione al Responsabile dell’istruttoria tecnica.",
        "label": "Approvare l’istruttoria"
      },
      {
        "type": "step",
        "number": 5,
        "text": "Se sono necessarie correzioni, rimandare la pratica all’Istruttore tecnico per integrazione e inserire la motivazione richiesta.",
        "label": "Richiedere un’integrazione"
      },
      {
        "type": "step",
        "number": 6,
        "text": "Nei casi previsti, il Capo Settore può anche respingere la pratica.",
        "label": "Respingere la pratica"
      },
      {
        "type": "callout",
        "title": "Cosa accade dopo",
        "text": "Con esito positivo l’Iter registra l’evento “Istruttoria verificata” e la pratica viene trasmessa al Responsabile dell’istruttoria tecnica. Alla prima verifica con esito positivo il gestionale attribuisce il numero ufficiale del rapporto tecnico e la relativa data, se non sono già stati attribuiti."
      },
      {
        "type": "figure",
        "text": "Figura – Gestisci istruttoria del Capo Settore"
      },
      {
        "type": "heading2",
        "id": "cap-6-verifica-del-capo-settore-6-2-rilevazione-di-competenza-di-un-altro-settore",
        "text": "6.2 Rilevazione di competenza di un altro Settore"
      },
      {
        "type": "paragraph",
        "text": "Quando l’Istruttore tecnico segnala che la rilevazione è di competenza di un altro Settore, con la procedura descritta nel Cap. 5.4, il Capo Settore riceve l’allarme “Istruttoria trasmessa – Settore non competente”. In Gestisci istruttoria sono riportati il Settore indicato dall’Istruttore tecnico e la relativa motivazione."
      },
      {
        "type": "bullet",
        "text": "In questo caso il Capo Settore non può approvare né respingere la pratica: può soltanto trasferire la rilevazione al Settore indicato oppure rimandarla all’Istruttore tecnico."
      },
      {
        "type": "heading3",
        "id": "cap-6-verifica-del-capo-settore-trasferire-la-rilevazione",
        "text": "Capo Settore — trasferire la rilevazione a un altro Settore"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Prendere in carico la pratica.",
        "label": "Prendere in carico la pratica"
      },
      {
        "type": "step",
        "number": 2,
        "text": "Valutare la segnalazione esaminando il Settore indicato e la motivazione e, se utile, la posizione del punto nella scheda Mappa del Dettaglio pratica.",
        "label": "Valutare la segnalazione"
      },
      {
        "type": "step",
        "number": 3,
        "text": "Se la segnalazione è fondata, scegliere l’azione “Trasferisci al Settore …”, inserire le eventuali Ulteriori annotazioni e confermare.",
        "label": "Trasferire la rilevazione"
      },
      {
        "type": "step",
        "number": 4,
        "text": "Se la segnalazione non è fondata, rimandare la pratica all’Istruttore tecnico indicando la motivazione.",
        "label": "Rimandare all’Istruttore tecnico"
      },
      {
        "type": "callout",
        "title": "Cosa accade dopo",
        "text": "Con il trasferimento i dati inseriti durante l’istruttoria vengono persi (modifiche ai dati, Nota spese, allegati aggiunti e spostamento del punto) e vengono ripristinati i valori inviati dal Tecnico rilevatore. La pratica passa al Settore indicato e non è più assegnata all’Istruttore tecnico. Il Capo Settore del Settore di destinazione riceve l’allarme “Nuova rilevazione ricevuta”, con l’indicazione “Trasferita da” seguita dal nominativo di chi ha trasferito la rilevazione, e la assegna come una nuova rilevazione secondo la procedura descritta nel Cap. 4.1. L’Iter registra l’evento “Rilevazione trasferita ad altro Settore”."
      },
      {
        "type": "bullet",
        "text": "Il Capo Settore che riceve una rilevazione trasferita non può respingerla. Se anche il nuovo Istruttore tecnico ritiene che la rilevazione sia di competenza di un altro Settore, può segnalarlo con la stessa procedura."
      }
    ]
  },
  {
    "id": "cap-7-validazione-del-responsabile-istruttoria-tecnica",
    "order": 7,
    "title": "7. Validazione del Responsabile dell’istruttoria tecnica",
    "roles": [
      "RIT",
      "ADMIN"
    ],
    "blocks": [
      {
        "type": "lead",
        "text": "Il Responsabile dell’istruttoria tecnica riceve la pratica dopo la verifica del Capo Settore. Nella lavorazione tecnica può modificare soltanto i dati di Occorrenza e Grado di gravità; tutte le altre sezioni tecniche restano in sola lettura."
      },
      {
        "type": "heading3",
        "id": "cap-7-validazione-del-responsabile-istruttoria-tecnica-rit-validare-una-pratica",
        "text": "Responsabile dell’istruttoria tecnica — validare una pratica"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Prendere in carico la pratica da validare.",
        "label": "Prendere in carico la pratica"
      },
      {
        "type": "step",
        "number": 2,
        "text": "Consultare il fascicolo tecnico e l’Iter per verificare il percorso già svolto dalla pratica.",
        "label": "Verificare fascicolo e Iter"
      },
      {
        "type": "step",
        "number": 3,
        "text": "Se necessario, aprire la lavorazione tecnica, modificare soltanto Occorrenza e Grado di gravità e premere il pulsante Salva.",
        "label": "Modificare Occorrenza e Grado di gravità"
      },
      {
        "type": "step",
        "number": 4,
        "text": "Scegliere l’esito della validazione tecnica.",
        "label": "Scegliere l’esito della validazione"
      },
      {
        "type": "step",
        "number": 5,
        "text": "Se l’istruttoria è corretta, scegliere l’esito Conforme e confermare la trasmissione al Direttore tecnico.",
        "label": "Validare l’istruttoria tecnica"
      },
      {
        "type": "step",
        "number": 6,
        "text": "Se sono necessarie integrazioni, rimandare la pratica all’Istruttore tecnico indicando la motivazione. Il Responsabile dell’istruttoria tecnica non può respingere la pratica: il respingimento è riservato al Direttore tecnico.",
        "label": "Richiedere un’integrazione"
      },
      {
        "type": "callout",
        "title": "Cosa accade dopo",
        "text": "Con esito positivo l’Iter registra l’evento “Istruttoria validata” e la pratica viene trasmessa al Direttore tecnico."
      }
    ]
  },
  {
    "id": "cap-8-approvazione-del-direttore-d-area",
    "order": 8,
    "title": "8. Approvazione del Direttore tecnico",
    "roles": [
      "DT",
      "ADMIN"
    ],
    "blocks": [
      {
        "type": "lead",
        "text": "Il Direttore tecnico conclude la fase tecnica. Non modifica i dati dell’istruttoria tecnica: consulta la pratica e poi la approva, richiede un’integrazione oppure, nei casi previsti, la respinge."
      },
      {
        "type": "heading3",
        "id": "cap-8-approvazione-del-direttore-d-area-dt-approvare-integrare-o-respingere",
        "text": "Direttore tecnico — approvare, integrare o respingere"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Prendere in carico la pratica da approvare.",
        "label": "Prendere in carico la pratica"
      },
      {
        "type": "step",
        "number": 2,
        "text": "Controllare il fascicolo, la Nota spese, gli allegati e l’Iter.",
        "label": "Verificare il fascicolo tecnico"
      },
      {
        "type": "step",
        "number": 3,
        "text": "Scegliere l’esito dell’approvazione tecnica.",
        "label": "Scegliere l’esito dell’approvazione"
      },
      {
        "type": "step",
        "number": 4,
        "text": "Per approvare l’istruttoria scegliere l’esito Conforme e confermare: la pratica entra nella fase amministrativa e viene trasmessa al Responsabile dell’istruttoria amministrativa.",
        "label": "Approvare l’istruttoria tecnica"
      },
      {
        "type": "step",
        "number": 5,
        "text": "Per richiedere un’integrazione scegliere l’esito che rimanda la pratica per integrazione e indicare gli aspetti da correggere. Se la richiesta riguarda esclusivamente Occorrenza o Grado di gravità, la pratica viene trasmessa al Responsabile dell’istruttoria tecnica; in tutti gli altri casi viene trasmessa all’Istruttore tecnico.",
        "label": "Richiedere un’integrazione"
      },
      {
        "type": "step",
        "number": 6,
        "text": "Nei casi previsti dall’iter il Direttore tecnico può respingere l’istruttoria tecnica. Con il respingimento la pratica non prosegue verso la fase amministrativa.",
        "label": "Respingere l’istruttoria tecnica"
      },
      {
        "type": "callout",
        "title": "Cosa accade dopo",
        "text": "Con l’approvazione l’Iter registra l’evento “Istruttoria approvata” e la pratica viene trasmessa al Responsabile dell’istruttoria amministrativa, nella fase amministrativa."
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
        "text": "Con una richiesta di integrazione la pratica torna a un ruolo precedente per le correzioni necessarie. Dopo la correzione, l’esito viene trasmesso attraverso i ruoli previsti fino a raggiungere il ruolo che aveva richiesto l’integrazione. I ruoli intermedi trasmettono l’esito al passaggio successivo; la normale verifica, validazione o approvazione riprende quando la pratica torna al ruolo che aveva richiesto l’integrazione."
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
            "Al Capo Settore, che verifica nuovamente la pratica."
          ],
          [
            "Responsabile dell’istruttoria tecnica",
            "Istruttore tecnico",
            "Istruttore tecnico → Capo Settore → Responsabile dell’istruttoria tecnica",
            "Quando l’esito arriva al Responsabile dell’istruttoria tecnica che aveva richiesto l’integrazione."
          ],
          [
            "Direttore tecnico",
            "Istruttore tecnico, oppure Responsabile dell’istruttoria tecnica se la richiesta riguarda soltanto Occorrenza o Grado di gravità",
            "Se la pratica è stata trasmessa all’Istruttore tecnico: Istruttore tecnico → Capo Settore → Responsabile dell’istruttoria tecnica → Direttore tecnico. Se la pratica è stata trasmessa al Responsabile dell’istruttoria tecnica: Responsabile dell’istruttoria tecnica → Direttore tecnico.",
            "Al Direttore tecnico che aveva richiesto l’integrazione."
          ],
          [
            "Responsabile dell’istruttoria amministrativa — integrazione tecnica",
            "Responsabile dell’istruttoria tecnica",
            "Responsabile dell’istruttoria tecnica → Direttore tecnico → Responsabile dell’istruttoria amministrativa",
            "Al Responsabile dell’istruttoria amministrativa, che riprende la verifica amministrativa; l’esito non viene trasmesso automaticamente all’Istruttore amministrativo."
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
        "text": "Aprire la pratica rimandata per integrazione.",
        "label": "Aprire la pratica rimandata"
      },
      {
        "type": "step",
        "number": 2,
        "text": "Prendere in carico la pratica rimandata.",
        "label": "Prendere in carico la pratica"
      },
      {
        "type": "step",
        "number": 3,
        "text": "Leggere la motivazione del rimando e verificare nell’Iter quale ruolo ha richiesto l’integrazione e quali aspetti ha indicato.",
        "label": "Leggere la richiesta di integrazione"
      },
      {
        "type": "step",
        "number": 4,
        "text": "Aprire la lavorazione consentita al proprio ruolo, correggere soltanto i dati indicati nella richiesta e salvare.",
        "label": "Eseguire le correzioni richieste"
      },
      {
        "type": "step",
        "number": 5,
        "text": "Tornare a Gestisci istruttoria e trasmettere l’esito. Se la richiesta era stata formulata da un ruolo successivo, nei passaggi che precedono il ritorno della pratica a quel ruolo l’Iter registra l’evento “Esito integrazione trasmesso”.",
        "label": "Trasmettere l’esito dell’integrazione"
      },
      {
        "type": "step",
        "number": 6,
        "text": "Controllare che la pratica sia passata al ruolo successivo previsto.",
        "label": "Verificare il passaggio della pratica"
      },
      {
        "type": "callout",
        "title": "Cosa accade dopo",
        "text": "Il ruolo successivo riceve l’allarme “Esito integrazione ricevuto”. Quando l’esito raggiunge il ruolo che aveva richiesto l’integrazione, questo riprende la propria verifica, validazione o approvazione."
      },
      {
        "type": "callout",
        "title": "Attenzione",
        "text": "Anche quando l’integrazione è stata richiesta dal Responsabile dell’istruttoria tecnica, l’Istruttore tecnico trasmette l’esito al Capo Settore, senza saltare questo passaggio. Allo stesso modo, un’integrazione tecnica richiesta dal Responsabile dell’istruttoria amministrativa passa dal Responsabile dell’istruttoria tecnica e dal Direttore tecnico prima di tornare al Responsabile dell’istruttoria amministrativa."
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
        "text": "Dopo l’approvazione del Direttore tecnico, la pratica entra nella fase amministrativa. Il Responsabile dell’istruttoria amministrativa la prende in carico e la assegna a un Istruttore amministrativo."
      },
      {
        "type": "heading3",
        "id": "cap-10-ingresso-nella-fase-amministrativa-e-assegnazione-ria-assegnare-una-nuova-istruttoria-amministrativa",
        "text": "Responsabile dell’istruttoria amministrativa — assegnare una nuova istruttoria amministrativa"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Aprire la nuova istruttoria amministrativa."
      },
      {
        "type": "step",
        "number": 2,
        "text": "Prendere in carico la pratica da assegnare.",
        "label": "Prendere in carico la pratica"
      },
      {
        "type": "step",
        "number": 3,
        "text": "Consultare il fascicolo tecnico e l’Iter per verificare che la fase tecnica sia stata approvata.",
        "label": "Verificare il fascicolo tecnico"
      },
      {
        "type": "step",
        "number": 4,
        "text": "Assegnare la pratica a un Istruttore amministrativo."
      },
      {
        "type": "step",
        "number": 5,
        "text": "Confermare l’Istruttore amministrativo selezionato.",
        "label": "Confermare l’assegnazione"
      },
      {
        "type": "step",
        "number": 6,
        "text": "Verificare che la pratica sia passata all’Istruttore amministrativo assegnato.",
        "label": "Verificare l’avvenuta assegnazione"
      },
      {
        "type": "callout",
        "title": "Cosa accade dopo",
        "text": "L’Iter registra l’evento “Istruttoria assegnata”, l’Istruttore amministrativo selezionato diventa il destinatario e la pratica risulta da prendere in carico per quell’Istruttore amministrativo. Il Responsabile dell’istruttoria amministrativa non modifica direttamente i dati amministrativi nella scheda dell’Istruttore amministrativo: per assegnare, validare o rimandare la pratica utilizza le azioni dell’iter."
      },
      {
        "type": "heading2",
        "id": "cap-10-ingresso-nella-fase-amministrativa-e-assegnazione-10-1-riassegnazione-e-riapertura",
        "text": "10.1 Riassegnazione e riapertura"
      },
      {
        "type": "paragraph",
        "text": "L’assegnazione iniziale è distinta dall’avvio di una nuova istruttoria amministrativa dopo una riapertura. In quest’ultimo caso il Responsabile dell’istruttoria amministrativa seleziona l’Istruttore amministrativo che svolgerà la nuova istruttoria. Lo storico del ricorso, l’esito del CdA e i dati della riapertura restano consultabili. La procedura di riapertura è descritta nel Cap. 17.3."
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
        "text": "L’Istruttore amministrativo lavora esclusivamente le pratiche che gli sono state assegnate. Può modificare i dati amministrativi quando la pratica risulta In carico a lui, nelle sezioni e nelle fasi in cui la modifica è consentita. Le sezioni Trasgressore, Contestazioni e Dati generali servono invece alla sola consultazione dei dati riepilogati. Dopo la trasmissione al Responsabile dell’istruttoria amministrativa la scheda diventa in sola lettura; se la pratica viene rimandata, prima di poterla modificare occorre prenderla nuovamente in carico."
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
            "Consultazione dei dati anagrafici e tecnici già acquisiti nella pratica."
          ],
          [
            "Contestazioni",
            "Consultazione, in sola lettura, degli importi calcolati, degli estremi e dei valori sanzionatori e delle informazioni di base del procedimento."
          ],
          [
            "Iter approvativo",
            "Esito dell’Istruttore amministrativo, rimandi e rientri, Proposta di contestazione, bozza di determinazione e passaggi di verifica con il Responsabile dell’istruttoria amministrativa."
          ],
          [
            "Notifica",
            "Preparazione dell’Atto, modalità di pagamento, tipo e spese di notifica, protocollo ed esito della notifica."
          ],
          [
            "Pagamento",
            "Piano e posizioni di pagamento e stato del pagamento."
          ],
          [
            "Allegati",
            "Documentazione amministrativa e tecnica archiviata nella pratica."
          ],
          [
            "Anteprima fascicolo",
            "Composizione del fascicolo in base ai dati e ai documenti disponibili."
          ],
          [
            "Ricorso",
            "Registrazione del ricorso o del riesame successivo alla notifica."
          ],
          [
            "CdA",
            "Esito della decisione e, se previsto, importo e termine rideterminati."
          ],
          [
            "Riapertura",
            "Ordine e motivazione della riapertura; la compilazione è riservata al Responsabile dell’istruttoria amministrativa."
          ],
          [
            "Definizione",
            "Incasso e modalità con cui la pratica viene definita."
          ],
          [
            "Dati generali",
            "Riferimenti generali della pratica e dell’iter."
          ]
        ]
      },
      {
        "type": "paragraph",
        "text": "Le attività qui soltanto introdotte sono descritte nei capitoli dedicati: la determinazione nel Cap. 13, l’Atto di accertamento nel Cap. 14, le modalità di pagamento e gli avvisi pagoPA nel Cap. 15, la notifica e lo stato del pagamento nel Cap. 16, il ricorso, il CdA, la riapertura e la definizione nel Cap. 17, gli Allegati, il fascicolo e l’Iter nel Cap. 24."
      },
      {
        "type": "heading2",
        "id": "cap-11-istruttoria-amministrativa-dell-ia-11-2-importi-calcolati-e-dati-manuali",
        "text": "11.2 Importi calcolati e dati manuali"
      },
      {
        "type": "callout",
        "title": "Attenzione",
        "text": "Le sanzioni di base e ridotte, i danni e i riepiloghi collegati ai parametri configurati sono calcolati dal gestionale. L’Istruttore amministrativo deve compilare soltanto i dati amministrativi che l’interfaccia consente di modificare e non deve tentare di correggere manualmente valori che il gestionale ricalcola a partire dai dati della pratica e dai parametri."
      },
      {
        "type": "heading3",
        "id": "cap-11-istruttoria-amministrativa-dell-ia-ia-esprimere-l-esito-dell-istruttoria-amministrativa",
        "text": "Istruttore amministrativo — esprimere l’esito dell’istruttoria amministrativa"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Prendere in carico la pratica assegnata.",
        "label": "Prendere in carico la pratica"
      },
      {
        "type": "step",
        "number": 2,
        "text": "Controllare Trasgressore, Contestazioni, allegati e Iter e completare soltanto i dati che risultano modificabili nella fase corrente.",
        "label": "Verificare e completare i dati amministrativi"
      },
      {
        "type": "step",
        "number": 3,
        "text": "Valutare l’istruttoria amministrativa."
      },
      {
        "type": "step",
        "number": 4,
        "text": "Scegliere l’esito Conforme se il fascicolo può proseguire con la predisposizione dei documenti amministrativi; scegliere l’esito Non conforme se è necessaria un’integrazione, che viene gestita tramite il Responsabile dell’istruttoria amministrativa.",
        "label": "Scegliere Conforme o Non conforme"
      },
      {
        "type": "step",
        "number": 5,
        "text": "In caso di esito Non conforme, compilare la motivazione richiesta e confermare il rimando al Responsabile dell’istruttoria amministrativa.",
        "label": "Motivare la non conformità"
      },
      {
        "type": "step",
        "number": 6,
        "text": "In caso di esito Conforme, confermare: il gestionale registra l’esito dell’Istruttore amministrativo, genera o aggiorna automaticamente la Proposta di contestazione e avvia la fase di predisposizione della bozza di determinazione. La pratica non viene ancora trasmessa al Responsabile dell’istruttoria amministrativa.",
        "label": "Confermare l’esito conforme"
      },
      {
        "type": "step",
        "number": 7,
        "text": "Proseguire con la generazione della bozza e, soltanto quando il fascicolo è completo, utilizzare il comando Trasmetti fascicolo al Responsabile.",
        "label": "Predisporre e trasmettere il fascicolo"
      },
      {
        "type": "callout",
        "title": "Cosa accade dopo",
        "text": "La pratica passa al Responsabile dell’istruttoria amministrativa soltanto con la trasmissione esplicita del fascicolo, tramite il comando Trasmetti fascicolo al Responsabile; l’esito Conforme dell’Istruttore amministrativo, da solo, non è sufficiente."
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
        "text": "Il Responsabile dell’istruttoria amministrativa riceve il fascicolo predisposto dall’Istruttore amministrativo e decide se validarlo o se richiedere correzioni. Se le correzioni riguardano aspetti amministrativi, la pratica torna all’Istruttore amministrativo. Se riguardano aspetti tecnici, la pratica viene trasmessa al Responsabile dell’istruttoria tecnica e, completati i passaggi tecnici necessari, torna al Responsabile dell’istruttoria amministrativa, che riprende la propria verifica."
      },
      {
        "type": "heading3",
        "id": "cap-12-verifica-ria-e-cicli-di-integrazione-amministrativa-tecnica-ria-verificare-il-fascicolo-trasmesso-dall-ia",
        "text": "Responsabile dell’istruttoria amministrativa — verificare il fascicolo trasmesso dall’Istruttore amministrativo"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Prendere in carico il fascicolo da verificare.",
        "label": "Prendere in carico il fascicolo"
      },
      {
        "type": "step",
        "number": 2,
        "text": "Consultare l’Iter approvativo, il fascicolo e gli allegati; verificare l’esito espresso dall’Istruttore amministrativo e la documentazione predisposta.",
        "label": "Verificare il fascicolo amministrativo"
      },
      {
        "type": "step",
        "number": 3,
        "text": "Scegliere l’esito della verifica amministrativa.",
        "label": "Scegliere l’esito della verifica"
      },
      {
        "type": "step",
        "number": 4,
        "text": "Se il fascicolo è conforme, scegliere l’esito Conforme e confermare la validazione: la pratica torna all’Istruttore amministrativo assegnato per gli adempimenti successivi.",
        "label": "Validare il fascicolo"
      },
      {
        "type": "step",
        "number": 5,
        "text": "Se il fascicolo non è conforme, scegliere l’esito Non conforme e indicare, nelle sezioni proposte dal pannello, gli aspetti che richiedono un’integrazione o una rettifica.",
        "label": "Richiedere un’integrazione"
      },
      {
        "type": "step",
        "number": 6,
        "text": "Confermare. Il gestionale individua automaticamente il destinatario: l’Istruttore amministrativo per gli aspetti amministrativi, il Responsabile dell’istruttoria tecnica per gli aspetti tecnici.",
        "label": "Confermare il rimando"
      },
      {
        "type": "callout",
        "title": "Cosa accade dopo",
        "text": "Con esito positivo l’Iter registra l’evento “Istruttoria validata” e l’Istruttore amministrativo riceve l’allarme “Fascicolo ricevuto”. Con esito negativo la pratica viene trasmessa al ruolo competente per le correzioni richieste."
      },
      {
        "type": "callout",
        "title": "Attenzione",
        "text": "Durante la verifica dell’Atto di accertamento, l’esito Non conforme riguarda esclusivamente la correzione amministrativa dell’Atto e la pratica torna all’Istruttore amministrativo; non viene aperta una nuova integrazione tecnica dell’istruttoria. La verifica dell’Atto è descritta nel Cap. 14.2."
      },
      {
        "type": "heading2",
        "id": "cap-12-verifica-ria-e-cicli-di-integrazione-amministrativa-tecnica-12-1-integrazione-amministrativa-ia-ria",
        "text": "12.1 Integrazione amministrativa tra Istruttore amministrativo e Responsabile dell’istruttoria amministrativa"
      },
      {
        "type": "paragraph",
        "text": "Se l’Istruttore amministrativo ha espresso l’esito Non conforme, il fascicolo viene trasmesso al Responsabile dell’istruttoria amministrativa, che esamina la richiesta e trasmette l’esito all’Istruttore amministrativo. L’Istruttore amministrativo riceve l’esito, prende nuovamente in carico la pratica, effettua le correzioni e ripete la propria valutazione. L’assegnazione all’Istruttore amministrativo resta invariata."
      },
      {
        "type": "heading2",
        "id": "cap-12-verifica-ria-e-cicli-di-integrazione-amministrativa-tecnica-12-2-integrazione-tecnica-chiesta-dal-ria",
        "text": "12.2 Integrazione tecnica chiesta dal Responsabile dell’istruttoria amministrativa"
      },
      {
        "type": "paragraph",
        "text": "Quando il Responsabile dell’istruttoria amministrativa segnala un problema tecnico, la pratica viene trasmessa al Responsabile dell’istruttoria tecnica. Se la correzione può essere effettuata direttamente dal Responsabile dell’istruttoria tecnica, questi completa l’integrazione; negli altri casi la pratica segue i passaggi tecnici necessari. Dopo la correzione, l’esito passa dal Responsabile dell’istruttoria tecnica al Direttore tecnico e torna quindi al Responsabile dell’istruttoria amministrativa, che riprende la propria verifica. L’esito non viene trasmesso automaticamente all’Istruttore amministrativo."
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
        "text": "La determinazione viene predisposta in più passaggi. Il gestionale genera i documenti, verifica le versioni caricate e registra gli estremi. Alcune operazioni avvengono invece fuori dal gestionale: la conversione dei documenti da Word a PDF, la protocollazione e la firma. I documenti ottenuti da queste operazioni vengono poi caricati nel gestionale."
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
        "type": "callout",
        "title": "Proposta di contestazione e determinazione",
        "text": "Con l’esito Conforme il gestionale genera o aggiorna automaticamente la Proposta di contestazione e la inserisce nel fascicolo come bozza. L’Istruttore amministrativo non deve predisporre manualmente questo documento; deve invece predisporre la bozza di determinazione."
      },
      {
        "type": "step",
        "number": 1,
        "text": "Dopo aver espresso l’esito Conforme, verificare che la Proposta di contestazione sia stata generata o aggiornata e che la determinazione si trovi nella fase di bozza.",
        "label": "Verificare la Proposta di contestazione e la bozza"
      },
      {
        "type": "step",
        "number": 2,
        "text": "Utilizzare il comando Genera bozza per creare il documento Word della determinazione. Se i dati della pratica cambiano e il gestionale segnala che la bozza deve essere rigenerata, utilizzare il comando Rigenera bozza.",
        "label": "Generare la bozza di determinazione"
      },
      {
        "type": "step",
        "number": 3,
        "text": "Aprire il documento Word con il programma utilizzato in ufficio, completare o modificare il testo dove previsto e convertirlo in PDF.",
        "label": "Completare e convertire la bozza in PDF"
      },
      {
        "type": "step",
        "number": 4,
        "text": "Caricare il PDF della bozza di determinazione, ottenuto dalla conversione del documento Word generato dal gestionale. Il PDF può essere caricato soltanto dopo aver generato il documento Word.",
        "label": "Caricare il PDF della bozza"
      },
      {
        "type": "step",
        "number": 5,
        "text": "Controllare nell’Anteprima fascicolo che la documentazione sia completa.",
        "label": "Verificare il fascicolo"
      },
      {
        "type": "step",
        "number": 6,
        "text": "Utilizzare il comando Trasmetti fascicolo al Responsabile.",
        "label": "Trasmettere il fascicolo al Responsabile"
      },
      {
        "type": "callout",
        "title": "Cosa accade dopo",
        "text": "La pratica diventa in sola lettura per l’Istruttore amministrativo e il Responsabile dell’istruttoria amministrativa riceve l’allarme “Nuovo fascicolo ricevuto”. L’Iter registra l’evento “Fascicolo trasmesso per verifica”."
      },
      {
        "type": "heading2",
        "id": "cap-13-determinazione-13-2-validazione-ria-e-ritorno-all-ia",
        "text": "13.2 Validazione del Responsabile dell’istruttoria amministrativa e ritorno all’Istruttore amministrativo"
      },
      {
        "type": "paragraph",
        "text": "Se il Responsabile dell’istruttoria amministrativa valida il fascicolo, la pratica torna all’Istruttore amministrativo e la Proposta di contestazione viene rigenerata nella versione approvata, senza la filigrana di bozza. Se invece il Responsabile dell’istruttoria amministrativa rimanda il fascicolo, l’Istruttore amministrativo deve prendere nuovamente in carico la pratica, correggere i dati, esprimere nuovamente l’esito e rigenerare la documentazione necessaria."
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
        "text": "Dopo la validazione del Responsabile dell’istruttoria amministrativa, utilizzare il comando Trasmetti fascicolo al protocollo. Il gestionale prepara il messaggio e memorizza l’elenco esatto dei documenti che compongono il fascicolo trasmesso.",
        "label": "Trasmettere il fascicolo al protocollo"
      },
      {
        "type": "step",
        "number": 2,
        "text": "Eseguire la protocollazione con il sistema di protocollo previsto dall’Ente.",
        "label": "Protocollare il fascicolo"
      },
      {
        "type": "step",
        "number": 3,
        "text": "Quando i PDF protocollati sono disponibili, selezionarli tutti insieme, come richiesto dal gestionale.",
        "label": "Caricare i PDF protocollati"
      },
      {
        "type": "step",
        "number": 4,
        "text": "Salvare nella pratica gli estremi di protocollo acquisiti.",
        "label": "Salvare gli estremi di protocollo"
      },
      {
        "type": "callout",
        "title": "Attenzione",
        "text": "Quando la procedura richiede il caricamento dell’intero fascicolo, i documenti non devono essere caricati uno alla volta: tutti i documenti richiesti devono essere caricati insieme."
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
        "text": "Dopo aver salvato gli estremi di protocollo, utilizzare il comando Genera/Aggiorna determinazione per ottenere il documento Word aggiornato.",
        "label": "Aggiornare la determinazione con il protocollo"
      },
      {
        "type": "step",
        "number": 2,
        "text": "Convertire il documento Word in PDF con il programma utilizzato in ufficio e caricare il PDF definitivo con l’azione prevista.",
        "label": "Caricare il PDF definitivo della determinazione"
      },
      {
        "type": "step",
        "number": 3,
        "text": "Salvare gli estremi della determinazione acquisiti dal documento.",
        "label": "Salvare gli estremi della determinazione"
      },
      {
        "type": "step",
        "number": 4,
        "text": "Utilizzare il comando Prepara e-mail al Direttore per predisporre la trasmissione ai destinatari configurati nella Rubrica. La gestione dei destinatari è descritta nel Cap. 22.1.",
        "label": "Preparare l’e-mail al Direttore amministrativo"
      },
      {
        "type": "callout",
        "title": "Cosa accade dopo",
        "text": "La determinazione viene quindi adottata secondo il procedimento previsto e costituisce la base per l’Atto di accertamento. La preparazione dell’Atto è descritta nel Cap. 14."
      },
      {
        "type": "callout",
        "title": "Sostituzione del PDF della determinazione",
        "text": "Il PDF ufficiale della determinazione archiviato nella pratica può essere sostituito finché l’Atto di accertamento non ha superato i limiti previsti. La sostituzione non riapre l’istruttoria. Se la determinazione risulta adottata ma il PDF non è presente, è possibile ripristinarlo, purché il documento corrisponda agli estremi già registrati."
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
        "text": "L’Atto di accertamento si prepara dopo l’adozione della determinazione. Prima di generare la bozza dell’Atto devono essere inseriti i dati di pagamento e di notifica necessari a comporre correttamente il documento."
      },
      {
        "type": "heading2",
        "id": "cap-14-atto-di-accertamento-14-1-prerequisiti",
        "text": "14.1 Prerequisiti"
      },
      {
        "type": "bullet",
        "text": "La Modalità di pagamento deve essere compilata."
      },
      {
        "type": "bullet",
        "text": "Il Tipo di notifica deve essere compilato."
      },
      {
        "type": "bullet",
        "text": "Le Spese di notifica devono essere compilate; se non sono previste spese, inserire comunque l’importo 0,00."
      },
      {
        "type": "bullet",
        "text": "La determinazione deve trovarsi nello stato che consente di avviare la preparazione dell’Atto."
      },
      {
        "type": "paragraph",
        "text": "La predisposizione del piano di pagamento e degli eventuali avvisi pagoPA è descritta nel Cap. 15. La registrazione dell’esito della notifica, che avviene dopo il protocollo dell’Atto, è descritta nel Cap. 16.1."
      },
      {
        "type": "heading3",
        "id": "cap-14-atto-di-accertamento-ia-preparare-e-trasmettere-la-bozza-dell-atto",
        "text": "Istruttore amministrativo — preparare e trasmettere la bozza dell’Atto"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Aprire la sezione Notifica e compilare, nell’ordine consentito dall’interfaccia, Modalità di pagamento, Tipo di notifica e Spese di notifica.",
        "label": "Compilare i dati per l’Atto e la notifica"
      },
      {
        "type": "step",
        "number": 2,
        "text": "Salvare i dati inseriti.",
        "label": "Salvare i dati"
      },
      {
        "type": "step",
        "number": 3,
        "text": "Utilizzare il comando Genera bozza Word dell’Atto.",
        "label": "Generare la bozza Word dell’Atto"
      },
      {
        "type": "step",
        "number": 4,
        "text": "Aprire il documento Word con il programma utilizzato in ufficio, convertirlo in PDF e utilizzare il comando Carica la bozza PDF dell’Atto di accertamento.",
        "label": "Caricare la bozza PDF dell’Atto"
      },
      {
        "type": "step",
        "number": 5,
        "text": "Controllare la versione caricata e l’Anteprima fascicolo.",
        "label": "Verificare la bozza e il fascicolo"
      },
      {
        "type": "step",
        "number": 6,
        "text": "Utilizzare il comando Trasmetti Atto per la verifica.",
        "label": "Trasmettere l’Atto per la verifica"
      },
      {
        "type": "callout",
        "title": "Cosa accade dopo",
        "text": "Il Responsabile dell’istruttoria amministrativa riceve l’allarme “Atto di accertamento ricevuto” e prende in carico la verifica. Finché il Responsabile dell’istruttoria amministrativa non conclude la verifica, l’Istruttore amministrativo non può modificare l’Atto."
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
        "text": "Prendere in carico l’Atto da verificare.",
        "label": "Prendere in carico l’Atto"
      },
      {
        "type": "step",
        "number": 2,
        "text": "Controllare la bozza dell’Atto confrontandola con i dati della pratica e con la determinazione approvata.",
        "label": "Verificare la bozza dell’Atto"
      },
      {
        "type": "step",
        "number": 3,
        "text": "Scegliere l’esito della verifica dell’Atto.",
        "label": "Scegliere l’esito della verifica"
      },
      {
        "type": "step",
        "number": 4,
        "text": "Se l’Atto è conforme, approvarlo: la pratica torna all’Istruttore amministrativo e l’Iter registra l’evento “Atto di accertamento approvato”.",
        "label": "Approvare l’Atto"
      },
      {
        "type": "step",
        "number": 5,
        "text": "Se l’Atto non è conforme, rimandarlo all’Istruttore amministrativo per l’integrazione amministrativa, indicando la motivazione.",
        "label": "Rimandare l’Atto per correzione"
      },
      {
        "type": "callout",
        "title": "Cosa accade dopo",
        "text": "L’Istruttore amministrativo riceve l’allarme “Atto di accertamento ricevuto”."
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
        "text": "Dopo l’approvazione del Responsabile dell’istruttoria amministrativa, utilizzare il comando Genera Atto senza filigrana; se necessario, utilizzare il comando Rigenera Atto senza filigrana.",
        "label": "Generare l’Atto senza filigrana"
      },
      {
        "type": "step",
        "number": 2,
        "text": "Convertire il documento Word in PDF e caricare il PDF senza filigrana. Il gestionale verifica che il documento corrisponda ai contenuti approvati dal Responsabile dell’istruttoria amministrativa e lo identifica come la versione da sottoporre alla firma.",
        "label": "Caricare il PDF senza filigrana"
      },
      {
        "type": "step",
        "number": 3,
        "text": "Utilizzare il comando Prepara e-mail dell’Atto di accertamento al Direttore.",
        "label": "Preparare l’e-mail al Direttore amministrativo"
      },
      {
        "type": "step",
        "number": 4,
        "text": "Dopo la firma digitale, che avviene fuori dal gestionale, utilizzare il comando Carica il PDF firmato digitalmente dal Direttore.",
        "label": "Caricare l’Atto firmato digitalmente"
      },
      {
        "type": "step",
        "number": 5,
        "text": "Utilizzare il comando Trasmetti l’Atto firmato al protocollo.",
        "label": "Trasmettere l’Atto al protocollo"
      },
      {
        "type": "step",
        "number": 6,
        "text": "Quando i documenti protocollati sono disponibili, caricare tutti insieme i PDF richiesti.",
        "label": "Caricare i documenti protocollati"
      },
      {
        "type": "step",
        "number": 7,
        "text": "Salvare gli estremi di protocollo acquisiti per l’Atto.",
        "label": "Salvare gli estremi di protocollo"
      },
      {
        "type": "callout",
        "title": "Attenzione",
        "text": "La firma e la protocollazione avvengono fuori dal gestionale. Una volta completate, le versioni firmate e protocollate devono essere caricate nel gestionale."
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
        "text": "La preparazione del pagamento dipende dal totale dovuto e dallo stato dell’Atto. Finché l’Atto non è bloccato dai passaggi successivi, l’Istruttore amministrativo può predisporre il piano di pagamento e i relativi documenti."
      },
      {
        "type": "heading2",
        "id": "cap-15-modalita-di-pagamento-e-avvisi-pagopa-15-1-modalita-supportate",
        "text": "15.1 Modalità supportate"
      },
      {
        "type": "paragraph",
        "text": "Le modalità di pagamento disponibili sono pagoPA, bonifico, modalità mista e altro. Le posizioni da compilare dipendono dalla modalità scelta. Se il totale dovuto è pari a zero, il piano di pagamento non è richiesto."
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
        "text": "Compilare il campo Numero rate concesse. Il valore 0 indica il pagamento in un’unica soluzione; il valore 1 non costituisce un piano rateale valido; con un valore pari o superiore a 2 il gestionale crea l’unica soluzione e le rate numerate.",
        "label": "Impostare il numero di rate"
      },
      {
        "type": "step",
        "number": 2,
        "text": "Utilizzare il comando Imposta piano; se esistono già posizioni modificabili, utilizzare il comando Aggiorna piano.",
        "label": "Creare o aggiornare il piano"
      },
      {
        "type": "step",
        "number": 3,
        "text": "Per ciascuna posizione compilare Modalità, Importo dovuto e Scadenza. Se la modalità scelta lo richiede, aggiungere anche i riferimenti di pagamento disponibili.",
        "label": "Compilare le posizioni di pagamento"
      },
      {
        "type": "step",
        "number": 4,
        "text": "Dopo aver modificato una posizione, utilizzare il comando Aggiorna della stessa posizione.",
        "label": "Aggiornare una posizione"
      },
      {
        "type": "step",
        "number": 5,
        "text": "Quando l’interfaccia lo richiede, caricare il documento collegato alla posizione, ad esempio l’avviso pagoPA o il bollettino.",
        "label": "Allegare il documento di pagamento"
      },
      {
        "type": "step",
        "number": 6,
        "text": "Verificare nel riepilogo che tutte le posizioni risultino complete e che la somma degli importi corrisponda al totale da pagare; quindi salvare la pratica.",
        "label": "Verificare e salvare il piano"
      },
      {
        "type": "callout",
        "title": "Attenzione",
        "text": "Il piano non può essere ricostruito quando sulle posizioni risultano già registrati pagamenti o altri dati che verrebbero persi con la sostituzione delle posizioni."
      },
      {
        "type": "heading2",
        "id": "cap-15-modalita-di-pagamento-e-avvisi-pagopa-15-3-caricamento-batch-degli-avvisi-pagopa",
        "text": "15.3 Caricamento degli avvisi pagoPA"
      },
      {
        "type": "heading3",
        "id": "cap-15-modalita-di-pagamento-e-avvisi-pagopa-ia-caricare-gli-avvisi-pagopa",
        "text": "Istruttore amministrativo — caricare gli avvisi pagoPA"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Selezionare la modalità pagoPA e utilizzare il comando Carica avvisi pagoPA.",
        "label": "Caricare gli avvisi pagoPA"
      },
      {
        "type": "step",
        "number": 2,
        "text": "Selezionare insieme tutti i PDF degli avvisi: l’avviso per l’unica soluzione e, se previste, gli avvisi di tutte le rate.",
        "label": "Selezionare tutti gli avvisi"
      },
      {
        "type": "step",
        "number": 3,
        "text": "Controllare il piano pagoPA ricostruito automaticamente dal gestionale a partire dagli avvisi caricati.",
        "label": "Verificare il piano pagoPA"
      },
      {
        "type": "step",
        "number": 4,
        "text": "Salvare il piano pagoPA nella pratica.",
        "label": "Salvare il piano pagoPA"
      },
      {
        "type": "callout",
        "title": "Cosa accade dopo",
        "text": "Quando tutte le posizioni sono complete, lo stato del pagamento diventa “Generato”; se il piano non è completo, lo stato indica che il piano deve essere completato."
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
        "text": "Utilizzare nuovamente il comando Carica avvisi pagoPA e selezionare l’intero nuovo gruppo di avvisi.",
        "label": "Caricare il nuovo set di avvisi"
      },
      {
        "type": "step",
        "number": 2,
        "text": "Leggere il riepilogo della sostituzione: il gestionale indica se sostituirà la sola posizione attuale oppure più posizioni, con i relativi documenti.",
        "label": "Verificare cosa verrà sostituito"
      },
      {
        "type": "step",
        "number": 3,
        "text": "Confermare con il comando Sostituisci avvisi.",
        "label": "Confermare la sostituzione"
      },
      {
        "type": "step",
        "number": 4,
        "text": "Controllare il nuovo piano ricostruito dal gestionale.",
        "label": "Verificare il nuovo piano"
      },
      {
        "type": "step",
        "number": 5,
        "text": "Salvare il nuovo piano pagoPA.",
        "label": "Salvare il nuovo piano"
      },
      {
        "type": "callout",
        "title": "Attenzione",
        "text": "La sostituzione non è consentita quando sulle posizioni risultano già registrati dati di pagamento che non devono essere persi."
      },
      {
        "type": "paragraph",
        "text": "L’aggiornamento dello stato del pagamento dopo il perfezionamento della notifica è descritto nel Cap. 16.2; la registrazione dell’incasso e la definizione finale della pratica sono descritte nel Cap. 17.4."
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
        "text": "Le registrazioni nelle sezioni Protocollo e notifica e l’aggiornamento dello stato del pagamento sono effettuati dall’Istruttore amministrativo. Il Responsabile dell’istruttoria amministrativa può consultare questi dati, ma non può modificarli nella scheda amministrativa."
      },
      {
        "type": "heading2",
        "id": "cap-16-protocollo-notifica-e-pagamento-16-1-registrare-l-esito-della-notifica",
        "text": "16.1 Registrare l’esito della notifica"
      },
      {
        "type": "lead",
        "text": "La sezione Protocollo e notifica può essere compilata soltanto dopo che l’Atto firmato è stato restituito dal protocollo con numero e data di protocollo completi."
      },
      {
        "type": "heading3",
        "id": "cap-16-protocollo-notifica-e-pagamento-ia-registrare-la-notifica",
        "text": "Istruttore amministrativo — registrare la notifica"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Verificare che gli estremi di protocollo dell’Atto siano presenti; questi dati sono in sola lettura.",
        "label": "Verificare gli estremi di protocollo"
      },
      {
        "type": "step",
        "number": 2,
        "text": "Aprire il menu a tendina Esito notifica e selezionare l’esito tra quelli disponibili.",
        "label": "Selezionare l’esito della notifica"
      },
      {
        "type": "step",
        "number": 3,
        "text": "Utilizzare il comando Carica documentazione esito notifica e caricare il PDF protocollato che prova l’esito della notifica, ad esempio la relata di notifica, le ricevute PEC, l’avviso di ricevimento postale o un’altra prova prevista.",
        "label": "Caricare la documentazione della notifica"
      },
      {
        "type": "step",
        "number": 4,
        "text": "Salvare l’esito della notifica e gli estremi acquisiti dal documento.",
        "label": "Salvare l’esito della notifica"
      },
      {
        "type": "callout",
        "title": "Cosa accade dopo",
        "text": "Con gli esiti “Notificata” o “Compiuta giacenza” diventano disponibili le attività successive relative al pagamento, al ricorso e alla definizione della pratica. Con gli esiti “Non notificata” o “Irreperibile” queste attività non sono ancora disponibili. Se viene scelto l’esito “Altro”, è necessario descrivere l’esito e registrare successivamente un esito conclusivo. Le attività successive alla notifica sono descritte nel Cap. 17."
      },
      {
        "type": "heading2",
        "id": "cap-16-protocollo-notifica-e-pagamento-16-2-stato-del-pagamento",
        "text": "16.2 Stato del pagamento"
      },
      {
        "type": "callout",
        "title": "Stato del pagamento e incasso",
        "text": "Dopo il perfezionamento della notifica, il pannello Pagamento mostra in sola lettura il piano e il totale e consente di aggiornare lo stato del pagamento e le note. La registrazione dell’importo effettivamente incassato, della data e dei riferimenti avviene invece nella scheda Definizione, sezione Incasso."
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
            "Esiste un importo dovuto che non è stato pagato per intero e la scadenza è vicina oppure è già superata."
          ],
          [
            "Ricorso presentato oltre il termine",
            "È registrato un ricorso presentato dopo il termine previsto."
          ],
          [
            "Termine ricorso in scadenza / scaduto",
            "Non risulta presentato alcun ricorso e il termine per presentarlo è vicino oppure è già superato."
          ],
          [
            "Scadenza rideterminata in scadenza / scaduta",
            "A seguito di un esito successivo esiste un importo o un termine rideterminato, e la relativa scadenza è vicina oppure è già superata."
          ],
          [
            "Pratica da definire",
            "I termini successivi alla notifica sono trascorsi, ma la pratica non è ancora stata definita."
          ]
        ]
      },
      {
        "type": "paragraph",
        "text": "Gli allarmi di scadenza vengono segnalati con 5 giorni di preavviso. La gestione e il significato generale degli allarmi sono descritti nel Cap. 25.1."
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
        "text": "Le sezioni Ricorso, CdA e Definizione sono compilate dall’Istruttore amministrativo. Il Responsabile dell’istruttoria amministrativa e il Direttore amministrativo possono soltanto consultarle. La sezione Riapertura segue invece una regola specifica, descritta nel Cap. 17.3."
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
        "text": "Dopo il perfezionamento della notifica, aprire la scheda Ricorso.",
        "label": "Aprire la sezione Ricorso"
      },
      {
        "type": "step",
        "number": 2,
        "text": "Indicare se il ricorso o l’istanza è stato presentato e, quando i campi sono applicabili, compilare la data di presentazione, il protocollo, il soggetto che lo ha presentato con il relativo codice fiscale o partita IVA, l’eventuale sospensione del pagamento, l’oggetto o la motivazione e le note.",
        "label": "Compilare i dati del ricorso"
      },
      {
        "type": "step",
        "number": 3,
        "text": "Verificare il termine indicato dal gestionale e l’eventuale segnalazione di presentazione oltre il termine.",
        "label": "Verificare i termini"
      },
      {
        "type": "step",
        "number": 4,
        "text": "Salvare i dati del ricorso.",
        "label": "Salvare il ricorso"
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
        "text": "Aprire la scheda CdA.",
        "label": "Aprire la sezione CdA"
      },
      {
        "type": "step",
        "number": 2,
        "text": "Registrare l’esito e gli estremi della decisione o dell’atto che la formalizza.",
        "label": "Registrare l’esito del CdA"
      },
      {
        "type": "step",
        "number": 3,
        "text": "Se la decisione ridetermina l’importo o la scadenza, compilare i nuovi valori e le relative note.",
        "label": "Aggiornare importo o scadenza"
      },
      {
        "type": "step",
        "number": 4,
        "text": "Quando previsto, registrare l’operatore e la data di definizione dell’esito, quindi salvare.",
        "label": "Completare e salvare l’esito"
      },
      {
        "type": "step",
        "number": 5,
        "text": "Se la decisione del CdA richiede una nuova istruttoria amministrativa, passare alla scheda Riapertura.",
        "label": "Avviare la riapertura, se richiesta"
      },
      {
        "type": "heading2",
        "id": "cap-17-ricorso-cda-riapertura-e-definizione-17-3-riapertura-amministrativa",
        "text": "17.3 Riapertura amministrativa"
      },
      {
        "type": "paragraph",
        "text": "La scheda Riapertura è consultabile nella fase amministrativa, ma la sua compilazione è riservata al Responsabile dell’istruttoria amministrativa. La scheda registra che, dopo l’esito del CdA e su indicazione del Direttore amministrativo, deve essere avviata una nuova istruttoria amministrativa; lo storico precedente viene conservato."
      },
      {
        "type": "heading3",
        "id": "cap-17-ricorso-cda-riapertura-e-definizione-ria-riaprire-e-avviare-un-nuovo-ciclo-amministrativo",
        "text": "Responsabile dell’istruttoria amministrativa — riaprire e avviare una nuova istruttoria amministrativa"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Aprire la scheda Riapertura e registrare l’ordine di riapertura, indicando la causa, la data, il soggetto che ha disposto la riapertura, gli estremi dell’autorizzazione e la motivazione.",
        "label": "Registrare l’ordine di riapertura"
      },
      {
        "type": "step",
        "number": 2,
        "text": "Salvare la riapertura."
      },
      {
        "type": "step",
        "number": 3,
        "text": "Tornare a Gestisci istruttoria e utilizzare il comando Avvia nuova istruttoria amministrativa.",
        "label": "Avviare una nuova istruttoria amministrativa"
      },
      {
        "type": "step",
        "number": 4,
        "text": "Selezionare l’Istruttore amministrativo che svolgerà la nuova istruttoria e confermare.",
        "label": "Assegnare il nuovo Istruttore amministrativo"
      },
      {
        "type": "step",
        "number": 5,
        "text": "Verificare che la pratica risulti da prendere in carico per l’Istruttore amministrativo incaricato della nuova istruttoria.",
        "label": "Verificare la nuova assegnazione"
      },
      {
        "type": "callout",
        "title": "Cosa accade dopo",
        "text": "I dati necessari alla nuova istruttoria vengono riaperti, mentre lo storico del ricorso, del CdA e della riapertura resta consultabile nell’Iter e nelle relative sezioni. La consultazione dello storico nell’Iter è descritta nel Cap. 24.3."
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
        "text": "Aprire la scheda Definizione.",
        "label": "Aprire la sezione Definizione"
      },
      {
        "type": "step",
        "number": 2,
        "text": "Nella sezione Incasso compilare insieme l’importo incassato, la data e i riferimenti. Il gestionale richiede che i tre dati siano compilati insieme e non accetta che ne venga compilato uno solo.",
        "label": "Registrare l’incasso"
      },
      {
        "type": "step",
        "number": 3,
        "text": "Controllare lo stato del pagamento proposto dal gestionale: un importo incassato pari o superiore al totale dovuto porta allo stato Pagato; un importo maggiore di zero ma inferiore al totale porta allo stato Parziale. Le eventuali eccedenze vengono segnalate.",
        "label": "Verificare lo stato del pagamento"
      },
      {
        "type": "step",
        "number": 4,
        "text": "Selezionare la modalità di definizione che corrisponde all’esito effettivo del procedimento, ad esempio Pagata, Archiviata, Annullata, Avviata a riscossione o Definita dopo ricorso.",
        "label": "Selezionare la modalità di definizione"
      },
      {
        "type": "step",
        "number": 5,
        "text": "Completare le note e salvare.",
        "label": "Salvare la definizione"
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
        "text": "La Nota spese si utilizza per i casi collegati agli artt. 8, 27, 30 e 39 del Regolamento. Non è un semplice campo in cui inserire un importo: si compone con voci di prezzario, quantità e regole specifiche per le attrezzature."
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
        "text": "Aprire la pratica nella lavorazione tecnica e selezionare la scheda Nota spese.",
        "label": "Aprire la Nota spese"
      },
      {
        "type": "step",
        "number": 2,
        "text": "Selezionare la violazione alla quale associare la spesa. Per l’Art. 30, quando richiesto, selezionare anche l’attrezzatura interessata.",
        "label": "Selezionare la casistica"
      },
      {
        "type": "step",
        "number": 3,
        "text": "Utilizzare il comando Sfoglia prezzario. Il comando è disponibile soltanto dopo il primo salvataggio della pratica e soltanto se è stata selezionata una violazione che prevede la Nota spese; non è utilizzabile quando la pratica è in sola lettura.",
        "label": "Aprire il prezzario"
      },
      {
        "type": "step",
        "number": 4,
        "text": "Nel Browser nota spese cercare le voci, aggiungerle al carrello e confermare la selezione.",
        "label": "Selezionare le voci di prezzario"
      },
      {
        "type": "step",
        "number": 5,
        "text": "Dopo aver confermato le voci nel Browser nota spese, inserire nella Nota spese le quantità e completare gli eventuali dati specifici richiesti.",
        "label": "Compilare quantità e dati specifici"
      },
      {
        "type": "step",
        "number": 6,
        "text": "Controllare il riepilogo per categoria, le spese generali e il totale.",
        "label": "Verificare il riepilogo"
      },
      {
        "type": "step",
        "number": 7,
        "text": "Salvare la Nota spese."
      },
      {
        "type": "callout",
        "title": "Cosa accade dopo",
        "text": "Le voci selezionate vengono memorizzate nella Nota spese della pratica e sono consultabili anche dal Dettaglio pratica."
      },
      {
        "type": "callout",
        "title": "Consultazione del Responsabile dell’istruttoria tecnica",
        "text": "Il Responsabile dell’istruttoria tecnica può consultare la Nota spese durante la propria fase di validazione, ma non può modificarne le categorie, le voci, le quantità o gli allegati."
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
            "Materiali impiegati nelle lavorazioni, valorizzati con le voci disponibili nel prezzario."
          ],
          [
            "Risorse umane",
            "Costi del personale e della manodopera previsti dalle voci disponibili nel prezzario."
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
            "Categoria utilizzata nei casi dell’Art. 30 relativi all’attrezzatura non recuperabile; nel riepilogo il relativo importo compare come Risarcimento attrezzatura."
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
        "text": "Attrezzatura recuperabile: i costi di riparazione vengono calcolati per ciascuna attrezzatura. È possibile registrare più attrezzature dello stesso tipo, ciascuna con una propria numerazione."
      },
      {
        "type": "bullet",
        "text": "Le matricole delle tessere elettroniche soggette a controllo devono essere composte da 5 cifre."
      },
      {
        "type": "bullet",
        "text": "Quando è previsto dalla configurazione, il gestionale applica la decurtazione della cauzione e la evidenzia nel riepilogo."
      },
      {
        "type": "bullet",
        "text": "Attrezzatura non recuperabile: si seleziona l’attrezzatura interessata e, al posto dei costi di riparazione, si utilizza la voce di risarcimento dell’attrezzatura."
      },
      {
        "type": "bullet",
        "text": "Nel riepilogo la Decurtazione cauzione e il Risarcimento attrezzatura sono indicati separatamente."
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
        "text": "Scegliere il prezzario da consultare e cercare la voce per codice, per descrizione oppure attraverso la struttura gerarchica delle voci.",
        "label": "Scegliere il prezzario"
      },
      {
        "type": "step",
        "number": 2,
        "text": "Selezionare una voce e utilizzare il comando Aggiungi. La stessa voce non può essere aggiunta due volte al carrello.",
        "label": "Aggiungere una voce"
      },
      {
        "type": "step",
        "number": 3,
        "text": "Controllare il numero delle voci presenti nel carrello.",
        "label": "Controllare il carrello"
      },
      {
        "type": "step",
        "number": 4,
        "text": "Per rimuovere una singola voce utilizzare il comando di eliminazione nel carrello; per rimuovere tutte le voci utilizzare il comando Svuota e confermare.",
        "label": "Rimuovere o svuotare le voci"
      },
      {
        "type": "step",
        "number": 5,
        "text": "Utilizzare il comando Conferma, che riporta tra parentesi il numero delle voci selezionate, per inserire le voci nella Nota spese; utilizzare il comando Annulla per uscire senza applicare la selezione.",
        "label": "Confermare la selezione"
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
        "text": "La Gestione prezzari è di competenza del Responsabile dell’istruttoria tecnica, mentre la gestione dei Parametri sanzionatori è di competenza del Responsabile dell’istruttoria amministrativa. Il capitolo riunisce le due funzioni perché entrambe concorrono alla determinazione degli importi utilizzati nel procedimento. I paragrafi 19.1, 19.2, 19.3 e 19.5 riguardano la Gestione prezzari; il paragrafo 19.4 indica quali parametri sono gestiti da ciascun ruolo."
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
        "text": "Aprire la vista Gestione prezzari e selezionare la sezione Prezzari.",
        "label": "Aprire la gestione dei prezzari"
      },
      {
        "type": "step",
        "number": 2,
        "text": "Selezionare il file ZIP del prezzario regionale. Il file deve contenere i file CSV previsti per l’anagrafica degli articoli e per l’analisi del prezzario.",
        "label": "Selezionare il file ZIP"
      },
      {
        "type": "step",
        "number": 3,
        "text": "Controllare o compilare i campi Anno e Descrizione; il gestionale può proporre questi valori leggendo il contenuto del file. L’anno deve essere indicato nel formato richiesto dal campo.",
        "label": "Verificare Anno e Descrizione"
      },
      {
        "type": "step",
        "number": 4,
        "text": "Scegliere se rendere attivo il prezzario subito dopo l’importazione.",
        "label": "Scegliere se attivare il prezzario"
      },
      {
        "type": "step",
        "number": 5,
        "text": "Avviare l’importazione. Se è già presente un prezzario regionale dello stesso anno, confermare la sostituzione: i dati del prezzario precedente vengono eliminati prima del caricamento del nuovo file.",
        "label": "Importare il prezzario"
      },
      {
        "type": "step",
        "number": 6,
        "text": "Al termine dell’importazione, controllare nella tabella l’anno, il tipo, la descrizione, lo stato, il nome del file e il numero degli articoli e delle analisi importati.",
        "label": "Verificare l’importazione"
      },
      {
        "type": "step",
        "number": 7,
        "text": "Utilizzare il comando di attivazione per rendere attivo il prezzario desiderato. Per ciascun tipo di prezzario il gestionale mantiene attiva una sola importazione.",
        "label": "Attivare il prezzario"
      },
      {
        "type": "step",
        "number": 8,
        "text": "Per eliminare un prezzario importato, disattivarlo e quindi confermare l’eliminazione.",
        "label": "Eliminare un import"
      },
      {
        "type": "heading2",
        "id": "cap-19-prezzari-e-nuovi-prezzi-19-2-creare-un-nuovo-prezzo",
        "text": "19.2 Creare un nuovo prezzo"
      },
      {
        "type": "lead",
        "text": "La creazione dei nuovi prezzi avviene nella sezione Analisi prezzi. La sezione Voci interne serve principalmente a consultare e modificare i nuovi prezzi già creati."
      },
      {
        "type": "heading3",
        "id": "cap-19-prezzari-e-nuovi-prezzi-rit-admin-creare-un-nuovo-prezzo-elementare",
        "text": "Responsabile dell’istruttoria tecnica — creare un nuovo prezzo elementare"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Aprire la vista Gestione prezzari e selezionare la sezione Analisi prezzi.",
        "label": "Aprire Analisi prezzi"
      },
      {
        "type": "step",
        "number": 2,
        "text": "Creare un nuovo prezzo e, nel menu a tendina Tipologia, selezionare il valore ELEMENTARE.",
        "label": "Creare un prezzo elementare"
      },
      {
        "type": "step",
        "number": 3,
        "text": "Compilare il campo Anno listino.",
        "label": "Indicare l’anno del listino"
      },
      {
        "type": "step",
        "number": 4,
        "text": "Selezionare Super capitolo, Capitolo e Sub capitolo tra i valori configurati nei rispettivi menu a tendina. Il gestionale genera il Codice del nuovo prezzo, che resta in sola lettura.",
        "label": "Definire la classificazione"
      },
      {
        "type": "step",
        "number": 5,
        "text": "Compilare i campi Descrizione, Unità di misura e Prezzo unitario e aggiungere le eventuali Note.",
        "label": "Compilare i dati del prezzo"
      },
      {
        "type": "step",
        "number": 6,
        "text": "Lasciare selezionata l’opzione Attivo se la voce deve essere subito utilizzabile come componente di altri prezzi.",
        "label": "Impostare lo stato Attivo"
      },
      {
        "type": "step",
        "number": 7,
        "text": "Salvare il nuovo prezzo elementare.",
        "label": "Salvare il prezzo elementare"
      },
      {
        "type": "callout",
        "title": "Cosa accade dopo",
        "text": "Il nuovo prezzo elementare diventa consultabile e, se è attivo, può essere selezionato come componente di altri prezzi analizzati."
      },
      {
        "type": "heading3",
        "id": "cap-19-prezzari-e-nuovi-prezzi-rit-admin-creare-un-nuovo-prezzo-analizzato",
        "text": "Responsabile dell’istruttoria tecnica — creare un nuovo prezzo analizzato"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Aprire la vista Gestione prezzari, selezionare la sezione Analisi prezzi e creare un nuovo prezzo.",
        "label": "Creare un nuovo prezzo"
      },
      {
        "type": "step",
        "number": 2,
        "text": "Nel menu a tendina Tipologia selezionare il valore ANALIZZATA.",
        "label": "Scegliere la tipologia Analizzata"
      },
      {
        "type": "step",
        "number": 3,
        "text": "Compilare Anno listino, la classificazione (Super capitolo, Capitolo e Sub capitolo), Descrizione, Unità di misura e Note. Il Prezzo unitario non deve essere inserito manualmente, perché viene calcolato dal gestionale come somma degli importi delle righe dell’analisi.",
        "label": "Compilare i dati generali"
      },
      {
        "type": "step",
        "number": 4,
        "text": "Salvare i dati generali per creare il nuovo prezzo.",
        "label": "Salvare l’intestazione"
      },
      {
        "type": "step",
        "number": 5,
        "text": "Nella sezione dell’analisi utilizzare il comando Nuova riga.",
        "label": "Aggiungere una riga di analisi"
      },
      {
        "type": "step",
        "number": 6,
        "text": "Nel menu a tendina Origine selezionare la provenienza della componente: REGIONALE, INTERNO oppure NUOVO PREZZO.",
        "label": "Scegliere l’origine della componente"
      },
      {
        "type": "step",
        "number": 7,
        "text": "Cercare la voce da utilizzare digitando almeno il numero di caratteri richiesto, selezionarla e verificare il codice, la descrizione, l’unità di misura e il prezzo unitario proposti.",
        "label": "Selezionare la voce sorgente"
      },
      {
        "type": "step",
        "number": 8,
        "text": "Inserire una Quantità maggiore di zero e, se utile, le Note. Salvare la riga; l’importo della riga viene calcolato come Quantità × Prezzo unitario.",
        "label": "Compilare e salvare la riga"
      },
      {
        "type": "step",
        "number": 9,
        "text": "Ripetere l’operazione per tutte le componenti. Le righe possono essere modificate, eliminate e spostate verso l’alto o verso il basso per cambiarne l’ordine.",
        "label": "Completare le componenti"
      },
      {
        "type": "step",
        "number": 10,
        "text": "Controllare il Prezzo unitario del nuovo prezzo, che viene ricalcolato come somma degli importi di tutte le righe.",
        "label": "Verificare il prezzo complessivo"
      },
      {
        "type": "callout",
        "title": "Attenzione",
        "text": "Un prezzo non può essere utilizzato come componente di sé stesso. Un nuovo prezzo non attivo resta consultabile, ma non può essere selezionato come nuova componente. Un prezzo già utilizzato come componente in altre analisi non può essere eliminato."
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
        "text": "Aprire la vista Gestione prezzari e selezionare la sezione Voci interne.",
        "label": "Aprire Voci interne"
      },
      {
        "type": "step",
        "number": 2,
        "text": "Cercare e selezionare il nuovo prezzo da modificare.",
        "label": "Selezionare il prezzo da modificare"
      },
      {
        "type": "step",
        "number": 3,
        "text": "Modificare Descrizione, Unità di misura, l’opzione Attivo e le Note. Per i prezzi ELEMENTARI è possibile modificare anche il prezzo unitario; per i prezzi ANALIZZATI il prezzo continua a essere calcolato dall’analisi.",
        "label": "Modificare i dati del prezzo"
      },
      {
        "type": "step",
        "number": 4,
        "text": "Salvare le modifiche."
      },
      {
        "type": "step",
        "number": 5,
        "text": "Per eliminare la voce utilizzare il comando Elimina. Se la voce è già utilizzata come componente di altre analisi, il gestionale non consente l’eliminazione.",
        "label": "Eliminare il prezzo"
      },
      {
        "type": "heading2",
        "id": "cap-19-prezzari-e-nuovi-prezzi-19-4-parametri",
        "text": "19.4 Parametri"
      },
      {
        "type": "paragraph",
        "text": "La pagina Parametri mostra le categorie di parametri disponibili per il proprio ruolo. Il Responsabile dell’istruttoria tecnica gestisce i Parametri nota spese e i Prezzi delle attrezzature; il Responsabile dell’istruttoria amministrativa gestisce Sanzioni, riduzioni e cauzione."
      },
      {
        "type": "heading3",
        "id": "cap-19-prezzari-e-nuovi-prezzi-creare-o-modificare-un-parametro",
        "text": "Creare o modificare un parametro"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Il Responsabile dell’istruttoria tecnica apre la vista Gestione prezzari e seleziona la sezione Parametri; il Responsabile dell’istruttoria amministrativa apre la vista Parametri sanzionatori.",
        "label": "Aprire la gestione dei parametri"
      },
      {
        "type": "step",
        "number": 2,
        "text": "Selezionare l’archivio di parametri da consultare.",
        "label": "Selezionare l’archivio"
      },
      {
        "type": "step",
        "number": 3,
        "text": "Utilizzare il comando Nuovo per creare un parametro oppure il comando Modifica sulla riga di un parametro esistente.",
        "label": "Creare o modificare un parametro"
      },
      {
        "type": "step",
        "number": 4,
        "text": "Compilare la descrizione, l’anno di riferimento, il valore numerico o testuale previsto per il tipo di parametro, l’opzione Attivo, il periodo di validità e le note.",
        "label": "Compilare i dati del parametro"
      },
      {
        "type": "step",
        "number": 5,
        "text": "Per i Prezzi delle attrezzature selezionare il tipo di attrezzatura e indicare il Valore unitario in euro.",
        "label": "Compilare i prezzi delle attrezzature"
      },
      {
        "type": "step",
        "number": 6,
        "text": "Salvare il parametro ed eventualmente esportare l’elenco.",
        "label": "Salvare il parametro"
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
        "text": "Selezionare il prezzario da consultare: Prezzario regionale, Prezzario interno (se presente nei dati), Nuovi prezzi oppure Attrezzature (risarcimento Art. 30).",
        "label": "Scegliere la sorgente"
      },
      {
        "type": "step",
        "number": 3,
        "text": "Cercare una voce di prezzario.",
        "label": "Cercare una voce"
      },
      {
        "type": "step",
        "number": 4,
        "text": "Selezionare la famiglia, il capitolo o il sottocapitolo per restringere l’elenco; per tornare all’elenco completo utilizzare il comando Tutte le voci.",
        "label": "Filtrare per classificazione"
      },
      {
        "type": "step",
        "number": 5,
        "text": "Se utile, ordinare l’elenco per codice, descrizione, unità di misura o prezzo.",
        "label": "Ordinare l’elenco"
      },
      {
        "type": "step",
        "number": 6,
        "text": "Selezionare una voce per aprirne il dettaglio. Se per la voce è disponibile l’analisi, è possibile consultarne le componenti e i relativi importi.",
        "label": "Aprire il dettaglio della voce"
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
        "text": "La vista Mappa consente di consultare il territorio attraverso tre ricerche: Dati catastali, Opere CBSM e Infrazioni."
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
        "text": "Aprire la vista Mappa e selezionare la ricerca Dati catastali.",
        "label": "Aprire Dati catastali"
      },
      {
        "type": "step",
        "number": 2,
        "text": "Aprire il menu a tendina Comune e selezionare il Comune, che è un criterio obbligatorio.",
        "label": "Selezionare il Comune"
      },
      {
        "type": "step",
        "number": 3,
        "text": "Restringere progressivamente la ricerca con i menu a tendina Sezione, Foglio e Mappale. I menu sono collegati tra loro: ciascuno mostra soltanto i valori compatibili con le scelte effettuate nei menu precedenti.",
        "label": "Impostare Sezione, Foglio e Mappale"
      },
      {
        "type": "step",
        "number": 4,
        "text": "Eseguire la ricerca della particella catastale."
      },
      {
        "type": "step",
        "number": 5,
        "text": "Consultare i risultati e la particella evidenziata sulla mappa. Prima di eseguire una nuova ricerca, azzerare i criteri impostati.",
        "label": "Consultare i risultati"
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
        "text": "Selezionare la ricerca Opere CBSM.",
        "label": "Aprire Opere CBSM"
      },
      {
        "type": "step",
        "number": 2,
        "text": "Impostare uno o più criteri tra Stato, Tipo e Nome. Anche in questo caso i menu a tendina sono collegati tra loro e mostrano soltanto i valori compatibili con le scelte già effettuate.",
        "label": "Impostare i criteri di ricerca"
      },
      {
        "type": "step",
        "number": 3,
        "text": "Eseguire la ricerca delle opere che corrispondono ai criteri impostati."
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
        "text": "Selezionare la ricerca Infrazioni.",
        "label": "Aprire Infrazioni"
      },
      {
        "type": "step",
        "number": 2,
        "text": "Impostare i criteri di interesse tra Articolo violato, Tipo pratica, Numero pratica, Anno, Nominativo / Ragione sociale e CF / P. IVA. Se il Tipo pratica resta impostato su Tutti e non viene indicato alcun altro criterio, la ricerca restituisce tutte le pratiche che l’utente è autorizzato a vedere.",
        "label": "Impostare i criteri"
      },
      {
        "type": "step",
        "number": 3,
        "text": "Per cercare una pratica in base al numero, aprire il menu a tendina Tipo pratica e selezionare il tipo di pratica di interesse, fra Rilevazione, Rapporto tecnico e Atto di accertamento; quindi scrivere il numero nel campo Numero pratica e, se utile, l’anno nel campo Anno.",
        "label": "Cercare per numero"
      },
      {
        "type": "bullet",
        "text": "Il numero della pratica deve essere scritto con le sole cifre. La ricerca avviene sul numero esatto e non su parte di esso: scrivendo 8 viene trovata la pratica numero 8, ma non le pratiche 18 o 81. Per le rilevazioni l’anno da indicare è quello della data di rilevazione; per i rapporti tecnici e gli atti di accertamento è l’anno che compare nel numero della pratica (ad esempio 2026 nel numero R-25/2026)."
      },
      {
        "type": "bullet",
        "text": "Se nel menu a tendina Tipo pratica si seleziona Rapporto tecnico o Atto di accertamento senza indicare alcun numero, la ricerca restituisce tutte le pratiche per le quali è stato redatto, rispettivamente, un rapporto tecnico o un atto di accertamento."
      },
      {
        "type": "bullet",
        "text": "Il menu a tendina Articolo violato contiene soltanto gli articoli le cui violazioni prevedono la geolocalizzazione, cioè l’indicazione della posizione sulla mappa."
      },
      {
        "type": "step",
        "number": 4,
        "text": "Eseguire la ricerca con il pulsante Cerca.",
        "label": "Eseguire la ricerca"
      },
      {
        "type": "step",
        "number": 5,
        "text": "Leggere il messaggio che compare sotto i campi di ricerca. Il messaggio indica quante pratiche sono state trovate e, se alcune pratiche non sono visualizzate sulla mappa, ne spiega il motivo; ad esempio: “26 pratiche trovate: 19 visualizzate in mappa perché le loro violazioni prevedono la geolocalizzazione, 7 non visualizzate perché le loro violazioni non la prevedono.” Quando i risultati sono molto numerosi, il messaggio indica anche quante pratiche sono effettivamente visualizzate sulla mappa.",
        "label": "Leggere l’esito della ricerca"
      },
      {
        "type": "step",
        "number": 6,
        "text": "Prima di eseguire una nuova ricerca, azzerare i criteri precedenti se non devono essere mantenuti.",
        "label": "Azzerare la ricerca"
      },
      {
        "type": "callout",
        "title": "Attenzione",
        "text": "La ricerca Infrazioni restituisce soltanto le pratiche che l’utente è autorizzato a vedere in base al proprio ruolo."
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
        "text": "La Dashboard considera soltanto le pratiche che l’utente è autorizzato a vedere in base al proprio ruolo. È organizzata in due schede: Stato operativo e Statistiche."
      },
      {
        "type": "bullet",
        "text": "Stato operativo: mostra il numero delle pratiche di competenza, delle pratiche In attesa mia e In attesa di altri, delle pratiche ferme da oltre 15 giorni e delle pratiche in fase sanzionatoria, oltre alla distribuzione delle pratiche per fase di lavorazione, per ruolo competente e per stato delle attività."
      },
      {
        "type": "bullet",
        "text": "Statistiche: consente di scegliere un periodo, di filtrare i dati per Settore e per tipologia di infrazione e di analizzare la distribuzione delle pratiche per Settore e per tipologia, l’andamento nel tempo, la distribuzione per fase e per ruolo competente, le pratiche critiche e la sintesi operativa."
      },
      {
        "type": "bullet",
        "text": "Il pulsante Aggiorna, con l’icona delle frecce circolari, ricarica i dati; il pulsante Azzera filtri elimina i filtri selezionati nella scheda Statistiche."
      },
      {
        "type": "bullet",
        "text": "Nella scheda Statistiche il pulsante Esporta CSV delle statistiche, con l’icona della freccia che esce dal vassoio, scarica in un file CSV i dati riepilogativi visualizzati, calcolati sul periodo e sui filtri impostati: indicatori, pratiche per Settore, per tipologia di infrazione, per fase e per ruolo competente, andamento delle rilevazioni. L’elenco delle singole pratiche si esporta invece dal Report."
      },
      {
        "type": "heading3",
        "id": "cap-21-dashboard-e-report-usare-la-dashboard-per-il-lavoro-quotidiano",
        "text": "Utilizzare la Dashboard per il lavoro quotidiano"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Aprire la Dashboard e restare sulla scheda Stato operativo per verificare il carico di lavoro corrente.",
        "label": "Aprire lo Stato operativo"
      },
      {
        "type": "step",
        "number": 2,
        "text": "Controllare le pratiche In attesa mia e le pratiche ferme da oltre 15 giorni per individuare quelle da lavorare con priorità.",
        "label": "Individuare le priorità operative"
      },
      {
        "type": "step",
        "number": 3,
        "text": "Utilizzare la scheda Statistiche quando occorre analizzare le pratiche per periodo, per Settore o per tipologia di infrazione.",
        "label": "Aprire le Statistiche"
      },
      {
        "type": "step",
        "number": 4,
        "text": "Fare clic su un Settore o su una tipologia di infrazione nei grafici per restringere l’analisi; utilizzare il pulsante Azzera filtri per tornare all’insieme completo dei dati disponibili.",
        "label": "Filtrare le statistiche"
      },
      {
        "type": "step",
        "number": 5,
        "text": "Utilizzare il pulsante Aggiorna quando è necessario ricaricare i dati dopo lavorazioni recenti. Nella scheda Statistiche utilizzare il pulsante Esporta CSV delle statistiche per riportare i dati in un foglio elettronico.",
        "label": "Aggiornare i dati"
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
        "text": "Aprire la vista Report.",
        "label": "Aprire il Report"
      },
      {
        "type": "step",
        "number": 2,
        "text": "Impostare uno o più filtri tra Tipo, Numero, Origine, Area, Settore, Dal/Al, Situazione, Fase procedimentale e Competenza attuale.",
        "label": "Impostare i filtri"
      },
      {
        "type": "step",
        "number": 3,
        "text": "Se utile, aprire il menu a tendina Situazione e selezionare In attesa mia, In attesa di altri, Ferme oppure Fase sanzionatoria.",
        "label": "Scegliere la Situazione"
      },
      {
        "type": "step",
        "number": 4,
        "text": "Consultare la tabella Sintesi procedimentale, che riporta le colonne N. rilevazione, Origine, Data rilevazione, Area, Settore, N. rapporto, Istruttore tecnico, N. atto, Istruttore amministrativo, Fase procedimentale, Competenza attuale, Ultimo aggiornamento e Giorni di fermo. La colonna Origine indica TR per le rilevazioni del Tecnico rilevatore e IT per le pratiche create dall’Istruttore tecnico; passando il mouse sulla cella compare la descrizione per esteso.",
        "label": "Consultare la Sintesi procedimentale"
      },
      {
        "type": "step",
        "number": 5,
        "text": "Per ordinare la tabella, fare clic sull’intestazione della colonna di interesse; per ripristinare l’ordinamento iniziale utilizzare il pulsante ↺.",
        "label": "Ordinare il Report"
      },
      {
        "type": "step",
        "number": 6,
        "text": "Per scaricare i dati filtrati utilizzare il pulsante Esporta CSV, con l’icona della freccia che esce dal vassoio. Il file contiene le stesse colonne della tabella, utilizza il punto e virgola come separatore e può essere aperto con Excel o con un altro foglio elettronico. Il pulsante Aggiorna, con l’icona delle frecce circolari, ricarica i dati.",
        "label": "Esportare il CSV"
      },
      {
        "type": "step",
        "number": 7,
        "text": "Per eliminare tutti i filtri e tornare all’elenco completo delle pratiche di competenza, utilizzare il pulsante Pulisci filtri, con l’icona dell’imbuto barrato, posto a destra dei filtri. Il pulsante è attivo soltanto quando è impostato almeno un filtro.",
        "label": "Azzerare i filtri"
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
        "text": "La Rubrica è gestita dal Responsabile dell’istruttoria amministrativa e contiene due elenchi distinti: i destinatari delle e-mail e i firmatari autorizzati. Le persone già registrate come utenti del gestionale possono essere riutilizzate, senza inserirle una seconda volta."
      },
      {
        "type": "heading3",
        "id": "cap-22-rubrica-e-regolamento-irriguo-aggiungere-un-destinatario-e-mail",
        "text": "Aggiungere un destinatario e-mail"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Aprire la vista Rubrica, selezionare la sezione Destinatari e-mail e utilizzare il comando Aggiungi destinatario.",
        "label": "Aggiungere un destinatario"
      },
      {
        "type": "step",
        "number": 2,
        "text": "Nel menu a tendina Tipo selezionare Persona fisica oppure Altro. Per una persona fisica compilare Nome e Cognome; per il tipo Altro compilare il campo Denominazione.",
        "label": "Scegliere il tipo di destinatario"
      },
      {
        "type": "step",
        "number": 3,
        "text": "Compilare i campi E-mail e Utilizzo. Gli utilizzi predefiniti sono Destinatario determina, Copia conoscenza determina e Destinatario protocollo.",
        "label": "Compilare e-mail e utilizzo"
      },
      {
        "type": "step",
        "number": 4,
        "text": "Quando il gestionale rileva una persona con lo stesso nome e cognome, verificare se si tratta della stessa persona: in caso affermativo riutilizzare la persona già presente, altrimenti confermare l’inserimento di una persona distinta. Quando richiesto, la data di nascita consente di distinguere le due persone.",
        "label": "Gestire un eventuale omonimo"
      },
      {
        "type": "step",
        "number": 5,
        "text": "Salvare il destinatario e-mail.",
        "label": "Salvare il destinatario"
      },
      {
        "type": "callout",
        "title": "Attenzione",
        "text": "Alcuni utilizzi possono avere un solo destinatario attivo: se il gestionale rileva più destinatari attivi per lo stesso utilizzo, lo segnala e chiede di correggere la situazione."
      },
      {
        "type": "heading3",
        "id": "cap-22-rubrica-e-regolamento-irriguo-aggiungere-un-firmatario",
        "text": "Aggiungere un firmatario"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Aprire la vista Rubrica, selezionare la sezione Firmatari e utilizzare il comando Aggiungi firmatario.",
        "label": "Aggiungere un firmatario"
      },
      {
        "type": "step",
        "number": 2,
        "text": "Nel menu a tendina Titolo selezionare il titolo e compilare Nome e Cognome.",
        "label": "Compilare titolo e nominativo"
      },
      {
        "type": "step",
        "number": 3,
        "text": "Compilare la Data di nascita quando è necessaria per distinguere persone con lo stesso nome e cognome.",
        "label": "Gestire un eventuale omonimo"
      },
      {
        "type": "step",
        "number": 4,
        "text": "Salvare il firmatario."
      },
      {
        "type": "callout",
        "title": "Rimozione dalla Rubrica",
        "text": "La rimozione di una persona da uno dei due elenchi della Rubrica non elimina la persona se questa è ancora registrata come utente del gestionale o se compare nell’altro elenco della Rubrica."
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
        "text": "Aprire la vista Regolamento irriguo.",
        "label": "Aprire il Regolamento irriguo"
      },
      {
        "type": "step",
        "number": 2,
        "text": "Scrivere nel campo Cerca una parola oppure il numero di un articolo.",
        "label": "Cercare nel Regolamento"
      },
      {
        "type": "step",
        "number": 3,
        "text": "In alternativa, aprire o chiudere le sezioni dell’Indice regolamento e selezionare l’articolo desiderato.",
        "label": "Navigare l’indice"
      },
      {
        "type": "step",
        "number": 4,
        "text": "Leggere il testo dell’articolo nel pannello di destra. I riferimenti ad altri articoli presenti nel testo possono essere utilizzati come collegamenti per aprire l’articolo citato.",
        "label": "Leggere l’articolo"
      },
      {
        "type": "step",
        "number": 5,
        "text": "Utilizzare i comandi Articolo precedente e Articolo successivo per scorrere gli articoli in sequenza.",
        "label": "Passare all’articolo precedente o successivo"
      },
      {
        "type": "step",
        "number": 6,
        "text": "Utilizzare i comandi Reimposta indice o Pulisci ricerca quando si vuole tornare alla visualizzazione completa.",
        "label": "Reimpostare indice o ricerca"
      },
      {
        "type": "step",
        "number": 7,
        "text": "Per consultare il documento completo utilizzare, se disponibile, il comando Apri il testo integrale (PDF).",
        "label": "Aprire il PDF completo"
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
        "text": "Per essere abilitato all’utilizzo del gestionale, l’utente deve disporre di un account attivo nell’organizzazione ArcGIS Online del Consorzio. Una volta verificata questa condizione, l’Amministratore del sistema registra l’utente nel gestionale e gli associa il ruolo e l’ambito di competenza previsti. Quando il ruolo lo richiede, il gestionale associa inoltre automaticamente l’utente al gruppo ArcGIS Online necessario per accedere alle relative funzioni."
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
        "text": "Verificare che la persona sia già registrata come membro dell’organizzazione ArcGIS Online del Consorzio.",
        "label": "Verificare l’account ArcGIS Online"
      },
      {
        "type": "step",
        "number": 2,
        "text": "Aprire la vista Gestione utenti e utilizzare il comando Nuovo utente.",
        "label": "Avviare la creazione dell’utente"
      },
      {
        "type": "step",
        "number": 3,
        "text": "Cercare la persona scrivendo il nome, il cognome, il nome utente o l’indirizzo e-mail, quindi utilizzare il comando Seleziona sulla riga del membro corretto. Le persone già registrate nel gestionale e gli account disabilitati sono segnalati e non possono essere selezionati come nuovo utente.",
        "label": "Selezionare la persona"
      },
      {
        "type": "step",
        "number": 4,
        "text": "Controllare i dati identificativi proposti dal gestionale, che vengono letti dall’account ArcGIS Online.",
        "label": "Verificare i dati identificativi"
      },
      {
        "type": "step",
        "number": 5,
        "text": "Nella sezione Assegnazione gestionale aprire il menu a tendina Ruolo e selezionare il ruolo da attribuire all’utente.",
        "label": "Assegnare il ruolo"
      },
      {
        "type": "step",
        "number": 6,
        "text": "Compilare i campi Area e Settore quando sono richiesti. Per alcuni ruoli questi valori sono impostati automaticamente o sono fissi. Il Tecnico rilevatore viene registrato indicando soltanto l’Area.",
        "label": "Definire l’ambito di competenza"
      },
      {
        "type": "step",
        "number": 7,
        "text": "Controllare il Gruppo ArcGIS Online calcolato dal gestionale in base al ruolo e all’ambito selezionati.",
        "label": "Verificare il gruppo calcolato"
      },
      {
        "type": "step",
        "number": 8,
        "text": "Salvare l’utente. Se per il ruolo è previsto un gruppo ArcGIS Online, il gestionale aggiorna automaticamente anche l’appartenenza dell’utente a quel gruppo.",
        "label": "Salvare l’utente"
      },
      {
        "type": "step",
        "number": 9,
        "text": "Verificare che compaia il messaggio Utente aggiunto e che la riga del nuovo utente sia presente nell’elenco.",
        "label": "Verificare la creazione dell’utente"
      },
      {
        "type": "callout",
        "title": "Attenzione",
        "text": "Se la persona non compare tra i membri disponibili, occorre prima aggiungerla all’organizzazione ArcGIS Online del Consorzio."
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
            "Tecnico rilevatore",
            "Area Agraria oppure Area Tecnica, con ambito esteso a tutto il comprensorio."
          ],
          [
            "Istruttore tecnico, Capo Settore",
            "Area Agraria oppure Area Tecnica, con il relativo Settore di competenza."
          ],
          [
            "Responsabile dell’istruttoria tecnica",
            "Area Agraria oppure Area Tecnica, con l’ambito tecnico previsto per il ruolo."
          ],
          [
            "Istruttore amministrativo",
            "Area Affari Generali e P.F., con il contesto amministrativo previsto per il ruolo."
          ],
          [
            "Responsabile dell’istruttoria amministrativa",
            "Area Affari Generali e P.F., con il contesto amministrativo previsto per il ruolo."
          ],
          [
            "Direttore tecnico",
            "Area Agraria oppure Area Tecnica; il Settore non deve essere selezionato quando non è previsto."
          ],
          [
            "Direttore amministrativo",
            "Area Affari Generali e P.F."
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
        "text": "Per alcuni ruoli apicali il gestionale consente un solo titolare. In particolare può essere presente: un solo Capo Settore per ciascuna combinazione di Area e Settore; un solo Responsabile dell’istruttoria tecnica per l’Area Agraria e uno per l’Area Tecnica; un solo Responsabile dell’istruttoria amministrativa per l’Area Affari Generali e P.F.; un solo Direttore tecnico per l’Area Agraria e uno per l’Area Tecnica; un solo Direttore amministrativo nell’intero gestionale. Prima di attribuire uno di questi incarichi a un altro utente, occorre revocarlo al titolare attuale."
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
        "text": "Selezionare la riga dell’utente e utilizzare il comando Modifica utente, oppure fare doppio clic sulla riga.",
        "label": "Aprire la modifica dell’utente"
      },
      {
        "type": "step",
        "number": 2,
        "text": "Modificare i dati dell’assegnazione che è consentito cambiare e utilizzare il comando Aggiorna.",
        "label": "Modificare l’assegnazione"
      },
      {
        "type": "step",
        "number": 3,
        "text": "Se il nome, il cognome o l’indirizzo e-mail sono stati modificati in ArcGIS Online, utilizzare il comando Sincronizza. Prima della conferma il gestionale mostra le differenze rilevate; l’aggiornamento viene applicato a tutte le assegnazioni dello stesso utente.",
        "label": "Sincronizzare i dati da ArcGIS Online"
      },
      {
        "type": "step",
        "number": 4,
        "text": "Confermare la sincronizzazione soltanto dopo aver verificato le differenze mostrate.",
        "label": "Confermare la sincronizzazione"
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
        "text": "Sulla riga dell’utente utilizzare il comando Nuova assegnazione.",
        "label": "Aggiungere una nuova assegnazione"
      },
      {
        "type": "step",
        "number": 2,
        "text": "Selezionare il nuovo ruolo e il relativo ambito organizzativo, cioè l’Area e, se previsto, il Settore.",
        "label": "Scegliere ruolo e ambito"
      },
      {
        "type": "step",
        "number": 3,
        "text": "Compilare i dati della nuova assegnazione.",
        "label": "Compilare la nuova assegnazione"
      },
      {
        "type": "step",
        "number": 4,
        "text": "Salvare la nuova assegnazione."
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
        "text": "Utilizzare il comando Elimina utente sulla riga dell’assegnazione da rimuovere.",
        "label": "Eliminare l’assegnazione"
      },
      {
        "type": "step",
        "number": 2,
        "text": "Leggere il messaggio di conferma e scegliere Elimina.",
        "label": "Confermare l’eliminazione"
      },
      {
        "type": "callout",
        "title": "Cosa accade dopo",
        "text": "L’assegnazione selezionata viene rimossa dal gestionale. Se lo stesso utente non ha altre assegnazioni che richiedono il medesimo gruppo ArcGIS Online, il gestionale rimuove automaticamente anche l’appartenenza a quel gruppo. Il nominativo resta comunque nella Rubrica se è ancora utilizzato come destinatario e-mail o come firmatario."
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
        "text": "Nella lavorazione tecnica, le modifiche agli allegati diventano definitive soltanto dopo il comando Salva. Nella lavorazione amministrativa gli allegati tecnici possono essere consultati ma non modificati; per gli allegati amministrativi ordinari, l’aggiunta, la sostituzione e l’eliminazione vengono applicate con il relativo comando, mentre l’eventuale rotazione di un’immagine viene registrata con il comando Salva. La Determinazione, l’Atto di accertamento, i documenti di protocollo e di notifica e gli avvisi pagoPA seguono invece le procedure descritte nei rispettivi capitoli."
      },
      {
        "type": "heading3",
        "id": "cap-24-allegati-fascicolo-e-iter-gestire-un-allegato-ordinario",
        "text": "Gestire un allegato ordinario"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Aprire la scheda Allegati della pratica in lavorazione.",
        "label": "Aprire gli Allegati"
      },
      {
        "type": "step",
        "number": 2,
        "text": "Per aggiungere un allegato utilizzare il comando di aggiunta e selezionare il file; per sostituire o eliminare un allegato esistente utilizzare il relativo comando sulla riga dell’allegato.",
        "label": "Aggiungere, sostituire o eliminare un allegato"
      },
      {
        "type": "step",
        "number": 3,
        "text": "Aprire il visualizzatore per controllare il documento. Se si tratta di un’immagine con un orientamento errato, utilizzare i pulsanti di rotazione disponibili nel visualizzatore.",
        "label": "Verificare il documento"
      },
      {
        "type": "step",
        "number": 4,
        "text": "Se necessario, proseguire con le altre modifiche della pratica.",
        "label": "Proseguire la lavorazione"
      },
      {
        "type": "step",
        "number": 5,
        "text": "Salvare le modifiche agli allegati con il comando Salva."
      },
      {
        "type": "step",
        "number": 6,
        "text": "Verificare l’elenco aggiornato degli allegati e, se utile, consultare l’Iter, nel quale la modifica risulta registrata.",
        "label": "Verificare gli allegati aggiornati"
      },
      {
        "type": "heading2",
        "id": "cap-24-allegati-fascicolo-e-iter-24-2-anteprima-fascicolo",
        "text": "24.2 Anteprima fascicolo"
      },
      {
        "type": "paragraph",
        "text": "L’Anteprima fascicolo mostra i dati e i documenti già disponibili per la pratica. Durante la creazione di una nuova pratica da parte dell’Istruttore tecnico, l’anteprima diventa utilizzabile dopo il primo salvataggio. Nel Rapporto tecnico la Descrizione dei luoghi è riportata accanto ai Dati tecnici rilevati ed è seguita dai dati catastali: Comune, Sezione, Foglio e Mappale."
      },
      {
        "type": "heading2",
        "id": "cap-24-allegati-fascicolo-e-iter-24-3-iter-non-solo-passaggi-tra-ruoli",
        "text": "24.3 Iter: non solo passaggi tra ruoli"
      },
      {
        "type": "paragraph",
        "text": "L’Iter consente di ricostruire chi ha svolto ciascun passaggio, quando è avvenuto e quale effetto ha prodotto. Per ogni passaggio sono riportati l’evento, lo stato (In corso oppure Chiuso), i campi Avviato da e Trasmesso a, le date di apertura e di chiusura, le note, i campi modificati manualmente e le variazioni degli allegati."
      },
      {
        "type": "bullet",
        "text": "Le variazioni di stato e di assegnazione sono già descritte dagli eventi dell’Iter e per questo non vengono ripetute nell’elenco Campi modificati."
      },
      {
        "type": "bullet",
        "text": "Le modifiche al contenuto della pratica, cioè ai dati inseriti nelle diverse sezioni, sono invece riportate nell’elenco Campi modificati."
      },
      {
        "type": "bullet",
        "text": "Per gli allegati l’Iter indica se si tratta di un’aggiunta, di una rimozione o di una sostituzione."
      },
      {
        "type": "bullet",
        "text": "Nella scheda Iter è possibile invertire l’ordine cronologico degli eventi; normalmente gli eventi più recenti sono mostrati per primi."
      },
      {
        "type": "heading3",
        "id": "cap-24-allegati-fascicolo-e-iter-ricostruire-una-modifica-con-l-iter",
        "text": "Ricostruire una modifica con l’Iter"
      },
      {
        "type": "step",
        "number": 1,
        "text": "Aprire il Dettaglio pratica e selezionare la scheda Iter.",
        "label": "Aprire l’Iter"
      },
      {
        "type": "step",
        "number": 2,
        "text": "Scorrere gli eventi fino al periodo o al ruolo che si intende verificare.",
        "label": "Individuare il periodo o il ruolo"
      },
      {
        "type": "step",
        "number": 3,
        "text": "Leggere i campi Avviato da e Trasmesso a per individuare chi ha trasmesso la pratica e a chi è passata la responsabilità.",
        "label": "Ricostruire il passaggio di responsabilità"
      },
      {
        "type": "step",
        "number": 4,
        "text": "Controllare l’elenco Campi modificati per individuare quali dati della pratica sono stati inseriti o modificati.",
        "label": "Verificare i campi modificati"
      },
      {
        "type": "step",
        "number": 5,
        "text": "Controllare le modifiche apportate agli allegati.",
        "label": "Verificare le modifiche agli allegati"
      },
      {
        "type": "step",
        "number": 6,
        "text": "Se si tratta di una richiesta di integrazione, leggere la motivazione e seguire i successivi eventi “Esito integrazione trasmesso”, fino al ruolo che aveva richiesto la correzione.",
        "label": "Seguire un ciclo di integrazione"
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
            "Può trattarsi di una rilevazione proveniente dal Tecnico rilevatore e ancora da assegnare, di una rilevazione trasferita da un altro Settore (in questo caso è riportata l’indicazione “Trasferita da”) oppure di una pratica creata dall’Istruttore tecnico, che risulta già assegnata a lui. Prima di procedere, controllare l’assegnazione."
          ],
          [
            "Istruttoria trasmessa – Settore non competente",
            "Capo Settore",
            "L’Istruttore tecnico ritiene che la rilevazione sia di competenza di un altro Settore. Valutare la segnalazione e trasferire la rilevazione al Settore indicato oppure rimandarla all’Istruttore tecnico (Cap. 6.2)."
          ],
          [
            "Nuova istruttoria ricevuta",
            "Ruolo che deve effettuare il passaggio successivo",
            "Aprire la pratica, prenderla in carico e svolgere la verifica prevista per il proprio ruolo."
          ],
          [
            "Richiesta integrazione ricevuta",
            "Ruolo cui è stata rimandata la pratica",
            "Prendere in carico la pratica, leggere la motivazione del rimando riportata nell’Iter, correggere i dati che è consentito modificare e trasmettere nuovamente l’esito."
          ],
          [
            "Esito integrazione ricevuto",
            "Ruolo che riceve l’esito o ruolo che ha richiesto l’integrazione",
            "Se l’esito deve ancora raggiungere il ruolo che ha richiesto l’integrazione, trasmetterlo al ruolo successivo previsto; se la richiesta era stata formulata dal proprio ruolo, riprendere la verifica della pratica."
          ],
          [
            "Nuovo fascicolo ricevuto",
            "Responsabile dell’istruttoria amministrativa",
            "L’Istruttore amministrativo ha trasmesso il fascicolo amministrativo per la verifica."
          ],
          [
            "Fascicolo ricevuto",
            "Istruttore amministrativo",
            "Il Responsabile dell’istruttoria amministrativa ha restituito o validato il fascicolo; l’Istruttore amministrativo deve procedere con gli adempimenti successivi."
          ],
          [
            "Atto di accertamento ricevuto",
            "Responsabile dell’istruttoria amministrativa o Istruttore amministrativo",
            "L’Atto di accertamento è stato trasmesso al Responsabile dell’istruttoria amministrativa per la verifica, oppure l’Atto approvato è stato restituito all’Istruttore amministrativo."
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
            "La pratica è stata assegnata a un istruttore; nella fase amministrativa è il Responsabile dell’istruttoria amministrativa che assegna la pratica all’Istruttore amministrativo."
          ],
          [
            "Istruttoria trasmessa per verifica",
            "L’Istruttore tecnico ha completato e trasmesso la propria istruttoria al Capo Settore."
          ],
          [
            "Istruttoria trasmessa – Settore non competente",
            "L’Istruttore tecnico ha segnalato al Capo Settore che la rilevazione è di competenza di un altro Settore."
          ],
          [
            "Rilevazione trasferita ad altro Settore",
            "Il Capo Settore ha trasferito la rilevazione al Settore indicato; i dati della pratica sono stati riportati a quelli inviati originariamente dal Tecnico rilevatore."
          ],
          [
            "Istruttoria verificata",
            "Il Capo Settore ha espresso esito positivo e ha trasmesso la pratica al Responsabile dell’istruttoria tecnica."
          ],
          [
            "Istruttoria validata",
            "Il Responsabile dell’istruttoria tecnica ha espresso esito positivo e ha trasmesso la pratica al Direttore tecnico; nella fase amministrativa l’evento indica la validazione da parte del Responsabile dell’istruttoria amministrativa."
          ],
          [
            "Istruttoria approvata",
            "Il Direttore tecnico ha approvato la fase tecnica e ha trasmesso la pratica al Responsabile dell’istruttoria amministrativa."
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
            "L’esito di una correzione è stato trasmesso verso il ruolo che aveva richiesto l’integrazione."
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
            "La fase tecnica è stata respinta, nel passaggio in cui questo esito è previsto."
          ],
          [
            "Archiviazione",
            "L’Istruttore tecnico ha archiviato una pratica creata direttamente nel gestionale e non ancora trasmessa ai livelli successivi dell’istruttoria."
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
            "La pratica è stata rimandata per una correzione o un’integrazione."
          ],
          [
            "Trasmesso",
            "Il ruolo ha completato il proprio passaggio e la pratica è in attesa che il destinatario la prenda in carico."
          ],
          [
            "Istruttoria assegnata",
            "La pratica è stata assegnata a un istruttore nel passaggio di assegnazione."
          ],
          [
            "Respinto",
            "Il percorso ordinario della pratica è stato interrotto da un esito negativo (respingimento)."
          ],
          [
            "Archiviata",
            "La pratica è stata archiviata con l’azione Elimina. Non compare più negli elenchi ordinari e resta visibile soltanto all’Amministratore del sistema."
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
            "Cap. 4.1 — il Capo Settore verifica la provenienza della rilevazione e, quando necessario, la assegna a un Istruttore tecnico."
          ],
          [
            "Come creo una nuova pratica?",
            "Cap. 4.2 — creazione di una nuova pratica da parte dell’Istruttore tecnico."
          ],
          [
            "Come imposto o correggo il punto in mappa?",
            "Cap. 4.2.5 — sezione Luoghi e dati tecnici: comandi Imposta punto in mappa, Modifica punto e Centra sul punto; dati catastali e tecnici ricavati dalla posizione del punto."
          ],
          [
            "Come elimino una pratica creata per errore?",
            "Cap. 5.3 — l’azione Elimina archivia una pratica creata direttamente dall’Istruttore tecnico e non ancora trasmessa ai livelli successivi."
          ],
          [
            "Come segnalo che una rilevazione è di un altro Settore?",
            "Cap. 5.4 — l’Istruttore tecnico utilizza l’azione “Settore non competente”, indicando il Settore ritenuto competente e la motivazione."
          ],
          [
            "Come trasferisco una rilevazione a un altro Settore?",
            "Cap. 6.2 — il Capo Settore valuta la segnalazione dell’Istruttore tecnico e trasferisce la rilevazione al Settore indicato oppure la rimanda all’Istruttore tecnico."
          ],
          [
            "Come completo un’istruttoria tecnica?",
            "Cap. 5 — controllo delle sezioni, salvataggio con Salva, verifica con l’Anteprima e trasmissione."
          ],
          [
            "Come richiedo un’integrazione?",
            "Cap. 6-9 e 12 — utilizzare il comando Gestisci istruttoria dal ruolo che può rimandare la pratica."
          ],
          [
            "Come rispondo a una richiesta di integrazione?",
            "Cap. 9 — presa in carico, correzione, salvataggio e trasmissione dell’esito fino al ruolo che ha richiesto l’integrazione."
          ],
          [
            "Come preparo una Nota spese?",
            "Cap. 18 — scelta della casistica, selezione delle voci con il Browser prezzario, indicazione delle quantità e salvataggio con Salva."
          ],
          [
            "Come creo un nuovo prezzo?",
            "Cap. 19.2 — sezione Analisi prezzi, con creazione di un prezzo elementare o analizzato."
          ],
          [
            "Dove gestisco i parametri sanzionatori?",
            "Cap. 19.4 — Parametri sanzionatori per il Responsabile dell’istruttoria amministrativa; Parametri nota spese e Prezzi delle attrezzature in Gestione prezzari per il Responsabile dell’istruttoria tecnica."
          ],
          [
            "Come genero la determinazione?",
            "Cap. 13 — esito dell’Istruttore amministrativo, generazione del documento Word e del PDF, verifica del Responsabile dell’istruttoria amministrativa, protocollazione e versione definitiva."
          ],
          [
            "Come sostituisco un PDF della determinazione?",
            "Cap. 13.4 — sostituzione della copia ufficiale, finché l’operazione è consentita."
          ],
          [
            "Come preparo l’Atto di accertamento?",
            "Cap. 14 — condizioni necessarie, bozza, verifica del Responsabile dell’istruttoria amministrativa, versione definitiva, firma e protocollazione."
          ],
          [
            "Come carico gli avvisi pagoPA?",
            "Cap. 15.3 — caricamento degli avvisi pagoPA e controlli automatici."
          ],
          [
            "Come sostituisco gli avvisi pagoPA?",
            "Cap. 15.4 — sostituzione degli avvisi, controllo e salvataggio con Salva."
          ],
          [
            "Come registro una notifica?",
            "Cap. 16.1 — indicazione dell’esito, caricamento della prova di notifica protocollata e salvataggio con Salva."
          ],
          [
            "Come registro un pagamento?",
            "Cap. 16.2 e 17.4 — indicazione dello stato del pagamento e successiva registrazione dell’incasso e della definizione."
          ],
          [
            "Come registro un ricorso?",
            "Cap. 17.1 — registrazione dei dati del ricorso o della richiesta di riesame presentati dopo la notifica."
          ],
          [
            "Come registro l’esito del CdA?",
            "Cap. 17.2 — registrazione della decisione, dell’eventuale nuovo importo e della nuova scadenza, e delle note."
          ],
          [
            "Come riapro una pratica?",
            "Cap. 17.3 — riapertura da parte del Responsabile dell’istruttoria amministrativa e nuova assegnazione all’Istruttore amministrativo."
          ],
          [
            "Come definisco una pratica?",
            "Cap. 17.4 — registrazione dell’incasso e della causa di definizione."
          ],
          [
            "Come cerco una pratica sulla mappa?",
            "Cap. 20.3 — ricerca Infrazioni della Mappa, per tipo e numero della pratica o con gli altri criteri disponibili."
          ],
          [
            "Come esportare un report?",
            "Cap. 21.2 — impostazione dei filtri del Report ed esportazione con il pulsante Esporta CSV."
          ],
          [
            "Come aggiungo un firmatario?",
            "Cap. 22.1 — vista Rubrica, sezione Firmatari."
          ],
          [
            "Come cerco un articolo del Regolamento per numero?",
            "Cap. 22.2 — consultazione dell’indice per numero oppure ricerca del numero dell’articolo, anche scritto nella forma «art 8» o «art. 8»."
          ],
          [
            "Come creo o modifico un utente?",
            "Cap. 23 — registrazione dell’utente, attribuzione dei ruoli e aggiornamento dei dati."
          ],
          [
            "Come ricostruisco chi ha modificato una pratica?",
            "Cap. 24.3 — consultazione dell’Iter: eventi, campi modificati e allegati modificati."
          ]
        ]
      }
    ]
  },
  {
    "id": "appendice-a-regola-pratica-per-distinguere-consultazione-e-lavorazione",
    "order": 129,
    "title": "Appendice A — Regola pratica per distinguere consultazione e lavorazione",
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
            "Controllare i filtri In attesa mia e In attesa di altri."
          ],
          [
            "Leggere dati senza cambiarli",
            "Dettaglio pratica",
            "Trasgressore, Violazione, Luoghi e dati, Mappa, Nota spese, Allegati, Iter."
          ],
          [
            "Modificare dati tecnici",
            "Lavorazione istruttoria tecnica",
            "Soltanto quando il proprio ruolo e lo stato della pratica lo consentono."
          ],
          [
            "Modificare dati amministrativi",
            "Lavorazione amministrativa",
            "È operativa per l’Istruttore amministrativo nelle sezioni abilitate; il Responsabile dell’istruttoria amministrativa utilizza le azioni dell’iter di sua competenza e la sezione Riapertura secondo la procedura prevista, mentre il Direttore amministrativo vi accede in sola consultazione."
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
            "Gli allarmi dell’iter e gli allarmi successivi alla notifica hanno finalità diverse."
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
        "text": "Prima di lavorare una pratica, verificare che compaia tra le pratiche In attesa mia e, se la pratica proviene da un rimando, consultare l’Iter per capire quale integrazione è stata richiesta."
      },
      {
        "type": "paragraph",
        "text": "Prima di trasmettere la pratica o di farla avanzare, controllare che le modifiche siano state salvate e che i documenti richiesti siano completi. Se il comando atteso non è disponibile, verificare nell’Iter quale passaggio deve ancora essere completato."
      }
    ]
  }
] as GuideChapter[]

export const GUIDE_QUICK_LINKS: GuideQuickLink[] = [
  {
    "label": "Come assegno una nuova rilevazione?",
    "description": "Cap. 4.1 — il Capo Settore verifica la provenienza della rilevazione e, quando necessario, la assegna a un Istruttore tecnico.",
    "targetChapterId": "cap-4-nuova-rilevazione-e-nuova-pratica"
  },
  {
    "label": "Come creo una nuova pratica?",
    "description": "Cap. 4.2 — creazione di una nuova pratica da parte dell’Istruttore tecnico.",
    "targetChapterId": "cap-4-nuova-rilevazione-e-nuova-pratica"
  },
  {
    "label": "Come imposto o correggo il punto in mappa?",
    "description": "Cap. 4.2.5 — sezione Luoghi e dati tecnici: comandi Imposta punto in mappa, Modifica punto e Centra sul punto; dati catastali e tecnici ricavati dalla posizione del punto.",
    "targetChapterId": "cap-4-nuova-rilevazione-e-nuova-pratica"
  },
  {
    "label": "Come elimino una pratica creata per errore?",
    "description": "Cap. 5.3 — l’azione Elimina archivia una pratica creata direttamente dall’Istruttore tecnico e non ancora trasmessa ai livelli successivi.",
    "targetChapterId": "cap-5-istruttoria-tecnica-dell-it"
  },
  {
    "label": "Come segnalo che una rilevazione è di un altro Settore?",
    "description": "Cap. 5.4 — l’Istruttore tecnico utilizza l’azione “Settore non competente”, indicando il Settore ritenuto competente e la motivazione.",
    "targetChapterId": "cap-5-istruttoria-tecnica-dell-it"
  },
  {
    "label": "Come trasferisco una rilevazione a un altro Settore?",
    "description": "Cap. 6.2 — il Capo Settore valuta la segnalazione dell’Istruttore tecnico e trasferisce la rilevazione al Settore indicato oppure la rimanda all’Istruttore tecnico.",
    "targetChapterId": "cap-6-verifica-del-capo-settore"
  },
  {
    "label": "Come completo un’istruttoria tecnica?",
    "description": "Cap. 5 — controllo delle sezioni, salvataggio con Salva, verifica con l’Anteprima e trasmissione.",
    "targetChapterId": "cap-5-istruttoria-tecnica-dell-it"
  },
  {
    "label": "Come richiedo un’integrazione?",
    "description": "Cap. 6-9 e 12 — utilizzare il comando Gestisci istruttoria dal ruolo che può rimandare la pratica.",
    "targetChapterId": "cap-6-verifica-del-capo-settore"
  },
  {
    "label": "Come rispondo a una richiesta di integrazione?",
    "description": "Cap. 9 — presa in carico, correzione, salvataggio e trasmissione dell’esito fino al ruolo che ha richiesto l’integrazione.",
    "targetChapterId": "cap-9-integrazioni-tecniche"
  },
  {
    "label": "Come preparo una Nota spese?",
    "description": "Cap. 18 — scelta della casistica, selezione delle voci con il Browser prezzario, indicazione delle quantità e salvataggio con Salva.",
    "targetChapterId": "cap-18-nota-spese"
  },
  {
    "label": "Come creo un nuovo prezzo?",
    "description": "Cap. 19.2 — sezione Analisi prezzi, con creazione di un prezzo elementare o analizzato.",
    "targetChapterId": "cap-19-prezzari-e-nuovi-prezzi"
  },
  {
    "label": "Dove gestisco i parametri sanzionatori?",
    "description": "Cap. 19.4 — Parametri sanzionatori per il Responsabile dell’istruttoria amministrativa; Parametri nota spese e Prezzi delle attrezzature in Gestione prezzari per il Responsabile dell’istruttoria tecnica.",
    "targetChapterId": "cap-19-prezzari-e-nuovi-prezzi"
  },
  {
    "label": "Come genero la determinazione?",
    "description": "Cap. 13 — esito dell’Istruttore amministrativo, generazione del documento Word e del PDF, verifica del Responsabile dell’istruttoria amministrativa, protocollazione e versione definitiva.",
    "targetChapterId": "cap-13-determinazione"
  },
  {
    "label": "Come sostituisco un PDF della determinazione?",
    "description": "Cap. 13.4 — sostituzione della copia ufficiale, finché l’operazione è consentita.",
    "targetChapterId": "cap-13-determinazione"
  },
  {
    "label": "Come preparo l’Atto di accertamento?",
    "description": "Cap. 14 — condizioni necessarie, bozza, verifica del Responsabile dell’istruttoria amministrativa, versione definitiva, firma e protocollazione.",
    "targetChapterId": "cap-14-atto-di-accertamento"
  },
  {
    "label": "Come carico gli avvisi pagoPA?",
    "description": "Cap. 15.3 — caricamento degli avvisi pagoPA e controlli automatici.",
    "targetChapterId": "cap-15-modalita-di-pagamento-e-avvisi-pagopa"
  },
  {
    "label": "Come sostituisco gli avvisi pagoPA?",
    "description": "Cap. 15.4 — sostituzione degli avvisi, controllo e salvataggio con Salva.",
    "targetChapterId": "cap-15-modalita-di-pagamento-e-avvisi-pagopa"
  },
  {
    "label": "Come registro una notifica?",
    "description": "Cap. 16.1 — indicazione dell’esito, caricamento della prova di notifica protocollata e salvataggio con Salva.",
    "targetChapterId": "cap-16-protocollo-notifica-e-pagamento"
  },
  {
    "label": "Come registro un pagamento?",
    "description": "Cap. 16.2 e 17.4 — indicazione dello stato del pagamento e successiva registrazione dell’incasso e della definizione.",
    "targetChapterId": "cap-16-protocollo-notifica-e-pagamento"
  },
  {
    "label": "Come registro un ricorso?",
    "description": "Cap. 17.1 — registrazione dei dati del ricorso o della richiesta di riesame presentati dopo la notifica.",
    "targetChapterId": "cap-17-ricorso-cda-riapertura-e-definizione"
  },
  {
    "label": "Come registro l’esito del CdA?",
    "description": "Cap. 17.2 — registrazione della decisione, dell’eventuale nuovo importo e della nuova scadenza, e delle note.",
    "targetChapterId": "cap-17-ricorso-cda-riapertura-e-definizione"
  },
  {
    "label": "Come riapro una pratica?",
    "description": "Cap. 17.3 — riapertura da parte del Responsabile dell’istruttoria amministrativa e nuova assegnazione all’Istruttore amministrativo.",
    "targetChapterId": "cap-17-ricorso-cda-riapertura-e-definizione"
  },
  {
    "label": "Come definisco una pratica?",
    "description": "Cap. 17.4 — registrazione dell’incasso e della causa di definizione.",
    "targetChapterId": "cap-17-ricorso-cda-riapertura-e-definizione"
  },
  {
    "label": "Come cerco una pratica sulla mappa?",
    "description": "Cap. 20.3 — ricerca Infrazioni della Mappa, per tipo e numero della pratica o con gli altri criteri disponibili.",
    "targetChapterId": "cap-20-mappa"
  },
  {
    "label": "Come esportare un report?",
    "description": "Cap. 21.2 — impostazione dei filtri del Report ed esportazione con il pulsante Esporta CSV.",
    "targetChapterId": "cap-21-dashboard-e-report"
  },
  {
    "label": "Come aggiungo un firmatario?",
    "description": "Cap. 22.1 — vista Rubrica, sezione Firmatari.",
    "targetChapterId": "cap-22-rubrica-e-regolamento-irriguo"
  },
  {
    "label": "Come cerco un articolo del Regolamento per numero?",
    "description": "Cap. 22.2 — consultazione dell’indice per numero oppure ricerca del numero dell’articolo, anche scritto nella forma «art 8» o «art. 8».",
    "targetChapterId": "cap-22-rubrica-e-regolamento-irriguo"
  },
  {
    "label": "Come creo o modifico un utente?",
    "description": "Cap. 23 — registrazione dell’utente, attribuzione dei ruoli e aggiornamento dei dati.",
    "targetChapterId": "cap-23-gestione-utenti"
  },
  {
    "label": "Come ricostruisco chi ha modificato una pratica?",
    "description": "Cap. 24.3 — consultazione dell’Iter: eventi, campi modificati e allegati modificati.",
    "targetChapterId": "cap-24-allegati-fascicolo-e-iter"
  }
] as GuideQuickLink[]
