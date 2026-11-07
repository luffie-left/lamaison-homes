"use client";

import { useState, useMemo, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, MapPin, Calendar, X } from "lucide-react";

import { PropertyCard } from "@/components/cards/property-card";
import { SectionHeading } from "@/components/sections/section-heading";
import type { Property } from "@/data/mock-data";
import {
  predictSuburbs,
  findSuburbEntry,
  rankByProximity,
} from "@/lib/stays-search";

const BEDROOM_OPTIONS = ["Any", "1", "2", "3", "4+"];
const GUEST_OPTIONS = ["Any", "1", "2", "3", "4", "5", "6+"];
const PAGE_SIZE = 12;
const CBD_ANCHOR = { lat: -37.8136, lng: 144.9631 };

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
  const recentSlugs: string[] = [];

  for (const item of items) {
    const slug = item.slug;
    const recentIndex = recentSlugs.lastIndexOf(slug);
    const tooClose = recentIndex !== -1 && recentSlugs.length - recentIndex < 10;

    if (!tooClose) {
      result.push(item);
      recentSlugs.push(slug);
      if (recentSlugs.length > 15) recentSlugs.shift();
    } else {
      result.push(null as unknown as Property);
    }
  }

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

  // ── Suburb multi-select (replaces fixed "All Melbourne" dropdown) ──
  const [suburbs, setSuburbs] = useState<string[]>(() => {
    const raw = searchParams.get("loc");
    return raw ? raw.split("|").filter(Boolean) : [];
  });
  const [suburbQuery, setSuburbQuery] = useState("");
  const [showPredictions, setShowPredictions] = useState(false);
  const [highlightedPrediction, setHighlightedPrediction] = useState(0);
  const suburbInputRef = useRef<HTMLInputElement>(null);
  const predictionsRef = useRef<HTMLDivElement>(null);

  // ── Date range ──
  const [checkIn, setCheckIn] = useState(searchParams.get("in") ?? "");
  const [checkOut, setCheckOut] = useState(searchParams.get("out") ?? "");

  // ── Classic filters ──
  const [bedrooms, setBedrooms] = useState(searchParams.get("beds") ?? "Any");
  const [guests, setGuests] = useState(searchParams.get("guests") ?? "Any");
  const [priceMin, setPriceMin] = useState(searchParams.get("pmin") ?? "");
  const [priceMax, setPriceMax] = useState(searchParams.get("pmax") ?? "");
  const [sortBy, setSortBy] = useState(searchParams.get("sort") ?? "distance");

  const [allStays, setAllStays] = useState<Property[]>([]);
  const [results, setResults] = useState<Property[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [searched, setSearched] = useState(
    searchParams.has("loc") || searchParams.has("beds") || searchParams.has("guests") || searchParams.has("in") || searchParams.has("out")
  );
  const fromUrl = searchParams.has("loc") || searchParams.has("beds") || searchParams.has("guests") || searchParams.has("in") || searchParams.has("out");
  const [dataLoading, setDataLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [sessionSeed] = useState(() => Math.floor(Math.random() * 1000000));
  const loaderRef = useRef<HTMLDivElement>(null);
  const didAutoSearch = useRef(false);

  const predictions = useMemo(
    () => predictSuburbs(suburbQuery, 6),
    [suburbQuery]
  );

  // Close prediction dropdown on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (predictionsRef.current && !predictionsRef.current.contains(e.target as Node)) {
        setShowPredictions(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function addSuburb(name: string) {
    setSuburbs((prev) => (prev.includes(name) || prev.length >= 5 ? prev : [...prev, name]));
    setSuburbQuery("");
    setShowPredictions(false);
    suburbInputRef.current?.focus();
  }

  function removeSuburb(name: string) {
    setSuburbs((prev) => prev.filter((s) => s !== name));
  }

  function onSuburbKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showPredictions || predictions.length === 0) {
      if (e.key === "Enter" && suburbQuery.trim()) e.preventDefault();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedPrediction((i) => (i + 1) % predictions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedPrediction((i) => (i - 1 + predictions.length) % predictions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      addSuburb(predictions[highlightedPrediction].name);
    } else if (e.key === "Escape") {
      setShowPredictions(false);
    }
  }

  // Persist filters to URL
  function pushParams() {
    const params = new URLSearchParams();
    if (suburbs.length) params.set("loc", suburbs.join("|"));
    if (checkIn) params.set("in", checkIn);
    if (checkOut) params.set("out", checkOut);
    if (bedrooms !== "Any") params.set("beds", bedrooms);
    if (guests !== "Any") params.set("guests", guests);
    if (priceMin) params.set("pmin", priceMin);
    if (priceMax) params.set("pmax", priceMax);
    if (sortBy !== "distance") params.set("sort", sortBy);
    const qs = params.toString();
    router.replace(`/stays${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  // Load data on mount
  useEffect(() => {
    const load = async () => {
      setDataLoading(true);
      try {
        const [staysRes, showcasesRes] = await Promise.all([
          fetch("/api/stays", { cache: "no-store" }),
          fetch("/api/showcases", { cache: "no-store" }),
        ]);

        const staysData = staysRes.ok ? await staysRes.json() : { stays: [] };
        const baseProperties: Property[] = staysData.stays ?? [];

        let showcaseCards: Property[] = [];
        if (showcasesRes.ok) {
          const rawShowcases = await showcasesRes.json();
          if (Array.isArray(rawShowcases)) {
            const eligibleSlugs = new Set(baseProperties.map((property) => property.slug));
            showcaseCards = rawShowcases
              .filter((sc: Property) => eligibleSlugs.has(sc.slug))
              .map((sc: Property & { id: string }) => ({ ...sc }));
          }
        }

        const shuffled = seededShuffle(baseProperties, sessionSeed);
        const spaced = spaceShowcases([...shuffled, ...showcaseCards]);
        setAllStays(spaced);
      } catch { /* silent */ }
      finally { setDataLoading(false); }
    };
    load();
  }, [sessionSeed]);

  // Auto-run search when landing with URL filters (back button / shared links)
  useEffect(() => {
    if (!dataLoading && fromUrl && !didAutoSearch.current && allStays.length) {
      didAutoSearch.current = true;
      runSearch(allStays);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataLoading, allStays]);

  /** Server-side availability check via Hostaway calendar (fail-safe UX). */
  async function filterByAvailability(pool: Property[], ci: string, co: string): Promise<Property[]> {
    const withIds = pool.filter((p) => typeof p.listingId === "number" && p.listingId);
    try {
      setAvailabilityLoading(true);
      setAvailabilityError(null);
      const res = await fetch("/api/stays/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingIds: withIds.map((p) => p.listingId),
          checkIn: ci,
          checkOut: co,
        }),
      });
      if (!res.ok) throw new Error(`availability ${res.status}`);
      const data = await res.json();
      const okIds = new Set<number>(data.availableListingIds ?? []);
      return withIds.filter((p) => okIds.has(p.listingId!));
    } catch {
      // Availability service down: keep results, show a notice (fail-open UX,
      // server stays fail-closed at booking time).
      setAvailabilityError("We couldn't verify live availability just now — results shown may include stays that are unavailable for your dates. Nothing is charged until you confirm on PayPal.");
      return withIds;
    } finally {
      setAvailabilityLoading(false);
    }
  }

  function applyStaticFilters(pool: Property[]): Property[] {
    return pool.filter((s) => {
      if (suburbs.length) {
        const hay = `${s.suburb ?? ""} ${s.city ?? ""}`.toLowerCase();
        const matches = suburbs.some((sub) => {
          const key = sub.toLowerCase().replace(/^melbourne\s+/i, "").trim();
          return hay.includes(sub.toLowerCase()) || hay.includes(key);
        });
        if (!matches) return false;
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
  }

  function sortResults(filtered: Property[]): Property[] {
    if (sortBy === "price-asc") return [...filtered].sort((a, b) => a.startingPrice - b.startingPrice);
    if (sortBy === "price-desc") return [...filtered].sort((a, b) => b.startingPrice - a.startingPrice);
    if (sortBy === "beds-desc") return [...filtered].sort((a, b) => b.bedrooms - a.bedrooms);
    if (sortBy === "guests-desc") return [...filtered].sort((a, b) => b.sleeps - a.sleeps);
    // Default: closest-first to the first selected suburb (or CBD)
    const anchor = (suburbs.length ? findSuburbEntry(suburbs[0]) : null) ?? CBD_ANCHOR;
    return rankByProximity(filtered, anchor);
  }

  async function runSearch(pool: Property[]) {
    let filtered = applyStaticFilters(pool);
    if (checkIn && checkOut && checkOut > checkIn) {
      filtered = await filterByAvailability(filtered, checkIn, checkOut);
    }
    setResults(sortResults(filtered));
    setPage(1);
  }

  const onSearch = async () => {
    setSearched(true);
    pushParams();
    await runSearch(allStays);
  };

  const handleReset = () => {
    setSuburbs([]);
    setSuburbQuery("");
    setCheckIn("");
    setCheckOut("");
    setBedrooms("Any");
    setGuests("Any");
    setPriceMin("");
    setPriceMax("");
    setSortBy("distance");
    setSearched(false);
    setResults([]);
    setAvailabilityError(null);
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
  const searching = dataLoading || availabilityLoading;
  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="The collection"
        title="Handpicked stays for considered travellers."
        description="Search by suburb and dates to find your ideal Melbourne stay."
      />

      <div className="mt-10 grid gap-10 lg:grid-cols-[300px_1fr]">
        {/* Filter sidebar */}
        <aside className="h-fit rounded-[30px] border border-black/5 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.04)]">
          <p className="text-xs uppercase tracking-[0.28em] text-stone-500 mb-5">Filter stays</p>

          {/* Suburb search + multi-select */}
          <div className="mb-5" ref={predictionsRef}>
            <label className="text-xs font-medium text-stone-700 mb-2 block">Suburb</label>
            <div className="relative">
              <div className="flex items-center gap-2 rounded-xl border border-black/10 bg-stone-50 px-3 py-2 focus-within:ring-1 focus-within:ring-stone-400">
                <MapPin className="h-4 w-4 text-stone-400 shrink-0" />
                <input
                  ref={suburbInputRef}
                  type="text"
                  value={suburbQuery}
                  placeholder="Search suburbs…"
                  onChange={(e) => { setSuburbQuery(e.target.value); setShowPredictions(true); setHighlightedPrediction(0); }}
                  onFocus={() => setShowPredictions(true)}
                  onKeyDown={onSuburbKeyDown}
                  className="w-full bg-transparent text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none"
                />
              </div>
              {showPredictions && suburbQuery && predictions.length > 0 && (
                <ul className="absolute z-20 mt-1 w-full rounded-xl border border-black/10 bg-white py-1 shadow-lg">
                  {predictions.map((p, i) => (
                    <li key={p.name}>
                      <button
                        onMouseDown={(e) => { e.preventDefault(); addSuburb(p.name); }}
                        onMouseEnter={() => setHighlightedPrediction(i)}
                        className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${i === highlightedPrediction ? "bg-stone-100" : ""}`}
                      >
                        <MapPin className="h-3.5 w-3.5 text-stone-400" />
                        {p.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {suburbs.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {suburbs.map((s) => (
                    <span key={s} className="inline-flex items-center gap-1 rounded-full bg-stone-950 px-3 py-1 text-xs font-medium text-stone-50">
                      {s}
                      <button
                        onClick={() => removeSuburb(s)}
                        aria-label={`Remove ${s}`}
                        className="rounded-full p-0.5 hover:bg-stone-700"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="mb-5">
            <label className="text-xs font-medium text-stone-700 mb-2 block">Dates</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-xs text-stone-400 mb-1 flex items-center gap-1"><Calendar className="h-3 w-3" />Check-in</span>
                <input type="date" min={todayStr} value={checkIn}
                  onChange={(e) => { setCheckIn(e.target.value); if (checkOut && e.target.value >= checkOut) setCheckOut(""); }}
                  className="w-full rounded-xl border border-black/10 bg-stone-50 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-1 focus:ring-stone-400" />
              </div>
              <div>
                <span className="text-xs text-stone-400 mb-1 flex items-center gap-1"><Calendar className="h-3 w-3" />Check-out</span>
                <input type="date" min={checkIn || todayStr} value={checkOut} onChange={(e) => setCheckOut(e.target.value)}
                  className="w-full rounded-xl border border-black/10 bg-stone-50 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-1 focus:ring-stone-400" />
              </div>
            </div>
            {(checkIn || checkOut) && !(checkIn && checkOut) && (
              <p className="mt-1 text-xs text-stone-400">Pick both dates to filter by availability.</p>
            )}
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
              <option value="distance">Closest first</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="beds-desc">Most bedrooms</option>
              <option value="guests-desc">Most guests</option>
            </select>
          </div>

          {/* Actions */}
          <button onClick={onSearch} disabled={searching}
            className="w-full flex items-center justify-center gap-2 rounded-full bg-stone-950 px-5 py-3 text-sm font-medium text-stone-50 transition hover:bg-stone-800 disabled:opacity-50">
            <Search className="h-4 w-4" />
            {searching ? "Checking availability…" : "Search stays"}
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
          {availabilityError && (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {availabilityError}
            </div>
          )}

          {!searched ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] rounded-[28px] border border-dashed border-black/10 bg-white/60 p-12 text-center">
              <div className="w-14 h-14 rounded-full bg-stone-100 flex items-center justify-center mb-4">
                <Search className="h-6 w-6 text-stone-400" />
              </div>
              <h3 className="text-lg font-medium text-stone-900 mb-2">Find your perfect stay</h3>
              <p className="text-sm text-stone-500 max-w-sm">Search by suburb and dates, then browse our handpicked Melbourne collection.</p>
            </div>
          ) : searching && results.length === 0 ? (
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
              <h3 className="text-lg font-medium text-stone-900 mb-2">No stays match your search</h3>
              <p className="text-sm text-stone-500 mb-6 max-w-sm">
                Try widening your dates, removing a suburb, or adjusting your bedroom or price filters.
              </p>
              <button onClick={handleReset}
                className="rounded-full border border-stone-950 px-5 py-2.5 text-sm font-medium text-stone-950 transition hover:bg-stone-950 hover:text-stone-50">
                Clear all filters
              </button>
            </div>
          ) : (
            <>
              <p className="mb-4 text-sm text-stone-500">
                {results.length} {results.length === 1 ? "stay" : "stays"}
                {suburbs.length ? ` in ${suburbs.join(", ")}` : " in Melbourne"}
                {checkIn && checkOut ? ` · available ${new Date(checkIn + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short" })} – ${new Date(checkOut + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short" })}` : ""}
                {sortBy === "distance" ? " · closest first" : ""}
              </p>
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
