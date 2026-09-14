"use client";

import type { ConfigProviderProps } from "antd";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";

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
import { PHI_CORE_THEME_BLOCK_CATALOG, type PhiThemeBlockCatalog } from "../../theme/phi-theme-composition";
import { resolvePhiThemeRuntimePayload } from "../../theme/phi-theme-runtime";
import {
  applyPhiThemeModeToDocument,
  writePhiColorSchemeHint,
  type PhiThemeModePreference,
} from "../../theme/phi-theme-mode";
import { resolvePhiPublishedThemeCustomColors } from "../../theme/phi-theme-palette";
import { PhiConfigProvider } from "./phi-config-provider";
import { PhiRootBackgroundLayer } from "./phi-root-background";
import { resolvePhiShellChromeOverlayVariables } from "./phi-shell-chrome-overlay";
import { resolvePhiControlShape } from "../../theme/phi-control-shape";
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
  themeModePreference,
  initialLocale,
  availableLocales,
  fonts,
  presets,
  themeBlocks,
  rootClassName,
  rootStyle,
  remRootValue,
}: {
  children: ReactNode;
  siteKey: string;
  siteTheme: PhiSiteTheme;
  locale: ConfigProviderProps["locale"];
  initialMode: PhiThemeMode;
  /** How the viewer wants to see the Site. `system` is the only value that lets the browser have a say. */
  themeModePreference: PhiThemeModePreference;
  initialLocale: string;
  availableLocales: readonly string[];
  fonts: PhiRootThemeFonts;
  presets: readonly PhiThemePresetPlugin[];
  /** Style, ground and set blocks; palettes arrive as `presets`. */
  themeBlocks?: Partial<Omit<PhiThemeBlockCatalog, "palettes">>;
  rootClassName: string;
  rootStyle: CSSProperties & Record<`--${string}`, string>;
  remRootValue: number;
}) {
  const signalPartition = usePhiSignalRuntimePartition();
  const coreAddress = createPhiCoreRuntimeControllerAddress();
  const [liveSiteTheme, setLiveSiteTheme] = useState(siteTheme);
  const [mode, setMode] = useState<PhiThemeMode>(initialMode);
  /*
   * A live Theme signal - the Builder's dark mode switch, or a Theme draft preview - states what the
   * author wants to see right now. Once one has arrived, a change of the operating system setting
   * must not pull the page back out from under them.
   */
  const liveModeOverride = useRef(false);
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
  /*
   * The Shell Chrome Overlay travels as custom properties on the Root Layout element, both modes at
   * once, because the Regions that paint it are rendered far below this provider and switch modes
   * through `data-phi-theme-mode` rather than through a re-render.
   */
  const chromeOverlayStyle = useMemo(
    () => ({ ...rootStyle, ...resolvePhiShellChromeOverlayVariables(liveSiteTheme.root) }),
    [liveSiteTheme.root, rootStyle],
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

  /*
   * <html> carries the marker and the colour scheme for the document ground and the native controls,
   * and shell.css matches it as an ancestor. It has to follow a live switch, or the two would
   * disagree about which mode is on screen.
   */
  useEffect(() => {
    applyPhiThemeModeToDocument(mode);
  }, [mode]);

  /*
   * A viewer on `system` follows the browser for as long as nobody has overridden it live. The hint is
   * stored so the next server render starts in the right mode instead of correcting itself.
   */
  useEffect(() => {
    if (themeModePreference !== "system") {
      return;
    }

    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const next = query.matches ? "dark" : "light";
      writePhiColorSchemeHint(next);
      if (!liveModeOverride.current) {
        setMode(next);
      }
    };

    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, [themeModePreference]);

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
      /*
       * A draft states what its author chose, not what it resolves to. Folding the blocks in here is
       * what makes the live preview show the same Theme the Site will render, including the parts a
       * Module contributed and the parts that fell back to the core.
       */
      const nextTheme = resolvePhiThemeRuntimePayload(signal.value as PhiSiteTheme, {
        ...PHI_CORE_THEME_BLOCK_CATALOG,
        ...themeBlocks,
        palettes: presets,
      }).theme;
      setLiveSiteTheme(nextTheme);
      liveModeOverride.current = true;
      setMode(nextTheme.mode === "dark" ? "dark" : "light");
      return;
    }

    if (
      signal.channel === "themeMode" &&
      signal.action === "change" &&
      signal.valueType === "boolean"
    ) {
      liveModeOverride.current = true;
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
        controlShape={resolvePhiControlShape(liveSiteTheme.shape?.controls)}
        theme={resolvedTheme.theme}
        presets={presets}
        themeBlocks={themeBlocks}
        rootClassName={rootClassName}
        rootStyle={chromeOverlayStyle}
        remRootValue={remRootValue}
      >
        <PhiRootBackgroundLayer root={liveSiteTheme.root} mode={mode} />
        {children}
      </PhiConfigProvider>
    </>
  );
}
