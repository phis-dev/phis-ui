import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { renderPhiWidgetPreviewPlaceholder } from "../../../../../plugins/factories/widget-renderers";
import { getPhiEffectsWidgetLabels } from "../../../../../components/widgets/label-sets/effects";
import {
  PHI_BUILDER_PREVIEW_SEARCH_PARAM,
} from "../../../../../plugins/runtime-modules/builder/preview-transport";
import { resolvePhiBuilderPreviewSnapshotFromSearchParam } from "../../../../../plugins/runtime-modules/builder/preview-store";
import { buildPhiBuilderCurrentPageDrafts } from "../../page-presets.server";
import { buildPhiBuilderCurrentStructureShellDrafts } from "../../area-shell-presets.server";
import {
  getPhiBuilderRegionDraftKey,
  isPhiBuilderPageScopedRegion,
} from "../../../../../plugins/runtime-modules/builder/region-keys";
import type { PhiDeveloperBuilderArea, PhiDeveloperBuilderRegionDraft } from "../../../../../plugins/runtime-modules/builder/developer-workspace-types";
import { PhiBuilderRegionServerPreview } from "../../render-root-node-preview.server";
import {
  PHI_STRUCTURE_REGION_WIDGET_DEFINITION,
  type PhiStructureRegionWidgetConfig,
} from "./config";

export const PHI_STRUCTURE_REGION_WIDGET_PLUGIN: PhiCmsWidgetPlugin<PhiStructureRegionWidgetConfig> = {
  ...PHI_STRUCTURE_REGION_WIDGET_DEFINITION,
  render: async ({ config, runtime, registry }) => {
    if (!registry) {
      throw new Error("Structure Region requires the resolved runtime registry.");
    }
    const regionKey = config.regionKey ?? "";
    const snapshot = resolvePhiBuilderPreviewSnapshotFromSearchParam(
      runtime.request?.searchParams?.[PHI_BUILDER_PREVIEW_SEARCH_PARAM],
    );
    const previewDraft = snapshot
      ? snapshot.regionDrafts[getPhiBuilderRegionDraftKey(snapshot.area, regionKey, snapshot.pageKey)] ?? null
      : null;
    const currentStructureDrafts = await buildPhiBuilderCurrentStructureShellDrafts(
      runtime,
      registry.runtimeModuleCatalog,
    );
    const currentPageDrafts = isPhiBuilderPageScopedRegion(regionKey)
      ? await buildPhiBuilderCurrentPageDrafts(runtime, registry.runtimeModuleCatalog)
      : undefined;
    const effectsLabels = await getPhiEffectsWidgetLabels({
      apiBaseUrl: runtime.phis.apiBaseUrl,
      internalToken: runtime.phis.internalToken,
      locale: runtime.locale.current,
    });
    const fallbackStructureDraft =
      currentStructureDrafts.drafts[`${currentStructureDrafts.area}:${regionKey}`] ?? null;
    const fallbackPageDraft =
      currentPageDrafts?.drafts?.[`${currentPageDrafts.area}:${currentPageDrafts.pageKey}:${regionKey}`] ?? null;
    const resolvedStructureDraft =
      snapshot && !isPhiBuilderPageScopedRegion(regionKey)
        ? ({
            ...(fallbackStructureDraft ?? {}),
            ...(previewDraft ?? {}),
          } as PhiDeveloperBuilderRegionDraft | null)
        : fallbackStructureDraft;
    const structureDraftsByArea = {
      [currentStructureDrafts.area]: resolvedStructureDraft,
    } as Partial<Record<PhiDeveloperBuilderArea, PhiDeveloperBuilderRegionDraft | null>>;
    const currentPageArea = currentPageDrafts?.area ?? "public";
    const currentPageKey = currentPageDrafts?.pageKey ?? "home";
    const resolvedPageDraft =
      snapshot && isPhiBuilderPageScopedRegion(regionKey)
        ? ({
            ...(fallbackPageDraft ?? {}),
            ...(previewDraft ?? {}),
          } as PhiDeveloperBuilderRegionDraft | null)
        : fallbackPageDraft;
    const pageDraftsByScope = isPhiBuilderPageScopedRegion(regionKey)
      ? {
          [currentPageArea]: {
            [currentPageKey]: resolvedPageDraft,
          },
        } as Partial<Record<PhiDeveloperBuilderArea, Partial<Record<string, PhiDeveloperBuilderRegionDraft | null>>>>
      : undefined;
    const resolvedPreviewDraft = isPhiBuilderPageScopedRegion(regionKey) ? resolvedPageDraft : resolvedStructureDraft;
    if (snapshot && resolvedPreviewDraft?.rootNodeTypeKey == null) {
      return null;
    }

    const { PhiStructureRegionWidget } = await import("./built-in");

    return (
      <PhiStructureRegionWidget
        config={{
          slotKind: config.slotKind ?? "structure",
          origin: config.origin ?? PHI_STRUCTURE_REGION_WIDGET_DEFINITION.pluginKey,
          regionKey,
          title: config.title ?? config.regionKey ?? "Region",
          subtitle: config.subtitle ?? null,
          allowSelect: config.allowSelect ?? true,
          allowInsert: config.allowInsert ?? true,
          pickItems: config.pickItems ?? [],
          fallbackMinHeight: config.fallbackMinHeight,
        }}
        structureDraftsByArea={structureDraftsByArea}
        pageDraftsByScope={pageDraftsByScope}
        effectsLabels={effectsLabels}
        serverPreview={
          <PhiBuilderRegionServerPreview
            snapshot={snapshot}
            draft={resolvedPreviewDraft}
            regionKey={regionKey}
            runtime={runtime}
            registry={registry}
          />
        }
      />
    );
  },
  renderPreview: ({ widget }) => renderPhiWidgetPreviewPlaceholder(widget),
};
