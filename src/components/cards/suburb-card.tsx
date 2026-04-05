export function SuburbCard({ name }: { name: string }) {
  return (
    <div className="rounded-[24px] border border-black/5 bg-white px-5 py-4 text-sm font-medium text-stone-800 shadow-[0_20px_50px_rgba(15,23,42,0.04)]">
      {name}
    </div>
  );
}
