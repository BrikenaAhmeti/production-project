import { RequestError } from "./client";
import { imageSourceLimit, imageTransportLimit } from "./image-upload";

export async function prepareImage(file: File) {
  if (file.size <= imageTransportLimit) return file;
  if (file.size > imageSourceLimit) throw new RequestError("imageSourceSize", 413);

  const bitmap = await createImageBitmap(file).catch(() => {
    throw new RequestError("imageFormat", 422);
  });
  try {
    const canvas = document.createElement("canvas");
    const ratio = Math.min(1, 2560 / bitmap.width, 1920 / bitmap.height);
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const context = canvas.getContext("2d");
    if (!context) throw new RequestError("imageFormat", 422);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", .88));
    if (!blob || blob.size > imageTransportLimit) throw new RequestError("imageSize", 413);
    return new File([blob], "studio-upload", { type: blob.type });
  } finally {
    bitmap.close();
  }
}
