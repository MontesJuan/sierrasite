'use client';
import {createContext,useContext,useEffect,useState,type Dispatch,type SetStateAction} from 'react';
import {validateCart,type CartItem,subtotal} from '@/lib/store/catalog';
type Basket={cart:CartItem[];setCart:Dispatch<SetStateAction<CartItem[]>>;ready:boolean;count:number;total:number};
const CartContext=createContext<Basket|null>(null);
const storageKey='sierra-cart-v1';
export function CartProvider({children}:{children:React.ReactNode}){
 const [cart,setCart]=useState<CartItem[]>([]),[ready,setReady]=useState(false);
 useEffect(()=>{function read(){try{const value=JSON.parse(localStorage.getItem(storageKey)||'[]');setCart(value.length?validateCart(value):[]);}catch{setCart([]);}}read();setReady(true);const sync=(e:StorageEvent)=>{if(e.key===storageKey)read();};window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync);},[]);
 useEffect(()=>{if(ready)try{localStorage.setItem(storageKey,JSON.stringify(cart));}catch{}},[cart,ready]);
 return <CartContext.Provider value={{cart,setCart,ready,count:cart.reduce((n,i)=>n+i.quantity,0),total:subtotal(cart)}}>{children}</CartContext.Provider>;
}
export function useCart(){const c=useContext(CartContext);if(!c)throw Error('Carrito no disponible.');return c;}
