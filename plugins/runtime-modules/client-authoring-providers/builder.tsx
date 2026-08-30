"use client";

import {
  definePhiRuntimeModuleAuthoringClientContribution,
} from "../authoring-contributions-client";
import { PHI_BUILDER_RUNTIME_MODULE_ID } from "../builder/ids";
import { PHI_THEME_RUNTIME_MODULE_ID } from "../theme/ids";
import { PHI_FORM_BUILDER_RUNTIME_MODULE_ID } from "../form-builder/ids";
import { PHI_REVISIONS_RUNTIME_MODULE_AUTHORING_CLIENT_CONTRIBUTION } from "../revisions/authoring-client";
import { PHI_COMMON_RUNTIME_MODULE_AUTHORING_CLIENT_CONTRIBUTIONS } from "./common";
import { PHI_DASHBOARD_RUNTIME_MODULE_AUTHORING_CLIENT_CONTRIBUTION } from "../dashboard/authoring-client";

export const PHI_BUILDER_RUNTIME_MODULE_AUTHORING_CLIENT_CONTRIBUTIONS = [
    ...PHI_COMMON_RUNTIME_MODULE_AUTHORING_CLIENT_CONTRIBUTIONS,
    definePhiRuntimeModuleAuthoringClientContribution({
      moduleId: PHI_BUILDER_RUNTIME_MODULE_ID,
      loadAuthoring: () => import("../builder/authoring")
        .then((module) => module.PhiBuilderRuntimeModuleAuthoringClient),
    }),
    PHI_DASHBOARD_RUNTIME_MODULE_AUTHORING_CLIENT_CONTRIBUTION,
    PHI_REVISIONS_RUNTIME_MODULE_AUTHORING_CLIENT_CONTRIBUTION,
    definePhiRuntimeModuleAuthoringClientContribution({
      moduleId: PHI_FORM_BUILDER_RUNTIME_MODULE_ID,
      loadAuthoring: () => import("../form-builder/authoring")
        .then((module) => module.PhiFormBuilderRuntimeModuleAuthoringClient),
    }),
    definePhiRuntimeModuleAuthoringClientContribution({
      moduleId: PHI_THEME_RUNTIME_MODULE_ID,
      loadAuthoring: () => import("../theme/authoring")
        .then((module) => module.PhiThemeRuntimeModuleAuthoringClient),
    }),
  ] as const;
