import { createPhiSharedRuntimeDataProviderKey } from "./runtime-data-provider-key";

/**
 * Staff's customer file on one member (phis-server `GET /api/site/members/{userId}/file`) as a Foundation
 * contract, on the terms of `thread-library-provider-keys.ts`: the conversations Module answers the Table
 * Provider (`constants/runtime-module-ownership.ts`), and a Page of another Module binds it by these names
 * without importing the conversations Module -- the Accounting Module's customer file does, and a Module
 * offering its own file over the same Core route (Support's, for a Supporter) does the same. Whether
 * anything answers the key is decided by the installation: the conversations Module must be active in the
 * Area the Page stands in.
 */
export const PHI_CUSTOMER_FILE_DATA_PROVIDER_KEYS = {
  table: createPhiSharedRuntimeDataProviderKey("tables", "threads-customer-file"),
  /**
   * The member's addresses as tiles (a Collection drawn by `PHI_SITE_ADDRESS_ITEM_RENDERER_KEY`), read-only,
   * from the same read: the member arrives as the binding param `userId` (`PHI_CUSTOMER_FILE_MEMBER_PARAM`),
   * which the Conversations Controller forwards from the person Table's choice.
   */
  addresses: createPhiSharedRuntimeDataProviderKey("collections", "threads-customer-file-addresses"),
} as const;

/**
 * The resources, each one answer of the same route read for one member: the Table Provider's person and
 * threads, and the addresses Collection's addresses.
 */
export const PHI_CUSTOMER_FILE_RESOURCE_KEYS = {
  person: "person",
  addresses: "addresses",
  threads: "threads",
} as const;

/** The binding param the addresses Collection reads its member from: `{ params: { userId } }`. */
export const PHI_CUSTOMER_FILE_MEMBER_PARAM = "userId";

/**
 * The binding param a customer file Page writes its sentence for the reader's own file into, already in the
 * reader's language: Core refuses that file (`403`), and each Table says this where its rows would be.
 */
export const PHI_CUSTOMER_FILE_OWN_FILE_PARAM = "ownFileNotice";
