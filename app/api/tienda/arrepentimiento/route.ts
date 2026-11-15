import {NextResponse} from 'next/server';
import {randomUUID,randomBytes} from 'node:crypto';
import {originCheck,jsonBody,rateLimit} from '@/lib/store/security';
import {db} from '@/lib/store/db';
export const runtime='nodejs';
export async function POST(r:Request){try{originCheck(r);await rateLimit(r,'withdrawal',15);const b=await jsonBody(r);
 if(typeof b.email!=='string'||! /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(b.email)||b.email.length>180||typeof b.code!=='string'||b.code.length<3||b.code.length>80)throw Error('Ingresá el correo y el número de pedido o de pago.');
 const code='ARR-'+randomBytes(5).toString('hex').toUpperCase();
 await db().query('INSERT INTO sierra_store.withdrawals(id,code,order_code,email,reason) VALUES($1,$2,$3,$4,$5)',[randomUUID(),code,b.code,b.email.toLowerCase(),String(b.reason||'').slice(0,1000)]);
 return NextResponse.json({code},{status:201});
 }catch(e){return NextResponse.json({error:e instanceof Error&&!('code' in e)?e.message:'No pudimos guardar la solicitud. Escribinos por correo.'},{status:400});}}
