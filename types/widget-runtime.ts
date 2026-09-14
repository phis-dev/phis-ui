import type { PhiShellTheme } from "../components/shell/shell-types";
import type {
  PhiSiteFontSlots,
  PhiSiteRemSettings,
  PhiSiteThemeBrand,
  PhiSiteThemeContact,
  PhiSiteThemeRoot,
} from "./site-theme";
import type { PhiThemeMode, PhiThemePalette } from "../theme/phi-theme-presets";
import type { PhiThemeBlockSelection } from "../theme/phi-theme-composition";
import type { PhiThemeDerivation } from "../theme/phi-theme-selection";
import type { PhiControlShapeCorners } from "../theme/phi-control-shape";
import type { PhiViewerAddonRoleClaim, PhiViewerGroupClaim, PhiViewerRoleClaim } from "./access";
import type { PhiControllerSignalAddress } from "./signals";

export type PhiWidgetAreaKey =
  | "public"
  | "app"
  | "admin"
  | "builder"
  | "editor"
  | "accounting";

export type PhiWidgetViewerAccess = "public" | "authenticated";
export type PhiWidgetThemeMode = PhiThemeMode;

export type PhiBlockRuntimeSite = {
  id: number;
  key: string;
  publicUrl?: string;
  name?: string;
  hostname?: string;
  /**
   * Which locales this Site has, and which one it falls back to.
   *
   * Both are Site configuration and neither is optional: `phis.sites` requires a default locale, and a
   * Site with no locales cannot render. They are here rather than resolved in the browser because the
   * alternative was every caller carrying its own guess -- a hardcoded ["en","de","fr","es"] and a
   * hardcoded "en", neither of which an installation could depart from.
   */
  availableLocales: Array<{
    code: string;
    label: string;
  }>;
  defaultLocale: string;
  store?: {
    enabled: boolean;
  };
  themeRevision?: {
    publishedRevisionId: number | null;
    workingDraftRevisionId: number | null;
  };
  theme?: {
    mode: PhiWidgetThemeMode;
    /** Which Theme blocks the Site follows; `preset` remains the palette of a Theme written before. */
    blocks?: PhiThemeBlockSelection | null;
    /** The Set this Theme was derived from; a record for the Theme workspace, never read to render. */
    derivedFrom?: PhiThemeDerivation | null;
    preset?: string | null;
    presetVersion?: number | null;
    shape?: {
      controls?: PhiControlShapeCorners | null;
    } | null;
    fonts?: PhiSiteFontSlots | null;
    rem?: PhiSiteRemSettings | null;
    brand?: PhiSiteThemeBrand;
    contact?: PhiSiteThemeContact;
    shell?: PhiShellTheme;
    root?: PhiSiteThemeRoot | null;
    palette?: PhiThemePalette | null;
    style?: {
      token?: Record<string, unknown>;
    } | null;
    components?: Record<string, Record<string, unknown>> | null;
  };
};

export type PhiBlockRuntimeLocale = {
  current: string;
};

export type PhiBlockRuntimeArea = PhiWidgetAreaKey;

export type PhiBlockRuntimeViewer = {
  access: PhiWidgetViewerAccess;
  resolvedArea?: PhiWidgetAreaKey | null;
  roleClaims: readonly PhiViewerRoleClaim[];
  groupClaims: readonly PhiViewerGroupClaim[];
  /** Absent where a surface never carried them, which denies an `addon-roles` policy. */
  addonRoleClaims?: readonly PhiViewerAddonRoleClaim[];
  authorizationRevision: number;
  siteFlags?: number;
  userName?: string | null;
  userEmail?: string | null;
  preferredLocale?: string | null;
  /**
   * The mode this viewer is shown before anything overrides it live: their preference, or the
   * browser's where they have none, or light. Not the Theme record's `site.theme.mode`, which names
   * the half of the Theme being authored. Absent on surfaces that never resolve a viewer.
   */
  themeMode?: PhiWidgetThemeMode;
  newsletterOptIn?: boolean | null;
  profile?: {
    firstName?: string | null;
    lastName?: string | null;
    companyName?: string | null;
  } | null;
};

export type PhiBlockRuntimePage = {
  path: string;
  pageType: number;
  titleMsgId?: number | null;
  descriptionMsgId?: number | null;
  title?: string | null;
  description?: string | null;
  /**
   * That this Page asked to stay out of the index, as its record answers it.
   *
   * The Area still decides first and decides harder: every authenticated Area is `noindex` whatever
   * a Page says, and this can only add to that, never take it back.
   */
  noindex?: boolean;
};

export type PhiBlockRuntime = {
  site: PhiBlockRuntimeSite;
  phis: {
    apiBaseUrl: string;
    internalToken: string;
  };
  locale: PhiBlockRuntimeLocale;
  area: PhiBlockRuntimeArea;
  viewer: PhiBlockRuntimeViewer;
  authUiProvider?: {
    moduleId: `${string}/${string}`;
    providerKey: `${string}/${string}`;
    controllerAddress: PhiControllerSignalAddress;
    capabilities: readonly string[];
    accountSecurityPath?: `/${string}`;
  } | null;
  page?: PhiBlockRuntimePage;
  request?: {
    searchParams?: Record<string, string | undefined>;
  };
};

declare const PHI_NO_LABELS_BRAND: unique symbol;

export type PhiNoLabels = {
  readonly [PHI_NO_LABELS_BRAND]: "PhiNoLabels";
};

type PhiLabelsProp<TLabels> = [TLabels] extends [PhiNoLabels]
  ? {
      labels?: never;
    }
  : {
      labels: TLabels;
    };

type PhiDefaultLabelsProp<TDefaultLabels> = [TDefaultLabels] extends [PhiNoLabels]
  ? {
      defaultLabels?: never;
    }
  : {
      defaultLabels: TDefaultLabels;
    };

export type PhiBlockBaseProps<
  TLabels = PhiNoLabels,
  TConfig = Record<string, unknown>,
  TRuntime = PhiBlockRuntime,
  TDefaultLabels = PhiNoLabels,
> = {
  config?: TConfig;
  runtime?: TRuntime;
} & PhiLabelsProp<TLabels>
  & PhiDefaultLabelsProp<TDefaultLabels>;

export type PhiServerBlockBaseProps<
  TLabels = PhiNoLabels,
  TConfig = Record<string, unknown>,
  TDefaultLabels = PhiNoLabels,
> = PhiBlockBaseProps<TLabels, TConfig, PhiBlockRuntime, TDefaultLabels> & {
  runtime: PhiBlockRuntime;
};

export type PhiClientBlockBaseProps<
  TLabels = PhiNoLabels,
  TConfig = Record<string, unknown>,
  TRuntimeSlice = unknown,
  TDefaultLabels = PhiNoLabels,
> = PhiBlockBaseProps<TLabels, TConfig, TRuntimeSlice, TDefaultLabels>;
