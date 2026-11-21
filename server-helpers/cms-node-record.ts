import "server-only";

import { readPhiCmsNodeVisibleWhen, readsPhiCmsNodeRecord } from "../helpers/cms-node-visibility";
import type { PhiBlockRuntime } from "../types";
import type { PhiCmsRuntimeRenderRegistry } from "../types/cms-plugins";
import type { PhiResolvedCmsRenderableTree } from "../types/cms";
import { resolvePhiPageRecordFields } from "./record-fields";

/**
 * The fields of the record this Page is about, as a `record` condition reads them, or null where it reads
 * none.
 *
 * Read only for a tree that carries such a condition, and through the same request-memoised read the
 * Widgets bound to the record use (`resolvePhiPageRecordFields`), so a page whose Widgets read the fields
 * already pays nothing more for its conditions. Each field is its value, under its key: `icon` is the
 * picture a Widget with `recordField: "icon"` draws, and a field the record lacks is not there.
 *
 * `null` is a Page that is about no record (`none`). A record whose fields could not be read is a record
 * without any of them -- the bound Widgets draw nothing for it either -- so its conditions are answered
 * against no fields rather than taken for a Page about nothing.
 */
export async function resolvePhiCmsTreeRecordConditionFields(
  tree: Pick<PhiResolvedCmsRenderableTree, "layoutNodes" | "contentWidgets" | "overlays">,
  registry: Pick<
    PhiCmsRuntimeRenderRegistry,
    "recordProviderLoadersByKey" | "recordFieldsLoadersByKey" | "recordDeclarationsByKey"
  >,
  runtime: PhiBlockRuntime,
): Promise<Readonly<Record<string, unknown>> | null> {
  const asks = [...tree.overlays, ...tree.layoutNodes, ...tree.contentWidgets]
    .some((node) => readsPhiCmsNodeRecord(readPhiCmsNodeVisibleWhen(node.config)));
  if (!asks) return null;
  const result = await resolvePhiPageRecordFields({ registry, runtime });
  if (result.status === "none") return null;
  if (result.status !== "ok") return {};
  return Object.fromEntries([...result.fields].map(([key, field]) => [key, field.value]));
}
