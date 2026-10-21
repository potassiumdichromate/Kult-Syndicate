const {chromium}=require('playwright');const assert=require('node:assert/strict');const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1512,height:1080}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:8787');await page.getByRole('button',{name:/Enter local sandbox/}).click();
 await page.locator('body[data-renderer="three"]').waitFor();await page.locator('.place-pin').first().waitFor();assert.equal(await page.locator('.place-pin').count(),7);
 await page.waitForTimeout(900);fs.mkdirSync('test-results',{recursive:true});await page.screenshot({path:'test-results/world-desktop.png',fullPage:true});
 await page.locator('[data-location="canal"]').click();await page.getByRole('button',{name:/Commit to this job/}).waitFor();assert.equal(await page.locator('[data-location="canal"]').getAttribute('aria-pressed'),'true');
 await page.getByRole('button',{name:'Zoom in',exact:true}).click();await page.getByRole('button',{name:'Reset camera',exact:true}).click();
 await page.getByRole('button',{name:/Commit to this job/}).click();for(const name of [/Climb to the rooftop/,/Cross-check both beacons/,/Report the route with/])await page.getByRole('button',{name}).click();
 await page.getByRole('button',{name:'Return for resolution'}).click({timeout:15000});await page.getByRole('button',{name:'Review the decisions'}).click();await page.getByRole('button',{name:'Verify signature',exact:true}).click();await page.getByText(/Signature, replay hash and seed commitment verified/).waitFor();await page.getByRole('button',{name:'Close replay'}).click();
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);await page.screenshot({path:'test-results/world-mobile.png',fullPage:true});
 await page.getByRole('button',{name:'List view',exact:true}).click();await page.locator('#map-list [data-block="workshop"]').click();await page.getByRole('button',{name:'Create crew',exact:true}).waitFor();assert.deepEqual(errors,[]);
 await browser.close();console.log('3D district → building selection → mission → verified receipt → mobile → list → crew: PASS');
})().catch(e=>{console.error(e);process.exit(1)});
