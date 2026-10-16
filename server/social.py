"""Server-authoritative social play. All writes run inside Game.tx()."""
import json,time,secrets,hashlib,base64

def canonical(v):return json.dumps(v,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()
def digest(v):return hashlib.sha256(canonical(v)).hexdigest()
def uid(p):return p+'_'+secrets.token_hex(12)
BEATS={'flank':'feint','feint':'guard','guard':'flank'}
KINDS=['scout','negotiate','defend','heist']

class Social:
 def need(self,ok,msg,status=409):
  if not ok:raise self.problem_type(status,msg)
 def fields(self,b,keys):self.need(isinstance(b,dict) and set(b)==set(keys),'Invalid command fields',400)
 def social_schema(self,c):
  c.executescript('''CREATE TABLE IF NOT EXISTS social_policy(agent TEXT PRIMARY KEY,pvp INTEGER,hiring INTEGER,cap INTEGER);
  CREATE TABLE IF NOT EXISTS social_objects(id TEXT PRIMARY KEY,kind TEXT NOT NULL,payload TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS social_seats(agent TEXT PRIMARY KEY,duel TEXT NOT NULL);''')
 def policy(self,c,aid):
  r=c.execute('SELECT * FROM social_policy WHERE agent=?',(aid,)).fetchone()
  return dict(allowPvP=bool(r['pvp']),allowHiring=bool(r['hiring']),maxEscrow=r['cap']) if r else dict(allowPvP=False,allowHiring=False,maxEscrow=5)
 def objects(self,c,kind):return [json.loads(r[0]) for r in c.execute('SELECT payload FROM social_objects WHERE kind=?',(kind,))]
 def save_object(self,c,o,kind):c.execute('INSERT OR REPLACE INTO social_objects VALUES(?,?,?)',(o['id'],kind,json.dumps(o)))
 def object(self,c,oid,kind):
  self.need(isinstance(oid,str),'Invalid object ID',400);r=c.execute('SELECT payload FROM social_objects WHERE id=? AND kind=?',(oid,kind)).fetchone();self.need(r is not None,'Not found',404);return json.loads(r[0])
 def free(self,c,aid):return not(c.execute('SELECT 1 FROM social_seats WHERE agent=?',(aid,)).fetchone() or c.execute("SELECT 1 FROM missions WHERE agent=? AND status IN ('ACTIVE','PENDING')",(aid,)).fetchone())
 def allow(self,c,a,p,feature):
  self.need(not p['stopped'],'Emergency stop is active',403);s=self.policy(c,a['id']);self.need(s[feature],'Enable the Social permission first',403);return s
 def qualify(self,c,aid,kind):return c.execute("SELECT count(*) FROM receipts WHERE agent=? AND json_extract(payload,'$.missionType')=? AND json_extract(payload,'$.outcome')='SUCCESS' AND json_extract(payload,'$.opponentType')='NPC'",(aid,kind)).fetchone()[0]
 def social_receipt(self,c,aid,obj,kind,other,outcome,events,context,policy):
  a=self.agent(c,aid);rid=uid('proof');version='switchyard-'+kind+'-1.0.0';seed=obj.get('seed',obj['id'])
  core=dict(id=rid,agentId=aid,missionId=obj['id'],missionType=kind,domain='syndicates_tactics' if kind=='pvp' else 'syndicates_services',season=self.season()+1,contentVersion=version,outcome=outcome,label='SANDBOX' if a['mode']=='demo' else 'SERVICE_VERIFIED',opponentType='PLAYER' if kind=='pvp' else 'AGENT',opponent=other or 'Unfilled offer',decisionSource='HUMAN_DIRECTED',createdAt=time.time(),policyHash=digest(policy),seedCommitment=digest(dict(seed=seed,mission=obj['id'],version=version)),revealedSeed=seed,context=context,spent=dict(supplies=0,intel=0),reward=dict(supplies=0,intel=0,influence=0),replay=events,replayHash=digest(events))
  payload={**core,'hash':digest(core),'signature':base64.urlsafe_b64encode(self.key.sign(canonical(core))).rstrip(b'=').decode(),'keyId':self.key_id}
  c.execute('INSERT INTO receipts VALUES(?,?,?,?,?,?,?)',(rid,aid,obj['id']+':'+aid,json.dumps(payload),payload['hash'],payload['signature'],core['createdAt']))
  if a['mode']=='kult':c.execute('INSERT INTO outbox(receipt,payload) VALUES(?,?)',(rid,json.dumps(payload)))
  self.audit(c,aid,'receipt.issued',dict(receipt=rid,domain=core['domain'],outcome=outcome))
 def end_duel(self,c,d,winner,reason,void=False):
  if d['status']!='ACTIVE':return
  d.update(status='RESOLVED',winner=winner,reason=reason,choices={})
  self.save_object(c,d,'pvp');c.execute('DELETE FROM social_seats WHERE duel=?',(d['id'],))
  events=[dict(tick=i*2,type='round',text='Round %d: %s vs %s' % (i+1,r['host'],r['guest']),position=[5,5]) for i,r in enumerate(d['rounds'])]+[dict(tick=6,type='outcome',text=reason,position=[3,6])]
  for aid,other in [(d['host'],d['guest']),(d['guest'],d['host'])]:
   self.social_receipt(c,aid,d,'pvp',other,'VOID' if void else ('DRAW' if winner is None else 'SUCCESS' if winner==aid else 'MISS'),events,dict(winner=winner,reason=reason,rounds=d['rounds'],noRewards=True),d['policies'][aid])
 def end_contract(self,c,j,status,receipt=None):
  if j['status'] not in ['OPEN','ACCEPTED']:return
  recipient=j['provider'] if status=='PAID' else j['buyer'];c.execute('UPDATE agents SET supplies=supplies+? WHERE id=?',(j['fee'],recipient))
  j.update(status=status,sourceReceipt=receipt['id'] if receipt else None);self.save_object(c,j,'a2a')
  context=dict(contractId=j['id'],status=status,fee=j['fee'],currency='GAME_SUPPLIES',recipient=recipient,missionId=j['mission'],sourceReceipt=j['sourceReceipt'])
  events=[dict(tick=0,type='contract',text=j['kind']+' for '+str(j['fee'])+' earned Supplies.',position=[3,6]),dict(tick=2,type='settlement',text='Verified success: payment released.' if status=='PAID' else 'Escrow refunded: '+status.lower()+'.',position=[3,6])]
  for aid,other in [(j['buyer'],j['provider']),(j['provider'],j['buyer'])]:
   if aid:self.social_receipt(c,aid,j,'a2a',other,'SUCCESS' if status=='PAID' else 'MISS' if status=='FAILED' else 'VOID',events,context,j['policies'].get(aid,{}))
 def social_sweep(self,c):
  now=time.time()
  for d in self.objects(c,'pvp'):
   if d['deadline']>now:continue
   if d['status']=='OPEN':d['status']='EXPIRED';self.save_object(c,d,'pvp');c.execute('DELETE FROM social_seats WHERE duel=?',(d['id'],))
   elif d['status']=='ACTIVE':
    winner=next(iter(d['choices']),None);self.end_duel(c,d,winner,'Opponent missed the deadline.' if winner else 'Both players missed the deadline.',not bool(winner))
  for j in self.objects(c,'a2a'):
   if j['status'] in ['OPEN','ACCEPTED'] and j['deadline']<=now:self.end_contract(c,j,'EXPIRED')
 def social_mission(self,c,r):
  for j in self.objects(c,'a2a'):
   if j['status']=='ACCEPTED' and j['mission']==r['missionId'] and j['provider']==r['agentId']:
    self.end_contract(c,j,'EXPIRED' if time.time()>=j['deadline'] else 'PAID' if r['outcome']=='SUCCESS' else 'FAILED',r)
 def social_view(self,c,a):
  aid=a['id'];duels=[d for d in self.objects(c,'pvp') if d['mode']==a['mode']];jobs=[j for j in self.objects(c,'a2a') if j['mode']==a['mode']]
  def duel(d):
   v={k:x for k,x in d.items() if k not in ['choices','seed','policies']};v['youLocked']=aid in d['choices'];v['opponentLocked']=any(x!=aid for x in d['choices']);v['hostName']=self.agent(c,d['host'])['name'];v['guestName']=self.agent(c,d['guest'])['name'] if d['guest'] else None
   v['seedCommitment']=digest(dict(seed=d['seed'],mission=d['id'],version='switchyard-pvp-1.0.0'));return v
  def job(j):
   v={k:x for k,x in j.items() if k!='policies'};v['buyerName']=self.agent(c,j['buyer'])['name'];v['providerName']=self.agent(c,j['provider'])['name'] if j['provider'] else None;return v
  own=next((d for d in duels if aid in [d['host'],d['guest']] and d['status'] in ['OPEN','ACTIVE']),None)
  return dict(policy=self.policy(c,aid),serverTime=time.time(),duel=duel(own) if own else None,lobbies=[duel(d) for d in duels if d['status']=='OPEN' and d['host']!=aid][-30:],duelHistory=[duel(d) for d in reversed(duels) if d['status']=='RESOLVED' and aid in [d['host'],d['guest']]][:10],offers=[job(j) for j in jobs if j['status']=='OPEN' and j['buyer']!=aid][-30:],contracts=[job(j) for j in reversed(jobs) if aid in [j['buyer'],j['provider']]][:30],qualifications={k:self.qualify(c,aid,k) for k in KINDS})
 def social_apply(self,c,s,a,p,route,b):
  aid=a['id'];now=time.time()
  if route=='/api/social/policy':
   self.fields(b,['allowPvP','allowHiring','maxEscrow']);self.need(type(b['allowPvP']) is bool and type(b['allowHiring']) is bool and type(b['maxEscrow']) is int and 1<=b['maxEscrow']<=10,'Invalid permissions',400)
   c.execute('INSERT OR REPLACE INTO social_policy VALUES(?,?,?,?)',(aid,int(b['allowPvP']),int(b['allowHiring']),b['maxEscrow']));return dict(ok=True)
  if route=='/api/pvp/create':
   self.fields(b,[]);self.allow(c,a,p,'allowPvP');self.need(self.free(c,aid),'Finish your current mission or duel first');self.need(sum(d['host']==aid and d['created']>now-3600 for d in self.objects(c,'pvp'))<20,'Hourly duel limit reached',429)
   d=dict(id=uid('duel'),host=aid,guest=None,mode=a['mode'],status='OPEN',round=0,rounds=[],choices={},policies={aid:dict(world=p,social=self.policy(c,aid))},deadline=now+180,created=now,seed=secrets.token_hex(24),winner=None,reason=None)
   self.save_object(c,d,'pvp');c.execute('INSERT INTO social_seats VALUES(?,?)',(aid,d['id']));return dict(duelId=d['id'])
  if route in ['/api/pvp/join','/api/pvp/choice','/api/pvp/leave']:
   self.fields(b,['duelId','round','choice'] if route.endswith('/choice') else ['duelId']);d=self.object(c,b['duelId'],'pvp')
   if route.endswith('/join'):
    self.allow(c,a,p,'allowPvP');self.need(d['status']=='OPEN' and d['host']!=aid and d['mode']==a['mode'],'Challenge unavailable');self.need(self.free(c,aid),'Finish your current mission or duel first');h=self.agent(c,d['host']);self.allow(c,h,json.loads(h['policy']),'allowPvP')
    d.update(guest=aid,status='ACTIVE',deadline=now+45);d['policies'][aid]=dict(world=p,social=self.policy(c,aid));self.save_object(c,d,'pvp');c.execute('INSERT INTO social_seats VALUES(?,?)',(aid,d['id']));return dict(ok=True)
   self.need(aid in [d['host'],d['guest']],'Not your duel',403)
   if route.endswith('/leave'):
    if d['status']=='OPEN':d['status']='CANCELLED';self.save_object(c,d,'pvp');c.execute('DELETE FROM social_seats WHERE duel=?',(d['id'],))
    elif d['status']=='ACTIVE':self.end_duel(c,d,d['guest'] if aid==d['host'] else d['host'],'Player forfeited the duel.')
    else:self.need(False,'Duel closed')
    return dict(ok=True)
   self.allow(c,a,p,'allowPvP');self.need(d['status']=='ACTIVE' and now<d['deadline'],'Round closed');self.need(type(b['round']) is int and b['round']==d['round'],'Stale round');self.need(isinstance(b['choice'],str) and b['choice'] in BEATS,'Unknown tactic',400);self.need(aid not in d['choices'],'Choice already locked')
   d['choices'][aid]=b['choice']
   if len(d['choices'])==2:
    h,g=d['choices'][d['host']],d['choices'][d['guest']];winner=None if h==g else d['host'] if BEATS[h]==g else d['guest'];d['rounds'].append(dict(host=h,guest=g,winner=winner));d.update(round=d['round']+1,choices={},deadline=now+45)
    if d['round']==3:
     hs=sum(r['winner']==d['host'] for r in d['rounds']);gs=sum(r['winner']==d['guest'] for r in d['rounds']);self.end_duel(c,d,None if hs==gs else d['host'] if hs>gs else d['guest'],'Three rounds resolved by the server.');return dict(ok=True)
   self.save_object(c,d,'pvp');return dict(ok=True)
  if route=='/api/hiring/create':
   self.fields(b,['kind','fee']);sp=self.allow(c,a,p,'allowHiring');self.need(b['kind'] in KINDS,'Unknown mission',400);self.need(type(b['fee']) is int and 1<=b['fee']<=sp['maxEscrow'],'Fee exceeds escrow permission',403);self.need(a['supplies']>=b['fee'],'Not enough Supplies');self.need(sum(j['buyer']==aid and j['status'] in ['OPEN','ACCEPTED'] for j in self.objects(c,'a2a'))<3,'Three active contracts maximum')
   j=dict(id=uid('hire'),buyer=aid,provider=None,mode=a['mode'],kind=b['kind'],fee=b['fee'],status='OPEN',mission=None,created=now,deadline=now+900,sourceReceipt=None,policies={aid:dict(world=p,social=sp)})
   c.execute('UPDATE agents SET supplies=supplies-? WHERE id=?',(j['fee'],aid));self.save_object(c,j,'a2a');return dict(contractId=j['id'])
  if route in ['/api/hiring/accept','/api/hiring/cancel']:
   self.fields(b,['contractId']);j=self.object(c,b['contractId'],'a2a')
   if route.endswith('/cancel'):
    self.need(j['buyer']==aid,'Only buyer may cancel',403);self.need(j['status']=='OPEN','Accepted job is binding until result or deadline');self.end_contract(c,j,'CANCELLED');return dict(ok=True)
   sp=self.allow(c,a,p,'allowHiring');self.need(j['status']=='OPEN' and j['buyer']!=aid and j['mode']==a['mode'],'Offer unavailable');self.need(self.free(c,aid),'Finish your current mission or duel first');self.need(not any(x['provider']==aid and x['status']=='ACCEPTED' for x in self.objects(c,'a2a')),'Finish the accepted job first');buyer=self.agent(c,j['buyer']);self.allow(c,buyer,json.loads(buyer['policy']),'allowHiring');self.need(self.qualify(c,aid,j['kind'])>0,'Complete a successful mission in this domain first',403)
   m=self._apply(c,s,a,p,'/api/missions',dict(kind=j['kind']));j.update(provider=aid,status='ACCEPTED',mission=m['missionId'],deadline=now+900);j['policies'][aid]=dict(world=p,social=sp);self.save_object(c,j,'a2a');return dict(missionId=j['mission'])
  self.need(False,'Route not found',404)
