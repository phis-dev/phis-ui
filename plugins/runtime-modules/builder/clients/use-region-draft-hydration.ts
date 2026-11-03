"use client";

import { useCallback, useEffect } from "react";

import {
  getPhiDeveloperRegionDraftsSnapshot,
  mergePhiDeveloperRegionDrafts,
  usePhiDeveloperRegionDraftsValue,
} from "../developer-workspace-store";
import type { PhiDeveloperBuilderRegionDraft } from "../developer-workspace-types";
import type { PhiBuilderPreviewRegionDraft } from "../preview-transport";

/**
 * Brings the server's Region drafts into the Builder store -- only the ones the store does not hold yet.
 *
 * The Shells and the Pages workspace each did this for themselves, and differently. The Shells workspace
 * merged every server draft of an Area whenever the Area changed, over whatever the store held: an
 * unsaved edit to the Public shell was gone after a look at the Admin shell and back, while the Undo
 * button still offered to take it back. A draft in the store is the author's; the server's answer only
 * fills what is missing.
 *
 * It renders again only when the set of missing drafts changes. Subscribing to the whole draft map for
 * that question re-rendered the workspace, and every Region scaffold below it, on every write to any
 * draft.
 *
 * A preview snapshot is the exception: in preview mode the drafts it carries are what is being looked at,
 * so they are merged as they are.
 */
export function usePhiBuilderRegionDraftHydration({
  draftKeys,
  serverDrafts,
  builderMode,
  previewRegionDrafts,
}: {
  /** The drafts this workspace shows. */
  draftKeys: readonly string[];
  /** What the server answered for them, keyed like the store. */
  serverDrafts: Readonly<Record<string, PhiDeveloperBuilderRegionDraft | null | undefined>> | null | undefined;
  builderMode: string;
  previewRegionDrafts: Record<string, PhiBuilderPreviewRegionDraft> | null | undefined;
}) {
  const missingDraftKeys = usePhiDeveloperRegionDraftsValue(useCallback(
    (drafts: Record<string, PhiDeveloperBuilderRegionDraft>) =>
      draftKeys.filter((draftKey) => drafts[draftKey] == null).join("\u0000"),
    [draftKeys],
  ));

  useEffect(() => {
    if (builderMode === "preview" && previewRegionDrafts && Object.keys(previewRegionDrafts).length > 0) {
      mergePhiDeveloperRegionDrafts(previewRegionDrafts as Record<string, PhiDeveloperBuilderRegionDraft>);
    }
    if (!missingDraftKeys || !serverDrafts) {
      return;
    }
    // `missingDraftKeys` is the reason to run again; the snapshot is what is read.
    const regionDrafts = getPhiDeveloperRegionDraftsSnapshot();
    const missingDrafts = Object.fromEntries(
      Object.entries(serverDrafts).filter((entry): entry is [string, PhiDeveloperBuilderRegionDraft] =>
        entry[1] != null && regionDrafts[entry[0]] == null),
    );
    if (Object.keys(missingDrafts).length > 0) {
      mergePhiDeveloperRegionDrafts(missingDrafts);
    }
  }, [builderMode, missingDraftKeys, previewRegionDrafts, serverDrafts]);
}
