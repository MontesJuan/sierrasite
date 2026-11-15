import {NextResponse} from 'next/server';
import {originCheck,jsonBody,rateLimit} from '@/lib/store/security';
import {createOrder} from '@/lib/store/orders';
export const runtime='nodejs';
export async function POST(r:Request){try{originCheck(r);await rateLimit(r,'orders',10);const b=await jsonBody(r);const result=await createOrder(b);return NextResponse.json(result,{status:201});}catch(e){return NextResponse.json({error:e instanceof Error&& !('code' in e)?e.message:'No pudimos guardar el pedido. Intentá nuevamente.'},{status:400});}}
