/**
 * The `media-asset` and `media-assets` fields' picker words, under the keys their controls read them from.
 *
 * The field opens the Media library's own picker, and the picker's words are the Media Label Set's
 * (`getPhiMediaWidgetLabels`). The Form Widget reads that set on the Server for every Form that has a
 * `media-asset` field (`form-field-labels.ts`) and hands the words to the control under these keys, so a
 * Module that places the field translates none of them. A Foundation file for the same reason
 * `upload-field-keys.ts` is: the Server reads it without the Asset Module, and the Module's control reads
 * it without the Server. Where the field's own wording is the Form's -- Choose, Change, Remove -- the keys
 * are the Module's (`PHI_FORM_MEDIA_ASSET_LABEL_KEYS`). The upload inside the picker says its refusals and
 * its hold under the upload field's keys (`PHI_FORM_UPLOAD_LABEL_KEYS`), read for this field as well.
 */
export const PHI_FORM_MEDIA_ASSET_PICKER_LABEL_KEYS = {
  popoverTitle: "mediaAssetPickerTitle",
  searchPlaceholder: "mediaAssetPickerSearch",
  folderLabel: "mediaAssetPickerFolder",
  spaceLabel: "mediaAssetPickerSpace",
  emptyDescription: "mediaAssetPickerEmpty",
  loadFailedDescription: "mediaAssetPickerLoadFailed",
  clearLabel: "mediaAssetPickerClear",
  reloadLabel: "mediaAssetPickerReload",
  tileSizeLabel: "mediaAssetPickerTileSize",
  sourceLabel: "mediaAssetPickerSource",
  sourceFailedText: "mediaAssetPickerSourceFailed",
  importingLabel: "mediaAssetPickerImporting",
  importFailedText: "mediaAssetPickerImportFailed",
  loadMoreLabel: "mediaAssetPickerLoadMore",
  /** The `media-assets` field's button that opens the picker (the Media Label Set's "Choose from Media library"). */
  chooseFromLibraryLabel: "mediaAssetPickerChooseFromLibrary",
  /** The picker's upload button (the Media Label Set's upload toggle). */
  uploadLabel: "mediaAssetPickerUpload",
  /*
   * The upload surface the button shows, the Media library's own (`PhiAreaUploadBinding`): its drop area,
   * the state of the file on its way, and the message once it arrived (`widget:upload`'s `area_*`).
   */
  uploadDropTitle: "mediaAssetPickerUploadDropTitle",
  uploadDropHint: "mediaAssetPickerUploadDropHint",
  uploadRetryLabel: "mediaAssetPickerUploadRetry",
  uploadDoneLabel: "mediaAssetPickerUploadDone",
  uploadFailedLabel: "mediaAssetPickerUploadFailed",
  uploadSuccessTemplate: "mediaAssetPickerUploadSuccess",
} as const;
