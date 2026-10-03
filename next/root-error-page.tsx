import "server-only";

import type { ReactNode } from "react";

import { PhiCmsErrorPage } from "../components/cms/phi-cms-error-page";
import { PhiRestoredRequestRuntime } from "../components/runtime/phi-restored-request-runtime";
import { parsePhiCmsErrorCode } from "../constants/cms-error-pages";
import { capturePhiRequestRuntimeStore, runInPhiRequestScope } from "../server-helpers/request-runtime";
import type { PhiNextRootErrorArea } from "./area-route";

/**
 * The Site's error page for a refusal that is on screen -- the body of the Site's Server Action.
 *
 * The root refusal routes render a placeholder that asks for this once it is shown
 * (`PhiCmsDeferredErrorPage`), so a page view that refuses nothing resolves no error page. The code comes
 * from a browser and is read as such: anything but 401, 403 or 404 answers null, and the placeholder
 * keeps its plain copy.
 *
 * The Site wraps this in a `"use server"` function, because only the Site holds the root error Area
 * (`src/runtime-modules/root-error-page.ts`, written by the scaffold).
 */
export async function renderPhiCmsRootErrorPage(area: PhiNextRootErrorArea, code: unknown): Promise<ReactNode> {
  const parsed = parsePhiCmsErrorCode(typeof code === "number" || typeof code === "string" ? code : null);
  if (parsed == null) return null;

  return runInPhiRequestScope(async () => {
    const cmsBridge = await area.loadBridge();
    const page = await PhiCmsErrorPage({ code: parsed, cmsBridge, area: "public" });
    // Next renders the returned nodes after this function has returned, outside the request scope above.
    const captured = capturePhiRequestRuntimeStore();
    const { Boundary } = area;
    return (
      <PhiRestoredRequestRuntime captured={captured}>
        <Boundary>{page}</Boundary>
      </PhiRestoredRequestRuntime>
    );
  });
}
