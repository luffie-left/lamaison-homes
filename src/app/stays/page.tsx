"use client";

import { useState, useEffect, useCallback } from "react";
import { Search } from "lucide-react";

import { PropertyCard } from "@/components/cards/property-card";
import { SectionHeading } from "@/components/sections/section-heading";
import type { Property } from "@/data/mock-data";

const LOCATIONS = ["All Melbourne", "Box Hill", "CBD", "Doncaster", "Fitzroy", "Melbourne", "Southbank", "South Yarra"];
const BEDROOM_OPTIONS = ["Any", "1", "2", "3", "4+"];
const GUEST_OPTIONS = ["Any", "1", "2", "3", "4", "5", "6+"];

export default function StaysPage() {
  const [allStays, setAllStays] = useState<Property[]>([]);
  const [results, setResults] = useState<Property[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  // Filter state
  const [location, setLocation] = useState("All Melbourne");
  const [bedrooms, setBedrooms] = useState("Any");
  const [guests, setGuests] = useState("Any");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");

  // Load all stays once on mount (but don't show them)
  useEffect(() => {
    const load = async () => {
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
        const res = await fetch(`${appUrl}/api/stays`, { next: { revalidate: 300 } } as RequestInit);
        if (!res.ok) return;
        const data = await res.json();
        setAllStays(data.stays ?? []);
      } catch {}
    };
    load();
  }, []);

  const applyFilters = useCallback(() => {
    setLoading(true);
    setSearched(true);

    const filtered = allStays.filter((s) => {
      if (location !== "All Melbourne" && !s.suburb?.toLowerCase().includes(location.toLowerCase()) && !s.city?.toLowerCase().includes(location.toLowerCase())) return false;
      if (bedrooms !== "Any") {
        const minBeds = bedrooms === "4+" ? 4 : parseInt(bedrooms);
        if (bedrooms === "4+" ? s.bedrooms < 4 : s.bedrooms !== minBeds) return false;
      }
      if (guests !== "Any") {
        const minGuests = guests === "6+" ? 6 : parseInt(guests);
        if (guests === "6+" ? s.sleeps < 6 : s.sleeps < minGuests) return false;
      }
      if (priceMin && s.startingPrice < parseInt(priceMin)) return false;
      if (priceMax && s.startingPrice > parseInt(priceMax)) return false;
      return true;
    });

    setResults(filtered);
    setLoading(false);
  }, [allStays, location, bedrooms, guests, priceMin, priceMax]);

  const handleReset = () => {
    setLocation("All Melbourne");
    setBedrooms("Any");
    setGuests("Any");
    setPriceMin("");
    setPriceMax("");
    setSearched(false);
    setResults([]);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="The collection"
        title="Handpicked stays for considered travellers."
        description="Use the filters below to find your ideal Melbourne stay."
      />

      <div className="mt-10 grid gap-10 lg:grid-cols-[300px_1fr]">
        {/* Filter sidebar */}
        <aside className="h-fit rounded-[30px] border border-black/5 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.04)]">
          <p className="text-xs uppercase tracking-[0.28em] text-stone-500 mb-5">Filter stays</p>

          {/* Location */}
          <div className="mb-5">
            <label className="text-xs font-medium text-stone-700 mb-2 block">Location</label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full rounded-xl border border-black/10 bg-stone-50 px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-1 focus:ring-stone-400"
            >
              {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
            </select>
          </div>

          {/* Bedrooms */}
          <div className="mb-5">
            <label className="text-xs font-medium text-stone-700 mb-2 block">Bedrooms</label>
            <div className="flex flex-wrap gap-2">
              {BEDROOM_OPTIONS.map((b) => (
                <button
                  key={b}
                  onClick={() => setBedrooms(b)}
                  className={`rounded-full px-3 py-1.5 text-sm transition ${bedrooms === b ? "bg-stone-950 text-stone-50" : "border border-black/10 text-stone-700 hover:bg-stone-50"}`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* Guests */}
          <div className="mb-5">
            <label className="text-xs font-medium text-stone-700 mb-2 block">Guests</label>
            <div className="flex flex-wrap gap-2">
              {GUEST_OPTIONS.map((g) => (
                <button
                  key={g}
                  onClick={() => setGuests(g)}
                  className={`rounded-full px-3 py-1.5 text-sm transition ${guests === g ? "bg-stone-950 text-stone-50" : "border border-black/10 text-stone-700 hover:bg-stone-50"}`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Price range */}
          <div className="mb-6">
            <label className="text-xs font-medium text-stone-700 mb-2 block">Price per night (AUD)</label>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                placeholder="Min"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                className="flex-1 rounded-xl border border-black/10 bg-stone-50 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-1 focus:ring-stone-400"
              />
              <span className="text-stone-400 text-xs">–</span>
              <input
                type="number"
                placeholder="Max"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                className="flex-1 rounded-xl border border-black/10 bg-stone-50 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-1 focus:ring-stone-400"
              />
            </div>
          </div>

          {/* Actions */}
          <button
            onClick={applyFilters}
            className="w-full flex items-center justify-center gap-2 rounded-full bg-stone-950 px-5 py-3 text-sm font-medium text-stone-50 transition hover:bg-stone-800"
          >
            <Search className="h-4 w-4" />
            Search stays
          </button>

          {searched && (
            <button
              onClick={handleReset}
              className="mt-3 w-full rounded-full border border-black/10 px-5 py-2.5 text-sm text-stone-600 transition hover:bg-stone-50"
            >
              Clear filters
            </button>
          )}
        </aside>

        {/* Results area */}
        <div>
          {!searched ? (
            /* Pre-search state */
            <div className="flex flex-col items-center justify-center min-h-[400px] rounded-[28px] border border-dashed border-black/10 bg-white/60 p-12 text-center">
              <div className="w-14 h-14 rounded-full bg-stone-100 flex items-center justify-center mb-4">
                <Search className="h-6 w-6 text-stone-400" />
              </div>
              <h3 className="text-lg font-medium text-stone-900 mb-2">Find your perfect stay</h3>
              <p className="text-sm text-stone-500 max-w-sm">
                Select your location, dates, and preferences — then click Search to browse our Melbourne collection.
              </p>
            </div>
          ) : loading ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="rounded-[28px] overflow-hidden bg-white animate-pulse">
                  <div className="aspect-[4/3] bg-stone-200" />
                  <div className="p-5 space-y-3">
                    <div className="h-4 bg-stone-100 rounded w-3/4" />
                    <div className="h-3 bg-stone-100 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] rounded-[28px] bg-white p-12 text-center shadow-[0_20px_60px_rgba(15,23,42,0.04)]">
              <div className="text-4xl mb-4">🏠</div>
              <h3 className="text-lg font-medium text-stone-900 mb-2">No stays match your filters</h3>
              <p className="text-sm text-stone-500 mb-6 max-w-sm">
                Try adjusting your location, bedroom count, or price range.
              </p>
              <button
                onClick={handleReset}
                className="rounded-full border border-stone-950 px-5 py-2.5 text-sm font-medium text-stone-950 transition hover:bg-stone-950 hover:text-stone-50"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm text-stone-500 mb-5">
                {results.length} {results.length === 1 ? "stay" : "stays"} found
                {location !== "All Melbourne" ? ` in ${location}` : " across Melbourne"}
              </p>
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {results.map((property) => (
                  <PropertyCard key={property.slug} property={property} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
