import { PHI_FORM_MEDIA_ASSET_PICKER_LABEL_KEYS } from "../../../components/forms/media-asset-field-keys";
import { readPhiFormUploadRefusalLabels } from "../../../components/forms/upload-field-refusal-labels";
import { PHI_MEDIA_WIDGET_DEFAULT_LABELS, type PhiAssetWidgetLabels } from "../../../components/media/media-widget-labels";

/**
 * The Media picker's and the upload surface's words for a Media field of a Form (`media-asset`,
 * `media-assets`), read from the field's labels -- where the Form Widget put the Media Label Set's words
 * for the Form (`form-field-labels.ts`, `PHI_FORM_MEDIA_ASSET_PICKER_LABEL_KEYS`), with the upload's
 * refusals under the upload field's keys -- and the English defaults beneath. Outside a Form that read
 * them, the defaults stand. The trigger's words are each field's own and laid over by it.
 */
export function readPhiMediaFieldPickerLabels(
  labels: Readonly<Record<string, string>> | undefined,
): PhiAssetWidgetLabels {
  const read = (key: keyof typeof PHI_FORM_MEDIA_ASSET_PICKER_LABEL_KEYS, fallback: string) =>
    labels?.[PHI_FORM_MEDIA_ASSET_PICKER_LABEL_KEYS[key]]?.trim() || fallback;
  const base = PHI_MEDIA_WIDGET_DEFAULT_LABELS;
  return {
    ...base,
    tool: {
      ...base.tool,
      searchPlaceholder: read("searchPlaceholder", base.tool.searchPlaceholder),
      folderLabel: read("folderLabel", base.tool.folderLabel),
      reloadLabel: read("reloadLabel", base.tool.reloadLabel),
      chooseFromLibraryLabel: read("chooseFromLibraryLabel", base.tool.chooseFromLibraryLabel),
    },
    picker: {
      ...base.picker,
      popoverTitle: read("popoverTitle", base.picker.popoverTitle),
      emptyDescription: read("emptyDescription", base.picker.emptyDescription),
      loadFailedDescription: read("loadFailedDescription", base.picker.loadFailedDescription),
      clearLabel: read("clearLabel", base.picker.clearLabel),
      tileSizeLabel: read("tileSizeLabel", base.picker.tileSizeLabel),
      sourceLabel: read("sourceLabel", base.picker.sourceLabel),
      sourceFailedText: read("sourceFailedText", base.picker.sourceFailedText),
      importingLabel: read("importingLabel", base.picker.importingLabel),
      importFailedText: read("importFailedText", base.picker.importFailedText),
      loadMoreLabel: read("loadMoreLabel", base.picker.loadMoreLabel),
    },
    upload: {
      ...base.upload,
      uploadToggleLabel: read("uploadLabel", base.upload.uploadToggleLabel),
      dropTitle: read("uploadDropTitle", base.upload.dropTitle),
      dropHint: read("uploadDropHint", base.upload.dropHint),
      retryLabel: read("uploadRetryLabel", base.upload.retryLabel),
      doneLabel: read("uploadDoneLabel", base.upload.doneLabel),
      failedLabel: read("uploadFailedLabel", base.upload.failedLabel),
      uploadSuccessTemplate: read("uploadSuccessTemplate", base.upload.uploadSuccessTemplate),
      refusals: readPhiFormUploadRefusalLabels(labels),
    },
    space: { ...base.space, label: read("spaceLabel", base.space.label) },
  };
}
