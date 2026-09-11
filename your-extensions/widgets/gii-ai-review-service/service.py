"""Servizio Python per Azure Functions. Autorizzazione, limiti e chiamate Azure."""
import json
import os
import threading
import time
import urllib.parse
import urllib.request
from contextlib import contextmanager
from dataclasses import dataclass
from functools import lru_cache
from azure.identity import DefaultAzureCredential, get_bearer_token_provider
from openai import OpenAI


class ServiceError(Exception):
    def __init__(self, status, code, message):
        super().__init__(message)
        self.status, self.code, self.message = status, code, message


def fail(status, code, message):
    raise ServiceError(status, code, message)


def remaining(deadline):
    value = deadline - time.monotonic()
    if value <= 0:
        fail(504, 'TIMEOUT', 'Tempo di attesa scaduto. Il testo originale è stato mantenuto.')
    return value


def https_url(value, key):
    value = str(value or '').strip().rstrip('/')
    u = urllib.parse.urlsplit(value)
    if u.scheme != 'https' or not u.hostname or u.username or u.password or u.query or u.fragment:
        raise ValueError(f'Configurazione non valida: {key}')
    return value


@dataclass(frozen=True)
class Settings:
    endpoint: str
    deployment: str
    verify_deployment: str
    api_key: str
    portal: str
    org_id: str
    users_layer: str
    origins: tuple[str, ...]
    max_per_hour: int = 20
    max_concurrent: int = 4
    timeout: float = 120

    @classmethod
    def from_env(cls, env=None):
        env = os.environ if env is None else env
        for key in ('AZURE_OPENAI_ENDPOINT', 'AZURE_OPENAI_DEPLOYMENT', 'ARCGIS_ALLOWED_ORG_ID', 'ARCGIS_USERS_LAYER_URL', 'ALLOWED_ORIGINS'):
            if not str(env.get(key) or '').strip():
                raise ValueError(f'Configurare {key}')
        endpoint = https_url(env['AZURE_OPENAI_ENDPOINT'], 'AZURE_OPENAI_ENDPOINT')
        if endpoint.endswith('/openai/v1'):
            endpoint = endpoint[:-len('/openai/v1')]
        if urllib.parse.urlsplit(endpoint).path:
            raise ValueError('AZURE_OPENAI_ENDPOINT deve essere la radice della risorsa')
        origins = tuple(s.strip() for s in env['ALLOWED_ORIGINS'].split(','))
        for origin in origins:
            u = urllib.parse.urlsplit(origin)
            if (u.scheme not in ('http', 'https') or not u.hostname or u.username or u.password
                    or u.path or u.query or u.fragment
                    or (u.scheme == 'http' and u.hostname not in ('localhost', '127.0.0.1'))):
                raise ValueError('ALLOWED_ORIGINS: usare origini esatte senza percorsi o wildcard')
        users_layer = https_url(env['ARCGIS_USERS_LAYER_URL'], 'ARCGIS_USERS_LAYER_URL')
        import re
        if not re.search(r'/FeatureServer/\d+$', users_layer, re.I):
            raise ValueError('ARCGIS_USERS_LAYER_URL deve includere /FeatureServer/indice')
        return cls(endpoint=endpoint, deployment=env['AZURE_OPENAI_DEPLOYMENT'].strip(),
                   verify_deployment=env.get('AZURE_OPENAI_VERIFY_DEPLOYMENT', '').strip() or env['AZURE_OPENAI_DEPLOYMENT'].strip(),
                   api_key=env.get('AZURE_OPENAI_API_KEY', '').strip(),
                   portal=https_url(env.get('ARCGIS_PORTAL_URL', 'https://cbsm-hub.maps.arcgis.com'), 'ARCGIS_PORTAL_URL'),
                   org_id=env['ARCGIS_ALLOWED_ORG_ID'].strip(), users_layer=users_layer, origins=origins)


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise ValueError('UPSTREAM_REDIRECT')


def read_arcgis(url, params, token, origin, deadline, get=False):
    headers = {'X-Esri-Authorization': f'Bearer {token}', 'Referer': f'{origin}/', 'Content-Type': 'application/x-www-form-urlencoded'}
    body = None if get else urllib.parse.urlencode({'f': 'json', **params}).encode('utf-8')
    request = urllib.request.Request(url, data=body, headers=headers, method='GET' if get else 'POST')
    opener = urllib.request.build_opener(NoRedirect())
    with opener.open(request, timeout=min(10, remaining(deadline))) as response:
        data = response.read(160001)
    if len(data) > 160000:
        raise ValueError('UPSTREAM_SIZE')
    result = json.loads(data)
    if result.get('error'):
        fail(401, 'AGOL_AUTH', 'Sessione ArcGIS non valida o autorizzazioni insufficienti.')
    return result


def authenticate(settings, token, origin, deadline, request=read_arcgis):
    portal = request(f'{settings.portal}/sharing/rest/portals/self?f=json', {}, token, origin, deadline, get=True)
    user = portal.get('user') or {}
    if portal.get('id') != settings.org_id or user.get('orgId') != settings.org_id or not user.get('username') or user.get('disabled') is True:
        fail(403, 'AGOL_ORG', 'Account non abilitato al servizio CBSM.')
    username = user['username']
    quoted = username.lower().replace("'", "''")
    data = request(f'{settings.users_layer}/query', {
        'where': f"LOWER(username) = '{quoted}' AND (tipo_record IS NULL OR tipo_record = 'UTENTE') AND UPPER(ruolo_cod) IN ('IT','TI')",
        'outFields': 'username,ruolo_cod,tipo_record', 'returnGeometry': 'false', 'resultRecordCount': '1'
    }, token, origin, deadline)
    for feature in data.get('features', []):
        a = feature.get('attributes') or {}
        if (str(a.get('username') or '').lower() == username.lower()
                and str(a.get('ruolo_cod') or '').upper() in ('IT', 'TI')
                and a.get('tipo_record') in (None, 'UTENTE')):
            return username.lower()
    fail(403, 'GII_ROLE', 'La revisione è riservata agli istruttori tecnici registrati nel gestionale.')


@lru_cache(maxsize=1)
def azure_client(settings):
    key = settings.api_key
    if not key:
        credential = DefaultAzureCredential(exclude_interactive_browser_credential=True)
        key = get_bearer_token_provider(credential, 'https://ai.azure.com/.default')
    return OpenAI(base_url=f'{settings.endpoint}/openai/v1/', api_key=key, max_retries=0, timeout=settings.timeout)


def make_complete(settings, deadline, client=None):
    client = azure_client(settings) if client is None else client

    def complete(prompt, payload, schema, name):
        response = client.responses.parse(
            model=settings.verify_deployment if name == 'verifica' else settings.deployment,
            input=[{'role': 'system', 'content': prompt}, {'role': 'user', 'content': json.dumps(payload, ensure_ascii=False)}],
            text_format=schema, store=False, max_output_tokens=10000,
            timeout=remaining(deadline),
        )
        remaining(deadline)
        if response.status != 'completed' or response.output_parsed is None:
            raise ValueError('MODEL_OUTPUT')
        return response.output_parsed
    return complete


class Limits:
    """Limiti per processo, protetti anche con chiamate Functions in thread diversi."""
    def __init__(self):
        self.lock = threading.Lock()
        self.active = 0
        self.users = {}

    @contextmanager
    def slot(self, maximum):
        with self.lock:
            if self.active >= maximum:
                fail(429, 'BUSY', 'Servizio occupato. Riprova tra poco.')
            self.active += 1
        try:
            yield
        finally:
            with self.lock:
                self.active -= 1

    @contextmanager
    def user(self, username, maximum):
        now = time.monotonic()
        with self.lock:
            self.users = {k: v for k, v in self.users.items() if v['until'] > now or v['active']}
            budget = self.users.setdefault(username, {'count': 0, 'until': now + 3600, 'active': False})
            if budget['active'] or budget['count'] >= maximum:
                fail(429, 'LIMIT', 'Richiesta già in corso o limite orario raggiunto. Riprova più tardi.')
            budget['active'] = True
            budget['count'] += 1
        try:
            yield
        finally:
            with self.lock:
                budget['active'] = False
