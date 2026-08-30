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

export type PhiThemePresetModeConfig = {
  seed?: Record<string, string>;
  overrides?: Record<string, string>;
  customColors?: Partial<PhiThemeCustomColorPalette>;
};

export type PhiThemePresetPlugin = {
  key: string;
  version: number;
  title: string;
  description?: string;
  antd: {
    seed: Record<string, string>;
    modes?: Partial<Record<PhiThemeMode, PhiThemePresetModeConfig>>;
    overrides?: Record<string, string>;
  };
  phi?: {
    customColors?: Partial<Record<PhiThemeMode, Partial<PhiThemeCustomColorPalette>>>;
  };
};

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
    antd: {
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
    antd: {
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
    antd: {
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

export function resolvePhiThemePresetTokens(
  preset: PhiThemePresetPlugin,
  mode: PhiThemeMode,
) {
  const modeConfig = preset.antd.modes?.[mode];

  return {
    ...preset.antd.seed,
    ...(modeConfig?.seed ?? {}),
    ...(preset.antd.overrides ?? {}),
    ...(modeConfig?.overrides ?? {}),
  };
}
