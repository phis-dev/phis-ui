import type { PhiControlOption } from "../components/controls/phi-control-options";
import { PHI_CORE_THEME_SET_KEY, PHI_CORE_THEME_SETS, type PhiThemeSetBlock } from "./phi-theme-blocks";
import { PHI_DEFAULT_THEME_PRESET_KEY } from "./phi-theme-presets";

const PHI_SITE_THEME_SELECTION_PREFIX = "site:";

export function createPhiSiteThemeSelectionValue(siteKey: string) {
  const normalizedSiteKey = siteKey.trim();
  if (!normalizedSiteKey) {
    throw new Error("Site theme selection requires a site key.");
  }
  return `${PHI_SITE_THEME_SELECTION_PREFIX}${normalizedSiteKey}`;
}

export function isPhiSiteThemeSelectionValue(value: string, siteKey: string) {
  return value === createPhiSiteThemeSelectionValue(siteKey);
}

export function resolvePhiThemeSelectionValue(
  siteKey: string,
  hasSiteThemeRevision: boolean,
) {
  if (hasSiteThemeRevision) {
    return createPhiSiteThemeSelectionValue(siteKey);
  }
  return PHI_DEFAULT_THEME_PRESET_KEY;
}

/**
 * The Set a Theme was derived from, as a record and not as a pointer.
 *
 * `blocks.set` already names a Set, but it is live: the composition resolves every part nobody picked
 * against it, so writing one into a Theme from before the Sets would repaint that Theme. This record
 * is never read by the composition. It only says where the Theme came from, so the Site Theme entry
 * can name it -- including a Set whose Module has since been switched off, which is why the title is
 * kept with the key.
 *
 * It is written once, on the first draft, and rewritten whenever somebody picks a Set. Choosing a
 * palette, a style or a ground on top leaves it alone: the Theme is still derived from that Set.
 */
export type PhiThemeDerivation = {
  set: {
    key: string;
    version: number;
    title: string;
  };
};

export function createPhiThemeDerivation(set: Pick<PhiThemeSetBlock, "key" | "version" | "title">): PhiThemeDerivation {
  return { set: { key: set.key, version: set.version, title: set.title } };
}

function readPhiThemeDerivation(value: unknown): PhiThemeDerivation | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const set = (value as { set?: unknown }).set;
  if (!set || typeof set !== "object" || Array.isArray(set)) {
    return null;
  }
  const { key, version, title } = set as { key?: unknown; version?: unknown; title?: unknown };
  if (
    typeof key !== "string" || !key.trim() ||
    typeof title !== "string" || !title.trim() ||
    typeof version !== "number" || !Number.isInteger(version) || version <= 0
  ) {
    return null;
  }
  return { set: { key: key.trim(), version, title: title.trim() } };
}

/**
 * The derivation a Theme states, or the core Set for a Theme that states none.
 *
 * A Theme from before the Sets has no record until its first draft writes one, and that draft writes
 * the core Set; naming the core Set here says the same thing ahead of time.
 */
export function resolvePhiThemeDerivation(theme: { derivedFrom?: unknown } | null | undefined): PhiThemeDerivation {
  const stated = readPhiThemeDerivation(theme?.derivedFrom);
  if (stated) {
    return stated;
  }
  const core = PHI_CORE_THEME_SETS.find((set) => set.key === PHI_CORE_THEME_SET_KEY);
  if (!core) {
    throw new Error(`Theme set "${PHI_CORE_THEME_SET_KEY}" is missing from the core sets.`);
  }
  return createPhiThemeDerivation(core);
}

export function ensurePhiThemeDerivation<T extends { derivedFrom?: PhiThemeDerivation | null }>(theme: T): T {
  if (readPhiThemeDerivation(theme.derivedFrom)) {
    return theme;
  }
  return { ...theme, derivedFrom: resolvePhiThemeDerivation(null) };
}

/**
 * The Site Theme entry of the Theme workspace's Set select: the stored Theme, with the Set it was
 * derived from in its description.
 */
export function buildPhiSiteThemeSelectOption({
  siteKey,
  siteName,
  theme,
}: {
  siteKey: string;
  siteName: string | null | undefined;
  theme: { derivedFrom?: unknown } | null | undefined;
}): PhiControlOption {
  return {
    value: createPhiSiteThemeSelectionValue(siteKey),
    label: siteName?.trim() || siteKey,
    description: `Derived from ${resolvePhiThemeDerivation(theme).set.title}`,
  };
}
