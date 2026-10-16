#!/usr/bin/env python3
"""Deliver verified receipts from a durable outbox. Run as a separate supervised worker."""
import hashlib,hmac,json,os,time,urllib.request,urllib.error
from app import Game,canonical
from secrets_config import secret_value

def deliver_once(game,url,secret):
 if len(secret)<32:raise RuntimeError('Set KULT_SYNDICATES_CALLBACK_SECRET (32+ chars)')
 if not url.startswith('https://') and not game.demo:raise RuntimeError('Production callback requires HTTPS')
 with game.db() as c: rows=c.execute("SELECT * FROM outbox WHERE status='pending' AND next_attempt<=? ORDER BY next_attempt,receipt LIMIT 10",(time.time(),)).fetchall()
 results=[]
 for row in rows:
  body=canonical(json.loads(row['payload']));ts=str(int(time.time()));sig=hmac.new(secret.encode(),(ts+'\n'+hashlib.sha256(body).hexdigest()).encode(),hashlib.sha256).hexdigest()
  accepted=False;retry_after=0
  try:
   request=urllib.request.Request(url,data=body,headers={'Content-Type':'application/json','X-Syndicates-Timestamp':ts,'X-Syndicates-Signature':sig},method='POST')
   with urllib.request.urlopen(request,timeout=12) as response:
    result=json.loads(response.read(16384));accepted=response.status==200 and result.get('ok') is True and result.get('receiptId')==row['receipt']
  except urllib.error.HTTPError as error:
   if error.code==429:
    try:retry_after=max(0,min(3600,int(error.headers.get('Retry-After','0'))))
    except (ValueError,TypeError,AttributeError):pass
  except Exception:accepted=False
  backoff=min(3600,15*2**min(row['attempts'],8))
  due=0 if accepted else time.time()+max(backoff,retry_after)
  with game.tx() as c:c.execute('UPDATE outbox SET attempts=attempts+1,status=?,next_attempt=? WHERE receipt=? AND status=?',('delivered' if accepted else 'pending',due,row['receipt'],'pending'))
  results.append(dict(receipt=row['receipt'],delivered=accepted))
 return results
if __name__=='__main__':
 game=Game();url=os.environ['KULT_WORLD_RECEIPT_URL'];secret=secret_value('KULT_SYNDICATES_CALLBACK_SECRET')
 while True:
  print(json.dumps(deliver_once(game,url,secret)),flush=True);time.sleep(15)
