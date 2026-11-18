"use client";

import { Failure } from "@/components/feedback";
import { useCart } from "@/components/providers";

export function CartFeedback() {
  const cart = useCart();
  return <>
    {cart.notice && <p className="feedback" role="status">{cart.notice}</p>}
    {cart.loadError && <Failure error={cart.loadError} retry={cart.reload} />}
  </>;
}
