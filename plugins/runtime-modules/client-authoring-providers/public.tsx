"use client";

import {
  definePhiRuntimeModuleAuthoringClientContribution,
} from "../authoring-contributions-client";
import { PHI_PUBLIC_RUNTIME_MODULE_ID } from "../public/ids";
import { PHI_AUTH_RUNTIME_MODULE_ID } from "../auth/ids";
import { PHI_COMMON_RUNTIME_MODULE_AUTHORING_CLIENT_CONTRIBUTIONS } from "./common";

export const PHI_PUBLIC_RUNTIME_MODULE_AUTHORING_CLIENT_CONTRIBUTIONS = [
    ...PHI_COMMON_RUNTIME_MODULE_AUTHORING_CLIENT_CONTRIBUTIONS,
    definePhiRuntimeModuleAuthoringClientContribution({
      moduleId: PHI_PUBLIC_RUNTIME_MODULE_ID,
      loadAuthoring: () => import("../public/authoring")
        .then((module) => module.PhiPublicRuntimeModuleAuthoringClient),
    }),
    definePhiRuntimeModuleAuthoringClientContribution({
      moduleId: PHI_AUTH_RUNTIME_MODULE_ID,
      loadAuthoring: () => import("../auth/authoring")
        .then((module) => module.PhiAuthRuntimeModuleAuthoringClient),
    }),
  ] as const;
