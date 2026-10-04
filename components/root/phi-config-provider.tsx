"use client";

import {
  ConfigProvider as AntdConfigProvider,
  theme as antdTheme,
  type ConfigProviderProps,
  type ThemeConfig,
} from "antd";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type CSSProperties,
  type ReactNode,
} from "react";

import type {
  PhiThemeCustomColorPalette,
  PhiThemeMode,
  PhiThemePresetPlugin,
} from "../../theme/phi-theme-presets";
import type { PhiThemeTokens } from "../../theme/phi-theme-tokens";
import type { PhiRootThemeFonts } from "./phi-root-theme-resolver";
import {
  buildPhiControlShapeCssVars,
  PHI_SURFACE_SHAPE_CSS_VAR,
  resolvePhiSurfaceShapeRadius,
  type PhiControlShape,
} from "../../theme/phi-control-shape";

export type PhiConfig = {
  customColors: PhiThemeCustomColorPalette;
  fonts: PhiRootThemeFonts;
  /**
   * The families a Theme may name: the ones this package declares plus what the installed Modules
   * contributed. The stacks above are what a page renders with; this is what an author may choose.
   *
   * The variable comes along because a family name alone does not render: `next/font` hosts a face
   * under a generated name and the variable is what points at it, so a field that wants to show a
   * family in its own face has to ask for the variable.
   */
  fontFamilies: readonly PhiFontCatalogueFamily[];
  layout: {
    heroHeight: number | string;
  };
  mode: PhiThemeMode;
  controlShape: PhiControlShape;
  presets: readonly PhiThemePresetPlugin[];
  /**
   * The resolved Theme, in the names this house has stated (`theme/phi-theme-tokens.ts`).
   *
   * Ant Design computes the values and the whole of its `GlobalToken` is what arrives here, but what
   * a Client Component may read is the stated list -- so a name nobody declared fails to compile at
   * the reader rather than quietly working until the day the Theme is computed by something else.
   */
  token: PhiThemeTokens;
};

export type PhiFontCatalogueFamily = { family: string; cssVariable: string };

const PhiConfigContext = createContext<PhiConfig | null>(null);

function PhiConfigValueProvider({
  children,
  customColors,
  fonts,
  fontFamilies,
  heroHeight,
  mode,
  controlShape,
  presets,
  rootClassName,
  rootStyle,
  remRootValue,
  themeCssVarKey,
}: {
  children: ReactNode;
  customColors: PhiThemeCustomColorPalette;
  fonts: PhiRootThemeFonts;
  fontFamilies: readonly PhiFontCatalogueFamily[];
  heroHeight: number | string;
  mode: PhiThemeMode;
  controlShape: PhiControlShape;
  presets: readonly PhiThemePresetPlugin[];
  rootClassName: string;
  rootStyle: CSSProperties & Record<`--${string}`, string>;
  remRootValue: number;
  themeCssVarKey: string;
}) {
  const { token, cssVar } = antdTheme.useToken();
  /*
   * The shape's small and large radii ride on the root element as custom properties that
   * `styles/control-shape.css` reads. They are resolved from the LIVE tokens, so a Style tab edit moves
   * them the same request the numeric scale moves.
   */
  const controlShapeVars = useMemo(
    () => ({
      ...buildPhiControlShapeCssVars(controlShape, token as unknown as Record<string, unknown>),
      /*
       * The Table's corner rides along rather than living in the map above: that map is what
       * `styles/control-shape.css` reads, and this one is read by a CSS Module beside the Control it
       * belongs to. Same element, same source, different reader.
       */
      [PHI_SURFACE_SHAPE_CSS_VAR]: `${resolvePhiSurfaceShapeRadius(
        controlShape,
        token as unknown as Record<string, unknown>,
      )}px`,
    }),
    [controlShape, token],
  );
  /*
   * antd renders Modals, Drawers, and every popup into a portal on `document.body`, outside this
   * element, so a Control inside one would not inherit the properties above. Mirroring them onto the
   * document element covers those subtrees. It runs in an effect rather than during render because a
   * portal only exists after mount, so there is nothing to miss and nothing to hydrate.
   */
  useEffect(() => {
    const root = document.documentElement;
    for (const [property, propertyValue] of Object.entries(controlShapeVars)) {
      root.style.setProperty(property, propertyValue);
    }
    return () => {
      for (const property of Object.keys(controlShapeVars)) {
        root.style.removeProperty(property);
      }
    };
  }, [controlShapeVars]);
  const value = useMemo<PhiConfig>(() => ({
    customColors,
    fonts,
    fontFamilies,
    layout: { heroHeight },
    mode,
    controlShape,
    presets,
    token,
  }), [controlShape, customColors, fonts, fontFamilies, heroHeight, mode, presets, token]);

  return (
    <PhiConfigContext.Provider value={value}>
      <div
        className={[themeCssVarKey, rootClassName].filter(Boolean).join(" ")}
        style={{
          ...rootStyle,
          ...controlShapeVars,
          fontSize: cssVar.fontSize as CSSProperties["fontSize"],
        }}
        data-phi-root-layout="true"
        data-phi-control-shape={controlShape}
        data-phi-theme-mode={mode}
        data-phi-rem-root-value={remRootValue}
      >
        {children}
      </div>
    </PhiConfigContext.Provider>
  );
}

export function PhiConfigProvider({
  children,
  locale,
  fonts,
  fontFamilies,
  mode,
  theme,
  presets,
  customColors,
  rootClassName,
  rootStyle,
  remRootValue,
  controlShape,
}: {
  children: ReactNode;
  locale: ConfigProviderProps["locale"];
  fonts: PhiRootThemeFonts;
  fontFamilies: readonly PhiFontCatalogueFamily[];
  mode: PhiThemeMode;
  theme: ThemeConfig;
  presets: readonly PhiThemePresetPlugin[];
  customColors: PhiThemeCustomColorPalette;
  rootClassName: string;
  rootStyle: CSSProperties & Record<`--${string}`, string>;
  remRootValue: number;
  controlShape: PhiControlShape;
}) {
  const rawHeroHeight = (theme.token as Record<string, unknown> | undefined)?.heroHeight;
  const heroHeight =
    typeof rawHeroHeight === "number" || typeof rawHeroHeight === "string"
      ? rawHeroHeight
      : 377;
  const themeCssVarKey =
    theme.cssVar && typeof theme.cssVar === "object" && typeof theme.cssVar.key === "string"
      ? theme.cssVar.key
      : "";

  return (
    <AntdConfigProvider locale={locale} theme={theme}>
      <PhiConfigValueProvider
        customColors={customColors}
        fonts={fonts}
        fontFamilies={fontFamilies}
        heroHeight={heroHeight}
        mode={mode}
        controlShape={controlShape}
        presets={presets}
        rootClassName={rootClassName}
        rootStyle={rootStyle}
        remRootValue={remRootValue}
        themeCssVarKey={themeCssVarKey}
      >
        {children}
      </PhiConfigValueProvider>
    </AntdConfigProvider>
  );
}

export function usePhiConfig() {
  const config = useContext(PhiConfigContext);
  if (!config) {
    throw new Error("PhiConfigProvider is missing from the application Root Layout.");
  }
  return config;
}

/** The locale the root adapter configures Ant Design with, for whoever hands it on. */
export type PhiConfigLocale = ConfigProviderProps["locale"];

/**
 * The page's config in another mode: Ant Design's Theme for `mode` and the house config with that mode's
 * colours and tokens.
 *
 * What a tone scope puts around a Surface's content (`components/surface/phi-surface-tone-scope.tsx`).
 * The Theme's variables are written under `cssVarKey` -- the class of the box that asked -- so the box's
 * own paint follows as well. Unlike the root it draws no element and mirrors nothing onto the document:
 * the shape is the page's.
 */
export function PhiNestedModeConfigProvider({
  mode,
  theme,
  cssVarKey,
  locale,
  customColors,
  children,
}: {
  mode: PhiThemeMode;
  theme: ThemeConfig;
  cssVarKey: string;
  locale: PhiConfigLocale;
  customColors: PhiThemeCustomColorPalette;
  children: ReactNode;
}) {
  const keyedTheme = useMemo<ThemeConfig>(
    () => ({
      ...theme,
      cssVar: { ...(typeof theme.cssVar === "object" ? theme.cssVar : {}), key: cssVarKey },
    }),
    [cssVarKey, theme],
  );
  return (
    <AntdConfigProvider locale={locale} theme={keyedTheme}>
      <PhiNestedModeConfigValue mode={mode} customColors={customColors}>
        {children}
      </PhiNestedModeConfigValue>
    </AntdConfigProvider>
  );
}

function PhiNestedModeConfigValue({
  mode,
  customColors,
  children,
}: {
  mode: PhiThemeMode;
  customColors: PhiThemeCustomColorPalette;
  children: ReactNode;
}) {
  const outer = usePhiConfig();
  const { token } = antdTheme.useToken();
  const value = useMemo<PhiConfig>(
    () => ({ ...outer, mode, customColors, token }),
    [customColors, mode, outer, token],
  );
  return <PhiConfigContext.Provider value={value}>{children}</PhiConfigContext.Provider>;
}
