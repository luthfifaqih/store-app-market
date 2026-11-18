import { SkeletonCard } from "@/components/admin/primitives";

export default function LoadingAdmin() {
  return <div className="admin-loading"><SkeletonCard lines={4} /></div>;
}
