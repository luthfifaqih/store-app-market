"use client";

import { useState } from "react";
import {openPanel,type Filters,type Facets} from "./panel-events";
import { alert } from "@/lib/alert";
import { SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PillSelect } from "@/components/ui-shared/primitives";
import type { Category } from "@/lib/types";
import { SearchPill } from "./navigation";

import { sortOptions } from "@/lib/shop";

const available = [{ value: "", label: "Semua produk" }, { value: "available", label: "Tersedia" }, { value: "sold-out", label: "Habis" }];

export function CatalogSearch({ filters }: { filters: Filters }) {
  return <form className="shop-catalog-search" action="/produk" role="search">
    <SearchPill name="q" defaultValue={filters.q} aria-label="Cari produk di katalog" placeholder="Cari nama produk…" />
    {Object.entries(filters).filter(([key, value]) => key !== "q" && value).map(([key, value]) => <input type="hidden" key={key} name={key} value={value} />)}
    <Button type="submit">Cari</Button>
  </form>;
}

export function FilterSheet({ filters, categories, facets }: { filters: Filters; categories: Category[]; facets?:Facets }) {
  return <Button variant="outline" className="shop-filter-trigger" onClick={()=>openPanel({type:"filter",filters,categories,facets})}><SlidersHorizontal size={17}/> Filter</Button>;
}

export function FilterFields({ filters, categories, facets, close }: { filters: Filters; categories: Category[]; facets?:Facets; close?: () => void }) {
  const [draft, setDraft] = useState(filters);
  const router = useRouter();
  const options = [{ value: "", label: "Semua kategori" }, ...categories.map((item) => ({ value: String(item.id), label: item.name + (facets ? " ("+(facets.categories[item.id]??0)+")":"") }))];
  function apply(reset = false) {
    if(!reset && [draft.min_price,draft.max_price].some(v=>v && (!/^\d{1,9}$/.test(v) || Number(v)>100000000))){void alert.warning("Periksa harga","Gunakan harga bulat antara Rp 0 dan Rp 100.000.000.");return;}
    if (!reset && draft.min_price && draft.max_price && +draft.min_price>+draft.max_price){void alert.warning("Periksa rentang harga","Harga minimum melebihi harga maksimum.");return;}
    const values = reset ? { q: filters.q } : draft;
    router.push("/produk?" + new URLSearchParams(Object.entries(values).filter(([, value]) => value)), { scroll: false });
    close?.();
  }
  return <form noValidate className="shop-filter-fields" onSubmit={(event) => { event.preventDefault(); apply(); }}>
    <div><span>Kategori</span><PillSelect label="Kategori produk" value={draft.kategori} options={options} onChange={(kategori) => setDraft({ ...draft, kategori })} /></div>
    <div><span>Urutan</span><PillSelect label="Urutkan produk" value={draft.sort} options={sortOptions} onChange={(sort) => setDraft({ ...draft, sort })} /></div>
    <fieldset><legend>Harga satuan (Rp)</legend><div className="price-fields">{(["min_price","max_price"] as const).map((key,i)=><input key={key} className="control" type="number" min="0" max="100000000" inputMode="numeric" aria-label={i?"Harga maksimum":"Harga minimum"} placeholder={i?"Maksimum":"Minimum"} value={draft[key]} onChange={e=>setDraft({...draft,[key]:e.target.value})}/>)}</div>{!!facets?.max_price&&<input aria-label="Batas harga maksimum" type="range" min="0" max={facets.max_price} value={draft.max_price||facets.max_price} onChange={e=>setDraft({...draft,max_price:e.target.value})}/>}</fieldset>
    {!!facets?.units.length&&<div><span>Satuan / kemasan</span><PillSelect label="Filter satuan" value={draft.unit} options={[{value:"",label:"Semua satuan"},...facets.units.map(u=>({value:u,label:u}))]} onChange={unit=>setDraft({...draft,unit})}/></div>}
    <div><span>Ketersediaan</span><PillSelect label="Ketersediaan produk" value={draft.stok} options={available} onChange={(stok) => setDraft({ ...draft, stok })} /></div>
    <label className="shop-check"><input type="checkbox" checked={draft.grosir === "1"} onChange={(event) => setDraft({ ...draft, grosir: event.target.checked ? "1" : "" })} /> Harga grosir</label>
    <Button type="submit">Terapkan filter</Button>
    <Button type="button" variant="ghost" onClick={() => { setDraft({ ...filters, kategori: "", sort: "", stok: "", grosir: "",unit:"",min_price:"",max_price:"" }); apply(true); }}>Atur ulang</Button>
  </form>;
}
