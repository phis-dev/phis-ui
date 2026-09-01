import type { PhiShellTheme } from "../components/shell/shell-types";
import type { PhiSiteFontSlots, PhiSiteRemSettings } from "./site-theme";
import type { PhiThemeCustomColorPalette, PhiThemeMode } from "../theme/phi-theme-presets";
import type { PhiControlShape } from "../theme/phi-control-shape";
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
  availableLocales?: Array<{
    code: string;
    label: string;
  }>;
  store?: {
    enabled: boolean;
  };
  themeRevision?: {
    publishedRevisionId: number | null;
    workingDraftRevisionId: number | null;
  };
  theme?: {
    mode: PhiWidgetThemeMode;
    preset?: string | null;
    presetVersion?: number | null;
    shape?: {
      controls?: PhiControlShape | null;
    } | null;
    fonts?: PhiSiteFontSlots | null;
    rem?: PhiSiteRemSettings | null;
    brand?: {
      logoAssetId?: number | null;
      slogan?: {
        label?: string | null;
        icon?: string | null;
      } | null;
      location?: {
        label?: string | null;
        icon?: string | null;
      } | null;
      wordmark?: {
        parts?: Array<{
          text: string;
          color?: string | null;
          fontWeight?: number | string | null;
        }> | null;
      } | null;
    };
    contact?: {
      label?: string | null;
      href?: string | null;
      icon?: string | null;
    };
    shell?: PhiShellTheme;
    antd?: {
      token?: Record<string, unknown>;
      components?: Record<string, Record<string, unknown>>;
    };
    phi?: {
      customColors?: Partial<Record<PhiWidgetThemeMode, Partial<PhiThemeCustomColorPalette>>>;
    };
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
