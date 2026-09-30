import { fetchPhiCsrfToken } from "./csrf-token";

/**
 * A JSON request from the browser to this Site's own routes, as the session that is looking.
 *
 * Every Client file that talked to `/api/...` spelled the same five things out by hand -- the session
 * cookie, `no-store`, the JSON headers, a CSRF token before a write, and a body parse that must not
 * throw on an empty or HTML answer -- and each one then read the failure its own way. The request is
 * the same everywhere; what a refusal means is not, so this answers with the status and the parsed body
 * and never throws for a status. The caller decides what a 403 is.
 *
 * It does throw where no answer came back at all: the network, an abort, or a CSRF token that could
 * not be had, which `fetchPhiCsrfToken` refuses on purpose (see there).
 *
 * A Form never comes through here. A Form submits through its handler Provider and the Site Form
 * gateway ([FORMS.md](../FORMS.md)); this is for what no Form expresses -- a read, a single delete
 * behind a confirm, the start of a sign-in that leaves the Site.
 */

export type PhiJsonRequestMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type PhiJsonRequestOptions = {
  method?: PhiJsonRequestMethod;
  /** Serialized as JSON, which also sets the Content-Type. Absent sends no body. */
  body?: unknown;
  /** Fetch a CSRF token first and send it. The Site's auth routes refuse a write without one. */
  csrf?: boolean;
  /** What the thrown error says when the token cannot be had, from the caller's Label Set. */
  csrfUnavailableMessage?: string;
  /**
   * Headers a route needs beyond the JSON ones, such as the Area header every Media request carries.
   * They sit underneath: accept, content-type and the CSRF token are this request's own and win.
   */
  headers?: HeadersInit;
  signal?: AbortSignal;
};

export type PhiJsonReply<T> = {
  ok: boolean;
  status: number;
  /** The parsed body, or null where there was none or it was not JSON. */
  payload: T | null;
};

/** The body as JSON, or null: an empty 204, an HTML error page and a truncated body all read as none. */
export async function readPhiJsonPayload<T>(response: Response): Promise<T | null> {
  return await response.json().catch(() => null) as T | null;
}

/**
 * The sentence a refusal carried, or the caller's own.
 *
 * `keys` are tried in order; some routes answer `{ message }` for a person and `{ error }` for a
 * code, and which one a caller shows is its decision. A blank string is no sentence.
 */
export function readPhiJsonError(
  payload: unknown,
  fallback: string,
  keys: readonly string[] = ["error"],
): string {
  if (payload && typeof payload === "object") {
    for (const key of keys) {
      const value = (payload as Record<string, unknown>)[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
  }
  return fallback;
}

export async function requestPhiJson<T = Record<string, unknown>>(
  path: string,
  options: PhiJsonRequestOptions = {},
): Promise<PhiJsonReply<T>> {
  const headers: Record<string, string> = {
    ...Object.fromEntries(new Headers(options.headers)),
    accept: "application/json",
  };
  if (options.body !== undefined) {
    headers["content-type"] = "application/json";
  }
  if (options.csrf) {
    headers["x-csrf-token"] = await fetchPhiCsrfToken({
      ...(options.signal ? { signal: options.signal } : {}),
      ...(options.csrfUnavailableMessage ? { unavailableMessage: options.csrfUnavailableMessage } : {}),
    });
  }
  const response = await fetch(path, {
    method: options.method ?? "GET",
    credentials: "include",
    cache: "no-store",
    headers,
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
    ...(options.signal ? { signal: options.signal } : {}),
  });
  return {
    ok: response.ok,
    status: response.status,
    payload: await readPhiJsonPayload<T>(response),
  };
}
