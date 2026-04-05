export function TestimonialCard({
  quote,
  author,
  meta,
}: {
  quote: string;
  author: string;
  meta: string;
}) {
  return (
    <div className="rounded-[28px] border border-black/5 bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.04)]">
      <p className="text-lg leading-8 text-stone-700">“{quote}”</p>
      <div className="mt-6">
        <p className="font-medium text-stone-950">{author}</p>
        <p className="text-sm text-stone-500">{meta}</p>
      </div>
    </div>
  );
}
