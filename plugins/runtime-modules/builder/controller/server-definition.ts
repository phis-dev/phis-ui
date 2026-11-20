import "server-only";

import {
  PHI_BUILDER_RUNTIME_CONTROLLER_DEFINITION,
  type PhiBuilderRuntimeControllerConfig,
  type PhiBuilderRuntimeControllerPreload,
} from "./definition";
import {
  buildPhiBuilderAreaPresetSourcesByArea,
  buildPhiBuilderAreaRootRoutesByArea,
  buildPhiBuilderAreaMetaByArea,
  buildPhiBuilderAreaShellsByArea,
  buildPhiBuilderAreaControllerSettingsByArea,
  buildPhiBuilderPublicRoutePaths,
  buildPhiBuilderPublishedRuntimeModuleIdsForArea,
  buildPhiBuilderStructureRuntimeModuleIdsByArea,
  buildPhiBuilderUnresolvedRuntimeModuleIdsByArea,
  buildPhiBuilderStructureShellPresetDraftsByArea,
} from "../area-shell-presets.server";
import type { PhiRuntimeControllerDefinition } from "../../../../types";
import {
  buildPhiBuilderModulePresetPagesByArea,
  buildPhiBuilderPublicRouteClaims,
} from "../page-preset-catalog.server";
import { buildPhiBuilderNavigationSurfacesByArea } from "../navigation-catalog.server";
import {
  PHI_BUILDER_AREA_SEARCH_PARAM,
  PHI_BUILDER_RUNTIME_MODULES_SEARCH_PARAM,
  normalizePhiBuilderAreaSearchParam,
  normalizePhiBuilderRuntimeModuleIdsSearchParam,
} from "../../../../helpers/cms-scope-search-params";
import { resolvePhiRuntimeModuleIdsForArea } from "../../../../plugins/runtime-modules/settings";
import { localizePhiRuntimeModuleDefinitions } from "../../module-labels.server";
import { getPhiBuilderChromeWidgetLabels } from "../../../../components/widgets/label-sets/builder-chrome";
import { getPhiHistoryLabels } from "../../../../components/widgets/label-sets/history";
import { resolvePhiRuntimeModuleServerBinding } from "../../server-capabilities";
import type { PhiWorkspaceCatalogState } from "../../../../components/workspace/catalog-state";
import { buildPhiWidgetLabelTranslatorOptions } from "../../../../components/widgets/label-sets/runtime-options";

export const PHI_BUILDER_RUNTIME_CONTROLLER_SERVER_DEFINITION = {
  ...PHI_BUILDER_RUNTIME_CONTROLLER_DEFINITION,
  serverPreload: async ({ runtime, runtimeModuleCatalog, serverCapabilities }) => {
    const [
      shellPresetDraftsByArea,
      runtimeModuleIdsByArea,
      unresolvedModuleIdsByArea,
      publicRoutePaths,
      areaRootRoutesByArea,
      areaMetaByArea,
      areaControllerSettingsByArea,
      builderLabels,
      historyLabels,
      livePublicModuleIds,
      areaPresetSourcesByArea,
      areaShellsByArea,
    ] = await Promise.all([
      buildPhiBuilderStructureShellPresetDraftsByArea(
        runtime,
        runtimeModuleCatalog,
      ),
      buildPhiBuilderStructureRuntimeModuleIdsByArea(
        runtime,
        runtimeModuleCatalog,
      ),
      buildPhiBuilderUnresolvedRuntimeModuleIdsByArea(runtime, runtimeModuleCatalog),
      buildPhiBuilderPublicRoutePaths(runtime, runtimeModuleCatalog),
      buildPhiBuilderAreaRootRoutesByArea(runtime, runtimeModuleCatalog),
      buildPhiBuilderAreaMetaByArea(runtime, runtimeModuleCatalog),
      buildPhiBuilderAreaControllerSettingsByArea(runtime, runtimeModuleCatalog),
      getPhiBuilderChromeWidgetLabels(buildPhiWidgetLabelTranslatorOptions(runtime)),
      getPhiHistoryLabels(buildPhiWidgetLabelTranslatorOptions(runtime)),
      buildPhiBuilderPublishedRuntimeModuleIdsForArea(runtime, "public", runtimeModuleCatalog),
      buildPhiBuilderAreaPresetSourcesByArea(runtime, runtimeModuleCatalog),
      buildPhiBuilderAreaShellsByArea(runtime, runtimeModuleCatalog),
    ]);

    const requestedArea = normalizePhiBuilderAreaSearchParam(
      runtime.request?.searchParams?.[PHI_BUILDER_AREA_SEARCH_PARAM],
    );
    const requestedModuleIds = normalizePhiBuilderRuntimeModuleIdsSearchParam(
      runtime.request?.searchParams?.[PHI_BUILDER_RUNTIME_MODULES_SEARCH_PARAM],
    );
    const canonicalModuleDefinitions = [...runtimeModuleCatalog.values()].map((entry) => entry.definition);
    const moduleDefinitions = await localizePhiRuntimeModuleDefinitions(runtime, canonicalModuleDefinitions);
    const effectiveRuntimeModuleIdsByArea = requestedArea && requestedModuleIds
      ? {
          ...runtimeModuleIdsByArea,
          [requestedArea]: resolvePhiRuntimeModuleIdsForArea(
            requestedArea,
            requestedModuleIds,
            moduleDefinitions,
          ),
        }
      : runtimeModuleIdsByArea;

    /*
     * The Modules the Site could not run if it selected them, read the way the render reads them
     * (`resolvePhiRuntimeModuleServerBinding`), so the Modules page says what the render does.
     */
    const serverUnavailableModules: PhiWorkspaceCatalogState["serverUnavailableModules"] = {};
    for (const definition of canonicalModuleDefinitions) {
      const binding = resolvePhiRuntimeModuleServerBinding(definition.serverBinding, serverCapabilities);
      if (!binding.available) {
        serverUnavailableModules[definition.moduleId] = {
          providerId: definition.serverBinding.providerId,
          diagnosticCode: binding.diagnosticCode,
          missingCapabilities: [...binding.missingCapabilities],
        };
      }
    }

    return {
      shellPresetDraftsByArea,
      runtimeModuleDefinitions: moduleDefinitions,
      serverUnavailableModules,
      runtimeModuleIdsByArea: effectiveRuntimeModuleIdsByArea,
      unresolvedModuleIdsByArea,
      // Marked live where the published Public Area runs the Module, so the collision dialog can say so.
      publicRouteClaims: buildPhiBuilderPublicRouteClaims(runtimeModuleCatalog).map((claim) => ({
        ...claim,
        live: livePublicModuleIds.includes(claim.ownerModuleId),
      })),
      publicRoutePaths,
      areaRootRoutesByArea,
      areaMetaByArea,
      areaControllerSettingsByArea,
      modulePresetPagesByArea: buildPhiBuilderModulePresetPagesByArea(
        runtimeModuleCatalog,
      ),
      areaPresetSourcesByArea,
      areaShellsByArea,
      navigationSurfacesByArea: await buildPhiBuilderNavigationSurfacesByArea(
        runtime,
        runtimeModuleCatalog,
        effectiveRuntimeModuleIdsByArea,
      ),
      pageMetaLabels: {
        createTitle: builderLabels.pages.newPage,
        updateTitle: builderLabels.pages.pageMeta,
        createAction: builderLabels.pages.create,
        updateAction: builderLabels.toolbar.save,
      },
      historyLabels,
    };
  },
} satisfies PhiRuntimeControllerDefinition<
  PhiBuilderRuntimeControllerConfig,
  PhiBuilderRuntimeControllerPreload
>;
