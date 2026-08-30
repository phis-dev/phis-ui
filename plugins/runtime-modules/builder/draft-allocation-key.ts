import type { PhiDeveloperBuilderArea } from "./developer-workspace-types";

export type PhiBuilderDraftAllocationKind = "area" | "page";

export function createPhiBuilderDraftAllocationKey(
  area: PhiDeveloperBuilderArea,
  pageKey: string,
  kind: PhiBuilderDraftAllocationKind,
) {
  return kind === "page" ? `page:${area}:${pageKey}` : `area:${area}`;
}
