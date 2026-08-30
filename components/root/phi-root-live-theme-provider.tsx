"use client";

import type { ConfigProviderProps } from "antd";
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";

import type { PhiSiteTheme } from "../../gateway/site-config";
import { usePhiSignalListener } from "../runtime/runtime-signal-bus";
import {
  resolvePhiRootTheme,
  type PhiRootThemeFonts,
} from "./phi-root-theme-resolver";
import type {
  PhiThemeMode,
  PhiThemePresetPlugin,
} from "../../theme/phi-theme-presets";
import { resolvePhiPublishedThemeCustomColors } from "../../theme/phi-theme-palette";
import { PhiConfigProvider } from "./phi-config-provider";
import { readPhiControlShape } from "../../theme/phi-control-shape";
import {
  PHI_SIGNAL_VALUE_SCHEMAS,
  type PhiSignal,
} from "../../types/signals";
import { createPhiCoreRuntimeControllerAddress } from "../runtime/core-runtime-controller-address";
import { registerPhiSignalInstance } from "../runtime/runtime-signal-registry";
import { usePhiSignalRuntimePartition } from "../runtime/runtime-signal-partition";

function resolveStringSignalValue(signal: PhiSignal) {
  return typeof signal.value === "string" ? signal.value.trim() : "";
}

export function PhiRootLiveThemeProvider({
  children,
  siteKey,
  siteTheme,
  locale,
  initialMode,
  initialLocale,
  availableLocales,
  fonts,
  presets,
  rootClassName,
  rootStyle,
  remRootValue,
}: {
  children: ReactNode;
  siteKey: string;
  siteTheme: PhiSiteTheme;
  locale: ConfigProviderProps["locale"];
  initialMode: PhiThemeMode;
  initialLocale: string;
  availableLocales: readonly string[];
  fonts: PhiRootThemeFonts;
  presets: readonly PhiThemePresetPlugin[];
  rootClassName: string;
  rootStyle: CSSProperties & Record<`--${string}`, string>;
  remRootValue: number;
}) {
  const signalPartition = usePhiSignalRuntimePartition();
  const coreAddress = createPhiCoreRuntimeControllerAddress();
  const [liveSiteTheme, setLiveSiteTheme] = useState(siteTheme);
  const [mode, setMode] = useState<PhiThemeMode>(initialMode);
  const [pageDescription, setPageDescription] = useState<string | null>(null);
  const [openGraphImage, setOpenGraphImage] = useState<string | null>(null);
  const [canonicalUrl, setCanonicalUrl] = useState<string | null>(null);
  const resolvedTheme = useMemo(
    () => resolvePhiRootTheme({ siteTheme: liveSiteTheme, mode, fonts, presets }),
    [fonts, liveSiteTheme, mode, presets],
  );
  const customColors = useMemo(
    () => resolvePhiPublishedThemeCustomColors(liveSiteTheme, mode, presets),
    [liveSiteTheme, mode, presets],
  );

  useEffect(() => registerPhiSignalInstance(signalPartition, {
    address: coreAddress,
    scope: "site",
    context: { siteKey },
  }), [coreAddress, signalPartition, siteKey]);

  useEffect(() => {
    if (availableLocales.includes(initialLocale)) {
      document.documentElement.lang = initialLocale;
    }
  }, [availableLocales, initialLocale]);

  usePhiSignalListener((signal) => {
    if (signal.receiver !== coreAddress || signal.scope !== "site") {
      return;
    }

    if (signal.channel === "pageTitle" && signal.action === "change" && signal.valueType === "string") {
      const value = resolveStringSignalValue(signal);
      if (value) {
        document.title = value;
      }
      return;
    }

    if (signal.channel === "pageDescription") {
      const value = signal.action === "clear" ? null : resolveStringSignalValue(signal) || null;
      setPageDescription(value);
      return;
    }

    if (signal.channel === "openGraphImage") {
      const value = signal.action === "clear" ? null : resolveStringSignalValue(signal) || null;
      setOpenGraphImage(value);
      return;
    }

    if (signal.channel === "canonicalUrl") {
      const value = signal.action === "clear" ? null : resolveStringSignalValue(signal) || null;
      setCanonicalUrl(value);
      return;
    }

    if (
      signal.channel === "theme" &&
      signal.action === "change" &&
      signal.valueType === "json" &&
      signal.valueSchema === PHI_SIGNAL_VALUE_SCHEMAS.runtimeTheme &&
      signal.value &&
      typeof signal.value === "object" &&
      !Array.isArray(signal.value)
    ) {
      const nextTheme = signal.value as PhiSiteTheme;
      setLiveSiteTheme(nextTheme);
      setMode(nextTheme.mode === "dark" ? "dark" : "light");
      return;
    }

    if (
      signal.channel === "themeMode" &&
      signal.action === "change" &&
      signal.valueType === "boolean"
    ) {
      setMode(signal.value ? "dark" : "light");
      return;
    }

    if (signal.channel === "locale" && signal.action === "change" && signal.valueType === "string") {
      const value = resolveStringSignalValue(signal);
      if (availableLocales.includes(value)) {
        document.documentElement.lang = value;
      }
    }
  }, {
    scopes: ["site"],
    receiver: coreAddress,
  });

  return (
    <>
      {pageDescription ? (
        <meta
          name="description"
          content={pageDescription}
          data-phi-runtime-metadata="pageDescription"
        />
      ) : null}
      {openGraphImage ? (
        <meta
          property="og:image"
          content={openGraphImage}
          data-phi-runtime-metadata="openGraphImage"
        />
      ) : null}
      {canonicalUrl ? (
        <link
          rel="canonical"
          href={canonicalUrl}
          data-phi-runtime-metadata="canonicalUrl"
        />
      ) : null}
      <PhiConfigProvider
        customColors={customColors}
        fonts={fonts}
        locale={locale}
        mode={mode}
        controlShape={readPhiControlShape(liveSiteTheme.shape?.controls)}
        theme={resolvedTheme.theme}
        presets={presets}
        rootClassName={rootClassName}
        rootStyle={rootStyle}
        remRootValue={remRootValue}
      >
        {children}
      </PhiConfigProvider>
    </>
  );
}
