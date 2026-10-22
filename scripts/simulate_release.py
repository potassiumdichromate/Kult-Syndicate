#!/usr/bin/env python3
"""Reproducible scripted play on the real SQLite game. Not observed user retention or autonomous AI."""
import collections,json,random,sys,tempfile,time,uuid
from datetime import datetime,timezone
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'server'))
from app import Game

rng=random.Random(62021);started=time.monotonic()
styles=['reader','opportunist','random'];by_style={x:collections.Counter() for x in styles};sessions=[];receipts=[]

def decision(m,style):
 kind,step,text=m['kind'],m['step'],m['stage']['text']
 if style=='random':return rng.choice(m['stage']['options'])['id']
 if kind=='scout':return ('roof' if 'sweeping' in text else 'stairs') if step==0 else 'verify' if step==1 else 'qualified'
 if kind=='heist':
  if step==0:return {'canal':'gate','gate':'canal'}[m['context']['patrol']] if m['context'].get('scoutReceipt') else rng.choice(['gate','canal'])
  if step==1:return 'reroute' if 'drone guards' in text else 'force'
  return 'greed' if style=='opportunist' else 'extract'
 if kind=='negotiate':return ('bounded' if 'repairs' in text else 'vague') if step==0 else ('limited' if 'urgent' in text else 'bluff') if step==1 else ('honor' if 'closing' in text else 'renege')
 return ('canal' if 'canal' in text else 'gate') if step==0 else ('observe' if 'time to identify' in text else 'rush') if step==1 else ('archive' if 'decoy' in text else 'chase')

with tempfile.TemporaryDirectory(prefix='kult-dynamics-') as data:
 game=Game(data,demo=True,delay=0)
 def call(s,path,body=None):return game.mutate(s['token'],s['csrf'],path,body or {},str(uuid.uuid4()))
 for i in range(90):
  style=styles[i%3];stats=by_style[style];s=game.login({});sessions.append(s)
  for kind in ['scout','heist','heist','negotiate','defend']:
   st=game.state(s['token'])
   if st['agent']['supplies']<5 and not stats.get('resupplies_'+s['agent']['id']):
    call(s,'/api/resupply');stats['resupplies_'+s['agent']['id']]=1
   st=game.state(s['token']);job=next(m for m in st['missions'] if m['kind']==kind)
   if st['agent']['supplies']<job['cost']:stats['insufficient_budget']+=1;continue
   mid=call(s,'/api/missions',{'kind':kind})['missionId'];stats['missions_started']+=1
   m=game.state(s['token'])['mission']
   if kind=='heist' and not m['context'].get('scoutReceipt'):assert 'patrol' not in m['context']
   for step in range(3):
    st=game.state(s['token']);m=st['mission'];a=st['agent'];choice=decision(m,style)
    available=[o for o in m['stage']['options'] if a['supplies']>=o['supplies'] and a['intel']>=o['intel'] and m['spent']+o['supplies']<=min(a['policy']['maxSupplies'],m['policy']['maxSupplies'])]
    if not available:r=call(s,f'/api/missions/{mid}/withdraw')['receipt'];break
    if not any(o['id']==choice for o in available):choice=available[0]['id']
    call(s,f'/api/missions/{mid}/choice',{'step':step,'choice':choice})
   else:r=call(s,f'/api/missions/{mid}/resolve')['receipt']
   assert game.verify(r);receipts.append(r);stats[r['outcome']]+=1;stats['supply_rewards']+=r['reward']['supplies'];stats['influence_rewards']+=r['reward']['influence'];stats['alert_peak']=max(stats['alert_peak'],game.state(s['token'])['agent']['alert'])
   if r['context'].get('repeatToday'):stats['repeated']+=1
   if kind=='heist' and 'greed' in [e.get('choice') for e in r['replay']]:stats['cache_attempts']+=1
   assert call(s,f'/api/missions/{mid}/resolve')['receipt']==r
   assert min(game.state(s['token'])['agent'][k] for k in ('supplies','intel','influence','alert'))>=0
 restored=Game(data,demo=True,delay=0)
 for s in sessions:
  st=restored.state(s['token']);assert st['agent']['id']==s['agent']['id']
  for r in st['receipts']:assert restored.verify(r)
 results={}
 for style,stats in by_style.items():
  final=[restored.state(s['token'])['agent'] for i,s in enumerate(sessions) if styles[i%3]==style]
  results[style]={k:v for k,v in stats.items() if not k.startswith('resupplies_')}
  results[style].update(agents=30,average_final_supplies=round(sum(a['supplies'] for a in final)/30,2),average_final_alert=round(sum(a['alert'] for a in final)/30,2),success_rate=round(stats['SUCCESS']/max(1,stats['missions_started']),3))
 result={'build':'0.7.0-rc.1','run_at':datetime.now(timezone.utc).isoformat(),'kind':'scripted choices on the real rule engine; not observed users, retention, autonomous AI, or investment outcomes','seed':62021,'agents':90,'signed_receipts_verified':len(receipts),'styles':results,'passed':True,'elapsed_seconds':round(time.monotonic()-started,2)}
 output=ROOT/'docs/SIMULATION_RESULTS.json';output.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
