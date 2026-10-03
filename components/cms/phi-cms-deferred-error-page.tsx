"use client";

import { useEffect, useState, type ReactNode } from "react";

import type { PhiCmsErrorCode } from "../../constants/cms-error-pages";
import { PhiCmsErrorFallback } from "./phi-cms-error-fallback";

/** The Site's Server Action that renders its error page for a code; null where it has none. */
export type PhiCmsRootErrorPageLoader = (code: PhiCmsErrorCode) => Promise<ReactNode>;

/**
 * A refusal route's body, resolved only once it is shown.
 *
 * Next renders every refusal boundary of the matched segments into the response whether one is shown
 * or not. Resolved there, the Site's 404, 403 and 401 pages cost every successful page view six calls
 * to the server and their whole trees in the payload, for output almost nobody sees. Here the boundary
 * carries a code and an Action reference; the Action runs when a refusal is actually on screen.
 *
 * Until it answers, and wherever it does not, the plain copy stands: the status line has already said
 * what happened, so a visitor -- and a crawler, which runs nothing -- is never left with an empty page.
 */
export function PhiCmsDeferredErrorPage({
  code,
  load,
}: {
  code: PhiCmsErrorCode;
  load: PhiCmsRootErrorPageLoader;
}) {
  const [page, setPage] = useState<ReactNode>(null);

  useEffect(() => {
    let current = true;
    load(code).then(
      (next) => {
        if (current && next != null) setPage(next);
      },
      // The plain copy is the answer when the Site's page cannot be had; there is nothing to retry into.
      () => undefined,
    );
    return () => {
      current = false;
    };
  }, [code, load]);

  return page ?? <PhiCmsErrorFallback code={code} />;
}
