"use client";

import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react";

import { PhiButtonControl } from "../../../components/controls/phi-button-control";
import { PhiFlexControl } from "../../../components/controls/phi-flex-control";
import { PhiMediaAssetTileControl } from "../../../components/controls/phi-media-asset-tile-control";
import { PHI_FORM_UPLOAD_LABEL_KEYS } from "../../../components/forms/upload-field-keys";
import { PhiMediaPickerControl } from "../../../components/controls/phi-media-picker-control";
import { PhiTypographyControl } from "../../../components/controls/phi-typography-control";
import {
  usePhiMediaPickerBinding,
  type PhiMediaPickerUploadBinding,
} from "../../../components/media/phi-media-picker-binding";
import { PhiAreaUploadBinding } from "../../../components/media/phi-area-upload-widget";
import { readPhiMediaUploadFolderPathReach } from "../../../components/media/media-upload-flow";
import { resolvePhiMediaFolderPathTemplate } from "../../../components/media/media-folder-name-path";
import { PHI_MEDIA_UPLOAD_FIELD_DEFAULT_LABELS } from "../../../components/media/media-upload-labels";
import { usePhiAuthoringAssetDetails } from "../../../components/media/use-authoring-asset-details";
import { PHI_SEARCH_WIDGET_DEFAULT_LABELS } from "../../../components/widgets/label-types/search";
import { isPhiMediaAssetPublic } from "../../../constants/media";
import type { PhiFormFieldProviderProps } from "../../../components/forms/form-provider-registry";
import { PHI_FORM_MEDIA_ASSET_LABEL_KEYS } from "./form-providers";
import { readPhiMediaFieldPickerLabels } from "./media-field-picker-labels";
import {
  isPhiMediaAssetFieldSelectable,
  isPhiMediaFieldKindTaken,
  readPhiMediaAssetFieldConfig,
  readPhiMediaAssetFieldUploadRefusal,
  readPhiMediaAssetFieldValue,
  readPhiMediaFieldUploadAcceptance,
} from "./media-asset-field";

const DEFAULT_LABELS = {
  choose: "Choose",
  change: "Change",
  remove: "Remove",
  notPublic: "This file is not delivered publicly.",
  unavailable: "The file could not be read.",
} as const;

const PREVIEW_SIZE = 72;

/**
 * The `media-asset` field: one Asset of the Site's Media library (`FORMS.md`).
 *
 * The chosen Asset is shown as a preview, "Choose" / "Change" opens the library's own picker -- the
 * binding every picker in the house runs on, not a second one -- and "Remove" empties the field. The
 * value is the Asset id as a number, `null` for none, and the field keeps no copy of it: what it keeps is
 * the picker's open state.
 *
 * Inside the picker a file from the reader's machine can go up too, into the Folder the picker shows,
 * through the Media library's own upload surface (`PhiAreaUploadBinding`, one file, Core's upload
 * session); what it made is chosen as a picked tile would be. It goes into the Site Space, like
 * everything the field offers, and Core delivers what goes there publicly. What comes back is asked what
 * a pick is asked: an Asset of another kind (a file the browser could not name reaches Core unrefused)
 * or, for a `publicOnly` field, one that is not public is left in the list unchosen, and the field says
 * why. While the file is on its way the Form's submit is held, as the upload field holds it, and closing
 * the picker stops it.
 * The Media limits of the Add-on behind the Form (`mediaLimits`, FORMS.md) are applied before a file is
 * sent: one larger than its `maxFileBytes` is refused as too large, and where its `kinds` leave out the
 * field's kind every file is refused as of a type not allowed -- the upload's own refusals, in the
 * picker's upload words.
 * `config.folderPath` names the Folder the picker opens on ("Shop Images / Products"): read in the Site
 * Space each time it opens, without writing anything (`readPhiMediaUploadFolderPathReach`), so a reader
 * who may only choose opens and picks without a refusal; the picker opens on the deepest Folder of the
 * path that is there. An upload from there goes into the whole path, the missing Folders created the way
 * `area-upload` creates them (`resolvePhiMediaUploadFolderPathId`).
 *
 * Only the Site Space is offered, in every Area (`siteSpaceOnly`): a Form stores a reference everybody
 * who reads the stored value will follow, and a personal or a group Space cannot honestly stand behind
 * that. `config.publicOnly` greys out the Assets that are not delivered publicly, from the delivery
 * policy the library's list states for each. Both are interface rules. The Server that takes the value
 * decides what it accepts, and a Form that must hold the line checks the Asset there.
 *
 * An id that arrived as an initial value is read through the Asset detail route the Inspector's image
 * field reads (`usePhiAuthoringAssetDetails`), so the preview shows what is stored. Where that read is
 * refused, the field says so and still lets the value be changed or removed.
 */
export const PhiMediaAssetFormControl: ComponentType<PhiFormFieldProviderProps> = ({
  field,
  value,
  labels,
  disabled,
  readOnly,
  onChange,
  formContext,
  mediaLimits,
}) => {
  const config = useMemo(() => readPhiMediaAssetFieldConfig(field.config), [field.config]);
  const assetId = readPhiMediaAssetFieldValue(value);
  const asset = usePhiAuthoringAssetDetails(assetId);

  const read = (key: keyof typeof DEFAULT_LABELS) =>
    labels?.[PHI_FORM_MEDIA_ASSET_LABEL_KEYS[key]]?.trim() || DEFAULT_LABELS[key];
  const choose = read("choose");
  const change = read("change");
  const notPublic = read("notPublic");

  // The upload's hold is the upload field's sentence, read for this field too; its refusals are in the
  // picker's upload words (`readPhiMediaFieldPickerLabels`).
  const pendingLabel = labels?.[PHI_FORM_UPLOAD_LABEL_KEYS.pending]?.trim() || PHI_MEDIA_UPLOAD_FIELD_DEFAULT_LABELS.pending;
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const acceptance = useMemo(
    () => readPhiMediaFieldUploadAcceptance(config.mediaType, false, mediaLimits),
    [config.mediaType, mediaLimits],
  );
  const kindTaken = isPhiMediaFieldKindTaken(config.mediaType, mediaLimits);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!formContext || !uploading) return;
    formContext.holdSubmit(field.key, pendingLabel);
    return () => formContext.holdSubmit(field.key, null);
  }, [field.key, formContext, pendingLabel, uploading]);

  /*
   * The start Folder as the Form's values name it when the picker opens (`{key}` placeholders), kept for
   * the upload into it: the path the picker opened on is the path the file goes to.
   */
  const startFolderPath = config.folderPath;
  const [openedFolderPath, setOpenedFolderPath] = useState<readonly string[]>([]);
  const openOnFolder = useCallback(async (signal: AbortSignal) => {
    const path = resolvePhiMediaFolderPathTemplate(startFolderPath, formContext?.getValues() ?? {});
    setOpenedFolderPath(path);
    return path.length > 0 ? readPhiMediaUploadFolderPathReach(path, signal) : { folderId: null, complete: true };
  }, [formContext, startFolderPath]);

  // The picker's words come from the Media Label Set, which the Form Widget read for this Form
  // (`resolvePhiFormFieldLabels`); outside a Form that read them, the English defaults stand.
  const mediaLabels = useMemo(() => readPhiMediaFieldPickerLabels(labels), [labels]);
  const pickerUploadLabels = mediaLabels.upload;

  /*
   * The upload is the Media library's own surface (`PhiAreaUploadBinding`), one file: the drop area and
   * the file on its way, no finished tiles -- what arrived is chosen, or stays in the picker's list
   * greyed out. No Space is named, which Core answers with the Site Space -- the only one the field
   * offers. What comes back is asked what a pick is asked (`readPhiMediaAssetFieldUploadRefusal`).
   */
  const upload = useMemo<PhiMediaPickerUploadBinding>(() => ({
    notice: uploadNotice,
    renderPanel: ({ folderId, intoStartFolder, onUploaded }) => (
      <PhiAreaUploadBinding
        config={{
          multiple: false,
          allowDelete: false,
          ...(intoStartFolder ? { folderPath: openedFolderPath.join(" / ") } : {}),
        }}
        labels={pickerUploadLabels}
        acceptance={acceptance}
        {...(kindTaken ? {} : { refuseFile: () => pickerUploadLabels.refusals.errorTypeNotAllowed })}
        showFinished={false}
        siteSpaceOnly
        collectionContext={{ folders: [], folderId, presentationFlags: null, query: {} }}
        onUploadingChange={setUploading}
        onAssetUploaded={(tile) => {
          const refusal = readPhiMediaAssetFieldUploadRefusal(config, tile);
          setUploadNotice(refusal === "kind" ? pickerUploadLabels.refusals.errorTypeNotAllowed : refusal ? notPublic : null);
          onUploaded(refusal ? null : tile);
        }}
      />
    ),
  }), [acceptance, config, kindTaken, notPublic, openedFolderPath, pickerUploadLabels, uploadNotice]);

  const pickerLabels = useMemo(
    () => ({ ...mediaLabels, picker: { ...mediaLabels.picker, triggerLabel: assetId == null ? choose : change } }),
    [assetId, change, choose, mediaLabels],
  );

  const picker = usePhiMediaPickerBinding({
    config: {
      mediaType: config.mediaType,
      pageSize: 12,
      showPagination: true,
      showSearchBar: true,
    },
    labels: pickerLabels,
    searchLabels: PHI_SEARCH_WIDGET_DEFAULT_LABELS,
    value: assetId,
    siteSpaceOnly: true,
    isAssetSelectable: config.publicOnly ? (candidate) => isPhiMediaAssetFieldSelectable(config, candidate) : undefined,
    onAssetSelect: (picked) => onChange?.(picked.id),
    onAssetClear: () => onChange?.(null),
    upload,
    openOnFolder: startFolderPath.length > 0 ? openOnFolder : null,
  });

  const locked = disabled || readOnly;

  return (
    <PhiFlexControl vertical gap="small">
      {assetId == null ? null : (
        <PhiFlexControl align="center" gap="small">
          {asset ? (
            <PhiFlexControl style={{ width: PREVIEW_SIZE, flex: "none" }}>
              <PhiMediaAssetTileControl
                asset={asset}
                minColumnWidth={PREVIEW_SIZE}
                size="small"
                showTypeLabel={false}
                showDimensions={false}
              />
            </PhiFlexControl>
          ) : null}
          <PhiFlexControl vertical>
            {asset == null ? (
              <>
                <PhiTypographyControl ellipsis>{`#${assetId}`}</PhiTypographyControl>
                <PhiTypographyControl type="secondary">{read("unavailable")}</PhiTypographyControl>
              </>
            ) : config.publicOnly && !isPhiMediaAssetPublic(asset.deliveryPolicy, asset.lifecycleStatus) ? (
              <PhiTypographyControl type="danger">{read("notPublic")}</PhiTypographyControl>
            ) : null}
          </PhiFlexControl>
        </PhiFlexControl>
      )}
      {readOnly ? null : (
        <PhiFlexControl gap="small">
          <PhiMediaPickerControl {...picker} disabled={locked} />
          {assetId == null ? null : (
            <PhiButtonControl label={read("remove")} disabled={locked} onClick={() => onChange?.(null)} />
          )}
        </PhiFlexControl>
      )}
    </PhiFlexControl>
  );
};
