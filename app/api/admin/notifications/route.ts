import { z } from "zod";
import { json } from "@/lib/server/http";
import { adminRoute } from "@/lib/server/routes";
import { getUnreadCount, listNotifications, readAllNotifications } from "@/lib/server/studio";

export function GET(request: Request) {
  return adminRoute(request, async () => {
    const params = new URL(request.url).searchParams;
    if (params.get("count") === "1") return json({ unread: await getUnreadCount() });
    const page = z.coerce.number().int().min(1).max(1_000_000).parse(params.get("page") ?? 1);
    return json(await listNotifications(page, params.get("unread") === "1"));
  });
}

export function PATCH(request: Request) {
  return adminRoute(request, async () => {
    await readAllNotifications();
    return json({ ok: true });
  });
}
