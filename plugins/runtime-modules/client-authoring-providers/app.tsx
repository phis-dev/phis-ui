"use client";

import {
  definePhiRuntimeModuleAuthoringClientContribution,
} from "../authoring-contributions-client";
import { PHI_APP_RUNTIME_MODULE_ID } from "../app/ids";
import { PHI_AUTH_RUNTIME_MODULE_ID } from "../auth/ids";
import { PHI_GROUPS_RUNTIME_MODULE_ID } from "../groups/ids";
import { PHI_AVATAR_RUNTIME_MODULE_ID } from "../avatar/ids";
import { PHI_COMMON_RUNTIME_MODULE_AUTHORING_CLIENT_CONTRIBUTIONS } from "./common";
import { PHI_DASHBOARD_RUNTIME_MODULE_AUTHORING_CLIENT_CONTRIBUTION } from "../dashboard/authoring-client";

export const PHI_APP_RUNTIME_MODULE_AUTHORING_CLIENT_CONTRIBUTIONS = [
    ...PHI_COMMON_RUNTIME_MODULE_AUTHORING_CLIENT_CONTRIBUTIONS,
    PHI_DASHBOARD_RUNTIME_MODULE_AUTHORING_CLIENT_CONTRIBUTION,
    definePhiRuntimeModuleAuthoringClientContribution({
      moduleId: PHI_AUTH_RUNTIME_MODULE_ID,
      loadAuthoring: () => import("../auth/authoring")
        .then((module) => module.PhiAuthRuntimeModuleAuthoringClient),
    }),
    definePhiRuntimeModuleAuthoringClientContribution({
      moduleId: PHI_GROUPS_RUNTIME_MODULE_ID,
      loadAuthoring: () => import("../groups/authoring")
        .then((module) => module.PhiGroupsRuntimeModuleAuthoringClient),
    }),
    definePhiRuntimeModuleAuthoringClientContribution({
      moduleId: PHI_AVATAR_RUNTIME_MODULE_ID,
      loadAuthoring: () => import("../avatar/authoring")
        .then((module) => module.PhiAvatarRuntimeModuleAuthoringClient),
    }),
    definePhiRuntimeModuleAuthoringClientContribution({
      moduleId: PHI_APP_RUNTIME_MODULE_ID,
      loadAuthoring: () => import("../app/authoring")
        .then((module) => module.PhiAppRuntimeModuleAuthoringClient),
    }),
  ] as const;
