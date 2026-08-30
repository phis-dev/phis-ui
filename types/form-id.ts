import { PHI_SHARED_PACKAGE_NAME } from "../constants/package";
import { createPhiModuleScopedKey } from "../constants/runtime-module-ownership";
export type PhiFormId = `${string}/forms/${string}`;

export function normalizePhiFormId(value: string) {
  return value.trim().toLowerCase();
}

export function isPhiFormId(value: string): value is PhiFormId {
  const normalized = normalizePhiFormId(value);
  const markerIndex = normalized.indexOf("/forms/");
  if (markerIndex <= 0 || markerIndex === normalized.length - "/forms/".length) {
    return false;
  }
  const packageName = normalized.slice(0, markerIndex);
  const formKey = normalized.slice(markerIndex + "/forms/".length);
  return /^@[^/]+\/[^/]+(?:\/modules\/[a-z0-9][a-z0-9-]*)?$/.test(packageName) &&
    /^[a-z0-9][a-z0-9._-]*(?:\/[a-z0-9][a-z0-9._-]*)*$/.test(formKey);
}

export function readPhiFormPackageName(value: PhiFormId) {
  return value.slice(0, value.indexOf("/forms/"));
}

export function createPhiFormId(packageName: string, formKey: string): PhiFormId {
  // A first-party Form is namespaced by the module that owns it; a foreign package composes its own.
  const raw = packageName === PHI_SHARED_PACKAGE_NAME
    ? createPhiModuleScopedKey("forms", formKey)
    : `${packageName}/forms/${formKey}`;
  const formId = normalizePhiFormId(raw);
  if (!isPhiFormId(formId)) {
    throw new Error(`Invalid namespaced Form id "${formId}".`);
  }
  return formId;
}
