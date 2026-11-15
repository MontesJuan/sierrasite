import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {db,transaction} from '@/lib/store/db';
import {adminSession,originCheck,jsonBody,rateLimit,passwordMatches,opaqueToken,digest,decryptToken} from '@/lib/store/security';
import {uuid} from '@/lib/store/orders';
import {paymentReady,reconcileOrderPayments,extendCheckout} from '@/lib/store/payments';
export const runtime='nodejs';
export async function GET(){
 try{
  const session=await adminSession();if(!session)return NextResponse.json({authenticated:false},{status:401});
  const [orders,withdrawals]=await Promise.all([db().query('SELECT id,code,access_token_ciphertext,customer,items,subtotal_ars,shipping_ars,shipping_service,shipping_transit,quote_expires_at,payment_status,fulfillment,payment_id,preference_id,paid_at,dispatch_by,tracking,created_at FROM sierra_store.orders ORDER BY created_at DESC LIMIT 200'),db().query('SELECT * FROM sierra_store.withdrawals ORDER BY created_at DESC LIMIT 100')]);
  return NextResponse.json({authenticated:true,email:session.email,orders:orders.rows.map(({access_token_ciphertext,...o})=>({...o,accessUrl:(process.env.STORE_PUBLIC_URL||"https://sierradoc.site")+"/tienda/pedido/"+decryptToken(access_token_ciphertext)})),withdrawals:withdrawals.rows,paymentReady:paymentReady()},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'No se pudo cargar el panel.'},{status:503});}
}
export async function POST(r:Request){
 try{
  originCheck(r);const b=await jsonBody(r);
  if(b.action==='login'){
   await rateLimit(r,'admin-login',8);
   const email=String(b.email||'').toLowerCase().trim(),password=String(b.password||'');
   if(password.length>200)throw Error('Credenciales incorrectas.');
   const u=(await db().query('SELECT id,password_hash FROM sierra_store.admin_users WHERE email=$1 AND active=true',[email])).rows[0];
   if(!u||!passwordMatches(password,u.password_hash))throw Error('Credenciales incorrectas.');
   const token=opaqueToken();
   await db().query("INSERT INTO sierra_store.admin_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '8 hours')",[digest(token),u.id]);
   (await cookies()).set('sierra-admin',token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:8*3600});
   return NextResponse.json({ok:true});
  }
  const session=await adminSession();if(!session)return NextResponse.json({error:'Iniciá sesión nuevamente.'},{status:401});
  if(b.action==='logout'){
   const token=(await cookies()).get('sierra-admin')?.value;if(token)await db().query('DELETE FROM sierra_store.admin_sessions WHERE token_hash=$1',[digest(token)]);
   (await cookies()).delete('sierra-admin');return NextResponse.json({ok:true});
  }
  if(!uuid(b.id))throw Error('Pedido inválido.');
  if(b.action==='refresh'){
   return NextResponse.json(await reconcileOrderPayments(b.id));
  }
  if(b.action==='withdrawal'){
   if(!['reviewing','resolved'].includes(b.state))throw Error('Estado inválido.');
   await db().query('UPDATE sierra_store.withdrawals SET state=$2 WHERE id=$1',[b.id,b.state]);return NextResponse.json({ok:true});
  }
  if(b.action==='quote'&&paymentReady())await reconcileOrderPayments(b.id);
  await transaction(async c=>{
   const o=(await c.query('SELECT * FROM sierra_store.orders WHERE id=$1 FOR UPDATE',[b.id])).rows[0];if(!o)throw Error('Pedido inexistente.');
   if(b.action==='quote'){
    if(!['unpaid','rejected','cancelled'].includes(o.payment_status))throw Error('Hay un pago en proceso. No se modifica la cotización.');
    if(typeof b.shipping!=='number'||!Number.isFinite(b.shipping)||b.shipping<0||b.shipping>1000000||Math.round(b.shipping*100)/100!==b.shipping)throw Error('Ingresá un costo de envío válido.');
    if(typeof b.transit!=='string'||b.transit.length<3||b.transit.length>150)throw Error('Indicá el plazo estimado informado por el correo.');
    const expiresAt=new Date(Date.now()+48*3600000);
    if(o.preference_id){
     if(Number(o.shipping_ars)!==b.shipping)throw Error('El importe de un checkout emitido no se modifica. Podés renovar la misma cotización.');
     await extendCheckout(o.preference_id,expiresAt);
    }
    await c.query("UPDATE sierra_store.orders SET shipping_ars=$2,shipping_service='Correo Argentino · a domicilio',shipping_transit=$3,quote_expires_at=$4,fulfillment='quoted',updated_at=now() WHERE id=$1",[o.id,b.shipping,b.transit,expiresAt]);
   }else if(b.action==='fulfillment'){
    if(o.payment_status!=='approved')throw Error('Sólo se prepara o despacha un pago aprobado y verificado.');
    const next:Record<string,string>={paid:'preparing',preparing:'dispatched',dispatched:'delivered'};
    if(next[o.fulfillment]!==b.state)throw Error('La transición de estado no es válida.');
    if(b.state==='dispatched'&&(typeof b.tracking!=='string'||!/^[A-Z0-9-]{6,40}$/i.test(b.tracking)))throw Error('Ingresá el código real de seguimiento.');
    await c.query('UPDATE sierra_store.orders SET fulfillment=$2,tracking=COALESCE($3,tracking),updated_at=now() WHERE id=$1',[o.id,b.state,b.state==='dispatched'?b.tracking.toUpperCase():null]);
   }else throw Error('Acción inválida.');
   await c.query('INSERT INTO sierra_store.order_events(order_id,kind,detail) VALUES($1,$2,$3)',[o.id,b.action,JSON.stringify({actor:session.id,state:b.state||null})]);
  });
  return NextResponse.json({ok:true});
 }catch(e){return NextResponse.json({error:e instanceof Error&&!('code' in e)?e.message:'No se pudo guardar el cambio. Intentá nuevamente.'},{status:400});}
}
