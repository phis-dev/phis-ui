import { localizeAreaPath } from "../../helpers/locale";
import { phiRuntime } from "../../server-helpers/phi-runtime";
import { fetchFormGuard } from "../../gateway/form-guard";
import {
  getPhiLoginFormLabels,
} from "../widgets/label-sets/account";
import { getPhiConfirmWidgetLabels } from "../widgets/label-sets/confirm";
import { getPhiContactFormLabels } from "../widgets/label-sets/contact";
import { getPhiRegistrationFormLabels } from "../widgets/label-sets/registration";
import { getPhiResetPasswordWidgetLabels } from "../widgets/label-sets/reset-password";
import type { PhiLoginWidgetConfig } from "../widgets/client/login-body";
import { PhiRuntimeRenderClientType } from "../../constants/runtime-render-client-types";
import { PhiRuntimeModuleRenderClientHost } from "../runtime/runtime-module-render-client-manifest";
import {
  buildPhiFormPreviewDescriptorFromDefinition,
} from "../../gateway/form-submit";
import type { PhiDataSource } from "../../gateway/data-source";
import type { PhiFormRenderContext } from "./form-resolution";
import { flattenPhiFormLabels } from "./form-labels";
import { PHI_SHARED_FORM_IDS } from "./shared-form-ids";

function resolveAreaKey(runtime: PhiFormRenderContext["runtime"]) {
  return runtime.area ?? "public";
}

function readFormOption(options: PhiFormRenderContext["options"], key: string) {
  const value = options?.config?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export async function renderPhiLoginForm({ runtime, resolvedForm, options }: PhiFormRenderContext) {
  const rt = phiRuntime(runtime);
  const labels = await getPhiLoginFormLabels({
    apiBaseUrl: rt.apiBaseUrl,
    internalToken: rt.internalToken,
    locale: runtime.locale.current,
  });

  const resolvedForgotPasswordHref =
    typeof resolvedForm?.effectiveConfig.forgotPasswordHref === "string"
      ? resolvedForm.effectiveConfig.forgotPasswordHref
      : undefined;

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiRuntimeRenderClientType.FormLogin}
      componentProps={{
        runtime,
        labels,
        descriptor: resolvedForm?.definition.descriptor,
        config: options?.config as PhiLoginWidgetConfig | undefined,
        formId: resolvedForm?.definition.formId,
        formControllerAddress: options?.formControllerAddress,
        forgotPasswordHref:
          readFormOption(options, "forgotPasswordHref") ??
          resolvedForgotPasswordHref ??
          localizeAreaPath(runtime.locale.current, resolveAreaKey(runtime), "/reset-password"),
      }}
    />
  );
}

export async function renderPhiContactForm({ runtime, resolvedForm, options }: PhiFormRenderContext) {
  const rt = phiRuntime(runtime);
  const [formGuard, labels] = await Promise.all([
    fetchFormGuard({
      apiBaseUrl: rt.apiBaseUrl,
      internalToken: rt.internalToken,
      siteKey: rt.siteKey,
      form: PHI_SHARED_FORM_IDS.contact,
    }),
    getPhiContactFormLabels({
      apiBaseUrl: rt.apiBaseUrl,
      internalToken: rt.internalToken,
      locale: runtime.locale.current,
    }),
  ]);

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiRuntimeRenderClientType.FormContact}
      componentProps={{
        runtime,
        issuedAt: formGuard.issuedAt,
        formToken: formGuard.formToken,
        formId: resolvedForm?.definition.formId,
        formControllerAddress: options?.formControllerAddress,
        labels,
        descriptor: resolvedForm?.definition.descriptor,
      }}
    />
  );
}

export async function renderPhiRegistrationForm({
  runtime,
  resolvedForm,
  options,
}: PhiFormRenderContext) {
  const rt = phiRuntime(runtime);
  const [formGuard, labels] = await Promise.all([
    fetchFormGuard({
      apiBaseUrl: rt.apiBaseUrl,
      internalToken: rt.internalToken,
      siteKey: rt.siteKey,
      form: PHI_SHARED_FORM_IDS.registration,
    }),
    getPhiRegistrationFormLabels({
      apiBaseUrl: rt.apiBaseUrl,
      internalToken: rt.internalToken,
      locale: runtime.locale.current,
    }),
  ]);

  const [termsBeforeLink, termsAfterLink] = labels.consent.termsText.split("%1");
  const resolvedTermsHref =
    typeof resolvedForm?.effectiveConfig.termsHref === "string"
      ? resolvedForm.effectiveConfig.termsHref
      : undefined;
  const termsHref = readFormOption(options, "termsHref") ?? resolvedTermsHref ?? "/terms-and-conditions";
  const localizedTermsHref = localizeAreaPath(
    runtime.locale.current,
    resolveAreaKey(runtime),
    termsHref,
  );
  const descriptor = resolvedForm
    ? {
        ...resolvedForm.definition.descriptor,
        fields: resolvedForm.definition.descriptor.fields.map((field) =>
          field.key === "termsAccepted"
            ? {
                ...field,
                config: {
                  ...field.config,
                  before: termsBeforeLink ?? "",
                  linkLabel: labels.consent.termsLinkLabel,
                  after: termsAfterLink ?? "",
                  href: localizedTermsHref,
                },
              }
            : field),
      }
    : undefined;

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiRuntimeRenderClientType.FormRegistration}
      componentProps={{
        runtime: { locale: runtime.locale },
        issuedAt: formGuard.issuedAt,
        formToken: formGuard.formToken,
        formId: resolvedForm?.definition.formId,
        formControllerAddress: options?.formControllerAddress,
        labels,
        descriptor,
      }}
    />
  );
}

export async function renderPhiConfirmForm({
  runtime,
  resolvedForm,
  options,
}: PhiFormRenderContext) {
  const rt = phiRuntime(runtime);
  const labels = await getPhiConfirmWidgetLabels({
    apiBaseUrl: rt.apiBaseUrl,
    internalToken: rt.internalToken,
    locale: runtime.locale.current,
  });

  const previewDescriptor =
    resolvedForm ? buildPhiFormPreviewDescriptorFromDefinition(resolvedForm.definition) ?? undefined : undefined;
  const previewDataSource: PhiDataSource | undefined = previewDescriptor
    ? {
        kind: "api",
        upstreamPath: "/api/site/forms",
        endpointKey: "preview",
        method: "GET",
        transport: "site",
        requestShape: {
          queryMap: {
            phase: "phase",
            formId: "formId",
            token: "token",
          },
        },
        cache: {
          mode: "no-store",
        },
      }
    : undefined;

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiRuntimeRenderClientType.FormConfirm}
      componentProps={{
        token: "",
        previewStatus: null,
        previewName: "",
        previewEmail: "",
        previewCompany: null,
        previewDescriptor,
        previewDataSource,
        formId: resolvedForm?.definition.formId,
        formControllerAddress: options?.formControllerAddress,
        descriptor: resolvedForm?.definition.descriptor,
        descriptorLabels: flattenPhiFormLabels(labels),
        backHref: readFormOption(options, "backHref") ?? "/",
        ...labels,
        loginLabel: labels.loginLabel,
        loginHref: localizeAreaPath(runtime.locale.current, resolveAreaKey(runtime), "/login"),
      }}
    />
  );
}

export async function renderPhiResetPasswordForm({
  runtime,
  resolvedForm,
  options,
}: PhiFormRenderContext) {
  const rt = phiRuntime(runtime);
  const labels = await getPhiResetPasswordWidgetLabels({
    apiBaseUrl: rt.apiBaseUrl,
    internalToken: rt.internalToken,
    locale: runtime.locale.current,
  });

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiRuntimeRenderClientType.FormResetPassword}
      componentProps={{
        runtime,
        labels,
        requestDescriptor: resolvedForm?.definition.descriptor,
        descriptorLabels: flattenPhiFormLabels(labels),
        formId: resolvedForm?.definition.formId,
        formControllerAddress: options?.formControllerAddress,
      }}
    />
  );
}
