import { createPhiPageReference } from "../../types/references";
import { PHI_SHARED_PACKAGE_NAME } from "../../constants/package";
import { createPhiRuntimeModuleId } from "../../constants/module-identity";

/**
 * The Public base Pages a package may link to, named once.
 *
 * A Module that points at one of them has to say which, and a string typed at the call site is the same
 * fragility as a path: nothing checks it, and a preset key that is renamed leaves a reference resolving
 * to nothing. The base descriptors in `area-base-presets.ts` read their keys from here, so the two
 * cannot drift.
 *
 * Kept apart from those descriptors on purpose. They import every base Page tree, and
 * `@phis/ui/references` hands these keys to package Modules: importing them from beside the trees made
 * every Module that linked to a base Page compile the whole first-party catalog with it.
 */
export const PHI_PUBLIC_BASE_PAGE_PRESET_KEYS = {
  welcome: "public-welcome-page",
  home: "public-home-page",
  terms: "public-terms-page",
  contact: "public-contact-page",
  unsubscribe: "public-unsubscribe-page",
} as const;

// Named by id, as data, for the same reason: `public/ids` would bind the door to the Module folder.
const PHI_PUBLIC_RUNTIME_MODULE_ID = createPhiRuntimeModuleId(PHI_SHARED_PACKAGE_NAME, "public");

/**
 * Ready-made references to the Pages every Site has, for a Module that links to one.
 *
 * The Public base brings a welcome, a home, terms and a contact Page, and a package Module may
 * reasonably point at any of them -- phis.dev's closing line does exactly that. Without this it would
 * either type a path, which goes stale and cannot say which Module's Page it means where one covers
 * another, or assemble a reference from a preset key it copied, which nothing checks.
 *
 * Computed rather than stored: a Module Page reference is a function of its identity alone, so these
 * cost nothing and can never disagree with the descriptors they are derived from.
 */
export const PHI_PUBLIC_BASE_PAGE_REFERENCES = Object.freeze(
  Object.fromEntries(
    Object.entries(PHI_PUBLIC_BASE_PAGE_PRESET_KEYS).map(([name, presetKey]) => [
      name,
      createPhiPageReference({
        kind: "module",
        ownerModuleId: PHI_PUBLIC_RUNTIME_MODULE_ID,
        presetKey,
      }),
    ]),
  ),
) as Readonly<Record<keyof typeof PHI_PUBLIC_BASE_PAGE_PRESET_KEYS, ReturnType<typeof createPhiPageReference>>>;
