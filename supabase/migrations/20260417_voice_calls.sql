-- Migration: voice_calls table
-- Run in Supabase SQL editor: https://supabase.com/dashboard → SQL Editor
-- Or via: supabase db push (if using Supabase CLI)

CREATE TABLE IF NOT EXISTS public.voice_calls (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at           timestamptz DEFAULT now(),
  ended_at             timestamptz,
  duration_seconds     int,
  language_detected    text,        -- 'en' | 'zh'
  transcript           text,
  summary              text,
  caller_name          text,
  caller_email         text,
  caller_phone         text,
  intent               text,        -- 'owner_enquiry' | 'guest_support' | 'booking' | 'other'
  transferred_to_human boolean     DEFAULT false,
  transfer_number      text,
  status               text        DEFAULT 'active',  -- 'active' | 'completed' | 'transferred' | 'missed'
  created_at           timestamptz DEFAULT now()
);

-- Indexes for common filter queries
CREATE INDEX IF NOT EXISTS idx_voice_calls_started_at      ON public.voice_calls (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_calls_language        ON public.voice_calls (language_detected);
CREATE INDEX IF NOT EXISTS idx_voice_calls_intent          ON public.voice_calls (intent);
CREATE INDEX IF NOT EXISTS idx_voice_calls_status          ON public.voice_calls (status);

-- Row-level security: service role can write; anon cannot read (call logs are private)
ALTER TABLE public.voice_calls ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (used by the backend)
CREATE POLICY "service_role_all"
  ON public.voice_calls
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Deny all access to anon/authenticated (no public read of call logs)
-- To allow admin dashboard access via Supabase auth, replace below with a
-- policy checking auth.role() = 'authenticated' and an admin claim.
