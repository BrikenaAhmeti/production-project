import type { Booking, Locale } from "./model";

export function formatEuros(cents: number, locale: Locale, compact = false) {
  return new Intl.NumberFormat(locale === "sq" ? ["sq-XK", "it-IT"] : "en-IE", {
    style: "currency",
    currency: "EUR",
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact && cents >= 100000 ? 1 : 2,
    minimumFractionDigits: !compact && cents % 100 ? 2 : 0,
  }).format(cents / 100);
}

export function formatBookingTime({ startTime, endTime }: Pick<Booking, "startTime" | "endTime">, locale: Locale) {
  if (!startTime || !endTime) return startTime;
  const overnight = locale === "sq" ? " (ditën tjetër)" : " (next day)";
  return `${startTime}–${endTime}${endTime < startTime ? overnight : ""}`;
}
