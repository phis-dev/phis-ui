"use client";

import { useMemo, type ComponentType } from "react";

import { PhiButtonControl } from "../../../components/controls/phi-button-control";
import { PhiFlexControl } from "../../../components/controls/phi-flex-control";
import { PhiMediaAssetTileControl } from "../../../components/controls/phi-media-asset-tile-control";
import { PhiMediaPickerControl } from "../../../components/controls/phi-media-picker-control";
import { PhiTypographyControl } from "../../../components/controls/phi-typography-control";
import { PHI_MEDIA_WIDGET_DEFAULT_LABELS } from "../../../components/media/media-widget-labels";
import { usePhiMediaPickerBinding } from "../../../components/media/phi-media-picker-binding";
import { usePhiAuthoringAssetDetails } from "../../../components/media/use-authoring-asset-details";
import { PHI_SEARCH_WIDGET_DEFAULT_LABELS } from "../../../components/widgets/label-types/search";
import { isPhiMediaAssetPublic } from "../../../constants/media";
import type { PhiFormFieldProviderProps } from "../../../components/forms/form-provider-registry";
import { PHI_FORM_MEDIA_ASSET_LABEL_KEYS } from "./form-providers";
import {
  isPhiMediaAssetFieldSelectable,
  readPhiMediaAssetFieldConfig,
  readPhiMediaAssetFieldValue,
} from "./media-asset-field";

const DEFAULT_LABELS = {
  choose: "Choose",
  change: "Change",
  remove: "Remove",
  publicOnlyHint: "Only publicly delivered files can be chosen.",
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
}) => {
  const config = useMemo(() => readPhiMediaAssetFieldConfig(field.config), [field.config]);
  const assetId = readPhiMediaAssetFieldValue(value);
  const asset = usePhiAuthoringAssetDetails(assetId);

  const read = (key: keyof typeof DEFAULT_LABELS) =>
    labels?.[PHI_FORM_MEDIA_ASSET_LABEL_KEYS[key]]?.trim() || DEFAULT_LABELS[key];
  const choose = read("choose");
  const change = read("change");

  const pickerLabels = useMemo(() => ({
    ...PHI_MEDIA_WIDGET_DEFAULT_LABELS,
    picker: {
      ...PHI_MEDIA_WIDGET_DEFAULT_LABELS.picker,
      triggerLabel: assetId == null ? choose : change,
    },
  }), [assetId, change, choose]);

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
      {config.publicOnly && !readOnly ? (
        <PhiTypographyControl type="secondary">{read("publicOnlyHint")}</PhiTypographyControl>
      ) : null}
    </PhiFlexControl>
  );
};
