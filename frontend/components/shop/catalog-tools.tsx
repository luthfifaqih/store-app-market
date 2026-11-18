"use client";
import {useRouter} from "next/navigation";
import {PillSelect} from "@/components/ui-shared/primitives";
import {sortOptions} from "@/lib/shop";
import type {Filters} from "./panel-events";
export function SortSelect({filters}:{filters:Filters}) {
  const router=useRouter();
  return <PillSelect label="Urutan hasil katalog" value={filters.sort} options={sortOptions} onChange={sort=>{
    const params=new URLSearchParams(Object.entries({...filters,sort}).filter(([,v])=>v));
    router.push("/produk?"+params,{scroll:false});
  }}/>;
}
