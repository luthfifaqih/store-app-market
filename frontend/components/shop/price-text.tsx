import { rupiah } from "@/lib/api";

export function PriceText({ price, original, className }: { price: number; original?: number; className?: string }) {
  const discounted = original !== undefined && original > price;
  return <span className={"shop-price " + (className ?? "")} data-discounted={discounted || undefined}>
    {discounted && <del>{rupiah(original)}</del>}<strong>{rupiah(price)}</strong>
  </span>;
}
