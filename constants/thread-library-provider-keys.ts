import { createPhiSharedRuntimeDataProviderKey } from "./runtime-data-provider-key";

/**
 * Conversations as a Foundation contract, on the same terms as the Media library.
 *
 * A Preset that places an inbox has to name the Provider it reads, and a Module placing its own inbox
 * beside it has to name the same one. Both are done from here, so neither means importing
 * `plugins/runtime-modules/threads/ids`: a Module importing another Module binds the two at compile
 * time, and Support would stop building the moment the conversations Module were absent.
 *
 * That is the point of a conversation being a Core row. Whether anything answers this key is decided by
 * the installation; a Preset whose Provider is absent shows a bound Widget saying so, rather than
 * failing to compile.
 *
 * Core answers it (`constants/runtime-module-ownership.ts`, `@phis/ui/modules/core/...`), because messaging
 * is Core's: the conversations Module, Support, the groups and any add-on list their own kind of thread
 * through this one Provider with a fixed `kind` filter, and the conversation's Reply Form reads its thread
 * from it. The Foundation states the contract and holds no reference to whoever meets it.
 */
export const PHI_THREAD_LIBRARY_DATA_PROVIDER_KEYS = {
  table: createPhiSharedRuntimeDataProviderKey("tables", "thread-inbox"),
} as const;
