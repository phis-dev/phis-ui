import type {
  PhiCmsAreaShellPresetDescriptor,
  PhiCmsDescriptorBuildContext,
  PhiCmsRoutePresetDescriptor,
} from "../../../types/cms-module-descriptors";
import { PHI_BASE_PAGE_LAYOUT_VERSION } from "../../../components/regions/presets/phi-base-page-layout";
import { buildPhiAreaRootRoutePresetDescriptor } from "../area-root-route";
import { PHI_APP_RUNTIME_MODULE_ID } from "./ids";

/* What the App base Module brings: its Area shell, the Area root and the profile Page. */

export const PHI_APP_RUNTIME_MODULE_AREA_SHELLS = [
  {
    ownerModuleId: PHI_APP_RUNTIME_MODULE_ID,
    presetKey: "app-area-preset",
    shellPresetVersion: 1,
    area: "app",
    /*
     * The Site shell with a left sider added, rather than a shell of its own.
     *
     * App's header and footer are Public's -- one Brand, one account trigger, one description of both.
     * What App has that Public does not is somewhere for the Modules a signed-in person works with,
     * and that is the whole of the overlay. Nothing is omitted from the base, so the two trees cannot
     * disagree about a Region: composition refuses a Region type stated twice.
     */
    loadTree: async ({ page, runtime }: PhiCmsDescriptorBuildContext) => {
      const [
        { buildPhiDefaultSiteAreaPresetTree },
        { buildPhiDefaultAppAreaPresetTree },
        { mergePhiCmsShellTrees },
      ] = await Promise.all([
        import("../phi-default-site-area-preset-tree"),
        import("./trees/phi-default-app-area-preset-tree"),
        import("../shell-tree-composition"),
      ]);
      const [base, overlay] = await Promise.all([
        buildPhiDefaultSiteAreaPresetTree({
          page,
          runtime,
          presetKey: "app-area-preset",
          ownerModuleId: PHI_APP_RUNTIME_MODULE_ID,
          runtimeModuleArea: "app",
        }),
        buildPhiDefaultAppAreaPresetTree({ page, runtime }),
      ]);
      return mergePhiCmsShellTrees(base, overlay);
    },
  },
] satisfies readonly PhiCmsAreaShellPresetDescriptor[];

export const PHI_APP_RUNTIME_MODULE_ROUTES = [
  buildPhiAreaRootRoutePresetDescriptor({
    ownerModuleId: PHI_APP_RUNTIME_MODULE_ID,
    area: "app",
    title: "App",
  }),
  /*
   * What a person has settled about their own account: their name, the language they read in.
   *
   * It sat with the Auth Module, which owned the route while Core owned every Widget on it. Nothing
   * about a name or a language depends on how somebody signs in -- a Site that switches to a
   * directory, or switches Auth off while sessions keep working, would have lost the Page that says
   * what they are called. AUTHENTICATION.md section 5 already said so: profile administration does
   * not become Auth's merely by appearing in its menu.
   *
   * The Area's own Settings child, so it is declared here rather than injected -- SETTINGS.md section
   * 5, the same standing Admin and Builder give their General page.
   */
  {
    ownerModuleId: PHI_APP_RUNTIME_MODULE_ID,
    presetKey: "app-profile-page",
    presetVersion: 1 + PHI_BASE_PAGE_LAYOUT_VERSION,
    area: "app" as const,
    title: "Profile",
    path: "/settings/profile",
    loadTree: ({ page, runtime }: PhiCmsDescriptorBuildContext) =>
      import("./trees/phi-default-app-profile-page-tree")
        .then((module) => module.buildPhiDefaultAppProfilePageTree({ page, runtime })),
  },
] satisfies readonly PhiCmsRoutePresetDescriptor[];
