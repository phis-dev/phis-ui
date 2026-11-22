import type { PhiCollectionProviderResourceDescriptor } from "../../../../../types/collection-provider";
import type { PhiCmsCollectionViewWidgetConfig } from "../../../../../types/collection-view-widget";

/*
 * What the Media renderer's tools are, apart from the drawing (`asset-binding.tsx`): which a placement
 * may name, and which of them the bound resource declares. Pure, so the rules are tested without a
 * render.
 */

/** The filters the Media renderer draws a control for. */
const PHI_MEDIA_RENDERER_FILTER_KEYS = ["kind", "presentationFlags", "folderId"] as const;

/**
 * The tool actions the Media renderer draws: `upload` opens the resource's upload panel, `add` the Media
 * library's picker whose pick goes to the resource's `add` action, `createFolder` and `lockFolder`
 * (with `unlockFolder`) sit beside the Folder filter.
 */
const PHI_MEDIA_RENDERER_ACTION_KEYS = ["upload", "add", "createFolder", "lockFolder"] as const;

/** The panel the `upload` action opens, by the resource's declaration (`panelKey`). */
export const PHI_MEDIA_RENDERER_UPLOAD_PANEL_KEY = "upload";

/**
 * What the resource lets the renderer offer on its own, without a tool in the placement: a tile's
 * delete (`delete`, scope `item`) and adding what an upload made (`add`, which takes `itemKeys`, the
 * Asset ids).
 */
export type PhiMediaRendererResourceActions = {
  delete: boolean;
  add: boolean;
};

export function readPhiMediaRendererResourceActions(
  resource: Pick<PhiCollectionProviderResourceDescriptor, "actions"> | null | undefined,
): PhiMediaRendererResourceActions {
  const keys = new Set((resource?.actions ?? []).map((action) => action.key));
  return { delete: keys.has("delete"), add: keys.has("add") };
}

/**
 * Why the placement's tools cannot be drawn for this resource, or `null`: a filter or an action the
 * renderer has no control for, or one the bound resource does not declare -- a Folder filter on a
 * gallery of references, a lock on a resource that cannot lock. The resource is the one the Server read
 * from the Area's registry; where the Area declares none, nothing is declared and every tool is refused.
 */
export function readPhiMediaRendererToolFailure(input: {
  config: Pick<PhiCmsCollectionViewWidgetConfig, "features">;
  resource: Pick<PhiCollectionProviderResourceDescriptor, "actions" | "query"> | null | undefined;
}): string | null {
  const { features } = input.config;
  const declaredFilters = new Set((input.resource?.query.filterFields ?? []).map((filter) => filter.key));
  const declaredActions = new Map((input.resource?.actions ?? []).map((action) => [action.key, action]));
  for (const filter of features.filters ?? []) {
    if (!(PHI_MEDIA_RENDERER_FILTER_KEYS as readonly string[]).includes(filter.key)) {
      return `Asset collection filter "${filter.key}" is not supported.`;
    }
    if (!declaredFilters.has(filter.key)) {
      return `The bound resource declares no filter "${filter.key}".`;
    }
  }
  const configuredActions = [
    ...(features.actions?.toolbar ?? []),
    ...(features.filters ?? []).flatMap((filter) => filter.actions ?? []),
  ];
  for (const action of configuredActions) {
    if (!(PHI_MEDIA_RENDERER_ACTION_KEYS as readonly string[]).includes(action.key)) {
      return `Asset collection action "${action.key}" is not supported.`;
    }
    const needed = action.key === "lockFolder" ? ["lockFolder", "unlockFolder"] : [action.key];
    const missing = needed.find((key) => !declaredActions.has(key));
    if (missing) return `The bound resource declares no action "${missing}".`;
    if (action.key === "upload" && declaredActions.get("upload")?.panelKey !== PHI_MEDIA_RENDERER_UPLOAD_PANEL_KEY) {
      return `The bound resource's "upload" action opens no "${PHI_MEDIA_RENDERER_UPLOAD_PANEL_KEY}" panel.`;
    }
  }
  return null;
}
