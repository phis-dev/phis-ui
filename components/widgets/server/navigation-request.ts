import "server-only";

import { fetchSiteNavigationOverlay } from "../../../gateway/site-nav";
import { phiRuntime } from "../../../server-helpers/phi-runtime";
import { resolvePhiCmsReviewParams } from "../../../server-helpers/cms-review";
import type { PhiBlockRuntime } from "../../../types";
import type { PhiNavItem } from "../../shell/shell-types";
import {
  resolvePhiDescriptorNavigationItems,
} from "../navigation-descriptor-resolver.server";

export function resolvePhiNavigationRevisionFromRuntime(
  runtime: Pick<PhiBlockRuntime, "request">,
): number | null {
  const rawNavRevision = runtime.request?.searchParams?.navRevision?.trim();
  if (!rawNavRevision) {
    return null;
  }

  const parsed = Number(rawNavRevision);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function resolvePhiNavigationItems(
  runtime: Pick<PhiBlockRuntime, "site" | "locale" | "area" | "phis" | "viewer" | "request">,
  navKey: string,
): Promise<PhiNavItem[] | null> {
  const rt = phiRuntime(runtime);
  const navRevision = resolvePhiNavigationRevisionFromRuntime(runtime);
  const review = resolvePhiCmsReviewParams(runtime.request?.searchParams);
  const overlay = await fetchSiteNavigationOverlay({
    apiBaseUrl: rt.apiBaseUrl,
    internalToken: rt.internalToken,
    siteKey: rt.siteKey,
    navKey,
    locale: runtime.locale.current,
    revision: navRevision,
    review,
  });
  if (navRevision != null && overlay == null) {
    return null;
  }
  return (await resolvePhiDescriptorNavigationItems(runtime, navKey, overlay)) ?? [];
}
