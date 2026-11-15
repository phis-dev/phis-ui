import "server-only";

import { logRuntimeEvent } from "../net/log";
import type { PhiBlockRuntime } from "../types";
import type { PhiCmsRuntimeRenderRegistry } from "../types/cms-plugins";
import type { PhiRecordField, PhiRecordFieldKind } from "../types/record-provider";
import type { PhiRuntimeDataProviderBinding } from "../types/runtime-data-provider";
import { readPhiRecordFieldValue } from "../helpers/record-fields";
import { phiRuntime } from "./phi-runtime";
import { resolvePhiRecordSource } from "./record-source";
import { definePhiRequestMemoWith } from "./request-memo";

type PhiRecordFieldsRegistry = Pick<
  PhiCmsRuntimeRenderRegistry,
  "recordProviderLoadersByKey" | "recordFieldsLoadersByKey" | "dataProviderDescriptorsByKey"
>;

/**
 * The declared fields of one record (MODULES.md, "The fields of a record, and the record a Page is about").
 *
 * `none` is a Page that is about no record, or a binding to a Provider that declares no fields: a Widget
 * bound to a field there has nothing to show and is not at fault. `missing` and `unavailable` are the
 * record's own two failures, as `resolvePhiRecordSource` tells them apart.
 */
export type PhiPageRecordFieldsResult =
  | { status: "ok"; fields: ReadonlyMap<string, PhiRecordField> }
  | { status: "none" }
  | { status: "missing" }
  | { status: "unavailable"; reason: string };

const resolveFields = definePhiRequestMemoWith(async (
  key: { providerKey: string; params: Record<string, unknown>; siteKey: string; locale: string },
  using: { registry: PhiRecordFieldsRegistry; runtime: PhiBlockRuntime; apiBaseUrl: string; internalToken: string },
): Promise<PhiPageRecordFieldsResult> => {
  const providerKey = key.providerKey as `${string}/${string}`;
  const descriptor = using.registry.dataProviderDescriptorsByKey.get(providerKey);
  const declared = descriptor?.kind === "record" ? descriptor.record?.fields : undefined;
  const loadFields = using.registry.recordFieldsLoadersByKey.get(providerKey);
  if (!declared || !loadFields) {
    return { status: "none" };
  }
  const source = await resolvePhiRecordSource({
    registry: using.registry,
    runtime: using.runtime,
    binding: { providerKey, params: key.params },
  });
  if (source.status !== "ok") {
    return source;
  }
  try {
    const read = await loadFields();
    const values = await read(source.record, {
      apiBaseUrl: using.apiBaseUrl,
      internalToken: using.internalToken,
      siteKey: key.siteKey,
      locale: key.locale,
      runtime: using.runtime,
    });
    const fields = new Map<string, PhiRecordField>();
    for (const field of declared) {
      const raw = values[field.key];
      if (raw === undefined || raw === null) continue;
      const value = readPhiRecordFieldValue(field.kind, raw);
      if (value === undefined) {
        logRuntimeEvent("warn", "cms.record.field_invalid", {
          message: `Record provider "${key.providerKey}" answered field "${field.key}" with a value that is no ${field.kind}.`,
          siteKey: key.siteKey,
          area: using.runtime.area,
          meta: { providerKey: key.providerKey, field: field.key, kind: field.kind },
        });
        continue;
      }
      fields.set(field.key, { kind: field.kind, value } as PhiRecordField);
    }
    return { status: "ok", fields };
  } catch (error) {
    logRuntimeEvent("error", "cms.record.fields_failed", {
      message: `Failed to read the fields of record provider "${key.providerKey}" for this render.`,
      siteKey: key.siteKey,
      area: using.runtime.area,
      error,
      meta: { providerKey: key.providerKey },
    });
    return { status: "unavailable", reason: error instanceof Error ? error.message : String(error) };
  }
});

/** The declared fields of the record a binding names, read once per request for the same record. */
export function resolvePhiRecordFields({ registry, runtime, binding }: {
  registry: PhiRecordFieldsRegistry;
  runtime: PhiBlockRuntime;
  binding: PhiRuntimeDataProviderBinding | null | undefined;
}): Promise<PhiPageRecordFieldsResult> {
  if (!binding) {
    return Promise.resolve({ status: "none" });
  }
  const rt = phiRuntime(runtime);
  return resolveFields(
    { providerKey: binding.providerKey, params: binding.params ?? {}, siteKey: rt.siteKey, locale: runtime.locale.current },
    { registry, runtime, apiBaseUrl: rt.apiBaseUrl, internalToken: rt.internalToken },
  );
}

/** The declared fields of the record this Page is about (`runtime.page.record`). */
export function resolvePhiPageRecordFields({ registry, runtime }: {
  registry: PhiRecordFieldsRegistry;
  runtime: PhiBlockRuntime;
}): Promise<PhiPageRecordFieldsResult> {
  return resolvePhiRecordFields({ registry, runtime, binding: runtime.page?.record });
}

/** One field of a result, if the record has it and it is of one of the kinds asked for. */
export function readPhiPageRecordField<K extends PhiRecordFieldKind>(
  result: PhiPageRecordFieldsResult,
  key: string | null | undefined,
  kinds: readonly K[],
): Extract<PhiRecordField, { kind: K }> | null {
  if (result.status !== "ok" || !key) return null;
  const field = result.fields.get(key);
  return field && (kinds as readonly string[]).includes(field.kind) ? field as Extract<PhiRecordField, { kind: K }> : null;
}
