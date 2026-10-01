import { findPhiFormDefinitionByPurpose, PHI_FORM_PURPOSES } from "../forms/form-registry";
import { getPhiPasswordChangeRequiredLabels } from "../widgets/label-sets/profile";
import { readPhiServerApiCredentials } from "../../helpers/phis-server-credentials";
import { PhiFormWidget } from "../forms/phi-form-widget";
import { parsePhiFormWidgetConfig } from "../forms/form-widget-config";
import type { PhiResolvedRuntimeRenderRegistry } from "../../plugins/runtime-modules/contracts";
import type { PhiBlockRuntime } from "../../types";
import { createPhiCoreRuntimeControllerAddress } from "./core-runtime-controller-address";
import { PhiPasswordChangeRequiredModal } from "./phi-password-change-required-modal";

/*
 * The Form's success asks for the Page again: the account no longer carries the flag then, and the Page
 * renders without this in front of it.
 */
const RELOAD_ON_SUCCESS = {
  emits: [{
    routeKey: "password-change-required-reload",
    capabilityId: "submitSuccess",
    scope: "site",
    channel: "reload",
    action: "activate",
    valueType: "none",
    receiver: createPhiCoreRuntimeControllerAddress(),
  }],
};

/**
 * What a Page shows in front of itself while an administrator's password change is outstanding.
 *
 * The Form is whichever an active Module registers for `account-password-change` -- the Auth Module's
 * own, or the one a replacement brings -- and not a Form id Core would have to know. Where no Module
 * supplies one, the reset link that went out with the administrator's request is the way on, and
 * signing out is offered rather than a link to somewhere that has no Form either.
 */
export async function PhiPasswordChangeRequired({
  runtime,
  registry,
}: {
  runtime: PhiBlockRuntime;
  registry: PhiResolvedRuntimeRenderRegistry;
}) {
  const credentials = readPhiServerApiCredentials();
  const labels = await getPhiPasswordChangeRequiredLabels({
    apiBaseUrl: credentials.apiBaseUrl,
    internalToken: credentials.internalToken,
    locale: runtime.locale.current,
  });
  const form = findPhiFormDefinitionByPurpose(
    registry.formDefinitionsById.values(),
    PHI_FORM_PURPOSES.accountPasswordChange,
  );

  return (
    <PhiPasswordChangeRequiredModal
      title={labels.title}
      text={form ? labels.text : labels.emailOnlyText}
      signOutLabel={form ? null : labels.signOut}
    >
      {form ? (
        <PhiFormWidget
          runtime={runtime}
          registry={registry}
          formId={form.formId}
          formInstanceKey="password-change-required"
          config={parsePhiFormWidgetConfig({ formId: form.formId, signalRoutes: RELOAD_ON_SUCCESS })}
        />
      ) : null}
    </PhiPasswordChangeRequiredModal>
  );
}
