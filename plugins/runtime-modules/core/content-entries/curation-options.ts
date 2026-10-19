"use client";

import {
  createPhiControlOptionsProviderClient,
  type PhiControlOptionsProviderContext,
} from "../../../../components/controls/phi-options-provider";
import { PHI_CONTENT_ENTRY_CURATION_NONE_CONFIG_KEYS } from "../../../../components/forms/content-entry-curation-config";
import { PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS } from "../../../../constants/core-data-provider-keys";
import {
  isPhiContentEntryKind,
  resolvePhiContentEntryEditorApiPaths,
} from "../../../../constants/content-entry-kinds";
import { requestPhiJson } from "../../../../helpers/client-json-request";

/** The kind a curation field offers the choices of, as its `config.kind` names it; none is no offer. */
function readKind(context: Pick<PhiControlOptionsProviderContext, "sourceConfig">) {
  const kind = context.sourceConfig?.kind;
  return isPhiContentEntryKind(kind) ? kind : null;
}

/** Who and what an entry of the kind may be attributed to and filed under, in one answer. */
async function loadCurationOffer(context: Pick<PhiControlOptionsProviderContext, "sourceConfig">) {
  const kind = readKind(context);
  if (!kind) return { authors: [], categories: [] };
  const reply = await requestPhiJson(resolvePhiContentEntryEditorApiPaths(kind).curation);
  if (!reply.ok) throw new Error("Failed to load who and what an entry may be attributed to.");
  return reply.payload;
}

/**
 * "Nobody" or "None" first, as a value of its own: an empty string, which Core reads as none. A cleared
 * select would send nothing, and nothing is "leave it as it is". The words come from the placement
 * (`PHI_CONTENT_ENTRY_CURATION_NONE_CONFIG_KEYS`), which has the page's language.
 *
 * A field that is not a Form -- an Inspector field, whose config is the Widget's -- names the words in its
 * provider's `params` instead, and may name another value: a multiple choice keeps no empty string, so an
 * Entry list's category filter says `none`, the word Core's list reads for it.
 */
function noneOption(context: Pick<PhiControlOptionsProviderContext, "sourceConfig" | "optionsProvider">, key: string) {
  const params = context.optionsProvider?.params;
  const label = context.sourceConfig?.[key] ?? params?.[key];
  const value = params?.noneValue;
  return {
    value: typeof value === "string" ? value : "",
    label: typeof label === "string" && label.trim() ? label : "—",
  };
}

function readList(asyncData: unknown, key: "authors" | "categories") {
  const list = (asyncData as Record<string, unknown> | null)?.[key];
  return Array.isArray(list) ? list as Record<string, unknown>[] : [];
}

/** Who an entry of a kind may be attributed to: the Site's members who may write entries. */
export const PhiContentEntryAuthorsOptionsProviderClient = createPhiControlOptionsProviderClient({
  key: PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.contentEntryAuthors,
  load: loadCurationOffer,
  resolveLoadKey: (context) => `content-entry-curation:${readKind(context) ?? ""}`,
  resolve: (context: PhiControlOptionsProviderContext) => ({
    options: [
      noneOption(context, PHI_CONTENT_ENTRY_CURATION_NONE_CONFIG_KEYS.author),
      ...readList(context.asyncData, "authors").flatMap((author) =>
        typeof author.userId === "number" && typeof author.name === "string"
          ? [{ value: String(author.userId), label: author.name }]
          : []),
    ],
  }),
});

/** The categories an entry of a kind may be filed under, in the order the Site gave them. */
export const PhiContentEntryCategoryOptionsProviderClient = createPhiControlOptionsProviderClient({
  key: PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.contentEntryCategoryOptions,
  load: loadCurationOffer,
  resolveLoadKey: (context) => `content-entry-curation:${readKind(context) ?? ""}`,
  resolve: (context: PhiControlOptionsProviderContext) => ({
    options: [
      noneOption(context, PHI_CONTENT_ENTRY_CURATION_NONE_CONFIG_KEYS.category),
      ...readList(context.asyncData, "categories").flatMap((category) =>
        typeof category.id === "number" && typeof category.label === "string"
          ? [{ value: String(category.id), label: category.label }]
          : []),
    ],
  }),
});
