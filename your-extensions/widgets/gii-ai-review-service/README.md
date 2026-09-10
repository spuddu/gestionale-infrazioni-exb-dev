# GII AI Review Service

Endpoint HTTP per la revisione redazionale del campo `descrizione_fatti` del Gestionale Infrazioni Irrigue.

## Sicurezza
- Il browser non contiene chiavi Azure OpenAI.
- Il widget invia il token ArcGIS dell'utente nel bearer header.
- Il servizio valida il token con ArcGIS Online e, se configurato, limita l'accesso all'`ARCGIS_ALLOWED_ORG_ID`.
- In produzione usare preferibilmente Managed Identity per accedere ad Azure OpenAI. `AZURE_OPENAI_API_KEY` è solo un fallback.
- Configurare CORS sull'Azure Function per il dominio dell'app Experience Builder.

## Variabili applicative
- `AZURE_OPENAI_ENDPOINT`: endpoint della risorsa Azure OpenAI / Microsoft Foundry.
- `AZURE_OPENAI_DEPLOYMENT`: nome del deployment del modello (configurabile, non hardcoded).
- `AZURE_OPENAI_API_KEY`: opzionale; lasciare vuoto con Managed Identity.
- `ARCGIS_PORTAL_URL`: normalmente `https://www.arcgis.com`.
- `ARCGIS_ALLOWED_ORG_ID`: ID dell'organizzazione ArcGIS Online CBSM; consigliato in produzione.

## Endpoint
`POST /api/revise-facts`

Body:
```json
{
  "text": "testo scritto dall'IT",
  "field": "descrizione_fatti"
}
```

Header:
`Authorization: Bearer <token ArcGIS>`

Il servizio usa Structured Outputs e un controllo deterministico di numeri/date/codici/unità. Se rileva una possibile variazione fattuale, restituisce il testo originale e imposta `factualChangesDetected=true`.
