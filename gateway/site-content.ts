import "server-only";

import { definePhiRequestMemo } from "../server-helpers/request-memo";
import type { PhiCmsResolvedContent } from "../types/cms";
import { fetchPhiSiteApi } from "./site-api-request";

/** One Widget's bound content as phi-server answers it (phis-server CONTENT.md). */
export type PhiBoundWidgetContent = {
  instanceId: string;
  contentId: number;
  currentVersionId: number | null;
  publishedVersionId: number | null;
  submittedVersionId: number | null;
  /** The bound value in the stage: a text, or an asset id; `null` where the stage has none. */
  value: string | number | null;
  /** The stage's version, resolved; `null` where the stage has none. */
  content: PhiCmsResolvedContent | null;
};

/** As many instances as one read of phi-server answers. */
const PHI_BOUND_CONTENT_READ_LIMIT = 200;

type GetBoundWidgetContentsOptions = {
  apiBaseUrl: string;
  internalToken: string;
  siteKey: string;
  instanceIds: readonly string[];
  /** `published` for the live Site; `current` for an editor, which needs the viewer's cookies. */
  stage: "published" | "current";
  locale?: string;
  cookieHeader?: string | null;
};

/**
 * The content bound to Widgets of a preset tree. A tree the Site stored answers its content with itself; a
 * preset tree is the Module's and never reached phi-server, so its Widgets are asked for by instance.
 */
export const getBoundWidgetContents = definePhiRequestMemo(async function getBoundWidgetContents({
  apiBaseUrl,
  internalToken,
  siteKey,
  instanceIds,
  stage,
  locale,
  cookieHeader,
}: GetBoundWidgetContentsOptions): Promise<PhiBoundWidgetContent[]> {
  const contents: PhiBoundWidgetContent[] = [];
  for (let start = 0; start < instanceIds.length; start += PHI_BOUND_CONTENT_READ_LIMIT) {
    const searchParams = new URLSearchParams({
      instanceIds: instanceIds.slice(start, start + PHI_BOUND_CONTENT_READ_LIMIT).join(","),
      stage,
      ...(locale ? { locale } : {}),
    });
    const payload = await fetchPhiSiteApi<{ contents?: PhiBoundWidgetContent[] }>({
      context: "getBoundWidgetContents",
      apiBaseUrl,
      internalToken,
      siteKey,
      path: "/api/v1/site/content",
      searchParams,
      locale,
      cookieHeader,
      failure: "Failed to fetch bound widget content",
    });
    contents.push(...(payload?.contents ?? []));
  }
  return contents;
});
