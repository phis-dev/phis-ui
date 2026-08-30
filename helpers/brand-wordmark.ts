import type { PhiBlockRuntime } from "../types";

export function resolvePhiBrandWordmarkText(runtime: PhiBlockRuntime) {
  const parts = runtime.site.theme?.brand?.wordmark?.parts;
  if (Array.isArray(parts) && parts.length > 0) {
    const text = parts
      .map((part) => (typeof part?.text === "string" ? part.text : ""))
      .join("")
      .trim();
    if (text) {
      return text;
    }
  }

  return runtime.site.name ?? runtime.site.key;
}
