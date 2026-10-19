import type { CSSProperties, ReactNode } from "react";

import type {
  PhiBlockRuntime,
  PhiCmsRegionConfig,
  PhiCmsRegionKey,
  PhiSignalScope,
} from "../../types";
import { isPhiCmsPageOwnedRegion } from "../../helpers/cms-region-keys";
import { hasPhiFlag } from "../../helpers/flags";
import { PhiCmsFlags } from "../../constants/phi-cms";
import { PhiCmsRegionStatic } from "./phi-cms-region-static";
import {
  resolveRenderableBlockEffectsAttributes,
  resolveRenderableBlockViewportEffects,
} from "../../helpers/renderable-block-effects";
import { PhiRuntimeModuleRenderClientHost } from "../runtime/runtime-module-render-client-manifest";
import { PhiRuntimeRenderClientType } from "../../constants/runtime-render-client-types";
import { resolvePhiBackgroundMotion } from "../widgets/config/background";
import { readPhiCmsRegionReveal } from "../../helpers/region-page-scope";
import type { PhiCmsResolvedRegionPageScope } from "../../types/cms-presets";

type PhiRuntimeShellTheme = NonNullable<NonNullable<PhiBlockRuntime["site"]["theme"]>["shell"]>;

export type PhiCmsRegionContainerProps = {
  children: ReactNode;
  className?: string;
  regionKey: PhiCmsRegionKey;
  config?: PhiCmsRegionConfig;
  shellTheme?: PhiRuntimeShellTheme;
  style?: CSSProperties;
  regionType?: number;
  previewMode?: boolean;
  runtime: Pick<PhiBlockRuntime, "site" | "locale" | "area" | "page">;
  signalParticipant?: boolean;
  /** The Pages this Region stands on, resolved for this render; null where it stands on every Page. */
  pageScope?: PhiCmsResolvedRegionPageScope | null;
};

export function PhiCmsRegionContainer({
  children,
  className,
  regionKey,
  config,
  shellTheme,
  style,
  regionType,
  previewMode = false,
  runtime,
  signalParticipant = false,
  pageScope = null,
}: PhiCmsRegionContainerProps) {
  const routeScope: Extract<PhiSignalScope, "area" | "page"> =
    isPhiCmsPageOwnedRegion(regionKey) ? "page" : "area";
  const effectsConfig = config?.effects == null ? undefined : { effects: config.effects };
  const effectsAttributes = resolveRenderableBlockEffectsAttributes(effectsConfig);
  const effectsTrigger = effectsAttributes?.["data-phi-effects-trigger"];
  const requiresEffectsObserver =
    effectsTrigger === "on_visible" ||
    effectsTrigger === "on_ready" ||
    resolveRenderableBlockViewportEffects(effectsConfig).length > 0;
  // Which Page the visitor is on is a question only the browser can answer after a link was followed.
  const pageScoped = !previewMode && pageScope != null;
  const requiresClientEnhancement =
    signalParticipant ||
    pageScoped ||
    (!previewMode && readPhiCmsRegionReveal(regionKey, config) !== "always") ||
    hasPhiFlag(config?.flags, PhiCmsFlags.Collapsible) ||
    requiresEffectsObserver ||
    resolvePhiBackgroundMotion(config?.surface?.background) != null;

  if (!requiresClientEnhancement) {
    return (
      <PhiCmsRegionStatic
        className={className}
        regionKey={regionKey}
        config={config}
        shellTheme={shellTheme}
        style={style}
        regionType={regionType}
        previewMode={previewMode}
      >
        {children}
      </PhiCmsRegionStatic>
    );
  }

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiRuntimeRenderClientType.RegionContainerEnhancer}
      componentProps={{
        children,
        className,
        regionKey,
        config,
        shellTheme,
        style,
        regionType,
        previewMode,
        runtime: {
          siteKey: runtime.site.key,
          publicUrl: runtime.site.publicUrl ?? null,
          defaultLang: runtime.locale.current,
          area: runtime.area,
          pageKey: runtime.page?.path ?? null,
        },
        routeScope,
        pageScope: pageScoped ? pageScope : null,
        // The prefixes the browser strips before it asks the Page scope, which are the Site's locales.
        availableLocales: pageScoped ? runtime.site.availableLocales.map((option) => option.code) : undefined,
      }}
    />
  );
}
