"use client";

import { useEffect, useState } from "react";

import type { PhiCmsAreaKey } from "../../../../constants/cms-areas";
import type { PhiTreeOption } from "../../../../types/tree";
import type { PhiPageReferenceSelection } from "./phi-page-reference-picker";

type PageReferenceOptions = PhiTreeOption<PhiPageReferenceSelection>[];

/*
 * One request per Area for as long as the page lives: the create and the edit dialog offer the same
 * Pages, and a list that changed meanwhile is a Page somebody published while this one was being written.
 * A failed request is forgotten, so the next dialog asks again.
 */
const pageOptionsByArea = new Map<PhiCmsAreaKey, Promise<PageReferenceOptions>>();

function loadPageOptions(area: PhiCmsAreaKey): Promise<PageReferenceOptions> {
  const cached = pageOptionsByArea.get(area);
  if (cached) return cached;
  const request = (async () => {
    const response = await fetch(`/api/site/page-references?area=${encodeURIComponent(area)}`, {
      cache: "no-store",
      credentials: "same-origin",
      headers: { accept: "application/json" },
    });
    const payload = (await response.json().catch(() => null)) as { options?: unknown } | null;
    if (!response.ok || !Array.isArray(payload?.options)) {
      throw new Error(`Page references for "${area}" answered ${response.status}.`);
    }
    return payload.options as PageReferenceOptions;
  })();
  pageOptionsByArea.set(area, request);
  request.catch(() => pageOptionsByArea.delete(area));
  return request;
}

/**
 * The Pages of one Area a link may point at, as the tree `PhiLinkTargetControl` offers, for a surface
 * that stands outside the Builder's own catalog: a Form's `link-target` field, the Theme's Brand.
 *
 * Answered by `/api/site/page-references` (`gateway/page-references-route.ts`), which merges the Area's
 * Module Pages and Core's the way the Builder's picker does. `failed` is set when the list could not be
 * read, so the surface can say so instead of showing an empty list that looks like a Site without Pages.
 */
export function usePhiPageReferenceOptions(area: PhiCmsAreaKey, logScope: string) {
  const [options, setOptions] = useState<PageReferenceOptions>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let current = true;
    loadPageOptions(area).then(
      (next) => {
        if (current) {
          setOptions(next);
          setFailed(false);
        }
      },
      (error: unknown) => {
        console.warn(`[${logScope}] Page references could not be loaded.`, { area, error });
        if (current) setFailed(true);
      },
    );
    return () => {
      current = false;
    };
  }, [area, logScope]);

  return { options, failed };
}
