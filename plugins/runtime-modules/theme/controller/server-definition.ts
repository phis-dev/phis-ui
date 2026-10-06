import "server-only";

import { resolvePhiCmsDescriptorCatalog } from "../../descriptor-compiler";
import type { PhiRuntimeControllerDefinition } from "../../../../types";
import { buildPhiThemeSetSelectOptions } from "../set-options";
import { getPhiHistoryLabels } from "../../../../components/widgets/label-sets/history";
import { readPhiServerApiCredentials } from "../../../../helpers/phis-server-credentials";
import {
  PHI_THEME_RUNTIME_CONTROLLER_DEFINITION,
  type PhiThemeRuntimeControllerConfig,
  type PhiThemeRuntimeControllerPreload,
} from "./definition";

export const PHI_THEME_RUNTIME_CONTROLLER_SERVER_DEFINITION = {
  ...PHI_THEME_RUNTIME_CONTROLLER_DEFINITION,
  serverPreload: async ({ runtime, runtimeModuleCatalog }) => ({
    setOptions: buildPhiThemeSetSelectOptions(resolvePhiCmsDescriptorCatalog(runtimeModuleCatalog)),
    historyLabels: await getPhiHistoryLabels({
      apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
      internalToken: readPhiServerApiCredentials().internalToken,
      locale: runtime.locale.current,
    }),
  }),
} satisfies PhiRuntimeControllerDefinition<PhiThemeRuntimeControllerConfig, PhiThemeRuntimeControllerPreload>;
