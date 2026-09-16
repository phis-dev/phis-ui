import { PHI_CORE_RUNTIME_MODULE_THEMES } from "../area-base-presets";
import { PHI_CORE_RUNTIME_MODULE_ID } from "../core/ids";
import { readAllPhiSiteModuleServerAreaContributions } from "../site-module-contributions";
import type { PhiSiteModuleServerAreaContributions } from "../site-modules";
import type { PhiCmsThemeDescriptorContribution } from "../../../types/cms-module-descriptors";
import { PHI_THEME_RUNTIME_MODULE_BLOCKS } from "./block-descriptors";
import { PHI_THEME_RUNTIME_MODULE_ID } from "./ids";

/**
 * The first-party Theme descriptors, straight from the lists the Modules' catalog entries use.
 *
 * Not read off a catalog entry, because an entry is a Module's `server.ts`, and that file also names
 * the Module's Widget plugins: whatever reaches it reaches their Client halves. The descriptor lists
 * themselves import nothing a browser would load. `validate-module-descriptors` holds this list equal to
 * what the Builder's catalog compiles, so a Module that starts shipping Themes cannot be missed here.
 */
export const PHI_FIRST_PARTY_THEME_DESCRIPTOR_CONTRIBUTIONS = [
  { moduleId: PHI_CORE_RUNTIME_MODULE_ID, themes: PHI_CORE_RUNTIME_MODULE_THEMES },
  { moduleId: PHI_THEME_RUNTIME_MODULE_ID, themeBlocks: PHI_THEME_RUNTIME_MODULE_BLOCKS },
] as const satisfies readonly PhiCmsThemeDescriptorContribution[];

/**
 * Every Theme descriptor this Site installed: the first-party ones plus what its own Modules ship.
 *
 * The Site's Modules arrive as the projection the Skeleton hands in. Their entries are read for the two
 * Theme fields only; the projection is already imported by every Area host, so reading it here adds no
 * Module code to any route.
 */
export function collectPhiThemeDescriptorContributions(
  siteModules: PhiSiteModuleServerAreaContributions = {},
): readonly PhiCmsThemeDescriptorContribution[] {
  return [
    ...PHI_FIRST_PARTY_THEME_DESCRIPTOR_CONTRIBUTIONS,
    ...readAllPhiSiteModuleServerAreaContributions(siteModules).map((contribution) => ({
      moduleId: contribution.moduleId,
      themes: contribution.catalogEntry.themes,
      themeBlocks: contribution.catalogEntry.themeBlocks,
    })),
  ];
}
