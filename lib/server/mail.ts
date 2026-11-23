import "server-only";
import nodemailer from "nodemailer";
import { brand } from "@/lib/content";
import { formatDate } from "@/lib/dates";
import type { Booking } from "@/lib/model";
import { serviceLabel } from "@/lib/i18n";
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

function confirmationText(booking: Booking) {
  const service = serviceLabel(booking.service, booking.language);
  const date = formatDate(booking.eventDate, booking.language, { dateStyle: "long" });
  if (booking.language === "sq") {
    return {
      subject: `${brand} · Rezervimi u konfirmua`,
      text: `Përshëndetje ${booking.name},\n\nRezervimi yt për ${service.toLowerCase()} më ${date} është konfirmuar.\n\nNëse dëshiron të ndash detaje të tjera, përgjigju këtij emaili.\n\n${brand}`,
    };
  }
  return {
    subject: `${brand} · Booking confirmed`,
    text: `Hi ${booking.name},\n\nYour ${service.toLowerCase()} booking for ${date} is confirmed.\n\nIf you'd like to share any other details, reply to this email.\n\n${brand}`,
  };
}

export async function sendConfirmation(id: string) {
  const claim = await transaction(async (client) => {
    const locked = await client.query<Booking>(`
      SELECT id, name, email, service, event_date::text AS "eventDate", language
      FROM studio.bookings
      WHERE id = $1 AND status = 'confirmed' AND source = 'website' AND email IS NOT NULL
      FOR UPDATE
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
