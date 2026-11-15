import {chromium,expect} from '@playwright/test';
import fs from 'node:fs';
const base=process.argv[2]||'https://sierradoc.site';
const target=new URL(base);
if(target.protocol!=='https:'||!(target.hostname==='sierradoc.site'||target.hostname.endsWith('-janaas-projects-47034055.vercel.app')))throw Error('Destino no autorizado');
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--disable-gpu']});
const evidence={base,readOnly:true,ordersCreated:0,charges:0,routes:[],checks:[],errors:[]};
try{
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});const page=await context.newPage();page.on('pageerror',e=>evidence.errors.push(e.message));
 // No mutations or fabricated orders in the production database.
 await page.route('**/api/tienda/**',r=>r.request().method()==='GET'?r.continue():r.abort());
 for(const route of ['/','/tienda','/tienda/condiciones','/tienda/gestion','/trailer','/en/trailer','/jugar/']){const r=await context.request.get(base+route);expect(r.status()).toBe(200);evidence.routes.push({route,status:r.status()});}
 const denied=await context.request.get(base+'/api/tienda/admin');expect(denied.status()).toBe(401);evidence.checks.push('Admin without session: 401');
 await page.goto(base+'/tienda',{waitUntil:'networkidle'});await page.getByRole('button',{name:'Sumar Antología Poética al carrito',exact:true}).click();await expect(page.locator('.book-product').filter({hasText:'Antología Poética'}).getByRole('status')).toContainText('se sumó');
 await page.locator('.poster-sizes button').filter({hasText:'A4'}).click();await expect(page.locator('.poster-section .product-price')).toContainText('15.000');await page.getByRole('button',{name:/Sumar póster al pedido/}).click();
 await page.goto(base+'/tienda/carrito');await expect(page.locator('.summary-subtotal')).toContainText('35.000');await page.reload();await expect(page.locator('.summary-subtotal')).toContainText('35.000');expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);evidence.checks.push('Antología + A4: ARS35000, persistent cart and mobile without overflow');
 for(const slug of ['trovador-vallisto','antologia-poetica','detras-de-la-tranquera','poster-sierra']){const r=await context.request.get(base+'/tienda/'+slug+'.webp');expect(r.status()).toBe(200);expect((await r.body()).length).toBeGreaterThan(10000);}
 const range=await context.request.get(base+'/media/sierra-trailer-v06-20261110.mp4',{headers:{Range:'bytes=0-1023'}});expect(range.status()).toBe(206);expect(range.headers()['content-type']).toContain('video/mp4');evidence.checks.push('Trailer range requests: 206 video/mp4');
 await page.goto(base+'/trailer');await page.getByRole('button',{name:'Reproducir el tráiler oficial',exact:true}).click();await page.waitForFunction(()=>{const v=document.querySelector('video');return v&&v.currentTime>0&&v.readyState>=2;},null,{timeout:60000});const duration=await page.locator('video').evaluate(v=>{v.pause();return v.duration;});expect(Math.round(duration)).toBe(195);evidence.checks.push('Trailer playback: 195 seconds');expect(evidence.errors).toEqual([]);
 fs.writeFileSync('docs/catalog-remote-qa.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence,null,2));
}finally{await browser.close();}
