import OrderStatus from './status';
export const metadata={title:'Tu pedido · SIERRA',robots:{index:false,follow:false},referrer:'no-referrer' as const};
export default async function Page({params}:{params:Promise<{token:string}>}){const {token}=await params;return <OrderStatus token={token}/>;}
