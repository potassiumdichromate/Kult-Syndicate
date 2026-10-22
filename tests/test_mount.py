import http.client,json,sys,tempfile,threading,time,unittest,uuid
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
from app import Game,create_server,Problem
class MountTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.game=Game(self.tmp.name,demo=True,delay=0);self.server=create_server(self.game,port=0,base_path='/world/syndicates');self.thread=threading.Thread(target=self.server.serve_forever,daemon=True);self.thread.start()
 def tearDown(self):self.server.shutdown();self.server.server_close();self.thread.join();self.tmp.cleanup()
 def request(self,path,body=None,headers=None):
  c=http.client.HTTPConnection('127.0.0.1',self.server.server_port,timeout=3);h={'Content-Type':'application/json',**(headers or {})};c.request('GET' if body is None else 'POST',path,None if body is None else json.dumps(body),h);r=c.getresponse();out=(r.status,dict(r.getheaders()),r.read());c.close();return out
 def test_isolated_paths_and_redirect(self):
  status,h,body=self.request('/world/syndicates?embed=1');self.assertEqual(status,308);self.assertEqual(h['Location'],'/world/syndicates/?embed=1')
  for route in ['/api/state','/api/health','/app.js','/world/syndicates-other/api/health']:self.assertEqual(self.request(route)[0],404)
  for route in ['','app.js','district3d.js','world-ui.js','district-ux.css','vendor/three.module.js','godot/index.js','godot-bridge.js']:self.assertEqual(self.request('/world/syndicates/'+route)[0],200)
 def test_cookie_scope_and_mission(self):
  status,h,b=self.request('/world/syndicates/api/session',{});self.assertEqual(status,200);self.assertIn('Path=/world/syndicates;',h['Set-Cookie']);s=json.loads(b);headers={'Cookie':h['Set-Cookie'].split(';')[0],'X-CSRF-Token':s['csrf']}
  def post(path,body):
   status,h,b=self.request('/world/syndicates/api/'+path,body,{**headers,'X-Request-ID':str(uuid.uuid4())});self.assertEqual(status,200);return json.loads(b)
  mid=post('missions',{'kind':'scout'})['missionId']
  first=self.game.state(s['token'])['mission']['stage']['text'];choices=['roof' if 'sweeping' in first else 'stairs','verify','qualified']
  for step,ch in enumerate(choices):post(f'missions/{mid}/choice',{'step':step,'choice':ch})
  receipt=post(f'missions/{mid}/resolve',{})['receipt'];self.assertEqual(receipt['outcome'],'SUCCESS');self.assertTrue(post('verify',{'receipt':receipt})['valid'])
 def test_reject_invalid_mount(self):
  for path in ['/../api','//api','/foo?bar','https://host/']:
   with self.assertRaises(Problem):create_server(self.game,port=0,base_path=path)

 def test_rate_limit_isolated_between_authenticated_agents(self):
  first=self.game.login({});second=self.game.login({})
  self.server.limits['agent:'+first['agent']['id']].extend([time.time()]*240)
  self.assertEqual(self.request('/world/syndicates/api/state',headers={'Cookie':'syndicates_session='+first['token']})[0],429)
  self.assertEqual(self.request('/world/syndicates/api/state',headers={'Cookie':'syndicates_session='+second['token']})[0],200)
  self.server.limits['ip:127.0.0.1'].extend([time.time()]*240)
  self.assertEqual(self.request('/world/syndicates/api/state',headers={'Cookie':'syndicates_session=invalid'})[0],429)
  self.assertEqual(self.request('/world/syndicates/district3d.js')[0],200)
