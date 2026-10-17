import { definePhiRuntimeModuleForm } from "../../../components/forms/form-registry";
import { flattenPhiFormLabels } from "../../../components/forms/form-labels";
import {
  PHI_FORM_FIELD_PROVIDER_KEYS,
  PHI_FORM_LINK_TARGET_LABEL_KEYS,
  PHI_FORM_VALIDATION_PROVIDER_KEYS,
  createPhiSharedFormProviderKey,
} from "../../../components/forms/form-provider-contract";
import { readPhiServerApiCredentials } from "../../../helpers/phis-server-credentials";
import type { PhiFormDescriptor, PhiFormHandlerProviderDescriptor } from "../../../types/form-descriptor";
import { createPhiFormId } from "../../../types/form-id";
import { PHI_SHARED_PACKAGE_NAME } from "../../../types/signals";
import { PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS } from "../../../constants/core-data-provider-keys";
import { PHI_NEWS_RUNTIME_DATA_PROVIDER_KEYS, PHI_NEWS_RUNTIME_MODULE_ID } from "./ids";

/**
 * Two Forms, because there are two acts and two authorities.
 *
 * The entry states words: what it says, where it lives, which language it is written in. The publication
 * states when it is seen. Core keeps them apart -- one is `PHI_ACCESS_CONTENT_EDITING`, the other
 * `PHI_ACCESS_PUBLISHING` -- so one Form covering both would be reachable by whoever may do the lesser of
 * the two ([design/NEWS.md](../../../../phis-server/design/NEWS.md)).
 */
export const PHI_NEWS_FORM_IDS = {
  entry: createPhiFormId(PHI_SHARED_PACKAGE_NAME, "news/entry"),
  publication: createPhiFormId(PHI_SHARED_PACKAGE_NAME, "news/publication"),
} as const;

const PHI_NEWS_FORM_HANDLER_KEYS = {
  entry: "news.entry",
  publication: "news.publication",
} as const;

/** Stated rather than derived from the keys above, so a public identifier never inherits camelCase. */
const PHI_NEWS_FORM_HANDLER_LEAVES = {
  entry: "entry",
  publication: "publication",
} as const satisfies Record<keyof typeof PHI_NEWS_FORM_HANDLER_KEYS, string>;

/** Where the page that places the entry Form names the Site's own language, for the empty "Written in". */
export const NEWS_SOURCE_LOCALE_PLACEHOLDER_CONFIG_KEY = "sourceLocalePlaceholder";

const LABEL_SET_KEY = "@phis/ui/modules/news/labels/forms" as const;
const label = (key: string, fallback: string) => ({ kind: "label", key, fallback } as const);
const required = (key: string, fallback: string) => ([{
  providerKey: PHI_FORM_VALIDATION_PROVIDER_KEYS.required,
  message: label(key, fallback),
}] as const);

const entryFields = [
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
    optionsProvider: { providerKey: PHI_NEWS_RUNTIME_DATA_PROVIDER_KEYS.tags },
    config: { allowCustom: true },
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
    placeholder: { kind: "config", key: NEWS_SOURCE_LOCALE_PLACEHOLDER_CONFIG_KEY, fallback: "The Site's source language" },
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

function newsDescriptor(formId: string, fields: PhiFormDescriptor["fields"]): PhiFormDescriptor {
  return { schemaVersion: 1, key: formId, labelSetKey: LABEL_SET_KEY, fields };
}

async function loadNewsFormLabels(
  context: Parameters<NonNullable<ReturnType<typeof definePhiRuntimeModuleForm>["loadLabels"]>>[0],
) {
  const { getPhiEditorNewsWidgetLabels } = await import("./trees/editor-news-widget-label-set");
  const labels = await getPhiEditorNewsWidgetLabels({
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
  });
}

export const PHI_NEWS_RUNTIME_MODULE_FORMS = [
  definePhiRuntimeModuleForm({
    ownerModuleId: PHI_NEWS_RUNTIME_MODULE_ID,
    areas: ["editor"],
    formId: PHI_NEWS_FORM_IDS.entry,
    version: 1,
    flags: 0,
    title: "News entry",
    description: "The words of one news entry, stated whole.",
    category: "forms",
    tags: ["news", "content"],
    descriptor: newsDescriptor(PHI_NEWS_FORM_IDS.entry, entryFields),
    submitHandlerKey: PHI_NEWS_FORM_HANDLER_KEYS.entry,
    loadLabels: loadNewsFormLabels,
  }),
  definePhiRuntimeModuleForm({
    ownerModuleId: PHI_NEWS_RUNTIME_MODULE_ID,
    areas: ["editor"],
    formId: PHI_NEWS_FORM_IDS.publication,
    version: 1,
    flags: 0,
    title: "News publication",
    description: "When one news entry is answered, and until when.",
    category: "forms",
    tags: ["news", "publishing"],
    descriptor: newsDescriptor(PHI_NEWS_FORM_IDS.publication, publicationFields),
    submitHandlerKey: PHI_NEWS_FORM_HANDLER_KEYS.publication,
    loadLabels: loadNewsFormLabels,
  }),
];

/**
 * Where each Form's values go, and by which method.
 *
 * Both relay through the Form gateway with the viewer's Site session, because both endpoints are guarded by
 * a role: the entry by content editing, the publication by publishing. Neither takes a CSRF token of its
 * own -- the gateway adds the internal one -- and neither has a second phase.
 */
export const PHI_NEWS_FORM_HANDLER_PROVIDER_DESCRIPTORS = (
  Object.keys(PHI_NEWS_FORM_HANDLER_KEYS) as (keyof typeof PHI_NEWS_FORM_HANDLER_KEYS)[]
).map((key) => ({
  key: createPhiSharedFormProviderKey("handler", `news-${PHI_NEWS_FORM_HANDLER_LEAVES[key]}`),
  ownerModuleId: PHI_NEWS_RUNTIME_MODULE_ID,
  title: `News ${PHI_NEWS_FORM_HANDLER_LEAVES[key]}`,
  phase: "submit",
  handlerKey: PHI_NEWS_FORM_HANDLER_KEYS[key],
  category: "forms",
  transport: "relay",
  // A save states the whole entry, so it is a PUT; a publication is an act, so it is a POST.
  method: key === "entry" ? "PUT" : "POST",
  endpointKey: null,
  upstreamPath: key === "entry" ? "/api/site/editor/entries/news" : "/api/site/editor/entries/news/publish",
  csrfPath: null,
  requiresCsrf: false,
  credentialPolicy: "site-session",
})) satisfies readonly PhiFormHandlerProviderDescriptor[];
