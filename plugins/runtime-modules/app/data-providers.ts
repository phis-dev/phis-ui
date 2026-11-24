import type { PhiRuntimeModuleDataProviderDescriptor } from "../contracts";
import {
  PHI_APP_ADDRESSES_DATA_PROVIDER_KEY,
  PHI_APP_ADDRESSES_RESOURCE_KEY,
  PHI_APP_RUNTIME_MODULE_ID,
} from "./ids";

/** What an address is for, as the Table's tags name it; the bits are `PhisSiteAddressFlags`. */
const PHI_APP_ADDRESS_PURPOSES = ["billing", "shipping", "defaultBilling", "defaultShipping"] as const;

/**
 * The account's own address book on this Site (`users:v1`, phis-server SERVER_ADDONS.md): the current
 * addresses only, never a `Superseded` or `Removed` one.
 *
 * `live` and `authoringMode: "none"`: they are the signed-in person's, and nobody composing a Page has any
 * business reading them. An address never changes in Core -- a change is a new version that replaces it --
 * so the row's id moves with every edit, which is why every write reads the view again. Adding and editing
 * are the Module's two Forms; the Table runs removal and the two defaults itself.
 */
export const PHI_APP_RUNTIME_DATA_PROVIDER_DESCRIPTORS = [
  {
    key: PHI_APP_ADDRESSES_DATA_PROVIDER_KEY,
    ownerModuleId: PHI_APP_RUNTIME_MODULE_ID,
    kind: "table",
    executionMode: "live",
    authoringMode: "none",
    title: "My addresses",
    description: "The signed-in person's current billing and shipping addresses on this Site.",
    resources: [
      {
        resourceKey: PHI_APP_ADDRESSES_RESOURCE_KEY,
        title: "Addresses",
        rowIdentityPath: "id",
        recordRead: true,
        fields: [
          { key: "id", title: "ID", type: "number", required: true },
          { key: "name", title: "Name", type: "string" },
          { key: "companyName", title: "Company", type: "string" },
          { key: "line1", title: "Address line 1", type: "string" },
          { key: "line2", title: "Address line 2", type: "string" },
          { key: "postalCode", title: "Postal code", type: "string" },
          { key: "city", title: "City", type: "string" },
          { key: "region", title: "Region", type: "string" },
          { key: "country", title: "Country", type: "string" },
          // The parts after the name on one line, for a list that is read rather than edited.
          { key: "lines", title: "Address", type: "string" },
          {
            key: "purposes",
            title: "Purposes",
            type: "enum[]",
            options: PHI_APP_ADDRESS_PURPOSES.map((value) => ({ value, label: value })),
          },
          { key: "billing", title: "Billing", type: "boolean" },
          { key: "shipping", title: "Shipping", type: "boolean" },
          { key: "defaultBilling", title: "Default billing", type: "boolean" },
          { key: "defaultShipping", title: "Default shipping", type: "boolean" },
          { key: "createdAt", title: "Added", type: "datetime" },
        ],
        query: { search: false, filterFields: [], sorting: "none", pagination: "none" },
        actions: [
          {
            key: "makeDefaultBilling",
            title: "Use for billing by default",
            scope: "row",
            intent: "write",
            disabledWhen: { match: "any", conditions: [
              { source: "row", valuePath: "defaultBilling", operator: "truthy" },
            ] },
          },
          {
            key: "makeDefaultShipping",
            title: "Use for shipping by default",
            scope: "row",
            intent: "write",
            disabledWhen: { match: "any", conditions: [
              { source: "row", valuePath: "defaultShipping", operator: "truthy" },
            ] },
          },
          { key: "delete", title: "Remove", scope: "row", intent: "destructive", confirmation: "required" },
        ],
      },
    ],
  },
] satisfies readonly PhiRuntimeModuleDataProviderDescriptor[];
