import "server-only";
import { timingSafeEqual, createHash } from "node:crypto";
import { z } from "zod";

export class HttpError extends Error {
  constructor(public status: number, public code: string) {
    super(code);
  }
}

export const noStore = { "Cache-Control": "no-store" };

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: noStore });
}

export function sameSecret(first: string, second: string) {
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(first), digest(second));
}

export function verifyOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const destination = new URL(request.url);
  const host = request.headers.get("host");
  // Next can normalize the request URL to localhost even when the browser used 127.0.0.1.
  const allowedOrigin = new URL(process.env.APP_ORIGIN || (host ? `${destination.protocol}//${host}` : request.url)).origin;
  if ((origin && origin !== allowedOrigin) || request.headers.get("sec-fetch-site") === "cross-site") {
    throw new HttpError(403, "origin");
  }
}

export async function bodyJson(request: Request) {
  if (Number(request.headers.get("content-length")) > 24_000) {
    throw new HttpError(413, "tooLarge");
  }
  const raw = await request.text();
  if (raw.length > 24_000) throw new HttpError(413, "tooLarge");
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new HttpError(400, "invalid");
  }
}

export function clientAddress(request: Request) {
  return request.headers.get("x-real-ip")?.trim()
    || request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim()
    || "unknown";
}

export function respondToError(error: unknown) {
  if (error instanceof HttpError) return json({ error: error.code }, error.status);
  if (error instanceof z.ZodError) {
    return json({ error: "invalid", field: error.issues[0]?.path.at(-1) }, 422);
  }
  console.error("Studio request failed.", error instanceof Error ? error.name : "Unknown error");
  return json({ error: "unavailable" }, 503);
}
