-- La Maison Homes initial schema scaffold

create table if not exists properties (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  short_tagline text,
  suburb text not null,
  city text not null default 'Melbourne',
  country text not null default 'Australia',
  sleeps integer,
  bedrooms integer,
  bathrooms integer,
  parking integer,
  pet_friendly boolean default false,
  featured boolean default false,
  luxury_tier text,
  starting_price integer,
  hero_image text,
  description_short text,
  description_long text,
  status text default 'draft',
  created_at timestamptz default now()
);

create table if not exists property_images (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade,
  image_url text not null,
  sort_order integer default 0
);

create table if not exists property_videos (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade,
  video_url text not null,
  label text
);

create table if not exists property_amenities (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade,
  amenity text not null
);

create table if not exists property_rates (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade,
  nightly_rate integer,
  cleaning_fee integer,
  minimum_nights integer,
  effective_from date,
  effective_to date
);

create table if not exists property_availability (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade,
  available_from date,
  available_to date,
  status text default 'available'
);

create table if not exists suburbs (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  city text default 'Melbourne',
  hero_image text,
  summary text
);

create table if not exists journal_posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  category text,
  excerpt text,
  hero_image text,
  body_md text,
  published_at timestamptz,
  status text default 'draft'
);

create table if not exists testimonials (
  id uuid primary key default gen_random_uuid(),
  audience text not null,
  author text not null,
  meta text,
  quote text not null,
  featured boolean default false
);

create table if not exists owner_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  property_suburb text,
  property_type text,
  bedrooms text,
  currently_listed text,
  message text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  created_at timestamptz default now()
);

create table if not exists owner_applications (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  address text,
  suburb text,
  property_type text,
  bedrooms integer,
  bathrooms integer,
  car_spaces integer,
  max_guest_capacity integer,
  current_state text,
  current_platforms text,
  furnishing_level text,
  professional_photos boolean,
  building_restrictions_known boolean,
  goals text[],
  timeline_to_launch text,
  access_details text,
  special_concerns text,
  created_at timestamptz default now()
);

create table if not exists concierge_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  booking_reference text,
  stay_dates text,
  service_requested text,
  notes text,
  created_at timestamptz default now()
);

create table if not exists contact_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  enquiry_type text,
  message text,
  created_at timestamptz default now()
);

create table if not exists faq_items (
  id uuid primary key default gen_random_uuid(),
  audience text not null,
  question text not null,
  answer text not null,
  sort_order integer default 0
);
