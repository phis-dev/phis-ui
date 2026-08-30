import { PHI_AUTH_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/auth/ids";
import { PHI_AUTH_RUNTIME_DATA_PROVIDER_KEYS } from "../../../plugins/runtime-modules/auth/ids";
import { PHI_AUTH_ADMIN_SETTINGS_FORM_IDS } from "../../forms/auth-admin-settings-forms";
import { getPhiAuthAdminSettingsLabels } from "../../forms/auth-admin-settings-labels";
import { getResolvedSiteAuthAdminSettings } from "../../../gateway/site-auth-settings";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../types/cms";
import type { PhiBlockRuntime } from "../../../types";
import { createPhiPresetCmsInstanceIdMap } from "../../../types/cms-instance-id";
import { PHI_SIGNAL_VALUE_SCHEMAS, createPhiSignalAddress } from "../../../types/signals";
import { buildPhiSettingsPageShellTree } from "./phi-settings-page-shell-tree";

const SYNTHETIC_AUTH_SETTINGS_REGION_IDS = {
  regionContent: -482,
} as const;

export async function buildPhiDefaultAdminAuthSettingsPageTree({
  page,
  runtime,
}: {
  page: PhiCmsPageNode;
  runtime: PhiBlockRuntime;
}): Promise<PhiResolvedCmsPageTree> {
  const [labels, settings] = await Promise.all([
    getPhiAuthAdminSettingsLabels({
      apiBaseUrl: runtime.phis.apiBaseUrl,
      internalToken: runtime.phis.internalToken,
      locale: runtime.locale.current,
    }),
    getResolvedSiteAuthAdminSettings({
      apiBaseUrl: runtime.phis.apiBaseUrl,
      internalToken: runtime.phis.internalToken,
      siteKey: runtime.site.key,
    }),
  ]);

  // The shell derives Widget instance ids from these node keys; the same derivation here yields
  // the deterministic signal addresses for the table/form wiring.
  const widgetIds = createPhiPresetCmsInstanceIdMap({
    domain: "page",
    ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID,
    presetKey: "admin-auth-settings-page",
  }, ["widgetInstallationsTable", "widgetInstallationEditForm"]);
  const tableAddress = createPhiSignalAddress("cms", widgetIds.widgetInstallationsTable);
  const editFormAddress = createPhiSignalAddress("cms", widgetIds.widgetInstallationEditForm);

  const tree = buildPhiSettingsPageShellTree({
    page,
    ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID,
    presetKey: "admin-auth-settings-page",
    regionId: SYNTHETIC_AUTH_SETTINGS_REGION_IDS.regionContent,
    label: labels.pageTitle,
    panels: [
      {
        nodeKey: "panelPolicy",
        title: labels.sections.policy.title,
        description: labels.sections.policy.description,
        sections: [{
          kind: "form",
          nodeKey: "widgetPolicyForm",
          formId: PHI_AUTH_ADMIN_SETTINGS_FORM_IDS.policy,
          label: labels.sections.policy.title,
          submitLabel: labels.submitLabel,
          initialValues: {
            registrationMode: settings.policy.registrationMode,
            existingAccountLinking: settings.policy.existingAccountLinking,
            allowPrivilegedAutoLink: settings.policy.allowPrivilegedAutoLink,
          },
        }],
      },
      {
        nodeKey: "panelPassword",
        title: labels.sections.password.title,
        description: labels.sections.password.description,
        sections: [{
          kind: "form",
          nodeKey: "widgetPasswordForm",
          formId: PHI_AUTH_ADMIN_SETTINGS_FORM_IDS.passwordMethod,
          label: labels.sections.password.title,
          submitLabel: labels.submitLabel,
          initialValues: {
            enabled: settings.passwordMethod.enabled,
            sortOrder: settings.passwordMethod.sortOrder,
          },
        }],
      },
      {
        nodeKey: "panelTotp",
        title: labels.sections.totp.title,
        description: labels.sections.totp.description,
        sections: [{
          kind: "form",
          nodeKey: "widgetTotpForm",
          formId: PHI_AUTH_ADMIN_SETTINGS_FORM_IDS.totpPolicy,
          label: labels.sections.totp.title,
          submitLabel: labels.submitLabel,
          initialValues: {
            required: settings.totpPolicy.required,
            enforcement: settings.totpPolicy.enforcement,
            graceUntil: settings.totpPolicy.graceUntil,
            roles: settings.totpPolicy.roles,
          },
        }],
      },
      {
        nodeKey: "panelProviders",
        title: labels.sections.providers.title,
        description: labels.sections.providers.description,
        sections: [{
          nodeKey: "widgetInstallationsTable",
          typeKey: "table",
          label: labels.installations.tableLabel,
          config: {
            source: {
              providerKey: PHI_AUTH_RUNTIME_DATA_PROVIDER_KEYS.installations,
              resourceKey: "installations",
            },
            presentation: {
              controlSize: "small",
              bordered: true,
              layout: { mode: "auto", overflowX: "auto" },
              columns: [
                { key: "installationKey", fieldKey: "installationKey", title: labels.installations.installationKey, sizing: { mode: "content" }, sticky: "left" },
                {
                  key: "providerKey",
                  fieldKey: "providerKey",
                  title: labels.installations.provider,
                  renderer: "badge",
                  sizing: { mode: "content" },
                  tagColorMap: { google: "processing", apple: "default", github: "default", microsoft: "processing" },
                },
                { key: "enabled", fieldKey: "enabled", title: labels.providers.enabled, renderer: "switch", editor: { control: "switch" }, sizing: { mode: "content" } },
                { key: "loginEnabled", fieldKey: "loginEnabled", title: labels.providers.loginEnabled, renderer: "switch", editor: { control: "switch" }, sizing: { mode: "content" } },
                { key: "sortOrder", fieldKey: "sortOrder", title: labels.providers.sortOrder, sizing: { mode: "content" } },
                {
                  key: "secretStatus",
                  fieldKey: "secretStatus",
                  title: labels.installations.secret,
                  renderer: "badge",
                  sizing: { mode: "content" },
                  tagColorMap: { configured: "success", missing: "error" },
                },
                {
                  key: "validationStatus",
                  fieldKey: "validationStatus",
                  title: labels.installations.validation,
                  renderer: "badge",
                  sizing: { mode: "content" },
                  tagColorMap: { ok: "success", failed: "error", "not-testable": "default", untested: "warning" },
                },
                { key: "linkedIdentities", fieldKey: "linkedIdentities", title: labels.installations.linkedIdentities, sizing: { mode: "content" } },
                { key: "callbackUri", fieldKey: "callbackUri", title: labels.installations.callbackUri, sizing: { mode: "fill" } },
              ],
              emptyState: labels.installations.empty,
            },
            features: {
              pagination: { enabled: false },
              sorting: { mode: "none" },
              editing: { mode: "cell" },
              tools: { mode: "self-contained", reset: false, reload: true },
              actions: {
                row: [
                  {
                    key: "edit",
                    label: labels.installations.actionEdit,
                    icon: "edit",
                    display: "icon",
                    execution: "signal",
                  },
                  {
                    key: "test",
                    label: labels.installations.actionTest,
                    icon: "antd:experiment",
                    display: "icon",
                    execution: "provider",
                  },
                  {
                    key: "delete",
                    label: labels.installations.actionDelete,
                    icon: "antd:delete",
                    display: "icon",
                    mode: "danger",
                    execution: "provider",
                    confirm: {
                      title: labels.installations.deleteTitle,
                      description: labels.installations.deleteText,
                      alert: {
                        level: "error",
                        title: labels.installations.deleteIrreversible,
                      },
                      okText: labels.installations.confirmOk,
                      cancelText: labels.installations.confirmCancel,
                    },
                  },
                ],
              },
            },
            signalRoutes: {
              emits: [{
                routeKey: "auth-installations-table-action",
                capabilityId: "actionActivate",
                scope: "page",
                channel: "action",
                action: "activate",
                valueType: "json",
                valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction,
                receiver: editFormAddress,
              }],
              listens: [{
                routeKey: "auth-installations-table-reload",
                capabilityId: "reload",
                scope: "page",
                channel: "reload",
                action: "activate",
                valueType: "none",
                receiver: tableAddress,
              }],
            },
          },
        }],
      },
      {
        nodeKey: "panelInstallationEdit",
        title: labels.installations.editTitle,
        description: labels.installations.editDescription,
        sections: [{
          kind: "form",
          nodeKey: "widgetInstallationEditForm",
          formId: PHI_AUTH_ADMIN_SETTINGS_FORM_IDS.installationEdit,
          label: labels.installations.editTitle,
          submitLabel: labels.submitLabel,
          configOverrides: {
            source: {
              providerKey: PHI_AUTH_RUNTIME_DATA_PROVIDER_KEYS.installations,
              resourceKey: "installations",
            },
            openActionKey: "edit",
            signalRoutes: {
              emits: [{
                routeKey: "auth-installation-edit-success",
                capabilityId: "submitSuccess",
                scope: "page",
                channel: "reload",
                action: "activate",
                valueType: "none",
                receiver: tableAddress,
              }],
              listens: [{
                routeKey: "auth-installation-edit-open",
                capabilityId: "recordOpen",
                scope: "page",
                channel: "action",
                action: "activate",
                valueType: "json",
                valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction,
                receiver: editFormAddress,
              }],
            },
          },
        }],
      },
      {
        nodeKey: "panelInstallationCreate",
        title: labels.installations.createTitle,
        description: labels.installations.createDescription,
        sections: [{
          kind: "form",
          nodeKey: "widgetInstallationCreateForm",
          formId: PHI_AUTH_ADMIN_SETTINGS_FORM_IDS.installationCreate,
          label: labels.installations.createTitle,
          submitLabel: labels.submitLabel,
          configOverrides: {
            signalRoutes: {
              emits: [{
                routeKey: "auth-installation-create-success",
                capabilityId: "submitSuccess",
                scope: "page",
                channel: "reload",
                action: "activate",
                valueType: "none",
                receiver: tableAddress,
              }],
            },
          },
        }],
      },
    ],
  });

  return {
    ...tree,
    pageMeta: {
      title: { msgId: 0, source: "Authentication", value: labels.pageTitle },
      description: {
        msgId: 0,
        source: "Choose which login methods this site offers and how accounts are created and linked.",
        value: labels.pageDescription,
      },
    },
  };
}
