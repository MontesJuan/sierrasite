import {NextResponse} from 'next/server';
import {db} from '@/lib/store/db';
import {originCheck,jsonBody,digest,rateLimit} from '@/lib/store/security';
import {validToken} from '@/lib/store/orders';
import {reconcilePayment,reconcileOrderPayments} from '@/lib/store/payments';
export const runtime='nodejs';
export async function POST(r:Request){
 try{originCheck(r);await rateLimit(r,'verify-payment',30);const b=await jsonBody(r);if(!validToken(b.token))throw Error('Pedido inválido.');
 const o=(await db().query('SELECT id,payment_id FROM sierra_store.orders WHERE token_hash=$1',[digest(b.token)])).rows[0];if(!o)throw Error('Pedido inválido.');
 const id=o.payment_id||b.paymentId;if(!id)return NextResponse.json(await reconcileOrderPayments(o.id));
 return NextResponse.json(await reconcilePayment(String(id),o.id));
 }catch{return NextResponse.json({error:'Aún no pudimos verificar el pago. Tu pedido conserva su estado; volvé a consultar.'},{status:400});}
}
