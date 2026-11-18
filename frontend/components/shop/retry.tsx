"use client";

import { useRouter } from "next/navigation";
import { Failure } from "@/components/feedback";

export function ShopRetry() {
  const router = useRouter();
  return <Failure error={new Error()} retry={() => router.refresh()} />;
}
