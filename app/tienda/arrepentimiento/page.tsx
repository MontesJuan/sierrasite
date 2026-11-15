'use client';
import {useState} from 'react';
import {STORE_EMAIL} from '@/lib/store/catalog';
export default function Page(){
 const [code,setCode]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 return <section className="section legal store-legal"><h1>Botón de arrepentimiento.</h1><p>Solicitá la devolución de tu compra sin registrarte. Tenés diez días corridos desde la entrega o la compra, lo último que ocurra. La devolución no tiene costo para vos.</p>
 {code?<div role="status"><h2>Solicitud recibida.</h2><p>Tu código es <strong>{code}</strong>. Guardalo. El equipo coordinará los próximos pasos por correo; esta confirmación registra la solicitud, el reintegro todavía no se realizó.</p></div>:<form className="store-form" onSubmit={async e=>{e.preventDefault();setError('');setBusy(true);const f=new FormData(e.currentTarget);try{const r=await fetch('/api/tienda/arrepentimiento',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(f))});const j=await r.json();if(!r.ok)throw Error(j.error);setCode(j.code);}catch(e){setError(e instanceof Error?e.message:'No pudimos guardar la solicitud.');}finally{setBusy(false);}}}><label>Número de pedido o de pago<input name="code" required minLength={3} maxLength={80}/></label><label>Correo electrónico<input name="email" type="email" required autoComplete="email" maxLength={180}/></label><label>Comentario (opcional)<textarea name="reason" maxLength={1000}/></label>{error&&<p className="form-error" role="alert">{error}</p>}<button className="button solid-button" disabled={busy}>{busy?'Registrando…':'Solicitar arrepentimiento'}</button></form>}
 <p>También podés escribir a <a href={'mailto:'+STORE_EMAIL}>{STORE_EMAIL}</a>.</p></section>;
}
