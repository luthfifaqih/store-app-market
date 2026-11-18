"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton({ title }: { title: string }) {
  return <Button onClick={() => window.print()}><Printer size={17} aria-hidden /> Cetak {title.toLowerCase()}</Button>;
}
