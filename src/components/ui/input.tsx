import * as React from "react";

import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "flex h-12 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-stone-900 outline-none ring-0 transition placeholder:text-stone-400 focus:border-stone-400",
        className,
      )}
      {...props}
    />
  );
}
