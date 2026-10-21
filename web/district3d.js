import * as THREE from './vendor/three.module.js';

// Presentation only. The existing server remains authoritative for every action.
const api=window.KultDistrictAPI,wrap=document.querySelector('#map-wrap'),labels=document.querySelector('#district-labels');
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let renderer;
try { renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'}); }
catch { document.body.dataset.renderer='canvas'; }
if(renderer) start();
function start(){
 let compact=matchMedia('(max-width: 700px)').matches;
 renderer.setPixelRatio(Math.min(devicePixelRatio,compact?1.25:1.6));renderer.setClearColor(0x0c1727);
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
 const canvas=renderer.domElement;canvas.className='world-canvas';canvas.tabIndex=0;canvas.setAttribute('aria-label','Switchyard 3D district. Use location buttons to select a building. Arrow keys pan; plus and minus zoom.');wrap.prepend(canvas);
 const scene=new THREE.Scene();scene.fog=new THREE.Fog(0x0c1727,34,65);
 const camera=new THREE.OrthographicCamera(-10,10,10,-10,.1,100);let zoom=1,pan=new THREE.Vector3(),size={w:0,h:0};
 const ambient=new THREE.HemisphereLight(0xbddfff,0x28243c,2.4);scene.add(ambient);
 const sun=new THREE.DirectionalLight(0xffdfbc,3);sun.position.set(-6,15,7);sun.castShadow=true;sun.shadow.mapSize.set(compact?1024:2048,compact?1024:2048);Object.assign(sun.shadow.camera,{left:-14,right:14,top:14,bottom:-14});sun.shadow.normalBias=.04;scene.add(sun);
 const rim=new THREE.DirectionalLight(0x9275ff,2);rim.position.set(8,6,-9);scene.add(rim);
 const materials=new Map();function mat(color,glow=false){const k=color+'-'+glow;if(!materials.has(k))materials.set(k,new THREE.MeshStandardMaterial({color,roughness:.75,metalness:.18,...(glow?{emissive:color,emissiveIntensity:.7}:{})}));return materials.get(k)}
 const cube=new THREE.BoxGeometry(1,1,1);
 function box(x,y,z,w,h,d,color,parent=scene,glow=false){const m=new THREE.Mesh(cube,mat(color,glow));m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
 function cylinder(x,y,z,r,h,color,parent=scene,segments=8){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,segments),mat(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
 function ring(x,y,z,r,color,parent=scene){const m=new THREE.Mesh(new THREE.TorusGeometry(r,.027,6,48),mat(color,true));m.rotation.x=-Math.PI/2;m.position.set(x,y,z);parent.add(m);return m}
 const world=new THREE.Group();scene.add(world);
 box(0,-.7,0,14.2,1.1,14.2,0x172338,world);box(0,-.12,0,14.4,.12,14.4,0x394358,world);
 // A floating district model: warm edge lights, canal rails, and routes you can read at a glance.
 for(const s of [-1,1]){box(s*7.14,-.15,0,.09,.13,14.5,0xc1a8ff,world,true);box(0,-.15,s*7.14,14.5,.13,.09,0xc1a8ff,world,true);}
 // A miniature city sits above the canal's retaining walls.
 const unit=1.4,toWorld=(x,y)=>[(x-4.5)*unit,(y-4.5)*unit];
 for(let x=0;x<10;x++)for(let y=0;y<10;y++){
  const [px,pz]=toWorld(x,y);
  if(x===4){box(px,-.12,pz,1.36,.12,1.39,0x16506a,world);continue;}
  box(px,.02,pz,1.36,.16,1.36,(x+y)%2?0x425069:0x3b4962,world);
  if(y===3||y===7){box(px,.115,pz,1.35,.035,.55,0x222e43,world);box(px,.14,pz,.20,.015,.025,0x8798a5,world);}
  if((x+y)%4===0&&x!==4){box(px-.54,.118,pz-.5,.07,.012,.22,0xc7bb8e,world);box(px-.38,.118,pz-.5,.07,.012,.22,0xc7bb8e,world);}
 }
 const [waterX]=toWorld(4,0);for(const z of [-6.9,6.9])box(waterX,-.3,z,1.4,.5,.12,0x44798b,world);
 for(const x of [waterX-.74,waterX+.74]){box(x,.17,0,.13,.36,14,0x77949b,world);box(x,.37,0,.08,.03,14,0x68cfd0,world,true)}
 for(const y of [3,7]){const [x,z]=toWorld(4,y);box(x,.3,z,2,.27,.9,0xaaa7a7,world);for(const s of [-1,1]){box(x,.59,z+s*.45,2,.07,.05,0xa4c9ce,world);for(const dx of [-.8,0,.8])box(x+dx,.44,z+s*.45,.05,.38,.05,0x8ca0ad,world);}}
 // The two crossings are the only valid paths over water; light them as usable routes.
 for(const y of [3,7]){const [x,z]=toWorld(4,y);for(const s of [-.55,.55])box(x+s,.445,z,.12,.015,.58,0xffd995,world,true);}
 const waterLines=[];for(let i=0;i<22;i++){const m=box(waterX+(i%3-1)*.28,-.035,-6.6+i*.62,.25,.012,.025,0x5bbdcc,world,true);waterLines.push(m)}
 const foundation=new THREE.Group();world.add(foundation);const buildings=[],pins=[],pulse=[];let currentBlocks='';
 function tree(x,z){cylinder(x,.48,z,.06,.65,0x60516b,world);const geo=new THREE.IcosahedronGeometry(.4,0);for(let j=0;j<2;j++){const m=new THREE.Mesh(geo,mat(j?0x69a6a1:0x365d76));m.position.set(x,.9+j*.35,z);m.scale.set(1,1.2,1);m.castShadow=true;world.add(m)}}
 for(const [x,y] of [[0,0],[0,2],[0,8],[2,0],[6,0],[9,0],[9,8],[1,9],[7,9],[9,6],[6,4]]){const [px,pz]=toWorld(x,y);tree(px,pz)}
 for(const [x,y] of [[1,3],[3,3],[6,3],[8,7],[2,7],[6,9]]){const [px,pz]=toWorld(x,y);box(px,.65,pz,.055,1.1,.055,0x667c96,world);box(px,.3,pz,.13,.25,.13,0x2c394f,world);box(px,1.22,pz,.18,.15,.18,0xffdca1,world,true)}
 for(let j=0;j<4;j++){box(-6+j*.34,.22,5.8,.26,.22,.44,0x596f89,world);box(5.5,.25,-6+j*.36,.5,.3,.25,0x72758d,world)}
 // Rail tracks and freight at the district's southern edge.
 for(const z of [6.25,6.6])box(2.8,.16,z,6.4,.06,.045,0xa4a4b5,world);
 for(let i=0;i<15;i++)box(-.3+i*.43,.12,6.43,.12,.05,.64,0x292f42,world);
 box(3.6,.53,6.4,1.8,.7,.58,0x765286,world);box(3.6,.91,6.4,1.85,.09,.64,0xb4a3c4,world);
 function build(b){
  const [x,z]=toWorld(b.x,b.y),g=new THREE.Group();g.position.set(x,0,z);foundation.add(g);
  const tint={home:0xb69ce3,scout:0x65d3e3,negotiate:0xc8df9a,heist:0xe39a77,defend:0x8fafff,territory:0xc8b387}[b.kind];
  const h=b.kind==='scout'?2.45:b.kind==='heist'?1.6:b.kind==='defend'?1.85:1.1;
  box(0,.16,0,1.65,.20,1.65,0x243248,g);box(0,.3,0,1.45,.12,1.45,0x758397,g);
  box(0,.38+h/2,0,1.23,h,1.23,b.kind==='heist'?0x55516b:0x6f7a91,g);
  box(0,.42+h,0,1.4,.14,1.4,tint,g);box(0,.51+h,0,1.15,.05,1.15,0x28374e,g);
  for(const side of [-1,1])for(let i=0;i<3;i++){
   box(-.4+i*.39,.78,.625*side,.18,.23,.025,tint,g,true);
   if(h>1.5)box(.625*side,1.5,-.4+i*.39,.025,.25,.18,tint,g,true);
  }
  box(.2,.66,.64,.3,.65,.05,0x152037,g);box(.2,1.01,.68,.4,.035,.16,tint,g,true);
  if(b.kind==='home'){box(-.25,1.7,0,.7,.6,.7,0x9b9ab1,g);box(-.25,2.03,0,.85,.12,.85,tint,g);ring(-.25,2.16,0,.25,0xc8fb80,g);}
  if(b.kind==='home'){for(const a of [-.5,.5]){box(a,1.82,.69,.12,.34,.13,0xc8fb80,g,true);box(a,.27,.95,.29,.1,.24,0x9cc08e,g)}}
  if(b.kind==='scout'){cylinder(0,3.32,0,.035,1.15,0xb8cbd9,g);const disc=cylinder(0,3.5,0,.32,.08,0xa0deea,g,16);disc.rotation.z=.4;box(0,3.9,0,.12,.12,.12,0x93edff,g,true);for(let i=0;i<3;i++){box(-.55+i*.55,2.92,.58,.31,.08,.15,0x8fdcea,g,true)}ring(0,3.98,0,.23,0x92ebf5,g);}
  if(b.kind==='negotiate'){for(const a of [-.5,.5])cylinder(a,1.85,-.3,.07,.6,0xc3d1b2,g);box(0,2.15,-.3,1.4,.1,.65,tint,g);box(0,.8,.96,1.4,.07,.6,tint,g);for(const a of [-.37,.37])box(a,2.32,.55,.25,.15,.06,0xd9e9ba,g,true);}
  if(b.kind==='heist'){for(const a of [-.4,0,.4])box(a,.95,.65,.24,.9,.08,0x30334c,g);box(.15,2.28,-.2,.66,.4,.7,0x343b54,g);ring(.15,2.5,-.2,.2,tint,g);for(const a of [-.45,.45]){box(a,.4,1.02,.41,.48,.42,0x936d6d,g);box(a,.66,1.02,.44,.07,.44,0xf0b695,g)}box(0,1.5,.65,.92,.12,.1,0xffb18b,g,true);}
  if(b.kind==='defend'){box(-.6,2.6,0,.5,.5,.65,0x818fb0,g);box(.6,2.6,0,.5,.5,.65,0x818fb0,g);box(0,2.87,0,1.9,.13,.7,tint,g);box(0,2.97,0,.8,.04,.32,0xbaccff,g,true);}
  if(b.id==='workshop'){cylinder(-.3,2.02,-.3,.16,1.1,0xb79383,g);box(.4,1.7,0,.5,.4,.6,0x43516c,g);box(.4,2.06,0,.57,.05,.65,0xffc178,g,true);for(const a of [-.32,.32])box(a,.35,.88,.36,.28,.35,0x7c6171,g);}
  if(b.id==='garden'){for(let i=0;i<4;i++){box(-.35+(i%2)*.65,1.64,-.35+Math.floor(i/2)*.65,.48,.18,.48,0x405369,g);box(-.35+(i%2)*.65,1.82,-.35+Math.floor(i/2)*.65,.38,.25,.38,0x87b99d,g);}box(0,2.04,0,.8,.04,.12,0xc8fb80,g,true);}
  const halo=ring(0,.32,0,1.05,tint,g);halo.visible=false;pulse.push({b,halo});
  g.traverse(o=>{if(o.isMesh){o.userData.block=b;buildings.push(o)}});
  const el=document.createElement('button');el.className='place-pin';el.type='button';el.dataset.location=b.id;el.style.setProperty('--pin-color','#'+tint.toString(16).padStart(6,'0'));
  const name=document.createElement('b');name.textContent=b.name;const sub=document.createElement('small');sub.textContent={home:'YOUR SAFEHOUSE',scout:'SCOUT · 1 SUPPLY',negotiate:'NEGOTIATE',heist:'HEIST',defend:'DEFEND',territory:'CREW TERRITORY'}[b.kind];el.append(name,sub);el.onclick=()=>choose(b);labels.append(el);
  const height={home:2.4,scout:4.15,negotiate:2.45,heist:2.75,defend:3.2,territory:2.5}[b.kind];pins.push({b,el,pos:new THREE.Vector3(x,height,z)});
 }
 const character=new THREE.Group();world.add(character);const pos=toWorld(3,7);character.position.set(pos[0],.25,pos[1]);
 cylinder(0,.12,0,.18,.22,0x242b44,character);box(0,.4,0,.3,.38,.22,0xdddce9,character);box(0,.74,0,.35,.3,.3,0xe1def0,character);box(0,.76,.16,.27,.12,.035,0x28354d,character);box(0,.77,.185,.18,.035,.025,0xc8fb80,character,true);box(-.22,.4,0,.1,.3,.12,0xa49cbf,character);box(.22,.4,0,.1,.3,.12,0xa49cbf,character);ring(0,.01,0,.31,0xc8fb80,character);
 const destination=ring(pos[0],.25,pos[1],.3,0xc8fb80,world);destination.visible=false;let route=[],dest=null;
 const routeInk=new THREE.LineDashedMaterial({color:0xc8fb80,dashSize:.21,gapSize:.12,transparent:true,opacity:.88,depthWrite:false});
 const routeMark=new THREE.Line(new THREE.BufferGeometry(),routeInk);routeMark.renderOrder=10;world.add(routeMark);
 function showRoute(points){routeMark.geometry.dispose();routeMark.geometry=new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(p.x,.38,p.z)));routeMark.computeLineDistances();routeMark.visible=points.length>1}
 // World clues are projections of server-owned operation state, never local rewards.
 const patrol=new THREE.Group();world.add(patrol);box(0,0,0,.45,.17,.28,0x98e8ec,patrol,true);box(-.36,-.08,0,.22,.035,.22,0xbad7ff,patrol);box(.36,-.08,0,.22,.035,.22,0xbad7ff,patrol);box(0,-.13,.16,.1,.1,.08,0xeec296,patrol,true);patrol.visible=false;
 const [canalX,canalZ]=toWorld(2,2),[depotX,depotZ]=toWorld(7,6);
 const scoutSignal=ring(canalX,.42,canalZ,1.08,0x64d6e5,world),depotSignal=ring(depotX,.42,depotZ,1.1,0xe9b48e,world);scoutSignal.visible=false;depotSignal.visible=false;
 function walkTo(b){const st=api.getState();if(!st)return;let end={x:b.x,y:b.y+1};const start={x:Math.round(character.position.x/unit+4.5),y:Math.round(character.position.z/unit+4.5)};
 const allowed=(x,y)=>x>=0&&x<10&&y>=0&&y<10&&(x!==4||y===3||y===7)&&!st.blocks.some(o=>o.x===x&&o.y===y);
 if(!allowed(end.x,end.y))end=[{x:b.x+1,y:b.y},{x:b.x-1,y:b.y},{x:b.x,y:b.y-1}].find(p=>allowed(p.x,p.y));if(!end)return;
 const key=p=>p.x+','+p.y,q=[start],parents=new Map([[key(start),null]]);let found=false;
 for(let i=0;i<q.length;i++){const p=q[i];if(key(p)===key(end)){found=true;break;}for(const [dx,dy] of [[0,1],[1,0],[0,-1],[-1,0]]){const n={x:p.x+dx,y:p.y+dy};if(allowed(n.x,n.y)&&!parents.has(key(n))){parents.set(key(n),p);q.push(n)}}}
 if(!found)return;route=[];let node=end;while(node&&key(node)!==key(start)){const [x,z]=toWorld(node.x,node.y);route.unshift(new THREE.Vector3(x,.25,z));node=parents.get(key(node))}showRoute([character.position,...route]);dest=route.shift();const [x,z]=toWorld(end.x,end.y);destination.position.set(x,.26,z);destination.visible=!!dest;
 }
 function focusOn(b){const [x,z]=toWorld(b.x,b.y);pan.set(Math.max(-4,Math.min(4,x*.42)),0,Math.max(-4,Math.min(4,z*.42)));zoom=Math.max(zoom,1.08);positionCamera();}
 function choose(b){if(b.kind==='home'||b.kind==='territory'){walkTo(b);focusOn(b)}api.select(b);}
 window.kultDistrict={visit(kind){const b=api.getState()?.blocks.find(b=>b.kind===kind);if(b){walkTo(b);focusOn(b)}},focusNext(){const b=api.getState()?.blocks.find(b=>b.id===nextId);if(b)focusOn(b)}};
 let nextId='canal',labelsDirty=true;
 function sync(){const st=api.getState();if(!st)return;const signature=JSON.stringify(st.blocks);if(!currentBlocks){st.blocks.forEach(build);currentBlocks=signature;}const lead=st.operation?.lead,territory=st.territory||[];
 const done=!!st.operation?.completedReceipt,workshop=!!st.operation?.workshop;
 nextId=st.mission?st.blocks.find(b=>b.kind===st.mission.kind)?.id||'canal':!lead?'canal':!done?'depot':!workshop?'workshop':'depot';
 const objective=st.blocks.find(b=>b.id===nextId);document.querySelector('#map-objective').textContent=st.mission?'MISSION IN PROGRESS':workshop?'WORKSHOP HELD':objective?.name?.toUpperCase()||'CANAL WATCH';document.querySelector('#map-story').textContent=st.mission?'Follow through on the current decision.':!lead?'Scout → Heist → Crew':!done?'Verified intel. The depot is ready.':!workshop?'Manifest secured. Build your crew.':'Your decisions changed this district.';
 for(const p of pins){const active=st.mission?.kind===p.b.kind||api.getSelected()===p.b.kind;p.el.classList.toggle('active',active);p.el.classList.toggle('priority',p.b.id===nextId);p.el.classList.toggle('compact',compact&&p.b.id!==nextId&&!active);p.el.classList.toggle('sighted',!!lead&&p.b.kind==='scout');p.el.classList.toggle('resolved',done&&p.b.kind==='heist');p.el.classList.toggle('held',p.b.kind==='territory'&&territory.some(t=>t.block===p.b.id));p.el.setAttribute('aria-pressed',String(active));const job=st.missions.find(m=>m.kind===p.b.kind);const sub=p.el.querySelector('small');if(job)sub.textContent=p.b.kind==='scout'&&lead?'REPORT VERIFIED':p.b.kind==='heist'&&lead?`DEPOT READY · ${job.cost} SUPPLIES`:`${job.domain.toUpperCase()} · ${job.cost} SUPPLIES`;else if(p.b.kind==='territory'){const held=territory.find(t=>t.block===p.b.id);sub.textContent=held?held.crew===st.crew?.id?'YOUR CREW HOLDS':'RIVAL CREW HOLDS':'OPEN TERRITORY';}}
  patrol.visible=!!lead;scoutSignal.visible=!!lead;depotSignal.visible=!!st.operation?.completedReceipt;
  if(lead){const [x,z]=toWorld(lead.patrol==='canal'?2:5,lead.patrol==='canal'?2:8);patrol.position.set(x,2.7,z);}
 for(const {b,halo} of pulse)halo.visible=b.id===nextId||st.mission?.kind===b.kind||api.getSelected()===b.kind;
 labelsDirty=true;
 }
 window.addEventListener('kult:state',sync);sync();
 function positionCamera(){const aspect=size.w/Math.max(1,size.h);const span=Math.max(9,9.5/aspect)/zoom;camera.left=-span*aspect;camera.right=span*aspect;camera.top=span;camera.bottom=-span;camera.position.set(17+pan.x,19,22+pan.z);camera.lookAt(pan.x,.4,pan.z);camera.updateProjectionMatrix();labelsDirty=true;}
 const observer=new ResizeObserver(()=>{const r=wrap.getBoundingClientRect();if(!r.width||!r.height)return;const wasCompact=compact;compact=matchMedia('(max-width: 700px)').matches;size={w:r.width,h:r.height};renderer.setPixelRatio(Math.min(devicePixelRatio,compact?1.25:1.6));renderer.setSize(r.width,r.height,false);positionCamera();if(wasCompact!==compact)sync();});observer.observe(wrap);
 const changeZoom=n=>{zoom=Math.max(.65,Math.min(1.65,zoom+n));positionCamera()};
 document.querySelector('#focus-next').onclick=()=>window.kultDistrict.focusNext();
 document.querySelector('#zoom-in').onclick=()=>changeZoom(.12);document.querySelector('#zoom-out').onclick=()=>changeZoom(-.12);document.querySelector('#camera-reset').onclick=()=>{zoom=1;pan.set(0,0,0);positionCamera()};
 let down=null,moved=false;const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
 function picked(e){const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);return ray.intersectObjects(buildings,false)[0]?.object.userData.block;}
 canvas.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY,px:pan.x,pz:pan.z};moved=false;canvas.setPointerCapture(e.pointerId);canvas.focus()});
 canvas.addEventListener('pointermove',e=>{if(down){const dx=e.clientX-down.x,dy=e.clientY-down.y;if(Math.hypot(dx,dy)>5)moved=true;if(moved){const f=.018/zoom;pan.x=Math.max(-5,Math.min(5,down.px-dx*f-dy*f));pan.z=Math.max(-5,Math.min(5,down.pz+dx*f-dy*f));positionCamera()}}else canvas.style.cursor=picked(e)?'pointer':'grab'});
 canvas.addEventListener('pointerup',e=>{if(down&&!moved){const b=picked(e);if(b)choose(b)}down=null;});canvas.addEventListener('pointercancel',()=>down=null);
 canvas.addEventListener('wheel',e=>{e.preventDefault();changeZoom(e.deltaY<0?.05:-.05)},{passive:false});
 canvas.addEventListener('keydown',e=>{const deltas={ArrowLeft:[-.5,.5],ArrowRight:[.5,-.5],ArrowUp:[-.5,-.5],ArrowDown:[.5,.5]};if(deltas[e.key]){e.preventDefault();pan.x=Math.max(-5,Math.min(5,pan.x+deltas[e.key][0]));pan.z=Math.max(-5,Math.min(5,pan.z+deltas[e.key][1]));positionCamera()}else if(['+','=','-','0'].includes(e.key)){e.preventDefault();if(e.key==='0'){zoom=1;pan.set(0,0,0);positionCamera()}else changeZoom(e.key==='-'?-.12:.12)}});
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();window.kult3dActive=false;document.body.classList.remove('three-ready');canvas.style.display='none';labels.style.display='none';document.body.dataset.renderer='canvas';});
 window.kult3dActive=true;document.body.classList.add('three-ready');document.body.dataset.renderer='three';
 let prev=0,elapsed=0;const projected=new THREE.Vector3();
 function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-prev)/1000,.04);prev=now;if(document.hidden||!window.kult3dActive||api.getTab()!=='district'||wrap.classList.contains('hidden')||!api.getState())return;elapsed+=dt;
  if(dest){const dist=character.position.distanceTo(dest);if(dist<.05){character.position.copy(dest);dest=route.shift();if(!dest){destination.visible=false;routeMark.visible=false;}}else{character.position.lerp(dest,Math.min(1,dt*2.8/dist));character.rotation.y=Math.atan2(dest.x-character.position.x,dest.z-character.position.z);}}
  if(!reduced){waterLines.forEach((m,i)=>m.position.z=-6.6+((i*.62+elapsed*.16)%13.2));destination.scale.setScalar(1+Math.sin(elapsed*3)*.12);if(patrol.visible){patrol.position.y=2.7+Math.sin(elapsed*2)*.12;patrol.rotation.y=elapsed*.8;scoutSignal.scale.setScalar(1+Math.sin(elapsed*2)*.055);}}
  renderer.render(scene,camera);
  if(labelsDirty){for(const p of pins){p.el.querySelector('b').textContent=size.w<500?({home:'Safehouse',canal:'Canal watch',commons:'Union',depot:'Depot',gate:'Gate',workshop:'Workshop',garden:'Garden'}[p.b.id]):p.b.name;p.el.setAttribute('aria-label',p.b.name+(p.b.id===nextId?', next stop':''));projected.copy(p.pos).project(camera);p.el.style.left=((projected.x+1)*.5*size.w)+'px';p.el.style.top=((-projected.y+1)*.5*size.h)+'px';p.el.style.visibility=Math.abs(projected.x)>1.1||Math.abs(projected.y)>1.1?'hidden':'visible';}labelsDirty=false;}
 }
 requestAnimationFrame(frame);
}
