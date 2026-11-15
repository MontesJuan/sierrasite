import {chromium,expect} from '@playwright/test';
const out='.impeccable/review/catalog',base='http://127.0.0.1:3017';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--disable-gpu']});
try{
 const page=await browser.newPage({reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 async function open(route){await page.goto(base+route,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);await page.locator('img').evaluateAll(a=>{a.forEach(i=>i.loading='eager');return Promise.all(a.map(i=>i.decode().catch(()=>{})));});expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);}
 for(const[name,width,height]of[['desktop',1440,1000],['mobile',390,844]]){
  await page.setViewportSize({width,height});await open('/tienda');await page.screenshot({path:out+'/'+name+'.png',fullPage:true});
  for(const section of ['libros','poster'])await page.locator('#'+section).screenshot({path:out+'/'+section+'-'+name+'.png'});
 }
 await page.evaluate(()=>localStorage.setItem('sierra-cart-v1',JSON.stringify([{design:'reyes',color:'blanca',size:'M',quantity:1},...['trovador-vallisto','antologia-poetica','detras-de-la-tranquera'].map(book=>({kind:'book',book,quantity:1})),...['cine','a3','a4'].map(format=>({kind:'poster',format,quantity:1}))])));
 for(const[name,width,height]of[['desktop',1440,1000],['mobile',390,844]]){await page.setViewportSize({width,height});await open('/tienda/carrito');await expect(page.locator('.summary-subtotal')).toContainText('215.000');await page.screenshot({path:out+'/cart-'+name+'.png',fullPage:true});}
 await open('/trailer');await page.getByRole('button',{name:'Reproducir el tráiler oficial',exact:true}).click();await page.waitForFunction(()=>document.querySelector('video')?.readyState>=2);await page.locator('video').evaluate(v=>{v.pause();v.currentTime=25;});await page.waitForFunction(()=>!document.querySelector('video').seeking);
 for(const[name,width,height]of[['desktop',1440,1000],['mobile',390,844]]){await page.setViewportSize({width,height});await page.locator('.trailer-player').scrollIntoViewIfNeeded();await page.screenshot({path:out+'/trailer-'+name+'.png'});}
 expect(errors).toEqual([]);console.log('Production build: desktop1440/mobile390, no page errors or overflow, 10 final captures.');
}finally{await browser.close();}
