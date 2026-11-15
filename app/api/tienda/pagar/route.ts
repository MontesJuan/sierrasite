import {NextResponse} from 'next/server';
import {originCheck,jsonBody,rateLimit,digest} from '@/lib/store/security';
import {validToken} from '@/lib/store/orders';
import {createCheckout} from '@/lib/store/payments';
export const runtime='nodejs';
export async function POST(r:Request){try{originCheck(r);await rateLimit(r,'pay',30);const b=await jsonBody(r);if(!validToken(b.token))throw Error('Pedido inválido.');return NextResponse.json({url:await createCheckout(digest(b.token),b.token)});}catch(e){return NextResponse.json({error:e instanceof Error&&!('code' in e)?e.message:'No pudimos iniciar el pago. Intentá de nuevo.'},{status:400});}}
