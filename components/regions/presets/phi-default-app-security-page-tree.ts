import { PHI_AUTH_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/auth/ids";
import type { PhiBlockRuntime } from "../../../types";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../types/cms";
import { buildPhiSettingsPageShellTree } from "./phi-settings-page-shell-tree";
import { getPhiSecurityPageLabels } from "./security-label-set";
import { readPhiServerApiCredentials } from "../../../helpers/phis-server-credentials";

const REGION_CONTENT_ID = -484;

/**
 * How somebody proves who they are, as Settings panels beside the profile they belong to.
 *
 * Password and email moved here off the profile Page: what a person is called and which language they
 * read are things the account says about itself, while an address that receives a verification link and
 * a password are credentials. They are still the Widgets they were -- each fetches and saves on its own
 * -- until they are Forms with handler Providers like the profile's name.
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
  const labels = await getPhiSecurityPageLabels({
    apiBaseUrl: credentials.apiBaseUrl,
    internalToken: credentials.internalToken,
    locale: runtime.locale.current,
  });

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
        sections: [{
          nodeKey: "widgetPassword",
          typeKey: "profile-password",
          label: labels.password,
          config: {},
        }],
      },
      {
        nodeKey: "panelEmail",
        title: labels.email,
        sections: [{
          nodeKey: "widgetEmail",
          typeKey: "profile-email",
          label: labels.email,
          config: {},
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
