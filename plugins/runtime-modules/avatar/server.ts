import type { PhiCmsAreaKey } from "../../../constants/cms-areas";
import { definePhiRuntimeModuleServerAreaContribution } from "../area-contributions";
import { PHI_AVATAR_RUNTIME_MODULE_DEFINITION } from "./definition";
// Der Overlay-Baum liegt noch unter components/regions/presets; Stufe 2 holt ihn hierher.
import { PHI_AVATAR_RUNTIME_MODULE_AREA_OVERLAYS } from "../../../components/regions/presets/phi-avatar-area-overlay-tree";
import { PHI_AVATAR_RUNTIME_MODULE_NAVIGATION } from "./presets";
import { PHI_AVATAR_RUNTIME_MODULE_WIDGETS } from "./widgets";

export function createPhiAvatarRuntimeModuleServerAreaContribution(area?: PhiCmsAreaKey) {
  return definePhiRuntimeModuleServerAreaContribution({
    moduleId: PHI_AVATAR_RUNTIME_MODULE_DEFINITION.moduleId,
    catalogEntry: {
      definition: PHI_AVATAR_RUNTIME_MODULE_DEFINITION,
      widgets: PHI_AVATAR_RUNTIME_MODULE_WIDGETS,
      layouts: [],
      areaOverlays: area
        ? PHI_AVATAR_RUNTIME_MODULE_AREA_OVERLAYS.filter((descriptor: { area: string }) => descriptor.area === area)
        : PHI_AVATAR_RUNTIME_MODULE_AREA_OVERLAYS,
      // No routes: the Module owns no Page. Its entry point is one contributed account-menu item that
      // opens its Overlay, which is the whole surface it asks for.
      routes: [],
      navigation: PHI_AVATAR_RUNTIME_MODULE_NAVIGATION,
      load: () => import("./module").then((module) => module.PHI_AVATAR_RUNTIME_MODULE),
    },
  });
}
