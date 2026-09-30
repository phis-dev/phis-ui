import { PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS } from "../../../../constants/cms-layout-types";
import { PhiCmsPageType } from "../../../../constants/phi-cms";
import { createPhiCmsPresetNodes } from "../../../../helpers/cms-preset-nodes";
import { readPhiServerApiCredentials } from "../../../../helpers/phis-server-credentials";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../../types/cms";
import type { PhiBlockRuntime } from "../../../../types";
import { getPhiEditorNewsWidgetLabels } from "./editor-news-widget-label-set";
import {
  buildPhiBasePageContentScaffold,
  PHI_BASE_PAGE_LAYOUT_NODE_ID,
} from "../../../../components/regions/presets/phi-base-page-layout";
import {
  PHI_NEWS_RUNTIME_DATA_PROVIDER_KEYS,
  PHI_NEWS_TABLE_RESOURCE_KEY,
} from "../ids";
import { getPhiEditorNewsPageLabels } from "./editor-news-label-set";
import { PHI_EDITOR_NEWS_WIDGET_ID } from "../ids";

const SYNTHETIC_EDITOR_NEWS_REGION_IDS = { regionContent: -562 } as const;

/**
 * The News page of the Editor Area: the Site's entries in a Table.
 *
 * The Table is the core Widget bound to the News Module's Provider, which is what makes the same rows
 * placeable on any Page a Site composes -- the Page here is one placement, not the surface itself. Who may
 * see them is decided by the endpoint behind the Provider, so a Table on a Page nobody may edit answers
 * nothing rather than being kept out.
 *
 * Withdrawing and deleting are row actions: they state nothing, so they need no Form. Writing an entry and
 * publishing one do state something and are Forms, which arrive with the overlay this page will grow.
 */
export async function buildPhiDefaultEditorNewsPageTree({
  page,
  runtime,
}: {
  page: PhiCmsPageNode;
  runtime: PhiBlockRuntime;
}): Promise<PhiResolvedCmsPageTree> {
  const credentials = readPhiServerApiCredentials();
  const translatorOptions = {
    apiBaseUrl: credentials.apiBaseUrl,
    internalToken: credentials.internalToken,
    locale: runtime.locale.current,
  };
  const labels = await getPhiEditorNewsPageLabels(translatorOptions);
  const widgetLabels = await getPhiEditorNewsWidgetLabels(translatorOptions);

  const scaffold = buildPhiBasePageContentScaffold({
    page,
    regionId: SYNTHETIC_EDITOR_NEWS_REGION_IDS.regionContent,
  });

  const nodes = createPhiCmsPresetNodes(page);
  return {
    page: nodes.page({ pageType: PhiCmsPageType.Standard }),
    overlays: [],
    regions: [scaffold.region],
    layoutNodes: [scaffold.layoutNode],
    contentWidgets: [
      nodes.widget({
        id: PHI_EDITOR_NEWS_WIDGET_ID,
        parentLayoutNodeId: PHI_BASE_PAGE_LAYOUT_NODE_ID,
        typeKey: "table",
        slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[1].slotIndex,
        sortOrder: 10,
        label: labels.widgetLabel,
        config: {
          source: {
            providerKey: PHI_NEWS_RUNTIME_DATA_PROVIDER_KEYS.table,
            resourceKey: PHI_NEWS_TABLE_RESOURCE_KEY,
          },
          presentation: {
            layout: { mode: "auto", overflowX: "auto" },
            columns: [
              {
                key: "title",
                fieldKey: "title",
                title: widgetLabels.columns.title,
                sizing: { mode: "fill", minWidth: 280 },
              },
              {
                key: "slug",
                fieldKey: "slug",
                title: widgetLabels.columns.slug,
                renderer: "code",
                sizing: { mode: "content", minWidth: 160 },
              },
              {
                key: "status",
                fieldKey: "status",
                title: widgetLabels.columns.status,
                renderer: "badge",
                // The Provider answers a word; these are the words a reader sees.
                valueMap: { draft: widgetLabels.rowStatus.draft, published: widgetLabels.rowStatus.published },
                sizing: { mode: "content", minWidth: 112 },
              },
              {
                key: "sourceLocale",
                fieldKey: "sourceLocale",
                title: widgetLabels.columns.language,
                sizing: { mode: "content", minWidth: 96 },
              },
              {
                key: "tags",
                fieldKey: "tags",
                title: widgetLabels.columns.tags,
                renderer: "tags",
                sizing: { mode: "content", minWidth: 160 },
              },
              {
                key: "publishedAt",
                fieldKey: "publishedAt",
                title: widgetLabels.columns.published,
                renderer: "datetime",
                sizing: { mode: "content", minWidth: 168 },
              },
              {
                key: "expiresAt",
                fieldKey: "expiresAt",
                title: widgetLabels.columns.expires,
                renderer: "datetime",
                sizing: { mode: "content", minWidth: 168 },
              },
              {
                key: "updatedAt",
                fieldKey: "updatedAt",
                title: widgetLabels.columns.changed,
                renderer: "datetime",
                sizing: { mode: "content", minWidth: 168 },
              },
            ],
            emptyState: { title: widgetLabels.empty.title, description: widgetLabels.empty.text },
            controlSize: "small",
          },
          features: {
            search: { enabled: true, placeholder: widgetLabels.searchPlaceholder },
            filters: [
              {
                key: "status",
                type: "select",
                label: widgetLabels.statusLabel,
                options: [
                  { value: "all", label: widgetLabels.statuses.all },
                  { value: "draft", label: widgetLabels.statuses.draft },
                  { value: "published", label: widgetLabels.statuses.published },
                ],
                defaultValue: "all",
              },
            ],
            pagination: { enabled: true, pageSize: 25, pageSizes: [25, 50, 100] },
            sorting: { mode: "none" },
            tools: { mode: "self-contained", reset: true, reload: true },
            actions: {
              row: [
                {
                  key: "withdraw",
                  label: widgetLabels.actions.withdraw,
                  icon: "antd:eye-invisible",
                  display: "icon",
                  execution: "provider",
                  // Nothing to withdraw from an entry that was never published.
                  disabledWhen: { source: "row", valuePath: "publishedAt", operator: "falsy" },
                  confirm: {
                    title: widgetLabels.withdraw.title,
                    description: widgetLabels.withdraw.description,
                    okText: widgetLabels.actions.withdraw,
                  },
                },
                {
                  key: "delete",
                  label: widgetLabels.actions.delete,
                  icon: "antd:delete",
                  display: "icon",
                  mode: "danger",
                  execution: "provider",
                  /*
                   * Offered for a published entry as well, on purpose: Core answers `409` with the reason,
                   * and that sentence is better than a button greyed out by a row that may be a minute old.
                   */
                  confirm: {
                    title: widgetLabels.delete.title,
                    description: widgetLabels.delete.description,
                    okText: widgetLabels.actions.delete,
                  },
                },
              ],
            },
          },
          initialQuery: { filters: { status: "all" } },
        },
      }),
    ],
  };
}
