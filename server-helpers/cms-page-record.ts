import "server-only";

import type { PhiBlockRuntime } from "../types";
import type { PhiCmsRoutePresetBinding } from "../types/cms-module-descriptors";
import type { PhiCmsRuntimeRenderRegistry, PhiRuntimeModuleCatalog, PhiRuntimeModuleId } from "../types/cms-plugins";
import type { PhiRuntimeDataProviderBinding } from "../types/runtime-data-provider";
import { readPhiPageRecordField, resolvePhiRecordFields } from "./record-fields";
import { resolvePhiRecordSource } from "./record-source";

/**
 * The record a route's Page is about, read before anything is drawn (MODULES.md, "The fields of a record,
 * and the record a Page is about").
 *
 * `missing` is an address that names no record: the caller answers 404. An unavailable Provider is not
 * that -- the Page is drawn, its Widgets say what they could not read, and the title stays the route's.
 */
export type PhiCmsPageRecord =
  | { status: "missing" }
  | { status: "ok"; binding: PhiRuntimeDataProviderBinding; title: string | null; description: string | null };

/** What the record Providers of the active Modules offer, as a render's registry holds it. */
function buildRecordRegistry(
  runtimeModuleCatalog: PhiRuntimeModuleCatalog,
  activeModuleIds: ReadonlySet<PhiRuntimeModuleId>,
): Pick<PhiCmsRuntimeRenderRegistry, "recordProviderLoadersByKey" | "recordFieldsLoadersByKey" | "dataProviderDescriptorsByKey"> {
  const entries = [...activeModuleIds].flatMap((moduleId) => {
    const entry = runtimeModuleCatalog.get(moduleId);
    return entry ? [entry] : [];
  });
  return {
    recordProviderLoadersByKey: new Map(entries.flatMap((entry) =>
      (entry.recordProviders ?? []).map((provider) => [provider.key, provider.load] as const))),
    recordFieldsLoadersByKey: new Map(entries.flatMap((entry) =>
      (entry.recordProviders ?? []).flatMap((provider) => provider.loadFields ? [[provider.key, provider.loadFields] as const] : []))),
    dataProviderDescriptorsByKey: new Map(entries.flatMap((entry) =>
      (entry.definition.dataProviders ?? []).map((provider) => [provider.key, provider] as const))),
  };
}

export async function resolvePhiCmsPageRecord({ binding, runtime, runtimeModuleCatalog, activeModuleIds }: {
  binding: PhiCmsRoutePresetBinding;
  runtime: PhiBlockRuntime;
  runtimeModuleCatalog: PhiRuntimeModuleCatalog;
  activeModuleIds: ReadonlySet<PhiRuntimeModuleId>;
}): Promise<PhiCmsPageRecord | null> {
  const declaration = binding.descriptor.pageRecord;
  if (!declaration) {
    return null;
  }
  const route = `${binding.descriptor.ownerModuleId}/${binding.descriptor.presetKey}`;
  const registry = buildRecordRegistry(runtimeModuleCatalog, activeModuleIds);
  const descriptor = registry.dataProviderDescriptorsByKey.get(declaration.providerKey);
  if (descriptor?.kind !== "record" || !descriptor.record) {
    throw new Error(`${route}: its page record names "${declaration.providerKey}", which is no active record Provider with declared fields.`);
  }
  // A Public page is rendered once for everybody, so it cannot be about what only one account may read.
  if (descriptor.record.audience === "viewer" && binding.descriptor.area === "public") {
    throw new Error(`${route}: a Public route cannot be about a record of audience "viewer".`);
  }
  const record: PhiRuntimeDataProviderBinding = {
    providerKey: declaration.providerKey,
    params: Object.fromEntries(Object.entries(declaration.params).map(([name, routeParam]) => [name, binding.params[routeParam] ?? ""])),
  };
  const source = await resolvePhiRecordSource({ registry, runtime, binding: record });
  if (source.status === "missing") {
    return { status: "missing" };
  }
  const fields = await resolvePhiRecordFields({ registry, runtime, binding: record });
  const text = (key: string | undefined) => readPhiPageRecordField(fields, key, ["text"])?.value.trim() || null;
  return { status: "ok", binding: record, title: text(declaration.titleField), description: text(declaration.descriptionField) };
}
