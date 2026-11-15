import {chromium,expect} from '@playwright/test';
import {Pool} from 'pg';
import {randomBytes,createHash,createDecipheriv} from 'node:crypto';
import fs from 'node:fs';
const base='http://127.0.0.1:3017',dir='.impeccable/review/';
const pool=new Pool({connectionString:'postgresql://juanmontes@127.0.0.1:58417/sierra_qa'});
const token=randomBytes(32).toString('base64url'),hash=createHash('sha256').update(token).digest('hex');
const user=(await pool.query("SELECT id FROM sierra_store.admin_users WHERE email='qa@example.invalid'")).rows[0];
await pool.query("INSERT INTO sierra_store.admin_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '1 hour')",[hash,user.id]);
const order=(await pool.query("SELECT access_token_ciphertext FROM sierra_store.orders WHERE fulfillment='quoted' ORDER BY created_at DESC LIMIT 1")).rows[0];
const raw=Buffer.from(order.access_token_ciphertext,'base64url'),d=createDecipheriv('aes-256-gcm',Buffer.from('1'.repeat(64),'hex'),raw.subarray(0,12));d.setAuthTag(raw.subarray(12,28));
const orderToken=Buffer.concat([d.update(raw.subarray(28)),d.final()]).toString('utf8');
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--disable-gpu']});
const checks=[];
try{
 const context=await browser.newContext({reducedMotion:'reduce'});
 await context.addCookies([{name:'sierra-admin',value:token,url:base,httpOnly:true,sameSite:'Strict'}]);
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 async function open(route){await page.goto(base+route,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);await page.locator('img').evaluateAll(a=>{a.forEach(i=>i.loading='eager');return Promise.all(a.map(i=>i.decode().catch(()=>{})));});await page.locator('#assistant-entry button').waitFor({state:'attached'});}
 for(const[name,width,height]of[['desktop',1440,1000],['mobile',390,844]]){
  await page.setViewportSize({width,height});
  for(const[route,file]of[['/tienda',name+'-viewport'],['/','home-'+name+'-viewport']]){await open(route);await page.screenshot({path:dir+file+'.png'});}
 }
 await page.evaluate(()=>localStorage.setItem('sierra-cart-v1',JSON.stringify([{design:'reyes',color:'blanca',size:'S',quantity:1},{design:'chivo',color:'negra',size:'XL',quantity:1}])));
 await page.setViewportSize({width:1280,height:900});await open('/tienda/carrito');await expect(page.locator('.summary-subtotal')).toContainText('140.000');await page.screenshot({path:dir+'cart-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});for(const[name,sel]of[['cart-mobile-top','.cart-heading'],['cart-mobile-summary','.cart-summary'],['cart-mobile-address','.cart-address'],['cart-mobile-checkout','.check-label']]){await page.locator(sel).scrollIntoViewIfNeeded();await page.screenshot({path:dir+name+'.png'});}
 await page.setViewportSize({width:1280,height:900});await open('/tienda/pedido/'+orderToken);await expect(page.getByText(/Preparación y despacho: hasta siete días hábiles/)).toBeVisible();await expect(page.locator('.grand-total')).toContainText('150.500,50');await page.screenshot({path:dir+'order-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});await page.screenshot({path:dir+'order-mobile.png',fullPage:true});checks.push('plazo visible antes de pagar, centavos en dos dígitos');
 await page.setViewportSize({width:1280,height:900});await open('/tienda/gestion');await page.locator('.admin-order').first().waitFor();await page.screenshot({path:dir+'admin-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.locator('.admin-order').first().scrollIntoViewIfNeeded();await page.screenshot({path:dir+'admin-mobile-order.png'});await page.locator('.withdrawal-list h2').scrollIntoViewIfNeeded();await page.screenshot({path:dir+'admin-mobile-withdrawals.png'});
 const dimensions=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width);expect(await page.locator('main').innerText()).not.toContain('unpaid');expect(await page.locator('main').innerText()).not.toContain('received');checks.push('panel en español y sin overflow móvil');
 await open('/tienda');await page.getByRole('button',{name:'Menú',exact:false}).click();await page.getByRole('button',{name:'Conversar sobre SIERRA',exact:true}).last().click();await expect(page.getByRole('dialog')).toBeVisible();checks.push('asistente preservado en menú móvil');expect(errors).toEqual([]);
 fs.writeFileSync('docs/store-final-qa.json',JSON.stringify({checks,errors,dimensions,environment:'Next production build, PostgreSQL LOCAL, Mercado Pago disabled'},null,2));console.log(JSON.stringify({checks,errors,dimensions}));
}finally{await browser.close();await pool.query('DELETE FROM sierra_store.admin_sessions WHERE token_hash=$1',[hash]);await pool.end();}
