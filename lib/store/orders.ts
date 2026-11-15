import {randomUUID,randomBytes} from 'node:crypto';
import {db,transaction} from './db';
import {digest,encryptToken} from './security';
import {validateCart,subtotal} from './catalog';
export const uuid=(v:unknown)=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
export const validToken=(v:unknown)=>typeof v==='string'&&/^[A-Za-z0-9_-]{43}$/.test(v);
function field(value:unknown,name:string,min:number,max:number){if(typeof value!=='string'||value.trim().length<min||value.trim().length>max)throw Error('Revisá '+name+'.');return value.trim();}
export async function createOrder(body:any){
 const items=validateCart(body.items);
 if(!uuid(body.idempotencyKey)||!validToken(body.token))throw Error('Recargá la página para iniciar el pedido.');
 const input=body.customer||{};
 const customer={name:field(input.name,'tu nombre',3,120),email:field(input.email,'tu correo',5,180).toLowerCase(),phone:field(input.phone,'tu teléfono',6,30),street:field(input.street,'la calle y altura',3,150),detail:field(input.detail||'','piso o indicaciones',0,160),city:field(input.city,'la localidad',2,100),province:field(input.province,'la provincia',2,60),postalCode:field(input.postalCode,'el código postal',4,8)};
 if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(customer.email)||!/^(?:[A-Z]\d{4}[A-Z]{3}|\d{4})$/i.test(customer.postalCode))throw Error('Revisá el correo y el código postal.');
 if(body.accepted!==true)throw Error('Aceptá las condiciones antes de continuar.');
 const requestHash=digest(JSON.stringify({items,customer}));const tokenHash=digest(body.token);
 return transaction(async c=>{
  const id=randomUUID();const code='SIE-'+randomBytes(5).toString('hex').toUpperCase();
  const result=await c.query('INSERT INTO sierra_store.orders(id,code,token_hash,idempotency_key,request_hash,customer,items,subtotal_ars,access_token_ciphertext) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT DO NOTHING RETURNING id,code',[id,code,tokenHash,body.idempotencyKey,requestHash,JSON.stringify(customer),JSON.stringify(items),subtotal(items),encryptToken(body.token)]);
  if(!result.rowCount){const old=(await c.query('SELECT code,request_hash,token_hash FROM sierra_store.orders WHERE idempotency_key=$1',[body.idempotencyKey])).rows[0];if(!old||old.request_hash!==requestHash||old.token_hash!==tokenHash)throw Error('El pedido cambió. Volvé a iniciar la solicitud.');return {code:old.code};}
  await c.query("INSERT INTO sierra_store.order_events(order_id,kind,detail) VALUES($1,'requested',$2)",[id,JSON.stringify({terms:'2026-11-15',production:'on_demand',dispatchBusinessDays:7})]);
  return {code};
 });
}
export async function publicOrder(token:string){
 if(!validToken(token))return null;
 const r=await db().query('SELECT code,items,subtotal_ars,shipping_ars,shipping_service,shipping_transit,quote_expires_at,payment_status,fulfillment,paid_at,dispatch_by,tracking,created_at FROM sierra_store.orders WHERE token_hash=$1',[digest(token)]);
 return r.rows[0]||null;
}
