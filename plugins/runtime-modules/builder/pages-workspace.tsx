import type { PhiBlockRuntime, PhiCmsRuntimeRenderRegistry } from "../../../types";
import { PHI_BUILDER_PREVIEW_SEARCH_PARAM, type PhiBuilderPreviewRegionDraft } from "./preview-transport";
import { resolvePhiBuilderPreviewSnapshotFromSearchParam } from "./preview-store";
import {
  buildPhiBuilderPagesDraftsByScope,
  buildPhiBuilderPagePresetDrafts,
  buildPhiBuilderPageMetaForScope,
  resolvePhiBuilderCurrentPageScope,
} from "./page-presets.server";
import {
  buildPhiBuilderPreviewRenderableTrees,
  buildPhiBuilderServerPreviewRegions,
} from "./render-root-node-preview.server";
import type { PhiDeveloperBuilderArea } from "./developer-workspace-types";
import { PhiDeveloperBuilderPagesWorkspaceWidgetClient } from "./clients/pages-workspace";
import { buildPhiBuilderRuntimeModuleIdsForArea } from "./area-shell-presets.server";
import { resolvePhiBuilderCanvasRuntimeModuleSandbox } from "./runtime-module-sandbox.server";
import { PhiBuilderWorkspaceScopeBoundary } from "./clients/workspace-scope-boundary";
import { buildPhiBuilderModuleAuthoringCatalog } from "./module-authoring-catalog.server";
import { PhiBuilderRuntimeModuleAuthoringBoundary } from "./clients/runtime-module-authoring-boundary";
import {
  PHI_BUILDER_RUNTIME_MODULES_SEARCH_PARAM,
  normalizePhiBuilderRuntimeModuleIdsSearchParam,
} from "../../../helpers/cms-scope-search-params";
import { getPhiBuilderChromeWidgetLabels } from "../../../components/widgets/label-sets/builder-chrome";
import { getPhiRegionWidgetLabels } from "../../../components/widgets/label-sets/region";

export async function PhiDeveloperBuilderPagesWorkspaceWidget({
  runtime,
  registry,
}: {
  runtime: PhiBlockRuntime;
  registry: PhiCmsRuntimeRenderRegistry;
  disabled?: boolean;
}) {
  const snapshot = resolvePhiBuilderPreviewSnapshotFromSearchParam(
    runtime.request?.searchParams?.[PHI_BUILDER_PREVIEW_SEARCH_PARAM],
  );
  const pageDraftsByScopePromise = buildPhiBuilderPagesDraftsByScope(
    runtime,
    registry.runtimeModuleCatalog,
  );
  const currentScope = await resolvePhiBuilderCurrentPageScope(runtime, registry.runtimeModuleCatalog);
  const previewArea = (snapshot?.area ?? currentScope.area) as PhiDeveloperBuilderArea;
  const previewPageKey = snapshot?.pageKey ?? currentScope.pageKey;
  const pageMetaPromise = buildPhiBuilderPageMetaForScope(
    runtime,
    previewArea,
    previewPageKey,
    registry.runtimeModuleCatalog,
  );
  const pagePresetDraftsPromise = buildPhiBuilderPagePresetDrafts(
    runtime,
    previewArea,
    previewPageKey,
    registry.runtimeModuleCatalog,
  );
  const moduleIdsPromise = buildPhiBuilderRuntimeModuleIdsForArea(
    runtime,
    previewArea,
    registry.runtimeModuleCatalog,
  );
  const labelsPromise = getPhiBuilderChromeWidgetLabels({
    apiBaseUrl: runtime.phis.apiBaseUrl,
    internalToken: runtime.phis.internalToken,
    locale: runtime.locale.current,
  });
  const regionLabelsPromise = getPhiRegionWidgetLabels({
    apiBaseUrl: runtime.phis.apiBaseUrl,
    internalToken: runtime.phis.internalToken,
    locale: runtime.locale.current,
  });
  const [pageDraftsByScope, pageMeta, pagePresetDrafts, moduleIds, chromeLabels, regionLabels] = await Promise.all([
    pageDraftsByScopePromise,
    pageMetaPromise,
    pagePresetDraftsPromise,
    moduleIdsPromise,
    labelsPromise,
    regionLabelsPromise,
  ]);
  const requestedModuleIds = normalizePhiBuilderRuntimeModuleIdsSearchParam(
    runtime.request?.searchParams?.[PHI_BUILDER_RUNTIME_MODULES_SEARCH_PARAM],
  );
  const sandbox = await resolvePhiBuilderCanvasRuntimeModuleSandbox({
    catalog: registry.runtimeModuleCatalog,
    area: previewArea,
    moduleIds: snapshot?.runtimeModuleIds ?? requestedModuleIds ?? moduleIds,
    trees: buildPhiBuilderPreviewRenderableTrees(snapshot),
    viewer: runtime.viewer,
    serverCapabilities: registry.serverCapabilities,
  });
  const authoringCatalog = buildPhiBuilderModuleAuthoringCatalog({
    catalog: registry.runtimeModuleCatalog,
    area: previewArea,
    activeModuleIds: sandbox.moduleSet.activeModuleIds,
    viewer: runtime.viewer,
  });
  const previewRuntime = {
    ...runtime,
    page: {
      ...(runtime.page ?? {}),
      path: runtime.page?.path ?? "",
      pageType: runtime.page?.pageType ?? 0,
      titleMsgId: runtime.page?.titleMsgId ?? null,
      descriptionMsgId: runtime.page?.descriptionMsgId ?? null,
      title: pageMeta.title ?? runtime.page?.title ?? null,
      description: pageMeta.description ?? runtime.page?.description ?? null,
    },
  };

  return (
    <PhiBuilderRuntimeModuleAuthoringBoundary
      targetArea={previewArea}
      catalog={authoringCatalog}
    >
      <PhiBuilderWorkspaceScopeBoundary
        kind="pages"
        targetArea={previewArea}
        targetPageKey={previewPageKey}
      >
        <PhiDeveloperBuilderPagesWorkspaceWidgetClient
          pageDraftsByScope={pageDraftsByScope}
          pagePresetDrafts={pagePresetDrafts.drafts}
          pageMeta={pageMeta}
          pageMetaArea={previewArea}
          pageMetaPageKey={previewPageKey}
          serverPreviewRegions={buildPhiBuilderServerPreviewRegions({
            snapshot,
            runtime: previewRuntime,
            registry: sandbox.registry,
          })}
          previewRegionDrafts={(snapshot?.regionDrafts ?? null) as Record<string, PhiBuilderPreviewRegionDraft> | null}
          regionLabels={regionLabels}
          pickerLabels={chromeLabels.canvas.picker}
        />
      </PhiBuilderWorkspaceScopeBoundary>
    </PhiBuilderRuntimeModuleAuthoringBoundary>
  );
}
