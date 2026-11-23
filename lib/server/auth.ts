import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { query } from "./db";
import { HttpError, sameSecret } from "./http";

const cookieName = "go_studio_session";
const lifetime = 60 * 60 * 12;

function credentials() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const secret = process.env.SESSION_SECRET;
  if (!email || !password || password.length < 12 || !secret || secret.length < 32) return null;
  return { email, password, secret };
}

function signature(value: string, account: NonNullable<ReturnType<typeof credentials>>) {
  return createHmac("sha256", account.secret)
    .update(JSON.stringify([value, account.email, account.password]))
    .digest("base64url");
}

export function verifyCredentials(email: string, password: string) {
  const account = credentials();
  if (!account) throw new HttpError(503, "adminSetup");
  const correctEmail = sameSecret(email.trim().toLowerCase(), account.email);
  const correctPassword = sameSecret(password, account.password);
  return correctEmail && correctPassword;
}

export async function createSession() {
  const account = credentials();
  if (!account) throw new HttpError(503, "adminSetup");
  const expires = Math.floor(Date.now() / 1000) + lifetime;
  const payload = `${expires}.${randomBytes(24).toString("base64url")}`;
  const jar = await cookies();
  jar.set(cookieName, `${payload}.${signature(payload, account)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: lifetime,
  });
}

export async function currentAdmin() {
  const account = credentials();
  const value = (await cookies()).get(cookieName)?.value;
  if (!account || !value) return null;
  const [expires, nonce, signed, ...extra] = value.split(".");
  if (extra.length || !/^\d{10}$/.test(expires ?? "") || !nonce || !signed) return null;
  if (Number(expires) <= Math.floor(Date.now() / 1000)) return null;
  return sameSecret(signed, signature(`${expires}.${nonce}`, account)) ? account.email : null;
}

export async function requireAdmin() {
  if (!(await currentAdmin())) throw new HttpError(401, "unauthorized");
}

export async function endSession() {
  (await cookies()).delete(cookieName);
}

export async function takeRateLimit(namespace: string, address: string, max: number, seconds: number) {
  const secret = process.env.SESSION_SECRET || process.env.CRON_SECRET;
  if (!secret) throw new HttpError(503, "unavailable");
  const key = createHmac("sha256", secret).update(`${namespace}:${address}`).digest("hex");
  const result = await query<{ hits: number }>(`
    INSERT INTO studio.request_limits AS limits (key, expires_at, hits)
    VALUES ($1, now() + $2 * interval '1 second', 1)
    ON CONFLICT (key) DO UPDATE SET
      expires_at = CASE WHEN limits.expires_at <= now() THEN EXCLUDED.expires_at ELSE limits.expires_at END,
      hits = CASE WHEN limits.expires_at <= now() THEN 1 ELSE LEAST(limits.hits + 1, $3 + 1) END
    RETURNING hits
  `, [key, seconds, max]);
  if (result.rows[0].hits > max) throw new HttpError(429, "rateLimit");
}
