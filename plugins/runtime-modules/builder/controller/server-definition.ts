import "server-only";

import {
  PHI_BUILDER_RUNTIME_CONTROLLER_DEFINITION,
  type PhiBuilderRuntimeControllerConfig,
  type PhiBuilderRuntimeControllerPreload,
} from "./definition";
import {
  buildPhiBuilderStructureRuntimeModuleIdsByArea,
  buildPhiBuilderStructureShellPresetDraftsByArea,
} from "../area-shell-presets.server";
import type { PhiRuntimeControllerDefinition } from "../../../../types";
import {
  buildPhiBuilderAreaPresetSourcesByArea,
  buildPhiBuilderModulePresetPagesByArea,
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

export const PHI_BUILDER_RUNTIME_CONTROLLER_SERVER_DEFINITION = {
  ...PHI_BUILDER_RUNTIME_CONTROLLER_DEFINITION,
  serverPreload: async ({ runtime, runtimeModuleCatalog }) => {
    const [shellPresetDraftsByArea, runtimeModuleIdsByArea, builderLabels] = await Promise.all([
      buildPhiBuilderStructureShellPresetDraftsByArea(
        runtime,
        runtimeModuleCatalog,
      ),
      buildPhiBuilderStructureRuntimeModuleIdsByArea(
        runtime,
        runtimeModuleCatalog,
      ),
      getPhiBuilderChromeWidgetLabels({
        apiBaseUrl: runtime.phis.apiBaseUrl,
        internalToken: runtime.phis.internalToken,
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

    return {
      shellPresetDraftsByArea,
      runtimeModuleDefinitions: moduleDefinitions,
      runtimeModuleIdsByArea: effectiveRuntimeModuleIdsByArea,
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
