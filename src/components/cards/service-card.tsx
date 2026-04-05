export function ServiceCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[28px] border border-black/5 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.04)]">
      <h3 className="text-lg font-medium text-stone-950">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-stone-600">{description}</p>
    </div>
  );
}
