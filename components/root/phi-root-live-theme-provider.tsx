"use client";

import type { ConfigProviderProps } from "antd";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";

import type { PhiSiteTheme } from "../../types/site-config";
import type { PhiSiteThemeBrand } from "../../types/site-theme";
import { resolvePhiBrandWordmarkTextFrom } from "../../helpers/brand-wordmark";
import { usePhiSignalListener } from "../runtime/runtime-signal-bus";
import type {
  PhiRootThemeFonts,
  PhiRootThemeState,
} from "./phi-root-theme-resolver";
import type {
  PhiThemeMode,
  PhiThemePresetPlugin,
} from "../../theme/phi-theme-presets";
import {
  applyPhiThemeModeToDocument,
  resolvePhiMountedThemeModePreference,
  writePhiColorSchemeHint,
  storePhiThemeModePreferenceOnAccount,
  writePhiThemeModePreference,
  type PhiThemeModePreference,
} from "../../theme/phi-theme-mode";
import { resolvePhiPublishedThemeCustomColors } from "../../theme/phi-theme-palette";
import { PhiConfigProvider, type PhiFontCatalogueFamily } from "./phi-config-provider";
import { PhiRootBackgroundLayer } from "./phi-root-background";
import { PhiThemeToneSourceProvider, type PhiThemeToneSource } from "./phi-theme-tone-source";
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

/**
 * What the Site is called in writing, held beside the Brand because the two answer together.
 *
 * The Wordmark falls back to the Site's name, and the name lives on the runtime -- which the Builder
 * canvas does not have. Every authoring half there is handed a stub Site called "Preview", so a Widget
 * that resolved the Wordmark from its runtime wrote "Preview" on the canvas while the Logo next to it,
 * read from the Brand above, was the Site's own. Held here, both halves answer from the same place, and
 * both follow a live Theme draft: clearing the last Wordmark part shows the name, at once.
 */
const PhiSiteWordmarkTextContext = createContext<string>("");

export function usePhiSiteWordmarkText(): string {
  return useContext(PhiSiteWordmarkTextContext);
}

function resolveStringSignalValue(signal: PhiSignal) {
  return typeof signal.value === "string" ? signal.value.trim() : "";
}

export function PhiRootLiveThemeProvider({
  children,
  siteKey,
  siteName,
  siteTheme,
  locale,
  initialMode,
  themeModePreference,
  initialLocale,
  availableLocales,
  fonts,
  themeState,
  fontFamilies,
  presets,
  rootClassName,
  rootStyle,
}: {
  children: ReactNode;
  siteKey: string;
  /** The name the Site is filed under, which is what its Wordmark says where none is set. */
  siteName?: string | null;
  siteTheme: PhiSiteTheme;
  locale: ConfigProviderProps["locale"];
  initialMode: PhiThemeMode;
  /** How the viewer wants to see the Site. `system` is the only value that lets the browser have a say. */
  themeModePreference: PhiThemeModePreference;
  initialLocale: string;
  availableLocales: readonly string[];
  fonts: PhiRootThemeFonts;
  /** The Theme resolved on the Server for both modes, with the Shell Chrome Overlay's properties. */
  themeState: PhiRootThemeState;
  /** The families an author may choose from: this package's plus the installed Modules'. */
  fontFamilies: readonly PhiFontCatalogueFamily[];
  presets: readonly PhiThemePresetPlugin[];
  rootClassName: string;
  rootStyle: CSSProperties & Record<`--${string}`, string>;
}) {
  const signalPartition = usePhiSignalRuntimePartition();
  const coreAddress = createPhiCoreRuntimeControllerAddress();
  const [liveSiteTheme, setLiveSiteTheme] = useState(siteTheme);
  const wordmarkText = resolvePhiBrandWordmarkTextFrom(liveSiteTheme.brand, siteName, siteKey);
  const [mode, setMode] = useState<PhiThemeMode>(initialMode);
  /*
   * A live Theme signal - the Builder's dark mode switch, or a Theme draft preview - states what the
   * author wants to see right now. Once one has arrived, a change of the operating system setting
   * must not pull the page back out from under them.
   */
  const liveModeOverride = useRef(false);
  /*
   * And a mode the Server now states is taken, because the Server only states a new one when somebody
   * asked for it.
   *
   * `useState(initialMode)` reads the prop once. Everything that switches the mode afterwards is a
   * live signal or the operating system, so a viewer who changed the setting on their Profile page
   * saw the page stay in the mode it had loaded in: the Page came back with the new one in the
   * payload and this provider was already mounted and no longer listening.
   *
   * Compared against the last prop rather than against `mode`, so a live Theme draft in the Builder
   * survives a re-render that carries the same answer as before.
   */
  const lastStatedMode = useRef(initialMode);
  useEffect(() => {
    if (lastStatedMode.current === initialMode) {
      return;
    }
    lastStatedMode.current = initialMode;
    setMode(initialMode);
  }, [initialMode]);
  const [pageDescription, setPageDescription] = useState<string | null>(null);
  const [openGraphImage, setOpenGraphImage] = useState<string | null>(null);
  const [canonicalUrl, setCanonicalUrl] = useState<string | null>(null);
  /*
   * A live Theme draft, resolved in the browser -- the only case that needs the resolver here.
   *
   * The page arrives with both modes resolved on the Server, so switching modes only picks one. A draft
   * from the Builder's Theme editor is a Theme the Server has never seen; the resolver is fetched for it
   * then, and not shipped to every visitor of every page for that one moment. Until it is resolved, the
   * frame keeps the Theme it has; a later draft outranks an earlier one still resolving.
   */
  const [liveThemeState, setLiveThemeState] = useState<PhiRootThemeState | null>(null);
  const liveThemeRequest = useRef(0);
  const activeThemeState = liveThemeState ?? themeState;
  const customColorsByMode = useMemo(
    () => ({
      light: resolvePhiPublishedThemeCustomColors(liveSiteTheme, "light", presets),
      dark: resolvePhiPublishedThemeCustomColors(liveSiteTheme, "dark", presets),
    }),
    [liveSiteTheme, presets],
  );
  const customColors = customColorsByMode[mode];
  const toneSource = useMemo<PhiThemeToneSource>(
    () => ({ pageMode: mode, themes: activeThemeState.themes, customColorsByMode, locale }),
    [activeThemeState.themes, customColorsByMode, locale, mode],
  );
  /*
   * The Shell Chrome Overlay travels as custom properties on the Root Layout element, both modes at
   * once, because the Regions that paint it are rendered far below this provider and switch modes
   * through `data-phi-theme-mode` rather than through a re-render.
   */
  const chromeOverlayStyle = useMemo(
    () => ({ ...rootStyle, ...activeThemeState.chromeOverlayVariables }),
    [activeThemeState.chromeOverlayVariables, rootStyle],
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
    // A choice in the cookie outranks the `system` a static document hands everybody.
    if (resolvePhiMountedThemeModePreference(themeModePreference, document.cookie) !== "system") {
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
      const request = ++liveThemeRequest.current;
      void import("./phi-root-theme-resolver").then(({ resolvePhiRootThemeState }) => {
        if (request !== liveThemeRequest.current) return;
        setLiveThemeState(resolvePhiRootThemeState({ siteTheme: nextTheme, fonts, presets }));
      });
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
      /*
       * And on the account, for whoever has one. The cookie above is what this browser reads next; this
       * is what every other browser reads. Not awaited, because the mode is already on screen and the
       * person is not waiting for a round trip to see what they just chose.
       */
      void storePhiThemeModePreferenceOnAccount(next);
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
        theme={activeThemeState.themes[mode]}
        presets={presets}
        rootClassName={rootClassName}
        rootStyle={chromeOverlayStyle}
      >
        <PhiRootBackgroundLayer root={liveSiteTheme.root} mode={mode} />
        <PhiThemeToneSourceProvider value={toneSource}>
          <PhiSiteBrandContext.Provider value={liveSiteTheme.brand ?? null}>
            <PhiSiteWordmarkTextContext.Provider value={wordmarkText}>
              {children}
            </PhiSiteWordmarkTextContext.Provider>
          </PhiSiteBrandContext.Provider>
        </PhiThemeToneSourceProvider>
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
