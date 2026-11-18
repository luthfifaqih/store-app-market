"use client";
import {useRouter} from "next/navigation";
import {useCart} from "@/components/providers";
import {amountString} from "@/lib/shop";
import type {Product} from "@/lib/types";
export function BuyNow({product}:{product:Product}){
 const cart=useCart();const router=useRouter();
 const unit=product.units.find(u=>Number(u.stock)>Number(cart.items.find(i=>i.product_unit_id===u.id)?.quantity??0));
 async function buy(){if(!unit)return;const remaining=Number(unit.stock)-Number(cart.items.find(i=>i.product_unit_id===unit.id)?.quantity??0);const qty=amountString(Math.min(1,remaining));
 if(await cart.add(unit.id,qty,{product_id:product.id,product_unit_id:unit.id,product_name:product.name,quantity:qty,unit_price:unit.price,unit_name:unit.name,fractional:unit.fractional,stock:unit.stock,image_url:product.image_url},"checkout"))router.push("/checkout");}
 return <button className="store-cta" disabled={!unit||cart.pending||!cart.ready} onClick={buy}>Beli sekarang</button>;
}
