import {chromium,expect} from '@playwright/test';
import fs from 'node:fs';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const base='http://127.0.0.1:3017';const evidence={checks:[],pages:[]};
try{
 for(const[name,width,height]of[['desktop',1440,1000],['mobile',390,844]]){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1,reducedMotion:'reduce'});page.setDefaultTimeout(45000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const[route,label]of[['/tienda',''],['/','home-']]){
   await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:60000});await page.evaluate(()=>document.fonts.ready);await page.locator('img').evaluateAll(imgs=>{imgs.forEach(i=>i.loading='eager');return Promise.race([Promise.all(imgs.map(i=>i.decode().catch(()=>{}))),new Promise(r=>setTimeout(r,8000))]);});
   await page.screenshot({path:'.impeccable/review/'+label+name+'.png',fullPage:true});await page.screenshot({path:'.impeccable/review/'+label+name+'-viewport.png'});
   const detail={route,viewport:name,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),errors,missing:await page.locator('img').evaluateAll(imgs=>imgs.filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.getAttribute('src')))};
   evidence.pages.push(detail);if(detail.overflow||detail.missing.length||errors.length)throw Error(JSON.stringify(detail));
  }await page.close();
 }
 const customer=await browser.newPage({viewport:{width:1280,height:900},reducedMotion:'reduce'});customer.setDefaultTimeout(45000);
 await customer.goto(base+'/tienda');await customer.getByRole('button',{name:'El chivo',exact:true}).click();await customer.getByRole('button',{name:'Negra',exact:true}).click();await customer.getByRole('button',{name:'XL',exact:true}).click();await customer.getByRole('button',{name:'Sumar al pedido'}).click();
 await customer.getByRole('button',{name:'Reyes y sus chivos',exact:true}).click();await customer.getByRole('button',{name:'Blanca',exact:true}).click();await customer.getByRole('button',{name:'S',exact:true}).click();await customer.getByRole('button',{name:'Sumar al pedido'}).click();
 await customer.getByRole('link',{name:/Ver mi carrito/}).first().click();
 await expect(customer.getByRole('heading',{name:'Tu carrito.'})).toBeVisible();
 await customer.getByRole('button',{name:'Sumar una unidad de El chivo · Negra · Talle XL · Oversize'}).click();
 await expect(customer.locator('.summary-subtotal')).toContainText('210.000');
 await customer.getByRole('button',{name:'Restar una unidad de El chivo · Negra · Talle XL · Oversize'}).click();
 await customer.getByRole('button',{name:'Quitar',exact:true}).first().click();await customer.getByRole('button',{name:'Deshacer',exact:true}).click();await customer.reload();await expect(customer.locator('.summary-subtotal')).toContainText('140.000');evidence.checks.push('carrito persistente, cantidades y quitar/deshacer');
 await customer.screenshot({path:'.impeccable/review/cart-desktop.png',fullPage:true});
 await customer.setViewportSize({width:390,height:844});await customer.screenshot({path:'.impeccable/review/cart-mobile.png',fullPage:true});expect(await customer.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);await customer.setViewportSize({width:1280,height:900});
 for(const[k,v]of Object.entries({name:'Comprador QA LOCAL',email:'qa@example.invalid',phone:'0000000000',street:'Calle de prueba 123',detail:'NO ENVIAR',city:'San Juan',postalCode:'5400'}))await customer.locator('[name="'+k+'"]').fill(v);
 await customer.locator('[name="province"]').selectOption('San Juan');await customer.locator('[name="accepted"]').check();await customer.getByRole('button',{name:'Continuar y cotizar envío'}).click();
 await customer.waitForURL(/\/tienda\/pedido\/[A-Za-z0-9_-]+/,{timeout:60000,waitUntil:'domcontentloaded'});await expect(customer.getByRole('heading',{name:'Estamos cotizando tu envío'})).toBeVisible();const orderUrl=customer.url();const code=await customer.locator('.order-code').innerText();evidence.checks.push('pedido real persistido en PostgreSQL LOCAL');
 const admin=await browser.newPage();admin.setDefaultTimeout(45000);await admin.goto(base+'/tienda/gestion',{waitUntil:'domcontentloaded',timeout:60000});await admin.locator('[name="email"]').fill('qa@example.invalid');await admin.locator('[name="password"]').fill('sierra-local-qa-only');await admin.getByRole('button',{name:'Entrar a gestión'}).click();
 const row=admin.locator('.admin-order').filter({has:admin.getByRole('heading',{name:code,exact:true})});await expect(row).toBeVisible();await row.locator('[name="shipping"]').fill('10500.50');await row.locator('[name="transit"]').fill('3 a 6 días hábiles');await row.getByRole('button',{name:'Guardar cotización'}).click();await expect(admin.getByText('Cambio guardado.',{exact:true})).toBeVisible();
 await customer.reload();await expect(customer.getByRole('heading',{name:'Tu cotización está lista'})).toBeVisible();await expect(customer.locator('.grand-total')).toContainText('150.500,5');evidence.checks.push('cotización admin y total visible al comprador sin redondear centavos');
 await customer.screenshot({path:'.impeccable/review/order-desktop.png',fullPage:true});await admin.screenshot({path:'.impeccable/review/admin-desktop.png',fullPage:true});
 const anonymous=await browser.newContext();const protectedResponse=await anonymous.request.get(base+'/api/tienda/admin');expect(protectedResponse.status()).toBe(401);const csrf=await anonymous.request.post(base+'/api/tienda/pedidos',{data:{},headers:{Origin:'https://example.invalid'}});expect(csrf.status()).toBe(400);evidence.checks.push('administración sin sesión y origen ajeno rechazados');
 const orderApi=await anonymous.request.get(base+'/api/tienda/pedidos/'+orderUrl.split('/').pop());const body=await orderApi.json();expect(body.order.customer).toBeUndefined();evidence.checks.push('seguimiento público no expone dirección ni correo');
 const withdrawal=await anonymous.newPage();await withdrawal.goto(base+'/tienda/arrepentimiento');await withdrawal.locator('[name="code"]').fill(code);await withdrawal.locator('[name="email"]').fill('qa@example.invalid');await withdrawal.getByRole('button',{name:'Solicitar arrepentimiento'}).click();await expect(withdrawal.getByRole('heading',{name:'Solicitud recibida.'})).toBeVisible();evidence.checks.push('arrepentimiento sin registro con código inmediato');
 await customer.setViewportSize({width:390,height:844});await customer.screenshot({path:'.impeccable/review/order-mobile.png',fullPage:true});await admin.setViewportSize({width:390,height:844});await admin.screenshot({path:'.impeccable/review/admin-mobile.png',fullPage:true});
 await anonymous.close();console.log(JSON.stringify(evidence,null,2));fs.writeFileSync('docs/store-browser-qa.json',JSON.stringify(evidence,null,2));
}finally{await browser.close();}
