export class RequestError extends Error {
  constructor(public code: string, public status: number) {
    super(code);
  }
}

export async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...init });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && url.startsWith("/api/admin/") && !url.endsWith("/session")) {
      window.location.assign("/admin/login");
    }
    throw new RequestError(body?.field || body?.error || "unavailable", response.status);
  }
  return body as T;
}

export function asJson(method: string, data: unknown): RequestInit {
  return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) };
}

export function errorCode(error: unknown) {
  return error instanceof RequestError ? error.code : "unavailable";
}
