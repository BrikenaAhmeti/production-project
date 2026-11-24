import type { BookingStatus, Locale, Service } from "./model";

export const localeCookie = "go_language";

const serviceNames = {
  wedding: { sq: "Dasma", en: "Weddings" },
  film: { sq: "Film", en: "Film" },
  portrait: { sq: "Portrete", en: "Portraits" },
  commercial: { sq: "Brende", en: "Brands" },
};

const statusNames = {
  pending: { sq: "Në pritje", en: "Pending" },
  confirmed: { sq: "Konfirmuar", en: "Confirmed" },
  cancelled: { sq: "Anuluar", en: "Cancelled" },
};

export const serviceLabel = (service: Service, locale: Locale) => serviceNames[service][locale];
export const statusLabel = (status: BookingStatus, locale: Locale) => statusNames[status][locale];

export const common = {
  sq: {
    name: "Emri i plotë", email: "Email", phone: "Numri i telefonit", date: "Data", service: "Shërbimi",
    message: "Shënime", optional: "opsionale", close: "Mbyll", save: "Ruaj", saving: "Duke ruajtur…",
    cancel: "Anulo", choose: "Zgjidh", back: "Prapa", next: "Tjetra", previous: "E mëparshmja",
    retry: "Provo përsëri", loading: "Duke ngarkuar…", clear: "Pastro", today: "Sot",
  },
  en: {
    name: "Full name", email: "Email", phone: "Phone number", date: "Date", service: "Service",
    message: "Notes", optional: "optional", close: "Close", save: "Save", saving: "Saving…",
    cancel: "Cancel", choose: "Choose", back: "Back", next: "Next", previous: "Previous",
    retry: "Try again", loading: "Loading…", clear: "Clear", today: "Today",
  },
};

export const bookingDetails = {
  sq: { price: "Çmimi", start: "Ora e fillimit", end: "Ora e mbarimit", time: "Orari", value: "Vlera e rezervuar" },
  en: { price: "Price", start: "Start time", end: "Finish time", time: "Schedule", value: "Booked value" },
};

const errors: Record<string, Record<Locale, string>> = {
  invalid: { sq: "Kontrollo të dhënat dhe provo përsëri.", en: "Check your details and try again." },
  phone: { sq: "Shkruaj një numër telefoni të vlefshëm.", en: "Enter a valid phone number." },
  email: { sq: "Shkruaj një adresë emaili të vlefshme.", en: "Enter a valid email address." },
  service: { sq: "Zgjidh një shërbim.", en: "Choose a service." },
  eventDate: { sq: "Zgjidh një datë.", en: "Choose a date." },
  price: { sq: "Shkruaj një çmim në euro me deri në dy shifra pas presjes.", en: "Enter a euro price with up to two decimal places." },
  startTime: { sq: "Shkruaj një orë të vlefshme fillimi.", en: "Enter a valid start time." },
  endTime: { sq: "Zgjidh një orë mbarimi të ndryshme nga ora e fillimit.", en: "Enter a finish time and a different start time." },
  pastDate: { sq: "Zgjidh datën e sotme ose një datë të ardhshme.", en: "Choose today or a future date." },
  to: { sq: "Data e fundit duhet të jetë pas datës së fillimit.", en: "The end date must be on or after the start date." },
  credentials: { sq: "Emaili ose fjalëkalimi është i pasaktë.", en: "The email or password is incorrect." },
  adminSetup: { sq: "Duhet të konfigurohet llogaria e administratorit.", en: "The administrator account needs to be configured." },
  rateLimit: { sq: "Prit pak para se të provosh përsëri.", en: "Please wait a little before trying again." },
  unauthorized: { sq: "Sesioni ka skaduar. Hyr përsëri.", en: "Your session has expired. Sign in again." },
  origin: { sq: "Rifresko faqen dhe provo përsëri.", en: "Reload the page and try again." },
  notFound: { sq: "Ky rekord nuk u gjet.", en: "This record could not be found." },
  bookingState: { sq: "Gjendja e rezervimit ndryshoi. Rifresko dhe provo përsëri.", en: "The booking status changed. Refresh and try again." },
  imageSize: { sq: "Zgjidh një fotografi më të vogël. Ngarkimi i përpunuar duhet të jetë deri në 4 MB.", en: "Choose a smaller photo. The processed upload must be 4 MB or smaller." },
  imageSourceSize: { sq: "Zgjidh një fotografi deri në 32 MB.", en: "Choose a photo that is 32 MB or smaller." },
  imageFormat: { sq: "Zgjidh një imazh statik JPG, PNG, WebP ose AVIF.", en: "Choose a still JPG, PNG, WebP, or AVIF image." },
  imageRequired: { sq: "Ngarko një fotografi për projektin.", en: "Upload an image for the project." },
  unavailable: { sq: "Shërbimi përkohësisht nuk është i disponueshëm. Provo përsëri.", en: "The service is temporarily unavailable. Please try again." },
};

export function errorLabel(code: string, locale: Locale) {
  return (errors[code] ?? errors.unavailable)[locale];
}
