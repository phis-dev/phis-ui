"use client";

import { useCallback } from "react";

import { PhiMediaKind } from "../../constants/media";
import type { PhiMediaAssetTile, PhiMediaKindValue } from "../../types/media";
import { PHI_SEARCH_WIDGET_DEFAULT_LABELS } from "../widgets/label-types/search";
import type { PhiAssetWidgetLabels } from "./media-widget-labels";
import { readPhiMediaUploadFolderPathReach } from "./media-upload-flow";
import { usePhiMediaPickerBinding } from "./phi-media-picker-binding";

/**
 * The Media library's picker for a host that adds what is picked to a list of its own -- the Media
 * renderer's "Choose from Media library" (a Collection of references) and the `media-assets` Form field:
 * the Site Space only, twelve tiles a page with search and paging, the kind `mediaType` names (images where
 * none), and no value of its own, since each pick is added rather than chosen.
 *
 * `folderPath` is the Folder it opens on, by its path of names, asked each time it opens: the host
 * resolves its placeholders then (from the binding params, from the Form's values; a stable function),
 * and the path is read without writing anything (`readPhiMediaUploadFolderPathReach`), so a reader who
 * may only choose opens it as well. `null` where the host names no Folder: the picker opens where it
 * stood last.
 * `isAssetSelectable` greys out what the host will not take (an Asset its list holds already).
 */
export function usePhiMediaLibraryAddPicker({
  mediaType,
  labels,
  folderPath,
  isAssetSelectable,
  onAssetSelect,
}: {
  mediaType: PhiMediaKindValue | null;
  labels: PhiAssetWidgetLabels;
  folderPath: (() => readonly string[]) | null;
  isAssetSelectable?: (asset: PhiMediaAssetTile) => boolean;
  onAssetSelect: (asset: PhiMediaAssetTile) => void;
}) {
  const openOnFolder = useCallback(async (signal: AbortSignal) => {
    const path = folderPath?.() ?? [];
    return path.length > 0 ? readPhiMediaUploadFolderPathReach(path, signal) : { folderId: null, complete: true };
  }, [folderPath]);
  return usePhiMediaPickerBinding({
    config: {
      mediaType: mediaType ?? PhiMediaKind.Image,
      pageSize: 12,
      showPagination: true,
      showSearchBar: true,
    },
    labels,
    searchLabels: PHI_SEARCH_WIDGET_DEFAULT_LABELS,
    value: null,
    siteSpaceOnly: true,
    isAssetSelectable,
    onAssetSelect,
    openOnFolder: folderPath ? openOnFolder : null,
  });
}
