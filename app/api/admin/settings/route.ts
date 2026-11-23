import { bodyJson, json } from "@/lib/server/http";
import { adminRoute } from "@/lib/server/routes";
import { getSettings, saveContact } from "@/lib/server/studio";
import { contactInput } from "@/lib/server/validation";

export function GET(request: Request) {
  return adminRoute(request, async () => json(await getSettings()));
}

export function PATCH(request: Request) {
  return adminRoute(request, async () => json(await saveContact(contactInput.parse(await bodyJson(request)))));
}
