import type { PhiRuntimeModuleDataProviderDescriptor } from "../contracts";
import { PHI_SITE_ADDRESS_ITEM_RENDERER_KEY } from "../../../constants/site-address";
import { PHI_SIGNAL_VALUE_SCHEMAS } from "../../../types/signals";
import {
  PHI_APP_ADDRESSES_DATA_PROVIDER_KEY,
  PHI_APP_ADDRESSES_RESOURCE_KEY,
  PHI_APP_RUNTIME_MODULE_ID,
} from "./ids";

/**
 * The account's own address book on this Site (`users:v1`, phis-server SERVER_ADDONS.md): the current
 * addresses only, never a `Superseded` or `Removed` one, as Core's address tiles draw them
 * (`PHI_SITE_ADDRESS_ITEM_RENDERER_KEY`, COLLECTIONS.md "The address renderer").
 *
 * `live` and `authoringMode: "none"`: they are the signed-in person's, and nobody composing a Page has any
 * business reading them. An address never changes in Core -- a change is a new version that replaces it --
 * so the item's id moves with every edit, which is why every write answers the list read again. Adding and
 * changing are the Module's two Forms, opened by the toolbar's `create` and a tile's `edit` (the change
 * Form reads the address through `readRecord`); removing and the two defaults are the Provider's actions.
 * A chosen address is `{ addressId }` (`selectionValueSchema`), prepared for the Shop's checkout.
 */
export const PHI_APP_RUNTIME_DATA_PROVIDER_DESCRIPTORS = [
  {
    key: PHI_APP_ADDRESSES_DATA_PROVIDER_KEY,
    ownerModuleId: PHI_APP_RUNTIME_MODULE_ID,
    kind: "collection",
    executionMode: "live",
    authoringMode: "none",
    title: "My addresses",
    description: "The signed-in person's current billing and shipping addresses on this Site.",
    resources: [
      {
        resourceKey: PHI_APP_ADDRESSES_RESOURCE_KEY,
        title: "Addresses",
        itemIdentityPath: "id",
        itemRendererKey: PHI_SITE_ADDRESS_ITEM_RENDERER_KEY,
        selectionValueSchema: PHI_SIGNAL_VALUE_SCHEMAS.siteAddressSelection,
        recordRead: true,
        defaultForWidget: true,
        query: { search: false, pagination: false },
        actions: [
          { key: "create", title: "Add address", scope: "resource" },
          { key: "edit", title: "Change", scope: "item" },
          { key: "makeDefaultBilling", title: "Use for billing by default", scope: "item" },
          { key: "makeDefaultShipping", title: "Use for shipping by default", scope: "item" },
          { key: "delete", title: "Remove", scope: "item" },
        ],
      },
    ],
  },
] satisfies readonly PhiRuntimeModuleDataProviderDescriptor[];
