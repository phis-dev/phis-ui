import type { PhiShellTheme } from "../components/shell/shell-types";
import type {
  PhiSiteFontSlots,
  PhiSiteThemeBrand,
  PhiSiteThemeContact,
  PhiSiteThemeRoot,
} from "./site-theme";
import type { PhiThemePalette } from "../theme/phi-theme-presets";
import type { PhiThemeBlockSelection } from "../theme/phi-theme-composition";
import type { PhiThemeDerivation } from "../theme/phi-theme-selection";
import type { PhiControlShapeCorners } from "../theme/phi-control-shape";
import type { PhiThemeButtons } from "../theme/phi-button-shadow";
import type { PhiThemeTypography } from "../theme/phi-theme-typography";

/*
 * The Site's configuration as the server answers it, in types only.
 *
 * Written beside the gateway that reads it until a Control's theme resolver imported the shape: a
 * type-only import still compiles the file it names, so `@phis/ui/controls` reached a `server-only`
 * gateway that reads `process`, and every Module package without Node types failed on it.
 */

export type PhiSiteTheme = {
  mode?: "light" | "dark" | null;
  /**
   * Which Theme blocks this Site follows (theme/phi-theme-blocks.ts). Absent on a Theme written before
   * a Theme had three parts, where `preset` alone named the palette and still does.
   */
  blocks?: PhiThemeBlockSelection | null;
  /** The Set this Theme was derived from; a record for the Theme workspace, never read to render. */
  derivedFrom?: PhiThemeDerivation | null;
  preset?: string | null;
  presetVersion?: number | null;
  shape?: {
    controls?: PhiControlShapeCorners | null;
  } | null;
  fonts?: PhiSiteFontSlots;
  contact?: PhiSiteThemeContact | null;
  brand?: PhiSiteThemeBrand | null;
  widgets?: {
    locale?: {
      mode?: "label-list" | "compact-pill" | null;
      showText?: boolean | null;
    } | null;
    account?: {
      variant?: "full" | "compact" | "icon-only" | null;
      showLabel?: boolean | null;
      showChevron?: boolean | null;
    } | null;
  } | null;
  shell?: PhiShellTheme;
  root?: PhiSiteThemeRoot | null;
  /**
   * The colour the Site owns: a palette in the shape a Module ships one (theme/phi-theme-presets.ts),
   * laid over the palette block the Site follows. Seeds shared by both modes under `seed`; the base
   * seeds, explicit colour tokens and custom colours per mode under `modes`. Absent while the Site only
   * follows a core palette; filled when a Module palette is taken over on save or an author changes a
   * colour.
   */
  palette?: PhiThemePalette | null;
  /** The proportions the Site owns, laid over the style block it follows. */
  style?: {
    token?: Record<string, unknown>;
  } | null;
  /** The shadow under each kind of Button, as a step the root theme turns into CSS per mode. */
  buttons?: PhiThemeButtons | null;
  /** Which font slot the page's headings take; body unless stated (theme/phi-theme-typography.ts). */
  typography?: PhiThemeTypography | null;
  /** Site-level component overrides, merged per component over the shared component defaults. */
  components?: Record<string, Record<string, unknown>> | null;
};

export type PhiSiteLocaleOption = {
  code: string;
  label: string;
};

export type PhiSiteConfig = {
  id: number;
  key: string;
  publicUrl: string;
  name: string;
  hostname: string;
  defaultLocale: string;
  availableLocales: PhiSiteLocaleOption[];
  /** Whether the Site runs a store; the server computes it for every Site, so it is never absent. */
  store: {
    enabled: boolean;
  };
  theme: PhiSiteTheme;
  themeRevision: {
    publishedRevisionId: number | null;
    workingDraftRevisionId: number | null;
  };
  /** Change markers of the global and this Site's translation store; opaque, compared for equality. */
  translationMarkers: {
    global: string;
    site: string;
  };
  /** Moves with every published change a Site's read caches hold; opaque, compared for equality. */
  readMarker: string;
};
