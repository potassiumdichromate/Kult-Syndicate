"""Externalize Godot's generated bootstrap to retain a strict script CSP."""
import re
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'web/godot'
p=root/'index.html'
s=p.read_text();counter=0
def externalize(match):
 global counter
 attrs,body=match.groups()
 if re.search(r'\bsrc\s*=',attrs) or not body.strip():return match.group(0)
 counter+=1;name=f'bootstrap-{counter}.js';(root/name).write_text(body)
 return f'<script src="{name}"></script>'
p.write_text(re.sub(r'<script([^>]*)>(.*?)</script>',externalize,s,flags=re.S))
print(f'Externalized {counter} bootstrap script(s).')
