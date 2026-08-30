import type { PhiRuntimeModuleControllerClientLoader } from "../../../components/runtime/runtime-module-controller-client-manifest";
import {
  createPhiRuntimeModuleRenderClientManifest,
  definePhiRuntimeModuleRenderClientLoader,
} from "../../../components/runtime/runtime-module-render-client-manifest";
import { PhiCmsWidgetType } from "../../../constants/cms-widget-types";
import { PhiCmsLayoutType } from "../../../constants/cms-layout-types";
import { PhiRuntimeRenderClientType } from "../../../constants/runtime-render-client-types";
import { PHI_ASSET_RUNTIME_MODULE_ID } from "../asset/ids";
import { createPhiRuntimeModuleCalendarAdapterClientManifest } from "../../../components/runtime/runtime-module-calendar-adapter-client-manifest";
import { PHI_CORE_CALENDAR_ADAPTER_CLIENT_DEFINITIONS } from "../client-calendar-adapters/core";

export const PHI_COMMON_RUNTIME_MODULE_CALENDAR_ADAPTER_CLIENT_MANIFEST =
  createPhiRuntimeModuleCalendarAdapterClientManifest(
    PHI_CORE_CALENDAR_ADAPTER_CLIENT_DEFINITIONS,
  );

export const PHI_COMMON_RUNTIME_MODULE_CONTROLLER_CLIENT_LOADERS = [
  [
    PHI_ASSET_RUNTIME_MODULE_ID,
    () => import("../asset/client")
      .then((module) => module.loadPhiAssetRuntimeControllerClient()),
  ],
] as const satisfies ReadonlyArray<readonly [string, PhiRuntimeModuleControllerClientLoader]>;

export const PHI_COMMON_RUNTIME_MODULE_RENDER_CLIENT_MANIFEST =
  createPhiRuntimeModuleRenderClientManifest([
    [
      PhiRuntimeRenderClientType.RegionContainerEnhancer,
      definePhiRuntimeModuleRenderClientLoader(
        () => import("../../../components/regions/clients/cms-region-container-client")
          .then((module) => module.PhiCmsRegionContainerClient),
      ),
    ],
    [
      PhiRuntimeRenderClientType.OverlayContainer,
      definePhiRuntimeModuleRenderClientLoader(
        () => import("../../../components/overlays/phi-overlay-container-client")
          .then((module) => module.PhiOverlayContainerClient),
      ),
    ],
    [
      PhiRuntimeRenderClientType.SlotChildFrameEnhancer,
      definePhiRuntimeModuleRenderClientLoader(
        () => import("../../runtime/phi-slot-child-frame-client")
          .then((module) => module.PhiSlotChildFrameClient),
      ),
    ],
    [
      PhiRuntimeRenderClientType.FormDescriptor,
      definePhiRuntimeModuleRenderClientLoader(
        () => import("../../../components/forms/form-descriptor-runtime-client")
          .then((module) => module.PhiFormDescriptorRuntimeClient),
      ),
    ],
    [
      PhiCmsWidgetType.Button,
      definePhiRuntimeModuleRenderClientLoader(
        () => import("../core/widgets/button/client")
          .then((module) => module.PhiButtonWidget),
      ),
    ],
    [
      PhiCmsWidgetType.Cascader,
      definePhiRuntimeModuleRenderClientLoader(
        () => import("../core/widgets/cascader/client")
          .then((module) => module.PhiCascaderWidget),
      ),
    ],
    [
      PhiCmsWidgetType.Color,
      definePhiRuntimeModuleRenderClientLoader(
        () => import("../../../components/widgets/client/phi-color-widget")
          .then((module) => module.PhiColorWidget),
      ),
    ],
    [
      PhiCmsWidgetType.DatePicker,
      definePhiRuntimeModuleRenderClientLoader(
        () => import("../core/widgets/date-picker/client")
          .then((module) => module.PhiDatePickerWidget),
      ),
    ],
    [
      PhiCmsWidgetType.CommandToolbar,
      definePhiRuntimeModuleRenderClientLoader(
        () => import("../core/widgets/command-toolbar/client")
          .then((module) => module.PhiCommandToolbarWidget),
      ),
    ],
    [
      PhiCmsWidgetType.Input,
      definePhiRuntimeModuleRenderClientLoader(
        () => import("../core/widgets/input/client")
          .then((module) => module.PhiInputWidget),
      ),
    ],
    [
      PhiCmsWidgetType.NumberInput,
      definePhiRuntimeModuleRenderClientLoader(
        () => import("../core/widgets/number-input/client")
          .then((module) => module.PhiNumberInputWidget),
      ),
    ],
    [
      PhiCmsWidgetType.Slider,
      definePhiRuntimeModuleRenderClientLoader(
        () => import("../core/widgets/slider/client")
          .then((module) => module.PhiSliderWidget),
      ),
    ],
    [
      PhiCmsWidgetType.Rate,
      definePhiRuntimeModuleRenderClientLoader(
        () => import("../core/widgets/rate/client")
          .then((module) => module.PhiRateWidget),
      ),
    ],
    [
      PhiCmsWidgetType.Checkbox,
      definePhiRuntimeModuleRenderClientLoader(
        () => import("../core/widgets/checkbox/client")
          .then((module) => module.PhiCheckboxWidget),
      ),
    ],
    [
      PhiCmsWidgetType.CheckboxGroup,
      definePhiRuntimeModuleRenderClientLoader(
        () => import("../core/widgets/checkbox-group/client")
          .then((module) => module.PhiCheckboxGroupWidget),
      ),
    ],
    [
      PhiCmsWidgetType.MultiSelect,
      definePhiRuntimeModuleRenderClientLoader(
        () => import("../core/widgets/multi-select/client")
          .then((module) => module.PhiMultiSelectWidget),
      ),
    ],
    [
      PhiCmsWidgetType.Pagination,
      definePhiRuntimeModuleRenderClientLoader(
        () => import("../core/widgets/pagination/client")
          .then((module) => module.PhiPaginationWidget),
      ),
    ],
    [
      PhiCmsWidgetType.Segmented,
      definePhiRuntimeModuleRenderClientLoader(
        () => import("../core/widgets/segmented/client")
          .then((module) => module.PhiSegmentedWidget),
      ),
    ],
    [
      PhiCmsWidgetType.SelectBox,
      definePhiRuntimeModuleRenderClientLoader(
        () => import("../core/widgets/select-box/client")
          .then((module) => module.PhiSelectBoxWidget),
      ),
    ],
    [
      PhiCmsWidgetType.Dimension,
      definePhiRuntimeModuleRenderClientLoader(
        () => import("../core/widgets/dimension/client")
          .then((module) => module.PhiDimensionWidget),
      ),
    ],
    [
      PhiCmsWidgetType.Length,
      definePhiRuntimeModuleRenderClientLoader(
        () => import("../core/widgets/length/client")
          .then((module) => module.PhiLengthWidget),
      ),
    ],
    [
      PhiCmsWidgetType.Spacer,
      definePhiRuntimeModuleRenderClientLoader(
        () => import("../core/widgets/spacer/client")
          .then((module) => module.PhiSpacerWidget),
      ),
    ],
    [
      PhiCmsWidgetType.Switch,
      definePhiRuntimeModuleRenderClientLoader(
        () => import("../core/widgets/switch/client")
          .then((module) => module.PhiSwitchWidget),
      ),
    ],
    [
      PhiCmsWidgetType.Table,
      definePhiRuntimeModuleRenderClientLoader(
        () => import("../core/widgets/table/client")
          .then((module) => module.PhiTableWidgetClient),
      ),
    ],
    [
      PhiCmsWidgetType.Tree,
      definePhiRuntimeModuleRenderClientLoader(
        () => import("../core/widgets/tree/client")
          .then((module) => module.PhiTreeWidgetClient),
      ),
    ],
    [
      PhiCmsWidgetType.Account,
      definePhiRuntimeModuleRenderClientLoader(
        () => import("../core/widgets/account/client")
          .then((module) => module.PhiAccountWidgetClient),
      ),
    ],
    [
      PhiRuntimeRenderClientType.AccountPreview,
      definePhiRuntimeModuleRenderClientLoader(
        () => import("../../../components/widgets/client/account-preview")
          .then((module) => module.PhiAccountWidgetPreview),
      ),
    ],
    [
      PhiCmsWidgetType.AreaMenu,
      definePhiRuntimeModuleRenderClientLoader(
        () => import("../core/widgets/area-menu/client")
          .then((module) => module.PhiAreaMenuWidgetClient),
      ),
    ],
    [
      PhiRuntimeRenderClientType.AreaMenuPreview,
      definePhiRuntimeModuleRenderClientLoader(
        () => import("../../../components/widgets/client/area-menu-preview")
          .then((module) => module.PhiAreaMenuWidgetPreview),
      ),
    ],
    [
      PhiCmsWidgetType.Breadcrumb,
      definePhiRuntimeModuleRenderClientLoader(
        () => import("../core/widgets/breadcrumb/client")
          .then((module) => module.PhiBreadcrumbWidget),
      ),
    ],
    [
      PhiCmsWidgetType.Card,
      definePhiRuntimeModuleRenderClientLoader(
        () => import("../core/widgets/card/client")
          .then((module) => module.PhiCardWidgetClient),
      ),
    ],
    [
      PhiCmsWidgetType.CollectionView,
      definePhiRuntimeModuleRenderClientLoader(
        () => import("../../../components/widgets/client/collection-view-widget")
          .then((module) => module.PhiCollectionViewWidget),
      ),
    ],
    [
      PhiCmsWidgetType.Description,
      definePhiRuntimeModuleRenderClientLoader(
        () => import("../core/widgets/description/client")
          .then((module) => module.PhiDescriptionWidgetClient),
      ),
    ],
    [
      PhiCmsWidgetType.Footer,
      definePhiRuntimeModuleRenderClientLoader(
        () => import("../core/widgets/footer/client")
          .then((module) => module.PhiFooterWidgetClient),
      ),
    ],
    [
      PhiCmsWidgetType.Html,
      definePhiRuntimeModuleRenderClientLoader(
        () => import("../core/widgets/html/client")
          .then((module) => module.PhiHtmlWidgetClient),
      ),
    ],
    [
      PhiCmsWidgetType.Icon,
      definePhiRuntimeModuleRenderClientLoader(
        () => import("../core/widgets/icon/client")
          .then((module) => module.PhiIconWidgetClient),
      ),
    ],
    [
      PhiCmsWidgetType.Image,
      definePhiRuntimeModuleRenderClientLoader(
        () => import("../core/widgets/image/client")
          .then((module) => module.PhiImageWidget),
      ),
    ],
    [
      PhiCmsWidgetType.MarkdownToc,
      definePhiRuntimeModuleRenderClientLoader(
        () => import("../core/widgets/markdown-toc/client")
          .then((module) => module.PhiMarkdownTocWidgetClient),
      ),
    ],
    [
      PhiCmsWidgetType.PageTitle,
      definePhiRuntimeModuleRenderClientLoader(
        () => import("../core/widgets/page-title/client")
          .then((module) => module.PhiPageTitleWidgetClient),
      ),
    ],
    [
      PhiCmsWidgetType.ProfileEmail,
      definePhiRuntimeModuleRenderClientLoader(
        () => import("../core/widgets/profile-email/client")
          .then((module) => module.PhiProfileEmailWidgetClient),
      ),
    ],
    [
      PhiCmsWidgetType.AccountAvatar,
      definePhiRuntimeModuleRenderClientLoader(
        () => import("../avatar/widgets/account-avatar/client")
          .then((module) => module.PhiAccountAvatarWidgetClient),
      ),
    ],
    [
      PhiCmsWidgetType.AccountAvatarPicker,
      definePhiRuntimeModuleRenderClientLoader(
        () => import("../avatar/widgets/account-avatar-picker/client")
          .then((module) => module.PhiAccountAvatarPickerWidgetClient),
      ),
    ],
    [
      PhiCmsWidgetType.ProfileLocale,
      definePhiRuntimeModuleRenderClientLoader(
        () => import("../core/widgets/profile-locale/client")
          .then((module) => module.PhiProfileLocaleWidgetClient),
      ),
    ],
    [
      PhiCmsWidgetType.ProfileName,
      definePhiRuntimeModuleRenderClientLoader(
        () => import("../core/widgets/profile-name/client")
          .then((module) => module.PhiProfileNameWidgetClient),
      ),
    ],
    [
      PhiCmsWidgetType.ProfileOverview,
      definePhiRuntimeModuleRenderClientLoader(
        () => import("../core/widgets/profile-overview/client")
          .then((module) => module.PhiProfileOverviewWidgetClient),
      ),
    ],
    [
      PhiCmsWidgetType.ProfilePassword,
      definePhiRuntimeModuleRenderClientLoader(
        () => import("../core/widgets/profile-password/client")
          .then((module) => module.PhiProfilePasswordWidgetClient),
      ),
    ],
    [
      PhiRuntimeRenderClientType.SearchStandalone,
      definePhiRuntimeModuleRenderClientLoader(
        () => import("../../../components/widgets/client/search")
          .then((module) => module.PhiSearchWidget),
      ),
    ],
    [
      PhiCmsWidgetType.SidebarNavigation,
      definePhiRuntimeModuleRenderClientLoader(
        () => import("../core/widgets/sidebar-navigation/client")
          .then((module) => module.PhiSidebarNavigationWidgetClient),
      ),
    ],
    [
      PhiRuntimeRenderClientType.SidebarNavigationPreview,
      definePhiRuntimeModuleRenderClientLoader(
        () => import("../core/widgets/sidebar-navigation/client")
          .then((module) => module.PhiSidebarNavigationWidgetPreviewClient),
      ),
    ],
    [
      PhiCmsWidgetType.TabBar,
      definePhiRuntimeModuleRenderClientLoader(
        () => import("../../../components/widgets/client/stack-tabs")
          .then((module) => module.PhiTabBarWidgetClient),
      ),
    ],
    [
      PhiCmsWidgetType.AreaUpload,
      definePhiRuntimeModuleRenderClientLoader(
        () => import("../../../components/media/phi-area-upload-widget")
          .then((module) => module.PhiAreaUploadWidget),
      ),
    ],
    [
      PhiCmsWidgetType.ImageInspector,
      definePhiRuntimeModuleRenderClientLoader(
        () => import("../../../components/media/phi-image-inspector-widget")
          .then((module) => module.PhiAssetConfigWidget),
      ),
    ],
    [
      PhiCmsWidgetType.MediaPicker,
      definePhiRuntimeModuleRenderClientLoader(
        () => import("../../../components/media/phi-media-picker-widget")
          .then((module) => module.PhiMediaPickerWidget),
      ),
    ],
    [
      PhiCmsLayoutType.Grid,
      definePhiRuntimeModuleRenderClientLoader(
        () => import("../../../components/layouts/clients/phi-grid-layout-client")
          .then((module) => module.PhiGridLayout),
      ),
    ],
    [
      PhiCmsLayoutType.Collapsible,
      definePhiRuntimeModuleRenderClientLoader(
        () => import("../../../components/layouts/clients/phi-collapsible-layout-client")
          .then((module) => module.PhiCollapsibleLayout),
      ),
    ],
    [
      PhiCmsLayoutType.Stack,
      definePhiRuntimeModuleRenderClientLoader(
        () => import("../../../components/layouts/clients/phi-stack-layout-client")
          .then((module) => module.PhiStackLayout),
      ),
    ],
    [
      PhiCmsWidgetType.Brand,
      definePhiRuntimeModuleRenderClientLoader(
        () => import("../core/widgets/brand/client")
          .then((module) => module.PhiBrandWidgetClient),
      ),
    ],
    [
      PhiCmsWidgetType.HeaderNavigation,
      definePhiRuntimeModuleRenderClientLoader(
        () => import("../core/widgets/header-navigation/client")
          .then((module) => module.PhiHeaderNavigationWidgetClient),
      ),
    ],
    [
      PhiCmsWidgetType.Locale,
      definePhiRuntimeModuleRenderClientLoader(
        () => import("../../../components/shell/phi-locale-switch")
          .then((module) => module.PhiLocaleSwitch),
      ),
    ],
    [
      PhiCmsWidgetType.Markdown,
      definePhiRuntimeModuleRenderClientLoader(
        () => import("../core/widgets/markdown/client")
          .then((module) => module.PhiMarkdownWidgetClient),
      ),
    ],
    [
      PhiCmsWidgetType.QuickLinks,
      definePhiRuntimeModuleRenderClientLoader(
        () => import("../core/widgets/quick-links/client")
          .then((module) => module.PhiQuickLinksWidgetClient),
      ),
    ],
    [
      PhiCmsWidgetType.SimpleText,
      definePhiRuntimeModuleRenderClientLoader(
        () => import("../core/widgets/simple-text/client")
          .then((module) => module.PhiSimpleTextWidgetClient),
      ),
    ],
  ]);
