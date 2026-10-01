"use client";

import { useEffect, useMemo, useState } from "react";

import type { PhiCmsInstanceId } from "../../../../../types";
import { createPhiSignalAddress, findPhiSignalRoutesByCapabilityId } from "../../../../../types/signals";
import { readPhiDraftStatusSignalValue, type PhiDraftStatusSignalValue } from "../../../../../types/draft-status";
import { usePhiConfig } from "../../../../../components/root/phi-config-provider";
import { usePhiSignalDispatcher, usePhiSignalListener } from "../../../../../components/runtime/runtime-signal-bus";
import { PhiTagControl } from "../../../../../components/controls/phi-tag-control";
import { PhiFlexControl } from "../../../../../components/controls/phi-flex-control";
import { PhiTypographyControl } from "../../../../../components/controls/phi-typography-control";
import {
  PHI_DRAFT_STATUS_WIDGET_DEFAULT_LABELS,
  formatPhiDraftStatusRevisionLabel,
  type PhiDraftStatusWidgetLabels,
} from "../../../../../components/widgets/label-types/draft-status";
import type { PhiDraftStatusWidgetConfig } from "./config";

function buildStatusLabel(state: PhiDraftStatusSignalValue | null, labels: PhiDraftStatusWidgetLabels) {
  if (!state) {
    return labels.checking;
  }
  if (state.status === "unsaved") {
    return labels.unsaved;
  }
  if (state.status === "draft") {
    return state.revisionId != null
      ? formatPhiDraftStatusRevisionLabel(labels.draftWithRevision, state.revisionId)
      : labels.draft;
  }
  if (state.status === "published") {
    return labels.published;
  }
  return labels.unavailable;
}

/**
 * The draft state a Controller states, drawn as a tag in the Theme's status colours.
 *
 * Nothing is read here and nothing is worked out. The Controller the placement names is asked once,
 * when this mounts, and answers to this address; every change after reaches it as a broadcast from
 * the same Controller. Signals on the channel from anyone else are not this Widget's draft and are
 * passed over -- the Revisions page announces restores on it too.
 */
export function PhiDraftStatusWidget({
  blockId,
  config,
  labels = PHI_DRAFT_STATUS_WIDGET_DEFAULT_LABELS,
  signalsEnabled = true,
}: {
  blockId: PhiCmsInstanceId;
  config?: PhiDraftStatusWidgetConfig | null;
  labels?: PhiDraftStatusWidgetLabels;
  signalsEnabled?: boolean;
}) {
  const { token } = usePhiConfig();
  const dispatchSignal = usePhiSignalDispatcher();
  const [state, setState] = useState<PhiDraftStatusSignalValue | null>(null);
  const selfAddress = createPhiSignalAddress("cms", blockId);
  const requestRoute = findPhiSignalRoutesByCapabilityId(config?.signalRoutes?.emits, "request")[0] ?? null;
  const statusRoute = findPhiSignalRoutesByCapabilityId(config?.signalRoutes?.listens, "status")[0] ?? null;
  const controller = requestRoute?.receiver ?? null;
  const statusScope = statusRoute?.scope ?? null;
  const statusChannel = statusRoute?.channel ?? null;

  /*
   * Keyed on the route's facts, not on the route object: a config parsed again on every render would
   * otherwise ask the Controller every render.
   */
  const requestScope = requestRoute?.scope ?? null;
  const requestChannel = requestRoute?.channel ?? null;
  const requestAction = requestRoute?.action ?? null;
  const requestValueType = requestRoute?.valueType ?? null;
  useEffect(() => {
    if (
      !signalsEnabled ||
      controller === null ||
      requestScope === null ||
      requestChannel === null ||
      requestAction === null ||
      requestValueType === null
    ) {
      return;
    }
    dispatchSignal({
      scope: requestScope,
      channel: requestChannel,
      action: requestAction,
      value: null,
      valueType: requestValueType,
      sender: selfAddress,
      receiver: controller,
    });
  }, [
    controller,
    dispatchSignal,
    requestAction,
    requestChannel,
    requestScope,
    requestValueType,
    selfAddress,
    signalsEnabled,
  ]);

  usePhiSignalListener(
    (signal) => {
      if (!signalsEnabled || !statusRoute || controller === null) {
        return;
      }
      if (
        signal.scope !== statusRoute.scope ||
        signal.channel !== statusRoute.channel ||
        signal.action !== statusRoute.action ||
        signal.sender !== controller ||
        (signal.receiver !== selfAddress && signal.receiver !== "broadcast")
      ) {
        return;
      }
      const next = readPhiDraftStatusSignalValue(signal.value);
      if (next) {
        setState(next);
      }
    },
    useMemo(
      () => ({
        scopes: statusScope === null ? [] : [statusScope],
        channels: statusChannel === null ? [] : [statusChannel],
      }),
      [statusChannel, statusScope],
    ),
  );

  const color =
    state === null
      ? undefined
      : state.status === "unsaved"
        ? token.colorInfo
        : state.status === "draft"
          ? token.colorWarning
          : state.status === "published"
            ? token.colorSuccess
            : token.colorError;
  const error = state?.status === "error" ? state.error ?? labels.readFailed : null;

  return (
    <PhiFlexControl align="center" justify="space-between" gap={12} wrap="wrap" style={{ width: "100%" }}>
      <PhiFlexControl align="center" gap={8} wrap>
        <PhiTagControl color={color}>{buildStatusLabel(state, labels)}</PhiTagControl>
        {state?.subject ? (
          <PhiTypographyControl code style={{ fontSize: 12 }}>
            {state.subject}
          </PhiTypographyControl>
        ) : null}
      </PhiFlexControl>
      {error ? (
        <PhiTypographyControl type="danger" style={{ fontSize: 12 }}>
          {error}
        </PhiTypographyControl>
      ) : null}
    </PhiFlexControl>
  );
}
