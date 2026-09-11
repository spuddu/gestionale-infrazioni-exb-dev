"""Azure Functions Python v2. Compatibile con il componente AI di widgets_120."""
import json
import logging
import re
import time
import uuid
import azure.functions as func
from review_logic import MAX_TEXT, review_text, utf16_length
from service import Settings, ServiceError, Limits, authenticate, make_complete, fail, remaining

app = func.FunctionApp(http_auth_level=func.AuthLevel.ANONYMOUS)
limits = Limits()


def reply(payload, status=200, origin=None, request_id=None, preflight=False):
    headers = {'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'}
    if request_id:
        headers['X-Request-Id'] = request_id
    if origin:
        headers.update({'Access-Control-Allow-Origin': origin, 'Vary': 'Origin'})
    if preflight:
        headers.update({'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Authorization, Content-Type'})
    return func.HttpResponse('' if status == 204 else json.dumps(payload, ensure_ascii=False),
                             status_code=status, mimetype='application/json', charset='utf-8', headers=headers)


def handle_review(req, settings=None, auth=authenticate, complete_factory=make_complete, limiter=None):
    request_id = str(uuid.uuid4())
    start = time.monotonic()
    allowed_origin = None
    status = 500
    deadline = None
    limiter = limits if limiter is None else limiter
    try:
        settings = Settings.from_env() if settings is None else settings
        deadline = start + settings.timeout
        origin = req.headers.get('Origin', '')
        if origin not in settings.origins:
            fail(403, 'ORIGIN', 'Origine non autorizzata.')
        allowed_origin = origin
        if req.method == 'OPTIONS':
            if req.headers.get('Access-Control-Request-Method', '') != 'POST':
                fail(405, 'METHOD', 'Metodo non consentito.')
            status = 204
            return reply(None, status, origin, request_id, preflight=True)
        if req.method != 'POST':
            fail(405, 'METHOD', 'Metodo non consentito.')
        match = re.fullmatch(r'Bearer ([^\s]+)', req.headers.get('Authorization', ''), re.I)
        token = match[1] if match else ''
        if not token or len(token) > 8192:
            fail(401, 'TOKEN', 'Sessione ArcGIS richiesta.')
        if not re.match(r'application/json(?:\s*;|$)', req.headers.get('Content-Type', ''), re.I):
            fail(415, 'CONTENT_TYPE', 'Formato richiesta non supportato.')
        body = req.get_body()
        if len(body) > 50000:
            fail(413, 'SIZE', 'Testo troppo lungo.')
        try:
            payload = json.loads(body)
        except (ValueError, UnicodeError):
            fail(400, 'JSON', 'Richiesta non valida.')
        if not isinstance(payload, dict) or set(payload) != {'testo'} or not isinstance(payload['testo'], str):
            fail(400, 'TEXT', f'Inserire un testo da 1 a {MAX_TEXT} caratteri.')
        original = payload['testo']
        try:
            valid_text = bool(original.strip()) and utf16_length(original) <= MAX_TEXT
        except UnicodeError:
            valid_text = False
        if not valid_text:
            fail(400, 'TEXT', f'Inserire un testo da 1 a {MAX_TEXT} caratteri.')
        with limiter.slot(settings.max_concurrent):
            username = auth(settings, token, origin, deadline)
            remaining(deadline)
            with limiter.user(username, settings.max_per_hour):
                result = review_text(original, complete_factory(settings, deadline))
                remaining(deadline)
        status = 200
        return reply({**result, 'request_id': request_id}, status, origin, request_id)
    except ServiceError as exc:
        status = exc.status
        return reply({'error': exc.code, 'message': exc.message, 'request_id': request_id}, status, allowed_origin, request_id)
    except Exception:
        status = 504 if deadline is not None and time.monotonic() >= deadline else 502
        return reply({'error': 'SERVICE', 'message': 'Revisione non disponibile. Il testo originale è stato mantenuto.', 'request_id': request_id}, status, allowed_origin, request_id)
    finally:
        # Nessun testo, token, nominativo o eccezione del provider nei log applicativi.
        logging.info('gii_ai_review request_id=%s status=%s duration_ms=%s', request_id, status, round((time.monotonic() - start) * 1000))


@app.route(route='review', methods=['POST', 'OPTIONS'])
def review(req: func.HttpRequest) -> func.HttpResponse:
    return handle_review(req)


@app.route(route='health', methods=['GET'])
def health(req: func.HttpRequest) -> func.HttpResponse:
    try:
        Settings.from_env()
    except Exception:
        return reply({'ok': False, 'service': 'gii-ai-review', 'version': '02', 'configured': False}, 503)
    return reply({'ok': True, 'service': 'gii-ai-review', 'version': '02', 'configured': True})
