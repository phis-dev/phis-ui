import type { PhiCmsRoutePresetDescriptor } from "../../../types/cms-module-descriptors";
import { buildPhiSidebarRoutePresetDescriptor } from "../sidebar-route";
import { PHI_LOCALIZATION_RUNTIME_MODULE_ID } from "./ids";

export const PHI_LOCALIZATION_RUNTIME_MODULE_ROUTES = [
  buildPhiSidebarRoutePresetDescriptor({
    area: "admin",
    anchor: "main",
    ownerModuleId: PHI_LOCALIZATION_RUNTIME_MODULE_ID,
    presetKey: "admin-locales-page",
    title: "Locales",
    path: "/locales",
    itemKey: "@phis/ui/modules/localization/nav/admin/locales",
    icon: "antd:translation",
    loadTree: ({ page, runtime }) =>
      import("./trees/phi-default-admin-locales-page-tree")
        .then((module) => module.buildPhiDefaultAdminLocalesPageTree({ page, runtime })),
  }),
  /*
   * Where site messages are translated, contributed by this Module rather than by the Editor Area.
   *
   * The Page used to be the Editor's, with its entry written into the Area definition, while every piece
   * of it -- the Table's Provider, the Form, the Controller -- was this Module's. Switching localization
   * off left the Page and its menu entry standing over a Table that could not load. Now it goes with the
   * Module, like the Locales Page above it and like any Module outside this package would have to.
   */
  buildPhiSidebarRoutePresetDescriptor({
    area: "editor",
    anchor: "main",
    ownerModuleId: PHI_LOCALIZATION_RUNTIME_MODULE_ID,
    presetKey: "editor-translations-page",
    title: "Translations",
    path: "/translations",
    itemKey: "@phis/ui/modules/localization/nav/editor/translations",
    icon: "antd:translation",
    loadTree: ({ page, runtime }) =>
      import("./trees/phi-default-editor-translations-page-tree")
        .then((module) => module.buildPhiDefaultEditorTranslationsPageTree({ page, runtime })),
  }),
] satisfies readonly PhiCmsRoutePresetDescriptor[];
