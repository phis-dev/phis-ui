"use client";

import {
  definePhiRuntimeModuleAuthoringClientContribution,
} from "../authoring-contributions-client";
import { PHI_LOCALIZATION_RUNTIME_MODULE_ID } from "../localization/ids";
import { PHI_EDITOR_RUNTIME_MODULE_ID } from "../editor/ids";
import { PHI_COMMON_RUNTIME_MODULE_AUTHORING_CLIENT_CONTRIBUTIONS } from "./common";
import { PHI_DASHBOARD_RUNTIME_MODULE_AUTHORING_CLIENT_CONTRIBUTION } from "../dashboard/authoring-client";

export const PHI_EDITOR_RUNTIME_MODULE_AUTHORING_CLIENT_CONTRIBUTIONS = [
    ...PHI_COMMON_RUNTIME_MODULE_AUTHORING_CLIENT_CONTRIBUTIONS,
    PHI_DASHBOARD_RUNTIME_MODULE_AUTHORING_CLIENT_CONTRIBUTION,
    definePhiRuntimeModuleAuthoringClientContribution({
      moduleId: PHI_LOCALIZATION_RUNTIME_MODULE_ID,
      loadAuthoring: () => import("../localization/authoring")
        .then((module) => module.PhiLocalizationRuntimeModuleAuthoringClient),
    }),
    definePhiRuntimeModuleAuthoringClientContribution({
      moduleId: PHI_EDITOR_RUNTIME_MODULE_ID,
      loadAuthoring: () => import("../editor/authoring")
        .then((module) => module.PhiEditorRuntimeModuleAuthoringClient),
    }),
  ] as const;
