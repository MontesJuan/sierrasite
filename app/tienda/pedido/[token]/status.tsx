'use client';
import Icon from '@/app/components/Icon';
import {useEffect,useState,useCallback} from 'react';
import Link from 'next/link';
import {money,itemName,STORE_EMAIL,type CartItem} from '@/lib/store/catalog';
const states:Record<string,string>={awaiting_quote:'Estamos cotizando tu envío',quoted:'Tu cotización está lista',paid:'Pago aprobado',preparing:'Estamos preparando tu remera',dispatched:'Tu pedido está en camino',delivered:'Pedido entregado',payment_review:'Estamos revisando el pago'};
export default function OrderStatus({token}:{token:string}){
 const [order,setOrder]=useState<any>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const load=useCallback(async()=>{try{const r=await fetch('/api/tienda/pedidos/'+token,{cache:'no-store'});const j=await r.json();if(!r.ok)throw Error(j.error);setOrder(j.order);setError('');}catch(e){setError(e instanceof Error?e.message:'No pudimos consultar tu pedido.');}},[token]);
 useEffect(()=>{void load();const timer=setInterval(()=>void load(),30000);const id=new URLSearchParams(window.location.search).get('payment_id');if(id&&/^\d+$/.test(id))void fetch('/api/tienda/revisar-pago',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,paymentId:id})}).then(()=>load());return()=>clearInterval(timer);},[load,token]);
 async function pay(){setBusy(true);setError('');try{const r=await fetch('/api/tienda/pagar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})});const d=await r.json();if(!r.ok)throw Error(d.error);window.location.assign(d.url);}catch(e){setError(e instanceof Error?e.message:'No se pudo iniciar el pago.');setBusy(false);}}
 async function refreshPayment(){setBusy(true);setError('');try{const r=await fetch('/api/tienda/revisar-pago',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})});if(!r.ok)throw Error('Aún no pudimos verificar el pago. Volvé a consultar en unos minutos.');await load();setNotice('Estado consultado con Mercado Pago.');}catch(e){setError(e instanceof Error?e.message:'No se pudo verificar el pago.');}finally{setBusy(false);}}
 const quoteExpired=order?.quote_expires_at&&new Date(order.quote_expires_at).getTime()<=Date.now();
 return <section className="order-page section"><Link className="text-link" href="/tienda"><Icon name="arrowLeft"/> Volver a las remeras</Link><h1>Tu pedido.</h1>{error&&<p role="alert" className="form-error">{error}</p>}{!order?<p>Cargando el pedido…</p>:<>
  <p className="order-code">{order.code}</p><h2>{states[order.fulfillment]||'Revisamos tu pedido'}</h2>
  {order.fulfillment==='awaiting_quote'&&<p>Recibimos tu solicitud. El equipo calculará el envío por Correo Argentino. Acá vas a ver el total antes de pagar; todavía no hiciste una compra.</p>}
  <div className="save-order"><p>Este es tu enlace privado. Guardalo para volver a la cotización y al seguimiento.</p><button className="button" onClick={async()=>{try{await navigator.clipboard.writeText(window.location.origin+'/tienda/pedido/'+token);setNotice('Enlace copiado.');}catch{setNotice('Copiá la dirección de esta página desde el navegador.');}}}>Copiar enlace del pedido</button><p role="status">{notice}</p></div>
  <ul className="cart-list">{order.items.map((i:CartItem)=><li key={itemName(i)}><span>{itemName(i)}</span><span>{i.quantity} {i.quantity===1?'remera':'remeras'}</span></li>)}</ul>
  <dl className="order-totals"><div><dt>Remeras</dt><dd>{money(Number(order.subtotal_ars))}</dd></div><div><dt>Envío</dt><dd>{order.shipping_ars===null?'A cotizar':money(Number(order.shipping_ars))}</dd></div>{order.shipping_ars!==null&&<div className="grand-total"><dt>Total</dt><dd>{money(Number(order.subtotal_ars)+Number(order.shipping_ars))}</dd></div>}</dl>
  {order.shipping_service&&<p>{order.shipping_service}. Tránsito estimado: {order.shipping_transit}. El correo comienza a contar este plazo al recibir el paquete.</p>}
  {(order.fulfillment==='quoted'||order.paid_at)&&<p>Preparación y despacho: hasta siete días hábiles desde el pago aprobado.{order.dispatch_by?' Despacho previsto hasta el '+new Date(order.dispatch_by).toLocaleDateString('es-AR',{timeZone:'UTC'})+'.':''}</p>}
  {order.fulfillment==='quoted'&&<>{quoteExpired?<p>La cotización venció. Escribinos para renovarla; no intentes pagar un enlace anterior.</p>:<p>Cotización válida hasta {new Date(order.quote_expires_at).toLocaleString('es-AR',{timeZone:'America/Argentina/San_Juan'})}.</p>}{['unpaid','rejected','cancelled'].includes(order.payment_status)&&!quoteExpired&&<button onClick={pay} disabled={busy} className="button solid-button">{busy?'Abriendo Mercado Pago…':'Pagar la compra con Mercado Pago'}</button>}</>}
  {['pending','in_process','authorized'].includes(order.payment_status)&&<p>Mercado Pago está procesando tu pago. La preparación comienza cuando se apruebe. No necesitás pagar de nuevo.</p>}
  {['refunded','charged_back','partially_refunded','review'].includes(order.payment_status)&&<p>El pago requiere atención del equipo. Contactanos con el número de pedido antes de continuar.</p>}
  {order.fulfillment!=='awaiting_quote'&&<button className="text-button" disabled={busy} onClick={refreshPayment}>Ya pagué · consultar estado</button>}
  {order.tracking&&<div className="tracking"><h3>Seguimiento</h3><p>{order.tracking}</p><a className="button" href="https://www.correoargentino.com.ar/seguimiento-de-envios" target="_blank" rel="noreferrer">Consultar en Correo Argentino <Icon name="arrow"/></a></div>}
  <p><a href={'mailto:'+STORE_EMAIL+'?subject='+encodeURIComponent('Pedido SIERRA '+order.code)}>Consultar por este pedido</a></p><Link href="/tienda/arrepentimiento">Botón de arrepentimiento</Link>
 </>}</section>;
}
