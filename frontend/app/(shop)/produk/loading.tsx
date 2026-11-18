import { ProductGridSkeleton } from "@/components/shop/product-grid";

export default function LoadingProducts() {
  return <div className="shop-container page"><ProductGridSkeleton /></div>;
}
