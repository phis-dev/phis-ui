import "server-only";

import { resolvePhiCmsDescriptorCatalog } from "../../descriptor-compiler";
import type { PhiRuntimeControllerDefinition } from "../../../../types";
import { buildPhiThemeSetSelectOptions } from "../set-options";
import { getPhiHistoryLabels } from "../../../../components/widgets/label-sets/history";
import {
  PHI_THEME_RUNTIME_CONTROLLER_DEFINITION,
  type PhiThemeRuntimeControllerConfig,
  type PhiThemeRuntimeControllerPreload,
} from "./definition";
import { buildPhiWidgetLabelTranslatorOptions } from "../../../../components/widgets/label-sets/runtime-options";

export const PHI_THEME_RUNTIME_CONTROLLER_SERVER_DEFINITION = {
  ...PHI_THEME_RUNTIME_CONTROLLER_DEFINITION,
  serverPreload: async ({ runtime, runtimeModuleCatalog }) => ({
    setOptions: buildPhiThemeSetSelectOptions(resolvePhiCmsDescriptorCatalog(runtimeModuleCatalog)),
    historyLabels: await getPhiHistoryLabels(buildPhiWidgetLabelTranslatorOptions(runtime)),
  }),
} satisfies PhiRuntimeControllerDefinition<PhiThemeRuntimeControllerConfig, PhiThemeRuntimeControllerPreload>;
