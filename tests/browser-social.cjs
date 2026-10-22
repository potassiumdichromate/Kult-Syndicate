const {launch,baseURL}=require('./browser-helper.cjs');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await launch();
 const ca=await browser.newContext({viewport:{width:1440,height:1000}}),cb=await browser.newContext({viewport:{width:1280,height:900}});
 const a=await ca.newPage(),b=await cb.newPage(),errors=[];
 for(const p of [a,b]){p.on('pageerror',e=>errors.push(e.message));await p.goto(baseURL);await p.getByRole('button',{name:/Enter local sandbox/}).click();await p.locator('#agent-name').filter({hasText:'AEGIS-'}).waitFor()}
 // Earn an actual domain credential through the visible mission flow.
 await b.getByRole('button',{name:'Scout the canal'}).click();await b.getByRole('button',{name:'Commit to this job'}).click();
 await b.locator('#mission-panel [data-choice]').first().waitFor();const first=await b.request.get(baseURL+'api/state').then(r=>r.json()).then(s=>s.mission.stage.text);await b.locator(`[data-choice="${first.includes('sweeping')?'roof':'stairs'}"]`).click();await b.locator('[data-choice="verify"]').click();await b.locator('[data-choice="qualified"]').click();
 await b.getByRole('button',{name:'Return for resolution'}).click({timeout:15000});await b.getByRole('button',{name:'Review the decisions'}).waitFor();
 for(const p of [a,b]){await p.getByRole('button',{name:'Play & hire',exact:true}).click();await p.getByRole('button',{name:'Enable live duels',exact:true}).click();await p.getByRole('button',{name:'Enable hiring',exact:true}).click();await p.getByRole('button',{name:'✓ Hiring enabled',exact:true}).waitFor()}
 await a.getByRole('button',{name:'Open a challenge'}).click();await b.locator('[data-social^="join:"]').click();await a.getByText('ROUND 1 / 3',{exact:true}).waitFor();
 for(let i=0;i<3;i++){
  await a.getByText('ROUND '+(i+1)+' / 3',{exact:true}).waitFor();await a.locator('[data-social="tactic:flank"]').click();
  await a.waitForFunction(()=>document.querySelector('[data-social="tactic:guard"]')?.disabled);
  await b.getByText('ROUND '+(i+1)+' / 3',{exact:true}).waitFor();await b.locator('[data-social="tactic:feint"]').click();
 }
 await a.getByText('You took the round series.').waitFor();await b.getByText('A rival read your play.').waitFor();
 await a.getByRole('button',{name:'Review & post assignment'}).click();await a.getByRole('button',{name:'Post assignment',exact:true}).click();
 await b.bringToFront();
 await b.getByRole('button',{name:'Accept this job'}).click();await b.getByRole('button',{name:'Accept & start',exact:true}).click();
 await b.locator('#mission-panel [data-choice]').first().waitFor();const second=await b.request.get(baseURL+'api/state').then(r=>r.json()).then(s=>s.mission.stage.text);await b.locator(`[data-choice="${second.includes('sweeping')?'roof':'stairs'}"]`).click();await b.locator('[data-choice="verify"]').click();await b.locator('[data-choice="qualified"]').click();
 await b.getByRole('button',{name:'Return for resolution'}).click({timeout:15000});
 const done=await b.request.get(baseURL+'api/state').then(r=>r.json());assert.equal(done.receipts.find(r=>r.opponentType==='NPC')?.outcome,'SUCCESS');assert.equal(done.social.contracts[0]?.status,'PAID');
 await a.bringToFront();await a.getByText('PAID',{exact:true}).waitFor();
 assert.equal(await a.locator('#supplies').innerText(),'15');
 fs.mkdirSync('test-results',{recursive:true});await a.screenshot({path:'test-results/exchange-desktop.png',fullPage:true});
 await a.setViewportSize({width:390,height:844});assert.equal(await a.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);await a.screenshot({path:'test-results/exchange-mobile.png',fullPage:true});
 await a.getByRole('button',{name:'Passport',exact:true}).click();assert.equal(await a.locator('[data-replay]').count(),2);
 assert.deepEqual(errors,[]);await browser.close();console.log('Two real browser sessions: live PvP → private lock → result → qualified hiring → exact mission → paid escrow → mobile: PASS');
})().catch(e=>{console.error(e);process.exit(1)});
