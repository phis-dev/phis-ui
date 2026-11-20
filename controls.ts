export { PhiTextControl } from "./components/controls/phi-text-control";
export { PhiLabeledControl } from "./components/controls/phi-labeled-control";
export type {
  PhiTextControlPresentation,
  PhiTextControlProps,
} from "./components/controls/phi-text-control";
export type { PhiTextInputType } from "./components/controls/phi-text-types";
export {
  PHI_CONTROL_SIZES,
  PHI_FEEDBACK_LEVELS,
  readPhiControlSize,
} from "./types/control";
export type {
  PhiControlPresentationConfig,
  PhiControlSize,
  PhiFeedbackLevel,
} from "./types/control";
export { PhiCompactGroupControl } from "./components/controls/phi-compact-group-control";
export type { PhiCompactGroupControlProps } from "./components/controls/phi-compact-group-control";
export { PhiViewportVisibilityControl } from "./components/controls/phi-viewport-visibility-control";
export { PhiEntryListControl } from "./components/controls/phi-entry-list-control";
export type { PhiEntryListControlProps, PhiEntryListEntry } from "./components/controls/phi-entry-list-control";
export { PhiAmountListControl } from "./components/controls/phi-amount-list-control";
export type {
  PhiAmountListControlProps,
  PhiAmountListItem,
  PhiAmountListTotal,
} from "./components/controls/phi-amount-list-control";
export { PhiFileDropControl } from "./components/controls/phi-file-drop-control";
export type { PhiFileDropControlProps } from "./components/controls/phi-file-drop-control";
export { PhiPlacementMatrixControl } from "./components/controls/phi-placement-matrix-control";
export type { PhiPlacementMatrixControlProps } from "./components/controls/phi-placement-matrix-control";
export { PhiNumberControl } from "./components/controls/phi-number-control";
export type { PhiNumberControlProps } from "./components/controls/phi-number-control";
export { PhiPopoverControl } from "./components/controls/phi-popover-control";
export type {
  PhiPopoverControlProps,
  PhiPopoverPadding,
} from "./components/controls/phi-popover-control";
export { PHI_PICKER_PLACEMENTS } from "./components/controls/phi-picker-control-contract";
export type {
  PhiPickerPlacement,
  PhiPickerTransactionCallbacks,
} from "./components/controls/phi-picker-control-contract";
export { PhiPaginationControl } from "./components/controls/phi-pagination-control";
export type { PhiPaginationControlProps, PhiPaginationControlValue } from "./components/controls/phi-pagination-control";
export { PhiTabsControl } from "./components/controls/phi-tabs-control";
export type { PhiTabsControlItem, PhiTabsControlProps } from "./components/controls/phi-tabs-control";
export { PhiDropdownControl, PhiPillDropdownControl } from "./components/controls/phi-dropdown-control";
export type {
  PhiDropdownControlProps,
  PhiPillDropdownControlProps,
} from "./components/controls/phi-dropdown-control";
export { PhiMenuControl } from "./components/controls/phi-menu-control";
export type {
  PhiMenuControlDivider,
  PhiMenuControlEntry,
  PhiMenuControlItem,
  PhiMenuControlProps,
} from "./components/controls/phi-menu-control";
export { PhiMediaPickerControl } from "./components/controls/phi-media-picker-control";
export type { PhiMediaPickerControlProps } from "./components/controls/phi-media-picker-control";
export {
  PHI_MEDIA_PICKER_COLUMN_WIDTH_STEP,
  PHI_MEDIA_PICKER_DEFAULT_COLUMN_WIDTH,
  PHI_MEDIA_PICKER_MAX_COLUMN_WIDTH,
  PHI_MEDIA_PICKER_MIN_COLUMN_WIDTH,
  normalizePhiMediaPickerMinColumnWidth,
} from "./components/controls/phi-media-picker-control-contract";
export { PhiCollectionLayoutControl } from "./components/controls/phi-collection-layout-control";
export type { PhiCollectionLayoutControlProps } from "./components/controls/phi-collection-layout-control";
export { PhiCollectionHeaderControl } from "./components/controls/phi-collection-header-control";
export type { PhiCollectionHeaderControlProps } from "./components/controls/phi-collection-header-control";
export { PhiCollectionViewControl } from "./components/controls/phi-collection-view-control";
export type { PhiCollectionViewControlProps } from "./components/controls/phi-collection-view-control";
export {
  PhiMediaAssetCollectionSkeletonControl,
  PhiMediaAssetTileControl,
} from "./components/controls/phi-media-asset-tile-control";
export type {
  PhiMediaAssetCollectionSkeletonControlProps,
  PhiMediaAssetTileControlProps,
} from "./components/controls/phi-media-asset-tile-control";
export { PhiMediaSourceItemTileControl } from "./components/controls/phi-media-source-item-tile-control";
export type { PhiMediaSourceItemTileControlProps } from "./components/controls/phi-media-source-item-tile-control";
export { PhiVideoEmbedControl } from "./components/controls/phi-video-embed-control";
export type {
  PhiVideoEmbedControlLabels,
  PhiVideoEmbedControlProps,
} from "./components/controls/phi-video-embed-control";
export { PhiMaskPickerControl } from "./components/controls/phi-mask-picker-control";
export type { PhiMaskPickerControlProps } from "./components/controls/phi-mask-picker-control";
export { PhiColorControl } from "./components/controls/phi-color-control";
export type {
  PhiColorControlProps,
  PhiColorPickerMode,
  PhiColorPickerPreset,
  PhiColorPickerPresets,
} from "./components/controls/phi-color-control";
export { PhiBackgroundControl } from "./components/controls/phi-background-control";
export type { PhiBackgroundControlProps } from "./components/controls/phi-background-control";
export { PhiBorderControl } from "./components/controls/phi-border-control";
export type { PhiBorderControlProps } from "./components/controls/phi-border-control";
export { PhiPaddingControl } from "./components/controls/phi-padding-control";
export type { PhiPaddingControlProps } from "./components/controls/phi-padding-control";
export { PhiShadowControl } from "./components/controls/phi-shadow-control";
export type { PhiShadowControlProps } from "./components/controls/phi-shadow-control";
export { PhiSurfaceControl } from "./components/controls/phi-surface-control";
export type { PhiSurfaceControlLabels, PhiSurfaceControlProps } from "./components/controls/phi-surface-control";
export { PhiImageControl } from "./components/controls/phi-image-control";
export type { PhiImageControlProps, PhiImageControlSource } from "./components/controls/phi-image-control";
// The answer `PhiImageControl` draws: a Module showing a picture of its own asks the same resolver the
// Image and Card Widgets ask, instead of composing an address and a framing of its own.
export { resolvePhiImagePresentation } from "./components/media/image-presentation";
export type {
  PhiImagePresentation,
  PhiImagePresentationFit,
  PhiImagePresentationInput,
} from "./components/media/image-presentation";
export { PhiGeometryControl } from "./components/controls/phi-geometry-control";
export type { PhiGeometryControlProps } from "./components/controls/phi-geometry-control";
export { PhiSliderControl } from "./components/controls/phi-slider-control";
export type { PhiSliderControlProps } from "./components/controls/phi-slider-control";
export { PhiRateControl } from "./components/controls/phi-rate-control";
export type { PhiRateControlProps } from "./components/controls/phi-rate-control";
export {
  PHI_RATE_DEFAULT_COUNT,
  normalizePhiRateCount,
  normalizePhiRateValue,
} from "./components/controls/phi-rate-control-contract";
/*
 * The Dialog, and deliberately not the shells under it.
 *
 * `PhiModalControl` and `PhiDrawerControl` zero every zone, because the Overlay container path fills them
 * with Layout nodes. Handing those out is handing out a surface whose inside the caller then has to
 * invent, which is the mistake this Control exists to end -- and a Module that wants a Dialog with a
 * place in a tree declares an Overlay node in its preset instead (OVERLAYS.md).
 */
export { PhiDialogControl } from "./components/controls/phi-dialog-control";
export type {
  PhiDialogControlAction,
  PhiDialogControlProps,
} from "./components/controls/phi-dialog-control";
export { PHI_SLIDER_TOOLTIP_MODES } from "./components/controls/phi-slider-control-contract";
export type { PhiSliderTooltipMode } from "./components/controls/phi-slider-control-contract";
export { PhiSelectControl } from "./components/controls/phi-select-control";
export type { PhiSelectControlProps } from "./components/controls/phi-select-control";
export { PhiMultiSelectControl } from "./components/controls/phi-multi-select-control";
export type { PhiMultiSelectControlProps } from "./components/controls/phi-multi-select-control";
export { PhiSegmentedControl } from "./components/controls/phi-segmented-control";
export type { PhiSegmentedControlProps } from "./components/controls/phi-segmented-control";
export { PhiDragHandleControl } from "./components/controls/phi-drag-handle-control";
export type {
  PhiDragHandleAttributes,
  PhiDragHandleControlProps,
  PhiDragHandleListeners,
} from "./components/controls/phi-drag-handle-control";
export { PhiOtpControl } from "./components/controls/phi-otp-control";
export type {
  PhiOtpControlCharacters,
  PhiOtpControlHandle,
  PhiOtpControlProps,
} from "./components/controls/phi-otp-control";
export { PhiSwitchControl } from "./components/controls/phi-switch-control";
export type { PhiSwitchControlProps } from "./components/controls/phi-switch-control";
export { PhiCheckboxControl } from "./components/controls/phi-checkbox-control";
export type { PhiCheckboxControlProps } from "./components/controls/phi-checkbox-control";
export { PhiCheckboxGroupControl } from "./components/controls/phi-checkbox-group-control";
export type { PhiCheckboxGroupControlProps } from "./components/controls/phi-checkbox-group-control";
export { PhiIconPickerControl } from "./components/controls/phi-icon-picker-control";
export type { PhiIconPickerControlProps } from "./components/controls/phi-icon-picker-control";
export {
  PHI_ICON_PICKER_CONTROL_DEFAULT_LABELS,
} from "./components/widgets/label-types/icon-picker";
export type { PhiIconPickerControlLabels } from "./components/widgets/label-types/icon-picker";
export { PhiRadioGroupControl } from "./components/controls/phi-radio-group-control";
export type { PhiRadioGroupControlProps } from "./components/controls/phi-radio-group-control";
export { PhiButtonControl } from "./components/controls/phi-button-control";
export { PhiTagControl } from "./components/controls/phi-tag-control";
export type { PhiTagControlProps } from "./components/controls/phi-tag-control";
export { PhiFormControl } from "./components/controls/phi-form-control";
export type {
  PhiFormControlFormInstance,
  PhiFormControlHandle,
  PhiFormControlProps,
} from "./components/controls/phi-form-control";
export type {
  PhiButtonControlProps,
  PhiControlBadgePresentation,
} from "./components/controls/phi-button-control";
export { PhiAlertControl } from "./components/controls/phi-alert-control";
export type { PhiAlertControlProps } from "./components/controls/phi-alert-control";
/*
 * Absence, beside the failure it is not. Nine surfaces inside this package reach the Control by
 * relative path; a Module package could not reach it at all and drew Ant Design's `Empty` itself,
 * which is the large illustration and, with no `description`, the untranslated "No Data" -- the two
 * outcomes the Control exists to make unreachable.
 */
export { PhiCardControl } from "./components/controls/phi-card-control";
export type { PhiCardControlProps } from "./components/controls/phi-card-control";
export { PhiEmptyControl } from "./components/controls/phi-empty-control";
export type { PhiEmptyControlProps } from "./components/controls/phi-empty-control";
export { PhiFlexControl } from "./components/controls/phi-flex-control";
export type { PhiFlexControlProps } from "./components/controls/phi-flex-control";
export { PhiSkeletonControl } from "./components/controls/phi-skeleton-control";
export type { PhiSkeletonControlProps } from "./components/controls/phi-skeleton-control";
export { PhiTypographyControl } from "./components/controls/phi-typography-control";
export type { PhiTypographyControlProps } from "./components/controls/phi-typography-control";
export {
  PHI_CONFIRM_PLACEMENTS,
  PhiConfirmControl,
} from "./components/controls/phi-confirm-control";
export type {
  PhiConfirmControlProps,
  PhiConfirmPlacement,
} from "./components/controls/phi-confirm-control";
export { PhiToolbarControl } from "./components/controls/phi-toolbar-control";
export type {
  PhiToolbarControlItem,
  PhiToolbarControlProps,
} from "./components/controls/phi-toolbar-control";
export { PhiFloatButtonControl } from "./components/controls/phi-float-button-control";
export type {
  PhiFloatButtonControlGroup,
  PhiFloatButtonControlPlacement,
  PhiFloatButtonControlProps,
} from "./components/controls/phi-float-button-control";
export { PhiStepsControl } from "./components/controls/phi-steps-control";
export type { PhiStepsControlItem, PhiStepsControlProps } from "./components/controls/phi-steps-control";
export { PhiTimelineControl } from "./components/controls/phi-timeline-control";
export type {
  PhiTimelineControlItem,
  PhiTimelineControlProps,
} from "./components/controls/phi-timeline-control";
export { PhiTableControl, readPhiTableControlValue } from "./components/controls/phi-table-control";
export type {
  PhiTableControlColumn,
  PhiTableControlCellEditor,
  PhiTableControlPagination,
  PhiTableControlProps,
  PhiTableControlRowEditing,
  PhiTableControlRowMove,
  PhiTableControlRowReordering,
  PhiTableControlRowSelection,
  PhiTableControlTree,
} from "./components/controls/phi-table-control";
export { PhiTreeControl, PhiTreeActionButton } from "./components/controls/phi-tree-control";
export type {
  PhiTreeControlDropRequest,
  PhiTreeControlExternalDropRequest,
} from "./components/controls/phi-tree-control";
export { PhiTreeSelectControl } from "./components/controls/phi-tree-select-control";
export type { PhiTreeSelectControlProps } from "./components/controls/phi-tree-select-control";
export {
  PhiCascaderControl,
  PhiTreeCascaderControl,
  normalizePhiCascaderValue,
} from "./components/controls/phi-cascader-control";
export type {
  PhiCascaderNormalizeMode,
  PhiCascaderOption,
} from "./components/controls/phi-cascader-control";
export { PhiDimensionControl } from "./components/controls/phi-dimension-control";
export type { PhiDimensionControlProps } from "./components/controls/phi-dimension-control";
export { PhiLengthControl } from "./components/controls/phi-length-control";
export type { PhiLengthControlProps } from "./components/controls/phi-length-control";
export type {
  PhiControlOption,
  PhiControlOptionPreview,
  PhiControlOptionsProviderConfig,
  PhiControlOptionsProviderLoadMode,
  PhiControlOptionsProviderSearchConfig,
} from "./components/controls/phi-control-options";

/*
 * The Controls a Module's own Widget draws with, beside the ones above: lists, figures, outcomes,
 * sections that fold, money, codes and charts, and the labelled colour field. A dialog in code is
 * `PhiDialogControl`; the Modal and Drawer shells under it stay the Overlay container's. A Module draws
 * them rather than Ant Design or bare elements, so they wear the Theme like the house's own. A Widget
 * that only places them on a Page needs none of this: it names the Core Widget in its preset.
 */
export { PhiAccordionControl } from "./components/controls/phi-accordion-control";
export type { PhiAccordionControlProps, PhiAccordionControlSection } from "./components/controls/phi-accordion-control";
export { PhiAnchorNavControl } from "./components/controls/phi-anchor-nav-control";
export type { PhiAnchorNavControlItem, PhiAnchorNavControlProps } from "./components/controls/phi-anchor-nav-control";
export { PhiAvatarControl } from "./components/controls/phi-avatar-control";
export type { PhiAvatarControlProps } from "./components/controls/phi-avatar-control";
export { PHI_RADIUS_CONTROL_DEFAULT_LABELS, PhiBoundRadiusControl } from "./components/controls/phi-bound-radius-control";
export type {
  PhiBoundRadiusControlProps,
  PhiBoundRadiusValue,
  PhiRadiusControlLabels,
  PhiRadiusOptionValue,
} from "./components/controls/phi-bound-radius-control";
export { PhiBreadcrumbControl } from "./components/controls/phi-breadcrumb-control";
export type { PhiBreadcrumbControlItem, PhiBreadcrumbControlProps } from "./components/controls/phi-breadcrumb-control";
export { PhiBulletListControl } from "./components/controls/phi-bullet-list-control";
export type { PhiBulletListControlProps } from "./components/controls/phi-bullet-list-control";
export type { PhiBulletListEntryState, PhiBulletListNode } from "./components/widgets/shared/bullet-list-vocabulary";
export { PhiCollapseControl } from "./components/controls/phi-collapse-control";
export type { PhiCollapseControlProps, PhiCollapseControlSection } from "./components/controls/phi-collapse-control";
export { PhiColorFieldControl } from "./components/controls/phi-color-field-control";
export type { PhiColorFieldControlProps } from "./components/controls/phi-color-field-control";
export { PhiDescriptionListControl } from "./components/controls/phi-description-list-control";
export type { PhiDescriptionListControlProps, PhiDescriptionListItem } from "./components/controls/phi-description-list-control";
export { PhiDividerControl } from "./components/controls/phi-divider-control";
export type { PhiDividerControlProps } from "./components/controls/phi-divider-control";
export { PhiMoneyControl } from "./components/controls/phi-money-control";
export type { PhiMoneyControlProps } from "./components/controls/phi-money-control";
export { PhiNameControl } from "./components/controls/phi-name-control";
export type { PhiNameControlProps } from "./components/controls/phi-name-control";
export { PhiPresetSizeControl } from "./components/controls/phi-preset-size-control";
export type { PhiPresetSizeControlProps, PhiPresetSizeOption } from "./components/controls/phi-preset-size-control";
export { PhiProgressControl } from "./components/controls/phi-progress-control";
export type { PhiProgressControlProps } from "./components/controls/phi-progress-control";
export { PhiQrCodeControl } from "./components/controls/phi-qr-code-control";
export type { PhiQrCodeControlProps } from "./components/controls/phi-qr-code-control";
export { PhiResultControl } from "./components/controls/phi-result-control";
export type { PhiResultControlProps } from "./components/controls/phi-result-control";
export { PhiRibbonControl } from "./components/controls/phi-ribbon-control";
export type { PhiRibbonControlProps } from "./components/controls/phi-ribbon-control";
export { PhiRibbonWrapControl } from "./components/controls/phi-ribbon-wrap-control";
export type { PhiRibbonWrapControlProps } from "./components/controls/phi-ribbon-wrap-control";
export { PhiSeriesChartControl } from "./components/controls/phi-series-chart-control";
export type { PhiSeriesChartControlProps, PhiSeriesChartControlSeries } from "./components/controls/phi-series-chart-control";
export { PhiSpinControl } from "./components/controls/phi-spin-control";
export type { PhiSpinControlProps } from "./components/controls/phi-spin-control";
export { PhiStatisticControl } from "./components/controls/phi-statistic-control";
export type { PhiStatisticControlProps } from "./components/controls/phi-statistic-control";
export { PhiStatusDotControl } from "./components/controls/phi-status-dot-control";
