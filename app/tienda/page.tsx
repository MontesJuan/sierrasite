import type {Metadata} from 'next';
import Storefront from './storefront';
export const metadata:Metadata={title:'Remeras · SIERRA',description:'Las ilustraciones de SIERRA, para llevar. Remeras oversize blancas y negras, a demanda. Envíos a toda Argentina.',alternates:{canonical:'/tienda'}};
export default function StorePage(){return <Storefront/>;}
