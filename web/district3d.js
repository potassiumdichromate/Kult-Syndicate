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
 const camera=new THREE.OrthographicCamera(-10,10,10,-10,.1,100);let zoom=1,pan=new THREE.Vector3(),size={w:0,h:0},cameraGoal=null,labelsEnabled=true,labelsOverride=false,denseMap=false,quality=compact?'low':'balanced';
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
 const leaders=document.createElementNS('http://www.w3.org/2000/svg','svg');leaders.classList.add('pin-leaders');leaders.setAttribute('aria-hidden','true');labels.prepend(leaders);
 function tree(x,z){x+=.38;z+=.38;cylinder(x,.48,z,.06,.65,0x60516b,world);const geo=new THREE.IcosahedronGeometry(.4,0);for(let j=0;j<2;j++){const m=new THREE.Mesh(geo,mat(j?0x69a6a1:0x365d76));m.position.set(x,.9+j*.35,z);m.scale.set(1,1.2,1);m.castShadow=true;world.add(m)}}
 for(const [x,y] of [[0,0],[0,2],[0,8],[2,0],[6,0],[9,0],[9,8],[1,9],[7,9],[9,6],[6,4]]){const [px,pz]=toWorld(x,y);tree(px,pz)}
 for(const [x,y] of [[1,3],[3,3],[6,3],[8,7],[2,7],[6,9]]){const [px,pz]=toWorld(x,y);box(px,.65,pz,.055,1.1,.055,0x667c96,world);box(px,.3,pz,.13,.25,.13,0x2c394f,world);box(px,1.22,pz,.18,.15,.18,0xffdca1,world,true)}
 for(let j=0;j<4;j++){box(-6+j*.34,.22,5.8,.26,.22,.44,0x596f89,world);box(5.5,.25,-6+j*.36,.5,.3,.25,0x72758d,world)}
 // Rail tracks and freight at the district's southern edge.
 for(const z of [6.25,6.6])box(2.8,.16,z,6.4,.06,.045,0xa4a4b5,world);
 for(let i=0;i<15;i++)box(-.3+i*.43,.12,6.43,.12,.05,.64,0x292f42,world);
 box(3.6,.53,6.4,1.8,.7,.58,0x765286,world);box(3.6,.91,6.4,1.85,.09,.64,0xb4a3c4,world);
 // Hand-built silhouettes make the district navigable without reading every label.
 function build(b){
  const [x,z]=toWorld(b.x,b.y),g=new THREE.Group();g.position.set(x,0,z);foundation.add(g);
  const tint={home:0xc3a7ee,scout:0x70dfdf,negotiate:0xc4d995,heist:0xeaa37f,defend:0x94b7f4,territory:0xd8ba8c}[b.kind];
  const wall=0x77869b,shade=0x35435e;
  box(0,.17,0,1.8,.2,1.8,0x25364b,g);box(0,.3,0,1.65,.08,1.65,0x8793a0,g);
  function windows(w,y,z){for(let i=0;i<3;i++)box((i-1)*w,y,z,.18,.25,.025,tint,g,true)}
  function roof(y,w,d,color=tint){box(0,y,0,w,.12,d,color,g)}
  function door(x=.2,z=.66){box(x,.65,z,.3,.64,.06,0x172438,g);box(x,1.0,z+.035,.4,.04,.14,tint,g,true)}
  if(b.kind==='home'){
   box(0,.9,0,1.4,1.15,1.35,wall,g);roof(1.51,1.65,1.55);windows(.39,1.08,.69);door();
   const roofMesh=new THREE.Mesh(new THREE.ConeGeometry(1.06,.5,4),mat(0x74739e));roofMesh.rotation.y=Math.PI/4;roofMesh.position.y=1.82;g.add(roofMesh);
   cylinder(-.4,2.05,-.2,.14,.5,0xa6b39e,g);box(-.4,2.35,-.2,.3,.34,.3,0xc8fb80,g,true);roof(2.56,.38,.38,0xb6c99d);
   for(const a of [-.65,.65]){box(a,.4,.9,.24,.25,.24,0x6b7d7b,g);box(a,.6,.9,.3,.22,.3,0x83b7a5,g)}
  }else if(b.kind==='scout'){
   box(0,1.42,0,.92,2.13,.92,wall,g);roof(2.51,1.22,1.22);box(0,2.74,0,1.05,.35,1.05,shade,g);roof(2.96,1.28,1.28);
   for(const y of [1.0,1.65,2.25]){windows(.28,y,.47);for(const z of [-.25,.25])box(.47,y,z,.025,.32,.15,0x8be4e8,g,true)}
   cylinder(0,3.3,0,.035,.62,0xc1dce1,g);const dish=cylinder(0,3.52,0,.34,.07,0xb0e1e2,g,24);dish.rotation.z=.4;
   box(0,3.86,0,.1,.1,.1,0xa8ffff,g,true);ring(0,3.95,0,.21,0x9af8ed,g);door(0,.49);
  }else if(b.kind==='negotiate'){
   cylinder(0,.93,0,.68,1.16,wall,g,12);cylinder(0,1.56,0,.85,.16,tint,g,12);cylinder(0,1.68,0,.68,.08,shade,g,12);
   for(const x of [-.55,.55]){cylinder(x,.99,.55,.065,1.2,0xd5d9bc,g);box(x,.42,.9,.3,.12,.28,0x9caa8e,g)}
   box(0,1.65,.55,1.48,.11,.7,tint,g);box(0,.65,.68,.35,.63,.07,0x263349,g);box(0,1.2,.69,.34,.2,.03,tint,g,true);
   cylinder(0,1.92,0,.27,.44,0x818b95,g);ring(0,2.18,0,.3,0xd9efac,g);
  }else if(b.kind==='heist'){
   box(0,.92,0,1.65,1.12,1.28,0x726d82,g);roof(1.54,1.88,1.47);box(0,1.67,0,1.7,.15,.55,shade,g);
   for(const x of [-.52,0,.52]){box(x,.87,.66,.4,.88,.06,0x303b50,g);box(x,1.29,.7,.34,.05,.05,tint,g,true)}
   box(-.8,1.55,-.68,.12,2.4,.12,0xc2a58d,g);box(.8,1.55,-.68,.12,2.4,.12,0xc2a58d,g);box(0,2.74,-.68,1.85,.13,.18,tint,g);
   box(.32,2.4,-.68,.025,.55,.025,0xaaaeb7,g);box(.32,2.09,-.68,.13,.13,.13,0xf0bc82,g);
   for(const x of [-.6,.5]){box(x,.49,1.0,.4,.35,.42,0x9d7f71,g);box(x,.68,1.0,.44,.055,.46,0xe8b08a,g)}
  }else if(b.kind==='defend'){
   for(const x of [-.57,.57]){box(x,1.12,0,.55,1.55,.95,wall,g);box(x,1.95,0,.72,.16,1.12,tint,g);box(x,1.39,.49,.3,.35,.03,tint,g,true)}
   box(0,2.18,0,1.9,.32,.7,0x657b9b,g);box(0,2.39,.2,1.5,.07,.09,0x9fc7ff,g,true);box(0,.35,.65,.65,.08,.18,tint,g);
   for(const x of [-.22,.22])box(x,.77,.58,.06,.75,.06,0xb3c4d7,g);
  }else if(b.id==='workshop'){
   box(0,.88,0,1.5,1.05,1.4,0x877a89,g);roof(1.46,1.7,1.55);door(.3,.73);
   for(const x of [-.45,.25]){const tooth=box(x,1.65,0,.62,.1,1.38,0x8199ae,g);tooth.rotation.z=.27;box(x+.25,1.57,.71,.12,.23,.04,0xffd49a,g,true)}
   cylinder(-.52,1.95,-.4,.18,1.6,0xaa8172,g);cylinder(-.52,2.8,-.4,.23,.1,tint,g);box(.5,1.84,-.35,.4,.5,.46,shade,g);
   box(-.5,.51,.93,.48,.35,.35,0x4b6579,g);box(-.5,.72,.93,.55,.06,.4,0xe7bd83,g,true);
  }else{
   box(0,.65,0,1.5,.55,1.4,wall,g);roof(.98,1.7,1.58,0x9ec5ad);
   const glass=new THREE.MeshStandardMaterial({color:0x86d8d0,transparent:true,opacity:.5,roughness:.25,metalness:.1});
   const greenhouse=new THREE.Mesh(cube,glass);greenhouse.position.set(0,1.45,-.15);greenhouse.scale.set(1.05,.82,.85);g.add(greenhouse);
   for(const x of [-.55,0,.55]){box(x,1.45,-.6,.04,.92,.04,0xb4d5c1,g);box(x,1.45,.3,.04,.92,.04,0xb4d5c1,g);box(x,1.92,-.15,.04,.05,.97,0xb4d5c1,g)}
   for(let i=0;i<3;i++){box((i-1)*.48,1.12,.58,.36,.18,.3,0x4a6867,g);box((i-1)*.48,1.32,.58,.28,.26,.25,0x9ac28d,g)}
   roof(1.93,1.22,.05,0xb4d5c1);door(.2,.73);
  }
  const halo=ring(0,.36,0,1.08,tint,g);halo.visible=false;pulse.push({b,halo});
  g.traverse(o=>{if(o.isMesh){o.userData.block=b;buildings.push(o)}});
  const el=document.createElement('button');el.className='place-pin';el.type='button';el.dataset.location=b.id;el.style.setProperty('--pin-color','#'+tint.toString(16).padStart(6,'0'));
  const glyph=document.createElement('span');glyph.className='pin-glyph';glyph.setAttribute('aria-hidden','true');glyph.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">'+({home:'<path d="M3 11 12 3l9 8v10H3zM9 21v-8h6v8"/>',scout:'<circle cx="12" cy="12" r="6"/><path d="M12 1v6m0 10v6M1 12h6m10 0h6"/>',negotiate:'<path d="m12 2 10 10-10 10L2 12z"/>',heist:'<path d="M5 19 19 5M5 5h14v14"/>',defend:'<path d="M5 3h14v13l-7 5-7-5zM9 10l3 3 4-5"/>',territory:'<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/>'}[b.kind])+'</svg>';
  const copy=document.createElement('span');copy.className='pin-copy';const name=document.createElement('b');name.textContent=b.name;const sub=document.createElement('small');sub.textContent=b.kind==='home'?'SAFEHOUSE':'OPEN LOCATION';copy.append(name,sub);el.append(glyph,copy);el.onclick=()=>choose(b);labels.append(el);
  const height={home:2.8,scout:4.15,negotiate:2.4,heist:2.95,defend:2.65,territory:b.id==='workshop'?3:2.2}[b.kind];const leader=document.createElementNS('http://www.w3.org/2000/svg','line');leaders.append(leader);pins.push({b,el,leader,pos:new THREE.Vector3(x,height,z)});
 }
 const character=new THREE.Group();world.add(character);const pos=toWorld(3,7);character.position.set(pos[0],.25,pos[1]);
 cylinder(0,.12,0,.18,.22,0x242b44,character);box(0,.4,0,.3,.38,.22,0xdddce9,character);box(0,.74,0,.35,.3,.3,0xe1def0,character);box(0,.76,.16,.27,.12,.035,0x28354d,character);box(0,.77,.185,.18,.035,.025,0xc8fb80,character,true);box(-.22,.4,0,.1,.3,.12,0xa49cbf,character);box(.22,.4,0,.1,.3,.12,0xa49cbf,character);ring(0,.01,0,.31,0xc8fb80,character);
 const destination=ring(pos[0],.25,pos[1],.3,0xc8fb80,world);destination.visible=false;let route=[],dest=null;
 const routeInk=new THREE.LineDashedMaterial({color:0xc8fb80,dashSize:.21,gapSize:.12,transparent:true,opacity:.88,depthWrite:false});
 const routeMark=new THREE.Line(new THREE.BufferGeometry(),routeInk);routeMark.renderOrder=10;world.add(routeMark);
 function showRoute(points){routeMark.geometry.dispose();routeMark.geometry=new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(p.x,.49,p.z)));routeMark.computeLineDistances();routeMark.visible=points.length>1}
 // World clues are projections of server-owned operation state, never local rewards.
 const patrol=new THREE.Group();world.add(patrol);box(0,0,0,.45,.17,.28,0x98e8ec,patrol,true);box(-.36,-.08,0,.22,.035,.22,0xbad7ff,patrol);box(.36,-.08,0,.22,.035,.22,0xbad7ff,patrol);box(0,-.13,.16,.1,.1,.08,0xeec296,patrol,true);patrol.visible=false;
 const [canalX,canalZ]=toWorld(2,2),[depotX,depotZ]=toWorld(7,6);
 const scoutSignal=ring(canalX,.42,canalZ,1.08,0x64d6e5,world),depotSignal=ring(depotX,.42,depotZ,1.1,0xe9b48e,world);scoutSignal.visible=false;depotSignal.visible=false;
 function walkTo(b){const st=api.getState();if(!st)return;let end={x:b.x,y:b.y+1};const start={x:Math.round(character.position.x/unit+4.5),y:Math.round(character.position.z/unit+4.5)};
 const allowed=(x,y)=>x>=0&&x<10&&y>=0&&y<10&&(x!==4||y===3||y===7)&&!st.blocks.some(o=>o.x===x&&o.y===y);
 if(!allowed(end.x,end.y))end=[{x:b.x+1,y:b.y},{x:b.x-1,y:b.y},{x:b.x,y:b.y-1}].find(p=>allowed(p.x,p.y));if(!end)return;
 const key=p=>p.x+','+p.y,q=[start],parents=new Map([[key(start),null]]);let found=false;
 for(let i=0;i<q.length;i++){const p=q[i];if(key(p)===key(end)){found=true;break;}for(const [dx,dy] of [[0,1],[1,0],[0,-1],[-1,0]]){const n={x:p.x+dx,y:p.y+dy};if(allowed(n.x,n.y)&&!parents.has(key(n))){parents.set(key(n),p);q.push(n)}}}
 if(!found)return;route=[];let node=end;while(node&&key(node)!==key(start)){const [x,z]=toWorld(node.x,node.y);route.unshift(new THREE.Vector3(x,node.x===4?.46:.25,z));node=parents.get(key(node))}showRoute([character.position,...route]);dest=route.shift();const [x,z]=toWorld(end.x,end.y);destination.position.set(x,.26,z);destination.visible=!!dest;document.querySelector('#map-arrival').textContent='EN ROUTE · '+b.name.toUpperCase();
 }
 function focusOn(b){const [x,z]=toWorld(b.x,b.y);cameraGoal={x:x*.42,z:z*.42,zoom:Math.max(zoom,1.08)};if(reduced){pan.set(cameraGoal.x,0,cameraGoal.z);zoom=cameraGoal.zoom;cameraGoal=null;positionCamera();}}
 function choose(b){if(b.kind==='home'||b.kind==='territory'){walkTo(b);focusOn(b)}api.select(b);}
 window.kultDistrict={visit(kind){const b=api.getState()?.blocks.find(b=>b.kind===kind);if(b){walkTo(b);focusOn(b)}},focusNext(){const b=api.getState()?.blocks.find(b=>b.id===nextId);if(b)focusOn(b)}};
 let nextId='canal',labelsDirty=true;
 function sync(){const st=api.getState();if(!st)return;const signature=JSON.stringify(st.blocks);if(!currentBlocks){st.blocks.forEach(build);currentBlocks=signature;}const lead=st.operation?.lead,territory=st.territory||[];
 const done=!!lead&&!!st.operation?.completedReceipt&&st.receipts.some(r=>r.id===st.operation.completedReceipt&&r.context?.scoutReceipt===lead.receiptId),workshop=!!st.operation?.workshop;
 nextId=st.mission?st.blocks.find(b=>b.kind===st.mission.kind)?.id||'canal':!lead?'canal':!done?'depot':!workshop?'workshop':'depot';
 const objective=st.blocks.find(b=>b.id===nextId);document.querySelector('#map-objective').textContent=st.mission?'MISSION IN PROGRESS':done&&workshop?'WORKSHOP HELD':objective?.name?.toUpperCase()||'CANAL WATCH';const alert=st.agent.alert||0;wrap.dataset.alert=String(alert);rim.color.setHex(alert>=2?0xff765e:0x9275ff);rim.intensity=alert>=2?2.6:2;document.querySelector('#map-story').textContent=alert>=2?`WATCH ACTIVE · ALERT ${alert}/4 · Defend to lower pressure`:st.mission?'Follow through on the current decision.':!lead?'Scout → Heist → Crew':!done?'Verified intel. The depot is ready.':!workshop?'Manifest secured. Build your crew.':'Your decisions changed this district.';
 const fullLabels=labelsOverride?labelsEnabled:!denseMap;
 const labelButton=document.querySelector('#map-labels');labelButton.textContent=fullLabels?'Labels: all':'Labels: compact';labelButton.setAttribute('aria-pressed',String(fullLabels));
 for(const p of pins){const active=st.mission?.kind===p.b.kind||api.getSelected()===p.b.kind;p.el.classList.toggle('active',active);p.el.classList.toggle('priority',p.b.id===nextId);p.el.classList.toggle('compact',(!fullLabels||compact)&&p.b.id!==nextId&&!active);p.el.classList.toggle('sighted',!!lead&&p.b.kind==='scout');p.el.classList.toggle('resolved',done&&p.b.kind==='heist');p.el.classList.toggle('held',p.b.kind==='territory'&&territory.some(t=>t.block===p.b.id));p.el.setAttribute('aria-pressed',String(active));const job=st.missions.find(m=>m.kind===p.b.kind);const sub=p.el.querySelector('small');if(job)sub.textContent=p.b.kind==='scout'&&lead?'REPORT VERIFIED':p.b.kind==='heist'&&lead?`DEPOT READY · ${job.cost} ${job.cost===1?'SUPPLY':'SUPPLIES'}`:`${job.domain.toUpperCase()} · ${job.cost} ${job.cost===1?'SUPPLY':'SUPPLIES'}`;else if(p.b.kind==='territory'){const held=territory.find(t=>t.block===p.b.id);sub.textContent=held?held.crew===st.crew?.id?'YOUR CREW HOLDS':'RIVAL CREW HOLDS':'OPEN TERRITORY';}}
  patrol.visible=!!lead;scoutSignal.visible=!!lead;depotSignal.visible=!!st.operation?.completedReceipt;
  if(lead){const [x,z]=toWorld(lead.patrol==='canal'?2:5,lead.patrol==='canal'?2:8);patrol.position.set(x,2.7,z);}
 for(const {b,halo} of pulse)halo.visible=b.id===nextId||st.mission?.kind===b.kind||api.getSelected()===b.kind;
 labelsDirty=true;
 }
 window.addEventListener('kult:state',sync);sync();
 function positionCamera(){const aspect=size.w/Math.max(1,size.h);const span=Math.max(8.3,(compact?9.8:9)/aspect)/zoom;camera.left=-span*aspect;camera.right=span*aspect;camera.top=span;camera.bottom=-span;camera.position.set(17+pan.x,19,22+pan.z);camera.lookAt(pan.x,.4,pan.z);camera.updateProjectionMatrix();labelsDirty=true;}
 const observer=new ResizeObserver(()=>{const r=wrap.getBoundingClientRect();if(!r.width||!r.height)return;const wasCompact=compact,wasDense=denseMap;compact=matchMedia('(max-width: 700px)').matches;denseMap=r.width<760||r.height<470;size={w:r.width,h:r.height};applyQuality();renderer.setSize(r.width,r.height,false);positionCamera();if(wasCompact!==compact||wasDense!==denseMap)sync();});observer.observe(wrap);
 const changeZoom=n=>{cameraGoal=null;zoom=Math.max(.65,Math.min(1.65,zoom+n));positionCamera()};
 function applyQuality(){renderer.setPixelRatio(quality==='low'?1:Math.min(devicePixelRatio,1.6));renderer.shadowMap.enabled=quality!=='low';renderer.shadowMap.needsUpdate=true;document.querySelector('#map-quality').textContent='Visuals: '+quality;document.querySelector('#map-quality').setAttribute('aria-label','Visual quality '+quality+'. Activate to change.');}
 document.querySelector('#map-quality').onclick=()=>{quality=quality==='low'?'balanced':'low';applyQuality()};applyQuality();
 document.querySelector('#map-labels').onclick=()=>{labelsEnabled=!(labelsOverride?labelsEnabled:!denseMap);labelsOverride=true;sync()};
 document.querySelector('#focus-next').onclick=()=>window.kultDistrict.focusNext();
 document.querySelector('#zoom-in').onclick=()=>changeZoom(.12);document.querySelector('#zoom-out').onclick=()=>changeZoom(-.12);document.querySelector('#camera-reset').onclick=()=>{cameraGoal=null;zoom=1;pan.set(0,0,0);positionCamera()};
 let down=null,moved=false;const pointers=new Map();let pinch=null;const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
 function picked(e){const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);return ray.intersectObjects(buildings,false)[0]?.object.userData.block;}
 canvas.addEventListener('pointerdown',e=>{cameraGoal=null;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const a=[...pointers.values()];pinch={distance:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),zoom};moved=true;down=null;canvas.setPointerCapture(e.pointerId);return}down={x:e.clientX,y:e.clientY,px:pan.x,pz:pan.z};moved=false;canvas.setPointerCapture(e.pointerId);canvas.focus()});
 canvas.addEventListener('pointermove',e=>{if(pointers.has(e.pointerId))pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pinch&&pointers.size===2){const a=[...pointers.values()];zoom=Math.max(.65,Math.min(1.65,pinch.zoom*Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)/Math.max(1,pinch.distance)));positionCamera();return}if(down){const dx=e.clientX-down.x,dy=e.clientY-down.y;if(Math.hypot(dx,dy)>5)moved=true;if(moved){const f=.018/zoom;pan.x=Math.max(-5,Math.min(5,down.px-dx*f-dy*f));pan.z=Math.max(-5,Math.min(5,down.pz+dx*f-dy*f));positionCamera()}}else canvas.style.cursor=picked(e)?'pointer':'grab'});
 canvas.addEventListener('pointerup',e=>{pointers.delete(e.pointerId);if(pinch){pinch=null;down=null;return}if(down&&!moved){const b=picked(e);if(b)choose(b)}down=null;});canvas.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);pinch=null;down=null});
 // Ordinary desktop wheel scrolls the page; Ctrl/Command-wheel or trackpad pinch zooms the map.
 canvas.addEventListener('wheel',e=>{if(!e.ctrlKey&&!e.metaKey)return;e.preventDefault();changeZoom(e.deltaY<0?.05:-.05)},{passive:false});
 canvas.addEventListener('keydown',e=>{const deltas={ArrowLeft:[-.5,.5],ArrowRight:[.5,-.5],ArrowUp:[-.5,-.5],ArrowDown:[.5,.5]};if(deltas[e.key]){e.preventDefault();cameraGoal=null;pan.x=Math.max(-5,Math.min(5,pan.x+deltas[e.key][0]));pan.z=Math.max(-5,Math.min(5,pan.z+deltas[e.key][1]));positionCamera()}else if(['+','=','-','0'].includes(e.key)){e.preventDefault();if(e.key==='0'){cameraGoal=null;zoom=1;pan.set(0,0,0);positionCamera()}else changeZoom(e.key==='-'?-.12:.12)}});
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();window.kult3dActive=false;document.body.classList.remove('three-ready');canvas.style.display='none';labels.style.display='none';document.body.dataset.renderer='canvas';});
 window.kult3dActive=true;document.body.classList.add('three-ready');document.body.dataset.renderer='three';
 let inView=true;const visibilityObserver=new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;},{rootMargin:'100px'});visibilityObserver.observe(wrap);
 let prev=0,elapsed=0;const projected=new THREE.Vector3();
 function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-prev)/1000,.04);prev=now;if(document.hidden||!inView||document.querySelector('#mission-drawer').open||!window.kult3dActive||api.getTab()!=='district'||wrap.classList.contains('hidden')||!api.getState())return;elapsed+=dt;
  if(cameraGoal){const f=Math.min(1,dt*8);pan.x+=(cameraGoal.x-pan.x)*f;pan.z+=(cameraGoal.z-pan.z)*f;zoom+=(cameraGoal.zoom-zoom)*f;if(Math.abs(pan.x-cameraGoal.x)+Math.abs(pan.z-cameraGoal.z)+Math.abs(zoom-cameraGoal.zoom)<.005)cameraGoal=null;positionCamera();}
  if(dest){const dist=character.position.distanceTo(dest);if(dist<.05){character.position.copy(dest);dest=route.shift();if(!dest){destination.visible=false;routeMark.visible=false;document.querySelector('#map-arrival').textContent='AT YOUR DESTINATION · REVIEW THE MISSION';}}else{character.position.lerp(dest,Math.min(1,dt*2.8/dist));character.rotation.y=Math.atan2(dest.x-character.position.x,dest.z-character.position.z);}}
  if(!reduced){waterLines.forEach((m,i)=>m.position.z=-6.6+((i*.62+elapsed*.16)%13.2));destination.scale.setScalar(1+Math.sin(elapsed*3)*.12);if(patrol.visible){patrol.position.y=2.7+Math.sin(elapsed*2)*.12;patrol.rotation.y=elapsed*.8;scoutSignal.scale.setScalar(1+Math.sin(elapsed*2)*.055);}}
  renderer.render(scene,camera);
  if(labelsDirty){
   const bounds=wrap.getBoundingClientRect();
   const occupied=['.world-heading','.map-directive'].map(q=>{const r=wrap.querySelector(q).getBoundingClientRect();return {l:r.left-bounds.left-5,r:r.right-bounds.left+5,t:r.top-bounds.top-5,b:r.bottom-bounds.top+5}});
   const order=[...pins].sort((a,b)=>Number(b.el.classList.contains('priority'))-Number(a.el.classList.contains('priority'))||Number(b.el.classList.contains('active'))-Number(a.el.classList.contains('active')));
   for(const p of order){
    p.el.querySelector('b').textContent=size.w<500?({home:'Safehouse',canal:'Canal watch',commons:'Union',depot:'Depot',gate:'Gate',workshop:'Workshop',garden:'Garden'}[p.b.id]):p.b.name;
    p.el.setAttribute('aria-label',p.b.name+(p.b.id===nextId?', next stop':''));projected.copy(p.pos).project(camera);
    const visible=Math.abs(projected.x)<1.15&&Math.abs(projected.y)<1.15;
    p.el.style.visibility=visible?'visible':'hidden';p.leader.style.display=visible?'':'none';if(!visible)continue;
    const ax=(projected.x+1)*.5*size.w,ay=(-projected.y+1)*.5*size.h,w=p.el.offsetWidth,h=p.el.offsetHeight;
    const candidates=[[0,0],[w*.65,0],[-w*.65,0],[0,-h-9],[w*.65,-h-9],[-w*.65,-h-9],[0,h+9]];
    let rect;
    for(const [dx,dy] of candidates){
     const x=Math.max(w/2+9,Math.min(size.w-w/2-9,ax+dx)),y=Math.max(h+9,Math.min(size.h-85,ay+dy));
     rect={x,y,l:x-w/2-4,r:x+w/2+4,t:y-h-4,b:y+4};
     if(!occupied.some(o=>rect.l<o.r&&rect.r>o.l&&rect.t<o.b&&rect.b>o.t))break;
    }
    occupied.push(rect);p.el.style.left=rect.x+'px';p.el.style.top=rect.y+'px';
    p.leader.setAttribute('x1',rect.x);p.leader.setAttribute('y1',rect.y);p.leader.setAttribute('x2',ax);p.leader.setAttribute('y2',ay+7);
   }
   labelsDirty=false;
  }
 }
 requestAnimationFrame(frame);
}
