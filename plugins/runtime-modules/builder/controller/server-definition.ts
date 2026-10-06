import "server-only";

import {
  PHI_BUILDER_RUNTIME_CONTROLLER_DEFINITION,
  type PhiBuilderRuntimeControllerConfig,
  type PhiBuilderRuntimeControllerPreload,
} from "./definition";
import {
  buildPhiBuilderAreaRootRoutesByArea,
  buildPhiBuilderAreaMetaByArea,
  buildPhiBuilderAreaControllerSettingsByArea,
  buildPhiBuilderPublicRoutePaths,
  buildPhiBuilderStructureRuntimeModuleIdsByArea,
  buildPhiBuilderUnresolvedRuntimeModuleIdsByArea,
  buildPhiBuilderStructureShellPresetDraftsByArea,
} from "../area-shell-presets.server";
import type { PhiRuntimeControllerDefinition } from "../../../../types";
import {
  buildPhiBuilderAreaPresetSourcesByArea,
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
import { readPhiServerApiCredentials } from "../../../../helpers/phis-server-credentials";
import { resolvePhiRuntimeModuleServerBinding } from "../../server-capabilities";
import type { PhiWorkspaceCatalogState } from "../../../../components/workspace/catalog-state";

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
      getPhiBuilderChromeWidgetLabels({
        apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
        internalToken: readPhiServerApiCredentials().internalToken,
        locale: runtime.locale.current,
      }),
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
      publicRouteClaims: buildPhiBuilderPublicRouteClaims(runtimeModuleCatalog),
      publicRoutePaths,
      areaRootRoutesByArea,
      areaMetaByArea,
      areaControllerSettingsByArea,
      modulePresetPagesByArea: buildPhiBuilderModulePresetPagesByArea(
        runtimeModuleCatalog,
      ),
      areaPresetSourcesByArea: buildPhiBuilderAreaPresetSourcesByArea(runtimeModuleCatalog),
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
    };
  },
} satisfies PhiRuntimeControllerDefinition<
  PhiBuilderRuntimeControllerConfig,
  PhiBuilderRuntimeControllerPreload
>;
