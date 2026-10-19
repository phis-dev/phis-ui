import type { PhiTourDefinition } from "../../../types/tours";
import { PHI_EDITOR_RELEASES_WIDGET_ID, PHI_EDITOR_RUNTIME_MODULE_ID } from "./ids";

/**
 * The Releases Tour: what lands here, and the two answers a Publisher gives. What the Page does not say is
 * that everything submitted anywhere in the Site arrives in this one list, and that sending something back
 * loses nothing.
 */
export const PHI_EDITOR_RELEASES_TOUR = {
  id: `${PHI_EDITOR_RUNTIME_MODULE_ID}/releases`,
  version: 1,
  steps: [
    {
      key: "queue",
      target: `cms:${PHI_EDITOR_RELEASES_WIDGET_ID}:header`,
      title: "Everything waiting for release",
      description: "What Authors submit anywhere in the Site lands here: texts on Pages, entries, Pages and Area changes. Kind says what it is, Where where it will appear, By who submitted it.",
      placement: "bottom",
    },
    {
      key: "answer",
      target: `cms:${PHI_EDITOR_RELEASES_WIDGET_ID}:row-actions`,
      title: "Publish or send back",
      description: "Publish puts the submitted version live. Send back withdraws the submission: nothing is published, and the words stay as they were written, so the Author can go on.",
      placement: "left",
    },
    {
      key: "count",
      target: `cms:${PHI_EDITOR_RELEASES_WIDGET_ID}:footer`,
      title: "How many wait",
      description: "The count of everything still waiting. The list is empty when everything submitted has an answer.",
      placement: "top",
      ifMissing: "skip",
    },
  ],
} as const satisfies PhiTourDefinition;
