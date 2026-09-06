-- Migration: 023_event_images_and_gallery.sql
-- Description: Complete Events & Media Gallery schema, storage bucket, and RLS policies (Universal & Safe)

SET search_path = public, auth, storage;

-- 1. Create public.events table if it does not exist
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMP WITH TIME ZONE,
  venue TEXT,
  created_by UUID,
  image_url TEXT,
  gallery_images JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Ensure all columns exist if table was already created
DO $$
BEGIN
  ALTER TABLE public.events ADD COLUMN IF NOT EXISTS institution_id UUID;
  ALTER TABLE public.events ADD COLUMN IF NOT EXISTS title TEXT;
  ALTER TABLE public.events ADD COLUMN IF NOT EXISTS description TEXT;
  ALTER TABLE public.events ADD COLUMN IF NOT EXISTS event_date TIMESTAMP WITH TIME ZONE;
  ALTER TABLE public.events ADD COLUMN IF NOT EXISTS venue TEXT;
  ALTER TABLE public.events ADD COLUMN IF NOT EXISTS created_by UUID;
  ALTER TABLE public.events ADD COLUMN IF NOT EXISTS image_url TEXT;
  ALTER TABLE public.events ADD COLUMN IF NOT EXISTS gallery_images JSONB DEFAULT '[]'::jsonb;
  ALTER TABLE public.events ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT now();
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 2. Create public.event_registrations table if it does not exist
CREATE TABLE IF NOT EXISTS public.event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID,
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add unique constraint if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_event_user_registration'
  ) THEN
    ALTER TABLE public.event_registrations 
      ADD CONSTRAINT uq_event_user_registration UNIQUE (event_id, user_id);
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 3. Enable RLS and setup policies for events table
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Events public read" ON public.events;
CREATE POLICY "Events public read"
  ON public.events FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Events authenticated insert" ON public.events;
CREATE POLICY "Events authenticated insert"
  ON public.events FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Events authenticated update" ON public.events;
CREATE POLICY "Events authenticated update"
  ON public.events FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Events authenticated delete" ON public.events;
CREATE POLICY "Events authenticated delete"
  ON public.events FOR DELETE
  TO authenticated
  USING (true);

-- 4. Enable RLS and setup policies for event_registrations table
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Event registrations read" ON public.event_registrations;
CREATE POLICY "Event registrations read"
  ON public.event_registrations FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Event registrations insert" ON public.event_registrations;
CREATE POLICY "Event registrations insert"
  ON public.event_registrations FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Event registrations delete" ON public.event_registrations;
CREATE POLICY "Event registrations delete"
  ON public.event_registrations FOR DELETE
  TO authenticated
  USING (true);

-- 5. Create event-images storage bucket with public access
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-images',
  'event-images',
  true,
  10485760, -- 10 MB limit per image
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];

-- 6. Storage policies for event-images bucket
DROP POLICY IF EXISTS "Event images public read" ON storage.objects;
CREATE POLICY "Event images public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'event-images');

DROP POLICY IF EXISTS "Event images authenticated upload" ON storage.objects;
CREATE POLICY "Event images authenticated upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'event-images');

DROP POLICY IF EXISTS "Event images authenticated update" ON storage.objects;
CREATE POLICY "Event images authenticated update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'event-images');

DROP POLICY IF EXISTS "Event images authenticated delete" ON storage.objects;
CREATE POLICY "Event images authenticated delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'event-images');
