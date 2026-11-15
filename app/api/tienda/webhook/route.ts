import {NextResponse} from 'next/server';
import {verifyMpSignature} from '@/lib/store/security';
import {reconcilePayment} from '@/lib/store/payments';
export const runtime='nodejs';
export async function POST(r:Request){
 const url=new URL(r.url),id=url.searchParams.get('data.id')||'',type=url.searchParams.get('type');
 const secret=process.env.STORE_MP_WEBHOOK_SECRET;
 if(!secret)return NextResponse.json({error:'not_configured'},{status:503});
 if(!verifyMpSignature(r.headers.get('x-signature')||'',r.headers.get('x-request-id')||'',id,secret))return NextResponse.json({error:'invalid_signature'},{status:401});
 if(type!=='payment')return NextResponse.json({ignored:true});
 try{return NextResponse.json(await reconcilePayment(id));}catch{ return NextResponse.json({error:'retry_required'},{status:503}); }
}
