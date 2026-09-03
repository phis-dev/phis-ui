import { resolvePhiCmsAreaKey } from "../../constants/cms-areas";
import { resolveAreaFromPath } from "../../helpers/access";
import { PHIS_AREA_HEADER } from "../../constants/http-headers";

export { PHIS_AREA_HEADER };

export function buildPhiMediaRequestHeaders(init?: HeadersInit) {
  const headers = new Headers(init);
  if (typeof window !== "undefined") {
    headers.set(PHIS_AREA_HEADER, resolvePhiCmsAreaKey(resolveAreaFromPath(window.location.pathname)));
  }

  return headers;
}
