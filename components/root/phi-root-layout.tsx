import type { ReactNode } from "react";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import AntdApp from "antd/es/app";
import "antd/dist/reset.css";
import "../../styles/root.css";
import "../../styles/layout.css";
import "../../styles/control-shape.css";

import { getResolvedSiteConfig } from "../../gateway/site-config";
import type { PhiSiteConfig } from "../../gateway/site-config";
import { loadPhiAntdLocale } from "../../helpers/antd-locale";
import type { PhiResolvedLocale } from "../../helpers/site-locale-config";
import { PhiDayjsLocale } from "./phi-dayjs-locale";
import { PhiRootRemProvider } from "./phi-root-rem-provider";
import { PhiRootLiveThemeProvider } from "./phi-root-live-theme-provider";
import { PhiSignalRuntimePartitionProvider } from "../runtime/runtime-signal-partition";
import { PhiCoreRuntimeApplicationAdapter } from "../runtime/core-runtime-application-adapter";
import {
  PHI_CORE_THEME_PRESET_PLUGINS,
  type PhiThemeMode,
  type PhiThemePresetPlugin,
} from "../../theme/phi-theme-presets";
import { resolvePhiPublishedRootTheme } from "../../theme/phi-published-root-style";
import { resolvePhiSiteThemeFonts } from "../../theme/phi-theme-fonts.server";
import {
  PHI_FONT_CATALOGUE_CLASS_NAME,
  PHI_FONT_CATALOGUE_FAMILY_VARIABLES,
} from "../../theme/phi-font-catalogue";
import {
  PHI_DEFAULT_THEME_MODE_PREFERENCE,
  resolvePhiThemeMode,
  type PhiThemeModePreference,
} from "../../theme/phi-theme-mode";
import { PHI_CORE_THEME_BLOCK_CATALOG, type PhiThemeBlockCatalog } from "../../theme/phi-theme-composition";
import { resolvePhiThemeRuntimePayload } from "../../theme/phi-theme-runtime";
import { projectPhiSiteThemeRootBackground } from "../../theme/phi-root-background.server";

export type PhiRootLayoutProps = {
  children: ReactNode;
  apiBaseUrl: string;
  internalToken: string;
  siteKey: string;
  site?: PhiSiteConfig;
  resolvedLocale?: PhiResolvedLocale | null;
  themePresets?: readonly PhiThemePresetPlugin[];
  /**
   * Style, ground and set blocks the active Modules contribute. Palettes arrive as `themePresets`,
   * which is the field Modules have always shipped them in.
   */
  themeBlocks?: Partial<Omit<PhiThemeBlockCatalog, "palettes">>;
  /** How the viewer wants to see the Site; `system` when they have stated nothing. */
  themeModePreference?: PhiThemeModePreference;
  /**
   * What the browser last reported as its `prefers-color-scheme`, carried in the hint cookie. Only
   * consulted for a viewer on `system`; absent means the browser has not been asked yet and the
   * projection falls back to light.
   */
  browserColorScheme?: PhiThemeMode | null;
};

type FontSelection = {
  fontFamily?: string;
};


type PhiRemSelection = {
  rootValue?: number | null;
} | null | undefined;

function resolveThemeFont(fontName: string | null | undefined, fallbackFont: string): FontSelection {
  const trimmed = typeof fontName === "string" ? fontName.trim() : "";
  if (!trimmed) {
    return {
      fontFamily: fallbackFont,
    };
  }

  return {
    fontFamily: PHI_FONT_CATALOGUE_FAMILY_VARIABLES.get(trimmed) ?? trimmed,
  };
}

function resolveFinitePositiveNumber(value: number | null | undefined, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return value;
}

export async function PhiRootLayout({
  children,
  apiBaseUrl,
  internalToken,
  siteKey,
  site: siteSnapshot,
  resolvedLocale,
  themePresets = PHI_CORE_THEME_PRESET_PLUGINS,
  themeBlocks,
  themeModePreference = PHI_DEFAULT_THEME_MODE_PREFERENCE,
  browserColorScheme,
}: PhiRootLayoutProps) {
  const site = siteSnapshot ?? await getResolvedSiteConfig({ apiBaseUrl, internalToken, siteKey });
  /*
   * The blocks the Site follows are folded in before anything reads the Theme, so every consumer below
   * sees one ordinary Theme record and none of them has to know that a Module shipped half of it.
   */
  const { theme: siteThemeRecord } = resolvePhiThemeRuntimePayload(site.theme, {
    ...PHI_CORE_THEME_BLOCK_CATALOG,
    ...themeBlocks,
    palettes: themePresets,
  });
  const siteTheme = await projectPhiSiteThemeRootBackground(siteThemeRecord, { apiBaseUrl, internalToken, siteKey });
  const antdLocale = await loadPhiAntdLocale(resolvedLocale?.locale ?? resolvedLocale?.intlLocale);
  const resolvedThemeMode = resolvePhiThemeMode(themeModePreference, browserColorScheme);

  // Keep the basiset explicit and self-hosted; accent/display stay as open slots for later.
  /*
   * A slot naming an Asset is answered before the catalogue is consulted: that is a typeface the Site
   * owns, it arrives with its own `@font-face` rules, and the stack those rules need is not a family
   * name the catalogue could map.
   */
  const assetFonts = await resolvePhiSiteThemeFonts(siteThemeRecord?.fonts, {
    apiBaseUrl,
    internalToken,
    siteKey,
  });
  const bodyFont = assetFonts.families.body
    ?? resolveThemeFont(siteThemeRecord?.fonts?.body, "var(--phi-font-source-body)").fontFamily;
  const monoFont = assetFonts.families.mono
    ?? resolveThemeFont(siteThemeRecord?.fonts?.mono, "var(--phi-font-source-mono)").fontFamily;
  const serifFont = assetFonts.families.serif
    ?? resolveThemeFont(siteThemeRecord?.fonts?.serif, "var(--phi-font-source-serif)").fontFamily;
  const accentFont = assetFonts.families.accent
    ?? resolveThemeFont(siteThemeRecord?.fonts?.accent, "").fontFamily;
  const displayFont = assetFonts.families.display
    ?? resolveThemeFont(siteThemeRecord?.fonts?.display, "").fontFamily;
  const remSettings: PhiRemSelection = siteThemeRecord?.rem;
  const remRootValue = resolveFinitePositiveNumber(remSettings?.rootValue, 16);
  const themeFonts = {
      body: bodyFont,
      mono: monoFont,
      serif: serifFont,
      accent: accentFont,
      display: displayFont,
  };
  const publishedRootTheme = resolvePhiPublishedRootTheme({
    siteTheme: siteThemeRecord,
    mode: resolvedThemeMode,
    remRootValue,
    themePresets,
  });

  return (
    <PhiRootRemProvider rootValue={remRootValue}>
      {/*
        * The rules for the Site's own typefaces, hoisted into the head by React.
        *
        * They cannot come from a stylesheet in this package: the URLs are the Site's Assets, and which
        * Assets they are is a per-request answer out of the Theme record. `precedence` is what tells
        * React to lift the element and keep one copy; `@font-face` is order-independent, so where among
        * the other styles it lands does not matter.
        */}
      {assetFonts.css ? (
        <style
          href={`phi-site-fonts:${site.key}`}
          precedence="default"
          dangerouslySetInnerHTML={{ __html: assetFonts.css }}
        />
      ) : null}
      <AntdRegistry>
        <PhiSignalRuntimePartitionProvider
          id={`site:${site.key}`}
          kind="site"
          context={{ siteKey: site.key }}
        >
          <PhiRootLiveThemeProvider
            siteKey={site.key}
            siteTheme={siteTheme}
            locale={antdLocale}
            initialMode={resolvedThemeMode}
            themeModePreference={themeModePreference}
            initialLocale={resolvedLocale?.locale ?? site.defaultLocale}
            availableLocales={site.availableLocales.map((option) => option.code)}
            fonts={themeFonts}
            presets={themePresets}
            themeBlocks={themeBlocks}
            rootClassName={PHI_FONT_CATALOGUE_CLASS_NAME}
            rootStyle={publishedRootTheme.style}
            remRootValue={remRootValue}
          >
            <AntdApp>
              <PhiCoreRuntimeApplicationAdapter />
              <PhiDayjsLocale locale={resolvedLocale?.locale ?? resolvedLocale?.intlLocale}>
                {children}
              </PhiDayjsLocale>
            </AntdApp>
          </PhiRootLiveThemeProvider>
        </PhiSignalRuntimePartitionProvider>
      </AntdRegistry>
    </PhiRootRemProvider>
  );
}
