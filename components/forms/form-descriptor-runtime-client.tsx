"use client";

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
import { usePhiSignalEmitter, usePhiSignalIdentity } from "../runtime/runtime-signal-identity";
import { findPhiSignalRoutesByCapabilityId } from "../../types/signals";
import { isPhiControllerSignalAddress } from "../../types/signals";
import { readPhiRuntimeConditionStateSignalValue } from "../../types/runtime-condition";
import { collectPhiRuntimeValueConditions } from "../../types/runtime-condition";
import { usePhiTableProvider } from "../widgets/client/shared/phi-table-provider";
import { PhiFormControl, type PhiFormControlFormInstance } from "../controls/phi-form-control";
import { resolvePhiFormText } from "./form-descriptor-contract";
import { PhiFormWidgetSubmitOutlet, usePhiFormWidgetSubmit } from "./phi-form-widget-frame";
import { usePhiRuntimeFormClient } from "./runtime-form-client";
import { PhiAlertControl } from "../controls/phi-alert-control";
import { usePhiRuntimeFormBinding } from "./runtime-form-binding";
import { usePhiRuntimePageConditionState } from "../runtime/runtime-page-condition-state";
import { usePhiApplicationFeedback } from "../runtime/use-phi-application-feedback";
import type { PhiFormGuardProps } from "./contracts";
import { requestPhiFormGuard } from "./form-guard-client";
import { PhiSkeletonControl } from "../controls/phi-skeleton-control";

const EMPTY_FORM_VALUES: Record<string, unknown> = {};

export type PhiFormDescriptorRuntimeClientProps = {
  descriptor: PhiFormDescriptor;
  labels?: Readonly<Record<string, string>>;
  /** What the form already knows, read on the server for this render. */
  loadedInitialValues?: Record<string, unknown> | null;
  formId: string;
  formControllerAddress: PhiSignalAddress;
  widgetConfig?: PhiCmsFormWidgetConfig;
};

export function PhiFormDescriptorRuntimeClient({
  descriptor,
  labels,
  loadedInitialValues,
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
  const initialValuesFromQueryInput = widgetConfig?.formConfig.initialValuesFromQuery;
  const page = usePhiRuntimePageConditionState();
  /*
   * What the address carries, for the fields the placement says it carries them for.
   *
   * A confirmation link is the only place a token exists, and the form that spends it must not ask the
   * visitor to copy it out of the address bar. Which parameter feeds which field is placement, not the
   * form's own business: the same form is reachable from a link, from an operator's tool, or from a
   * page that already knows the answer, and only the placement knows which.
   */
  const queryInitialValues = useMemo(() => {
    const mapping = initialValuesFromQueryInput &&
      typeof initialValuesFromQueryInput === "object" &&
      !Array.isArray(initialValuesFromQueryInput)
        ? initialValuesFromQueryInput as Record<string, unknown>
        : null;
    if (!mapping) return null;
    const values: Record<string, unknown> = {};
    for (const [fieldKey, parameter] of Object.entries(mapping)) {
      const value = typeof parameter === "string" ? page.query[parameter] : undefined;
      if (value !== undefined) values[fieldKey] = value;
    }
    return Object.keys(values).length > 0 ? values : null;
  }, [initialValuesFromQueryInput, page.query]);
  /*
   * What the author wrote, under what the address carries, under what the server read. The author's
   * values are placement -- a form opened with a name already filled in -- while the loaded ones are
   * the form's own, and a placement cannot be allowed to overwrite what it knows nothing about.
   */
  const configuredInitialValues = useMemo(() => {
    const authored = initialValuesInput &&
      typeof initialValuesInput === "object" &&
      !Array.isArray(initialValuesInput)
        ? initialValuesInput as Record<string, unknown>
        : null;
    if (!authored && !queryInitialValues && !loadedInitialValues) {
      return EMPTY_FORM_VALUES;
    }
    return { ...authored, ...queryInitialValues, ...loadedInitialValues };
  }, [initialValuesInput, loadedInitialValues, queryInitialValues]);
  const [error, setError] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);
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

  /*
   * That the values now in the form have already been rejected, and nothing has changed since.
   *
   * It exists because a submit changes the state it is triggered by: validation writes its errors onto
   * the fields, Ant Design reports that as a field change, and a placement that reads "the state
   * changed" as "save this" asks for the same submit again -- which fails again, for the same reason,
   * as fast as the browser can manage. Set when validation refuses, cleared as soon as a value moves.
   */
  const rejectedRef = useRef(false);

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
    /*
     * What this form's own Controller says back is not an instruction to this form.
     *
     * Every form is bound to a Form Controller, and that Controller answers a command by sending it on
     * to the form it belongs to -- same channel, same action, addressed here. The binding applies those
     * answers; this listener is for what a Preset wired. Reading them as Preset signals made `reset`
     * into a loop with no end: the route called `requestReset`, which tells the Controller, which sent
     * the reset back here, which called `requestReset` again. Thousands of deliveries a second, one
     * blocked main thread -- the Users Page froze on Cancel and its edit form never left its skeleton.
     */
    if (signal.sender === formControllerAddress) return;
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
      emitCapability("conditionStateRequest", null, signal.correlationId);
    } else if (route.capabilityId === "close") {
      requestReset(signal.correlationId);
      emitCapability("cancel", null, signal.correlationId);
    } else if (route.capabilityId === "reload") {
      const rowIdentity = recordIdentityRef.current;
      if (rowIdentity != null) void loadRecord(rowIdentity);
    } else if (route.capabilityId === "submit") {
      /*
       * Asked again for values already refused, with nothing changed since, this is not a second
       * submit -- it is the first one arriving twice, and answering it is how the loop above spins. A
       * person pressing Save is not filtered here: they are asking to be shown the reason again, and
       * `requestSubmit` runs for them either way.
       */
      if (!rejectedRef.current) requestSubmit(signal.correlationId);
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
  }, [conditionControllerAddresses, emitCapability, formControllerAddress, identity.receiver, loadRecord, requestReset, requestSubmit, widgetConfig]), useMemo(() => {
    const listenRoutes = widgetConfig?.signalRoutes?.listens ?? [];
    return listenRoutes.length === 0 ? null : {
      scopes: Array.from(new Set(listenRoutes.map((route) => route.scope))),
      channels: Array.from(new Set(listenRoutes.map((route) => route.channel))),
      receiver: identity.receiver ?? undefined,
    };
  }, [identity.receiver, widgetConfig]));

  useEffect(() => {
    if (conditionControllerAddresses.size > 0) {
      emitCapability("conditionStateRequest");
    }
  }, [conditionControllerAddresses, emitCapability]);

  /*
   * The guard token of a form that declares one, asked for as soon as the form is in the browser.
   *
   * Its `issuedAt` is the moment the visitor was shown the form, which is what the server measures a
   * submit against: too fast is a bot, too late is expired. It is added to the values when they are
   * submitted rather than kept in hidden fields, so resetting the form after a success cannot empty it.
   * A request that failed is forgotten, and the next submit asks again.
   */
  const guardRef = useRef<Promise<PhiFormGuardProps> | null>(null);
  const readGuard = useCallback(() => {
    const pending = guardRef.current ?? requestPhiFormGuard(formId);
    guardRef.current = pending;
    pending.catch(() => {
      if (guardRef.current === pending) guardRef.current = null;
    });
    return pending;
  }, [formId]);
  useEffect(() => {
    if (descriptor.guard && formId) void readGuard().catch(() => undefined);
  }, [descriptor.guard, formId, readGuard]);

  /*
   * What the Widget presses when it draws a submit: `requestSubmit`, the same call the `submit`
   * capability makes when a Button Widget outside asks for one. One path, so the two cannot disagree
   * about what submitting means -- the button shows the loading state of a submit somebody else
   * started, because there is only one submit to be in.
   */
  const submitSlot = usePhiFormWidgetSubmit(
    () => requestSubmit(),
    labels?.["actions.submitLabel"],
  );

  /*
   * What has been typed, kept for as long as the tab is open, where the form asks for it.
   *
   * The long form is the case: somebody following the consent link to read the terms comes back to an
   * empty form otherwise. Session storage can be refused outright -- a private window, blocked site
   * data -- and a draft is a convenience, so every access is allowed to fail silently.
   */
  const draftStorageKey = descriptor.persistDraft ? `phi.form.draft:${descriptor.key}` : null;
  const clearDraft = useCallback(() => {
    if (!draftStorageKey) return;
    try {
      window.sessionStorage.removeItem(draftStorageKey);
    } catch {
      // A draft nobody can store is a draft nobody has to clear.
    }
  }, [draftStorageKey]);

  /*
   * Written into the mounted form rather than into this component's state: the server rendered the form
   * empty, and what is in session storage is known only to the browser. Handing it to React as state
   * would make the first client render disagree with the server's.
   */
  useEffect(() => {
    if (!draftStorageKey) return;
    try {
      const raw = window.sessionStorage.getItem(draftStorageKey);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        formRef.current?.setFieldsValue(parsed as Record<string, unknown>);
      }
    } catch {
      // Unreadable or unparseable: the form simply opens empty.
    }
  }, [draftStorageKey]);

  /*
   * What the form says for itself when a submit is accepted, and nothing where it declares no success:
   * a form inside an Overlay that closes on `submitSuccess` would otherwise announce a result nobody
   * stays to read.
   */
  const success = descriptor.success;
  /*
   * The same outcome, said a second time where the reader is looking.
   *
   * Only where the placement asked for it: a Form on a Page of its own has the reader's attention and
   * says everything it needs to say in place, while a Settings panel is one of several and a switch
   * that saves on change shows nothing at all. What a success says is the descriptor's own words where
   * it has them, and otherwise the placement's; a failure says what went wrong, which only the answer
   * knows.
   */
  const feedback = widgetConfig?.feedback ?? null;
  const { showMessage, showNotification } = usePhiApplicationFeedback();
  const report = useCallback((
    level: "success" | "error",
    content: string,
    correlationId: string | null,
  ) => {
    if (!feedback || !content) {
      return;
    }
    const options = correlationId ? { correlationId } : undefined;
    if (feedback.mode === "notification") {
      showNotification({ level, title: content }, options);
      return;
    }
    showMessage({ level, content }, options);
  }, [feedback, showMessage, showNotification]);

  const reportSuccess = useCallback((correlationId: string | null = null) => {
    clearDraft();
    report(
      "success",
      (success ? resolvePhiFormText(success.title, labels) : null) ?? feedback?.successText ?? "",
      correlationId,
    );
    if (!success) {
      return;
    }
    setSucceeded(true);
    if (success.reset) {
      formRef.current?.resetFields();
    }
  }, [clearDraft, feedback?.successText, labels, report, success]);

  /*
   * Where the answer belongs is the placement's decision, and naming a place is choosing it: a Form
   * with a `feedback` config says it there and not also in place, because two answers to one submit
   * read as two things having happened. Field validation is untouched -- that is not an answer to a
   * submit, it is a question about a field, and it belongs next to the field either way.
   */
  const answersInPlace = feedback == null;
  const content = loading ? <PhiSkeletonControl lines={4} withTitle /> : (
    <>
      {answersInPlace && error ? <PhiAlertControl level="error" showIcon title={error} /> : null}
      {answersInPlace && succeeded && success ? (
        <PhiAlertControl
          level="success"
          showIcon
          title={resolvePhiFormText(success.title, labels)}
          description={success.text ? resolvePhiFormText(success.text, labels) : undefined}
        />
      ) : null}
      <PhiFormControl
        key={recordKey}
        descriptor={descriptor}
        labels={labels}
        formConfig={widgetConfig?.formConfig}
        initialValues={record ?? undefined}
        onFormReady={(activeForm) => {
          formRef.current = activeForm;
        }}
        conditionControllerStates={conditionControllerStates}
        onValuesChange={(changed, all) => {
          // A value moved, so whatever validation refused before is no longer what is being asked.
          rejectedRef.current = false;
          runtimeBinding.onValuesChange(changed, all);
          if (draftStorageKey) {
            try {
              window.sessionStorage.setItem(draftStorageKey, JSON.stringify(all));
            } catch {
              // Storage refused; what was typed simply is not kept.
            }
          }
        }}
        onBlurCapture={runtimeBinding.onBlurCapture}
        onSubmittingChange={(submitting) => {
          submitSlot?.setSubmitting(submitting);
          emitCapability("submitting", submitting, submitCorrelationRef.current);
          if (!submitting) submitCorrelationRef.current = null;
        }}
        onValidationFailed={(value) => {
          rejectedRef.current = true;
          emitCapability("validationFailed", value, submitCorrelationRef.current);
          submitCorrelationRef.current = null;
        }}
        onStateChange={(state) => emitCapability("stateChange", state, submitCorrelationRef.current)}
        onSubmit={async (values) => {
          runtimeBinding.publishSnapshot();
          setError(null);
          setSucceeded(false);
          const correlationId = submitCorrelationRef.current;
          if (widgetConfig?.execution.mode === "signal") {
            emitCapability("submitValues", { values }, correlationId);
            emitCapability("submitSuccess", { ok: true, payload: null }, correlationId);
            reportSuccess(correlationId);
            return;
          }
          if (!formId) {
            const message = "Form submit handler is not configured.";
            setError(message);
            report("error", message, correlationId);
            emitCapability("submitError", { message }, correlationId);
            return;
          }
          try {
            const guard = descriptor.guard ? await readGuard() : null;
            const result = await formClient.submit({
              formId,
              values: guard ? { ...values, ...guard } : values,
              phase: widgetConfig?.execution.phase ?? "submit",
              correlationId: correlationId ?? undefined,
            });
            if (!result.ok) {
              const message = typeof result.payload?.error === "string"
                ? result.payload.error
                : "Form submission failed.";
              throw new Error(message);
            }
            emitCapability(
              "submitSuccess",
              { ok: result.ok, status: result.status, payload: result.payload ?? null },
              correlationId,
            );
            reportSuccess(correlationId);
            const rowIdentity = recordIdentityRef.current;
            if (source && (rowIdentity != null || !widgetConfig?.openActionKey)) {
              void loadRecord(rowIdentity);
            }
          } catch (submitError) {
            const message = submitError instanceof Error ? submitError.message : "Form submission failed.";
            setError(message);
            report("error", message, correlationId);
            emitCapability("submitError", { message }, correlationId);
          }
        }}
      />
      <PhiFormWidgetSubmitOutlet />
    </>
  );

  return content;
}
