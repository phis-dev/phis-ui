"use client";

import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Button, Divider, Flex, Skeleton, Typography } from "antd";
import { usePathname, useSearchParams } from "next/navigation";
import { LoginForm, type LoginFormLabels, type LoginFormValues } from "../../forms/login-form";
import { PHI_SHARED_FORM_IDS } from "../../forms/shared-form-ids";
import type { PhiClientBlockBaseProps, PhiBlockRuntime, PhiSignalAddress } from "../../../types";
import { normalizeLoginRedirectTarget, resolveSafePostLoginTarget } from "../login-redirect";
import { usePhiRuntimeFormClient } from "../../forms/runtime-form-client";
import type { PhiFormDescriptor } from "../../../types/form-descriptor";
import type { PhiAuthWorkflow } from "./auth-workflow-body";
import { PhiFormControl, type PhiFormControlHandle } from "../../controls/phi-form-control";
import { PHI_PROVIDER_LINK_CONFIRMATION_FORM_DESCRIPTOR } from "../../forms/shared-form-descriptors";
import { PhiAlertControl } from "../../controls/phi-alert-control";
import { PhiButtonControl } from "../../controls/phi-button-control";
import { usePhiSignalListener } from "../../runtime/runtime-signal-bus";
import { PHI_FORM_SIGNAL_CHANNELS } from "../../forms/runtime-form-controller-signals";
import { readPhiRuntimeFormValuesSignalValue } from "../../forms/runtime-form-state";
import { PHI_SIGNAL_VALUE_SCHEMAS } from "../../../types/signals";

const PhiAuthWorkflowBody = lazy(
  () => import("./auth-workflow-body")
    .then((module) => ({ default: module.PhiAuthWorkflowBody })),
);

export type PhiLoginWidgetConfig = {
  forgotPasswordHref?: string;
};

export type PhiLoginWidgetProps = PhiClientBlockBaseProps<
  LoginFormLabels,
  PhiLoginWidgetConfig,
  Pick<PhiBlockRuntime, "site" | "locale">
> & {
  forgotPasswordHref?: string;
  onSuccess?: (payload: { area?: string | null }) => void;
  formId?: string;
  formControllerAddress?: PhiSignalAddress | null;
  descriptor?: PhiFormDescriptor;
  nextPath?: string | null;
};

type PhiPublicAuthManifest = {
  version: 1;
  registrationMode: "disabled" | "invite-only" | "automatic";
  methods: Array<{
    methodKey: string;
    stage: "primary" | "second-factor" | "step-up" | "recovery";
    label: string;
    icon?: string;
    startPath: string;
  }>;
};

function resolveLoginErrorMessage(
  labels: LoginFormLabels | undefined,
  message: string | undefined,
  code: string | undefined,
) {
  const resolvedErrorAccountDisabled =
    labels?.errors?.accountDisabled ?? "Your account is disabled. Please contact support.";
  const resolvedErrorInitSession =
    labels?.errors?.initSession ?? "Could not initialize login session.";
  const resolvedErrorInvalidCredentials =
    labels?.errors?.invalidCredentials ?? "Invalid credentials.";
  const resolvedErrorLoginFailed = labels?.errors?.loginFailed ?? "Login failed.";

  const normalized = message?.trim();
  if (!normalized) {
    return resolvedErrorLoginFailed;
  }

  if (code === "account_disabled" || normalized === "Account disabled.") {
    return resolvedErrorAccountDisabled;
  }

  if (normalized === "Invalid credentials.") {
    return resolvedErrorInvalidCredentials;
  }

  if (normalized === "Invalid CSRF token.") {
    return resolvedErrorInitSession;
  }

  return normalized;
}

export function PhiLoginWidget({
  runtime,
  labels,
  config,
  forgotPasswordHref,
  onSuccess,
  formId,
  formControllerAddress,
  descriptor,
  nextPath: explicitNextPath,
}: PhiLoginWidgetProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const formController = usePhiRuntimeFormClient({
    controllerAddress: formControllerAddress,
  });
  const [manifest, setManifest] = useState<PhiPublicAuthManifest | null>(null);
  const [manifestError, setManifestError] = useState<string | null>(null);
  const [startingMethod, setStartingMethod] = useState<string | null>(null);
  const [workflow, setWorkflow] = useState<PhiAuthWorkflow | null>(null);
  const [confirmingLink, setConfirmingLink] = useState(false);
  const providerLinkFormRef = useRef<PhiFormControlHandle | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkConfirmationDismissed, setLinkConfirmationDismissed] = useState(false);
  const [controllerNextPath, setControllerNextPath] = useState<string | null>(null);
  const resolvedNextPath = explicitNextPath ?? controllerNextPath;
  const loginInitialValues = useMemo(
    () => resolvedNextPath ? { next: resolvedNextPath } : undefined,
    [resolvedNextPath],
  );
  const authContinuationRequested = searchParams.get("auth") === "continue";
  const providerLinkRequired =
    searchParams.get("auth") === "link_required" && !linkConfirmationDismissed;

  usePhiSignalListener((signal) => {
    if (
      !formControllerAddress ||
      signal.sender !== formControllerAddress ||
      signal.channel !== PHI_FORM_SIGNAL_CHANNELS.values ||
      signal.action !== "change" ||
      signal.valueSchema !== PHI_SIGNAL_VALUE_SCHEMAS.formValues
    ) return;
    const values = readPhiRuntimeFormValuesSignalValue(signal.value)?.values;
    const next = typeof values?.next === "string" ? normalizeLoginRedirectTarget(values.next) : null;
    setControllerNextPath(next);
  }, {
    channels: [PHI_FORM_SIGNAL_CHANNELS.values],
    actions: ["change"],
  });

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/auth/manifest", {
      credentials: "include",
      cache: "no-store",
      headers: { accept: "application/json" },
      signal: controller.signal,
    }).then(async (response) => {
      const payload = await response.json().catch(() => null) as PhiPublicAuthManifest | null;
      if (!response.ok || !payload || payload.version !== 1 || !Array.isArray(payload.methods)) {
        throw new Error("Authentication methods could not be loaded.");
      }
      setManifest(payload);
      setManifestError(null);
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) {
        setManifestError(error instanceof Error ? error.message : "Authentication methods could not be loaded.");
      }
    });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/auth/workflow", {
      credentials: "include",
      cache: "no-store",
      headers: { accept: "application/json" },
      signal: controller.signal,
    }).then(async (response) => {
      const payload = await response.json().catch(() => null) as { workflow?: PhiAuthWorkflow } | null;
      if (response.status === 401 && !authContinuationRequested) {
        return;
      }
      if (!response.ok || !payload?.workflow) {
        throw new Error("Authentication workflow could not be resumed.");
      }
      if (payload.workflow.state !== "complete") {
        setWorkflow(payload.workflow);
      }
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) {
        setManifestError(error instanceof Error ? error.message : "Authentication workflow could not be resumed.");
      }
    });
    return () => controller.abort();
  }, [authContinuationRequested]);

  async function navigateAfterCompletion(area: string | null, nextTarget: string | null) {
    const fallbackArea = area?.trim().toLowerCase() ?? "";
    if (fallbackArea) {
      window.location.assign(await resolveSafePostLoginTarget(
        nextTarget ?? pathname,
        runtime?.locale.current ?? "en",
        fallbackArea,
      ));
      return;
    }
    window.location.assign(nextTarget || "/");
  }

  async function startExternalMethod(method: PhiPublicAuthManifest["methods"][number]) {
    setStartingMethod(method.methodKey);
    setManifestError(null);
    try {
      const csrfResponse = await fetch("/api/auth/csrf", {
        credentials: "include",
        cache: "no-store",
      });
      const csrfPayload = await csrfResponse.json().catch(() => null) as { token?: unknown } | null;
      const csrfToken = typeof csrfPayload?.token === "string" ? csrfPayload.token : "";
      if (!csrfResponse.ok || !csrfToken) {
        throw new Error("Could not initialize login session.");
      }
      const nextPath = resolvedNextPath ?? normalizeLoginRedirectTarget(searchParams.get("next"));
      const response = await fetch(method.startPath, {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({ next: nextPath ?? pathname }),
      });
      const payload = await response.json().catch(() => null) as { redirectUrl?: unknown; error?: unknown } | null;
      if (!response.ok || typeof payload?.redirectUrl !== "string") {
        throw new Error(typeof payload?.error === "string" ? payload.error : "Authentication could not be started.");
      }
      window.location.assign(payload.redirectUrl);
    } catch (error) {
      setManifestError(error instanceof Error ? error.message : "Authentication could not be started.");
      setStartingMethod(null);
    }
  }

  async function confirmProviderLink(values: { password?: string }) {
    setConfirmingLink(true);
    setLinkError(null);
    try {
      const result = await formController.submit({
        formId: PHI_SHARED_FORM_IDS.providerLinkConfirmation,
        phase: "confirm",
        values: { password: values.password ?? "" },
      });
      const payload = result.payload as {
        complete?: boolean;
        area?: string;
        next?: string;
        workflow?: PhiAuthWorkflow;
        error?: string;
        returnToLogin?: boolean;
      } | null;
      if (!result.ok || !payload) {
        if (payload?.returnToLogin === true) {
          const url = new URL(window.location.href);
          url.searchParams.delete("auth");
          window.history.replaceState(
            window.history.state,
            "",
            `${url.pathname}${url.search}${url.hash}`,
          );
          setLinkConfirmationDismissed(true);
          setLinkError(payload.error ?? "The login provider was not linked.");
          return;
        }
        throw new Error(payload?.error ?? "Provider link confirmation failed.");
      }
      if (payload.complete === false && payload.workflow) {
        setWorkflow(payload.workflow);
        return;
      }
      await navigateAfterCompletion(payload.area?.trim() || null, payload.next ?? null);
    } catch (error) {
      setLinkError(error instanceof Error ? error.message : "Provider link confirmation failed.");
    } finally {
      setConfirmingLink(false);
    }
  }

  async function handleSubmit(values: LoginFormValues) {
    let loginResponseOk = false;
    let loginPayload: {
      area?: string;
      complete?: boolean;
      workflow?: PhiAuthWorkflow;
      code?: string;
      error?: string;
    };

    try {
      const result = await formController.submit({
        formId: formId ?? PHI_SHARED_FORM_IDS.login,
        values: {
          ...values,
          next: normalizeLoginRedirectTarget(values.next) ?? resolvedNextPath ??
            normalizeLoginRedirectTarget(searchParams.get("next")) ?? pathname,
        },
      });
      loginResponseOk = result.ok;
      loginPayload = (result.payload ?? {}) as {
        area?: string;
        complete?: boolean;
        workflow?: PhiAuthWorkflow;
        code?: string;
        error?: string;
      };
    } catch {
      throw new Error(labels?.errors?.network ?? "Network error while logging in.");
    }

    if (!loginResponseOk) {
      throw new Error(resolveLoginErrorMessage(labels, loginPayload.error, loginPayload.code));
    }

    if (loginPayload.complete === false && loginPayload.workflow) {
      setWorkflow(loginPayload.workflow);
      return;
    }

    const payload = { area: loginPayload.area?.trim() || null };
    if (onSuccess) {
      onSuccess(payload);
      return;
    }

    const nextTarget = normalizeLoginRedirectTarget(values.next) ?? resolvedNextPath ??
      normalizeLoginRedirectTarget(searchParams.get("next"));
    await navigateAfterCompletion(payload.area, nextTarget);
  }

  if (!manifest && !manifestError) {
    return <Skeleton active title={false} paragraph={{ rows: 4 }} />;
  }

  const primaryMethods = manifest?.methods.filter((method) => method.stage === "primary") ?? [];
  const passwordEnabled = primaryMethods.some((method) => method.methodKey === "password");
  const externalMethods = primaryMethods.filter((method) => method.methodKey !== "password");

  if (workflow && workflow.state !== "complete") {
    return (
      <Suspense fallback={<Skeleton active title={false} paragraph={{ rows: 4 }} />}>
        <PhiAuthWorkflowBody
          workflow={workflow}
          onComplete={({ area, next }) => navigateAfterCompletion(area, next)}
        />
      </Suspense>
    );
  }

  if (providerLinkRequired) {
    return (
      <Flex vertical gap="middle">
        <div>
          <Typography.Title level={4}>Confirm your existing account</Typography.Title>
          <Typography.Paragraph type="secondary">
            The external provider verified an email that already belongs to a Phi account. Enter the
            existing account password once to link this login method securely.
          </Typography.Paragraph>
        </div>
        {linkError ? <PhiAlertControl level="error" showIcon title={linkError} /> : null}
        <PhiFormControl
          ref={providerLinkFormRef}
          descriptor={PHI_PROVIDER_LINK_CONFIRMATION_FORM_DESCRIPTOR}
          disabled={confirmingLink}
          onSubmit={(values) => confirmProviderLink(values)}
        />
        <PhiButtonControl
          type="primary"
          label="Link account and sign in"
          loading={confirmingLink}
          onClick={() => providerLinkFormRef.current?.submit()}
        />
      </Flex>
    );
  }

  return (
    <Flex vertical gap="middle">
      {linkError ? <PhiAlertControl level="error" showIcon title={linkError} /> : null}
      {manifestError ? <PhiAlertControl level="error" showIcon title={manifestError} /> : null}
      {passwordEnabled ? (
        <LoginForm
          descriptor={descriptor}
          labels={labels}
          forgotPasswordHref={forgotPasswordHref ?? config?.forgotPasswordHref}
          initialValues={loginInitialValues}
          onSubmit={handleSubmit}
        />
      ) : null}
      {passwordEnabled && externalMethods.length > 0 ? <Divider plain>Or continue with</Divider> : null}
      {externalMethods.map((method) => (
        <Button
          key={method.methodKey}
          block
          loading={startingMethod === method.methodKey}
          disabled={startingMethod !== null && startingMethod !== method.methodKey}
          onClick={() => void startExternalMethod(method)}
        >
          {method.label}
        </Button>
      ))}
      {!manifestError && primaryMethods.length === 0 ? (
        <PhiAlertControl level="warning" showIcon title="No login method is enabled for this site." />
      ) : null}
    </Flex>
  );
}
