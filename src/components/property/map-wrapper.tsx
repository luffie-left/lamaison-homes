"use client";

import dynamic from "next/dynamic";

const PropertyMapInner = dynamic(
  () => import("./property-map").then((m) => m.PropertyMap),
  {
    ssr: false,
    loading: () => (
      <div
        style={{ height: 400 }}
        className="flex items-center justify-center rounded-2xl bg-stone-100 text-sm text-stone-400"
      >
        Loading map…
      </div>
    ),
  }
);

export function MapWrapper(props: { lat: number; lng: number; suburb: string; city: string }) {
  return <PropertyMapInner {...props} />;
}
