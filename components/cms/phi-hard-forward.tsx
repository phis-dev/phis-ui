"use client";

import { useEffect } from "react";

/**
 * An Area root forwarding a client navigation, as a document request rather than a router redirect.
 *
 * `redirect()` reaches a client navigation as a serialised `NEXT_REDIRECT`, and applying one that also
 * changes the Area leaves Next's router asking for the same address at request speed -- 42 to 110
 * navigations, measured, never settling
 * (`browser-test/notes/ANALYSE-area-switch-loop.md`). `location.replace` hands the forward to the browser
 * instead, which builds the arriving Area from nothing: three navigations, two documents, quiet.
 *
 * **Only where the proxy could not answer.** A warm door is forwarded by the proxy as a real HTTP 307
 * before a router state tree exists at all, which costs one navigation and no flash
 * (`gateway/area-root-door.ts`). This is the cold path, and it is the reason the cold path is no longer a
 * loop -- at the price of one empty render the visitor sees for a moment.
 *
 * **And only for a client navigation.** A document request keeps its 307: the status line is how a
 * forwarding Area root stays out of an index as a page, which `PhiCmsAreaBoundary` says at the call site.
 * `replace` rather than `assign`, so the address that forwarded does not become a back-button stop.
 */
export function PhiHardForward({ href }: { href: string }) {
  useEffect(() => {
    window.location.replace(href);
  }, [href]);

  return null;
}
