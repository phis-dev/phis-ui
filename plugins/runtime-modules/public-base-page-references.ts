import { createPhiPageReference } from "../../types/references";
import { PHI_PUBLIC_BASE_PAGE_PRESET_KEYS } from "./area-base-presets";
import { PHI_PUBLIC_RUNTIME_MODULE_ID } from "./public/ids";

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
