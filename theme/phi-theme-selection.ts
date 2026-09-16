import type { PhiControlOption } from "../components/controls/phi-control-options";
import { PHI_CORE_THEME_SET_KEY, PHI_CORE_THEME_SETS, type PhiThemeSetBlock } from "./phi-theme-blocks";
import { PHI_DEFAULT_THEME_PRESET_KEY } from "./phi-theme-presets";

const PHI_SITE_THEME_SELECTION_PREFIX = "site:";

/**
 * The two Site entries of the Theme workspace's Set select: what the Site shows, and what is being
 * worked on. They are not revisions to browse -- the revisions have their own view -- but the two
 * states a Theme is always in, each one pick away.
 */
export type PhiSiteThemeSelectionState = "published" | "draft";

export function createPhiSiteThemeSelectionValue(siteKey: string, state: PhiSiteThemeSelectionState) {
  const normalizedSiteKey = siteKey.trim();
  if (!normalizedSiteKey) {
    throw new Error("Site theme selection requires a site key.");
  }
  return `${PHI_SITE_THEME_SELECTION_PREFIX}${normalizedSiteKey}:${state}`;
}

export function readPhiSiteThemeSelectionState(value: string, siteKey: string): PhiSiteThemeSelectionState | null {
  if (value === createPhiSiteThemeSelectionValue(siteKey, "published")) return "published";
  if (value === createPhiSiteThemeSelectionValue(siteKey, "draft")) return "draft";
  return null;
}

/**
 * The entry a Theme that is not trying on a Set stands at: the draft while there is one, the published
 * Theme otherwise, and the core Set for a Site that has neither.
 */
export function resolvePhiThemeSelectionValue(
  siteKey: string,
  available: { published: boolean; draft: boolean },
) {
  if (available.draft) {
    return createPhiSiteThemeSelectionValue(siteKey, "draft");
  }
  if (available.published) {
    return createPhiSiteThemeSelectionValue(siteKey, "published");
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

export const PHI_THEME_SELECT_SITE_GROUP = "Site";
export const PHI_THEME_SELECT_SETS_GROUP = "Sets";

/**
 * The Published and the Draft entry, the Set each was derived from in its description.
 *
 * Both are always listed, so the select keeps its shape; one that does not exist is disabled and says
 * why. A draft exists once somebody saved one or changed the Theme away from what is published.
 */
export function buildPhiSiteThemeSelectOptions({
  siteKey,
  published,
  draft,
}: {
  siteKey: string;
  published: {
    theme: { derivedFrom?: unknown } | null | undefined;
    revisionId: number | null;
  } | null;
  draft: {
    theme: { derivedFrom?: unknown } | null | undefined;
    revisionId: number | null;
  } | null;
}): PhiControlOption[] {
  const describe = (entry: { theme: { derivedFrom?: unknown } | null | undefined; revisionId: number | null }, unsaved: string) =>
    `${entry.revisionId != null ? `Revision #${entry.revisionId}` : unsaved} · Derived from ${resolvePhiThemeDerivation(entry.theme).set.title}`;

  return [
    {
      value: createPhiSiteThemeSelectionValue(siteKey, "published"),
      label: "Published",
      group: PHI_THEME_SELECT_SITE_GROUP,
      ...(published
        ? { description: describe(published, "Published") }
        : { disabled: true, description: "Not published yet" }),
    },
    {
      value: createPhiSiteThemeSelectionValue(siteKey, "draft"),
      label: "Draft",
      group: PHI_THEME_SELECT_SITE_GROUP,
      ...(draft
        ? { description: describe(draft, "Unsaved") }
        : { disabled: true, description: "No changes to the published Theme" }),
    },
  ];
}
