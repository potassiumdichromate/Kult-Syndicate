#!/usr/bin/env python3
"""Independent Ed25519 verifier. Usage: python scripts/verify_receipt.py receipt.json public-key.json"""
import base64,hashlib,json,sys
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
r=json.load(open(sys.argv[1]));pub=json.load(open(sys.argv[2]));core={k:v for k,v in r.items() if k not in ['hash','signature','keyId']}
def canon(v):return json.dumps(v,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()
def h(v):return hashlib.sha256(canon(v)).hexdigest()
def un64(s):return base64.urlsafe_b64decode(s+'='*((4-len(s)%4)%4))
Ed25519PublicKey.from_public_bytes(un64(pub['publicKey'])).verify(un64(r['signature']),canon(core))
assert r['hash']==h(core),'Receipt hash mismatch'
assert r['replayHash']==h(r['replay']),'Replay hash mismatch'
assert r['seedCommitment']==h(dict(seed=r['revealedSeed'],mission=r['missionId'],version=r['contentVersion'])),'Seed commitment mismatch'
print('VALID: Ed25519 signature, receipt hash, replay hash and seed commitment. Trust the issuer key separately.')
