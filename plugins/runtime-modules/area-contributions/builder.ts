import {
  mergePhiRuntimeModuleServerAreaContributions,
} from "../area-contributions";
import { createPhiDashboardRuntimeModuleServerAreaContribution } from "../dashboard/server";
import { PHI_REVISIONS_RUNTIME_MODULE_SERVER_AREA_CONTRIBUTION } from "../revisions/server";
import { PHI_AUTH_RUNTIME_MODULE_ID } from "../auth/ids";
import { PHI_DASHBOARD_RUNTIME_MODULE_ID } from "../dashboard/ids";
import { PHI_ACCOUNTING_RUNTIME_MODULE_AREA_CONTRIBUTIONS } from "./accounting";
import { PHI_ADMIN_RUNTIME_MODULE_AREA_CONTRIBUTIONS } from "./admin";
import { PHI_APP_RUNTIME_MODULE_AREA_CONTRIBUTIONS } from "./app";
import { createPhiCommonRuntimeModuleServerAreaContributions } from "./common";
import { PHI_EDITOR_RUNTIME_MODULE_AREA_CONTRIBUTIONS } from "./editor";
import { PHI_PUBLIC_RUNTIME_MODULE_AREA_CONTRIBUTIONS } from "./public";
import { PHI_FORM_BUILDER_RUNTIME_MODULE_SERVER_AREA_CONTRIBUTION } from "../form-builder/server";
import { PHI_THEME_RUNTIME_MODULE_SERVER_AREA_CONTRIBUTION } from "../theme/server";
import { createPhiAuthRuntimeModuleServerAreaContribution } from "../auth/server";
import { PHI_BUILDER_RUNTIME_MODULE_SERVER_AREA_CONTRIBUTION } from "../builder/server";

const commonContributions = createPhiCommonRuntimeModuleServerAreaContributions();
const commonModuleIds = new Set(commonContributions.map((entry) => entry.moduleId));
const targetAreaBaseContributions = mergePhiRuntimeModuleServerAreaContributions([
  ...PHI_PUBLIC_RUNTIME_MODULE_AREA_CONTRIBUTIONS,
  ...PHI_APP_RUNTIME_MODULE_AREA_CONTRIBUTIONS,
  ...PHI_ACCOUNTING_RUNTIME_MODULE_AREA_CONTRIBUTIONS,
  ...PHI_ADMIN_RUNTIME_MODULE_AREA_CONTRIBUTIONS,
  ...PHI_EDITOR_RUNTIME_MODULE_AREA_CONTRIBUTIONS,
].filter((entry) =>
  !commonModuleIds.has(entry.moduleId) &&
  entry.moduleId !== PHI_AUTH_RUNTIME_MODULE_ID &&
  entry.moduleId !== PHI_DASHBOARD_RUNTIME_MODULE_ID,
));

export const PHI_BUILDER_RUNTIME_MODULE_AREA_CONTRIBUTIONS = [
  ...commonContributions,
  ...targetAreaBaseContributions,
  createPhiAuthRuntimeModuleServerAreaContribution(),
  PHI_BUILDER_RUNTIME_MODULE_SERVER_AREA_CONTRIBUTION,
  createPhiDashboardRuntimeModuleServerAreaContribution(),
  PHI_REVISIONS_RUNTIME_MODULE_SERVER_AREA_CONTRIBUTION,
  PHI_FORM_BUILDER_RUNTIME_MODULE_SERVER_AREA_CONTRIBUTION,
  PHI_THEME_RUNTIME_MODULE_SERVER_AREA_CONTRIBUTION,
] as const;
