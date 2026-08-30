"use client";

import { Skeleton } from "antd";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { PhiSignalAddress, PhiSignalValue } from "../../types/signals";
import type { PhiFormDescriptor } from "../../types/form-descriptor";
import {
  readPhiTableActionSignalValue,
  type PhiTableRowIdentity,
} from "../../types/table-widget";
import type { PhiCmsFormWidgetConfig } from "../../plugins/runtime-modules/core/widgets/form/config";
import { usePhiSignalListener } from "../runtime/runtime-signal-bus";
import { createPhiSignalCorrelationId } from "../runtime/runtime-signal-bus";
import { usePhiSignalInstancesReady } from "../runtime/runtime-signal-registry";
import { usePhiSignalEmitter, usePhiSignalIdentity } from "../runtime/runtime-signal-identity";
import { findPhiSignalRoutesByCapabilityId } from "../../types/signals";
import { isPhiControllerSignalAddress } from "../../types/signals";
import { readPhiRuntimeConditionStateSignalValue } from "../../types/runtime-condition";
import { collectPhiRuntimeValueConditions } from "../../types/runtime-condition";
import { usePhiTableProvider } from "../widgets/client/shared/phi-table-provider";
import { PhiFormControl, type PhiFormControlFormInstance } from "../controls/phi-form-control";
import { usePhiRuntimeFormClient } from "./runtime-form-client";
import { PhiAlertControl } from "../controls/phi-alert-control";
import { usePhiRuntimeFormBinding } from "./runtime-form-binding";

const EMPTY_FORM_VALUES: Record<string, unknown> = {};

export type PhiFormDescriptorRuntimeClientProps = {
  descriptor: PhiFormDescriptor;
  labels?: Readonly<Record<string, string>>;
  formId: string;
  formControllerAddress: PhiSignalAddress;
  widgetConfig?: PhiCmsFormWidgetConfig;
};

export function PhiFormDescriptorRuntimeClient({
  descriptor,
  labels,
  formId,
  formControllerAddress,
  widgetConfig,
}: PhiFormDescriptorRuntimeClientProps) {
  const formClient = usePhiRuntimeFormClient({ controllerAddress: formControllerAddress });
  const formRef = useRef<PhiFormControlFormInstance | null>(null);
  const submitCorrelationRef = useRef<string | null>(null);
  const recordIdentityRef = useRef<string | number | null>(null);
  const identity = usePhiSignalIdentity();
  const emitSignal = usePhiSignalEmitter(identity.sender);
  const source = widgetConfig?.source ?? null;
  const { provider, resource, bindingError } = usePhiTableProvider(source);
  const initialValuesInput = widgetConfig?.formConfig.initialValues;
  const configuredInitialValues = initialValuesInput &&
    typeof initialValuesInput === "object" &&
    !Array.isArray(initialValuesInput)
      ? initialValuesInput as Record<string, unknown>
      : EMPTY_FORM_VALUES;
  const [error, setError] = useState<string | null>(null);
  const [record, setRecord] = useState<Record<string, unknown> | null>(configuredInitialValues);
  const [loading, setLoading] = useState(source !== null);
  const [recordKey, setRecordKey] = useState("inline");
  const [conditionControllerStates, setConditionControllerStates] = useState<
    Record<string, Record<string, unknown>>
  >({});
  const conditionControllerAddresses = useMemo(() => new Set(
    descriptor.fields
      .flatMap((entry) => [entry.visibleWhen, entry.disabledWhen])
      .flatMap(collectPhiRuntimeValueConditions)
      .flatMap((condition) => condition.source === "controller" && condition.controllerAddress
        ? [condition.controllerAddress]
        : []),
  ), [descriptor.fields]);
  const conditionControllerAddressList = useMemo(
    () => [...conditionControllerAddresses],
    [conditionControllerAddresses],
  );
  const conditionControllersReady = usePhiSignalInstancesReady(conditionControllerAddressList);
  const runtimeBinding = usePhiRuntimeFormBinding({
    formRef,
    fieldKeys: descriptor.fields.map((field) => field.key),
    controllerAddress: formControllerAddress,
    scope: identity.scope ?? "page",
  });
  const emitCapability = useCallback((
    capabilityId: string,
    value: PhiSignalValue = null,
    correlationId?: string | null,
  ) => {
    for (const route of findPhiSignalRoutesByCapabilityId(widgetConfig?.signalRoutes?.emits, capabilityId)) {
      if (route.receiver == null || (route.valueType === "json" && !route.valueSchema)) continue;
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
  }, [emitSignal, widgetConfig]);

  const requestSubmit = useCallback((correlationId = createPhiSignalCorrelationId()) => {
    submitCorrelationRef.current = correlationId;
    formRef.current?.submit();
  }, []);

  const requestReset = useCallback((correlationId = createPhiSignalCorrelationId()) => {
    formRef.current?.resetFields();
    formClient.reset({ correlationId });
    emitCapability("resetValues", { values: record ?? configuredInitialValues }, correlationId);
    emitCapability("stateChange", { dirty: false, valid: true }, correlationId);
    emitCapability("resetComplete", null, correlationId);
  }, [configuredInitialValues, emitCapability, formClient, record]);

  const readRecord = useCallback(async (
    rowIdentity: PhiTableRowIdentity | null,
    signal: AbortSignal,
  ) => {
    if (!source) {
      return configuredInitialValues;
    }
    if (bindingError || resource?.recordRead !== true || !provider?.readRecord) {
      throw new Error(bindingError ?? `Table resource "${source.resourceKey}" is not a Form record read source.`);
    }
    return provider.readRecord({
      resourceKey: source.resourceKey,
      rowIdentity,
      params: source.params,
      signal,
    });
  }, [bindingError, configuredInitialValues, provider, resource?.recordRead, source]);

  const loadRecord = useCallback(async (rowIdentity: PhiTableRowIdentity | null) => {
    setLoading(true);
    setError(null);
    const abortController = new AbortController();
    const signal = abortController.signal;
    try {
      const values = await readRecord(rowIdentity, signal);
      if (signal.aborted) return;
      recordIdentityRef.current = rowIdentity;
      setRecord(values);
      setRecordKey(rowIdentity == null ? "singleton" : String(rowIdentity));
    } catch (readError) {
      if (!signal.aborted) {
        setError(readError instanceof Error ? readError.message : "Form record loading failed.");
      }
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [readRecord]);

  useEffect(() => {
    if (!source || widgetConfig?.openActionKey) return;
    const abortController = new AbortController();
    void readRecord(null, abortController.signal).then((values) => {
      if (abortController.signal.aborted) return;
      recordIdentityRef.current = null;
      setRecord(values);
      setRecordKey("singleton");
      setError(null);
    }).catch((readError: unknown) => {
      if (!abortController.signal.aborted) {
        setError(readError instanceof Error ? readError.message : "Form record loading failed.");
      }
    }).finally(() => {
      if (!abortController.signal.aborted) setLoading(false);
    });
    return () => abortController.abort();
  }, [readRecord, source, widgetConfig?.openActionKey]);

  usePhiSignalListener(useCallback((signal) => {
    if (signal.receiver !== identity.receiver && signal.receiver !== "broadcast") return;
    const route = widgetConfig?.signalRoutes?.listens?.find((candidate) =>
      candidate.channel === signal.channel &&
      candidate.action === signal.action &&
      candidate.valueType === signal.valueType &&
      (candidate.valueType !== "json" || candidate.valueSchema === signal.valueSchema));
    if (!route) return;
    if (route.capabilityId === "recordOpen") {
      const action = readPhiTableActionSignalValue(signal.value);
      if (!action || action.actionKey !== (widgetConfig?.openActionKey ?? "edit") || action.rowIdentity == null) return;
      void loadRecord(action.rowIdentity);
      emitCapability("conditionStateRequest");
    } else if (route.capabilityId === "close") {
      requestReset(signal.correlationId);
      emitCapability("cancel", null, signal.correlationId);
    } else if (route.capabilityId === "reload") {
      const rowIdentity = recordIdentityRef.current;
      if (rowIdentity != null) void loadRecord(rowIdentity);
    } else if (route.capabilityId === "submit") {
      requestSubmit(signal.correlationId);
    } else if (route.capabilityId === "reset") {
      requestReset(signal.correlationId);
    } else if (
      route.capabilityId === "conditionStateChange" &&
      isPhiControllerSignalAddress(signal.sender) &&
      conditionControllerAddresses.has(signal.sender)
    ) {
      const next = readPhiRuntimeConditionStateSignalValue(signal.value);
      if (next) {
        setConditionControllerStates((current) => ({ ...current, [signal.sender!]: next.state }));
      }
    }
  }, [conditionControllerAddresses, emitCapability, identity.receiver, loadRecord, requestReset, requestSubmit, widgetConfig]), useMemo(() => {
    const listenRoutes = widgetConfig?.signalRoutes?.listens ?? [];
    return listenRoutes.length === 0 ? null : {
      scopes: Array.from(new Set(listenRoutes.map((route) => route.scope))),
      channels: Array.from(new Set(listenRoutes.map((route) => route.channel))),
      receiver: identity.receiver ?? undefined,
    };
  }, [identity.receiver, widgetConfig]));

  useEffect(() => {
    if (conditionControllerAddresses.size > 0 && conditionControllersReady) {
      emitCapability("conditionStateRequest");
    }
  }, [conditionControllerAddresses, conditionControllersReady, emitCapability]);

  const content = loading ? <Skeleton active paragraph={{ rows: 4 }} /> : (
    <div style={{ display: "grid", gap: "var(--ant-padding-sm)", width: "100%", minWidth: 0 }}>
      {error ? <PhiAlertControl level="error" showIcon title={error} /> : null}
      <PhiFormControl
        key={recordKey}
        descriptor={descriptor}
        labels={labels}
        initialValues={record ?? undefined}
        onFormReady={(activeForm) => {
          formRef.current = activeForm;
        }}
        conditionControllerStates={conditionControllerStates}
        onValuesChange={runtimeBinding.onValuesChange}
        onBlurCapture={runtimeBinding.onBlurCapture}
        onSubmittingChange={(submitting) => {
          emitCapability("submitting", submitting, submitCorrelationRef.current);
          if (!submitting) submitCorrelationRef.current = null;
        }}
        onValidationFailed={(value) => {
          emitCapability("validationFailed", value, submitCorrelationRef.current);
          submitCorrelationRef.current = null;
        }}
        onStateChange={(state) => emitCapability("stateChange", state, submitCorrelationRef.current)}
        onSubmit={async (values) => {
          runtimeBinding.publishSnapshot();
          setError(null);
          const correlationId = submitCorrelationRef.current;
          if (widgetConfig?.execution.mode === "signal") {
            emitCapability("submitValues", { values }, correlationId);
            emitCapability("submitSuccess", null, correlationId);
            return;
          }
          if (!formId) {
            const message = "Form submit handler is not configured.";
            setError(message);
            emitCapability("submitError", { message }, correlationId);
            return;
          }
          try {
            const result = await formClient.submit({ formId, values, correlationId: correlationId ?? undefined });
            if (!result.ok) {
              const message = typeof result.payload?.error === "string"
                ? result.payload.error
                : "Form submission failed.";
              throw new Error(message);
            }
            emitCapability("submitSuccess", null, correlationId);
            const rowIdentity = recordIdentityRef.current;
            if (source && (rowIdentity != null || !widgetConfig?.openActionKey)) {
              void loadRecord(rowIdentity);
            }
          } catch (submitError) {
            const message = submitError instanceof Error ? submitError.message : "Form submission failed.";
            setError(message);
            emitCapability("submitError", { message }, correlationId);
          }
        }}
      />
    </div>
  );

  return content;
}
