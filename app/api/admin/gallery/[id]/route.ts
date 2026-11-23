import { json } from "@/lib/server/http";
import { adminRoute, imageForm, validId } from "@/lib/server/routes";
import { processImage, removeGalleryItem, saveGalleryItem } from "@/lib/server/studio";
import { galleryInput } from "@/lib/server/validation";

type Context = { params: Promise<{ id: string }> };

export function PATCH(request: Request, context: Context) {
  return adminRoute(request, async () => {
    const id = validId((await context.params).id);
    const form = await imageForm(request);
    const input = galleryInput.parse(Object.fromEntries(form));
    return json(await saveGalleryItem(input, await processImage(form.get("image")), id));
  });
}

export function DELETE(request: Request, context: Context) {
  return adminRoute(request, async () => {
    await removeGalleryItem(validId((await context.params).id));
    return json({ ok: true });
  });
}
