/**
 * What a Module is for, as an operator reads it on the Modules page.
 *
 * A closed list rather than free text, because free text produced a bijection: every one of the
 * eighteen built-in Modules answered the field with its own name, so the column repeated the title it
 * stood next to and no Add-on could have guessed a value another Module already used. Six answers
 * group the built-ins without splitting any of them, and an Add-on that fits none says `other` rather
 * than inventing a nineteenth. `commerce` is the one value no built-in claims: the built-ins are all
 * infrastructure, so a list drawn from them alone would have had a shop nowhere to go.
 *
 * An Area's base Module is `foundation` whatever the Area does, because it is not a Module the
 * operator chose -- it is the ground the Area stands on, and the row for it is the locked one.
 *
 * Distinct from `PHI_CMS_PLUGIN_CATEGORIES`, which files a Widget or Layout into a drawer of the
 * Builder's insert picker. That is a question about where a block is found, not about what a Module is.
 */
export const PHI_RUNTIME_MODULE_CATEGORIES = [
  "foundation",
  "workspace",
  "content",
  "commerce",
  "people",
  "operations",
  "other",
] as const;

export type PhiRuntimeModuleCategory = (typeof PHI_RUNTIME_MODULE_CATEGORIES)[number];

const PHI_RUNTIME_MODULE_CATEGORY_SET = new Set<string>(PHI_RUNTIME_MODULE_CATEGORIES);

export function isPhiRuntimeModuleCategory(value: unknown): value is PhiRuntimeModuleCategory {
  return typeof value === "string" && PHI_RUNTIME_MODULE_CATEGORY_SET.has(value);
}
