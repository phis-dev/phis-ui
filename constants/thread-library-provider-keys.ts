import {
  createPhiSharedRuntimeDataProviderKey,
  createPhiSharedRuntimeItemRendererKey,
} from "./runtime-data-provider-key";

/**
 * Conversations as a Foundation contract, on the same terms as the Media library.
 *
 * A Preset that places an inbox has to name the Provider it reads, and a Module offering its own card
 * for a conversation has to name what it is standing in for. Both are done from here, so neither means
 * importing `plugins/runtime-modules/threads/ids`: a Module importing another Module binds the two at
 * compile time, and Support would stop building the moment the conversations Module were absent.
 *
 * That is the point of a conversation being a Core row. Whether anything answers these keys is decided
 * by the installation; a Preset whose Provider is absent shows a bound Widget saying so, rather than
 * failing to compile.
 *
 * Ownership is unchanged: `constants/runtime-module-ownership.ts` records the conversations Module, and
 * the keys read `@phis/ui/modules/threads/...`. The Foundation states the contract and holds no
 * reference to whoever meets it.
 */
export const PHI_THREAD_LIBRARY_DATA_PROVIDER_KEYS = {
  collection: createPhiSharedRuntimeDataProviderKey("collections", "thread-inbox"),
} as const;

/**
 * The row that draws one conversation in a listing.
 *
 * Support will want its own -- a queue shows a state and an assignee that a conversation does not have
 * -- and it says so by citing this key in `collectionItemRenderers`, never by touching the Module that
 * ships the default.
 */
export const PHI_THREAD_LIBRARY_ITEM_RENDERER_KEY =
  createPhiSharedRuntimeItemRendererKey("thread-summary");
