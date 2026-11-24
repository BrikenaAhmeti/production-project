"use client";

import { useId } from "react";
import { bookingDetails, common } from "@/lib/i18n";
import type { Booking } from "@/lib/model";
import { useLocale } from "./locale";

export function BookingTimeFields({ startTime, endTime }: Partial<Pick<Booking, "startTime" | "endTime">>) {
  const { locale } = useLocale();
  const labels = bookingDetails[locale];
  const optional = common[locale].optional;
  const hintId = useId();
  return <>
    <label className="field"><span>{labels.start} <small>({optional})</small></span>
      <input name="startTime" type="time" defaultValue={startTime ?? ""}/>
    </label>
    <label className="field"><span>{labels.end} <small>({optional})</small></span>
      <input name="endTime" type="time" aria-describedby={hintId} defaultValue={endTime ?? ""}/>
    </label>
    <small className="booking-time-hint field-wide" id={hintId}>{locale === "sq"
      ? "Nëse ora e mbarimit është më e hershme se ora e fillimit, rezervimi përfundon ditën tjetër."
      : "An earlier finish time means the event ends the next day."}</small>
  </>;
}
