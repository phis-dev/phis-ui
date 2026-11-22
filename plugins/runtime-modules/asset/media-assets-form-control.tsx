"use client";

import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react";

import { PhiButtonControl } from "../../../components/controls/phi-button-control";
import { PhiCollectionReorderContext } from "../../../components/controls/phi-collection-reorder-context";
import { PhiCollectionViewControl } from "../../../components/controls/phi-collection-view-control";
import {
  PhiMediaAssetCollectionSkeletonControl,
  PhiMediaAssetTileControl,
} from "../../../components/controls/phi-media-asset-tile-control";
import { PhiMediaPickerControl } from "../../../components/controls/phi-media-picker-control";
import { PhiToolbarControl } from "../../../components/controls/phi-toolbar-control";
import { PhiTypographyControl } from "../../../components/controls/phi-typography-control";
import type { PhiFormFieldProviderProps } from "../../../components/forms/form-provider-registry";
import { PHI_FORM_UPLOAD_LABEL_KEYS } from "../../../components/forms/upload-field-keys";
import { PHI_ASSET_COLLECTION_DATA_SOURCE } from "../../../components/media/asset-collection-runtime";
import { resolvePhiMediaFolderPathTemplate } from "../../../components/media/media-folder-name-path";
import { PHI_MEDIA_UPLOAD_FIELD_DEFAULT_LABELS } from "../../../components/media/media-upload-labels";
import { PhiAreaUploadBinding } from "../../../components/media/phi-area-upload-widget";
import { readPhiMediaCollectionItems } from "../../../components/media/phi-image-preview-data";
import { usePhiMediaLibraryAddPicker } from "../../../components/media/use-media-library-add-picker";
import { usePhiCollectionProvider } from "../../../components/widgets/client/shared/phi-collection-provider";
import { usePhiIntlLocale, usePhiIntlTimeZone } from "../../../components/root/phi-intl-locale";
import { usePhiConfig } from "../../../components/root/phi-config-provider";
import type { PhiMediaCollectionItem } from "../../../types/media";
import { PHI_FORM_MEDIA_ASSETS_LABEL_KEYS, PHI_MEDIA_ASSETS_FIELD_MOST } from "./form-providers";
import { readPhiMediaFieldPickerLabels } from "./media-field-picker-labels";
import {
  addPhiMediaAssetsFieldIds,
  orderPhiMediaAssetsFieldTiles,
  readPhiMediaAssetsFieldConfig,
  readPhiMediaAssetsFieldValue,
} from "./media-assets-field";

const DEFAULT_LABELS = {
  remove: "Remove",
  reorder: "Drag to reorder",
  unavailable: "The file could not be read.",
  tooMany: "At most %1 files.",
} as const;

// The Media renderer's tile width, so the field's tiles are the ones its Collection draws.
const TILE_MIN_WIDTH = 102;

/**
 * The `media-assets` field: several Assets of the Site's Media library, as an ordered list of their ids
 * (`FORMS.md`). The Form holds the value -- the draft, its dirty state, Save and Cancel, its validation --
 * and the handler receives the ids on save; the field writes nothing anywhere itself.
 *
 * Composed of what the Collection View's Media renderer draws: the Media tiles in a
 * `PhiCollectionViewControl`, each with its remove (the tile's delete, which only takes the id out of the
 * value -- no confirm, no request, nothing released), drag reordering through the Collection's own handles
 * (`PhiCollectionReorderContext`, the order dropped is the value's new order), the Media library's
 * multi-upload wall (`PhiAreaUploadBinding`, what arrived leaves the wall and joins the value at its end)
 * and its picker on the same Folder (`usePhiMediaLibraryAddPicker`, a pick joins the value at its end, an
 * Asset the value holds already is greyed out). Both offer the Site Space only, and Core delivers every
 * Asset there publicly from the start.
 *
 * `config.folderPath` names the Folder both open on and upload into, its `{key}` placeholders read from the
 * Form's values when the picker or the upload opens (`resolvePhiMediaFolderPathTemplate`), as `media-asset`
 * reads them. `config.max` is the most the value holds: once full the picker and the upload are not
 * offered, a file beyond it is refused before it is sent, and a value beyond it -- one that came in --
 * holds the Form's submit with the sentence the field shows.
 *
 * The tiles are read in one request for the ids the field has no tile for yet (the Media list with `id`
 * repeated, through the Media library's collection Provider), shown in the value's order; an id the list
 * does not answer is an unavailable tile that can still be removed. A pick or an upload brings its tile.
 */
export const PhiMediaAssetsFormControl: ComponentType<PhiFormFieldProviderProps> = ({
  field,
  value,
  labels,
  disabled,
  readOnly,
  onChange,
  formContext,
}) => {
  const { token } = usePhiConfig();
  const config = useMemo(() => readPhiMediaAssetsFieldConfig(field.config), [field.config]);
  const ids = readPhiMediaAssetsFieldValue(value);
  const locked = disabled === true || readOnly === true;
  const full = ids.length >= config.max;

  const read = (key: keyof typeof DEFAULT_LABELS) =>
    labels?.[PHI_FORM_MEDIA_ASSETS_LABEL_KEYS[key]]?.trim() || DEFAULT_LABELS[key];
  const tooMany = read("tooMany").replace("%1", String(config.max));
  const unavailableName = read("unavailable");
  const mediaLabels = useMemo(() => {
    const base = readPhiMediaFieldPickerLabels(labels);
    return { ...base, picker: { ...base.picker, triggerLabel: base.tool.chooseFromLibraryLabel } };
  }, [labels]);
  const pendingLabel = labels?.[PHI_FORM_UPLOAD_LABEL_KEYS.pending]?.trim() || PHI_MEDIA_UPLOAD_FIELD_DEFAULT_LABELS.pending;

  /*
   * The value as the Form holds it this instant: two uploads that finish in one tick each add to what the
   * other left, not to the value this render received. Outside a Form there is only the render's value.
   */
  const readIdsNow = () => formContext ? readPhiMediaAssetsFieldValue(formContext.getValues()[field.key]) : ids;
  const commit = (next: readonly number[]) => onChange?.([...next]);
  const [notice, setNotice] = useState<string | null>(null);

  // The tiles the field knows, by Asset id: read from the list, or brought by a pick or an upload.
  const [tiles, setTiles] = useState<ReadonlyMap<number, PhiMediaCollectionItem>>(() => new Map());
  const [unreadable, setUnreadable] = useState<ReadonlySet<number>>(() => new Set());
  const knowTiles = useCallback((known: readonly PhiMediaCollectionItem[]) => {
    if (known.length === 0) return;
    setTiles((current) => new Map([...current, ...known.map((tile) => [tile.id, tile] as const)]));
  }, []);

  const add = (assets: readonly PhiMediaCollectionItem[]) => {
    knowTiles(assets);
    const { ids: next, refused } = addPhiMediaAssetsFieldIds(readIdsNow(), assets.map((asset) => asset.id), config.max);
    setNotice(refused.length > 0 ? tooMany : null);
    commit(next);
  };

  // One read for the ids the field has no tile for: the Media list answers them by `id`, at most 100 a read.
  const { provider } = usePhiCollectionProvider(PHI_ASSET_COLLECTION_DATA_SOURCE);
  const locale = usePhiIntlLocale();
  const timeZone = usePhiIntlTimeZone();
  const missingKey = ids.filter((id) => !tiles.has(id) && !unreadable.has(id)).join(",");
  useEffect(() => {
    const missing = missingKey ? missingKey.split(",").map(Number).slice(0, PHI_MEDIA_ASSETS_FIELD_MOST) : [];
    if (missing.length === 0 || !provider) return;
    const controller = new AbortController();
    void (async () => {
      let answered: PhiMediaCollectionItem[] = [];
      try {
        const data = await provider.query({
          resourceKey: PHI_ASSET_COLLECTION_DATA_SOURCE.resourceKey,
          query: { page: 1, pageSize: missing.length, filters: { id: missing } },
          locale,
          timeZone,
          signal: controller.signal,
        });
        if (data.error) throw new Error(data.error);
        // Only the ids asked for: a Server that does not filter by `id` answers some page of the library.
        answered = readPhiMediaCollectionItems(data.items, "The Media library").filter((tile) => missing.includes(tile.id));
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("The media-assets field could not read its Assets.", error);
      }
      if (controller.signal.aborted) return;
      knowTiles(answered);
      // What the list did not answer is unavailable, and not asked for again.
      const answeredIds = new Set(answered.map((tile) => tile.id));
      setUnreadable((current) => new Set([...current, ...missing.filter((id) => !answeredIds.has(id))]));
    })();
    return () => controller.abort();
  }, [knowTiles, locale, missingKey, provider, timeZone]);

  /*
   * The submit is held while the value is beyond `max` (one that came in) -- said on the field the way a
   * rule is -- and while a file is on its way, with the upload field's sentence.
   */
  const overMax = ids.length > config.max;
  const [uploading, setUploading] = useState(false);
  const holdReason = overMax ? tooMany : uploading ? pendingLabel : null;
  useEffect(() => {
    if (!formContext || holdReason == null) return;
    formContext.holdSubmit(field.key, holdReason);
    return () => formContext.holdSubmit(field.key, null);
  }, [field.key, formContext, holdReason]);

  // The Folder path as the Form's values name it, read when the picker or the upload opens.
  const folderPathTemplate = config.folderPath;
  const resolveFolderPath = useCallback(
    () => resolvePhiMediaFolderPathTemplate(folderPathTemplate, formContext?.getValues() ?? {}),
    [folderPathTemplate, formContext],
  );

  const picker = usePhiMediaLibraryAddPicker({
    mediaType: config.mediaType,
    labels: mediaLabels,
    folderPath: folderPathTemplate.length > 0 ? resolveFolderPath : null,
    isAssetSelectable: (candidate) => !ids.includes(candidate.id),
    onAssetSelect: (picked) => add([picked]),
  });

  /*
   * The upload wall, into the Folder path as it was when the wall opened. A file the value has no room for
   * -- counting the ones on their way -- is refused before it is sent, so a selection of several that
   * would overfill it sends only what fits.
   */
  const [uploadFolderPath, setUploadFolderPath] = useState<readonly string[] | null>(null);
  const acceptance = useMemo(() => ({ kinds: [config.mediaType], multiple: config.max > 1 }), [config.mediaType, config.max]);
  const uploadPanel = uploadFolderPath && !locked ? (
    <PhiAreaUploadBinding
      labels={mediaLabels.upload}
      config={uploadFolderPath.length > 0 ? { folderPath: uploadFolderPath.join(" / ") } : null}
      acceptance={acceptance}
      showFinished={false}
      siteSpaceOnly
      collectionContext={{ folders: [], folderId: null, folderPath: null, presentationFlags: null, query: {} }}
      onUploadingChange={setUploading}
      refuseFile={(_file, sending) => readIdsNow().length + sending >= config.max ? tooMany : null}
      onAssetUploaded={(asset) => {
        // Core does not know the field's kind, and a file the browser could not name reaches it unrefused.
        if (asset.kind !== config.mediaType) {
          setNotice(mediaLabels.upload.refusals.errorTypeNotAllowed);
          return;
        }
        add([asset]);
      }}
    />
  ) : null;

  const shown = orderPhiMediaAssetsFieldTiles(ids, tiles, unavailableName);
  const toolbar = locked ? null : (
    // The Form's own size, as every other field of it has; a field draws no smaller buttons of its own.
    <PhiToolbarControl compact>
      <PhiButtonControl
        label={mediaLabels.upload.uploadToggleLabel}
        type={uploadFolderPath ? "primary" : "default"}
        disabled={full && !uploadFolderPath}
        onClick={() => setUploadFolderPath((current) => current ? null : resolveFolderPath())}
      />
      <PhiMediaPickerControl {...picker} disabled={full} />
    </PhiToolbarControl>
  );
  // The Collection's own drag handles; the order dropped is the value's new order.
  const reorder = locked || ids.length < 2 ? null : {
    itemKeys: ids,
    onReorder: (keys: (string | number)[]) => commit(readPhiMediaAssetsFieldValue(keys)),
    handleLabel: read("reorder"),
  };
  // While the first tiles are read, the Media renderer's skeleton stands where they will be.
  const reading = missingKey !== "" && provider != null;

  return (
    <PhiCollectionReorderContext.Provider value={reorder}>
      <PhiCollectionViewControl
        toolbar={toolbar}
        panel={uploadPanel}
        diagnostics={overMax || notice ? (
          <PhiTypographyControl type="danger">{overMax ? tooMany : notice}</PhiTypographyControl>
        ) : null}
        body={reading ? (
          <PhiMediaAssetCollectionSkeletonControl
            mode="grid"
            gap={token.paddingSM}
            minColumnWidth={TILE_MIN_WIDTH}
            count={Math.min(ids.length, 6)}
          />
        ) : undefined}
        items={shown.map(({ tile, available }) => (
          <PhiMediaAssetTileControl<PhiMediaCollectionItem>
            key={tile.id}
            asset={tile}
            minColumnWidth={TILE_MIN_WIDTH}
            onDelete={(removed) => {
              setNotice(null);
              commit(readIdsNow().filter((id) => id !== removed.id));
            }}
            deleteLabel={read("remove")}
            showDeleteAction={!locked}
            showTypeLabel={available}
            showDimensions
            showIdLabel
          />
        ))}
        mode="grid"
        minColumnWidth={TILE_MIN_WIDTH}
      />
    </PhiCollectionReorderContext.Provider>
  );
};
