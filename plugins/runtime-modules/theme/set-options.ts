import type { PhiControlOption } from "../../../components/controls/phi-control-options";
import { PHI_CORE_THEME_SETS } from "../../../theme/phi-theme-blocks";
import type { PhiCmsCompiledDescriptorCatalog } from "../../../types/cms-module-descriptors";

/**
 * The Sets the Theme workspace offers: the core ones, then those the installed Modules ship.
 *
 * One function for the two places that state the list -- the Page tree, which renders it first, and
 * the Controller's preload, which states it again whenever the stored Theme changes. The Controller
 * replaces the whole list, so both have to arrive at the same one. Read off the descriptors rather
 * than the loaded blocks: a title is all a select needs, and nothing has to be imported for it.
 *
 * Installed, not active in this Area. A Theme is site-wide and its block catalog is read from the
 * installed union (theme/block-catalog.ts); the workspace lives in the Builder, which is not an Area a
 * Site's own Module is ever switched on in, so a list filtered by the Builder's active Modules held
 * only the core Sets. The two callers used to disagree on exactly this -- the tree filtered, the
 * preload did not -- and the difference showed the moment a save re-rendered the tree: every Module's
 * Set that the Controller had put into the select dropped out of it again.
 */
export function buildPhiThemeSetSelectOptions(catalog: PhiCmsCompiledDescriptorCatalog): PhiControlOption[] {
  const contributed = [...catalog.themeBlockByKey.values()]
    .map(({ descriptor }) => descriptor)
    .filter((descriptor) =>
      descriptor.blockKind === "set" &&
      !PHI_CORE_THEME_SETS.some((set) => set.key === descriptor.blockKey),
    );

  return [
    ...PHI_CORE_THEME_SETS.map((set) => ({ value: set.key, label: set.title, description: set.description })),
    ...contributed.map((descriptor) => ({
      value: descriptor.blockKey,
      label: descriptor.title,
      description: descriptor.description,
    })),
  ];
}
