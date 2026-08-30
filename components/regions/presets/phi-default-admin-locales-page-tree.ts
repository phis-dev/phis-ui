import { createPhiPresetCmsInstanceIdMap } from "../../../types/cms-instance-id";
import { PHI_LOCALIZATION_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/localization/ids";
import {
  PHI_CMS_DEFAULT_SLOT_INDEX,
} from "../../../constants/cms-layout-types";
import { PhiCmsPageType, PhiCmsRegionType, PhiCmsStatus } from "../../../constants/phi-cms";
import { buildPhiCmsLayoutNode, buildPhiCmsWidgetNode } from "../../../helpers/cms-node-factories";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../types/cms";
import type { PhiBlockRuntime } from "../../../types";
import { createPhiSignalAddress } from "../../../types/signals";
import { getPhiAdminLocalesPageLabels } from "./admin-locales-label-set";
import { getPhiAdminLocalesWidgetLabels } from "../../widgets/label-sets/admin-locales";
import { PHI_COLOR, PHI_SPACE } from "../../../theme/antd-css-var-contract";
import { PHI_LOCALIZATION_RUNTIME_DATA_PROVIDER_KEYS } from "../../../plugins/runtime-modules/localization/ids";
import { PHI_LOCALIZATION_FORM_IDS } from "../../../plugins/runtime-modules/localization/forms";

const SYNTHETIC_ADMIN_LOCALES_REGION_IDS = {
  regionContent: -461,
} as const;

const SYNTHETIC_ADMIN_LOCALES_LAYOUT_IDS = createPhiPresetCmsInstanceIdMap({
  domain: "page",
  ownerModuleId: PHI_LOCALIZATION_RUNTIME_MODULE_ID,
  presetKey: "admin-locales-page",
}, [
  "layoutContent",
]);

export const SYNTHETIC_ADMIN_LOCALES_WIDGET_IDS = createPhiPresetCmsInstanceIdMap({
  domain: "page",
  ownerModuleId: PHI_LOCALIZATION_RUNTIME_MODULE_ID,
  presetKey: "admin-locales-page",
}, [
  "widgetLocales",
  "widgetSiteLocalesForm",
  "widgetSiteLocalesSubmit",
]);

export async function buildPhiDefaultAdminLocalesPageTree({
  page,
  runtime,
}: {
  page: PhiCmsPageNode;
  runtime: PhiBlockRuntime;
}): Promise<PhiResolvedCmsPageTree> {
  const labels = await getPhiAdminLocalesPageLabels({
    apiBaseUrl: runtime.phis.apiBaseUrl,
    internalToken: runtime.phis.internalToken,
    locale: runtime.locale.current,
  });
  const widgetLabels = await getPhiAdminLocalesWidgetLabels({
    apiBaseUrl: runtime.phis.apiBaseUrl,
    internalToken: runtime.phis.internalToken,
    locale: runtime.locale.current,
  });

  return {
    page: {
      ...page,
      pageType: PhiCmsPageType.Standard,
      status: PhiCmsStatus.Published,
    },
    pageMeta: {
      title: { msgId: 0, source: "Locales", value: labels.pageTitle },
      description: { msgId: 0, source: "Manage site languages and site-specific translations.", value: labels.pageDescription },
    },
    overlays: [],
    regions: [
      {
        id: SYNTHETIC_ADMIN_LOCALES_REGION_IDS.regionContent,
        pageId: page.id,
        areaPresetId: null,
        regionType: PhiCmsRegionType.Content,
        rootLayoutNodeId: SYNTHETIC_ADMIN_LOCALES_LAYOUT_IDS.layoutContent,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        sortOrder: 30,
        config: {
          border: false,
        },
      },
    ],
    layoutNodes: [
      buildPhiCmsLayoutNode({
        id: SYNTHETIC_ADMIN_LOCALES_LAYOUT_IDS.layoutContent,
        siteId: page.siteId,
        parentLayoutNodeId: null,
        creationPreset: { layoutKind: "grid", preset: "panel" },
        typeKey: "grid",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: labels.contentLabel,
        config: {
          gap: PHI_SPACE.base,
          columns: 24,
          slotPlacements: [
            { slotIndex: 0, span: { compact: 24, medium: 24, wide: 24 }, offset: { compact: 0, medium: 0, wide: 0 } },
            { slotIndex: 1, span: { compact: 24, medium: 16, wide: 18 }, offset: { compact: 0, medium: 8, wide: 6 } },
            { slotIndex: 2, span: { compact: 24, medium: 24, wide: 24 }, offset: { compact: 0, medium: 0, wide: 0 } },
          ],
          width: "100%",
          maxWidth: "100%",
          margin: 0,
          padding: PHI_SPACE.base,
          background: PHI_COLOR.bgLayout,
          border: false,
        },
      }),
    ],
    contentWidgets: [
      buildPhiCmsWidgetNode({
        id: SYNTHETIC_ADMIN_LOCALES_WIDGET_IDS.widgetSiteLocalesForm,
        siteId: page.siteId,
        parentLayoutNodeId: SYNTHETIC_ADMIN_LOCALES_LAYOUT_IDS.layoutContent,
        typeKey: "form",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "site locale settings form",
        config: {
          formId: PHI_LOCALIZATION_FORM_IDS.siteLocales,
          formConfig: {
            initialValues: {},
          },
          source: {
            providerKey: PHI_LOCALIZATION_RUNTIME_DATA_PROVIDER_KEYS.table,
            resourceKey: "siteLocaleSettings",
          },
          execution: { mode: "handler" },
          signalRoutes: {
            emits: [{
              routeKey: "admin-locales-settings-submit-reload-table",
              capabilityId: "submitSuccess",
              scope: "page",
              channel: "reload",
              action: "activate",
              valueType: "none",
              receiver: createPhiSignalAddress("cms", SYNTHETIC_ADMIN_LOCALES_WIDGET_IDS.widgetLocales),
            }],
            listens: [{
              routeKey: "admin-locales-settings-submit",
              capabilityId: "submit",
              scope: "page",
              channel: "submit",
              action: "activate",
              valueType: "none",
              receiver: createPhiSignalAddress("cms", SYNTHETIC_ADMIN_LOCALES_WIDGET_IDS.widgetSiteLocalesForm),
            }],
          },
        },
      }),
      buildPhiCmsWidgetNode({
        id: SYNTHETIC_ADMIN_LOCALES_WIDGET_IDS.widgetSiteLocalesSubmit,
        siteId: page.siteId,
        parentLayoutNodeId: SYNTHETIC_ADMIN_LOCALES_LAYOUT_IDS.layoutContent,
        typeKey: "button",
        slotIndex: 1,
        sortOrder: 1,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "save site locale settings",
        config: {
          key: "saveLocales",
          actionKey: "save",
          label: widgetLabels.saveLocalesLabel,
          buttonType: "primary",
          signalRoutes: { emits: [{
            routeKey: "admin-locales-settings-submit-button",
            capabilityId: "activate",
            scope: "page",
            channel: "submit",
            action: "activate",
            valueType: "none",
            receiver: createPhiSignalAddress("cms", SYNTHETIC_ADMIN_LOCALES_WIDGET_IDS.widgetSiteLocalesForm),
          }] },
        },
        contentId: null,
      }),
      buildPhiCmsWidgetNode({
        id: SYNTHETIC_ADMIN_LOCALES_WIDGET_IDS.widgetLocales,
        siteId: page.siteId,
        parentLayoutNodeId: SYNTHETIC_ADMIN_LOCALES_LAYOUT_IDS.layoutContent,
        typeKey: "table",
        slotIndex: 2,
        sortOrder: 2,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: labels.widgetLabel,
        config: {
          source: {
            providerKey: PHI_LOCALIZATION_RUNTIME_DATA_PROVIDER_KEYS.table,
            resourceKey: "siteTranslations",
          },
          presentation: {
            title: widgetLabels.translationsTitle,
            description: widgetLabels.translationsDescription,
            bordered: true,
            layout: { mode: "auto", overflowX: "auto" },
            columns: [
              {
                key: "source",
                fieldKey: "source",
                title: widgetLabels.columns.source,
                sticky: "left",
                sizing: { mode: "content", maxWidth: "30%" },
              },
              { key: "sourceContext", fieldKey: "sourceContext", title: widgetLabels.columns.context, renderer: "badge", sizing: { mode: "content" } },
              {
                key: "translation",
                fieldKey: "translation",
                title: widgetLabels.columns.translation,
                sizing: { mode: "fill", minWidth: 320 },
                editor: {},
              },
              { key: "updatedAt", fieldKey: "updatedAt", title: widgetLabels.columns.updated, renderer: "datetime", sizing: { mode: "content" } },
            ],
            emptyState: { title: widgetLabels.empty.title, description: widgetLabels.empty.text },
            controlSize: "small",
            footer: {
              template: widgetLabels.footer,
              values: [
                { key: "filteredTranslations", value: { source: "core", fieldKey: "totalRows" } },
                { key: "localeTranslations", value: { source: "provider", fieldKey: "localeTotal" } },
              ],
              align: "start",
            },
          },
          features: {
            search: { enabled: true, placeholder: widgetLabels.searchPlaceholder },
            filters: [{
              key: "locale",
              type: "select",
              label: widgetLabels.languageLabel,
              optionsProvider: { providerKey: PHI_LOCALIZATION_RUNTIME_DATA_PROVIDER_KEYS.adminSiteLocales },
            }],
            pagination: { enabled: true, pageSize: 25, pageSizeOptions: [25, 50, 100], showSizeChanger: true },
            sorting: { mode: "none" },
            rowSelection: {
              mode: "multiple",
              preserveSelectedRowIdentities: false,
              disabledWhen: { source: "row", valuePath: "protected", operator: "truthy" },
            },
            editing: {
              mode: "cell",
              disabledWhen: { source: "row", valuePath: "protected", operator: "truthy" },
            },
            tools: { mode: "self-contained", reload: true },
            actions: {
              bulk: [{
                key: "deleteSelected",
                label: widgetLabels.deleteSelectedLabel,
                icon: "antd:delete",
                display: "icon-label",
                mode: "danger",
                execution: "provider",
                confirm: {
                  title: widgetLabels.delete.selectedTitle,
                  description: widgetLabels.delete.selectedDescription,
                  okText: widgetLabels.actions.delete,
                },
              }],
              row: [
                {
                  key: "delete",
                  label: widgetLabels.actions.delete,
                  icon: "antd:delete",
                  display: "icon",
                  mode: "danger",
                  execution: "provider",
                  confirm: {
                    title: widgetLabels.delete.title,
                    description: widgetLabels.delete.description,
                    okText: widgetLabels.actions.delete,
                  },
                },
              ],
            },
          },
          initialQuery: { filters: {} },
          signalRoutes: {
            listens: [{
                routeKey: "admin-locales-table-reload",
                capabilityId: "reload",
                scope: "page",
                channel: "reload",
                action: "activate",
                valueType: "none",
                receiver: createPhiSignalAddress("cms", SYNTHETIC_ADMIN_LOCALES_WIDGET_IDS.widgetLocales),
            }],
          },
        },
      }),
    ],
  };
}
