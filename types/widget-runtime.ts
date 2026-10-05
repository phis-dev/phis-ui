import type { PhiThemeMode } from "../theme/phi-theme-presets";
import type { PhiThemeModePreference } from "../theme/phi-theme-mode";
import type { PhiCmsAreaKey } from "@phis/contracts/cms";
import type { PhiViewerAddonRoleClaim, PhiViewerGroupClaim, PhiViewerRoleClaim } from "./access";
import type { PhiSiteTheme } from "./site-config";
import type { PhiControllerSignalAddress, PhiSignalAddress } from "./signals";

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
  store: {
    enabled: boolean;
  };
  themeRevision?: {
    publishedRevisionId: number | null;
    workingDraftRevisionId: number | null;
  };
  theme?: PhiBlockRuntimeSiteTheme;
};

/**
 * The Site's Theme as a Widget reads it: the record the server answered, whole, with the mode decided.
 *
 * One type and not a second list of fields. The runtime copy used to name the Theme's fields by hand
 * and the converter (`server-helpers/runtime.ts`) copied them by hand too, so `blocks`, `derivedFrom`,
 * `shape`, `buttons` and `typography` were promised here and never arrived -- a Widget reading
 * `runtime.site.theme.shape` got `undefined` from a type that said otherwise.
 */
export type PhiBlockRuntimeSiteTheme = Omit<PhiSiteTheme, "mode"> & {
  mode: PhiWidgetThemeMode;
};

/**
 * A Site as the server resolved it for a request: the parts a block may do without are answered.
 *
 * Stated once. The request context and the runtime loader each kept a copy of this with a hand-written
 * Theme inside, three listings of one record that had drifted apart in which fields they knew.
 */
export type PhiResolvedBlockRuntimeSite = PhiBlockRuntimeSite & {
  name: string;
  hostname: string;
  themeRevision: NonNullable<PhiBlockRuntimeSite["themeRevision"]>;
  theme: PhiBlockRuntimeSiteTheme;
};

export type PhiBlockRuntimeLocale = {
  current: string;
};

export type PhiBlockRuntimeArea = PhiCmsAreaKey;

export type PhiBlockRuntimeViewer = {
  access: PhiWidgetViewerAccess;
  resolvedArea?: PhiCmsAreaKey | null;
  roleClaims: readonly PhiViewerRoleClaim[];
  groupClaims: readonly PhiViewerGroupClaim[];
  /** Absent where a surface never carried them, which denies an `addon-roles` policy. */
  addonRoleClaims?: readonly PhiViewerAddonRoleClaim[];
  authorizationRevision: number;
  userName?: string | null;
  userEmail?: string | null;
  preferredLocale?: string | null;
  /**
   * The mode this viewer is shown before anything overrides it live: their preference, or the
   * browser's where they have none, or light. Not the Theme record's `site.theme.mode`, which names
   * the half of the Theme being authored. Absent on surfaces that never resolve a viewer.
   */
  themeMode?: PhiWidgetThemeMode;
  /**
   * What this account asked for, which is a different question from what it is being shown.
   *
   * `themeMode` above is the resolution and always names a half; this is the choice and may say
   * `system`, meaning the browser answers. The pair stands to each other as `preferredLocale` does to
   * `locale.current`, and a Settings panel needs this one: it has to show "System" as chosen rather
   * than as whichever half the browser happened to resolve it to. Absent for a viewer without an
   * account, who has no stored choice to read.
   */
  preferredThemeMode?: PhiThemeModePreference | null;
  /**
   * An administrator asked this account for a new password. The server refuses every other request of
   * the session until it is set, and each Page shows the change in front of itself.
   */
  mustChangePassword?: boolean;
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

/**
 * What a Widget knows about the request it renders in. It holds nothing only the server may know: a
 * runtime is handed to client components, and whatever it carries reaches the browser. Server code that
 * calls phis-server takes its credentials from `readPhiServerApiCredentials` instead.
 */
export type PhiBlockRuntime = {
  site: PhiBlockRuntimeSite;
  locale: PhiBlockRuntimeLocale;
  area: PhiBlockRuntimeArea;
  viewer: PhiBlockRuntimeViewer;
  authUiProvider?: {
    moduleId: `${string}/${string}`;
    providerKey: `${string}/${string}`;
    controllerAddress: PhiControllerSignalAddress;
    capabilities: readonly string[];
    /** The Overlay to open for signing in here, or null when this Area signs in on `/login`. */
    loginOverlayAddress: PhiSignalAddress | null;
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
