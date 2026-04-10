import Image from "next/image";

export function PhotoPromiseCard({
  image,
  title,
  description,
}: {
  image: string;
  title: string;
  description: string;
}) {
  return (
    <div className="group rounded-[28px] overflow-hidden border border-black/5 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
      <div className="relative h-44 overflow-hidden">
        <Image
          src={image}
          alt={title}
          fill
          className="object-cover transition duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <h3 className="absolute bottom-4 left-4 right-4 text-white font-medium text-base leading-tight">
          {title}
        </h3>
      </div>
      <div className="p-5">
        <p className="text-sm leading-6 text-stone-600">{description}</p>
      </div>
    </div>
  );
}
