import type { Property } from "@/data/mock-data";

// Token cache (server-side only — this module must never be imported in client components)
let _token: { value: string; exp: number } | null = null;

export async function getToken(): Promise<string> {
  if (_token && Date.now() < _token.exp) return _token.value;

  const accountId = process.env.HOSTAWAY_ACCOUNT_ID;
  const clientSecret = process.env.HOSTAWAY_CLIENT_SECRET;

  if (!accountId || !clientSecret) {
    throw new Error("Hostaway credentials not configured");
  }

  const res = await fetch("https://api.hostaway.com/v1/accessTokens", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=client_credentials&client_id=${accountId}&client_secret=${clientSecret}&scope=general`,
  });

  if (!res.ok) {
    throw new Error(`Hostaway auth failed: ${res.status}`);
  }

  const data = await res.json();
  _token = {
    value: data.access_token,
    exp: Date.now() + 23 * 3600 * 1000,
  };
  return _token.value;
}

export async function hostawayGet<T>(path: string, revalidate = 300): Promise<T> {
  const token = await getToken();
  const res = await fetch(`https://api.hostaway.com/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate },
  });

  if (!res.ok) {
    throw new Error(`Hostaway ${path}: ${res.status}`);
  }

  return res.json();
}

export type HostawayListing = {
  id: number;
  name: string;
  city: string;
  address: string;
  publicAddress?: string;
  lat?: number;
  lng?: number;
  bedroomsNumber: number;
  bathroomsNumber: number;
  personCapacity: number;
  price: number; // nightly rate
  cleaningFee: number;
  publicDescription: string;
  houseRules: string;
  checkInTime?: number;
  checkOutTime?: number;
  listingImages: Array<{ url: string; sortOrder: number }>;
  listingBedTypes: Array<{
    bedTypeId: number;
    quantity: number;
    bedroomNumber: number;
  }>;
  amenities: string[];
  status: string; // 'active' | 'inactive'
  externalCalendarUrl?: string;
};

export type HostawayListingsResponse = {
  result: HostawayListing[];
  count: number;
  limit: number;
  offset: number;
};

export type HostawayListingResponse = {
  result: HostawayListing;
};

export type HostawayCalendarEntry = {
  date: string;
  status: string;
  isAvailable: number;
};

export type HostawayCalendarResponse = {
  result: HostawayCalendarEntry[];
};

export function mapToProperty(listing: HostawayListing): Property {
  const sortedImages = (listing.listingImages ?? []).sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
  );

  return {
    slug: String(listing.id),
    title: listing.name,
    shortTagline:
      listing.publicDescription?.split(".")[0]?.trim() ?? listing.name,
    suburb: listing.publicAddress ?? listing.city ?? "Melbourne",
    city: "Melbourne",
    country: "Australia",
    sleeps: listing.personCapacity ?? 2,
    bedrooms: listing.bedroomsNumber ?? 1,
    bathrooms: listing.bathroomsNumber ?? 1,
    parking: listing.amenities?.some((a) =>
      /\bparking\b/i.test(a)
    )
      ? 1
      : 0,
    petFriendly: listing.amenities?.some((a) => /\bpet/i.test(a)) ?? false,
    featured: false,
    startingPrice: listing.price ?? 0,
    cleaningFee: listing.cleaningFee ?? 0,
    heroImage: sortedImages[0]?.url ?? "",
    gallery: sortedImages.slice(0, 5).map((i) => i.url),
    amenities: listing.amenities ?? [],
    descriptionShort: listing.publicDescription?.substring(0, 200) ?? "",
    descriptionLong: listing.publicDescription ?? "",
    publicDescription: listing.publicDescription ?? "",
    houseRules: listing.houseRules
      ? listing.houseRules.split("\n").filter(Boolean)
      : ["No parties", "No smoking", "Respect quiet hours after 10pm"],
    localHighlights: [],
    status: "live",
    luxuryTier:
      (listing.bedroomsNumber ?? 1) >= 3
        ? "Reserve"
        : (listing.bedroomsNumber ?? 1) >= 2
        ? "Signature"
        : "Collection",
    workFriendly: listing.amenities?.some((a) =>
      /wifi|workspace|desk/i.test(a)
    ),
    familyFriendly: (listing.personCapacity ?? 0) >= 4,
    listingId: listing.id,
    lat: listing.lat,
    lng: listing.lng,
    checkInTime: listing.checkInTime,
    checkOutTime: listing.checkOutTime,
    listingBedTypes: listing.listingBedTypes ?? [],
  };
}
