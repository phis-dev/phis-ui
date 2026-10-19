import { PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS } from "../../../../constants/cms-layout-types";
import { PhiCmsPageType } from "../../../../constants/phi-cms";
import { createPhiCmsPresetNodes } from "../../../../helpers/cms-preset-nodes";
import { readPhiServerApiCredentials } from "../../../../helpers/phis-server-credentials";
import { canPhiViewerAccess, PHI_VIEWER_ACCESS_PUBLISHING } from "../../../../types/access";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../../types/cms";
import type { PhiBlockRuntime } from "../../../../types";
import type { PhiTableActionDefinition } from "../../../../types/table-widget";
import {
  buildPhiBasePageContentScaffold,
  PHI_BASE_PAGE_LAYOUT_NODE_ID,
} from "../../../../components/regions/presets/phi-base-page-layout";
import {
  PHI_EDITOR_RELEASES_DATA_PROVIDER_KEY,
  PHI_EDITOR_RELEASES_RESOURCE_KEY,
  PHI_EDITOR_RELEASES_WIDGET_ID,
} from "../ids";
import { getPhiEditorReleasesPageLabels } from "./editor-releases-label-set";

const SYNTHETIC_EDITOR_RELEASES_REGION_IDS = { regionContent: -563 } as const;

/**
 * The Publisher's queue (phis-server CONTENT.md, Submission).
 *
 * Everybody who edits sees it -- an Author sees what they submitted waiting -- and only a Publisher is
 * offered the two acts: the page offers each viewer what is theirs rather than buttons that answer 403,
 * and Core refuses the acts to anybody else regardless.
 */
export async function buildPhiDefaultEditorReleasesPageTree({
  page,
  runtime,
}: {
  page: PhiCmsPageNode;
  runtime: PhiBlockRuntime;
}): Promise<PhiResolvedCmsPageTree> {
  const credentials = readPhiServerApiCredentials();
  const labels = await getPhiEditorReleasesPageLabels({
    apiBaseUrl: credentials.apiBaseUrl,
    internalToken: credentials.internalToken,
    locale: runtime.locale.current,
  });
  const rowActions: PhiTableActionDefinition[] = canPhiViewerAccess(runtime.viewer, PHI_VIEWER_ACCESS_PUBLISHING)
    ? [
      {
        key: "publish",
        label: labels.actions.publish,
        icon: "antd:cloud-upload",
        display: "icon",
        execution: "provider",
        // An Area's draft names a Shell preset the queue does not carry; the Builder publishes it.
        disabledWhen: { source: "row", valuePath: "publishable", operator: "falsy" },
        confirm: {
          title: labels.publish.title,
          description: labels.publish.description,
          okText: labels.actions.publish,
        },
      },
      {
        key: "reject",
        label: labels.actions.reject,
        icon: "antd:undo",
        display: "icon",
        execution: "provider",
        // A Page draft has no submission to send back: the Builder's draft is the request.
        disabledWhen: { source: "row", valuePath: "rejectable", operator: "falsy" },
        confirm: {
          title: labels.reject.title,
          description: labels.reject.description,
          okText: labels.actions.reject,
        },
      },
    ]
    : [];

  const scaffold = buildPhiBasePageContentScaffold({
    page,
    regionId: SYNTHETIC_EDITOR_RELEASES_REGION_IDS.regionContent,
  });
  const nodes = createPhiCmsPresetNodes(page);

  return {
    page: nodes.page({ pageType: PhiCmsPageType.Standard }),
    overlays: [],
    regions: [scaffold.region],
    layoutNodes: [scaffold.layoutNode],
    contentWidgets: [
      nodes.widget({
        id: PHI_EDITOR_RELEASES_WIDGET_ID,
        parentLayoutNodeId: PHI_BASE_PAGE_LAYOUT_NODE_ID,
        typeKey: "table",
        slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[1].slotIndex,
        sortOrder: 10,
        label: labels.widgetLabel,
        config: {
          source: {
            providerKey: PHI_EDITOR_RELEASES_DATA_PROVIDER_KEY,
            resourceKey: PHI_EDITOR_RELEASES_RESOURCE_KEY,
          },
          presentation: {
            layout: { mode: "auto", overflowX: "auto" },
            columns: [
              {
                key: "kind",
                fieldKey: "kind",
                title: labels.columns.kind,
                renderer: "badge",
                valueMap: labels.kinds,
                sizing: { mode: "content", minWidth: 104 },
              },
              {
                key: "what",
                fieldKey: "what",
                title: labels.columns.what,
                sizing: { mode: "fill", minWidth: 280 },
              },
              {
                key: "where",
                fieldKey: "where",
                title: labels.columns.where,
                sizing: { mode: "content", minWidth: 160 },
              },
              {
                key: "by",
                fieldKey: "by",
                title: labels.columns.by,
                sizing: { mode: "content", minWidth: 140 },
              },
              {
                key: "at",
                fieldKey: "at",
                title: labels.columns.at,
                renderer: "datetime",
                sizing: { mode: "content", minWidth: 168 },
              },
            ],
            footer: {
              template: labels.footer,
              values: [{ key: "releases", value: { source: "core", fieldKey: "totalRows" } }],
              align: "start",
            },
            emptyState: { title: labels.empty.title, description: labels.empty.text },
            controlSize: "small",
          },
          features: {
            pagination: { enabled: false },
            sorting: { mode: "none" },
            tools: { mode: "self-contained", reset: false, reload: true },
            actions: { toolbar: [], row: rowActions },
          },
        },
      }),
    ],
  };
}
