export type PhiRuntimeFormValuesSignalValue = { values: Record<string, unknown> };
export type PhiRuntimeFormFieldSignalValue = { fieldKey: string; value: unknown };
export type PhiRuntimeFormValiditySignalValue = {
  valid: boolean;
  errors: Record<string, readonly string[]>;
};
export type PhiRuntimeFormTouchedSignalValue = { fieldKeys: readonly string[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function readPhiRuntimeFormValuesSignalValue(value: unknown): PhiRuntimeFormValuesSignalValue | null {
  return isRecord(value) && isRecord(value.values) ? { values: value.values } : null;
}

export function readPhiRuntimeFormFieldSignalValue(value: unknown): PhiRuntimeFormFieldSignalValue | null {
  return isRecord(value) && typeof value.fieldKey === "string" && value.fieldKey.trim()
    ? { fieldKey: value.fieldKey, value: value.value }
    : null;
}

export function readPhiRuntimeFormValiditySignalValue(value: unknown): PhiRuntimeFormValiditySignalValue | null {
  if (!isRecord(value) || typeof value.valid !== "boolean" || !isRecord(value.errors)) {
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
  return isRecord(value) && Array.isArray(value.fieldKeys) &&
    value.fieldKeys.every((fieldKey) => typeof fieldKey === "string")
    ? { fieldKeys: value.fieldKeys }
    : null;
}
