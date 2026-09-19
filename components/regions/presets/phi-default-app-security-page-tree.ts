import { PHI_SHARED_FORM_IDS } from "../../../components/forms/shared-form-ids";
import { PHI_AUTH_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/auth/ids";
import type { PhiBlockRuntime } from "../../../types";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../types/cms";
import { buildPhiSettingsPageShellTree } from "./phi-settings-page-shell-tree";
import { getPhiSecurityPageLabels } from "./security-label-set";
import { getPhiProfileEmailWidgetLabels, getPhiProfilePasswordWidgetLabels } from "../../widgets/label-sets/profile";
import { readPhiServerApiCredentials } from "../../../helpers/phis-server-credentials";

const REGION_CONTENT_ID = -484;

/**
 * How somebody proves who they are, as Settings panels beside the profile they belong to.
 *
 * Password and email are registered Forms of this Module now, submitted through their handler Providers
 * by the Site Form gateway. They used to be Widgets that each built a descriptor in place, drew a Save
 * button and reached the server with a hand-written `fetch` -- CSRF token request and all -- which is
 * what SETTINGS.md section 6 rules out for anything inside the Settings container.
 *
 * The third panel is the Auth Module's own security Widget, which reads factors, linked identities and
 * sessions in one answer and therefore stays one section rather than three.
 */
export async function buildPhiDefaultAppSecurityPageTree({
  page,
  runtime,
}: {
  page: PhiCmsPageNode;
  runtime: PhiBlockRuntime;
}): Promise<PhiResolvedCmsPageTree> {
  const credentials = readPhiServerApiCredentials();
  const labelOptions = {
    apiBaseUrl: credentials.apiBaseUrl,
    internalToken: credentials.internalToken,
    locale: runtime.locale.current,
  };
  /*
   * The panels' own prose comes from the same label sets the Forms read, because it is the same
   * sentence: what this panel is for was written once, when it was a Widget's subtitle.
   */
  const [labels, passwordLabels, emailLabels] = await Promise.all([
    getPhiSecurityPageLabels(labelOptions),
    getPhiProfilePasswordWidgetLabels(labelOptions),
    getPhiProfileEmailWidgetLabels(labelOptions),
  ]);
  const currentEmail = runtime.viewer.userEmail?.trim();

  const tree = buildPhiSettingsPageShellTree({
    page,
    ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID,
    presetKey: "app-auth-security-page",
    regionId: REGION_CONTENT_ID,
    label: labels.page,
    panels: [
      {
        nodeKey: "panelPassword",
        title: labels.password,
        description: passwordLabels.description,
        sections: [{
          kind: "form",
          nodeKey: "widgetPassword",
          formId: PHI_SHARED_FORM_IDS.profilePassword,
          label: labels.password,
          submitLabel: passwordLabels.submitLabel,
        }],
      },
      {
        nodeKey: "panelEmail",
        title: labels.email,
        /*
         * Which address the account is reached at today, said here rather than asked for: the Form's
         * one field is the new address, and a second box holding the old one would invite typing in it.
         */
        description: currentEmail
          ? `${emailLabels.description} ${emailLabels.currentLabel}: ${currentEmail}`
          : emailLabels.description,
        sections: [{
          kind: "form",
          nodeKey: "widgetEmail",
          formId: PHI_SHARED_FORM_IDS.profileEmail,
          label: labels.email,
          submitLabel: emailLabels.submitLabel,
        }],
      },
      {
        nodeKey: "panelSessions",
        title: labels.sessions,
        sections: [{
          nodeKey: "widgetSecurity",
          typeKey: "auth-security",
          label: labels.sessions,
          config: {},
        }],
      },
    ],
  });

  return {
    ...tree,
    pageMeta: {
      title: { msgId: 0, source: "Security", value: labels.page },
      description: null,
    },
  };
}
