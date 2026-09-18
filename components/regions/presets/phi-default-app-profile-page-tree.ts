import { PHI_APP_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/app/ids";
import { PHI_APP_FORM_IDS } from "../../../plugins/runtime-modules/app/forms";
import type { PhiBlockRuntime } from "../../../types";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../types/cms";
import { buildPhiSettingsPageShellTree } from "./phi-settings-page-shell-tree";
import { getPhiProfilePageLabels } from "./profile-label-set";
import { readPhiServerApiCredentials } from "../../../helpers/phis-server-credentials";

const REGION_CONTENT_ID = -286;

/**
 * What the account says about itself, as Settings panels rather than as a page of Widgets.
 *
 * It is a mounted Settings page like any other now (SETTINGS.md section 4), so it is built from the
 * one shared shell: a Collapsible whose panels open one at a time, each panel one coherent thing to
 * decide. The overview panel is gone -- it showed the name that the panel below it already holds and
 * a newsletter switch that now has a panel of its own.
 *
 * Name and newsletter are registered Forms reaching the server through their handler Providers.
 * Language, email and password are still the old Widgets, each with a `fetch` of its own: the first
 * needs an options Provider for the Site's locales that does not exist yet, and the other two belong
 * on the security page, which is the next step. They stand here as Widget sections until then.
 */
export async function buildPhiDefaultAppProfilePageTree({
  page,
  runtime,
}: {
  page: PhiCmsPageNode;
  runtime: PhiBlockRuntime;
}): Promise<PhiResolvedCmsPageTree> {
  const labels = await getPhiProfilePageLabels({
    apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
    internalToken: readPhiServerApiCredentials().internalToken,
    locale: runtime.locale.current,
  });

  const tree = buildPhiSettingsPageShellTree({
    page,
    ownerModuleId: PHI_APP_RUNTIME_MODULE_ID,
    presetKey: "app-profile-page",
    regionId: REGION_CONTENT_ID,
    label: labels.page,
    panels: [
      {
        nodeKey: "panelName",
        title: labels.name,
        sections: [{
          kind: "form",
          nodeKey: "widgetName",
          formId: PHI_APP_FORM_IDS.profileName,
          label: labels.name,
          submitLabel: labels.name,
          /*
           * What the account says today, read from the viewer the page was rendered for. The Form
           * asks the server for nothing: whoever is asking is who the answer is about, which is what
           * the `site-session` handler means.
           */
          initialValues: {
            firstName: runtime.viewer.profile?.firstName ?? "",
            lastName: runtime.viewer.profile?.lastName ?? "",
            companyName: runtime.viewer.profile?.companyName ?? "",
          },
        }],
      },
      {
        nodeKey: "panelLanguage",
        title: labels.language,
        sections: [{
          nodeKey: "widgetLanguage",
          typeKey: "profile-locale",
          label: labels.language,
          config: {},
        }],
      },
      {
        nodeKey: "panelNewsletter",
        title: labels.overview,
        sections: [{
          kind: "form",
          nodeKey: "widgetNewsletter",
          formId: PHI_APP_FORM_IDS.profileNewsletter,
          label: labels.overview,
          submitOnChange: true,
          initialValues: {
            newsletterOptIn: Boolean(runtime.viewer.newsletterOptIn),
          },
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
        nodeKey: "panelPassword",
        title: labels.password,
        sections: [{
          nodeKey: "widgetPassword",
          typeKey: "profile-password",
          label: labels.password,
          config: {},
        }],
      },
    ],
  });

  return {
    ...tree,
    pageMeta: {
      title: { msgId: 0, source: "Profile", value: labels.page },
      description: null,
    },
  };
}
