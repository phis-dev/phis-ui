import { normalizePhiBackgroundWidgetConfig } from "../components/widgets/config/background";
import { readPhiCmsBorderWidgetConfig } from "./cms-config";
import type { PhiCmsContainerChromeConfig } from "./cms-container";
import { isPhiLayoutEffectId, readPhiShadow } from "./layout-style";
import { readPhiSignalRouteSet, type PhiSignalRouteSet } from "./signals";
import type { PhiResponsiveValue } from "./responsive";
import { readPhiControlSize, type PhiControlSize } from "./control";

export const PHI_CMS_OVERLAY_TYPES = ["modal", "drawer"] as const;
export type PhiCmsOverlayType = (typeof PHI_CMS_OVERLAY_TYPES)[number];
export const PHI_OVERLAY_FOOTER_PRESENTATIONS = ["none", "actions", "custom"] as const;
export type PhiOverlayFooterPresentation = (typeof PHI_OVERLAY_FOOTER_PRESENTATIONS)[number];
export const PHI_CMS_OVERLAY_MOUNT_POLICIES = ["on-open", "keep-alive", "eager"] as const;
export type PhiCmsOverlayMountPolicy = (typeof PHI_CMS_OVERLAY_MOUNT_POLICIES)[number];

export const PHI_CMS_OVERLAY_MASK_APPEARANCES = ["transparent", "normal", "blurred"] as const;
export type PhiCmsOverlayMaskAppearance = (typeof PHI_CMS_OVERLAY_MASK_APPEARANCES)[number];

export type PhiCmsOverlayMaskConfig = {
  appearance: PhiCmsOverlayMaskAppearance;
  allowOutsideInteraction: boolean;
  closable: boolean;
};

export type PhiCmsOverlaySize = string | number;
export type PhiCmsOverlayResponsiveSize = PhiResponsiveValue<PhiCmsOverlaySize> & {
  compact: PhiCmsOverlaySize;
};

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
  closable: boolean;
  keyboard: boolean;
  mountPolicy: PhiCmsOverlayMountPolicy;
  mask: PhiCmsOverlayMaskConfig;
  centered: boolean;
  width?: PhiCmsOverlaySize | PhiCmsOverlayResponsiveSize;
  size?: PhiCmsOverlaySize;
  placement: "top" | "right" | "bottom" | "left";
  maxSize?: number;
  resizable: boolean;
  push: boolean | { distance: string | number };
  closeMode: "immediate" | "request";
  signalRoutes: PhiSignalRouteSet | null;
};

function readBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function readSize(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : typeof value === "string" && value.trim()
      ? value.trim()
      : undefined;
}

function readResponsiveSize(value: unknown): PhiCmsOverlayResponsiveSize | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  const compact = readSize(record.compact);
  if (compact === undefined) return undefined;
  return {
    compact,
    medium: readSize(record.medium),
    wide: readSize(record.wide),
  };
}

function readMask(value: unknown): PhiCmsOverlayMaskConfig {
  const record = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const appearance = (PHI_CMS_OVERLAY_MASK_APPEARANCES as readonly unknown[]).includes(record.appearance)
    ? record.appearance as PhiCmsOverlayMaskAppearance
    : "normal";
  return {
    appearance,
    allowOutsideInteraction: readBoolean(record.allowOutsideInteraction, false),
    closable: readBoolean(record.closable, true),
  };
}

function readPush(value: unknown): PhiCmsOverlayConfig["push"] {
  if (typeof value === "boolean") return value;
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const distance = readSize((value as Record<string, unknown>).distance);
    if (distance !== undefined) return { distance };
  }
  return false;
}

function readBorder(value: unknown): PhiCmsOverlayConfig["border"] {
  if (typeof value === "boolean") return value;
  if (typeof value === "string" && value.trim()) return value.trim();
  return readPhiCmsBorderWidgetConfig(value);
}

export function isPhiCmsOverlayType(value: unknown): value is PhiCmsOverlayType {
  return typeof value === "string" && (PHI_CMS_OVERLAY_TYPES as readonly string[]).includes(value);
}

export function isPhiCmsOverlayMountPolicy(value: unknown): value is PhiCmsOverlayMountPolicy {
  return typeof value === "string" &&
    (PHI_CMS_OVERLAY_MOUNT_POLICIES as readonly string[]).includes(value);
}

export function readPhiOverlayCloseRequest(value: unknown): PhiOverlayCloseRequest | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
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
    closable: readBoolean(rawConfig.closable, true),
    keyboard: readBoolean(rawConfig.keyboard, true),
    mountPolicy: isPhiCmsOverlayMountPolicy(rawConfig.mountPolicy) ? rawConfig.mountPolicy : "on-open",
    mask: readMask(rawConfig.mask),
    centered: readBoolean(rawConfig.centered, false),
    width: overlayType === "modal"
      ? readSize(rawConfig.width) ?? readResponsiveSize(rawConfig.width)
      : undefined,
    size: overlayType === "drawer" ? readSize(rawConfig.size) : undefined,
    placement: placement === "top" || placement === "bottom" || placement === "left" || placement === "right"
      ? placement
      : "right",
    maxSize,
    resizable: readBoolean(rawConfig.resizable, false),
    push: readPush(rawConfig.push),
    closeMode: rawConfig.closeMode === "request" ? "request" : "immediate",
    background: typeof rawConfig.background === "string" && rawConfig.background.trim()
      ? rawConfig.background.trim()
      : undefined,
    backgroundConfig: rawConfig.backgroundConfig == null
      ? null
      : normalizePhiBackgroundWidgetConfig(rawConfig.backgroundConfig),
    border: readBorder(rawConfig.border),
    shadow: readPhiShadow(rawConfig.shadow),
    effect: isPhiLayoutEffectId(rawConfig.effect) ? rawConfig.effect : undefined,
    signalRoutes: readPhiSignalRouteSet(rawConfig.signalRoutes),
  };
}
