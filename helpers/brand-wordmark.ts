import type { PhiBlockRuntime } from "../types";
import type { PhiSiteThemeBrand } from "../types/site-theme";

/**
 * What the Site is called in writing: its Wordmark, or the name it is filed under.
 *
 * Taken apart from the runtime because the Builder canvas has none. Every authoring half there is handed
 * a stub -- `previewRuntime` in `render-root-node-scaffold.tsx`, a Site called "Preview" with no Theme --
 * so a Wordmark resolved from the runtime read "Preview" on the canvas while the Logo beside it, which
 * comes from the Brand context, was the Site's own.
 */
export function resolvePhiBrandWordmarkTextFrom(
  brand: PhiSiteThemeBrand | null | undefined,
  siteName: string | null | undefined,
  siteKey: string,
) {
  const parts = brand?.wordmark?.parts;
  if (Array.isArray(parts) && parts.length > 0) {
    const text = parts
      .map((part) => (typeof part?.text === "string" ? part.text : ""))
      .join("")
      .trim();
    if (text) {
      return text;
    }
  }

  return siteName ?? siteKey;
}

export function resolvePhiBrandWordmarkText(runtime: PhiBlockRuntime) {
  return resolvePhiBrandWordmarkTextFrom(
    runtime.site.theme?.brand,
    runtime.site.name,
    runtime.site.key,
  );
}
