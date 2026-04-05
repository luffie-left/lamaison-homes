export type Property = {
  slug: string;
  title: string;
  shortTagline: string;
  suburb: string;
  city: string;
  country: string;
  sleeps: number;
  bedrooms: number;
  bathrooms: number;
  parking: number;
  petFriendly: boolean;
  featured: boolean;
  startingPrice: number;
  heroImage: string;
  gallery: string[];
  amenities: string[];
  descriptionShort: string;
  descriptionLong: string;
  houseRules: string[];
  localHighlights: string[];
  status: "draft" | "live";
  luxuryTier?: "Signature" | "Reserve" | "Collection";
  workFriendly?: boolean;
  familyFriendly?: boolean;
  balcony?: boolean;
  pool?: boolean;
  cleaningFee?: number;
  listingId?: number;
};

export const properties: Property[] = [
  {
    slug: "south-yarra-skyline-residence",
    title: "South Yarra Skyline Residence",
    shortTagline: "Polished city-fringe living with skyline evenings.",
    suburb: "South Yarra",
    city: "Melbourne",
    country: "Australia",
    sleeps: 4,
    bedrooms: 2,
    bathrooms: 2,
    parking: 1,
    petFriendly: false,
    featured: true,
    startingPrice: 420,
    heroImage: "/placeholders/stay-card-01.jpg",
    gallery: [
      "/placeholders/property-gallery-01.jpg",
      "/placeholders/property-gallery-02.jpg",
      "/placeholders/property-gallery-03.jpg",
    ],
    amenities: ["Wi‑Fi", "Balcony", "Workspace", "Espresso machine", "Lift access"],
    descriptionShort:
      "A warm, design-led apartment curated for business travel, long weekends, and elevated city stays.",
    descriptionLong:
      "Selected for comfort, character, and consistency, this South Yarra home brings together refined interiors, practical amenity, and professional short-stay management. It is designed for travellers who want a calm base with immediate access to dining, retail, and central Melbourne.",
    houseRules: ["No parties", "No smoking", "Respect quiet hours after 10pm"],
    localHighlights: ["Chapel Street dining", "Royal Botanic Gardens", "City access in minutes"],
    status: "live",
    luxuryTier: "Signature",
    workFriendly: true,
    familyFriendly: false,
    balcony: true,
    pool: false,
  },
  {
    slug: "st-kilda-coastal-loft",
    title: "St Kilda Coastal Loft",
    shortTagline: "Soft coastal light moments from the foreshore.",
    suburb: "St Kilda",
    city: "Melbourne",
    country: "Australia",
    sleeps: 3,
    bedrooms: 2,
    bathrooms: 1,
    parking: 1,
    petFriendly: true,
    featured: true,
    startingPrice: 360,
    heroImage: "/placeholders/stay-card-02.jpg",
    gallery: [
      "/placeholders/property-gallery-02.jpg",
      "/placeholders/property-gallery-03.jpg",
      "/placeholders/property-gallery-01.jpg",
    ],
    amenities: ["Pet-friendly", "Parking", "Bathtub", "Air conditioning", "Smart TV"],
    descriptionShort:
      "An airy loft-style stay with coastal ease and a confident premium finish.",
    descriptionLong:
      "Designed for stays you can book with confidence, this St Kilda apartment balances charm, practicality, and a polished guest experience. It suits couples, small families, and guests seeking a premium base near the beach and local café culture.",
    houseRules: ["No events", "Pets by approval", "Respect neighbours and common areas"],
    localHighlights: ["St Kilda foreshore", "Local cafés", "Easy tram access"],
    status: "live",
    luxuryTier: "Collection",
    workFriendly: true,
    familyFriendly: true,
    balcony: false,
    pool: false,
  },
  {
    slug: "richmond-garden-townhouse",
    title: "Richmond Garden Townhouse",
    shortTagline: "Private, leafy, and set up for longer Melbourne stays.",
    suburb: "Richmond",
    city: "Melbourne",
    country: "Australia",
    sleeps: 6,
    bedrooms: 3,
    bathrooms: 2,
    parking: 2,
    petFriendly: false,
    featured: true,
    startingPrice: 540,
    heroImage: "/placeholders/stay-card-03.jpg",
    gallery: [
      "/placeholders/property-gallery-03.jpg",
      "/placeholders/property-gallery-01.jpg",
      "/placeholders/property-gallery-02.jpg",
    ],
    amenities: ["Courtyard", "Parking", "Laundry", "Workspace", "Family-ready"],
    descriptionShort:
      "A spacious townhouse with calm interiors and easy access to Melbourne sport, dining, and business districts.",
    descriptionLong:
      "Professionally managed to a hotel-grade standard, this Richmond stay is curated for families, executive relocations, and design-conscious groups. Expect strong fundamentals, thoughtful styling, and a dependable guest experience from enquiry to departure.",
    houseRules: ["No parties", "No smoking", "Suitable for registered guests only"],
    localHighlights: ["MCG precinct", "Swan Street dining", "City and business access"],
    status: "live",
    luxuryTier: "Reserve",
    workFriendly: true,
    familyFriendly: true,
    balcony: true,
    pool: false,
  },
  {
    slug: "docklands-harbour-suite",
    title: "Docklands Harbour Suite",
    shortTagline: "Waterfront outlooks and polished apartment living.",
    suburb: "Docklands",
    city: "Melbourne",
    country: "Australia",
    sleeps: 2,
    bedrooms: 1,
    bathrooms: 1,
    parking: 1,
    petFriendly: false,
    featured: false,
    startingPrice: 310,
    heroImage: "/placeholders/stay-card-04.jpg",
    gallery: [
      "/placeholders/property-gallery-01.jpg",
      "/placeholders/property-gallery-02.jpg",
      "/placeholders/property-gallery-03.jpg",
    ],
    amenities: ["Pool", "Gym", "Parking", "Workspace", "Harbour views"],
    descriptionShort:
      "A compact premium stay designed for business travel and city convenience.",
    descriptionLong:
      "This Docklands suite combines efficiency, comfort, and professional management for guests who want a smooth city stay. It works particularly well for business travellers and short premium visits to Melbourne.",
    houseRules: ["No smoking", "Building rules apply", "Respect common areas"],
    localHighlights: ["Marvel Stadium", "Waterfront dining", "Free tram zone nearby"],
    status: "live",
    luxuryTier: "Signature",
    workFriendly: true,
    familyFriendly: false,
    balcony: true,
    pool: true,
  },
];

export const suburbClusters = [
  "CBD",
  "Southbank",
  "Docklands",
  "Fitzroy",
  "South Yarra",
  "St Kilda",
  "Richmond",
  "Carlton",
];

export const testimonials = {
  guests: [
    {
      quote:
        "The home felt considered from the moment we arrived. It had the ease of a boutique hotel, but the warmth of staying somewhere genuinely beautiful.",
      author: "Sophie M.",
      meta: "Guest, Sydney",
    },
    {
      quote:
        "Clear communication, elegant presentation, and a stay that matched the photos. Booking direct felt effortless.",
      author: "Daniel R.",
      meta: "Guest, Singapore",
    },
  ],
  owners: [
    {
      quote:
        "La Maison Homes brought structure, better presentation, and much stronger guest handling. It finally felt professionally managed.",
      author: "Owner, South Yarra Apartment",
      meta: "Management client",
    },
    {
      quote:
        "Monthly reporting was clear, operations were consistent, and I was no longer carrying day-to-day short-stay stress.",
      author: "Owner, Richmond Townhouse",
      meta: "Management client",
    },
  ],
};

export const journalPosts = [
  {
    slug: "best-suburbs-for-a-weekend-stay-in-melbourne",
    title: "Best suburbs for a weekend stay in Melbourne",
    category: "Melbourne Guides",
    excerpt:
      "A considered guide to neighbourhoods that suit dining weekends, gallery stops, and slower city escapes.",
    image: "/placeholders/journal-melbourne-guide.jpg",
  },
  {
    slug: "family-friendly-stays-across-melbourne",
    title: "Family-friendly stays across Melbourne",
    category: "Stay Inspiration",
    excerpt:
      "Where extra space, practical layout, and local convenience matter most.",
    image: "/placeholders/melbourne-neighbourhood.jpg",
  },
  {
    slug: "what-owners-should-know-before-starting-short-stay-management",
    title: "What owners should know before starting short-stay management",
    category: "Owner Advice",
    excerpt:
      "The operational foundations behind stronger revenue, lower friction, and a better guest experience.",
    image: "/placeholders/hosting-owner-hero.jpg",
  },
];

export const faqItems = {
  guests: [
    {
      question: "Do you offer direct booking support?",
      answer:
        "Yes. We support direct enquiries and can route guests into a secure booking handoff flow as the platform evolves.",
    },
    {
      question: "Can concierge services be arranged before arrival?",
      answer:
        "Yes. Airport transfers, celebration setup, family extras, and local recommendations can be requested in advance.",
    },
  ],
  owners: [
    {
      question: "What kind of properties do you work with?",
      answer:
        "We focus on distinctive homes and apartments that align with our presentation, guest standard, and location criteria.",
    },
    {
      question: "Do you manage pricing and guest communication?",
      answer:
        "Yes. Revenue optimisation, guest messaging, cleaning coordination, and owner reporting are part of the management proposition.",
    },
  ],
  booking: [
    {
      question: "Are rates live?",
      answer:
        "MVP uses placeholder and starting rates. The architecture is prepared for dynamic pricing and availability integration later.",
    },
  ],
  cancellations: [
    {
      question: "Where are cancellation terms shown?",
      answer:
        "Cancellations and booking conditions are surfaced on booking-related pages and the Booking Terms page.",
    },
  ],
  requirements: [
    {
      question: "Are building restrictions important before onboarding?",
      answer:
        "Yes. Owners should disclose any known building restrictions, by-laws, or operational constraints during application.",
    },
  ],
};

export const conciergeServices = [
  "Airport transfer",
  "Mid-stay cleaning",
  "Baby equipment",
  "Romantic setup",
  "Corporate stay support",
  "Local recommendations",
];

export const trustBadges = [
  "Professionally Managed",
  "Carefully Selected",
  "Verified Home Details",
  "Guest Support",
  "Cleaning Standards",
  "Secure Booking",
];
