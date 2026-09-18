"use client";

import type { ConfigProviderProps } from "antd";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";

import type { PhiSiteTheme } from "../../gateway/site-config";
import type { PhiSiteThemeBrand } from "../../types/site-theme";
import { usePhiSignalListener } from "../runtime/runtime-signal-bus";
import {
  resolvePhiRootTheme,
  type PhiRootThemeFonts,
} from "./phi-root-theme-resolver";
import type {
  PhiThemeMode,
  PhiThemePresetPlugin,
} from "../../theme/phi-theme-presets";
import {
  applyPhiThemeModeToDocument,
  writePhiColorSchemeHint,
  writePhiThemeModePreference,
  type PhiThemeModePreference,
} from "../../theme/phi-theme-mode";
import { resolvePhiPublishedThemeCustomColors } from "../../theme/phi-theme-palette";
import { PhiConfigProvider, type PhiFontCatalogueFamily } from "./phi-config-provider";
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

/**
 * The Brand as the root holds it: blocks folded in, and following a live Theme draft.
 *
 * The Brand Widget reads it here rather than fetching the Site config itself, for two reasons. The Logo
 * a Site shows may be its Set's, and only the root folds the Sets in -- against the catalogue of every
 * installed Module. And a Theme draft in the Builder reaches the root as a signal, so a Brand read from
 * here shows the Logo being authored in the frame around it, in the mode that frame is switched to.
 */
const PhiSiteBrandContext = createContext<PhiSiteThemeBrand | null>(null);

export function usePhiSiteBrand(): PhiSiteThemeBrand | null {
  return useContext(PhiSiteBrandContext);
}

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
  fontFamilies,
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
  /** How the viewer wants to see the Site. `system` is the only value that lets the browser have a say. */
  themeModePreference: PhiThemeModePreference;
  initialLocale: string;
  availableLocales: readonly string[];
  fonts: PhiRootThemeFonts;
  /** The families an author may choose from: this package's plus the installed Modules'. */
  fontFamilies: readonly PhiFontCatalogueFamily[];
  presets: readonly PhiThemePresetPlugin[];
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
       * The Theme arrives resolved: whoever sends it folded the blocks in, against the catalogue only
       * the Builder holds. The root keeps no catalogue of its own -- it would have to ship every
       * installed Module's palettes, styles and grounds, pictures included, to every page for the one
       * moment somebody in the Builder flips the mode switch.
       */
      const nextTheme = signal.value as PhiSiteTheme;
      setLiveSiteTheme(nextTheme);
      liveModeOverride.current = true;
      setMode(nextTheme.mode === "dark" ? "dark" : "light");
      return;
    }

    /*
     * The mode switch is a viewer choosing, so the choice is kept rather than held until they leave.
     *
     * This is the one live channel that is a person stating a preference: the `theme` signal above is
     * the Builder previewing a Theme, which is about the Site and belongs to nobody's browser. Written
     * here rather than in the switch Control, because the Controls that offer it are several -- the
     * Welcome Page, the Builder, Admin -- and every one of them would otherwise have to remember.
     */
    if (
      signal.channel === "themeMode" &&
      signal.action === "change" &&
      signal.valueType === "boolean"
    ) {
      const next = signal.value ? "dark" : "light";
      liveModeOverride.current = true;
      setMode(next);
      writePhiThemeModePreference(next);
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
        fontFamilies={fontFamilies}
        locale={locale}
        mode={mode}
        controlShape={resolvePhiControlShape(liveSiteTheme.shape?.controls)}
        theme={resolvedTheme.theme}
        presets={presets}
        rootClassName={rootClassName}
        rootStyle={chromeOverlayStyle}
        remRootValue={remRootValue}
      >
        <PhiRootBackgroundLayer root={liveSiteTheme.root} mode={mode} />
        <PhiSiteBrandContext.Provider value={liveSiteTheme.brand ?? null}>
          {children}
        </PhiSiteBrandContext.Provider>
      </PhiConfigProvider>
    </>
  );
}

/**
 * The colour-scheme bootstrap script, written into the server's HTML and nowhere else.
 *
 * It has to run before the first paint, so it is an inline script in the document head. React never runs
 * a script it renders in the browser and warns about each one -- which it did on every 404, where Next
 * renders the whole document in the browser. Rendering nothing there is correct rather than evasive: the
 * script already ran from the HTML, and React passes over an unexpected script in the head when it
 * hydrates.
 */
export function PhiThemeModeBootstrapScript({ source }: { source: string }) {
  if (typeof window !== "undefined") {
    return null;
  }
  return <script dangerouslySetInnerHTML={{ __html: source }} />;
}
