import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
if(!process.env.STORE_DATABASE_URL?.startsWith('postgresql://')||!['127.0.0.1','localhost'].includes(new URL(process.env.STORE_DATABASE_URL).hostname))throw Error('Estas pruebas sólo se ejecutan en PostgreSQL local aislado.');
process.env.STORE_MP_ACCESS_TOKEN='qa-not-a-real-token';process.env.STORE_MP_COLLECTOR_ID='123';process.env.STORE_TOKEN_KEY='1'.repeat(64);process.env.STORE_MP_WEBHOOK_SECRET='qa-secret';process.env.STORE_PUBLIC_URL='https://qa.example.invalid';
import {createOrder,publicOrder} from '../lib/store/orders';import {opaqueToken,digest} from '../lib/store/security';import {db} from '../lib/store/db';import {reconcilePayment,createCheckout,extendCheckout,reconcileOrderPayments} from '../lib/store/payments';
test('pedidos concurrentes y webhook idempotente en base LOCAL',async()=>{
 const token=opaqueToken(),key=randomUUID();let id:string|undefined;const oldFetch=globalThis.fetch;
 const body={token,idempotencyKey:key,accepted:true,items:[{design:'reyes',color:'blanca',size:'M',quantity:1}],customer:{name:'QA LOCAL',email:'qa@example.invalid',phone:'0000000000',street:'Prueba 1',detail:'NO ENVIAR',city:'San Juan',province:'San Juan',postalCode:'5400'}};
 try{const [a,b]=await Promise.all([createOrder(body),createOrder(body)]);assert.equal(a.code,b.code);id=(await db().query('SELECT id FROM sierra_store.orders WHERE idempotency_key=$1',[key])).rows[0].id;
  const o=await publicOrder(token);assert.equal(Number(o.subtotal_ars),70000);assert.equal(o.customer,undefined);await assert.rejects(()=>createOrder({...body,customer:{...body.customer,name:'Cambio'}}));
  await db().query("UPDATE sierra_store.orders SET shipping_ars=10000,fulfillment='quoted',quote_expires_at=now()+interval '48 hours' WHERE id=$1",[id]);
  let preferences=0;
  globalThis.fetch=async(url,init)=>{assert.equal(String(url),'https://api.mercadopago.com/checkout/preferences');preferences++;const payload=JSON.parse(String(init?.body));assert.equal(payload.items[0].unit_price,70000);assert.equal(payload.shipments.cost,10000);assert.equal(payload.external_reference,'sierra:order:v1:'+id);assert.equal(payload.notification_url,'https://qa.example.invalid/api/tienda/webhook');return new Response(JSON.stringify({id:'qa-preference',collector_id:123,init_point:'https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=qa-preference'}));};
  const [checkout,repeat]=await Promise.all([createCheckout(digest(token),token),createCheckout(digest(token),token)]);assert.equal(checkout,repeat);assert.equal(preferences,1);
  await db().query("UPDATE sierra_store.orders SET quote_expires_at=now()-interval '1 minute' WHERE id=$1",[id]);await assert.rejects(()=>createCheckout(digest(token),token),/renovar/);
  const renewed=new Date(Date.now()+48*3600000);globalThis.fetch=async(url,init)=>{assert.match(String(url),/qa-preference$/);assert.equal(init?.method,'PUT');assert.equal(JSON.parse(String(init?.body)).expiration_date_to,renewed.toISOString());return new Response(JSON.stringify({id:'qa-preference',collector_id:123}));};await extendCheckout('qa-preference',renewed);
  const p={id:'99999999999999',collector_id:123,currency_id:'ARS',external_reference:'sierra:order:v1:'+id,live_mode:true,transaction_amount:80000,status:'approved',date_approved:'2026-11-15T12:00:00-03:00',date_last_updated:'2026-11-15T15:00:00Z'};
  globalThis.fetch=async()=>new Response(JSON.stringify({...p,transaction_amount:1}),{status:200});await assert.rejects(()=>reconcilePayment(p.id),/no coincide/);assert.equal((await publicOrder(token)).payment_status,'unpaid');
  globalThis.fetch=async()=>new Response(JSON.stringify(p),{status:200});await Promise.all([reconcilePayment(p.id),reconcilePayment(p.id)]);
  assert.equal((await db().query('SELECT count(*) FROM sierra_store.payments WHERE order_id=$1',[id])).rows[0].count,'1');assert.equal((await publicOrder(token)).payment_status,'approved');
  p.date_last_updated='2026-11-15T14:00:00Z';p.status='pending';await reconcilePayment(p.id);assert.equal((await publicOrder(token)).payment_status,'approved');
  p.date_last_updated='2026-11-15T16:00:00Z';p.status='refunded';await reconcilePayment(p.id);assert.equal((await publicOrder(token)).payment_status,'refunded');
  globalThis.fetch=async(url)=>new Response(JSON.stringify(String(url).includes('/search?')?{paging:{total:1},results:[p]}:p));assert.deepEqual(await reconcileOrderPayments(id!),{ok:true,found:1});
  p.external_reference='sierra:order:v1:'+randomUUID();await assert.rejects(()=>reconcilePayment(p.id,id));
 }finally{globalThis.fetch=oldFetch;if(id){await db().query('DELETE FROM sierra_store.order_events WHERE order_id=$1',[id]);await db().query('DELETE FROM sierra_store.payments WHERE order_id=$1',[id]);await db().query('DELETE FROM sierra_store.orders WHERE id=$1',[id]);}await db().end();}
});
