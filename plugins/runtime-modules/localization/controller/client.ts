"use client";

import { createElement, useCallback, useEffect, useRef, useState } from "react";
import type { PhiRuntimeControllerPlugin, PhiSignal, PhiSignalAddress } from "../../../../types";
import { createPhiRuntimeControllerClient } from "../../../../components/runtime/runtime-controller-client-factory";
import { usePhiSignalDispatcher, usePhiSignalListener } from "../../../../components/runtime/runtime-signal-bus";
import { PHI_SIGNAL_VALUE_SCHEMAS } from "../../../../types/signals";
import { createPhiSignalAddress, createPhiSignalSubcontrolAddress } from "../../../../types/signals";
import { readPhiTableActionSignalValue, readPhiTableQuery } from "../../../../types/table-widget";
import { readPhiOverlayCloseRequest } from "../../../../types/cms-overlay";
import { usePhiSignalReceiverReady } from "../../../../components/runtime/runtime-signal-registry";
import {
  PHI_EDITOR_TRANSLATION_FORM_WIDGET_ID,
  PHI_EDITOR_TRANSLATION_COMMANDS_WIDGET_ID,
  PHI_EDITOR_TRANSLATION_OVERLAY_ID,
  PHI_EDITOR_TRANSLATIONS_SOURCE_LOCALE_WIDGET_ID,
  PHI_EDITOR_TRANSLATIONS_WIDGET_ID,
} from "../../../../components/regions/presets/editor-shell";
import {
  PHI_LOCALIZATION_RUNTIME_CONTROLLER_DEFINITION,
  type PhiLocalizationControllerConfig,
} from "../controller/definition";

type LocalizationFilters = {
  locale: string;
  context: string;
  status: string;
};

function PhiLocalizationControllerMount({ address }: { address: PhiSignalAddress }) {
  const dispatchSignal = usePhiSignalDispatcher();
  const filtersRef = useRef<LocalizationFilters>({ locale: "", context: "", status: "all" });
  const [pendingEdit, setPendingEdit] = useState<{
    value: NonNullable<ReturnType<typeof readPhiTableActionSignalValue>>;
    correlationId: string;
  } | null>(null);
  const submittingRef = useRef(false);
  const deliveredEditRef = useRef<string | null>(null);
  const formAddress = createPhiSignalAddress("cms", PHI_EDITOR_TRANSLATION_FORM_WIDGET_ID);
  const overlayAddress = createPhiSignalAddress("cms", PHI_EDITOR_TRANSLATION_OVERLAY_ID);
  const tableAddress = createPhiSignalAddress("cms", PHI_EDITOR_TRANSLATIONS_WIDGET_ID);
  const sourceLocaleAddress = createPhiSignalAddress("cms", PHI_EDITOR_TRANSLATIONS_SOURCE_LOCALE_WIDGET_ID);
  const saveActionAddress = createPhiSignalSubcontrolAddress("cms", PHI_EDITOR_TRANSLATION_COMMANDS_WIDGET_ID, "save");
  const formReady = usePhiSignalReceiverReady(formAddress);

  const send = useCallback((input: {
    receiver: PhiSignalAddress;
    channel: string;
    action: "activate" | "change" | "close";
    value: null | string | boolean | Record<string, unknown>;
    valueType: "none" | "string" | "boolean" | "json";
    valueSchema?: PhiSignal["valueSchema"];
    correlationId: string;
  }) => dispatchSignal({
    scope: "page",
    sender: address,
    receiver: input.receiver,
    channel: input.channel,
    action: input.action,
    value: input.value,
    valueType: input.valueType,
    valueSchema: input.valueSchema ?? null,
    correlationId: input.correlationId,
    timestamp: Date.now(),
  }), [address, dispatchSignal]);

  const closeEditor = useCallback((correlationId: string) => {
    send({ receiver: overlayAddress, channel: "dialog", action: "close", value: null, valueType: "none", correlationId });
  }, [overlayAddress, send]);

  usePhiSignalListener(useCallback((signal) => {
    if (signal.channel === "localizationWorkspace" &&
      signal.action === "change" &&
      signal.valueSchema === PHI_SIGNAL_VALUE_SCHEMAS.localizationWorkspace &&
      signal.value && typeof signal.value === "object" && !Array.isArray(signal.value)) {
      const value = signal.value as Record<string, unknown>;
      const query = value.query && typeof value.query === "object" && !Array.isArray(value.query)
        ? value.query as Record<string, unknown>
        : {};
      filtersRef.current = {
        locale: typeof value.selectedLocale === "string" ? value.selectedLocale : filtersRef.current.locale,
        context: typeof query.context === "string" ? query.context : filtersRef.current.context,
        status: typeof query.status === "string" ? query.status : filtersRef.current.status,
      };
      if (typeof value.sourceLocale === "string" && value.sourceLocale) {
        dispatchSignal({
          scope: "area",
          channel: "text",
          action: "change",
          value: value.sourceLocale,
          valueType: "string",
          sender: address,
          receiver: sourceLocaleAddress,
          correlationId: signal.correlationId,
          timestamp: Date.now(),
        });
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
      send({ receiver: overlayAddress, channel: "dialog", action: "activate", value: null, valueType: "none", correlationId: signal.correlationId });
      return;
    }

    if (signal.channel === "command" && signal.action === "activate" && (signal.value === "save" || signal.value === "cancel")) {
      if (signal.value === "save") {
        if (!submittingRef.current) send({ receiver: formAddress, channel: "submit", action: "activate", value: null, valueType: "none", correlationId: signal.correlationId });
      } else if (!submittingRef.current) {
        send({ receiver: formAddress, channel: "reset", action: "activate", value: null, valueType: "none", correlationId: signal.correlationId });
        closeEditor(signal.correlationId);
      }
      return;
    }

    if (signal.channel === "dialog" && signal.action === "close") {
      const request = readPhiOverlayCloseRequest(signal.value);
      if (request && !submittingRef.current) {
        send({ receiver: formAddress, channel: "reset", action: "activate", value: null, valueType: "none", correlationId: signal.correlationId });
        closeEditor(signal.correlationId);
      }
      return;
    }

    if (signal.channel === "submitting" && signal.action === "change" && typeof signal.value === "boolean") {
      submittingRef.current = signal.value;
      send({ receiver: saveActionAddress, channel: "submitting", action: "change", value: signal.value, valueType: "boolean", correlationId: signal.correlationId });
      return;
    }

    if (signal.channel === "submit" && signal.action === "activate" && signal.sender === formAddress) {
      closeEditor(signal.correlationId);
      send({ receiver: tableAddress, channel: "reload", action: "activate", value: null, valueType: "none", correlationId: signal.correlationId });
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
  }, [address, closeEditor, dispatchSignal, formAddress, overlayAddress, send, sourceLocaleAddress, tableAddress]), {
    scopes: ["page", "area"],
    channels: ["locale", "context", "status", "query", "command", "localizationWorkspace", "action", "dialog", "submitting", "submit", "state"],
  });

  useEffect(() => {
    if (!pendingEdit || !formReady) return;
    const deliveryKey = `${pendingEdit.correlationId}:${String(pendingEdit.value.rowIdentity)}`;
    if (deliveredEditRef.current === deliveryKey) return;
    deliveredEditRef.current = deliveryKey;
    send({
      receiver: formAddress,
      channel: "action",
      action: "activate",
      value: pendingEdit.value,
      valueType: "json",
      valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction,
      correlationId: pendingEdit.correlationId,
    });
  }, [formAddress, formReady, pendingEdit, send]);

  return null;
}

export const PHI_LOCALIZATION_RUNTIME_CONTROLLER_PLUGIN = {
  ...PHI_LOCALIZATION_RUNTIME_CONTROLLER_DEFINITION,
  renderController: ({ address }) => createElement(PhiLocalizationControllerMount, { address }),
} satisfies PhiRuntimeControllerPlugin<PhiLocalizationControllerConfig>;

export const PhiLocalizationRuntimeControllerClient = createPhiRuntimeControllerClient(
  PHI_LOCALIZATION_RUNTIME_CONTROLLER_PLUGIN,
);
