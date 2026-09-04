import type { PhiCmsAreaKey } from "../../../constants/cms-areas";
import { resolvePhiCmsActiveNavigationSurfaces } from "../../../plugins/runtime-modules/descriptor-compiler";
import type {
  PhiCmsCompiledDescriptorCatalog,
  PhiRuntimeModuleId,
} from "../../../types/cms-module-descriptors";
import type { PhiBlockRuntime } from "../../../types";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../types/cms";
import {
  buildPhiCmsEmptyPageTree,
  buildPhiCmsRedirectPageTree,
  findFirstPhiCmsNavigationLinkPath,
} from "./navigation-redirect";

/**
 * The default an Area root resolves to.
 *
 * An Area root is drawn without the Shell around it, which makes it a landing page and nothing else.
 * That is right for Public, where the front door is the site's own page, and wrong everywhere a
 * person arrives to work: App, Accounting, Admin, Editor and Builder have a destination, and the root
 * belongs in front of it rather than pretending to be it.
 *
 * The destination is read from the Area's own navigation rather than named as a path, because the
 * page it should land on is Module-carried: the Dashboard contributes the first sidebar entry in every
 * one of those Areas, and switching that Module off has to move the root rather than break it. Taking
 * the first entry the current viewer may actually see keeps that true for access as well as for
 * Module selection.
 *
 * This is a preset, not the mechanism: once `preset.config.shell.rootRoute` exists a Builder names
 * their own target here, and what this function computes becomes the default that ships.
 */
export function buildPhiAreaRootRedirectTree({
  page,
  runtime,
  catalog,
  activeModuleIds,
  area,
  navKey,
  title,
}: {
  page: PhiCmsPageNode;
  runtime: PhiBlockRuntime;
  catalog: PhiCmsCompiledDescriptorCatalog;
  activeModuleIds: ReadonlySet<PhiRuntimeModuleId>;
  area: PhiCmsAreaKey;
  navKey: string;
  title: string;
}): PhiResolvedCmsPageTree {
  const surface = resolvePhiCmsActiveNavigationSurfaces({
    catalog,
    area,
    activeModuleIds,
    viewer: runtime.viewer,
  }).find((candidate) => candidate.navKey === navKey);
  const targetPath = surface
    ? findFirstPhiCmsNavigationLinkPath(surface.items, page.path)
    : null;

  return targetPath
    ? buildPhiCmsRedirectPageTree({ page, area, path: targetPath, title })
    : buildPhiCmsEmptyPageTree({ page, title });
}
