import {
  PHI_SIGNAL_VALUE_SCHEMAS,
  type PhiSignal,
} from "./signals";
import {
  PHI_FEEDBACK_LEVELS,
  type PhiFeedbackLevel,
} from "./control";

export const PHI_CORE_RUNTIME_FEEDBACK_LEVELS = PHI_FEEDBACK_LEVELS;

export type PhiCoreRuntimeFeedbackLevel = PhiFeedbackLevel;

export const PHI_CORE_RUNTIME_NOTIFICATION_PLACEMENTS = [
  "top",
  "topLeft",
  "topRight",
  "bottom",
  "bottomLeft",
  "bottomRight",
] as const;

export type PhiCoreRuntimeNotificationPlacement =
  (typeof PHI_CORE_RUNTIME_NOTIFICATION_PLACEMENTS)[number];

export type PhiCoreRuntimeNotificationValue = {
  level: PhiCoreRuntimeFeedbackLevel;
  title: string;
  description?: string | null;
  durationSeconds?: number | null;
  placement?: PhiCoreRuntimeNotificationPlacement | null;
  showTimeoutProgress?: boolean | null;
};

export type PhiCoreRuntimeMessageValue = {
  level: PhiCoreRuntimeFeedbackLevel;
  content: string;
  durationSeconds?: number | null;
};

export type PhiCoreRuntimePageSnapshot = {
  area: string | null;
  pageKey: string | null;
  pageTitle: string | null;
  pageDescription: string | null;
  pagePath: string | null;
  pageType: number | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowedKeys: readonly string[]) {
  return Object.keys(value).every((key) => allowedKeys.includes(key));
}

function readFeedbackLevel(value: unknown): PhiCoreRuntimeFeedbackLevel | null {
  return typeof value === "string" &&
    (PHI_CORE_RUNTIME_FEEDBACK_LEVELS as readonly string[]).includes(value)
    ? value as PhiCoreRuntimeFeedbackLevel
    : null;
}

function readNonEmptyText(value: unknown) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || null;
}

function readDurationSeconds(value: unknown) {
  return value == null || (typeof value === "number" && Number.isFinite(value) && value >= 0)
    ? value
    : null;
}

function readNotificationPlacement(value: unknown): PhiCoreRuntimeNotificationPlacement | null {
  return typeof value === "string" &&
    (PHI_CORE_RUNTIME_NOTIFICATION_PLACEMENTS as readonly string[]).includes(value)
    ? value as PhiCoreRuntimeNotificationPlacement
    : null;
}

export function readPhiCoreRuntimeNotificationValue(
  value: unknown,
): PhiCoreRuntimeNotificationValue | null {
  if (!isRecord(value) || !hasOnlyKeys(value, [
    "level",
    "title",
    "description",
    "durationSeconds",
    "placement",
    "showTimeoutProgress",
  ])) {
    return null;
  }
  const level = readFeedbackLevel(value.level);
  const title = readNonEmptyText(value.title);
  const description = value.description == null ? null : readNonEmptyText(value.description);
  const durationSeconds = readDurationSeconds(value.durationSeconds);
  const placement = value.placement == null ? null : readNotificationPlacement(value.placement);
  const showTimeoutProgress = value.showTimeoutProgress == null
    ? null
    : typeof value.showTimeoutProgress === "boolean"
      ? value.showTimeoutProgress
      : null;
  if (
    !level ||
    !title ||
    (value.description != null && !description) ||
    durationSeconds === null ||
    (value.placement != null && !placement) ||
    (value.showTimeoutProgress != null && showTimeoutProgress == null)
  ) {
    return null;
  }
  return {
    level,
    title,
    ...(description ? { description } : {}),
    ...(durationSeconds != null ? { durationSeconds } : {}),
    ...(placement ? { placement } : {}),
    ...(showTimeoutProgress != null ? { showTimeoutProgress } : {}),
  };
}

export function readPhiCoreRuntimeMessageValue(
  value: unknown,
): PhiCoreRuntimeMessageValue | null {
  if (!isRecord(value) || !hasOnlyKeys(value, ["level", "content", "durationSeconds"])) {
    return null;
  }
  const level = readFeedbackLevel(value.level);
  const content = readNonEmptyText(value.content);
  const durationSeconds = readDurationSeconds(value.durationSeconds);
  if (!level || !content || durationSeconds === null) {
    return null;
  }
  return {
    level,
    content,
    ...(durationSeconds != null ? { durationSeconds } : {}),
  };
}

export function readPhiCoreRuntimeNotificationSignalValue(
  signal: PhiSignal,
) {
  return signal.scope === "site" &&
    signal.receiver != null &&
    signal.channel === "notification" &&
    signal.action === "activate" &&
    signal.valueType === "json" &&
    signal.valueSchema === PHI_SIGNAL_VALUE_SCHEMAS.notification
    ? readPhiCoreRuntimeNotificationValue(signal.value)
    : null;
}

export function readPhiCoreRuntimeMessageSignalValue(signal: PhiSignal) {
  return signal.scope === "site" &&
    signal.receiver != null &&
    signal.channel === "message" &&
    signal.action === "activate" &&
    signal.valueType === "json" &&
    signal.valueSchema === PHI_SIGNAL_VALUE_SCHEMAS.message
    ? readPhiCoreRuntimeMessageValue(signal.value)
    : null;
}
