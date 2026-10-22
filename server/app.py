#!/usr/bin/env python3
"""Syndicates beta server. Python 3.11+, SQLite, Ed25519. One writable deployment volume."""
import base64, copy, contextlib, hashlib, hmac, json, math, mimetypes, os, re, secrets, sqlite3, time
from collections import defaultdict, deque
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives import serialization
from content import MISSIONS, BLOCKS, VERSION
from dynamics import situation, apply_stage
from social import Social
from migrations import migrate
from secrets_config import secret_value

ROOT=Path(__file__).resolve().parents[1]
def canonical(v): return json.dumps(v, sort_keys=True, separators=(',',':'), ensure_ascii=False).encode()
def digest(v): return hashlib.sha256(canonical(v)).hexdigest()
def b64(v): return base64.urlsafe_b64encode(v).rstrip(b'=').decode()
def un64(v): return base64.urlsafe_b64decode(v+'='*((4-len(v)%4)%4))
def ident(prefix): return prefix+'_'+secrets.token_hex(12)
def require(ok, message, status=400):
    if not ok: raise Problem(status,message)
class Problem(Exception):
    def __init__(self,status,message): self.status,self.message=status,message

def strict(body, keys): require(isinstance(body,dict) and not (set(body)-set(keys)), 'Unexpected request fields')
def integer(v,lo,hi):
    require(type(v) is int and lo<=v<=hi,'Invalid integer range'); return v

def clean(v):
    require(isinstance(v,str) and bool(re.fullmatch(r"[A-Za-z0-9 _.-]{2,32}",v)), 'Use 2–32 letters, numbers, spaces or ._-'); return v

class Game(Social):
    problem_type=Problem
    def __init__(self, data=None, demo=None, secret=None, delay=None):
        self.data=Path(data or os.getenv('SYNDICATES_DATA',ROOT/'data'));self.data.mkdir(parents=True,exist_ok=True)
        self.demo=(os.getenv('SYNDICATES_DEMO','no')=='yes') if demo is None else demo
        self.secret=secret if secret is not None else secret_value('KULT_SYNDICATES_LAUNCH_SECRET')
        require(self.demo or len(self.secret)>=32, 'Production requires KULT_SYNDICATES_LAUNCH_SECRET (32+ characters)',500)
        self.delay=delay if delay is not None else int(os.getenv('RESOLUTION_SECONDS','8'))
        managed_key=os.getenv('SYNDICATES_SIGNING_KEY_FILE')
        keyfile=Path(managed_key) if managed_key else self.data/'receipt-key.pem'
        if not keyfile.exists():
            require(not managed_key,'Configured receipt signing key file is missing',500)
            k=Ed25519PrivateKey.generate()
            fd=os.open(keyfile,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
            with os.fdopen(fd,'wb') as f:f.write(k.private_bytes(serialization.Encoding.PEM,serialization.PrivateFormat.PKCS8,serialization.NoEncryption()))
        self.key=serialization.load_pem_private_key(keyfile.read_bytes(),password=None)
        self.pub=self.key.public_key().public_bytes(serialization.Encoding.Raw,serialization.PublicFormat.Raw)
        self.key_id=hashlib.sha256(self.pub).hexdigest()[:16]
        with self.db() as c:
            self.schema_version=migrate(c)
    @contextlib.contextmanager
    def db(self):
        c=sqlite3.connect(self.data/'syndicates.sqlite',timeout=10,isolation_level=None);c.row_factory=sqlite3.Row
        c.execute('PRAGMA foreign_keys=ON');c.execute('PRAGMA busy_timeout=10000')
        try:yield c
        finally:c.close()
    @contextlib.contextmanager
    def tx(self):
        with self.db() as c:
            c.execute('BEGIN IMMEDIATE')
            try:yield c;c.commit()
            except: c.rollback();raise
    def season(self): return max(0,int((time.time()-1790812800)//(28*86400)))
    def audit(self,c,agent,event,detail=None):c.execute('INSERT INTO audit(agent,event,detail,at) VALUES(?,?,?,?)',(agent,event,json.dumps(detail or {}),time.time()))
    def agent(self,c,aid):
        a=c.execute('SELECT * FROM agents WHERE id=?',(aid,)).fetchone();require(a is not None,'Agent not found',404)
        if a['season']!=self.season():
            c.execute('UPDATE agents SET influence=0,season=? WHERE id=?',(self.season(),aid));a=c.execute('SELECT * FROM agents WHERE id=?',(aid,)).fetchone()
        return dict(a)
    def public_agent(self,a):
        return {k:(json.loads(v) if k=='policy' else v) for k,v in a.items() if k!='owner'}
    def session(self,c,token):
        s=c.execute('SELECT * FROM sessions WHERE token=? AND expires>?',(hashlib.sha256(token.encode()).hexdigest(),time.time())).fetchone()
        require(s is not None,'Session expired. Enter from KULT World or start a local demo.',401);return dict(s)
    def login(self,body,existing_token=''):
        with self.tx() as c:
            if 'ticket' in body:
                strict(body,['ticket']); ticket=body['ticket'];require(isinstance(ticket,str) and len(ticket)<4096,'Invalid launch ticket',401)
                try:
                    raw,sig=ticket.split('.');expected=hmac.new(self.secret.encode(),raw.encode(),hashlib.sha256).digest()
                    require(bool(self.secret) and hmac.compare_digest(expected,un64(sig)),'Invalid launch signature',401)
                    p=json.loads(un64(raw)); now=time.time()
                    require(p.get('aud')=='kult-syndicates' and type(p.get('exp')) in (int,float) and now<p['exp']<=now+120,'Expired launch ticket',401)
                    require(all(isinstance(p.get(k),str) and 1<=len(p[k])<=256 for k in ['sub','agentId','jti']),'Invalid identity',401)
                    require(not c.execute('SELECT 1 FROM used_tickets WHERE jti=?',(p['jti'],)).fetchone(),'Launch ticket already used',409)
                    c.execute('INSERT INTO used_tickets VALUES(?,?)',(p['jti'],p['exp']))
                    aid,owner,name,mode=p['agentId'],p['sub'],clean(p.get('name','KULT Agent')),'kult'
                except Problem:raise
                except Exception:raise Problem(401,'Malformed launch ticket')
                old=c.execute('SELECT * FROM agents WHERE owner=? OR id=?',(owner,aid)).fetchall()
                require(all(r['owner']==owner and r['id']==aid for r in old),'Agent binding conflict. Histories cannot be merged.',409)
            else:
                strict(body,[]);require(self.demo,'Demo login is disabled',403)
                if existing_token:
                    try:
                        s=self.session(c,existing_token);return dict(token=existing_token,csrf=s['csrf'],agent=self.public_agent(self.agent(c,s['agent'])))
                    except Problem:pass
                aid,owner,name,mode=ident('demo'),ident('guest'),'AEGIS-'+secrets.token_hex(2).upper(),'demo'
            policy=dict(maxSupplies=8,allowRisk=True,stopped=False,allowed=list(MISSIONS),version=1)
            c.execute('INSERT OR IGNORE INTO agents(id,owner,name,mode,supplies,intel,influence,policy,season,created) VALUES(?,?,?,?,?,?,?,?,?,?)',(aid,owner,name,mode,18,3,0,json.dumps(policy),self.season(),time.time()))
            token,csrf=secrets.token_urlsafe(32),secrets.token_urlsafe(24)
            c.execute('INSERT INTO sessions VALUES(?,?,?,?)',(hashlib.sha256(token.encode()).hexdigest(),aid,csrf,time.time()+86400))
            self.audit(c,aid,'session.entered',dict(mode=mode));return dict(token=token,csrf=csrf,agent=self.public_agent(self.agent(c,aid)))
    def stage(self,m):
        stage=copy.deepcopy(MISSIONS[m['kind']]['stages'][m['step']]);context=json.loads(m.get('context','{}'))
        if context.get('ruleVersion')==VERSION:
            stage['_note'],stage['_preferred']=apply_stage(m['kind'],m['step'],stage,context)
            return stage
        if m['kind']=='heist' and m['step']==0:
            if context.get('scoutReceipt'):
                stage['text']=('Your signed Scout report places the patrol on the canal. The gate is the safer entry.' if context['patrol']=='canal' else 'Your signed Scout report places the patrol at the gate. The canal is the safer entry.')
            else:
                stage['text']='No verified Scout report is available. Canal and gate both have signs of movement; choose how much Intel to spend on the approach.'
            if context.get('patrol')=='canal':
                stage['options'][0]['score']=-1
                stage['options'][1]['score']=3
                stage['options'][1]['text']='Approach through the main gate'
        if m['kind']=='negotiate' and m['step']==0 and context.get('brokenAgreements',0)>0:
            stage['text']='The Union remembers your broken agreement. A specific, bounded offer can begin rebuilding trust.'
        return stage
    def mission_view(self,m):
        d=dict(m); d.pop('seed');d.pop('score');d['policy']=json.loads(d['policy']);d['events']=json.loads(d['events']);d['context']=json.loads(d.get('context','{}'))
        # A verified report reveals the patrol. An unscouted job must not leak it through state.
        if not d['context'].get('scoutReceipt'):d['context'].pop('patrol',None)
        if d['context'].get('ruleVersion')==VERSION and 'situation' in d['context']:
            d['context']['situation']={k:v for k,v in d['context']['situation'].items() if k in ('clues','startingAlert','hasLead')}
        spec=MISSIONS[d['kind']];d['name']=spec['name'];d['intro']=spec['intro'];d['faction']=spec['faction']
        if d['status']=='ACTIVE':
            stage=self.stage(dict(m));d['stage']={**stage,'options':[{k:v for k,v in o.items() if k!='score'} for o in stage['options']]}
            d['stage'].pop('_note',None);d['stage'].pop('_preferred',None)
            lead=d['context'].get('scoutReceipt')
            observation=('Verified Scout report '+lead[:18]+'… informs this entry.' if lead and d['kind']=='heist' else 'No verified Scout report. Patrol placement is uncertain.' if d['kind']=='heist' else 'The Union remembers your broken agreement; rebuilding trust costs real Supplies.' if d['kind']=='negotiate' and d['context'].get('brokenAgreements') else 'You have recorded '+str(d['context'].get('priorScouts',0))+' successful Scout reports.' if d['kind']=='scout' else 'Your previous Syndicates decisions remain in your record.')
            d['recommendation']=dict(source='RULE_BASED',observation=observation,tradeoff='Compare the resource cost and evidence in each route. The adviser cannot promise success; your choice is recorded.')
            if d['context'].get('ruleVersion')==VERSION:
                d['recommendation']=dict(source='RULE_BASED',observation=' · '.join(d['context']['situation']['clues']),tradeoff=stage['_note'])
        return d
    def scout_lead(self,receipts,c=None):
        candidates=[]
        for record in receipts:
            r=record;source='OWN_SCOUT';contract=None
            if record.get('missionType')=='a2a' and record.get('outcome')=='SUCCESS' and record.get('context',{}).get('status')=='PAID' and c:
                rid=record['context'].get('sourceReceipt');row=c.execute('SELECT payload FROM receipts WHERE id=?',(rid,)).fetchone()
                if not row:continue
                r=json.loads(row[0]);source='HIRED_SCOUT';contract=record['id']
                if r.get('agentId')!=record.get('opponent') or r.get('missionId')!=record['context'].get('missionId'):continue
            if r.get('missionType')!='scout' or r.get('outcome')!='SUCCESS':continue
            if r.get('createdAt',0)<time.time()-86400:continue
            choices={e.get('choice') for e in r.get('replay',[]) if e.get('type')=='choice'}
            patrol=r.get('context',{}).get('patrol')
            if {'verify','qualified'}<=choices and patrol in ('canal','gate'):
                candidates.append((r['createdAt'],dict(receiptId=r['id'],contractReceiptId=contract,source=source,patrol=patrol,expires=r['createdAt']+86400)))
        if candidates:return max(candidates,key=lambda x:x[0])[1]
        return None
    def agent_memory(self,receipts):
        npc=[r for r in receipts if r.get('opponentType')=='NPC']
        routes=sum(r.get('missionType')=='scout' and r.get('outcome')=='SUCCESS' and {'verify','qualified'}<={e.get('choice') for e in r.get('replay',[]) if e.get('type')=='choice'} for r in npc)
        manifests=sum(r.get('missionType')=='heist' and r.get('outcome')=='SUCCESS' and bool(r.get('context',{}).get('scoutReceipt')) for r in npc)
        misses=sum(r.get('outcome')=='MISS' for r in npc)
        return dict(verifiedRoutes=routes,linkedManifests=manifests,misses=misses,scope='last_50_syndicates_receipts')
    def active_territory(self,c,aid,block):
        return bool(c.execute('SELECT 1 FROM territory t JOIN members m ON m.crew=t.crew WHERE m.agent=? AND t.block=? AND t.expires>? AND t.season=?',(aid,block,time.time(),self.season())).fetchone())
    def crew_synergy(self,c,aid):
        crew=self.crew(c,aid)
        return bool(crew and c.execute('SELECT count(*) FROM agents JOIN members ON agents.id=members.agent WHERE members.crew=? AND agents.season=? AND agents.influence>0',(crew['id'],self.season())).fetchone()[0]>=2)
    def crew(self,c,aid):
        r=c.execute('SELECT crews.* FROM crews JOIN members ON crews.id=members.crew WHERE members.agent=?',(aid,)).fetchone()
        if not r:return None
        d=dict(r);d['members']=[dict(x) for x in c.execute('SELECT agents.id,agents.name,agents.influence FROM agents JOIN members ON agents.id=members.agent WHERE members.crew=?',(r['id'],))]
        d['territory']=[dict(x) for x in c.execute('SELECT * FROM territory WHERE crew=? AND expires>? AND season=?',(r['id'],time.time(),self.season()))];return d
    def receipts(self,c,aid):return [json.loads(r[0]) for r in c.execute('SELECT payload FROM receipts WHERE agent=? ORDER BY created DESC LIMIT 50',(aid,))]
    def state(self,token):
        with self.tx() as c:
            s=self.session(c,token);self.social_sweep(c);aid=s['agent'];a=self.agent(c,aid)
            m=c.execute("SELECT * FROM missions WHERE agent=? AND status IN ('ACTIVE','PENDING')",(aid,)).fetchone()
            rs=self.receipts(c,aid)
            lead=self.scout_lead(rs,c);workshop=self.active_territory(c,aid,'workshop');garden=self.active_territory(c,aid,'garden');synergy=self.crew_synergy(c,aid)
            todayCounts={r['kind']:r['n'] for r in c.execute('SELECT kind,count(*) n FROM missions WHERE agent=? AND created>? GROUP BY kind',(aid,int(time.time()//86400)*86400))}
            completed=next((r for r in rs if r.get('missionType')=='heist' and r.get('outcome')=='SUCCESS' and r.get('context',{}).get('scoutReceipt')),None)
            return dict(agent=self.public_agent(a),csrf=s['csrf'],social=self.social_view(c,a),mission=self.mission_view(m) if m else None,receipts=rs,crew=self.crew(c,aid),
                        operation=dict(lead=lead,completedReceipt=completed['id'] if completed else None,workshop=workshop,garden=garden,crewSynergy=synergy),agentMemory=self.agent_memory(rs),
                        season=self.season()+1,blocks=BLOCKS,territory=[dict(x) for x in c.execute('SELECT * FROM territory WHERE expires>? AND season=?',(time.time(),self.season()))],
                        missions=[dict(kind=k,name=v['name'],domain=v['domain'],cost=max(1,v['cost']-(1+int(synergy) if k=='heist' and workshop else 0)),reward=(v['reward']+1)//2 if todayCounts.get(k) else v['reward'],repeatToday=bool(todayCounts.get(k)),intro=v['intro']) for k,v in MISSIONS.items()],
                        demo=self.demo,adviser='RULE_BASED',worldConnected=a['mode']=='kult',contentVersion=VERSION,serverTime=time.time(),
                        limits=dict(dailyMissions=12,supplyCap=60,intelCap=12),proof=dict(algorithm='Ed25519',keyId=self.key_id,publicKey=b64(self.pub)))
    def mutate(self,token,csrf,route,body,request_id=''):
        require(isinstance(request_id,str) and bool(re.fullmatch(r'[A-Za-z0-9_-]{16,80}',request_id)), 'X-Request-ID must be a unique 16–80 character command ID')
        with self.tx() as c:
            s=self.session(c,token);require(hmac.compare_digest(s['csrf'],csrf),'Invalid CSRF token',403)
            fingerprint=digest(dict(route=route,body=body))
            cached=c.execute('SELECT * FROM commands WHERE agent=? AND request_id=?',(s['agent'],request_id)).fetchone()
            if cached:
                require(cached['request_hash']==fingerprint,'Command ID reused with different content',409)
                return json.loads(cached['response'])
            self.social_sweep(c)
            a=self.agent(c,s['agent']);p=json.loads(a['policy'])
            result=self._apply(c,s,a,p,route,body)
            c.execute('INSERT INTO commands VALUES(?,?,?,?)',(s['agent'],request_id,fingerprint,json.dumps(result)))
            return result
    def _apply(self,c,s,a,p,route,body):
        aid=s['agent']
        if route.startswith(('/api/pvp/','/api/hiring/','/api/social/')):return self.social_apply(c,s,a,p,route,body)
        if route=='/api/policy':
            strict(body,['maxSupplies','allowRisk','stopped','allowed']);integer(body.get('maxSupplies'),0,20)
            require(type(body.get('allowRisk')) is bool and type(body.get('stopped')) is bool,'Invalid policy flags')
            require(isinstance(body.get('allowed'),list) and len(body['allowed'])<=4 and all(k in MISSIONS for k in body['allowed']),'Unknown permission')
            p={**body,'version':p['version']+1};c.execute('UPDATE agents SET policy=? WHERE id=?',(json.dumps(p),aid));self.audit(c,aid,'policy.changed',p)
            return dict(ok=True)
        if route=='/api/resupply':
            strict(body,[])
            require(not c.execute('SELECT 1 FROM audit WHERE agent=? AND event=? AND at>?',(aid,'resupply.claimed',int(time.time()//86400)*86400)).fetchone(),'Daily resupply already collected',409)
            c.execute('UPDATE agents SET supplies=supplies+max(0,min(6,60-supplies)),intel=min(12,intel+2),alert=max(0,alert-1) WHERE id=?',(aid,));self.audit(c,aid,'resupply.claimed');return dict(ok=True)
        if route=='/api/lay-low':
            strict(body,[])
            require(a['alert']>0,'District is already quiet',409)
            require(a['supplies']>=3,'Need 3 Supplies to lay low',409)
            require(not c.execute("SELECT 1 FROM missions WHERE agent=? AND status IN ('ACTIVE','PENDING')",(aid,)).fetchone(),'Finish your current mission first',409)
            require(not c.execute('SELECT 1 FROM audit WHERE agent=? AND event=? AND at>?',(aid,'alert.laid_low',int(time.time()//86400)*86400)).fetchone(),'Already laid low today',409)
            c.execute('UPDATE agents SET supplies=supplies-3,alert=max(0,alert-2) WHERE id=?',(aid,))
            self.audit(c,aid,'alert.laid_low',dict(before=a['alert'],after=max(0,a['alert']-2)))
            return dict(ok=True)
        if route=='/api/missions':
            require(not c.execute('SELECT 1 FROM social_seats WHERE agent=?',(aid,)).fetchone(),'Finish your duel first',409)
            strict(body,['kind']);kind=body.get('kind');require(kind in MISSIONS,'Unknown mission');require(not p['stopped'],'Emergency stop is active',403);require(kind in p['allowed'],'Mission forbidden by policy',403)
            require(not c.execute("SELECT 1 FROM missions WHERE agent=? AND status IN ('ACTIVE','PENDING')",(aid,)).fetchone(),'Finish or withdraw from your active mission',409)
            require(c.execute('SELECT count(*) FROM missions WHERE agent=? AND created>?',(aid,int(time.time()//86400)*86400)).fetchone()[0]<12,'Daily mission budget reached',429)
            workshop=kind=='heist' and self.active_territory(c,aid,'workshop');synergy=self.crew_synergy(c,aid)
            cost=max(1,MISSIONS[kind]['cost']-(1+int(synergy) if workshop else 0));require(cost<=p['maxSupplies'],'Mission exceeds your policy budget',403);require(a['supplies']>=cost,'Not enough Supplies',409)
            mid,seed=ident('job'),secrets.token_hex(24);history=self.receipts(c,aid);lead=self.scout_lead(history,c) if kind=='heist' else None
            repeat=c.execute('SELECT count(*) FROM missions WHERE agent=? AND kind=? AND created>?',(aid,kind,int(time.time()//86400)*86400)).fetchone()[0]
            context=dict(patrol=lead['patrol'] if lead else ('canal' if int(seed[0],16)%2 else 'gate'),scoutReceipt=lead['receiptId'] if lead else None,scoutContractReceipt=lead['contractReceiptId'] if lead else None,workshopBenefit=bool(workshop),crewSynergy=bool(synergy),gardenBenefit=bool(kind=='scout' and self.active_territory(c,aid,'garden')),ruleVersion=VERSION,repeatToday=repeat,startingAlert=a['alert'],situation=situation(kind,seed,a['alert'],lead),priorScouts=sum(r['missionType']=='scout' and r['outcome']=='SUCCESS' for r in history),brokenAgreements=sum(any(e.get('choice')=='renege' for e in r['replay']) for r in history if r['missionType']=='negotiate' and r.get('contentVersion')!='switchyard-2.0.0'),historyScope='last_50_syndicates_receipts');commit=digest(dict(seed=seed,mission=mid,version=VERSION));ev=[dict(tick=0,type='entered',text=MISSIONS[kind]['intro'],position=[3,6]),dict(tick=1,type='field_brief',text='Field signs: '+'; '.join(context['situation']['clues'])+'. District alert '+str(a['alert'])+'/4.',position=[3,6])]
            c.execute('INSERT INTO missions VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',(mid,aid,kind,'ACTIVE',0,0,cost,0,seed,commit,json.dumps(p),json.dumps(ev),time.time(),None,None,self.season(),json.dumps(context)))
            c.execute('UPDATE agents SET supplies=supplies-? WHERE id=?',(cost,aid));self.audit(c,aid,'mission.started',dict(mission=mid,kind=kind));return dict(missionId=mid)
        match=re.fullmatch(r'/api/missions/(job_[a-f0-9]+)/(?P<op>choice|withdraw|resolve)',route)
        if match:
            mid,op=match.group(1),match.group('op');m=c.execute('SELECT * FROM missions WHERE id=? AND agent=?',(mid,aid)).fetchone();require(m is not None,'Mission not found',404);m=dict(m)
            if op=='resolve':
                strict(body,[])
                if m['receipt']:return dict(receipt=self.receipt(c,m['receipt']))
                require(m['status']=='PENDING','Mission is not awaiting resolution',409);require(time.time()>=m['ready'],'Resolution is still pending',409)
                self.audit(c,aid,'resolution.returned',dict(mission=mid));return dict(receipt=self.settle(c,a,m))
            if op=='withdraw':
                strict(body,[])
                if m['receipt']:return dict(receipt=self.receipt(c,m['receipt']))
                require(m['status']=='ACTIVE','Committed missions must resolve',409)
                return dict(receipt=self.settle(c,a,m,'WITHDRAWN'))
            strict(body,['step','choice']);require(m['status']=='ACTIVE','Mission is already committed',409)
            require(type(body.get('step')) is int and body['step']==m['step'],'Stale or repeated choice',409)
            require(not p['stopped'],'Emergency stop active: withdraw or change policy',403);require(m['kind'] in p['allowed'],'Permission revoked',403)
            opt=next((o for o in self.stage(m)['options'] if o['id']==body.get('choice')),None);require(opt is not None,'Invalid choice')
            require(p['allowRisk'] or opt['score']>=0,'Risky actions disabled by policy',403)
            require(m['spent']+opt['supplies']<=min(p['maxSupplies'],json.loads(m['policy'])['maxSupplies']),'Choice exceeds mission policy budget',403)
            require(a['supplies']>=opt['supplies'] and a['intel']>=opt['intel'],'Not enough resources',409)
            ev=json.loads(m['events']);ev.append(dict(tick=len(ev)*2,type='choice',choice=opt['id'],text=opt['text'],policyHash=digest(p),supplies=opt['supplies'],intel=opt['intel'],position=[[4,5],[5,4],[7,6]][m['step']]))
            step=m['step']+1;status='PENDING' if step==3 else 'ACTIVE';ready=time.time()+self.delay if step==3 else None
            c.execute('UPDATE missions SET step=?,status=?,ready=?,score=score+?,spent=spent+?,intel_spent=intel_spent+?,events=? WHERE id=?',(step,status,ready,opt['score'],opt['supplies'],opt['intel'],json.dumps(ev),mid))
            c.execute('UPDATE agents SET supplies=supplies-?,intel=intel-? WHERE id=?',(opt['supplies'],opt['intel'],aid));self.audit(c,aid,'mission.choice',dict(mission=mid,step=step,choice=opt['id']));return dict(ok=True,status=status)
        if route=='/api/crew/create':
            strict(body,['name']);name=clean(body.get('name'));require(not self.crew(c,aid),'Already in a crew',409)
            cid,code=ident('crew'),secrets.token_hex(4).upper();c.execute('INSERT INTO crews VALUES(?,?,?,?,?,?)',(cid,name,aid,code,0,time.time()));c.execute('INSERT INTO members VALUES(?,?)',(aid,cid));self.audit(c,aid,'crew.created');return dict(ok=True)
        if route=='/api/crew/join':
            strict(body,['code']);require(not self.crew(c,aid),'Already in a crew',409);require(isinstance(body.get('code'),str),'Invalid invite')
            r=c.execute('SELECT * FROM crews WHERE code=?',(body['code'].upper(),)).fetchone();require(r is not None,'Invite not found',404)
            require(c.execute('SELECT count(*) FROM members WHERE crew=?',(r['id'],)).fetchone()[0]<5,'Crew is full',409);c.execute('INSERT INTO members VALUES(?,?)',(aid,r['id']));self.audit(c,aid,'crew.joined');return dict(ok=True)
        if route=='/api/crew/deposit':
            strict(body,['amount']);amount=integer(body.get('amount'),1,20);crew=self.crew(c,aid);require(crew is not None,'Join a crew first',409);require(a['supplies']>=amount,'Not enough Supplies',409)
            c.execute('UPDATE agents SET supplies=supplies-? WHERE id=?',(amount,aid));c.execute('UPDATE crews SET treasury=treasury+? WHERE id=?',(amount,crew['id']));self.audit(c,aid,'crew.deposit',dict(amount=amount));return dict(ok=True)
        if route=='/api/crew/claim':
            strict(body,['block']);require(body.get('block') in ['garden','workshop'],'This block cannot be claimed');crew=self.crew(c,aid);require(crew and crew['leader']==aid,'Only the crew leader can spend the treasury',403)
            require(crew['treasury']>=5,'Crew needs 5 Supplies',409)
            members=c.execute('SELECT influence,season FROM agents JOIN members ON agents.id=members.agent WHERE crew=?',(crew['id'],)).fetchall();require(sum(r['influence'] for r in members if r['season']==self.season())>=4,'Crew needs 4 seasonal Influence',409)
            old=c.execute('SELECT * FROM territory WHERE block=?',(body['block'],)).fetchone();require(not old or old['expires']<time.time() or old['season']!=self.season(),'Block is held until its upkeep expires',409)
            c.execute('INSERT OR REPLACE INTO territory VALUES(?,?,?,?)',(body['block'],crew['id'],time.time()+86400,self.season()));c.execute('UPDATE crews SET treasury=treasury-5 WHERE id=?',(crew['id'],));self.audit(c,aid,'territory.claimed',body);return dict(ok=True)
        if route=='/api/logout':
            strict(body,[]);c.execute('DELETE FROM sessions WHERE token=?',(hashlib.sha256(token.encode()).hexdigest(),));return dict(ok=True)
        raise Problem(404,'Route not found')
    def receipt(self,c,rid):
        r=c.execute('SELECT payload FROM receipts WHERE id=?',(rid,)).fetchone();require(r is not None,'Receipt not found',404);return json.loads(r[0])
    def settle(self,c,a,m,forced=None):
        spec=MISSIONS[m['kind']];context=json.loads(m.get('context','{}'));new=context.get('ruleVersion')==VERSION
        threshold=(4+int(hashlib.sha256(m['seed'].encode()).hexdigest()[:2],16)%3+int(context.get('startingAlert',0)>=2)+int(context.get('startingAlert',0)>=4)) if new else 3+int(hashlib.sha256(m['seed'].encode()).hexdigest()[:2],16)%5
        outcome=forced or ('SUCCESS' if m['score']>=threshold else 'MISS');success=outcome=='SUCCESS'
        # Rewards enter only here, in the same transaction as the unique receipt.
        legacy_rewards={'scout':4,'negotiate':5,'defend':6,'heist':9}
        base_reward=spec['reward'] if new else legacy_rewards[m['kind']]
        reward=(max(1,(base_reward+1)//2) if new and context.get('repeatToday') else base_reward) if success else (1 if outcome=='MISS' else 0)
        events=json.loads(m['events']);choices={e.get('choice') for e in events if e.get('type')=='choice'}
        if new and success and m['kind']=='heist' and 'greed' in choices and not context['situation']['pressure']:reward+=2
        garden=m['kind']=='scout' and success and bool(context.get('gardenBenefit'))
        intel=((3+int(garden)*(1+int(context.get('crewSynergy',False)))) if m['kind']=='scout' else 1) if success else 0
        influence=spec['influence'] if success and m['season']==self.season() and not(new and context.get('repeatToday')) else 0
        alert=a['alert']
        if new:
            if success and m['kind']=='scout':alert=max(0,alert-1)
            if success and m['kind']=='defend':alert=max(0,alert-2)
            if m['kind']=='heist' and 'greed' in choices:alert=min(4,alert+2)
            if outcome=='MISS' and m['kind'] in ('heist','defend'):alert=min(4,alert+1)
            context['alertAfter']=alert
        reward=max(0,min(reward,60-a['supplies']));intel=min(intel,12-a['intel'])
        rid=ident('proof');outcome_text={'SUCCESS':'Objective secured. Your decisions held.','MISS':'Recorded miss. Review the choices and try a different plan.','WITHDRAWN':'Withdrew within your authority. The attempt stays in the record.'}[outcome]
        if success and m['kind']=='scout' and {'verify','qualified'}<={e.get('choice') for e in events if e.get('type')=='choice'}:outcome_text='Verified patrol at the '+context['patrol']+'. This report opens a planned depot approach for 24 hours.'
        if success and m['kind']=='heist' and context.get('scoutReceipt'):outcome_text='Manifest secured using your earlier Scout report. The district remembers the chain of decisions.'
        if new and m['kind']=='heist' and 'greed' in choices:outcome_text+=' The extra cache raised district alert.'
        if new and m['kind']=='defend' and success:outcome_text+=' The district alert fell.'
        if new:
            events.append(dict(tick=len(events)*2,type='assessment',text='Your plan scored '+str(m['score'])+' against resistance '+str(threshold)+'. Alert '+str(context['startingAlert'])+' → '+str(alert)+'.'+(' The patrol was at the '+context['patrol']+'.' if m['kind']=='heist' and not context.get('scoutReceipt') else ''),position=[3,6]))
        events.append(dict(tick=len(events)*2,type='outcome',text=outcome_text,position=[3,6]))
        core=dict(id=rid,agentId=a['id'],missionId=m['id'],missionType=m['kind'],domain=spec['domain'],season=m['season']+1,contentVersion=context.get('ruleVersion','switchyard-1.0.0'),
                  outcome=outcome,label='SANDBOX' if a['mode']=='demo' else 'SERVICE_VERIFIED',opponentType='NPC',opponent=spec['faction'],decisionSource='HUMAN_DIRECTED_RULE_ADVISED',
                  createdAt=time.time(),policyHash=digest(json.loads(m['policy'])),seedCommitment=m['commitment'],revealedSeed=m['seed'],
                  score=m['score'],threshold=threshold,context={**context,'gardenBenefit':bool(garden)},spent=dict(supplies=m['spent'],intel=m['intel_spent']),reward=dict(supplies=reward,intel=intel,influence=influence),
                  replay=events,replayHash=digest(events))
        rh=digest(core);payload={**core,'hash':rh,'signature':b64(self.key.sign(canonical(core))),'keyId':self.key_id}
        c.execute('INSERT INTO receipts VALUES(?,?,?,?,?,?,?)',(rid,a['id'],m['id'],json.dumps(payload),rh,payload['signature'],core['createdAt']))
        c.execute('UPDATE missions SET status=?,receipt=?,events=? WHERE id=?',('RESOLVED',rid,json.dumps(events),m['id']))
        c.execute('UPDATE agents SET supplies=supplies+?,intel=intel+?,influence=influence+?,alert=? WHERE id=?',(reward,intel,influence,alert,a['id']))
        if a['mode']=='kult':c.execute('INSERT INTO outbox(receipt,payload) VALUES(?,?)',(rid,json.dumps(payload)))
        self.audit(c,a['id'],'receipt.issued',dict(receipt=rid,outcome=outcome));self.social_mission(c,payload);return payload
    def verify(self,receipt):
        try:
            core={k:v for k,v in receipt.items() if k not in ['hash','signature','keyId']}
            self.key.public_key().verify(un64(receipt['signature']),canonical(core))
            return receipt['hash']==digest(core) and receipt['replayHash']==digest(receipt['replay']) and receipt['seedCommitment']==digest(dict(seed=receipt['revealedSeed'],mission=receipt['missionId'],version=receipt['contentVersion']))
        except Exception:return False

class Handler(BaseHTTPRequestHandler):
    server_version='KULT-Syndicates/0.7.0'
    def log_message(self,fmt,*args):pass # Do not log request tokens.
    def token(self):
        auth=self.headers.get('Authorization','')
        if auth.startswith('Bearer '):return auth[7:]
        for item in self.headers.get('Cookie','').split(';'):
            if item.strip().startswith('syndicates_session='):return item.strip().split('=',1)[1]
        return ''
    def headers_common(self):
        self.send_header('X-Content-Type-Options','nosniff');self.send_header('Referrer-Policy','no-referrer');self.send_header('Cache-Control','no-store')
        self.send_header('Content-Security-Policy',"default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; worker-src 'self' blob:; frame-ancestors 'self'; object-src 'none'")
    def send(self,status,obj,token=None):
        data=canonical(obj);self.send_response(status);self.headers_common();self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(data)))
        if token is not None:self.send_header('Set-Cookie',f'syndicates_session={token}; HttpOnly; SameSite=Strict; Path={self.server.base_path or "/"}; Max-Age=86400'+('' if self.server.game.demo else '; Secure'))
        self.end_headers();self.wfile.write(data)
    def do_GET(self):self.run(False)
    def do_POST(self):self.run(True)
    def run(self,post):
        parsed=urlparse(self.path);path=parsed.path;g=self.server.game
        try:
            base=self.server.base_path
            redirect=None
            if base:
                if path==base:redirect=base+'/'
                else:
                    require(path.startswith(base+'/'),'Not found',404)
                    path=path[len(base):]
            elif path in ['/world/syndicates','/world/syndicates/']:redirect='/'
            if redirect is not None:
                self.send_response(308);self.headers_common();self.send_header('Location',redirect+('?' + parsed.query if parsed.query else ''));self.send_header('Content-Length','0');self.end_headers();return
            # Authenticated owners have independent budgets behind a shared World proxy.
            # Random/invalid tokens still share the unauthenticated IP budget.
            now=time.time()
            if path.startswith('/api/'):
                limit_key='ip:'+self.client_address[0];token=self.token()
                if token:
                    with g.db() as c:
                        valid=c.execute('SELECT agent FROM sessions WHERE token=? AND expires>?',(hashlib.sha256(token.encode()).hexdigest(),now)).fetchone()
                    if valid:limit_key='agent:'+valid['agent']
                with self.server.limit_lock:
                    q=self.server.limits[limit_key]
                    while q and q[0]<now-60:q.popleft()
                    require(len(q)<240,'Too many requests',429);q.append(now)
                    if len(self.server.limits)>10000:
                        for k in list(self.server.limits):
                            if not self.server.limits[k] or self.server.limits[k][-1]<now-60:del self.server.limits[k]
            if post:
                require(self.headers.get('Content-Type','').startswith('application/json'),'Use application/json',415)
                origin=self.headers.get('Origin');expected=self.server.public_origin
                if origin:require(origin==expected,'Origin not allowed',403)
                n=int(self.headers.get('Content-Length','0'));require(0<n<=16384,'Request body exceeds limits',413)
                try:body=json.loads(self.rfile.read(n))
                except Exception:raise Problem(400,'Invalid JSON')
                require(isinstance(body,dict),'Expected an object')
                if path=='/api/session':
                    r=g.login(body,self.token());return self.send(200,r,r['token'])
                if path=='/api/verify':
                    strict(body,['receipt']);return self.send(200,dict(valid=g.verify(body.get('receipt',{}))))
                r=g.mutate(self.token(),self.headers.get('X-CSRF-Token',''),path,body,self.headers.get('X-Request-ID',''));return self.send(200,r,'' if path=='/api/logout' else None)
            if path=='/api/health':return self.send(200,dict(ok=True,version='0.7.0-rc.1',schema=g.schema_version,demo=g.demo,storage='sqlite',basePath=self.server.base_path,godotExport=(ROOT/'web/godot/index.wasm').exists()))
            if path=='/api/state':return self.send(200,g.state(self.token()))
            if path=='/api/public-key':return self.send(200,dict(algorithm='Ed25519',keyId=g.key_id,publicKey=b64(g.pub)))
            if path.startswith('/api/receipts/'):
                # Receipts are owner-scoped; share requires an explicit export by the owner.
                with g.db() as c:
                    s=g.session(c,self.token());r=g.receipt(c,path.rsplit('/',1)[1]);require(r['agentId']==s['agent'],'Receipt not found',404);return self.send(200,r)
            if path.startswith('/api/'):raise Problem(404,'Route not found')
            rel='index.html' if path in ['/','/world/syndicates','/world/syndicates/'] else path.lstrip('/')
            f=(ROOT/'web'/rel).resolve();require(f.is_relative_to((ROOT/'web').resolve()) and f.is_file(),'Not found',404)
            require(f.suffix in ['.html','.css','.js','.json','.svg','.png','.ico','.wasm','.pck','.txt'],'Not found',404)
            data=f.read_bytes();self.send_response(200);self.headers_common();self.send_header('Content-Type', 'application/wasm' if f.suffix=='.wasm' else mimetypes.guess_type(str(f))[0] or 'application/octet-stream');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
        except Problem as e:self.send(e.status,dict(error=e.message))
        except (BrokenPipeError,ConnectionResetError):pass
        except Exception as e:
            print('Server error:',type(e).__name__,flush=True);self.send(500,dict(error='Server could not complete this request'))

def create_server(game=None,port=8787,host='127.0.0.1',base_path=None):
    import threading
    class MaintainedServer(ThreadingHTTPServer):
        def service_actions(self):
            if time.monotonic()-getattr(self,'last_sweep',0)<2:return
            self.last_sweep=time.monotonic()
            try:
                with self.game.tx() as c:self.game.social_sweep(c)
            except Exception as exc:print('Social maintenance failed:',type(exc).__name__,flush=True)
    base=(os.getenv('BASE_PATH','') if base_path is None else base_path).rstrip('/')
    require(not base or re.fullmatch(r'(?:/[A-Za-z0-9_-]+)+',base),'Invalid BASE_PATH',500)
    s=MaintainedServer((host,port),Handler);s.base_path=base;s.game=game or Game();s.limits=defaultdict(deque);s.limit_lock=threading.Lock()
    s.public_origin=os.getenv('PUBLIC_ORIGIN') or os.getenv('RENDER_EXTERNAL_URL') or f'http://localhost:{s.server_port}'
    require(s.game.demo or s.public_origin.startswith('https://'),'Production PUBLIC_ORIGIN must use HTTPS',500)
    return s
if __name__=='__main__':
    s=create_server(port=int(os.getenv('PORT','8787')),host=os.getenv('HOST','127.0.0.1'))
    print(f'KULT Syndicates running on {s.public_origin} — {"SANDBOX" if s.game.demo else "KULT gateway"}',flush=True)
    s.serve_forever()
