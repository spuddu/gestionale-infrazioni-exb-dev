import json
import os
import re
import urllib.parse
import urllib.request
from collections import Counter
from typing import List

import azure.functions as func
from azure.identity import DefaultAzureCredential, get_bearer_token_provider
from openai import OpenAI
from pydantic import BaseModel, Field

app = func.FunctionApp(http_auth_level=func.AuthLevel.ANONYMOUS)


class ModelReview(BaseModel):
    revised_text: str = Field(description="Testo revisionato. Se la revisione non è sicura, restituisci il testo originale invariato.")
    factual_changes_detected: bool
    factual_changes: List[str]
    ambiguities: List[str]


SYSTEM_PROMPT = """Sei un assistente di revisione redazionale per un procedimento amministrativo del Consorzio di Bonifica della Sardegna Meridionale.
Il tuo compito è migliorare ESCLUSIVAMENTE grammatica, sintassi, punteggiatura, chiarezza e stile tecnico-amministrativo del testo fornito dall'Istruttore tecnico.

VINCOLI ASSOLUTI:
- Non aggiungere fatti, circostanze, cause, conseguenze o interpretazioni non presenti nel testo originale.
- Non eliminare fatti o circostanze presenti nel testo originale.
- Non modificare soggetti, nomi, date, orari, luoghi, numeri, superfici, quantità, importi, unità di misura, matricole, codici, numeri di articolo, opere, attrezzature o modalità operative.
- Non trasformare un'ipotesi in una certezza e non dedurre ciò che il tecnico non ha scritto.
- Se una frase è ambigua, mantieni il contenuto sostanziale e segnala l'ambiguità senza inventare una soluzione.
- Puoi riordinare le frasi solo quando ciò non altera sequenza, nesso causale o significato dei fatti.
- Non inserire formule giuridiche, qualificazioni normative o violazioni ulteriori.
- Mantieni la lingua italiana e uno stile sobrio, chiaro e tecnico-amministrativo.

CONTROLLO:
Confronta il testo originale e quello revisionato. Se rilevi anche solo una possibile variazione sostanziale, imposta factual_changes_detected=true, descrivila in factual_changes e restituisci in revised_text il testo originale invariato.
Se il testo originale contiene ambiguità che non puoi risolvere senza interpretare, riportale in ambiguities.
"""


def _json_response(payload, status=200):
    return func.HttpResponse(
        json.dumps(payload, ensure_ascii=False),
        status_code=status,
        mimetype="application/json",
        charset="utf-8",
    )


def _validate_arcgis_token(token: str):
    portal = os.getenv("ARCGIS_PORTAL_URL", "https://www.arcgis.com").rstrip("/")
    qs = urllib.parse.urlencode({"f": "json", "token": token})
    url = f"{portal}/sharing/rest/community/self?{qs}"
    req = urllib.request.Request(url, headers={"User-Agent": "CBSM-GII-AI-Review/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except Exception:
        return None
    if data.get("error") or not data.get("username"):
        return None
    allowed_org = os.getenv("ARCGIS_ALLOWED_ORG_ID", "").strip()
    if allowed_org and str(data.get("orgId") or "").strip() != allowed_org:
        return None
    return {"username": str(data.get("username")), "orgId": str(data.get("orgId") or "")}


def _extract_protected_tokens(text: str):
    patterns = [
        r"\b(?:Art\.?|art\.?)\s*\d+(?:\.\d+)?\b",
        r"\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b",
        r"\b\d{1,2}:\d{2}(?::\d{2})?\b",
        r"\b\d+(?:[.,]\d+){2}\b",
        r"\b[A-Za-zÀ-ÖØ-öø-ÿ]*\d+[A-Za-z0-9._/-]*\b",
        r"\b\d+(?:[.,]\d+)?\s*(?:ha\.a\.ca|ha|mq|m²|m3|m³|€|euro|mm|cm|m|km|l/s)\b",
    ]
    out = []
    for pattern in patterns:
        out.extend(m.group(0).strip().lower() for m in re.finditer(pattern, text, flags=re.IGNORECASE))
    return Counter(out)


def _protected_token_differences(original: str, revised: str):
    a = _extract_protected_tokens(original)
    b = _extract_protected_tokens(revised)
    diffs = []
    for token in sorted(set(a) | set(b)):
        if a[token] != b[token]:
            diffs.append(f"{token}: originale {a[token]}, revisionato {b[token]}")
    return diffs


def _openai_client():
    endpoint = os.getenv("AZURE_OPENAI_ENDPOINT", "").strip().rstrip("/")
    if not endpoint:
        raise RuntimeError("AZURE_OPENAI_ENDPOINT non configurato")
    if not endpoint.endswith("/openai/v1"):
        endpoint = f"{endpoint}/openai/v1"
    api_key = os.getenv("AZURE_OPENAI_API_KEY", "").strip()
    if api_key:
        return OpenAI(base_url=f"{endpoint}/", api_key=api_key)
    token_provider = get_bearer_token_provider(DefaultAzureCredential(), "https://ai.azure.com/.default")
    return OpenAI(base_url=f"{endpoint}/", api_key=token_provider)


@app.route(route="revise-facts", methods=["POST"])
def revise_facts(req: func.HttpRequest) -> func.HttpResponse:
    auth = req.headers.get("Authorization", "")
    token = auth[7:].strip() if auth.lower().startswith("bearer ") else ""
    if not token or not _validate_arcgis_token(token):
        return _json_response({"error": "Autenticazione ArcGIS non valida."}, 401)

    try:
        body = req.get_json()
    except Exception:
        return _json_response({"error": "Payload JSON non valido."}, 400)

    text = str((body or {}).get("text") or "").strip()
    if not text:
        return _json_response({"error": "Testo da revisionare mancante."}, 400)
    if len(text) > 12000:
        return _json_response({"error": "Testo troppo lungo per la revisione redazionale."}, 413)

    deployment = os.getenv("AZURE_OPENAI_DEPLOYMENT", "").strip()
    if not deployment:
        return _json_response({"error": "AZURE_OPENAI_DEPLOYMENT non configurato."}, 500)

    try:
        client = _openai_client()
        result = client.responses.parse(
            model=deployment,
            input=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"TESTO ORIGINALE:\n{text}"},
            ],
            text_format=ModelReview,
        ).output_parsed
        if result is None:
            raise RuntimeError("Risposta strutturata non disponibile")

        revised = str(result.revised_text or "").strip() or text
        token_diffs = _protected_token_differences(text, revised)
        detected = bool(result.factual_changes_detected or token_diffs)
        factual_changes = list(result.factual_changes or [])
        if token_diffs:
            factual_changes.append("Il controllo deterministico ha rilevato differenze in numeri, date, codici o unità protette.")
        if detected:
            revised = text

        return _json_response({
            "revisedText": revised,
            "factualChangesDetected": detected,
            "factualChanges": factual_changes,
            "ambiguities": list(result.ambiguities or []),
            "protectedTokenDifferences": token_diffs,
        })
    except Exception as exc:
        # Non includere il testo sorgente nei log o nella risposta.
        return _json_response({"error": f"Servizio di revisione non disponibile: {type(exc).__name__}."}, 502)
