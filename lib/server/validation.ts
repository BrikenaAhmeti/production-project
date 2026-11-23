import "server-only";
import { z } from "zod";
import { periods, services, statuses } from "@/lib/model";

const optionalText = (length: number) => z.string().trim().max(length).default("");
const email = z.string().trim().max(254).refine((value) => !value || z.email().safeParse(value).success).default("");
const phone = z.string().trim().max(40).refine((value) => {
  if (!value) return true;
  const digits = value.replace(/\D/g, "");
  return /^\+?[\d ().-]+$/.test(value) && digits.length >= 6 && digits.length <= 20;
}).default("");

export const httpsUrl = z.string().trim().max(1500).refine((value) => {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}).default("");

export const bookingInput = z.object({
  name: z.string().trim().min(2).max(120),
  email,
  phone,
  service: z.enum(services),
  eventDate: z.iso.date(),
  message: optionalText(2500),
  language: z.enum(["sq", "en"]).default("sq"),
});

export const websiteBookingInput = bookingInput.extend({
  requestId: z.uuid(),
  website: optionalText(200),
}).refine((value) => value.phone.length > 0, { path: ["phone"] });

export const bookingFilters = z.object({
  q: optionalText(120),
  service: z.enum(services).optional(),
  status: z.enum(statuses).optional(),
  on: z.iso.date().optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
}).refine((value) => !value.from || !value.to || value.from <= value.to, { path: ["to"] });

export const statsInput = z.enum(periods).default("month");

export const galleryInput = z.object({
  category: z.enum(services),
  titleSq: z.string().trim().min(1).max(100),
  titleEn: z.string().trim().min(1).max(100),
  descriptionSq: optionalText(1000),
  descriptionEn: optionalText(1000),
  videoUrl: httpsUrl.or(z.literal("/video/go-showreel.mp4")),
  position: z.coerce.number().int().min(0).max(9999),
});

export const contactInput = z.object({
  email,
  phone,
  locationSq: optionalText(160),
  locationEn: optionalText(160),
  instagramUrl: httpsUrl,
  mapUrl: httpsUrl,
});

export type BookingInput = z.infer<typeof bookingInput>;
export type BookingFilters = z.infer<typeof bookingFilters>;
export type GalleryInput = z.infer<typeof galleryInput>;
export type ContactInput = z.infer<typeof contactInput>;
