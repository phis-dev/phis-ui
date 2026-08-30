import type { PhiCoreRuntimePageSnapshot, PhiSignal } from "../../../types";
import type { PhiSignalDispatch } from "../../runtime/runtime-signal-bus";
import { createPhiCoreRuntimeControllerAddress } from "../../runtime/core-runtime-controller-address";
import { emitPhiCoreRuntimePageSnapshot } from "../../runtime/core-runtime-controller-snapshots";

export const PHI_PAGE_TITLE_SIGNAL_KEY = "pageTitle";

export type PhiPageTitleSignalValue = {
  area?: string | null;
  pageKey?: string | null;
  pageTitle?: string | null;
  pageDescription?: string | null;
  pagePath?: string | null;
  pageType?: number | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function resolvePhiPageTitleSignalValue(signal: PhiSignal): PhiPageTitleSignalValue | null {
  const rawValue = signal.value;

  if (typeof rawValue === "string") {
    if (signal.channel !== "pageTitle" || signal.action !== "change") {
      return null;
    }
    return {
      pageTitle: rawValue,
    };
  }

  if (!isRecord(rawValue)) {
    return null;
  }

  const value = rawValue as Record<string, unknown>;
  const pageTitle = typeof value.pageTitle === "string" ? value.pageTitle : null;
  const pageDescription = typeof value.pageDescription === "string" ? value.pageDescription : null;
  const pagePath = typeof value.pagePath === "string" ? value.pagePath : null;
  const pageKey = typeof value.pageKey === "string" ? value.pageKey : null;
  const area = typeof value.area === "string" ? value.area : null;
  const pageType = typeof value.pageType === "number" ? value.pageType : null;

  if (pageTitle == null && pageDescription == null && pagePath == null && pageKey == null && area == null && pageType == null) {
    return null;
  }

  return {
    area,
    pageKey,
    pageTitle,
    pageDescription,
    pagePath,
    pageType,
  };
}

export function emitPhiPageTitleMetaSignal(input: {
  emitSignal: PhiSignalDispatch;
  area?: string | null;
  pageKey?: string | null;
  title?: string | null;
  description?: string | null;
  pagePath?: string | null;
  pageType?: number | null;
}) {
  const coreAddress = createPhiCoreRuntimeControllerAddress();
  const value: PhiCoreRuntimePageSnapshot = {
    area: input.area ?? null,
    pageKey: input.pageKey ?? input.pagePath ?? null,
    pageTitle: input.title ?? null,
    pageDescription: input.description ?? null,
    pagePath: input.pagePath ?? null,
    pageType: input.pageType ?? null,
  };

  emitPhiCoreRuntimePageSnapshot({
    emitSignal: input.emitSignal,
    snapshot: value,
  });

  if (typeof input.title === "string" && input.title.trim()) {
    input.emitSignal({
      scope: "site",
      channel: "pageTitle",
      action: "change",
      value: input.title.trim(),
      valueType: "string",
      sender: null,
      receiver: coreAddress,
      timestamp: Date.now(),
    });
  }

  input.emitSignal({
    scope: "site",
    channel: "pageDescription",
    action: typeof input.description === "string" && input.description.trim() ? "change" : "clear",
    value: typeof input.description === "string" && input.description.trim()
      ? input.description.trim()
      : null,
    valueType: typeof input.description === "string" && input.description.trim() ? "string" : "none",
    sender: null,
    receiver: coreAddress,
    timestamp: Date.now(),
  });
}

