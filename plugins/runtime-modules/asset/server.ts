import type { PhiCmsAreaKey } from "../../../constants/cms-areas";
import {
  PHI_ASSET_FOLDER_RUNTIME_MODULE_FORM,
  PHI_ASSET_METADATA_RUNTIME_MODULE_FORM,
} from "../../../components/media/asset-metadata-form";
import { PHI_MEDIA_SETTINGS_RUNTIME_MODULE_FORM } from "../../../components/media/media-settings-forms";
import { definePhiRuntimeModuleServerAreaContribution } from "../area-contributions";
import { PHI_ASSET_RUNTIME_MODULE_DEFINITION } from "./definition";
import { PHI_ASSET_RUNTIME_MODULE_ROUTES } from "./presets";
import { PHI_RUNTIME_MODULE_WIDGETS as PHI_ASSET_WIDGETS } from "./widgets";

/**
 * Every Area carries this module, and each shows a different set of its Pages. The filter lives here
 * rather than in the Area files, so no Area needs to reach into this module's presets.
 */
export function createPhiAssetRuntimeModuleServerAreaContribution(area?: PhiCmsAreaKey) {
  return definePhiRuntimeModuleServerAreaContribution({
    moduleId: PHI_ASSET_RUNTIME_MODULE_DEFINITION.moduleId,
    catalogEntry: {
      definition: PHI_ASSET_RUNTIME_MODULE_DEFINITION,
      widgets: PHI_ASSET_WIDGETS,
      layouts: [],
      forms: [
        PHI_ASSET_METADATA_RUNTIME_MODULE_FORM,
        PHI_ASSET_FOLDER_RUNTIME_MODULE_FORM,
        PHI_MEDIA_SETTINGS_RUNTIME_MODULE_FORM,
      ],
      routes: area
        ? PHI_ASSET_RUNTIME_MODULE_ROUTES.filter((descriptor) => descriptor.area === area)
        : PHI_ASSET_RUNTIME_MODULE_ROUTES,
      loadUiProvider: () => import("../../../components/media/asset-form-ui-provider")
        .then((module) => module.PhiAssetFormUiProvider),
      load: () => import("./module").then((module) => module.PHI_ASSET_RUNTIME_MODULE),
    },
  });
}
