import { PHI_APP_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/app/ids";
import { PHI_APP_FORM_IDS } from "../../../plugins/runtime-modules/app/forms";
import type { PhiBlockRuntime } from "../../../types";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../types/cms";
import { buildPhiSettingsPageShellTree } from "./phi-settings-page-shell-tree";
import { getPhiProfilePageLabels } from "./profile-label-set";
import { getPhiProfileLocaleWidgetLabels } from "../../widgets/label-sets/profile";
import { PHI_SITE_LOCALES_CONFIG_KEY } from "../../forms/site-locales-config";
import { createPhiCoreRuntimeControllerAddress } from "../../runtime/core-runtime-controller-address";
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
 * Language is still the old Widget with a `fetch` of its own, because it needs an options Provider for
 * the Site's locales that does not exist yet; it stands here as a Widget section until then. Email and
 * password have moved to the security page, where credentials belong.
 */
export async function buildPhiDefaultAppProfilePageTree({
  page,
  runtime,
}: {
  page: PhiCmsPageNode;
  runtime: PhiBlockRuntime;
}): Promise<PhiResolvedCmsPageTree> {
  const labelOptions = {
    apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
    internalToken: readPhiServerApiCredentials().internalToken,
    locale: runtime.locale.current,
  };
  const [labels, localeLabels] = await Promise.all([
    getPhiProfilePageLabels(labelOptions),
    getPhiProfileLocaleWidgetLabels(labelOptions),
  ]);
  const availableLocales = runtime.site.availableLocales.map(
    (option) => ({ code: option.code, label: option.label }),
  );
  /*
   * What the account reads in today: its own preference where it has one, and otherwise the language
   * this request resolved to, which is the answer the Site gave when nobody had said anything.
   */
  const preferredLocale = runtime.viewer.preferredLocale?.trim() || runtime.locale.current;

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
          submitLabel: labels.save,
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
        description: localeLabels.description,
        sections: [{
          kind: "form",
          nodeKey: "widgetLanguage",
          formId: PHI_APP_FORM_IDS.profileLocale,
          label: labels.language,
          submitLabel: localeLabels.submitLabel,
          savedMessage: labels.saved,
          initialValues: { locale: preferredLocale },
          /*
           * The Site's languages, handed to the field because this Page knows them and the registered
           * Form cannot. See the Core `site-locales` options provider for why they travel this way.
           */
          formConfig: { [PHI_SITE_LOCALES_CONFIG_KEY]: availableLocales },
          /*
           * Saved, and then this Page again.
           *
           * The language lives on the account, so only the Server can show the choice being applied.
           * The Form does not navigate and has nothing to navigate to -- App addresses carry no locale
           * segment, so the same address is the right one -- it just says "again", and the runtime asks
           * for it. The route carries no value: `submitSuccess` is a result, and a reload is not about
           * one.
           */
          configOverrides: {
            signalRoutes: {
              emits: [{
                routeKey: "app-profile-locale-reload",
                capabilityId: "submitSuccess",
                scope: "site",
                channel: "reload",
                action: "activate",
                valueType: "none",
                receiver: createPhiCoreRuntimeControllerAddress(),
              }],
            },
          },
        }],
      },
      {
        nodeKey: "panelNewsletter",
        title: labels.newsletter,
        sections: [{
          kind: "form",
          nodeKey: "widgetNewsletter",
          formId: PHI_APP_FORM_IDS.profileNewsletter,
          label: labels.newsletter,
          submitOnChange: true,
          savedMessage: labels.saved,
          initialValues: {
            newsletterOptIn: Boolean(runtime.viewer.newsletterOptIn),
          },
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
