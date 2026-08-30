import { PHI_CMS_LAYOUT_PLUGIN_KEYS } from "./cms-layout-types";
import { PhiCmsWidgetType } from "./cms-widget-types";

export const PhiRuntimeRenderClientType = {
  AuthLogout: "@phis/ui/modules/auth/controller/default#logout",
  AuthSecurity: "@phis/ui/modules/auth/controller/default#security",
  ObservabilityLogDetail: "@phis/ui/modules/observability/controller/default#log-detail",
  AccountPreview: `${PhiCmsWidgetType.Account}#preview`,
  AreaMenuPreview: `${PhiCmsWidgetType.AreaMenu}#preview`,
  BuilderChromeControls: `${PhiCmsWidgetType.CommandToolbar}#builder-chrome-controls`,
  BuilderDraftStatus: `${PhiCmsWidgetType.Description}#builder-draft-status`,
  BuilderModeSwitch: `${PhiCmsWidgetType.Switch}#builder-mode`,
  SearchStandalone: "@phis/ui/controls/search",
  SidebarNavigationPreview: `${PhiCmsWidgetType.SidebarNavigation}#preview`,
  BaseLayout: `${PHI_CMS_LAYOUT_PLUGIN_KEYS.core}/base#client`,
  RegionContainerEnhancer: "@phis/ui/runtime#region-container",
  OverlayContainer: "@phis/ui/runtime#overlay-container",
  SlotChildFrameEnhancer: "@phis/ui/runtime#slot-child-frame",
  FormDescriptor: "@phis/ui/form#descriptor",
  FormConfirm: "@phis/ui/modules/auth/forms/confirm",
  FormContact: "@phis/ui/modules/public/forms/contact",
  FormLogin: "@phis/ui/modules/auth/forms/login",
  FormRegistration: "@phis/ui/modules/auth/forms/registration",
  FormResetPassword: "@phis/ui/modules/auth/forms/reset-password",
} as const;
