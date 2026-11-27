import { createPhiPresetCmsInstanceIdMap } from "../../../../types/cms-instance-id";
import { PHI_CMS_DEFAULT_SLOT_INDEX } from "../../../../constants/cms-layout-types";
import { PhiCmsFlags, PhiCmsPageType } from "../../../../constants/phi-cms";
import { createPhiCmsPresetNodes } from "../../../../helpers/cms-preset-nodes";
import { PHI_DIALOG_BODY_CONFIG } from "../../../../helpers/cms-dialog";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../../types/cms";
import type { PhiBlockRuntime } from "../../../../types";
import { buildPhiBasePageContentScaffold, PHI_BASE_PAGE_LAYOUT_NODE_ID } from "../../../../components/regions/presets/phi-base-page-layout";
import { createPhiSignalAddress, PHI_SIGNAL_VALUE_SCHEMAS } from "../../../../types/signals";
import { buildPhiWidgetLabelTranslatorOptions } from "../../../../components/widgets/label-sets/runtime-options";
import { canPhiViewerAccess } from "../../../../types/access";
import { PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS, PHI_SITE_MEMBER_SEARCH_MIN_CHARS } from "../../../../constants/core-data-provider-keys";
import {
  PHI_BILLING_DOCUMENT_RESOURCE_KEYS,
  PHI_BILLING_PAGE_PRESET_KEYS,
  PHI_BILLING_RUNTIME_DATA_PROVIDER_KEYS,
  PHI_BILLING_RUNTIME_MODULE_ID,
} from "../ids";
import { PHI_BILLING_STAFF_ACCESS } from "../access";
import { getPhiBillingAccountingDocumentsPageLabels, getPhiBillingDocumentLabels } from "../labels";
import {
  buildPhiBillingDocumentColumns,
  buildPhiBillingDocumentMarksColumn,
  buildPhiBillingDocumentFooter,
  buildPhiBillingDocumentOpenActions,
  buildPhiBillingDocumentParams,
  PHI_BILLING_DOCUMENT_COLORS,
} from "./document-table";

const SYNTHETIC_REGION_ID = -586;

const PRESET = {
  domain: "page",
  ownerModuleId: PHI_BILLING_RUNTIME_MODULE_ID,
  presetKey: PHI_BILLING_PAGE_PRESET_KEYS.accountingDocuments,
} as const;

const LAYOUT_IDS = createPhiPresetCmsInstanceIdMap(PRESET, ["layoutDetail"]);
const OVERLAY_IDS = createPhiPresetCmsInstanceIdMap(PRESET, ["overlayDetail"]);
const WIDGET_IDS = createPhiPresetCmsInstanceIdMap(PRESET, ["widgetTable", "widgetDetail"]);

function tableActionRoute(routeKey: string, receiver: ReturnType<typeof createPhiSignalAddress>) {
  return {
    routeKey,
    capabilityId: "actionActivate",
    scope: "page" as const,
    channel: "action",
    action: "activate" as const,
    valueType: "json" as const,
    valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction,
    receiver,
  };
}

/**
 * The Accounting page `Documents` of the Billing Module, for Admin and Accountant: every billing document
 * of the Site (`GET /api/site/accounting/billing-documents`) as one Table, filtered by person -- Core turns
 * the member into their subject -- issuer, kind, source Add-on, the period issued, state and payment
 * state, and searched by number, reference and description.
 *
 * Details (row) opens a read-only record: the structured content written out, the file, the series, the
 * invoice it refers to and the documents that refer to it, and why it was voided. Open and Download go to
 * Core's signed address; Retry starts fetching a Provider's document again whose fetching was given up.
 * Nothing is edited here.
 */
export async function buildPhiBillingAccountingDocumentsPageTree({
  page,
  runtime,
}: {
  page: PhiCmsPageNode;
  runtime: PhiBlockRuntime;
}): Promise<PhiResolvedCmsPageTree> {
  const translator = buildPhiWidgetLabelTranslatorOptions(runtime);
  const [labels, documents] = await Promise.all([
    getPhiBillingAccountingDocumentsPageLabels(translator),
    getPhiBillingDocumentLabels(translator),
  ]);
  const nodes = createPhiCmsPresetNodes(page);
  const scaffold = buildPhiBasePageContentScaffold({ page, regionId: SYNTHETIC_REGION_ID });
  const pageMeta = {
    title: { msgId: 0, source: "Documents", value: labels.pageTitle },
    description: {
      msgId: 0,
      source: "Every billing document of the site: the payment provider's, the shop's and every issuer's.",
      value: labels.pageDescription,
    },
  };
  if (!canPhiViewerAccess(runtime.viewer, PHI_BILLING_STAFF_ACCESS)) {
    return {
      page: nodes.page({ pageType: PhiCmsPageType.Standard }),
      pageMeta,
      regions: [scaffold.region],
      layoutNodes: [scaffold.layoutNode],
      overlays: [],
      contentWidgets: [nodes.widget({
        id: WIDGET_IDS.widgetTable,
        parentLayoutNodeId: PHI_BASE_PAGE_LAYOUT_NODE_ID,
        typeKey: "simple-text",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: labels.pageTitle,
        flags: PhiCmsFlags.NoTranslate,
        config: { text: labels.notStaff, tone: "secondary" },
      })],
    };
  }

  const tableAddress = createPhiSignalAddress("cms", WIDGET_IDS.widgetTable);
  const detailAddress = createPhiSignalAddress("cms", WIDGET_IDS.widgetDetail);
  const overlayAddress = createPhiSignalAddress("cms", OVERLAY_IDS.overlayDetail);
  const source = {
    providerKey: PHI_BILLING_RUNTIME_DATA_PROVIDER_KEYS.documents,
    resourceKey: PHI_BILLING_DOCUMENT_RESOURCE_KEYS.site,
    params: buildPhiBillingDocumentParams(documents),
  };
  const option = (entries: Readonly<Record<string, string>>) =>
    Object.entries(entries).map(([value, label]) => ({ value, label }));

  return {
    page: nodes.page({ pageType: PhiCmsPageType.Standard }),
    pageMeta,
    overlays: [
      nodes.overlay({
        id: OVERLAY_IDS.overlayDetail,
        overlayType: "modal",
        bodyLayoutNodeId: LAYOUT_IDS.layoutDetail,
        sortOrder: 0,
        label: "billing document detail modal",
        config: {
          title: labels.detail.title,
          size: { width: 960 },
          maxSize: { width: "90vw" },
          mountPolicy: "lazy-keep",
          openActionKey: "view",
          signalRoutes: {
            emits: [{
              routeKey: "billing-document-detail-open-change",
              capabilityId: "openChange",
              scope: "page",
              channel: "state",
              action: "change",
              valueType: "boolean",
              receiver: detailAddress,
            }],
            listens: [{
              routeKey: "billing-document-detail-open",
              capabilityId: "open",
              scope: "page",
              channel: "action",
              action: "activate",
              valueType: "json",
              valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction,
              receiver: overlayAddress,
            }],
          },
        },
      }),
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
        label: "billing document detail modal content",
        config: {
          ...PHI_DIALOG_BODY_CONFIG,
          anchor: { horizontal: "left", vertical: "top" },
        },
      }),
    ],
    contentWidgets: [
      nodes.widget({
        id: WIDGET_IDS.widgetTable,
        parentLayoutNodeId: PHI_BASE_PAGE_LAYOUT_NODE_ID,
        typeKey: "table",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        // The Module's Label Sets, translated already.
        flags: PhiCmsFlags.NoTranslate,
        label: labels.tableLabel,
        config: {
          source,
          presentation: {
            layout: { mode: "auto", overflowX: "auto" },
            columns: buildPhiBillingDocumentColumns(documents, [
              { key: "source", fieldKey: "sourceAddonId", title: documents.columns.source, renderer: "code", sizing: { mode: "content" } },
              { key: "reference", fieldKey: "reference", title: documents.columns.reference, sizing: { mode: "content" } },
              buildPhiBillingDocumentMarksColumn(documents),
            ]),
            emptyState: { title: labels.emptyTitle, description: labels.emptyText },
            footer: buildPhiBillingDocumentFooter(documents),
            controlSize: "small",
          },
          features: {
            search: { enabled: true, placeholder: labels.searchPlaceholder, debounceMs: 250 },
            filters: [
              {
                key: "userId",
                type: "select",
                label: labels.filters.person,
                optionsProvider: {
                  providerKey: PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.siteMembers,
                  loadMode: "server",
                  search: { enabled: true, minChars: PHI_SITE_MEMBER_SEARCH_MIN_CHARS },
                },
              },
              { key: "issuerKind", type: "select", label: labels.filters.issuerKind, options: option(documents.issuerKinds) },
              { key: "issuer", type: "text", label: labels.filters.issuer },
              { key: "kinds", type: "select", multiple: true, label: documents.filterKind, options: option(documents.kinds) },
              { key: "source", type: "text", label: labels.filters.source },
              {
                key: "period",
                type: "dateRange",
                label: labels.filters.period,
                startKey: "from",
                endKey: "to",
                startPlaceholder: labels.filters.periodStart,
                endPlaceholder: labels.filters.periodEnd,
              },
              { key: "status", type: "select", multiple: true, label: labels.filters.status, options: option(documents.statuses) },
              { key: "paymentState", type: "select", label: labels.filters.payment, options: option(documents.paymentStates) },
            ],
            pagination: { enabled: true, pageSize: 50, pageSizes: [50, 100] },
            sorting: { mode: "none" },
            tools: { mode: "self-contained", reload: true },
            actions: {
              row: [
                { key: "view", label: documents.actions.view, icon: "profile", display: "icon", execution: "signal" },
                ...buildPhiBillingDocumentOpenActions(documents),
                {
                  key: "retry",
                  label: documents.actions.retry,
                  icon: "reload",
                  display: "icon",
                  execution: "provider",
                  confirm: {
                    title: labels.retry.title,
                    description: labels.retry.text,
                    okText: labels.retry.ok,
                    cancelText: labels.confirmCancel,
                  },
                },
              ],
            },
          },
          signalRoutes: {
            // One announcement, two listeners: the dialog and the record decide by the `view` key.
            emits: [
              tableActionRoute("billing-documents-table-view-detail", detailAddress),
              tableActionRoute("billing-documents-table-open-detail", overlayAddress),
            ],
            listens: [{
              routeKey: "billing-documents-table-reload",
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
        label: "billing document record",
        config: {
          source: { ...source },
          openActionKey: "view",
          presentation: {
            appearance: "grid",
            columns: 2,
            fields: [
              { key: "kind", fieldKey: "kind", label: documents.columns.kind, valueMap: documents.kinds },
              { key: "number", fieldKey: "number", label: documents.columns.number, renderer: "code" },
              { key: "label", fieldKey: "label", label: documents.columns.label, full: true },
              { key: "issuedAt", fieldKey: "issuedAt", label: documents.columns.date, renderer: "datetime" },
              { key: "issuer", fieldKey: "issuerName", label: documents.columns.issuer },
              { key: "issuerKind", fieldKey: "issuerKind", label: labels.filters.issuerKind, valueMap: documents.issuerKinds },
              { key: "source", fieldKey: "sourceAddonId", label: documents.columns.source, renderer: "code" },
              { key: "consumer", fieldKey: "consumerAddonId", label: labels.detail.consumer, renderer: "code" },
              { key: "reference", fieldKey: "reference", label: documents.columns.reference },
              { key: "total", fieldKey: "total", label: documents.columns.total, renderer: "money" },
              { key: "presentment", fieldKey: "presentment", label: documents.columns.totalHint, renderer: "money" },
              {
                key: "status",
                fieldKey: "status",
                label: documents.columns.state,
                renderer: "badge",
                valueMap: documents.statuses,
                tagColorMap: PHI_BILLING_DOCUMENT_COLORS.status,
              },
              {
                key: "paymentState",
                fieldKey: "paymentState",
                label: documents.columns.payment,
                renderer: "badge",
                valueMap: documents.paymentStates,
                tagColorMap: PHI_BILLING_DOCUMENT_COLORS.payment,
              },
              { key: "dueAt", fieldKey: "dueAt", label: labels.detail.due, renderer: "date" },
              {
                key: "marks",
                fieldKey: "marks",
                label: documents.columns.marks,
                renderer: "tags",
                valueMap: documents.marks,
                tagColorMap: PHI_BILLING_DOCUMENT_COLORS.marks,
              },
              { key: "voidReason", fieldKey: "voidReason", label: labels.detail.voidReason },
              { key: "correctsNumber", fieldKey: "correctsNumber", label: labels.detail.forInvoice, renderer: "code" },
              { key: "correctionNumbers", fieldKey: "correctionNumbers", label: labels.detail.correctedBy, renderer: "tags" },
              { key: "series", fieldKey: "seriesLabel", label: labels.detail.series },
              { key: "file", fieldKey: "fileLabel", label: labels.detail.file },
              { key: "seller", fieldKey: "seller", label: labels.detail.seller, full: true },
              { key: "buyer", fieldKey: "buyer", label: labels.detail.buyer, full: true },
              { key: "lines", fieldKey: "lines", label: labels.detail.lines, full: true },
              { key: "notes", fieldKey: "notes", label: labels.detail.notes, full: true },
              { key: "paymentId", fieldKey: "paymentId", label: labels.detail.payment, renderer: "code" },
              { key: "subscriptionId", fieldKey: "subscriptionId", label: labels.detail.subscription, renderer: "code" },
              { key: "retainUntil", fieldKey: "retainUntil", label: labels.detail.retain, renderer: "date" },
            ],
          },
          signalRoutes: {
            listens: [{
              routeKey: "billing-document-detail-record-open",
              capabilityId: "recordOpen",
              scope: "page",
              channel: "action",
              action: "activate",
              valueType: "json",
              valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction,
              receiver: detailAddress,
            }, {
              routeKey: "billing-document-detail-modal-closed",
              capabilityId: "close",
              scope: "page",
              channel: "state",
              action: "change",
              valueType: "boolean",
              receiver: detailAddress,
            }],
          },
        },
      }),
    ],
  };
}
