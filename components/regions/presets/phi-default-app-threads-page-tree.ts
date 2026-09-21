import { PHI_CMS_DEFAULT_SLOT_INDEX } from "../../../constants/cms-layout-types";
import { PhiCmsPageType, PhiCmsStatus } from "../../../constants/phi-cms";
import { createPhiCmsPresetNodes } from "../../../helpers/cms-preset-nodes";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../types/cms";
import type { PhiBlockRuntime } from "../../../types";
import { createPhiSignalAddress, PHI_SIGNAL_VALUE_SCHEMAS } from "../../../types/signals";
import { PHI_THREAD_LIBRARY_DATA_PROVIDER_KEYS } from "../../../constants/thread-library-provider-keys";
import { PHI_APP_THREADS_PAGE_WIDGET_IDS } from "../../../plugins/runtime-modules/threads/addresses";
import { buildPhiBasePageContentScaffold, PHI_BASE_PAGE_LAYOUT_NODE_ID } from "./phi-base-page-layout";
import { getPhiThreadPageLabels } from "../../widgets/label-sets/threads";
import { readPhiServerApiCredentials } from "../../../helpers/phis-server-credentials";

const SYNTHETIC_APP_THREADS_REGION_IDS = {
  regionContent: -453,
} as const;

/**
 * The three surfaces of a conversation, placed and wired.
 *
 * None of them holds a conversation: the listing knows which one was chosen, the conversation knows
 * how to read one, and the composer knows how to write into one. What joins them is here and nowhere
 * else -- which is the point of the routes being configuration rather than a channel name agreed on
 * inside two clients. A Site may take one of the three out, put a Module's own listing in its place,
 * or place the pair on a page of its own, and none of the Widgets learns anything about it.
 *
 * This Page is the offer, not the contract. What makes the arrangement reproducible is that every
 * route below could equally have been drawn in the Builder.
 */
export async function buildPhiDefaultAppThreadsPageTree({
  page,
  runtime,
}: {
  page: PhiCmsPageNode;
  runtime: PhiBlockRuntime;
}): Promise<PhiResolvedCmsPageTree> {
  const credentials = readPhiServerApiCredentials();
  const labels = await getPhiThreadPageLabels({
    apiBaseUrl: credentials.apiBaseUrl,
    internalToken: credentials.internalToken,
    locale: runtime.locale.current,
  });

  const conversationAddress = createPhiSignalAddress("cms", PHI_APP_THREADS_PAGE_WIDGET_IDS.widgetConversation);
  const composerAddress = createPhiSignalAddress("cms", PHI_APP_THREADS_PAGE_WIDGET_IDS.widgetComposer);

  const scaffold = buildPhiBasePageContentScaffold({
    page,
    regionId: SYNTHETIC_APP_THREADS_REGION_IDS.regionContent,
    regionConfig: { border: false },
  });

  const nodes = createPhiCmsPresetNodes(page);
  return {
    page: { ...page, pageType: PhiCmsPageType.Standard, status: PhiCmsStatus.Published },
    pageMeta: {
      title: { msgId: 0, source: "Conversations", value: labels.title },
      description: {
        msgId: 0,
        source: "Everything you are part of, and where to answer it.",
        value: labels.description,
      },
    },
    overlays: [],
    regions: [scaffold.region],
    layoutNodes: [scaffold.layoutNode],
    contentWidgets: [
      nodes.widget({
        id: PHI_APP_THREADS_PAGE_WIDGET_IDS.widgetInbox,
        parentLayoutNodeId: PHI_BASE_PAGE_LAYOUT_NODE_ID,
        typeKey: "collection-view",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: labels.inboxTitle,
        config: {
          source: {
            providerKey: PHI_THREAD_LIBRARY_DATA_PROVIDER_KEYS.collection,
            resourceKey: "inbox",
          },
          presentation: {
            title: labels.inboxTitle,
            mode: "stack",
            controlSize: "small",
            emptyDescription: labels.inboxEmpty,
          },
          features: {
            tools: { mode: "self-contained" },
            actions: {
              toolbar: [{
                key: "newConversation",
                label: labels.newConversationLabel,
                display: "label",
                mode: "primary",
              }],
            },
            pagination: { enabled: true, pageSize: 25 },
          },
          signalRoutes: {
            /*
             * One choice, announced twice.
             *
             * The conversation reads it and the composer writes into it, and neither learns of the
             * other: two routes off one capability is how a Site says "these two follow that listing".
             * A third Widget joins by being given a third route, not by anybody editing these.
             */
            emits: [{
              routeKey: "app-threads-select-conversation",
              capabilityId: "selection",
              scope: "page",
              channel: "thread",
              action: "change",
              valueType: "json",
              valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.threadSelection,
              receiver: conversationAddress,
            }, {
              routeKey: "app-threads-select-composer",
              capabilityId: "selection",
              scope: "page",
              channel: "thread",
              action: "change",
              valueType: "json",
              valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.threadSelection,
              receiver: composerAddress,
            }],
          },
        },
      }),
      nodes.widget({
        id: PHI_APP_THREADS_PAGE_WIDGET_IDS.widgetConversation,
        parentLayoutNodeId: PHI_BASE_PAGE_LAYOUT_NODE_ID,
        typeKey: "thread-conversation",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 1,
        label: labels.title,
        config: {
          signalRoutes: {
            listens: [{
              routeKey: "app-threads-conversation-select",
              capabilityId: "select",
              scope: "page",
              channel: "thread",
              action: "change",
              valueType: "json",
              valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.threadSelection,
              receiver: conversationAddress,
            }, {
              routeKey: "app-threads-conversation-reload",
              capabilityId: "reload",
              scope: "page",
              channel: "thread",
              action: "reload",
              valueType: "json",
              valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.threadSelection,
              receiver: conversationAddress,
            }],
          },
        },
      }),
      nodes.widget({
        id: PHI_APP_THREADS_PAGE_WIDGET_IDS.widgetComposer,
        parentLayoutNodeId: PHI_BASE_PAGE_LAYOUT_NODE_ID,
        typeKey: "thread-composer",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 2,
        label: labels.composerLabel,
        config: {
          signalRoutes: {
            listens: [{
              routeKey: "app-threads-composer-select",
              capabilityId: "select",
              scope: "page",
              channel: "thread",
              action: "change",
              valueType: "json",
              valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.threadSelection,
              receiver: composerAddress,
            }],
            /*
             * A message was written, so what is on screen is out of date -- and the composer is the only
             * one who knows. It asks rather than tells: the conversation compares the id to the one it
             * is showing and ignores a request about any other.
             */
            emits: [{
              routeKey: "app-threads-written",
              capabilityId: "written",
              scope: "page",
              channel: "thread",
              action: "reload",
              valueType: "json",
              valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.threadSelection,
              receiver: conversationAddress,
            }],
          },
        },
      }),
    ],
  };
}
