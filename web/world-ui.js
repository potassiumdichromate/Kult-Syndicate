'use strict';
// A native modal on small screens keeps focus and scrolling within the active job.
(() => {
 const drawer=document.querySelector('#mission-drawer');
 const consolePanel=document.querySelector('#agent-console');
 const home=consolePanel.parentElement;
 const mobile=matchMedia('(max-width: 850px)');
 const help=document.querySelector('#map-help-dialog');
 const focusButton=document.querySelector('#focus-world');
 function focusWorld(enabled){
  document.body.classList.toggle('focus-world',enabled);
  focusButton.setAttribute('aria-pressed',String(enabled));
  focusButton.textContent=enabled?'Exit focus':'Focus district';
  if(enabled)document.querySelector('.game-layout').scrollIntoView({block:'start'});
 }
 focusButton.onclick=()=>focusWorld(!document.body.classList.contains('focus-world'));
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!drawer.open&&!help.open)focusWorld(false);});
 document.querySelectorAll('.nav').forEach(button=>button.addEventListener('click',()=>focusWorld(false)));

 function restore(){if(consolePanel.parentElement!==home)home.append(consolePanel);document.body.classList.remove('console-open');}
 function closeConsole(){if(drawer.open)drawer.close();restore();}
 function openConsole(){
  if(!mobile.matches)return;
  document.querySelector('#drawer-content').append(consolePanel);
  document.body.classList.add('console-open');
  if(!drawer.open)drawer.showModal();
  drawer.scrollTop=0;
 }
 document.querySelector('#open-agent-console').onclick=openConsole;
 document.querySelector('#close-agent-console').onclick=closeConsole;
 drawer.addEventListener('close',()=>{if(!drawer.open)restore();});
 drawer.addEventListener('click',e=>{if(e.target===drawer){const r=drawer.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeConsole();}});
 mobile.addEventListener('change',()=>{if(!mobile.matches)closeConsole();});
 document.querySelector('#map-help').onclick=()=>help.showModal();
 document.querySelector('#close-map-help').onclick=()=>help.close();
 window.addEventListener('kult:state',()=>{
  const s=window.KultDistrictAPI?.getState();if(!s)return;
  const m=s.mission;
  document.querySelector('#mobile-agent-label').textContent=m?m.status==='PENDING'?'View mission result':`Continue · decision ${m.step+1} of 3`:'Open mission console';
 });
 window.KultWorldUI={openConsole,closeConsole};
})();
