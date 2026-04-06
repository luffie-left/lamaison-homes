"use client";

import { useEffect, useRef } from "react";

interface PropertyMapProps {
  lat: number;
  lng: number;
  suburb: string;
  city: string;
}

export function PropertyMap({ lat, lng, suburb, city }: PropertyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Randomise pin within ~100m
    const OFFSET = 0.00045; // ~50m offset
    const displayLat = lat + (Math.random() - 0.5) * OFFSET;
    const displayLng = lng + (Math.random() - 0.5) * OFFSET;

    import("leaflet").then((L) => {
      // Fix default icon paths for Next.js
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current!, {
        center: [displayLat, displayLng],
        zoom: 15,
        zoomControl: true,
        scrollWheelZoom: false,
        dragging: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Show circle instead of precise pin
      L.circle([displayLat, displayLng], {
        radius: 50,
        color: "#c9a96e",
        fillColor: "#f7f2eb",
        fillOpacity: 0.5,
        weight: 2,
        opacity: 0.8,
      }).addTo(map);

      mapInstanceRef.current = map;
    });

    return () => {
      if (mapInstanceRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mapInstanceRef.current as any).remove();
        mapInstanceRef.current = null;
      }
    };
  }, [lat, lng]);

  return (
    <div>
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"
      />
      <div
        ref={mapRef}
        style={{ height: "400px" }}
        className="w-full rounded-2xl overflow-hidden z-0"
      />
      <p className="mt-3 text-sm text-stone-500">
        📍 {suburb}, {city} · Exact location provided after booking
      </p>
    </div>
  );
}
