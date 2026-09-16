import "server-only";

import { resolvePhiCmsDescriptorCatalog } from "../../descriptor-compiler";
import type { PhiRuntimeControllerDefinition } from "../../../../types";
import { buildPhiThemeSetSelectOptions } from "../set-options";
import {
  PHI_THEME_RUNTIME_CONTROLLER_DEFINITION,
  type PhiThemeRuntimeControllerConfig,
  type PhiThemeRuntimeControllerPreload,
} from "./definition";

export const PHI_THEME_RUNTIME_CONTROLLER_SERVER_DEFINITION = {
  ...PHI_THEME_RUNTIME_CONTROLLER_DEFINITION,
  serverPreload: ({ runtimeModuleCatalog }) => ({
    setOptions: buildPhiThemeSetSelectOptions(resolvePhiCmsDescriptorCatalog(runtimeModuleCatalog)),
  }),
} satisfies PhiRuntimeControllerDefinition<PhiThemeRuntimeControllerConfig, PhiThemeRuntimeControllerPreload>;
