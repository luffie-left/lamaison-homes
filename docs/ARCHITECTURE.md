# La Maison Homes — Architecture Summary

## Product Objective
Build a production-ready premium short-stay brand site for La Maison Homes that blends:
- Melbourne Curated Stays conversion logic
- Plum Guide-style premium editorial confidence
- La Maison Homes brand identity

## Strategic Positioning
La Maison Homes curates and manages distinctive short stays in Melbourne, combining hotel-grade operations with the warmth of beautifully selected homes.

## Primary conversion funnels
1. Guest direct booking / high-intent enquiry
2. Owner management lead / onboarding application

## MVP Phase 1
- Home
- Stays listing
- Single property pages
- Host With Us
- How It Works
- About
- Contact
- FAQ
- short owner form
- Supabase form capture scaffolding
- placeholder properties and images
- mobile responsive
- SEO basics
- deploy to Vercel

## Technical Stack
- Next.js 15+ App Router
- TypeScript
- Tailwind CSS v4
- shadcn/ui-style component primitives
- Framer Motion-ready dependency
- Supabase content + form data layer prepared
- Hostaway integration layer planned via feature flag
- Vercel deploy target
- Resend-ready notification path

## Route map
- /
- /stays
- /stays/[slug]
- /destinations/melbourne
- /host-with-us
- /how-it-works
- /about
- /journal
- /journal/[slug]
- /contact
- /concierge
- /faq
- /trust
- /book
- /thank-you
- /owner-application
- /privacy-policy
- /terms
- /house-rules
- /booking-terms

## Key reusable components
- site header/footer
- section heading
- property card
- editorial card
- testimonial card
- icon promise card
- service card
- suburb card
- CTA split panel
- search module
- generic form shell

## Data domains
- properties
- property_images
- property_videos
- property_amenities
- property_rates
- property_availability
- suburbs
- journal_posts
- testimonials
- owner_leads
- owner_applications
- concierge_requests
- contact_requests
- faq_items

## Hostaway strategy
- keep direct booking wrapper page abstracted
- store static/seed data locally or in Supabase initially
- later add provider adapter and feature flag for live rates / availability / handoff

## Notes
Current implementation uses seeded mock data for fast iteration and production-style scaffolding. Next step is wiring forms/content to Supabase and replacing placeholders with final assets.
