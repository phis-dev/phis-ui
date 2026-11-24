import type { PhiRuntimeModuleDataProviderDescriptor } from "../contracts";
import { PHI_USER_MANAGEMENT_RUNTIME_DATA_PROVIDER_KEYS, PHI_USER_MANAGEMENT_USERS_ACCESS_RESOURCE_KEYS } from "./ids";
import { PHIS_USER_FIELDS } from "@phis/contracts/users";
import { PHI_USER_MANAGEMENT_RUNTIME_MODULE_ID } from "./ids";
import { createPhiUserManagementControllerAddress } from "../../../plugins/runtime-modules/user-management/controller/address";

export const PHI_USER_MANAGEMENT_RUNTIME_DATA_PROVIDER_DESCRIPTORS = [
  {
    key: PHI_USER_MANAGEMENT_RUNTIME_DATA_PROVIDER_KEYS.addonRoleOptions,
    ownerModuleId: PHI_USER_MANAGEMENT_RUNTIME_MODULE_ID,
    kind: "options",
    executionMode: "live",
    authoringMode: "none",
    title: "Add-ons with roles",
    description: "The Add-ons enabled for the Site that declare roles, for filtering users by them.",
  },
  {
    key: PHI_USER_MANAGEMENT_RUNTIME_DATA_PROVIDER_KEYS.addonRoleChoiceOptions,
    ownerModuleId: PHI_USER_MANAGEMENT_RUNTIME_MODULE_ID,
    kind: "options",
    executionMode: "live",
    authoringMode: "none",
    title: "Add-on roles to grant",
    description: "The Add-on roles the acting user may grant, and the ones the edited user holds, for assigning them.",
  },
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
          { key: "addonRoles", title: "Add-on role assignments", type: "json" },
          { key: "impliedAddonRoles", title: "Add-on roles through a Site access", type: "json" },
          { key: "addonRoleTags", title: "Add-on roles", type: "json" },
          { key: "userFlagTags", title: "User flags", type: "json" },
          { key: "siteFlagTags", title: "Site flags", type: "json" },
          { key: "lastLoginAt", title: "Last login", type: "datetime" },
          { key: "createdAt", title: "Created", type: "datetime" },
          { key: "self", title: "Current user", type: "boolean" },
        ],
        query: {
          search: true,
          filterFields: ["accountType", "addonRole", "enabled"],
          sorting: "single",
          pagination: "offset",
          total: true,
        },
        actions: [
          {
            key: "delete", title: "Delete", scope: "row",
            disabledWhen: { match: "any", conditions: [
              { source: "controller", controllerAddress: createPhiUserManagementControllerAddress(), valuePath: "permissions.readOnly", operator: "truthy" },
              { source: "row", valuePath: "self", operator: "truthy" },
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
  /*
   * What this Site lets Add-ons read of people with nobody acting (`users:v1` background access), how
   * long it keeps the access log, and the log itself (phis-server `/api/site/admin/users-access`, Site
   * Admin only; Core refuses everybody else whatever a Table offers). A grant is the Admin's decision per
   * Add-on and Site, so the Table grants what the manifest asks, or withdraws it; it never widens it.
   */
  {
    key: PHI_USER_MANAGEMENT_RUNTIME_DATA_PROVIDER_KEYS.usersAccess,
    ownerModuleId: PHI_USER_MANAGEMENT_RUNTIME_MODULE_ID,
    kind: "table",
    executionMode: "live",
    authoringMode: "none",
    title: "People data access",
    description: "Which Add-ons read people in the background, the access log and how long it is kept.",
    resources: [
      {
        resourceKey: PHI_USER_MANAGEMENT_USERS_ACCESS_RESOURCE_KEYS.addons,
        title: "Add-ons reading people",
        rowIdentityPath: "addonId",
        fields: [
          { key: "addonId", title: "Add-on", type: "string", required: true },
          ...(["fields", "background", "granted", "effective", "awaiting"] as const).map((key) => ({
            key,
            title: key,
            type: "enum[]" as const,
            options: PHIS_USER_FIELDS.map((value) => ({ value, label: value })),
          })),
          { key: "grantedAt", title: "Granted", type: "datetime" },
          { key: "grantedByUserId", title: "Granted by", type: "number" },
          // What the two acts apply to: something asked and not granted, and a grant to withdraw.
          { key: "hasAwaiting", title: "Fields awaiting a grant", type: "boolean" },
          { key: "hasGrant", title: "Granted", type: "boolean" },
        ],
        query: { search: false, filterFields: [], sorting: "none", pagination: "none" },
        actions: [
          {
            key: "grant",
            title: "Grant what is asked",
            scope: "row",
            intent: "write",
            confirmation: "required",
            disabledWhen: { source: "row", valuePath: "hasAwaiting", operator: "falsy" },
          },
          {
            key: "revoke",
            title: "Withdraw",
            scope: "row",
            intent: "destructive",
            confirmation: "required",
            disabledWhen: { source: "row", valuePath: "hasGrant", operator: "falsy" },
          },
        ],
      },
      {
        // One row, so the number is edited where it is read, as a quota is on the Media settings.
        resourceKey: PHI_USER_MANAGEMENT_USERS_ACCESS_RESOURCE_KEYS.retention,
        title: "Access log retention",
        rowIdentityPath: "id",
        fields: [
          { key: "id", title: "ID", type: "string", required: true },
          { key: "days", title: "Days kept", type: "number", mutable: true, constraints: { min: 1, max: 3650, step: 1, precision: 0 } },
        ],
        query: { search: false, filterFields: [], sorting: "none", pagination: "none" },
      },
      {
        resourceKey: PHI_USER_MANAGEMENT_USERS_ACCESS_RESOURCE_KEYS.log,
        title: "Access log",
        rowIdentityPath: "key",
        fields: [
          { key: "key", title: "Entry", type: "string", required: true },
          { key: "at", title: "At", type: "datetime" },
          { key: "addonId", title: "Add-on", type: "string" },
          { key: "actor", title: "Acting", type: "string" },
          {
            key: "road",
            title: "Road",
            type: "enum",
            options: ["staff", "self", "background", "checkout"].map((value) => ({ value, label: value })),
          },
          {
            key: "operation",
            title: "Operation",
            type: "enum",
            options: ["describe", "addresses", "createAddress", "fileOf", "customerFile"].map((value) => ({ value, label: value })),
          },
          { key: "subjects", title: "Subjects", type: "json" },
          { key: "addressIds", title: "Addresses", type: "json" },
          {
            key: "fields",
            title: "Fields",
            type: "enum[]",
            options: PHIS_USER_FIELDS.map((value) => ({ value, label: value })),
          },
        ],
        // Newest first and no count: Core pages the log and says nothing of how long it is.
        query: { search: false, filterFields: ["subject", "addonId"], sorting: "none", pagination: "offset", total: false },
      },
    ],
  },
] satisfies readonly PhiRuntimeModuleDataProviderDescriptor[];
