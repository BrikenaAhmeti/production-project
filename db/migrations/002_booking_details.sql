ALTER TABLE studio.bookings
  ADD COLUMN price_cents integer CHECK (price_cents BETWEEN 0 AND 999999999),
  ADD COLUMN start_time time CHECK (start_time < time '24:00' AND extract(second FROM start_time) = 0),
  ADD COLUMN end_time time CHECK (end_time < time '24:00' AND extract(second FROM end_time) = 0),
  ADD CONSTRAINT bookings_end_requires_start CHECK (
    end_time IS NULL OR (start_time IS NOT NULL AND end_time <> start_time)
  );

ALTER TABLE studio.confirmation_emails
  ADD COLUMN price_cents integer CHECK (price_cents BETWEEN 0 AND 999999999);
