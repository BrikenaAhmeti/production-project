import { z } from "zod";
import { cancelBooking, confirmBooking, editBooking, getBooking } from "@/lib/server/bookings";
import { bodyJson, json } from "@/lib/server/http";
import { sendConfirmation } from "@/lib/server/mail";
import { adminRoute, validId } from "@/lib/server/routes";
import { adminBookingInput, bookingDetailsInput } from "@/lib/server/validation";

type Context = { params: Promise<{ id: string }> };
const actionInput = z.discriminatedUnion("action", [
  z.object({ action: z.literal("confirm"), details: bookingDetailsInput.optional(), includePrice: z.boolean().default(false) })
    .refine(({ details, includePrice }) => !includePrice || details?.priceCents != null, { path: ["details", "price"] }),
  z.object({ action: z.literal("cancel") }),
  z.object({ action: z.literal("email") }),
]);

export function GET(request: Request, context: Context) {
  return adminRoute(request, async () => json(await getBooking(validId((await context.params).id))));
}

export function PATCH(request: Request, context: Context) {
  return adminRoute(request, async () => {
    const id = validId((await context.params).id);
    const input = adminBookingInput.parse(await bodyJson(request));
    return json(await editBooking(id, input));
  });
}

export function POST(request: Request, context: Context) {
  return adminRoute(request, async () => {
    const id = validId((await context.params).id);
    const input = actionInput.parse(await bodyJson(request));
    if (input.action === "cancel") return json(await cancelBooking(id));
    if (input.action === "confirm") await confirmBooking(id, input.details, input.includePrice);
    return json(await sendConfirmation(id));
  });
}
