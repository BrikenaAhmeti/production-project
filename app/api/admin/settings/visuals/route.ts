import { defaultReel } from "@/lib/content";
import { json } from "@/lib/server/http";
import { adminRoute, imageForm } from "@/lib/server/routes";
import { processImage, saveVisuals } from "@/lib/server/studio";
import { httpsUrl } from "@/lib/server/validation";
import { z } from "zod";

export function PATCH(request: Request) {
  return adminRoute(request, async () => {
    const form = await imageForm(request);
    const video = httpsUrl.or(z.literal(defaultReel)).parse(form.get("reelUrl") ?? "");
    return json(await saveVisuals(await processImage(form.get("image")), form.get("reset") === "true", video));
  });
}
