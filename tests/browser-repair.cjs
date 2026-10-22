const {launch,baseURL}=require('./browser-helper.cjs');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await launch();const page=await browser.newPage({viewport:{width:1440,height:1000}});
 page.setDefaultTimeout(20000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(baseURL);await page.getByRole('button',{name:/Enter local sandbox/}).click();
 await page.locator('body.three-ready').waitFor();await page.locator('#map-quality').click();
 await page.locator('#focus-world').click();assert.equal(await page.locator('#focus-world').getAttribute('aria-pressed'),'true');
 await page.screenshot({path:'test-results/repair-focus-desktop.png',timeout:60000});
 await page.keyboard.press('Escape');assert.equal(await page.locator('#focus-world').getAttribute('aria-pressed'),'false');
 for(const width of [390,320]){
  await page.setViewportSize({width,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
  const zoom=await page.locator('#zoom-in').boundingBox();assert.ok(zoom.width>=44&&zoom.height>=44);
  await page.locator('#focus-world').click();await page.locator('#open-agent-console').click();
  await page.locator('#mission-drawer[open]').waitFor();await page.locator('#close-agent-console').click();
  await page.keyboard.press('Escape');
 }
 await page.setViewportSize({width:390,height:844});await page.locator('#focus-world').click();
 await page.screenshot({path:'test-results/repair-focus-mobile.png',fullPage:true,timeout:60000});
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS: focus mode, Escape, 320/390px overflow, 44px camera controls, mobile drawer and no JavaScript errors');
})().catch(e=>{console.error(e);process.exit(1)});
