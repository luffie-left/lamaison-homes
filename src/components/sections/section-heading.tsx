import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={cn("space-y-4", align === "center" && "mx-auto max-w-3xl text-center")}>
      {eyebrow ? <p className="text-xs uppercase tracking-[0.3em] text-stone-500">{eyebrow}</p> : null}
      <h2 className="font-serif text-3xl leading-tight text-stone-950 sm:text-4xl">{title}</h2>
      {description ? <p className="max-w-2xl text-base leading-7 text-stone-600">{description}</p> : null}
    </div>
  );
}
