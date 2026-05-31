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
  lat?: number;
  lng?: number;
  checkInTime?: number;
  checkOutTime?: number;
  listingBedTypes?: Array<{ bedTypeId: number; quantity: number; bedroomNumber: number }>;
  publicDescription?: string;
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
    image: "/images/guide-weekend-suburbs.jpg",
  },
  {
    slug: "family-friendly-stays-across-melbourne",
    title: "Family-friendly stays across Melbourne",
    category: "Stay Inspiration",
    excerpt:
      "Where extra space, practical layout, and local convenience matter most.",
    image: "/images/guide-family-stays.jpg",
  },
  {
    slug: "what-owners-should-know-before-starting-short-stay-management",
    title: "What owners should know before starting short-stay management",
    category: "Owner Advice",
    excerpt:
      "The operational foundations behind stronger revenue, lower friction, and a better guest experience.",
    image: "/images/guide-owner-advice.jpg",
  },
];

export const faqItems = {
  guests: [
    {
      question: "How do I make a booking?",
      answer:
        "Browse our stays, select your property, and submit a booking enquiry directly through our website. We'll confirm availability, send a payment link, and issue your booking confirmation — typically within a few hours.",
    },
    {
      question: "How does check-in work?",
      answer:
        "Most properties use a secure key safe or smart lock. You'll receive full check-in instructions — including access codes and property directions — by email and SMS at least 24 hours before your arrival. Check-in is from 3pm unless an early check-in has been arranged.",
    },
    {
      question: "What support is available during my stay?",
      answer:
        "Our guest support team is reachable throughout your stay. If something isn't right, contact us and we'll respond promptly. For non-urgent matters, email is fine. For urgent issues during your stay, use the contact number provided in your welcome message.",
    },
    {
      question: "What is your cancellation policy?",
      answer:
        "Cancellations made 14 or more days before check-in are eligible for a full refund. Cancellations between 7 and 14 days receive a 50% refund. Cancellations within 7 days of check-in are non-refundable. Full terms are available on our Booking Terms page.",
    },
    {
      question: "Can I arrange concierge services before I arrive?",
      answer:
        "Yes. Airport transfers, mid-stay cleaning, baby equipment, celebration setup, and local recommendations can all be arranged before or during your stay. Submit a concierge request through our website and we'll take care of the rest.",
    },
  ],
  owners: [
    {
      question: "What does your management fee cover?",
      answer:
        "Our management fee covers listing setup, channel distribution, dynamic pricing, guest communication, check-in coordination, cleaning turnover, and monthly performance reporting. A full service breakdown is provided during your property assessment.",
    },
    {
      question: "How does onboarding work?",
      answer:
        "We begin with a property assessment to confirm fit, location, and commercial potential. Once accepted, we coordinate photography, write listing copy, configure pricing, and prepare the property for guest readiness. Most properties launch within two to three weeks of onboarding.",
    },
    {
      question: "How do I track performance and income?",
      answer:
        "You receive a monthly owner report covering occupancy, revenue, guest reviews, and key operational notes. We aim for full transparency — no surprises on statements and no unexplained deductions.",
    },
    {
      question: "How do you manage guest quality?",
      answer:
        "We screen guests through booking platform identity verification, review history assessment, and our own enquiry process for direct bookings. We set clear expectations through house rules and communicate them at confirmation and check-in.",
    },
    {
      question: "How is maintenance handled?",
      answer:
        "Routine maintenance is coordinated by our team using a trusted network of local trades. We handle minor repairs within an agreed spend threshold without requiring owner sign-off each time. For larger items, we'll contact you with a quote and recommendation before proceeding.",
    },
  ],
  bookings: [
    {
      question: "What payment methods do you accept?",
      answer:
        "We accept credit and debit cards via our secure PayPal-powered payment gateway. Bank transfer is available for extended stays on request. All payments are processed securely — we do not store card details.",
    },
    {
      question: "Can I modify my booking after confirmation?",
      answer:
        "Modifications are subject to availability and must be requested at least 48 hours before your check-in date. Date extensions are processed as a separate payment. Date reductions may attract a partial refund in line with our cancellation policy.",
    },
    {
      question: "Is there a minimum stay requirement?",
      answer:
        "Most properties have a minimum of two nights. Some properties in higher-demand periods require a three or four night minimum. Minimum stay requirements are shown on each property listing before you book.",
    },
    {
      question: "Are bookings instant or request-based?",
      answer:
        "Enquiries submitted through our website are reviewed and confirmed within a few hours. Instant confirmation is available through our channel partners. Direct bookings allow us to better prepare for your arrival and ensure everything is ready.",
    },
  ],
  properties: [
    {
      question: "What types of properties do you accept?",
      answer:
        "We work with apartments, townhouses, and houses that meet our presentation and location standards. Properties need to be in well-maintained condition with quality furnishings, reliable appliances, and strong internet connectivity. We don't manage student accommodation or low-quality stock.",
    },
    {
      question: "Are there location requirements?",
      answer:
        "We currently operate across inner Melbourne suburbs including South Yarra, St Kilda, Richmond, Fitzroy, Carlton, Southbank, Docklands, and the CBD. Properties should be within reasonable proximity to dining, transport, and local amenity.",
    },
    {
      question: "What furniture and styling standard is expected?",
      answer:
        "Properties should be comfortably and cohesively furnished to a quality that suits our guest demographic. We can provide styling advisory as part of onboarding for properties that need refinement. Professional photography is arranged once the property is ready.",
    },
    {
      question: "Can I list a property that is already on Airbnb or other platforms?",
      answer:
        "Yes. We can manage existing listings across multiple channels, including Airbnb, Booking.com, and others. We use Hostaway to synchronise calendars and pricing across channels. You don't need to remove existing listings to work with us.",
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
