import { SkeletonCard } from "@/components/ui-shared/primitives";

export default function ShopLoading() {
  return <div className="shop-container page"><SkeletonCard lines={4} /></div>;
}
