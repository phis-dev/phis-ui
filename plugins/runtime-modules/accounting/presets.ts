import type {
  PhiCmsAreaShellPresetDescriptor,
  PhiCmsDescriptorBuildContext,
  PhiCmsRoutePresetDescriptor,
} from "../../../types/cms-module-descriptors";
import { buildPhiAreaRootRoutePresetDescriptor } from "../area-root-route";
import { buildPhiSidebarRoutePresetDescriptor } from "../sidebar-route";
import { PhiCmsRegionType } from "../../../constants/phi-cms";
import { PHI_DEFAULT_PUB_AREA_COMPOSITION_NODE_KEYS } from "../preset-contracts/pub-area";
import type { PhiViewerAccessPolicy } from "../../../types/access";
import {
  PHI_ACCOUNTING_CUSTOMER_FILE_PAGE_PRESET_KEY,
  PHI_ACCOUNTING_PRODUCTS_PAGE_PRESET_KEY,
  PHI_ACCOUNTING_RUNTIME_MODULE_ID,
} from "./ids";
import { PHI_ACCOUNTING_CUSTOMER_FILE_ACCESS } from "./customer-file-access";

/*
 * What the Accounting base Module brings: the Site shell for its Area, the Area root, the Site's
 * product directory and staff's customer file. The root lands on the first sidebar entry a viewer can see -- the Dashboard
 * Module's where it is on, the customer file where it is not (the Module's entries stand in preset-key order).
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
    title: "Product directory",
    path: "/products",
    itemKey: "@phis/ui/modules/accounting/nav/accounting/products",
    icon: "antd:appstore",
    loadTree: ({ page, runtime }) =>
      import("./trees/phi-default-accounting-products-page-tree")
        .then((module) => module.buildPhiDefaultAccountingProductsPageTree({ page, runtime })),
  }),
  /*
   * Staff's customer file on one member, for the holders of `accounting`, whom the Area admits anyway:
   * the entry states the access as the Page and Core's route do. A Supporter's file is the Support
   * Module's own Page over the same Core route, not this one.
   */
  withPhiNavigationAccess(buildPhiSidebarRoutePresetDescriptor({
    area: "accounting",
    anchor: "main",
    ownerModuleId: PHI_ACCOUNTING_RUNTIME_MODULE_ID,
    presetKey: PHI_ACCOUNTING_CUSTOMER_FILE_PAGE_PRESET_KEY,
    title: "Customer file",
    path: "/customer-file",
    itemKey: "@phis/ui/modules/accounting/nav/accounting/customer-file",
    icon: "antd:idcard",
    loadTree: ({ page, runtime }) =>
      import("./trees/phi-default-accounting-customer-file-page-tree")
        .then((module) => module.buildPhiDefaultAccountingCustomerFilePageTree({ page, runtime })),
  }), PHI_ACCOUNTING_CUSTOMER_FILE_ACCESS),
] satisfies readonly PhiCmsRoutePresetDescriptor[];

function withPhiNavigationAccess(
  descriptor: PhiCmsRoutePresetDescriptor,
  accessPolicy: PhiViewerAccessPolicy,
): PhiCmsRoutePresetDescriptor {
  return {
    ...descriptor,
    navigation: descriptor.navigation?.map((injection) => ({
      ...injection,
      item: { ...injection.item, accessPolicy },
    })),
  };
}
