import json
import time
import unittest
from dataclasses import replace
from types import SimpleNamespace
from unittest.mock import patch
import azure.functions as func
import httpx
from openai import OpenAI
from pydantic import ValidationError
from function_app import app, handle_review, health
from review_logic import CATEGORIES, Revision, Verification, protected_tokens, review_text, utf16_length
from service import Settings, ServiceError, Limits, authenticate, make_complete, remaining

ORIGINAL = 'Trovato prelievo il 06/09/2026 alle 13:49. Superficie 1.50.00 ha.a.ca, idrante X-12.'
REVISED = 'È stato riscontrato un prelievo il 06/09/2026 alle 13:49. Superficie 1.50.00 ha.a.ca, idrante X-12.'
CONFIG = Settings('https://test.openai.azure.com', 'test', 'verify', 'mock-key', 'https://cbsm-hub.maps.arcgis.com', 'CBSM',
                  'https://services2.arcgis.com/org/arcgis/rest/services/GII_utenti/FeatureServer/0', ('https://gii.test',))


def checks():
    return {k: {'esito': 'invariato', 'dettaglio': 'Nessuna variazione rilevata.'} for k in CATEGORIES}


def complete(revised=REVISED, ambiguous=None, changed=None):
    def call(prompt, payload, schema, name):
        return {'testo_revisionato': revised, 'ambiguita': ambiguous or []} if name == 'revisione' else {**checks(), **(changed or {})}
    return call


def request(payload=None, headers=None, method='POST', body=None):
    h = {'Origin': 'https://gii.test', 'Authorization': 'Bearer mock-token', 'Content-Type': 'application/json'}
    h.update(headers or {})
    return func.HttpRequest(method, 'https://functions.test/api/review', headers=h, params={},
                            body=body if body is not None else json.dumps({'testo': ORIGINAL} if payload is None else payload).encode())


def run(req, cfg=CONFIG, fn=None, auth=None, limiter=None):
    return handle_review(req, settings=cfg, auth=auth or (lambda *_: 'it'),
                         complete_factory=lambda *_: fn or complete(), limiter=limiter or Limits())


class ReviewTests(unittest.TestCase):
    def test_formal_revision_two_calls(self):
        calls = []
        fn = complete()
        def record(*args):
            calls.append(args)
            return fn(*args)
        result = review_text(ORIGINAL, record)
        self.assertTrue(result['accettabile'])
        self.assertEqual(len(calls), 2)
        self.assertEqual(calls[0][1], {'testo_originale': ORIGINAL})
        self.assertEqual(calls[1][1], {'originale': ORIGINAL, 'revisione': REVISED})

    def test_surface(self): self.assert_blocked(REVISED.replace('1.50.00', '1.05.00'))
    def test_date(self): self.assert_blocked(REVISED.replace('06/09', '07/09'))
    def test_time(self): self.assert_blocked(REVISED.replace('13:49', '13:40'))
    def test_code(self): self.assert_blocked(REVISED.replace('X-12', 'Y-12'))
    def test_units(self): self.assert_blocked(REVISED.replace('ha.a.ca', 'mq'))
    def test_omission(self): self.assert_blocked(REVISED.replace('1.50.00 ha.a.ca', ''))
    def test_duplicates(self): self.assert_blocked(REVISED + ' 1.50.00 ha.a.ca')
    def assert_blocked(self, revised):
        result = review_text(ORIGINAL, complete(revised))
        self.assertFalse(result['elementi_protetti_invariati'])
        self.assertFalse(result['accettabile'])

    def test_signed_numbers(self):
        for sign in ('-', '−', '+'):
            self.assertNotEqual(protected_tokens(f'Quota {sign}10 m'), protected_tokens('Quota 10 m'))
    def test_superscripts(self): self.assertNotEqual(protected_tokens('10 m²'), protected_tokens('10 m'))
    def test_preposition_a(self): self.assertEqual(protected_tokens('Era a prelevare acqua'), protected_tokens('Stava prelevando acqua'))
    def test_swapped_attribution(self):
        a, b = 'Idrante 1 chiuso, idrante 2 aperto.', 'Idrante 2 chiuso, idrante 1 aperto.'
        self.assertEqual(protected_tokens(a), protected_tokens(b))
        self.assertFalse(review_text(a, complete(b, changed={'circostanze': {'esito': 'variato', 'dettaglio': 'Attribuzione scambiata.'}}))['accettabile'])
    def test_ambiguous(self): self.assertFalse(review_text(ORIGINAL, complete(ambiguous=['Soggetto incerto']))['accettabile'])
    def test_uncertain(self): self.assertFalse(review_text(ORIGINAL, complete(changed={'soggetti': {'esito': 'incerto', 'dettaglio': 'Dubbio'}}))['accettabile'])
    def test_schema_missing(self):
        with self.assertRaises(ValidationError): review_text(ORIGINAL, lambda *_: {})
    def test_schema_extra(self):
        with self.assertRaises(ValidationError): Revision.model_validate({'testo_revisionato': REVISED, 'ambiguita': [], 'extra': True})
    def test_blank_output(self):
        with self.assertRaises(ValueError): review_text(ORIGINAL, complete(' '))
    def test_utf16(self):
        self.assertEqual(utf16_length('😀'), 2)
        with self.assertRaises(ValueError): review_text(ORIGINAL, complete('😀' * 4001))
    def test_incomplete_verifier(self):
        with self.assertRaises(ValidationError): review_text(ORIGINAL, lambda _p, _i, _s, name: {'testo_revisionato': REVISED, 'ambiguita': []} if name == 'revisione' else {})


class AuthTests(unittest.TestCase):
    def auth(self, user=None, features=None, portal_id='CBSM'):
        calls = []
        def api(url, params, token, origin, deadline, get=False):
            calls.append((url, params, token, get))
            return {'id': portal_id, 'user': user} if len(calls) == 1 else {'features': features or []}
        result = authenticate(CONFIG, 'mock-token', CONFIG.origins[0], time.monotonic()+120, api)
        return result, calls
    def test_identity_and_sql(self):
        user = {'username': "IT'O", 'orgId': 'CBSM'}
        result, calls = self.auth(user, [{'attributes': {'username': "IT'O", 'ruolo_cod': 'IT', 'tipo_record': None}}])
        self.assertEqual(result, "it'o")
        self.assertIn("it''o", calls[1][1]['where'])
        self.assertTrue(calls[0][3])
        self.assertTrue(all('mock-token' not in c[0] for c in calls))
    def test_anonymous(self):
        with self.assertRaises(ServiceError): self.auth()
    def test_external_org(self):
        with self.assertRaises(ServiceError): self.auth({'username':'it', 'orgId':'OTHER'})
    def test_disabled(self):
        with self.assertRaises(ServiceError): self.auth({'username':'it', 'orgId':'CBSM', 'disabled':True})
    def test_not_registered(self):
        with self.assertRaises(ServiceError): self.auth({'username':'it', 'orgId':'CBSM'})
    def test_tr(self):
        with self.assertRaises(ServiceError): self.auth({'username':'it', 'orgId':'CBSM'}, [{'attributes': {'username':'it','ruolo_cod':'TR'}}])
    def test_rubrica(self):
        with self.assertRaises(ServiceError): self.auth({'username':'it','orgId':'CBSM'}, [{'attributes':{'username':'it','ruolo_cod':'IT','tipo_record':'RUBRICA'}}])
    def test_legacy_ti(self):
        result, _ = self.auth({'username':'it','orgId':'CBSM'}, [{'attributes':{'username':'it','ruolo_cod':'TI','tipo_record':None}}])
        self.assertEqual(result,'it')


class HttpTests(unittest.TestCase):
    def test_success_contract(self):
        r = run(request())
        self.assertEqual(r.status_code, 200)
        data = json.loads(r.get_body())
        self.assertEqual(data['originale'], ORIGINAL)
        self.assertEqual(data['version'], 1)
        self.assertTrue(data['accettabile'])
        self.assertIn('request_id', data)
        self.assertEqual(r.headers['Access-Control-Allow-Origin'], CONFIG.origins[0])
        self.assertEqual(r.headers['Cache-Control'], 'no-store')
    def test_bad_origin(self): self.assertEqual(run(request(headers={'Origin':'https://other.test'})).status_code,403)
    def test_no_token(self): self.assertEqual(run(request(headers={'Authorization':''})).status_code,401)
    def test_wrong_media(self): self.assertEqual(run(request(headers={'Content-Type':'text/plain'})).status_code,415)
    def test_extra_field(self): self.assertEqual(run(request({'testo': ORIGINAL, 'username':'admin'})).status_code,400)
    def test_empty(self): self.assertEqual(run(request({'testo':' '})).status_code,400)
    def test_large_text(self): self.assertEqual(run(request({'testo':'x'*8001})).status_code,400)
    def test_large_body(self): self.assertEqual(run(request(body=b'x'*50001)).status_code,413)
    def test_invalid_json(self): self.assertEqual(run(request(body=b'{')).status_code,400)
    def test_preflight(self):
        r = run(request(method='OPTIONS',headers={'Access-Control-Request-Method':'POST'}))
        self.assertEqual(r.status_code,204)
        self.assertEqual(r.headers['Access-Control-Allow-Headers'],'Authorization, Content-Type')
    def test_blocked_proposal(self):
        r = run(request(),fn=complete(ambiguous=['Dubbio']))
        self.assertEqual(r.status_code,200)
        self.assertFalse(json.loads(r.get_body())['accettabile'])
    def test_expired_no_model(self):
        def auth(*_): raise ServiceError(401,'EXPIRED','Sessione scaduta')
        with patch('function_app.review_text') as model:
            self.assertEqual(run(request(),auth=auth).status_code,401)
            model.assert_not_called()
    def test_provider_failure_redacted(self):
        def failure(*_): raise RuntimeError('mock-secret and original text')
        r = run(request(),fn=failure)
        self.assertEqual(r.status_code,502)
        self.assertNotIn('mock-secret',r.get_body().decode())
        self.assertNotIn(ORIGINAL,r.get_body().decode())
    def test_budget(self):
        limiter=Limits();config=replace(CONFIG,max_per_hour=1)
        self.assertEqual(run(request(),cfg=config,limiter=limiter).status_code,200)
        self.assertEqual(run(request(),cfg=config,limiter=limiter).status_code,429)
    def test_concurrency_and_cleanup(self):
        limiter=Limits()
        with limiter.slot(1):
            with self.assertRaises(ServiceError):
                with limiter.slot(1): pass
        self.assertEqual(limiter.active,0)
        with self.assertRaises(RuntimeError):
            with limiter.user('it',20): raise RuntimeError()
        self.assertFalse(limiter.users['it']['active'])
    def test_deadline(self):
        self.assertEqual(run(request(),cfg=replace(CONFIG,timeout=-1)).status_code,504)
    def test_registered_routes(self):
        names = {f.get_function_name() for f in app.get_functions()}
        self.assertEqual(names, {'review','health'})


class SdkTests(unittest.TestCase):
    def test_actual_sdk_structured_response(self):
        requests=[]
        def provider(req):
            body=json.loads(req.content);requests.append(body)
            value = {'testo_revisionato':REVISED,'ambiguita':[]} if len(requests)==1 else checks()
            return httpx.Response(200,json={'id':'resp_test','object':'response','created_at':0,'model':'test','status':'completed',
                'output':[{'id':'msg_test','type':'message','role':'assistant','status':'completed',
                           'content':[{'type':'output_text','text':json.dumps(value),'annotations':[]}]}],
                'parallel_tool_calls':False,'tool_choice':'auto','tools':[]})
        client=OpenAI(api_key='mock-key',base_url=CONFIG.endpoint+'/openai/v1/',max_retries=0,http_client=httpx.Client(transport=httpx.MockTransport(provider)))
        try:
            result=review_text(ORIGINAL,make_complete(CONFIG,time.monotonic()+120,client))
            self.assertTrue(result['accettabile'])
            self.assertEqual(len(requests),2)
            self.assertEqual([r['model'] for r in requests],['test','verify'])
            for r in requests:
                self.assertFalse(r['store'])
                self.assertTrue(r['text']['format']['strict'])
        finally: client.close()
    def test_refusal_or_incomplete(self):
        for status,parsed in [('incomplete',None),('completed',None)]:
            client=SimpleNamespace(responses=SimpleNamespace(parse=lambda **_:SimpleNamespace(status=status,output_parsed=parsed)))
            with self.assertRaises(ValueError): make_complete(CONFIG,time.monotonic()+120,client)('p',{},Revision,'revisione')
    def test_config_required(self):
        with self.assertRaises(ValueError): Settings.from_env({})
    def test_health_not_inference(self):
        with patch('function_app.Settings.from_env',return_value=CONFIG):
            self.assertEqual(health(request(method='GET')).status_code,200)
        with patch('function_app.Settings.from_env',side_effect=ValueError()):
            self.assertEqual(health(request(method='GET')).status_code,503)


if __name__ == '__main__': unittest.main()
