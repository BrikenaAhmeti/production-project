import { z } from "zod";
import { cancelBooking, confirmBooking, editBooking, getBooking } from "@/lib/server/bookings";
import { bodyJson, json } from "@/lib/server/http";
import { sendConfirmation } from "@/lib/server/mail";
import { adminRoute, validId } from "@/lib/server/routes";
import { bookingInput } from "@/lib/server/validation";

type Context = { params: Promise<{ id: string }> };
const actionInput = z.object({ action: z.enum(["confirm", "cancel", "email"]) });

export function GET(request: Request, context: Context) {
  return adminRoute(request, async () => json(await getBooking(validId((await context.params).id))));
}

export function PATCH(request: Request, context: Context) {
  return adminRoute(request, async () => {
    const id = validId((await context.params).id);
    const input = bookingInput.parse(await bodyJson(request));
    return json(await editBooking(id, input));
  });
}

export function POST(request: Request, context: Context) {
  return adminRoute(request, async () => {
    const id = validId((await context.params).id);
    const { action } = actionInput.parse(await bodyJson(request));
    if (action === "cancel") return json(await cancelBooking(id));
    if (action === "confirm") await confirmBooking(id);
    return json(await sendConfirmation(id));
  });
}
