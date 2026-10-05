import { readPhiInternalPath } from "../helpers/internal-path";

/*
 * What every Site route handler does on the way in and out, written once.
 *
 * Two handlers carried the same three functions word for word -- and the two that read a target path
 * were checking the same security property (an internal path, nothing with a host in it), so a fix in
 * one would have had to be remembered in the other.
 */

/** A JSON answer the browser must not keep: every route here answers a live question. */
export function jsonResponse(payload: unknown, status = 200) {
  return Response.json(payload, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

/** An internal path's pathname, resolved against the request; anything else -- a host, garbage -- is none. */
export function readPhiInternalRequestPath(value: string | null, requestUrl: string) {
  const normalized = readPhiInternalPath(value);
  if (normalized === null) {
    return null;
  }
  try {
    return new URL(normalized, requestUrl).pathname;
  } catch {
    return null;
  }
}

/** A pathname as its root segment and the rest, decoded where that succeeds; none without a root. */
export function splitPhiRequestPath(pathname: string) {
  const segments = pathname.split("/").filter(Boolean).map((segment) => {
    try {
      return decodeURIComponent(segment);
    } catch {
      return segment;
    }
  });
  const [root, ...path] = segments;
  return root ? { root, path } : null;
}
