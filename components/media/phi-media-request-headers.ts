import { resolvePhiCmsAreaKey } from "../../constants/cms-areas";
import { resolveAreaFromPath } from "../../helpers/access";

export const PHI_AREA_HEADER = "x-phi-area";

export function buildPhiMediaRequestHeaders(init?: HeadersInit) {
  const headers = new Headers(init);
  if (typeof window !== "undefined") {
    headers.set(PHI_AREA_HEADER, resolvePhiCmsAreaKey(resolveAreaFromPath(window.location.pathname)));
  }

  return headers;
}
