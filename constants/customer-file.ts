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
} as const;

/** The Provider's three resources, each one answer of the same route read for one member. */
export const PHI_CUSTOMER_FILE_RESOURCE_KEYS = {
  person: "person",
  addresses: "addresses",
  threads: "threads",
} as const;

/** The binding param a customer file Page writes the file's own subject into, already in the reader's language. */
export const PHI_CUSTOMER_FILE_SUBJECT_PARAM = "fileSubject";
