"use client";

import { useState } from "react";

export function DescriptionExpand({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const LIMIT = 300;
  const isLong = text.length > LIMIT;
  const display = expanded || !isLong ? text : text.slice(0, LIMIT) + "…";

  return (
    <div>
      <p className="whitespace-pre-line text-base leading-8 text-stone-600">{display}</p>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 text-sm font-medium text-stone-900 underline underline-offset-4"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}
