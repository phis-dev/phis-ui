import { PHI_THEME_RUNTIME_MODULE_ID } from "./ids";
import type { PhiCmsThemeBlockDescriptor } from "../../../types/cms-module-descriptors";

/**
 * The Theme blocks this Module contributes.
 *
 * Loaded on demand, which is what keeps a ground's picture out of every bundle that merely knows the
 * Module exists. The metadata here and the block behind the loader must agree; the catalog checks it
 * on instantiation, so a rename cannot silently leave a Site following a key that resolves elsewhere.
 */
export const PHI_THEME_RUNTIME_MODULE_BLOCKS = [
  {
    ownerModuleId: PHI_THEME_RUNTIME_MODULE_ID,
    presetKey: "theme-ground-alpine",
    presetVersion: 1,
    blockKind: "ground",
    blockKey: "alpine",
    title: "Alpine",
    description: "A photograph behind the Page, with a frosted frame over it.",
    loadBlock: () => import("./blocks/alpine").then((module) => module.PHI_THEME_ALPINE_GROUND),
  },
  {
    ownerModuleId: PHI_THEME_RUNTIME_MODULE_ID,
    presetKey: "theme-set-alpine",
    presetVersion: 1,
    blockKind: "set",
    blockKey: "alpine",
    title: "Alpine",
    description: "Evergreen colour over a mountain photograph.",
    loadBlock: () => import("./blocks/alpine").then((module) => module.PHI_THEME_ALPINE_SET),
  },
] satisfies readonly PhiCmsThemeBlockDescriptor[];
