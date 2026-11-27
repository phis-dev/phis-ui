import { createPhiPresetCmsInstanceIdMap } from "../../../../types/cms-instance-id";
import { PHI_CMS_DEFAULT_SLOT_INDEX } from "../../../../constants/cms-layout-types";
import { PhiCmsFlags, PhiCmsPageType } from "../../../../constants/phi-cms";
import { createPhiCmsPresetNodes } from "../../../../helpers/cms-preset-nodes";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../../types/cms";
import type { PhiBlockRuntime } from "../../../../types";
import { buildPhiBasePageContentScaffold, PHI_BASE_PAGE_LAYOUT_NODE_ID } from "../../../../components/regions/presets/phi-base-page-layout";
import { createPhiSignalAddress } from "../../../../types/signals";
import { buildPhiWidgetLabelTranslatorOptions } from "../../../../components/widgets/label-sets/runtime-options";
import {
  PHI_BILLING_DOCUMENT_RESOURCE_KEYS,
  PHI_BILLING_PAGE_PRESET_KEYS,
  PHI_BILLING_RUNTIME_DATA_PROVIDER_KEYS,
  PHI_BILLING_RUNTIME_MODULE_ID,
} from "../ids";
import { getPhiBillingAppDocumentsPageLabels, getPhiBillingDocumentLabels } from "../labels";
import {
  buildPhiBillingDocumentColumns,
  buildPhiBillingDocumentFooter,
  buildPhiBillingDocumentOpenActions,
  buildPhiBillingDocumentParams,
} from "./document-table";

const SYNTHETIC_REGION_ID = -585;

const WIDGET_IDS = createPhiPresetCmsInstanceIdMap({
  domain: "page",
  ownerModuleId: PHI_BILLING_RUNTIME_MODULE_ID,
  presetKey: PHI_BILLING_PAGE_PRESET_KEYS.appDocuments,
}, ["widgetTable"]);

/** How many years back the Year filter offers: as long as Core keeps a document. */
const YEARS_OFFERED = 11;

/**
 * The App page `Invoices and receipts` of the Billing Module, for every signed-in member: their own
 * documents of every issuer and source, newest first (`GET /api/site/account/billing-documents`), with
 * Open and Download through Core's signed address. Core answers each person what is theirs and nobody
 * else's, a detached document never.
 */
export async function buildPhiBillingAppDocumentsPageTree({
  page,
  runtime,
}: {
  page: PhiCmsPageNode;
  runtime: PhiBlockRuntime;
}): Promise<PhiResolvedCmsPageTree> {
  const translator = buildPhiWidgetLabelTranslatorOptions(runtime);
  const [labels, documents] = await Promise.all([
    getPhiBillingAppDocumentsPageLabels(translator),
    getPhiBillingDocumentLabels(translator),
  ]);
  const nodes = createPhiCmsPresetNodes(page);
  const scaffold = buildPhiBasePageContentScaffold({ page, regionId: SYNTHETIC_REGION_ID });
  const tableAddress = createPhiSignalAddress("cms", WIDGET_IDS.widgetTable);
  const thisYear = new Date().getUTCFullYear();
  const years = Array.from({ length: YEARS_OFFERED }, (_, index) => String(thisYear - index));
  return {
    page: nodes.page({ pageType: PhiCmsPageType.Standard }),
    pageMeta: {
      title: { msgId: 0, source: "Invoices and receipts", value: labels.pageTitle },
      description: {
        msgId: 0,
        source: "Your invoices, receipts and other billing documents, from every seller of this site.",
        value: labels.pageDescription,
      },
    },
    overlays: [],
    regions: [scaffold.region],
    layoutNodes: [scaffold.layoutNode],
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
          source: {
            providerKey: PHI_BILLING_RUNTIME_DATA_PROVIDER_KEYS.documents,
            resourceKey: PHI_BILLING_DOCUMENT_RESOURCE_KEYS.own,
            params: buildPhiBillingDocumentParams(documents),
          },
          presentation: {
            layout: { mode: "auto", overflowX: "auto" },
            columns: buildPhiBillingDocumentColumns(documents),
            emptyState: { title: labels.emptyTitle, description: labels.emptyText },
            footer: buildPhiBillingDocumentFooter(documents),
            controlSize: "small",
          },
          features: {
            filters: [
              {
                key: "kinds",
                type: "select",
                multiple: true,
                label: documents.filterKind,
                options: Object.entries(documents.kinds).map(([value, label]) => ({ value, label })),
              },
              {
                key: "year",
                type: "select",
                label: documents.filterYear,
                options: years.map((year) => ({ value: year, label: year })),
              },
            ],
            pagination: { enabled: true, pageSize: 50, pageSizes: [50, 100] },
            sorting: { mode: "none" },
            tools: { mode: "self-contained", reload: true },
            actions: { row: buildPhiBillingDocumentOpenActions(documents) },
          },
          signalRoutes: {
            listens: [{
              routeKey: "billing-app-documents-reload",
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
    ],
  };
}
