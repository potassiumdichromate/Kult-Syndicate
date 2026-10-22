import hashlib,hmac,json,subprocess,sys,tempfile,time,unittest,uuid
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
from app import Game,b64,canonical
ROOT=Path(__file__).resolve().parents[1]
class AdapterTests(unittest.TestCase):
 def test_world_node_launch_python_game_receipt_node_import(self):
  secret='a'*40;callback='b'*40
  js="const a=require('./integration/world-adapter.cjs'); console.log(JSON.stringify(a.issueLaunch({ownerId:'ku-existing-owner',agent:{id:'arena-original',name:'ATHENA'},identityMode:'kult-gateway',secret:'"+secret+"',baseUrl:'http://localhost:8787/world/syndicates/'})))"
  result=json.loads(subprocess.check_output(['node','-e',js],cwd=ROOT))
  from urllib.parse import urlparse,parse_qs
  ticket=parse_qs(urlparse(result['launchUrl']).fragment)['launch'][0]
  with tempfile.TemporaryDirectory() as tmp:
   g=Game(tmp,demo=False,secret=secret,delay=0);s=g.login({'ticket':ticket})
   def cmd(path,body={}):return g.mutate(s['token'],s['csrf'],path,body,str(uuid.uuid4()))
   mid=cmd('/api/missions',{'kind':'scout'})['missionId']
   first=g.state(s['token'])['mission']['stage']['text']
   for i,c in enumerate(['roof' if 'sweeping' in first else 'stairs','verify','qualified']):cmd(f'/api/missions/{mid}/choice',{'step':i,'choice':c})
   r=cmd(f'/api/missions/{mid}/resolve')['receipt'];ts=str(int(time.time()));sig=hmac.new(callback.encode(),(ts+'\n'+hashlib.sha256(canonical(r)).hexdigest()).encode(),hashlib.sha256).hexdigest()
   js="""const fs=require('node:fs'),assert=require('node:assert/strict'),a=require('./integration/world-adapter.cjs');
const x=JSON.parse(fs.readFileSync(0,'utf8'));const r=a.verifyDelivery(x.receipt,x.headers,x.config);let owner={agent:{id:'arena-original',missionWins:9}};
assert.equal(a.ingestIntoOwner(owner,r).duplicate,false);assert.equal(a.ingestIntoOwner(owner,r).duplicate,true);assert.equal(owner.agent.missionWins,9);assert.equal(a.passportSummary(owner.agent).length,1);
assert.throws(()=>a.ingestIntoOwner({agent:{id:'wrong-agent'}},r));assert.throws(()=>a.verifyDelivery({...r,outcome:'MISS'},x.headers,x.config));console.log('World launch → existing Agent → mission → signed delivery → deduplicated Passport: PASS');"""
   output=subprocess.check_output(['node','-e',js],input=json.dumps(dict(receipt=r,headers={'x-syndicates-timestamp':ts,'x-syndicates-signature':sig},config=dict(secret=callback,publicKey=b64(g.pub)))).encode(),cwd=ROOT)
   self.assertIn(b'PASS',output)
   with g.db() as c:self.assertEqual(c.execute('SELECT count(*) FROM outbox').fetchone()[0],1)
 def test_unbound_cookie_identity_cannot_launch(self):
  js="const a=require('./integration/world-adapter.cjs');require('node:assert/strict').throws(()=>a.issueLaunch({ownerId:'cookie',agent:{id:'x'},secret:'a'.repeat(40),baseUrl:'http://localhost:8787',identityMode:'session'}));"
  subprocess.check_call(['node','-e',js],cwd=ROOT)
if __name__=='__main__':unittest.main()
