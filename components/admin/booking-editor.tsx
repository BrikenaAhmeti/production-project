"use client";

import { Check, Mail, Pencil } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { BookingTimeFields } from "@/components/booking-time-fields";
import { DatePicker, SelectMenu } from "@/components/controls";
import { Dialog } from "@/components/dialog";
import { useLocale } from "@/components/locale";
import { formatBookingTime, formatEuros } from "@/lib/booking-details";
import { asJson, errorCode, requestJson } from "@/lib/client";
import { formatDate, formatTimestamp } from "@/lib/dates";
import { bookingDetails, common, errorLabel, serviceLabel } from "@/lib/i18n";
import { services, type Booking, type Service } from "@/lib/model";
import { ErrorState, LoadingState, StatusBadge, useResource } from "./ui";

function ScheduleAndPrice({ booking, priceRequired = false }: { booking?: Booking; priceRequired?: boolean }) {
  const { locale } = useLocale();
  const labels = bookingDetails[locale];
  const optional = common[locale].optional;

  return <fieldset className="booking-schedule field-wide">
    <legend>{locale === "sq" ? "Orari dhe çmimi" : "Schedule and price"}</legend>
    <BookingTimeFields startTime={booking?.startTime} endTime={booking?.endTime}/>
    <label className="field"><span>{labels.price} (€) {!priceRequired && <small>({optional})</small>}</span>
      <input name="price" inputMode="decimal" maxLength={10} required={priceRequired} placeholder={locale === "sq" ? "0,00" : "0.00"}
        defaultValue={booking?.priceCents != null ? (booking.priceCents / 100).toFixed(2) : ""}/>
    </label>
  </fieldset>;
}

function BookingFields({ booking, onSaved, onCancel }: {
  booking?: Booking;
  onSaved: (booking: Booking) => void;
  onCancel: () => void;
}) {
  const { locale } = useLocale();
  const sq = locale === "sq";
  const t = common[locale];
  const [service, setService] = useState<Service | "">(booking?.service ?? "");
  const [eventDate, setDate] = useState(booking?.eventDate ?? "");
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const phoneRequired = booking?.source === "website";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!service || !eventDate) { setError(!service ? "service" : "eventDate"); return; }
    const { price, startTime, endTime, ...form } = Object.fromEntries(new FormData(event.currentTarget));
    setError(undefined);
    setSaving(true);
    try {
      const saved = await requestJson<Booking>(booking ? `/api/admin/bookings/${booking.id}` : "/api/admin/bookings",
        asJson(booking ? "PATCH" : "POST", {
          ...form, service, eventDate, language: booking?.language || locale, details: { price, startTime, endTime },
        }));
      onSaved(saved);
    } catch (failure) {
      setError(errorCode(failure));
    } finally { setSaving(false); }
  }

  return <form className="form-grid" onSubmit={submit}>
    <label className="field field-wide">{t.name}<input name="name" required minLength={2} maxLength={120} defaultValue={booking?.name}/></label>
    <label className="field"><span>{t.email} <small>({t.optional})</small></span><input name="email" type="email" maxLength={254} defaultValue={booking?.email ?? ""}/></label>
    <label className="field"><span>{t.phone} {!phoneRequired && <small>({t.optional})</small>}</span>
      <input name="phone" type="tel" maxLength={40} required={phoneRequired} defaultValue={booking?.phone ?? ""}/></label>
    <div className="field"><label htmlFor="admin-booking-service">{t.service}</label>
      <SelectMenu id="admin-booking-service" label={t.service} value={service} onChange={setService}
        options={services.map((value) => ({ value, label: serviceLabel(value, locale) }))}/>
    </div>
    <div className="field"><label htmlFor="admin-booking-date">{t.date}</label>
      <DatePicker id="admin-booking-date" label={t.date} value={eventDate} onChange={setDate}/>
    </div>
    <ScheduleAndPrice booking={booking}/>
    <label className="field field-wide"><span>{t.message} <small>({t.optional})</small></span>
      <textarea name="message" rows={3} maxLength={2500} defaultValue={booking?.message}/>
    </label>
    {error && <p className="form-error field-wide" role="alert">{errorLabel(error, locale)}</p>}
    <div className="form-actions field-wide">
      <button className="button button-secondary" type="button" onClick={onCancel}>{t.cancel}</button>
      <button className="button button-primary" type="submit" disabled={saving}>{saving ? t.saving
        : booking ? t.save : (sq ? "Shto rezervimin" : "Add booking")}</button>
    </div>
  </form>;
}

export function CreateBooking({ onClose, onChanged }: { onClose: () => void; onChanged: () => void }) {
  const { locale } = useLocale();
  const sq = locale === "sq";
  return <Dialog title={sq ? "Rezervim i ri" : "New booking"} onClose={onClose}>
    <p className="dialog-description">{sq ? "Rezervimet që shton këtu konfirmohen automatikisht." : "Bookings you add here are confirmed automatically."}</p>
    <BookingFields onSaved={() => { onChanged(); onClose(); }} onCancel={onClose}/>
  </Dialog>;
}

function BookingDetails({ initial, onChanged }: { initial: Booking; onChanged: () => void }) {
  const { locale } = useLocale();
  const sq = locale === "sq";
  const t = common[locale];
  const labels = bookingDetails[locale];
  const [booking, setBooking] = useState(initial);
  const [mode, setMode] = useState<"view" | "edit" | "confirm" | "cancel">("view");
  const [includePrice, setIncludePrice] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const confirmationForm = useRef<HTMLFormElement>(null);
  const website = booking.source === "website";
  const canSend = website && booking.status === "confirmed" && Boolean(booking.email) && booking.emailStatus !== "sent";

  useEffect(() => {
    if (mode === "confirm") confirmationForm.current?.focus();
  }, [mode]);

  function save(next: Booking) { setBooking(next); onChanged(); }

  function changeMode(next: typeof mode) {
    setError(undefined);
    setIncludePrice(false);
    setMode(next);
  }

  async function action(name: "confirm" | "cancel" | "email", details?: Record<string, FormDataEntryValue>) {
    setBusy(true);
    setError(undefined);
    try {
      save(await requestJson<Booking>(`/api/admin/bookings/${booking.id}`,
        asJson("POST", name === "confirm" ? { action: name, details, includePrice } : { action: name })));
      setMode("view");
    } catch (failure) { setError(errorCode(failure)); }
    finally { setBusy(false); }
  }

  if (mode === "edit") return <BookingFields booking={booking} onSaved={(item) => { save(item); setMode("view"); }}
    onCancel={() => changeMode("view")}/>;

  const mailLabels = {
    sent: sq ? "Emaili i konfirmimit u dërgua." : "Confirmation email sent.",
    failed: sq ? "Emaili nuk u dërgua. Mund ta provosh përsëri." : "Email delivery failed. You can retry it.",
    sending: sq ? "Emaili po dërgohet." : "Confirmation email is sending.",
    queued: sq ? "Emaili është në radhë." : "Confirmation email is queued.",
  };

  return <div className="booking-detail">
    <div className="detail-top"><div><h3>{booking.name}</h3><span>{website ? (sq ? "Nga faqja" : "From the website") : (sq ? "Shtuar manualisht" : "Added manually")}</span></div>
      <StatusBadge status={booking.status}/></div>
    <dl className="details-grid">
      <div><dt>{t.service}</dt><dd>{serviceLabel(booking.service, locale)}</dd></div>
      <div><dt>{t.date}</dt><dd>{formatDate(booking.eventDate, locale, { dateStyle: "long" })}</dd></div>
      <div><dt>{labels.time}</dt><dd>{formatBookingTime(booking, locale) ?? "—"}</dd></div>
      <div><dt>{labels.price}</dt><dd>{booking.priceCents == null ? "—" : formatEuros(booking.priceCents, locale)}</dd></div>
      <div><dt>{t.phone}</dt><dd>{booking.phone ? <a href={`tel:${booking.phone.replace(/[^+\d]/g, "")}`}>{booking.phone}</a> : "—"}</dd></div>
      <div><dt>{t.email}</dt><dd>{booking.email ? <a href={`mailto:${booking.email}`}>{booking.email}</a> : "—"}</dd></div>
      <div className="field-wide"><dt>{sq ? "Regjistruar" : "Received"}</dt><dd>{formatTimestamp(booking.createdAt, locale)}</dd></div>
      {booking.message && <div className="field-wide"><dt>{t.message}</dt><dd className="detail-message">{booking.message}</dd></div>}
    </dl>
    {booking.status === "confirmed" && website && <div className={`detail-mail ${booking.emailStatus === "failed" ? "detail-mail-failed" : ""}`} role="status">
      <Mail size={17}/>{booking.emailStatus ? mailLabels[booking.emailStatus] : booking.email
        ? (sq ? "Emaili i konfirmimit po pret të dërgohet." : "Confirmation email is ready to send.")
        : (sq ? "Klienti nuk ka dhënë email." : "The client did not provide an email.")}
    </div>}
    {mode !== "confirm" && error && <p className="form-error" role="alert">{errorLabel(error, locale)}</p>}
    {mode === "confirm" ? <form className="form-grid confirm-booking" ref={confirmationForm} tabIndex={-1} onSubmit={(event) => {
      event.preventDefault();
      void action("confirm", Object.fromEntries(new FormData(event.currentTarget)));
    }}>
      <ScheduleAndPrice booking={booking} priceRequired={includePrice}/>
      {website && booking.email && <label className="booking-price-option field-wide">
        <input type="checkbox" checked={includePrice} disabled={busy} onChange={(event) => setIncludePrice(event.target.checked)}/>
        {sq ? "Përfshije çmimin në emailin e konfirmimit" : "Include the price in the confirmation email"}
      </label>}
      {error && <p className="form-error field-wide" role="alert">{errorLabel(error, locale)}</p>}
      <div className="form-actions field-wide">
        <button type="button" className="button button-secondary" disabled={busy} onClick={() => changeMode("view")}>{t.back}</button>
        <button type="submit" className="button button-primary" disabled={busy}><Check size={17}/>{busy
          ? (sq ? "Duke konfirmuar…" : "Confirming…") : (sq ? "Konfirmo rezervimin" : "Confirm booking")}</button>
      </div>
    </form> : mode === "cancel" ? <div className="cancel-booking">
      <p>{sq ? "Ta anulosh këtë rezervim?" : "Cancel this booking?"}</p>
      <div className="form-actions">
        <button type="button" className="button button-secondary" disabled={busy} onClick={() => changeMode("view")}>{t.back}</button>
        <button type="button" className="button button-primary" onClick={() => action("cancel")} disabled={busy}>
          {sq ? "Anulo rezervimin" : "Cancel booking"}
        </button>
      </div>
    </div> : <div className="form-actions">
      {booking.status !== "cancelled" && <button type="button" className="text-button" disabled={busy} onClick={() => changeMode("cancel")}>{sq ? "Anulo rezervimin" : "Cancel booking"}</button>}
      <button type="button" className="button button-secondary" disabled={busy} onClick={() => changeMode("edit")}><Pencil size={15}/>{sq ? "Ndrysho" : "Edit"}</button>
      {booking.status === "pending" && <button type="button" className="button button-primary" disabled={busy} onClick={() => changeMode("confirm")}>
        <Check size={17}/>{sq ? "Shqyrto dhe konfirmo" : "Review and confirm"}
      </button>}
      {canSend && <button type="button" className="button button-primary" disabled={busy} onClick={() => action("email")}>
        <Mail size={16}/>{booking.emailStatus === "failed" ? (sq ? "Ridërgo emailin" : "Retry email") : (sq ? "Dërgo emailin" : "Send email")}
      </button>}
    </div>}
  </div>;
}

export function OpenBooking({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const { locale } = useLocale();
  const { data, error, reload } = useResource<Booking>(`/api/admin/bookings/${id}`);
  return <Dialog title={locale === "sq" ? "Detajet e rezervimit" : "Booking details"} onClose={onClose}>
    {error ? <ErrorState code={error} retry={reload}/> : data
      ? <BookingDetails key={data.id} initial={data} onChanged={onChanged}/> : <LoadingState/>}
  </Dialog>;
}
