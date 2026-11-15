'use client';
import {useState} from 'react';
import Link from 'next/link';
import {useCart} from '@/app/components/CartProvider';
import Icon from '@/app/components/Icon';
import {BOOKS,POSTER_FORMATS,books,posterFormats,itemKey,itemTitle,itemPrice,money,type CartItem,type PosterItem} from '@/lib/store/catalog';

export default function CatalogAdditions(){
 const {setCart,count}=useCart();
 const [format,setFormat]=useState<PosterItem['format']>('cine');
 const [notice,setNotice]=useState<{section:'books'|'poster';key:string;text:string}|null>(null);
 function add(item:CartItem,section:'books'|'poster'){
  if(count>=10){setNotice({section,key:itemKey(item),text:'El carrito admite hasta diez productos. Para un pedido mayor, escribinos.'});return;}
  setCart(current=>{const key=itemKey(item);return current.some(i=>itemKey(i)===key)?current.map(i=>itemKey(i)===key?{...i,quantity:i.quantity+1}:i):[...current,item];});
  setNotice({section,key:itemKey(item),text:itemTitle(item)+' se sumó a tu carrito. '+(count+1)+' '+(count===0?'producto elegido.':'productos elegidos.')});
 }
 const message=(section:'books'|'poster',key?:string)=><p className="catalog-notice" role="status">{notice?.section===section&&(!key||notice.key===key)&&<>{notice.text} <Link href="/tienda/carrito">Ver carrito <Icon name="arrowRight"/></Link></>}</p>;
 return <>
  <section className="books-section" id="libros" aria-labelledby="books-title">
   <div className="catalog-heading"><h2 id="books-title">La sierra,<br/>en papel.</h2><p>La poesía de Reyes y el cuaderno de viaje de la película. Tres libros, tres maneras de volver.</p></div>
   <p id="book-edition-note" className="catalog-edition-note">Propuestas de tapa para libros físicos a pedido. Confirmamos la edición y el envío antes de habilitar el pago.</p>
   <div className="book-grid">{BOOKS.map(book=>{const b=books[book];const item:CartItem={kind:'book',book,quantity:1};return <article className="book-product" key={book}>
    <div className="book-cover"><img src={b.image} alt={'Tapa de '+b.title} width={1200} height={1200} loading="lazy"/></div>
    <p className="book-author">{b.author}</p><h3>{b.title}</h3><p className="book-description">{b.description}</p><p className="catalog-price">{money(itemPrice(item))} <span>ARS · por ejemplar</span></p>
    <button className="button" aria-describedby="book-edition-note" aria-label={'Sumar '+b.title+' al carrito'} onClick={()=>add(item,'books')}>Sumar al pedido <span aria-hidden="true">+</span></button>
    {message('books',itemKey(item))}
   </article>;})}</div>
  </section>
  <section className="poster-section" id="poster" aria-labelledby="poster-title">
   <div className="poster-art"><img src="/tienda/poster-sierra.webp" alt="Afiche oficial de SIERRA, un documental de Juan F. Montes" width="1000" height="1500" loading="lazy"/></div>
   <div className="product-copy"><h2 id="poster-title">El afiche.</h2><p>La imagen original de SIERRA, con su firma y sus créditos. Para llevar un pedacito de la película a tu casa.</p>
    <fieldset><legend>Tamaño del póster</legend><div className="choice-row poster-sizes">{POSTER_FORMATS.map(f=><button key={f} aria-pressed={f===format} onClick={()=>setFormat(f)}><span>{posterFormats[f].label}<small>{posterFormats[f].dimensions}</small></span></button>)}</div></fieldset>
    <p className="product-price">{money(posterFormats[format].price)} <span>ARS · por póster</span></p>
    <button className="button solid-button add-button" onClick={()=>add({kind:'poster',format,quantity:1},'poster')}>Sumar póster al pedido <span aria-hidden="true">+</span></button>{message('poster')}
    <dl className="product-facts"><div><dt>Diseño completo</dt><dd>Conservamos la proporción del afiche en todos los formatos, sin recortar el arte ni los créditos.</dd></div><div><dt>Impreso, sin marco</dt><dd>El envío se cotiza según el formato y el embalaje de tu pedido.</dd></div><div><dt>Un solo carrito</dt><dd>Podés combinar libros, pósters y remeras, y pagar el total confirmado con Mercado Pago.</dd></div></dl>
   </div>
  </section>
 </>;
}
