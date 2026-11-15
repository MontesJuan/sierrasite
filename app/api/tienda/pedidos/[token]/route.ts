import {NextResponse} from 'next/server';
import {publicOrder} from '@/lib/store/orders';
export const runtime='nodejs';
export async function GET(_:Request,{params}:{params:Promise<{token:string}>}){try{const {token}=await params;const order=await publicOrder(token);return NextResponse.json(order?{order}:{error:'No encontramos ese pedido.'},{status:order?200:404,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});}catch{return NextResponse.json({error:'No pudimos consultar el pedido. Intentá nuevamente.'},{status:503});}}
