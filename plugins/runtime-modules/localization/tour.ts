import type { PhiTourDefinition } from "../../../types/tours";
import { PHI_LOCALIZATION_RUNTIME_MODULE_ID } from "./ids";
import {
  PHI_EDITOR_TRANSLATIONS_SOURCE_LOCALE_WIDGET_ID,
  PHI_EDITOR_TRANSLATIONS_WIDGET_ID,
} from "./trees/editor-translations-shell";

/**
 * The Editor's Translations Tour: where the Site's words come from, how to find the ones worth checking,
 * and what correcting one does. What the Page does not say is that it is a correction desk -- the Site is
 * translated by itself, and this is where a person overrides it.
 */
export const PHI_EDITOR_TRANSLATIONS_TOUR = {
  id: `${PHI_LOCALIZATION_RUNTIME_MODULE_ID}/editor-translations`,
  version: 1,
  steps: [
    {
      key: "source-language",
      target: `cms:${PHI_EDITOR_TRANSLATIONS_SOURCE_LOCALE_WIDGET_ID}`,
      title: "The language the Site is written in",
      description: "Every text of the Site is written in this language and translated from it. It is chosen when the Site is created and does not change.",
      placement: "bottom",
    },
    {
      key: "texts",
      target: `cms:${PHI_EDITOR_TRANSLATIONS_WIDGET_ID}:header`,
      title: "Each text and its translation",
      description: "One row per text of the Site -- a Page's words, a menu entry, an entry's title: the text as written, where it is used, and its translation in the chosen language. Missing means it has none in that language yet.",
      placement: "bottom",
    },
    {
      key: "filters",
      target: `cms:${PHI_EDITOR_TRANSLATIONS_WIDGET_ID}:filters`,
      title: "Finding what to check",
      description: "Pick the language, narrow to one context -- where a text is used -- or show only what is missing. Search looks through the text, its context and its translation.",
      placement: "bottom",
      ifMissing: "skip",
    },
    {
      key: "correcting",
      target: `cms:${PHI_EDITOR_TRANSLATIONS_WIDGET_ID}:row-actions`,
      title: "Correcting a translation",
      description: "Edit opens one translation; what you save is shown from then on. Delete removes it, and the text is translated anew the next time a Page needs it.",
      placement: "left",
    },
  ],
} as const satisfies PhiTourDefinition;
