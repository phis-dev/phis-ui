import type {
  CSSProperties,
  MouseEventHandler,
  PointerEventHandler,
  ReactNode,
} from "react";

import type {
  PhiRenderableBlock,
  PhiSlotSizePolicy,
  PhiCmsInstanceId,
} from "../../types";
import type { PhiSurfacePolicy } from "../../types/surface";
import {
  resolveRenderableBlockEffectsAttributes,
  resolveRenderableBlockEffectsStyle,
  resolveRenderableBlockStaticEffectsStyle,
  resolveRenderableBlockViewportEffects,
} from "../../helpers/renderable-block-effects";
import { resolvePhiSurfaceStyle } from "../../helpers/surface-style";
import { PHI_LAYOUT_SURFACE_RADIUS } from "../../components/layouts/phi-layout-contract";
import { PhiSurfaceGroundLayer } from "../../components/surface/phi-surface-ground";
import { PhiSurfaceTone } from "../../components/surface/phi-surface-tone";
import {
  buildPhiSlotChildClassName,
  buildPhiSlotChildDataAttributes,
  resolvePhiEffectiveSlotSizePolicy,
  resolvePhiSlotChildBaseStyle,
  resolvePhiSlotChildExplicitAxes,
  resolvePhiSlotChildSizeConstraints,
  resolvePhiSlotChildSizeStyle,
  resolvePhiSlotSizePolicy,
  type PhiSlotChildKind,
} from "./slot-size-policy";
import { resolvePhiRenderableBlockGeometry } from "../../types/renderable-block-geometry";
import type { PhiRenderableBlockReceiver } from "../../components/runtime/renderable-block-runtime";

export type PhiSlotChildFrameViewProps = {
  kind: PhiSlotChildKind;
  slotSizePolicy?: PhiSlotSizePolicy | null;
  /**
   * Who draws a Widget's Surface, from its plugin; the frame draws it only under `frame`, the answer
   * when nothing is said. A Layout's frame never draws one -- the Layout draws its own.
   */
  surfacePolicy?: PhiSurfacePolicy | null;
  blockId?: PhiCmsInstanceId | null;
  receiver?: PhiRenderableBlockReceiver | null;
  config?: Partial<PhiRenderableBlock> | null;
  explicitInlineSize?: boolean;
  explicitBlockSize?: boolean;
  disableEffects?: boolean;
  effectsState?: "idle" | "running";
  className?: string;
  style?: CSSProperties;
  builderWidgetTitle?: string | null;
  builderWidgetSelected?: boolean;
  builderWidgetPopupOpen?: boolean;
  onClick?: MouseEventHandler<HTMLDivElement>;
  onClickCapture?: MouseEventHandler<HTMLDivElement>;
  onPointerLeave?: PointerEventHandler<HTMLDivElement>;
  children: ReactNode;
};

export function requiresPhiSlotChildEffectsObserver(
  config: Partial<PhiRenderableBlock> | null | undefined,
  disableEffects = false,
) {
  if (disableEffects) {
    return false;
  }
  const effectsAttributes = resolveRenderableBlockEffectsAttributes(config);
  const trigger = effectsAttributes?.["data-phi-effects-trigger"];
  return (
    trigger === "on_visible" ||
    trigger === "on_ready" ||
    resolveRenderableBlockViewportEffects(config).length > 0
  );
}

export function PhiSlotChildFrameView({
  kind,
  slotSizePolicy,
  surfacePolicy,
  blockId,
  receiver,
  config,
  explicitInlineSize,
  explicitBlockSize,
  disableEffects = false,
  effectsState,
  className,
  style,
  builderWidgetTitle,
  builderWidgetSelected,
  builderWidgetPopupOpen,
  onClick,
  onClickCapture,
  onPointerLeave,
  children,
}: PhiSlotChildFrameViewProps) {
  const resolvedVisibility = config?.visibility ?? "visible";
  const resolvedEnabled = config?.enabled ?? true;
  const resolvedConfig = { ...config, visibility: resolvedVisibility };
  const geometry = resolvePhiRenderableBlockGeometry(resolvedConfig);
  const explicitAxes = resolvePhiSlotChildExplicitAxes(geometry);
  const resolvedExplicitInlineSize = explicitInlineSize ?? explicitAxes.explicitInlineSize;
  const resolvedExplicitBlockSize = explicitBlockSize ?? explicitAxes.explicitBlockSize;
  /*
   * The effective policy, not the declared one -- the frame is what states the policy to the CSS and to
   * whatever reads its attributes, and a frame carrying a width of its own while announcing "fill"
   * makes every reader below it wrong in the same way at once.
   */
  const policy = resolvePhiEffectiveSlotSizePolicy(resolvePhiSlotSizePolicy(slotSizePolicy, kind), {
    explicitInlineSize: resolvedExplicitInlineSize,
    explicitBlockSize: resolvedExplicitBlockSize,
  });
  const effectsStyle = disableEffects
    ? resolveRenderableBlockStaticEffectsStyle(resolvedConfig)
    : resolveRenderableBlockEffectsStyle(resolvedConfig);
  const effectsAttributes = disableEffects
    ? undefined
    : resolveRenderableBlockEffectsAttributes(resolvedConfig);
  const surface = kind === "widget" && (surfacePolicy ?? "frame") === "frame"
    ? resolvePhiSurfaceStyle(resolvedConfig.surface, { cornerFallback: PHI_LAYOUT_SURFACE_RADIUS })
    : null;

  return (
    <div
      hidden={resolvedVisibility === "hidden"}
      className={[buildPhiSlotChildClassName(policy), className, resolvedConfig.className, surface?.className].filter(Boolean).join(" ")}
      data-phi-slot-child-frame="true"
      data-phi-renderable-block="true"
      data-phi-slot-child-kind={kind}
      data-phi-block-id={blockId ?? undefined}
      data-phi-signal-receiver={receiver ?? undefined}
      data-phi-block-render-mode={resolvedConfig.renderMode}
      data-phi-block-visibility={resolvedVisibility}
      data-phi-viewport-flags={resolvedConfig.viewportFlags || undefined}
      data-phi-block-enabled={resolvedEnabled ? "true" : "false"}
      data-phi-debug-scaffold={resolvedConfig.debugMode ? "on" : undefined}
      data-phi-builder-widget-title={builderWidgetTitle?.trim() || undefined}
      data-phi-builder-widget-selected={builderWidgetSelected ? "true" : undefined}
      data-phi-builder-popup-open={builderWidgetPopupOpen ? "true" : undefined}
      {...effectsAttributes}
      data-phi-effects-state={effectsState ?? effectsAttributes?.["data-phi-effects-state"]}
      {...buildPhiSlotChildDataAttributes(policy, {
        explicitInlineSize: resolvedExplicitInlineSize,
        explicitBlockSize: resolvedExplicitBlockSize,
        ...resolvePhiSlotChildSizeConstraints(geometry),
      })}
      style={{
        ...resolvePhiSlotChildBaseStyle(policy),
        ...resolvePhiSlotChildSizeStyle(geometry, policy),
        ...surface?.style,
        ...(resolvedConfig.zIndex == null ? {} : { zIndex: resolvedConfig.zIndex }),
        ...(resolvedConfig.opacity == null ? {} : { opacity: resolvedConfig.opacity }),
        ...(resolvedEnabled
          ? {}
          : {
              opacity: Math.min(resolvedConfig.opacity ?? 1, 0.5),
              pointerEvents: "none",
            }),
        ...(resolvedVisibility === "collapsed" ? { overflow: "hidden" } : {}),
        ...effectsStyle,
        ...style,
      }}
      onClick={onClick}
      onClickCapture={onClickCapture}
      onPointerLeave={onPointerLeave}
    >
      <PhiSurfaceGroundLayer ground={surface?.ground ?? null} />
      {surface?.className ? (
        <PhiSurfaceTone tone={resolvedConfig.surface?.tone}>{children}</PhiSurfaceTone>
      ) : children}
    </div>
  );
}
