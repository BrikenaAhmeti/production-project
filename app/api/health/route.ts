import { query } from "@/lib/server/db";
import { json, respondToError, sameSecret } from "@/lib/server/http";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 32 || !sameSecret(request.headers.get("authorization") ?? "", `Bearer ${secret}`)) {
    return json({ error: "unauthorized" }, 401);
  }
  try {
    const result = await query("SELECT id FROM studio.site_settings WHERE id = 1");
    if (!result.rowCount) return json({ ok: false }, 503);
    await query("DELETE FROM studio.request_limits WHERE expires_at < now() - interval '1 day'");
    return json({ ok: true });
  } catch (error) {
    return respondToError(error);
  }
}
