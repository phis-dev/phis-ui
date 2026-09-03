import type { PhiDeveloperBuilderArea } from "./developer-workspace-types";

/**
 * `"modules"` addresses the Area's Module selection, which keeps its own Working Draft apart from the
 * Area's structure -- the two are saved, published, and discarded independently, so each needs its own
 * key even though both describe the same Area.
 */
export type PhiBuilderDraftAllocationKind = "area" | "page" | "modules";

export function createPhiBuilderDraftAllocationKey(
  area: PhiDeveloperBuilderArea,
  pageKey: string,
  kind: PhiBuilderDraftAllocationKind,
) {
  if (kind === "page") {
    return `page:${area}:${pageKey}`;
  }
  return kind === "modules" ? `modules:${area}` : `area:${area}`;
}
