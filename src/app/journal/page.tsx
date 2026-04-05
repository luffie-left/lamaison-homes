import { EditorialCard } from "@/components/cards/editorial-card";
import { SectionHeading } from "@/components/sections/section-heading";
import { journalPosts } from "@/data/mock-data";

export default function JournalPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Journal"
        title="Editorial content for Melbourne guides, hosting insights, and design-led short stays."
        description="Journal bridges SEO, brand positioning, and owner education without compromising the premium tone."
      />
      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        {journalPosts.map((post) => (
          <EditorialCard key={post.slug} href={`/journal/${post.slug}`} image={post.image} category={post.category} title={post.title} excerpt={post.excerpt} />
        ))}
      </div>
    </div>
  );
}
