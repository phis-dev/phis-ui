import type { PhiRuntimeModuleDataProviderDescriptor } from "../contracts";
import { PHI_USER_MANAGEMENT_RUNTIME_DATA_PROVIDER_KEYS } from "./ids";
import { PHI_USER_MANAGEMENT_RUNTIME_MODULE_ID } from "./ids";
import { createPhiUserManagementControllerAddress } from "../../../plugins/runtime-modules/user-management/controller/address";

export const PHI_USER_MANAGEMENT_RUNTIME_DATA_PROVIDER_DESCRIPTORS = [
  {
    key: PHI_USER_MANAGEMENT_RUNTIME_DATA_PROVIDER_KEYS.table,
    ownerModuleId: PHI_USER_MANAGEMENT_RUNTIME_MODULE_ID,
    kind: "table",
    executionMode: "live",
    authoringMode: "none",
    title: "User Management tables",
    description: "User and session data exposed by the User Management module.",
    resources: [
      {
        resourceKey: "users",
        title: "Users",
        rowIdentityPath: "id",
        recordRead: true,
        summaryFields: [
          { key: "siteTotal", title: "Site users", type: "number" },
        ],
        fields: [
          { key: "id", title: "ID", type: "string", required: true },
          {
            key: "enabled",
            title: "Enabled",
            type: "boolean",
            mutable: true,
            mutableWhen: { match: "all", conditions: [
              { source: "controller", controllerAddress: createPhiUserManagementControllerAddress(), valuePath: "permissions.readOnly", operator: "falsy" },
              { source: "row", valuePath: "self", operator: "falsy" },
            ] },
          },
          { key: "name", title: "Name", type: "string" },
          { key: "email", title: "Email", type: "string" },
          { key: "accountType", title: "Account type", type: "string" },
          { key: "roleTags", title: "Roles", type: "json" },
          { key: "userFlagTags", title: "User flags", type: "json" },
          { key: "siteFlagTags", title: "Site flags", type: "json" },
          { key: "lastLoginAt", title: "Last login", type: "datetime" },
          { key: "createdAt", title: "Created", type: "datetime" },
          { key: "self", title: "Current user", type: "boolean" },
          { key: "medusaCustomerId", title: "Medusa customer", type: "string" },
        ],
        query: {
          search: true,
          filterFields: ["accountType", "enabled"],
          sorting: "single",
          pagination: "offset",
        },
        actions: [
          {
            key: "delete", title: "Delete", scope: "row",
            disabledWhen: { match: "any", conditions: [
              { source: "controller", controllerAddress: createPhiUserManagementControllerAddress(), valuePath: "permissions.readOnly", operator: "truthy" },
              { source: "row", valuePath: "self", operator: "truthy" },
              { source: "row", valuePath: "medusaCustomerId", operator: "truthy" },
            ] },
            intent: "destructive",
            confirmation: "required",
          },
          { key: "refresh", title: "Refresh", scope: "resource" },
          { key: "create", title: "Create", scope: "resource", valueType: "json" },
          { key: "update", title: "Update", scope: "row", valueType: "json" },
        ],
      },
      {
        resourceKey: "userSessions",
        title: "User sessions",
        rowIdentityPath: "id",
        fields: [
          { key: "id", title: "ID", type: "string", required: true },
          { key: "createdAt", title: "Created", type: "datetime" },
          { key: "status", title: "Status", type: "string" },
          { key: "lastSeenAt", title: "Last seen", type: "datetime" },
          { key: "expiresAt", title: "Expires", type: "datetime" },
          { key: "ipAddress", title: "IP address", type: "string" },
          { key: "userAgent", title: "User agent", type: "string" },
        ],
        query: { filterFields: ["userId"], sorting: "none", pagination: "none" },
      },
    ],
  },
] satisfies readonly PhiRuntimeModuleDataProviderDescriptor[];
