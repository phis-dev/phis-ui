import { createPhiPresetCmsInstanceIdMap } from "../../../types/cms-instance-id";
import { PHI_OBSERVABILITY_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/observability/ids";
import { PHI_CMS_DEFAULT_SLOT_INDEX } from "../../../constants/cms-layout-types";
import { PhiCmsPageType, PhiCmsStatus } from "../../../constants/phi-cms";
import { createPhiCmsPresetNodes } from "../../../helpers/cms-preset-nodes";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../types/cms";
import type { PhiBlockRuntime } from "../../../types";
import { buildPhiBasePageContentScaffold, PHI_BASE_PAGE_LAYOUT_NODE_ID } from "./phi-base-page-layout";
import { getPhiAdminLogsPageLabels } from "./admin-logs-label-set";
import { getPhiObservabilityLogsWidgetLabels } from "../../widgets/label-sets/observability-logs";
import { PHI_OBSERVABILITY_RUNTIME_DATA_PROVIDER_KEYS } from "../../../plugins/runtime-modules/observability/ids";
import { createPhiSignalAddress, PHI_SIGNAL_VALUE_SCHEMAS } from "../../../types/signals";
import { PHI_COLOR, PHI_SPACE } from "../../../theme/antd-css-var-contract";
import { readPhiServerApiCredentials } from "../../../helpers/phis-server-credentials";

const SYNTHETIC_ADMIN_LOGS_REGION_IDS = {
  regionContent: -441,
} as const;

const SYNTHETIC_ADMIN_LOGS_LAYOUT_IDS = createPhiPresetCmsInstanceIdMap({
  domain: "page",
  ownerModuleId: PHI_OBSERVABILITY_RUNTIME_MODULE_ID,
  presetKey: "admin-logs-page",
}, [
  "layoutDetail",
]);

const SYNTHETIC_ADMIN_LOGS_OVERLAY_IDS = createPhiPresetCmsInstanceIdMap({
  domain: "page",
  ownerModuleId: PHI_OBSERVABILITY_RUNTIME_MODULE_ID,
  presetKey: "admin-logs-page",
}, [
  "overlayDetail",
]);

const SYNTHETIC_ADMIN_LOGS_WIDGET_IDS = createPhiPresetCmsInstanceIdMap({
  domain: "page",
  ownerModuleId: PHI_OBSERVABILITY_RUNTIME_MODULE_ID,
  presetKey: "admin-logs-page",
}, [
  "widgetTable",
  "widgetDetail",
]);

export async function buildPhiDefaultAdminLogsPageTree({
  page,
  runtime,
}: {
  page: PhiCmsPageNode;
  runtime: PhiBlockRuntime;
}): Promise<PhiResolvedCmsPageTree> {
  const labels = await getPhiAdminLogsPageLabels({
    apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
    internalToken: readPhiServerApiCredentials().internalToken,
    locale: runtime.locale.current,
  });
  const widgetLabels = await getPhiObservabilityLogsWidgetLabels({
    apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
    internalToken: readPhiServerApiCredentials().internalToken,
    locale: runtime.locale.current,
  });

  const scaffold = buildPhiBasePageContentScaffold({
    page,
    regionId: SYNTHETIC_ADMIN_LOGS_REGION_IDS.regionContent,
    regionConfig: { border: false },
  });

  const nodes = createPhiCmsPresetNodes(page);
  return {
    page: {
      ...page,
      pageType: PhiCmsPageType.Standard,
      status: PhiCmsStatus.Published,
    },
    pageMeta: {
      title: { msgId: 0, source: "Logs", value: labels.pageTitle },
      description: { msgId: 0, source: "Inspect site-scoped runtime logs from the current site process.", value: labels.pageDescription },
    },
    overlays: [{
      id: SYNTHETIC_ADMIN_LOGS_OVERLAY_IDS.overlayDetail,
      overlayType: "modal",
      headerLayoutNodeId: null,
      bodyLayoutNodeId: SYNTHETIC_ADMIN_LOGS_LAYOUT_IDS.layoutDetail,
      footerPresentation: "none",
      footerLayoutNodeId: null,
      status: PhiCmsStatus.Published,
      flags: 0,
      visibilityMask: page.visibilityMask,
      sortOrder: 0,
      label: "observability log detail modal",
      config: {
        title: widgetLabels.detail.title,
        width: 960,
        mountPolicy: "lazy-keep",
        signalRoutes: {
          emits: [{
            routeKey: "admin-logs-detail-modal-open-change",
            capabilityId: "openChange",
            scope: "page",
            channel: "state",
            action: "change",
            valueType: "boolean",
            receiver: createPhiSignalAddress("cms", SYNTHETIC_ADMIN_LOGS_WIDGET_IDS.widgetDetail),
          }],
          listens: [{
            routeKey: "admin-logs-detail-modal-open",
            capabilityId: "open",
            scope: "page",
            channel: "action",
            action: "activate",
            valueType: "json",
            valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction,
            receiver: createPhiSignalAddress("cms", SYNTHETIC_ADMIN_LOGS_OVERLAY_IDS.overlayDetail),
          }],
        },
      },
    }],
    regions: [scaffold.region],
    layoutNodes: [
      scaffold.layoutNode,
      nodes.layout({
        id: SYNTHETIC_ADMIN_LOGS_LAYOUT_IDS.layoutDetail,
        parentLayoutNodeId: null,
        creationPreset: { layoutKind: "verticalflex", preset: "panel" },
        typeKey: "flex-vertical",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: "observability log detail modal content",
        config: {
          anchor: { horizontal: "left", vertical: "top" },
          gap: PHI_SPACE.base,
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
      nodes.widget({
        id: SYNTHETIC_ADMIN_LOGS_WIDGET_IDS.widgetTable,
        parentLayoutNodeId: PHI_BASE_PAGE_LAYOUT_NODE_ID,
        typeKey: "table",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: labels.tableLabel,
        config: {
          source: {
            providerKey: PHI_OBSERVABILITY_RUNTIME_DATA_PROVIDER_KEYS.table,
            resourceKey: "logs",
          },
          presentation: {
            layout: { mode: "auto", overflowX: "auto" },
            columns: [
              { key: "ts", fieldKey: "ts", title: widgetLabels.columns.time, renderer: "datetime", sizing: { mode: "content" } },
              {
                key: "level",
                fieldKey: "level",
                title: widgetLabels.columns.level,
                renderer: "badge",
                valueMap: widgetLabels.levelOptions,
                tagColorMap: {
                  debug: "success",
                  info: "processing",
                  warn: "warning",
                  error: "error",
                },
                sizing: { mode: "content" },
              },
              { key: "service", fieldKey: "service", title: widgetLabels.columns.service, renderer: "badge", sizing: { mode: "content" } },
              { key: "event", fieldKey: "event", title: widgetLabels.columns.event, renderer: "code", sizing: { mode: "content" } },
              { key: "area", fieldKey: "area", title: widgetLabels.columns.area, sizing: { mode: "content" } },
              { key: "userId", fieldKey: "userId", title: widgetLabels.columns.user, sizing: { mode: "content" } },
              { key: "requestId", fieldKey: "requestId", title: widgetLabels.columns.requestId, sizing: { mode: "content" } },
              { key: "message", fieldKey: "message", title: widgetLabels.columns.message, sizing: { mode: "fill", minWidth: 320 } },
            ],
            emptyState: {
              title: widgetLabels.empty.title,
              description: widgetLabels.empty.text,
            },
            controlSize: "small",
          },
          features: {
            search: {
              enabled: true,
              placeholder: widgetLabels.searchPlaceholder,
              debounceMs: 250,
            },
            filters: [
              {
                key: "service",
                type: "select",
                label: widgetLabels.serviceLabel,
                options: [
                  { value: "phis", label: widgetLabels.serviceOptions.server },
                  { value: "site", label: widgetLabels.serviceOptions.site },
                  { value: "ui", label: widgetLabels.serviceOptions.shared },
                ],
              },
              {
                key: "level",
                type: "select",
                multiple: true,
                label: widgetLabels.levelLabel,
                defaultValue: ["warn", "error"],
                options: [
                  { value: "debug", label: widgetLabels.levelOptions.debug },
                  { value: "info", label: widgetLabels.levelOptions.info },
                  { value: "warn", label: widgetLabels.levelOptions.warn },
                  { value: "error", label: widgetLabels.levelOptions.error },
                ],
              },
              {
                key: "since",
                type: "select",
                label: widgetLabels.timeWindowLabel,
                defaultValue: "1 hour ago",
                options: [
                  { value: "1 hour ago", label: widgetLabels.timeWindowOptions.lastHour },
                  { value: "6 hours ago", label: widgetLabels.timeWindowOptions.last6Hours },
                  { value: "24 hours ago", label: widgetLabels.timeWindowOptions.last24Hours },
                  { value: "7 days ago", label: widgetLabels.timeWindowOptions.last7Days },
                  { value: "30 days ago", label: widgetLabels.timeWindowOptions.last30Days },
                ],
              },
            ],
            pagination: {
              enabled: true,
              pageSize: 25,
              pageSizeOptions: [25, 50, 100],
              showSizeChanger: true,
            },
            sorting: { mode: "none" },
            tools: { mode: "self-contained", reload: true },
            actions: {
              row: [{ key: "view", label: widgetLabels.detail.title, icon: "eye", display: "icon", execution: "signal" }],
            },
          },
          signalRoutes: {
            emits: [{
              routeKey: "admin-logs-table-view-detail",
              capabilityId: "actionActivate",
              scope: "page",
              channel: "action",
              action: "activate",
              valueType: "json",
              valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction,
              receiver: createPhiSignalAddress("cms", SYNTHETIC_ADMIN_LOGS_WIDGET_IDS.widgetDetail),
            }, {
              routeKey: "admin-logs-table-open-detail-overlay",
              capabilityId: "actionActivate",
              scope: "page",
              channel: "action",
              action: "activate",
              valueType: "json",
              valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction,
              receiver: createPhiSignalAddress("cms", SYNTHETIC_ADMIN_LOGS_OVERLAY_IDS.overlayDetail),
            }],
          },
        },
      }),
      nodes.widget({
        id: SYNTHETIC_ADMIN_LOGS_WIDGET_IDS.widgetDetail,
        parentLayoutNodeId: SYNTHETIC_ADMIN_LOGS_LAYOUT_IDS.layoutDetail,
        typeKey: "record",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: "observability log record",
        config: {
          source: {
            providerKey: PHI_OBSERVABILITY_RUNTIME_DATA_PROVIDER_KEYS.table,
            resourceKey: "logs",
          },
          openActionKey: "view",
          presentation: {
            appearance: "grid",
            columns: 2,
            fields: [
              { key: "ts", fieldKey: "ts", label: widgetLabels.columns.time, renderer: "datetime" },
              {
                key: "level",
                fieldKey: "level",
                label: widgetLabels.columns.level,
                renderer: "badge",
                valueMap: widgetLabels.levelOptions,
                // The same map the column above uses, so a debug line is not green in one place and grey in the other.
                tagColorMap: {
                  debug: "success",
                  info: "processing",
                  warn: "warning",
                  error: "error",
                },
              },
              { key: "service", fieldKey: "service", label: widgetLabels.columns.service, renderer: "badge" },
              { key: "event", fieldKey: "event", label: widgetLabels.columns.event, renderer: "code" },
              { key: "area", fieldKey: "area", label: widgetLabels.columns.area },
              { key: "method", fieldKey: "method", label: widgetLabels.detail.method },
              { key: "path", fieldKey: "path", label: widgetLabels.detail.path },
              { key: "status", fieldKey: "status", label: widgetLabels.detail.status },
              { key: "message", fieldKey: "message", label: widgetLabels.columns.message, full: true },
              { key: "meta", fieldKey: "meta", label: widgetLabels.detail.meta, renderer: "json", full: true },
              { key: "error", fieldKey: "error", label: widgetLabels.detail.error, renderer: "json", full: true },
            ],
          },
          signalRoutes: {
            listens: [{
              routeKey: "admin-logs-detail-record-open",
              capabilityId: "recordOpen",
              scope: "page",
              channel: "action",
              action: "activate",
              valueType: "json",
              valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction,
              receiver: createPhiSignalAddress("cms", SYNTHETIC_ADMIN_LOGS_WIDGET_IDS.widgetDetail),
            }, {
              routeKey: "admin-logs-detail-modal-closed",
              capabilityId: "close",
              scope: "page",
              channel: "state",
              action: "change",
              valueType: "boolean",
              receiver: createPhiSignalAddress("cms", SYNTHETIC_ADMIN_LOGS_WIDGET_IDS.widgetDetail),
            }],
          },
        },
      }),
    ],
  };
}
