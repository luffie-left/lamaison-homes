import type { LucideIcon } from "lucide-react";

export function IconPromiseCard({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[28px] border border-black/5 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.04)]">
      <div className="mb-4 inline-flex rounded-full bg-stone-100 p-3 text-stone-800">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-lg font-medium text-stone-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-stone-600">{description}</p>
    </div>
  );
}
