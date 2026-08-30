import type { PhiCmsAreaKey } from "../../../constants/cms-areas";
import { PHI_AUTH_RUNTIME_MODULE_AREA_OVERLAYS } from "../../../components/regions/presets/phi-auth-area-overlay-tree";
import { PHI_AUTH_RUNTIME_MODULE_FORMS } from "../../../components/forms/shared-form-plugins";
import { PHI_AUTH_ADMIN_SETTINGS_RUNTIME_MODULE_FORMS } from "../../../components/forms/auth-admin-settings-forms";
import { definePhiRuntimeModuleServerAreaContribution } from "../area-contributions";
import { PHI_AUTH_RUNTIME_MODULE_DEFINITION } from "../auth/definition";
import { PHI_AUTH_RUNTIME_MODULE_ROUTES } from "../area-base-presets";
import { PHI_AUTH_RUNTIME_MODULE_WIDGETS } from "./widgets";

/**
 * Auth reaches four Areas and shows a different face in each: the viewer-facing Areas carry the
 * security Widget and the sign-in Forms, the Admin carries the settings Forms, and the Builder needs
 * both plus every route, because it edits the others rather than being one.
 *
 * All of that used to live in four Area files. Reading what this module contributes meant opening
 * all four and diffing them by eye.
 */
export function createPhiAuthRuntimeModuleServerAreaContribution(area?: PhiCmsAreaKey) {
  const isViewerArea = area === "app" || area === "public";
  const isAdmin = area === "admin";
  return definePhiRuntimeModuleServerAreaContribution({
    moduleId: PHI_AUTH_RUNTIME_MODULE_DEFINITION.moduleId,
    catalogEntry: {
      definition: PHI_AUTH_RUNTIME_MODULE_DEFINITION,
      widgets: isViewerArea
        ? PHI_AUTH_RUNTIME_MODULE_WIDGETS.filter(
          (widget) => widget.definition.typeKey === "auth-security",
        )
        : [],
      layouts: [],
      forms: isAdmin
        ? PHI_AUTH_ADMIN_SETTINGS_RUNTIME_MODULE_FORMS
        : isViewerArea
          ? PHI_AUTH_RUNTIME_MODULE_FORMS
          : [...PHI_AUTH_RUNTIME_MODULE_FORMS, ...PHI_AUTH_ADMIN_SETTINGS_RUNTIME_MODULE_FORMS],
      areaOverlays: isViewerArea
        ? PHI_AUTH_RUNTIME_MODULE_AREA_OVERLAYS.filter((descriptor) => descriptor.area === area)
        : [],
      routes: area
        ? PHI_AUTH_RUNTIME_MODULE_ROUTES.filter((descriptor) => descriptor.area === area)
        : PHI_AUTH_RUNTIME_MODULE_ROUTES,
      loadUiProvider: () => import("../../../components/forms/auth-form-ui-provider")
        .then((module) => module.PhiAuthFormUiProvider),
      load: () => import("./module").then((module) => module.PHI_AUTH_RUNTIME_MODULE),
    },
  });
}
