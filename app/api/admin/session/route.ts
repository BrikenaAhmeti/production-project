import { z } from "zod";
import { createSession, endSession, takeRateLimit, verifyCredentials } from "@/lib/server/auth";
import { adminRoute } from "@/lib/server/routes";
import { bodyJson, clientAddress, HttpError, json, respondToError, verifyOrigin } from "@/lib/server/http";

const loginInput = z.object({ email: z.email().max(254), password: z.string().min(1).max(512) });

export async function POST(request: Request) {
  try {
    verifyOrigin(request);
    await takeRateLimit("login", clientAddress(request), 10, 15 * 60);
    const input = loginInput.parse(await bodyJson(request));
    if (!verifyCredentials(input.email, input.password)) throw new HttpError(401, "credentials");
    await createSession();
    return json({ ok: true });
  } catch (error) {
    return respondToError(error);
  }
}

export function DELETE(request: Request) {
  return adminRoute(request, async () => {
    await endSession();
    return json({ ok: true });
  });
}
