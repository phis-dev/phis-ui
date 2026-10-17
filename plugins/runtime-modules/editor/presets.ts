import type {
  PhiCmsAreaShellPresetDescriptor,
  PhiCmsRoutePresetDescriptor,
} from "../../../types/cms-module-descriptors";
import { buildPhiAreaRootRoutePresetDescriptor } from "../area-root-route";
import { buildPhiSidebarRoutePresetDescriptor } from "../sidebar-route";
import { PHI_EDITOR_RELEASES_PAGE_PRESET_KEY, PHI_EDITOR_RUNTIME_MODULE_ID } from "./ids";

export const PHI_EDITOR_RUNTIME_MODULE_AREA_SHELLS = [{
  ownerModuleId: PHI_EDITOR_RUNTIME_MODULE_ID,
  presetKey: "editor-area-preset",
  shellPresetVersion: 1,
  area: "editor",
  loadTree: ({ page, runtime }) =>
    import("./trees/phi-default-editor-area-preset-tree")
      .then((module) => module.buildPhiDefaultEditorAreaPresetTree({ page, runtime })),
}] satisfies readonly PhiCmsAreaShellPresetDescriptor[];

export const PHI_EDITOR_RUNTIME_MODULE_ROUTES = [
  buildPhiAreaRootRoutePresetDescriptor({
    ownerModuleId: PHI_EDITOR_RUNTIME_MODULE_ID,
    area: "editor",
    title: "Editor",
  }),
  /*
   * The Publisher's queue, the Area's own Page: every content Module's submissions land in it, so it
   * belongs to none of them (phis-server CONTENT.md, Submission).
   */
  buildPhiSidebarRoutePresetDescriptor({
    area: "editor",
    anchor: "main",
    ownerModuleId: PHI_EDITOR_RUNTIME_MODULE_ID,
    presetKey: PHI_EDITOR_RELEASES_PAGE_PRESET_KEY,
    title: "Releases",
    path: "/releases",
    itemKey: "@phis/ui/modules/editor/nav/editor/releases",
    icon: "antd:safety-certificate",
    loadTree: ({ page, runtime }) =>
      import("./trees/phi-default-editor-releases-page-tree")
        .then((module) => module.buildPhiDefaultEditorReleasesPageTree({ page, runtime })),
  }),
] satisfies readonly PhiCmsRoutePresetDescriptor[];
