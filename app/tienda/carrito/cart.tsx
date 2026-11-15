'use client';
import Icon from '@/app/components/Icon';
import {useRef,useState} from 'react';
import Link from 'next/link';
import {useCart} from '@/app/components/CartProvider';
import {PRICE_ARS,money,itemName,STORE_EMAIL,type CartItem} from '@/lib/store/catalog';
const provinces=['Buenos Aires','Ciudad Autónoma de Buenos Aires','Catamarca','Chaco','Chubut','Córdoba','Corrientes','Entre Ríos','Formosa','Jujuy','La Pampa','La Rioja','Mendoza','Misiones','Neuquén','Río Negro','Salta','San Juan','San Luis','Santa Cruz','Santa Fe','Santiago del Estero','Tierra del Fuego','Tucumán'];
const photos:Record<string,string>={'reyes-blanca':'01-franco-reyes-blanca-frente','reyes-negra':'02-franco-reyes-negra-espalda','chivo-blanca':'03-franco-chivo-blanca-espalda','chivo-negra':'04-franco-chivo-negra-frente'};
function makeToken(){return btoa(String.fromCharCode(...Array.from(crypto.getRandomValues(new Uint8Array(32))))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
export default function Cart(){
 const {cart,setCart,ready,count,total}=useCart();const [removed,setRemoved]=useState<CartItem|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const attempt=useRef<{fingerprint:string;idempotencyKey:string;token:string}|null>(null);
 function change(index:number,delta:number){setNotice('');setCart(current=>current.map((i,n)=>n===index?{...i,quantity:i.quantity+delta}:i));}
 function remove(index:number){setRemoved(cart[index]);setCart(current=>current.filter((_,i)=>i!==index));}
 function undo(){if(!removed)return;if(count+removed.quantity>10){setNotice('El carrito admite hasta diez remeras. Para un pedido mayor, escribinos.');return;}setCart(current=>{const i=current.findIndex(x=>x.design===removed.design&&x.color===removed.color&&x.size===removed.size);return i<0?[...current,removed]:current.map((x,n)=>n===i?{...x,quantity:x.quantity+removed.quantity}:x);});setRemoved(null);}
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setError('');setBusy(true);const f=new FormData(e.currentTarget);
  const customer=Object.fromEntries(['name','email','phone','street','detail','city','province','postalCode'].map(k=>[k,f.get(k)||'']));
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify({cart,customer})));
  const fingerprint=Array.from(new Uint8Array(bytes),n=>n.toString(16).padStart(2,'0')).join('');
  if(!attempt.current)try{attempt.current=JSON.parse(sessionStorage.getItem('sierra-order-attempt')||'null');}catch{}
  if(!attempt.current||attempt.current.fingerprint!==fingerprint)attempt.current={fingerprint,idempotencyKey:crypto.randomUUID(),token:makeToken()};
  const a=attempt.current;
  try{sessionStorage.setItem('sierra-order-attempt',JSON.stringify(a));}catch{}
  try{const r=await fetch('/api/tienda/pedidos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items:cart,customer,accepted:f.get('accepted')==='on',idempotencyKey:a.idempotencyKey,token:a.token})});const data=await r.json();if(!r.ok)throw Error(data.error);
   try{localStorage.setItem('sierra-last-order','/tienda/pedido/'+a.token);localStorage.removeItem('sierra-cart-v1');sessionStorage.removeItem('sierra-order-attempt');}catch{}
   setCart([]);window.location.assign('/tienda/pedido/'+a.token);
  }catch(e){setError(e instanceof Error?e.message:'No pudimos guardar el pedido. Intentá nuevamente.');setBusy(false);}
 }
 return <section className="cart-page"><div className="cart-heading"><Link href="/tienda" className="text-link"><Icon name="arrowLeft"/> Seguir eligiendo</Link><h1>Tu carrito.</h1><p>{count?count+' '+(count===1?'remera elegida':'remeras elegidas')+'. Hechas a demanda.':'Un dibujo para llevar con vos.'}</p></div>
 {removed&&<div className="undo-message" role="status"><span>Quitaste {itemName(removed)}.</span><button onClick={undo} className="text-button">Deshacer</button></div>}
 {notice&&<p role="status" className="form-notice">{notice}</p>}
 {!ready?<p className="empty-cart">Cargando tu carrito…</p>:!cart.length?<div className="cart-empty"><img src="/tienda/chivo-original.webp" alt="" width="200" height="200"/><div><h2>Todavía está vacío.</h2><p>Elegí una estampa, un color y tu talle. Guardamos las remeras acá mientras seguís mirando.</p><Link className="button solid-button" href="/tienda">Ver las remeras</Link></div></div>:<div className="cart-layout">
 <div className="cart-main"><ul className="basket-lines">{cart.map((i,index)=><li key={itemName(i)}><img src={'/tienda/'+photos[i.design+'-'+i.color]+'.webp'} alt={itemName(i)} width="160" height="240"/><div className="basket-description"><h2>{i.design==='reyes'?'Reyes y sus chivos':'El chivo'}</h2><p>{i.color==='blanca'?'Blanca':'Negra'} · Talle {i.size} · Oversize</p><p>{money(PRICE_ARS)} por remera</p><div className="quantity-control"><button aria-label={'Quitar una '+itemName(i)} disabled={busy||i.quantity===1} onClick={()=>change(index,-1)}>−</button><output aria-label={'Cantidad de '+itemName(i)}>{i.quantity}</output><button aria-label={'Sumar una '+itemName(i)} disabled={busy||count>=10} onClick={()=>change(index,1)}>+</button></div><button className="text-button remove-item" disabled={busy} onClick={()=>remove(index)}>Quitar</button></div><strong className="basket-line-total">{money(i.quantity*PRICE_ARS)}</strong></li>)}</ul>
 <form className="store-form cart-address" onSubmit={submit}><h2>¿A dónde lo enviamos?</h2><p>Usamos estos datos para cotizar Correo Argentino desde San Juan y preparar tu envío.</p><div className="form-grid">
 <label>Nombre y apellido<input name="name" autoComplete="name" required minLength={3} maxLength={120} disabled={busy}/></label><label>Correo electrónico<input name="email" type="email" autoComplete="email" required maxLength={180} disabled={busy}/></label>
 <label>Teléfono<input name="phone" type="tel" autoComplete="tel" required minLength={6} maxLength={30} disabled={busy}/></label><label>Calle y altura<input name="street" autoComplete="address-line1" required minLength={3} maxLength={150} disabled={busy}/></label>
 <label>Piso, departamento o indicaciones <span>(opcional)</span><input name="detail" autoComplete="address-line2" maxLength={160} disabled={busy}/></label><label>Localidad<input name="city" autoComplete="address-level2" required minLength={2} maxLength={100} disabled={busy}/></label>
 <label>Provincia<select name="province" autoComplete="address-level1" required defaultValue="" disabled={busy}><option value="" disabled>Elegí una provincia</option>{provinces.map(p=><option key={p}>{p}</option>)}</select></label><label>Código postal<input name="postalCode" autoComplete="postal-code" required minLength={4} maxLength={8} pattern="([A-Za-z][0-9]{4}[A-Za-z]{3}|[0-9]{4})" disabled={busy}/></label></div>
 <label className="check-label"><input name="accepted" type="checkbox" required disabled={busy}/><span>Leí las <Link href="/tienda/condiciones" target="_blank">condiciones de compra y envío</Link> y la <Link href="/privacidad" target="_blank">política de privacidad</Link>.</span></label>
 {error&&<p className="form-error" role="alert">{error}</p>}<button disabled={busy} className="button solid-button cart-checkout" type="submit">{busy?'Guardando tu pedido…':'Continuar y cotizar envío'} <Icon name="arrowRight"/></button><p className="form-help">No pagás todavía. Al terminar recibís el enlace privado de tu pedido para consultar el envío y pagar el total confirmado.</p>
 </form></div>
 <aside className="cart-summary" aria-label="Resumen del carrito"><h2>Tu resumen</h2><dl><div><dt>{count} {count===1?'remera':'remeras'}</dt><dd>{money(total)}</dd></div><div><dt>Correo Argentino</dt><dd>A cotizar</dd></div></dl><div className="summary-subtotal"><span>Subtotal</span><strong>{money(total)}</strong></div><p className="shipping-note">El total final incluye el envío. Lo vas a ver antes de pagar.</p><div className="checkout-steps"><h3>Así sigue tu compra</h3><ol><li>Solicitás la cotización, sin cargo.</li><li>Confirmamos el envío y el total.</li><li>Elegís pagar con Mercado Pago.</li></ol></div><p className="dispatch-promise">Hasta <strong>7 días hábiles</strong> para preparar y despachar después del pago. El tiempo del correo se suma.</p><a className="text-link" href={'mailto:'+STORE_EMAIL}>Necesito una mano <Icon name="arrow"/></a></aside>
 </div>}</section>;
}
