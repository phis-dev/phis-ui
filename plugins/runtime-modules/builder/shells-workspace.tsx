import type { PhiBlockRuntime, PhiCmsRuntimeRenderRegistry } from "../../../types";
import {
  buildPhiBuilderRuntimeModuleIdsForArea,
  buildPhiBuilderStructureShellDraftsForArea,
  resolvePhiBuilderCurrentStructureArea,
} from "./area-shell-presets.server";
import {
  buildPhiBuilderPreviewRenderableTrees,
  buildPhiBuilderServerPreviewRegions,
} from "./render-root-node-preview.server";
import { resolvePhiBuilderPreviewSnapshotFromSearchParam } from "./preview-store";
import { PHI_BUILDER_PREVIEW_SEARCH_PARAM } from "./preview-transport";
import { PhiDeveloperBuilderShellsWorkspaceWidgetClient } from "./clients/shells-workspace";
import { resolvePhiBuilderCanvasRuntimeModuleSandbox } from "./runtime-module-sandbox.server";
import {
  isPhiBuilderAreaKey,
} from "../../../constants/cms-areas";
import type { PhiDeveloperBuilderArea } from "./developer-workspace-types";
import { PhiBuilderWorkspaceScopeBoundary } from "./clients/workspace-scope-boundary";
import { buildPhiBuilderModuleAuthoringCatalog } from "./module-authoring-catalog.server";
import { PhiBuilderRuntimeModuleAuthoringBoundary } from "./clients/runtime-module-authoring-boundary";
import {
  PHI_BUILDER_RUNTIME_MODULES_SEARCH_PARAM,
  normalizePhiBuilderRuntimeModuleIdsSearchParam,
} from "../../../helpers/cms-scope-search-params";
import { getPhiBuilderChromeWidgetLabels } from "../../../components/widgets/label-sets/builder-chrome";
import { getPhiRegionWidgetLabels } from "../../../components/widgets/label-sets/region";

export async function PhiDeveloperBuilderShellsWorkspaceWidget({
  runtime,
  registry,
  disabled = false,
}: {
  runtime: PhiBlockRuntime;
  registry: PhiCmsRuntimeRenderRegistry;
  disabled?: boolean;
}) {
  const snapshot = resolvePhiBuilderPreviewSnapshotFromSearchParam(
    runtime.request?.searchParams?.[PHI_BUILDER_PREVIEW_SEARCH_PARAM],
  );
  const snapshotArea = snapshot?.area ?? null;
  if (snapshotArea != null && !isPhiBuilderAreaKey(snapshotArea)) {
    throw new Error(`Builder Canvas snapshot contains invalid area "${snapshotArea}".`);
  }
  const targetArea: PhiDeveloperBuilderArea = snapshotArea != null && isPhiBuilderAreaKey(snapshotArea)
    ? snapshotArea
    : resolvePhiBuilderCurrentStructureArea(runtime);
  const [structureShellDrafts, moduleIds, chromeLabels, regionLabels] = await Promise.all([
    buildPhiBuilderStructureShellDraftsForArea(runtime, targetArea, registry.runtimeModuleCatalog),
    buildPhiBuilderRuntimeModuleIdsForArea(runtime, targetArea, registry.runtimeModuleCatalog),
    getPhiBuilderChromeWidgetLabels({
      apiBaseUrl: runtime.phis.apiBaseUrl,
      internalToken: runtime.phis.internalToken,
      locale: runtime.locale.current,
    }),
    getPhiRegionWidgetLabels({
      apiBaseUrl: runtime.phis.apiBaseUrl,
      internalToken: runtime.phis.internalToken,
      locale: runtime.locale.current,
    }),
  ]);
  const requestedModuleIds = normalizePhiBuilderRuntimeModuleIdsSearchParam(
    runtime.request?.searchParams?.[PHI_BUILDER_RUNTIME_MODULES_SEARCH_PARAM],
  );
  const sandbox = await resolvePhiBuilderCanvasRuntimeModuleSandbox({
    catalog: registry.runtimeModuleCatalog,
    area: targetArea,
    moduleIds: snapshot?.runtimeModuleIds ?? requestedModuleIds ?? moduleIds,
    trees: buildPhiBuilderPreviewRenderableTrees(snapshot),
    viewer: runtime.viewer,
    serverCapabilities: registry.serverCapabilities,
  });
  const authoringCatalog = buildPhiBuilderModuleAuthoringCatalog({
    catalog: registry.runtimeModuleCatalog,
    area: targetArea,
    activeModuleIds: sandbox.moduleSet.activeModuleIds,
    viewer: runtime.viewer,
  });

  return (
    <PhiBuilderRuntimeModuleAuthoringBoundary
      targetArea={targetArea}
      catalog={authoringCatalog}
    >
      <PhiBuilderWorkspaceScopeBoundary kind="shells" targetArea={targetArea}>
        <PhiDeveloperBuilderShellsWorkspaceWidgetClient
          shellTheme={runtime.site.theme?.shell}
          serverPreviewRegions={buildPhiBuilderServerPreviewRegions({
            snapshot,
            runtime,
            registry: sandbox.registry,
          })}
          structureShellDrafts={structureShellDrafts}
          disabled={disabled}
          targetArea={targetArea}
          regionLabels={regionLabels}
          pickerLabels={chromeLabels.canvas.picker}
        />
      </PhiBuilderWorkspaceScopeBoundary>
    </PhiBuilderRuntimeModuleAuthoringBoundary>
  );
}
