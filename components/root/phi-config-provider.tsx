"use client";

import {
  ConfigProvider as AntdConfigProvider,
  theme as antdTheme,
  type ConfigProviderProps,
  type ThemeConfig,
} from "antd";
import type { GlobalToken } from "antd/es/theme/interface";
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
import {
  PHI_CORE_THEME_BLOCK_CATALOG,
  type PhiThemeBlockCatalog,
} from "../../theme/phi-theme-composition";
import type { PhiRootThemeFonts } from "./phi-root-theme-resolver";
import {
  buildPhiControlShapeCssVars,
  type PhiControlShape,
} from "../../theme/phi-control-shape";

export type PhiConfig = {
  customColors: PhiThemeCustomColorPalette;
  fonts: PhiRootThemeFonts;
  layout: {
    heroHeight: number | string;
  };
  mode: PhiThemeMode;
  controlShape: PhiControlShape;
  presets: readonly PhiThemePresetPlugin[];
  /**
   * The Theme blocks available here: the core ones plus whatever the active Modules contribute.
   * Palettes are `presets`, which is the field they have always been shipped in.
   */
  themeBlocks: PhiThemeBlockCatalog;
  token: GlobalToken;
};

const PhiConfigContext = createContext<PhiConfig | null>(null);

function PhiConfigValueProvider({
  children,
  customColors,
  fonts,
  heroHeight,
  mode,
  controlShape,
  presets,
  themeBlocks,
  rootClassName,
  rootStyle,
  remRootValue,
  themeCssVarKey,
}: {
  children: ReactNode;
  customColors: PhiThemeCustomColorPalette;
  fonts: PhiRootThemeFonts;
  heroHeight: number | string;
  mode: PhiThemeMode;
  controlShape: PhiControlShape;
  presets: readonly PhiThemePresetPlugin[];
  themeBlocks?: Partial<Omit<PhiThemeBlockCatalog, "palettes">>;
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
    () => buildPhiControlShapeCssVars(controlShape, token as unknown as Record<string, unknown>),
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
  const blockCatalog = useMemo<PhiThemeBlockCatalog>(() => ({
    ...PHI_CORE_THEME_BLOCK_CATALOG,
    ...themeBlocks,
    palettes: presets,
  }), [presets, themeBlocks]);
  const value = useMemo<PhiConfig>(() => ({
    customColors,
    fonts,
    layout: { heroHeight },
    mode,
    controlShape,
    presets,
    themeBlocks: blockCatalog,
    token,
  }), [blockCatalog, controlShape, customColors, fonts, heroHeight, mode, presets, token]);

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
  mode,
  theme,
  presets,
  themeBlocks,
  customColors,
  rootClassName,
  rootStyle,
  remRootValue,
  controlShape,
}: {
  children: ReactNode;
  locale: ConfigProviderProps["locale"];
  fonts: PhiRootThemeFonts;
  mode: PhiThemeMode;
  theme: ThemeConfig;
  presets: readonly PhiThemePresetPlugin[];
  themeBlocks?: Partial<Omit<PhiThemeBlockCatalog, "palettes">>;
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
        heroHeight={heroHeight}
        mode={mode}
        controlShape={controlShape}
        presets={presets}
        themeBlocks={themeBlocks}
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
