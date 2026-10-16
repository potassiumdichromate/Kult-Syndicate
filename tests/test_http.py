import http.client,json,sys,tempfile,threading,unittest,uuid
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
from app import Game,create_server
class HTTPTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.g=Game(self.tmp.name,demo=True,delay=0);self.server=create_server(self.g,port=0);self.thread=threading.Thread(target=self.server.serve_forever,daemon=True);self.thread.start();self.cookie='';self.csrf=''
 def tearDown(self):self.server.shutdown();self.server.server_close();self.thread.join();self.tmp.cleanup()
 def call(self,path,body=None,headers=None):
  c=http.client.HTTPConnection('127.0.0.1',self.server.server_port,timeout=3);h={'Content-Type':'application/json','Cookie':self.cookie,'X-CSRF-Token':self.csrf,'X-Request-ID':str(uuid.uuid4())};h.update(headers or {})
  c.request('GET' if body is None else 'POST',path,body=None if body is None else json.dumps(body),headers=h);r=c.getresponse();data=r.read();status=r.status
  cookie=r.getheader('Set-Cookie');
  if cookie:self.cookie=cookie.split(';')[0]
  out=json.loads(data) if 'application/json' in r.getheader('Content-Type','') else data
  if isinstance(out,dict) and 'csrf' in out:self.csrf=out['csrf']
  c.close();return status,out
 def test_http_full_loop_and_restart_cookie(self):
  self.assertEqual(self.call('/api/session',{})[0],200);status,state=self.call('/api/state');self.assertEqual(status,200);aid=state['agent']['id']
  status,r=self.call('/api/missions',{'kind':'scout'});self.assertEqual(status,200);mid=r['missionId']
  for i,ch in enumerate(['roof','verify','qualified']):self.assertEqual(self.call(f'/api/missions/{mid}/choice',{'step':i,'choice':ch})[0],200)
  status,r=self.call(f'/api/missions/{mid}/resolve',{});self.assertEqual(status,200);self.assertEqual(r['receipt']['outcome'],'SUCCESS')
  self.assertEqual(self.call('/api/verify',{'receipt':r['receipt']})[1]['valid'],True);self.assertEqual(self.call('/api/state')[1]['agent']['id'],aid)
  self.assertEqual(self.call('/api/receipts/'+r['receipt']['id'])[0],200)
 def test_origin_and_forgery_boundaries(self):
  self.call('/api/session',{})
  self.assertEqual(self.call('/api/resupply',{},headers={'Origin':'https://evil.invalid'})[0],403)
  self.assertEqual(self.call('/api/missions',{'kind':'scout','outcome':'win'})[0],400)
  self.assertEqual(self.call('/api/a2a/experience',{'outcome':'win'})[0],404)
 def test_static_no_traversal_or_secrets(self):
  self.assertEqual(self.call('/')[0],200);self.assertEqual(self.call('/../server/app.py')[0],404);self.assertEqual(self.call('/data/receipt-key.pem')[0],404)
 def test_auth_required(self):self.assertEqual(self.call('/api/state')[0],401)
if __name__=='__main__':unittest.main()
