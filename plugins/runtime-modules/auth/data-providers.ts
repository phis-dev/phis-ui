import type { PhiRuntimeModuleDataProviderDescriptor } from "../contracts";
import { PHI_AUTH_RUNTIME_DATA_PROVIDER_KEYS } from "./ids";
import { PHI_AUTH_RUNTIME_MODULE_ID } from "./ids";

export const PHI_AUTH_RUNTIME_DATA_PROVIDER_DESCRIPTORS = [
  {
    key: PHI_AUTH_RUNTIME_DATA_PROVIDER_KEYS.installations,
    ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID,
    kind: "table",
    executionMode: "live",
    authoringMode: "none",
    title: "Auth provider installations",
    description: "Identity provider installations of the current site (AUTHENTICATION.md section 8).",
    resources: [
      {
        resourceKey: "installations",
        title: "Provider installations",
        rowIdentityPath: "installationKey",
        recordRead: true,
        fields: [
          { key: "installationKey", title: "Installation", type: "string", required: true },
          { key: "providerKey", title: "Provider", type: "string", required: true },
          { key: "clientId", title: "Client ID", type: "string" },
          { key: "tenant", title: "Tenant", type: "string" },
          { key: "enabled", title: "Installation enabled", type: "boolean", mutable: true },
          { key: "loginEnabled", title: "Offer on login", type: "boolean", mutable: true },
          { key: "sortOrder", title: "Order", type: "number" },
          { key: "secretStatus", title: "Secret", type: "string" },
          { key: "validationStatus", title: "Validation", type: "string" },
          { key: "callbackUri", title: "Callback URI", type: "string" },
          { key: "linkedIdentities", title: "Linked identities", type: "number" },
        ],
        query: {
          search: false,
          filterFields: [],
          sorting: "none",
          pagination: "none",
        },
        actions: [
          { key: "refresh", title: "Refresh", scope: "resource" },
          { key: "test", title: "Test", scope: "row" },
          {
            key: "delete",
            title: "Delete",
            scope: "row",
            intent: "destructive",
            confirmation: "required",
          },
        ],
      },
    ],
  },
] satisfies readonly PhiRuntimeModuleDataProviderDescriptor[];
