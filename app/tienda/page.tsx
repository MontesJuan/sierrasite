import type {Metadata} from 'next';
import Storefront from './storefront';
export const metadata:Metadata={title:'Tienda · SIERRA',description:'Remeras oversize, Trovador Vallisto, Antología Poética, Detrás de la tranquera y el afiche de SIERRA. Mercado Pago y envíos a toda Argentina.',alternates:{canonical:'/tienda'}};
export default function StorePage(){return <Storefront/>;}
