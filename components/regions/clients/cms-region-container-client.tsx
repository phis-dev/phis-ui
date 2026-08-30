"use client";

import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";
import { Button, Flex } from "antd";
import { MenuFoldOutlined, MenuUnfoldOutlined } from "@ant-design/icons";
import { resolvePhiBorderWidgetStyle } from "../../../helpers/border-widget-style";
import {
  resolvePhiBackgroundMotion,
  resolvePhiBackgroundMotionHostStyle,
  resolvePhiBackgroundWidgetStyle,
  type PhiCmsBackgroundWidgetConfig,
} from "../../widgets/config/background";
import {
  resolvePhiShellRegionChrome,
  resolvePhiShellRegionTypography,
  resolvePhiShellRegionZIndex,
  resolvePhiShellSiderCollapsedWidth,
  resolvePhiShellSiderWidth,
} from "../../../helpers/shell-region-style";
import { combinePhiBoxShadows } from "../../../helpers/layout-style";
import { hasPhiFlag } from "../../../helpers/flags";
import { PhiCmsFlags } from "../../../constants/phi-cms";
import type { PhiCmsRegionConfig, PhiCmsRegionKey } from "../../../types";

import { PhiBackgroundMotionLayer } from "../../cms/clients/phi-background-motion-layer-lazy";
import type { PhiBlockRuntime } from "../../../types/widget-runtime";
import type {
  PhiRenderableBlock,
  PhiRenderableBlockRuntimeContext,
  PhiSignalScope,
} from "../../../types";
import type { PhiCmsBorderWidgetConfig } from "../../../types/cms-config";
import { PhiIcon } from "../../shell/phi-icon";
import { PhiSiderContextProvider } from "../presets/clients/sider-context";
import {
  resolveRenderableBlockEffectsAttributes,
  resolveRenderableBlockEffectsStyle,
  resolveRenderableBlockViewportEffects,
} from "../../../helpers/renderable-block-effects";
import {
  createPhiRenderableBlockReceiver,
  usePhiRenderableBlockRuntime,
} from "../../runtime/renderable-block-runtime";
import { usePhiConfig } from "../../root/phi-config-provider";
import { PhiSlotChildEffectsVisibilityObserver } from "../../../plugins/runtime/phi-slot-child-effects-visibility-observer";
import { PhiSlotChildViewportEffectsObserver } from "../../../plugins/runtime/phi-slot-child-viewport-effects-observer";
import { resolvePhiPaddingStyle } from "../../layouts/phi-layout-contract";

function normalizeCssLength(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? value : undefined;
}

function isBorderConfig(value: unknown): value is PhiCmsBorderWidgetConfig {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

type PhiRuntimeShellTheme = NonNullable<NonNullable<PhiBlockRuntime["site"]["theme"]>["shell"]>;

type PhiCmsRegionContainerClientProps = {
  children: ReactNode;
  className?: string;
  regionKey: PhiCmsRegionKey;
  config?: PhiCmsRegionConfig;
  shellTheme?: PhiRuntimeShellTheme;
  style?: CSSProperties;
  regionType?: number;
  previewMode?: boolean;
  runtime: Pick<
    PhiRenderableBlockRuntimeContext,
    "siteKey" | "publicUrl" | "defaultLang" | "area" | "pageKey"
  >;
  routeScope: Extract<PhiSignalScope, "area" | "page">;
};

export function PhiCmsRegionContainerClient({
  children,
  className,
  regionKey,
  config: initialConfig,
  shellTheme,
  style,
  regionType,
  previewMode = false,
  runtime,
  routeScope,
}: PhiCmsRegionContainerClientProps) {
  const { mode: liveThemeMode, token } = usePhiConfig();
  const receiver = createPhiRenderableBlockReceiver("region", regionKey);
  const blockRuntime = usePhiRenderableBlockRuntime({
    blockId: null,
    receiver,
    signalScope: routeScope,
    visibility: initialConfig?.visibility,
    enabled: initialConfig?.enabled,
    zIndex:
      initialConfig?.zIndex ??
      resolvePhiShellRegionZIndex(regionKey, initialConfig?.fullHeight === true),
    opacity: initialConfig?.opacity,
    size: initialConfig?.size,
    minSize: initialConfig?.minSize,
    maxSize: initialConfig?.maxSize,
    collapsedSizeHint: initialConfig?.collapsedSizeHint,
    background: initialConfig?.backgroundConfig ?? initialConfig?.background,
    border:
      initialConfig?.border && typeof initialConfig.border !== "boolean"
        ? initialConfig.border
        : undefined,
    effect: initialConfig?.effect,
    shadow: initialConfig?.shadow,
    effects: initialConfig?.effects,
    runtime: {
      ...runtime,
      area: runtime.area,
      regionKey,
    },
  });
  const resolvedVisibility = blockRuntime.state.visibility ?? "visible";
  const resolvedEnabled = blockRuntime.state.enabled ?? true;
  const resolvedSize =
    resolvedVisibility === "collapsed"
      ? blockRuntime.state.collapsedSizeHint ?? blockRuntime.state.size
      : blockRuntime.state.size;
  const runtimeBackground = blockRuntime.state.background;
  const config: PhiCmsRegionConfig = {
    ...(initialConfig ?? {}),
    visibility: resolvedVisibility,
    viewportFlags: blockRuntime.state.viewportFlags,
    enabled: resolvedEnabled,
    size: resolvedSize,
    minSize: blockRuntime.state.minSize,
    maxSize: blockRuntime.state.maxSize,
    collapsedSizeHint: blockRuntime.state.collapsedSizeHint,
    zIndex: blockRuntime.state.zIndex,
    opacity: blockRuntime.state.opacity,
    effects: blockRuntime.state.effects,
    background:
      typeof runtimeBackground === "string"
        ? runtimeBackground
        : initialConfig?.background,
    backgroundConfig:
      runtimeBackground && typeof runtimeBackground === "object" && !Array.isArray(runtimeBackground)
        ? runtimeBackground as PhiCmsBackgroundWidgetConfig
        : null,
    border: (blockRuntime.state.border ?? initialConfig?.border) as PhiCmsRegionConfig["border"],
    shadow: blockRuntime.state.shadow ?? initialConfig?.shadow,
    effect: blockRuntime.state.effect ?? initialConfig?.effect,
  };
  const [collapsed, setCollapsed] = useState(false);

  if (resolvedVisibility === "hidden") {
    return null;
  }
  const isHeader =
    regionKey === "header_top" || regionKey === "header_main" || regionKey === "header_bottom";
  const isFooter =
    regionKey === "footer_top" || regionKey === "footer_main" || regionKey === "footer_bottom";
  const isSider = regionKey === "sider_left" || regionKey === "sider_right";
  const resolvedMode = liveThemeMode;
  const resolvedHeight = normalizeCssLength(config?.size?.height);
  const resolvedWidth = normalizeCssLength(config?.size?.width) ?? resolvePhiShellSiderWidth(shellTheme);
  const resolvedCollapsedWidth =
    normalizeCssLength(config?.collapsedWidth) ?? resolvePhiShellSiderCollapsedWidth(shellTheme);
  const resolvedTop = normalizeCssLength(config?.offsetTop) ?? 0;
  const resolvedBorderRadius = normalizeCssLength(config?.borderRadius);
  const resolvedFullHeight = config?.fullHeight === true;
  const resolvedFullHeightSize =
    resolvedFullHeight && !resolvedHeight
      ? `calc(100dvh - ${typeof resolvedTop === "number" ? `${resolvedTop}px` : resolvedTop})`
      : resolvedHeight;
  const shouldStickSider = config?.sticky === true || resolvedFullHeight;
  const resolvedZIndex =
    config?.zIndex ?? resolvePhiShellRegionZIndex(regionKey, resolvedFullHeight);
  const resolvedCollapsible = config?.collapsible === true;
  const resolvedCollapseIcon = typeof config?.collapseIcon === "string" ? config.collapseIcon : undefined;
  const isCollapsed = hasPhiFlag(config?.flags, PhiCmsFlags.Collapsed);
  const regionBackgroundConfig =
    config?.backgroundConfig != null ? (config.backgroundConfig as PhiCmsBackgroundWidgetConfig) : null;
  const regionBackgroundMotion = resolvePhiBackgroundMotion(regionBackgroundConfig);
  const regionBackgroundStyle = regionBackgroundConfig
    ? regionBackgroundMotion == null
      ? resolvePhiBackgroundWidgetStyle({ ...regionBackgroundConfig, effect: null })
      : resolvePhiBackgroundMotionHostStyle({ ...regionBackgroundConfig, effect: null })
    : null;
  const regionBackgroundBoxShadow =
    typeof regionBackgroundStyle?.boxShadow === "string" ? regionBackgroundStyle.boxShadow : undefined;
  const resolvedChrome = resolvePhiShellRegionChrome(regionKey, shellTheme, {
    mode: resolvedMode,
    background: typeof config?.background === "string" ? config.background : undefined,
    shadow: config?.shadow,
    effect: config?.effect,
    tokens: {
      colorBgElevated: token.colorBgElevated,
      colorBgContainer: token.colorBgContainer,
      colorBgSpotlight: token.colorBgSpotlight,
      colorTextLightSolid: token.colorTextLightSolid,
      colorText: token.colorText,
    },
  });
  const resolvedBackground = resolvedChrome.background;
  const resolvedTextColor = resolvedChrome.color;
  const resolvedShadow = resolvedChrome.shadow;
  const resolvedTypography = resolvePhiShellRegionTypography(regionKey, shellTheme, {
    fontSize: config?.fontSize,
    lineHeight: config?.lineHeight,
  });
  const fallbackBorder = `1px solid ${token.colorBorderSecondary}`;
  const resolvedBorderStyle =
    config?.border == null || config.border === false
      ? {}
      : isBorderConfig(config.border)
        ? resolvePhiBorderWidgetStyle(config.border)
        : isHeader
          ? ({ borderBottom: typeof config.border === "string" ? config.border : fallbackBorder } satisfies CSSProperties)
          : isFooter
            ? ({ borderTop: typeof config.border === "string" ? config.border : fallbackBorder } satisfies CSSProperties)
            : isSider
              ? (regionKey === "sider_left"
                  ? ({ borderInlineEnd: typeof config.border === "string" ? config.border : fallbackBorder } satisfies CSSProperties)
                  : ({ borderInlineStart: typeof config.border === "string" ? config.border : fallbackBorder } satisfies CSSProperties))
              : ({ border: typeof config.border === "string" ? config.border : fallbackBorder } satisfies CSSProperties);
  const collapseToolbarBorder =
    config?.border === true
      ? fallbackBorder
      : typeof config?.border === "string"
        ? config.border
        : isBorderConfig(config?.border)
          ? resolvePhiBorderWidgetStyle(config.border).border
          : undefined;
  const isRightSider = regionKey === "sider_right";
  if (isCollapsed && previewMode && regionKey !== "header_bottom") {
    return null;
  }

  const content = (() => {
  const regionPaddingStyle = resolvePhiPaddingStyle({
    padding: config.padding,
    paddingTop: config.paddingTop,
    paddingRight: config.paddingRight,
    paddingBottom: config.paddingBottom,
    paddingLeft: config.paddingLeft,
  });
  const baseStyle = (
    isHeader
      ? {
            ...(regionBackgroundStyle ?? {}),
            position: config?.sticky ? "sticky" : "relative",
            top: config?.sticky ? resolvedTop : undefined,
            insetBlockStart: config?.sticky ? resolvedTop : undefined,
            zIndex: resolvedZIndex,
            ...resolvedChrome.effectStyle,
            background:
              regionBackgroundStyle == null
                ? resolvedBackground
                : undefined,
            boxShadow: combinePhiBoxShadows(regionBackgroundBoxShadow, resolvedChrome.effectStyle?.boxShadow, resolvedShadow),
            ...(resolvedHeight ? { height: resolvedHeight } : {}),
            color: resolvedTextColor,
            ...resolvedBorderStyle,
            ...(resolvedTypography.fontSize ? { fontSize: resolvedTypography.fontSize } : {}),
            ...(resolvedTypography.lineHeight ? { lineHeight: resolvedTypography.lineHeight } : {}),
            }
          : isFooter
          ? {
              ...(regionBackgroundStyle ?? {}),
              position: "relative",
              ...resolvedChrome.effectStyle,
              background:
                regionBackgroundStyle == null ? resolvedBackground : undefined,
              boxShadow: combinePhiBoxShadows(regionBackgroundBoxShadow, resolvedChrome.effectStyle?.boxShadow, resolvedShadow),
              zIndex: resolvedZIndex,
              ...(resolvedHeight ? { height: resolvedHeight } : {}),
              color: resolvedTextColor,
              ...resolvedBorderStyle,
              ...(resolvedTypography.fontSize ? { fontSize: resolvedTypography.fontSize } : {}),
              ...(resolvedTypography.lineHeight ? { lineHeight: resolvedTypography.lineHeight } : {}),
            }
          : isSider
            ? {
              ...(regionBackgroundStyle ?? {}),
                ...resolvedChrome.effectStyle,
                background:
                  regionBackgroundStyle == null ? resolvedBackground : undefined,
                boxShadow: combinePhiBoxShadows(regionBackgroundBoxShadow, resolvedChrome.effectStyle?.boxShadow, resolvedShadow),
                ...resolvedBorderStyle,
                ...(resolvedWidth
                  ? {
                      width: resolvedWidth,
                      minWidth: resolvedWidth,
                      maxWidth: resolvedWidth,
                    }
                : {}),
                overflowX: "visible",
                overflowY: resolvedFullHeight ? "auto" : "visible",
                alignSelf: resolvedFullHeight ? "stretch" : "start",
                display: resolvedFullHeight ? "flex" : undefined,
                flexDirection: resolvedFullHeight ? "column" : undefined,
                flex: resolvedFullHeight ? "1 1 auto" : undefined,
                minHeight: resolvedFullHeight ? 0 : undefined,
                color: resolvedTextColor,
                position: shouldStickSider ? "sticky" : "relative",
                top: shouldStickSider ? resolvedTop : undefined,
                zIndex: resolvedZIndex,
                ...(resolvedFullHeightSize ? { height: resolvedFullHeightSize } : {}),
              ...(resolvedFullHeight ? { minBlockSize: resolvedFullHeightSize ?? "100dvh" } : {}),
              ...(resolvedTypography.fontSize ? { fontSize: resolvedTypography.fontSize } : {}),
              ...(resolvedTypography.lineHeight ? { lineHeight: resolvedTypography.lineHeight } : {}),
              }
            : {
                ...(regionBackgroundStyle ?? {}),
                position: "relative",
                zIndex: resolvedZIndex,
                ...resolvedChrome.effectStyle,
                background:
                  regionBackgroundStyle == null ? resolvedBackground : undefined,
                width: "100%",
                boxShadow: combinePhiBoxShadows(regionBackgroundBoxShadow, resolvedChrome.effectStyle?.boxShadow, resolvedShadow),
                ...resolvedBorderStyle,
                ...(resolvedTypography.fontSize ? { fontSize: resolvedTypography.fontSize } : {}),
                ...(resolvedTypography.lineHeight ? { lineHeight: resolvedTypography.lineHeight } : {}),
              }
  ) as CSSProperties;
  const renderableConfig: Partial<PhiRenderableBlock> = {
    visibility: resolvedVisibility,
    enabled: resolvedEnabled,
    size: resolvedSize,
    minSize: blockRuntime.state.minSize,
    maxSize: blockRuntime.state.maxSize,
    collapsedSizeHint: blockRuntime.state.collapsedSizeHint,
    zIndex: blockRuntime.state.zIndex,
    opacity: blockRuntime.state.opacity,
    effect: blockRuntime.state.effect,
    effects: blockRuntime.state.effects,
  };
  const effectsStyle = resolveRenderableBlockEffectsStyle(renderableConfig);
  const effectsAttributes = resolveRenderableBlockEffectsAttributes(renderableConfig);
  const viewportEffects = resolveRenderableBlockViewportEffects(renderableConfig);
  const shouldObserveVisibility = effectsAttributes?.["data-phi-effects-trigger"] === "on_visible";
  const runtimeStyle = {
    borderRadius: resolvedBorderRadius,
    ...(resolvedSize?.width == null ? {} : { width: resolvedSize.width }),
    ...(resolvedSize?.height == null ? {} : { height: resolvedSize.height }),
    ...(blockRuntime.state.minSize?.width == null ? {} : { minWidth: blockRuntime.state.minSize.width }),
    ...(blockRuntime.state.minSize?.height == null ? {} : { minHeight: blockRuntime.state.minSize.height }),
    ...(blockRuntime.state.maxSize?.width == null ? {} : { maxWidth: blockRuntime.state.maxSize.width }),
    ...(blockRuntime.state.maxSize?.height == null ? {} : { maxHeight: blockRuntime.state.maxSize.height }),
    ...(blockRuntime.state.opacity == null ? {} : { opacity: blockRuntime.state.opacity }),
    ...(resolvedEnabled
      ? {}
      : {
          opacity: Math.min(blockRuntime.state.opacity ?? 1, 0.5),
          pointerEvents: "none" as const,
        }),
    ...(resolvedVisibility === "collapsed" ? { overflow: "hidden" as const } : {}),
    ...effectsStyle,
  } satisfies CSSProperties;
  const mergedStyle = {
    ...baseStyle,
    ...(regionBackgroundMotion == null ? {} : { isolation: "isolate" as const }),
    ...style,
    ...runtimeStyle,
  } satisfies CSSProperties;
  const backgroundMotionLayer = regionBackgroundMotion != null && regionBackgroundConfig != null
    ? <PhiBackgroundMotionLayer config={regionBackgroundConfig} />
    : null;
  const effectObservers = (
    <>
      {shouldObserveVisibility ? (
        <PhiSlotChildEffectsVisibilityObserver
          once={effectsAttributes?.["data-phi-effects-once"] !== "false"}
        />
      ) : null}
      {viewportEffects.length > 0 ? (
        <PhiSlotChildViewportEffectsObserver effects={viewportEffects} />
      ) : null}
    </>
  );

  const resolvedRenderedSiderWidth =
    isSider && resolvedCollapsible && collapsed ? resolvedCollapsedWidth : resolvedWidth;
  const resolvedSiderContainerStyle = (
    isSider
      ? {
          ...mergedStyle,
          ...(resolvedRenderedSiderWidth
            ? {
                width: resolvedRenderedSiderWidth,
                minWidth: resolvedRenderedSiderWidth,
                maxWidth: resolvedRenderedSiderWidth,
              }
            : {}),
        }
      : mergedStyle
  ) as CSSProperties;
  const resolvedSiderContentTransform =
    isSider && resolvedCollapsible
      ? collapsed
        ? `translate3d(${isRightSider ? "6px" : "-6px"}, 0, 0) scale(0.995)`
        : "translate3d(0, 0, 0) scale(1)"
      : "translate3d(0, 0, 0) scale(1)";

  if (isHeader) {
    return (
      <header
        data-phi-region-key={regionKey}
        data-phi-region-type={regionType}
        data-phi-renderable-block="true"
        data-phi-signal-receiver={receiver ?? undefined}
        data-phi-block-visibility={resolvedVisibility}
        data-phi-viewport-flags={blockRuntime.state.viewportFlags || undefined}
        data-phi-block-enabled={resolvedEnabled ? "true" : "false"}
        {...effectsAttributes}
        data-phi-effects-state={blockRuntime.state.effectsState ?? effectsAttributes?.["data-phi-effects-state"]}
        className={["phi-cms-region-shell", className].filter(Boolean).join(" ")}
        style={{ padding: 0, ...mergedStyle, margin: 0 }}
      >
        {backgroundMotionLayer}
        <div className="phi-cms-region-shell__content" style={regionPaddingStyle}>
          {children}
        </div>
        {effectObservers}
      </header>
      );
    }

    if (isSider) {
      const chromeMode = resolvedCollapsible;

      return (
        <aside
          data-phi-region-key={regionKey}
          data-phi-region-type={regionType}
          data-phi-renderable-block="true"
          data-phi-signal-receiver={receiver ?? undefined}
          data-phi-block-visibility={resolvedVisibility}
          data-phi-viewport-flags={blockRuntime.state.viewportFlags || undefined}
          data-phi-block-enabled={resolvedEnabled ? "true" : "false"}
          {...effectsAttributes}
          data-phi-effects-state={blockRuntime.state.effectsState ?? effectsAttributes?.["data-phi-effects-state"]}
          data-phi-sider-collapsed={resolvedCollapsible && collapsed ? "true" : undefined}
          className={["phi-cms-region-shell", className].filter(Boolean).join(" ")}
          style={{
            padding: 0,
            transition: "width 180ms ease, min-width 180ms ease, max-width 180ms ease, flex-basis 180ms ease",
            ...resolvedSiderContainerStyle,
            margin: 0,
          } as CSSProperties}
        >
          {backgroundMotionLayer}
          <PhiSiderContextProvider
            value={{
              collapsed: resolvedCollapsible ? collapsed : false,
              collapsedWidth: resolvedCollapsedWidth,
            }}
          >
            <div
              style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                flex: "1 1 auto",
                width: "100%",
                height: "100%",
                minWidth: 0,
                minHeight: 0,
              }}
            >
              {resolvedCollapsible ? (
                <Flex
                  align="center"
                  justify={collapsed ? "center" : isRightSider ? "flex-end" : "flex-start"}
                  style={{
                    minHeight: resolvedCollapsedWidth,
                    paddingTop: 0,
                    paddingInline: collapsed ? 0 : token.paddingXS,
                    paddingBottom: 0,
                    borderBottom: collapseToolbarBorder,
                    zIndex: 1,
                  } as CSSProperties}
                >
                  <Button
                    type="text"
                    aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    icon={
                      resolvedCollapseIcon ? (
                        <PhiIcon name={resolvedCollapseIcon} />
                      ) : (
                        (() => {
                          if (isRightSider) {
                            return collapsed ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />;
                          }

                          return collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />;
                        })()
                      )
                    }
                    style={{
                      minWidth: resolvedCollapsedWidth,
                      height: resolvedCollapsedWidth,
                      paddingInline: 0,
                      color: resolvedMode === "dark" ? token.colorTextLightSolid : token.colorTextSecondary,
                    } as CSSProperties}
                    onClick={() => setCollapsed((value) => !value)}
                  />
                </Flex>
              ) : null}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  width: "100%",
                  minWidth: 0,
                  flex: "1 1 auto",
                  minHeight: 0,
                }}
              >
                <div
                  className="phi-cms-region-shell__content"
                  style={{
                    ...regionPaddingStyle,
                    transition: chromeMode
                      ? "opacity 180ms ease"
                      : "transform 220ms cubic-bezier(0.2, 0, 0, 1), opacity 180ms ease",
                    transform: chromeMode ? "none" : resolvedSiderContentTransform,
                    transformOrigin: isRightSider ? "top right" : "top left",
                    opacity: resolvedCollapsible && collapsed ? 0.985 : 1,
                    willChange: chromeMode ? "opacity" : "transform, opacity",
                  }}
                >
                  {children}
                </div>
              </div>
            </div>
          </PhiSiderContextProvider>
          {effectObservers}
        </aside>
      );
    }

    if (isFooter) {
      return (
      <footer
        data-phi-region-key={regionKey}
        data-phi-region-type={regionType}
        data-phi-renderable-block="true"
        data-phi-signal-receiver={receiver ?? undefined}
        data-phi-block-visibility={resolvedVisibility}
        data-phi-viewport-flags={blockRuntime.state.viewportFlags || undefined}
        data-phi-block-enabled={resolvedEnabled ? "true" : "false"}
        {...effectsAttributes}
        data-phi-effects-state={blockRuntime.state.effectsState ?? effectsAttributes?.["data-phi-effects-state"]}
        className={["phi-cms-region-shell", className].filter(Boolean).join(" ")}
        style={{ padding: 0, ...mergedStyle, margin: 0 } as CSSProperties}
      >
        {backgroundMotionLayer}
        <div className="phi-cms-region-shell__content" style={regionPaddingStyle}>
          {children}
        </div>
        {effectObservers}
      </footer>
    );
  }

    return (
    <div
      data-phi-region-key={regionKey}
      data-phi-region-type={regionType}
      data-phi-renderable-block="true"
      data-phi-signal-receiver={receiver ?? undefined}
      data-phi-block-visibility={resolvedVisibility}
      data-phi-viewport-flags={blockRuntime.state.viewportFlags || undefined}
      data-phi-block-enabled={resolvedEnabled ? "true" : "false"}
      {...effectsAttributes}
      data-phi-effects-state={blockRuntime.state.effectsState ?? effectsAttributes?.["data-phi-effects-state"]}
      className={["phi-cms-region-shell", className].filter(Boolean).join(" ")}
      style={{ padding: 0, ...mergedStyle, margin: 0 } as CSSProperties}
    >
      {backgroundMotionLayer}
      <div className="phi-cms-region-shell__content" style={regionPaddingStyle}>
        {children}
      </div>
      {effectObservers}
    </div>
  );
  })();

  return content;
}
