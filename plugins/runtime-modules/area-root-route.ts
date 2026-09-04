import type { PhiCmsAreaKey } from "../../constants/cms-areas";
import type { PhiViewerAccessPolicy } from "../../types/access";
import type {
  PhiCmsRoutePresetDescriptor,
  PhiRuntimeModuleId,
} from "../../types/cms-module-descriptors";

/**
 * The root route of an Area that is not a landing page.
 *
 * Every Area root is drawn without the Shell, which leaves exactly two honest things it can be: the
 * site's own landing page, or a forward to the page a person came for. Public is the first; every
 * Area behind a sign-in is the second, and they differ only in which Module owns the root and which
 * navigation surface names the destination.
 *
 * The Area's base Module owns it rather than the Module it forwards to, because the root outlives any
 * one Module: switching the Dashboard off has to move the destination, not delete the front door.
 */
export function buildPhiAreaRootRoutePresetDescriptor({
  ownerModuleId,
  area,
  navKey,
  title,
  accessPolicy,
}: {
  ownerModuleId: PhiRuntimeModuleId;
  area: PhiCmsAreaKey;
  navKey: `${PhiCmsAreaKey}:${string}`;
  title: string;
  accessPolicy?: PhiViewerAccessPolicy;
}): PhiCmsRoutePresetDescriptor {
  return {
    ownerModuleId,
    presetKey: `${area}-root-page`,
    presetVersion: 1,
    area,
    pageKey: "root",
    title,
    path: "/",
    ...(accessPolicy ? { accessPolicy } : {}),
    loadTree: ({ page, runtime, catalog, activeModuleIds }) =>
      import("../../components/regions/presets/phi-area-root-redirect-tree")
        .then((module) => module.buildPhiAreaRootRedirectTree({
          page,
          runtime,
          catalog,
          activeModuleIds,
          area,
          navKey,
          title,
        })),
  };
}
