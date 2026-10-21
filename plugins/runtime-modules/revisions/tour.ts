import type { PhiTourDefinition } from "../../../types/tours";
import { PHI_REVISIONS_RUNTIME_MODULE_ID } from "./ids";
import { PHI_REVISIONS_PAGE_WIDGET_IDS, PHI_REVISIONS_TABLE_WIDGET_ID } from "./page-ids";

/**
 * The Revisions Tour. What the Page does not say is that every save is kept, that going back never
 * touches what is live -- a restored revision is a new draft -- and that the one act here that cannot be
 * taken back stands apart from the rest.
 */
export const PHI_REVISIONS_TOUR = {
  id: `${PHI_REVISIONS_RUNTIME_MODULE_ID}/revisions`,
  version: 1,
  steps: [
    {
      key: "history",
      target: `cms:${PHI_REVISIONS_TABLE_WIDGET_ID}:filters`,
      title: "Whose history",
      description: "Every save is kept as a revision. Kind chooses what the list shows: an Area's Shell, a Page, a Navigation or the Theme. Scope chooses which Page or which Navigation.",
      placement: "bottom",
      ifMissing: "skip",
    },
    {
      key: "list",
      target: `cms:${PHI_REVISIONS_TABLE_WIDGET_ID}:header`,
      title: "One row per revision",
      description: "Newest first, with when it was saved, by whom and what changed. The tags say which revision is live and which is the draft being worked on; those two cannot be deleted.",
      placement: "bottom",
    },
    {
      key: "answer",
      target: `cms:${PHI_REVISIONS_TABLE_WIDGET_ID}:row-actions`,
      title: "Looking back and going back",
      description: "Review opens the revision as it was, in a new tab. Restore makes a new draft from it: nothing live changes until that draft is published. Delete removes a revision for good; selected rows can be deleted together.",
      placement: "left",
      ifMissing: "skip",
    },
    {
      key: "reset",
      target: `cms:${PHI_REVISIONS_TABLE_WIDGET_ID}:toolbar`,
      title: "Back to the preset",
      description: "A Page a Module brings can go back to that Module's version. Every revision the Site stored for it goes with it, so this is offered only while a Page's history is shown.",
      placement: "bottom",
      ifMissing: "skip",
    },
    {
      key: "delete-area",
      target: `cms:${PHI_REVISIONS_PAGE_WIDGET_IDS.widgetRevisionsAreaShellDelete}`,
      title: "Deleting an Area",
      description: "Clears everything the Site stored for an Area's Shell and Module selection, live included, and leaves no revision to restore. The Area keeps its Pages, its Navigation and its Theme. It asks for the Area's key before it does anything.",
      placement: "bottom",
    },
  ],
} as const satisfies PhiTourDefinition;
