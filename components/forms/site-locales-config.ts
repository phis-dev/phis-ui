import type { PhiControlOption } from "../controls/phi-control-options";

/**
 * Where a placement puts the Site's locales for the field that offers them.
 *
 * Named once, because two sides have to agree on it and they are far apart: a Page preset writes the
 * list into the Form Widget's placement config, and the options provider reads it back out during the
 * render. A string spelled twice would be a list that is silently empty on one Site and not another.
 */
export const PHI_SITE_LOCALES_CONFIG_KEY = "availableLocales";

/**
 * The locales a placement handed over, as options a Control can draw.
 *
 * It reads what arrives rather than trusting it: the config crossed a Server/Client boundary as plain
 * JSON, and a Page that named the key but held nothing gets an empty list, not a broken select. An entry
 * with no code is no option at all, and one with no label is offered under its code -- which is what a
 * locale is called before anybody translates its name.
 */
export function readPhiSiteLocaleOptions(
  sourceConfig: Record<string, unknown> | null | undefined,
): PhiControlOption[] {
  const configured = sourceConfig?.[PHI_SITE_LOCALES_CONFIG_KEY];
  if (!Array.isArray(configured)) {
    return [];
  }

  return configured.flatMap((entry) => {
    if (!entry || typeof entry !== "object") {
      return [];
    }
    const { code, label } = entry as { code?: unknown; label?: unknown };
    if (typeof code !== "string" || !code.trim()) {
      return [];
    }
    return [{
      value: code,
      label: typeof label === "string" && label.trim() ? label : code,
    }];
  });
}
