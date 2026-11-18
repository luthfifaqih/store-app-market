import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva("inline-flex min-h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-800 disabled:pointer-events-none disabled:opacity-50", {
  variants: { variant: {
    default: "bg-[#174c33] text-white hover:bg-[#246847]",
    outline: "border border-[#ccd9cc] bg-white text-[#174c33] hover:bg-[#edf5ec]",
    ghost: "text-[#174c33] hover:bg-[#edf5ec]",
    danger: "bg-red-700 text-white hover:bg-red-800",
  } },
  defaultVariants: { variant: "default" },
});

export function Button({ className, variant, asChild, type, ...props }: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Component = asChild ? Slot : "button";
  return <Component data-button-variant={variant ?? "default"} className={cn(buttonVariants({ variant }), className)} type={asChild ? undefined : type ?? "button"} {...props} />;
}
