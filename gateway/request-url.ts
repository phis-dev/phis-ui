type PhiGatewayQueryValue = string | number | boolean | null | undefined;

export function buildPhiGatewayRequestUrl({
  upstreamPath,
  queryMap,
  query: inputQuery,
}: {
  upstreamPath: string;
  queryMap?: Record<string, string>;
  query?: Record<string, PhiGatewayQueryValue>;
}) {
  const trimmedPath = upstreamPath.trim();
  if (!trimmedPath) {
    return "";
  }

  const basePath = /^https?:\/\//i.test(trimmedPath) || trimmedPath.startsWith("/")
    ? trimmedPath
    : `/${trimmedPath}`;
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(inputQuery ?? {})) {
    if (value === null || value === undefined || value === "") {
      continue;
    }

    params.set(queryMap?.[key] ?? key, String(value));
  }

  const queryString = params.toString();
  return queryString
    ? `${basePath}${basePath.includes("?") ? "&" : "?"}${queryString}`
    : basePath;
}
