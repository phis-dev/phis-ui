import type {
  PhiCmsAreaShellPresetDescriptor,
  PhiCmsDescriptorBuildContext,
  PhiCmsRoutePresetDescriptor,
} from "../../../types/cms-module-descriptors";
import { buildPhiAreaRootRoutePresetDescriptor } from "../area-root-route";
import { buildPhiSidebarRoutePresetDescriptor } from "../sidebar-route";
import { PhiCmsRegionType } from "../../../constants/phi-cms";
import { PHI_DEFAULT_PUB_AREA_COMPOSITION_NODE_KEYS } from "../preset-contracts/pub-area";
import { PHI_ACCOUNTING_PRODUCTS_PAGE_PRESET_KEY, PHI_ACCOUNTING_RUNTIME_MODULE_ID } from "./ids";

/*
 * What the Accounting base Module brings: the Site shell for its Area, the Area root, and the Site's
 * product directory. The root lands on the first sidebar entry a viewer can see -- the Dashboard
 * Module's where it is on, the directory where it is not.
 */

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
  /*
   * The product directory, the Area's own Page: every supplier Add-on's products land in it, so it
   * belongs to none of them, and it works with no shop at all (phis-server SERVER_ADDONS.md,
   * `products:v1`). Whoever the Area lets in holds Core's `accounting` access, which is what Core asks
   * of every request the Page makes.
   */
  buildPhiSidebarRoutePresetDescriptor({
    area: "accounting",
    anchor: "main",
    ownerModuleId: PHI_ACCOUNTING_RUNTIME_MODULE_ID,
    presetKey: PHI_ACCOUNTING_PRODUCTS_PAGE_PRESET_KEY,
    title: "Products",
    path: "/products",
    itemKey: "@phis/ui/modules/accounting/nav/accounting/products",
    icon: "antd:appstore",
    loadTree: ({ page, runtime }) =>
      import("./trees/phi-default-accounting-products-page-tree")
        .then((module) => module.buildPhiDefaultAccountingProductsPageTree({ page, runtime })),
  }),
] satisfies readonly PhiCmsRoutePresetDescriptor[];
