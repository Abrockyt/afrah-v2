process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY = '1';
const { chromium } = require('C:/Users/abroc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const sites = [['era','https://era.estate/'],['likova','https://likova.space/'],['silver-pinewood','https://silver-pinewood.com/'],['whiteley','https://www.thewhiteleylondon.com/'],['bankside-yards','https://banksideyards.com/']].filter(([id])=>!process.argv[2]||process.argv[2]===id);
const widths = [1920,1440,1280,1024,768,430,390];
async function inspect(page) {
 return page.evaluate(() => {
  const visible = e => {const r=e.getBoundingClientRect(); return r.width>0 && r.height>0;};
  const describe = e => {const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {tag:e.tagName,id:e.id,text:(e.innerText||e.getAttribute('alt')||'').trim().slice(0,130),box:{x:r.x,y:r.y+scrollY,width:r.width,height:r.height},font:s.fontFamily,size:s.fontSize,lineHeight:s.lineHeight,letterSpacing:s.letterSpacing,color:s.color,background:s.backgroundColor,position:s.position,display:s.display,columns:s.gridTemplateColumns,gap:s.gap,padding:s.padding,margin:s.margin,transform:s.transform,opacity:s.opacity,transition:s.transition,animation:s.animation};};
  return {url:location.href,title:document.title,viewport:{width:innerWidth,height:innerHeight},pageHeight:document.documentElement.scrollHeight,overflow:document.documentElement.scrollWidth>innerWidth,headings:[...document.querySelectorAll('h1,h2,h3')].filter(visible).slice(0,28).map(describe),sections:[...document.querySelectorAll('main>*,section,header,footer')].filter(visible).slice(0,32).map(describe),controls:[...document.querySelectorAll('button,nav a')].filter(visible).slice(0,24).map(describe),images:[...document.images].filter(visible).slice(0,45).map(e=>({url:e.currentSrc||e.src,alt:e.alt,width:e.naturalWidth,height:e.naturalHeight,display:describe(e).box})),videos:[...document.querySelectorAll('video')].map(e=>({src:e.currentSrc,poster:e.poster,muted:e.muted,autoplay:e.autoplay,loop:e.loop})),canvases:[...document.querySelectorAll('canvas')].map(describe),audio:[...document.querySelectorAll('audio')].map(e=>({src:e.currentSrc,muted:e.muted,autoplay:e.autoplay})),resources:performance.getEntriesByType('resource').map(e=>({url:e.name,type:e.initiatorType,duration:Math.round(e.duration),transferBytes:e.transferSize})).filter(e=>/\.(glb|gltf|mp4|webm|jpg|webp|png|avif|hdr|ktx)/i.test(e.url)).slice(0,100)};
 });
}
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 const results=[];
 for (let batch=0;batch<sites.length;batch+=2) await Promise.all(sites.slice(batch,batch+2).map(async([id,url])=>{
  const dir=path.join(root,'research',id);await fs.mkdir(path.join(dir,'screenshots'),{recursive:true});await fs.mkdir(path.join(dir,'recordings'),{recursive:true});
  const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,recordVideo:{dir:path.join(dir,'recordings'),size:{width:1440,height:900}}});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const measurements={source:url,capturedAt:new Date().toISOString(),method:'Headless Edge; CSS pixels; public rendered DOM; no private APIs or source code copied',widths:[],errors};
  try {
   await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});await page.waitForTimeout(6000);
   for(const width of widths){
    await page.setViewportSize({width,height:width<768?844:900});await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(1300);
    await page.screenshot({path:path.join(dir,'screenshots',`hero-${width}.png`),timeout:20000});
    measurements.widths.push(await inspect(page));
   }
   await page.setViewportSize({width:1440,height:900});
   for(let i=1;i<=5;i++){await page.mouse.wheel(0,750);await page.waitForTimeout(1500);await page.screenshot({path:path.join(dir,'screenshots',`scroll-${i}-1440.png`),timeout:20000});}
   measurements.afterScroll=await inspect(page);
   const menu=page.getByRole('button',{name:/^(menu|open menu)$/i}).first();
   if(await menu.count()){await menu.click({timeout:3000}).catch(()=>{});await page.waitForTimeout(700);await page.screenshot({path:path.join(dir,'screenshots','menu-1440.png')});}
   measurements.status='captured';
  }catch(e){measurements.status='partial';measurements.failure=e.message;}
  await fs.writeFile(path.join(dir,'measurements.json'),JSON.stringify(measurements,null,2));await context.close();results.push({id,status:measurements.status,widths:measurements.widths.length,failure:measurements.failure});console.log(JSON.stringify(results.at(-1)));
 }));
 await fs.writeFile(path.join(root,'research',process.argv[2] ? `capture-summary-${process.argv[2]}.json` : 'capture-summary.json'),JSON.stringify(results,null,2));await browser.close();
})();
