import dynamic from "next/dynamic";
import type { PhiRuntimeModuleControllerClient } from "../../../components/runtime/runtime-module-controller-client-manifest";
import {
  createPhiRuntimeModuleRenderClientManifest,
  definePhiRuntimeModuleRenderClient,
} from "../../../components/runtime/runtime-module-render-client-manifest";
import { PhiCmsWidgetType } from "../../../constants/cms-widget-types";
import { PhiCmsLayoutType } from "../../../constants/cms-layout-types";
import { PhiRuntimeRenderClientType } from "../../../constants/runtime-render-client-types";
import { PHI_ASSET_RUNTIME_MODULE_ID } from "../asset/ids";
import { createPhiRuntimeModuleCalendarAdapterClientManifest } from "../../../components/runtime/runtime-module-calendar-adapter-client-manifest";
import { PHI_CORE_CALENDAR_ADAPTER_CLIENT_DEFINITIONS } from "../client-calendar-adapters/core";
import { PhiLazyAssetRuntimeControllerClient } from "../asset/client";

export const PHI_COMMON_RUNTIME_MODULE_CALENDAR_ADAPTER_CLIENT_MANIFEST =
  createPhiRuntimeModuleCalendarAdapterClientManifest(
    PHI_CORE_CALENDAR_ADAPTER_CLIENT_DEFINITIONS,
  );

export const PHI_COMMON_RUNTIME_MODULE_CONTROLLER_CLIENT_LOADERS = [
  [
    PHI_ASSET_RUNTIME_MODULE_ID,
    PhiLazyAssetRuntimeControllerClient,
  ],
] as const satisfies ReadonlyArray<readonly [string, PhiRuntimeModuleControllerClient]>;

export const PHI_COMMON_RUNTIME_MODULE_RENDER_CLIENT_MANIFEST =
  createPhiRuntimeModuleRenderClientManifest([
    [
      PhiRuntimeRenderClientType.RegionContainerEnhancer,
      definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../../../components/regions/clients/cms-region-container-client").then((module) => module.PhiCmsRegionContainerClient)),
      ),
    ],
    [
      PhiRuntimeRenderClientType.OverlayContainer,
      definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../../../components/overlays/phi-overlay-container-client").then((module) => module.PhiOverlayContainerClient)),
      ),
    ],
    [
      PhiRuntimeRenderClientType.SlotChildFrameEnhancer,
      definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../../runtime/phi-slot-child-frame-client").then((module) => module.PhiSlotChildFrameClient)),
      ),
    ],
    [
      PhiRuntimeRenderClientType.FormDescriptor,
      definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../../../components/forms/form-descriptor-runtime-client").then((module) => module.PhiFormDescriptorRuntimeClient)),
      ),
    ],
    [
      PhiCmsWidgetType.Button,
      definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../core/widgets/button/client").then((module) => module.PhiButtonWidget)),
      ),
    ],
    [
      PhiCmsWidgetType.Cascader,
      definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../core/widgets/cascader/client").then((module) => module.PhiCascaderWidget)),
      ),
    ],
    [
      PhiCmsWidgetType.Color,
      definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../../../components/widgets/client/phi-color-widget").then((module) => module.PhiColorWidget)),
      ),
    ],
    [
      PhiCmsWidgetType.DatePicker,
      definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../core/widgets/date-picker/client").then((module) => module.PhiDatePickerWidget)),
      ),
    ],
    [
      PhiCmsWidgetType.CommandToolbar,
      definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../core/widgets/command-toolbar/client").then((module) => module.PhiCommandToolbarWidget)),
      ),
    ],
    [
      PhiCmsWidgetType.Input,
      definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../core/widgets/input/client").then((module) => module.PhiInputWidget)),
      ),
    ],
    [
      PhiCmsWidgetType.Otp,
      definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../core/widgets/otp/client").then((module) => module.PhiOtpWidget)),
      ),
    ],
    [
      PhiCmsWidgetType.NumberInput,
      definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../core/widgets/number-input/client").then((module) => module.PhiNumberInputWidget)),
      ),
    ],
    [
      PhiCmsWidgetType.Slider,
      definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../core/widgets/slider/client").then((module) => module.PhiSliderWidget)),
      ),
    ],
    [
      PhiCmsWidgetType.Rate,
      definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../core/widgets/rate/client").then((module) => module.PhiRateWidget)),
      ),
    ],
    [
      PhiCmsWidgetType.Checkbox,
      definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../core/widgets/checkbox/client").then((module) => module.PhiCheckboxWidget)),
      ),
    ],
    [
      PhiCmsWidgetType.CheckboxGroup,
      definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../core/widgets/checkbox-group/client").then((module) => module.PhiCheckboxGroupWidget)),
      ),
    ],
    [
      PhiCmsWidgetType.MultiSelect,
      definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../core/widgets/multi-select/client").then((module) => module.PhiMultiSelectWidget)),
      ),
    ],
    [
      PhiCmsWidgetType.Pagination,
      definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../core/widgets/pagination/client").then((module) => module.PhiPaginationWidget)),
      ),
    ],
    [
      PhiCmsWidgetType.Segmented,
      definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../core/widgets/segmented/client").then((module) => module.PhiSegmentedWidget)),
      ),
    ],
    [
      PhiCmsWidgetType.SelectBox,
      definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../core/widgets/select-box/client").then((module) => module.PhiSelectBoxWidget)),
      ),
    ],
    [
      PhiCmsWidgetType.Dimension,
      definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../core/widgets/dimension/client").then((module) => module.PhiDimensionWidget)),
      ),
    ],
    [
      PhiCmsWidgetType.Length,
      definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../core/widgets/length/client").then((module) => module.PhiLengthWidget)),
      ),
    ],
    [
      PhiCmsWidgetType.Gallery,
      definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../core/widgets/gallery/client").then((module) => module.PhiGalleryWidget)),
      ),
    ],
    [
      PhiCmsWidgetType.Spacer,
      definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../core/widgets/spacer/client").then((module) => module.PhiSpacerWidget)),
      ),
    ],
    [
      PhiCmsWidgetType.Switch,
      definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../core/widgets/switch/client").then((module) => module.PhiSwitchWidget)),
      ),
    ],
    [
      PhiCmsWidgetType.Record,
      definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../core/widgets/record/client").then((module) => module.PhiRecordWidgetClient)),
      ),
    ],
    [
      PhiCmsWidgetType.Table,
      definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../core/widgets/table/client").then((module) => module.PhiTableWidgetClient)),
      ),
    ],
    [
      PhiCmsWidgetType.Tree,
      definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../core/widgets/tree/client").then((module) => module.PhiTreeWidgetClient)),
      ),
    ],
    [
      PhiCmsWidgetType.Account,
      definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../core/widgets/account/client").then((module) => module.PhiAccountWidgetClient)),
      ),
    ],
    [
      PhiRuntimeRenderClientType.AccountPreview,
      definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../../../components/widgets/client/account-preview").then((module) => module.PhiAccountWidgetPreview)),
      ),
    ],
    [
      PhiCmsWidgetType.Breadcrumb,
      definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../core/widgets/breadcrumb/client").then((module) => module.PhiBreadcrumbWidget)),
      ),
    ],
    [
      PhiCmsWidgetType.Card,
      definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../core/widgets/card/client").then((module) => module.PhiCardWidgetClient)),
      ),
    ],
    [
      PhiCmsWidgetType.CollectionView,
      definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../../../components/widgets/client/collection-view-widget").then((module) => module.PhiCollectionViewWidget)),
      ),
    ],
    [
      PhiCmsWidgetType.Description,
      definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../core/widgets/description/client").then((module) => module.PhiDescriptionWidgetClient)),
      ),
    ],
    [
      PhiCmsWidgetType.Html,
      definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../core/widgets/html/client").then((module) => module.PhiHtmlWidgetClient)),
      ),
    ],
    [
      PhiCmsWidgetType.Icon,
      definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../core/widgets/icon/client").then((module) => module.PhiIconWidgetClient)),
      ),
    ],
    [
      PhiCmsWidgetType.Image,
      definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../core/widgets/image/client").then((module) => module.PhiImageWidget)),
      ),
    ],
    [
      PhiCmsWidgetType.MarkdownToc,
      definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../core/widgets/markdown-toc/client").then((module) => module.PhiMarkdownTocWidgetClient)),
      ),
    ],
    [
      PhiCmsWidgetType.PageTitle,
      definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../core/widgets/page-title/client").then((module) => module.PhiPageTitleWidgetClient)),
      ),
    ],
    [
      PhiCmsWidgetType.AccountAvatar,
      definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../avatar/widgets/account-avatar/client").then((module) => module.PhiAccountAvatarWidgetClient)),
      ),
    ],
    [
      PhiCmsWidgetType.AccountAvatarPicker,
      definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../avatar/widgets/account-avatar-picker/client").then((module) => module.PhiAccountAvatarPickerWidgetClient)),
      ),
    ],
    [
      PhiCmsWidgetType.ThreadComposer,
      definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../threads/widgets/thread-composer/client").then((module) => module.PhiThreadComposerWidgetClient)),
      ),
    ],
    [
      PhiCmsWidgetType.ThreadConversation,
      definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../threads/widgets/thread-conversation/client").then((module) => module.PhiThreadConversationWidgetClient)),
      ),
    ],
    [
      PhiCmsWidgetType.ProfileName,
      definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../core/widgets/profile-name/client").then((module) => module.PhiProfileNameWidgetClient)),
      ),
    ],
    [
      PhiCmsWidgetType.ProfileOverview,
      definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../core/widgets/profile-overview/client").then((module) => module.PhiProfileOverviewWidgetClient)),
      ),
    ],
    [
      PhiRuntimeRenderClientType.SearchStandalone,
      definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../../../components/widgets/client/search").then((module) => module.PhiSearchWidget)),
      ),
    ],
    [
      PhiCmsWidgetType.SidebarNavigation,
      definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../core/widgets/sidebar-navigation/client").then((module) => module.PhiSidebarNavigationWidgetClient)),
      ),
    ],
    [
      PhiRuntimeRenderClientType.SidebarNavigationPreview,
      definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../core/widgets/sidebar-navigation/client").then((module) => module.PhiSidebarNavigationWidgetPreviewClient)),
      ),
    ],
    [
      PhiCmsWidgetType.TabBar,
      definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../../../components/widgets/client/stack-tabs").then((module) => module.PhiTabBarWidgetClient)),
      ),
    ],
    [
      PhiCmsWidgetType.SlotUpload,
      definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../core/widgets/slot-upload/client").then((module) => module.PhiSlotUploadWidgetClient)),
      ),
    ],
    [
      PhiCmsWidgetType.AreaUpload,
      definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../../../components/media/phi-area-upload-widget").then((module) => module.PhiAreaUploadWidget)),
      ),
    ],
    [
      PhiCmsWidgetType.ImageInspector,
      definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../../../components/media/phi-image-inspector-widget").then((module) => module.PhiAssetConfigWidget)),
      ),
    ],
    [
      PhiCmsWidgetType.MediaPicker,
      definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../../../components/media/phi-media-picker-widget").then((module) => module.PhiMediaPickerWidget)),
      ),
    ],
    [
      PhiCmsLayoutType.Grid,
      definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../../../components/layouts/clients/phi-grid-layout-client").then((module) => module.PhiGridLayout)),
      ),
    ],
    [
      PhiCmsLayoutType.Collapsible,
      definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../../../components/layouts/clients/phi-collapsible-layout-client").then((module) => module.PhiCollapsibleLayout)),
      ),
    ],
    [
      PhiCmsLayoutType.Stack,
      definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../../../components/layouts/clients/phi-stack-layout-client").then((module) => module.PhiStackLayout)),
      ),
    ],
    [
      PhiCmsLayoutType.Carousel,
      definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../../../components/layouts/clients/phi-carousel-layout-client").then((module) => module.PhiCarouselLayout)),
      ),
    ],
    [
      PhiCmsWidgetType.Brand,
      definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../core/widgets/brand/client").then((module) => module.PhiBrandWidgetClient)),
      ),
    ],
    [
      PhiCmsWidgetType.HeaderNavigation,
      definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../core/widgets/header-navigation/client").then((module) => module.PhiHeaderNavigationWidgetClient)),
      ),
    ],
    [
      PhiCmsWidgetType.Locale,
      definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../../../components/shell/phi-locale-switch").then((module) => module.PhiLocaleSwitch)),
      ),
    ],
    [
      PhiCmsWidgetType.Markdown,
      definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../core/widgets/markdown/client").then((module) => module.PhiMarkdownWidgetClient)),
      ),
    ],
    [
      PhiCmsWidgetType.QuickLinks,
      definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../core/widgets/quick-links/client").then((module) => module.PhiQuickLinksWidgetClient)),
      ),
    ],
    [
      PhiCmsWidgetType.SimpleText,
      definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../core/widgets/simple-text/client").then((module) => module.PhiSimpleTextWidgetClient)),
      ),
    ],
    [
      PhiCmsWidgetType.FormPreview,
      definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../core/widgets/form-preview/client").then((module) => module.PhiFormPreviewWidgetClient)),
      ),
    ],
  ]);
