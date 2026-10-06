"use client";

import { isPhiRecord } from "../../../../helpers/is-record";
import { createElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PhiRuntimeControllerPlugin, PhiSignalAddress, PhiSignalValue } from "../../../../types";
import { createPhiRuntimeControllerClient } from "../../../../components/runtime/runtime-controller-client-factory";
import { usePhiSignalDispatcher, usePhiSignalListener } from "../../../../components/runtime/runtime-signal-bus";
import { PHI_SIGNAL_VALUE_SCHEMAS } from "../../../../types/signals";
import { readPhiTableQuery } from "../../../../types/table-widget";
import { readPhiTableActionSignalValue } from "../../../../types/table-signal-values";
import { readPhiOverlayCloseRequest } from "../../../../types/cms-overlay";
import { dispatchPhiSignalCapability } from "../../../../components/runtime/runtime-signal-identity";
import {
  PHI_LOCALIZATION_RUNTIME_CONTROLLER_DEFINITION,
  type PhiLocalizationControllerConfig,
} from "../controller/definition";

type LocalizationFilters = {
  locale: string;
  context: string;
  status: string;
};

function PhiLocalizationControllerMount({
  address,
  config,
}: {
  address: PhiSignalAddress;
  config: PhiLocalizationControllerConfig;
}) {
  const dispatchSignal = usePhiSignalDispatcher();
  const filtersRef = useRef<LocalizationFilters>({ locale: "", context: "", status: "all" });
  const [pendingEdit, setPendingEdit] = useState<{
    value: NonNullable<ReturnType<typeof readPhiTableActionSignalValue>>;
    correlationId: string;
  } | null>(null);
  const submittingRef = useRef(false);
  const deliveredEditRef = useRef<string | null>(null);
  const emitRoutes = useMemo(() => config.signalRoutes?.emits ?? [], [config.signalRoutes?.emits]);
  /* One declared output, delivered through every route the Page wrote for it. */
  const emitCapability = useCallback((
    capabilityId: string,
    value: PhiSignalValue,
    correlationId: string,
  ) => dispatchPhiSignalCapability(dispatchSignal, address, emitRoutes, capabilityId, value, correlationId), [address, dispatchSignal, emitRoutes]);

  const closeEditor = useCallback((correlationId: string) => {
    emitCapability("dialogClose", null, correlationId);
  }, [emitCapability]);

  usePhiSignalListener(useCallback((signal) => {
    if (signal.channel === "localizationWorkspace" &&
      signal.action === "change" &&
      signal.valueSchema === PHI_SIGNAL_VALUE_SCHEMAS.localizationWorkspace &&
      isPhiRecord(signal.value)) {
      const value = signal.value as Record<string, unknown>;
      const query = isPhiRecord(value.query)
        ? value.query as Record<string, unknown>
        : {};
      filtersRef.current = {
        locale: typeof value.selectedLocale === "string" ? value.selectedLocale : filtersRef.current.locale,
        context: typeof query.context === "string" ? query.context : filtersRef.current.context,
        status: typeof query.status === "string" ? query.status : filtersRef.current.status,
      };
      if (typeof value.sourceLocale === "string" && value.sourceLocale) {
        emitCapability("sourceLocale", value.sourceLocale, signal.correlationId);
      }
      if (filtersRef.current.locale) {
        dispatchSignal({
          scope: "area",
          channel: "targetLocaleSelection",
          action: "change",
          value: filtersRef.current.locale,
          valueType: "string",
          sender: address,
          receiver: "broadcast",
          correlationId: signal.correlationId,
          timestamp: Date.now(),
        });
      }
      return;
    }
    if (signal.receiver !== address) return;

    if (signal.channel === "query" && signal.action === "change") {
      const query = readPhiTableQuery(signal.value);
      if (!query) return;
      const filters = query.filters ?? {};
      const previousContext = filtersRef.current.context;
      filtersRef.current = {
        locale: typeof filters.locale === "string" ? filters.locale : filtersRef.current.locale,
        context: typeof filters.context === "string" ? filters.context : "",
        status: typeof filters.status === "string" ? filters.status : filtersRef.current.status,
      };
      if (previousContext !== filtersRef.current.context) {
        dispatchSignal({
          scope: "area", channel: "contextSelection", action: "change",
          value: filtersRef.current.context || "all", valueType: "string", sender: address,
          receiver: "broadcast", correlationId: signal.correlationId, timestamp: Date.now(),
        });
      }
      return;
    }

    if (signal.channel === "action" && signal.action === "activate") {
      const action = readPhiTableActionSignalValue(signal.value);
      if (!action || action.actionKey !== "edit" || action.rowIdentity == null) return;
      deliveredEditRef.current = null;
      setPendingEdit({ value: action, correlationId: signal.correlationId });
      emitCapability("dialogOpen", null, signal.correlationId);
      return;
    }

    if (signal.channel === "command" && signal.action === "activate" && (signal.value === "save" || signal.value === "cancel")) {
      if (signal.value === "save") {
        if (!submittingRef.current) emitCapability("formSubmit", null, signal.correlationId);
      } else if (!submittingRef.current) {
        emitCapability("formReset", null, signal.correlationId);
        closeEditor(signal.correlationId);
      }
      return;
    }

    if (signal.channel === "dialog" && signal.action === "close") {
      const request = readPhiOverlayCloseRequest(signal.value);
      if (request && !submittingRef.current) {
        emitCapability("formReset", null, signal.correlationId);
        closeEditor(signal.correlationId);
      }
      return;
    }

    if (signal.channel === "submitting" && signal.action === "change" && typeof signal.value === "boolean") {
      submittingRef.current = signal.value;
      emitCapability("saveSubmitting", signal.value, signal.correlationId);
      return;
    }

    if (signal.channel === "submit" && signal.action === "activate") {
      closeEditor(signal.correlationId);
      emitCapability("reload", null, signal.correlationId);
      return;
    }

    if (signal.channel === "state" && signal.action === "change" && signal.value === false) {
      submittingRef.current = false;
      deliveredEditRef.current = null;
      setPendingEdit(null);
      return;
    }
    const next = { ...filtersRef.current };
    if (signal.channel === "locale" && signal.action === "change" && typeof signal.value === "string") {
      next.locale = signal.value;
    } else if (signal.channel === "context") {
      next.context = signal.action === "clear" || signal.value === "all"
        ? ""
        : typeof signal.value === "string" ? signal.value : next.context;
    } else if (signal.channel === "status" && signal.action === "change" && typeof signal.value === "string") {
      next.status = signal.value;
    } else if ((signal.channel === "query" && signal.action === "clear") ||
      (signal.channel === "command" && signal.action === "activate" && signal.value === "reset")) {
      next.context = "";
      next.status = "all";
      dispatchSignal({
        scope: "page",
        channel: "search",
        action: "clear",
        value: null,
        valueType: "none",
        sender: address,
        receiver: "broadcast",
        correlationId: signal.correlationId,
        timestamp: Date.now(),
      });
      dispatchSignal({
        scope: "area",
        channel: "contextSelection",
        action: "change",
        value: "all",
        valueType: "string",
        sender: address,
        receiver: "broadcast",
        correlationId: signal.correlationId,
        timestamp: Date.now(),
      });
      dispatchSignal({
        scope: "area",
        channel: "statusSelection",
        action: "change",
        value: "all",
        valueType: "string",
        sender: address,
        receiver: "broadcast",
        correlationId: signal.correlationId,
        timestamp: Date.now(),
      });
    } else if (signal.channel === "command" && signal.action === "activate" && signal.value === "reload") {
      dispatchSignal({
        scope: "page",
        channel: "reload",
        action: "activate",
        value: null,
        valueType: "none",
        sender: address,
        receiver: "broadcast",
        correlationId: signal.correlationId,
        timestamp: Date.now(),
      });
      return;
    } else {
      return;
    }
    filtersRef.current = next;
    dispatchSignal({
      scope: "page",
      channel: "filters",
      action: "change",
      value: next,
      valueType: "json",
      valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableFilters,
      sender: address,
      receiver: "broadcast",
      correlationId: signal.correlationId,
      timestamp: Date.now(),
    });
  }, [address, closeEditor, dispatchSignal, emitCapability]), {
    scopes: ["page", "area"],
    channels: ["locale", "context", "status", "query", "command", "localizationWorkspace", "action", "dialog", "submitting", "submit", "state"],
  },
  /* The address this listener answers for; without it the bus holds every signal sent here. */
  address);

  useEffect(() => {
    if (!pendingEdit) return;
    const deliveryKey = `${pendingEdit.correlationId}:${String(pendingEdit.value.rowIdentity)}`;
    if (deliveredEditRef.current === deliveryKey) return;
    deliveredEditRef.current = deliveryKey;
    emitCapability("recordOpen", pendingEdit.value, pendingEdit.correlationId);
  }, [emitCapability, pendingEdit]);

  return null;
}

export const PHI_LOCALIZATION_RUNTIME_CONTROLLER_PLUGIN = {
  ...PHI_LOCALIZATION_RUNTIME_CONTROLLER_DEFINITION,
  renderController: ({ address, config }) => createElement(PhiLocalizationControllerMount, { address, config }),
} satisfies PhiRuntimeControllerPlugin<PhiLocalizationControllerConfig>;

export const PhiLocalizationRuntimeControllerClient = createPhiRuntimeControllerClient(
  PHI_LOCALIZATION_RUNTIME_CONTROLLER_PLUGIN,
);
