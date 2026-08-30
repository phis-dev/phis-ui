export function flattenPhiFormLabels(
  value: unknown,
  prefix = "",
): Readonly<Record<string, string>> {
  const labels: Record<string, string> = {};

  function visit(entry: unknown, path: string) {
    if (typeof entry === "string") {
      if (path) {
        labels[path] = entry;
      }
      return;
    }
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return;
    }
    for (const [key, child] of Object.entries(entry)) {
      visit(child, path ? `${path}.${key}` : key);
    }
  }

  visit(value, prefix);
  return labels;
}
