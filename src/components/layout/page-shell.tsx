import type { ReactNode } from "react";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-[#f7f2eb] text-stone-900">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
