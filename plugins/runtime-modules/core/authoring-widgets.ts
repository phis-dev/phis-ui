"use client";

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
import {
  createPhiAuthoringWidgetModule,
  definePhiAuthoringWidgetModuleLoader,
} from "../client-authoring-widget-module";

export default createPhiAuthoringWidgetModule([
  definePhiAuthoringWidgetModuleLoader(
    PHI_DATE_PICKER_WIDGET_DEFINITION,
    () => import("./widgets/date-picker/authoring")
      .then((module) => module.PHI_DATE_PICKER_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_ACCOUNT_WIDGET_DEFINITION,
    () => import("./widgets/account/authoring").then((module) => module.PHI_ACCOUNT_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_AREA_MENU_WIDGET_DEFINITION,
    () => import("./widgets/area-menu/authoring").then((module) => module.PHI_AREA_MENU_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_BRAND_WIDGET_DEFINITION,
    () => import("./widgets/brand/authoring").then((module) => module.PHI_BRAND_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_BREADCRUMB_WIDGET_DEFINITION,
    () => import("./widgets/breadcrumb/authoring").then((module) => module.PHI_BREADCRUMB_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_BUTTON_WIDGET_DEFINITION,
    () => import("./widgets/button/authoring").then((module) => module.PHI_BUTTON_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_CARD_WIDGET_DEFINITION,
    () => import("./widgets/card/authoring").then((module) => module.PHI_CARD_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_CASCADER_WIDGET_DEFINITION,
    () => import("./widgets/cascader/authoring").then((module) => module.PHI_CASCADER_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_COLLECTION_VIEW_WIDGET_DEFINITION,
    () => import("./widgets/collection-view/authoring").then((module) => module.PHI_COLLECTION_VIEW_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_COLOR_WIDGET_DEFINITION,
    () => import("./widgets/color/authoring").then((module) => module.PHI_COLOR_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_COMMAND_TOOLBAR_WIDGET_DEFINITION,
    () => import("./widgets/command-toolbar/authoring").then((module) => module.PHI_COMMAND_TOOLBAR_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_DESCRIPTION_WIDGET_DEFINITION,
    () => import("./widgets/description/authoring").then((module) => module.PHI_DESCRIPTION_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_DIMENSION_WIDGET_DEFINITION,
    () => import("./widgets/dimension/authoring").then((module) => module.PHI_DIMENSION_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_LENGTH_WIDGET_DEFINITION,
    () => import("./widgets/length/authoring").then((module) => module.PHI_LENGTH_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_FOOTER_WIDGET_DEFINITION,
    () => import("./widgets/footer/authoring").then((module) => module.PHI_FOOTER_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_FORM_WIDGET_DEFINITION,
    () => import("./widgets/form/authoring").then((module) => module.PHI_FORM_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_HEADER_NAVIGATION_WIDGET_DEFINITION,
    () => import("./widgets/header-navigation/authoring").then((module) => module.PHI_HEADER_NAVIGATION_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_HTML_WIDGET_DEFINITION,
    () => import("./widgets/html/authoring").then((module) => module.PHI_HTML_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_ICON_WIDGET_DEFINITION,
    () => import("./widgets/icon/authoring").then((module) => module.PHI_ICON_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_IMAGE_WIDGET_DEFINITION,
    () => import("./widgets/image/authoring").then((module) => module.PHI_IMAGE_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_INPUT_WIDGET_DEFINITION,
    () => import("./widgets/input/authoring").then((module) => module.PHI_INPUT_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_NUMBER_INPUT_WIDGET_DEFINITION,
    () => import("./widgets/number-input/authoring").then((module) => module.PHI_NUMBER_INPUT_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_SLIDER_WIDGET_DEFINITION,
    () => import("./widgets/slider/authoring").then((module) => module.PHI_SLIDER_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_RATE_WIDGET_DEFINITION,
    () => import("./widgets/rate/authoring").then((module) => module.PHI_RATE_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_CHECKBOX_WIDGET_DEFINITION,
    () => import("./widgets/checkbox/authoring").then((module) => module.PHI_CHECKBOX_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_CHECKBOX_GROUP_WIDGET_DEFINITION,
    () => import("./widgets/checkbox-group/authoring").then((module) => module.PHI_CHECKBOX_GROUP_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_SLOT_UPLOAD_WIDGET_DEFINITION,
    () => import("./widgets/slot-upload/authoring")
      .then((module) => module.PHI_SLOT_UPLOAD_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_LOCALE_WIDGET_DEFINITION,
    () => import("./widgets/locale/authoring").then((module) => module.PHI_LOCALE_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_MARKDOWN_TOC_WIDGET_DEFINITION,
    () => import("./widgets/markdown-toc/authoring").then((module) => module.PHI_MARKDOWN_TOC_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_MARKDOWN_WIDGET_DEFINITION,
    () => import("./widgets/markdown/authoring").then((module) => module.PHI_MARKDOWN_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_MULTI_SELECT_WIDGET_DEFINITION,
    () => import("./widgets/multi-select/authoring").then((module) => module.PHI_MULTI_SELECT_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_PAGE_TITLE_WIDGET_DEFINITION,
    () => import("./widgets/page-title/authoring").then((module) => module.PHI_PAGE_TITLE_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_PAGINATION_WIDGET_DEFINITION,
    () => import("./widgets/pagination/authoring").then((module) => module.PHI_PAGINATION_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_PROFILE_EMAIL_WIDGET_DEFINITION,
    () => import("./widgets/profile-email/authoring").then((module) => module.PHI_PROFILE_EMAIL_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_PROFILE_LOCALE_WIDGET_DEFINITION,
    () => import("./widgets/profile-locale/authoring").then((module) => module.PHI_PROFILE_LOCALE_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_PROFILE_NAME_WIDGET_DEFINITION,
    () => import("./widgets/profile-name/authoring").then((module) => module.PHI_PROFILE_NAME_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_PROFILE_OVERVIEW_WIDGET_DEFINITION,
    () => import("./widgets/profile-overview/authoring").then((module) => module.PHI_PROFILE_OVERVIEW_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_PROFILE_PASSWORD_WIDGET_DEFINITION,
    () => import("./widgets/profile-password/authoring").then((module) => module.PHI_PROFILE_PASSWORD_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_QUICK_LINKS_WIDGET_DEFINITION,
    () => import("./widgets/quick-links/authoring").then((module) => module.PHI_QUICK_LINKS_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_RESULT_WIDGET_DEFINITION,
    () => import("./widgets/result/authoring").then((module) => module.PHI_RESULT_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_SEGMENTED_WIDGET_DEFINITION,
    () => import("./widgets/segmented/authoring").then((module) => module.PHI_SEGMENTED_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_SELECT_BOX_WIDGET_DEFINITION,
    () => import("./widgets/select-box/authoring").then((module) => module.PHI_SELECT_BOX_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_SIDEBAR_NAVIGATION_WIDGET_DEFINITION,
    () => import("./widgets/sidebar-navigation/authoring").then((module) => module.PHI_SIDEBAR_NAVIGATION_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_SIMPLE_TEXT_WIDGET_DEFINITION,
    () => import("./widgets/simple-text/authoring").then((module) => module.PHI_SIMPLE_TEXT_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_SPACER_WIDGET_DEFINITION,
    () => import("./widgets/spacer/authoring").then((module) => module.PHI_SPACER_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_SWITCH_WIDGET_DEFINITION,
    () => import("./widgets/switch/authoring").then((module) => module.PHI_SWITCH_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_TAB_BAR_WIDGET_DEFINITION,
    () => import("../../../components/widgets/builder/stack-tabs").then((module) => module.PHI_TAB_BAR_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_TABLE_WIDGET_DEFINITION,
    () => import("./widgets/table/authoring").then((module) => module.PHI_TABLE_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_TREE_WIDGET_DEFINITION,
    () => import("./widgets/tree/authoring").then((module) => module.PHI_TREE_WIDGET_BUILDER_PLUGIN),
  ),
]);
