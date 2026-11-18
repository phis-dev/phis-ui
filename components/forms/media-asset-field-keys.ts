/**
 * The `media-asset` field's picker words, under the keys its control reads them from.
 *
 * The field opens the Media library's own picker, and the picker's words are the Media Label Set's
 * (`getPhiMediaWidgetLabels`). The Form Widget reads that set on the Server for every Form that has a
 * `media-asset` field (`form-field-labels.ts`) and hands the words to the control under these keys, so a
 * Module that places the field translates none of them. A Foundation file for the same reason
 * `upload-field-keys.ts` is: the Server reads it without the Asset Module, and the Module's control reads
 * it without the Server. Where the field's own wording is the Form's -- Choose, Change, Remove -- the keys
 * are the Module's (`PHI_FORM_MEDIA_ASSET_LABEL_KEYS`).
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
} as const;
