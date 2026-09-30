export { PhiAreaUploadWidget } from "./components/media/phi-area-upload-widget";
export type { PhiAreaUploadWidgetProps } from "./components/media/phi-area-upload-widget";
export { PhiAssetPreviewGridWidget } from "./plugins/runtime-modules/core/widgets/collection-view/image-preview-grid";
export type { PhiAssetPreviewGridWidgetProps } from "./plugins/runtime-modules/core/widgets/collection-view/image-preview-grid";
export { PhiAssetConfigWidget } from "./components/media/phi-image-inspector-widget";
export type { PhiAssetConfigWidgetProps } from "./components/media/phi-image-inspector-widget";
export { PhiAssetFolderControl } from "./components/media/phi-asset-folder-control";
export type { PhiAssetFolderControlProps } from "./components/media/phi-asset-folder-control";
export {
  createDefaultFocalRect,
  focalRectToMetaValue,
  focalRectToPercent,
  normalizeMediaFocalRect,
  resolveContainedImageBox,
  resolveFocalRectCoverImageStyle,
  resolveFocalRectObjectPosition,
  type MediaFocalRect,
} from "./components/media/focal-rect";
export type { PhiMediaAssetSelection } from "./types/media";

/*
 * The transfer leg, for an Add-on that reserved a place with `assets:v1`.
 *
 * Exported rather than kept internal because the alternative is every package writing its own: the
 * plan's transports, the four honest failure readings and the report that carries them are Core's
 * answers, and a second implementation of them is a second set of answers that will disagree.
 */
export {
  PHI_MEDIA_UPLOAD_FAILURE_REASONS,
  PhiMediaUploadError,
  runPhiAddonAssetUpload,
  type PhiAddonAssetReservation,
  type PhiMediaUploadFailureReason,
  type PhiMediaUploadPlan,
  type PhiMediaUploadProgressHandler,
} from "./components/media/media-upload-flow";
