"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";

// Bundled, same-origin Leaflet CSS.
//
// This used to be a <link> to cdnjs inside the component, which the site CSP
// (`style-src 'self' 'unsafe-inline'`) blocked. Tiles still downloaded, so the
// map rendered as scattered, overlapping image fragments — Leaflet's
// positioning rules never applied. Importing the packaged stylesheet keeps it
// same-origin, satisfies CSP, and removes a third-party runtime dependency.
import "leaflet/dist/leaflet.css";

interface PropertyMapProps {
  lat: number;
  lng: number;
  suburb: string;
  city: string;
}

export function PropertyMap({ lat, lng, suburb, city }: PropertyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Randomise pin within ~100m so the exact address is not disclosed.
    const OFFSET = 0.00045; // ~50m offset
    const displayLat = lat + (Math.random() - 0.5) * OFFSET;
    const displayLng = lng + (Math.random() - 0.5) * OFFSET;

    let cancelled = false;
    let resizeObserver: ResizeObserver | undefined;

    import("leaflet").then((L) => {
      // Effect may have been cleaned up (or re-run by React Strict Mode)
      // before the chunk finished loading.
      if (cancelled || !mapRef.current || mapInstanceRef.current) return;

      const map = L.map(mapRef.current, {
        center: [displayLat, displayLng],
        zoom: 15,
        zoomControl: true,
        scrollWheelZoom: false,
        dragging: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Show an approximate circle instead of a precise pin.
      L.circle([displayLat, displayLng], {
        radius: 50,
        color: "#c9a96e",
        fillColor: "#f7f2eb",
        fillOpacity: 0.5,
        weight: 2,
        opacity: 0.8,
      }).addTo(map);

      // The map sits in a fluid, responsive column; Leaflet only listens to
      // window resizes. Keep it in sync when the container itself changes.
      resizeObserver = new ResizeObserver(() => map.invalidateSize());
      resizeObserver.observe(mapRef.current);

      mapInstanceRef.current = map;
    });

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
    };
  }, [lat, lng]);

  return (
    <div>
      <div
        ref={mapRef}
        style={{ height: "400px" }}
        className="z-0 w-full overflow-hidden rounded-2xl"
      />
      <p className="mt-3 text-sm text-stone-500">
        📍 {suburb}, {city} · Exact location provided after booking
      </p>
    </div>
  );
}
