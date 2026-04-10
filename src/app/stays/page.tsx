"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

import { PropertyCard } from "@/components/cards/property-card";
import { SectionHeading } from "@/components/sections/section-heading";
import type { Property } from "@/data/mock-data";

const LOCATIONS = ["All Melbourne", "Box Hill", "CBD", "Doncaster", "Fitzroy", "Melbourne", "Southbank", "South Yarra"];
const BEDROOM_OPTIONS = ["Any", "1", "2", "3", "4+"];
const GUEST_OPTIONS = ["Any", "1", "2", "3", "4", "5", "6+"];
const PAGE_SIZE = 12;

// Suburb centre coordinates for distance sorting (lat, lng)
const SUBURB_COORDS: Record<string, [number, number]> = {
  "CBD":          [-37.8136, 144.9631],
  "Southbank":    [-37.8224, 144.9631],
  "Docklands":    [-37.8148, 144.9450],
  "Fitzroy":      [-37.7990, 144.9760],
  "South Yarra":  [-37.8390, 144.9918],
  "St Kilda":     [-37.8679, 144.9826],
  "Richmond":     [-37.8235, 145.0012],
  "Carlton":      [-37.7986, 144.9680],
  "Box Hill":     [-37.8174, 145.1175],
  "Doncaster":    [-37.7893, 145.1253],
  "Melbourne":    [-37.8136, 144.9631],
  "West Melbourne": [-37.8065, 144.9443],
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}



// ── Stable shuffle using seeded random (same seed = same order each session) ──
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Space showcases: same property not within 10 slots of each other ─────────
function spaceShowcases(items: Property[]): Property[] {
  const result: Property[] = [];
  const recentSlugs: string[] = []; // track last 10 base slugs

  for (const item of items) {
    // Each property has a slug — showcases of same property share same slug
    const slug = item.slug;
    const recentIndex = recentSlugs.lastIndexOf(slug);
    const tooClose = recentIndex !== -1 && recentSlugs.length - recentIndex < 10;

    if (!tooClose) {
      result.push(item);
      recentSlugs.push(slug);
      if (recentSlugs.length > 15) recentSlugs.shift();
    } else {
      // Defer this item — push to end
      result.push(null as unknown as Property);
    }
  }

  // Fill nulls with deferred items
  const deferred = items.filter(item => {
    const slug = item.slug;
    const inResult = result.filter(Boolean).find(r => r.slug === slug && r === item);
    return !inResult;
  });

  let di = 0;
  return result.map(r => r ?? deferred[di++]).filter(Boolean);
}

function StaysContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialise from URL params (survives back button)
  const [location, setLocation] = useState(searchParams.get("loc") ?? "All Melbourne");
  const [bedrooms, setBedrooms] = useState(searchParams.get("beds") ?? "Any");
  const [guests, setGuests] = useState(searchParams.get("guests") ?? "Any");
  const [priceMin, setPriceMin] = useState(searchParams.get("pmin") ?? "");
  const [priceMax, setPriceMax] = useState(searchParams.get("pmax") ?? "");
  const [sortBy, setSortBy] = useState(searchParams.get("sort") ?? "recommended");

  const [allStays, setAllStays] = useState<Property[]>([]);
  const [results, setResults] = useState<Property[]>([]);
  const [searched, setSearched] = useState(searchParams.has("loc") || searchParams.has("beds") || searchParams.has("guests"));
  const fromUrl = searchParams.has("loc") || searchParams.has("beds") || searchParams.has("guests");
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [sessionSeed] = useState(() => Math.floor(Math.random() * 1000000));
  const loaderRef = useRef<HTMLDivElement>(null);

  // Persist filters to URL
  function pushParams(overrides: Record<string, string> = {}) {
    const params = new URLSearchParams();
    const vals = { loc: location, beds: bedrooms, guests, pmin: priceMin, pmax: priceMax, sort: sortBy, ...overrides };
    Object.entries(vals).forEach(([k, v]) => { if (v && v !== "Any" && v !== "All Melbourne" && v !== "recommended" && v !== "") params.set(k, v); });
    const qs = params.toString();
    router.replace(`/stays${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  // Load data on mount
  useEffect(() => {
    const load = async () => {
      setDataLoading(true);
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
        const [staysRes, showcasesRes] = await Promise.all([
          fetch(`${appUrl}/api/stays`, { cache: "no-store" }),
          fetch(`${appUrl}/api/showcases`, { cache: "no-store" }),
        ]);

        const staysData = staysRes.ok ? await staysRes.json() : { stays: [] };
        const baseProperties: Property[] = staysData.stays ?? [];

        let showcaseCards: Property[] = [];
        if (showcasesRes.ok) {
          const rawShowcases = await showcasesRes.json();
          if (Array.isArray(rawShowcases)) {
            showcaseCards = rawShowcases.map((sc: Property & { id: string }) => ({ ...sc }));
          }
        }

        // Stable shuffle base properties with session seed
        const shuffled = seededShuffle(baseProperties, sessionSeed);

        // Interleave showcases and apply spacing rules
        const combined = [...shuffled, ...showcaseCards];
        const spaced = spaceShowcases(combined);

        setAllStays(spaced);

        // If URL has filters, auto-apply with distance sort if suburb specified
        if (fromUrl) {
          applyFiltersTo(spaced);
        }
      } catch { /* silent */ }
      finally { setDataLoading(false); }
    };
    load();
  }, []);

  function applyFiltersTo(pool: Property[]) {
    let filtered = pool.filter((s) => {
      if (location !== "All Melbourne") {
        const loc = location.toLowerCase();
        if (!s.suburb?.toLowerCase().includes(loc) && !s.city?.toLowerCase().includes(loc)) return false;
      }
      if (bedrooms !== "Any") {
        if (bedrooms === "4+") { if (s.bedrooms < 4) return false; }
        else { if (s.bedrooms !== parseInt(bedrooms)) return false; }
      }
      if (guests !== "Any") {
        const minG = guests === "6+" ? 6 : parseInt(guests);
        if (s.sleeps < minG) return false;
      }
      if (priceMin && s.startingPrice < parseInt(priceMin)) return false;
      if (priceMax && s.startingPrice > parseInt(priceMax)) return false;
      return true;
    });
    if (sortBy === "price-asc") filtered = [...filtered].sort((a, b) => a.startingPrice - b.startingPrice);
    else if (sortBy === "price-desc") filtered = [...filtered].sort((a, b) => b.startingPrice - a.startingPrice);
    else if (sortBy === "beds-desc") filtered = [...filtered].sort((a, b) => b.bedrooms - a.bedrooms);
    else if (sortBy === "guests-desc") filtered = [...filtered].sort((a, b) => b.sleeps - a.sleeps);
    else if (location !== "All Melbourne") {
      // Default when suburb selected: sort closest to furthest from suburb centre
      const centre = SUBURB_COORDS[location]
      if (centre) {
        filtered = [...filtered].sort((a, b) => {
          const aCoords = SUBURB_COORDS[a.suburb ?? ""] ?? SUBURB_COORDS[a.city ?? ""] ?? null
          const bCoords = SUBURB_COORDS[b.suburb ?? ""] ?? SUBURB_COORDS[b.city ?? ""] ?? null
          const aDist = aCoords ? haversineKm(centre[0], centre[1], aCoords[0], aCoords[1]) : 99
          const bDist = bCoords ? haversineKm(centre[0], centre[1], bCoords[0], bCoords[1]) : 99
          return aDist - bDist
        })
      }
    }
    setResults(filtered);
    setPage(1);
  }

  const applyFilters = useCallback(() => {
    setLoading(true);
    setSearched(true);
    pushParams();
    applyFiltersTo(allStays);
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
    setPage(1);
    router.replace("/stays", { scroll: false });
  };

  // Lazy loading — intersect observer on loader div
  useEffect(() => {
    if (!loaderRef.current || !searched) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) setPage(p => p + 1); },
      { threshold: 0.1 }
    );
    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [searched, results]);

  const visibleResults = results.slice(0, page * PAGE_SIZE);
  const hasMore = visibleResults.length < results.length;

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
            <select value={location} onChange={(e) => setLocation(e.target.value)}
              className="w-full rounded-xl border border-black/10 bg-stone-50 px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-1 focus:ring-stone-400">
              {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
            </select>
          </div>

          {/* Bedrooms */}
          <div className="mb-5">
            <label className="text-xs font-medium text-stone-700 mb-2 block">Bedrooms</label>
            <div className="flex flex-wrap gap-2">
              {BEDROOM_OPTIONS.map((b) => (
                <button key={b} onClick={() => setBedrooms(b)}
                  className={`rounded-full px-3 py-1.5 text-sm transition ${bedrooms === b ? "bg-stone-950 text-stone-50" : "border border-black/10 text-stone-700 hover:bg-stone-50"}`}>
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
                <button key={g} onClick={() => setGuests(g)}
                  className={`rounded-full px-3 py-1.5 text-sm transition ${guests === g ? "bg-stone-950 text-stone-50" : "border border-black/10 text-stone-700 hover:bg-stone-50"}`}>
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Price range */}
          <div className="mb-5">
            <label className="text-xs font-medium text-stone-700 mb-2 block">Price per night (AUD)</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-xs text-stone-400 mb-1 block">Min</span>
                <input type="number" placeholder="$0" value={priceMin} onChange={(e) => setPriceMin(e.target.value)}
                  className="w-full rounded-xl border border-black/10 bg-stone-50 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-1 focus:ring-stone-400" />
              </div>
              <div>
                <span className="text-xs text-stone-400 mb-1 block">Max</span>
                <input type="number" placeholder="Any" value={priceMax} onChange={(e) => setPriceMax(e.target.value)}
                  className="w-full rounded-xl border border-black/10 bg-stone-50 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-1 focus:ring-stone-400" />
              </div>
            </div>
          </div>

          {/* Sort */}
          <div className="mb-6">
            <label className="text-xs font-medium text-stone-700 mb-2 block">Sort by</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
              className="w-full rounded-xl border border-black/10 bg-stone-50 px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-1 focus:ring-stone-400">
              <option value="recommended">Recommended</option>
              <option value="distance">Closest first</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="beds-desc">Most bedrooms</option>
              <option value="guests-desc">Most guests</option>
            </select>
          </div>

          {/* Actions */}
          <button onClick={applyFilters} disabled={dataLoading}
            className="w-full flex items-center justify-center gap-2 rounded-full bg-stone-950 px-5 py-3 text-sm font-medium text-stone-50 transition hover:bg-stone-800 disabled:opacity-50">
            <Search className="h-4 w-4" />
            {dataLoading ? "Loading…" : "Search stays"}
          </button>

          {searched && (
            <button onClick={handleReset}
              className="mt-3 w-full rounded-full border border-black/10 px-5 py-2.5 text-sm text-stone-600 transition hover:bg-stone-50">
              Clear filters
            </button>
          )}
        </aside>

        {/* Results */}
        <div>
          {!searched ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] rounded-[28px] border border-dashed border-black/10 bg-white/60 p-12 text-center">
              <div className="w-14 h-14 rounded-full bg-stone-100 flex items-center justify-center mb-4">
                <Search className="h-6 w-6 text-stone-400" />
              </div>
              <h3 className="text-lg font-medium text-stone-900 mb-2">Find your perfect stay</h3>
              <p className="text-sm text-stone-500 max-w-sm">Select your preferences and click Search to browse our Melbourne collection.</p>
            </div>
          ) : loading || (dataLoading && results.length === 0) ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {[1,2,3,4,5,6].map((i) => (
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
              <p className="text-sm text-stone-500 mb-6 max-w-sm">Try adjusting your location, bedroom count, or price range.</p>
              <button onClick={handleReset}
                className="rounded-full border border-stone-950 px-5 py-2.5 text-sm font-medium text-stone-950 transition hover:bg-stone-950 hover:text-stone-50">
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {visibleResults.map((property, idx) => (
                  <PropertyCard key={`${property.slug}-${idx}`} property={property} />
                ))}
              </div>
              {/* Lazy load sentinel */}
              {hasMore && (
                <div ref={loaderRef} className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {[1,2,3].map(i => (
                    <div key={i} className="rounded-[28px] overflow-hidden bg-white animate-pulse">
                      <div className="aspect-[4/3] bg-stone-200" />
                      <div className="p-5 space-y-3">
                        <div className="h-4 bg-stone-100 rounded w-3/4" />
                        <div className="h-3 bg-stone-100 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StaysPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-700 rounded-full animate-spin" />
      </div>
    }>
      <StaysContent />
    </Suspense>
  );
}
