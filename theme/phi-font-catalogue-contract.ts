/**
 * The part of the font catalogue that any tool may import.
 *
 * `phi-font-catalogue.ts` declares the core families through `next/font`, which is evaluated by a Next
 * build and throws anywhere else. Everything a Module's boundary or a verify script needs in order to
 * *state* a family -- the entry shape, the namespace rule, the names the core already claims -- lives
 * here, without a loader in sight, so that `@phis/ui/module` can validate a contribution outside Next.
 */

export type PhiFontCatalogueEntry = {
  /** The name a Theme writes in `fonts.body` and its siblings, and a fonts block names in a slot. */
  family: string;
  /** What that name resolves to in a `font-family` declaration. */
  cssVariable: string;
  /** The class that puts the variable in scope; belongs on the root element. */
  className: string;
};

/** The families phis-ui declares itself; a Module names them, it does not declare them again. */
export const PHI_CORE_FONT_FAMILIES: readonly string[] = ["Fira Sans", "Fira Mono", "Lora"];

/** The variable a contributed family must use: its own namespace, never a core one. */
export const PHI_MODULE_FONT_CSS_VARIABLE_PATTERN = /^var\(--phi-font-[a-z0-9]+(?:-[a-z0-9]+)+\)$/;
