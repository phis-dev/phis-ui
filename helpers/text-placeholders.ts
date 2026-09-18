import { formatPhiTranslation } from "./translation-format";
import type { PhiBlockRuntime } from "../types";

/**
 * The few facts a Site's own copy may name instead of spelling out, filled in when the page renders.
 *
 * A Preset is followed by every Site that adopts it, so a sentence in one cannot contain any Site's
 * name -- and a sentence that resolved the name while the Preset was being built kept whatever the
 * Site was called that day. The year is the same mistake with a clock attached: "© 2026" written into
 * a Widget's config is still 2026 next January.
 *
 * Deliberately a handful of names rather than a path into the runtime. Anything addressable turns Site
 * copy into a template language, with its escaping, its error cases and its reach into whatever the
 * runtime happens to carry; these three are the ones sentences actually need. A name nothing answers
 * is left standing -- `{jahr}` renders as `{jahr}`, which is how a typo gets noticed and found.
 */
export function buildPhiTextPlaceholders(runtime: PhiBlockRuntime): Record<string, string | number> {
  const placeholders: Record<string, string | number> = {
    "site.name": runtime.site.name?.trim() || runtime.site.key,
    year: new Date().getUTCFullYear(),
  };
  const host = runtime.site.hostname?.trim();
  if (host) {
    placeholders["site.host"] = host;
  }
  return placeholders;
}

/**
 * Fills them in, after whatever translation the text goes through and never before.
 *
 * A translator moves the placeholders around the sentence and is meant to -- "© {year} {site.name}"
 * reads differently in a language that puts the holder first -- so the values are bound to the text
 * that came back, not to the text that went in. It is the order the Table footer already keeps
 * (TABLES.md, "Footer"), and the reason a value is never itself translated.
 */
export function resolvePhiTextPlaceholders(text: string, runtime: PhiBlockRuntime | undefined): string {
  if (!runtime || !text.includes("{")) {
    return text;
  }
  return formatPhiTranslation(text, buildPhiTextPlaceholders(runtime));
}
