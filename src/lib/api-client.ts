// Thin client-side fetch wrapper that surfaces backend error messages.

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function parse<T>(response: Response): Promise<T> {
  const isJson = response.headers
    .get("content-type")
    ?.includes("application/json");
  const body = isJson ? await response.json() : null;

  if (!response.ok) {
    const message =
      (body && typeof body.error === "string" && body.error) ||
      `Request failed (${response.status})`;
    throw new ApiError(message, response.status);
  }
  return body as T;
}

export function apiGet<T>(url: string): Promise<T> {
  return fetch(url, { cache: "no-store" }).then((r) => parse<T>(r));
}

export function apiSend<T>(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<T> {
  return fetch(url, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  }).then((r) => parse<T>(r));
}

export function apiUpload<T>(url: string, formData: FormData): Promise<T> {
  return fetch(url, { method: "POST", body: formData }).then((r) => parse<T>(r));
}
