"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import type { PhiCmsInstanceId } from "../../types/cms-instance-id";
import {
  parsePhiCmsOverlayConfig,
  type PhiOverlayCloseSource,
  type PhiCmsOverlayResponsiveSize,
  type PhiCmsOverlayType,
} from "../../types/cms-overlay";
import { resolvePhiResponsiveValue } from "../../types/responsive";
import { readPhiControlSize, type PhiControlSize } from "../../types/control";
import { readPhiDimensionValue } from "../../types/dimension";
import type { PhiRenderableBlockSize } from "../../types/renderable-block";
import { resolvePhiCmsContainerChromeStyle } from "../../helpers/cms-container-chrome";
import type { PhiSignal, PhiSignalRoute, PhiSignalScope } from "../../types/signals";
import {
  createPhiSignalAddress,
  findPhiSignalRoutesByCapabilityId,
} from "../../types/signals";
import { usePhiSignalEmitter, PhiSignalIdentityProvider } from "../runtime/runtime-signal-identity";
import { usePhiSignalListener } from "../runtime/runtime-signal-bus";
import { registerPhiSignalInstance } from "../runtime/runtime-signal-registry";
import { usePhiSignalRuntimePartition } from "../runtime/runtime-signal-partition";
import { PhiModalControl } from "../controls/phi-modal-control";
import { PhiDrawerControl } from "../controls/phi-drawer-control";

export type PhiOverlayContainerClientProps = {
  overlayId: PhiCmsInstanceId;
  overlayType: PhiCmsOverlayType;
  config: Record<string, unknown>;
  signalScope: Extract<PhiSignalScope, "area" | "page">;
  header: ReactNode;
  body: ReactNode;
  footer: ReactNode;
};

function matchesRoute(signal: PhiSignal, route: PhiSignalRoute) {
  return route.receiver === signal.receiver &&
    route.channel === signal.channel &&
    route.action === signal.action &&
    route.valueType === signal.valueType &&
    route.valueSchema === signal.valueSchema;
}

function resolveModalWidth(width: ReturnType<typeof parsePhiCmsOverlayConfig>["width"]) {
  if (width == null || typeof width !== "object") return width;
  const responsive = width as PhiCmsOverlayResponsiveSize;
  const resolved = resolvePhiResponsiveValue(responsive, {
    compact: responsive.compact,
    medium: responsive.compact,
    wide: responsive.compact,
  });
  return { xs: resolved.compact, md: resolved.medium, lg: resolved.wide };
}

export function PhiOverlayContainerClient({
  overlayId,
  overlayType,
  config: rawConfig,
  signalScope,
  header,
  body,
  footer,
}: PhiOverlayContainerClientProps) {
  const configKey = JSON.stringify(rawConfig);
  const config = useMemo(
    () => parsePhiCmsOverlayConfig(JSON.parse(configKey) as Record<string, unknown>, overlayType),
    [configKey, overlayType],
  );
  const receiver = useMemo(() => createPhiSignalAddress("cms", overlayId), [overlayId]);
  const signalPartition = usePhiSignalRuntimePartition();
  const [open, setOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [runtimeControlSizeOverride, setRuntimeControlSizeOverride] = useState<{
    config: typeof config;
    value: PhiControlSize;
  } | null>(null);
  const [runtimeSizeOverride, setRuntimeSizeOverride] = useState<{
    config: typeof config;
    value: PhiRenderableBlockSize;
  } | null>(null);
  const [runtimeTitleOverride, setRuntimeTitleOverride] = useState<{
    config: typeof config;
    value: string | null;
  } | null>(null);
  const runtimeControlSize = runtimeControlSizeOverride?.config === config
    ? runtimeControlSizeOverride.value
    : null;
  const runtimeSize = runtimeSizeOverride?.config === config
    ? runtimeSizeOverride.value
    : null;
  const runtimeTitle = runtimeTitleOverride?.config === config
    ? runtimeTitleOverride.value
    : config.title;
  const emittedOpenRef = useRef(false);
  const emitSignal = usePhiSignalEmitter(receiver);
  const listenRoutes = useMemo(() => config.signalRoutes?.listens ?? [], [config.signalRoutes?.listens]);

  useEffect(() => registerPhiSignalInstance(signalPartition, {
    address: receiver,
    scope: signalScope,
  }), [receiver, signalPartition, signalScope]);

  const emitOpenChange = useCallback((nextOpen: boolean) => {
    for (const route of findPhiSignalRoutesByCapabilityId(config.signalRoutes?.emits, "openChange")) {
      if (route.receiver == null) continue;
      emitSignal({
        scope: route.scope,
        channel: route.channel,
        action: route.action,
        value: nextOpen,
        valueType: "boolean",
        valueSchema: null,
        receiver: route.receiver,
      });
    }
  }, [config.signalRoutes?.emits, emitSignal]);

  const emitCapability = useCallback((capabilityId: string, value: PhiSignal["value"], correlationId?: string) => {
    for (const route of findPhiSignalRoutesByCapabilityId(config.signalRoutes?.emits, capabilityId)) {
      if (route.receiver == null) continue;
      emitSignal({
        scope: route.scope,
        channel: route.channel,
        action: route.action,
        value: route.valueType === "none" ? null : value,
        valueType: route.valueType,
        valueSchema: route.valueSchema ?? null,
        receiver: route.receiver,
        ...(correlationId ? { correlationId } : {}),
      });
    }
  }, [config.signalRoutes?.emits, emitSignal]);

  const updateOpen = useCallback((nextOpen: boolean) => {
    if (nextOpen) setHasOpened(true);
    setOpen(nextOpen);
  }, []);

  useEffect(() => {
    if (emittedOpenRef.current === open) return;
    emittedOpenRef.current = open;
    emitOpenChange(open);
  }, [emitOpenChange, open]);

  usePhiSignalListener(useCallback((signal) => {
    if (signal.receiver !== receiver && signal.receiver !== "broadcast") return;
    const route = listenRoutes.find((candidate) => matchesRoute(signal, candidate));
    if (!route) return;
    if (route.capabilityId === "open") {
      updateOpen(true);
    } else if (route.capabilityId === "close") {
      updateOpen(false);
    } else if (route.capabilityId === "toggle") {
      updateOpen(typeof signal.value === "boolean" ? signal.value : !open);
    } else if (route.capabilityId === "title" && signal.valueType === "string") {
      const nextTitle = typeof signal.value === "string" ? signal.value.trim() : "";
      setRuntimeTitleOverride({ config, value: nextTitle || null });
    } else if (route.capabilityId === "controlSize" && overlayType === "modal") {
      const nextControlSize = readPhiControlSize(signal.value);
      if (nextControlSize) {
        setRuntimeControlSizeOverride({ config, value: nextControlSize });
        setRuntimeSizeOverride((current) => {
          const currentSize = current?.config === config ? current.value : null;
          return currentSize?.height == null
            ? null
            : { config, value: { height: currentSize.height } };
        });
      }
    } else if (route.capabilityId === "size" && overlayType === "modal") {
      const nextSize = readPhiDimensionValue(signal.value);
      if (nextSize) setRuntimeSizeOverride({ config, value: nextSize });
    }
  }, [config, listenRoutes, open, overlayType, receiver, updateOpen]), useMemo(() => ({
    scopes: [signalScope],
    receiver,
  }), [receiver, signalScope]), receiver);

  const requestClose = useCallback((source: PhiOverlayCloseSource) => {
    if (config.closeMode === "request") {
      emitCapability("closeRequest", { source });
      return;
    }
    updateOpen(false);
  }, [config.closeMode, emitCapability, updateOpen]);

  const shouldRenderContent = config.mountPolicy === "eager" || open ||
    (config.mountPolicy === "keep-alive" && hasOpened);
  const renderZone = (zone: ReactNode) => shouldRenderContent && zone != null ? (
    <PhiSignalIdentityProvider value={{ sender: receiver, receiver, scope: signalScope }}>
      {zone}
    </PhiSignalIdentityProvider>
  ) : null;
  const containerChromeStyle = resolvePhiCmsContainerChromeStyle(config);
  const surfaceStyle = { ...containerChromeStyle, padding: 0 };

  if (overlayType === "drawer") {
    return (
      <PhiDrawerControl
        open={open}
        title={runtimeTitle}
        header={renderZone(header)}
        body={renderZone(body)}
        footer={renderZone(footer)}
        closable={config.closable}
        keyboard={config.keyboard}
        mask={config.mask}
        mountPolicy={config.mountPolicy}
        placement={config.placement}
        size={config.size}
        maxSize={config.maxSize}
        resizable={config.resizable}
        push={config.push}
        containerStyle={surfaceStyle}
        onDismiss={requestClose}
      />
    );
  }

  return (
    <PhiModalControl
      open={open}
      title={runtimeTitle}
      header={renderZone(header)}
      body={renderZone(body)}
      footer={renderZone(footer)}
      closable={config.closable}
      keyboard={config.keyboard}
      mask={config.mask}
      mountPolicy={config.mountPolicy}
      centered={config.centered}
      controlSize={runtimeControlSize ?? config.controlSize}
      size={runtimeSize}
      width={resolveModalWidth(config.width)}
      containerStyle={surfaceStyle}
      onDismiss={requestClose}
    />
  );
}

export type PhiNamedOverlayProps = Omit<PhiOverlayContainerClientProps, "overlayType">;

export function PhiModal(props: PhiNamedOverlayProps) {
  return <PhiOverlayContainerClient {...props} overlayType="modal" />;
}

export function PhiDrawer(props: PhiNamedOverlayProps) {
  return <PhiOverlayContainerClient {...props} overlayType="drawer" />;
}
