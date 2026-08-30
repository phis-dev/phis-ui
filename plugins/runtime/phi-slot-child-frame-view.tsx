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
  resolvePhiSlotChildBaseStyle,
  resolvePhiSlotChildExplicitAxes,
  resolvePhiSlotSizePolicy,
  type PhiSlotChildKind,
} from "./slot-size-policy";
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

function resolvePhiSlotChildSizeStyle(
  config: Pick<PhiRenderableBlockBase, "size" | "minSize" | "maxSize"> | null | undefined,
): CSSProperties {
  const maxWidth =
    typeof config?.maxSize?.width === "number"
      ? `min(100%, ${config.maxSize.width}px)`
      : config?.maxSize?.width;
  const maxHeight =
    typeof config?.maxSize?.height === "number"
      ? `${config.maxSize.height}px`
      : config?.maxSize?.height;

  return {
    ...(config?.size?.width == null ? {} : { width: config.size.width }),
    ...(config?.size?.height == null ? {} : { height: config.size.height }),
    ...(config?.minSize?.width == null ? {} : { minWidth: config.minSize.width }),
    ...(config?.minSize?.height == null ? {} : { minHeight: config.minSize.height }),
    ...(maxWidth == null ? {} : { maxWidth }),
    ...(maxHeight == null ? {} : { maxHeight }),
  };
}

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
  return (
    effectsAttributes?.["data-phi-effects-trigger"] === "on_visible" ||
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
  const resolvedSize =
    resolvedVisibility === "collapsed"
      ? config?.collapsedSizeHint ?? config?.size
      : config?.size;
  const resolvedConfig = { ...config, size: resolvedSize };
  const policy = resolvePhiSlotSizePolicy(slotSizePolicy, kind);
  const explicitAxes = resolvePhiSlotChildExplicitAxes(resolvedConfig);
  const resolvedExplicitInlineSize = explicitInlineSize ?? explicitAxes.explicitInlineSize;
  const resolvedExplicitBlockSize = explicitBlockSize ?? explicitAxes.explicitBlockSize;
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
        minInlineSize: resolvedConfig.minSize?.width ?? undefined,
        minBlockSize: resolvedConfig.minSize?.height ?? undefined,
        maxInlineSize: resolvedConfig.maxSize?.width ?? undefined,
        maxBlockSize: resolvedConfig.maxSize?.height ?? undefined,
      })}
      style={{
        ...resolvePhiSlotChildBaseStyle(policy),
        ...resolvePhiSlotChildSizeStyle(resolvedConfig),
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
