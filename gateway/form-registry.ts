import { cache } from "react";
import "server-only";

import { buildApiHeaders, buildApiUrl } from "../helpers/site-api";
import type { PhiRuntimeModuleFormDefinition } from "../components/forms/form-registry";
import {
  resolvePhiFormDefinition,
  type PhiFormDefinitionLike,
  type PhiResolvedFormDefinition,
} from "../components/forms/form-resolution";
import { parsePhiFormDescriptor } from "../components/forms/form-descriptor-contract";
import type { PhiFormDescriptor } from "../types/form-descriptor";
import type { PhiRuntimeModuleId } from "../types/cms-module-descriptors";
import type { PhiFormId } from "../types/form-id";
import { isPhiFormId, normalizePhiFormId } from "../types/form-id";

export const PHI_FORM_DEFINITION_STATUS = {
  workingDraft: 0,
  published: 1,
  archived: 2,
} as const;

export type PhiFormRegistryRecord = {
  id: number;
  ownerModuleId: PhiRuntimeModuleId;
  formId: PhiFormId;
  version: number;
  status: number;
  flags: number;
  title: string;
  description: string | null;
  category: string | null;
  tags: string[];
  descriptor: PhiFormDescriptor;
  submitHandlerKey: string | null;
  confirmHandlerKey: string | null;
  previewHandlerKey: string | null;
  defaultConfig: Record<string, unknown>;
  variant: string | null;
  config: Record<string, unknown>;
  previewUpstreamPath: string | null;
};

type FormRegistryRequestOptions = {
  apiBaseUrl: string;
  internalToken: string;
  siteKey: string;
};

export type GetResolvedFormDefinitionOptions = FormRegistryRequestOptions & {
  formId: string;
  presetDefinitions: readonly PhiRuntimeModuleFormDefinition[];
};

export type ListResolvedFormDefinitionsOptions = FormRegistryRequestOptions & {
  presetDefinitions: readonly PhiRuntimeModuleFormDefinition[];
};

type FormRegistryPayload = {
  form?: unknown;
  forms?: unknown[];
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string").map((item) => item.trim());
}

function toRecord(value: unknown): Record<string, unknown> {
  return isPlainObject(value) ? value : {};
}

function normalizeRegistryRecord(value: unknown): PhiFormRegistryRecord | null {
  if (!isPlainObject(value)) {
    return null;
  }

  const id = typeof value.id === "number" ? value.id : Number.NaN;
  const version = typeof value.version === "number" ? value.version : Number.NaN;
  const status = typeof value.status === "number" ? value.status : Number.NaN;
  const flags = typeof value.flags === "number" ? value.flags : 0;
  const ownerModuleId =
    typeof value.ownerModuleId === "string" ? value.ownerModuleId.trim() as PhiRuntimeModuleId : "" as PhiRuntimeModuleId;
  const formId = typeof value.formId === "string" ? normalizePhiFormId(value.formId) : "";
  const title = typeof value.title === "string" ? value.title.trim() : "";
  const submitHandlerKey =
    typeof value.submitHandlerKey === "string" && value.submitHandlerKey.trim()
      ? value.submitHandlerKey.trim()
      : null;

  if (!Number.isFinite(id) || !Number.isFinite(version) || status !== PHI_FORM_DEFINITION_STATUS.published) {
    return null;
  }
  if (!ownerModuleId || !isPhiFormId(formId) || !title) {
    return null;
  }

  const descriptor = parsePhiFormDescriptor(value.descriptor);
  if (descriptor.key !== formId) {
    throw new Error(`Form descriptor key "${descriptor.key}" must match formId "${formId}".`);
  }
  return {
    id,
    ownerModuleId,
    formId,
    version,
    status,
    flags,
    title,
    description: typeof value.description === "string" ? value.description : null,
    category: typeof value.category === "string" ? value.category : null,
    tags: toStringArray(value.tags),
    descriptor,
    submitHandlerKey,
    confirmHandlerKey: typeof value.confirmHandlerKey === "string" ? value.confirmHandlerKey : null,
    previewHandlerKey: typeof value.previewHandlerKey === "string" ? value.previewHandlerKey : null,
    defaultConfig: toRecord(value.defaultConfig),
    variant: typeof value.variant === "string" ? value.variant : null,
    config: toRecord(value.config),
    previewUpstreamPath:
      typeof value.previewUpstreamPath === "string" ? value.previewUpstreamPath : null,
  };
}

function normalizeRegistryResponse(payload: unknown): PhiFormRegistryRecord[] {
  if (!isPlainObject(payload)) {
    return [];
  }
  const forms: unknown[] = Array.isArray((payload as FormRegistryPayload).forms)
    ? ((payload as FormRegistryPayload).forms as unknown[])
    : (payload as FormRegistryPayload).form
      ? [(payload as FormRegistryPayload).form]
      : [];
  return forms
    .map((form) => normalizeRegistryRecord(form))
    .filter((form): form is PhiFormRegistryRecord => Boolean(form));
}

function buildResolvedDefinition(
  formId: string,
  records: readonly PhiFormRegistryRecord[],
  presetDefinitions: readonly PhiRuntimeModuleFormDefinition[],
): PhiResolvedFormDefinition<PhiFormDefinitionLike> | null {
  const normalizedFormId = normalizePhiFormId(formId);
  if (!isPhiFormId(normalizedFormId)) {
    return null;
  }

  const presetDefinition =
    presetDefinitions.find((definition) => definition.formId === normalizedFormId) ?? null;
  if (!presetDefinition) {
    return null;
  }
  const overrideDefinition = records
    .filter((record) => record.formId === normalizedFormId)
    .sort((left, right) => right.version - left.version || right.id - left.id)[0] ?? null;
  if (overrideDefinition && overrideDefinition.ownerModuleId !== presetDefinition.ownerModuleId) {
    throw new Error(
      `Stored Form "${normalizedFormId}" belongs to "${overrideDefinition.ownerModuleId}" instead of ` +
      `active owner module "${presetDefinition.ownerModuleId}".`,
    );
  }

  return resolvePhiFormDefinition<PhiFormDefinitionLike>({
    presetDefinition,
    overrideDefinition,
  });
}

export const fetchFormRegistry = cache(async function fetchFormRegistry({
  apiBaseUrl,
  internalToken,
  siteKey,
}: FormRegistryRequestOptions): Promise<PhiFormRegistryRecord[]> {
  if (!apiBaseUrl.trim()) {
    throw new Error("Missing apiBaseUrl for fetchFormRegistry.");
  }
  if (!internalToken.trim()) {
    throw new Error("Missing internalToken for fetchFormRegistry.");
  }
  if (!siteKey.trim()) {
    throw new Error("Missing siteKey for fetchFormRegistry.");
  }

  const response = await fetch(buildApiUrl(apiBaseUrl, "/api/v1/forms/registry"), {
    headers: buildApiHeaders({
      token: internalToken,
      siteKey,
      includeToken: true,
      includeSiteKey: true,
      extra: {
        Accept: "application/json",
        "User-Agent": "phis-ui/1.0",
      },
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch form registry (${response.status}).`);
  }
  return normalizeRegistryResponse(await response.json().catch(() => null));
});

export async function listResolvedFormDefinitions({
  apiBaseUrl,
  internalToken,
  siteKey,
  presetDefinitions,
}: ListResolvedFormDefinitionsOptions): Promise<PhiResolvedFormDefinition<PhiFormDefinitionLike>[]> {
  const registry = await fetchFormRegistry({ apiBaseUrl, internalToken, siteKey });
  const formIds = new Set([
    ...presetDefinitions.map((definition) => definition.formId),
    ...registry.map((record) => record.formId),
  ]);
  return [...formIds]
    .sort()
    .map((formId) => buildResolvedDefinition(formId, registry, presetDefinitions))
    .filter((definition): definition is PhiResolvedFormDefinition<PhiFormDefinitionLike> => Boolean(definition));
}

export async function getResolvedFormDefinition({
  apiBaseUrl,
  internalToken,
  siteKey,
  formId,
  presetDefinitions,
}: GetResolvedFormDefinitionOptions): Promise<PhiResolvedFormDefinition<PhiFormDefinitionLike> | null> {
  const normalizedFormId = normalizePhiFormId(formId);
  if (!isPhiFormId(normalizedFormId)) {
    return null;
  }
  const registry = await fetchFormRegistry({ apiBaseUrl, internalToken, siteKey });
  return buildResolvedDefinition(normalizedFormId, registry, presetDefinitions);
}
