import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

/**
 * robots.txt — pre-generated at build time.
 *
 * During pre-relaunch (noindex phase) we disallow everything. At relaunch,
 * flip `ALLOW_CRAWLERS` to true (or set env ROBOTS_ALLOW=1) and ship a
 * sitemap.xml (see sitemap.ts TODO) so the switch is a one-line change.
 */
const ALLOW_CRAWLERS = process.env.ROBOTS_ALLOW === "1";

export default function robots(): MetadataRoute.Robots {
  if (ALLOW_CRAWLERS) {
    return {
      rules: [{ userAgent: "*", allow: "/" }],
      sitemap: `${siteConfig.url}/sitemap.xml`,
      host: siteConfig.url,
    };
  }
  return {
    rules: [{ userAgent: "*", disallow: "/" }],
  };
}
