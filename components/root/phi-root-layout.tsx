import type { ReactNode } from "react";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import AntdApp from "antd/es/app";
import { Fira_Mono, Fira_Sans, Lora } from "next/font/google";
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
  type PhiThemePresetPlugin,
} from "../../theme/phi-theme-presets";
import { resolvePhiPublishedRootTheme } from "../../theme/phi-published-root-style";

const firaSans = Fira_Sans({
  variable: "--phi-font-source-body",
  weight: ["400", "600", "700"],
  subsets: ["latin"],
});

const firaMono = Fira_Mono({
  variable: "--phi-font-source-mono",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--phi-font-source-serif",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

export type PhiRootLayoutProps = {
  children: ReactNode;
  apiBaseUrl: string;
  internalToken: string;
  siteKey: string;
  site?: PhiSiteConfig;
  resolvedLocale?: PhiResolvedLocale | null;
  themePresets?: readonly PhiThemePresetPlugin[];
};

type FontSelection = {
  fontFamily?: string;
};

const PHI_ROOT_FONT_CLASS_NAME = [firaSans.variable, firaMono.variable, lora.variable]
  .filter(Boolean)
  .join(" ");

const PHI_NEXT_FONT_FAMILY_MAP = new Map<string, string>([
  ["Fira Sans", "var(--phi-font-source-body)"],
  ["Fira Mono", "var(--phi-font-source-mono)"],
  ["Lora", "var(--phi-font-source-serif)"],
]);

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
    fontFamily: PHI_NEXT_FONT_FAMILY_MAP.get(trimmed) ?? trimmed,
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
}: PhiRootLayoutProps) {
  const site = siteSnapshot ?? await getResolvedSiteConfig({ apiBaseUrl, internalToken, siteKey });
  const antdLocale = await loadPhiAntdLocale(resolvedLocale?.locale ?? resolvedLocale?.intlLocale);
  const resolvedThemeMode = site.theme?.mode === "dark" ? "dark" : "light";

  // Keep the basiset explicit and self-hosted; accent/display stay as open slots for later.
  const bodyFont = resolveThemeFont(site.theme?.fonts?.body, "var(--phi-font-source-body)");
  const monoFont = resolveThemeFont(site.theme?.fonts?.mono, "var(--phi-font-source-mono)");
  const serifFont = resolveThemeFont(site.theme?.fonts?.serif, "var(--phi-font-source-serif)");
  const accentFont = resolveThemeFont(site.theme?.fonts?.accent, "");
  const displayFont = resolveThemeFont(site.theme?.fonts?.display, "");
  const remSettings: PhiRemSelection = site.theme?.rem;
  const remRootValue = resolveFinitePositiveNumber(remSettings?.rootValue, 16);
  const themeFonts = {
      body: bodyFont.fontFamily,
      mono: monoFont.fontFamily,
      serif: serifFont.fontFamily,
      accent: accentFont.fontFamily,
      display: displayFont.fontFamily,
  };
  const publishedRootTheme = resolvePhiPublishedRootTheme({
    siteTheme: site.theme,
    remRootValue,
    themePresets,
  });

  return (
    <PhiRootRemProvider rootValue={remRootValue}>
      <AntdRegistry>
        <PhiSignalRuntimePartitionProvider
          id={`site:${site.key}`}
          kind="site"
          context={{ siteKey: site.key }}
        >
          <PhiRootLiveThemeProvider
            siteKey={site.key}
            siteTheme={site.theme}
            locale={antdLocale}
            initialMode={resolvedThemeMode}
            initialLocale={resolvedLocale?.locale ?? site.defaultLocale}
            availableLocales={site.availableLocales.map((option) => option.code)}
            fonts={themeFonts}
            presets={themePresets}
            rootClassName={PHI_ROOT_FONT_CLASS_NAME}
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
