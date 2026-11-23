# Go Production

A bilingual Next.js portfolio for a photography and film studio. Albanian is the default, with an English switch on the public site and in the studio dashboard. The opening camera develops portfolio images into clickable prints. Scrolling pushes through the lens into the selected photograph.

## Run the app

Requires Node.js 22 and PostgreSQL. There is one environment-configured administrator.

```sh
npm ci
npm run setup
```

The setup command creates an ignored `.env.local` with `ADMIN_EMAIL`, a randomly generated `ADMIN_PASSWORD`, and separate `SESSION_SECRET` and `CRON_SECRET` values. It preserves an existing file.

1. In the Supabase project’s **Connect** menu, copy its PostgreSQL connection strings. Set `DATABASE_URL` to the transaction pooler URI for Vercel and `DATABASE_MIGRATION_URL` to the session pooler URI for the local migration command. Substitute the database password, URL-encode reserved characters, and use the verified TLS configuration from Supabase. Keep both URLs on the server.
2. Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` and `SMTP_FROM` for the sender. Port 587 uses STARTTLS. Use port 465 or `SMTP_SECURE=true` for implicit TLS. `SMTP_REQUIRE_TLS=false` is available for a local test receiver.
3. Set `APP_ORIGIN` to the HTTPS origin on the Node.js host. Point the host and its reverse proxy at this app and ensure the proxy supplies a trusted client IP address.
4. Apply the database migrations and start the app.

```sh
npm run db:migrate
npm run dev
```

The public site is at `/` and the dashboard at `/admin`. For production use `npm run build` and `npm start` on a Node host with outbound PostgreSQL and SMTP access. Set the same environment names in the host’s secret settings. The database stores bookings, notifications, settings, and uploaded images in the private `studio` schema. Uploads are checked and resized to WebP on the server. The showreel and project videos accept direct HTTPS video URLs.

[Supabase PostgreSQL connection guide](https://supabase.com/docs/guides/database/connecting-to-postgres)

## Deploy on Vercel

1. Run `npm run db:migrate` locally against the selected Supabase database. The first migration creates the private `studio` schema, the initial contact settings, and four sample gallery entries.
2. Import the code into Vercel as a Next.js project. Set the production environment variables from `.env.example`. Add the pooled `DATABASE_URL`, the admin credentials and session secret, the cron secret, the HTTPS production origin, and the SMTP settings with a verified sender. The separate migration URL is only needed where you run migrations.
3. Deploy the project and confirm that the homepage and `/admin` both load. Test the booking and confirmation flow with an address you control. Use your mail provider’s SMTP port 587 or 465.

Gallery images over 4 MiB are resized in the browser before upload to fit the default Vercel function payload limit.

[Vercel function limits](https://vercel.com/docs/functions/limitations) · [SMTP on Vercel](https://vercel.com/kb/guide/serverless-functions-and-smtp)

## Booking and content workflow

- Website requests require a phone number and can omit email. They arrive as **Pending** and create an unread notification. Confirming a request attempts SMTP delivery in the visitor’s language when an email was entered. Failed delivery is visible in booking details and can be retried there.
- Admin bookings are immediately **Confirmed**. Both phone and email are optional.
- Bookings support service, status, exact date, date range, name, email, and phone filters. The dashboard starts with the current calendar month and can show the current week or year. Charts count scheduled event dates using `STUDIO_TIMEZONE`.
- Update the public location, email, phone, Instagram, and map under **Contact details**. Under **Gallery**, edit projects and order, replace or delete images, and update the homepage background and showreel.

## Supabase inactivity

Supabase Free projects can pause after a low-activity week. Paid projects are exempt from inactivity pauses. The production Vercel cron in `vercel.json` calls `GET /api/health` once daily. Set `CRON_SECRET` in Vercel so the scheduler can authenticate. The endpoint queries PostgreSQL on every authorized call. Daily checks generate activity, and Free projects remain subject to Supabase’s pausing policy.

[Supabase project pausing documentation](https://supabase.com/docs/guides/platform/free-project-pausing) · [Vercel cron configuration](https://vercel.com/docs/schedules/cron-jobs/manage-cron-jobs)

## Portfolio assets

The site starts with illustrative work and an editable Prishtina location. The sample showreel is a 15-second motion montage cut from the generated stills. Replace the samples with real studio work from the dashboard.

The built-in ImageGen tool produced the assets in `public/images`. The art direction for the final prompt set was:

- `go-camera.webp` uses an isolated graphite instant-film camera in a near-front three-quarter view, with a large glass lens, warm metal rim light, vermilion shutter button, and print slot. Transparent background and unbranded product styling.
- `go-hero.webp` uses a wide Albanian Ionian coastline at dusk with a figure in burnt-sienna silk, smoky sea haze, and dark negative space to the left. Restrained 35mm grain.
- `go-wedding.webp` uses a candid couple crossing a limestone villa arch, a drifting veil, hard side light, and rich analogue black and white.
- `go-film.webp` uses an oblique wide view of a lone swimmer’s wake below the limestone cliffs of a dark teal Albanian Riviera cove.
- `go-portrait.webp` uses a close portrait with one warm source, dark wool and a rust-brown backdrop, with realistic skin texture.
- `go-editorial.webp` uses an unlabelled amber glass fragrance bottle on travertine, with a hard diagonal shadow on olive-tan plaster.
