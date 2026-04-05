"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { siteConfig } from "@/lib/site";

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-[rgba(247,242,235,0.88)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="text-lg font-semibold tracking-[0.18em] text-stone-900 uppercase"
          onClick={() => setMenuOpen(false)}
        >
          La Maison Homes
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 lg:flex">
          {siteConfig.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "text-sm text-stone-700 transition hover:text-stone-950",
                pathname === item.href && "text-stone-950 font-medium",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden items-center gap-4 lg:flex">
          <Link href="/host-with-us" className="text-sm text-stone-700 hover:text-stone-950">
            List Your Property
          </Link>
          <Link
            href="/stays"
            className="rounded-full bg-stone-950 px-5 py-2.5 text-sm font-medium text-stone-50 transition hover:bg-stone-800"
          >
            Book a Stay
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          className="inline-flex rounded-full border border-black/10 p-2 lg:hidden"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="lg:hidden border-t border-black/5 bg-[rgba(247,242,235,0.98)] backdrop-blur-xl">
          <nav className="mx-auto max-w-7xl px-4 py-4 sm:px-6 flex flex-col gap-1">
            {siteConfig.nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "rounded-xl px-4 py-3 text-sm text-stone-700 transition hover:bg-black/5 hover:text-stone-950",
                  pathname === item.href && "bg-black/5 text-stone-950 font-medium",
                )}
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-3 pt-3 border-t border-black/5 flex flex-col gap-2">
              <Link
                href="/host-with-us"
                onClick={() => setMenuOpen(false)}
                className="rounded-xl px-4 py-3 text-sm text-stone-700 transition hover:bg-black/5 hover:text-stone-950"
              >
                List Your Property
              </Link>
              <Link
                href="/stays"
                onClick={() => setMenuOpen(false)}
                className="rounded-full bg-stone-950 px-5 py-3 text-center text-sm font-medium text-stone-50 transition hover:bg-stone-800"
              >
                Book a Stay
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
