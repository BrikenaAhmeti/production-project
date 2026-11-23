import "server-only";
import { dateInUtc, isoDate, todayIn } from "@/lib/dates";
import type { Booking, BookingList, Period, StudioStats } from "@/lib/model";
import { query, transaction } from "./db";
import { HttpError } from "./http";
import type { BookingFilters, BookingInput } from "./validation";

const pageSize = 10;
const bookingColumns = `
  b.id, b.name, b.email, b.phone, b.service, b.event_date::text AS "eventDate",
  b.message, b.language, b.source, b.status, b.created_at AS "createdAt", e.status AS "emailStatus"
`;
const bookingsWithMail = `studio.bookings b LEFT JOIN studio.confirmation_emails e ON e.booking_id = b.id`;

function bookingValues(input: BookingInput) {
  return [input.name, input.email || null, input.phone || null, input.service, input.eventDate, input.message, input.language];
}

export async function insertBooking(input: BookingInput, requestId?: string) {
  const source = requestId ? "website" : "admin";
  const result = await query<{ id: string }>(`
    WITH created AS (
      INSERT INTO studio.bookings (name, email, phone, service, event_date, message, language, request_id, source, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (request_id) DO NOTHING
      RETURNING id, source
    ), notified AS (
      INSERT INTO studio.notifications (booking_id)
      SELECT id FROM created WHERE source = 'website'
    )
    SELECT id FROM created
  `, [...bookingValues(input), requestId ?? null, source, requestId ? "pending" : "confirmed"]);
  if (result.rows[0]) return result.rows[0].id;

  const existing = await query<{ id: string }>("SELECT id FROM studio.bookings WHERE request_id = $1", [requestId]);
  return existing.rows[0].id;
}

export async function listBookings(filters: BookingFilters): Promise<BookingList> {
  const digits = /^[+\d ().-]+$/.test(filters.q) ? filters.q.replace(/\D/g, "") : "";
  const values = [
    filters.q, digits, filters.service ?? null, filters.status ?? null,
    filters.on ?? filters.from ?? null, filters.on ?? filters.to ?? null,
    pageSize, (filters.page - 1) * pageSize,
  ];
  const result = await query<{ items: Booking[]; total: number }>(`
    WITH matching AS (
      SELECT ${bookingColumns}
      FROM ${bookingsWithMail}
      WHERE (
        $1::text = '' OR strpos(lower(b.name), lower($1)) > 0
        OR strpos(lower(coalesce(b.email, '')), lower($1)) > 0
        OR strpos(coalesce(b.phone, ''), $1) > 0
        OR ($2::text <> '' AND strpos(regexp_replace(coalesce(b.phone, ''), '[^0-9]', '', 'g'), $2) > 0)
      )
      AND ($3::text IS NULL OR b.service = $3)
      AND ($4::text IS NULL OR b.status = $4)
      AND ($5::date IS NULL OR b.event_date >= $5)
      AND ($6::date IS NULL OR b.event_date <= $6)
    ), page AS (
      SELECT * FROM matching ORDER BY "createdAt" DESC, id DESC LIMIT $7 OFFSET $8
    )
    SELECT (SELECT count(*)::integer FROM matching) AS total,
      coalesce(json_agg(page ORDER BY "createdAt" DESC, id DESC), '[]'::json) AS items
    FROM page
  `, values);
  const page = result.rows[0];
  const maxPage = Math.max(1, Math.ceil(page.total / pageSize));
  if (filters.page > maxPage) return listBookings({ ...filters, page: maxPage });
  return { ...page, page: filters.page, pageSize };
}

export async function getBooking(id: string) {
  const result = await query<Booking>(`SELECT ${bookingColumns} FROM ${bookingsWithMail} WHERE b.id = $1`, [id]);
  if (!result.rows[0]) throw new HttpError(404, "notFound");
  return result.rows[0];
}

export async function editBooking(id: string, input: BookingInput) {
  const existing = await getBooking(id);
  if (existing.source === "website" && !input.phone) throw new HttpError(422, "phone");
  await query(`
    UPDATE studio.bookings SET name = $1, email = $2, phone = $3, service = $4,
      event_date = $5, message = $6, language = $7 WHERE id = $8
  `, [...bookingValues(input), id]);
  return getBooking(id);
}

export async function confirmBooking(id: string) {
  await query(`
    WITH confirmed AS (
      UPDATE studio.bookings SET status = 'confirmed'
      WHERE id = $1 AND status = 'pending'
      RETURNING id, email, source
    )
    INSERT INTO studio.confirmation_emails (booking_id)
    SELECT id FROM confirmed WHERE email IS NOT NULL AND source = 'website'
    ON CONFLICT (booking_id) DO NOTHING
  `, [id]);
  const booking = await getBooking(id);
  if (booking.status !== "confirmed") throw new HttpError(409, "bookingState");
  return booking;
}

export async function cancelBooking(id: string) {
  await transaction(async (client) => {
    const locked = await client.query<{ status: Booking["status"] }>(
      "SELECT status FROM studio.bookings WHERE id = $1 FOR UPDATE", [id],
    );
    if (!locked.rows[0]) throw new HttpError(404, "notFound");
    if (locked.rows[0].status === "cancelled") return;
    const sending = await client.query(`
      SELECT 1 FROM studio.confirmation_emails WHERE booking_id = $1 AND status = 'sending'
        AND updated_at > now() - interval '2 minutes'
    `, [id]);
    if (sending.rowCount) throw new HttpError(409, "bookingState");
    await client.query("UPDATE studio.bookings SET status = 'cancelled' WHERE id = $1", [id]);
  });
  return getBooking(id);
}

function periodBounds(period: Period) {
  const start = dateInUtc(todayIn(process.env.STUDIO_TIMEZONE));
  if (period === "week") start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  if (period === "month") start.setUTCDate(1);
  if (period === "year") start.setUTCMonth(0, 1);
  const end = new Date(start);
  if (period === "week") end.setUTCDate(end.getUTCDate() + 7);
  if (period === "month") end.setUTCMonth(end.getUTCMonth() + 1);
  if (period === "year") end.setUTCFullYear(end.getUTCFullYear() + 1);

  const days: string[] = [];
  const cursor = new Date(start);
  while (cursor < end) {
    days.push(isoDate(cursor));
    if (period === "year") cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    else cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return { start: isoDate(start), end, days };
}

export async function getStats(period: Period): Promise<StudioStats> {
  const { start, end, days } = periodBounds(period);
  const endDate = isoDate(end);
  const [rollup, recent] = await Promise.all([
    query<Pick<StudioStats, "total" | "confirmed" | "pending" | "website" | "series" | "services">>(`
      WITH matching AS (
        SELECT * FROM studio.bookings WHERE event_date >= $1 AND event_date < $2
      ), series AS (
        SELECT (CASE WHEN $3::text = 'year' THEN date_trunc('month', event_date::timestamp)::date ELSE event_date END)::text AS date,
          count(*)::integer AS total, (count(*) FILTER (WHERE status = 'confirmed'))::integer AS confirmed
        FROM matching GROUP BY 1
      ), categories AS (
        SELECT service, count(*)::integer AS total FROM matching GROUP BY service
      )
      SELECT count(*)::integer AS total,
        (count(*) FILTER (WHERE status = 'confirmed'))::integer AS confirmed,
        (count(*) FILTER (WHERE status = 'pending'))::integer AS pending,
        (count(*) FILTER (WHERE source = 'website'))::integer AS website,
        coalesce((SELECT json_agg(series) FROM series), '[]'::json) AS series,
        coalesce((SELECT json_agg(categories ORDER BY total DESC, service) FROM categories), '[]'::json) AS services
      FROM matching
    `, [start, endDate, period]),
    query<Booking>(`
      SELECT ${bookingColumns} FROM ${bookingsWithMail}
      WHERE b.event_date >= $1 AND b.event_date < $2
      ORDER BY b.created_at DESC, b.id DESC LIMIT 5
    `, [start, endDate]),
  ]);
  const result = rollup.rows[0];
  const buckets = new Map(result.series.map((bucket) => [bucket.date, bucket]));
  end.setUTCDate(end.getUTCDate() - 1);
  return {
    ...result,
    start,
    end: isoDate(end),
    series: days.map((date) => buckets.get(date) ?? { date, total: 0, confirmed: 0 }),
    recent: recent.rows,
  };
}
