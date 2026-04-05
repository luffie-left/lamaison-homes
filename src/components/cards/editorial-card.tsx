import Image from "next/image";
import Link from "next/link";

export function EditorialCard({
  href,
  image,
  category,
  title,
  excerpt,
}: {
  href: string;
  image: string;
  category: string;
  title: string;
  excerpt: string;
}) {
  return (
    <Link href={href} className="group block overflow-hidden rounded-[28px] bg-white shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
      <div className="relative aspect-[5/4] overflow-hidden">
        <Image src={image} alt={title} fill className="object-cover transition duration-700 group-hover:scale-105" />
      </div>
      <div className="space-y-3 p-6">
        <p className="text-xs uppercase tracking-[0.28em] text-stone-500">{category}</p>
        <h3 className="text-xl font-medium text-stone-950">{title}</h3>
        <p className="text-sm leading-6 text-stone-600">{excerpt}</p>
      </div>
    </Link>
  );
}
