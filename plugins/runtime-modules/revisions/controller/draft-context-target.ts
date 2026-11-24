import { isPhiBuilderAreaKey, type PhiBuilderAreaKey } from "../../../../constants/cms-areas";
import type { PhiWorkspaceCatalogState } from "../../../../components/workspace/catalog-state";
import {
  findPhiBuilderPageKeyFromPresetSource,
  findPhiBuilderPageKeyFromStoragePath,
  resolvePhiBuilderActivePageCatalog,
  resolvePhiBuilderPageKeyFromCatalogPath,
} from "../../../../helpers/cms-page-catalog";
import { isPhiRecord } from "../../../../helpers/is-record";

/**
 * The Builder context a revision action superseded, as the `draftStatus` broadcast names it: the Area's
 * Module selection (`areaModules`), one Page (`pageKey`), or -- with the Area alone -- its Shell.
 */
export type PhiRevisionsDraftContextTarget =
  | { area: PhiBuilderAreaKey; areaModules: true }
  | { area: PhiBuilderAreaKey; pageKey: string }
  | { area: PhiBuilderAreaKey };

/**
 * Which cached Builder context a restore or a Page reset replaced, read off the scope the Revisions
 * Table acted on.
 *
 * A Page scope names its Page by storage path when it is the Site's own, and by preset identity when it
 * is a Module's -- then its `path` is null. A Page scope that names no Page of the catalog has no target:
 * the Area alone means its Shell, and discarding the Shell's edits for a Page's revision lost them while
 * the Page kept showing what was replaced.
 */
export function resolvePhiRevisionsDraftContextTarget(
  scope: Readonly<Record<string, unknown>> | null,
  areaModules: boolean,
  catalog: Pick<PhiWorkspaceCatalogState, "modulePresetPagesByArea" | "customPages" | "persistedPageCatalogByArea">,
): PhiRevisionsDraftContextTarget | null {
  const area = scope?.area;
  if (!isPhiBuilderAreaKey(area)) {
    return null;
  }
  if (scope?.kind === "area") {
    return areaModules ? { area, areaModules: true } : { area };
  }
  if (scope?.kind !== "page") {
    return null;
  }
  const pages = resolvePhiBuilderActivePageCatalog(
    area,
    catalog.modulePresetPagesByArea,
    catalog.customPages,
    catalog.persistedPageCatalogByArea,
  );
  const source = isPhiRecord(scope.sourcePreset) ? scope.sourcePreset : null;
  const pageKey = typeof scope.path === "string"
    ? findPhiBuilderPageKeyFromStoragePath(area, scope.path, pages)
      ?? resolvePhiBuilderPageKeyFromCatalogPath(area, scope.path, pages)
    : typeof source?.ownerModuleId === "string" && typeof source.presetKey === "string"
      ? findPhiBuilderPageKeyFromPresetSource(
          { ownerModuleId: source.ownerModuleId, presetKey: source.presetKey },
          pages,
        )
      : null;
  return pageKey === null ? null : { area, pageKey };
}
