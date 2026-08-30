"use client";

import {
  definePhiRuntimeModuleAuthoringClientContribution,
} from "../authoring-contributions-client";
import { PHI_ACCOUNTING_RUNTIME_MODULE_ID } from "../accounting/ids";
import { PHI_COMMON_RUNTIME_MODULE_AUTHORING_CLIENT_CONTRIBUTIONS } from "./common";

export const PHI_ACCOUNTING_RUNTIME_MODULE_AUTHORING_CLIENT_CONTRIBUTIONS = [
    ...PHI_COMMON_RUNTIME_MODULE_AUTHORING_CLIENT_CONTRIBUTIONS,
    definePhiRuntimeModuleAuthoringClientContribution({
      moduleId: PHI_ACCOUNTING_RUNTIME_MODULE_ID,
      loadAuthoring: () => import("../accounting/authoring")
        .then((module) => module.PhiAccountingRuntimeModuleAuthoringClient),
    }),
  ] as const;
