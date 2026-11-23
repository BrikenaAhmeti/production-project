import { json } from "@/lib/server/http";
import { adminRoute, imageForm } from "@/lib/server/routes";
import { getGallery, processImage, saveGalleryItem } from "@/lib/server/studio";
import { galleryInput } from "@/lib/server/validation";

export function GET(request: Request) {
  return adminRoute(request, async () => json(await getGallery()));
}

export function POST(request: Request) {
  return adminRoute(request, async () => {
    const form = await imageForm(request);
    const input = galleryInput.parse(Object.fromEntries(form));
    return json(await saveGalleryItem(input, await processImage(form.get("image"))), 201);
  });
}
