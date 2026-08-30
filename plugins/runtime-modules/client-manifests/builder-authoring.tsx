"use client";

import {
  createPhiRuntimeModuleAuthoringClientManifest,
  type PhiRuntimeModuleAuthoringClientContribution,
} from "../authoring-contributions-client";
import { PHI_PUBLIC_RUNTIME_MODULE_AUTHORING_CLIENT_CONTRIBUTIONS } from "../client-authoring-providers/public";
import { PHI_APP_RUNTIME_MODULE_AUTHORING_CLIENT_CONTRIBUTIONS } from "../client-authoring-providers/app";
import { PHI_ADMIN_RUNTIME_MODULE_AUTHORING_CLIENT_CONTRIBUTIONS } from "../client-authoring-providers/admin";
import { PHI_BUILDER_RUNTIME_MODULE_AUTHORING_CLIENT_CONTRIBUTIONS } from "../client-authoring-providers/builder";
import { PHI_EDITOR_RUNTIME_MODULE_AUTHORING_CLIENT_CONTRIBUTIONS } from "../client-authoring-providers/editor";
import { PHI_ACCOUNTING_RUNTIME_MODULE_AUTHORING_CLIENT_CONTRIBUTIONS } from "../client-authoring-providers/accounting";

const contributionByModuleId = new Map(
  [
    ...PHI_PUBLIC_RUNTIME_MODULE_AUTHORING_CLIENT_CONTRIBUTIONS,
    ...PHI_APP_RUNTIME_MODULE_AUTHORING_CLIENT_CONTRIBUTIONS,
    ...PHI_ADMIN_RUNTIME_MODULE_AUTHORING_CLIENT_CONTRIBUTIONS,
    ...PHI_BUILDER_RUNTIME_MODULE_AUTHORING_CLIENT_CONTRIBUTIONS,
    ...PHI_EDITOR_RUNTIME_MODULE_AUTHORING_CLIENT_CONTRIBUTIONS,
    ...PHI_ACCOUNTING_RUNTIME_MODULE_AUTHORING_CLIENT_CONTRIBUTIONS,
  ].map((contribution) => [contribution.moduleId, contribution] as const),
);

export const PHI_BUILDER_TARGET_RUNTIME_MODULE_AUTHORING_CLIENT_MANIFEST =
  createPhiRuntimeModuleAuthoringClientManifest(
    [...contributionByModuleId.values()] as PhiRuntimeModuleAuthoringClientContribution[],
  );
