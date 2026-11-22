import { PHI_CMS_DEFAULT_SLOT_INDEX } from "../../../../constants/cms-layout-types";
import { PhiCmsFlags, PhiCmsPageType } from "../../../../constants/phi-cms";
import { createPhiCmsPresetNodes } from "../../../../helpers/cms-preset-nodes";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../../types/cms";
import type { PhiBlockRuntime } from "../../../../types";
import type { PhiRecordFieldDefinition } from "../../../../types/record-widget";
import type { PhiTableColumnDefinition } from "../../../../types/table-widget";
import { createPhiSignalAddress, PHI_SIGNAL_VALUE_SCHEMAS } from "../../../../types/signals";
import {
  buildPhiBasePageContentScaffold,
  PHI_BASE_PAGE_LAYOUT_NODE_ID,
} from "../../../../components/regions/presets/phi-base-page-layout";
import { buildPhiWidgetLabelTranslatorOptions } from "../../../../components/widgets/label-sets/runtime-options";
import {
  PHI_ACCOUNTING_PRODUCTS_DATA_PROVIDER_KEY,
  PHI_ACCOUNTING_PRODUCTS_PAGE_LAYOUT_IDS,
  PHI_ACCOUNTING_PRODUCTS_PAGE_OVERLAY_IDS,
  PHI_ACCOUNTING_PRODUCTS_PAGE_WIDGET_IDS,
  PHI_ACCOUNTING_PRODUCTS_RESOURCE_KEY,
} from "../ids";
import { getPhiAccountingProductsPageLabels } from "./accounting-products-label-set";

const SYNTHETIC_ACCOUNTING_PRODUCTS_REGION_IDS = { regionContent: -571 } as const;

/**
 * The row action that opens the terms side by side, and the Provider action the dialog's Release runs: the
 * dialog and its record answer to the row's announcement, the record runs the action of the same key.
 */
const RELEASE_ACTION_KEY = "release";

const STATE_COLORS = {
  draft: "default",
  active: "success",
  withdrawn: "warning",
  locked: "error",
} as const;

/**
 * The Site's product directory (phis-server SERVER_ADDONS.md, `products:v1`).
 *
 * Every product of every supplier Add-on, in every state, for whoever the Accounting Area lets in --
 * Admin, Maintainer and Accountant, the holders of Core's `accounting` access, which is also what Core
 * asks of each act. The operator releases a publisher's terms and locks or unlocks; title, summary and
 * picture stay the supplier's and are not edited here.
 *
 * The icon is not a column: no Table renderer draws a picture from an address (`imagePath`, `iconPath`).
 * Releasing opens a dialog named after the product, whose record sets the terms in force beside the ones
 * waiting; its Release runs the Provider's release on that record, and the dialog closes and the Table
 * reads again. The dialog is the confirmation, so the release asks nothing more; lock and unlock stay the
 * row's own acts with a question naming the product.
 */
export async function buildPhiDefaultAccountingProductsPageTree({
  page,
  runtime,
}: {
  page: PhiCmsPageNode;
  runtime: PhiBlockRuntime;
}): Promise<PhiResolvedCmsPageTree> {
  const labels = await getPhiAccountingProductsPageLabels(buildPhiWidgetLabelTranslatorOptions(runtime));
  const scaffold = buildPhiBasePageContentScaffold({
    page,
    regionId: SYNTHETIC_ACCOUNTING_PRODUCTS_REGION_IDS.regionContent,
  });
  const nodes = createPhiCmsPresetNodes(page);
  const termsOverlayAddress = createPhiSignalAddress("cms", PHI_ACCOUNTING_PRODUCTS_PAGE_OVERLAY_IDS.overlayTerms);
  const termsRecordAddress = createPhiSignalAddress("cms", PHI_ACCOUNTING_PRODUCTS_PAGE_WIDGET_IDS.widgetTerms);
  const tableAddress = createPhiSignalAddress("cms", PHI_ACCOUNTING_PRODUCTS_PAGE_WIDGET_IDS.widgetTable);

  const columns: PhiTableColumnDefinition[] = [
    { key: "title", fieldKey: "title", title: labels.columns.title, sizing: { mode: "fill", minWidth: 200 } },
    { key: "id", fieldKey: "id", title: labels.columns.id, renderer: "code", sizing: { mode: "content" } },
    { key: "supplier", fieldKey: "supplier", title: labels.columns.supplier, renderer: "code", sizing: { mode: "content" } },
    { key: "type", fieldKey: "type", title: labels.columns.kind, renderer: "badge", sizing: { mode: "content" } },
    {
      key: "state",
      fieldKey: "state",
      title: labels.columns.state,
      renderer: "badge",
      valueMap: labels.states,
      tagColorMap: STATE_COLORS,
      sizing: { mode: "content" },
    },
    {
      key: "sale",
      fieldKey: "sale",
      title: labels.columns.sale,
      renderer: "badge",
      valueMap: labels.sales,
      sizing: { mode: "content" },
    },
    { key: "free", fieldKey: "free", title: labels.columns.free, renderer: "checkbox", sizing: { mode: "content" } },
    {
      key: "accountRequired",
      fieldKey: "accountRequired",
      title: labels.columns.account,
      renderer: "checkbox",
      sizing: { mode: "content" },
    },
    { key: "partCount", fieldKey: "partCount", title: labels.columns.parts, align: "right", sizing: { mode: "content" } },
    {
      key: "awaitingRelease",
      fieldKey: "awaitingRelease",
      title: labels.columns.waiting,
      renderer: "checkbox",
      sizing: { mode: "content" },
    },
  ];

  // In force on the left, waiting on the right: the record's two columns are the comparison.
  const termField = (
    key: "Sale" | "ReferralUrl" | "Free" | "AccountRequired" | "Parts",
    text: { inForce: string; waiting: string },
    presentation: Pick<PhiRecordFieldDefinition, "renderer" | "valueMap">,
  ): PhiRecordFieldDefinition[] => [
    { key: `inForce${key}`, fieldKey: `inForce${key}`, label: text.inForce, ...presentation },
    { key: `pending${key}`, fieldKey: `pending${key}`, label: text.waiting, ...presentation },
  ];

  const termsDialog = nodes.dialog({
    id: PHI_ACCOUNTING_PRODUCTS_PAGE_OVERLAY_IDS.overlayTerms,
    bodyLayoutNodeId: PHI_ACCOUNTING_PRODUCTS_PAGE_LAYOUT_IDS.layoutTerms,
    sortOrder: 0,
    label: "accounting product terms modal",
    body: { config: { anchor: { horizontal: "left", vertical: "top" } } },
    config: {
      // Until the record names the product ("Terms: @acme/books:pro").
      title: labels.terms.title,
      mountPolicy: "lazy-keep",
      // Which row action this dialog is for; left unsaid, a Table action opens nothing.
      openActionKey: RELEASE_ACTION_KEY,
      signalRoutes: {
        emits: [{
          routeKey: "accounting-products-terms-open-change",
          capabilityId: "openChange",
          scope: "page",
          channel: "state",
          action: "change",
          valueType: "boolean",
          receiver: termsRecordAddress,
        }],
        listens: [{
          routeKey: "accounting-products-terms-open",
          capabilityId: "open",
          scope: "page",
          channel: "action",
          action: "activate",
          valueType: "json",
          valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction,
          receiver: termsOverlayAddress,
        }, {
          routeKey: "accounting-products-terms-title",
          capabilityId: "title",
          scope: "page",
          channel: "title",
          action: "change",
          valueType: "string",
          receiver: termsOverlayAddress,
        }, {
          routeKey: "accounting-products-terms-close",
          capabilityId: "close",
          scope: "page",
          channel: "dialog",
          action: "close",
          valueType: "none",
          receiver: termsOverlayAddress,
        }],
      },
    },
    commands: {
      footerLayoutNodeId: PHI_ACCOUNTING_PRODUCTS_PAGE_LAYOUT_IDS.layoutTermsFooter,
      widgetId: PHI_ACCOUNTING_PRODUCTS_PAGE_WIDGET_IDS.widgetTermsCommands,
      label: "accounting product terms commands",
      // The Label Set's words, already in the reader's language.
      flags: PhiCmsFlags.NoTranslate,
      config: {
        key: "accounting-products-terms-commands",
        buttons: [
          { key: "cancel", emits: [{ capabilityId: "close", value: null }], label: labels.actions.cancel, icon: "close" },
          {
            key: "release",
            // The record runs the action of this key on the product it shows.
            emits: [{ capabilityId: "release", value: RELEASE_ACTION_KEY }],
            label: labels.terms.release,
            variant: "primary",
            icon: "antd:safety-certificate",
          },
        ],
        signalRoutes: {
          emits: [{
            routeKey: "accounting-products-terms-cancel",
            capabilityId: "close",
            scope: "page",
            channel: "dialog",
            action: "close",
            valueType: "none",
            receiver: termsOverlayAddress,
          }, {
            routeKey: "accounting-products-terms-release",
            capabilityId: "release",
            scope: "page",
            channel: "action",
            action: "activate",
            valueType: "string",
            receiver: termsRecordAddress,
          }],
        },
      },
    },
  });

  return {
    page: nodes.page({ pageType: PhiCmsPageType.Standard }),
    pageMeta: {
      title: { msgId: 0, source: "Products", value: labels.pageTitle },
      description: {
        msgId: 0,
        source: "Every product the Site's Add-ons supply: release their terms, lock and unlock them.",
        value: labels.pageDescription,
      },
    },
    overlays: [termsDialog.overlay],
    regions: [scaffold.region],
    layoutNodes: [scaffold.layoutNode, ...termsDialog.layouts],
    contentWidgets: [
      nodes.widget({
        id: PHI_ACCOUNTING_PRODUCTS_PAGE_WIDGET_IDS.widgetTable,
        parentLayoutNodeId: PHI_BASE_PAGE_LAYOUT_NODE_ID,
        typeKey: "table",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: labels.widgetLabel,
        config: {
          source: {
            providerKey: PHI_ACCOUNTING_PRODUCTS_DATA_PROVIDER_KEY,
            resourceKey: PHI_ACCOUNTING_PRODUCTS_RESOURCE_KEY,
          },
          presentation: {
            layout: { mode: "auto", overflowX: "auto" },
            columns,
            footer: {
              template: labels.footer,
              values: [{ key: "products", value: { source: "core", fieldKey: "totalRows" } }],
              align: "start",
            },
            emptyState: { title: labels.empty.title, description: labels.empty.text },
            controlSize: "small",
          },
          features: {
            search: { enabled: true, placeholder: labels.search, debounceMs: 250 },
            filters: [
              {
                key: "supplier",
                type: "text",
                label: labels.filters.supplier,
                placeholder: labels.filters.supplierPlaceholder,
              },
              {
                key: "state",
                type: "select",
                multiple: true,
                label: labels.filters.state,
                options: (["draft", "active", "withdrawn", "locked"] as const)
                  .map((value) => ({ value, label: labels.states[value] })),
              },
              {
                key: "pendingTerms",
                type: "boolean",
                control: "switch",
                label: labels.filters.waiting,
                labelPlacement: "inline",
                defaultValue: false,
              },
            ],
            pagination: { enabled: true, pageSize: 25, pageSizes: [25, 50, 100] },
            sorting: { mode: "none" },
            tools: { mode: "self-contained", reload: true },
            actions: {
              rowLayout: "compact",
              row: [
                {
                  // Opens the terms dialog, whose Release runs the Provider's action of this key.
                  key: RELEASE_ACTION_KEY,
                  label: labels.actions.release,
                  icon: "antd:safety-certificate",
                  display: "icon",
                  execution: "signal",
                  disabledWhen: { source: "row", valuePath: "awaitingRelease", operator: "falsy" },
                },
                {
                  key: "lock",
                  label: labels.actions.lock,
                  icon: "antd:lock",
                  display: "icon",
                  mode: "danger",
                  execution: "provider",
                  disabledWhen: { source: "row", valuePath: "locked", operator: "truthy" },
                  confirm: {
                    title: labels.lock.title,
                    description: labels.lock.description,
                    okText: labels.actions.lock,
                    cancelText: labels.actions.cancel,
                  },
                },
                {
                  key: "unlock",
                  label: labels.actions.unlock,
                  icon: "antd:unlock",
                  display: "icon",
                  execution: "provider",
                  disabledWhen: { source: "row", valuePath: "locked", operator: "falsy" },
                  confirm: {
                    title: labels.unlock.title,
                    description: labels.unlock.description,
                    okText: labels.actions.unlock,
                    cancelText: labels.actions.cancel,
                  },
                },
              ],
            },
          },
          signalRoutes: {
            emits: [{
              routeKey: "accounting-products-table-terms-record",
              capabilityId: "actionActivate",
              scope: "page",
              channel: "action",
              action: "activate",
              valueType: "json",
              valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction,
              receiver: termsRecordAddress,
            }, {
              routeKey: "accounting-products-table-terms-overlay",
              capabilityId: "actionActivate",
              scope: "page",
              channel: "action",
              action: "activate",
              valueType: "json",
              valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction,
              receiver: termsOverlayAddress,
            }],
            // Read again once the dialog released a product's terms.
            listens: [{
              routeKey: "accounting-products-table-reload",
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
      ...termsDialog.widgets,
      // What the release does, which the row's own question used to say.
      nodes.widget({
        id: PHI_ACCOUNTING_PRODUCTS_PAGE_WIDGET_IDS.widgetTermsNote,
        parentLayoutNodeId: PHI_ACCOUNTING_PRODUCTS_PAGE_LAYOUT_IDS.layoutTerms,
        typeKey: "simple-text",
        slotIndex: 0,
        label: "accounting product terms note",
        flags: PhiCmsFlags.NoTranslate,
        config: { text: labels.release.description, tone: "secondary" },
      }),
      nodes.widget({
        id: PHI_ACCOUNTING_PRODUCTS_PAGE_WIDGET_IDS.widgetTerms,
        parentLayoutNodeId: PHI_ACCOUNTING_PRODUCTS_PAGE_LAYOUT_IDS.layoutTerms,
        typeKey: "record",
        slotIndex: 1,
        label: "accounting product terms record",
        config: {
          source: {
            providerKey: PHI_ACCOUNTING_PRODUCTS_DATA_PROVIDER_KEY,
            resourceKey: PHI_ACCOUNTING_PRODUCTS_RESOURCE_KEY,
          },
          openActionKey: RELEASE_ACTION_KEY,
          // The dialog's Release: the Provider's release, on the product shown.
          actions: [{ key: RELEASE_ACTION_KEY }],
          titleFromRecord: { template: labels.terms.titleOf, field: "id" },
          presentation: {
            appearance: "grid",
            columns: 2,
            fields: [
              { key: "title", fieldKey: "title", label: labels.terms.product, full: true },
              { key: "id", fieldKey: "id", label: labels.columns.id, renderer: "code", full: true },
              ...termField("Sale", labels.terms.sale, { renderer: "badge", valueMap: labels.sales }),
              ...termField("ReferralUrl", labels.terms.referral, { renderer: "link" }),
              ...termField("Free", labels.terms.free, { renderer: "checkbox" }),
              ...termField("AccountRequired", labels.terms.account, { renderer: "checkbox" }),
              ...termField("Parts", labels.terms.parts, { renderer: "tags" }),
            ],
          },
          signalRoutes: {
            emits: [{
              routeKey: "accounting-products-terms-record-title",
              capabilityId: "recordTitle",
              scope: "page",
              channel: "title",
              action: "change",
              valueType: "string",
              receiver: termsOverlayAddress,
            }, {
              // Released: the dialog is done, and the row has left what the filters may show.
              routeKey: "accounting-products-terms-released-close",
              capabilityId: "actionSuccess",
              scope: "page",
              channel: "dialog",
              action: "close",
              valueType: "none",
              receiver: termsOverlayAddress,
            }, {
              routeKey: "accounting-products-terms-released-reload",
              capabilityId: "actionSuccess",
              scope: "page",
              channel: "reload",
              action: "activate",
              valueType: "none",
              receiver: tableAddress,
            }],
            listens: [{
              routeKey: "accounting-products-terms-record-open",
              capabilityId: "recordOpen",
              scope: "page",
              channel: "action",
              action: "activate",
              valueType: "json",
              valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction,
              receiver: termsRecordAddress,
            }, {
              routeKey: "accounting-products-terms-record-closed",
              capabilityId: "close",
              scope: "page",
              channel: "state",
              action: "change",
              valueType: "boolean",
              receiver: termsRecordAddress,
            }, {
              routeKey: "accounting-products-terms-record-release",
              capabilityId: "actionActivate",
              scope: "page",
              channel: "action",
              action: "activate",
              valueType: "string",
              receiver: termsRecordAddress,
            }],
          },
        },
      }),
    ],
  };
}
