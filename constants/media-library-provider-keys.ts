import { createPhiSharedRuntimeDataProviderKey } from "./runtime-data-provider-key";

/**
 * The Media library as a Foundation contract.
 *
 * A Widget that offers an image picker has to name the Provider it reads -- in its
 * `requiredDataProviders`, or in a `dataSource` its config carries -- so the tree scan mounts it. Naming
 * it used to mean importing `plugins/runtime-modules/asset/ids`, and a Module importing another Module
 * is forbidden: it binds the two at compile time, so Theme stopped building without the Asset Module
 * rather than losing one picker. An installed package cannot reach that file at all.
 *
 * So the name lives here and the answer stays in the Module. Whoever wants a picker cites these keys;
 * whether anything serves them is decided by the installation, and a Widget whose Provider is absent
 * degrades to an empty library rather than failing to compile. That is the whole difference between
 * depending on a Module and depending on a capability.
 *
 * This is not ownership: `constants/runtime-module-ownership.ts` still records the Asset Module as the
 * owner, and these keys still read `@phis/ui/modules/asset/...`. The Foundation states the contract,
 * never the implementation, and holds no reference to the Module that meets it.
 */
export const PHI_MEDIA_LIBRARY_DATA_PROVIDER_KEYS = {
  collection: createPhiSharedRuntimeDataProviderKey("collections", "media"),
  folders: createPhiSharedRuntimeDataProviderKey("options", "media-folders"),
} as const;
