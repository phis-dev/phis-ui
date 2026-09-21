import type { PhiCmsThemeBlockDescriptor } from "../../../types/cms-module-descriptors";

/**
 * The Theme blocks this Module contributes, which are none.
 *
 * The core palette, style and fonts are shipped elsewhere; what stood here was a ground and a Set
 * built on a photograph, and a photograph is somebody's brand rather than a default. A Module that
 * every installation runs on should carry nothing anybody has to undo.
 *
 * The list stays, empty, because it is the seam a Module contributes blocks through, and the two
 * places that read it read it whether or not there is anything in it. What the shape is for, once
 * something is added again: blocks load on demand, which is what keeps a ground's picture out of every
 * bundle that merely knows the Module exists, and the metadata here must agree with the block behind
 * the loader -- the catalog checks it on instantiation, so a rename cannot silently leave a Site
 * following a key that resolves elsewhere.
 */
export const PHI_THEME_RUNTIME_MODULE_BLOCKS = [] satisfies readonly PhiCmsThemeBlockDescriptor[];
