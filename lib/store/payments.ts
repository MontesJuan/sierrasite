import {db,transaction} from './db';
import {checkoutItems,type OrderItem} from './catalog';
import {dispatchDeadline} from './dates';
const base=()=>process.env.STORE_PUBLIC_URL||'https://sierradoc.site';
export function paymentReady(){return !!(process.env.STORE_MP_ACCESS_TOKEN&&process.env.STORE_MP_COLLECTOR_ID&&process.env.STORE_MP_WEBHOOK_SECRET);}
async function mp(path:string,init:RequestInit={}){
 if(!process.env.STORE_MP_ACCESS_TOKEN)throw Error('Los pagos todavía no están habilitados.');
 const response=await fetch('https://api.mercadopago.com'+path,{...init,headers:{Authorization:'Bearer '+process.env.STORE_MP_ACCESS_TOKEN,'Content-Type':'application/json',...init.headers},cache:'no-store',signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw Error('Mercado Pago no respondió. Tu pedido sigue guardado; intentá nuevamente.');
 return response.json();
}
export async function createCheckout(tokenHash:string,token:string){
 if(!paymentReady())throw Error('Los pagos todavía no están habilitados. Escribinos para continuar.');
 return transaction(async c=>{
  const q=await c.query('SELECT * FROM sierra_store.orders WHERE token_hash=$1 FOR UPDATE',[tokenHash]);const o=q.rows[0];
  if(!o)throw Error('No encontramos ese pedido.');
  if(!['unpaid','rejected','cancelled'].includes(o.payment_status))throw Error('Este pedido ya tiene un pago en proceso. Revisá su estado.');
  if(o.fulfillment!=='quoted'||o.shipping_ars===null||new Date(o.quote_expires_at).getTime()<=Date.now())throw Error('El equipo debe confirmar o renovar la cotización del envío.');
  if(o.payment_url)return o.payment_url as string;
  const url=base()+'/tienda/pedido/'+token;
  const result=await mp('/checkout/preferences',{method:'POST',headers:{'X-Idempotency-Key':o.id},body:JSON.stringify({
   items:checkoutItems(o.items as OrderItem[],Number(o.subtotal_ars)),
   payer:{name:o.customer.name,email:o.customer.email},
   external_reference:'sierra:order:v1:'+o.id,statement_descriptor:'SIERRA',
   back_urls:{success:url,pending:url,failure:url},auto_return:'approved',
   notification_url:base()+'/api/tienda/webhook',
   shipments:{mode:'not_specified',cost:Number(o.shipping_ars)},
   expires:true,expiration_date_to:new Date(o.quote_expires_at).toISOString(),
   metadata:{store:'sierra',order_id:o.id}
  })});
  if(String(result.collector_id)!==process.env.STORE_MP_COLLECTOR_ID||!result.id||!result.init_point)throw Error('No se pudo validar el destino del pago.');
  const redirect=new URL(result.init_point);
  if(redirect.protocol!=='https:'||!['www.mercadopago.com.ar','www.mercadopago.com'].includes(redirect.hostname))throw Error('Mercado Pago devolvió un enlace inválido.');
  await c.query('UPDATE sierra_store.orders SET preference_id=$2,payment_url=$3,updated_at=now() WHERE id=$1',[o.id,result.id,result.init_point]);
  await c.query("INSERT INTO sierra_store.order_events(order_id,kind) VALUES($1,'checkout_created')",[o.id]);
  return result.init_point as string;
 });
}
export function paymentMatches(p:any,o:any,collector:string,live:boolean){
 return String(p.collector_id)===collector&&p.currency_id==='ARS'&&p.external_reference==='sierra:order:v1:'+o.id&&p.live_mode===live&&Number(p.transaction_amount)===Number(o.subtotal_ars)+Number(o.shipping_ars)&&o.shipping_ars!==null;
}
export async function reconcilePayment(id:string,expectedOrderId?:string){
 if(!/^\d{1,30}$/.test(id))throw Error('Pago inválido.');
 const p=await mp('/v1/payments/'+id);
 if(!String(p.external_reference||'').startsWith('sierra:order:v1:'))return {ignored:true};
 const orderId=p.external_reference.slice('sierra:order:v1:'.length);
 if(expectedOrderId&&expectedOrderId!==orderId)throw Error('El pago pertenece a otro pedido.');
 if(!/^[a-f0-9-]{36}$/i.test(orderId))throw Error('Referencia inválida.');
 return transaction(async c=>{
  const q=await c.query('SELECT * FROM sierra_store.orders WHERE id=$1 FOR UPDATE',[orderId]);const o=q.rows[0];if(!o)return {ignored:true};
  if(!paymentMatches(p,o,process.env.STORE_MP_COLLECTOR_ID||'',process.env.STORE_MP_TEST_MODE!=='true'))throw Error('El pago no coincide con el pedido.');
  const last=await c.query('SELECT provider_updated_at FROM sierra_store.payments WHERE id=$1',[String(p.id)]);
  const updated=p.date_last_updated||p.date_created;
  if(!updated||!Number.isFinite(new Date(updated).getTime()))throw Error('Fecha de pago inválida.');
  if(last.rows[0]&&new Date(last.rows[0].provider_updated_at).getTime()>=new Date(updated).getTime())return {duplicate:true};
  await c.query('INSERT INTO sierra_store.payments(id,order_id,status,amount_ars,refunded_ars,provider_updated_at) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO UPDATE SET status=EXCLUDED.status,refunded_ars=EXCLUDED.refunded_ars,provider_updated_at=EXCLUDED.provider_updated_at',[String(p.id),o.id,p.status,p.transaction_amount,p.transaction_amount_refunded||0,updated]);
  const duplicatePaid=p.status==='approved'&&o.payment_id&&o.payment_id!==String(p.id);
  const status=duplicatePaid?'review':p.status==='approved'&&Number(p.transaction_amount_refunded||0)>0?'partially_refunded':p.status;
  const activePaid=status==='approved';
  const fulfillment=duplicatePaid?'payment_review':activePaid&&['awaiting_quote','quoted'].includes(o.fulfillment)?'paid':o.fulfillment;
  const paidAt=activePaid?(p.date_approved||updated):null;
  // A rejected second attempt cannot erase an already approved payment.
  if(!o.payment_id||o.payment_id===String(p.id)||duplicatePaid){
   await c.query('UPDATE sierra_store.orders SET payment_status=$2,fulfillment=$3,payment_id=COALESCE(payment_id,$4),paid_at=COALESCE(paid_at,$5),dispatch_by=COALESCE(dispatch_by,$6),updated_at=now() WHERE id=$1',[o.id,status,fulfillment,activePaid?String(p.id):null,paidAt,paidAt?dispatchDeadline(paidAt,(process.env.STORE_HOLIDAYS||'').split(',')):null]);
  }
  await c.query('INSERT INTO sierra_store.order_events(order_id,kind,detail) VALUES($1,$2,$3)',[o.id,'payment_verified',JSON.stringify({paymentId:String(p.id),status})]);
  return {ok:true};
 });
}

// Recovery uses Mercado Pago's authenticated API; webhook signature checks stay intact.
export async function reconcileOrderPayments(orderId:string){
 const order=(await db().query('SELECT id,preference_id FROM sierra_store.orders WHERE id=$1',[orderId])).rows[0];
 if(!order?.preference_id)return {pending:true};
 const reference='sierra:order:v1:'+orderId;
 const query=new URLSearchParams({external_reference:reference,sort:'date_created',criteria:'asc',limit:'100'});
 const result=await mp('/v1/payments/search?'+query);
 if(!Array.isArray(result.results))throw Error('No se pudo verificar el pago.');
 if(Number(result.paging?.total||0)>100)throw Error('El pedido requiere revisión del equipo.');
 for(const payment of result.results){
  if(payment.external_reference!==reference)throw Error('La búsqueda devolvió otra referencia.');
  await reconcilePayment(String(payment.id),orderId);
 }
 return {ok:true,found:result.results.length};
}
export async function extendCheckout(preferenceId:string,expiresAt:Date){
 const result=await mp('/checkout/preferences/'+encodeURIComponent(preferenceId),{method:'PUT',body:JSON.stringify({expires:true,expiration_date_to:expiresAt.toISOString()})});
 if(String(result.collector_id)!==process.env.STORE_MP_COLLECTOR_ID||result.id!==preferenceId)throw Error('No se pudo renovar el enlace de pago.');
}
