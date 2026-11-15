'use client';
import Icon from '@/app/components/Icon';
import CatalogAdditions from './catalog-additions';
import {useState} from 'react';
import {useCart} from '@/app/components/CartProvider';
import Link from 'next/link';
import {COLORS,DESIGNS,SIZES,PRICE_ARS,STORE_EMAIL,designNames,itemKey,money,type ShirtItem} from '@/lib/store/catalog';
const pictures:Record<string,string>={'reyes-blanca':'01-franco-reyes-blanca-frente','reyes-negra':'02-franco-reyes-negra-espalda','chivo-blanca':'03-franco-chivo-blanca-espalda','chivo-negra':'04-franco-chivo-negra-frente'};
const flats:Record<string,string>={'reyes-blanca':'01-reyes-blanca-frente-y-espalda','reyes-negra':'02-reyes-negra-frente-y-espalda','chivo-blanca':'03-chivo-blanca-frente-y-espalda','chivo-negra':'04-chivo-negra-frente-y-espalda'};
export default function Storefront(){
 const [design,setDesign]=useState<ShirtItem['design']>('reyes'),[color,setColor]=useState<ShirtItem['color']>('blanca'),[size,setSize]=useState<ShirtItem['size']|''>(''),[image,setImage]=useState<'look'|'flat'>('look');
 const {cart,setCart,count,total}=useCart();const [notice,setNotice]=useState('');
 const key=design+'-'+color;
 function add(){if(!size){setNotice('Elegí un talle para sumar tu remera.');return;}if(cart.reduce((n,i)=>n+i.quantity,0)>=10){setNotice('Para más de diez productos, escribinos por correo.');return;}
 setCart(current=>{const found=current.find(i=>itemKey(i)===itemKey({design,color,size,quantity:1}));return found?current.map(i=>i===found?{...i,quantity:i.quantity+1}:i):[...current,{design,color,size,quantity:1}];});
 setNotice('Sumada al pedido. Podés elegir otra remera o continuar más abajo.');}
 return <div className="shop">
  <section className="shop-intro"><h1>La sierra,<br/><span>puesta.</span></h1><p>Remeras, libros y afiches de la película.<br/>Para vestir, leer y guardar.</p><Link href="/tienda/carrito" className="text-link">Ver mi carrito ({count}) <Icon name="arrowRight"/></Link></section>
  <nav className="shop-categories" aria-label="Catálogo"><a href="#remeras">Remeras</a><a href="#libros">Libros</a><a href="#poster">Póster</a></nav>
  <section id="remeras" className="product-layout" aria-label="Elegí tu remera">
   <div className="product-media"><div className={'product-photo '+(image==='flat'?'flat-photo':'')}><img src={'/tienda/'+(image==='look'?pictures[key]:flats[key])+'.webp'} alt={image==='look'?'Franco con la remera '+designNames[design]+' '+color:'Vista de frente y espalda de la remera '+designNames[design]+' '+color} width={image==='look'?1024:1536} height={image==='look'?1536:1024} fetchPriority="high"/></div>
    <div className="photo-switch" aria-label="Vista de la remera"><button aria-pressed={image==='look'} onClick={()=>setImage('look')}>En Franco</button><button aria-pressed={image==='flat'} onClick={()=>setImage('flat')}>Frente y espalda</button></div>
    <p className="image-caption">Visualizaciones del diseño. Estampas originales de SIERRA.</p>
   </div>
   <div className="product-copy"><h2>{designNames[design]}</h2><p className="product-price">{money(PRICE_ARS)} <span>ARS · por remera</span></p>
    <p>Una ilustración pequeña sobre el corazón. La estampa completa en la espalda, con la firma de la película.</p>
    <fieldset><legend>Diseño</legend><div className="choice-row">{DESIGNS.map(d=><button key={d} aria-pressed={d===design} onClick={()=>{setDesign(d);setNotice('');}}>{designNames[d]}</button>)}</div></fieldset>
    <fieldset><legend>Color</legend><div className="choice-row">{COLORS.map(c=><button key={c} aria-pressed={c===color} onClick={()=>setColor(c)}><span className={'fabric-dot '+c} aria-hidden="true"/>{c==='blanca'?'Blanca':'Negra'}</button>)}</div></fieldset>
    <fieldset><legend>Talle</legend><div className="choice-row size-row">{SIZES.map(s=><button key={s} aria-pressed={s===size} onClick={()=>{setSize(s);setNotice('');}}>{s}</button>)}</div><a className="size-help" href={'mailto:'+STORE_EMAIL+'?subject=Medidas%20de%20las%20remeras%20SIERRA'}>Consultar medidas y calce</a></fieldset>
    <button className="button solid-button add-button" onClick={add}>Sumar al pedido <span aria-hidden="true">+</span></button><p role="status" className="form-notice">{notice} {notice.startsWith("Sumada")&&<Link href="/tienda/carrito">Ir al carrito <Icon name="arrowRight"/></Link>}</p>
    <dl className="product-facts"><div><dt>A demanda</dt><dd>Preparamos tu remera después del pago.</dd></div><div><dt>Hasta 7 días hábiles</dt><dd>Para preparar y despachar desde San Juan.</dd></div><div><dt>A toda Argentina</dt><dd>Cotizamos Correo Argentino antes de cobrar. El tránsito del correo se suma al plazo de preparación.</dd></div></dl>
   </div>
  </section>
  <CatalogAdditions/>
  <section className="shop-story"><img src="/tienda/chivo-original.webp" alt="Ilustración original del chivo" width="400" height="400"/><div><h2>Un dibujo.<br/>Todo un mundo.</h2><p>Reyes, los animales, la montaña. Las mismas imágenes que forman parte de SIERRA, en una prenda para todos los días.</p><Link className="text-link" href="/sinopsis">Volver a la película <Icon name="arrow"/></Link></div></section>
  <section className="shop-cart-invitation" id="pedido"><div><h2>Tu selección.</h2><p>{count?count+' productos · '+money(total):'Elegí una remera, un libro o un afiche para empezar.'}</p></div><Link className="button solid-button" href="/tienda/carrito">Ver mi carrito ({count}) <Icon name="arrowRight"/></Link></section>
  <section className="shop-help"><h2>De San Juan a tu casa.</h2><p>¿Tenés una consulta sobre talles, envío o tu pedido?</p><a href={'mailto:'+STORE_EMAIL}>{STORE_EMAIL} <Icon name="arrow"/></a><div><Link href="/tienda/condiciones">Compra, cambios y envíos</Link><Link href="/tienda/arrepentimiento">Botón de arrepentimiento</Link></div></section>
 </div>;
}
