const {launch,baseURL}=require('./browser-helper.cjs');
const assert=require('node:assert/strict');

(async()=>{
 const browser=await launch();
 try{
  for(const [width,height] of [[1024,768],[1366,768],[1920,1080]]){
   const page=await browser.newPage({viewport:{width,height}});
   const errors=[];page.on('pageerror',error=>errors.push(error.message));
   await page.goto(baseURL);
   await page.getByRole('button',{name:/Enter local sandbox/}).click();
   await page.locator('body.three-ready').waitFor();
   await page.locator('.place-pin').first().waitFor();
   await page.locator('[data-location="canal"]').click();
   const commitVisible=await page.locator('#commit-job').evaluate(button=>button.getBoundingClientRect().bottom<=innerHeight);
   assert.ok(commitVisible,`Commit should fit ${width}x${height} without scrolling`);
   if(height===768){
    assert.equal(await page.locator('#map-labels').getAttribute('aria-pressed'),'false');
    await page.locator('#map-labels').click();
    assert.equal(await page.locator('#map-labels').getAttribute('aria-pressed'),'true');
    await page.locator('#map-labels').click();
   }
   await page.locator('.world-canvas').hover({position:{x:80,y:80}});
   await page.evaluate(()=>{document.documentElement.style.scrollBehavior='auto';window.scrollTo(0,0)});
   const scrollBefore=await page.evaluate(()=>scrollY);
   await page.mouse.wheel(0,230);await page.waitForTimeout(250);
   assert.ok((await page.evaluate(()=>scrollY))>scrollBefore,'Normal mouse wheel must scroll the page');
   await page.locator('#commit-job').click();
   await page.locator('body.focus-world').waitFor();
   await page.locator('[data-choice]').first().waitFor();
   await page.waitForTimeout(250);
   assert.equal(await page.locator('#focus-world').innerText(),'Exit focus');
   await page.locator('.world-canvas').hover({position:{x:80,y:80}});
   const focusedScroll=await page.evaluate(()=>scrollY);
   await page.keyboard.down('Control');await page.mouse.wheel(0,-120);await page.keyboard.up('Control');
   assert.equal(await page.evaluate(()=>scrollY),focusedScroll,'Modified wheel zoom must not scroll the page');
   for(let step=0;step<3;step++){
    await page.locator('[data-choice]').first().waitFor();
    const choicesFit=await page.locator('[data-choice]').evaluateAll(buttons=>buttons.every(button=>button.getBoundingClientRect().bottom<=innerHeight));
    assert.ok(choicesFit,`Choice ${step+1} options should fit ${width}x${height} in focus mode`);
    if(step<2)await page.locator('[data-choice]:not([disabled])').first().click();
   }
   await page.locator('#focus-world').click();
   assert.equal(await page.locator('body.focus-world').count(),0);
   assert.deepEqual(errors,[]);
   await page.close();
  }
  console.log('PASS: laptop and desktop layout, readable map labels, mouse wheel, focused mission choices');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exit(1)});
