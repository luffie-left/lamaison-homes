import Image from "next/image";
import { notFound } from "next/navigation";

import { journalPosts } from "@/data/mock-data";

export function generateStaticParams() {
  return journalPosts.map((post) => ({ slug: post.slug }));
}

export default async function JournalPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = journalPosts.find((item) => item.slug === slug);

  if (!post) notFound();

  return (
    <article className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <p className="text-xs uppercase tracking-[0.3em] text-stone-500">{post.category}</p>
      <h1 className="mt-4 font-serif text-5xl leading-tight text-stone-950">{post.title}</h1>
      <p className="mt-5 text-lg leading-8 text-stone-600">{post.excerpt}</p>
      <div className="relative mt-10 min-h-[460px] overflow-hidden rounded-[36px]">
        <Image src={post.image} alt={post.title} fill className="object-cover" />
      </div>
      <div className="prose prose-stone mt-10 max-w-none text-stone-700">
        <p>
          This editorial template is ready for richer long-form content sourced from Supabase. It supports destination guides,
          owner advice, and design-and-living pieces that reinforce the La Maison Homes brand while supporting search visibility.
        </p>
        <p>
          Final implementation should include structured metadata, related articles, author blocks, and optional local stay recommendations.
        </p>
      </div>
    </article>
  );
}
