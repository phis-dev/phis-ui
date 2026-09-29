import { PHI_SHARED_FORM_IDS } from "../forms/shared-form-ids";
import { PhiButtonControl } from "../controls/phi-button-control";
import { getPhiPasswordChangeRequiredLabels } from "../widgets/label-sets/profile";
import { readPhiServerApiCredentials } from "../../helpers/phis-server-credentials";
import { PhiFormWidget } from "../../plugins/runtime-modules/core/widgets/form/built-in";
import { parsePhiFormWidgetConfig } from "../../plugins/runtime-modules/core/widgets/form/config";
import type { PhiResolvedRuntimeRenderRegistry } from "../../plugins/runtime-modules/contracts";
import type { PhiBlockRuntime } from "../../types";
import { createPhiCoreRuntimeControllerAddress } from "./core-runtime-controller-address";
import { PhiPasswordChangeRequiredModal } from "./phi-password-change-required-modal";

/*
 * The Profile's own password Form, and its success asking for the Page again: the account no longer
 * carries the flag then, and the Page renders without this in front of it.
 */
const PASSWORD_FORM_CONFIG = parsePhiFormWidgetConfig({
  formId: PHI_SHARED_FORM_IDS.profilePassword,
  signalRoutes: {
    emits: [{
      routeKey: "password-change-required-reload",
      capabilityId: "submitSuccess",
      scope: "site",
      channel: "reload",
      action: "activate",
      valueType: "none",
      receiver: createPhiCoreRuntimeControllerAddress(),
    }],
  },
});

/**
 * What a Page shows in front of itself while an administrator's password change is outstanding.
 *
 * The Form is the Auth Module's, which serves the App and Admin Areas. Where an Area does not carry it,
 * the change is one link away in the App instead of reproduced here.
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
  const formAvailable = registry.formDefinitionsById.has(PHI_SHARED_FORM_IDS.profilePassword);

  return (
    <PhiPasswordChangeRequiredModal
      title={labels.title}
      text={formAvailable ? labels.text : labels.elsewhereText}
    >
      {formAvailable ? (
        <PhiFormWidget
          runtime={runtime}
          registry={registry}
          formId={PHI_SHARED_FORM_IDS.profilePassword}
          formInstanceKey="password-change-required"
          config={PASSWORD_FORM_CONFIG}
        />
      ) : (
        <PhiButtonControl type="primary" href="/app" label={labels.elsewhereLink} />
      )}
    </PhiPasswordChangeRequiredModal>
  );
}
