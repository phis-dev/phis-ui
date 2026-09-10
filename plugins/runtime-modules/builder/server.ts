import {
  PHI_BUILDER_EFFECTS_FORMS,
  PHI_BUILDER_PAGE_META_FORM,
} from "./page-meta-form";
import { PHI_BUILDER_SIGNAL_WIRING_FORM } from "./signal-wiring-form";
import { definePhiRuntimeModuleServerAreaContribution } from "../area-contributions";
import { PHI_BUILDER_RUNTIME_MODULE_DEFINITION } from "./definition";
import { PHI_BUILDER_RUNTIME_MODULE_LAYOUTS } from "./layouts";
// The Inspector Overlays are a Module contribution, not shell content: a saved Area shell replaces
// the code preset wholesale, and the Builder's own tools must survive that.
import { PHI_BUILDER_RUNTIME_MODULE_AREA_OVERLAYS } from "../../../components/regions/presets/phi-builder-inspector-area-overlay-tree";
import {
  PHI_BUILDER_RUNTIME_MODULE_AREA_SHELLS,
  PHI_BUILDER_RUNTIME_MODULE_ROUTES,
} from "./presets";
import { PHI_RUNTIME_MODULE_WIDGETS as PHI_BUILDER_WIDGETS } from "./widgets";

export const PHI_BUILDER_RUNTIME_MODULE_SERVER_AREA_CONTRIBUTION =
  definePhiRuntimeModuleServerAreaContribution({
    moduleId: PHI_BUILDER_RUNTIME_MODULE_DEFINITION.moduleId,
    catalogEntry: {
      definition: PHI_BUILDER_RUNTIME_MODULE_DEFINITION,
      widgets: PHI_BUILDER_WIDGETS,
      layouts: PHI_BUILDER_RUNTIME_MODULE_LAYOUTS,
      forms: [PHI_BUILDER_PAGE_META_FORM, ...PHI_BUILDER_EFFECTS_FORMS, PHI_BUILDER_SIGNAL_WIRING_FORM],
      areaShells: PHI_BUILDER_RUNTIME_MODULE_AREA_SHELLS,
      areaOverlays: PHI_BUILDER_RUNTIME_MODULE_AREA_OVERLAYS,
      routes: PHI_BUILDER_RUNTIME_MODULE_ROUTES,
      load: () => import("./module").then((module) => module.PHI_BUILDER_RUNTIME_MODULE),
    },
  });
