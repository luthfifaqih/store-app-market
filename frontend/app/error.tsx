"use client";

import { Failure } from "@/components/feedback";

export default function PageError({ error, reset }: { error: Error; reset: () => void }) {
  return <div className="shell page"><Failure error={error} retry={reset} /></div>;
}
