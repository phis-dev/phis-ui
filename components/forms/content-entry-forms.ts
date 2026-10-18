import { definePhiRuntimeModuleForm } from "./form-registry";
import { flattenPhiFormLabels } from "./form-labels";
import {
  PHI_FORM_FIELD_PROVIDER_KEYS,
  PHI_FORM_LINK_TARGET_LABEL_KEYS,
  PHI_FORM_VALIDATION_PROVIDER_KEYS,
  createPhiSharedFormProviderKey,
} from "./form-provider-contract";
import { readPhiServerApiCredentials } from "../../helpers/phis-server-credentials";
import type { PhiFormDescriptor, PhiFormHandlerProviderDescriptor } from "../../types/form-descriptor";
import type { PhiFormId } from "../../types/form-id";
import type { PhiRuntimeModuleId } from "../../types";
import {
  resolvePhiContentEntryEditorApiPaths,
  type PhiContentEntryKind,
} from "../../constants/content-entry-kinds";
import { PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS } from "../../constants/core-data-provider-keys";

/** Where the page that places the entry Form names the Site's source language, for the empty "Written in". */
export const PHI_CONTENT_ENTRY_SOURCE_LOCALE_PLACEHOLDER_CONFIG_KEY = "sourceLocalePlaceholder";

const label = (key: string, fallback: string) => ({ kind: "label", key, fallback } as const);
const required = (key: string, fallback: string) => ([{
  providerKey: PHI_FORM_VALIDATION_PROVIDER_KEYS.required,
  message: label(key, fallback),
}] as const);

function entryFields(kind: PhiContentEntryKind) {
  return [
    /*
     * Empty for a new entry, which is how one `PUT` serves both: with an id it is that entry, without one it
     * is a new entry at the slug below.
     */
    { key: "contentId", fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.hidden },
    /*
     * The version the row showed, sent back as the base of the save: a save that does not build on the
     * current version is refused rather than overwriting somebody else's (phis-server CONTENT.md).
     */
    { key: "versionId", fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.hidden },
    {
      key: "slug",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.text,
      label: label("slugLabel", "Address"),
      placeholder: label("slugPlaceholder", "news-entry-address"),
      /*
       * Core's own rule (`ENTRY_SLUG_PATTERN` in the entries route), stated here so a space or a capital is
       * answered at the field rather than by a refused save.
       */
      validation: [
        ...required("slugError", "An address is required."),
        {
          providerKey: PHI_FORM_VALIDATION_PROVIDER_KEYS.pattern,
          message: label("slugError", "Lower-case letters, digits and hyphens only."),
          config: { source: "^[a-z0-9][a-z0-9-]{0,119}$" },
        },
      ],
    },
    {
      key: "title",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.text,
      label: label("titleLabel", "Title"),
      validation: required("titleError", "A title is required."),
    },
    {
      key: "subtitle",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.text,
      label: label("subtitleLabel", "Subtitle"),
    },
    {
      key: "content",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.textarea,
      label: label("contentLabel", "Body"),
      placeholder: label("contentPlaceholder", "Markdown"),
      validation: required("contentError", "A body is required."),
      config: { rows: 8 },
    },
    // A Page of the Public Area, where the list is read, or an address elsewhere -- never a typed path.
    {
      key: "link",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.linkTarget,
      label: label("linkLabel", "Link"),
      config: { area: "public" },
    },
    /*
     * Offered from what the Site already uses, and typed where a tag is new: a Site with no tagged entry
     * yet has nothing to pick. The string is a tag's identity, so Core lower-cases and deduplicates what it
     * is given, and the offer keeps the spellings to the ones already in use.
     */
    {
      key: "tags",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.multiSelect,
      label: label("tagsLabel", "Tags"),
      optionsProvider: { providerKey: PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.contentEntryTags },
      // `kind` names whose tags are offered; the Options Provider reads it from the field.
      config: { allowCustom: true, kind },
    },
    /*
     * The Site's languages, handed over by the page that places the Form (`site-locales-config.ts`). Empty
     * means the Site's own language, which is why the field clears and its placeholder names that language:
     * the page writes its label into the placement as `sourceLocalePlaceholder`.
     */
    {
      key: "sourceLocale",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.select,
      label: label("sourceLocaleLabel", "Written in"),
      placeholder: { kind: "config", key: PHI_CONTENT_ENTRY_SOURCE_LOCALE_PLACEHOLDER_CONFIG_KEY, fallback: "The Site's source language" },
      optionsProvider: { providerKey: PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.siteLocales },
      config: { allowClear: true },
    },
    {
      key: "translate",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.switch,
      label: label("translateLabel", "May be translated"),
      initialValue: true,
    },
  ] as const;
}

const publicationFields = [
  { key: "contentId", fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.hidden },
  // The version the Publisher saw in the row is the one that goes live, not whatever was saved since.
  { key: "versionId", fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.hidden },
  /*
   * Both optional, and both meaning something when empty: no publication date keeps the one the entry has
   * or takes now, no expiry means none. A publish states the whole term, which is why neither carries over
   * silently from the last one.
   */
  {
    key: "publishedAt",
    fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.datetime,
    label: label("publishedAtLabel", "Published from"),
    // Empty is the moment of publishing, or the date an entry already has: Core takes now where none is.
    placeholder: label("publishedAtPlaceholder", "Now"),
  },
  {
    key: "expiresAt",
    fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.datetime,
    label: label("expiresAtLabel", "Until"),
    placeholder: label("expiresAtPlaceholder", "No end"),
  },
] as const;

/*
 * Who an entry is attributed to and what it is filed under: the Publisher's, and not a word of the text,
 * so its own Form (phis-server CONTENT.md, Curation).
 *
 * Both choices are stated on every save, and "none" is a choice of its own -- an empty value, which Core
 * reads as nobody or no category. A cleared select would send nothing, and Core reads nothing as "leave it".
 */
function curationFields(kind: PhiContentEntryKind) {
  return [
    { key: "contentId", fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.hidden },
    {
      key: "authorUserId",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.select,
      label: label("authorLabel", "Author"),
      optionsProvider: { providerKey: PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.contentEntryAuthors },
      config: { kind },
    },
    {
      key: "categoryId",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.select,
      label: label("categoryLabel", "Category"),
      optionsProvider: { providerKey: PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.contentEntryCategoryOptions },
      config: { kind },
    },
  ] as const;
}

/*
 * One category, stated whole: a new one without an id, a correction with one. The address may be left
 * empty and is then made from the label, the way Core makes a tag's.
 */
const categoryFields = [
  { key: "id", fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.hidden },
  {
    key: "label",
    fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.text,
    label: label("categoryNameLabel", "Name"),
    validation: required("categoryNameError", "A name is required."),
  },
  {
    key: "slug",
    fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.text,
    label: label("slugLabel", "Address"),
    placeholder: label("categorySlugPlaceholder", "Made from the name"),
  },
  {
    key: "sortOrder",
    fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.number,
    label: label("categoryOrderLabel", "Order"),
  },
] as const;

function entryDescriptor(
  formId: string,
  ownerModuleId: PhiRuntimeModuleId,
  fields: PhiFormDescriptor["fields"],
): PhiFormDescriptor {
  return { schemaVersion: 1, key: formId, labelSetKey: `${ownerModuleId}/labels/forms`, fields };
}

async function loadContentEntryFormLabels(
  context: Parameters<NonNullable<ReturnType<typeof definePhiRuntimeModuleForm>["loadLabels"]>>[0],
) {
  const { getPhiContentEntryEditorLabels } = await import("../widgets/label-sets/content-entries");
  const labels = await getPhiContentEntryEditorLabels({
    apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
    internalToken: readPhiServerApiCredentials().internalToken,
    locale: context.runtime.locale.current,
  });
  return flattenPhiFormLabels({
    saveLabel: labels.form.save,
    savingLabel: labels.form.save,
    slugLabel: labels.columns.slug,
    slugPlaceholder: labels.form.slugPlaceholder,
    slugError: labels.form.slugError,
    titleLabel: labels.columns.title,
    titleError: labels.form.titleError,
    subtitleLabel: labels.form.subtitleLabel,
    contentLabel: labels.form.contentLabel,
    contentPlaceholder: labels.form.contentPlaceholder,
    contentError: labels.form.contentError,
    linkLabel: labels.form.linkLabel,
    [PHI_FORM_LINK_TARGET_LABEL_KEYS.none]: labels.form.link.none,
    [PHI_FORM_LINK_TARGET_LABEL_KEYS.page]: labels.form.link.page,
    [PHI_FORM_LINK_TARGET_LABEL_KEYS.external]: labels.form.link.external,
    [PHI_FORM_LINK_TARGET_LABEL_KEYS.pagePlaceholder]: labels.form.link.pagePlaceholder,
    [PHI_FORM_LINK_TARGET_LABEL_KEYS.externalPlaceholder]: labels.form.link.externalPlaceholder,
    [PHI_FORM_LINK_TARGET_LABEL_KEYS.newTab]: labels.form.link.newTab,
    [PHI_FORM_LINK_TARGET_LABEL_KEYS.pagesUnavailable]: labels.form.link.pagesUnavailable,
    tagsLabel: labels.columns.tags,
    sourceLocaleLabel: labels.columns.language,
    translateLabel: labels.form.translateLabel,
    publishedAtLabel: labels.columns.published,
    publishedAtPlaceholder: labels.form.publishedAtPlaceholder,
    expiresAtLabel: labels.columns.expires,
    expiresAtPlaceholder: labels.form.expiresAtPlaceholder,
    authorLabel: labels.columns.author,
    categoryLabel: labels.columns.category,
    categoryNameLabel: labels.categories.columns.label,
    categoryNameError: labels.categories.form.labelError,
    categorySlugPlaceholder: labels.categories.form.slugPlaceholder,
    categoryOrderLabel: labels.categories.columns.order,
  });
}

/**
 * A kind's Forms and their handlers, owned by the kind's Module (`CONTENT_ENTRIES.md`).
 *
 * One Form per act, because the acts have different authorities. The entry states words: what it says,
 * where it lives, which language it is written in. The publication states when it is seen. Curation states
 * who it is by and what it is filed under, and a category is one entry of the Site's order. Core keeps
 * them apart -- content editing for the first, publishing for the rest -- so one Form covering two would be
 * reachable by whoever may do the lesser of them.
 *
 * Both relay through the Form gateway with the viewer's Site session, because both endpoints are guarded by
 * a role. Neither takes a CSRF token of its own -- the gateway adds the internal one -- and neither has a
 * second phase. The ids and handler keys are the Module's, so two kinds never share a Form.
 */
export function definePhiContentEntryForms({
  kind,
  ownerModuleId,
  formIds,
  titles,
}: {
  kind: PhiContentEntryKind;
  ownerModuleId: PhiRuntimeModuleId;
  formIds: { entry: PhiFormId; publication: PhiFormId; curation: PhiFormId; category: PhiFormId };
  /** How the Form catalogue names them: "News entry", "News publication", "News curation", "News category". */
  titles: { entry: string; publication: string; curation: string; category: string };
}) {
  const handlerKeys = {
    entry: `${kind}.entry`,
    publication: `${kind}.publication`,
    curation: `${kind}.curation`,
    category: `${kind}.category`,
  } as const;
  const paths = resolvePhiContentEntryEditorApiPaths(kind);
  const forms = [
    definePhiRuntimeModuleForm({
      ownerModuleId,
      areas: ["editor"],
      formId: formIds.entry,
      version: 1,
      flags: 0,
      title: titles.entry,
      description: `The words of one ${kind} entry, stated whole.`,
      category: "forms",
      tags: [kind, "content"],
      descriptor: entryDescriptor(formIds.entry, ownerModuleId, entryFields(kind)),
      submitHandlerKey: handlerKeys.entry,
      loadLabels: loadContentEntryFormLabels,
    }),
    definePhiRuntimeModuleForm({
      ownerModuleId,
      areas: ["editor"],
      formId: formIds.publication,
      version: 1,
      flags: 0,
      title: titles.publication,
      description: `When one ${kind} entry is answered, and until when.`,
      category: "forms",
      tags: [kind, "publishing"],
      descriptor: entryDescriptor(formIds.publication, ownerModuleId, publicationFields),
      submitHandlerKey: handlerKeys.publication,
      loadLabels: loadContentEntryFormLabels,
    }),
    definePhiRuntimeModuleForm({
      ownerModuleId,
      areas: ["editor"],
      formId: formIds.curation,
      version: 1,
      flags: 0,
      title: titles.curation,
      description: `Who one ${kind} entry is by, and what it is filed under.`,
      category: "forms",
      tags: [kind, "publishing"],
      descriptor: entryDescriptor(formIds.curation, ownerModuleId, curationFields(kind)),
      submitHandlerKey: handlerKeys.curation,
      loadLabels: loadContentEntryFormLabels,
    }),
    definePhiRuntimeModuleForm({
      ownerModuleId,
      areas: ["editor"],
      formId: formIds.category,
      version: 1,
      flags: 0,
      title: titles.category,
      description: `One category ${kind} entries are filed under, stated whole.`,
      category: "forms",
      tags: [kind, "publishing"],
      descriptor: entryDescriptor(formIds.category, ownerModuleId, categoryFields),
      submitHandlerKey: handlerKeys.category,
      loadLabels: loadContentEntryFormLabels,
    }),
  ];
  /*
   * A save states the whole entry, and a category whole, so both are a PUT; a publication is an act, so it
   * is a POST; curation changes two things about an entry and leaves the rest, so it is a PATCH.
   */
  const methods = { entry: "PUT", publication: "POST", curation: "PATCH", category: "PUT" } as const;
  const upstreamPaths = {
    entry: paths.entries,
    publication: paths.publish,
    curation: paths.curation,
    category: paths.categories,
  } as const;
  const handlers = (["entry", "publication", "curation", "category"] as const).map((key) => ({
    key: createPhiSharedFormProviderKey("handler", `${kind}-${key}`),
    ownerModuleId,
    title: `${titles[key]}`,
    phase: "submit",
    handlerKey: handlerKeys[key],
    category: "forms",
    transport: "relay",
    method: methods[key],
    endpointKey: null,
    upstreamPath: upstreamPaths[key],
    csrfPath: null,
    requiresCsrf: false,
    credentialPolicy: "site-session",
  })) satisfies readonly PhiFormHandlerProviderDescriptor[];
  return { forms, handlers };
}
