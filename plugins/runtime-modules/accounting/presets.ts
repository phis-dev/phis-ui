import type {
  PhiCmsAreaShellPresetDescriptor,
  PhiCmsDescriptorBuildContext,
  PhiCmsRoutePresetDescriptor,
} from "../../../types/cms-module-descriptors";
import { buildPhiAreaRootRoutePresetDescriptor } from "../area-root-route";
import { PhiCmsRegionType } from "../../../constants/phi-cms";
import { PHI_DEFAULT_PUB_AREA_COMPOSITION_NODE_KEYS } from "../preset-contracts/pub-area";
import { PHI_ACCOUNTING_RUNTIME_MODULE_ID } from "./ids";

/*
 * What the Accounting base Module brings: the Site shell for its Area and the Area root. No Page of its
 * own -- the Dashboard Module's entry stands first in the sidebar, so the root lands there, and every other
 * Accounting Page is a Module's.
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
] satisfies readonly PhiCmsRoutePresetDescriptor[];
