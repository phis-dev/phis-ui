"use client";

import {
  definePhiRuntimeModuleAuthoringClientContribution,
} from "../authoring-contributions-client";
import { PHI_ADMIN_RUNTIME_MODULE_ID } from "../admin/ids";
import { PHI_AUTH_RUNTIME_MODULE_ID } from "../auth/ids";
import { PHI_GROUPS_RUNTIME_MODULE_ID } from "../groups/ids";
import { PHI_LOCALIZATION_RUNTIME_MODULE_ID } from "../localization/ids";
import { PHI_OBSERVABILITY_RUNTIME_MODULE_ID } from "../observability/ids";
import { PHI_USER_MANAGEMENT_RUNTIME_MODULE_ID } from "../user-management/ids";
import { PHI_COMMON_RUNTIME_MODULE_AUTHORING_CLIENT_CONTRIBUTIONS } from "./common";
import { PHI_DASHBOARD_RUNTIME_MODULE_AUTHORING_CLIENT_CONTRIBUTION } from "../dashboard/authoring-client";

export const PHI_ADMIN_RUNTIME_MODULE_AUTHORING_CLIENT_CONTRIBUTIONS = [
    ...PHI_COMMON_RUNTIME_MODULE_AUTHORING_CLIENT_CONTRIBUTIONS,
    definePhiRuntimeModuleAuthoringClientContribution({
      moduleId: PHI_AUTH_RUNTIME_MODULE_ID,
      loadAuthoring: () => import("../auth/authoring")
        .then((module) => module.PhiAuthRuntimeModuleAuthoringClient),
    }),
    PHI_DASHBOARD_RUNTIME_MODULE_AUTHORING_CLIENT_CONTRIBUTION,
    definePhiRuntimeModuleAuthoringClientContribution({
      moduleId: PHI_GROUPS_RUNTIME_MODULE_ID,
      loadAuthoring: () => import("../groups/authoring")
        .then((module) => module.PhiGroupsRuntimeModuleAuthoringClient),
    }),
    definePhiRuntimeModuleAuthoringClientContribution({
      moduleId: PHI_LOCALIZATION_RUNTIME_MODULE_ID,
      loadAuthoring: () => import("../localization/authoring")
        .then((module) => module.PhiLocalizationRuntimeModuleAuthoringClient),
    }),
    definePhiRuntimeModuleAuthoringClientContribution({
      moduleId: PHI_OBSERVABILITY_RUNTIME_MODULE_ID,
      loadAuthoring: () => import("../observability/authoring")
        .then((module) => module.PhiObservabilityRuntimeModuleAuthoringClient),
    }),
    definePhiRuntimeModuleAuthoringClientContribution({
      moduleId: PHI_USER_MANAGEMENT_RUNTIME_MODULE_ID,
      loadAuthoring: () => import("../user-management/authoring")
        .then((module) => module.PhiUserManagementRuntimeModuleAuthoringClient),
    }),
    definePhiRuntimeModuleAuthoringClientContribution({
      moduleId: PHI_ADMIN_RUNTIME_MODULE_ID,
      loadAuthoring: () => import("../admin/authoring")
        .then((module) => module.PhiAdminRuntimeModuleAuthoringClient),
    }),
  ] as const;
