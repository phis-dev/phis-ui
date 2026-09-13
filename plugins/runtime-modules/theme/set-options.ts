import type { PhiControlOption } from "../../../components/controls/phi-control-options";
import { PHI_CORE_THEME_SETS } from "../../../theme/phi-theme-blocks";
import type { PhiCmsCompiledDescriptorCatalog } from "../../../types/cms-module-descriptors";
import type { PhiRuntimeModuleId } from "../contracts";

/**
 * The Sets the Theme workspace offers: the core ones, then those the active Modules ship.
 *
 * One function for the two places that state the list -- the Page tree, which renders it first, and
 * the Controller's preload, which states it again whenever the stored Theme changes. The Controller
 * replaces the whole list, so both have to arrive at the same one. Read off the descriptors rather
 * than the loaded blocks: a title is all a select needs, and nothing has to be imported for it.
 */
export function buildPhiThemeSetSelectOptions(
  catalog: PhiCmsCompiledDescriptorCatalog,
  activeModuleIds: ReadonlySet<PhiRuntimeModuleId | string>,
): PhiControlOption[] {
  const contributed = [...catalog.themeBlockByKey.values()]
    .map(({ descriptor }) => descriptor)
    .filter((descriptor) =>
      descriptor.blockKind === "set" &&
      activeModuleIds.has(descriptor.ownerModuleId) &&
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
