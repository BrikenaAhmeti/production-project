ALTER TABLE studio.bookings
  DROP CONSTRAINT bookings_service_check,
  ADD CONSTRAINT bookings_service_check CHECK (service IN (
    'wedding', 'engagement', 'anniversary', 'couple', 'birthday', 'family', 'maternity', 'newborn',
    'graduation', 'new_year', 'christmas', 'event', 'portrait', 'commercial', 'film', 'other'
  ));
