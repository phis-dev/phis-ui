import type {
  PhiCmsAreaShellPresetDescriptor,
  PhiCmsDescriptorBuildContext,
  PhiCmsRoutePresetDescriptor,
} from "../../../types/cms-module-descriptors";
import { PHI_BASE_PAGE_LAYOUT_VERSION } from "../../../components/regions/presets/phi-base-page-layout";
import { buildPhiAreaRootRoutePresetDescriptor } from "../area-root-route";
import { PHI_ACCOUNTING_RUNTIME_MODULE_ID } from "./ids";

/* What the Accounting base Module brings: the Site shell for its Area, the Area root and the overview. */

export const PHI_ACCOUNTING_RUNTIME_MODULE_AREA_SHELLS = [
  {
    ownerModuleId: PHI_ACCOUNTING_RUNTIME_MODULE_ID,
    presetKey: "accounting-area-preset",
    shellPresetVersion: 1,
    area: "accounting",
    loadTree: ({ page, runtime }: PhiCmsDescriptorBuildContext) =>
      import("../phi-default-site-area-preset-tree")
        .then((module) => module.buildPhiDefaultSiteAreaPresetTree({
          page,
          runtime,
          presetKey: "accounting-area-preset",
          ownerModuleId: PHI_ACCOUNTING_RUNTIME_MODULE_ID,
          runtimeModuleArea: "accounting",
        })),
  },
] satisfies readonly PhiCmsAreaShellPresetDescriptor[];

export const PHI_ACCOUNTING_RUNTIME_MODULE_ROUTES = [
  buildPhiAreaRootRoutePresetDescriptor({
    ownerModuleId: PHI_ACCOUNTING_RUNTIME_MODULE_ID,
    area: "accounting",
    title: "Accounting",
  }),
  {
    ownerModuleId: PHI_ACCOUNTING_RUNTIME_MODULE_ID,
    presetKey: "accounting-overview-page",
    presetVersion: 1 + PHI_BASE_PAGE_LAYOUT_VERSION,
    area: "accounting",
    title: "Overview",
    path: "/overview",
    loadTree: ({ page, runtime }: PhiCmsDescriptorBuildContext) =>
      import("./trees/phi-default-accounting-page-tree")
        .then((module) => module.buildPhiDefaultAccountingPageTree({ page, runtime })),
  },
] satisfies readonly PhiCmsRoutePresetDescriptor[];
