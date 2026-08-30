import type { PhiRuntimeModuleDataProviderDescriptor } from "../contracts";
import { PHI_REVISIONS_RUNTIME_DATA_PROVIDER_KEYS } from "./ids";
import { PHI_REVISIONS_RUNTIME_MODULE_ID } from "./ids";

export const PHI_REVISIONS_RUNTIME_DATA_PROVIDER_DESCRIPTORS = [
  {
    key: PHI_REVISIONS_RUNTIME_DATA_PROVIDER_KEYS.bindings,
    ownerModuleId: PHI_REVISIONS_RUNTIME_MODULE_ID,
    kind: "options",
    executionMode: "live",
    authoringMode: "none",
    title: "Revision bindings",
    description: "Revision kind and scope choices for the active Builder area.",
  },
  {
    key: PHI_REVISIONS_RUNTIME_DATA_PROVIDER_KEYS.table,
    ownerModuleId: PHI_REVISIONS_RUNTIME_MODULE_ID,
    kind: "table",
    executionMode: "live",
    authoringMode: "none",
    title: "Revision tables",
    description: "Revision history and mutations exposed by the Revisions module.",
    resources: [{
      resourceKey: "history",
      title: "Revision history",
      rowIdentityPath: "revisionId",
      bindingFields: [
        {
          key: "kind",
          title: "Revision type",
          type: "enum",
          required: true,
          optionsProvider: {
            providerKey: PHI_REVISIONS_RUNTIME_DATA_PROVIDER_KEYS.bindings,
            params: { mode: "kind" },
          },
        },
        {
          key: "scopeKey",
          title: "Scope",
          type: "enum",
          required: true,
          optionsProvider: {
            providerKey: PHI_REVISIONS_RUNTIME_DATA_PROVIDER_KEYS.bindings,
            params: { mode: "scope", kindParam: "kind" },
          },
        },
      ],
      fields: [
        { key: "revisionId", title: "Revision ID", type: "number", required: true },
        { key: "revisionTags", title: "Revision", type: "json" },
        { key: "createdAt", title: "Created", type: "datetime" },
        { key: "createdByDisplay", title: "Created by", type: "string" },
        { key: "formattedMessage", title: "Message", type: "string" },
        { key: "reviewHref", title: "Review URL", type: "string" },
        { key: "deleteDisabled", title: "Delete disabled", type: "boolean" },
      ],
      query: { sorting: "none", pagination: "none" },
      actions: [
        { key: "restore", title: "Restore", scope: "row", intent: "write", confirmation: "required" },
        {
          key: "delete", title: "Delete", scope: "row",
          disabledWhen: { source: "row", valuePath: "deleteDisabled", operator: "truthy" },
          intent: "destructive",
          confirmation: "required",
        },
        { key: "deleteSelected", title: "Delete selected", scope: "selection", intent: "destructive", confirmation: "required" },
      ],
    }],
  },
] satisfies readonly PhiRuntimeModuleDataProviderDescriptor[];
