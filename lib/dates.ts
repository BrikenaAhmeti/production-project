export const defaultTimezone = "Europe/Belgrade";

const months = ["janar", "shkurt", "mars", "prill", "maj", "qershor", "korrik", "gusht", "shtator", "tetor", "nëntor", "dhjetor"];
const shortMonths = ["jan", "shk", "mar", "pri", "maj", "qer", "kor", "gus", "sht", "tet", "nën", "dhj"];
const weekdays = ["e diel", "e hënë", "e martë", "e mërkurë", "e enjte", "e premte", "e shtunë"];
const shortWeekdays = ["Die", "Hën", "Mar", "Mër", "Enj", "Pre", "Sht"];

export function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function calendarDay(date: Date, timeZone?: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  return ["year", "month", "day"].map((type) => parts.find((part) => part.type === type)?.value).join("-");
}

export function todayIn(timeZone = defaultTimezone) {
  return calendarDay(new Date(), timeZone);
}

export function dateInUtc(value: string) {
  return new Date(`${value}T00:00:00Z`);
}

function albanianDate(date: Date, options: Intl.DateTimeFormatOptions) {
  const month = date.getUTCMonth();
  const year = date.getUTCFullYear();
  const day = date.getUTCDate();
  const weekday = date.getUTCDay();

  switch (options.dateStyle) {
    case "full": return `${weekdays[weekday]}, ${day} ${months[month]} ${year}`;
    case "long": return `${day} ${months[month]} ${year}`;
    case "medium": return `${day} ${shortMonths[month]} ${year}`;
    case "short": return `${day}/${month + 1}/${year}`;
  }

  return [
    options.weekday && (options.weekday === "short" ? shortWeekdays[weekday] : weekdays[weekday]),
    options.day && day,
    options.month && (options.month === "short" ? shortMonths[month] : months[month]),
    options.year && year,
  ].filter(Boolean).join(" ");
}

export function formatDate(value: string, locale: "sq" | "en", options: Intl.DateTimeFormatOptions = { dateStyle: "medium" }) {
  const date = dateInUtc(value);
  if (locale === "sq") return albanianDate(date, options);
  return new Intl.DateTimeFormat("en-GB", { ...options, timeZone: "UTC" }).format(date);
}

export function formatTimestamp(value: string, locale: "sq" | "en") {
  const date = new Date(value);
  if (locale === "sq") {
    const time = new Intl.DateTimeFormat("en-GB", { timeStyle: "short" }).format(date);
    return `${formatDate(calendarDay(date), locale)}, ${time}`;
  }
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
