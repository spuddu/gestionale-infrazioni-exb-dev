export interface GuideStepHelp {
  paragraphs: string[]
  bullets?: string[]
  figure?: string
}

const exactHelp: Record<string, GuideStepHelp> = {
  'Consultare i dati del trasgressore.': {
    paragraphs: [
      'Con la pratica selezionata nell’Elenco pratiche, aprire la scheda Trasgressore nel pannello Dettaglio pratica selezionata. La scheda riepiloga i dati anagrafici e fiscali del soggetto, i recapiti e le altre informazioni già acquisite nella pratica.'
    ]
  },
  'Consultare le violazioni contestate.': {
    paragraphs: [
      'Con la pratica selezionata nell’Elenco pratiche, aprire la scheda Violazione nel pannello Dettaglio pratica selezionata. Sono riepilogate le violazioni registrate, con i dati specifici delle fattispecie selezionate e i relativi riferimenti al Regolamento irriguo.',
      'Quando è disponibile il collegamento al riferimento regolamentare, utilizzarlo per leggere l’articolo. Per la consultazione completa del Regolamento irriguo vedere Cap. 22.2.'
    ]
  },
  'Consultare i luoghi e i dati della rilevazione.': {
    paragraphs: [
      'Con la pratica selezionata nell’Elenco pratiche, aprire la scheda Luoghi e dati nel pannello Dettaglio pratica selezionata. Qui sono riepilogati la descrizione del luogo, le coordinate del punto, i dati catastali (Comune, Sezione, Foglio e Mappale), i Dati tecnici rilevati, le Annotazioni tecniche del Tecnico rilevatore e le matricole.',
      'Nella lavorazione tecnica gli stessi dati si trovano nella scheda Luoghi e dati tecnici.'
    ]
  },
  'Visualizzare la pratica sulla mappa.': {
    paragraphs: [
      'Con la pratica selezionata nell’Elenco pratiche, aprire la scheda Mappa nel pannello Dettaglio pratica selezionata. Se nella pratica è stato registrato un punto, la mappa lo visualizza nella relativa posizione; in assenza di localizzazione viene mostrata la relativa segnalazione.',
      'Gli strumenti della mappa sono gli stessi della lavorazione tecnica: in basso a destra Bussola, Posizione, Estensione precedente/successiva, Zoom, Home e Centra sul punto, che riporta la mappa sul punto della pratica ed è disattivato quando il punto non è presente; in alto Mappa di base, Misura, l’eventuale Elenco layer e Schermo intero.',
      'Per effettuare ricerche cartografiche su particelle, opere o infrazioni utilizzare invece la vista Mappa dalla Home o dal navigatore laterale. Le funzioni della vista Mappa sono descritte nel Cap. 20.'
    ]
  },
  'Consultare la Nota spese.': {
    paragraphs: [
      'Con la pratica selezionata nell’Elenco pratiche, aprire la scheda Nota spese nel pannello Dettaglio pratica selezionata. Vengono mostrati i costi già registrati, il riepilogo delle categorie e, quando presenti, le informazioni specifiche delle casistiche collegate all’art. 30. Per la compilazione della Nota spese vedere Cap. 18.'
    ]
  },
  'Consultare e aprire gli allegati.': {
    paragraphs: [
      'Con la pratica selezionata nell’Elenco pratiche, aprire la scheda Allegati nel pannello Dettaglio pratica selezionata. La documentazione è distinta, quando presente, tra allegati tecnici e allegati amministrativi. Selezionare il file che interessa per aprirlo nel visualizzatore. Per la gestione degli Allegati vedere Cap. 24.1.'
    ]
  },
  'Ricostruire l’iter della pratica.': {
    paragraphs: [
      'Con la pratica selezionata nell’Elenco pratiche, aprire la scheda Iter nel pannello Dettaglio pratica selezionata. Ogni blocco mostra il passaggio della pratica, il ruolo che l’ha lavorata, il destinatario, le date e, quando presenti, le modifiche ai dati, agli allegati e le motivazioni dei rimandi. La scheda consente quindi di verificare i passaggi già compiuti e individuare la fase corrente della pratica.',
      'Se la scheda Iter è già selezionata, selezionarla nuovamente per invertire l’ordine cronologico degli eventi. In questo modo è possibile passare rapidamente dagli eventi più recenti ai meno recenti e viceversa. Per la lettura dettagliata dell’Iter vedere Cap. 24.3.'
    ]
  },
  'Aprire Elenco pratiche e scegliere anzitutto la scheda coerente con lo scopo: In attesa mia, In attesa di altri o Tutte le pratiche.': {
    paragraphs: [
      'Aprire Elenco pratiche dalla Home oppure dal navigatore laterale. Le tre schede si trovano sopra la tabella delle pratiche. Selezionare In attesa mia per le pratiche che richiedono un proprio intervento, In attesa di altri per quelle presso altri ruoli oppure Tutte le pratiche per consultare l’intero insieme accessibile al proprio profilo.',
      'Il numero mostrato accanto al nome di ciascuna scheda indica quante pratiche contiene in quel momento.'
    ]
  },
  'Aprire il pannello filtri quando serve restringere l’elenco e impostare uno o più criteri disponibili.': {
    paragraphs: [
      'Il pulsante Filtri si trova sopra la tabella, a destra delle schede In attesa mia, In attesa di altri e Tutte le pratiche. Premendolo si apre, immediatamente sotto le schede, il pannello dei criteri di ricerca.',
      'I criteri possono essere utilizzati singolarmente oppure insieme e vengono applicati alla scheda attualmente selezionata. In fondo al pannello viene indicato quante pratiche sono mostrate rispetto a quelle presenti nella scheda corrente.'
    ],
    bullets: [
      'Cerca: digitare il numero della rilevazione, del rapporto tecnico o dell’Atto di accertamento, oppure il nome, il cognome, la ragione sociale, il codice fiscale o la partita IVA del trasgressore. È possibile ricercare anche il nominativo del Tecnico rilevatore o dell’Istruttore tecnico.',
      'Area e Settore: restringono l’elenco all’ambito selezionato; cambiando Area il Settore viene reimpostato.',
      'Dal e Al: limitano la ricerca a un intervallo della data di rilevazione.',
      'Stato: mostra soltanto le pratiche nello stato selezionato.',
      'Pulisci filtri: rimuove tutti i criteri impostati.'
    ],
    figure: 'Figura – Elenco pratiche con schede e pannello filtri'
  },
  'Ordinare le colonne utili; per il lavoro corrente è normalmente utile mantenere visibile l’Ultimo aggiornamento.': {
    paragraphs: [
      'Per ordinare l’elenco fare clic sull’intestazione della colonna interessata. Il primo clic imposta l’ordine crescente, il secondo quello decrescente e il terzo rimuove quella colonna dall’ordinamento.',
      'È possibile utilizzare più colonne: il numero accanto al simbolo di ordinamento indica la priorità del criterio. Il pulsante circolare ↺, accanto a Filtri, ripristina l’ordinamento predefinito.'
    ]
  },
  'Per azzerare la ricerca utilizzare Pulisci filtri: questo evita che una pratica risulti apparentemente “scomparsa” a causa di un filtro rimasto attivo.': {
    paragraphs: [
      'Aprire Filtri e premere Pulisci filtri. Il comando azzera Cerca, Area, Settore, intervallo di date e Stato e riporta la scheda selezionata al proprio insieme completo di pratiche.',
      'Se Pulisci filtri non è attivo, non risultano criteri di filtro impostati.'
    ]
  },
  'Selezionare una pratica per visualizzarne i dettagli e le azioni disponibili.': {
    paragraphs: [
      'Fare clic sulla riga della pratica interessata. Il pannello Dettaglio pratica selezionata, sulla destra, viene aggiornato con le informazioni della pratica e con le relative schede di consultazione.',
      'Nella parte inferiore dell’elenco si aggiorna anche l’area Azioni, nella quale compaiono soltanto i comandi disponibili per il proprio ruolo e per lo stato corrente della pratica.'
    ]
  },
  'Archiviare un allarme quando il comando è disponibile.': {
    paragraphs: [
      'Nel pannello Allarmi e scadenze individuare l’allarme interessato e premere Archivia sulla stessa riga.',
      'L’archiviazione rimuove la voce dal pannello degli allarmi attivi; non modifica lo stato della pratica né cancella gli eventi già registrati nell’Iter. Per il quadro completo degli allarmi vedere Cap. 25.1.'
    ]
  },
  'Aprire la pratica interessata dall’allarme o dalla scadenza.': {
    paragraphs: [
      'Nel pannello Allarmi e scadenze individuare la voce interessata e premere Apri pratica.',
      'Il gestionale apre l’Elenco pratiche e seleziona automaticamente la pratica corrispondente.'
    ]
  },
  'Aprire Nuova pratica dalla Home o dal menu.': {
    paragraphs: [
      'Dalla Home selezionare la card Nuova pratica. Se ci si trova già in un’altra vista, utilizzare la voce Nuova pratica nel navigatore laterale.',
      'La vista si apre direttamente sulla scheda Trasgressore; se l’Istruttore tecnico è assegnato a più settori, il sistema richiede prima di scegliere quello della nuova pratica. Con un solo settore la scelta non è richiesta.'
    ]
  },
  'Aprire Mappa e selezionare Dati catastali.': {
    paragraphs: [
      'Aprire Mappa dalla Home o dal navigatore laterale. Nel pannello di ricerca selezionare Dati catastali per visualizzare i criteri dedicati alla ricerca delle particelle.',
      'La ricerca viene costruita progressivamente a partire dal Comune e può essere affinata con Sezione, Foglio e Mappale.'
    ],
    figure: 'Figura – Mappa del gestionale'
  },
  'Aprire Dashboard e restare su Quadro operativo per verificare il carico corrente.': {
    paragraphs: [
      'Aprire Dashboard dalla Home o dal navigatore laterale. All’apertura viene mostrata la sezione Operativo, che riepiloga il carico corrente e separa le pratiche In attesa mia da quelle In attesa di altri.',
      'Nella stessa schermata sono disponibili gli indicatori sulle pratiche ferme oltre la soglia e sulla fase sanzionatoria, oltre alle ripartizioni per fase e ruolo competente.'
    ],
    figure: 'Figura – Dashboard operativa'
  },
  'Usare Statistiche quando serve leggere il fenomeno per periodo, ufficio o tipologia di infrazione.': {
    paragraphs: [
      'Nella parte superiore della Dashboard selezionare Statistiche. La vista mostra il quadro dinamico delle pratiche e mette a disposizione i periodi predefiniti e i filtri interattivi per ufficio e tipologia di infrazione.',
      'Selezionando una voce nei riquadri di analisi, gli altri indicatori vengono aggiornati in base alla selezione.'
    ],
    figure: 'Figura – Dashboard statistiche'
  },
  'Aprire Regolamento irriguo.': {
    paragraphs: [
      'Aprire Regolamento irriguo dalla Home o dal navigatore laterale. A sinistra viene mostrato l’indice, mentre a destra compare il testo dell’articolo selezionato.',
      'È possibile cercare direttamente un articolo o una parola oppure navigare le sezioni dell’indice.'
    ],
    figure: 'Figura – Consultazione del Regolamento irriguo'
  },
  'Controllare Trasgressore, Contestazioni, allegati e Iter e completare i soli dati resi modificabili nella fase corrente.': {
    paragraphs: [
      'Dopo avere aperto la lavorazione amministrativa, utilizzare le schede nella parte superiore della pratica. Trasgressore e Contestazioni consentono di verificare i dati già acquisiti; Allegati e Iter permettono di controllare la documentazione e il percorso della pratica.',
      'I campi effettivamente modificabili dipendono dalla fase corrente: i dati presentati in sola lettura non devono essere ricercati in altre sezioni per tentare di modificarli.'
    ],
    figure: 'Figura – Contestazioni nella lavorazione amministrativa'
  },
  'Aprire Gestisci istruttoria nella sezione Iter approvativo.': {
    paragraphs: [
      'Aprire la scheda Iter approvativo della pratica. Nella parte inferiore della pagina, nell’area Azioni, utilizzare Gestisci istruttoria per aprire il pannello con gli esiti disponibili nella fase corrente.',
      'Prima di confermare un esito verificare il riepilogo mostrato nella stessa scheda, perché da qui si ricostruiscono anche gli eventuali rimandi e rientri di integrazione.'
    ],
    figure: 'Figura – Iter approvativo amministrativo'
  },
  'Controllare l’Anteprima fascicolo e la completezza della documentazione.': {
    paragraphs: [
      'Aprire Anteprima fascicolo dalla barra delle schede della pratica. L’anteprima ricompone i documenti selezionati nel fascicolo e permette di verificarne visivamente la presenza e l’ordine prima della trasmissione.',
      'Nel pannello laterale è possibile vedere quali documenti tecnici e amministrativi sono inclusi.'
    ],
    figure: 'Figura – Anteprima fascicolo'
  },
  'Usare Genera bozza per creare il documento Word della determinazione; se i dati cambiano e il sistema segnala che la bozza è da rigenerare, usare Rigenera bozza.': {
    paragraphs: [
      'Nella scheda Iter approvativo individuare la sezione Determinazione. Utilizzare Genera bozza per predisporre il documento Word sulla base dei dati presenti nella pratica.',
      'Se, dopo la generazione, vengono modificati dati che incidono sul documento, il gestionale segnala che la bozza non è più aggiornata: in quel caso utilizzare Rigenera bozza prima di proseguire.'
    ],
    figure: 'Figura – Proposta di contestazione e determinazione'
  },
  'Aprire la sezione Notifica e completare, nell’ordine consentito dall’interfaccia, Modalità di pagamento, Tipo di notifica e Spese di notifica.': {
    paragraphs: [
      'Aprire la scheda Notifica nella lavorazione amministrativa. Nella sezione Preparazione dell’atto e della notifica verificare il totale da pagare e compilare i campi resi disponibili.',
      'Impostare la Modalità di pagamento, selezionare il Tipo di notifica e indicare le Spese di notifica. Le spese concorrono al totale da pagare e devono essere valorizzate anche quando sono pari a zero.'
    ],
    figure: 'Figura – Notifica e dati di pagamento'
  }
}


function getReviewedStepHelp(text: string, sectionTitle = '', chapterTitle = ''): GuideStepHelp | null {
  const lower = text.toLowerCase()
  const section = sectionTitle.toLowerCase()
  const chapter = chapterTitle.toLowerCase()

  // Revisione qualitativa 210: casi che non devono ricadere nei fallback generici.
  if (chapter.startsWith('6. verifica del capo settore') && lower.startsWith('se la pratica è corretta, scegliere conforme')) {
    return { paragraphs: [
      'Nel pannello Gestisci istruttoria selezionare Conforme e controllare che il destinatario indicato sia il Responsabile dell’istruttoria tecnica.',
      'Confermare la verifica. Il gestionale registra nell’Iter l’esito del Capo Settore e trasmette la pratica al Responsabile dell’istruttoria tecnica, che la troverà tra le pratiche da prendere in carico.'
    ] }
  }
  if (chapter.startsWith('7. validazione del responsabile') && lower.startsWith('se l’istruttoria è corretta, scegliere conforme')) {
    return { paragraphs: [
      'Nel pannello Gestisci istruttoria selezionare Conforme e controllare che il destinatario indicato sia il Direttore tecnico.',
      'Confermare la validazione. Il gestionale registra nell’Iter l’esito del Responsabile dell’istruttoria tecnica e trasmette la pratica al Direttore tecnico per l’approvazione.'
    ] }
  }
  if (chapter.startsWith('7. validazione del responsabile') && lower.startsWith('se servono integrazioni, rimandare la pratica all’istruttore tecnico')) {
    return { paragraphs: [
      'Nel pannello Gestisci istruttoria scegliere l’esito di integrazione, indicare con precisione la motivazione e verificare che il destinatario sia l’Istruttore tecnico.',
      'Confermare il rimando. La pratica torna all’Istruttore tecnico con la motivazione registrata nell’Iter; il Responsabile dell’istruttoria tecnica non dispone, in questa fase, del respingimento finale previsto per il Direttore tecnico.'
    ] }
  }
  if (chapter.startsWith('8. approvazione del direttore') && lower.startsWith('per l’esito positivo selezionare conforme')) {
    return { paragraphs: [
      'Nel pannello Gestisci istruttoria selezionare Conforme e controllare che il destinatario indicato sia il Responsabile dell’istruttoria amministrativa.',
      'Confermare l’approvazione. Il gestionale registra nell’Iter l’esito del Direttore tecnico, conclude la fase tecnica e trasmette la pratica al Responsabile dell’istruttoria amministrativa.'
    ] }
  }
  if (chapter.startsWith('8. approvazione del direttore') && lower.startsWith('per una richiesta di integrazione selezionare')) {
    return { paragraphs: [
      'Nel pannello Gestisci istruttoria scegliere l’esito di integrazione e selezionare gli aspetti che devono essere corretti.',
      'Se la richiesta riguarda esclusivamente Occorrenza e/o Grado di gravità, verificare che il destinatario sia il Responsabile dell’istruttoria tecnica; negli altri casi tecnici il destinatario deve essere l’Istruttore tecnico. Confermare soltanto dopo avere controllato il riepilogo del rimando.'
    ] }
  }
  if (chapter.startsWith('9. integrazioni tecniche') && lower === 'aprire la pratica rimandata per integrazione.') {
    return { paragraphs: [
      'Aprire l’allarme relativo alla richiesta di integrazione e utilizzare Apri pratica; in alternativa entrare in Elenco pratiche, scheda In attesa mia, e selezionare la pratica rimandata.',
      'Prima di intervenire aprire Iter e leggere la motivazione del rimando, così da verificare chi ha richiesto l’integrazione e quali aspetti devono essere corretti.'
    ] }
  }
  if (chapter.startsWith('17. ricorso') && lower.startsWith('se la decisione del cda richiede una nuova istruttoria amministrativa')) {
    return { paragraphs: [
      'Se dall’esito del CdA risulta necessaria una nuova istruttoria amministrativa, completare e salvare anzitutto i dati della decisione nella scheda CdA.',
      'Passare quindi alla scheda Riapertura. La registrazione dell’ordine di riapertura e l’avvio del nuovo ciclo amministrativo sono descritti nei passaggi immediatamente successivi della sezione dedicata al Responsabile dell’istruttoria amministrativa.'
    ] }
  }
  if (chapter.startsWith('19. prezzari') && lower === 'aprire gestione prezzari e selezionare prezzari.') {
    return { paragraphs: [
      'Aprire Gestione prezzari dalla Home oppure dal navigatore laterale e selezionare la sezione Prezzari.',
      'La sezione mostra gli import già presenti e i comandi per caricare, attivare, disattivare o eliminare un prezzario regionale.'
    ] }
  }
  if (chapter.startsWith('19. prezzari') && lower === 'aprire gestione prezzari e selezionare analisi prezzi.') {
    return { paragraphs: [
      'Aprire Gestione prezzari dalla Home oppure dal navigatore laterale e selezionare Analisi prezzi.',
      'Utilizzare Nuovo prezzo per aprire il modulo di creazione; nel passaggio successivo verrà scelta la tipologia ELEMENTARE.'
    ] }
  }
  if (chapter.startsWith('19. prezzari') && lower === 'aprire gestione prezzari, selezionare analisi prezzi e creare un nuovo prezzo.') {
    return { paragraphs: [
      'Aprire Gestione prezzari dalla Home oppure dal navigatore laterale, selezionare Analisi prezzi e utilizzare Nuovo prezzo.',
      'Nel modulo che si apre scegliere ANALIZZATA nel campo Tipologia; i dati dell’intestazione vanno salvati prima di inserire le righe dell’analisi.'
    ] }
  }
  if (chapter.startsWith('19. prezzari') && lower === 'aprire gestione prezzari e selezionare voci interne.') {
    return { paragraphs: [
      'Aprire Gestione prezzari dalla Home oppure dal navigatore laterale e selezionare Voci interne.',
      'Utilizzare la ricerca per individuare il nuovo prezzo già esistente che deve essere modificato, quindi selezionare la relativa riga.'
    ] }
  }
  if (chapter.startsWith('19. prezzari') && lower.startsWith('il responsabile dell’istruttoria tecnica apre gestione prezzari')) {
    return { paragraphs: [
      'Il Responsabile dell’istruttoria tecnica apre Gestione prezzari dalla Home o dal navigatore laterale e seleziona Parametri; da qui può gestire Parametri nota spese e Prezzi delle attrezzature.',
      'Il Responsabile dell’istruttoria amministrativa apre invece Parametri sanzionatori, dove sono disponibili Sanzioni, riduzioni e cauzione. In entrambi i casi selezionare quindi l’archivio da consultare o modificare.'
    ] }
  }
  if (chapter.startsWith('21. dashboard') && lower === 'aprire report.') {
    return { paragraphs: [
      'Aprire Report dalla Home oppure dal navigatore laterale. La vista mostra la tabella delle pratiche accessibili al proprio ruolo con i filtri disponibili nella parte superiore.',
      'Prima di esportare, applicare i filtri necessari e controllare che l’insieme visualizzato corrisponda alle pratiche che si intendono includere.'
    ] }
  }
  if (chapter.startsWith('23. gestione utenti') && lower === 'aprire gestione utenti e usare nuovo utente.') {
    return { paragraphs: [
      'Aprire Gestione utenti dalla Home oppure dal navigatore laterale e utilizzare Nuovo utente.',
      'Si apre il pannello di ricerca dei membri dell’organizzazione ArcGIS Online: cercare e selezionare la persona prima di compilare la relativa assegnazione gestionale.'
    ] }
  }
  if (chapter.startsWith('24. allegati') && lower.startsWith('se si tratta di una richiesta di integrazione, leggere la motivazione')) {
    return { paragraphs: [
      'Nell’Iter individuare l’evento con cui è stata richiesta l’integrazione e leggere la motivazione e il ruolo che ha aperto il rimando.',
      'Proseguire negli eventi successivi cercando Esito integrazione trasmesso. Seguire questi passaggi fino al ritorno dell’esito al ruolo che aveva richiesto la correzione: da quel punto riprende la normale verifica, validazione o approvazione.'
    ] }
  }

  if (chapter.startsWith('4. nuova rilevazione') && lower === 'aprire la nuova rilevazione ricevuta.') {
    return { paragraphs: [
      'Aprire la campanella e utilizzare Apri pratica sull’allarme Nuova rilevazione ricevuta; in alternativa entrare in Elenco pratiche, scheda In attesa mia, e selezionare la rilevazione.',
      'Prima di procedere all’assegnazione, verificare che la riga selezionata corrisponda alla rilevazione appena ricevuta e che nel Dettaglio siano disponibili i dati acquisiti dal Tecnico rilevatore.'
    ] }
  }
  if (chapter.startsWith('10. ingresso nella fase amministrativa') && lower === 'aprire la nuova istruttoria amministrativa.') {
    return { paragraphs: [
      'Aprire dalla campanella l’allarme relativo al nuovo fascicolo oppure entrare in Elenco pratiche, scheda In attesa mia, e selezionare la pratica appena entrata nella fase amministrativa.',
      'Controllare che la fase tecnica risulti approvata e che la pratica sia destinata al Responsabile dell’istruttoria amministrativa prima di prenderla in carico.'
    ] }
  }
  if (chapter.startsWith('10. ingresso nella fase amministrativa') && lower === 'confermare l’istruttore amministrativo selezionato.') {
    return { paragraphs: [
      'Nel pannello di assegnazione controllare il nominativo dell’Istruttore amministrativo scelto e verificare che corrisponda alla pratica da affidare.',
      'Confermare l’assegnazione. Il gestionale registra Istruttoria assegnata e la pratica passa nella In attesa mia dell’Istruttore amministrativo selezionato.'
    ] }
  }

  if (chapter.startsWith('11. istruttoria amministrativa') && lower === 'valutare l’istruttoria amministrativa.') {
    return { paragraphs: [
      'Nella scheda Iter approvativo utilizzare Gestisci istruttoria per esprimere l’esito della verifica svolta dall’Istruttore amministrativo.',
      'Scegliere Conforme quando il fascicolo può proseguire alla predisposizione dei documenti amministrativi. Scegliere Non conforme quando occorre chiedere un’integrazione tramite il Responsabile dell’istruttoria amministrativa; in questo caso compilare la motivazione prima della conferma.'
    ] }
  }

  if (chapter.startsWith('6. verifica del capo settore') && (lower === 'aprire gestisci istruttoria.' || lower === 'scegliere l’esito della verifica.')) {
    return { paragraphs: [
      'Con la pratica già presa in carico, utilizzare Gestisci istruttoria nell’area Azioni. Il pannello propone gli esiti previsti per la verifica del Capo Settore.',
      'Scegliere Conforme per trasmettere la pratica al Responsabile dell’istruttoria tecnica. Se sono necessarie correzioni, scegliere il rimando all’Istruttore tecnico e compilare la motivazione; quando ricorrono i casi previsti è disponibile anche il respingimento. Prima di confermare controllare esito e destinatario.'
    ] }
  }
  if (chapter.startsWith('7. validazione del responsabile') && (lower === 'aprire gestisci istruttoria.' || lower === 'scegliere l’esito della validazione tecnica.')) {
    return { paragraphs: [
      'Con la pratica in carico, utilizzare Gestisci istruttoria nell’area Azioni. Il pannello consente di concludere la validazione oppure di richiedere un’integrazione.',
      'Selezionare Conforme per trasmettere al Direttore tecnico. Se occorrono correzioni, indicare il rimando all’Istruttore tecnico e la motivazione. Il Responsabile dell’istruttoria tecnica non dispone del respingimento finale previsto per il Direttore tecnico.'
    ] }
  }
  if (chapter.startsWith('8. approvazione del direttore') && (lower === 'aprire gestisci istruttoria.' || lower === 'scegliere l’esito dell’approvazione tecnica.')) {
    return { paragraphs: [
      'Con la pratica in carico, utilizzare Gestisci istruttoria nell’area Azioni e scegliere l’esito dell’approvazione tecnica.',
      'Conforme trasmette la pratica al Responsabile dell’istruttoria amministrativa. Per una richiesta di integrazione indicare gli aspetti da correggere: se riguardano soltanto Occorrenza e/o Grado di gravità la pratica viene trasmessa al Responsabile dell’istruttoria tecnica, negli altri casi tecnici all’Istruttore tecnico. Il respingimento, quando previsto, interrompe l’avanzamento verso la fase amministrativa.'
    ] }
  }
  if (chapter.startsWith('10. ingresso nella fase amministrativa') && (lower.startsWith('aprire gestisci istruttoria') || lower.startsWith('assegnare la pratica a un istruttore amministrativo'))) {
    return { paragraphs: [
      'Dopo la presa in carico e il controllo del fascicolo tecnico, utilizzare Gestisci istruttoria e scegliere l’azione di assegnazione.',
      'Selezionare l’Istruttore amministrativo tra quelli disponibili, verificare il nominativo nel riepilogo e confermare. La pratica viene registrata come Istruttoria assegnata e passa nella In attesa mia dell’Istruttore scelto.'
    ] }
  }
  if (chapter.startsWith('12. verifica del responsabile') && (lower === 'aprire gestisci istruttoria.' || lower === 'scegliere l’esito della verifica amministrativa.')) {
    return { paragraphs: [
      'Dopo avere controllato Iter approvativo, fascicolo e allegati, utilizzare Gestisci istruttoria per esprimere l’esito della verifica amministrativa.',
      'Conforme valida il fascicolo e lo restituisce all’Istruttore amministrativo assegnato per gli adempimenti successivi. Con Non conforme indicare gli aspetti da integrare: quelli amministrativi riportano la pratica all’Istruttore amministrativo, quelli tecnici al Responsabile dell’istruttoria tecnica.'
    ] }
  }
  if (chapter.startsWith('14. atto di accertamento') && section.includes('responsabile dell’istruttoria amministrativa') && (lower === 'aprire gestisci istruttoria.' || lower === 'scegliere l’esito della verifica dell’atto.')) {
    return { paragraphs: [
      'Dopo avere confrontato la bozza dell’Atto con la pratica e con la determinazione approvata, utilizzare Gestisci istruttoria.',
      'Se l’Atto è conforme, approvarlo: la pratica torna all’Istruttore amministrativo e viene registrato Atto di accertamento approvato. Se non è conforme, indicare la motivazione del rimando all’Istruttore amministrativo; in questa fase non si apre una nuova integrazione tecnica.'
    ] }
  }

  if (chapter.startsWith('13. determinazione') && section.includes('inviare e riacquisire il fascicolo protocollato')) {
    if (lower.startsWith('quando sono disponibili i pdf protocollati')) {
      return { paragraphs: [
        'Selezionare insieme tutti i PDF restituiti dal protocollo, senza caricarli uno alla volta. Il gestionale li confronta con la composizione del fascicolo trasmesso: controlla numero dei file, documenti attesi ed estremi di protocollo e verifica che i documenti che devono condividere lo stesso protocollo riportino dati coerenti.',
        'Se il controllo è superato, le copie protocollate sostituiscono quelle precedenti e gli estremi vengono acquisiti nella pratica. Se compare un’incongruenza, correggere il set di documenti prima di proseguire.'
      ] }
    }
    if (lower.startsWith('salvare i dati di protocollo')) {
      return { paragraphs: [
        'Dopo l’acquisizione dei PDF protocollati, controllare che numero e data di protocollo siano presenti e che i documenti mostrati siano quelli appena verificati.',
        'Utilizzare Salva per registrare definitivamente questi estremi nella pratica. Solo dopo il salvataggio proseguire con la determinazione definitiva.'
      ] }
    }
  }
  if (chapter.startsWith('13. determinazione') && section.includes('completare la determinazione dopo il protocollo')) {
    if (lower.startsWith('convertire esternamente il word in pdf')) {
      return { paragraphs: [
        'Aprire il Word prodotto da Genera/Aggiorna determinazione, convertirlo in PDF con l’applicazione utilizzata per i documenti d’ufficio e tornare nella pratica.',
        'Utilizzare l’azione di caricamento del PDF definitivo. Il gestionale confronta il documento con quello atteso e, quando il contenuto è coerente, acquisisce automaticamente numero e data della determinazione presenti nel PDF.'
      ] }
    }
    if (lower.startsWith('salvare gli estremi della determinazione')) {
      return { paragraphs: [
        'Prima di salvare, controllare il numero e la data della determinazione acquisiti dal PDF definitivo. Se non corrispondono al documento, non proseguire e verificare il file caricato.',
        'Utilizzare Salva per registrare gli estremi. Dal numero della determinazione il gestionale ricava il numero dell’Atto di accertamento nel formato previsto.'
      ] }
    }
  }

  if (chapter.startsWith('14. atto di accertamento') && section.includes('preparare e trasmettere la bozza')) {
    if (lower === 'salvare i dati richiesti.') {
      return { paragraphs: [
        'Dopo avere completato Modalità di pagamento, Tipo di notifica e Spese di notifica, controllare il riepilogo economico e utilizzare Salva.',
        'Il salvataggio rende disponibili i dati necessari alla generazione della bozza dell’Atto. Se manca un dato obbligatorio, completarlo prima di usare Genera bozza Word dell’Atto.'
      ] }
    }
  }
  if (chapter.startsWith('14. atto di accertamento') && section.includes('completare l’atto approvato')) {
    if (lower.startsWith('convertire il word in pdf e caricare il pdf senza filigrana')) {
      return { paragraphs: [
        'Aprire il Word dell’Atto senza filigrana generato dal gestionale, convertirlo in PDF e caricare quel PDF nella stessa sezione.',
        'Il gestionale verifica che il contenuto corrisponda alla versione approvata dal Responsabile dell’istruttoria amministrativa. Solo il PDF che supera il controllo viene identificato come versione da sottoporre alla firma digitale.'
      ] }
    }
    if (lower.startsWith('quando sono disponibili i documenti protocollati')) {
      return { paragraphs: [
        'Selezionare insieme i documenti restituiti dal protocollo. Il gestionale controlla che siano presenti tutti i PDF richiesti, che l’Atto mantenga la firma digitale e che gli estremi di protocollo siano leggibili e coerenti.',
        'Se il controllo non è superato, sostituire il set con i documenti corretti prima di salvare gli estremi.'
      ] }
    }
    if (lower.startsWith('salvare gli estremi di protocollo acquisiti')) {
      return { paragraphs: [
        'Controllare numero e data di protocollo acquisiti e verificare che l’Atto protocollato sia quello firmato digitalmente già validato dal sistema.',
        'Utilizzare Salva. Il completamento di questo passaggio rende operative le funzioni definitive di notifica descritte nel Cap. 16.'
      ] }
    }
    if (lower.startsWith('dopo la firma digitale esterna')) {
      return { paragraphs: [
        'Dopo avere ricevuto il PDF firmato digitalmente dal Direttore amministrativo, utilizzare Carica il PDF firmato digitalmente dal Direttore e selezionare il documento ricevuto.',
        'Il gestionale controlla l’integrità del contenuto, la presenza della firma digitale e l’identità del firmatario rispetto alla Rubrica. Per la gestione dei firmatari vedere Cap. 22.1. L’Amministratore del sistema può superare soltanto un disallineamento dell’identità, non l’assenza della firma né una modifica del contenuto.'
      ] }
    }
  }

  if (chapter.startsWith('15. modalità di pagamento')) {
    if (section.includes('impostare un piano di pagamento manuale') && lower.startsWith('caricare l’eventuale documento collegato')) {
      return { paragraphs: [
        'Nella riga della posizione interessata utilizzare il comando di caricamento del documento e selezionare il PDF riferito proprio a quella posizione, ad esempio l’avviso o il bollettino corrispondente.',
        'Dopo il caricamento controllare che il documento risulti associato alla posizione corretta e usare Aggiorna sulla posizione prima del salvataggio complessivo della pratica.'
      ] }
    }
    if (section.includes('caricare gli avvisi pagopa')) {
      if (lower.startsWith('selezionare insieme tutti i pdf prodotti')) {
        return { paragraphs: [
          'Selezionare in un’unica operazione l’avviso per l’unica soluzione e, quando previste, tutte le rate. Non caricare una parte del piano separatamente.',
          'Il gestionale legge i QR code e i PDF per ricavare importo, codice avviso/IUV, Ente Creditore e scadenza; controlla inoltre che i codici siano validi e univoci, che l’Ente Creditore sia quello atteso e che unica soluzione e rate siano coerenti con il totale dovuto.'
        ] }
      }
      if (lower.startsWith('controllare il piano pagopa')) {
        return { paragraphs: [
          'Nel piano ricostruito verificare l’unica soluzione e, se presenti, tutte le rate: controllare importi, scadenze, codici avviso/IUV e documenti associati.',
          'Il totale delle rate deve corrispondere al totale dovuto, salvo l’eventuale arrotondamento centesimale gestito dal sistema. Se il piano è incompleto o incoerente, correggere i PDF selezionati prima di salvare.'
        ] }
      }
      if (lower.startsWith('salvare il piano pagopa')) {
        return { paragraphs: [
          'Quando il piano ricostruito è corretto, utilizzare Salva nella pratica. Solo con il salvataggio il nuovo set di avvisi, o la sostituzione di quello precedente, diventa definitivo.',
          'Dopo il salvataggio controllare lo stato del pagamento: quando tutte le posizioni sono complete deve risultare Generato; in caso contrario resta da completare.'
        ] }
      }
    }
    if (section.includes('sostituire un piano pagopa') && (lower.startsWith('premere salva') || lower.startsWith('salvare il nuovo piano pagopa'))) {
      return { paragraphs: [
        'Dopo avere confermato Sostituisci avvisi e controllato il nuovo piano, utilizzare Salva per rendere definitiva la sostituzione.',
        'Finché non viene eseguito il salvataggio, l’operazione resta reversibile: uscendo o annullando prima di Salva viene ripristinato il piano precedente.'
      ] }
    }
  }

  if (chapter.startsWith('16. protocollo, notifica') && section.includes('registrare la notifica')) {
    if (lower.startsWith('usare carica documentazione esito notifica')) {
      return { paragraphs: [
        'Dopo avere scelto l’esito, utilizzare Carica documentazione esito notifica e selezionare il PDF protocollato che prova quell’esito, ad esempio relata, ricevuta PEC o avviso di ricevimento.',
        'Quando il documento contiene estremi leggibili, il gestionale acquisisce numero e data del protocollo e archivia il PDF tra gli Allegati. Controllare gli estremi acquisiti prima del salvataggio.'
      ] }
    }
    if (lower.startsWith('salvare l’esito della notifica')) {
      return { paragraphs: [
        'Verificare l’esito selezionato, il documento caricato e gli eventuali estremi di protocollo acquisiti, quindi utilizzare Salva.',
        'Con Notificata o Compiuta giacenza si rendono disponibili le attività successive su pagamento, ricorso e definizione; con Non notificata o Irreperibile tali attività restano bloccate. Se è stato scelto Altro, completare anche la descrizione richiesta.'
      ] }
    }
  }

  if (chapter.startsWith('17. ricorso')) {
    if (section.includes('registrare un ricorso') && (lower === 'premere salva.' || lower === 'salvare i dati del ricorso.')) {
      return { paragraphs: [
        'Dopo avere compilato i dati del ricorso, controllare in particolare data di presentazione, protocollo, presentatore, eventuale sospensione del pagamento e motivazione, quindi utilizzare Salva.',
        'Dopo il salvataggio verificare che la scheda riporti i dati inseriti e l’eventuale indicazione di presentazione tardiva.'
      ] }
    }
    if (section.includes('riaprire e avviare una nuova istruttoria amministrativa')) {
      if (lower.startsWith('salvare la riapertura')) {
        return { paragraphs: [
          'Dopo avere compilato ordine di riapertura, causa, data, soggetto che l’ha disposto, estremi autorizzativi e motivazione, utilizzare Salva nella scheda Riapertura.',
          'Il salvataggio registra lo storico della riapertura; soltanto dopo questo passaggio utilizzare Gestisci istruttoria per avviare la nuova istruttoria amministrativa.'
        ] }
      }
      if (lower.startsWith('tornare a gestisci istruttoria')) {
        return { paragraphs: [
          'Dopo avere salvato la Riapertura, tornare all’Elenco pratiche mantenendo selezionata la pratica e utilizzare Gestisci istruttoria.',
          'Scegliere Avvia nuova istruttoria amministrativa: il pannello richiede l’Istruttore amministrativo cui assegnare il nuovo ciclo, mantenendo consultabile lo storico precedente.'
        ] }
      }
      if (lower.startsWith('selezionare l’istruttore amministrativo che svolgerà')) {
        return { paragraphs: [
          'Nel pannello di avvio della nuova istruttoria selezionare l’Istruttore amministrativo incaricato tra quelli disponibili e controllare il nominativo prima della conferma.',
          'Confermando, la pratica viene assegnata al nuovo ciclo amministrativo e deve risultare da prendere in carico per l’Istruttore scelto; lo storico di ricorso, CdA e riapertura resta invariato.'
        ] }
      }
    }
    if (section.includes('registrare l’incasso e definire la pratica') && lower === 'aprire definizione.') {
      return { paragraphs: [
        'Nella lavorazione amministrativa aprire Definizione quando il procedimento è arrivato alla fase conclusiva. La sezione contiene Incasso e modalità di definizione della pratica.',
        'Compilare insieme importo incassato, data e riferimenti: il sistema non accetta uno di questi elementi isolato. Dopo il controllo dello stato di pagamento proposto, scegliere la modalità di definizione coerente con l’esito reale e salvare.'
      ] }
    }
  }

  if (chapter.startsWith('18. nota spese') && (lower.startsWith('premere salva per rendere definitive') || lower === 'salvare la nota spese.')) {
    return { paragraphs: [
      'Dopo avere confermato le voci dal Browser, impostato le quantità e controllato il riepilogo per categoria, le spese generali e il totale, utilizzare Salva nella pratica tecnica.',
      'Il salvataggio rende definitive le voci e le quantità della Nota spese. Riaprire la sezione per un controllo finale del totale e verificare che non siano rimaste segnalazioni di dati mancanti.'
    ] }
  }

  if (chapter.startsWith('19. prezzari')) {
    if (section.includes('creare un nuovo prezzo elementare')) {
      if (lower.startsWith('creare un nuovo prezzo e scegliere tipologia')) {
        return { paragraphs: [
          'Nella vista Analisi prezzi utilizzare Nuovo prezzo. Nel campo Tipologia scegliere ELEMENTARE: in questa modalità il prezzo viene inserito manualmente e le righe di analisi non sono disponibili.',
          'Impostare quindi Anno listino e la gerarchia Super capitolo, Capitolo e Sub capitolo. Il Codice voce viene generato dal sistema e resta in sola lettura.'
        ] }
      }
      if (lower === 'salvare.' || lower === 'salvare il nuovo prezzo elementare.') {
        return { paragraphs: [
          'Prima di salvare controllare Descrizione, Unità di misura, Prezzo unitario, stato Attivo ed eventuali Note. Per un prezzo ELEMENTARE il Prezzo unitario è obbligatorio e viene inserito manualmente.',
          'Utilizzare Salva. Il nuovo prezzo viene registrato con il codice generato dal sistema e, se Attivo, diventa disponibile come componente di altri prezzi analizzati.'
        ] }
      }
    }
    if (section.includes('creare un nuovo prezzo analizzato') && lower.startsWith('salvare l’intestazione')) {
      return { paragraphs: [
        'Dopo avere impostato Tipologia ANALIZZATA e compilato Anno listino, gerarchia, Descrizione, Unità di misura e Note, utilizzare Salva per creare la testata del nuovo prezzo.',
        'Il Prezzo unitario non va inserito manualmente: dopo il salvataggio si abilita la sezione delle righe di analisi e il prezzo complessivo viene calcolato dalla somma degli importi delle componenti.'
      ] }
    }
    if (section.includes('modificare un nuovo prezzo esistente')) {
      if (lower.startsWith('cercare/selezionare')) {
        return { paragraphs: [
          'Nella vista Voci interne utilizzare il campo di ricerca per restringere l’elenco dei Nuovi Prezzi e selezionare la riga da modificare.',
          'Controllare codice e tipologia prima di intervenire: per un prezzo ELEMENTARE è modificabile anche il prezzo unitario; per un prezzo ANALIZZATO il prezzo resta calcolato dall’analisi.'
        ] }
      }
      if (lower.startsWith('salvare le modifiche')) {
        return { paragraphs: [
          'Dopo avere aggiornato Descrizione, Unità di misura, stato Attivo, Note e, per i soli ELEMENTARI, il prezzo, utilizzare Salva.',
          'Controllare che la riga mostri i nuovi valori. L’eliminazione è un’operazione separata e viene bloccata se il prezzo è già utilizzato come componente di altre analisi.'
        ] }
      }
    }
    if (section.includes('creare o modificare un parametro') && (lower.startsWith('salvare.') || lower.startsWith('salvare il parametro'))) {
      return { paragraphs: [
        'Dopo avere compilato i campi previsti per il tipo di parametro, controllare anno, valore, stato Attivo, periodo di validità ed eventuali Note e utilizzare Salva.',
        'Per i Prezzi delle attrezzature verificare anche Tipo di attrezzatura e Valore unitario. Se serve un’estrazione dell’archivio corrente, utilizzare Esporta CSV dopo il salvataggio.'
      ] }
    }
    if (section.includes('consultare una voce di prezzario')) {
      if (lower.startsWith('usare cerca per codice') || lower === 'cercare una voce di prezzario.') {
        return { paragraphs: [
          'Digitare nel campo Cerca il codice o una parte della descrizione; in alternativa utilizzare Famiglia, Capitolo e Sottocapitolo oppure l’albero gerarchico della sorgente selezionata.',
          'I criteri restringono l’elenco corrente. Per tornare a tutte le voci utilizzare Tutte le voci o azzerare i criteri applicati.'
        ] }
      }
      if (lower.startsWith('ordinare l’elenco')) {
        return { paragraphs: [
          'Fare clic sull’intestazione Codice, Descrizione, Unità di misura o Prezzo per cambiare l’ordinamento dell’elenco.',
          'Usare l’ordinamento insieme ai filtri per individuare più rapidamente la voce da consultare; la selezione della riga apre il relativo dettaglio e, quando disponibile, l’analisi delle componenti.'
        ] }
      }
    }
  }

  if (chapter.startsWith('20. mappa')) {
    if (section.includes('cercare una particella catastale') && (lower === 'usare cerca.' || lower === 'eseguire la ricerca catastale.')) {
      return { paragraphs: [
        'Dopo avere scelto almeno il Comune e gli eventuali livelli successivi Sezione, Foglio e Mappale, utilizzare Cerca.',
        'I risultati vengono elencati e la geometria corrispondente viene evidenziata sulla mappa. Prima di una nuova interrogazione azzerare i criteri che non devono essere mantenuti.'
      ] }
    }
    if (section.includes('cercare un’opera') && (lower.startsWith('usare cerca') || lower === 'eseguire la ricerca delle opere.')) {
      return { paragraphs: [
        'Dopo avere impostato Stato, Tipo e/o Nome, utilizzare Cerca. Le opere che soddisfano i criteri vengono mostrate nell’elenco dei risultati e localizzate sulla mappa.',
        'Se i criteri non producono il risultato atteso, ridurli o azzerarli e ripetere la ricerca.'
      ] }
    }
    if (section.includes('cercare una pratica sulla mappa') && (lower.startsWith('usare cerca.') || lower === 'eseguire la ricerca delle pratiche.')) {
      return { paragraphs: [
        'Dopo avere impostato almeno un criterio, utilizzare Cerca. Se si usa Numero pratica, verificare di avere selezionato anche il Tipo pratica corretto: Rilevazione, Rapporto tecnico oppure Atto di accertamento.',
        'L’elenco e la mappa mostrano soltanto le pratiche che il profilo corrente è autorizzato a vedere. Controllare il conteggio dei risultati e l’eventuale avviso che segnala la visualizzazione dei soli primi elementi.'
      ] }
    }
  }

  if (chapter.startsWith('21. dashboard')) {
    if (section.includes('usare la dashboard') && lower.startsWith('selezionare i filtri interattivi')) {
      return { paragraphs: [
        'Nella sezione Statistiche selezionare un Ufficio o una tipologia di Infrazione dai filtri interattivi. Gli indicatori e i grafici della pagina si aggiornano in base alla selezione corrente.',
        'È possibile combinare le selezioni disponibili; utilizzare Azzera filtri per ripristinare l’intero insieme di dati visibile al proprio profilo.'
      ] }
    }
    if (section.includes('consultare ed esportare il report') && lower.startsWith('ordinare le colonne')) {
      return { paragraphs: [
        'Fare clic sull’intestazione della colonna che si vuole usare per l’ordinamento. Ripetere il clic per cambiare direzione; se la vista consente più criteri, l’ordine di priorità viene mostrato accanto alle intestazioni.',
        'Utilizzare il comando di reset dell’ordinamento per tornare alla disposizione predefinita senza modificare i filtri già impostati.'
      ] }
    }
  }

  if (chapter.startsWith('22. rubrica')) {
    if (section.includes('aggiungere un destinatario e-mail') && (lower === 'salvare.' || lower === 'salvare il destinatario e-mail.')) {
      return { paragraphs: [
        'Prima di salvare controllare Tipo, nominativo o Denominazione, E-mail e Utilizzo. Se il sistema segnala un omonimo, completare prima la verifica richiesta per riutilizzare la persona esistente o registrare un soggetto distinto.',
        'Utilizzare Salva e verificare che il destinatario compaia nell’elenco. Per gli utilizzi che ammettono un solo destinatario attivo, risolvere l’eventuale duplicazione segnalata dal sistema.'
      ] }
    }
    if (section.includes('aggiungere un firmatario') && (lower.startsWith('salvare.') || lower === 'salvare il firmatario.')) {
      return { paragraphs: [
        'Controllare Titolo, Nome, Cognome e, quando necessaria per distinguere omonimi, Data di nascita; quindi utilizzare Salva.',
        'Dopo il salvataggio il nominativo entra nell’elenco dei firmatari autorizzati usato dal controllo della firma digitale dell’Atto di accertamento.'
      ] }
    }
    if (section.includes('cercare e consultare il regolamento') && (lower.startsWith('usare cerca digitando') || lower === 'cercare nel regolamento irriguo.')) {
      return { paragraphs: [
        'Digitare nel campo Cerca una parola, il numero di un articolo, parte del titolo o il nome di una sezione. Durante la digitazione l’Indice regolamento si restringe alle sole sezioni e agli articoli corrispondenti.',
        'Il numero dell’articolo può essere scritto in più forme: ad esempio 8, art 8, art. 8 o art8 trovano tutti l’articolo 8.',
        'Selezionare il risultato desiderato per leggere il Testo articolo nel pannello di destra. Utilizzare Pulisci ricerca o Reimposta indice per tornare all’indice completo.'
      ] }
    }
  }

  if (chapter.startsWith('23. gestione utenti')) {
    if (section.includes('aggiungere un utente') && lower.startsWith('salvare l’utente')) {
      return { paragraphs: [
        'Prima di salvare controllare il membro ArcGIS Online selezionato, il Ruolo, l’ambito organizzativo richiesto e il Gruppo calcolato dal gestionale.',
        'Utilizzare Salva. Se il ruolo prevede un gruppo ArcGIS Online, il gestionale aggiorna automaticamente anche l’appartenenza al gruppo; attendere il messaggio Utente aggiunto e verificare la nuova riga nell’elenco.'
      ] }
    }
    if (section.includes('aggiungere un nuovo ruolo allo stesso utente') && (lower.startsWith('salvare.') || lower === 'salvare la nuova assegnazione.')) {
      return { paragraphs: [
        'Dopo avere scelto il nuovo Ruolo e compilato l’ambito organizzativo richiesto, controllare il Gruppo calcolato e utilizzare Salva.',
        'Il gestionale impedisce di creare una seconda assegnazione identica a una già presente. Se la nuova assegnazione richiede un gruppo ArcGIS Online, viene aggiornata anche la relativa appartenenza.'
      ] }
    }
  }

  if (chapter.startsWith('24. allegati')) {
    if (section.includes('gestire un allegato ordinario') && (lower.startsWith('nella lavorazione tecnica premere salva') || lower === 'salvare le modifiche agli allegati.')) {
      return { paragraphs: [
        'Nella lavorazione tecnica, dopo aggiunte, sostituzioni, eliminazioni o rotazioni predisposte sugli allegati, utilizzare Salva per rendere definitive le operazioni insieme alle altre modifiche della pratica.',
        'Nella lavorazione amministrativa aggiunta, sostituzione ed eliminazione degli allegati amministrativi ordinari sono già applicate dal relativo comando; Salva registra invece le eventuali rotazioni preparate nel visualizzatore e le altre modifiche pendenti. Dopo il salvataggio controllare nuovamente l’elenco degli Allegati.'
      ] }
    }
    if (section.includes('ricostruire una modifica con l’iter')) {
      if (lower.startsWith('aprire dettaglio pratica')) {
        return { paragraphs: [
          'Nell’Elenco pratiche selezionare la pratica interessata e aprire la scheda Iter nel pannello Dettaglio pratica selezionata.',
          'La scheda mostra gli eventi della pratica con stato, date, Avviato da, Trasmesso a, note, campi modificati e variazioni degli allegati. Selezionando nuovamente Iter è possibile invertire l’ordine cronologico.'
        ] }
      }
      if (lower.startsWith('scorrere gli eventi fino al periodo')) {
        return { paragraphs: [
          'Scorrere i blocchi dell’Iter e usare insieme data, ruolo, stato dell’evento e descrizione per individuare il passaggio che interessa.',
          'Una volta trovato, leggere Avviato da e Trasmesso a per ricostruire il trasferimento di responsabilità; quindi controllare Campi modificati, variazioni degli Allegati ed eventuali motivazioni di rimando.'
        ] }
      }
    }
  }

  return null
}

function includesAny(text: string, values: string[]): boolean {
  const t = text.toLowerCase()
  return values.some(v => t.includes(v.toLowerCase()))
}

export function getGuideStepHelp(text: string, sectionTitle = '', chapterTitle = ''): GuideStepHelp | null {
  const reviewed = getReviewedStepHelp(text, sectionTitle, chapterTitle)
  if (reviewed) return reviewed

  const exact = exactHelp[text]
  if (exact) return exact

  const lower = text.toLowerCase()
  const section = sectionTitle.toLowerCase()
  const chapter = chapterTitle.toLowerCase()

  if (text === 'Dopo la presa in carico l’allarme operativo corrente viene rimosso.') return null

  // Nuova pratica e lavorazione tecnica
  if (chapter.startsWith('4. nuova rilevazione')) {
    if (lower.startsWith('avviare una nuova pratica')) {
      return {
        paragraphs: [
          'Aprire Nuova pratica dalla Home oppure dal navigatore laterale. Se l’Istruttore tecnico è assegnato a più settori, selezionare prima il settore cui appartiene la pratica da creare; se è assegnato a un solo settore, la scelta non è richiesta.',
          'La nuova pratica si apre sulla scheda Trasgressore, con i Dati generali già compilati automaticamente dal sistema.'
        ]
      }
    }
    if (lower.startsWith('controllare nel dettaglio')) {
      return {
        paragraphs: [
          'Dopo avere selezionato la rilevazione, usare il pannello Dettaglio pratica selezionata sulla destra. Passare tra Trasgressore, Violazione, Luoghi e dati, Mappa, Nota spese, Allegati e Iter per verificare ciò che è già stato acquisito dal Tecnico rilevatore.',
          'In Luoghi e dati sono già presenti i Dati tecnici rilevati e le eventuali Annotazioni tecniche provenienti dal Survey, insieme ai dati catastali ricavati dal gestionale dalla posizione della rilevazione.',
          'In questa fase il Capo Settore sta consultando la rilevazione prima dell’assegnazione: non è necessario aprire una lavorazione tecnica per controllare i dati.'
        ]
      }
    }
    if (lower.startsWith('selezionare l’istruttore tecnico competente')) {
      return {
        paragraphs: [
          'Nel pannello Gestisci istruttoria aprire l’elenco degli Istruttori tecnici disponibili per l’ambito della rilevazione e selezionare il nominativo cui affidare la pratica.',
          'Prima di confermare controllare il destinatario indicato nel riepilogo del pannello. La conferma assegna la pratica all’Istruttore tecnico scelto e la rende disponibile nella sua In attesa mia.'
        ]
      }
    }
    if (lower.startsWith('verificare i dati generali')) {
      return {
        paragraphs: [
          'Nella nuova pratica, che si apre sulla scheda Trasgressore, aprire la scheda Dati generali e controllare i valori compilati automaticamente dal sistema per Area, Settore, Ufficio di zona, Tecnico rilevatore, Istruttore tecnico e Data rilevazione. I campi sono in sola lettura.',
          'Se l’Istruttore tecnico è assegnato a più settori e, controllando i Dati generali, si accorge di aver selezionato quello errato, può utilizzare l’azione Elimina pratica e generarne una nuova nel settore corretto, purché non l’abbia ancora trasmessa al Capo Settore. Se si accorge dell’errore dopo la trasmissione, la pratica potrà essere eliminata dal Capo Settore.'
        ]
      }
    }
    if (lower.startsWith('compilare i dati del trasgressore')) {
      return {
        paragraphs: [
          'Nella scheda Trasgressore selezionare per prima cosa la Tipologia soggetto e indicare la qualifica o il rapporto con il fondo. La scelta tra persona fisica e persona giuridica determina i campi da compilare.',
          'Per la persona fisica inserire nome, cognome e codice fiscale; per la persona giuridica indicare ragione sociale e partita IVA. Completare quindi residenza o sede legale e i recapiti disponibili.',
          'Se il domicilio da utilizzare per le notifiche è diverso dalla residenza o dalla sede legale, indicarlo nella sezione Domicilio per le notifiche. Per una persona giuridica completare anche i dati del rappresentante legale e, quando necessario, il relativo domicilio per le notifiche.',
          'Prima di proseguire controllare i dati identificativi inseriti. I controlli formali applicati al salvataggio sono riepilogati nel Cap. 5.2.'
        ]
      }
    }
    if (lower.startsWith('compilare la violazione')) {
      return {
        paragraphs: [
          'Nella scheda Violazione selezionare le fattispecie effettivamente accertate. Per l’Art. 15 indicare il tipo di abuso e le superfici richieste; per gli Artt. 16 e 17 scegliere il tipo di inosservanza e compilare i dati che il sistema rende disponibili in base alla fattispecie selezionata. Le altre violazioni si selezionano dalle relative voci dell’elenco.',
          'Le colonne Punto mappa e Nota spese indicano se la violazione scelta richiede anche la localizzazione cartografica o la compilazione di una Nota spese. Occorrenza e Gravità appartengono invece alla successiva valutazione del Responsabile dell’istruttoria tecnica e non sono compilate dall’Istruttore tecnico.',
          'Completare la Descrizione dettagliata della violazione, le eventuali Circostanze rilevanti e indicare se il trasgressore era presente quando il campo è richiesto.',
          'Per verificare numero e titolo dell’articolo utilizzare il relativo riferimento al Regolamento. I controlli specifici applicati alle violazioni al momento del salvataggio sono descritti nel Cap. 5.2; per la consultazione completa del Regolamento irriguo vedere Cap. 22.2.'
        ],
        figure: 'Figura – Violazione nella lavorazione tecnica'
      }
    }
    if (lower.startsWith('compilare luoghi e dati tecnici')) {
      return {
        paragraphs: [
          'Nella scheda Luoghi e dati tecnici descrivere il luogo dell’accertamento e compilare, quando disponibili, Matricola contatore e Matricola tessera.',
          'Se nella scheda Violazione la fattispecie selezionata richiede il Punto mappa, nella sezione Localizzazione utilizzare Imposta punto in mappa e fare clic sulla posizione esatta nella mappa. Dopo il clic il gestionale mostra il punto impostato e le relative coordinate.',
          'Impostato il punto, il gestionale ricava automaticamente i dati catastali (Comune, Sezione, Foglio e Mappale), mostrati in sola lettura, e i Dati tecnici rilevati, cioè gli elementi di rete e i manufatti individuati entro 2 m dal punto. Durante l’interrogazione compare il messaggio Rilevazione automatica dei dati catastali e tecnici; se un dato non può essere ricavato, il gestionale lo segnala e basta riposizionare il punto per riprovare.',
          'Il testo dei Dati tecnici rilevati può essere corretto o integrato a mano; nelle Annotazioni tecniche del Tecnico rilevatore possono essere precisati l’elemento interessato o altre informazioni utili.',
          'Per correggere la posizione utilizzare Modifica punto e fare nuovamente clic sulla mappa: dati catastali e tecnici vengono ricalcolati. Ripristina posizione originale riporta il punto salvato insieme ai relativi dati. Il pulsante Centra sul punto, sotto Home tra gli strumenti della mappa, riporta la mappa sul punto della pratica. Prima del salvataggio controllare che il punto corrisponda effettivamente al luogo dell’accertamento.',
          'Quando il Punto mappa è obbligatorio, la pratica non può essere salvata finché la localizzazione non è stata impostata.'
        ]
      }
    }
    if (lower.startsWith('compilare la nota spese')) {
      return {
        paragraphs: [
          'Dopo il primo salvataggio, utilizzare la scheda Nota spese quando la violazione selezionata prevede una delle casistiche abilitate. Selezionare la violazione o la casistica cui associare la spesa e, quando richiesto, l’attrezzatura interessata.',
          'Utilizzare Sfoglia prezzario, cercare e selezionare le voci necessarie e confermarle. Nella Nota spese indicare quindi le quantità e gli eventuali dati specifici richiesti e controllare il riepilogo economico.',
          'La compilazione completa della Nota spese, comprese categorie di costo, attrezzature, regole delle voci e controlli finali, è descritta nel Cap. 18.'
        ]
      }
    }
    if (lower.startsWith('salvare la nuova pratica')) {
      return {
        paragraphs: [
          'Dopo avere compilato Trasgressore, Violazione e Luoghi e dati tecnici utilizzare Salva. Il primo salvataggio crea la pratica e le assegna l’identificativo.',
          'Se mancano dati obbligatori, il gestionale blocca il salvataggio e indica la sezione da completare. In particolare, quando la violazione richiede il Punto mappa, la localizzazione deve essere già stata impostata.',
          'Dopo il primo salvataggio diventano utilizzabili le funzioni che richiedono una pratica già creata, tra cui Sfoglia prezzario nella Nota spese, Allegati e Anteprima fascicolo.'
        ]
      }
    }
    if (lower.startsWith('gestire gli allegati della pratica')) {
      return {
        paragraphs: [
          'Dopo il primo salvataggio utilizzare la scheda Allegati per aggiungere la documentazione tecnica della pratica. Selezionare Aggiungi allegato, scegliere il file e completare le informazioni richieste; per un allegato già presente utilizzare i comandi della relativa riga per aprirlo, sostituirlo, ruotarlo o rimuoverlo quando l’azione è disponibile.',
          'Controllare nel visualizzatore che il documento caricato sia quello corretto e sia leggibile. Nella lavorazione tecnica le variazioni predisposte sugli allegati diventano definitive con il successivo Salva della pratica.',
          'Per la gestione completa degli Allegati e per il controllo dell’Anteprima fascicolo vedere Cap. 24.1 e Cap. 24.2.'
        ]
      }
    }
    if (lower.startsWith('salvare le modifiche')) {
      return {
        paragraphs: [
          'Dopo avere completato la Nota spese e gestito gli eventuali allegati utilizzare nuovamente Salva. Questo salvataggio rende definitive le modifiche effettuate dopo la creazione iniziale della pratica.',
          'Prima della trasmissione verificare che il gestionale confermi il salvataggio senza segnalare controlli bloccanti.'
        ]
      }
    }
    if (lower.startsWith('trasmettere la nuova rilevazione al capo settore')) {
      return {
        paragraphs: [
          'Quando la compilazione è completa e la pratica è stata salvata, tornare all’Elenco pratiche lasciando selezionata la pratica interessata. Nell’area Azioni utilizzare il comando di trasmissione della nuova rilevazione al Capo Settore.',
          'La trasmissione conclude la lavorazione iniziale dell’Istruttore tecnico e rende la pratica disponibile al Capo Settore per la verifica.'
        ]
      }
    }
  }

  if (chapter.startsWith('5. istruttoria tecnica')) {
    if (lower.startsWith('entrare nella lavorazione tecnica')) {
      return {
        paragraphs: [
          'Con la pratica selezionata e in carico, utilizzare nell’area Azioni il comando di modifica della pratica. La lavorazione tecnica si apre con le schede disponibili nella parte superiore.',
          'Passare tra Trasgressore, Violazione, Luoghi e dati, Nota spese e Allegati. Le schede servono a correggere o completare i dati; per una verifica complessiva utilizzare anche Anteprima fascicolo.'
        ]
      }
    }
    if (lower.startsWith('correggere i dati e premere salva')) {
      return {
        paragraphs: [
          'Modificare i dati nella scheda interessata e utilizzare Salva prima di lasciare la lavorazione o trasmettere la pratica. Se il salvataggio viene bloccato, leggere il messaggio mostrato dal gestionale e tornare al campo o alla sezione indicata.',
          'Dopo la correzione ripetere Salva finché non restano controlli bloccanti.'
        ]
      }
    }
    if (lower.startsWith('controllare l’anteprima fascicolo')) {
      return {
        paragraphs: [
          'Aprire Anteprima fascicolo dalla barra delle schede. Verificare che i dati riepilogati e i documenti inclusi corrispondano alla pratica che si intende trasmettere.',
          'Se si individua un dato errato, tornare alla relativa scheda di lavorazione, correggerlo, salvare e riaprire l’anteprima per un nuovo controllo.'
        ],
        figure: 'Figura – Anteprima fascicolo'
      }
    }
    if (lower.startsWith('aprire le azioni e scegliere elimina')) {
      return {
        paragraphs: [
          'Tornare all’Elenco pratiche lasciando selezionata la pratica interessata. Nell’area Azioni utilizzare Elimina: il comando compare soltanto quando la pratica è stata creata direttamente dallo stesso Istruttore tecnico e non ha ancora superato i limiti previsti per l’archiviazione.',
          'L’operazione non cancella fisicamente la pratica: apre il pannello in cui deve essere indicata la motivazione dell’archiviazione.'
        ]
      }
    }
    if (lower.startsWith('inserire la nota obbligatoria')) {
      return {
        paragraphs: [
          'Nel pannello aperto da Elimina compilare la nota che spiega perché la pratica viene archiviata e quindi confermare.',
          'La pratica viene rimossa dagli elenchi ordinari e l’Iter registra l’Archiviazione; resta consultabile dall’Amministratore del sistema.'
        ]
      }
    }
  }

  // Verifica, validazione e approvazione tecnica
  if (chapter.startsWith('6. verifica del capo settore') || chapter.startsWith('7. validazione del responsabile') || chapter.startsWith('8. approvazione del direttore')) {
    if (lower.startsWith('consultare dettaglio') || lower.startsWith('consultare il fascicolo') || lower.startsWith('controllare il fascicolo')) {
      return {
        paragraphs: [
          'Con la pratica selezionata utilizzare Dettaglio pratica per passare tra le schede e controllare dati, Nota spese, allegati e Iter senza modificarli.',
          'Se il ruolo dispone di una lavorazione limitata, aprirla soltanto quando occorre intervenire sui campi espressamente abilitati; per il resto la verifica si svolge in consultazione. Per la Nota spese vedere Cap. 18; per Allegati, fascicolo e Iter vedere Cap. 24.'
        ]
      }
    }
    if (lower.includes('scegliere conforme') || lower.startsWith('per l’esito positivo')) {
      return {
        paragraphs: [
          'Nel pannello Gestisci istruttoria selezionare Conforme. Prima di confermare verificare il destinatario indicato dal sistema e rileggere il riepilogo dell’azione.',
          'La conferma registra l’esito nell’Iter e trasferisce la pratica al ruolo successivo previsto dalla fase corrente.'
        ]
      }
    }
    if (lower.includes('rimandare') || lower.includes('richiesta di integrazione')) {
      return {
        paragraphs: [
          'Nel pannello Gestisci istruttoria scegliere l’esito che richiede un’integrazione e indicare con precisione la motivazione o gli aspetti da correggere.',
          'Quando il pannello propone categorie o destinatari diversi, selezionare soltanto quelli pertinenti: il gestionale utilizza queste informazioni per trasmettere la pratica al ruolo competente.'
        ]
      }
    }
    if (lower.includes('respingere') || lower.includes('respingimento')) {
      return {
        paragraphs: [
          'Utilizzare l’esito di respingimento soltanto quando il comando è disponibile nella fase corrente. Aprire Gestisci istruttoria, selezionare l’esito previsto e compilare la motivazione richiesta prima della conferma.',
          'Il respingimento interrompe il normale avanzamento della pratica; rileggere quindi con particolare attenzione il riepilogo mostrato dal pannello prima di confermare.'
        ]
      }
    }
    if (chapter.startsWith('7.') && lower.includes('modificare soltanto occorrenza')) {
      return {
        paragraphs: [
          'Aprire la lavorazione tecnica dalla pratica selezionata. Per il Responsabile dell’istruttoria tecnica le sezioni restano sostanzialmente in sola lettura, salvo i campi Occorrenza e Grado di gravità previsti per la sua fase.',
          'Modificare esclusivamente questi valori quando necessario e utilizzare Salva prima di tornare a Gestisci istruttoria.'
        ]
      }
    }
  }

  if (chapter.startsWith('9. integrazioni tecniche')) {
    if (lower.startsWith('leggere la motivazione del rimando')) {
      return {
        paragraphs: [
          'Nel Dettaglio pratica aprire Iter e individuare l’evento con cui è stata richiesta l’integrazione. Leggere la motivazione e verificare quale ruolo ha originato il rimando.',
          'Seguire gli eventi successivi dello stesso ciclo per distinguere una normale verifica dai passaggi con cui l’esito dell’integrazione viene trasmesso fino al ruolo che l’aveva richiesta. Per la lettura dettagliata dello storico vedere Cap. 24.3.'
        ]
      }
    }
    if (lower.startsWith('aprire la lavorazione consentita')) {
      return {
        paragraphs: [
          'Dopo la presa in carico utilizzare la lavorazione disponibile per il proprio ruolo e intervenire solo sui dati richiamati dalla motivazione del rimando.',
          'Salvare le correzioni prima di tornare all’Elenco pratiche. Se il ruolo deve soltanto trasmettere l’esito dell’integrazione al passaggio successivo e non deve modificare dati, limitarsi ai controlli previsti e proseguire con l’esito.'
        ]
      }
    }
    if (lower.startsWith('tornare a gestisci istruttoria')) {
      return {
        paragraphs: [
          'Tornare all’area Azioni della pratica e aprire Gestisci istruttoria. Utilizzare il comando di trasmissione dell’esito dell’integrazione previsto per il ruolo corrente.',
          'Nei passaggi intermedi viene registrato Esito integrazione trasmesso; la normale verifica, validazione o approvazione riprende soltanto quando l’esito raggiunge il ruolo che aveva richiesto l’integrazione.'
        ]
      }
    }
  }

  // Fase amministrativa
  if (chapter.startsWith('10. ingresso nella fase amministrativa')) {
    if (lower.startsWith('consultare il fascicolo tecnico')) {
      return {
        paragraphs: [
          'Aprire Dettaglio pratica e verificare le schede tecniche, gli allegati e l’Iter. Nell’Iter controllare che l’ultimo passaggio utile corrisponda all’approvazione della fase tecnica da parte del Direttore tecnico.',
          'La consultazione serve a verificare che il fascicolo sia pronto per essere assegnato; l’assegnazione si esegue poi da Gestisci istruttoria.'
        ]
      }
    }
    if (lower.startsWith('selezionare l’istruttore amministrativo')) {
      return {
        paragraphs: [
          'Nel pannello di assegnazione aprire l’elenco degli Istruttori amministrativi disponibili e scegliere il nominativo cui affidare il fascicolo.',
          'Prima della conferma controllare il destinatario. Dopo l’assegnazione la pratica compare nella In attesa mia dell’Istruttore amministrativo selezionato.'
        ]
      }
    }
  }

  if (chapter.startsWith('11. istruttoria amministrativa')) {
    if (lower.startsWith('scegliere conforme')) {
      return {
        paragraphs: [
          'Nel pannello Gestisci istruttoria scegliere Conforme quando i dati e la documentazione consentono di proseguire. Scegliere Non conforme quando è necessario chiedere una correzione o un’integrazione.',
          'La scelta Non conforme richiede la motivazione. La scelta Conforme registra l’esito ma non trasferisce ancora il fascicolo al Responsabile: la pratica resta all’Istruttore amministrativo per la predisposizione della documentazione.'
        ]
      }
    }
    if (lower.startsWith('in caso di non conforme')) {
      return {
        paragraphs: [
          'Dopo avere selezionato Non conforme compilare la motivazione nel pannello e descrivere con chiarezza ciò che deve essere corretto o integrato.',
          'Con la conferma la pratica torna al Responsabile dell’istruttoria amministrativa, che gestirà il successivo percorso di integrazione.'
        ]
      }
    }
    if (lower.startsWith('in caso di conforme')) {
      return {
        paragraphs: [
          'Confermare Conforme nel pannello Gestisci istruttoria. Il gestionale registra data ed esito dell’Istruttore amministrativo e genera o aggiorna la Proposta di contestazione.',
          'La pratica resta in lavorazione all’Istruttore amministrativo: proseguire nella scheda Iter approvativo con la bozza di determinazione e trasmettere il fascicolo solo quando la documentazione è completa.'
        ],
        figure: 'Figura – Iter approvativo amministrativo'
      }
    }
  }

  if (chapter.startsWith('12. verifica del responsabile')) {
    if (lower.startsWith('consultare iter approvativo')) {
      return {
        paragraphs: [
          'Aprire la lavorazione amministrativa in consultazione e utilizzare Iter approvativo per leggere l’esito dell’Istruttore amministrativo, la data e gli eventuali cicli di rimando/rientro. Controllare quindi Anteprima fascicolo e Allegati per verificare i documenti predisposti.',
          'Il Responsabile dell’istruttoria amministrativa decide l’esito da Gestisci istruttoria; non deve modificare direttamente i dati della lavorazione dell’Istruttore amministrativo.'
        ],
        figure: 'Figura – Iter approvativo amministrativo'
      }
    }
    if (lower.startsWith('se non è conforme')) {
      return {
        paragraphs: [
          'Selezionare Non conforme in Gestisci istruttoria. Nel pannello distinguere gli aspetti amministrativi da quelli tecnici e selezionare le motivazioni pertinenti.',
          'Il gestionale usa la natura delle motivazioni per individuare il destinatario: Istruttore amministrativo per le correzioni amministrative oppure Responsabile dell’istruttoria tecnica per quelle tecniche.'
        ]
      }
    }
  }

  // Documenti amministrativi
  if (chapter.startsWith('13. determinazione')) {
    if (lower.startsWith('dopo aver espresso esito conforme')) {
      return {
        paragraphs: [
          'Restare nella scheda Iter approvativo dopo la conferma dell’esito Conforme. Nella sezione Determinazione verificare lo stato dei documenti e la presenza della Proposta di contestazione generata automaticamente.',
          'Se il gestionale segnala che la documentazione deve essere aggiornata, rigenerarla prima di predisporre il PDF della determinazione.'
        ],
        figure: 'Figura – Proposta di contestazione e determinazione'
      }
    }
    if (lower.startsWith('caricare il pdf della bozza')) {
      return {
        paragraphs: [
          'Dopo avere prodotto il PDF dal Word generato, tornare alla sezione Determinazione e utilizzare il comando di caricamento della bozza PDF. Selezionare il file corretto e attendere che venga mostrato come documento acquisito.',
          'Il caricamento è disponibile soltanto dopo la generazione del Word; prima della trasmissione controllare il documento nell’Anteprima fascicolo.'
        ]
      }
    }
    if (lower.startsWith('usare trasmetti fascicolo al responsabile')) {
      return {
        paragraphs: [
          'Nella sezione Iter approvativo utilizzare Trasmetti fascicolo al Responsabile soltanto dopo avere controllato bozza di determinazione, allegati e Anteprima fascicolo.',
          'La conferma chiude la lavorazione dell’Istruttore amministrativo per quel passaggio e rende il fascicolo disponibile al Responsabile dell’istruttoria amministrativa per la verifica.'
        ]
      }
    }
    if (lower.startsWith('dopo la validazione del responsabile') && lower.includes('protocollo')) {
      return {
        paragraphs: [
          'Quando la pratica torna all’Istruttore amministrativo dopo la validazione, utilizzare Trasmetti fascicolo al protocollo nella sezione Determinazione. Il gestionale predispone la trasmissione e conserva l’elenco dei documenti inviati.',
          'La protocollazione viene completata con il sistema esterno previsto dall’Ente. Quando i documenti protocollati sono disponibili, acquisire nel gestionale tutti i PDF richiesti.'
        ]
      }
    }
    if (lower.startsWith('quando sono disponibili i pdf protocollati')) {
      return {
        paragraphs: [
          'Utilizzare il comando di acquisizione del fascicolo protocollato e selezionare in una sola operazione tutti i PDF restituiti dal protocollo. Non caricare i documenti uno alla volta quando il pannello richiede il fascicolo completo.',
          'Dopo la selezione controllare il riepilogo: il gestionale verifica numero dei file, corrispondenza dei documenti ed estremi di protocollo prima di consentire il completamento.'
        ]
      }
    }
    if (lower.startsWith('usare prepara e-mail al direttore')) {
      return {
        paragraphs: [
          'Nella sezione Determinazione utilizzare Prepara e-mail al Direttore. Il gestionale utilizza i destinatari configurati nella Rubrica per predisporre la trasmissione della determinazione.',
          'Prima di procedere verificare che il PDF definitivo e gli estremi della determinazione siano già acquisiti correttamente nella pratica. Per la gestione dei destinatari della Rubrica vedere Cap. 22.1.'
        ]
      }
    }
  }

  if (chapter.startsWith('14. atto di accertamento')) {
    if (lower.startsWith('usare genera bozza word')) {
      return {
        paragraphs: [
          'Dopo avere salvato i dati di pagamento e notifica, utilizzare Genera bozza Word dell’Atto nella sezione Notifica. Il comando produce il documento con i dati correnti della pratica.',
          'Aprire quindi il Word, convertirlo in PDF e rientrare nella stessa sezione per caricare la bozza PDF da sottoporre alla verifica del Responsabile dell’istruttoria amministrativa.'
        ],
        figure: 'Figura – Notifica e dati di pagamento'
      }
    }
    if (lower.startsWith('usare trasmetti atto per la verifica')) {
      return {
        paragraphs: [
          'Dopo avere caricato e controllato la bozza PDF dell’Atto, utilizzare Trasmetti Atto per la verifica. Confermare il passaggio al Responsabile dell’istruttoria amministrativa.',
          'Da quel momento l’Istruttore amministrativo non può proseguire la modifica dell’Atto finché il Responsabile non conclude la verifica.'
        ]
      }
    }
    if (lower.startsWith('dopo l’approvazione del responsabile') && lower.includes('senza filigrana')) {
      return {
        paragraphs: [
          'Quando l’Atto torna approvato, nella sezione Notifica utilizzare Genera Atto senza filigrana. Se il gestionale segnala che i dati sono cambiati, utilizzare Rigenera Atto senza filigrana.',
          'Il documento ottenuto è la versione da convertire in PDF e sottoporre alla firma del Direttore.'
        ]
      }
    }
    if (lower.startsWith('dopo la firma digitale esterna')) {
      return {
        paragraphs: [
          'Dopo avere ricevuto il PDF firmato dal Direttore, tornare nella sezione Notifica e utilizzare Carica il PDF firmato digitalmente dal Direttore.',
          'Attendere l’esito dei controlli automatici sulla firma e sull’integrità del documento prima di procedere alla trasmissione al protocollo.'
        ]
      }
    }
    if (lower.startsWith('quando sono disponibili i documenti protocollati')) {
      return {
        paragraphs: [
          'Utilizzare il comando di acquisizione dei documenti protocollati e selezionare insieme tutti i PDF richiesti dal pannello. Il gestionale verifica la presenza dell’Atto firmato, dei documenti previsti e degli estremi di protocollo.',
          'Soltanto dopo il superamento dei controlli salvare gli estremi acquisiti; da quel momento diventano disponibili le operazioni definitive di notifica.'
        ]
      }
    }
  }

  if (chapter.startsWith('15. modalità di pagamento')) {
    if (lower.startsWith('indicare numero rate concesse')) {
      return {
        paragraphs: [
          'Nella sezione Pagamento impostare Numero rate concesse prima di costruire il piano. Inserire 0 per la sola soluzione unica oppure un valore da 2 in su per un piano rateale; il valore 1 non produce un piano rateale valido.',
          'Dopo avere impostato il numero utilizzare Imposta piano; se il piano esiste già ed è ancora modificabile utilizzare Aggiorna piano.'
        ]
      }
    }
    if (lower.startsWith('per ciascuna posizione compilare')) {
      return {
        paragraphs: [
          'Aprire la singola posizione del piano e compilare Modalità, Importo dovuto e Scadenza. Quando la modalità scelta richiede ulteriori riferimenti di pagamento, completare anche i campi che diventano disponibili.',
          'Usare Aggiorna sulla stessa posizione e ripetere l’operazione per tutte le righe del piano prima del Salva complessivo della pratica.'
        ]
      }
    }
    if (lower.startsWith('selezionare la modalità pagopa')) {
      return {
        paragraphs: [
          'Nella sezione Pagamento scegliere pagoPA come modalità e utilizzare Carica avvisi pagoPA. Il selettore consente di scegliere più PDF nella stessa operazione.',
          'Se esiste una sola soluzione selezionare il relativo avviso; se è previsto un piano rateale selezionare insieme l’avviso dell’unica soluzione e tutti gli avvisi delle rate.'
        ]
      }
    }
    if (lower.startsWith('controllare il piano ricostruito')) {
      return {
        paragraphs: [
          'Dopo l’elaborazione dei PDF controllare le posizioni ricostruite dal gestionale: importi, scadenze, codici avviso/IUV e distinzione tra unica soluzione e rate.',
          'Se il riepilogo non corrisponde agli avvisi caricati, non salvare: annullare l’operazione e ripetere il caricamento con il set corretto.'
        ]
      }
    }
    if (lower.startsWith('leggere il riepilogo di sostituzione')) {
      return {
        paragraphs: [
          'Quando vengono caricati nuovi avvisi su un piano già presente, leggere il pannello di conferma prima di procedere. Il riepilogo indica quante posizioni e quanti documenti esistenti verranno sostituiti.',
          'Confermare Sostituisci avvisi soltanto se il nuovo set è completo. La sostituzione resta comunque pendente fino al Salva della pratica.'
        ]
      }
    }
  }

  if (chapter.startsWith('16. protocollo, notifica')) {
    if (lower.startsWith('selezionare l’esito della notifica')) {
      return {
        paragraphs: [
          'Aprire la scheda Notifica e raggiungere la sezione dedicata all’esito. Aprire l’elenco Esito notifica e scegliere la voce che corrisponde alla documentazione effettivamente ricevuta.',
          'Dopo la scelta utilizzare Carica documentazione esito notifica per acquisire il PDF protocollato che prova l’esito.'
        ],
        figure: 'Figura – Notifica e dati di pagamento'
      }
    }
    if (lower.startsWith('usare carica documentazione esito notifica')) {
      return {
        paragraphs: [
          'Premere Carica documentazione esito notifica e selezionare il PDF protocollato della relata, ricevuta PEC, avviso di ricevimento o altra prova prevista per il caso.',
          'Dopo il caricamento controllare gli eventuali estremi di protocollo acquisiti automaticamente e verificare che il documento compaia tra gli Allegati prima di salvare.'
        ]
      }
    }
  }

  if (chapter.startsWith('17. ricorso')) {
    if (lower.startsWith('aprire la scheda ricorso')) {
      return {
        paragraphs: [
          'Nella lavorazione amministrativa selezionare Ricorso nella barra delle schede. La scheda diventa pertinente dopo il perfezionamento della notifica.',
          'Indicare anzitutto se il ricorso o l’istanza è stato presentato; i campi successivi vanno compilati in base al caso effettivo.'
        ]
      }
    }
    if (lower.startsWith('indicare se il ricorso')) {
      return {
        paragraphs: [
          'Se il ricorso è presente, compilare data di presentazione, protocollo, soggetto presentatore e relativi identificativi quando richiesti. Completare inoltre oggetto o motivazione, eventuale sospensione del pagamento e note.',
          'Prima di salvare confrontare la data inserita con il termine mostrato dal gestionale e verificare l’eventuale indicazione di tardività.'
        ]
      }
    }
    if (lower.startsWith('aprire la scheda cda')) {
      return {
        paragraphs: [
          'Selezionare CdA nella barra delle schede della lavorazione amministrativa. Utilizzare la sezione per registrare l’esito della decisione e gli estremi dell’atto che la formalizza.',
          'Se la decisione modifica importo o scadenza, completare anche i campi di rideterminazione prima di salvare.'
        ]
      }
    }
    if (lower.startsWith('aprire la scheda riapertura')) {
      return {
        paragraphs: [
          'Nella lavorazione amministrativa selezionare Riapertura. Compilare i dati dell’ordine di riapertura: causa, data, soggetto che l’ha disposto, estremi autorizzativi e motivazione.',
          'Salvare questi dati prima di tornare a Gestisci istruttoria: l’avvio di un nuovo ciclo amministrativo richiede che la riapertura sia stata registrata.'
        ]
      }
    }
    if (lower.startsWith('nella sezione incasso compilare insieme')) {
      return {
        paragraphs: [
          'Aprire Definizione e raggiungere la sezione Incasso. Compilare nello stesso momento Importo incassato, Data e Dettagli/riferimenti: il gestionale controlla che questi tre elementi siano coerenti e non consente di lasciarne uno isolato.',
          'Dopo l’inserimento verificare lo stato di pagamento proposto e completare la modalità finale di definizione della pratica.'
        ]
      }
    }
  }

  if (chapter.startsWith('17. ricorso') && lower.startsWith('completare le note e salvare')) {
    return {
      paragraphs: [
        'Nella scheda Definizione completare le Note quando servono a chiarire l’esito conclusivo della pratica e rileggere i dati di incasso e la modalità di definizione selezionata.',
        'Utilizzare Salva per registrare la definizione. Dopo il salvataggio controllare il riepilogo della scheda prima di uscire dalla pratica.'
      ]
    }
  }

  if (chapter.startsWith('18. nota spese')) {
    if (lower.startsWith('usare sfoglia prezzario')) {
      return {
        paragraphs: [
          'Dopo avere selezionato la casistica della Nota spese utilizzare Sfoglia prezzario. Il Browser nota spese si apre già riferito alla casistica selezionata.',
          'Se Sfoglia prezzario non è disponibile, verificare che la pratica sia già stata salvata almeno una volta e che la violazione selezionata preveda effettivamente una Nota spese.'
        ]
      }
    }
    if (lower.startsWith('nel browser nota spese cercare')) {
      return {
        paragraphs: [
          'Nel Browser nota spese scegliere la sorgente o il prezzario e utilizzare la ricerca per codice o descrizione oppure la struttura gerarchica disponibile. Selezionare le voci necessarie e premere Aggiungi per inserirle nel carrello.',
          'Controllare il contatore del carrello e, quando la selezione è completa, utilizzare Conferma. Le voci selezionate vengono riportate nella Nota spese.'
        ]
      }
    }
    if (lower.startsWith('dopo aver confermato le voci nel browser nota spese')) {
      return {
        paragraphs: [
          'Dopo la conferma, ogni voce selezionata compare nella relativa categoria della Nota spese. Compilare la quantità e gli eventuali dati richiesti dalla casistica; il gestionale calcola il relativo importo.',
          'Controllare il riepilogo per categoria e il totale complessivo prima di utilizzare Salva.'
        ]
      }
    }
    if (lower.startsWith('scegliere il prezzario/sorgente')) {
      return {
        paragraphs: [
          'Nel Browser nota spese utilizzare il selettore della sorgente per scegliere l’archivio da cui prelevare le voci. È possibile cercare direttamente per codice o descrizione oppure restringere l’elenco navigando la classificazione disponibile.',
          'La selezione della sorgente determina le voci mostrate nella parte centrale del Browser; il carrello resta il riepilogo delle voci che verranno riportate nella Nota spese.'
        ]
      }
    }
  }

  if (chapter.startsWith('19. prezzari')) {
    if (lower.startsWith('selezionare il file zip')) {
      return {
        paragraphs: [
          'Nella sezione Prezzari utilizzare il comando di importazione e selezionare dal dispositivo il file ZIP del prezzario regionale. Il pacchetto deve essere quello predisposto per l’importazione, comprensivo dei file necessari ad articoli e analisi.',
          'Dopo la selezione controllare i dati proposti dal gestionale prima di avviare l’importazione.'
        ]
      }
    }
    if (lower.startsWith('avviare un nuovo record') || lower.includes('creare un nuovo record')) {
      return {
        paragraphs: [
          'Nella sezione Analisi prezzi utilizzare il comando per creare una nuova voce. Nel pannello di inserimento scegliere la Tipologia richiesta prima di compilare gli altri campi.',
          'La scelta ELEMENTARE consente di indicare direttamente il prezzo unitario; con ANALIZZATA il prezzo deriva invece dalle righe che verranno aggiunte all’analisi.'
        ]
      }
    }
    if (lower.startsWith('usare nuova riga nell’analisi')) {
      return {
        paragraphs: [
          'Dopo avere salvato l’intestazione del nuovo prezzo ANALIZZATO utilizzare Nuova riga nella sezione dell’analisi. Si apre il pannello per scegliere l’origine e la voce che compone il prezzo.',
          'Aggiungere una riga per ogni componente necessaria; quantità e prezzo unitario determinano l’importo della singola riga.'
        ]
      }
    }
    if (lower.startsWith('cercare la voce sorgente')) {
      return {
        paragraphs: [
          'Dopo avere scelto l’origine della componente utilizzare il campo di ricerca e digitare i caratteri richiesti. Selezionare la voce corretta tra i risultati e controllare codice, descrizione, unità di misura e prezzo unitario proposti.',
          'Solo dopo questa verifica inserire la quantità e salvare la riga dell’analisi.'
        ]
      }
    }
    if (lower.startsWith('selezionare l’archivio da consultare')) {
      return {
        paragraphs: [
          'Nella vista dei Parametri utilizzare il selettore dell’archivio per scegliere il gruppo di valori da gestire. L’elenco sottostante viene aggiornato con i parametri dell’archivio selezionato.',
          'Da qui utilizzare Nuovo per un nuovo parametro oppure Modifica sulla riga esistente.'
        ]
      }
    }
    if (lower.startsWith('selezionare la sorgente disponibile')) {
      return {
        paragraphs: [
          'In Consultazione prezzari scegliere la sorgente da esaminare. L’elenco e l’albero di classificazione vengono aggiornati sulla sorgente selezionata.',
          'Utilizzare poi Cerca oppure la navigazione per famiglia, capitolo e sottocapitolo per arrivare alla voce desiderata.'
        ]
      }
    }
  }

  if (chapter.startsWith('20. mappa')) {
    if (lower.startsWith('selezionare comune')) {
      return {
        paragraphs: [
          'Nel pannello Dati catastali aprire Comune e scegliere il Comune interessato. È il primo criterio obbligatorio e abilita le scelte successive.',
          'Dopo il Comune utilizzare, se necessari, Sezione, Foglio e Mappale: ciascun elenco viene ristretto in base alla scelta precedente.'
        ],
        figure: 'Figura – Mappa del gestionale'
      }
    }
    if (lower.startsWith('selezionare opere cbsm')) {
      return {
        paragraphs: [
          'Nel pannello di ricerca della vista Mappa selezionare Opere CBSM. Compilare uno o più criteri tra Stato, Tipo e Nome e quindi utilizzare Cerca.',
          'I risultati vengono riportati nell’elenco e messi in evidenza sulla mappa per consentirne la localizzazione.'
        ],
        figure: 'Figura – Mappa del gestionale'
      }
    }
    if (lower.startsWith('selezionare infrazioni')) {
      return {
        paragraphs: [
          'Nel pannello della Mappa selezionare Infrazioni. È possibile cercare per articolo, tipo e numero pratica oppure per dati del trasgressore.',
          'Impostare almeno un criterio e utilizzare Cerca; l’elenco restituisce soltanto le pratiche che il proprio ruolo può visualizzare.'
        ],
        figure: 'Figura – Mappa del gestionale'
      }
    }
  }

  if (chapter.startsWith('21. dashboard')) {
    if (lower.startsWith('controllare in attesa mia')) {
      return {
        paragraphs: [
          'Nella sezione Operativo della Dashboard utilizzare i riquadri In attesa mia e Ferme oltre 15 giorni per individuare il carico che richiede attenzione. I conteggi riguardano le pratiche visibili al ruolo corrente.',
          'La Dashboard serve a individuare le priorità; per aprire e lavorare la singola pratica tornare poi all’Elenco pratiche.'
        ],
        figure: 'Figura – Dashboard operativa'
      }
    }
    if (lower.startsWith('impostare uno o più filtri')) {
      return {
        paragraphs: [
          'Nel Report utilizzare la fascia dei filtri sopra la tabella. È possibile combinare Cerca n. rapporto, Area, Settore, intervallo di date, Situazione, Fase procedimentale e Competenza attuale.',
          'La tabella e la Sintesi procedimentale vengono aggiornate in base ai filtri impostati; utilizzare Pulisci filtri per tornare all’insieme completo.'
        ]
      }
    }
    if (lower.startsWith('usare esporta csv')) {
      return {
        paragraphs: [
          'Dopo avere impostato i filtri desiderati utilizzare Esporta CSV. Il file contiene le righe mostrate nel Report con i filtri correnti, non l’intero archivio indistintamente.',
          'Il separatore utilizzato è il punto e virgola, così il file può essere aperto nei comuni strumenti di foglio elettronico mantenendo separate le colonne.'
        ]
      }
    }
  }

  if (chapter.startsWith('22. rubrica')) {
    if (lower.startsWith('aprire rubrica → destinatari')) {
      return {
        paragraphs: [
          'Aprire Rubrica e selezionare Destinatari e-mail. Utilizzare Aggiungi destinatario per aprire il modulo di inserimento.',
          'Scegliere il Tipo prima di compilare i dati: Persona fisica abilita Nome e Cognome; Altro utilizza Denominazione.'
        ]
      }
    }
    if (lower.startsWith('compilare e-mail e utilizzo')) {
      return {
        paragraphs: [
          'Nel modulo del destinatario inserire l’indirizzo e-mail e selezionare l’Utilizzo per cui il contatto deve essere proposto dal gestionale.',
          'Se lo stesso contatto deve essere disponibile per più utilizzi, selezionare quelli pertinenti prima di salvare.'
        ]
      }
    }
    if (lower.startsWith('aprire rubrica → firmatari')) {
      return {
        paragraphs: [
          'Aprire Rubrica e selezionare Firmatari. Utilizzare Aggiungi firmatario per inserire il soggetto che potrà essere riconosciuto nel controllo della firma digitale dell’Atto.',
          'Compilare Titolo, Nome e Cognome; utilizzare la Data di nascita quando serve a distinguere omonimi.'
        ]
      }
    }
  }

  if (chapter.startsWith('23. gestione utenti')) {
    if (lower.startsWith('verificare che la persona sia già presente')) {
      return {
        paragraphs: [
          'Prima di creare l’utente nel gestionale verificare che disponga già di un account attivo nell’organizzazione ArcGIS Online del Consorzio.',
          'Se l’account non è presente o risulta disabilitato, completare prima la relativa gestione in ArcGIS Online: il gestionale potrà selezionare soltanto un membro disponibile dell’organizzazione.'
        ]
      }
    }
    if (lower.startsWith('cercare la persona per nome')) {
      return {
        paragraphs: [
          'Nel pannello Nuovo utente utilizzare la ricerca dei membri ArcGIS Online e digitare nome, cognome, nome utente oppure e-mail. Nei risultati premere Seleziona sulla persona corretta.',
          'Gli utenti già registrati nel gestionale e gli account disabilitati vengono segnalati e non possono essere selezionati come nuovo utente.'
        ]
      }
    }
    if (lower.startsWith('nella sezione assegnazione gestionale')) {
      return {
        paragraphs: [
          'Dopo avere selezionato il membro, scendere alla sezione Assegnazione gestionale e scegliere il Ruolo. In base al ruolo il sistema abilita o precompila i campi di Area, Settore e Ufficio necessari.',
          'Controllare sempre l’ambito assegnato prima del salvataggio, perché determina le pratiche e le viste che l’utente potrà utilizzare.'
        ]
      }
    }
    if (lower.startsWith('se nome, cognome o e-mail sono cambiati')) {
      return {
        paragraphs: [
          'Se i dati anagrafici dell’account sono stati modificati in ArcGIS Online, aprire Modifica utente e utilizzare Sincronizza. Il gestionale mostra prima un confronto tra i valori registrati e quelli correnti dell’account.',
          'Controllare le differenze e confermare soltanto se sono corrette: l’aggiornamento viene applicato a tutte le assegnazioni dello stesso utente.'
        ]
      }
    }
    if (lower.startsWith('sulla riga dell’utente usare nuova assegnazione')) {
      return {
        paragraphs: [
          'Nell’elenco utenti individuare una delle righe riferite alla persona e utilizzare Nuova assegnazione. Il pannello mantiene l’identità dell’utente e consente di aggiungere un ulteriore ruolo o ambito.',
          'Compilare la nuova assegnazione come per un nuovo utente e salvare. Il gestionale impedisce di creare una duplicazione identica di un’assegnazione già esistente.'
        ]
      }
    }
    if (lower.startsWith('usare elimina utente')) {
      return {
        paragraphs: [
          'Nell’elenco individuare la specifica assegnazione da rimuovere e utilizzare Elimina utente sulla relativa riga. Leggere il messaggio di conferma prima di procedere.',
          'L’operazione rimuove quella assegnazione dal gestionale; non elimina l’account ArcGIS Online della persona e non rimuove automaticamente eventuali utilizzi ancora presenti nella Rubrica.'
        ]
      }
    }
  }

  if (chapter.startsWith('24. allegati')) {
    if (lower.startsWith('usare il comando di aggiunta')) {
      return {
        paragraphs: [
          'Nella scheda Allegati utilizzare Aggiungi per scegliere un nuovo file dal dispositivo. Per un allegato già presente utilizzare invece i comandi associati alla sua riga per sostituirlo o eliminarlo.',
          'Prima di sostituire o eliminare un documento verificare di avere selezionato la riga corretta, soprattutto quando sono presenti più allegati con nomi simili.'
        ]
      }
    }
    if (lower.startsWith('aprire il visualizzatore')) {
      return {
        paragraphs: [
          'Selezionare l’allegato e aprirlo nel visualizzatore integrato. Utilizzare i comandi disponibili per verificare il contenuto prima di proseguire con altre operazioni.',
          'Per le immagini sono disponibili i comandi di rotazione; nella lavorazione tecnica la rotazione viene resa definitiva con Salva, mentre nella lavorazione amministrativa seguire le regole indicate dalla sezione corrente.'
        ]
      }
    }
    if (lower.startsWith('individuare il ciclo corrispondente')) {
      return {
        paragraphs: [
          'Nella scheda Iter scorrere i blocchi fino al periodo o al ruolo che interessa. Utilizzare data, Avviato da, Trasmesso a e stato del passaggio per riconoscere il ciclo corretto.',
          'Se l’ordine cronologico non è quello più comodo, selezionare nuovamente la scheda Iter per invertirlo.'
        ]
      }
    }
    if (lower.startsWith('controllare campi modificati')) {
      return {
        paragraphs: [
          'Nel blocco dell’Iter interessato espandere o leggere Campi modificati. L’elenco mostra i dati sostanziali che sono stati valorizzati o cambiati durante quel passaggio.',
          'Usare queste informazioni insieme alle variazioni degli allegati e alla motivazione dei rimandi per ricostruire cosa è cambiato nella pratica.'
        ]
      }
    }
  }

  // Approfondimenti delle procedure: ogni espansione aggiunge indicazioni operative reali.
  if (chapter.startsWith('4. nuova rilevazione') && lower.startsWith('prendere in carico una pratica')) {
    return {
      paragraphs: [
        'Con la rilevazione selezionata nell’Elenco pratiche, controllare l’area Azioni. Se la pratica è nello stato Da prendere in carico, utilizzare Prendi in carico e confermare.',
        'Dopo la presa in carico la pratica risulta in carico al Capo Settore e sono disponibili le azioni successive previste per l’assegnazione.'
      ]
    }
  }

  if (chapter.startsWith('4. nuova rilevazione') && lower.startsWith('assegnare la pratica a un istruttore tecnico')) {
    return {
      paragraphs: [
        'Con la pratica selezionata e presa in carico, utilizzare Gestisci istruttoria nell’area Azioni e scegliere l’azione di assegnazione all’Istruttore tecnico.',
        'Selezionare l’Istruttore tecnico competente tra quelli disponibili per la pratica e confermare. L’assegnazione viene registrata nell’Iter e la pratica passa al destinatario.'
      ]
    }
  }

  if (chapter.startsWith('4. nuova rilevazione') && lower.startsWith('verificare che la pratica esca da in attesa mia e passi a in attesa di altri')) {
    return {
      paragraphs: [
        'Dopo aver confermato l’assegnazione della pratica all’Istruttore tecnico, tornare all’Elenco pratiche. La pratica non deve più comparire nella scheda In attesa mia ma nella scheda In attesa di altri.',
        'Selezionarla, se necessario, per controllare nel Dettaglio o nelle colonne dell’elenco il destinatario e lo stato aggiornato.'
      ]
    }
  }

  if (lower.startsWith('verificare che la pratica esca da in attesa mia') || lower.startsWith('verificare il passaggio della pratica') || lower.startsWith('controllare che la pratica sia passata')) {
    return {
      paragraphs: [
        'Dopo la conferma tornare all’Elenco pratiche. La pratica non deve più comparire in In attesa mia del ruolo che l’ha appena trasmessa; può essere ritrovata in In attesa di altri oppure in Tutte le pratiche.',
        'Selezionarla e controllare nel Dettaglio o nelle colonne dell’elenco il destinatario e lo stato aggiornato. Se non cambia nulla, utilizzare Aggiorna elenco prima di ripetere l’azione.'
      ]
    }
  }

  if (chapter.startsWith('4. nuova rilevazione') && lower.startsWith('quando l’istruttoria tecnica è completa')) {
    return {
      paragraphs: [
        'Dopo l’ultimo Salva tornare all’Elenco pratiche lasciando selezionata la pratica. Nell’area Azioni utilizzare Trasmetti nuova rilevazione per inviarla al Capo Settore.',
        'Prima di confermare verificare che non restino errori di compilazione o modifiche non salvate. La trasmissione chiude la lavorazione corrente dell’Istruttore tecnico.'
      ]
    }
  }

  if (chapter.startsWith('5. istruttoria tecnica') && lower.startsWith('tornare alle azioni')) {
    return {
      paragraphs: [
        'Dopo avere salvato la pratica tornare all’Elenco pratiche. Con la riga ancora selezionata, nell’area Azioni utilizzare Trasmetti nuova rilevazione soltanto per la prima trasmissione di una pratica creata direttamente dall’Istruttore tecnico; negli altri casi utilizzare Trasmetti istruttoria.',
        'Il pannello di conferma indica il destinatario, che in entrambi i casi è il Capo Settore.'
      ]
    }
  }
  if (chapter.startsWith('5. istruttoria tecnica') && lower.startsWith('confermare la trasmissione')) {
    return {
      paragraphs: [
        'Nel pannello di conferma controllare che il destinatario sia il Capo Settore e quindi confermare. La pratica esce dalla lavorazione dell’Istruttore tecnico e viene registrato il relativo evento nell’Iter.',
        'Tornando all’Elenco pratiche la pratica passa normalmente da In attesa mia a In attesa di altri.'
      ]
    }
  }
  if (chapter.startsWith('5. istruttoria tecnica') && lower.startsWith('aprire la pratica interessata e verificare')) {
    return {
      paragraphs: [
        'Aprire la pratica da Elenco pratiche e controllare nel Dettaglio e nell’Iter che si tratti di una pratica creata direttamente dallo stesso Istruttore tecnico e che non sia già transitata ai livelli superiori.',
        'Se il comando Elimina non compare nell’area Azioni, la pratica non si trova nelle condizioni che consentono l’archiviazione da parte dell’Istruttore tecnico.'
      ]
    }
  }

  if (chapter.startsWith('6. verifica del capo settore') && lower.startsWith('se servono correzioni')) {
    return {
      paragraphs: [
        'Aprire Gestisci istruttoria e scegliere l’esito che rimanda la pratica per integrazione. Indicare la motivazione in modo che l’Istruttore tecnico sappia quali dati o documenti devono essere corretti.',
        'Confermare il rimando: la pratica passa all’Istruttore tecnico e l’Iter conserva la motivazione della richiesta.'
      ]
    }
  }

  if (chapter.startsWith('11. istruttoria amministrativa') && lower.startsWith('proseguire con la generazione della bozza')) {
    return {
      paragraphs: [
        'Dopo l’esito Conforme restare nella scheda Iter approvativo e predisporre la bozza di determinazione secondo il capitolo 13. Completare anche gli allegati e controllare Anteprima fascicolo.',
        'Utilizzare Trasmetti fascicolo al Responsabile soltanto quando la bozza PDF e la documentazione necessaria risultano presenti e aggiornate.'
      ],
      figure: 'Figura – Proposta di contestazione e determinazione'
    }
  }

  if (chapter.startsWith('12. verifica del responsabile') && lower.startsWith('se il fascicolo è conforme')) {
    return {
      paragraphs: [
        'Nel pannello Gestisci istruttoria selezionare Conforme e verificare il riepilogo dell’azione. La conferma valida l’istruttoria amministrativa e restituisce la pratica all’Istruttore amministrativo assegnato.',
        'Dopo la conferma controllare che la pratica non sia più in In attesa mia e che il destinatario sia tornato all’Istruttore amministrativo.'
      ]
    }
  }
  if (chapter.startsWith('12. verifica del responsabile') && lower.startsWith('confermare. il sistema individua automaticamente')) {
    return {
      paragraphs: [
        'Dopo avere selezionato Non conforme e le motivazioni, rileggere il riepilogo del pannello prima di confermare. Il destinatario viene determinato dalla natura delle motivazioni scelte.',
        'Se sono presenti aspetti amministrativi la pratica viene indirizzata all’Istruttore amministrativo; per gli aspetti tecnici viene avviato il percorso verso il Responsabile dell’istruttoria tecnica.'
      ]
    }
  }

  if (chapter.startsWith('13. determinazione')) {
    if (lower.startsWith('aprire il word esternamente')) {
      return {
        paragraphs: [
          'Aprire il file Word generato nella sezione Determinazione con l’applicazione utilizzata dall’ufficio. Apportare soltanto le integrazioni previste e quindi esportare o salvare una copia in PDF.',
          'Non rinominare o sostituire arbitrariamente il documento se la successiva funzione di caricamento richiede la corrispondenza con la bozza generata dal gestionale.'
        ]
      }
    }
    if (lower.startsWith('eseguire la protocollazione')) {
      return {
        paragraphs: [
          'Completare la protocollazione con il sistema esterno utilizzato dall’Ente, mantenendo insieme i documenti che il gestionale ha predisposto per il fascicolo.',
          'Al termine rientrare nella stessa pratica e utilizzare la funzione di acquisizione del fascicolo protocollato, selezionando tutti i PDF richiesti in una sola operazione.'
        ]
      }
    }
    if (lower.startsWith('se la verifica è superata')) {
      return {
        paragraphs: [
          'Dopo il caricamento controllare il messaggio di esito. Se tutti i controlli sono superati, il gestionale sostituisce nel fascicolo le copie non protocollate con quelle protocollate e valorizza gli estremi acquisiti.',
          'Verificare i dati mostrati nella sezione prima di utilizzare Salva.'
        ]
      }
    }
    if (lower.startsWith('dopo aver salvato gli estremi di protocollo')) {
      return {
        paragraphs: [
          'Nella sezione Determinazione utilizzare Genera/Aggiorna determinazione. Il Word viene ricreato includendo gli estremi di protocollo appena salvati.',
          'Aprire il nuovo Word, convertirlo in PDF e rientrare nel gestionale per caricare la versione definitiva prevista dal passaggio successivo.'
        ]
      }
    }
  }

  if (chapter.startsWith('14. atto di accertamento')) {
    if (lower.startsWith('aprire il word esternamente')) {
      return {
        paragraphs: [
          'Aprire il Word dell’Atto generato dal gestionale con l’applicazione utilizzata dall’ufficio e produrre il relativo PDF. Tornare quindi nella sezione Notifica e utilizzare Carica la bozza PDF dell’Atto di accertamento.',
          'Dopo il caricamento aprire o controllare la versione acquisita prima di trasmetterla al Responsabile dell’istruttoria amministrativa.'
        ]
      }
    }
    if (lower.startsWith('controllare la versione caricata')) {
      return {
        paragraphs: [
          'Aprire il PDF appena caricato e confrontarlo con i dati della pratica e con la determinazione. Aprire quindi Anteprima fascicolo per verificare che il documento sia presente nel fascicolo nel punto previsto.',
          'Se viene rilevato un errore, sostituire la bozza prima di utilizzare Trasmetti Atto per la verifica.'
        ],
        figure: 'Figura – Anteprima fascicolo'
      }
    }
    if (lower.startsWith('controllare la bozza dell’atto')) {
      return {
        paragraphs: [
          'Aprire il PDF della bozza dell’Atto e confrontare importi, dati del trasgressore, riferimenti della determinazione, modalità di pagamento e dati di notifica con quanto registrato nella pratica.',
          'Utilizzare anche Anteprima fascicolo e Allegati per verificare i documenti di supporto prima di aprire Gestisci istruttoria.'
        ]
      }
    }
    if (lower.startsWith('se conforme, approvare l’atto')) {
      return {
        paragraphs: [
          'In Gestisci istruttoria selezionare l’esito di approvazione e confermare. L’Iter registra Atto di accertamento approvato e la pratica torna all’Istruttore amministrativo.',
          'Dopo la conferma l’Istruttore amministrativo potrà generare la versione senza filigrana destinata alla firma.'
        ]
      }
    }
    if (lower.startsWith('se non conforme, rimandare l’atto')) {
      return {
        paragraphs: [
          'In Gestisci istruttoria scegliere l’esito non conforme e compilare la motivazione della correzione richiesta sull’Atto.',
          'La conferma rimanda la pratica all’Istruttore amministrativo per l’integrazione amministrativa dell’Atto, senza riaprire l’istruttoria tecnica.'
        ]
      }
    }
    if (lower.startsWith('usare prepara e-mail dell’atto')) {
      return {
        paragraphs: [
          'Dopo avere predisposto la versione senza filigrana utilizzare Prepara e-mail dell’Atto di accertamento al Direttore. Il gestionale prepara la trasmissione utilizzando i contatti configurati nella Rubrica.',
          'Verificare il documento allegato e il destinatario prima di completare l’invio con gli strumenti dell’Ente.'
        ]
      }
    }
    if (lower.startsWith('usare trasmetti l’atto firmato al protocollo')) {
      return {
        paragraphs: [
          'Dopo il caricamento e la verifica del PDF firmato utilizzare Trasmetti l’Atto firmato al protocollo. Il gestionale prepara il passaggio e memorizza i documenti che dovranno rientrare protocollati.',
          'Completare la protocollazione con il sistema esterno e poi rientrare nella stessa sezione per acquisire i PDF richiesti.'
        ]
      }
    }
  }

  if (chapter.startsWith('15. modalità di pagamento')) {
    if (lower.startsWith('usare imposta piano')) {
      return {
        paragraphs: [
          'Dopo avere indicato Numero rate concesse utilizzare Imposta piano. Se esiste già un piano ancora modificabile, utilizzare Aggiorna piano per ricostruire le posizioni in base al nuovo numero di rate.',
          'Controllare subito le righe create dal gestionale prima di compilare importi, scadenze e modalità delle singole posizioni.'
        ]
      }
    }
    if (lower.startsWith('usare aggiorna sulla posizione')) {
      return {
        paragraphs: [
          'Dopo avere modificato i campi della singola posizione utilizzare Aggiorna sulla stessa riga o scheda. Il riepilogo del piano viene ricalcolato con i nuovi valori.',
          'Ripetere l’operazione per ogni posizione interessata e utilizzare Salva soltanto quando l’intero piano è completo.'
        ]
      }
    }
    if (lower.startsWith('verificare che il riepilogo segnali')) {
      return {
        paragraphs: [
          'Controllare nel riepilogo del piano che ogni posizione risulti completa e che la somma degli importi sia coerente con il totale dovuto. Verificare anche le scadenze e gli eventuali documenti associati.',
          'Solo dopo questi controlli utilizzare Salva per registrare il piano nella pratica.'
        ]
      }
    }
    if (lower.startsWith('selezionare insieme tutti i pdf prodotti')) {
      return {
        paragraphs: [
          'Nel selettore file scegliere contemporaneamente tutti gli avvisi appartenenti allo stesso piano: unica soluzione e, se previste, tutte le rate. È possibile usare la selezione multipla del dispositivo.',
          'Confermare la scelta dei file e attendere che il gestionale completi la lettura dei QR code e delle scadenze prima di intervenire sul piano.'
        ]
      }
    }
    if (lower.startsWith('usare nuovamente carica avvisi pagopa')) {
      return {
        paragraphs: [
          'Per sostituire un piano già caricato utilizzare nuovamente Carica avvisi pagoPA e selezionare il nuovo set completo di PDF.',
          'Non selezionare soltanto il documento modificato: la funzione ricostruisce il piano a partire dall’intero nuovo set e mostra poi il riepilogo di ciò che verrà sostituito.'
        ]
      }
    }
    if (lower.startsWith('confermare sostituisci avvisi')) {
      return {
        paragraphs: [
          'Nel pannello di riepilogo utilizzare Sostituisci avvisi dopo avere verificato numero delle posizioni e documenti coinvolti.',
          'La conferma prepara il nuovo piano ma non lo rende ancora definitivo: controllarlo e utilizzare Salva per completare la sostituzione.'
        ]
      }
    }
    if (lower.startsWith('controllare il nuovo piano ricostruito')) {
      return {
        paragraphs: [
          'Controllare nuovamente importi, scadenze, codici avviso/IUV e distinzione tra unica soluzione e rate nel piano ricostruito.',
          'Se qualcosa non corrisponde al set caricato, annullare prima del Salva per ripristinare il piano precedente.'
        ]
      }
    }
  }

  if (chapter.startsWith('16. protocollo, notifica') && lower.startsWith('verificare che gli estremi di protocollo')) {
    return {
      paragraphs: [
        'Aprire Notifica e controllare gli estremi dell’Atto nella sezione dedicata al protocollo. Numero e data devono essere già presenti e mostrati in sola lettura.',
        'Se gli estremi non sono presenti, non procedere con l’esito di notifica: completare prima l’acquisizione dell’Atto protocollato secondo il Cap. 14.3.'
      ],
      figure: 'Figura – Notifica e dati di pagamento'
    }
  }

  if (chapter.startsWith('17. ricorso')) {
    if (lower.startsWith('verificare l’indicazione del termine')) {
      return {
        paragraphs: [
          'Nella scheda Ricorso confrontare la data di presentazione inserita con il termine calcolato e con l’eventuale avviso di tardività mostrato dal gestionale.',
          'Se i dati non corrispondono alla documentazione acquisita, correggere la data o gli estremi prima del Salva.'
        ]
      }
    }
    if (lower.startsWith('registrare l’esito e gli estremi')) {
      return {
        paragraphs: [
          'Nella scheda CdA selezionare l’esito della decisione e compilare gli estremi dell’atto che la formalizza. Utilizzare i campi disponibili per data, riferimento e note secondo il caso.',
          'Se la decisione modifica l’importo o la scadenza, completare anche i campi di rideterminazione prima di salvare.'
        ]
      }
    }
    if (lower.startsWith('se l’esito ridetermina')) {
      return {
        paragraphs: [
          'Compilare i campi del nuovo importo e/o della nuova scadenza soltanto quando la decisione del CdA li modifica effettivamente. Utilizzare le note per riportare le informazioni necessarie a comprendere la rideterminazione.',
          'Controllare i valori prima del Salva perché saranno utilizzati nei successivi adempimenti della pratica.'
        ]
      }
    }
    if (lower.startsWith('registrare l’operatore/data')) {
      return {
        paragraphs: [
          'Completare i dati di definizione dell’esito nella stessa scheda CdA quando i relativi campi sono disponibili. Verificare operatore e data e quindi utilizzare Salva.',
          'Dopo il salvataggio rileggere il riepilogo dell’esito prima di procedere alla definizione o a un’eventuale riapertura.'
        ]
      }
    }
    if (lower.startsWith('se la decisione richiede una nuova istruttoria')) {
      return {
        paragraphs: [
          'Quando l’esito del CdA richiede di riaprire l’istruttoria, non modificare i dati del ciclo già chiuso. Passare alla scheda Riapertura e registrare il provvedimento che dispone il nuovo ciclo.',
          'Dopo il Salva della riapertura il Responsabile dell’istruttoria amministrativa potrà utilizzare Gestisci istruttoria per avviare la nuova istruttoria amministrativa.'
        ]
      }
    }
    if (lower.startsWith('selezionare l’istruttore amministrativo per il nuovo ciclo')) {
      return {
        paragraphs: [
          'Nel pannello Avvia nuova istruttoria amministrativa scegliere l’Istruttore amministrativo che dovrà gestire il nuovo ciclo e controllare il nominativo nel riepilogo.',
          'Confermare l’azione: la pratica viene assegnata al destinatario scelto e torna nello stato che richiede una nuova presa in carico.'
        ]
      }
    }
    if (lower.startsWith('verificare che la pratica risulti da prendere in carico')) {
      return {
        paragraphs: [
          'Dopo la conferma tornare all’Elenco pratiche e verificare che il nuovo destinatario sia l’Istruttore amministrativo selezionato. Per quell’utente la pratica deve comparire in In attesa mia come Da prendere in carico.',
          'Se necessario utilizzare Aggiorna elenco prima di effettuare il controllo.'
        ]
      }
    }
    if (lower.startsWith('aprire definizione')) {
      return {
        paragraphs: [
          'Nella lavorazione amministrativa selezionare la scheda Definizione. La scheda raccoglie i dati dell’incasso e la modalità con cui la pratica viene conclusa.',
          'Compilare questi dati soltanto quando il procedimento è arrivato alla fase conclusiva corrispondente.'
        ]
      }
    }
    if (lower.startsWith('controllare lo stato di pagamento proposto')) {
      return {
        paragraphs: [
          'Dopo avere inserito l’incasso controllare lo stato di pagamento calcolato dal gestionale. Un importo almeno pari al totale dovuto produce Pagato; un importo positivo ma inferiore produce Parziale.',
          'Se viene segnalata un’eccedenza, verificare l’importo inserito prima di definire la pratica.'
        ]
      }
    }
    if (lower.startsWith('selezionare la modalità di definizione')) {
      return {
        paragraphs: [
          'Aprire l’elenco della modalità di definizione e scegliere la voce che corrisponde all’esito effettivo del procedimento, ad esempio Pagata, Archiviata, Annullata, Avviata a riscossione o Definita dopo ricorso.',
          'Completare le eventuali note necessarie a spiegare la chiusura e quindi salvare.'
        ]
      }
    }
  }

  if (chapter.startsWith('18. nota spese')) {
    if (lower.startsWith('aprire la pratica tecnica e la sezione nota spese')) {
      return {
        paragraphs: [
          'Aprire la pratica in lavorazione tecnica e selezionare Nota spese nella barra delle schede. La sezione mostra le casistiche attivate dalle violazioni della pratica.',
          'Se la sezione non presenta casistiche disponibili, verificare prima le violazioni selezionate.'
        ]
      }
    }
    if (lower.startsWith('selezionare la violazione/casistica')) {
      return {
        paragraphs: [
          'Nella Nota spese selezionare la casistica cui devono essere attribuiti i costi. Per l’art. 30 scegliere anche l’attrezzatura interessata quando il pannello la richiede.',
          'La casistica selezionata determina le categorie e le voci che possono essere aggiunte dal Browser nota spese.'
        ]
      }
    }
    if (lower.startsWith('controllare il riepilogo per categoria')) {
      return {
        paragraphs: [
          'Prima del Salva controllare il riepilogo della Nota spese: importi per categoria, spese generali e totale complessivo. Verificare che quantità e voci selezionate corrispondano alle lavorazioni effettivamente necessarie.',
          'Se il totale non è corretto, intervenire sulle quantità o sulle voci prima di salvare.'
        ]
      }
    }
    if (lower.startsWith('selezionare una voce e usare aggiungi')) {
      return {
        paragraphs: [
          'Nell’elenco del Browser selezionare la voce desiderata e utilizzare Aggiungi. La voce viene inserita nel carrello e il relativo contatore viene aggiornato.',
          'Se la stessa voce è già presente nel carrello, il Browser non consente di aggiungerla una seconda volta.'
        ]
      }
    }
    if (lower.startsWith('controllare il numero delle voci aggiunte')) {
      return {
        paragraphs: [
          'Controllare il badge del carrello dopo ogni aggiunta: il numero indica quante voci sono state selezionate e verranno inserite nella Nota spese dopo la conferma.',
          'Aprire il carrello se serve verificare o rimuovere una voce prima della conferma.'
        ]
      }
    }
    if (lower.startsWith('per rimuovere una singola voce')) {
      return {
        paragraphs: [
          'Aprire il carrello e utilizzare il comando di eliminazione sulla singola voce che non deve essere riportata nella Nota spese. Per eliminare l’intera selezione utilizzare Svuota e confermare.',
          'Dopo la rimozione controllare nuovamente il contatore prima di confermare il carrello.'
        ]
      }
    }
    if (lower.startsWith('usare conferma (#)')) {
      return {
        paragraphs: [
          'Quando il carrello contiene tutte e sole le voci necessarie utilizzare Conferma. Il numero mostrato nel comando corrisponde alle voci che verranno riportate nella Nota spese.',
          'Utilizzare Annulla se si vuole uscire dal Browser senza applicare la selezione corrente.'
        ]
      }
    }
  }

  if (chapter.startsWith('19. prezzari')) {
    if (lower.startsWith('controllare/compilare anno e descrizione')) {
      return {
        paragraphs: [
          'Dopo avere selezionato lo ZIP controllare Anno e Descrizione nel pannello di importazione. Il gestionale può proporre questi valori dal contenuto del file, ma devono essere verificati prima dell’import.',
          'Correggere l’anno soltanto se necessario e rispettare il formato accettato dal campo.'
        ]
      }
    }
    if (lower.startsWith('scegliere se attivare subito')) {
      return {
        paragraphs: [
          'Nel pannello di importazione utilizzare l’opzione di attivazione per decidere se il nuovo prezzario deve diventare immediatamente quello attivo dopo il caricamento.',
          'Se non viene attivato subito, potrà essere attivato successivamente dalla tabella dei prezzari.'
        ]
      }
    }
    if (lower.startsWith('avviare l’importazione')) {
      return {
        paragraphs: [
          'Dopo avere controllato file, anno e descrizione avviare l’importazione. Se è già presente un prezzario regionale dello stesso anno, il gestionale mostra una richiesta di conferma per la sostituzione.',
          'Confermare soltanto se si intende realmente rimpiazzare l’import esistente; attendere quindi il completamento e controllare i conteggi riportati nella tabella.'
        ]
      }
    }
    if (lower.startsWith('al termine controllare nella tabella')) {
      return {
        paragraphs: [
          'Terminato l’import, individuare la nuova riga nella tabella e verificare anno, tipo, descrizione, stato, nome del file e conteggi di articoli e analisi.',
          'Un conteggio inatteso o dati non coerenti con il pacchetto sono un motivo per non attivare il prezzario finché non viene verificato l’import.'
        ]
      }
    }
    if (lower.startsWith('usare il comando di attivazione')) {
      return {
        paragraphs: [
          'Sulla riga del prezzario da utilizzare scegliere il comando di attivazione. Il gestionale disattiva l’eventuale altra importazione attiva dello stesso tipo e rende attiva quella selezionata.',
          'Controllare lo stato della riga dopo l’operazione.'
        ]
      }
    }
    if (lower.startsWith('per eliminare un import')) {
      return {
        paragraphs: [
          'Prima di eliminare un import assicurarsi che non sia attivo. Disattivarlo, quindi utilizzare Elimina sulla relativa riga e confermare nel pannello.',
          'L’eliminazione riguarda l’import selezionato e i dati che gli appartengono; verificare con attenzione anno e tipo prima di confermare.'
        ]
      }
    }
    if (lower.startsWith('indicare anno listino')) {
      return {
        paragraphs: [
          'Nel modulo del nuovo prezzo compilare Anno listino con l’anno cui deve appartenere la voce. Il valore concorre alla classificazione e alla costruzione del codice del nuovo prezzo.',
          'Proseguire quindi con Super capitolo, Capitolo e Sub capitolo.'
        ]
      }
    }
    if (lower.startsWith('selezionare super capitolo')) {
      return {
        paragraphs: [
          'Aprire in sequenza Super capitolo, Capitolo e Sub capitolo e scegliere i valori coerenti con la voce da creare. Le opzioni disponibili dipendono dalla classificazione configurata.',
          'Dopo la selezione il Codice del nuovo prezzo viene costruito dal gestionale e resta in sola lettura.'
        ]
      }
    }
    if (lower.startsWith('compilare descrizione, unità di misura e prezzo unitario')) {
      return {
        paragraphs: [
          'Compilare Descrizione e Unità di misura e, per un prezzo ELEMENTARE, indicare il Prezzo unitario. Utilizzare Note per eventuali informazioni integrative.',
          'Controllare i valori prima del Salva perché la voce potrà essere utilizzata come componente di altri prezzi.'
        ]
      }
    }
    if (lower.startsWith('lasciare attivo')) {
      return {
        paragraphs: [
          'Mantenere Attivo quando il nuovo prezzo deve essere disponibile subito nelle funzioni che lo utilizzano. Disattivare l’opzione soltanto se la voce deve essere conservata ma non ancora resa selezionabile.',
          'Lo stato può essere modificato successivamente da Voci interne.'
        ]
      }
    }
    if (lower.startsWith('scegliere tipologia = analizzata')) {
      return {
        paragraphs: [
          'Nel nuovo prezzo aprire Tipologia e scegliere ANALIZZATA. Con questa scelta il Prezzo unitario non viene inserito manualmente ma sarà calcolato dalle righe dell’analisi.',
          'Compilare quindi i dati dell’intestazione e salvarla prima di aggiungere le componenti.'
        ]
      }
    }
    if (lower.startsWith('compilare anno listino, gerarchia')) {
      return {
        paragraphs: [
          'Compilare Anno listino, classificazione gerarchica, Descrizione, Unità di misura e Note. Per un prezzo ANALIZZATO lasciare il prezzo unitario al calcolo automatico del gestionale.',
          'Salvare l’intestazione per rendere disponibili i comandi dell’analisi.'
        ]
      }
    }
    if (lower.startsWith('scegliere l’origine della componente')) {
      return {
        paragraphs: [
          'Nel pannello Nuova riga aprire Origine e scegliere da quale archivio proviene la componente: REGIONALE, INTERNO oppure NUOVO PREZZO.',
          'La scelta determina l’insieme di voci nel quale verrà eseguita la ricerca successiva.'
        ]
      }
    }
    if (lower.startsWith('inserire quantità maggiore di zero')) {
      return {
        paragraphs: [
          'Dopo avere selezionato la voce sorgente inserire una Quantità maggiore di zero e aggiungere eventuali Note. Salvare la riga.',
          'L’importo viene calcolato come Quantità × Prezzo unitario; controllarlo nella riga appena inserita.'
        ]
      }
    }
    if (lower.startsWith('ripetere per tutte le componenti')) {
      return {
        paragraphs: [
          'Aggiungere una riga per ogni componente necessaria. Utilizzare i comandi della tabella per modificare o eliminare una riga e le frecce su/giù per cambiare l’ordine.',
          'L’ordine è utile anche per rendere leggibile l’analisi quando viene consultata successivamente.'
        ]
      }
    }
    if (lower.startsWith('controllare il prezzo unitario complessivo')) {
      return {
        paragraphs: [
          'Dopo avere completato le righe controllare il Prezzo unitario complessivo mostrato nell’intestazione. Il valore deve corrispondere alla somma degli importi delle componenti.',
          'Se il totale non è corretto, verificare quantità e componenti prima di considerare conclusa l’analisi.'
        ]
      }
    }
    if (lower.startsWith('modificare descrizione, unità di misura')) {
      return {
        paragraphs: [
          'In Voci interne aprire la voce selezionata e modificare Descrizione, Unità di misura, stato Attivo o Note. Per i prezzi ELEMENTARI è modificabile anche il prezzo unitario.',
          'Per i prezzi ANALIZZATI il prezzo resta calcolato dalle righe dell’analisi: intervenire sulle componenti se deve cambiare il valore complessivo.'
        ]
      }
    }
    if (lower.startsWith('per eliminare la voce usare elimina')) {
      return {
        paragraphs: [
          'Sulla voce selezionata utilizzare Elimina e confermare. Se il nuovo prezzo è già utilizzato come componente di un’altra analisi, il gestionale blocca l’operazione per evitare di rendere incoerenti le analisi esistenti.',
          'In caso di blocco valutare la disattivazione della voce invece dell’eliminazione.'
        ]
      }
    }
    if (lower.startsWith('usare nuovo per creare un parametro')) {
      return {
        paragraphs: [
          'Nell’archivio selezionato utilizzare Nuovo per aprire il modulo di inserimento oppure Modifica sulla riga di un parametro esistente.',
          'Il modulo mostra i campi pertinenti al tipo di parametro scelto; completare i valori richiesti e il periodo di validità prima di salvare.'
        ]
      }
    }
    if (lower.startsWith('compilare descrizione, anno di riferimento')) {
      return {
        paragraphs: [
          'Nel modulo compilare Descrizione, Anno di riferimento e il valore previsto dall’archivio, numerico o testuale. Impostare inoltre lo stato Attivo, l’eventuale periodo di validità e le Note.',
          'Controllare soprattutto sovrapposizioni o date incoerenti quando il parametro ha un periodo di validità.'
        ]
      }
    }
    if (lower.startsWith('per i prezzi delle attrezzature')) {
      return {
        paragraphs: [
          'Nell’archivio Prezzi delle attrezzature selezionare il tipo di attrezzatura e compilare Valore unitario (€). Utilizzare gli altri campi del parametro per anno, validità e stato.',
          'Il valore viene utilizzato nelle casistiche di risarcimento previste per l’art. 30.'
        ]
      }
    }
    if (lower.startsWith('aprire consultazione prezzari')) {
      return {
        paragraphs: [
          'Aprire Gestione prezzari e selezionare Consultazione. La vista consente di esaminare le sorgenti disponibili senza modificarle.',
          'Scegliere la sorgente e utilizzare la ricerca o l’albero di classificazione per raggiungere la voce desiderata.'
        ]
      }
    }
    if (lower.startsWith('selezionare famiglia/capitolo')) {
      return {
        paragraphs: [
          'Nell’albero o nei filtri della Consultazione selezionare Famiglia, Capitolo o Sottocapitolo per restringere progressivamente l’elenco.',
          'Utilizzare Tutte le voci per rimuovere il filtro gerarchico e tornare alla sorgente completa.'
        ]
      }
    }
    if (lower.startsWith('selezionare una voce per aprirne il dettaglio')) {
      return {
        paragraphs: [
          'Fare clic sulla voce interessata nell’elenco. Il pannello di dettaglio mostra codice, descrizione, unità di misura, prezzo e le altre informazioni disponibili.',
          'Quando la sorgente contiene un’analisi, aprire anche il relativo dettaglio per vedere componenti, quantità e importi che formano il prezzo.'
        ]
      }
    }
  }

  if (chapter.startsWith('20. mappa')) {
    if (lower.startsWith('restringere progressivamente')) {
      return {
        paragraphs: [
          'Dopo il Comune aprire Sezione, poi Foglio e infine Mappale. Ogni elenco viene filtrato in base alle scelte già effettuate, quindi procedere nell’ordine proposto dal pannello.',
          'Non è necessario compilare tutti i livelli se il risultato desiderato è già individuabile con un criterio più generale.'
        ]
      }
    }
    if (lower.startsWith('consultare i risultati e la geometria')) {
      return {
        paragraphs: [
          'Dopo Cerca utilizzare l’elenco dei risultati per individuare la particella e osservare sulla mappa la geometria evidenziata.',
          'Per eseguire una nuova ricerca non collegata alla precedente, azzerare i criteri del pannello prima di inserire i nuovi valori.'
        ],
        figure: 'Figura – Mappa del gestionale'
      }
    }
    if (lower.startsWith('impostare uno o più criteri tra stato')) {
      return {
        paragraphs: [
          'Nella sezione Opere CBSM utilizzare uno o più filtri tra Stato, Tipo e Nome. Le scelte disponibili possono restringersi in base ai criteri già impostati.',
          'Premere Cerca e utilizzare risultati ed evidenziazione cartografica per individuare l’opera.'
        ]
      }
    }
    if (lower.startsWith('impostare almeno un criterio tra articolo')) {
      return {
        paragraphs: [
          'Nella sezione Infrazioni compilare almeno uno dei criteri disponibili: Articolo violato, Tipo pratica, Numero pratica, Nominativo/Ragione sociale oppure CF/P. IVA.',
          'I criteri possono essere combinati per restringere la ricerca. Se si usa Numero pratica, impostare anche il Tipo pratica corretto.'
        ]
      }
    }
    if (lower.startsWith('se si utilizza numero pratica')) {
      return {
        paragraphs: [
          'Aprire Tipo pratica e scegliere il riferimento che si sta cercando: Rilevazione, Rapporto tecnico oppure Atto di accertamento. Inserire poi il relativo numero nel campo Numero pratica.',
          'La combinazione evita che numerazioni appartenenti a tipologie diverse producano risultati ambigui.'
        ]
      }
    }
    if (lower.startsWith('consultare il conteggio e le pratiche visualizzate')) {
      return {
        paragraphs: [
          'Dopo la ricerca controllare il numero di risultati e l’elenco delle pratiche visualizzate. Se il gestionale segnala che mostra soltanto i primi elementi, aggiungere uno o più criteri per restringere il risultato.',
          'Selezionare il risultato di interesse per localizzarlo sulla mappa.'
        ]
      }
    }
    if (lower.startsWith('azzerare la ricerca')) {
      return {
        paragraphs: [
          'Utilizzare il comando di azzeramento del pannello per rimuovere i criteri della ricerca precedente. In questo modo la nuova interrogazione non viene involontariamente limitata da valori rimasti impostati.',
          'Inserire quindi i nuovi criteri e avviare nuovamente Cerca.'
        ]
      }
    }
  }

  if (chapter.startsWith('21. dashboard')) {
    if (lower.startsWith('cliccare i filtri interattivi')) {
      return {
        paragraphs: [
          'Nella sezione Statistiche selezionare una voce nei riquadri Ufficio o Infrazione per applicarla come filtro. Gli altri indicatori della pagina vengono ricalcolati in base alla selezione.',
          'Utilizzare Azzera filtri per rimuovere tutte le selezioni interattive e tornare al quadro completo.'
        ],
        figure: 'Figura – Dashboard statistiche'
      }
    }
    if (lower.startsWith('usare aggiorna quando')) {
      return {
        paragraphs: [
          'Utilizzare Aggiorna nella Dashboard quando sono state appena eseguite lavorazioni che possono avere modificato conteggi o stati delle pratiche.',
          'Il comando ricarica i dati mantenendo la vista corrente; non modifica le pratiche.'
        ]
      }
    }
    if (lower.startsWith('per situazione scegliere')) {
      return {
        paragraphs: [
          'Nel filtro Situazione del Report scegliere il tipo di insieme da analizzare: In attesa mia, In attesa di altri, Ferme oppure Fase sanzionatoria.',
          'Il filtro può essere combinato con Area, Settore, date, Fase procedimentale e Competenza attuale.'
        ]
      }
    }
    if (lower.startsWith('consultare la sintesi procedimentale')) {
      return {
        paragraphs: [
          'Dopo avere impostato i filtri leggere la tabella Sintesi procedimentale. Ogni riga corrisponde a una pratica e mostra i principali riferimenti, la fase, la competenza attuale, l’ultimo aggiornamento e i giorni di fermo.',
          'Utilizzare le intestazioni delle colonne per ordinare la tabella quando serve confrontare date, numerazioni o tempi di fermo.'
        ]
      }
    }
    if (lower.startsWith('usare pulisci filtri')) {
      return {
        paragraphs: [
          'Premere Pulisci filtri nella fascia dei filtri del Report per rimuovere tutti i criteri impostati.',
          'La tabella torna così all’insieme completo delle pratiche visibili al ruolo corrente.'
        ]
      }
    }
  }

  if (chapter.startsWith('22. rubrica')) {
    if (lower.startsWith('scegliere tipo: persona fisica')) {
      return {
        paragraphs: [
          'Nel modulo Aggiungi destinatario aprire Tipo. Scegliere Persona fisica per compilare Nome e Cognome oppure Altro per utilizzare Denominazione.',
          'Completare poi E-mail e Utilizzo prima del Salva.'
        ]
      }
    }
    if (lower.startsWith('quando il sistema rileva un omonimo')) {
      return {
        paragraphs: [
          'Se compare l’avviso di omonimia, confrontare i dati del contatto già presente con quelli che si stanno inserendo. Se è la stessa persona, riutilizzare il contatto esistente; se è un soggetto diverso, confermare la creazione distinta.',
          'Quando richiesto utilizzare la Data di nascita per distinguere correttamente i due nominativi.'
        ]
      }
    }
    if (lower.startsWith('selezionare il titolo e compilare nome e cognome')) {
      return {
        paragraphs: [
          'Nel modulo del firmatario scegliere il Titolo e compilare Nome e Cognome esattamente come devono essere riconosciuti nel certificato di firma.',
          'Se esistono omonimi utilizzare anche la Data di nascita per distinguere il soggetto.'
        ]
      }
    }
    if (lower.startsWith('gestire la data di nascita')) {
      return {
        paragraphs: [
          'Compilare la Data di nascita quando è necessaria a distinguere due firmatari con lo stesso nome e cognome. Lasciarla vuota quando non serve al riconoscimento.',
          'Salvare quindi il firmatario e verificare che compaia nell’elenco.'
        ]
      }
    }
    if (lower.startsWith('in alternativa espandere/collassare')) {
      return {
        paragraphs: [
          'Nel pannello Indice regolamento utilizzare le frecce delle sezioni per espanderle o richiuderle. Selezionare il titolo dell’articolo desiderato per aprirne il testo nel pannello di destra.',
          'I pulsanti Argomento e Numero, nell’intestazione dell’indice, consentono di passare dagli articoli raggruppati per argomento all’elenco degli articoli in ordine di numero.',
          'Questa modalità è utile quando si conosce la collocazione dell’articolo ma non si vuole utilizzare la ricerca testuale.'
        ],
        figure: 'Figura – Consultazione del Regolamento irriguo'
      }
    }
    if (lower.startsWith('leggere il testo articolo')) {
      return {
        paragraphs: [
          'Il pannello di destra mostra il testo dell’articolo selezionato. Scorrere il contenuto e utilizzare gli eventuali riferimenti ad altri articoli come collegamenti per la navigazione interna.',
          'Per tornare all’articolo precedente utilizzare la navigazione dedicata oppure l’indice a sinistra.'
        ]
      }
    }
    if (lower.startsWith('usare articolo precedente')) {
      return {
        paragraphs: [
          'Utilizzare Articolo precedente e Articolo successivo nel pannello di lettura per spostarsi lungo la sequenza del Regolamento senza tornare ogni volta all’indice.',
          'Il titolo e il testo vengono aggiornati sull’articolo raggiunto.'
        ]
      }
    }
    if (lower.startsWith('usare reimposta indice')) {
      return {
        paragraphs: [
          'Dopo una ricerca o una navigazione filtrata utilizzare Pulisci ricerca o Reimposta indice per ripristinare tutte le sezioni e gli articoli.',
          'Il comando non modifica il Regolamento: agisce soltanto sulla vista corrente.'
        ]
      }
    }
    if (lower.startsWith('se disponibile, usare apri il testo integrale')) {
      return {
        paragraphs: [
          'Utilizzare Apri il testo integrale (PDF) quando serve consultare il documento completo nella sua versione unitaria.',
          'La consultazione PDF è complementare alla navigazione per articoli e non modifica la selezione corrente nel gestionale.'
        ]
      }
    }
  }

  if (chapter.startsWith('23. gestione utenti')) {
    if (lower.startsWith('controllare i dati identificativi proposti')) {
      return {
        paragraphs: [
          'Dopo avere selezionato il membro ArcGIS Online controllare Nome, Cognome, nome utente ed e-mail proposti nel modulo. Questi dati identificano la persona cui verrà associata l’assegnazione gestionale.',
          'Se i dati dell’account non sono corretti, correggerli prima nella relativa gestione di ArcGIS Online invece di creare un utente duplicato.'
        ]
      }
    }
    if (lower.startsWith('compilare area, settore e ufficio')) {
      return {
        paragraphs: [
          'Dopo la scelta del Ruolo compilare soltanto i campi organizzativi che il modulo rende disponibili. Area, Settore e Ufficio possono cambiare in base al ruolo e alcune combinazioni vengono impostate automaticamente.',
          'Controllare l’ambito completo prima del Salva perché determina visibilità e competenze dell’assegnazione.'
        ]
      }
    }
    if (lower.startsWith('controllare il gruppo calcolato')) {
      return {
        paragraphs: [
          'Nel riepilogo dell’assegnazione controllare il Gruppo proposto dal gestionale. Il gruppo deriva dal ruolo e dall’ambito selezionati e, quando previsto, sarà utilizzato anche per aggiornare l’appartenenza dell’utente in ArcGIS Online.',
          'Se il gruppo non è quello atteso, ricontrollare ruolo, Area, Settore e Ufficio prima di salvare.'
        ]
      }
    }
    if (lower.startsWith('verificare il messaggio utente aggiunto')) {
      return {
        paragraphs: [
          'Dopo il Salva attendere il messaggio Utente aggiunto e controllare che la nuova assegnazione compaia nell’elenco Gestione utenti.',
          'Se il ruolo prevede un gruppo ArcGIS Online, verificare anche che l’operazione non abbia restituito errori di aggiornamento dell’appartenenza.'
        ]
      }
    }
    if (lower.startsWith('selezionare la riga e usare modifica utente')) {
      return {
        paragraphs: [
          'Nell’elenco Gestione utenti fare clic sulla riga dell’assegnazione da modificare e utilizzare Modifica utente; in alternativa fare doppio clic direttamente sulla riga.',
          'Il pannello si apre sull’assegnazione selezionata e consente di intervenire sui dati che il ruolo rende modificabili.'
        ]
      }
    }
    if (lower.startsWith('cambiare l’assegnazione consentita')) {
      return {
        paragraphs: [
          'Nel pannello Modifica utente cambiare i valori dell’assegnazione che devono essere aggiornati e controllare il nuovo riepilogo del gruppo calcolato.',
          'Utilizzare Aggiorna per registrare la modifica; l’operazione può aggiornare anche l’appartenenza ai gruppi collegati quando necessario.'
        ]
      }
    }
    if (lower.startsWith('confermare la sincronizzazione')) {
      return {
        paragraphs: [
          'Nel confronto mostrato da Sincronizza controllare voce per voce i valori correnti e quelli provenienti da ArcGIS Online. Confermare soltanto se le differenze corrispondono alle modifiche realmente effettuate sull’account.',
          'La conferma aggiorna tutte le assegnazioni del medesimo utente con i nuovi dati identificativi.'
        ]
      }
    }
    if (lower.startsWith('scegliere il nuovo ruolo e il relativo ambito')) {
      return {
        paragraphs: [
          'Nel pannello Nuova assegnazione aprire Ruolo e scegliere il nuovo incarico. Compilare quindi Area, Settore e Ufficio secondo i campi resi disponibili per quel ruolo.',
          'Controllare che la nuova combinazione sia diversa dalle assegnazioni già presenti per lo stesso utente.'
        ]
      }
    }
    if (lower.startsWith('compilare i dati della nuova assegnazione')) {
      return {
        paragraphs: [
          'Completare i campi organizzativi richiesti e controllare il Gruppo calcolato. I dati identificativi della persona restano quelli dell’utente già selezionato.',
          'Salvare la nuova assegnazione e verificare che compaia come riga aggiuntiva nell’elenco.'
        ]
      }
    }
    if (lower.startsWith('leggere il messaggio di conferma e scegliere elimina')) {
      return {
        paragraphs: [
          'Nel pannello di conferma controllare il nominativo, il ruolo e l’ambito dell’assegnazione che si sta rimuovendo. Utilizzare Elimina soltanto dopo avere verificato che sia la riga corretta.',
          'L’operazione riguarda l’assegnazione gestionale selezionata e non cancella l’account ArcGIS Online della persona.'
        ]
      }
    }
  }

  if (chapter.startsWith('24. allegati')) {
    if (lower.startsWith('aprire la scheda allegati')) {
      return {
        paragraphs: [
          'Con la pratica aperta nella lavorazione selezionare Allegati nella barra delle schede. La sezione distingue la documentazione tecnica e, nella fase amministrativa, quella amministrativa.',
          'Da qui utilizzare i comandi della sezione per aggiungere, sostituire, eliminare o aprire i documenti secondo i permessi della fase corrente.'
        ]
      }
    }
    if (lower.startsWith('continuare le altre modifiche')) {
      return {
        paragraphs: [
          'Dopo avere predisposto le operazioni sugli allegati è possibile continuare a lavorare nelle altre schede della stessa pratica. Prima di uscire dalla lavorazione verificare però se le modifiche correnti richiedono ancora Salva.',
          'Nella lavorazione tecnica aggiunte, sostituzioni, eliminazioni e rotazioni diventano definitive con il Salva complessivo.'
        ]
      }
    }
    if (lower.startsWith('verificare il nuovo elenco degli allegati')) {
      return {
        paragraphs: [
          'Tornare ad Allegati e controllare che l’elenco mostri i documenti attesi dopo l’operazione. Aprire il file interessato se serve un controllo finale.',
          'Per verificare che la variazione sia stata tracciata, aprire Dettaglio pratica → Iter e cercare il passaggio relativo alla modifica degli allegati.'
        ]
      }
    }
    if (lower.startsWith('leggere avviato da e trasmesso a')) {
      return {
        paragraphs: [
          'Nel blocco dell’Iter interessato leggere Avviato da per capire chi ha aperto il passaggio e Trasmesso a per individuare il destinatario successivo.',
          'Usare queste informazioni insieme a data, stato e motivazione per ricostruire il trasferimento di responsabilità tra i ruoli.'
        ]
      }
    }
    if (lower.startsWith('controllare le modifiche agli allegati')) {
      return {
        paragraphs: [
          'Nel blocco dell’Iter cercare la sezione dedicata alle variazioni degli allegati. Sono riportate le operazioni registrate, come aggiunta, sostituzione o eliminazione, con il riferimento al documento interessato.',
          'Confrontare queste informazioni con l’elenco attuale degli Allegati quando serve ricostruire l’evoluzione del fascicolo.'
        ]
      }
    }
    if (lower.startsWith('se il ciclo è un rimando')) {
      return {
        paragraphs: [
          'Nel blocco che contiene il rimando leggere la motivazione e identificare il ruolo che ha chiesto l’integrazione. Proseguire quindi negli eventi successivi cercando Esito integrazione trasmesso.',
          'Seguire la sequenza fino al ritorno dell’esito al ruolo richiedente: è in quel punto che riprende la normale verifica, validazione o approvazione.'
        ]
      }
    }
  }

  if (lower.includes('prendi in carico') || lower.startsWith('prendere in carico')) {
    return {
      paragraphs: [
        'Selezionare la pratica nell’Elenco pratiche e guardare l’area Azioni sotto l’elenco. Quando la pratica è nello stato Da prendere in carico, utilizzare Prendi in carico e confermare.',
        'Dopo la presa in carico lo stato passa a In carico e diventano disponibili le operazioni previste per il ruolo nella fase corrente.'
      ]
    }
  }

  if (lower.includes('gestisci istruttoria')) {
    return {
      paragraphs: [
        'Con la pratica selezionata e, quando richiesto, già presa in carico, utilizzare Gestisci istruttoria nell’area Azioni. Si apre il pannello con gli esiti disponibili per il ruolo e per la fase corrente.',
        'Se l’azione prevede una motivazione, un destinatario o altri dati obbligatori, completarli nel pannello prima di confermare. La conferma registra il passaggio nell’Iter e aggiorna il destinatario della pratica.'
      ]
    }
  }

  if (lower.startsWith('aprire l’allarme') || lower.startsWith('aprire la campanella') || lower.includes('allarme “')) {
    return {
      paragraphs: [
        'Aprire la campanella nell’intestazione del gestionale e individuare la voce riferita alla pratica. Utilizzare Apri pratica per aprire l’Elenco pratiche e selezionare automaticamente la pratica interessata.'
      ]
    }
  }

  if (lower.startsWith('aprire ') && includesAny(lower, ['dalla home', 'dal menu', 'dal navigatore', 'gestione prezzari', 'report', 'rubrica', 'gestione utenti', 'regolamento irriguo', 'dashboard', 'mappa'])) {
    const m = text.match(/^Aprire\s+([^.;]+)/i)
    const view = m ? m[1].replace(/\s+dalla Home.*$/i, '').replace(/\s+dal menu.*$/i, '') : 'la vista indicata'
    return {
      paragraphs: [
        `Dalla Home selezionare la card ${view}; se ci si trova già in un’altra vista, utilizzare la corrispondente voce del navigatore laterale.`
      ]
    }
  }

  if (lower.startsWith('aprire ') && (lower.includes('dettaglio') || lower.includes('iter'))) {
    return {
      paragraphs: [
        'Selezionare prima la pratica nell’Elenco pratiche. Nel pannello Dettaglio pratica selezionata, sulla destra, scegliere la scheda indicata nel passaggio.',
        'Il Dettaglio serve alla consultazione: se occorre modificare dati, utilizzare invece la funzione di lavorazione disponibile nell’area Azioni.'
      ]
    }
  }

  if (lower.includes('premere salva') || lower.startsWith('salvare') || lower.startsWith('usare salva')) {
    return {
      paragraphs: [
        'Utilizzare Salva nella vista di lavorazione dopo avere completato le modifiche. Se il sistema rileva dati obbligatori mancanti o valori non coerenti, correggere quanto segnalato e ripetere il salvataggio.',
        'Dopo il salvataggio controllare che non restino modifiche pendenti prima di eseguire una successiva azione di trasmissione, validazione o approvazione.'
      ]
    }
  }

  if (lower.startsWith('caricare ') || lower.includes('carica pdf') || lower.includes('caricare il pdf')) {
    return {
      paragraphs: [
        'Utilizzare il comando di caricamento presente nella sezione indicata e selezionare il file dal dispositivo. Prima di confermare verificare che il documento scelto sia quello corretto e, quando previsto, nel formato richiesto.',
        'Dopo il caricamento controllare che il nome del file compaia nella sezione e che lo stato del documento sia aggiornato.'
      ]
    }
  }

  if (lower.startsWith('usare cerca') || lower.startsWith('cercare ') || lower.startsWith('cercare/')) {
    return {
      paragraphs: [
        'Compilare uno o più criteri disponibili nella vista e avviare la ricerca con Cerca. I criteri possono essere combinati quando la funzione lo consente.',
        'Prima di una nuova ricerca, azzerare i criteri precedenti se non devono essere mantenuti.'
      ]
    }
  }

  if (lower.startsWith('ordinare ')) {
    return {
      paragraphs: [
        'Fare clic sull’intestazione della colonna che si vuole utilizzare come criterio di ordinamento. Il simbolo accanto al titolo indica la direzione applicata.',
        'Quando la vista consente l’ordinamento multiplo, ulteriori colonne possono essere aggiunte come criteri successivi; utilizzare il comando di ripristino per tornare all’ordinamento iniziale.'
      ]
    }
  }

  if (lower.startsWith('selezionare ') || lower.startsWith('scegliere ') || lower.startsWith('impostare ')) {
    return {
      paragraphs: [
        'Utilizzare il campo, la scheda o la voce indicata nel passaggio. Se si tratta di un elenco a scelta, aprirlo e selezionare il valore corrispondente alla pratica o all’attività da svolgere.',
        'Le scelte disponibili possono dipendere dal ruolo, dallo stato della pratica o da valori già selezionati in altri campi.'
      ]
    }
  }

  if (lower.startsWith('compilare ') || lower.startsWith('inserire ') || lower.startsWith('indicare ')) {
    return {
      paragraphs: [
        'Aprire la sezione indicata e compilare i campi richiesti. I campi obbligatori devono essere completati prima del salvataggio o della conferma dell’azione.',
        'Quando una scelta attiva ulteriori campi, completarli prima di proseguire e controllare il riepilogo mostrato nella stessa sezione.'
      ]
    }
  }

  if (lower.startsWith('controllare ') || lower.startsWith('verificare ') || lower.startsWith('consultare ') || lower.startsWith('leggere ')) {
    const figure = includesAny(section, ['violazione', 'istruttoria tecnica']) && lower.includes('violaz')
      ? 'Figura – Violazione nella lavorazione tecnica'
      : undefined
    return {
      paragraphs: [
        'Aprire la sezione indicata e confrontare le informazioni visualizzate con quanto già acquisito nella pratica e nei documenti presenti nel fascicolo.',
        'Se viene rilevata un’incongruenza, utilizzare la funzione di lavorazione prevista per il proprio ruolo oppure, quando non è possibile intervenire direttamente, l’azione di integrazione prevista dalla fase corrente.'
      ],
      figure
    }
  }

  if (lower.startsWith('confermare') || lower.includes(' e confermare') || lower.startsWith('per l’esito positivo')) {
    return {
      paragraphs: [
        'Prima della conferma rileggere l’esito selezionato, il destinatario e l’eventuale motivazione. Utilizzare il pulsante di conferma soltanto quando i dati del pannello sono completi.',
        'La conferma registra l’evento nell’Iter e determina il passaggio della pratica alla fase o al ruolo indicato.'
      ]
    }
  }

  if (lower.startsWith('tornare alle azioni') || lower.startsWith('tornare a gestisci')) {
    return {
      paragraphs: [
        'Chiudere o lasciare la sezione di lavorazione dopo avere salvato le modifiche e tornare all’Elenco pratiche. Con la pratica ancora selezionata, utilizzare l’area Azioni nella parte inferiore per eseguire il passaggio successivo.',
        'Se il comando non è disponibile, verificare che la pratica sia nello stato corretto e che non vi siano modifiche ancora da salvare.'
      ]
    }
  }

  if (lower.startsWith('convertire ') || lower.includes('fuori dal gestionale')) {
    return {
      paragraphs: [
        'Scaricare o aprire il documento generato, completarlo con l’applicazione abitualmente utilizzata per i documenti d’ufficio e produrre il PDF richiesto.',
        'Rientrare quindi nel gestionale e utilizzare il comando di caricamento previsto nella stessa fase.'
      ]
    }
  }

  if (lower.startsWith('aprire la lavorazione')) {
    return {
      paragraphs: [
        'Con la pratica selezionata e, quando previsto, già presa in carico, utilizzare nell’area Azioni il comando che apre la lavorazione disponibile per il proprio ruolo.',
        'All’interno della lavorazione intervenire soltanto sulle sezioni e sui campi abilitati nella fase corrente; salvare le modifiche prima di tornare alle Azioni.'
      ]
    }
  }

  if (lower.startsWith('aprire la pratica')) {
    return {
      paragraphs: [
        'Aprire Elenco pratiche, individuare la riga interessata e selezionarla. Il pannello Dettaglio pratica selezionata e l’area Azioni vengono aggiornati sulla pratica scelta.',
        'Se la procedura richiede una lavorazione, utilizzare il comando disponibile nell’area Azioni e procedere con la presa in carico quando prevista.'
      ]
    }
  }

  if (lower.startsWith('aprire la scheda ')) {
    return {
      paragraphs: [
        'Con la pratica già aperta in lavorazione, utilizzare la barra delle schede nella parte superiore e selezionare quella indicata nel passaggio.',
        'La scheda mostra i dati e i comandi pertinenti alla fase corrente; eventuali campi non modificabili restano in sola lettura.'
      ]
    }
  }

  if (lower.startsWith('aprire le azioni')) {
    return {
      paragraphs: [
        'Nell’Elenco pratiche selezionare la pratica interessata. L’area Azioni si trova sotto l’elenco e mostra i comandi disponibili per il ruolo e per lo stato corrente della pratica.',
        'Se il comando indicato non è disponibile, verificare che la pratica sia stata presa in carico quando richiesto.'
      ]
    }
  }

  if (lower.startsWith('usare ')) {
    return {
      paragraphs: [
        'Individuare nella sezione corrente il comando indicato nel passaggio e selezionarlo. Se il comando apre un pannello di conferma, completare gli eventuali dati richiesti prima di proseguire.',
        'Dopo l’operazione controllare il messaggio mostrato dal gestionale e l’eventuale aggiornamento dello stato o dei dati della pratica.'
      ]
    }
  }

  if (lower.startsWith('registrare ') || lower.startsWith('completare ')) {
    return {
      paragraphs: [
        'Compilare nella sezione indicata tutti i campi pertinenti e verificare quelli obbligatori prima del salvataggio.',
        'Dopo avere registrato i dati, controllare che il riepilogo della sezione riporti i valori inseriti.'
      ]
    }
  }

  if (lower.startsWith('aggiungere ') || lower.startsWith('modificare ') || lower.startsWith('cambiare ')) {
    return {
      paragraphs: [
        'Utilizzare il comando di modifica previsto nella sezione indicata, intervenire soltanto sui dati necessari e confermare o salvare secondo quanto richiesto dalla vista.',
        'Prima di uscire dalla sezione verificare che il dato aggiornato sia riportato nel riepilogo.'
      ]
    }
  }

  if (lower.startsWith('entrare ') || lower.startsWith('proseguire ') || lower.startsWith('continuare ')) {
    return {
      paragraphs: [
        'Proseguire nella stessa pratica utilizzando la funzione o la scheda indicata nel passaggio. Se sono state effettuate modifiche, salvarle prima di cambiare fase o avviare una trasmissione.',
        'Le operazioni disponibili restano legate al ruolo e allo stato corrente della pratica.'
      ]
    }
  }

  if (lower.startsWith('eseguire ')) {
    return {
      paragraphs: [
        'Eseguire l’attività indicata con lo strumento previsto dall’Ente. Quando il passaggio avviene fuori dal gestionale, completarlo prima di rientrare nella pratica e acquisire i documenti o gli estremi richiesti dalla fase successiva.'
      ]
    }
  }

  if (lower.startsWith('avviare ')) {
    return {
      paragraphs: [
        'Utilizzare il comando previsto nella sezione corrente per avviare l’operazione. Se compare una richiesta di conferma, verificare con attenzione l’effetto indicato prima di procedere.',
        'Al termine controllare l’esito mostrato dal gestionale e i dati aggiornati nella stessa vista.'
      ]
    }
  }

  if (lower.startsWith('nella sezione ')) {
    return {
      paragraphs: [
        'Raggiungere la sezione indicata nella pratica e compilare i campi richiamati dal passaggio. I campi che devono essere valorizzati insieme vanno completati prima del salvataggio.',
        'Controllare gli eventuali messaggi di validazione prima di proseguire.'
      ]
    }
  }

  if (lower.startsWith('restringere ') || lower.startsWith('azzerare ') || lower.startsWith('cliccare ')) {
    return {
      paragraphs: [
        'Utilizzare i filtri o i controlli indicati nella vista corrente. Le selezioni aggiornano l’insieme visualizzato e possono essere combinate quando previsto.',
        'Per tornare alla situazione iniziale utilizzare il comando di azzeramento o pulizia disponibile nella stessa vista.'
      ]
    }
  }

  if (lower.startsWith('gestire ')) {
    return {
      paragraphs: [
        'Utilizzare i campi e i comandi disponibili nella sezione indicata per completare l’operazione. Se sono previste più alternative, scegliere quella coerente con la situazione effettiva della pratica.',
        'Salvare o confermare prima di passare alla fase successiva.'
      ]
    }
  }

  if (lower.startsWith('sulla riga ')) {
    return {
      paragraphs: [
        'Individuare la riga interessata nell’elenco e utilizzare il comando indicato associato a quella riga. Il gestionale apre quindi la funzione specifica riferita all’elemento selezionato.'
      ]
    }
  }

  if (lower.startsWith('individuare ')) {
    return {
      paragraphs: [
        'Utilizzare le informazioni visualizzate nella sezione per riconoscere l’elemento indicato nel passaggio. Quando sono presenti più cicli o elementi, confrontare ruolo, data e stato per individuare quello corretto.'
      ]
    }
  }

  if (lower.startsWith('in caso ')) {
    return {
      paragraphs: [
        'Applicare questo passaggio soltanto quando ricorre l’esito o la condizione indicata. Completare gli eventuali dati richiesti dal pannello e confermare l’azione.',
        'Dopo la conferma verificare lo stato della pratica e il destinatario del passaggio successivo.'
      ]
    }
  }

  if (lower.startsWith('al ritorno') || lower.startsWith('al rientro') || lower.startsWith('al termine')) {
    return {
      paragraphs: [
        'Rientrare nella stessa pratica e proseguire dalla sezione indicata. Acquisire o completare i dati prodotti nel passaggio precedente e verificare che il gestionale li riconosca correttamente.',
        'Prima di avanzare controllare il riepilogo della sezione e salvare quando previsto.'
      ]
    }
  }

  if (lower.startsWith('aprire il word')) {
    return {
      paragraphs: [
        'Aprire il documento Word generato dal gestionale con l’applicazione utilizzata per i documenti d’ufficio, completarlo dove previsto e produrre il PDF.',
        'Rientrare quindi nella pratica e utilizzare il comando di caricamento indicato nello stesso passaggio.'
      ]
    }
  }

  if (lower.startsWith('aprire definizione')) {
    return {
      paragraphs: [
        'Nella lavorazione amministrativa selezionare la scheda Definizione nella barra superiore. La sezione raccoglie i dati conclusivi della pratica e l’eventuale incasso.',
        'Compilare soltanto quando il procedimento è arrivato alla fase di definizione prevista.'
      ]
    }
  }

  if (lower.startsWith('controllare/compilare ')) {
    return {
      paragraphs: [
        'Verificare i valori proposti dal gestionale e completare i campi mancanti. Correggere soltanto i dati che non corrispondono al documento o al contenuto da acquisire.',
        'Prima di proseguire controllare che i formati richiesti siano rispettati.'
      ]
    }
  }

  if (lower.startsWith('lasciare ')) {
    return {
      paragraphs: [
        'Mantenere l’impostazione indicata quando corrisponde all’utilizzo previsto. Modificarla soltanto se la voce non deve essere resa immediatamente disponibile nelle funzioni che la utilizzano.'
      ]
    }
  }

  if (lower.startsWith('ripetere ')) {
    return {
      paragraphs: [
        'Ripetere la stessa operazione per ciascun elemento necessario. Prima di concludere, controllare l’elenco complessivo e l’ordine delle righe quando questo incide sul risultato finale.'
      ]
    }
  }

  if (lower.startsWith('aprire consultazione prezzari')) {
    return {
      paragraphs: [
        'Aprire Gestione prezzari e accedere alla sezione Consultazione. Da qui è possibile scegliere la sorgente da esaminare e cercare le relative voci senza modificarle.',
        'Utilizzare i criteri di ricerca o l’albero di classificazione per restringere l’elenco.'
      ]
    }
  }

  if (lower.startsWith('in alternativa ')) {
    return {
      paragraphs: [
        'Utilizzare questa modalità quando non si vuole ricorrere alla ricerca diretta. Espandere progressivamente le voci dell’indice o dell’elenco e selezionare l’elemento desiderato.'
      ]
    }
  }

  if (lower.startsWith('aprire il visualizzatore')) {
    return {
      paragraphs: [
        'Selezionare il documento nell’elenco degli allegati e aprirlo nel visualizzatore. Utilizzare i comandi disponibili per controllarne il contenuto.',
        'Per le immagini, i pulsanti di rotazione consentono di correggere l’orientamento prima di registrare la modifica secondo le regole della lavorazione corrente.'
      ]
    }
  }

  if (lower.startsWith('dopo ') || lower.startsWith('quando ') || lower.startsWith('se ') || lower.startsWith('per ')) {
    return {
      paragraphs: [
        'Verificare che la condizione descritta nel passaggio sia effettivamente presente prima di procedere. Le azioni disponibili cambiano in base allo stato della pratica e al ruolo che la sta lavorando.',
        'Se la condizione non ricorre, proseguire con il percorso ordinario indicato negli altri passaggi della stessa procedura.'
      ]
    }
  }

  return null
}
