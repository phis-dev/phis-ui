import type { PhiBlockRuntime } from "../../../types";
import type { PhiCmsRuntimeRenderRegistry } from "../../../types/cms-plugins";
import { PHI_BUILDER_PREVIEW_SEARCH_PARAM, type PhiBuilderPreviewRegionDraft } from "./preview-transport";
import { loadPhiBuilderPreviewSnapshot } from "./preview-store";
import {
  buildPhiBuilderPagesDraftsByScope,
  buildPhiBuilderPageMetaForScope,
  resolvePhiBuilderCurrentPageScope,
  resolvePhiBuilderPagePresetRecord,
} from "./page-presets.server";
import {
  buildPhiBuilderPreviewRenderableTrees,
  buildPhiBuilderServerPreviewRegions,
} from "./render-root-node-preview.server";
import type { PhiDeveloperBuilderArea } from "./developer-workspace-types";
import { PhiDeveloperBuilderPagesWorkspaceWidgetClient } from "./clients/pages-workspace";
import { resolvePhiPageRecordSampleBinding } from "../../../server-helpers/record-samples";
import { buildPhiBuilderRuntimeModuleIdsForArea } from "./area-shell-presets.server";
import { resolvePhiBuilderCanvasRuntimeModuleSandbox } from "./runtime-module-sandbox.server";
import { PhiBuilderWorkspaceScopeBoundary } from "./clients/workspace-scope-boundary";
import { buildPhiBuilderModuleAuthoringCatalog } from "./module-authoring-catalog.server";
import { localizePhiBuilderModuleAuthoringCatalog } from "./plugin-meta-labels.server";
import { resolvePhiBuilderAuthoringPickerDataProviderKeysFromCatalog } from "./authoring-provider-keys";
import { PhiBuilderRuntimeModuleAuthoringBoundary } from "./clients/runtime-module-authoring-boundary";
import {
  PHI_BUILDER_RUNTIME_MODULES_SEARCH_PARAM,
  normalizePhiBuilderRuntimeModuleIdsSearchParam,
} from "../../../helpers/cms-scope-search-params";
import { getPhiBuilderChromeWidgetLabels } from "../../../components/widgets/label-sets/builder-chrome";
import { getPhiRegionWidgetLabels } from "../../../components/widgets/label-sets/region";
import { buildPhiWidgetLabelTranslatorOptions } from "../../../components/widgets/label-sets/runtime-options";

export async function PhiDeveloperBuilderPagesWorkspaceWidget({
  runtime,
  registry,
}: {
  runtime: PhiBlockRuntime;
  registry: PhiCmsRuntimeRenderRegistry;
  disabled?: boolean;
}) {
  const snapshot = loadPhiBuilderPreviewSnapshot(
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
  const moduleIdsPromise = buildPhiBuilderRuntimeModuleIdsForArea(
    runtime,
    previewArea,
    registry.runtimeModuleCatalog,
  );
  const labelsPromise = getPhiBuilderChromeWidgetLabels(buildPhiWidgetLabelTranslatorOptions(runtime));
  const regionLabelsPromise = getPhiRegionWidgetLabels(buildPhiWidgetLabelTranslatorOptions(runtime));
  const [pageDraftsByScope, pageMeta, moduleIds, chromeLabels, regionLabels] = await Promise.all([
    pageDraftsByScopePromise,
    pageMetaPromise,
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
  const authoringCatalog = await localizePhiBuilderModuleAuthoringCatalog(
    runtime,
    buildPhiBuilderModuleAuthoringCatalog({
      catalog: registry.runtimeModuleCatalog,
      area: previewArea,
      activeModuleIds: sandbox.moduleSet.activeModuleIds,
      viewer: runtime.viewer,
    }),
  );
  /*
   * A template of a route about a record is previewed with the first sample its Provider offers; the
   * Editor canvas keeps showing each Widget's own content. A Provider with no samples leaves the Page
   * about no record, and the template previews with its Widgets' own content as well.
   */
  const pageRecord = await resolvePhiBuilderPagePresetRecord(
    runtime,
    previewArea,
    previewPageKey,
    registry.runtimeModuleCatalog,
  );
  const sampleRecord = pageRecord
    ? await resolvePhiPageRecordSampleBinding({ registry: sandbox.registry, runtime, pageRecord })
    : null;
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
      ...(sampleRecord ? { record: sampleRecord } : {}),
    },
  };

  return (
    <PhiBuilderRuntimeModuleAuthoringBoundary
      targetArea={previewArea}
      catalog={authoringCatalog}
      pickerDataProviderKeys={resolvePhiBuilderAuthoringPickerDataProviderKeysFromCatalog(
        registry.runtimeModuleCatalog,
      )}
    >
      <PhiBuilderWorkspaceScopeBoundary
        kind="pages"
        targetArea={previewArea}
        targetPageKey={previewPageKey}
      >
        <PhiDeveloperBuilderPagesWorkspaceWidgetClient
          pageDraftsByScope={pageDraftsByScope}
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
