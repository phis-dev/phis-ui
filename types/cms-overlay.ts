import { isPhiRecord } from "../helpers/is-record";
import type { PhiCmsContainerChromeConfig } from "./cms-container";
import { readPhiSurface } from "./surface";
import { readPhiSignalRouteSet, type PhiSignalRouteSet } from "./signals";
import {
  readPhiCmsMountPolicy,
  type PhiCmsMountPolicy,
} from "./cms-mount-policy";
import type { PhiResponsiveValue } from "./responsive";
import { readPhiControlSize, type PhiControlSize } from "./control";
import { PhiCmsFlags } from "@phis/contracts/cms";
import { hasPhiFlag, readPhiFlags } from "../helpers/flags";

export const PHI_CMS_OVERLAY_TYPES = ["modal", "drawer"] as const;
export type PhiCmsOverlayType = (typeof PHI_CMS_OVERLAY_TYPES)[number];
export const PHI_OVERLAY_FOOTER_PRESENTATIONS = ["none", "actions", "custom"] as const;
export type PhiOverlayFooterPresentation = (typeof PHI_OVERLAY_FOOTER_PRESENTATIONS)[number];

export const PHI_CMS_OVERLAY_MASK_APPEARANCES = ["transparent", "normal", "blurred"] as const;
export type PhiCmsOverlayMaskAppearance = (typeof PHI_CMS_OVERLAY_MASK_APPEARANCES)[number];

/**
 * The stored mask: how it is drawn. Whether it stops the pointer and whether a click on it closes the
 * Overlay are the Overlay's `flags` (`MaskPassesPointer`, `MaskKeepsOpen`), read into
 * `PhiOverlayMaskBehaviour` for the Controls.
 */
export type PhiCmsOverlayMaskConfig = {
  appearance: PhiCmsOverlayMaskAppearance;
};

/** The mask as a Control is handed it: its look and the two answers the flags give. */
export type PhiOverlayMaskBehaviour = PhiCmsOverlayMaskConfig & {
  allowOutsideInteraction: boolean;
  closable: boolean;
};

/** Whether a Drawer pushes a nested one aside, and how far when it says. */
export type PhiOverlayPushBehaviour = boolean | { distance: PhiCmsOverlaySize };

export type PhiCmsOverlaySize = string | number;
/** A Modal width per responsive mode; unset modes cascade from the nearest smaller one that is set. */
export type PhiCmsOverlayResponsiveSize = PhiResponsiveValue<PhiCmsOverlaySize>;

export const PHI_OVERLAY_CLOSE_SOURCES = ["close-button", "mask", "escape"] as const;
export type PhiOverlayCloseSource = (typeof PHI_OVERLAY_CLOSE_SOURCES)[number];
export type PhiOverlayCloseRequest = {
  source: PhiOverlayCloseSource;
};

type PhiOverlayChromeConfig = Omit<
  PhiCmsContainerChromeConfig,
  "padding" | "paddingTop" | "paddingRight" | "paddingBottom" | "paddingLeft"
>;

export type PhiCmsOverlayConfig = PhiOverlayChromeConfig & {
  title: string | null;
  controlSize?: PhiControlSize;
  /**
   * The Overlay's yes-or-no answers as `PhiCmsFlags` bits: `NoCloseButton`, `NoEscapeClose`, `Centered`,
   * `Resizable`, `Push`, `MaskPassesPointer`, `MaskKeepsOpen`. Unset is the plain Overlay;
   * `resolvePhiCmsOverlayBehaviour` reads them into what the Controls take.
   */
  flags: number;
  mountPolicy: PhiCmsMountPolicy;
  mask: PhiCmsOverlayMaskConfig;
  width?: PhiCmsOverlaySize | PhiCmsOverlayResponsiveSize;
  size?: PhiCmsOverlaySize;
  placement: "top" | "right" | "bottom" | "left";
  maxSize?: number;
  /** How far a pushing Drawer (`Push`) moves the one beneath; unset leaves it the Control's distance. */
  pushDistance?: PhiCmsOverlaySize;
  closeMode: "immediate" | "request";
  /**
   * Which Table action this Overlay opens for, when it is opened by one.
   *
   * A Table announces every action on one channel and names the action in the message. An Overlay that
   * subscribes to that channel would otherwise open for all of them -- test and delete included -- so
   * the only way to point a row at a dialog was a Controller whose whole job was to forward one signal.
   *
   * The Form and Record Widgets already answer this question with a field of this name and read it the
   * same way: the `open` route fires only when `actionKey` matches. An Overlay filling itself from a
   * Table sits beside a Widget doing the same thing, so it asks in the same words.
   *
   * Only an `open` route carried on the Table's own action channel is filtered. An Overlay opened the
   * ordinary way -- a `dialog` route with no value -- never consults this.
   */
  openActionKey: string | null;
  signalRoutes: PhiSignalRouteSet | null;
};

function readSize(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : typeof value === "string" && value.trim()
      ? value.trim()
      : undefined;
}

function readResponsiveSize(value: unknown): PhiCmsOverlayResponsiveSize | undefined {
  if (!isPhiRecord(value)) return undefined;
  const record = value as Record<string, unknown>;
  const size = {
    compact: readSize(record.compact),
    medium: readSize(record.medium),
    wide: readSize(record.wide),
  };
  return size.compact === undefined && size.medium === undefined && size.wide === undefined
    ? undefined
    : size;
}

function readMask(value: unknown): PhiCmsOverlayMaskConfig {
  const record = isPhiRecord(value)
    ? value as Record<string, unknown>
    : {};
  const appearance = (PHI_CMS_OVERLAY_MASK_APPEARANCES as readonly unknown[]).includes(record.appearance)
    ? record.appearance as PhiCmsOverlayMaskAppearance
    : "normal";
  return { appearance };
}

/**
 * What the Overlay's flags say, in the words the Controls take.
 *
 * The bits name the departure from the plain Overlay (a close button, Escape closes, the mask stops the
 * pointer and closes on a click), so an unset flag set reads as every default at once.
 */
export function resolvePhiCmsOverlayBehaviour(config: Pick<PhiCmsOverlayConfig, "flags" | "mask" | "pushDistance">) {
  const push: PhiOverlayPushBehaviour = hasPhiFlag(config.flags, PhiCmsFlags.Push)
    ? (config.pushDistance === undefined ? true : { distance: config.pushDistance })
    : false;
  const mask: PhiOverlayMaskBehaviour = {
    appearance: config.mask.appearance,
    allowOutsideInteraction: hasPhiFlag(config.flags, PhiCmsFlags.MaskPassesPointer),
    closable: !hasPhiFlag(config.flags, PhiCmsFlags.MaskKeepsOpen),
  };
  return {
    closable: !hasPhiFlag(config.flags, PhiCmsFlags.NoCloseButton),
    keyboard: !hasPhiFlag(config.flags, PhiCmsFlags.NoEscapeClose),
    centered: hasPhiFlag(config.flags, PhiCmsFlags.Centered),
    resizable: hasPhiFlag(config.flags, PhiCmsFlags.Resizable),
    push,
    mask,
  };
}

export function isPhiCmsOverlayType(value: unknown): value is PhiCmsOverlayType {
  return typeof value === "string" && (PHI_CMS_OVERLAY_TYPES as readonly string[]).includes(value);
}

export function readPhiOverlayCloseRequest(value: unknown): PhiOverlayCloseRequest | null {
  if (!isPhiRecord(value)) return null;
  const record = value as Record<string, unknown>;
  const source = record.source;
  if (!(PHI_OVERLAY_CLOSE_SOURCES as readonly unknown[]).includes(source)) return null;
  return {
    source: source as PhiOverlayCloseSource,
  };
}

export function parsePhiCmsOverlayConfig(
  rawConfig: Record<string, unknown>,
  overlayType: PhiCmsOverlayType = "modal",
): PhiCmsOverlayConfig {
  const placement = rawConfig.placement;
  const maxSize = typeof rawConfig.maxSize === "number" && Number.isFinite(rawConfig.maxSize)
    ? rawConfig.maxSize
    : undefined;
  return {
    title: typeof rawConfig.title === "string" && rawConfig.title.trim() ? rawConfig.title.trim() : null,
    controlSize: readPhiControlSize(rawConfig.controlSize),
    flags: readPhiFlags(rawConfig.flags),
    // An Overlay is shut far more often than it is open, so the cheap end is the right default.
    mountPolicy: readPhiCmsMountPolicy(rawConfig.mountPolicy, "remount"),
    mask: readMask(rawConfig.mask),
    width: overlayType === "modal"
      ? readSize(rawConfig.width) ?? readResponsiveSize(rawConfig.width)
      : undefined,
    size: overlayType === "drawer" ? readSize(rawConfig.size) : undefined,
    placement: placement === "top" || placement === "bottom" || placement === "left" || placement === "right"
      ? placement
      : "right",
    maxSize,
    pushDistance: readSize(rawConfig.pushDistance),
    closeMode: rawConfig.closeMode === "request" ? "request" : "immediate",
    openActionKey: typeof rawConfig.openActionKey === "string" && rawConfig.openActionKey.trim()
      ? rawConfig.openActionKey.trim()
      : null,
    surface: readPhiSurface(rawConfig.surface),
    signalRoutes: readPhiSignalRouteSet(rawConfig.signalRoutes),
  };
}

/**
 * Whether an Area Overlay ships closed, without its zones, and asks for them on first open.
 *
 * Every policy but `eager` does: `eager` means the content is mounted before anybody opens it. The
 * Overlay renderer decides by this which zones to leave out of the page, and the Controller
 * materialization decides by the same answer which Controllers to leave out of the Area -- the ones the
 * zones bring along when they arrive (`next/overlay-zones.tsx`).
 */
export function isPhiCmsOverlayDeferredWhenClosed(overlay: {
  config: Record<string, unknown>;
  overlayType: PhiCmsOverlayType;
}): boolean {
  return parsePhiCmsOverlayConfig(overlay.config, overlay.overlayType).mountPolicy !== "eager";
}
