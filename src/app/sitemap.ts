import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

/**
 * sitemap.xml — pre-generated at build time.
 *
 * TODO(relaunch): replace the static section list with real URLs once the
 * site is live (pull from /stays listing data and /journal posts). Kept
 * minimal now; robots.ts keeps crawlers out until the relaunch decision.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const staticSections = [
    "",
    "/stays",
    "/destinations/melbourne",
    "/host-with-us",
    "/concierge",
    "/about",
    "/contact",
  ];
  return staticSections.map((section) => ({
    url: `${siteConfig.url}${section}`,
    lastModified,
    changeFrequency: section === "" ? ("weekly" as const) : ("monthly" as const),
    priority: section === "" ? 1 : 0.7,
  }));
}
