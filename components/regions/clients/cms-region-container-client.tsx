"use client";

import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";

import { PhiButtonControl } from "../../controls/phi-button-control";
import { type PhiCmsBackgroundWidgetConfig } from "../../widgets/config/background";
import type { PhiCmsBorderWidgetConfig } from "../../../types/cms-config";
import { PhiSurfaceGroundLayer } from "../../surface/phi-surface-ground";
import { resolvePhiShellRegionZIndex } from "../../../helpers/shell-region-style";
import type { PhiCmsRegionConfig, PhiCmsRegionKey } from "../../../types";

import { PhiBackgroundMotionLayer } from "../../cms/clients/phi-background-motion-layer-lazy";
import type {
  PhiRenderableBlockRuntimeContext,
  PhiSignalScope,
} from "../../../types";
import { PhiIcon } from "../../shell/phi-icon";
import { PhiSiderContextProvider } from "../presets/clients/sider-context";
import { resolveRenderableBlockViewportEffects } from "../../../helpers/renderable-block-effects";
import {
  createPhiRenderableBlockReceiver,
  usePhiRenderableBlockRuntime,
} from "../../runtime/renderable-block-runtime";
import { usePhiConfig } from "../../root/phi-config-provider";
import { PhiEffectsReadyTrigger } from "../../../plugins/runtime/phi-effects-ready-trigger";
import { PhiSlotChildEffectsVisibilityObserver } from "../../../plugins/runtime/phi-slot-child-effects-visibility-observer";
import { PhiSlotChildViewportEffectsObserver } from "../../../plugins/runtime/phi-slot-child-viewport-effects-observer";
import { PhiFlexControl } from "../../controls/phi-flex-control";
import { resolvePhiCmsRegionShell, type PhiCmsRegionShellTheme } from "../phi-cms-region-shell";

type PhiCmsRegionContainerClientProps = {
  children: ReactNode;
  className?: string;
  regionKey: PhiCmsRegionKey;
  config?: PhiCmsRegionConfig;
  shellTheme?: PhiCmsRegionShellTheme;
  style?: CSSProperties;
  regionType?: number;
  previewMode?: boolean;
  runtime: Pick<
    PhiRenderableBlockRuntimeContext,
    "siteKey" | "publicUrl" | "defaultLang" | "area" | "pageKey"
  >;
  routeScope: Extract<PhiSignalScope, "area" | "page">;
};

/**
 * A Region that stays alive after it has rendered: it takes signals, runs effects, collapses, or moves
 * its Background. What it draws comes from the Region-shell resolver it shares with the static renderer,
 * fed with the config merged with the live runtime state and painted in the live colour mode. What is
 * left here is what only a live Region has.
 */
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
    background: initialConfig?.surface?.background ?? undefined,
    border: initialConfig?.surface?.border ?? undefined,
    shadow: initialConfig?.surface?.shadow ?? undefined,
    effects: initialConfig?.effects,
    runtime: {
      ...runtime,
      area: runtime.area,
      regionKey,
    },
  });
  const resolvedVisibility = blockRuntime.state.visibility ?? "visible";
  const runtimeBackground = blockRuntime.state.background;
  const runtimeBorder = blockRuntime.state.border;
  const config: PhiCmsRegionConfig = {
    ...(initialConfig ?? {}),
    visibility: resolvedVisibility,
    viewportFlags: blockRuntime.state.viewportFlags,
    enabled: blockRuntime.state.enabled ?? true,
    size:
      resolvedVisibility === "collapsed"
        ? blockRuntime.state.collapsedSizeHint ?? blockRuntime.state.size
        : blockRuntime.state.size,
    minSize: blockRuntime.state.minSize,
    maxSize: blockRuntime.state.maxSize,
    collapsedSizeHint: blockRuntime.state.collapsedSizeHint,
    zIndex: blockRuntime.state.zIndex,
    opacity: blockRuntime.state.opacity,
    effects: blockRuntime.state.effects,
    /*
     * The Surface as it stands now: what a Signal set for a part wins over what the Region stored, and a
     * part no Signal touched is the stored one.
     */
    surface: {
      ...(initialConfig?.surface ?? {}),
      background:
        runtimeBackground && typeof runtimeBackground === "object" && !Array.isArray(runtimeBackground)
          ? runtimeBackground as PhiCmsBackgroundWidgetConfig
          : initialConfig?.surface?.background ?? null,
      border:
        runtimeBorder && typeof runtimeBorder === "object" && !Array.isArray(runtimeBorder)
          ? runtimeBorder as PhiCmsBorderWidgetConfig
          : initialConfig?.surface?.border ?? null,
      shadow: blockRuntime.state.shadow ?? initialConfig?.surface?.shadow ?? null,
    },
  };
  const [collapsed, setCollapsed] = useState(false);

  const shell = resolvePhiCmsRegionShell({
    regionKey,
    config,
    shellTheme,
    paint: {
      kind: "live",
      mode: liveThemeMode,
      tokens: {
        colorBgElevated: token.colorBgElevated,
        colorBgContainer: token.colorBgContainer,
        colorBgSpotlight: token.colorBgSpotlight,
        colorTextLightSolid: token.colorTextLightSolid,
        colorText: token.colorText,
      },
    },
    animatesBackground: true,
    previewMode,
    regionType,
    className,
    style,
  });
  if (shell == null) {
    return null;
  }

  const effectsTrigger = shell.attributes["data-phi-effects-trigger"];
  const viewportEffects = resolveRenderableBlockViewportEffects(shell.effectsConfig);
  const attributes = {
    ...shell.attributes,
    "data-phi-effects-state":
      blockRuntime.state.effectsState ?? shell.attributes["data-phi-effects-state"],
  };
  const backgroundMotionLayer = shell.animatesBackground && shell.backgroundConfig != null
    ? <PhiBackgroundMotionLayer config={shell.backgroundConfig} />
    : <PhiSurfaceGroundLayer ground={shell.ground} />;
  const effectObservers = (
    <>
      {effectsTrigger === "on_visible" ? (
        <PhiSlotChildEffectsVisibilityObserver
          once={shell.attributes["data-phi-effects-once"] !== "false"}
        />
      ) : null}
      {effectsTrigger === "on_ready" ? <PhiEffectsReadyTrigger /> : null}
      {viewportEffects.length > 0 ? (
        <PhiSlotChildViewportEffectsObserver effects={viewportEffects} />
      ) : null}
    </>
  );

  if (shell.family !== "sider") {
    const Element = shell.element as "header" | "footer" | "div";
    return (
      <Element {...attributes} style={shell.style}>
        {backgroundMotionLayer}
        <div className="phi-cms-region-shell__content" style={shell.contentStyle}>
          {children}
        </div>
        {effectObservers}
      </Element>
    );
  }

  const isRightSider = regionKey === "sider_right";
  const collapsible = config.collapsible === true;
  const isFullHeight = config.fullHeight === true;
  const isCollapsed = collapsible && collapsed;
  const collapsedWidth = shell.siderCollapsedWidth;
  const collapseIcon = typeof config.collapseIcon === "string" ? config.collapseIcon : undefined;
  const contentTransform = isCollapsed
    ? `translate3d(${isRightSider ? "6px" : "-6px"}, 0, 0) scale(0.995)`
    : "translate3d(0, 0, 0) scale(1)";

  return (
    <aside
      {...attributes}
      data-phi-sider-collapsed={isCollapsed ? "true" : undefined}
      style={{
        transition:
          "width 180ms ease, min-width 180ms ease, max-width 180ms ease, flex-basis 180ms ease",
        ...shell.style,
        /*
         * The inner column below is a flex column that fills the Sider, and only a full-height Sider has
         * a height for it to fill; the static renderer has no such column and needs neither.
         */
        ...(isFullHeight ? { display: "flex", flexDirection: "column" } : {}),
        // A collapsed Sider is its collapsed width, whatever bounds the expanded one states.
        ...(isCollapsed
          ? { width: collapsedWidth, minWidth: collapsedWidth, maxWidth: collapsedWidth }
          : {}),
      }}
    >
      {backgroundMotionLayer}
      <PhiSiderContextProvider value={{ collapsed: isCollapsed, collapsedWidth }}>
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
          {collapsible ? (
            <PhiFlexControl
              align="center"
              justify={collapsed ? "center" : isRightSider ? "flex-end" : "flex-start"}
              style={{
                minHeight: collapsedWidth,
                paddingTop: 0,
                paddingInline: collapsed ? 0 : token.paddingXS,
                paddingBottom: 0,
                borderBottom: shell.borderLine,
                zIndex: 1,
              }}
            >
              <PhiButtonControl
                type="text"
                ariaLabel={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                icon={
                  collapseIcon ? (
                    <PhiIcon name={collapseIcon} />
                  ) : isRightSider ? (
                    collapsed ? <PhiIcon name="menu-fold" size="inherit" /> : <PhiIcon name="menu-unfold" size="inherit" />
                  ) : collapsed ? (
                    <PhiIcon name="menu-unfold" size="inherit" />
                  ) : (
                    <PhiIcon name="menu-fold" size="inherit" />
                  )
                }
                style={{
                  minWidth: collapsedWidth,
                  height: collapsedWidth,
                  paddingInline: 0,
                  color: liveThemeMode === "dark" ? token.colorTextLightSolid : token.colorTextSecondary,
                }}
                onClick={() => setCollapsed((value) => !value)}
              />
            </PhiFlexControl>
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
                ...shell.contentStyle,
                transition: collapsible
                  ? "opacity 180ms ease"
                  : "transform 220ms cubic-bezier(0.2, 0, 0, 1), opacity 180ms ease",
                transform: collapsible ? "none" : contentTransform,
                transformOrigin: isRightSider ? "top right" : "top left",
                opacity: isCollapsed ? 0.985 : 1,
                willChange: collapsible ? "opacity" : "transform, opacity",
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
