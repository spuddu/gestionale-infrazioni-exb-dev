IMPORT PREZZARIO LLPP SARDEGNA 2024 IN AGOL

Usa questi due file normalizzati:
1) GII_PREZZARIO_LLPP_2024_ARTICOLI.csv
2) GII_PREZZARIO_LLPP_2024_ANALISI.csv

Pubblicazione in ArcGIS Online:
- Add item
- From your device
- seleziona il CSV
- Publish as hosted table
- Location settings = None

Ordine consigliato:
1. pubblica ARTICOLI
2. pubblica ANALISI
3. condividi entrambe con ADMIN e RI
4. usa gli URL REST finali nei widget

Nota:
- il pacchetto regionale originale non era pronto per l'import diretto: i campi erano separati con '|'
- qui i numeri sono già normalizzati
