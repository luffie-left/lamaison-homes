import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";
import { journalPosts, journalCategories } from "@/data/mock-data";

/**
 * sitemap.xml — generated at build time.
 *
 * Static sections + journal articles + journal category taxonomy pages,
 * all derived from content (add a post/category and it appears here).
 * Stays are intentionally excluded for now: listings churn with Hostaway
 * sync and each stay page is linked from /stays, which is indexed.
 * TODO(relaunch): consider adding stay detail pages once URLs are stable.
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
    "/journal",
  ];

  const staticUrls: MetadataRoute.Sitemap = staticSections.map((section) => ({
    url: `${siteConfig.url}${section}`,
    lastModified,
    changeFrequency: section === "" ? ("weekly" as const) : ("monthly" as const),
    priority: section === "" ? 1 : 0.7,
  }));

  const journalUrls: MetadataRoute.Sitemap = journalPosts.map((post) => ({
    url: `${siteConfig.url}/journal/${post.slug}`,
    lastModified,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  const categoryUrls: MetadataRoute.Sitemap = journalCategories.map((cat) => ({
    url: `${siteConfig.url}/category/${cat.slug}`,
    lastModified,
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }));

  return [...staticUrls, ...journalUrls, ...categoryUrls];
}
