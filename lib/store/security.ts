import {createHash,createHmac,randomBytes,timingSafeEqual,scryptSync,createCipheriv,createDecipheriv} from 'node:crypto';
import {cookies} from 'next/headers';
import {db} from './db';
export const opaqueToken=()=>randomBytes(32).toString('base64url');
export const digest=(v:string)=>createHash('sha256').update(v).digest('hex');
export function safeEqual(a:string,b:string){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}
export function originCheck(r:Request){const value=r.headers.get('origin');if(!value)throw Error('Recargá la página e intentá de nuevo.');let origin:URL;try{origin=new URL(value);}catch{throw Error('Origen inválido.');}if(origin.origin!==value||origin.host!==r.headers.get('host')||!['http:','https:'].includes(origin.protocol)||(process.env.NODE_ENV==='production'&&origin.protocol!=='https:'))throw Error('Recargá la página e intentá de nuevo.');}
export async function jsonBody(r:Request){if(Number(r.headers.get('content-length')||0)>16000)throw Error('Solicitud demasiado larga.');const s=await r.text();if(s.length>16000)throw Error('Solicitud demasiado larga.');return JSON.parse(s);}
export async function rateLimit(r:Request,purpose:string,limit=12){
 const ip=r.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'local';
 const key=digest(purpose+':'+ip+':'+Math.floor(Date.now()/3600000));
 const q=await db().query('INSERT INTO sierra_store.rate_limits(key,hits) VALUES($1,1) ON CONFLICT(key) DO UPDATE SET hits=sierra_store.rate_limits.hits+1 RETURNING hits',[key]);
 if(q.rows[0].hits>limit)throw Error('Hubo demasiados intentos. Esperá una hora o escribinos por correo.');
}
export function passwordMatches(p:string,encoded:string){const [salt,hash]=encoded.split(':');return !!salt&&!!hash&&safeEqual(scryptSync(p,salt,64).toString('hex'),hash);}
export async function adminSession(){
 const token=(await cookies()).get('sierra-admin')?.value;if(!token)return null;
 const r=await db().query('SELECT u.id,u.email FROM sierra_store.admin_sessions s JOIN sierra_store.admin_users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now() AND u.active=true',[digest(token)]);
 return r.rows[0]||null;
}
export function verifyMpSignature(signature:string,requestId:string,id:string,secret:string){
 const p=Object.fromEntries(signature.split(',').map(v=>v.trim().split('=')));
 if(!/^\d+$/.test(p.ts||'')||!/^[a-f0-9]{64}$/.test(p.v1||'')||!requestId||!id)return false;
 const time=Number(p.ts)*(p.ts.length<=10?1000:1);if(Math.abs(Date.now()-time)>600000)return false;
 return safeEqual(createHmac('sha256',secret).update('id:'+id.toLowerCase()+';request-id:'+requestId+';ts:'+p.ts+';').digest('hex'),p.v1);
}

export function encryptToken(value:string){const key=Buffer.from(process.env.STORE_TOKEN_KEY||'', 'hex');if(key.length!==32)throw Error('La tienda no está configurada.');const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',key,iv);const encrypted=Buffer.concat([c.update(value,'utf8'),c.final()]);return Buffer.concat([iv,c.getAuthTag(),encrypted]).toString('base64url');}
export function decryptToken(value:string){const data=Buffer.from(value,'base64url'),key=Buffer.from(process.env.STORE_TOKEN_KEY||'','hex');const d=createDecipheriv('aes-256-gcm',key,data.subarray(0,12));d.setAuthTag(data.subarray(12,28));return Buffer.concat([d.update(data.subarray(28)),d.final()]).toString('utf8');}
