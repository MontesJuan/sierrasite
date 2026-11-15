export const STORE_NAME='SIERRA, un documental de Juan F. Montes';
export const STORE_EMAIL='montesjuanfrancisco@gmail.com';
export const PRICE_ARS=70000;
export const SIZES=['S','M','L','XL'] as const;
export const DESIGNS=['reyes','chivo'] as const;
export const COLORS=['blanca','negra'] as const;
export type CartItem={design:typeof DESIGNS[number];color:typeof COLORS[number];size:typeof SIZES[number];quantity:number};
export const designNames={reyes:'Reyes y sus chivos',chivo:'El chivo'};
export const itemName=(i:CartItem)=>designNames[i.design]+' · '+i.color+' · '+i.size;
export const money=(v:number)=>new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:2,minimumFractionDigits:Number.isInteger(v)?0:2}).format(v);
export function validateCart(input:unknown):CartItem[]{
 if(!Array.isArray(input)||input.length<1||input.length>16)throw Error('Elegí al menos una remera.');
 const result:CartItem[]=[];
 for(const r of input){
  if(!r||!DESIGNS.includes(r.design)||!COLORS.includes(r.color)||!SIZES.includes(r.size)||!Number.isInteger(r.quantity)||r.quantity<1||r.quantity>10)throw Error('Revisá el diseño, color, talle y cantidad.');
  if(result.some(x=>x.design===r.design&&x.color===r.color&&x.size===r.size))throw Error('La misma variante aparece dos veces.');
  result.push({design:r.design,color:r.color,size:r.size,quantity:r.quantity});
 }
 if(result.reduce((n,r)=>n+r.quantity,0)>10)throw Error('Para más de diez remeras, escribinos por correo.');
 return result;
}
export const subtotal=(items:CartItem[])=>items.reduce((n,i)=>n+i.quantity*PRICE_ARS,0);
