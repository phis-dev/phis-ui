import type { PhiRuntimeModuleDataProviderDescriptor } from "../contracts";
import {
  PHI_NEWS_RUNTIME_DATA_PROVIDER_KEYS,
  PHI_NEWS_RUNTIME_MODULE_ID,
  PHI_NEWS_TABLE_RESOURCE_KEY,
} from "./ids";

/**
 * The Site's News entries, and the tags it already uses.
 *
 * Both are `live`: they are the Site's own records, read at runtime, not constants this package ships.
 * Both are `authoringMode: "none"`, because the Builder has no business pulling editorial data while
 * somebody is composing a Page -- what a Table looks like there is a question for the preview.
 *
 * The rows come from `GET /api/site/editor/news`, which is behind the content-editing guard. That is the
 * whole access story: a Table bound to this resource on a Page nobody may edit answers nothing, because
 * Core refuses the read rather than because the Widget was kept out.
 */
export const PHI_NEWS_RUNTIME_DATA_PROVIDER_DESCRIPTORS = [
  {
    key: PHI_NEWS_RUNTIME_DATA_PROVIDER_KEYS.table,
    ownerModuleId: PHI_NEWS_RUNTIME_MODULE_ID,
    kind: "table",
    executionMode: "live",
    authoringMode: "none",
    title: "News entries",
    description: "The Site's news entries, as the editor sees them.",
    resources: [
      {
        resourceKey: PHI_NEWS_TABLE_RESOURCE_KEY,
        title: "News entries",
        rowIdentityPath: "contentId",
        fields: [
          { key: "contentId", title: "ID", type: "number", required: true },
          { key: "slug", title: "Address", type: "string", required: true },
          { key: "title", title: "Title", type: "string" },
          { key: "subtitle", title: "Subtitle", type: "string" },
          { key: "content", title: "Body", type: "string" },
          { key: "status", title: "Status", type: "number" },
          { key: "sourceLocale", title: "Written in", type: "string" },
          { key: "translate", title: "May be translated", type: "boolean" },
          /*
           * `enum[]` with the offer beside it: a tag is picked, not typed. What the options provider
           * answers is the set the Site already uses, so the field's choices are the Site's own history.
           */
          {
            key: "tags",
            title: "Tags",
            type: "enum[]",
            mutable: true,
            optionsProvider: { providerKey: PHI_NEWS_RUNTIME_DATA_PROVIDER_KEYS.tags },
          },
          { key: "link", title: "Link", type: "string" },
          { key: "publishedAt", title: "Published", type: "datetime" },
          { key: "expiresAt", title: "Expires", type: "datetime" },
          { key: "updatedAt", title: "Changed", type: "datetime" },
          { key: "hasUnpublishedChanges", title: "Unpublished changes", type: "boolean" },
        ],
        query: {
          search: true,
          filterFields: ["status"],
          sorting: "none",
          pagination: "offset",
          facets: ["tags"],
        },
        recordRead: true,
        /*
         * What an entry can have done to it without opening a form. Saving and publishing both state
         * values -- words, dates -- so they are Forms; these three state nothing.
         *
         * `delete` is refused by Core while an entry is published, and that refusal arrives here as a
         * rejected mutation with its reason. Disabling it in the row as well would be a second answer to
         * the same question, and the one drawn from a stale row.
         */
        actions: [
          {
            key: "withdraw",
            title: "Withdraw",
            scope: "row",
            disabledWhen: { match: "any", conditions: [
              { source: "row", valuePath: "publishedAt", operator: "falsy" },
            ] },
            confirmation: "required",
          },
          { key: "delete", title: "Delete", scope: "row", intent: "destructive", confirmation: "required" },
          { key: "refresh", title: "Refresh", scope: "resource" },
        ],
      },
    ],
  },
  {
    key: PHI_NEWS_RUNTIME_DATA_PROVIDER_KEYS.tags,
    ownerModuleId: PHI_NEWS_RUNTIME_MODULE_ID,
    kind: "options",
    executionMode: "live",
    authoringMode: "none",
    title: "News tags",
    description: "The tags this Site's news entries already carry.",
  },
] satisfies readonly PhiRuntimeModuleDataProviderDescriptor[];
