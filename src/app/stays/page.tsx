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
  const [sortBy, setSortBy] = useState("recommended");

  // Load stays + showcases on mount, merge into a single pool
  useEffect(() => {
    const load = async () => {
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
        const [staysRes, showcasesRes] = await Promise.all([
          fetch(`${appUrl}/api/stays`, { cache: "no-store" }),
          fetch(`${appUrl}/api/showcases`, { cache: "no-store" }),
        ]);

        const staysData = staysRes.ok ? await staysRes.json() : { stays: [] };
        const baseProperties: Property[] = staysData.stays ?? [];

        // Showcases: shaped as Property, with showcase hero image
        let showcaseCards: Property[] = [];
        if (showcasesRes.ok) {
          const rawShowcases = await showcasesRes.json();
          if (Array.isArray(rawShowcases)) {
            showcaseCards = rawShowcases.map((sc: Property & { id: string }) => ({
              ...sc,
              // id is the showcase id — slug still points to the same property page
            }));
          }
        }

        // Merge: base properties first, then showcase cards (which add extra hero variants)
        setAllStays([...baseProperties, ...showcaseCards]);
      } catch {}
    };
    load();
  }, []);

  const applyFilters = useCallback(() => {
    setLoading(true);
    setSearched(true);

    let filtered = allStays.filter((s) => {
      // Location: match suburb or city (case-insensitive)
      if (location !== "All Melbourne") {
        const loc = location.toLowerCase();
        const suburbMatch = s.suburb?.toLowerCase().includes(loc);
        const cityMatch = s.city?.toLowerCase().includes(loc);
        if (!suburbMatch && !cityMatch) return false;
      }
      // Bedrooms: exact match, except "4+" means 4 or more
      if (bedrooms !== "Any") {
        if (bedrooms === "4+") {
          if (s.bedrooms < 4) return false;
        } else {
          if (s.bedrooms !== parseInt(bedrooms)) return false;
        }
      }
      // Guests: property must sleep AT LEAST this many
      if (guests !== "Any") {
        const minG = guests === "6+" ? 6 : parseInt(guests);
        if (s.sleeps < minG) return false;
      }
      // Price range
      if (priceMin && s.startingPrice < parseInt(priceMin)) return false;
      if (priceMax && s.startingPrice > parseInt(priceMax)) return false;
      return true;
    });

    // Sort
    if (sortBy === "price-asc") filtered = [...filtered].sort((a, b) => a.startingPrice - b.startingPrice);
    else if (sortBy === "price-desc") filtered = [...filtered].sort((a, b) => b.startingPrice - a.startingPrice);
    else if (sortBy === "beds-desc") filtered = [...filtered].sort((a, b) => b.bedrooms - a.bedrooms);
    else if (sortBy === "guests-desc") filtered = [...filtered].sort((a, b) => b.sleeps - a.sleeps);

    setResults(filtered);
    setLoading(false);
  }, [allStays, location, bedrooms, guests, priceMin, priceMax, sortBy]);

  const handleReset = () => {
    setLocation("All Melbourne");
    setBedrooms("Any");
    setGuests("Any");
    setPriceMin("");
    setPriceMax("");
    setSortBy("recommended");
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
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-xs text-stone-400 mb-1 block">Min</span>
                <input
                  type="number"
                  placeholder="$0"
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  className="w-full rounded-xl border border-black/10 bg-stone-50 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-1 focus:ring-stone-400"
                />
              </div>
              <div>
                <span className="text-xs text-stone-400 mb-1 block">Max</span>
                <input
                  type="number"
                  placeholder="Any"
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  className="w-full rounded-xl border border-black/10 bg-stone-50 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-1 focus:ring-stone-400"
                />
              </div>
            </div>
          </div>


          {/* Sort */}
          <div className="mb-6">
            <label className="text-xs font-medium text-stone-700 mb-2 block">Sort by</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full rounded-xl border border-black/10 bg-stone-50 px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-1 focus:ring-stone-400"
            >
              <option value="recommended">Recommended</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="beds-desc">Most bedrooms</option>
              <option value="guests-desc">Most guests</option>
            </select>
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
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {results.map((property, idx) => (
                  <PropertyCard key={`${property.slug}-${idx}`} property={property} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
