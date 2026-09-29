import { isPhiRecord } from "../../helpers/is-record";

export type PhiRuntimeFormValuesSignalValue = { values: Record<string, unknown> };
export type PhiRuntimeFormFieldSignalValue = { fieldKey: string; value: unknown };
export type PhiRuntimeFormValiditySignalValue = {
  valid: boolean;
  errors: Record<string, readonly string[]>;
};
export type PhiRuntimeFormTouchedSignalValue = { fieldKeys: readonly string[] };

export function readPhiRuntimeFormValuesSignalValue(value: unknown): PhiRuntimeFormValuesSignalValue | null {
  return isPhiRecord(value) && isPhiRecord(value.values) ? { values: value.values } : null;
}

export function readPhiRuntimeFormFieldSignalValue(value: unknown): PhiRuntimeFormFieldSignalValue | null {
  return isPhiRecord(value) && typeof value.fieldKey === "string" && value.fieldKey.trim()
    ? { fieldKey: value.fieldKey, value: value.value }
    : null;
}

export function readPhiRuntimeFormValiditySignalValue(value: unknown): PhiRuntimeFormValiditySignalValue | null {
  if (!isPhiRecord(value) || typeof value.valid !== "boolean" || !isPhiRecord(value.errors)) {
    return null;
  }
  const errors = Object.fromEntries(
    Object.entries(value.errors).flatMap(([key, messages]) =>
      Array.isArray(messages) && messages.every((message) => typeof message === "string")
        ? [[key, messages as string[]]]
        : []),
  );
  return { valid: value.valid, errors };
}

export function readPhiRuntimeFormTouchedSignalValue(value: unknown): PhiRuntimeFormTouchedSignalValue | null {
  return isPhiRecord(value) && Array.isArray(value.fieldKeys) &&
    value.fieldKeys.every((fieldKey) => typeof fieldKey === "string")
    ? { fieldKeys: value.fieldKeys }
    : null;
}
