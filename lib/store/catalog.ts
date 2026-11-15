export const STORE_NAME='SIERRA, un documental de Juan F. Montes';
export const STORE_EMAIL='montesjuanfrancisco@gmail.com';
export const PRICE_ARS=70000;
export const SIZES=['S','M','L','XL'] as const;
export const DESIGNS=['reyes','chivo'] as const;
export const COLORS=['blanca','negra'] as const;
export const BOOKS=['trovador-vallisto','antologia-poetica','detras-de-la-tranquera'] as const;
export const POSTER_FORMATS=['cine','a3','a4'] as const;
export type ShirtItem={kind?:'shirt';design:typeof DESIGNS[number];color:typeof COLORS[number];size:typeof SIZES[number];quantity:number};
export type BookItem={kind:'book';book:typeof BOOKS[number];quantity:number};
export type PosterItem={kind:'poster';format:typeof POSTER_FORMATS[number];quantity:number};
export type CartItem=ShirtItem|BookItem|PosterItem;
export type OrderItem=CartItem&{unitPriceArs?:number};
export const designNames={reyes:'Reyes y sus chivos',chivo:'El chivo'};
export const books={
 'trovador-vallisto':{title:'Trovador Vallisto',author:'Ladislao Reyes Chávez',description:'La voz del poeta de la sierra. El libro que abrió un camino hacia la película.',image:'/tienda/trovador-vallisto.webp'},
 'antologia-poetica':{title:'Antología Poética',author:'Ladislao Reyes Chávez',description:'Los versos de Reyes, reunidos en el libro que forma parte de esta historia.',image:'/tienda/antologia-poetica.webp'},
 'detras-de-la-tranquera':{title:'Detrás de la tranquera',author:'Juan F. Montes',description:'Un fotolibro sobre los viajes, los encuentros y el proceso de hacer SIERRA.',image:'/tienda/detras-de-la-tranquera.webp'},
} as const;
export const posterFormats={cine:{label:'Cine',dimensions:'60 × 90 cm',price:50000},a3:{label:'A3',dimensions:'29,7 × 42 cm',price:20000},a4:{label:'A4',dimensions:'21 × 29,7 cm',price:15000}} as const;
export const shirtImages:Record<string,string>={'reyes-blanca':'01-franco-reyes-blanca-frente','reyes-negra':'02-franco-reyes-negra-espalda','chivo-blanca':'03-franco-chivo-blanca-espalda','chivo-negra':'04-franco-chivo-negra-frente'};
export const money=(v:number)=>new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:2,minimumFractionDigits:Number.isInteger(v)?0:2}).format(v);
export function itemKey(i:CartItem){return i.kind==='book'?'book-'+i.book:i.kind==='poster'?'poster-'+i.format:'shirt-'+i.design+'-'+i.color+'-'+i.size;}
export function itemTitle(i:CartItem){return i.kind==='book'?books[i.book].title:i.kind==='poster'?'Póster SIERRA':designNames[i.design];}
export function itemDetail(i:CartItem){return i.kind==='book'?books[i.book].author:i.kind==='poster'?posterFormats[i.format].label+' · '+posterFormats[i.format].dimensions:(i.color==='blanca'?'Blanca':'Negra')+' · Talle '+i.size+' · Oversize';}
export const itemName=(i:CartItem)=>itemTitle(i)+' · '+itemDetail(i);
export function itemImage(i:CartItem){return i.kind==='book'?books[i.book].image:i.kind==='poster'?'/tienda/poster-sierra.webp':'/tienda/'+shirtImages[i.design+'-'+i.color]+'.webp';}
export function itemPrice(i:CartItem){return i.kind==='book'?20000:i.kind==='poster'?posterFormats[i.format].price:PRICE_ARS;}
export function orderItemPrice(i:OrderItem){return i.unitPriceArs??itemPrice(i);}
export function validateCart(input:unknown):CartItem[]{
 if(!Array.isArray(input)||input.length<1||input.length>16)throw Error('Elegí al menos un producto.');
 const result:CartItem[]=[];
 for(const r of input){
  if(!r||!Number.isInteger(r.quantity)||r.quantity<1||r.quantity>10)throw Error('Revisá la cantidad de cada producto.');
  let item:CartItem;
  if(r.kind==='book'&&BOOKS.includes(r.book))item={kind:'book',book:r.book,quantity:r.quantity};
  else if(r.kind==='poster'&&POSTER_FORMATS.includes(r.format))item={kind:'poster',format:r.format,quantity:r.quantity};
  else if((r.kind===undefined||r.kind==='shirt')&&DESIGNS.includes(r.design)&&COLORS.includes(r.color)&&SIZES.includes(r.size))item={design:r.design,color:r.color,size:r.size,quantity:r.quantity};
  else throw Error('Revisá el producto y la variante elegida.');
  if(result.some(x=>itemKey(x)===itemKey(item)))throw Error('La misma variante aparece dos veces.');
  result.push(item);
 }
 if(result.reduce((n,r)=>n+r.quantity,0)>10)throw Error('Para más de diez productos, escribinos por correo.');
 return result;
}
export const subtotal=(items:CartItem[])=>items.reduce((n,i)=>n+i.quantity*itemPrice(i),0);
// Called only after validation: browser-supplied prices are discarded.
export const snapshotItems=(items:CartItem[]):OrderItem[]=>items.map(i=>({...i,unitPriceArs:itemPrice(i)}));
export function checkoutItems(items:OrderItem[],expectedSubtotal:number){
 const canonical=validateCart(items);
 const lines=canonical.map((i,index)=>{
  const price=orderItemPrice({...i,unitPriceArs:items[index].unitPriceArs});
  if(!Number.isSafeInteger(price)||price<=0)throw Error('El importe del pedido requiere revisión.');
  return {id:itemKey(i),title:'SIERRA · '+itemName(i),description:i.kind==='book'?'Libro físico. Edición a pedido.':i.kind==='poster'?'Afiche impreso de SIERRA, sin marco.':'Remera oversize a demanda.',quantity:i.quantity,unit_price:price,currency_id:'ARS',category_id:i.kind==='book'?'entertainment':i.kind==='poster'?'art':'fashion'};
 });
 if(lines.reduce((n,i)=>n+i.quantity*i.unit_price,0)!==expectedSubtotal)throw Error('El importe del pedido requiere revisión.');
 return lines;
}
