import type {
  PhiCmsAreaShellPresetDescriptor,
  PhiCmsRoutePresetDescriptor,
} from "../../../types/cms-module-descriptors";
import { buildPhiAreaRootRoutePresetDescriptor } from "../area-root-route";
import { PHI_EDITOR_RUNTIME_MODULE_ID } from "./ids";

export const PHI_EDITOR_RUNTIME_MODULE_AREA_SHELLS = [{
  ownerModuleId: PHI_EDITOR_RUNTIME_MODULE_ID,
  presetKey: "editor-area-preset",
  shellPresetVersion: 1,
  area: "editor",
  loadTree: ({ page, runtime }) =>
    import("./trees/phi-default-editor-area-preset-tree")
      .then((module) => module.buildPhiDefaultEditorAreaPresetTree({ page, runtime })),
}] satisfies readonly PhiCmsAreaShellPresetDescriptor[];

export const PHI_EDITOR_RUNTIME_MODULE_ROUTES = [buildPhiAreaRootRoutePresetDescriptor({
  ownerModuleId: PHI_EDITOR_RUNTIME_MODULE_ID,
  area: "editor",
  title: "Editor",
})] satisfies readonly PhiCmsRoutePresetDescriptor[];
