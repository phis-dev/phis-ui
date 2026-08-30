import type { PhiRuntimeModuleDefinition, PhiRuntimeModuleId } from "./cms-plugins";

export const PHI_DEFAULT_RUNTIME_MODULE_SOURCE_LOCALE = "en" as const;

const PHI_RUNTIME_MODULE_SOURCE_LOCALE_PATTERN = /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i;

export function isPhiRuntimeModuleSourceLocale(value: unknown): value is string {
  return typeof value === "string" && PHI_RUNTIME_MODULE_SOURCE_LOCALE_PATTERN.test(value.trim());
}

export function resolvePhiRuntimeModuleSourceLocale(
  definition: Pick<PhiRuntimeModuleDefinition, "sourceLocale">,
) {
  const sourceLocale = definition.sourceLocale?.trim();
  if (!sourceLocale) return PHI_DEFAULT_RUNTIME_MODULE_SOURCE_LOCALE;
  if (!isPhiRuntimeModuleSourceLocale(sourceLocale)) {
    throw new Error(`Invalid Runtime Module source locale "${sourceLocale}".`);
  }
  return sourceLocale.toLowerCase();
}

export function isPhiOwnedRuntimeModuleId(moduleId: PhiRuntimeModuleId) {
  return moduleId.startsWith("@phis/");
}
