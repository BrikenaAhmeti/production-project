CREATE SCHEMA IF NOT EXISTS studio;
REVOKE ALL ON SCHEMA studio FROM PUBLIC;

CREATE TABLE studio.media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data bytea NOT NULL CHECK (octet_length(data) BETWEEN 1 AND 8388608),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE studio.site_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  location_sq text NOT NULL DEFAULT 'Prishtinë, Kosovë',
  location_en text NOT NULL DEFAULT 'Prishtina, Kosovo',
  instagram_url text NOT NULL DEFAULT '',
  map_url text NOT NULL DEFAULT '',
  hero_media_id uuid REFERENCES studio.media(id),
  reel_url text NOT NULL DEFAULT '/video/go-showreel.mp4'
);

INSERT INTO studio.site_settings DEFAULT VALUES;

CREATE TABLE studio.gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('wedding', 'film', 'portrait', 'commercial')),
  title_sq text NOT NULL,
  title_en text NOT NULL,
  description_sq text NOT NULL DEFAULT '',
  description_en text NOT NULL DEFAULT '',
  media_id uuid REFERENCES studio.media(id),
  asset_path text,
  video_url text NOT NULL DEFAULT '',
  position integer NOT NULL DEFAULT 0,
  is_sample boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(media_id, asset_path) = 1)
);

INSERT INTO studio.gallery (id, category, title_sq, title_en, description_sq, description_en, asset_path, video_url, position, is_sample)
VALUES
  ('5a4904c6-c045-4263-8bc3-a6efe48739b1', 'wedding', 'Një ditë për ne', 'A Day for Us', 'Një studim në bardh e zi i afërsisë, me dritën natyrale të një vile prej guri.', 'A black-and-white study of intimacy, lit by the natural light of a stone villa.', '/images/go-wedding.webp', '', 10, true),
  ('5a4904c6-c045-4263-8bc3-a6efe48739b2', 'film', 'Aty ku nis deti', 'Where the Sea Begins', 'Një vështrim mbi ritmin e Rivierës shqiptare, nga shkëmbinjtë te uji i hapur.', 'A look at the rhythm of the Albanian Riviera, from limestone cliffs to open water.', '/images/go-film.webp', '/video/go-showreel.mp4', 20, true),
  ('5a4904c6-c045-4263-8bc3-a6efe48739b3', 'portrait', 'Në gjysmëhije', 'In Half Light', 'Një portret i ndërtuar me një burim drite dhe një çast qetësie.', 'A portrait built around one light source and a moment of stillness.', '/images/go-portrait.webp', '', 30, true),
  ('5a4904c6-c045-4263-8bc3-a6efe48739b4', 'commercial', 'Forma e aromës', 'The Shape of Scent', 'Qelq, gur dhe dritë e fortë në një kompozim për fotografi produkti.', 'Glass, stone, and hard light in a study for product photography.', '/images/go-editorial.webp', '', 40, true);

CREATE TABLE studio.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid UNIQUE,
  name text NOT NULL,
  email text,
  phone text,
  service text NOT NULL CHECK (service IN ('wedding', 'film', 'portrait', 'commercial')),
  event_date date NOT NULL,
  message text NOT NULL DEFAULT '',
  language text NOT NULL CHECK (language IN ('sq', 'en')),
  source text NOT NULL CHECK (source IN ('website', 'admin')),
  status text NOT NULL CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (source <> 'website' OR (request_id IS NOT NULL AND length(btrim(coalesce(phone, ''))) > 0))
);

CREATE INDEX bookings_event_date_idx ON studio.bookings (event_date);
CREATE INDEX bookings_created_at_idx ON studio.bookings (created_at DESC, id DESC);

CREATE TABLE studio.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL UNIQUE REFERENCES studio.bookings(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);

CREATE INDEX notifications_created_at_idx ON studio.notifications (created_at DESC, id DESC);
CREATE INDEX notifications_unread_idx ON studio.notifications (created_at DESC) WHERE read_at IS NULL;

CREATE TABLE studio.confirmation_emails (
  booking_id uuid PRIMARY KEY REFERENCES studio.bookings(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sending', 'sent', 'failed')),
  attempts integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);

CREATE TABLE studio.request_limits (
  key text PRIMARY KEY,
  expires_at timestamptz NOT NULL,
  hits integer NOT NULL
);

CREATE INDEX request_limits_expiry_idx ON studio.request_limits (expires_at);
