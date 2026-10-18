import { definePhiContentEntryForms } from "../../../components/forms/content-entry-forms";
import { PHI_NEWS_FORM_IDS, PHI_NEWS_RUNTIME_MODULE_ID } from "./ids";

/** News's entry and publication, curation and category Forms, made the way every kind's are (`CONTENT_ENTRIES.md`). */
const NEWS_FORMS = definePhiContentEntryForms({
  kind: "news",
  ownerModuleId: PHI_NEWS_RUNTIME_MODULE_ID,
  formIds: PHI_NEWS_FORM_IDS,
  titles: { entry: "News entry", publication: "News publication", curation: "News curation", category: "News category" },
});

export const PHI_NEWS_RUNTIME_MODULE_FORMS = NEWS_FORMS.forms;
export const PHI_NEWS_FORM_HANDLER_PROVIDER_DESCRIPTORS = NEWS_FORMS.handlers;
