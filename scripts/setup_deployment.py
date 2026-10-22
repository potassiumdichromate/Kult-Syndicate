#!/usr/bin/env python3
"""Prepare a new deployment. Never replaces existing config or signing material."""
import argparse,base64,os,re,secrets
from pathlib import Path
from urllib.parse import urlparse
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives import serialization
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--origin',required=True);p.add_argument('--callback',required=True);p.add_argument('--secrets-dir',required=True);p.add_argument('--base-path',default='/world/syndicates');p.add_argument('--env-file',default=str(ROOT/'.env'));a=p.parse_args()
origin=urlparse(a.origin);callback=urlparse(a.callback)
if origin.scheme!='https' or not origin.netloc or origin.path not in ('','/') or origin.query or origin.fragment or origin.username:p.error('--origin must be an HTTPS origin without a path or credentials')
if callback.scheme!='https' or not callback.netloc or callback.username or callback.fragment:p.error('--callback must be an HTTPS endpoint without credentials or a fragment')
base=a.base_path.rstrip('/')
if base and not re.fullmatch(r'(?:/[A-Za-z0-9_-]+)+',base):p.error('Invalid --base-path')
folder=Path(a.secrets_dir).expanduser().resolve();env=Path(a.env_file).expanduser().resolve()
if not env.parent.is_dir():p.error('Environment output directory does not exist')
if any('\n' in x or '\r' in x or "'" in x for x in [str(folder),str(env),a.origin,a.callback]):p.error('Paths and URLs cannot contain newlines or single quotes')
if folder.exists() and any(folder.iterdir()):p.error('Use a new or empty private secrets directory')
if env.exists():p.error('Environment file already exists; edit it intentionally instead of regenerating keys')
if folder==ROOT or ROOT in folder.parents:p.error('Put secrets outside this project checkout')
files={n:folder/n for n in ['launch.txt','callback.txt','receipt-signing-key.pem']}
if any(x.exists() for x in files.values()):p.error('A secret file already exists. Existing keys will not be replaced')
folder.mkdir(parents=True,exist_ok=True);folder.chmod(0o700)
key=Ed25519PrivateKey.generate()
values={'launch.txt':secrets.token_urlsafe(48).encode(),'callback.txt':secrets.token_urlsafe(48).encode(),'receipt-signing-key.pem':key.private_bytes(serialization.Encoding.PEM,serialization.PrivateFormat.PKCS8,serialization.NoEncryption())}
for name,data in values.items():
 fd=os.open(files[name],os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600)
 with os.fdopen(fd,'wb') as f:f.write(data)
 # Private parent directory protects the host; bind-mounted files are readable by UID 10001.
 files[name].chmod(0o444)
config={'PUBLIC_ORIGIN':a.origin.rstrip('/'),'BASE_PATH':base,'SYNDICATES_LAUNCH_SECRET_FILE':str(files['launch.txt']),'SYNDICATES_CALLBACK_SECRET_FILE':str(files['callback.txt']),'SYNDICATES_SIGNING_KEY_FILE':str(files['receipt-signing-key.pem']),'KULT_WORLD_RECEIPT_URL':a.callback}
if any('\n' in x or '\r' in x or "'" in x for x in config.values()):p.error('Paths and URLs cannot contain newlines or single quotes')
fd=os.open(env,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600)
with os.fdopen(fd,'w') as f:f.write('\n'.join(f"{k}='{v}'" for k,v in config.items())+'\n')
public=base64.urlsafe_b64encode(key.public_key().public_bytes(serialization.Encoding.Raw,serialization.PublicFormat.Raw)).rstrip(b'=').decode()
print('Created environment file:',env);print('Private secrets directory:',folder);print('Pin this public key in KULT World:',public);print('Launch URL:',a.origin.rstrip('/')+base+'/?embed=1');print('Next: configure the World adapter and HTTPS proxy, then docker compose up -d --build')
