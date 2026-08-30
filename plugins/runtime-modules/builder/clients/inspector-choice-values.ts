export function readInspectorChoiceSingleValue(value: unknown, defaultValue: unknown): string | undefined {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (typeof defaultValue === "string" || typeof defaultValue === "number") {
    return String(defaultValue);
  }

  return undefined;
}

export function readInspectorChoiceMultiValue(value: unknown, defaultValue: unknown): string[] {
  const source = Array.isArray(value)
    ? value
    : Array.isArray(defaultValue)
      ? defaultValue
      : [];

  return source
    .map((entry) => (typeof entry === "string" || typeof entry === "number" ? String(entry) : null))
    .filter((entry): entry is string => entry != null && entry.length > 0);
}
