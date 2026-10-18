import { definePhiContentEntryForms } from "../../../components/forms/content-entry-forms";
import { PHI_BLOG_FORM_IDS, PHI_BLOG_RUNTIME_MODULE_ID } from "./ids";

/** Blog's post and publication, curation and category Forms, made the way every kind's are (`CONTENT_ENTRIES.md`). */
const BLOG_FORMS = definePhiContentEntryForms({
  kind: "blog",
  ownerModuleId: PHI_BLOG_RUNTIME_MODULE_ID,
  formIds: PHI_BLOG_FORM_IDS,
  titles: { entry: "Blog post", publication: "Blog publication", curation: "Blog curation", category: "Blog category" },
});

export const PHI_BLOG_RUNTIME_MODULE_FORMS = BLOG_FORMS.forms;
export const PHI_BLOG_FORM_HANDLER_PROVIDER_DESCRIPTORS = BLOG_FORMS.handlers;
