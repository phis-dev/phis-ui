import type { PhiCmsAreaKey } from "../../../constants/cms-areas";
import { PHI_AUTH_RUNTIME_MODULE_AREA_OVERLAYS } from "../../../components/regions/presets/phi-auth-area-overlay-tree";
import { PHI_AUTH_RUNTIME_MODULE_FORMS } from "../../../components/forms/shared-form-plugins";
import { PHI_AUTH_ADMIN_SETTINGS_RUNTIME_MODULE_FORMS } from "../../../components/forms/auth-admin-settings-forms";
import { definePhiRuntimeModuleServerAreaContribution } from "../area-contributions";
import { PHI_AUTH_RUNTIME_MODULE_DEFINITION } from "../auth/definition";
import { PHI_AUTH_RUNTIME_MODULE_ROUTES } from "../area-base-presets";
import { PHI_AUTH_RUNTIME_MODULE_WIDGETS } from "./widgets";

/**
 * Auth reaches four Areas and shows a different face in each: the Admin carries the settings Forms,
 * the viewer-facing Areas carry the sign-in Forms, and the Builder needs both, because it edits the
 * others rather than being one.
 *
 * All of that used to live in four Area files. Reading what this module contributes meant opening
 * all four and diffing them by eye.
 *
 * The Widgets no longer vary. They used to: the viewer Areas were handed the security Widget alone
 * and the Admin none at all, which left `auth-logout` in no live catalog while the public `/logout`
 * page went on placing it -- a page that rendered "no installed runtime module owns this widget
 * type" to anybody signing out. A Widget reaches every Area its Module does; whether it may be used
 * is a question about who is asking, and its access policy is what answers that.
 */
export function createPhiAuthRuntimeModuleServerAreaContribution(area?: PhiCmsAreaKey) {
  const isViewerArea = area === "app" || area === "public";
  const isAdmin = area === "admin";
  return definePhiRuntimeModuleServerAreaContribution({
    moduleId: PHI_AUTH_RUNTIME_MODULE_DEFINITION.moduleId,
    catalogEntry: {
      definition: PHI_AUTH_RUNTIME_MODULE_DEFINITION,
      widgets: PHI_AUTH_RUNTIME_MODULE_WIDGETS,
      layouts: [],
      forms: isAdmin
        ? PHI_AUTH_ADMIN_SETTINGS_RUNTIME_MODULE_FORMS
        : isViewerArea
          ? PHI_AUTH_RUNTIME_MODULE_FORMS
          : [...PHI_AUTH_RUNTIME_MODULE_FORMS, ...PHI_AUTH_ADMIN_SETTINGS_RUNTIME_MODULE_FORMS],
      areaOverlays: PHI_AUTH_RUNTIME_MODULE_AREA_OVERLAYS,
      routes: PHI_AUTH_RUNTIME_MODULE_ROUTES,
      loadUiProvider: () => import("../../../components/forms/auth-form-ui-provider")
        .then((module) => module.PhiAuthFormUiProvider),
      load: () => import("./module").then((module) => module.PHI_AUTH_RUNTIME_MODULE),
    },
  });
}
