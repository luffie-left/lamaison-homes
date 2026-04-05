"use client";

import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SearchModule() {
  return (
    <div className="grid gap-3 rounded-[30px] border border-white/20 bg-white/85 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.14)] backdrop-blur lg:grid-cols-[1.2fr_repeat(3,1fr)_auto] lg:items-end">
      {[
        ["Destination", "Melbourne"],
        ["Check-in", "Add date"],
        ["Check-out", "Add date"],
        ["Guests", "2 guests"],
      ].map(([label, placeholder]) => (
        <div key={label} className="space-y-2">
          <label className="text-xs uppercase tracking-[0.24em] text-stone-500">{label}</label>
          <Input placeholder={placeholder} className="border-black/5 bg-white" />
        </div>
      ))}
      <Button className="h-12 gap-2 px-5">
        <Search className="h-4 w-4" />
        Search
      </Button>
    </div>
  );
}
