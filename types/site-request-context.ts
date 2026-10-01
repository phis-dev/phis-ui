import type { PhiCapabilitySnapshot } from "./server-capabilities";
import type { PhiSiteFontSlots, PhiSiteRemSettings } from "./site-theme";
import type { PhiBlockRuntime, PhiWidgetThemeMode } from "./widget-runtime";

/*
 * What the server knows about the request a Page renders for, in types only -- kept apart from the
 * loader in `server-helpers/runtime.ts` for the reason `types/site-config.ts` gives.
 */

export type PhiSiteRequestContext = {
  serverCapabilities: PhiCapabilitySnapshot;
  site: {
    id: number;
    key: string;
    publicUrl?: string;
    name: string;
    hostname: string;
    availableLocales: Array<{
      code: string;
      label: string;
    }>;
    defaultLocale: string;
    themeRevision: {
      publishedRevisionId: number | null;
      workingDraftRevisionId: number | null;
    };
    theme: {
      mode: PhiWidgetThemeMode;
      fonts?: PhiSiteFontSlots | null;
      rem?: PhiSiteRemSettings | null;
      brand?: {
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
      shell?: {
        light?: {
          background?: string | null;
          color?: string | null;
        } | null;
        dark?: {
          background?: string | null;
          color?: string | null;
        } | null;
        header?: {
          light?: {
            background?: string | null;
            color?: string | null;
          } | null;
          dark?: {
            background?: string | null;
            color?: string | null;
          } | null;
          top?: {
            light?: {
              background?: string | null;
              color?: string | null;
            } | null;
            dark?: {
              background?: string | null;
              color?: string | null;
            } | null;
          } | null;
          main?: {
            light?: {
              background?: string | null;
              color?: string | null;
            } | null;
            dark?: {
              background?: string | null;
              color?: string | null;
            } | null;
          } | null;
          bottom?: {
            light?: {
              background?: string | null;
              color?: string | null;
            } | null;
            dark?: {
              background?: string | null;
              color?: string | null;
            } | null;
          } | null;
        } | null;
        sider?: {
          light?: {
            background?: string | null;
            color?: string | null;
          } | null;
          dark?: {
            background?: string | null;
            color?: string | null;
          } | null;
          left?: {
            light?: {
              background?: string | null;
              color?: string | null;
            } | null;
            dark?: {
              background?: string | null;
              color?: string | null;
            } | null;
            sticky?: boolean | null;
            width?: number | null;
          } | null;
          right?: {
            light?: {
              background?: string | null;
              color?: string | null;
            } | null;
            dark?: {
              background?: string | null;
              color?: string | null;
            } | null;
            sticky?: boolean | null;
            width?: number | null;
          } | null;
        } | null;
        footer?: {
          light?: {
            background?: string | null;
            color?: string | null;
          } | null;
          dark?: {
            background?: string | null;
            color?: string | null;
          } | null;
          main?: {
            light?: {
              background?: string | null;
              color?: string | null;
            } | null;
            dark?: {
              background?: string | null;
              color?: string | null;
            } | null;
          } | null;
          bottom?: {
            light?: {
              background?: string | null;
              color?: string | null;
            } | null;
            dark?: {
              background?: string | null;
              color?: string | null;
            } | null;
          } | null;
        } | null;
      };
    };
  };
  locale: {
    current: string;
  };
  viewer: PhiBlockRuntime["viewer"];
};
