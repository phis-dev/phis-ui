import { createPhiPresetCmsInstanceIdMap } from "../../../../types/cms-instance-id";
import {
  PHI_CDN_ADMIN_PAGE_PRESET_KEY,
  PHI_CDN_RUNTIME_DATA_PROVIDER_KEYS,
  PHI_CDN_RUNTIME_MODULE_ID,
  PHI_CDN_TABLE_RESOURCE_KEYS,
} from "../ids";
import { PHI_CMS_DEFAULT_SLOT_INDEX } from "../../../../constants/cms-layout-types";
import { PhiCmsFlags, PhiCmsPageType } from "../../../../constants/phi-cms";
import { createPhiCmsPresetNodes } from "../../../../helpers/cms-preset-nodes";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../../types/cms";
import type { PhiBlockRuntime } from "../../../../types";
import { buildPhiBasePageContentScaffold, PHI_BASE_PAGE_LAYOUT_NODE_ID } from "../../../../components/regions/presets/phi-base-page-layout";
import { createPhiSignalAddress, PHI_SIGNAL_VALUE_SCHEMAS } from "../../../../types/signals";
import { PHI_DIALOG_BODY_CONFIG, PHI_DIALOG_WIDTH_SINGLE_COLUMN } from "../../../../helpers/cms-dialog";
import { buildPhiWidgetLabelTranslatorOptions } from "../../../../components/widgets/label-sets/runtime-options";
import { getPhiAdminCdnPageLabels } from "./admin-cdn-label-set";
import { getPhiCdnUploadWidgetLabels } from "../widgets/upload/labels";
import { PHI_CDN_TABLE_PARAM_KEYS } from "../table-params";

const SYNTHETIC_ADMIN_CDN_REGION_IDS = {
  regionContent: -443,
} as const;

const PRESET = {
  domain: "page",
  ownerModuleId: PHI_CDN_RUNTIME_MODULE_ID,
  presetKey: PHI_CDN_ADMIN_PAGE_PRESET_KEY,
} as const;

const LAYOUT_IDS = createPhiPresetCmsInstanceIdMap(PRESET, ["layoutDetail", "layoutUpload", "layoutCheck"]);
const OVERLAY_IDS = createPhiPresetCmsInstanceIdMap(PRESET, ["overlayDetail", "overlayUpload", "overlayCheck"]);
const WIDGET_IDS = createPhiPresetCmsInstanceIdMap(PRESET, ["widgetTable", "widgetDetail", "widgetUpload", "widgetCheck"]);

/** The Table's announcement of one of its actions, to one receiver that decides by the action's key. */
function tableActionRoute(routeKey: string, receiverId: (typeof WIDGET_IDS)[keyof typeof WIDGET_IDS] | (typeof OVERLAY_IDS)[keyof typeof OVERLAY_IDS]) {
  return {
    routeKey,
    capabilityId: "actionActivate",
    scope: "page" as const,
    channel: "action",
    action: "activate" as const,
    valueType: "json" as const,
    valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction,
    receiver: createPhiSignalAddress("cms", receiverId),
  };
}

/**
 * The Admin page `CDN`: the catalogue as one Table, and three dialogs its actions open.
 *
 * - Upload (toolbar): the Module's upload Widget, which tells the Table to read again once a file is
 *   published.
 * - Check (toolbar): a second Table on the same Provider, the `check` resource, which runs the check when
 *   the dialog opens (`remount`) and adopts what it can, row by row.
 * - Details (row): the `record` Widget on the row, with the addresses in full.
 *
 * Copy address, Withdraw and Delete are the Provider's row actions; the two that change anything ask
 * first. What any of them may do is Core's to decide, and Core refuses what a reader may not.
 */
export async function buildPhiDefaultAdminCdnPageTree({
  page,
  runtime,
}: {
  page: PhiCmsPageNode;
  runtime: PhiBlockRuntime;
}): Promise<PhiResolvedCmsPageTree> {
  const translator = buildPhiWidgetLabelTranslatorOptions(runtime);
  const [labels, uploadLabels] = await Promise.all([
    getPhiAdminCdnPageLabels(translator),
    getPhiCdnUploadWidgetLabels(translator),
  ]);
  const tableAddress = createPhiSignalAddress("cms", WIDGET_IDS.widgetTable);
  const platformNames: Record<string, string> = { ...uploadLabels.osNames, ...uploadLabels.archNames };
  const stateColors = { offered: "success", withdrawn: "warning", deleted: "error" } as const;
  const storageColors = { cdn: "default", link: "processing" } as const;
  const originNames = { cli: labels.origins.cli, upload: labels.origins.upload, addon: labels.origins.addon };
  const source = {
    providerKey: PHI_CDN_RUNTIME_DATA_PROVIDER_KEYS.table,
    resourceKey: PHI_CDN_TABLE_RESOURCE_KEYS.files,
    params: {
      [PHI_CDN_TABLE_PARAM_KEYS.noCdnText]: labels.noCdn,
      [PHI_CDN_TABLE_PARAM_KEYS.copiedText]: labels.copied,
      [PHI_CDN_TABLE_PARAM_KEYS.copyFailedText]: labels.copyFailed,
    },
  };

  const scaffold = buildPhiBasePageContentScaffold({
    page,
    regionId: SYNTHETIC_ADMIN_CDN_REGION_IDS.regionContent,
  });
  const nodes = createPhiCmsPresetNodes(page);

  const upload = nodes.dialog({
    id: OVERLAY_IDS.overlayUpload,
    bodyLayoutNodeId: LAYOUT_IDS.layoutUpload,
    sortOrder: 1,
    label: "cdn upload modal",
    body: { label: "cdn upload modal content" },
    config: {
      title: labels.uploadTitle,
      size: { width: PHI_DIALOG_WIDTH_SINGLE_COLUMN },
      // Closed, the upload stops and its session stays open: the same file picked again resumes it.
      mountPolicy: "remount",
      openActionKey: "upload",
      signalRoutes: { listens: [{
            routeKey: "admin-cdn-upload-modal-open",
            capabilityId: "open",
            scope: "page",
            channel: "action",
            action: "activate",
            valueType: "json",
            valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction,
            receiver: createPhiSignalAddress("cms", OVERLAY_IDS.overlayUpload),
          }] },
    },
  });
  const check = nodes.dialog({
    id: OVERLAY_IDS.overlayCheck,
    bodyLayoutNodeId: LAYOUT_IDS.layoutCheck,
    sortOrder: 2,
    label: "cdn check modal",
    body: { label: "cdn check modal content" },
    config: {
      title: labels.check.title,
      size: { width: 980 },
      maxSize: { width: "90vw" },
      // Every opening is a new check: the bucket is read when the Table in it mounts.
      mountPolicy: "remount",
      openActionKey: "check",
      signalRoutes: { listens: [{
            routeKey: "admin-cdn-check-modal-open",
            capabilityId: "open",
            scope: "page",
            channel: "action",
            action: "activate",
            valueType: "json",
            valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction,
            receiver: createPhiSignalAddress("cms", OVERLAY_IDS.overlayCheck),
          }] },
    },
  });

  return {
    page: nodes.page({ pageType: PhiCmsPageType.Standard }),
    pageMeta: {
      title: { msgId: 0, source: "CDN", value: labels.pageTitle },
      description: {
        msgId: 0,
        source: "Files published once under the Site's name and served from its CDN host.",
        value: labels.pageDescription,
      },
    },
    overlays: [
      nodes.overlay({
        id: OVERLAY_IDS.overlayDetail,
        overlayType: "modal",
        bodyLayoutNodeId: LAYOUT_IDS.layoutDetail,
        sortOrder: 0,
        label: "cdn file detail modal",
        config: {
          title: labels.detail.title,
          size: { width: 960 },
          mountPolicy: "lazy-keep",
          openActionKey: "view",
          signalRoutes: {
            emits: [{
              routeKey: "admin-cdn-detail-modal-open-change",
              capabilityId: "openChange",
              scope: "page",
              channel: "state",
              action: "change",
              valueType: "boolean",
              receiver: createPhiSignalAddress("cms", WIDGET_IDS.widgetDetail),
            }],
            listens: [{
            routeKey: "admin-cdn-detail-modal-open",
            capabilityId: "open",
            scope: "page",
            channel: "action",
            action: "activate",
            valueType: "json",
            valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction,
            receiver: createPhiSignalAddress("cms", OVERLAY_IDS.overlayDetail),
          }],
          },
        },
      }),
      upload.overlay,
      check.overlay,
    ],
    regions: [scaffold.region],
    layoutNodes: [
      scaffold.layoutNode,
      nodes.layout({
        id: LAYOUT_IDS.layoutDetail,
        parentLayoutNodeId: null,
        creationPreset: { layoutKind: "verticalflex", preset: "panel" },
        typeKey: "flex-vertical",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: "cdn file detail modal content",
        config: {
          ...PHI_DIALOG_BODY_CONFIG,
          anchor: { horizontal: "left", vertical: "top" },
        },
      }),
      ...upload.layouts,
      ...check.layouts,
    ],
    contentWidgets: [
      nodes.widget({
        id: WIDGET_IDS.widgetTable,
        parentLayoutNodeId: PHI_BASE_PAGE_LAYOUT_NODE_ID,
        typeKey: "table",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        // The Module's Label Set, translated already.
        flags: PhiCmsFlags.NoTranslate,
        label: labels.tableLabel,
        config: {
          source,
          presentation: {
            // Fixed, so a long file name and the checksum are cut to their columns and said whole on hover.
            layout: { mode: "fixed", overflowX: "auto" },
            columns: [
              { key: "name", fieldKey: "name", title: labels.columns.name, sortable: true, ellipsis: true, sizing: { mode: "fixed", width: 140 }, sticky: "left" },
              { key: "version", fieldKey: "version", title: labels.columns.version, ellipsis: true, sizing: { mode: "fixed", width: 110 } },
              { key: "fileName", fieldKey: "fileName", title: labels.columns.file, ellipsis: true, sizing: { mode: "fill", minWidth: 200 } },
              { key: "size", fieldKey: "sizeLabel", title: labels.columns.size, align: "right", sizing: { mode: "fixed", width: 96 } },
              {
                key: "storage",
                fieldKey: "storage",
                title: labels.columns.storage,
                description: labels.columns.storageHint,
                renderer: "badge",
                valueMap: labels.storage,
                tagColorMap: storageColors,
                sizing: { mode: "fixed", width: 96 },
              },
              {
                key: "platform",
                fieldKey: "platform",
                title: labels.columns.platform,
                renderer: "tags",
                valueMap: platformNames,
                sizing: { mode: "fixed", width: 160 },
              },
              {
                // Cut to the column's width; the cell holds the whole checksum, so copying it copies all of it.
                key: "sha256",
                fieldKey: "sha256",
                title: labels.columns.sha256,
                description: labels.columns.sha256Hint,
                renderer: "code",
                ellipsis: true,
                sizing: { mode: "fixed", width: 120 },
              },
              {
                key: "state",
                fieldKey: "state",
                title: labels.columns.state,
                renderer: "badge",
                valueMap: labels.states,
                tagColorMap: stateColors,
                sizing: { mode: "fixed", width: 116 },
              },
              { key: "origin", fieldKey: "origin", title: labels.columns.origin, valueMap: originNames, ellipsis: true, sizing: { mode: "fixed", width: 140 } },
              { key: "publishedAt", fieldKey: "publishedAt", title: labels.columns.published, renderer: "datetime", sortable: true, sizing: { mode: "fixed", width: 180 } },
            ],
            emptyState: { title: labels.emptyTitle, description: labels.emptyText },
            footer: {
              template: labels.footer,
              values: [
                { key: "rows", value: { source: "core", fieldKey: "pageRows" } },
                { key: "total", value: { source: "core", fieldKey: "totalRows" } },
              ],
            },
            controlSize: "small",
          },
          features: {
            search: { enabled: true, placeholder: labels.searchPlaceholder, debounceMs: 250 },
            filters: [{
              key: "state",
              type: "select",
              label: labels.filterState,
              defaultValue: "offered",
              options: [
                { value: "offered", label: labels.states.offered },
                { value: "withdrawn", label: labels.states.withdrawn },
                { value: "deleted", label: labels.states.deleted },
                { value: "all", label: labels.filterStateAll },
              ],
            }],
            pagination: { enabled: true, pageSize: 50, pageSizes: [50, 100, 200] },
            sorting: { mode: "single", defaultSorts: [{ key: "publishedAt", direction: "descending" }] },
            tools: { mode: "self-contained", reload: true },
            actions: {
              toolbar: [
                { key: "upload", label: labels.actions.upload, icon: "upload", display: "icon", mode: "primary", execution: "signal" },
                { key: "check", label: labels.actions.check, icon: "safety-certificate", display: "icon", execution: "signal" },
              ],
              row: [
                { key: "view", label: labels.actions.view, icon: "eye", display: "icon", execution: "signal" },
                { key: "copy-url", label: labels.actions.copy, icon: "copy", display: "icon", execution: "provider" },
                {
                  key: "withdraw",
                  label: labels.actions.withdraw,
                  icon: "stop",
                  display: "icon",
                  mode: "danger",
                  execution: "provider",
                  confirm: {
                    title: labels.withdraw.title,
                    description: labels.withdraw.text,
                    okText: labels.withdraw.ok,
                    cancelText: labels.confirmCancel,
                  },
                },
                {
                  key: "delete",
                  label: labels.actions.delete,
                  icon: "delete",
                  display: "icon",
                  mode: "danger",
                  execution: "provider",
                  confirm: {
                    title: labels.delete.title,
                    description: labels.delete.text,
                    alert: { level: "info", title: labels.delete.linkNote },
                    okText: labels.delete.ok,
                    cancelText: labels.confirmCancel,
                  },
                },
              ],
            },
          },
          signalRoutes: {
            /*
             * One announcement, five listeners: each dialog decides by its `openActionKey`, the record by
             * its own. Copy, Withdraw and Delete are the Provider's and go to nobody.
             */
            emits: [
              tableActionRoute("admin-cdn-table-view-detail", WIDGET_IDS.widgetDetail),
              tableActionRoute("admin-cdn-table-open-detail", OVERLAY_IDS.overlayDetail),
              tableActionRoute("admin-cdn-table-open-upload", OVERLAY_IDS.overlayUpload),
              tableActionRoute("admin-cdn-table-open-check", OVERLAY_IDS.overlayCheck),
            ],
            listens: [{
              routeKey: "admin-cdn-table-reload",
              capabilityId: "reload",
              scope: "page",
              channel: "reload",
              action: "activate",
              valueType: "none",
              receiver: tableAddress,
            }],
          },
        },
      }),
      nodes.widget({
        id: WIDGET_IDS.widgetDetail,
        parentLayoutNodeId: LAYOUT_IDS.layoutDetail,
        typeKey: "record",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        flags: PhiCmsFlags.NoTranslate,
        label: "cdn file record",
        config: {
          source: { ...source },
          openActionKey: "view",
          presentation: {
            appearance: "grid",
            columns: 2,
            fields: [
              { key: "key", fieldKey: "key", label: labels.detail.key, renderer: "code", full: true },
              { key: "name", fieldKey: "name", label: labels.columns.name },
              { key: "version", fieldKey: "version", label: labels.columns.version },
              { key: "fileName", fieldKey: "fileName", label: labels.columns.file },
              { key: "size", fieldKey: "sizeLabel", label: labels.columns.size },
              { key: "sizeBytes", fieldKey: "sizeBytes", label: labels.detail.sizeBytes },
              { key: "contentType", fieldKey: "contentType", label: labels.detail.contentType, renderer: "code" },
              { key: "storage", fieldKey: "storage", label: labels.columns.storage, renderer: "badge", valueMap: labels.storage, tagColorMap: storageColors },
              { key: "platform", fieldKey: "platform", label: labels.columns.platform, renderer: "tags", valueMap: platformNames },
              { key: "state", fieldKey: "state", label: labels.columns.state, renderer: "badge", valueMap: labels.states, tagColorMap: stateColors },
              { key: "publishedAt", fieldKey: "publishedAt", label: labels.columns.published, renderer: "datetime" },
              { key: "origin", fieldKey: "origin", label: labels.columns.origin, valueMap: originNames },
              { key: "addonId", fieldKey: "addonId", label: labels.detail.addon },
              { key: "actorUserId", fieldKey: "actorUserId", label: labels.detail.actor },
              { key: "sha256", fieldKey: "sha256", label: labels.columns.sha256, renderer: "code", full: true },
              { key: "url", fieldKey: "url", label: labels.detail.url, renderer: "link", full: true },
              { key: "sourceUrl", fieldKey: "sourceUrl", label: labels.detail.sourceUrl, renderer: "link", full: true },
            ],
          },
          signalRoutes: {
            listens: [{
              routeKey: "admin-cdn-detail-record-open",
              capabilityId: "recordOpen",
              scope: "page",
              channel: "action",
              action: "activate",
              valueType: "json",
              valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction,
              receiver: createPhiSignalAddress("cms", WIDGET_IDS.widgetDetail),
            }, {
              routeKey: "admin-cdn-detail-modal-closed",
              capabilityId: "close",
              scope: "page",
              channel: "state",
              action: "change",
              valueType: "boolean",
              receiver: createPhiSignalAddress("cms", WIDGET_IDS.widgetDetail),
            }],
          },
        },
      }),
      nodes.widget({
        id: WIDGET_IDS.widgetUpload,
        parentLayoutNodeId: LAYOUT_IDS.layoutUpload,
        typeKey: "cdn-upload",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: "cdn upload",
        config: {
          signalRoutes: {
            // A published file is a new row: the listing reads itself again.
            emits: [{
              routeKey: "admin-cdn-upload-published",
              capabilityId: "uploaded",
              scope: "page",
              channel: "reload",
              action: "activate",
              valueType: "none",
              receiver: tableAddress,
            }],
          },
        },
      }),
      nodes.widget({
        id: WIDGET_IDS.widgetCheck,
        parentLayoutNodeId: LAYOUT_IDS.layoutCheck,
        typeKey: "table",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        flags: PhiCmsFlags.NoTranslate,
        label: labels.check.tableLabel,
        config: {
          source: {
            providerKey: PHI_CDN_RUNTIME_DATA_PROVIDER_KEYS.table,
            resourceKey: PHI_CDN_TABLE_RESOURCE_KEYS.check,
            params: { [PHI_CDN_TABLE_PARAM_KEYS.noCdnText]: labels.noCdn },
          },
          presentation: {
            layout: { mode: "auto", overflowX: "auto" },
            columns: [
              { key: "key", fieldKey: "key", title: labels.check.columns.key, renderer: "code", sizing: { mode: "fill", minWidth: 240 } },
              {
                key: "finding",
                fieldKey: "finding",
                title: labels.check.columns.finding,
                renderer: "badge",
                valueMap: labels.check.findings,
                tagColorMap: { unrecorded: "warning", missing: "error", "size-mismatch": "error" },
                sizing: { mode: "content" },
              },
              { key: "size", fieldKey: "sizeLabel", title: labels.check.columns.size, align: "right", sizing: { mode: "content" } },
              { key: "recorded", fieldKey: "recordedLabel", title: labels.check.columns.recorded, align: "right", sizing: { mode: "content" } },
              { key: "reason", fieldKey: "reason", title: labels.check.columns.reason, sizing: { mode: "fill", minWidth: 160 } },
            ],
            emptyState: { title: labels.check.empty },
            footer: {
              template: labels.check.footer,
              values: [
                { key: "objects", value: { source: "provider", fieldKey: "objects" } },
                { key: "recorded", value: { source: "provider", fieldKey: "recorded" } },
              ],
              variants: [{
                when: { value: { source: "provider", fieldKey: "consistent" }, operator: "truthy" },
                template: labels.check.footerConsistent,
                values: [
                  { key: "objects", value: { source: "provider", fieldKey: "objects" } },
                  { key: "recorded", value: { source: "provider", fieldKey: "recorded" } },
                ],
              }],
            },
            controlSize: "small",
          },
          features: {
            pagination: { enabled: false },
            sorting: { mode: "none" },
            tools: { mode: "self-contained", reload: true },
            actions: {
              row: [{ key: "adopt", label: labels.actions.adopt, icon: "plus", display: "icon-label", execution: "provider" }],
            },
          },
        },
      }),
    ],
  };
}
