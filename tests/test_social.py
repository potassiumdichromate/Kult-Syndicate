import concurrent.futures,json,sys,tempfile,time,unittest,uuid,hashlib,hmac,subprocess
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
from app import Game,Problem,b64,canonical
class SocialTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.g=Game(self.tmp.name,demo=True,delay=0);self.a=self.g.login({});self.b=self.g.login({});self.c=self.g.login({})
  for s in [self.a,self.b,self.c]:self.cmd(s,'/api/social/policy',dict(allowPvP=True,allowHiring=True,maxEscrow=5))
 def tearDown(self):self.tmp.cleanup()
 def cmd(self,s,path,body=None,rid=None):return self.g.mutate(s['token'],s['csrf'],path,body or {},rid or str(uuid.uuid4()))
 def state(self,s):return self.g.state(s['token'])
 def duel(self):
  d=self.cmd(self.a,'/api/pvp/create')['duelId'];self.cmd(self.b,'/api/pvp/join',dict(duelId=d));return d
 def choice(self,s,d,r,t):return self.cmd(s,'/api/pvp/choice',dict(duelId=d,round=r,choice=t))
 def finish(self,s,mid=None,good=True):
  if mid is None:mid=self.cmd(s,'/api/missions',dict(kind='scout'))['missionId']
  for i in range(3):
   m=self.state(s)['mission'];o=next(o for o in m['stage']['options'] if (o['id']==m['recommendation']['action'])==good);self.cmd(s,f'/api/missions/{mid}/choice',dict(step=i,choice=o['id']))
  return self.cmd(s,f'/api/missions/{mid}/resolve')['receipt']
 def offer(self):return self.cmd(self.a,'/api/hiring/create',dict(kind='scout',fee=3))['contractId']
 def expire(self,oid,kind):
  with self.g.tx() as c:
   o=self.g.object(c,oid,kind);o['deadline']=time.time()-1;self.g.save_object(c,o,kind);self.g.social_sweep(c)
 def test_choices_private_until_both_lock_and_signed_results(self):
  d=self.duel();self.choice(self.a,d,0,'flank');v=self.state(self.b)['social']['duel'];self.assertNotIn('choices',v);self.assertNotIn('seed',v);self.assertEqual(v['rounds'],[]);self.assertTrue(v['opponentLocked'])
  self.choice(self.b,d,0,'feint')
  for i in [1,2]:self.choice(self.a,d,i,'flank');self.choice(self.b,d,i,'feint')
  ar=self.state(self.a)['receipts'][0];br=self.state(self.b)['receipts'][0];self.assertEqual(ar['outcome'],'SUCCESS');self.assertEqual(br['outcome'],'MISS');self.assertTrue(self.g.verify(ar));self.assertTrue(self.g.verify(br));self.assertEqual(ar['domain'],'syndicates_tactics');self.assertEqual(self.state(self.a)['agent']['supplies'],18)
 def test_draw_is_not_success(self):
  d=self.duel()
  for i in range(3):self.choice(self.a,d,i,'guard');self.choice(self.b,d,i,'guard')
  self.assertEqual(self.state(self.a)['receipts'][0]['outcome'],'DRAW');self.assertEqual(self.state(self.a)['social']['qualifications']['scout'],0)
 def test_double_choice_and_stale_round_rejected(self):
  d=self.duel();self.choice(self.a,d,0,'guard')
  with self.assertRaises(Problem):self.choice(self.a,d,0,'flank')
  self.choice(self.b,d,0,'feint')
  with self.assertRaises(Problem):self.choice(self.a,d,0,'guard')
 def test_unrelated_agent_cannot_choose_or_leave(self):
  d=self.duel()
  with self.assertRaises(Problem):self.choice(self.c,d,0,'guard')
  with self.assertRaises(Problem):self.cmd(self.c,'/api/pvp/leave',dict(duelId=d))
 def test_forfeit_releases_both_seats(self):
  d=self.duel();self.cmd(self.a,'/api/pvp/leave',dict(duelId=d));self.assertEqual(self.state(self.a)['receipts'][0]['outcome'],'MISS');self.cmd(self.b,'/api/missions',dict(kind='scout'))
 def test_timeout_with_one_choice_and_double_timeout(self):
  d=self.duel();self.choice(self.a,d,0,'flank');self.expire(d,'pvp');self.assertEqual(self.state(self.a)['receipts'][0]['outcome'],'SUCCESS')
  d=self.duel();self.expire(d,'pvp');self.assertEqual(self.state(self.a)['receipts'][0]['outcome'],'VOID')
 def test_lobby_expiry_and_restart(self):
  d=self.cmd(self.a,'/api/pvp/create')['duelId'];g2=Game(self.tmp.name,demo=True,delay=0);self.assertEqual(g2.state(self.a['token'])['social']['duel']['id'],d);self.expire(d,'pvp');self.assertIsNone(self.state(self.a)['social']['duel'])
 def test_concurrent_join_one_seat(self):
  d=self.cmd(self.a,'/api/pvp/create')['duelId']
  def join(s):
   try:self.cmd(s,'/api/pvp/join',dict(duelId=d));return True
   except Problem:return False
  with concurrent.futures.ThreadPoolExecutor(2) as p:self.assertEqual(sum(p.map(join,[self.b,self.c])),1)
 def test_opt_in_and_emergency_stop(self):
  p=self.state(self.a)['agent']['policy'];p.pop('version');p['stopped']=True;self.cmd(self.a,'/api/policy',p)
  with self.assertRaises(Problem):self.cmd(self.a,'/api/pvp/create')
  with self.assertRaises(Problem):self.offer()
  self.cmd(self.b,'/api/social/policy',dict(allowPvP=False,allowHiring=False,maxEscrow=5))
  with self.assertRaises(Problem):self.cmd(self.b,'/api/pvp/create')
 def test_mission_and_duel_are_exclusive(self):
  d=self.duel()
  with self.assertRaises(Problem):self.cmd(self.a,'/api/missions',dict(kind='scout'))
 def test_hiring_requires_domain_success(self):
  j=self.offer()
  with self.assertRaises(Problem):self.cmd(self.b,'/api/hiring/accept',dict(contractId=j))
  self.assertEqual(self.state(self.a)['agent']['supplies'],15)
 def test_hiring_success_settles_exact_mission_once(self):
  self.finish(self.b);j=self.offer();m=self.cmd(self.b,'/api/hiring/accept',dict(contractId=j))['missionId'];r=self.finish(self.b,m);a=self.state(self.a);b=self.state(self.b);self.assertEqual(a['social']['contracts'][0]['status'],'PAID');self.assertEqual(a['social']['contracts'][0]['sourceReceipt'],r['id']);self.assertTrue(self.g.verify(a['receipts'][0]));before=b['agent']['supplies'];self.cmd(self.b,f'/api/missions/{m}/resolve');self.assertEqual(before,self.state(self.b)['agent']['supplies']);self.assertEqual(len(a['receipts']),1)
 def test_hiring_cancel_idempotent_refund(self):
  j=self.offer();rid=str(uuid.uuid4());self.cmd(self.a,'/api/hiring/cancel',dict(contractId=j),rid);self.cmd(self.a,'/api/hiring/cancel',dict(contractId=j),rid);self.assertEqual(self.state(self.a)['agent']['supplies'],18)
 def test_hiring_miss_refunds(self):
  self.finish(self.b);j=self.offer();m=self.cmd(self.b,'/api/hiring/accept',dict(contractId=j))['missionId'];self.finish(self.b,m,False);self.assertEqual(self.state(self.a)['agent']['supplies'],18);self.assertEqual(self.state(self.a)['social']['contracts'][0]['status'],'FAILED')
 def test_hiring_withdraw_refunds(self):
  self.finish(self.b);j=self.offer();m=self.cmd(self.b,'/api/hiring/accept',dict(contractId=j))['missionId'];self.cmd(self.b,f'/api/missions/{m}/withdraw');self.assertEqual(self.state(self.a)['agent']['supplies'],18)
 def test_expired_accepted_job_cannot_later_pay(self):
  self.finish(self.b);j=self.offer();m=self.cmd(self.b,'/api/hiring/accept',dict(contractId=j))['missionId'];self.expire(j,'a2a');self.finish(self.b,m);self.assertEqual(self.state(self.a)['social']['contracts'][0]['status'],'EXPIRED');self.assertEqual(self.state(self.a)['agent']['supplies'],18)
 def test_open_expiry_refund(self):
  j=self.offer();self.expire(j,'a2a');self.assertEqual(self.state(self.a)['agent']['supplies'],18)
 def test_self_hiring_and_forged_settlement_rejected(self):
  j=self.offer()
  with self.assertRaises(Problem):self.cmd(self.a,'/api/hiring/accept',dict(contractId=j))
  with self.assertRaises(Problem):self.cmd(self.b,'/api/hiring/settle',dict(contractId=j,outcome='SUCCESS'))
  with self.assertRaises(Problem):self.cmd(self.a,'/api/pvp/create',dict(outcome='win'))
 def test_escrow_caps_and_cancel_authority(self):
  with self.assertRaises(Problem):self.cmd(self.a,'/api/hiring/create',dict(kind='scout',fee=6))
  j=self.offer()
  with self.assertRaises(Problem):self.cmd(self.b,'/api/hiring/cancel',dict(contractId=j))
 def test_transfers_above_faucet_cap_not_destroyed(self):
  with self.g.tx() as c:c.execute('UPDATE agents SET supplies=80 WHERE id=?',(self.a['agent']['id'],))
  self.cmd(self.a,'/api/resupply');self.assertEqual(self.state(self.a)['agent']['supplies'],80)
 def kult(self,aid):
  self.g.secret='s'*40
  p=dict(sub='owner-'+aid,agentId=aid,name=aid,jti=str(uuid.uuid4()),aud='kult-syndicates',exp=time.time()+60);raw=b64(canonical(p));ticket=raw+'.'+b64(hmac.new(self.g.secret.encode(),raw.encode(),hashlib.sha256).digest());s=self.g.login(dict(ticket=ticket));self.cmd(s,'/api/social/policy',dict(allowPvP=True,allowHiring=True,maxEscrow=5));return s
 def test_sandbox_and_kult_cannot_interact(self):
  real=self.kult('real-agent');d=self.cmd(self.a,'/api/pvp/create')['duelId'];j=self.offer()
  with self.assertRaises(Problem):self.cmd(real,'/api/pvp/join',dict(duelId=d))
  with self.assertRaises(Problem):self.cmd(real,'/api/hiring/accept',dict(contractId=j))
  self.assertEqual(self.state(real)['social']['offers'],[]);self.assertEqual(self.state(real)['social']['lobbies'],[])
 def test_social_receipts_verified_by_world_adapter(self):
  self.a,self.b=self.kult('real-a'),self.kult('real-b');d=self.duel();self.cmd(self.a,'/api/pvp/leave',dict(duelId=d));j=self.offer();self.cmd(self.a,'/api/hiring/cancel',dict(contractId=j));receipts=self.state(self.a)['receipts'];self.assertEqual(len(receipts),2)
  for r in receipts:
   ts=str(int(time.time()));secret='c'*40;sig=hmac.new(secret.encode(),(ts+'\n'+hashlib.sha256(canonical(r)).hexdigest()).encode(),hashlib.sha256).hexdigest()
   js="const fs=require('fs'),a=require('./integration/world-adapter.cjs');const x=JSON.parse(fs.readFileSync(0,'utf8'));a.verifyDelivery(x.receipt,x.headers,x.config);"
   subprocess.run(['node','-e',js],input=json.dumps(dict(receipt=r,headers={'x-syndicates-timestamp':ts,'x-syndicates-signature':sig},config=dict(secret=secret,publicKey=b64(self.g.pub)))).encode(),check=True,cwd=Path(__file__).resolve().parents[1])
if __name__=='__main__':unittest.main()
