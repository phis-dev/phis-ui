import "server-only";

export type PhiRequestSearchParams = Record<string, string | undefined>;

/**
 * The request's query, as far as this render knows it, from the header the proxy sets.
 *
 * An empty result and no result are different answers and must stay that way: the proxy sets this header
 * on every page it forwards, so a header that is present and empty means "this page was opened without a
 * query" -- something a condition can be decided on -- while an absent header means nobody said, and a
 * condition over it has to wait for the browser. Two readers used to parse this header, and one of them
 * collapsed the two cases; a layout and the page under it then disagreed about the same request.
 */
export function parsePhiRequestSearchParamsHeader(rawValue: string | null | undefined): PhiRequestSearchParams | undefined {
  if (rawValue == null) {
    return undefined;
  }
  const source = rawValue.startsWith("?") ? rawValue.slice(1) : rawValue;
  const normalized: PhiRequestSearchParams = {};
  for (const [key, value] of new URLSearchParams(source).entries()) {
    normalized[key] = value;
  }
  return normalized;
}
