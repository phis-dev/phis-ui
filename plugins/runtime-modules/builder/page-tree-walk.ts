import type { PhiPresetPageNode } from "../../../helpers/cms-page-catalog";

/** Every Page of a Page tree, parents before their children, as one list. */
export function flattenPhiPresetPages(pages: readonly PhiPresetPageNode[]): PhiPresetPageNode[] {
  return pages.flatMap((page) => [page, ...flattenPhiPresetPages(page.children ?? [])]);
}
