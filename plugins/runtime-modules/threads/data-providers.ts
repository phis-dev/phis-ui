import type { PhiRuntimeModuleDataProviderDescriptor } from "../contracts";
import { PHI_SIGNAL_VALUE_SCHEMAS } from "../../../types/signals";
import {
  PHI_THREADS_RUNTIME_DATA_PROVIDER_KEYS,
  PHI_THREADS_RUNTIME_ITEM_RENDERER_KEY,
  PHI_THREADS_RUNTIME_MODULE_ID,
} from "./ids";

/**
 * The listing, as a Collection rather than as a Widget of its own.
 *
 * A listing that had been its own Widget would have reimplemented paging, filters, a toolbar, an empty
 * state and a skeleton, and would still have been the one surface nobody else could replace. As a
 * Provider it is three separable things: the rows (here), the card that draws one
 * (`itemRendererKey`), and what a click means (`selectionValueSchema`). A package from another
 * repository may replace any of the three and keep the other two.
 *
 * `search` is false because the Core route has no text parameter, not because a listing would not want
 * one. Saying so here is what keeps a search box from appearing over a query that cannot answer it.
 */
export const PHI_THREADS_RUNTIME_DATA_PROVIDER_DESCRIPTORS = [
  {
    key: PHI_THREADS_RUNTIME_DATA_PROVIDER_KEYS.inbox,
    ownerModuleId: PHI_THREADS_RUNTIME_MODULE_ID,
    kind: "collection",
    executionMode: "live",
    authoringMode: "none",
    title: "Conversations",
    description: "The conversations a viewer may see, newest activity first.",
    resources: [
      {
        resourceKey: "inbox",
        title: "Inbox",
        description: "Every conversation this viewer is in, whichever kind it is.",
        itemIdentityPath: "id",
        itemRendererKey: PHI_THREADS_RUNTIME_ITEM_RENDERER_KEY,
        // What a click on a row means, declared by the rows rather than by the Widget showing them.
        selectionValueSchema: PHI_SIGNAL_VALUE_SCHEMAS.threadSelection,
        defaultForWidget: true,
        query: {
          search: false,
          pagination: true,
          /*
           * The three the Core route takes, and no fourth.
           *
           * `kind` is what a Site pins to make one listing: a Support page filters to Support
           * conversations without Support having to bring a listing of its own. `unreadOnly` reads as a
           * list because the filter types have no switch; it carries two values and means one.
           */
          filterFields: [
            { key: "kind", title: "Kind", type: "enum" },
            { key: "status", title: "Status", type: "enum" },
            { key: "unreadOnly", title: "Unread only", type: "enum" },
          ],
        },
      },
    ],
  },
] satisfies readonly PhiRuntimeModuleDataProviderDescriptor[];
