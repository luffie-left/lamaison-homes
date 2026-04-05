# La Maison Homes

Production-ready premium short-stay brand website scaffold built with Next.js.

## Stack
- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui-style primitives
- Supabase-ready content/forms schema
- Vercel-ready deployment target

## Local development
```bash
npm install
npm run dev
```

Open http://localhost:3000

## Build
```bash
npm run build
npm run start
```

## Environment variables
Create `.env.local` with placeholders as needed:
```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
GA4_MEASUREMENT_ID=
NEXT_PUBLIC_META_PIXEL_ID=
HOSTAWAY_API_KEY=
HOSTAWAY_ACCOUNT_ID=
ENABLE_HOSTAWAY=false
```

## Key files
- `docs/ARCHITECTURE.md`
- `docs/SUPABASE_SCHEMA.sql`
- `src/data/mock-data.ts`
- `src/app/*`
- `src/components/*`

## Production notes
- Replace placeholder imagery in `public/placeholders`
- Wire forms to Supabase and Resend
- Add final legal copy and analytics scripts
- Configure Vercel env vars and project domain
- Add real property data or Supabase seed script
