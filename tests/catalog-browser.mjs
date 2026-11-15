import {chromium,expect} from '@playwright/test';
import fs from 'node:fs';
import {Pool} from 'pg';
import {randomBytes,createHash} from 'node:crypto';
const base='http://127.0.0.1:3017',out='.impeccable/review/catalog';
const db=new Pool({connectionString:'postgresql://juanmontes@127.0.0.1:58417/sierra_qa'});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--disable-gpu']});
fs.mkdirSync(out,{recursive:true});
const evidence={environment:'Local PostgreSQL, fake contact data, no outbound payment',checks:[],screens:[],errors:[]};
let orderId,sessionHash;
async function settled(page){await page.evaluate(()=>document.fonts.ready);await page.locator('img').evaluateAll(a=>{a.forEach(i=>i.loading='eager');return Promise.all(a.map(i=>i.decode().catch(()=>{})));});expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);expect(await page.locator('img').evaluateAll(a=>a.filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src))).toEqual([]);}
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});page.setDefaultTimeout(30000);page.on('pageerror',e=>evidence.errors.push(e.message));
 await page.goto(base+'/tienda');await settled(page);
 for(const[name,width,height]of[['desktop',1440,1000],['mobile',390,844]]){
  await page.setViewportSize({width,height});await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:out+'/'+name+'.png',fullPage:true});
  for(const section of ['libros','poster'])await page.locator('#'+section).screenshot({path:out+'/'+section+'-'+name+'.png'});
  evidence.screens.push({name,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)});
 }
 await page.setViewportSize({width:1440,height:1000});
 await page.getByRole('button',{name:'M',exact:true}).click();await page.locator('#remeras .add-button').click();
 for(const title of ['Trovador Vallisto','Antología Poética','Detrás de la tranquera'])await page.getByRole('button',{name:'Sumar '+title+' al carrito',exact:true}).click();
 for(const size of ['Cine','A3','A4']){await page.locator('.poster-sizes button').filter({hasText:size}).click();await page.getByRole('button',{name:/Sumar póster al pedido/}).click();}
 await page.goto(base+'/tienda/carrito');await expect(page.locator('.basket-lines>li')).toHaveCount(7);await expect(page.locator('.summary-subtotal')).toContainText('215.000');
 await page.getByRole('button',{name:/Sumar una unidad de Antología/}).click();await expect(page.locator('.summary-subtotal')).toContainText('235.000');
 await page.getByRole('button',{name:/Restar una unidad de Antología/}).click();await page.getByRole('button',{name:'Quitar',exact:true}).first().click();await page.getByRole('button',{name:'Deshacer',exact:true}).click();await page.reload();await expect(page.locator('.summary-subtotal')).toContainText('215.000');evidence.checks.push('Seven mixed variants: ARS 215000; quantity, remove/undo and persistence verified');
 for(const[name,width,height]of[['desktop',1440,1000],['mobile',390,844]]){await page.setViewportSize({width,height});await settled(page);await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:out+'/cart-'+name+'.png',fullPage:true});}
 for(const[k,v]of Object.entries({name:'QA LOCAL CATALOGO',email:'qa@example.invalid',phone:'0000000000',street:'Prueba local 123',detail:'NO ENVIAR',city:'San Juan',postalCode:'5400'}))await page.locator('[name="'+k+'"]').fill(v);
 await page.locator('[name="province"]').selectOption('San Juan');await page.locator('[name="accepted"]').check();await page.getByRole('button',{name:'Continuar y cotizar envío'}).click();await page.waitForURL(/\/tienda\/pedido\//);await expect(page.getByRole('heading',{name:'Estamos cotizando tu envío'})).toBeVisible();
 const token=page.url().split('/').pop();const row=(await db.query('SELECT id,code,items,subtotal_ars FROM sierra_store.orders WHERE token_hash=$1',[createHash('sha256').update(token).digest('hex')])).rows[0];orderId=row.id;expect(Number(row.subtotal_ars)).toBe(215000);expect(row.items).toHaveLength(7);expect(row.items.find(i=>i.book==='antologia-poetica').unitPriceArs).toBe(20000);
 const adminToken=randomBytes(32).toString('base64url');sessionHash=createHash('sha256').update(adminToken).digest('hex');await db.query("INSERT INTO sierra_store.admin_sessions(token_hash,user_id,expires_at) SELECT $1,id,now()+interval '1 hour' FROM sierra_store.admin_users WHERE email='qa@example.invalid'",[sessionHash]);
 const admin=await browser.newPage({viewport:{width:1440,height:1000}});await admin.context().addCookies([{name:'sierra-admin',value:adminToken,url:base,httpOnly:true,sameSite:'Strict'}]);await admin.goto(base+'/tienda/gestion');const card=admin.locator('.admin-order').filter({has:admin.getByRole('heading',{name:row.code,exact:true})});await expect(card).toContainText('Antología Poética');await card.locator('[name="shipping"]').fill('10500.50');await card.locator('[name="transit"]').fill('3 a 6 días hábiles');await card.getByRole('button',{name:'Guardar cotización'}).click();await expect(admin.getByText('Cambio guardado.',{exact:true})).toBeVisible();
 await page.reload();await expect(page.getByRole('heading',{name:'Tu cotización está lista'})).toBeVisible();await expect(page.locator('.grand-total')).toContainText('225.500,50');const orderApi=await page.request.get(base+'/api/tienda/pedidos/'+token);expect((await orderApi.json()).order.customer).toBeUndefined();evidence.checks.push('Local order and admin quote persisted; total ARS 225500.50, private contact data omitted from tracking');
 const trailer=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});const mediaRequests=[];trailer.on('request',r=>{if(r.url().includes('.mp4'))mediaRequests.push(r.url());});await trailer.goto(base+'/trailer');await settled(trailer);expect(mediaRequests).toHaveLength(0);await trailer.getByRole('button',{name:'Reproducir el tráiler oficial',exact:true}).click();
 await trailer.waitForFunction(()=>{const v=document.querySelector('video');return v&&v.readyState>=2&&v.currentTime>0;},{timeout:30000});
 const media=await trailer.locator('video').evaluate(v=>({duration:v.duration,width:v.videoWidth,height:v.videoHeight,src:v.currentSrc,error:v.error?.code??null,time:v.currentTime}));expect(Math.round(media.duration)).toBe(195);expect(media.width).toBe(1280);expect(media.error).toBe(null);await trailer.locator('video').evaluate(v=>{v.pause();v.currentTime=25;});await trailer.waitForFunction(()=>!document.querySelector('video').seeking);
 for(const[name,width,height]of[['desktop',1440,1000],['mobile',390,844]]){await trailer.setViewportSize({width,height});await trailer.locator('.trailer-player').scrollIntoViewIfNeeded();await trailer.screenshot({path:out+'/trailer-'+name+'.png'});expect(await trailer.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);}
 evidence.checks.push({trailer:media,clickToLoad:true,seek:true});expect(evidence.errors).toEqual([]);expect(evidence.screens.every(s=>!s.overflow)).toBe(true);
 fs.writeFileSync('docs/catalog-browser-qa.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence,null,2));
}finally{
 await browser.close();if(orderId){await db.query('DELETE FROM sierra_store.order_events WHERE order_id=$1',[orderId]);await db.query('DELETE FROM sierra_store.orders WHERE id=$1',[orderId]);}if(sessionHash)await db.query('DELETE FROM sierra_store.admin_sessions WHERE token_hash=$1',[sessionHash]);await db.end();
}
