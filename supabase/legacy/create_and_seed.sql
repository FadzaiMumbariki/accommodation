-- =============================================================================
-- ImbaFind: All-in-One Setup & Instant Seed
-- Paste this entire file into: Supabase Dashboard → SQL Editor → Run
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables to guarantee a clean slate
DROP TABLE IF EXISTS public.reports CASCADE;
DROP TABLE IF EXISTS public.reviews CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.viewing_requests CASCADE;
DROP TABLE IF EXISTS public.accommodation_requests CASCADE;
DROP TABLE IF EXISTS public.saved_properties CASCADE;
DROP TABLE IF EXISTS public.property_images CASCADE;
DROP TABLE IF EXISTS public.inquiries CASCADE;
DROP TABLE IF EXISTS public.properties CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 1. PROFILES
CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY,
  full_name     TEXT,
  email         TEXT,
  phone         TEXT,
  avatar_url    TEXT,
  role          TEXT NOT NULL DEFAULT 'tenant' CHECK (role IN ('tenant', 'landlord')),
  verified      BOOLEAN NOT NULL DEFAULT false,
  push_token    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'User'),
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'tenant')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = excluded.email,
    full_name = COALESCE(profiles.full_name, excluded.full_name);
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 2. PROPERTIES
CREATE TABLE public.properties (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  landlord_id         UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  property_type       TEXT NOT NULL,
  price               NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  deposit             NUMERIC(10,2),
  city                TEXT NOT NULL,
  suburb              TEXT NOT NULL,
  province            TEXT NOT NULL,
  address             TEXT,
  bedrooms            INT NOT NULL DEFAULT 1 CHECK (bedrooms >= 0),
  bathrooms           INT NOT NULL DEFAULT 1 CHECK (bathrooms >= 0),
  max_occupants       INT NOT NULL DEFAULT 1 CHECK (max_occupants >= 1),
  images              TEXT[] NOT NULL DEFAULT '{}',
  amenities           TEXT[] NOT NULL DEFAULT '{}',
  description         TEXT,
  available           BOOLEAN NOT NULL DEFAULT true,
  availability_status TEXT DEFAULT 'available_now',
  available_from_date DATE,
  verified            BOOLEAN NOT NULL DEFAULT false,
  rating              NUMERIC(3,2),
  reviews_count       INT DEFAULT 0,
  lat                 NUMERIC(10,7),
  lng                 NUMERIC(10,7),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read available properties"
  ON public.properties FOR SELECT USING (available = true OR landlord_id = auth.uid());

CREATE POLICY "Landlords can insert properties"
  ON public.properties FOR INSERT WITH CHECK (auth.uid() = landlord_id);

CREATE POLICY "Landlords can update own properties"
  ON public.properties FOR UPDATE USING (auth.uid() = landlord_id);

CREATE POLICY "Landlords can delete own properties"
  ON public.properties FOR DELETE USING (auth.uid() = landlord_id);

CREATE INDEX IF NOT EXISTS idx_properties_city ON public.properties (city);
CREATE INDEX IF NOT EXISTS idx_properties_suburb ON public.properties (suburb);
CREATE INDEX IF NOT EXISTS idx_properties_available ON public.properties (available) WHERE available = true;


-- 3. SAVED PROPERTIES
CREATE TABLE public.saved_properties (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  property_id   UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  saved_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, property_id)
);

ALTER TABLE public.saved_properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own saved properties"
  ON public.saved_properties FOR ALL USING (auth.uid() = user_id);


-- 4. VIEWING REQUESTS
CREATE TABLE public.viewing_requests (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id   UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  landlord_id   UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewing_date  DATE NOT NULL,
  viewing_time  TIME NOT NULL,
  attendees     INT NOT NULL DEFAULT 1,
  message       TEXT,
  status        TEXT NOT NULL DEFAULT 'pending',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.set_viewing_landlord_id()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF new.landlord_id IS NULL THEN
    SELECT landlord_id INTO new.landlord_id FROM public.properties WHERE id = new.property_id;
  END IF;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS set_viewing_landlord_trigger ON public.viewing_requests;
CREATE TRIGGER set_viewing_landlord_trigger
  BEFORE INSERT ON public.viewing_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_viewing_landlord_id();

ALTER TABLE public.viewing_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants manage own viewings"
  ON public.viewing_requests FOR ALL USING (auth.uid() = tenant_id);

CREATE POLICY "Landlords view property viewings"
  ON public.viewing_requests FOR SELECT USING (auth.uid() = landlord_id);

CREATE POLICY "Landlords update viewing status"
  ON public.viewing_requests FOR UPDATE USING (auth.uid() = landlord_id);


-- 5. ACCOMMODATION REQUESTS
CREATE TABLE public.accommodation_requests (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  city              TEXT NOT NULL,
  suburb            TEXT,
  province          TEXT NOT NULL,
  property_type     TEXT NOT NULL DEFAULT 'any',
  bedrooms          TEXT NOT NULL DEFAULT 'any',
  number_of_people  INT NOT NULL DEFAULT 1,
  min_budget        NUMERIC(10,2) NOT NULL,
  max_budget        NUMERIC(10,2) NOT NULL,
  move_in_date      DATE NOT NULL,
  furnished         TEXT NOT NULL DEFAULT 'any',
  amenities         TEXT[] NOT NULL DEFAULT '{}',
  additional_notes  TEXT,
  status            TEXT NOT NULL DEFAULT 'active',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.accommodation_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own requests"
  ON public.accommodation_requests FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Landlords can read active requests"
  ON public.accommodation_requests FOR SELECT USING (status = 'active');


-- 6. CONVERSATIONS & MESSAGES
CREATE TABLE public.conversations (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  landlord_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  property_id       UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  last_message      TEXT,
  last_message_at   TIMESTAMPTZ,
  tenant_unread     INT NOT NULL DEFAULT 0,
  landlord_unread   INT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can access conversations"
  ON public.conversations FOR ALL USING (auth.uid() = tenant_id OR auth.uid() = landlord_id);

CREATE TABLE public.messages (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id   UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text              TEXT NOT NULL,
  read              BOOLEAN NOT NULL DEFAULT false,
  type              TEXT DEFAULT 'text',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Conversation participants can access messages"
  ON public.messages FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.tenant_id = auth.uid() OR c.landlord_id = auth.uid())
    )
  );

CREATE OR REPLACE FUNCTION public.send_chat_message(
  p_conversation_id UUID,
  p_text TEXT
)
RETURNS SETOF public.messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_message public.messages%rowtype;
  v_text TEXT := btrim(COALESCE(p_text, ''));
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to send a message.';
  END IF;

  IF v_text = '' OR length(v_text) > 5000 THEN
    RAISE EXCEPTION 'Messages must contain between 1 and 5000 characters.';
  END IF;

  INSERT INTO public.messages (conversation_id, sender_id, text)
  VALUES (p_conversation_id, auth.uid(), v_text)
  RETURNING * INTO v_message;

  UPDATE public.conversations c
  SET last_message = v_message.text,
      last_message_at = v_message.created_at,
      tenant_unread = c.tenant_unread + CASE WHEN c.tenant_id = auth.uid() THEN 0 ELSE 1 END,
      landlord_unread = c.landlord_unread + CASE WHEN c.landlord_id = auth.uid() THEN 0 ELSE 1 END
  WHERE c.id = p_conversation_id;

  RETURN NEXT v_message;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_chat_message(UUID, TEXT) TO authenticated;


-- 7. REVIEWS & REPORTS
CREATE TABLE public.reviews (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id   UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  author_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_name   TEXT,
  rating        INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (property_id, author_id)
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Tenants can write reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE TABLE public.reports (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  property_id       UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  reported_user_id  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason            TEXT NOT NULL,
  details           TEXT,
  status            TEXT NOT NULL DEFAULT 'open',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert reports" ON public.reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Users can read reports" ON public.reports FOR SELECT USING (auth.uid() = reporter_id);

-- 8. ACCOUNT DELETION RPC
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;


-- 9. PERMISSIONS & POSTGREST SCHEMA CACHE RELOAD
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role;


-- 10. INSERT INITIAL SAMPLE PROPERTIES
INSERT INTO public.profiles (id, full_name, role, verified, phone)
VALUES ('00000000-0000-0000-0000-000000000001', 'Tendai Makoni (Verified Host)', 'landlord', true, '+263 77 456 7890')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.properties (
  id, landlord_id, title, description, property_type, price, deposit,
  city, suburb, province, bedrooms, bathrooms, max_occupants,
  amenities, images, available, availability_status, verified, rating, reviews_count
) VALUES
(
  '11111111-1111-1111-1111-111111111111',
  '00000000-0000-0000-0000-000000000001',
  'Spacious 3 Bed Family Home',
  'Stunning 3-bedroom home in Borrowdale. Large garden, close to schools.',
  'house', 500.00, 1000.00,
  'Harare', 'Borrowdale', 'Harare Province',
  3, 2, 6,
  ARRAY['water','electricity','security','parking','garden','wifi','dstv'],
  ARRAY['https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800', 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800'],
  true, 'available_now', true, 4.8, 12
),
(
  '22222222-2222-2222-2222-222222222222',
  '00000000-0000-0000-0000-000000000001',
  'Executive 4 Bed Home Mount Pleasant',
  'Top-tier residence with solar backup, borehole, and garden.',
  'house', 850.00, 1700.00,
  'Harare', 'Mount Pleasant', 'Harare Province',
  4, 3, 8,
  ARRAY['water','electricity','solar','security','parking','wifi','furnished'],
  ARRAY['https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800', 'https://images.unsplash.com/photo-1571939228382-b2f2b585ce15?w=800'],
  true, 'available_now', true, 4.9, 18
),
(
  '33333333-3333-3333-3333-333333333333',
  '00000000-0000-0000-0000-000000000001',
  'Modern 2 Bed Apartment Avondale',
  'Clean 2-bed apartment in Avondale, walking distance to shops.',
  'apartment', 320.00, 640.00,
  'Harare', 'Avondale', 'Harare Province',
  2, 1, 4,
  ARRAY['water','electricity','wifi','security','parking'],
  ARRAY['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'],
  true, 'available_now', true, 4.4, 7
),
(
  '44444444-4444-4444-4444-444444444444',
  '00000000-0000-0000-0000-000000000001',
  'Modern 2 Bed House Nkulumane',
  'Modern 2-bed house in Nkulumane with solar and borehole.',
  'house', 350.00, 700.00,
  'Bulawayo', 'Nkulumane', 'Bulawayo',
  2, 1, 4,
  ARRAY['water','electricity','solar','security','parking','garden','borehole','wifi'],
  ARRAY['https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800'],
  true, 'available_now', true, 4.8, 9
),
(
  '55555555-5555-5555-5555-555555555555',
  '00000000-0000-0000-0000-000000000001',
  'Cozy Garden Cottage Greendale',
  'Peaceful cottage in Greendale with private garden.',
  'cottage', 290.00, 580.00,
  'Harare', 'Greendale', 'Harare Province',
  2, 1, 4,
  ARRAY['water','electricity','solar','garden','parking'],
  ARRAY['https://images.unsplash.com/photo-1588880331179-bc9b93a8cb5e?w=800'],
  true, 'available_now', true, 4.2, 5
)
ON CONFLICT (id) DO NOTHING;

NOTIFY pgrst, 'reload schema';

-- Verification query (shows the inserted listings in the Results tab)
SELECT id, title, price, city, suburb FROM public.properties;
