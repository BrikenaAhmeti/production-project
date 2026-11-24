import { takeRateLimit } from "@/lib/server/auth";
import { insertBooking } from "@/lib/server/bookings";
import { todayIn } from "@/lib/dates";
import { bodyJson, clientAddress, HttpError, json, respondToError, verifyOrigin } from "@/lib/server/http";
import { websiteBookingInput } from "@/lib/server/validation";

export async function POST(request: Request) {
  try {
    verifyOrigin(request);
    const input = websiteBookingInput.parse(await bodyJson(request));
    if (input.website) return json({ ok: true }, 201);
    if (input.eventDate < todayIn(process.env.STUDIO_TIMEZONE)) throw new HttpError(422, "pastDate");
    await takeRateLimit("booking", clientAddress(request), 12, 15 * 60);
    const details = input.schedule && { ...input.schedule, priceCents: null };
    await insertBooking({ ...input, details }, input.requestId);
    return json({ ok: true }, 201);
  } catch (error) {
    return respondToError(error);
  }
}
