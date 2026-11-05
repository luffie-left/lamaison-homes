import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { EditorialCard } from "@/components/cards/editorial-card";
import { SectionHeading } from "@/components/sections/section-heading";
import { journalPosts, journalCategories } from "@/data/mock-data";
import { siteConfig } from "@/lib/site";

/**
 * /category/[slug] — journal taxonomy listing pages.
 *
 * NOTE: slugs here are derived from the current journal content categories
 * (kebab-cased). The OLD pre-rebuild site reportedly had pages like
 * /category/around-us — that content was not recoverable from git history
 * (repo starts from the fresh Next.js scaffold) or the Wayback Machine
 * (offline at time of work). When the old content surfaces, add matching
 * categories/slugs to journalCategories in mock-data.ts and they will
 * automatically appear here and in the sitemap.
 */

function findCategory(slug: string) {
  return journalCategories.find((c) => c.slug === slug);
}

export function generateStaticParams() {
  return journalCategories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = findCategory(slug);
  if (!category) return {};
  return {
    title: `${category.name} — La Maison Homes Journal`,
    description: category.description,
    alternates: { canonical: `${siteConfig.url}/category/${category.slug}` },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = findCategory(slug);
  if (!category) notFound();

  const posts = journalPosts.filter((p) => p.category === category.name);

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Journal"
        title={category.name}
        description={category.description}
      />

      {/* Category navigation — keeps every taxonomy page interlinked (no orphans) */}
      <nav aria-label="Journal categories" className="mt-8 flex flex-wrap gap-2">
        {journalCategories.map((c) => (
          <Link
            key={c.slug}
            href={`/category/${c.slug}`}
            aria-current={c.slug === slug ? "page" : undefined}
            className={
              c.slug === slug
                ? "rounded-full border border-stone-900 bg-stone-900 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-white"
                : "rounded-full border border-stone-300 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-stone-600 transition hover:border-stone-900 hover:text-stone-900"
            }
          >
            {c.name}
          </Link>
        ))}
        <Link
          href="/journal"
          className="rounded-full border border-stone-300 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-stone-600 transition hover:border-stone-900 hover:text-stone-900"
        >
          All articles
        </Link>
      </nav>

      {posts.length === 0 ? (
        <p className="mt-12 text-stone-600">
          Articles for this category are coming soon. Browse the{" "}
          <Link href="/journal" className="underline underline-offset-4">
            full journal
          </Link>{" "}
          in the meantime.
        </p>
      ) : (
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {posts.map((post) => (
            <EditorialCard
              key={post.slug}
              href={`/journal/${post.slug}`}
              image={post.image}
              category={post.category}
              title={post.title}
              excerpt={post.excerpt}
            />
          ))}
        </div>
      )}
    </div>
  );
}
