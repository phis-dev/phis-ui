import type { CSSProperties, ReactNode } from "react";

import type {
  PhiBlockRuntime,
  PhiCmsRegionConfig,
  PhiCmsRegionKey,
  PhiSignalScope,
} from "../../types";
import { isPhiCmsPageOwnedRegion } from "../../helpers/cms-region-keys";
import { PhiCmsRegionStatic } from "./phi-cms-region-static";
import {
  resolveRenderableBlockEffectsAttributes,
  resolveRenderableBlockViewportEffects,
} from "../../helpers/renderable-block-effects";
import { PhiRuntimeModuleRenderClientHost } from "../runtime/runtime-module-render-client-manifest";
import { PhiRuntimeRenderClientType } from "../../constants/runtime-render-client-types";
import { resolvePhiBackgroundMotion } from "../widgets/config/background";

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
}: PhiCmsRegionContainerProps) {
  const routeScope: Extract<PhiSignalScope, "area" | "page"> =
    isPhiCmsPageOwnedRegion(regionKey) ? "page" : "area";
  const effectsConfig = config?.effects == null ? undefined : { effects: config.effects };
  const effectsAttributes = resolveRenderableBlockEffectsAttributes(effectsConfig);
  const requiresEffectsObserver =
    effectsAttributes?.["data-phi-effects-trigger"] === "on_visible" ||
    resolveRenderableBlockViewportEffects(effectsConfig).length > 0;
  const requiresClientEnhancement =
    signalParticipant ||
    config?.collapsible === true ||
    requiresEffectsObserver ||
    resolvePhiBackgroundMotion(config?.backgroundConfig) != null;

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
      }}
    />
  );
}
