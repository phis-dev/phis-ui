import {
  PHI_USER_MANAGEMENT_RUNTIME_DATA_PROVIDER_KEYS,
  PHI_USER_MANAGEMENT_RUNTIME_MODULE_ID,
  PHI_USER_MANAGEMENT_USERS_ACCESS_PAGE_PRESET_KEY,
  PHI_USER_MANAGEMENT_USERS_ACCESS_RESOURCE_KEYS as RESOURCES,
} from "../ids";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../../types/cms";
import type { PhiBlockRuntime } from "../../../../types";
import { buildPhiSettingsPageShellTree } from "../../../../components/regions/presets/phi-settings-page-shell-tree";
import { buildPhiWidgetLabelTranslatorOptions } from "../../../../components/widgets/label-sets/runtime-options";
import { getPhiAdminUsersAccessLabels } from "./admin-users-access-label-set";

const REGION_CONTENT_ID = -487;

/**
 * Admin -> Settings -> People data: what the Site lets Add-ons read of people (`users:v1`), phis-server
 * `/api/site/admin/users-access`. A Settings page like the others, three panels in the one shell:
 *
 * - **Background access**, one row per installed Add-on that reads people: what its manifest reads, what it
 *   asks to read with nobody acting, what the Site granted and what still awaits a grant. Granting gives it
 *   what it asks; withdrawing ends it. A manifest asking for more later keeps the old grant until granted
 *   again, which is what `Awaiting` shows.
 * - **Retention**, the days the log keeps an entry, edited in its cell.
 * - **Access log**, newest first, narrowed by a person's subject and an Add-on.
 *
 * Core answers these routes to a Site Admin only, and the Settings entry is offered to them alone; a
 * Maintainer who opens the address is refused by the routes, and the Tables say so.
 */
export async function buildPhiDefaultAdminUsersAccessPageTree({
  page,
  runtime,
}: {
  page: PhiCmsPageNode;
  runtime: PhiBlockRuntime;
}): Promise<PhiResolvedCmsPageTree> {
  const labels = await getPhiAdminUsersAccessLabels(buildPhiWidgetLabelTranslatorOptions(runtime));
  const fieldTags = {
    renderer: "tags" as const,
    sizing: { mode: "content" as const },
    valueMap: labels.fields,
  };

  const tree = buildPhiSettingsPageShellTree({
    page,
    ownerModuleId: PHI_USER_MANAGEMENT_RUNTIME_MODULE_ID,
    presetKey: PHI_USER_MANAGEMENT_USERS_ACCESS_PAGE_PRESET_KEY,
    regionId: REGION_CONTENT_ID,
    label: labels.pageTitle,
    panels: [
      {
        nodeKey: "panelBackground",
        title: labels.panels.background.title,
        description: labels.panels.background.description,
        sections: [{
          nodeKey: "widgetAddons",
          typeKey: "table",
          label: labels.widgets.addons,
          config: {
            source: { providerKey: PHI_USER_MANAGEMENT_RUNTIME_DATA_PROVIDER_KEYS.usersAccess, resourceKey: RESOURCES.addons },
            presentation: {
              controlSize: "small",
              layout: { mode: "auto", overflowX: "auto" },
              columns: [
                { key: "addonId", fieldKey: "addonId", title: labels.columns.addon, renderer: "code", sizing: { mode: "content" }, sticky: "left" },
                { key: "fields", fieldKey: "fields", title: labels.columns.fields, ...fieldTags },
                { key: "background", fieldKey: "background", title: labels.columns.background, ...fieldTags },
                { key: "granted", fieldKey: "granted", title: labels.columns.granted, ...fieldTags, tagColorMap: { name: "success", email: "success", phone: "success", address: "success" } },
                { key: "awaiting", fieldKey: "awaiting", title: labels.columns.awaiting, ...fieldTags, tagColorMap: { name: "warning", email: "warning", phone: "warning", address: "warning" } },
                { key: "grantedAt", fieldKey: "grantedAt", title: labels.columns.grantedAt, renderer: "datetime", sizing: { mode: "content" } },
              ],
              emptyState: { title: labels.empty.addons },
              footer: {
                template: labels.footers.addons,
                values: [{ key: "addons", value: { source: "core", fieldKey: "totalRows" } }],
                align: "start",
              },
            },
            features: {
              pagination: { enabled: false },
              sorting: { mode: "none" },
              tools: { mode: "self-contained", reset: false, reload: true },
              actions: {
                rowLayout: "compact",
                row: [
                  {
                    key: "grant",
                    label: labels.actions.grant,
                    icon: "antd:safety-certificate",
                    display: "icon",
                    mode: "primary",
                    execution: "provider",
                    confirm: { title: labels.grant.title, description: labels.grant.text, okText: labels.grant.ok, cancelText: labels.cancel },
                  },
                  {
                    key: "revoke",
                    label: labels.actions.revoke,
                    icon: "antd:stop",
                    display: "icon",
                    mode: "danger",
                    execution: "provider",
                    confirm: { title: labels.revoke.title, description: labels.revoke.text, okText: labels.revoke.ok, cancelText: labels.cancel },
                  },
                ],
              },
            },
          },
        }],
      },
      {
        nodeKey: "panelRetention",
        title: labels.panels.retention.title,
        description: labels.panels.retention.description,
        sections: [{
          nodeKey: "widgetRetention",
          typeKey: "table",
          label: labels.widgets.retention,
          config: {
            source: { providerKey: PHI_USER_MANAGEMENT_RUNTIME_DATA_PROVIDER_KEYS.usersAccess, resourceKey: RESOURCES.retention },
            presentation: {
              controlSize: "small",
              // The heading names the one value; the panel says what it is for.
              footerOmitted: "One setting edited in its cell: there is nothing to count.",
              layout: { mode: "auto", overflowX: "auto" },
              columns: [{
                key: "days",
                fieldKey: "days",
                title: labels.columns.days,
                // The unit belongs to the value, not to the heading (TABLES.md, cell editors).
                editor: { prefix: labels.daysUnit },
                sizing: { mode: "content" },
                align: "right",
              }],
            },
            features: {
              pagination: { enabled: false },
              sorting: { mode: "none" },
              editing: { mode: "cell" },
              tools: { mode: "self-contained", reset: false, reload: false },
            },
          },
        }],
      },
      {
        nodeKey: "panelLog",
        title: labels.panels.log.title,
        description: labels.panels.log.description,
        sections: [{
          nodeKey: "widgetLog",
          typeKey: "table",
          label: labels.widgets.log,
          config: {
            source: { providerKey: PHI_USER_MANAGEMENT_RUNTIME_DATA_PROVIDER_KEYS.usersAccess, resourceKey: RESOURCES.log },
            presentation: {
              controlSize: "small",
              layout: { mode: "auto", overflowX: "auto" },
              columns: [
                { key: "at", fieldKey: "at", title: labels.columns.at, renderer: "datetime", sizing: { mode: "content" } },
                { key: "addonId", fieldKey: "addonId", title: labels.columns.addon, renderer: "code", sizing: { mode: "content" } },
                { key: "actor", fieldKey: "actor", title: labels.columns.actor, valueMap: { "": labels.nobody }, sizing: { mode: "content" } },
                { key: "road", fieldKey: "road", title: labels.columns.road, renderer: "badge", valueMap: labels.roads, sizing: { mode: "content" } },
                { key: "operation", fieldKey: "operation", title: labels.columns.operation, valueMap: labels.operations, sizing: { mode: "content" } },
                { key: "subjects", fieldKey: "subjects", title: labels.columns.subjects, renderer: "tags", sizing: { mode: "fill", minWidth: 160 } },
                { key: "fields", fieldKey: "fields", title: labels.columns.logFields, ...fieldTags },
              ],
              emptyState: { title: labels.empty.log },
              footer: {
                template: labels.footers.log,
                values: [
                  { key: "entries", value: { source: "core", fieldKey: "pageRows" } },
                  { key: "page", value: { source: "core", fieldKey: "page" } },
                ],
                align: "start",
              },
            },
            features: {
              pagination: { enabled: true, pageSize: 25, pageSizes: [25, 50, 100] },
              sorting: { mode: "none" },
              search: { enabled: false },
              tools: { mode: "self-contained", reset: true, reload: true },
              filters: [
                { key: "subject", type: "text", label: labels.filters.subject, placeholder: labels.filters.subjectPlaceholder },
                { key: "addonId", type: "text", label: labels.filters.addon, placeholder: labels.filters.addonPlaceholder },
              ],
            },
          },
        }],
      },
    ],
  });

  return {
    ...tree,
    pageMeta: {
      title: { msgId: 0, source: "People data", value: labels.pageTitle },
      description: { msgId: 0, source: "Which Add-ons read people's data in the background, and every time anybody's was read.", value: labels.pageDescription },
    },
  };
}
