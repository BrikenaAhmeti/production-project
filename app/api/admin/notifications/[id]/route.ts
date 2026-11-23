import { z } from "zod";
import { bodyJson, json } from "@/lib/server/http";
import { adminRoute, validId } from "@/lib/server/routes";
import { setNotificationRead } from "@/lib/server/studio";

export function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return adminRoute(request, async () => {
    const { read } = z.object({ read: z.boolean() }).parse(await bodyJson(request));
    await setNotificationRead(validId((await context.params).id), read);
    return json({ ok: true });
  });
}
