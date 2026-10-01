"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import type { PhiCmsInstanceId } from "../../types/cms-instance-id";
import { shouldPhiCmsContentStayMounted } from "../../types/cms-mount-policy";
import {
  parsePhiCmsOverlayConfig,
  type PhiOverlayCloseSource,
  type PhiCmsOverlayType,
} from "../../types/cms-overlay";
import { readPhiControlSize, type PhiControlSize } from "../../types/control";
import { readPhiDimensionValue } from "../../types/dimension";
import type { PhiRenderableBlockSize } from "../../types/renderable-block";
import { resolvePhiCmsContainerChromeStyle } from "../../helpers/cms-container-chrome";
import type { PhiSignal, PhiSignalRoute, PhiSignalScope } from "../../types/signals";
import {
  PHI_SIGNAL_VALUE_SCHEMAS,
  createPhiSignalAddress,
  findPhiSignalRoutesByCapabilityId,
} from "../../types/signals";
import { readPhiTableActionSignalValue } from "../../types/table-widget";
import {
  emitPhiSignalCapability,
  usePhiSignalEmitter,
  PhiSignalIdentityProvider,
} from "../runtime/runtime-signal-identity";
import { usePhiSignalListener } from "../runtime/runtime-signal-bus";
import { registerPhiSignalInstance } from "../runtime/runtime-signal-registry";
import { usePhiSignalRuntimePartition } from "../runtime/runtime-signal-partition";
import { PhiModalControl } from "../controls/phi-modal-control";
import { PhiDrawerControl } from "../controls/phi-drawer-control";
import { usePhiOverlayZonesLoaderIfAny } from "./phi-overlay-zones-loader";
import type {
  PhiCmsLoadedOverlayZones,
  PhiCmsOverlayZones,
  PhiCmsOverlayZonesRequest,
} from "../../types/cms-overlay-zones";

export type PhiOverlayContainerClientProps = {
  overlayId: PhiCmsInstanceId;
  overlayType: PhiCmsOverlayType;
  config: Record<string, unknown>;
  signalScope: Extract<PhiSignalScope, "area" | "page">;
  header?: ReactNode;
  body?: ReactNode;
  footer?: ReactNode;
  /**
   * Set instead of the zones while the Overlay has not been opened: what to ask the Site's Server Action
   * for the first time it opens (`types/cms-overlay-zones.ts`).
   */
  deferredZones?: PhiCmsOverlayZonesRequest;
};

type PhiLoadedOverlayZones = {
  /** Which request and which address the zones were rendered for. */
  key: string;
  zones: PhiCmsLoadedOverlayZones;
};

/** Stands where the body will be while the zones are on their way, so the shell opens at once. */
const PHI_OVERLAY_ZONES_PENDING = (
  <div aria-busy="true" style={{ minBlockSize: "calc(var(--ant-control-height) * 3)" }} />
);

/**
 * Whether an `open` carried on a Table's action channel is meant for this Overlay.
 *
 * A Table announces every action on one channel and names the action in the message, so an Overlay
 * subscribed to it hears `test` and `delete` as loudly as the one it is for. `openActionKey` is the
 * filter, and it is the same field the Form and Record Widgets read for the same reason.
 *
 * Every other `open` passes untouched: a `dialog` route carries no value and has nothing to match on.
 * A Table-shaped `open` without a key opens for nothing rather than for everything -- the quiet failure
 * is a dialog that will not come up, not one that comes up whenever a row is deleted.
 */
function matchesOpenAction(signal: PhiSignal, route: PhiSignalRoute, openActionKey: string | null) {
  if (route.valueSchema !== PHI_SIGNAL_VALUE_SCHEMAS.tableAction) return true;
  if (!openActionKey) return false;
  return readPhiTableActionSignalValue(signal.value)?.actionKey === openActionKey;
}

function matchesRoute(signal: PhiSignal, route: PhiSignalRoute) {
  return route.receiver === signal.receiver &&
    route.channel === signal.channel &&
    route.action === signal.action &&
    route.valueType === signal.valueType &&
    route.valueSchema === signal.valueSchema;
}

export function PhiOverlayContainerClient({
  overlayId,
  overlayType,
  config: rawConfig,
  signalScope,
  header,
  body,
  footer,
  deferredZones,
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
  const openedAtPathname = useRef<string | null>(null);
  const pathname = usePathname() ?? "/";
  const emitSignal = usePhiSignalEmitter(receiver);
  const loadZones = usePhiOverlayZonesLoaderIfAny();
  const [loadedZones, setLoadedZones] = useState<PhiLoadedOverlayZones | null>(null);
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
    emitPhiSignalCapability(emitSignal, config.signalRoutes?.emits, capabilityId, value, correlationId);
  }, [config.signalRoutes?.emits, emitSignal]);

  const updateOpen = useCallback((nextOpen: boolean) => {
    if (nextOpen) setHasOpened(true);
    setOpen(nextOpen);
  }, []);

  /*
   * The zones of a deferred Overlay, asked for when it opens and kept afterwards.
   *
   * Kept per request and address: an Area Overlay outlives client navigations, and its zones were
   * rendered for the page under it -- a link target resolves against it -- so another address asks again
   * the next time it opens. Asking fails into a closed Overlay and a logged error; the next open asks
   * again rather than showing an empty shell.
   */
  const deferredZonesKey = deferredZones ? `${JSON.stringify(deferredZones)}@${pathname}` : null;
  useEffect(() => {
    if (!open || !deferredZones || !deferredZonesKey || loadedZones?.key === deferredZonesKey) return;
    if (!loadZones) {
      throw new Error("PhiOverlayZonesLoaderProvider is missing from the application Root Layout.");
    }
    let cancelled = false;
    loadZones(deferredZones).then((zones) => {
      if (cancelled) return;
      if (!zones) {
        console.error(`Overlay ${overlayId} could not be rendered for this viewer.`);
        updateOpen(false);
        return;
      }
      setLoadedZones({ key: deferredZonesKey, zones });
    }, (error: unknown) => {
      if (cancelled) return;
      console.error(`Overlay ${overlayId} could not be loaded.`, error);
      updateOpen(false);
    });
    return () => {
      cancelled = true;
    };
  }, [deferredZones, deferredZonesKey, loadZones, loadedZones?.key, open, overlayId, updateOpen]);

  useEffect(() => {
    if (emittedOpenRef.current === open) return;
    emittedOpenRef.current = open;
    emitOpenChange(open);
  }, [emitOpenChange, open]);

  /*
   * An Overlay closes when the address underneath it changes.
   *
   * It was opened over a Page, and after a client navigation that Page is no longer there: the Login's
   * own ways out -- "Create account", "Forgot password" -- left the modal standing over the very Page it
   * had just sent the visitor to. An Area Overlay is mounted in the Shell and survives the navigation,
   * so nothing else was going to take it down.
   *
   * Not a close request: by the time this runs the address has already changed, and there is nothing
   * left for a Controller to decide about work that can no longer be finished here. The `openChange`
   * route still carries the new state to whoever declared one.
   *
   * The address is remembered when the Overlay opens rather than compared against the previous render,
   * because an Overlay opened *by* arriving somewhere -- a route that fires as the Page mounts -- would
   * otherwise close itself in the same breath.
   */
  useEffect(() => {
    if (!open) {
      openedAtPathname.current = null;
      return;
    }
    if (openedAtPathname.current == null) {
      openedAtPathname.current = pathname;
      return;
    }
    if (openedAtPathname.current !== pathname) {
      openedAtPathname.current = null;
      updateOpen(false);
    }
  }, [open, pathname, updateOpen]);

  usePhiSignalListener(useCallback((signal) => {
    if (signal.receiver !== receiver && signal.receiver !== "broadcast") return;
    const route = listenRoutes.find((candidate) => matchesRoute(signal, candidate));
    if (!route) return;
    if (route.capabilityId === "open") {
      if (!matchesOpenAction(signal, route, config.openActionKey)) return;
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

  // An Overlay's window is simply "open", which is why it can share the rule with a Carousel whose
  // window is several slots wide.
  const shouldRenderContent = shouldPhiCmsContentStayMounted({
    policy: config.mountPolicy,
    insideWindow: open,
    hasEnteredWindow: hasOpened,
  });
  const renderZone = (zone: ReactNode) => shouldRenderContent && zone != null ? (
    <PhiSignalIdentityProvider value={{ sender: receiver, receiver, scope: signalScope }}>
      {zone}
    </PhiSignalIdentityProvider>
  ) : null;
  const zones: PhiCmsOverlayZones | null = !deferredZones
    ? { header, body, footer }
    : loadedZones && loadedZones.key === deferredZonesKey
      ? loadedZones.zones
      : open ? { header: null, body: PHI_OVERLAY_ZONES_PENDING, footer: null } : null;
  /*
   * The Controllers that came with the zones, mounted for as long as this Overlay is, open or not.
   *
   * Taken from the last load even after a navigation made its zones stale: the next open asks again and
   * the new answer takes their place, while a Controller in the middle of something keeps its state.
   */
  const zoneControllers = loadedZones?.zones.controllers ?? null;
  const containerChromeStyle = resolvePhiCmsContainerChromeStyle(config);
  const surfaceStyle = { ...containerChromeStyle, padding: 0 };

  if (overlayType === "drawer") {
    return (
      <>
      {zoneControllers}
      <PhiDrawerControl
        open={open}
        title={runtimeTitle}
        header={renderZone(zones?.header)}
        body={renderZone(zones?.body)}
        footer={renderZone(zones?.footer)}
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
      </>
    );
  }

  return (
    <>
    {zoneControllers}
    <PhiModalControl
      open={open}
      title={runtimeTitle}
      header={renderZone(zones?.header)}
      body={renderZone(zones?.body)}
      footer={renderZone(zones?.footer)}
      closable={config.closable}
      keyboard={config.keyboard}
      mask={config.mask}
      mountPolicy={config.mountPolicy}
      centered={config.centered}
      controlSize={runtimeControlSize ?? config.controlSize}
      size={runtimeSize}
      width={config.width}
      containerStyle={surfaceStyle}
      onDismiss={requestClose}
    />
    </>
  );
}
