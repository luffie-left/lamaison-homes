import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-full text-sm font-medium transition focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-stone-950 px-5 py-3 text-stone-50 hover:bg-stone-800",
        outline: "border border-stone-950 px-5 py-3 text-stone-950 hover:bg-stone-950 hover:text-stone-50",
        ghost: "px-0 py-0 text-stone-700 hover:text-stone-950",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant }), className)} {...props} />;
}
