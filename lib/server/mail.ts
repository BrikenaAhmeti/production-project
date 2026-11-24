import "server-only";
import nodemailer from "nodemailer";
import { formatBookingTime, formatEuros } from "@/lib/booking-details";
import { brand } from "@/lib/content";
import { formatDate } from "@/lib/dates";
import type { Booking } from "@/lib/model";
import { bookingDetails, serviceLabel } from "@/lib/i18n";
import { getBooking } from "./bookings";
import { query, transaction } from "./db";

function mailConfig() {
  const host = process.env.SMTP_HOST;
  const from = process.env.SMTP_FROM;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  if (!host || !from || !Number.isInteger(port) || port < 1 || port > 65535 || Boolean(user) !== Boolean(pass)) return null;
  const secure = process.env.SMTP_SECURE === "true" || port === 465;
  return {
    from,
    transport: {
      host,
      port,
      secure,
      requireTLS: !secure && process.env.SMTP_REQUIRE_TLS !== "false",
      auth: user && pass ? { user, pass } : undefined,
      connectionTimeout: 6000,
      greetingTimeout: 6000,
      socketTimeout: 12000,
    },
  };
}

type ConfirmationBooking = Pick<Booking, "id" | "name" | "email" | "service" | "eventDate" | "language" | "startTime" | "endTime" | "priceCents">;

function confirmationText(booking: ConfirmationBooking) {
  const service = serviceLabel(booking.service, booking.language);
  const date = formatDate(booking.eventDate, booking.language, { dateStyle: "long" });
  const labels = bookingDetails[booking.language];
  const type = `\n${labels.type}: ${service}`;
  const time = formatBookingTime(booking, booking.language);
  const schedule = time ? `\n${labels.time}: ${time}` : "";
  const price = booking.priceCents == null ? "" : `\n${labels.price}: ${formatEuros(booking.priceCents, booking.language)}`;
  if (booking.language === "sq") {
    return {
      subject: `${brand} · Rezervimi u konfirmua`,
      text: `Përshëndetje ${booking.name},\n\nRezervimi yt për datën ${date} është konfirmuar.${type}${schedule}${price}\n\nNëse dëshiron të ndash detaje të tjera, përgjigju këtij emaili.\n\n${brand}`,
    };
  }
  return {
    subject: `${brand} · Booking confirmed`,
    text: `Hi ${booking.name},\n\nYour booking for ${date} is confirmed.${type}${schedule}${price}\n\nIf you'd like to share any other details, reply to this email.\n\n${brand}`,
  };
}

export async function sendConfirmation(id: string) {
  const claim = await transaction(async (client) => {
    const locked = await client.query<ConfirmationBooking>(`
      SELECT b.id, b.name, b.email, b.service, b.event_date::text AS "eventDate", b.language,
        left(b.start_time::text, 5) AS "startTime", left(b.end_time::text, 5) AS "endTime", e.price_cents AS "priceCents"
      FROM studio.bookings b LEFT JOIN studio.confirmation_emails e ON e.booking_id = b.id
      WHERE b.id = $1 AND b.status = 'confirmed' AND b.source = 'website' AND b.email IS NOT NULL
      FOR UPDATE OF b
    `, [id]);
    const booking = locked.rows[0];
    if (!booking) return null;

    await client.query(`
      INSERT INTO studio.confirmation_emails (booking_id) VALUES ($1)
      ON CONFLICT (booking_id) DO NOTHING
    `, [id]);

    const claimed = await client.query<{ attempts: number }>(`
      UPDATE studio.confirmation_emails
      SET status = 'sending', updated_at = now(), attempts = attempts + 1
      WHERE booking_id = $1 AND (
        status IN ('queued', 'failed') OR (status = 'sending' AND updated_at < now() - interval '2 minutes')
      )
      RETURNING attempts
    `, [id]);
    return claimed.rows[0] ? { booking, attempt: claimed.rows[0].attempts } : null;
  });
  if (!claim) return getBooking(id);

  const config = mailConfig();
  let delivered = false;
  if (config) {
    try {
      const result = await nodemailer.createTransport(config.transport).sendMail({
        from: config.from,
        to: claim.booking.email!,
        messageId: `<booking.${id}@${config.from.match(/@([^>\s]+)>?$/)?.[1] || "go-production.local"}>`,
        ...confirmationText(claim.booking),
      });
      delivered = result.accepted.length > 0;
    } catch (error) {
      const code = (error as { code?: string }).code;
      console.error("Booking confirmation SMTP delivery failed.", code ?? "UNKNOWN");
    }
  }

  await query(`
    UPDATE studio.confirmation_emails
    SET status = $2, updated_at = now(), sent_at = CASE WHEN $2 = 'sent' THEN now() ELSE NULL END
    WHERE booking_id = $1 AND attempts = $3 AND status = 'sending'
  `, [id, delivered ? "sent" : "failed", claim.attempt]);
  return getBooking(id);
}
