import type {
  CSSProperties,
  MouseEventHandler,
  PointerEventHandler,
  ReactNode,
} from "react";

import type {
  PhiRenderableBlock,
  PhiRenderableBlockBase,
  PhiSlotSizePolicy,
  PhiCmsInstanceId,
} from "../../types";
import {
  resolveRenderableBlockEffectsAttributes,
  resolveRenderableBlockEffectsStyle,
  resolveRenderableBlockStaticEffectsStyle,
  resolveRenderableBlockViewportEffects,
} from "../../helpers/renderable-block-effects";
import { resolvePhiBorderWidgetStyle } from "../../helpers/border-widget-style";
import { resolvePhiBackgroundWidgetStyle } from "../../components/widgets/config/background";
import { combinePhiBoxShadows, resolvePhiShadow } from "../../helpers/layout-style";
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

function resolvePhiSlotChildBorderStyle(border: PhiRenderableBlockBase["border"]): CSSProperties {
  if (border == null) {
    return {};
  }
  if (typeof border === "string") {
    return { border };
  }
  return typeof border === "object" && !Array.isArray(border)
    ? resolvePhiBorderWidgetStyle(border)
    : {};
}

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
  const resolvedBackgroundStyle = resolvedConfig.background == null
    ? {}
    : resolvePhiBackgroundWidgetStyle(resolvedConfig.background);

  return (
    <div
      hidden={resolvedVisibility === "hidden"}
      className={[buildPhiSlotChildClassName(policy), className, resolvedConfig.className].filter(Boolean).join(" ")}
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
        ...resolvedBackgroundStyle,
        ...resolvePhiSlotChildBorderStyle(resolvedConfig.border),
        ...(resolvedConfig.zIndex == null ? {} : { zIndex: resolvedConfig.zIndex }),
        ...(kind !== "widget"
          ? {}
          : {
              boxShadow: combinePhiBoxShadows(
                resolvedBackgroundStyle.boxShadow,
                resolvePhiShadow(resolvedConfig.shadow),
              ),
            }),
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
      {children}
    </div>
  );
}
