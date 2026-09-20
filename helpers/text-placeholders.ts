import type { PhiBlockRuntime } from "../types";

const PHI_TEXT_PLACEHOLDER_PATTERN = /\{([A-Za-z][\w.]*)\}/g;
const PHI_TEXT_PLACEHOLDER_TOKEN_PATTERN = /%(\d+)/g;

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
 * What the translator gets to see, with every name taken out of its reach.
 *
 * `{year}` is a word, and a machine translator translates words: "© {year} {site.name}" comes back
 * from German as "© {Jahr} {site.name}", and `{Jahr}` is a name nothing answers. The line then renders
 * the braces instead of the year, in the one language the Site is actually read in.
 *
 * `%1` is not a word and comes back as `%1`. It is what a label set has always sent -- the same token
 * `definePhiMessageLabel` puts in a sentence -- so this is the house's existing answer applied to Site
 * copy rather than a second one invented for it.
 *
 * Every name is masked, not only the ones something answers. A typo has to survive the round trip to
 * still be a recognizable typo: masked, `{jahr}` comes back as `%2` and is put back as `{jahr}`.
 */
export function maskPhiTextPlaceholders(text: string): { text: string; names: readonly string[] } {
  if (!text.includes("{")) {
    return { text, names: [] };
  }
  const names: string[] = [];
  const masked = text.replace(PHI_TEXT_PLACEHOLDER_PATTERN, (_match, name: string) => {
    names.push(name);
    return `%${names.length}`;
  });
  return { text: masked, names };
}

/**
 * Fills them in, after whatever translation the text goes through and never before.
 *
 * A translator moves the placeholders around the sentence and is meant to -- "© {year} {site.name}"
 * reads differently in a language that puts the holder first -- so the values are bound to the text
 * that came back, not to the text that went in. It is the order the Table footer already keeps
 * (TABLES.md, "Footer"), and the reason a value is never itself translated.
 *
 * Read in one pass rather than token by token, because `%1` is the start of `%10` and a sentence with
 * ten names would have had its tenth eaten by its first.
 */
export function resolvePhiTextPlaceholders(
  text: string,
  names: readonly string[],
  runtime: PhiBlockRuntime | undefined,
): string {
  if (names.length === 0) {
    return text;
  }
  const values = runtime ? buildPhiTextPlaceholders(runtime) : {};
  return text.replace(PHI_TEXT_PLACEHOLDER_TOKEN_PATTERN, (token, digits: string) => {
    const name = names[Number(digits) - 1];
    if (name === undefined) {
      return token;
    }
    const value = values[name];
    return value === undefined ? `{${name}}` : String(value);
  });
}
