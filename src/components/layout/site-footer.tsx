import Link from "next/link";

import { siteConfig } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-black/5 bg-stone-950 text-stone-200">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.4fr_repeat(4,1fr)] lg:px-8">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.3em] text-stone-400">La Maison Homes</p>
          <h2 className="max-w-sm text-2xl font-medium leading-tight text-stone-50">
            Curated Melbourne stays with hotel-grade care.
          </h2>
          <p className="max-w-md text-sm leading-6 text-stone-400">
            Beautifully selected homes. Seamless guest stays. Professional short-stay management.
          </p>
        </div>

        {siteConfig.footerGroups.map((group) => (
          <div key={group.title}>
            <h3 className="mb-4 text-sm font-medium text-stone-50">{group.title}</h3>
            <ul className="space-y-3 text-sm text-stone-400">
              {group.links.map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="transition hover:text-stone-50">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </footer>
  );
}
