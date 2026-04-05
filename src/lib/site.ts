export const siteConfig = {
  name: "La Maison Homes",
  shortName: "La Maison",
  description:
    "Curated Melbourne stays with hotel-grade care. Beautifully selected homes. Seamless guest stays. Professional short-stay management.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://lamaisonhomes.com.au",
  ogImage: "/placeholders/home-hero-fallback.jpg",
  email: "hello@lamaisonhomes.com.au",
  phone: "+61 400 000 000",
  social: {
    instagram: "https://instagram.com/lamaisonhomes",
    facebook: "https://facebook.com/lamaisonhomes",
    linkedin: "https://linkedin.com/company/lamaisonhomes",
  },
  nav: [
    { href: "/stays", label: "Stays" },
    { href: "/destinations/melbourne", label: "Melbourne" },
    { href: "/host-with-us", label: "Host With Us" },
    { href: "/concierge", label: "Concierge" },
    { href: "/journal", label: "Journal" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
  ],
  footerGroups: [
    {
      title: "Explore",
      links: [
        ["Home", "/"],
        ["Stays", "/stays"],
        ["Melbourne", "/destinations/melbourne"],
        ["Journal", "/journal"],
      ],
    },
    {
      title: "Hosting / Management",
      links: [
        ["Host With Us", "/host-with-us"],
        ["How It Works", "/how-it-works"],
        ["Owner Application", "/owner-application"],
      ],
    },
    {
      title: "Support",
      links: [
        ["Concierge", "/concierge"],
        ["FAQ", "/faq"],
        ["Contact", "/contact"],
      ],
    },
    {
      title: "Company",
      links: [
        ["About", "/about"],
        ["Trust", "/trust"],
        ["Privacy Policy", "/privacy-policy"],
        ["Terms", "/terms"],
        ["House Rules", "/house-rules"],
        ["Booking Terms", "/booking-terms"],
      ],
    },
  ],
};

export type SiteConfig = typeof siteConfig;
