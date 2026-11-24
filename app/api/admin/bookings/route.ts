import { insertBooking, listBookings, getBooking } from "@/lib/server/bookings";
import { bodyJson, json } from "@/lib/server/http";
import { adminRoute } from "@/lib/server/routes";
import { adminBookingInput, bookingFilters } from "@/lib/server/validation";

export function GET(request: Request) {
  return adminRoute(request, async () => {
    const filters = bookingFilters.parse(Object.fromEntries(new URL(request.url).searchParams));
    return json(await listBookings(filters));
  });
}

export function POST(request: Request) {
  return adminRoute(request, async () => {
    const input = adminBookingInput.parse(await bodyJson(request));
    return json(await getBooking(await insertBooking(input)), 201);
  });
}
