import "server-only";
import { z } from "zod";
import { imageTransportLimit } from "@/lib/image-upload";
import { requireAdmin } from "./auth";
import { HttpError, respondToError, verifyOrigin } from "./http";

export async function adminRoute(request: Request, handler: () => Promise<Response>) {
  try {
    await requireAdmin();
    if (request.method !== "GET" && request.method !== "HEAD") verifyOrigin(request);
    return await handler();
  } catch (error) {
    return respondToError(error);
  }
}

export function validId(raw: string) {
  const id = z.uuid().safeParse(raw);
  if (!id.success) throw new HttpError(404, "notFound");
  return id.data;
}

export async function imageForm(request: Request) {
  if (Number(request.headers.get("content-length")) > imageTransportLimit + 24_000) {
    throw new HttpError(413, "imageSize");
  }
  try {
    return await request.formData();
  } catch {
    throw new HttpError(400, "invalid");
  }
}
