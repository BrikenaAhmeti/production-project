"use client";

import { CheckCircle2 } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { asJson, errorCode, requestJson } from "@/lib/client";
import { common, errorLabel, serviceLabel } from "@/lib/i18n";
import { services, type Service } from "@/lib/model";
import { BookingTimeFields } from "./booking-time-fields";
import { DatePicker, SelectMenu } from "./controls";
import { Dialog } from "./dialog";
import { useLocale } from "./locale";

export function BookingForm({ service: initial, earliestDate, onClose }: {
  service?: Service;
  earliestDate: string;
  onClose: () => void;
}) {
  const { locale } = useLocale();
  const sq = locale === "sq";
  const t = common[locale];
  const [service, setService] = useState<Service | "">(initial ?? "");
  const [date, setDate] = useState("");
  const [error, setError] = useState<string>();
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const requestId = useRef<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!service || !date) {
      setError(!service ? "service" : "eventDate");
      return;
    }
    const { startTime, endTime, ...values } = Object.fromEntries(new FormData(event.currentTarget));
    setSending(true);
    setError(undefined);
    try {
      requestId.current ??= crypto.randomUUID();
      await requestJson("/api/bookings", asJson("POST", {
        ...values, service, eventDate: date, language: locale, requestId: requestId.current, schedule: { startTime, endTime },
      }));
      setDone(true);
    } catch (failure) {
      setError(errorCode(failure));
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog title={done ? (sq ? "Kërkesa u dërgua" : "Request received") : (sq ? "Rezervo një datë" : "Book a date")} onClose={onClose}>
      {done ? (
        <div className="booking-success" role="status">
          <CheckCircle2 size={35} strokeWidth={1.5} />
          <p>{sq ? "Do të të kontaktojmë pasi të shqyrtojmë kërkesën." : "We’ll be in touch after reviewing your request."}</p>
          <button className="button button-primary" onClick={onClose}>{t.close}</button>
        </div>
      ) : (
        <>
          <p className="dialog-description">{sq ? "Na trego çfarë ke në mendje dhe datën që të përshtatet." : "Tell us what you have in mind and the date that works for you."}</p>
          <form className="form-grid" onSubmit={submit}>
            <label className="field field-wide">{t.name}<input name="name" type="text" autoComplete="name" required minLength={2} maxLength={120} /></label>
            <label className="field">{t.phone}<input name="phone" type="tel" autoComplete="tel" required maxLength={40} /></label>
            <label className="field"><span>{t.email} <small>({t.optional})</small></span><input name="email" type="email" autoComplete="email" maxLength={254} /></label>
            <div className="field"><label htmlFor="public-service">{t.service}</label>
              <SelectMenu id="public-service" label={t.service} value={service} onChange={setService}
                options={services.map((id) => ({ value: id, label: serviceLabel(id, locale) }))}/>
            </div>
            <div className="field"><label htmlFor="public-date">{t.date}</label>
              <DatePicker id="public-date" label={t.date} value={date} onChange={setDate} min={earliestDate} />
            </div>
            <BookingTimeFields/>
            <label className="field field-wide"><span>{t.message} <small>({t.optional})</small></span>
              <textarea name="message" rows={3} maxLength={2500} placeholder={sq ? "Vendi ose ndonjë detaj tjetër" : "Location or anything else you’d like to share"} />
            </label>
            <div className="honeypot" aria-hidden="true"><label>Website<input name="website" autoComplete="off" tabIndex={-1}/></label></div>
            {error && <p className="form-error field-wide" role="alert">{errorLabel(error, locale)}</p>}
            <div className="form-actions field-wide">
              <button type="submit" className="button button-primary" disabled={sending}>
                {sending ? (sq ? "Duke dërguar…" : "Sending…") : (sq ? "Dërgo kërkesën" : "Send request")}
              </button>
            </div>
          </form>
        </>
      )}
    </Dialog>
  );
}
