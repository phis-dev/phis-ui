import type { PhiCmsWidgetPluginDefinition } from "../../../types/builder";
import type { PhiCmsPreviewWidgetPlugin, PhiCmsRuntimeWidgetPlugin } from "../../../types/cms-plugins";
import { PHI_CORE_RUNTIME_MODULE_ID } from "./ids";
import type { PhiRuntimeModuleRenderPolicies, PhiRuntimeModuleWidgetDefinition } from "../contracts";
import {
  PHI_ACCOUNT_WIDGET_DEFINITION,
} from "./widgets/account/config";
import {
  PHI_AREA_MENU_WIDGET_DEFINITION,
} from "./widgets/area-menu/config";
import {
  PHI_BRAND_WIDGET_DEFINITION,
} from "./widgets/brand/config";
import {
  PHI_BREADCRUMB_WIDGET_DEFINITION,
} from "./widgets/breadcrumb/config";
import {
  PHI_BUTTON_WIDGET_DEFINITION,
} from "./widgets/button/config";
import {
  PHI_CARD_WIDGET_DEFINITION,
} from "./widgets/card/config";
import {
  PHI_CASCADER_WIDGET_DEFINITION,
} from "./widgets/cascader/config";
import {
  PHI_COLLECTION_VIEW_WIDGET_DEFINITION,
} from "./widgets/collection-view/config";
import {
  PHI_COLOR_WIDGET_DEFINITION,
} from "./widgets/color/config";
import {
  PHI_COMMAND_TOOLBAR_WIDGET_DEFINITION,
} from "./widgets/command-toolbar/config";
import {
  PHI_DESCRIPTION_WIDGET_DEFINITION,
} from "./widgets/description/config";
import {
  PHI_DIMENSION_WIDGET_DEFINITION,
} from "./widgets/dimension/config";
import {
  PHI_DATE_PICKER_WIDGET_DEFINITION,
} from "./widgets/date-picker/config";
import {
  PHI_LENGTH_WIDGET_DEFINITION,
} from "./widgets/length/config";
import {
  PHI_FOOTER_WIDGET_DEFINITION,
} from "./widgets/footer/config";
import {
  PHI_FORM_WIDGET_DEFINITION,
} from "./widgets/form/config";
import {
  PHI_HEADER_NAVIGATION_WIDGET_DEFINITION,
} from "./widgets/header-navigation/config";
import {
  PHI_HTML_WIDGET_DEFINITION,
} from "./widgets/html/config";
import {
  PHI_ICON_WIDGET_DEFINITION,
} from "./widgets/icon/config";
import {
  PHI_IMAGE_WIDGET_DEFINITION,
} from "./widgets/image/config";
import {
  PHI_INPUT_WIDGET_DEFINITION,
} from "./widgets/input/config";
import {
  PHI_NUMBER_INPUT_WIDGET_DEFINITION,
} from "./widgets/number-input/config";
import {
  PHI_SLIDER_WIDGET_DEFINITION,
} from "./widgets/slider/config";
import {
  PHI_RATE_WIDGET_DEFINITION,
} from "./widgets/rate/config";
import {
  PHI_CHECKBOX_WIDGET_DEFINITION,
} from "./widgets/checkbox/config";
import {
  PHI_CHECKBOX_GROUP_WIDGET_DEFINITION,
} from "./widgets/checkbox-group/config";
import {
  PHI_LOCALE_WIDGET_DEFINITION,
} from "./widgets/locale/config";
import { PHI_SLOT_UPLOAD_WIDGET_DEFINITION } from "./widgets/slot-upload/config";
import {
  PHI_MARKDOWN_WIDGET_DEFINITION,
} from "./widgets/markdown/config";
import {
  PHI_MARKDOWN_TOC_WIDGET_DEFINITION,
} from "./widgets/markdown-toc/config";
import {
  PHI_MULTI_SELECT_WIDGET_DEFINITION,
} from "./widgets/multi-select/config";
import {
  PHI_PAGE_TITLE_WIDGET_DEFINITION,
} from "./widgets/page-title/config";
import {
  PHI_PAGINATION_WIDGET_DEFINITION,
} from "./widgets/pagination/config";
import {
  PHI_PROFILE_EMAIL_WIDGET_DEFINITION,
} from "./widgets/profile-email/config";
import {
  PHI_PROFILE_LOCALE_WIDGET_DEFINITION,
} from "./widgets/profile-locale/config";
import {
  PHI_PROFILE_NAME_WIDGET_DEFINITION,
} from "./widgets/profile-name/config";
import {
  PHI_PROFILE_OVERVIEW_WIDGET_DEFINITION,
} from "./widgets/profile-overview/config";
import {
  PHI_PROFILE_PASSWORD_WIDGET_DEFINITION,
} from "./widgets/profile-password/config";
import {
  PHI_QUICK_LINKS_WIDGET_DEFINITION,
} from "./widgets/quick-links/config";
import {
  PHI_RESULT_WIDGET_DEFINITION,
} from "./widgets/result/config";
import {
  PHI_SEGMENTED_WIDGET_DEFINITION,
} from "./widgets/segmented/config";
import {
  PHI_SELECT_BOX_WIDGET_DEFINITION,
} from "./widgets/select-box/config";
import {
  PHI_SIDEBAR_NAVIGATION_WIDGET_DEFINITION,
} from "./widgets/sidebar-navigation/config";
import {
  PHI_SIMPLE_TEXT_WIDGET_DEFINITION,
} from "./widgets/simple-text/config";
import {
  PHI_SPACER_WIDGET_DEFINITION,
} from "./widgets/spacer/config";
import {
  PHI_TAB_BAR_WIDGET_DEFINITION,
} from "../../../components/widgets/config/stack-tabs";
import {
  PHI_SWITCH_WIDGET_DEFINITION,
} from "./widgets/switch/config";
import {
  PHI_TABLE_WIDGET_DEFINITION,
} from "./widgets/table/config";
import {
  PHI_TREE_WIDGET_DEFINITION,
} from "./widgets/tree/config";

function defineFirstPartyWidget<TConfig>(options: {
  definition: PhiCmsWidgetPluginDefinition<TConfig>;
  ownerModuleId: `${string}/${string}`;
  renderPolicies: PhiRuntimeModuleRenderPolicies;
  loadRuntime: () => Promise<PhiCmsRuntimeWidgetPlugin<TConfig>>;
  loadPreview: () => Promise<PhiCmsPreviewWidgetPlugin<TConfig>>;
}): PhiRuntimeModuleWidgetDefinition {
  return options as PhiRuntimeModuleWidgetDefinition;
}

export const PHI_RUNTIME_MODULE_WIDGETS: readonly PhiRuntimeModuleWidgetDefinition[] = [
  defineFirstPartyWidget({
    definition: PHI_DATE_PICKER_WIDGET_DEFINITION,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/date-picker/plugin")
      .then((module) => module.PHI_DATE_PICKER_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/date-picker/plugin")
      .then((module) => module.PHI_DATE_PICKER_WIDGET_PLUGIN),
  }),
  defineFirstPartyWidget({
    definition: PHI_ACCOUNT_WIDGET_DEFINITION,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/account/plugin").then((module) => module.PHI_ACCOUNT_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/account/plugin").then((module) => module.PHI_ACCOUNT_WIDGET_PLUGIN),
  }),
  defineFirstPartyWidget({
    definition: PHI_AREA_MENU_WIDGET_DEFINITION,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/area-menu/plugin").then((module) => module.PHI_AREA_MENU_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/area-menu/plugin").then((module) => module.PHI_AREA_MENU_WIDGET_PLUGIN),
  }),
  defineFirstPartyWidget({
    definition: PHI_BRAND_WIDGET_DEFINITION,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/brand/plugin").then((module) => module.PHI_BRAND_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/brand/plugin").then((module) => module.PHI_BRAND_WIDGET_PLUGIN),
  }),
  defineFirstPartyWidget({
    definition: PHI_BREADCRUMB_WIDGET_DEFINITION,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/breadcrumb/plugin").then((module) => module.PHI_BREADCRUMB_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/breadcrumb/plugin").then((module) => module.PHI_BREADCRUMB_WIDGET_PLUGIN),
  }),
  defineFirstPartyWidget({
    definition: PHI_BUTTON_WIDGET_DEFINITION,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/button/plugin").then((module) => module.PHI_BUTTON_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/button/plugin").then((module) => module.PHI_BUTTON_WIDGET_PLUGIN),
  }),
  defineFirstPartyWidget({
    definition: PHI_CARD_WIDGET_DEFINITION,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/card/plugin").then((module) => module.PHI_CARD_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/card/plugin").then((module) => module.PHI_CARD_WIDGET_PLUGIN),
  }),
  defineFirstPartyWidget({
    definition: PHI_CASCADER_WIDGET_DEFINITION,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/cascader/plugin").then((module) => module.PHI_CASCADER_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/cascader/plugin").then((module) => module.PHI_CASCADER_WIDGET_PLUGIN),
  }),
  defineFirstPartyWidget({
    definition: PHI_COLLECTION_VIEW_WIDGET_DEFINITION,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/collection-view/plugin").then((module) => module.PHI_COLLECTION_VIEW_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/collection-view/plugin").then((module) => module.PHI_COLLECTION_VIEW_WIDGET_PLUGIN),
  }),
  defineFirstPartyWidget({
    definition: PHI_COLOR_WIDGET_DEFINITION,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/color/plugin").then((module) => module.PHI_COLOR_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/color/plugin").then((module) => module.PHI_COLOR_WIDGET_PLUGIN),
  }),
  defineFirstPartyWidget({
    definition: PHI_COMMAND_TOOLBAR_WIDGET_DEFINITION,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/command-toolbar/plugin").then((module) => module.PHI_COMMAND_TOOLBAR_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/command-toolbar/plugin").then((module) => module.PHI_COMMAND_TOOLBAR_WIDGET_PLUGIN),
  }),
  defineFirstPartyWidget({
    definition: PHI_DESCRIPTION_WIDGET_DEFINITION,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/description/plugin").then((module) => module.PHI_DESCRIPTION_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/description/plugin").then((module) => module.PHI_DESCRIPTION_WIDGET_PLUGIN),
  }),
  defineFirstPartyWidget({
    definition: PHI_DIMENSION_WIDGET_DEFINITION,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/dimension/plugin").then((module) => module.PHI_DIMENSION_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/dimension/plugin").then((module) => module.PHI_DIMENSION_WIDGET_PLUGIN),
  }),
  defineFirstPartyWidget({
    definition: PHI_LENGTH_WIDGET_DEFINITION,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/length/plugin").then((module) => module.PHI_LENGTH_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/length/plugin").then((module) => module.PHI_LENGTH_WIDGET_PLUGIN),
  }),
  defineFirstPartyWidget({
    definition: PHI_FOOTER_WIDGET_DEFINITION,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/footer/plugin").then((module) => module.PHI_FOOTER_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/footer/plugin").then((module) => module.PHI_FOOTER_WIDGET_PLUGIN),
  }),
  defineFirstPartyWidget({
    definition: PHI_FORM_WIDGET_DEFINITION,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    renderPolicies: { runtime: "custom", preview: "custom", authoring: "custom" },
    loadRuntime: () => import("./widgets/form/plugin").then((module) => module.PHI_FORM_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/form/plugin").then((module) => module.PHI_FORM_WIDGET_PLUGIN),
  }),
  defineFirstPartyWidget({
    definition: PHI_HEADER_NAVIGATION_WIDGET_DEFINITION,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/header-navigation/plugin").then((module) => module.PHI_HEADER_NAVIGATION_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/header-navigation/plugin").then((module) => module.PHI_HEADER_NAVIGATION_WIDGET_PLUGIN),
  }),
  defineFirstPartyWidget({
    definition: PHI_HTML_WIDGET_DEFINITION,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/html/plugin").then((module) => module.PHI_HTML_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/html/plugin").then((module) => module.PHI_HTML_WIDGET_PLUGIN),
  }),
  defineFirstPartyWidget({
    definition: PHI_ICON_WIDGET_DEFINITION,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/icon/plugin").then((module) => module.PHI_ICON_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/icon/plugin").then((module) => module.PHI_ICON_WIDGET_PLUGIN),
  }),
  defineFirstPartyWidget({
    definition: PHI_IMAGE_WIDGET_DEFINITION,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/image/plugin").then((module) => module.PHI_IMAGE_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/image/plugin").then((module) => module.PHI_IMAGE_WIDGET_PLUGIN),
  }),
  defineFirstPartyWidget({
    definition: PHI_INPUT_WIDGET_DEFINITION,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/input/plugin").then((module) => module.PHI_INPUT_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/input/plugin").then((module) => module.PHI_INPUT_WIDGET_PLUGIN),
  }),
  defineFirstPartyWidget({
    definition: PHI_NUMBER_INPUT_WIDGET_DEFINITION,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/number-input/plugin").then((module) => module.PHI_NUMBER_INPUT_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/number-input/plugin").then((module) => module.PHI_NUMBER_INPUT_WIDGET_PLUGIN),
  }),
  defineFirstPartyWidget({
    definition: PHI_SLIDER_WIDGET_DEFINITION,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/slider/plugin").then((module) => module.PHI_SLIDER_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/slider/plugin").then((module) => module.PHI_SLIDER_WIDGET_PLUGIN),
  }),
  defineFirstPartyWidget({
    definition: PHI_RATE_WIDGET_DEFINITION,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/rate/plugin").then((module) => module.PHI_RATE_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/rate/plugin").then((module) => module.PHI_RATE_WIDGET_PLUGIN),
  }),
  defineFirstPartyWidget({
    definition: PHI_CHECKBOX_WIDGET_DEFINITION,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/checkbox/plugin").then((module) => module.PHI_CHECKBOX_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/checkbox/plugin").then((module) => module.PHI_CHECKBOX_WIDGET_PLUGIN),
  }),
  defineFirstPartyWidget({
    definition: PHI_CHECKBOX_GROUP_WIDGET_DEFINITION,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/checkbox-group/plugin").then((module) => module.PHI_CHECKBOX_GROUP_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/checkbox-group/plugin").then((module) => module.PHI_CHECKBOX_GROUP_WIDGET_PLUGIN),
  }),
  defineFirstPartyWidget({
    definition: PHI_SLOT_UPLOAD_WIDGET_DEFINITION,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/slot-upload/plugin")
      .then((module) => module.PHI_SLOT_UPLOAD_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/slot-upload/plugin")
      .then((module) => module.PHI_SLOT_UPLOAD_WIDGET_PLUGIN),
  }),
  defineFirstPartyWidget({
    definition: PHI_LOCALE_WIDGET_DEFINITION,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/locale/plugin").then((module) => module.PHI_LOCALE_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/locale/plugin").then((module) => module.PHI_LOCALE_WIDGET_PLUGIN),
  }),
  defineFirstPartyWidget({
    definition: PHI_MARKDOWN_TOC_WIDGET_DEFINITION,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/markdown-toc/plugin").then((module) => module.PHI_MARKDOWN_TOC_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/markdown-toc/plugin").then((module) => module.PHI_MARKDOWN_TOC_WIDGET_PLUGIN),
  }),
  defineFirstPartyWidget({
    definition: PHI_MARKDOWN_WIDGET_DEFINITION,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/markdown/plugin").then((module) => module.PHI_MARKDOWN_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/markdown/plugin").then((module) => module.PHI_MARKDOWN_WIDGET_PLUGIN),
  }),
  defineFirstPartyWidget({
    definition: PHI_MULTI_SELECT_WIDGET_DEFINITION,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/multi-select/plugin").then((module) => module.PHI_MULTI_SELECT_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/multi-select/plugin").then((module) => module.PHI_MULTI_SELECT_WIDGET_PLUGIN),
  }),
  defineFirstPartyWidget({
    definition: PHI_PAGE_TITLE_WIDGET_DEFINITION,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/page-title/plugin").then((module) => module.PHI_PAGE_TITLE_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/page-title/plugin").then((module) => module.PHI_PAGE_TITLE_WIDGET_PLUGIN),
  }),
  defineFirstPartyWidget({
    definition: PHI_PAGINATION_WIDGET_DEFINITION,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/pagination/plugin").then((module) => module.PHI_PAGINATION_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/pagination/plugin").then((module) => module.PHI_PAGINATION_WIDGET_PLUGIN),
  }),
  defineFirstPartyWidget({
    definition: PHI_PROFILE_EMAIL_WIDGET_DEFINITION,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/profile-email/plugin").then((module) => module.PHI_PROFILE_EMAIL_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/profile-email/plugin").then((module) => module.PHI_PROFILE_EMAIL_WIDGET_PLUGIN),
  }),
  defineFirstPartyWidget({
    definition: PHI_PROFILE_LOCALE_WIDGET_DEFINITION,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/profile-locale/plugin").then((module) => module.PHI_PROFILE_LOCALE_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/profile-locale/plugin").then((module) => module.PHI_PROFILE_LOCALE_WIDGET_PLUGIN),
  }),
  defineFirstPartyWidget({
    definition: PHI_PROFILE_NAME_WIDGET_DEFINITION,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/profile-name/plugin").then((module) => module.PHI_PROFILE_NAME_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/profile-name/plugin").then((module) => module.PHI_PROFILE_NAME_WIDGET_PLUGIN),
  }),
  defineFirstPartyWidget({
    definition: PHI_PROFILE_OVERVIEW_WIDGET_DEFINITION,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/profile-overview/plugin").then((module) => module.PHI_PROFILE_OVERVIEW_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/profile-overview/plugin").then((module) => module.PHI_PROFILE_OVERVIEW_WIDGET_PLUGIN),
  }),
  defineFirstPartyWidget({
    definition: PHI_PROFILE_PASSWORD_WIDGET_DEFINITION,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/profile-password/plugin").then((module) => module.PHI_PROFILE_PASSWORD_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/profile-password/plugin").then((module) => module.PHI_PROFILE_PASSWORD_WIDGET_PLUGIN),
  }),
  defineFirstPartyWidget({
    definition: PHI_QUICK_LINKS_WIDGET_DEFINITION,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/quick-links/plugin").then((module) => module.PHI_QUICK_LINKS_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/quick-links/plugin").then((module) => module.PHI_QUICK_LINKS_WIDGET_PLUGIN),
  }),
  defineFirstPartyWidget({
    definition: PHI_RESULT_WIDGET_DEFINITION,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/result/plugin").then((module) => module.PHI_RESULT_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/result/plugin").then((module) => module.PHI_RESULT_WIDGET_PLUGIN),
  }),
  defineFirstPartyWidget({
    definition: PHI_SEGMENTED_WIDGET_DEFINITION,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/segmented/plugin").then((module) => module.PHI_SEGMENTED_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/segmented/plugin").then((module) => module.PHI_SEGMENTED_WIDGET_PLUGIN),
  }),
  defineFirstPartyWidget({
    definition: PHI_SELECT_BOX_WIDGET_DEFINITION,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/select-box/plugin").then((module) => module.PHI_SELECT_BOX_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/select-box/plugin").then((module) => module.PHI_SELECT_BOX_WIDGET_PLUGIN),
  }),
  defineFirstPartyWidget({
    definition: PHI_SIDEBAR_NAVIGATION_WIDGET_DEFINITION,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/sidebar-navigation/plugin").then((module) => module.PHI_SIDEBAR_NAVIGATION_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/sidebar-navigation/plugin").then((module) => module.PHI_SIDEBAR_NAVIGATION_WIDGET_PLUGIN),
  }),
  defineFirstPartyWidget({
    definition: PHI_SIMPLE_TEXT_WIDGET_DEFINITION,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/simple-text/plugin").then((module) => module.PHI_SIMPLE_TEXT_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/simple-text/plugin").then((module) => module.PHI_SIMPLE_TEXT_WIDGET_PLUGIN),
  }),
  defineFirstPartyWidget({
    definition: PHI_SPACER_WIDGET_DEFINITION,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/spacer/plugin").then((module) => module.PHI_SPACER_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/spacer/plugin").then((module) => module.PHI_SPACER_WIDGET_PLUGIN),
  }),
  defineFirstPartyWidget({
    definition: PHI_SWITCH_WIDGET_DEFINITION,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/switch/plugin").then((module) => module.PHI_SWITCH_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/switch/plugin").then((module) => module.PHI_SWITCH_WIDGET_PLUGIN),
  }),
  defineFirstPartyWidget({
    definition: PHI_TAB_BAR_WIDGET_DEFINITION,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("../../../components/widgets/plugins/stack-tabs-widget-plugin").then((module) => module.PHI_TAB_BAR_WIDGET_PLUGIN),
    loadPreview: () => import("../../../components/widgets/plugins/stack-tabs-widget-plugin").then((module) => module.PHI_TAB_BAR_WIDGET_PLUGIN),
  }),
  defineFirstPartyWidget({
    definition: PHI_TABLE_WIDGET_DEFINITION,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/table/plugin").then((module) => module.PHI_TABLE_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/table/plugin").then((module) => module.PHI_TABLE_WIDGET_PLUGIN),
  }),
  defineFirstPartyWidget({
    definition: PHI_TREE_WIDGET_DEFINITION,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/tree/plugin").then((module) => module.PHI_TREE_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/tree/plugin").then((module) => module.PHI_TREE_WIDGET_PLUGIN),
  }),
] as const;
