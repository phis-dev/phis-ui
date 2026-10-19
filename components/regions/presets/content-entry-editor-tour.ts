import type { PhiRuntimeModuleId } from "../../../types";
import { createPhiPresetCmsInstanceIdMap } from "../../../types/cms-instance-id";
import type { PhiTourDefinition } from "../../../types/tours";

/**
 * The Tour of a content kind's editor Page (News, Blog): the order a writer meets it in -- the list, finding
 * and starting an entry, writing and saving, getting it out, the categories. The steps point at the
 * Table's parts (`cms:<id>:filters` and the like), which the Table Widget offers.
 *
 * One text for every kind: the Page is the same Page for each, built by `content-entry-editor-page-tree.ts`,
 * and its Tour says "entry" where the Page's own words are the kind's. The ids are the Page's, derived from
 * the same Module, preset and node keys, so the steps point at what that tree draws.
 *
 * The Page is drawn for two roles. An Author sees Submit where a Publisher sees Publish and Withdraw, and
 * only a Publisher sees the categories; the step about getting an entry out says both, and the categories
 * step is passed over where its Table is not drawn.
 */
export function buildPhiContentEntryEditorTour({
  ownerModuleId,
  presetKey,
}: {
  ownerModuleId: PhiRuntimeModuleId;
  presetKey: string;
}): PhiTourDefinition {
  const ids = createPhiPresetCmsInstanceIdMap({ domain: "page", ownerModuleId, presetKey }, [
    "widgetNews",
    "widgetCategories",
  ]);
  return {
    id: `${ownerModuleId}/editor`,
    version: 1,
    steps: [
      {
        key: "entries",
        target: `cms:${ids.widgetNews}`,
        title: "Every entry, written and published",
        description: "Drafts and published entries stand in one list, newest first, with who wrote them, where they are filed and when they went out.",
        placement: "top",
      },
      {
        key: "finding",
        target: `cms:${ids.widgetNews}:filters`,
        title: "Finding an entry",
        description: "Show only drafts or only what is published, or search by title and address.",
        placement: "bottom",
        ifMissing: "skip",
      },
      {
        key: "new",
        target: `cms:${ids.widgetNews}:toolbar`,
        title: "A new entry",
        description: "The plus starts one. It is a draft until it is published, so nobody reads it while you write.",
        placement: "bottom",
        ifMissing: "skip",
      },
      {
        key: "writing",
        target: `cms:${ids.widgetNews}:row-actions`,
        title: "Writing is saving a draft",
        description: "Edit opens an entry's text. What you save is a draft: readers keep seeing the published version until the new one is published.",
        placement: "left",
      },
      {
        key: "release",
        target: `cms:${ids.widgetNews}:row-actions`,
        title: "Getting an entry out",
        description: "An Author submits an entry, and it waits under Releases for a Publisher. A Publisher publishes it here, from a date and until a date if it should, names its author and category, and can take it offline again.",
        placement: "left",
      },
      {
        key: "categories",
        target: `cms:${ids.widgetCategories}`,
        title: "Categories",
        description: "Each entry is filed under one category or none. The order sorts the categories wherever they are listed, and a list of entries on a Page can be set to show only some of them.",
        placement: "top",
        ifMissing: "skip",
      },
    ],
  };
}
