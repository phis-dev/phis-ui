import type { PhiSiteTheme } from "../../types/site-config";
import {
  resolvePhiShellChromeOverlayVariables,
  type PhiShellChromeOverlayVariables,
} from "./phi-shell-chrome-overlay";
import {
  resolvePhiShellRegionBackground,
  resolvePhiShellRegionColor,
} from "../../helpers/shell-region-style";
import {
  createPhiAntdThemeCssVarKey,
  resolvePhiAntdAliasTokens,
} from "../../theme/phi-antd-token-resolver";
import {
  buildPhiComponentTokens,
  buildPhiThemeStructuralTokens,
} from "../../theme/phi-theme";
import {
  PHI_THEME_PALETTE_MODE_SEED_KEYS,
  resolvePhiThemePresetPlugin,
  resolvePhiThemeColorTokens,
  type PhiThemeMode,
  type PhiThemePresetPlugin,
} from "../../theme/phi-theme-presets";
import { assertPhiThemeVocabulary } from "../../theme/phi-theme-tokens";
import { applyPhiButtonShadowComponentTokens } from "../../theme/phi-button-shadow";
import {
  applyPhiControlShapeComponentTokens,
  applyPhiSurfaceShapeComponentTokens,
  resolvePhiControlShape,
} from "../../theme/phi-control-shape";

const PHI_DEFAULT_DARK_NAV_BACKGROUND = "#001529";

export type PhiRootThemeFonts = {
  body?: string;
  mono?: string;
  serif?: string;
  accent?: string;
  display?: string;
};

export type PhiResolvedRootTheme = {
  mode: PhiThemeMode;
  theme: {
    hashed: false;
    zeroRuntime: true;
    cssVar: {
      prefix: string;
      key: string;
    };
    token: Record<string, unknown>;
    components: Record<string, Record<string, unknown>>;
  };
};

function mergeComponentThemes(
  defaults: Record<string, Record<string, unknown>>,
  overrides: Record<string, Record<string, unknown>> | undefined,
) {
  if (!overrides) {
    return defaults;
  }

  const merged: Record<string, Record<string, unknown>> = { ...defaults };
  for (const [componentName, componentOverrides] of Object.entries(overrides)) {
    merged[componentName] = {
      ...(defaults[componentName] ?? {}),
      ...(componentOverrides ?? {}),
    };
  }
  return merged;
}

export function resolvePhiRootTheme({
  siteTheme,
  mode,
  fonts,
  presets,
}: {
  siteTheme: PhiSiteTheme;
  mode: PhiThemeMode;
  fonts: PhiRootThemeFonts;
  presets: readonly PhiThemePresetPlugin[];
}): PhiResolvedRootTheme {
  const themePreset = resolvePhiThemePresetPlugin(presets, siteTheme?.preset);
  /*
   * Colour per mode: the palette block the Site follows with the Site's own palette on top, then the
   * Site's proportions. The palette merge happens before the tokens resolve, so a shared seed the Site
   * owns is never undercut by a mode override the block declares.
   */
  assertPhiThemeVocabulary({
    styleToken: siteTheme?.style?.token,
    modeSeedKeys: PHI_THEME_PALETTE_MODE_SEED_KEYS,
    source: "The Site's own Theme",
  });
  const colorTokens = resolvePhiThemeColorTokens(themePreset, siteTheme?.palette, mode);
  const sharedTokenDefaults = buildPhiThemeStructuralTokens();
  const resolvedThemeTokens = {
    ...sharedTokenDefaults,
    ...colorTokens,
    ...(siteTheme?.style?.token ?? {}),
  } as Record<string, unknown>;
  const themeTokenInput = {
    ...resolvedThemeTokens,
    ...(fonts.body ? { fontFamily: fonts.body } : {}),
    ...(fonts.mono ? { fontFamilyCode: fonts.mono } : {}),
  };
  const effectiveThemeTokens = resolvePhiAntdAliasTokens(mode, themeTokenInput);
  const resolvedShellSiderBackground =
    resolvePhiShellRegionBackground(siteTheme?.shell, mode, { family: "sider", region: "left" }) ??
    resolvePhiShellRegionBackground(siteTheme?.shell, mode, { family: "sider", region: "right" }) ??
    (mode === "dark" ? PHI_DEFAULT_DARK_NAV_BACKGROUND : undefined);
  const resolvedShellSiderColor =
    resolvePhiShellRegionColor(siteTheme?.shell, mode, { family: "sider", region: "left" }) ??
    resolvePhiShellRegionColor(siteTheme?.shell, mode, { family: "sider", region: "right" });
  const resolvedShellHeaderMainBackground =
    resolvePhiShellRegionBackground(siteTheme?.shell, mode, { family: "header", region: "main" }) ??
    (mode === "dark" ? PHI_DEFAULT_DARK_NAV_BACKGROUND : undefined);
  const sharedComponentDefaults = buildPhiComponentTokens({
    layout: {
      ...(resolvedShellSiderBackground ? { siderBg: resolvedShellSiderBackground } : {}),
      ...(resolvedShellHeaderMainBackground ? { headerBg: resolvedShellHeaderMainBackground } : {}),
    },
    menu: {
      ...(resolvedShellSiderBackground
        ? {
            darkItemBg: resolvedShellSiderBackground,
            darkPopupBg: resolvedShellSiderBackground,
            darkSubMenuItemBg: resolvedShellSiderBackground,
          }
        : {}),
      ...(resolvedShellSiderColor
        ? {
            darkItemColor: resolvedShellSiderColor,
            darkGroupTitleColor: resolvedShellSiderColor,
            darkItemHoverColor: resolvedShellSiderColor,
          }
        : {}),
    },
  });
  const resolvedControlShape = resolvePhiControlShape(siteTheme.shape?.controls);
  const components = applyPhiSurfaceShapeComponentTokens(
    applyPhiControlShapeComponentTokens(mergeComponentThemes(
      sharedComponentDefaults,
      applyPhiButtonShadowComponentTokens(siteTheme?.components, siteTheme?.buttons, mode),
    ), resolvedControlShape, effectiveThemeTokens),
    resolvedControlShape,
    effectiveThemeTokens,
  );
  const token = {
    ...effectiveThemeTokens,
  };
  return {
    mode,
    theme: {
      /*
       * Ant Design's structure is not rendered: it comes from `styles/antd-static.css`, and only the
       * custom properties a Theme decides are rendered here. Every nested provider inherits both flags --
       * the tone scopes and the Theme workspace's, which inherits nothing else.
       *
       * Unhashed because that file is one file for development and production, and Ant Design hashes
       * its class names differently in each. The hash only ever kept two Ant Design versions on one page
       * apart, and it sat in `:where()`, so dropping it changes no specificity.
       */
      hashed: false,
      zeroRuntime: true,
      cssVar: {
        prefix: "ant",
        /*
         * Named after what the tokens are resolved from, not after the tokens: the same Theme record,
         * fonts, palette block and mode always resolve to the same tokens, and the record is a fraction
         * of their size. Hashing the resolved tokens and component tokens cost 1-2 ms per request
         * (measured 04.10.2026).
         */
        key: createPhiAntdThemeCssVarKey("root", { mode, siteTheme, fonts, preset: themePreset }),
      },
      token,
      components,
    },
  };
}

export type PhiRootThemeByMode = Record<PhiThemeMode, PhiResolvedRootTheme["theme"]>;

/**
 * What the root needs of a Theme in the browser, resolved before it gets there.
 *
 * Both modes, because the mode switch changes the page without a round trip, and the Shell Chrome
 * Overlay's custom properties, which carry both modes themselves. Everything here is plain data, so the
 * Server resolves it for the page and the live provider only picks a mode. The resolution itself --
 * this file, the Shell region styles, the Overlay, the component token builders -- is fetched by the
 * browser only when a Theme draft arrives live from the Builder.
 */
export type PhiRootThemeState = {
  themes: PhiRootThemeByMode;
  chromeOverlayVariables: PhiShellChromeOverlayVariables;
};

/*
 * Resolved states, by what they are resolved from.
 *
 * Every page resolves the Site's Theme for both modes, and for a Theme that has not changed the answer
 * is the same every time: about 3-4 ms of derivation per request for nothing (measured 04.10.2026). The
 * key is the content -- Theme record, fonts, the palette block it follows -- so a changed Theme is a new
 * key, and nothing here has to be told about a publish or can go stale; it holds per process and needs
 * no coordination between processes. A Site has one published Theme, and drafts from the Builder are
 * resolved in the browser, so a handful of entries is all this ever holds; the bound only keeps it so.
 */
const PHI_ROOT_THEME_STATE_LIMIT = 16;
const rootThemeStates = new Map<string, PhiRootThemeState>();

function freezeDeep<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const entry of Object.values(value)) freezeDeep(entry);
  }
  return value;
}

/** Forget every resolved state. For tests. */
export function clearPhiRootThemeStates() {
  rootThemeStates.clear();
}

export function resolvePhiRootThemeState(input: {
  siteTheme: PhiSiteTheme;
  fonts: PhiRootThemeFonts;
  presets: readonly PhiThemePresetPlugin[];
}): PhiRootThemeState {
  const key = createPhiAntdThemeCssVarKey("state", {
    siteTheme: input.siteTheme,
    fonts: input.fonts,
    preset: resolvePhiThemePresetPlugin(input.presets, input.siteTheme?.preset),
  });
  const known = rootThemeStates.get(key);
  if (known) {
    // Read last, evicted last.
    rootThemeStates.delete(key);
    rootThemeStates.set(key, known);
    return known;
  }

  /*
   * Frozen, because every page that resolves this Theme is handed the same object: a reader that
   * wrote into it would be writing into every other page's Theme.
   */
  const state = freezeDeep<PhiRootThemeState>({
    themes: {
      light: resolvePhiRootTheme({ ...input, mode: "light" }).theme,
      dark: resolvePhiRootTheme({ ...input, mode: "dark" }).theme,
    },
    chromeOverlayVariables: resolvePhiShellChromeOverlayVariables(input.siteTheme.root),
  });
  rootThemeStates.set(key, state);
  if (rootThemeStates.size > PHI_ROOT_THEME_STATE_LIMIT) {
    rootThemeStates.delete(rootThemeStates.keys().next().value!);
  }
  return state;
}
