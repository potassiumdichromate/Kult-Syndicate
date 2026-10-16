import base64, concurrent.futures, hashlib, hmac, json, os, sys, tempfile, time, unittest, uuid
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
from app import Game, Problem, b64, canonical, digest

class GameTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.g=Game(self.tmp.name,demo=True,secret='x'*40,delay=0);self.s=self.g.login({})
 def tearDown(self):self.tmp.cleanup()
 def cmd(self,path,body=None,s=None,rid=None):
  s=s or self.s;return self.g.mutate(s['token'],s['csrf'],path,body or {},rid or str(uuid.uuid4()))
 def state(self,s=None):return self.g.state((s or self.s)['token'])
 def start(self,kind='scout',s=None):return self.cmd('/api/missions',{'kind':kind},s)['missionId']
 def finish(self,kind='scout',good=True,s=None):
  mid=self.start(kind,s)
  for step in range(3):
   m=self.state(s)['mission'];o=next(o for o in m['stage']['options'] if (o['id']==m['recommendation']['action'])==good)
   self.cmd(f'/api/missions/{mid}/choice',{'step':step,'choice':o['id']},s)
  return self.cmd(f'/api/missions/{mid}/resolve',s=s)['receipt']
 def ticket(self,**kw):
  p=dict(sub='owner-1',agentId='arena-existing-1',name='ATHENA',jti=str(uuid.uuid4()),aud='kult-syndicates',exp=time.time()+60);p.update(kw);raw=b64(canonical(p));return raw+'.'+b64(hmac.new(self.g.secret.encode(),raw.encode(),hashlib.sha256).digest())
 def test_all_four_mission_loops(self):
  for kind in ['scout','negotiate','defend','heist']:
   r=self.finish(kind);self.assertEqual(r['outcome'],'SUCCESS');self.assertTrue(self.g.verify(r));self.assertEqual(r['opponentType'],'NPC')
 def test_miss_is_persistent_and_signed(self):
  r=self.finish(good=False);self.assertEqual(r['outcome'],'MISS');self.assertEqual(self.state()['receipts'][0]['id'],r['id']);self.assertTrue(self.g.verify(r))
 def test_forged_outcome_rejected(self):
  with self.assertRaises(Problem):self.cmd('/api/missions',{'kind':'scout','outcome':'win'})
  with self.assertRaises(Problem):self.cmd('/api/arena/experience',{'outcome':'win'})
  self.assertEqual(len(self.state()['receipts']),0)
 def test_choice_replay_cannot_double_spend(self):
  mid=self.start();b={'step':0,'choice':'roof'};self.cmd(f'/api/missions/{mid}/choice',b);before=self.state()['agent']['supplies']
  with self.assertRaises(Problem):self.cmd(f'/api/missions/{mid}/choice',b)
  self.assertEqual(before,self.state()['agent']['supplies'])
 def test_resolve_exactly_once(self):
  r=self.finish();before=self.state()['agent']['supplies'];again=self.cmd(f"/api/missions/{r['missionId']}/resolve")
  self.assertEqual(r,again['receipt']);self.assertEqual(before,self.state()['agent']['supplies']);self.assertEqual(1,len(self.state()['receipts']))
 def test_duplicate_start_command_is_idempotent(self):
  rid=str(uuid.uuid4());r=self.cmd('/api/missions',{'kind':'scout'},rid=rid);r2=self.cmd('/api/missions',{'kind':'scout'},rid=rid);self.assertEqual(r,r2);self.assertEqual(self.state()['agent']['supplies'],17)
 def test_conflicting_idempotency_key_rejected(self):
  rid=str(uuid.uuid4());self.cmd('/api/resupply',rid=rid)
  with self.assertRaises(Problem):self.cmd('/api/missions',{'kind':'scout'},rid=rid)
 def test_concurrent_start_only_one(self):
  def run(_):
   try:return self.start()
   except Problem:return None
  with concurrent.futures.ThreadPoolExecutor(4) as p:r=list(p.map(run,range(4)))
  self.assertEqual(sum(x is not None for x in r),1);self.assertEqual(self.state()['agent']['supplies'],17)
 def test_emergency_stop_and_safe_withdraw(self):
  mid=self.start();p=self.state()['agent']['policy'];p.pop('version');p['stopped']=True;self.cmd('/api/policy',p)
  with self.assertRaises(Problem):self.cmd(f'/api/missions/{mid}/choice',{'step':0,'choice':'roof'})
  r=self.cmd(f'/api/missions/{mid}/withdraw')['receipt'];self.assertEqual(r['outcome'],'WITHDRAWN')
 def test_budget_enforced_server_side(self):
  p=self.state()['agent']['policy'];p.pop('version');p['maxSupplies']=1;self.cmd('/api/policy',p);mid=self.start()
  with self.assertRaises(Problem):self.cmd(f'/api/missions/{mid}/choice',{'step':0,'choice':'roof'})
  self.assertEqual(self.state()['mission']['step'],0)
 def test_risk_gate(self):
  p=self.state()['agent']['policy'];p.pop('version');p['allowRisk']=False;self.cmd('/api/policy',p);mid=self.start('negotiate')
  with self.assertRaises(Problem):self.cmd(f'/api/missions/{mid}/choice',{'step':0,'choice':'vague'})
 def test_csrf_required(self):
  with self.assertRaises(Problem):self.g.mutate(self.s['token'],'bad','/api/resupply',{},str(uuid.uuid4()))
 def test_cross_owner_access_rejected(self):
  mid=self.start();other=self.g.login({})
  with self.assertRaises(Problem):self.cmd(f'/api/missions/{mid}/withdraw',s=other)
 def test_restart_preserves_active_mission_and_key(self):
  mid=self.start();g2=Game(self.tmp.name,demo=True,secret='x'*40,delay=0);self.assertEqual(g2.state(self.s['token'])['mission']['id'],mid);self.assertEqual(g2.key_id,self.g.key_id)
 def test_signed_launch_binds_same_existing_identity(self):
  first=self.g.login({'ticket':self.ticket()});self.assertEqual(first['agent']['id'],'arena-existing-1');r=self.finish(s=first);self.assertEqual(r['label'],'SERVICE_VERIFIED')
  second=self.g.login({'ticket':self.ticket()});self.assertEqual(self.state(second)['receipts'][0]['id'],r['id'])
 def test_launch_replay_expiry_signature(self):
  ticket=self.ticket();self.g.login({'ticket':ticket})
  for v in [ticket,self.ticket(exp=time.time()-1),self.ticket()[:-5]+'xxxxx']:
   with self.assertRaises(Problem):self.g.login({'ticket':v})
 def test_histories_never_merge(self):
  self.g.login({'ticket':self.ticket()})
  with self.assertRaises(Problem):self.g.login({'ticket':self.ticket(agentId='another-agent')})
  with self.assertRaises(Problem):self.g.login({'ticket':self.ticket(sub='another-owner')})
 def test_receipt_tampering_detected(self):
  r=self.finish();r['reward']['supplies']=999;self.assertFalse(self.g.verify(r))
 def test_seed_hidden_until_resolution(self):
  self.start();m=self.state()['mission'];self.assertNotIn('seed',m);self.assertNotIn('score',m);self.assertIn('commitment',m)
 def test_daily_resupply_once(self):
  self.cmd('/api/resupply');a=self.state()['agent'];self.assertEqual(a['supplies'],24)
  with self.assertRaises(Problem):self.cmd('/api/resupply')
 def test_treasury_and_leader_authority(self):
  self.cmd('/api/crew/create',{'name':'Lantern Keepers'});crew=self.state()['crew'];other=self.g.login({});self.cmd('/api/crew/join',{'code':crew['code']},other)
  rid=str(uuid.uuid4());self.cmd('/api/crew/deposit',{'amount':5},rid=rid);self.cmd('/api/crew/deposit',{'amount':5},rid=rid);self.assertEqual(self.state()['crew']['treasury'],5)
  with self.assertRaises(Problem):self.cmd('/api/crew/claim',{'block':'garden'},other)
 def test_claim_requires_real_influence(self):
  self.cmd('/api/crew/create',{'name':'Lantern Keepers'});self.cmd('/api/crew/deposit',{'amount':5})
  with self.assertRaises(Problem):self.cmd('/api/crew/claim',{'block':'garden'})
  self.finish('defend');self.finish('defend');self.cmd('/api/crew/claim',{'block':'garden'});self.assertEqual(self.state()['crew']['treasury'],0)
  with self.assertRaises(Problem):self.cmd('/api/crew/claim',{'block':'garden'})
 def test_delayed_resolution_cannot_be_skipped(self):
  self.g.delay=60;mid=self.start()
  for i,c in enumerate(['roof','verify','qualified']):self.cmd(f'/api/missions/{mid}/choice',{'step':i,'choice':c})
  with self.assertRaises(Problem):self.cmd(f'/api/missions/{mid}/resolve')
 def test_production_demo_login_disabled(self):
  g=Game(self.tmp.name,demo=False,secret='z'*40)
  with self.assertRaises(Problem):g.login({})
 def test_domain_evidence_is_scoped(self):
  r=self.finish();self.assertEqual(r['domain'],'reconnaissance');self.assertEqual(r['decisionSource'],'HUMAN_DIRECTED_RULE_ADVISED')

if __name__=='__main__':unittest.main(verbosity=2)
