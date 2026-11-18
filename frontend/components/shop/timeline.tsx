import { Check, Circle, X } from "lucide-react";
import { StatusBadge } from "@/components/ui-shared/primitives";
import type { Order } from "@/lib/types";

export function OrderTimeline({ order }: { order: Order }) {
  const steps = order.status === "dibatalkan" ? ["pending", "dibatalkan"] :
    ["pending", "dikonfirmasi", "diproses", ...(order.fulfillment === "pickup" ? [] : ["dikirim"]), "selesai"];
  const current = steps.indexOf(order.status);
  return <ol className="shop-timeline" aria-label="Status pesanan">
    {steps.map((step, index) => <li key={step} aria-current={index === current ? "step" : undefined} data-done={index < current || undefined}>
      <span className="shop-timeline-marker">{step === "dibatalkan" ? <X size={13} aria-hidden /> : index < current ? <Check size={13} aria-hidden /> : <Circle size={8} fill="currentColor" aria-hidden />}</span>
      <StatusBadge status={step} />
    </li>)}
  </ol>;
}
