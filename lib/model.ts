export const services = ["wedding", "film", "portrait", "commercial"] as const;
export const statuses = ["pending", "confirmed", "cancelled"] as const;
export const periods = ["week", "month", "year"] as const;

export type Locale = "sq" | "en";
export type Service = (typeof services)[number];
export type BookingStatus = (typeof statuses)[number];
export type Period = (typeof periods)[number];
export type EmailStatus = "queued" | "sending" | "sent" | "failed";

export type Booking = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  service: Service;
  eventDate: string;
  priceCents: number | null;
  startTime: string | null;
  endTime: string | null;
  message: string;
  language: Locale;
  source: "website" | "admin";
  status: BookingStatus;
  emailStatus: EmailStatus | null;
  createdAt: string;
};

export type BookingList = { items: Booking[]; total: number; page: number; pageSize: number };

export type StudioNotification = {
  id: string;
  bookingId: string;
  name: string;
  service: Service;
  createdAt: string;
  readAt: string | null;
};

export type GalleryItem = {
  id: string;
  category: Service;
  titleSq: string;
  titleEn: string;
  descriptionSq: string;
  descriptionEn: string;
  imageUrl: string;
  videoUrl: string;
  position: number;
  isSample: boolean;
};

export type StudioSettings = {
  email: string;
  phone: string;
  locationSq: string;
  locationEn: string;
  instagramUrl: string;
  mapUrl: string;
  heroUrl: string;
  reelUrl: string;
};

export type StudioContent = { settings: StudioSettings; gallery: GalleryItem[] };

export type StudioStats = {
  start: string;
  end: string;
  total: number;
  confirmed: number;
  pending: number;
  website: number;
  bookedCents: number;
  series: { date: string; total: number; confirmed: number; bookedCents: number }[];
  services: { service: Service; total: number }[];
  recent: Booking[];
};

export const adminViews = ["overview", "bookings", "notifications", "gallery", "contact"] as const;
export type AdminView = (typeof adminViews)[number];

export function isAdminView(value: unknown): value is AdminView {
  return adminViews.some((view) => view === value);
}
