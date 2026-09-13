import { cookies } from "next/headers";

import { localizeAreaPath } from "../../helpers/locale";
import { phiRuntime } from "../../server-helpers/phi-runtime";
import {
  fetchPhiAuthWorkflow,
  fetchPhiPublicAuthManifest,
} from "../../gateway/auth-public-manifest";
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

/**
 * The Site's sign-in methods and any authentication already under way, for one render of the Login.
 *
 * The manifest failing is worth saying out loud -- without it the Login has no methods to offer and an
 * empty card explains nothing -- so it comes back as a message the widget shows. A workflow that cannot
 * be read is a different matter: nobody is mid-authentication in the ordinary case, which is exactly
 * what "none" means here.
 */
async function resolvePhiLoginAuthState(options: {
  apiBaseUrl: string;
  internalToken: string;
  siteKey: string;
  cookieHeader: string;
}) {
  const [manifest, resumedWorkflow] = await Promise.all([
    fetchPhiPublicAuthManifest(options).catch((error: unknown) => ({
      error: error instanceof Error ? error.message : "Authentication methods could not be loaded.",
    })),
    fetchPhiAuthWorkflow(options).catch(() => null),
  ]);

  return "error" in manifest
    ? { manifest: null, manifestError: manifest.error, resumedWorkflow }
    : { manifest, manifestError: null, resumedWorkflow };
}

export async function renderPhiLoginForm({ runtime, resolvedForm, options }: PhiFormRenderContext) {
  const rt = phiRuntime(runtime);
  const cookieStore = await cookies();
  /*
   * What the Login needs to know before it can be drawn, read here rather than by the widget.
   *
   * Both used to be fetched after hydration, and the form was a skeleton until the first of them
   * answered -- a blank card for as long as the page took to become interactive, which is the wait a
   * visitor reads as a slow login. Neither question needs the browser to ask it. A failure is reported
   * rather than swallowed: the Login has to say that it could not read the Site's sign-in methods,
   * because with none of them it has nothing to offer.
   */
  const [labels, auth] = await Promise.all([
    getPhiLoginFormLabels({
      apiBaseUrl: rt.apiBaseUrl,
      internalToken: rt.internalToken,
      locale: runtime.locale.current,
    }),
    resolvePhiLoginAuthState({
      apiBaseUrl: rt.apiBaseUrl,
      internalToken: rt.internalToken,
      siteKey: rt.siteKey,
      cookieHeader: cookieStore.toString(),
    }),
  ]);

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
        manifest: auth.manifest,
        manifestError: auth.manifestError,
        resumedWorkflow: auth.resumedWorkflow,
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
