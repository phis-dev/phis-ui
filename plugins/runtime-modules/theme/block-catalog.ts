import {
  instantiatePhiCmsThemeBlocks,
  instantiatePhiCmsThemePresets,
  resolvePhiCmsDescriptorCatalog,
} from "../descriptor-compiler";
import { PHI_CORE_THEME_BLOCK_CATALOG } from "../../../theme/phi-theme-composition";
import type { PhiThemeBlockCatalog } from "../../../theme/phi-theme-composition";
import type { PhiRuntimeModuleCatalog, PhiRuntimeModuleId } from "../../../types/cms-plugins";

/**
 * Every Theme block a Site can choose from: the core ones, plus what its Modules ship.
 *
 * A Theme is site-wide, so this asks which Modules are installed rather than which are switched on in
 * one Area. A block from a Module that is present but idle is still a block somebody may follow, and
 * making the choice depend on the Area a page happens to be in would give the same Site two different
 * Themes.
 *
 * Core last in the merge order? No -- core first, so a Module can never take a core key away from the
 * Site that depends on it. Two Modules claiming one key is caught earlier, when the catalog is
 * compiled.
 */
export async function loadPhiThemeBlockCatalog(
  runtimeCatalog: PhiRuntimeModuleCatalog,
): Promise<PhiThemeBlockCatalog> {
  const descriptors = resolvePhiCmsDescriptorCatalog(runtimeCatalog);
  const moduleIds = new Set<PhiRuntimeModuleId>(runtimeCatalog.keys());
  const [palettes, blocks] = await Promise.all([
    instantiatePhiCmsThemePresets(descriptors, moduleIds),
    instantiatePhiCmsThemeBlocks(descriptors, moduleIds),
  ]);

  const merge = <T extends { key: string }>(core: readonly T[], contributed: readonly T[]) => [
    ...core,
    ...contributed.filter((block) => !core.some((entry) => entry.key === block.key)),
  ];

  return {
    palettes: merge(PHI_CORE_THEME_BLOCK_CATALOG.palettes, palettes),
    styles: merge(PHI_CORE_THEME_BLOCK_CATALOG.styles, blocks.styles),
    grounds: merge(PHI_CORE_THEME_BLOCK_CATALOG.grounds, blocks.grounds),
    fonts: merge(PHI_CORE_THEME_BLOCK_CATALOG.fonts, blocks.fonts),
    sets: merge(PHI_CORE_THEME_BLOCK_CATALOG.sets, blocks.sets),
  };
}
