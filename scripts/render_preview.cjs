// Renders the actual Canvas fallback draw function; this is not a browser screenshot.
const fs=require('node:fs'),vm=require('node:vm'),cp=require('node:child_process'),assert=require('node:assert/strict');
const {createCanvas}=require('@napi-rs/canvas');
const source=fs.readFileSync('web/app.js','utf8');
const drawing=source.slice(source.indexOf('const canvas=$(\'#map\')'),source.indexOf("canvas.addEventListener('click'"));
const blocks=JSON.parse(cp.execFileSync('python3',['-c','import sys,json;sys.path.insert(0,"server");from content import BLOCKS;print(json.dumps(BLOCKS))'],{encoding:'utf8'}));
const canvas=createCanvas(1340,840);canvas.getBoundingClientRect=()=>({width:1340,height:840});
const sandbox={state:{blocks,mission:null},selectedJob:null,tab:'district',godot:false,innerWidth:1440,devicePixelRatio:1,requestAnimationFrame:()=>{},$:s=>s==='#map'?canvas:{classList:{contains:()=>false}},console};
vm.createContext(sandbox);vm.runInContext(drawing+"\ndraw(16);routeTo(7,6);globalThis.walkRoute=[target,...route];",sandbox);
for(const p of sandbox.walkRoute){assert.ok(p.x!==4||p.y===3||p.y===7,'Path must cross a bridge');assert.ok(!blocks.some(b=>b.x===p.x&&b.y===p.y),'Path must avoid buildings')}
assert.deepEqual(JSON.parse(JSON.stringify(sandbox.walkRoute.at(-1))),{x:7,y:7});
fs.mkdirSync('docs',{recursive:true});fs.writeFileSync('docs/district-preview.png',canvas.toBuffer('image/png'));console.log('Canvas render and navigation around buildings/canal: PASS');
