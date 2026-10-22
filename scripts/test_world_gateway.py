#!/usr/bin/env python3
"""Local HTTPS contract test using the real World adapter and delivery worker.
Uses generated test identities/secrets. This does not contact the live KULT host.
"""
import datetime,http.client,json,os,ssl,subprocess,sys,tempfile,threading,uuid,urllib.parse,urllib.request
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from unittest.mock import patch
from cryptography import x509
from cryptography.hazmat.primitives import hashes,serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'server'))
from app import Game,create_server,b64
from deliver import deliver_once
launch_secret='local-launch-test-'+'l'*40;callback_secret='local-callback-test-'+'c'*40
with tempfile.TemporaryDirectory(prefix='kult-gateway-test-') as tmp:
 tmp=Path(tmp);key=rsa.generate_private_key(public_exponent=65537,key_size=2048);name=x509.Name([x509.NameAttribute(NameOID.COMMON_NAME,'localhost')]);now=datetime.datetime.now(datetime.timezone.utc)
 cert=x509.CertificateBuilder().subject_name(name).issuer_name(name).public_key(key.public_key()).serial_number(x509.random_serial_number()).not_valid_before(now-datetime.timedelta(minutes=1)).not_valid_after(now+datetime.timedelta(days=1)).add_extension(x509.SubjectAlternativeName([x509.DNSName('localhost')]),critical=False).sign(key,hashes.SHA256())
 certfile=tmp/'cert.pem';keyfile=tmp/'key.pem';certfile.write_bytes(cert.public_bytes(serialization.Encoding.PEM));keyfile.write_bytes(key.private_bytes(serialization.Encoding.PEM,serialization.PrivateFormat.PKCS8,serialization.NoEncryption()))
 server_tls=ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER);server_tls.load_cert_chain(certfile,keyfile);client_tls=ssl.create_default_context(cafile=str(certfile))
 game=Game(tmp/'data',demo=False,secret=launch_secret,delay=0);public=b64(game.pub)
 def start(g,port=0):
  with patch.dict(os.environ,{'PUBLIC_ORIGIN':'https://localhost'}):s=create_server(g,port=port,base_path='/world/syndicates')
  s.public_origin=f'https://localhost:{s.server_port}';s.socket=server_tls.wrap_socket(s.socket,server_side=True);t=threading.Thread(target=s.serve_forever,daemon=True);t.start();return s,t
 service,thread=start(game);port=service.server_port;cookie='';csrf='';owner={'agent':{'id':'kult-existing-agent-fixture'}};delivery_errors=[];callbacks=[]
 class Receiver(BaseHTTPRequestHandler):
  def log_message(self,*args):pass
  def do_POST(self):
   try:
    receipt=json.loads(self.rfile.read(int(self.headers['Content-Length'])));headers={'x-syndicates-timestamp':self.headers['X-Syndicates-Timestamp'],'x-syndicates-signature':self.headers['X-Syndicates-Signature']}
    script="const fs=require('node:fs'),a=require('./integration/world-adapter.cjs');const x=JSON.parse(fs.readFileSync(0,'utf8'));const r=a.verifyDelivery(x.receipt,x.headers,x.config);const result=a.ingestIntoOwner(x.owner,r);console.log(JSON.stringify({owner:x.owner,result}));"
    r=subprocess.run(['node','-e',script],cwd=ROOT,input=json.dumps({'receipt':receipt,'headers':headers,'config':{'secret':callback_secret,'publicKey':public},'owner':owner}),text=True,capture_output=True,check=True)
    parsed=json.loads(r.stdout);owner.clear();owner.update(parsed['owner']);callbacks.append(parsed['result']);data=json.dumps({'ok':True,'receiptId':receipt['id']}).encode();self.send_response(200)
   except Exception as e:delivery_errors.append(type(e).__name__);data=b'{"ok":false}';self.send_response(400)
   self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
 receiver=ThreadingHTTPServer(('127.0.0.1',0),Receiver);receiver.socket=server_tls.wrap_socket(receiver.socket,server_side=True);rt=threading.Thread(target=receiver.serve_forever,daemon=True);rt.start()
 def request(path,body=None,expected=200):
  global cookie,csrf
  c=http.client.HTTPSConnection('localhost',port,context=client_tls,timeout=5);headers={'Content-Type':'application/json','Cookie':cookie,'X-CSRF-Token':csrf,'X-Request-ID':str(uuid.uuid4()),'Origin':f'https://localhost:{port}'}
  c.request('POST' if body is not None else 'GET','/world/syndicates/api/'+path,json.dumps(body) if body is not None else None,headers);r=c.getresponse();out=json.loads(r.read());assert r.status==expected,(path,r.status,out)
  ck=r.getheader('Set-Cookie')
  if ck:assert 'Secure' in ck;cookie=ck.split(';')[0]
  if out.get('csrf'):csrf=out['csrf']
  c.close();return out
 try:
  script="const a=require('./integration/world-adapter.cjs');const x=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(JSON.stringify(a.issueLaunch(x)));"
  launch=json.loads(subprocess.check_output(['node','-e',script],cwd=ROOT,input=json.dumps({'ownerId':'kult-owner-fixture','agent':{'id':owner['agent']['id'],'name':'AEGIS TEST'},'identityMode':'kult-gateway','secret':launch_secret,'baseUrl':f'https://localhost:{port}/world/syndicates/?embed=1'}).encode()))
  ticket=urllib.parse.parse_qs(urllib.parse.urlparse(launch['launchUrl']).fragment)['launch'][0]
  request('session',{'ticket':ticket});assert request('state')['agent']['mode']=='kult';request('session',{'ticket':ticket},409)
  for kind in ['scout','heist']:
   mid=request('missions',{'kind':kind})['missionId'];state=request('state')
   for step in range(3):
    state=request('state');stage=state['mission']['stage']['text']
    if kind=='scout':ch=('roof' if 'sweeping' in stage else 'stairs') if step==0 else ('verify' if step==1 else 'qualified')
    else:ch=({'canal':'gate','gate':'canal'}[state['operation']['lead']['patrol']] if step==0 else ('reroute' if 'drone guards' in stage else 'force') if step==1 else 'extract')
    request(f'missions/{mid}/choice',{'step':step,'choice':ch})
   receipt=request(f'missions/{mid}/resolve',{})['receipt'];assert request('verify',{'receipt':receipt})['valid']
  service.shutdown();service.server_close();thread.join();game=Game(tmp/'data',demo=False,secret=launch_secret,delay=0);service,thread=start(game,port)
  state=request('state');assert state['agent']['id']==owner['agent']['id'];assert len(state['receipts'])==2
  previous=urllib.request._opener;urllib.request.install_opener(urllib.request.build_opener(urllib.request.HTTPSHandler(context=client_tls)))
  try:
   delivered=deliver_once(game,f'https://localhost:{receiver.server_port}/receipt',callback_secret);assert len(delivered)==2 and all(x['delivered'] for x in delivered)
   assert deliver_once(game,f'https://localhost:{receiver.server_port}/receipt',callback_secret)==[]
   with game.tx() as c:c.execute("UPDATE outbox SET status='pending',next_attempt=0 WHERE receipt=?",(receipt['id'],))
   assert deliver_once(game,f'https://localhost:{receiver.server_port}/receipt',callback_secret)[0]['delivered']
  finally:urllib.request._opener=previous
  assert len(owner['agent']['syndicatesReceipts'])==2;assert callbacks[-1]['duplicate'];assert not delivery_errors
  result={'build':'0.7.0-rc.1','fixture':'local HTTPS KULT gateway; no live production endpoint contacted','signed_launch':True,'launch_replay_rejected':True,'secure_scoped_cookie':True,'linked_scout_heist':state['receipts'][0]['context']['scoutReceipt']==state['receipts'][1]['id'],'identity_and_receipts_survive_server_restart':True,'signed_callbacks_verified_by_world_adapter':len(delivered),'duplicate_delivery_deduplicated':True,'passed':True}
  assert result['linked_scout_heist'];(ROOT/'docs/GATEWAY_TEST_RESULTS.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
 finally:
  service.shutdown();service.server_close();thread.join();receiver.shutdown();receiver.server_close();rt.join()
