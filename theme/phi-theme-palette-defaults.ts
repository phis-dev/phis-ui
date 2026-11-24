
import { readPhiAntdDefaultSeedToken, resolvePhiAntdAliasTokens } from "./phi-antd-token-resolver";
import { isSamePhiThemeColor } from "./phi-theme-color";
import {
  resolvePhiThemeColorTokens,
  type PhiThemeMode,
  type PhiThemePalette,
  type PhiThemePaletteMode,
  type PhiThemePresetPlugin,
} from "./phi-theme-presets";

const PHI_THEME_MODES: readonly PhiThemeMode[] = ["light", "dark"];

/** Where a palette states one colour: shared by both modes, or as a seed or an override of one. */
type PhiThemePaletteEntry =
  | { level: "seed"; key: string }
  | { level: "modeSeed" | "modeOverride"; mode: PhiThemeMode; key: string };

function listPhiThemePaletteEntries(palette: PhiThemePalette): PhiThemePaletteEntry[] {
  return [
    ...Object.keys(palette.seed ?? {}).map((key): PhiThemePaletteEntry => ({ level: "seed", key })),
    ...PHI_THEME_MODES.flatMap((mode) => [
      ...Object.keys(palette.modes?.[mode]?.seed ?? {})
        .map((key): PhiThemePaletteEntry => ({ level: "modeSeed", mode, key })),
      ...Object.keys(palette.modes?.[mode]?.overrides ?? {})
        .map((key): PhiThemePaletteEntry => ({ level: "modeOverride", mode, key })),
    ]),
  ];
}

function readPhiThemePaletteEntry(palette: PhiThemePalette, entry: PhiThemePaletteEntry) {
  if (entry.level === "seed") return palette.seed?.[entry.key];
  const mode = palette.modes?.[entry.mode];
  return entry.level === "modeSeed" ? mode?.seed?.[entry.key] : mode?.overrides?.[entry.key];
}

/** The palette without the one entry; an emptied record or mode goes with it. */
function omitPhiThemePaletteEntry(palette: PhiThemePalette, entry: PhiThemePaletteEntry): PhiThemePalette {
  const without = (record: Record<string, string> | undefined) => {
    const next = Object.fromEntries(Object.entries(record ?? {}).filter(([key]) => key !== entry.key));
    return Object.keys(next).length > 0 ? next : undefined;
  };
  if (entry.level === "seed") {
    const seed = without(palette.seed);
    const { seed: _seed, ...rest } = palette;
    return seed ? { ...rest, seed } : rest;
  }
  const current = palette.modes?.[entry.mode] ?? {};
  const part = entry.level === "modeSeed" ? "seed" : "overrides";
  const nextMode = { ...current, [part]: without(current[part]) } as PhiThemePaletteMode;
  if (nextMode[part] === undefined) delete nextMode[part];
  const modes = { ...(palette.modes ?? {}), [entry.mode]: nextMode };
  if (Object.keys(nextMode).length === 0) delete modes[entry.mode];
  const { modes: _modes, ...rest } = palette;
  return Object.keys(modes).length > 0 ? { ...rest, modes } : rest;
}

function isSamePhiThemeTokenInput(left: Record<string, string>, right: Record<string, string>) {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  return [...keys].every((key) => isSamePhiThemeColor(left[key], right[key]));
}

/**
 * Whether the palette renders the same in this mode without the entry.
 *
 * First on the token input, which is what decides the render and costs nothing to compare: a value the
 * block below states the same way, a Module palette taken over on save above all. Where the entry is the
 * only one to state its key, the input differs by that key alone, and the entry changes nothing if it is
 * what Ant Design derives in its place -- a seed equal to the default seed, a hover equal to the hover
 * the seed yields. A seed that releases derived colours the block states outright changes the input in
 * more keys than its own and stays.
 */
function phiThemePaletteEntryChangesNothing(
  preset: PhiThemePresetPlugin,
  palette: PhiThemePalette,
  candidate: PhiThemePalette,
  entry: PhiThemePaletteEntry,
  mode: PhiThemeMode,
  baseTokens: Record<string, unknown>,
) {
  const stated = resolvePhiThemeColorTokens(preset, palette, mode);
  const left = resolvePhiThemeColorTokens(preset, candidate, mode);
  if (isSamePhiThemeTokenInput(stated, left)) return true;
  const differing = [...new Set([...Object.keys(stated), ...Object.keys(left)])]
    .filter((key) => !isSamePhiThemeColor(stated[key], left[key]));
  if (differing.length !== 1 || differing[0] !== entry.key || entry.key in left) return false;
  /*
   * A seed goes into the derivation as Ant Design's default seed, which is what to compare with: the
   * alias token of the same name is a colour derived from it, and in the dark mode not the seed itself.
   */
  const defaultSeed = readPhiAntdDefaultSeedToken(entry.key);
  const inPlace = defaultSeed
    ? defaultSeed.value
    : (resolvePhiAntdAliasTokens(mode, { ...baseTokens, ...left }) as Record<string, unknown>)[entry.key];
  return isSamePhiThemeColor(stated[entry.key], inPlace);
}

/**
 * A Site's palette without the colours that change nothing over the palette block it follows.
 *
 * A palette entry is what an author decided differently from the Theme, and the Theme workspace offers
 * to hand it back ("Reset to Theme", "Reset override"). An entry with the very colour the Theme gives
 * anyway is no decision: the workspace showed a reset for it all the same, and every Site that saved a
 * Module's Theme had one under every seed, because the save takes the Module's palette over
 * (`adoptPhiThemeModulePalette`). The workspace reads ownership off this, and the save stores this, ahead
 * of the takeover, so a Module's palette is still copied in whole and a core palette is simply followed.
 *
 * Entries are taken out one by one, each against what is left, so two entries that only together equal
 * the Theme are both dropped and one that matters keeps the other where it is needed. Custom colours and
 * gradient slots are not looked at here. `baseTokens` are the non-colour tokens the render derives with.
 */
export function omitPhiThemePaletteDefaults(
  preset: PhiThemePresetPlugin,
  palette: PhiThemePalette | null | undefined,
  baseTokens: Record<string, unknown> = {},
): PhiThemePalette {
  let current: PhiThemePalette = palette ?? {};
  for (const entry of listPhiThemePaletteEntries(current)) {
    if (readPhiThemePaletteEntry(current, entry) === undefined) continue;
    const candidate = omitPhiThemePaletteEntry(current, entry);
    const modes = entry.level === "seed" ? PHI_THEME_MODES : [entry.mode];
    if (modes.every((mode) => phiThemePaletteEntryChangesNothing(preset, current, candidate, entry, mode, baseTokens))) {
      current = candidate;
    }
  }
  return current;
}
