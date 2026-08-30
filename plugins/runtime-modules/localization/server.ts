import type { PhiCmsAreaKey } from "../../../constants/cms-areas";
import {
  PHI_LOCALIZATION_FORM_IDS,
  PHI_LOCALIZATION_RUNTIME_MODULE_FORMS,
} from "../../../plugins/runtime-modules/localization/forms";
import { definePhiRuntimeModuleServerAreaContribution } from "../area-contributions";
import { PHI_LOCALIZATION_RUNTIME_MODULE_DEFINITION } from "./definition";
import { PHI_LOCALIZATION_RUNTIME_MODULE_ROUTES } from "./presets";

/**
 * The Editor carries only the translation Form; the Admin carries everything else. The split lives
 * here rather than in the two Area files, so the module states its own surface per Area.
 */
export function createPhiLocalizationRuntimeModuleServerAreaContribution(area?: PhiCmsAreaKey) {
  const isEditor = area === "editor";
  return definePhiRuntimeModuleServerAreaContribution({
    moduleId: PHI_LOCALIZATION_RUNTIME_MODULE_DEFINITION.moduleId,
    catalogEntry: {
      definition: PHI_LOCALIZATION_RUNTIME_MODULE_DEFINITION,
      widgets: [],
      forms: area
        ? PHI_LOCALIZATION_RUNTIME_MODULE_FORMS.filter((form) =>
          (form.formId === PHI_LOCALIZATION_FORM_IDS.editorTranslation) === isEditor)
        : PHI_LOCALIZATION_RUNTIME_MODULE_FORMS,
      layouts: [],
      routes: isEditor ? [] : PHI_LOCALIZATION_RUNTIME_MODULE_ROUTES,
      load: () => import("./module").then((module) => module.PHI_LOCALIZATION_RUNTIME_MODULE),
    },
  });
}
