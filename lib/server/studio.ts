import "server-only";
import sharp from "sharp";
import { defaultHero, defaultReel, defaultSettings, sampleGallery } from "@/lib/content";
import { imageTransportLimit } from "@/lib/image-upload";
import type { GalleryItem, StudioContent, StudioNotification, StudioSettings } from "@/lib/model";
import { query, transaction } from "./db";
import { HttpError } from "./http";
import type { ContactInput, GalleryInput } from "./validation";

const galleryColumns = `
  id, category, title_sq AS "titleSq", title_en AS "titleEn", description_sq AS "descriptionSq",
  description_en AS "descriptionEn", coalesce('/api/media/' || media_id::text, asset_path) AS "imageUrl",
  video_url AS "videoUrl", position, is_sample AS "isSample"
`;

export async function getGallery() {
  return (await query<GalleryItem>(`SELECT ${galleryColumns} FROM studio.gallery ORDER BY position, created_at, id`)).rows;
}

export async function getSettings() {
  const result = await query<StudioSettings>(`
    SELECT email, phone, location_sq AS "locationSq", location_en AS "locationEn",
      instagram_url AS "instagramUrl", map_url AS "mapUrl",
      coalesce('/api/media/' || hero_media_id::text, $1) AS "heroUrl", reel_url AS "reelUrl"
    FROM studio.site_settings WHERE id = 1
  `, [defaultHero]);
  if (!result.rows[0]) throw new Error("Studio settings are missing.");
  return result.rows[0];
}

export async function getStudioContent(): Promise<StudioContent> {
  if (process.env.DATABASE_URL) {
    try {
      const [settings, gallery] = await Promise.all([getSettings(), getGallery()]);
      return { settings, gallery };
    } catch {
      console.error("The public site is using bundled content because PostgreSQL is unavailable.");
    }
  }
  return { settings: defaultSettings, gallery: sampleGallery };
}

export async function saveContact(input: ContactInput) {
  await query(`
    UPDATE studio.site_settings SET email = $1, phone = $2, location_sq = $3, location_en = $4,
      instagram_url = $5, map_url = $6 WHERE id = 1
  `, [input.email, input.phone, input.locationSq, input.locationEn, input.instagramUrl, input.mapUrl]);
  return getSettings();
}

export async function processImage(candidate: FormDataEntryValue | null) {
  if (!(candidate instanceof File) || !candidate.size) return null;
  if (candidate.size > imageTransportLimit) throw new HttpError(413, "imageSize");
  try {
    const image = sharp(Buffer.from(await candidate.arrayBuffer()), { limitInputPixels: 40_000_000 });
    const metadata = await image.metadata();
    if (!metadata.format || !["jpeg", "png", "webp", "heif", "avif"].includes(metadata.format) || (metadata.pages ?? 1) > 1) {
      throw new Error("Image type is unsupported.");
    }
    const sized = image.rotate().resize(2560, 1920, { fit: "inside", withoutEnlargement: true });
    const webp = await sized.webp({ quality: 86 }).toBuffer();
    if (webp.length <= imageTransportLimit) return webp;
    return await sharp(webp).resize(1600, 1200, { fit: "inside" }).webp({ quality: 80 }).toBuffer();
  } catch {
    throw new HttpError(422, "imageFormat");
  }
}

export async function saveVisuals(image: Buffer | null, reset: boolean, reelUrl: string) {
  await transaction(async (client) => {
    const current = await client.query<{ hero_media_id: string | null }>(
      "SELECT hero_media_id FROM studio.site_settings WHERE id = 1 FOR UPDATE",
    );
    const previous = current.rows[0].hero_media_id;
    const upload = image
      ? await client.query<{ id: string }>("INSERT INTO studio.media (data) VALUES ($1) RETURNING id", [image])
      : null;
    const mediaId = upload?.rows[0].id ?? (reset ? null : previous);
    await client.query("UPDATE studio.site_settings SET hero_media_id = $1, reel_url = $2 WHERE id = 1",
      [mediaId, reelUrl || defaultReel]);
    if (previous && previous !== mediaId) await client.query("DELETE FROM studio.media WHERE id = $1", [previous]);
  });
  return getSettings();
}

export async function saveGalleryItem(input: GalleryInput, image: Buffer | null, id?: string) {
  if (!id && !image) throw new HttpError(422, "imageRequired");
  return transaction(async (client) => {
    const existing = id ? (await client.query<{ media_id: string | null; asset_path: string | null; is_sample: boolean }>(
      "SELECT media_id, asset_path, is_sample FROM studio.gallery WHERE id = $1 FOR UPDATE", [id],
    )).rows[0] : null;
    if (id && !existing) throw new HttpError(404, "notFound");

    const upload = image
      ? (await client.query<{ id: string }>("INSERT INTO studio.media (data) VALUES ($1) RETURNING id", [image])).rows[0]
      : null;
    const values = [input.category, input.titleSq, input.titleEn, input.descriptionSq, input.descriptionEn,
      upload?.id ?? existing?.media_id ?? null, upload ? null : existing?.asset_path ?? null,
      input.videoUrl, input.position, upload ? false : existing?.is_sample ?? false];
    const result = id ? await client.query<GalleryItem>(`
      UPDATE studio.gallery SET category = $1, title_sq = $2, title_en = $3, description_sq = $4,
        description_en = $5, media_id = $6, asset_path = $7, video_url = $8, position = $9, is_sample = $10
      WHERE id = $11 RETURNING ${galleryColumns}
    `, [...values, id]) : await client.query<GalleryItem>(`
      INSERT INTO studio.gallery (category, title_sq, title_en, description_sq, description_en,
        media_id, asset_path, video_url, position, is_sample)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING ${galleryColumns}
    `, values);
    if (upload && existing?.media_id) await client.query("DELETE FROM studio.media WHERE id = $1", [existing.media_id]);
    return result.rows[0];
  });
}

export async function removeGalleryItem(id: string) {
  await transaction(async (client) => {
    const deleted = await client.query<{ media_id: string | null }>(
      "DELETE FROM studio.gallery WHERE id = $1 RETURNING media_id", [id],
    );
    const media = deleted.rows[0]?.media_id;
    if (media) await client.query("DELETE FROM studio.media WHERE id = $1", [media]);
  });
}

export async function getImage(id: string) {
  return (await query<{ data: Buffer }>("SELECT data FROM studio.media WHERE id = $1", [id])).rows[0]?.data;
}

const notificationPageSize = 10;
type NotificationPage = { items: StudioNotification[]; total: number; unread: number };

export async function getUnreadCount() {
  return (await query<{ total: number }>("SELECT count(*)::integer AS total FROM studio.notifications WHERE read_at IS NULL")).rows[0].total;
}

export async function listNotifications(page: number, unreadOnly: boolean): Promise<NotificationPage & { page: number; pageSize: number }> {
  const result = await query<NotificationPage>(`
    WITH matching AS (
      SELECT n.id, n.booking_id AS "bookingId", b.name, b.service, n.created_at AS "createdAt", n.read_at AS "readAt"
      FROM studio.notifications n JOIN studio.bookings b ON b.id = n.booking_id
      WHERE NOT $1::boolean OR n.read_at IS NULL
    ), page AS (
      SELECT * FROM matching ORDER BY "createdAt" DESC, id DESC LIMIT $2 OFFSET $3
    )
    SELECT (SELECT count(*)::integer FROM matching) AS total,
      (SELECT count(*)::integer FROM studio.notifications WHERE read_at IS NULL) AS unread,
      coalesce(json_agg(page ORDER BY "createdAt" DESC, id DESC), '[]'::json) AS items
    FROM page
  `, [unreadOnly, notificationPageSize, (page - 1) * notificationPageSize]);
  const resultPage = result.rows[0];
  const last = Math.max(1, Math.ceil(resultPage.total / notificationPageSize));
  if (page > last) return listNotifications(last, unreadOnly);
  return { ...resultPage, page, pageSize: notificationPageSize };
}

export async function setNotificationRead(id: string, read: boolean) {
  const result = await query(`
    UPDATE studio.notifications SET read_at = CASE WHEN $2 THEN coalesce(read_at, now()) ELSE NULL END WHERE id = $1
  `, [id, read]);
  if (!result.rowCount) throw new HttpError(404, "notFound");
}

export async function readAllNotifications() {
  await query("UPDATE studio.notifications SET read_at = now() WHERE read_at IS NULL");
}
