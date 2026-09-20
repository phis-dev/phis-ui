import { PHI_APP_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/app/ids";
import { PHI_APP_FORM_IDS } from "../../../plugins/runtime-modules/app/forms";
import type { PhiBlockRuntime } from "../../../types";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../types/cms";
import { buildPhiSettingsPageShellTree } from "./phi-settings-page-shell-tree";
import { getPhiProfilePageLabels } from "./profile-label-set";
import {
  getPhiProfileLocaleWidgetLabels,
  getPhiProfileThemeWidgetLabels,
} from "../../widgets/label-sets/profile";
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
 * Every panel is a registered Form reaching the server through its handler Provider. Language carries
 * the Site's locales in its placement config, because a registered Form is the same on every Site and
 * the languages are not. Email and password have moved to the security page, where credentials belong.
 *
 * Appearance is the one panel whose answer is also readable without an account: the Header switch sets
 * the same mode for whoever is looking, and writes the account when there is one. This panel is where
 * the third answer lives -- "System", which no switch can state.
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
  const [labels, localeLabels, themeLabels] = await Promise.all([
    getPhiProfilePageLabels(labelOptions),
    getPhiProfileLocaleWidgetLabels(labelOptions),
    getPhiProfileThemeWidgetLabels(labelOptions),
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
        nodeKey: "panelTheme",
        title: labels.appearance,
        description: themeLabels.description,
        sections: [{
          kind: "form",
          nodeKey: "widgetTheme",
          formId: PHI_APP_FORM_IDS.profileTheme,
          label: labels.appearance,
          submitOnChange: true,
          savedMessage: labels.saved,
          /*
           * The choice, not the resolution. `viewer.themeMode` would name a half even for somebody who
           * asked for neither, and the panel would then show "Light" as their decision because their
           * device happens to be light.
           */
          initialValues: { themeMode: runtime.viewer.preferredThemeMode ?? "system" },
          /*
           * Saved, and then this Page again.
           *
           * The same reason the language panel reloads: the mode lives on the account, the Server wrote
           * it, and only the Server can show it being applied -- the cookie it mirrors is what the next
           * render reads. Reloading is also the whole answer here, which is why this Form says nothing
           * else on success.
           */
          configOverrides: {
            signalRoutes: {
              emits: [{
                routeKey: "app-profile-theme-reload",
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
        title: labels.subscriptions,
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
