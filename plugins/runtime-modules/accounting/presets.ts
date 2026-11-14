import type {
  PhiCmsAreaShellPresetDescriptor,
  PhiCmsDescriptorBuildContext,
  PhiCmsRoutePresetDescriptor,
} from "../../../types/cms-module-descriptors";
import { PHI_BASE_PAGE_LAYOUT_VERSION } from "../../../components/regions/presets/phi-base-page-layout";
import { buildPhiAreaRootRoutePresetDescriptor } from "../area-root-route";
import { PhiCmsRegionType } from "../../../constants/phi-cms";
import { PHI_DEFAULT_PUB_AREA_COMPOSITION_NODE_KEYS } from "../preset-contracts/pub-area";
import { PHI_ACCOUNTING_RUNTIME_MODULE_ID } from "./ids";

/* What the Accounting base Module brings: the Site shell for its Area, the Area root and the overview. */

export const PHI_ACCOUNTING_RUNTIME_MODULE_AREA_SHELLS = [
  {
    ownerModuleId: PHI_ACCOUNTING_RUNTIME_MODULE_ID,
    presetKey: "accounting-area-preset",
    shellPresetVersion: 1,
    area: "accounting",
    /*
     * A staff Area's shell, composed as the Admin's is: the Site's shell without its header and footer,
     * and the header bar and sidebar over it. It used to be the Site's shell alone, which left
     * `accounting:sidebar` drawn nowhere.
     */
    loadTree: async ({ page, runtime }: PhiCmsDescriptorBuildContext) => {
      const [
        { buildPhiDefaultSiteAreaPresetTree },
        { buildPhiDefaultAccountingAreaPresetTree },
        { mergePhiCmsShellTrees, omitPhiCmsShellCompositionNodes },
      ] = await Promise.all([
        import("../phi-default-site-area-preset-tree"),
        import("./trees/phi-default-accounting-area-preset-tree"),
        import("../shell-tree-composition"),
      ]);
      const [base, overlay] = await Promise.all([
        buildPhiDefaultSiteAreaPresetTree({
          page,
          runtime,
          presetKey: "accounting-area-preset",
          ownerModuleId: PHI_ACCOUNTING_RUNTIME_MODULE_ID,
          runtimeModuleArea: "accounting",
        }),
        buildPhiDefaultAccountingAreaPresetTree({ page, runtime }),
      ]);
      return mergePhiCmsShellTrees(
        omitPhiCmsShellCompositionNodes(
          base,
          { ownerModuleId: PHI_ACCOUNTING_RUNTIME_MODULE_ID, presetKey: "accounting-area-preset" },
          [PhiCmsRegionType.HeaderTop, PhiCmsRegionType.HeaderMain, PhiCmsRegionType.Footer],
          PHI_DEFAULT_PUB_AREA_COMPOSITION_NODE_KEYS,
        ),
        overlay,
      );
    },
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
