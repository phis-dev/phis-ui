export type PhiThemeMode = "light" | "dark";
export type PhiThemeCustomColorKey =
  | "custom1"
  | "custom2"
  | "custom3"
  | "custom4"
  | "custom5"
  | "custom6"
  | "custom7"
  | "custom8"
  | "custom9"
  | "custom10";
export type PhiThemeCustomColorPalette = Record<PhiThemeCustomColorKey, string>;

/**
 * One mode of a palette: the seeds that define it, explicit colour tokens that are not seeds, and the
 * ten custom colours.
 *
 * `seed` carries what Ant Design derives the mode from -- in practice `colorTextBase` and `colorBgBase`,
 * the two seeds that have no value valid in both modes. `overrides` carries colour tokens an author or
 * a palette states outright instead of letting the algorithm derive them, a hover or a container
 * background; they belong to a mode for the same reason the base seeds do.
 */
export type PhiThemePaletteMode = {
  seed?: Record<string, string>;
  overrides?: Record<string, string>;
  customColors?: Partial<PhiThemeCustomColorPalette>;
};

/**
 * A palette: the colour of a Theme, in the one shape a Module ships it in and a Site owns it in.
 *
 * `seed` holds the seeds both modes share -- brand, status and link colours -- and `modes` what differs
 * between them. The same shape sits on a palette block (`PhiThemePresetPlugin.palette`) and on the Site
 * record (`theme.palette`), which is what lets a Site take a Module's palette over by copying it, and
 * lets an author's change be one more palette merged on top rather than a second vocabulary.
 */
export type PhiThemePalette = {
  seed?: Record<string, string>;
  modes?: Partial<Record<PhiThemeMode, PhiThemePaletteMode>>;
};

export type PhiThemePresetPlugin = {
  key: string;
  version: number;
  title: string;
  description?: string;
  palette: PhiThemePalette;
};

/**
 * The seeds that belong to a mode rather than to the palette as a whole.
 *
 * Stated once, because two sides read it: a palette states these under `modes`, and the workspace
 * writes an author's change to them under the mode being edited. Every other colour seed is shared,
 * because Ant Design derives its light and dark variants from the one value.
 */
export const PHI_THEME_PALETTE_MODE_SEED_KEYS = ["colorTextBase", "colorBgBase"] as const;

export function isPhiThemePaletteModeSeedKey(key: string) {
  return (PHI_THEME_PALETTE_MODE_SEED_KEYS as readonly string[]).includes(key);
}

export const PHI_DEFAULT_THEME_PRESET_KEY = "phi";
export const PHI_DEFAULT_THEME_PRESET_VERSION = 1;
export const PHI_THEME_CUSTOM_COLOR_KEYS = [
  "custom1",
  "custom2",
  "custom3",
  "custom4",
  "custom5",
  "custom6",
  "custom7",
  "custom8",
  "custom9",
  "custom10",
] as const satisfies readonly PhiThemeCustomColorKey[];

export const PHI_CORE_THEME_PRESET_PLUGINS = [
  {
    key: "phi",
    version: 1,
    title: "Phi",
    description: "Warm orange brand color with a deep blue text base.",
    palette: {
      seed: {
        colorPrimary: "#E05A2A",
        colorInfo: "#7088BA",
        colorSuccess: "#4D8F6B",
        colorWarning: "#D99A2B",
        colorError: "#C94A3A",
        colorLink: "#7088BA",
      },
      modes: {
        light: {
          seed: {
            colorTextBase: "#223A61",
            colorBgBase: "#ffffff",
          },
        },
        dark: {
          seed: {
            colorTextBase: "#DCE7F8",
            colorBgBase: "#050914",
          },
        },
      },
    },
  },
  {
    key: "forest",
    version: 1,
    title: "Forest",
    description: "Evergreen brand tones with moss, fern and amber accents.",
    palette: {
      seed: {
        colorPrimary: "#2F6F4E",
        colorInfo: "#3F7C72",
        colorSuccess: "#4F8A3B",
        colorWarning: "#B8872B",
        colorError: "#A94632",
        colorLink: "#2E7D63",
      },
      modes: {
        light: {
          seed: {
            colorTextBase: "#183326",
            colorBgBase: "#FBFCF6",
          },
        },
        dark: {
          seed: {
            colorTextBase: "#DCEBDE",
            colorBgBase: "#07110C",
          },
        },
      },
    },
  },
  {
    key: "sea",
    version: 1,
    title: "Sea",
    description: "Clear ocean blue with teal depth and coral contrast.",
    palette: {
      seed: {
        colorPrimary: "#0A7EA4",
        colorInfo: "#2B8FBF",
        colorSuccess: "#2E9D8F",
        colorWarning: "#D69435",
        colorError: "#D85C4A",
        colorLink: "#087EA4",
      },
      modes: {
        light: {
          seed: {
            colorTextBase: "#12324A",
            colorBgBase: "#F7FCFF",
          },
        },
        dark: {
          seed: {
            colorTextBase: "#D8EDF6",
            colorBgBase: "#04101A",
          },
        },
      },
    },
  },
] as const satisfies readonly PhiThemePresetPlugin[];

export function resolvePhiThemePresetPlugin(
  plugins: readonly PhiThemePresetPlugin[],
  key?: string | null,
) {
  const normalizedKey = key?.trim() || PHI_DEFAULT_THEME_PRESET_KEY;
  const resolved = plugins.find((plugin) => plugin.key === normalizedKey);
  if (!resolved) {
    throw new Error(`Theme preset "${normalizedKey}" is not available from the active runtime modules.`);
  }
  return resolved;
}

function mergePhiThemePaletteModes(
  base: PhiThemePaletteMode | undefined,
  own: PhiThemePaletteMode | undefined,
): PhiThemePaletteMode | undefined {
  if (!base && !own) return undefined;
  return {
    ...(base?.seed || own?.seed ? { seed: { ...(base?.seed ?? {}), ...(own?.seed ?? {}) } } : {}),
    ...(base?.overrides || own?.overrides
      ? { overrides: { ...(base?.overrides ?? {}), ...(own?.overrides ?? {}) } }
      : {}),
    ...(base?.customColors || own?.customColors
      ? { customColors: { ...(base?.customColors ?? {}), ...(own?.customColors ?? {}) } }
      : {}),
  };
}

/**
 * One palette laid over another, field by field.
 *
 * This is the whole authoring model for colour: the block a Site follows is the base, what the Site
 * owns -- a palette it took over from a Module, or the seeds its author changed -- lies on top. A key
 * the upper palette states wins; everything else shows through. Merging before resolving is what keeps
 * a Site's shared seed from being undercut by a mode override the block declares.
 */
export function mergePhiThemePalettes(
  base: PhiThemePalette | null | undefined,
  own: PhiThemePalette | null | undefined,
): PhiThemePalette {
  const modes: Partial<Record<PhiThemeMode, PhiThemePaletteMode>> = {};
  for (const mode of ["light", "dark"] as const) {
    const merged = mergePhiThemePaletteModes(base?.modes?.[mode], own?.modes?.[mode]);
    if (merged) modes[mode] = merged;
  }
  return {
    ...(base?.seed || own?.seed ? { seed: { ...(base?.seed ?? {}), ...(own?.seed ?? {}) } } : {}),
    ...(Object.keys(modes).length > 0 ? { modes } : {}),
  };
}

/** The Ant Design token input one palette contributes in one mode: shared seeds, mode seeds, mode overrides. */
export function resolvePhiThemePaletteTokens(
  palette: PhiThemePalette | null | undefined,
  mode: PhiThemeMode,
): Record<string, string> {
  const modeConfig = palette?.modes?.[mode];
  return {
    ...(palette?.seed ?? {}),
    ...(modeConfig?.seed ?? {}),
    ...(modeConfig?.overrides ?? {}),
  };
}

/**
 * The token input of a Site in one mode: the palette block it follows, with the Site's own palette on
 * top. Every colour consumer -- root layout, server snapshot, workspace preview -- resolves through this
 * one function so the two can never disagree.
 */
export function resolvePhiThemeColorTokens(
  preset: PhiThemePresetPlugin,
  sitePalette: PhiThemePalette | null | undefined,
  mode: PhiThemeMode,
) {
  return resolvePhiThemePaletteTokens(mergePhiThemePalettes(preset.palette, sitePalette), mode);
}
