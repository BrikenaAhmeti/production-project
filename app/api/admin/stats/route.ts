import { getStats } from "@/lib/server/bookings";
import { json } from "@/lib/server/http";
import { adminRoute } from "@/lib/server/routes";
import { statsInput } from "@/lib/server/validation";

export function GET(request: Request) {
  return adminRoute(request, async () => {
    const period = statsInput.parse(new URL(request.url).searchParams.get("period") ?? undefined);
    return json(await getStats(period));
  });
}
