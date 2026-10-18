import type { PhiRuntimeModuleDataProviderDescriptor } from "../contracts";
import { PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS } from "../../../constants/core-data-provider-keys";
import { PHI_CORE_RUNTIME_MODULE_ID } from "./ids";
import { PHI_CORE_MESSAGING_DATA_PROVIDER_DESCRIPTORS } from "./messaging/data-providers";
import { PHI_CONTENT_ENTRY_KINDS } from "../../../constants/content-entry-kinds";

export const PHI_CORE_RUNTIME_DATA_PROVIDER_DESCRIPTORS = [
  {
    key: PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.spacingScale,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    kind: "options",
    executionMode: "static",
    authoringMode: "read",
    title: "Spacing scale",
    description: "Shared padding and margin token options.",
  },
  {
    key: PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.siteLocales,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    kind: "options",
    executionMode: "static",
    authoringMode: "read",
    title: "Site locales",
    description: "The locales this site offers, as the placement handed them to the field.",
  },
  {
    key: PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.contentTable,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    kind: "table",
    executionMode: "static",
    authoringMode: "read",
    title: "Content table",
    description: "Package-owned static table resources.",
    resources: [{
      resourceKey: "empty",
      title: "Empty table",
      description: "Neutral package-owned baseline for a provider-bound table.",
      rowIdentityPath: "id",
      fields: [{ key: "id", title: "ID", type: "string", required: true }],
      query: { search: true, sorting: "multiple", pagination: "offset" },
    }],
  },
  ...PHI_CORE_MESSAGING_DATA_PROVIDER_DESCRIPTORS,
  /**
   * Every content kind's entries, one resource per kind, and the tags each already uses
   * (`CONTENT_ENTRIES.md`).
   *
   * Both are `live`: they are the Site's own records, read at runtime, not constants this package ships.
   * Both are `authoringMode: "none"`, because the Builder has no business pulling editorial data while
   * somebody is composing a Page -- what a Table looks like there is a question for the preview.
   *
   * The rows come from `GET /api/site/editor/entries/<kind>`, which is behind the content-editing guard. That is the
   * whole access story: a Table bound to this resource on a Page nobody may edit answers nothing, because
   * Core refuses the read rather than because the Widget was kept out.
   */
  {
    key: PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.contentEntries,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    kind: "table",
    executionMode: "live",
    authoringMode: "none",
    title: "Content entries",
    description: "The Site's entries of each content kind, as the editor sees them.",
    resources: PHI_CONTENT_ENTRY_KINDS.map((kind) => (
      {
        resourceKey: kind,
        title: `Entries: ${kind}`,
        rowIdentityPath: "contentId",
        fields: [
          { key: "contentId", title: "ID", type: "number", required: true },
          { key: "slug", title: "Address", type: "string", required: true },
          { key: "title", title: "Title", type: "string" },
          { key: "subtitle", title: "Subtitle", type: "string" },
          { key: "content", title: "Body", type: "string" },
          /*
           * A word, not the store's number. `badge` can only render a `string` or an `enum`, and a column
           * that draws a status is the reason the field exists -- so the service says `draft` where the
           * row says `0`, which is also what the status filter sends.
           */
          {
            key: "status",
            title: "Status",
            type: "enum",
            /*
             * The vocabulary, not the words a reader sees: those come from the column's `valueMap`, in the
             * page's language. Stated here because an `enum` field must name its option source, and because
             * a Site binding another Widget to this resource should be able to read what the values are.
             */
            options: [
              { value: "draft", label: "Draft" },
              { value: "published", label: "Published" },
            ],
          },
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
            optionsProvider: { providerKey: PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.contentEntryTags },
          },
          { key: "link", title: "Link", type: "json" },
          { key: "publishedAt", title: "Published", type: "datetime" },
          { key: "expiresAt", title: "Expires", type: "datetime" },
          { key: "updatedAt", title: "Changed", type: "datetime" },
          // Who wrote the entry: the writer of its first version, as Core names them.
          { key: "author", title: "Author", type: "string" },
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
      }
    )),
  },
  {
    key: PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.contentEntryTags,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    kind: "options",
    executionMode: "live",
    authoringMode: "none",
    title: "Content entry tags",
    description: "The tags one content kind's entries already carry; the field names the kind.",
  },
  /**
   * One published entry with its relatives, read on the server while the page is drawn
   * (`types/record-provider.ts`). The header, text and related list of a detail Page are bound to it; a
   * detail route's tree writes the route's slug into the binding, a Site's own Page names one entry.
   */
  {
    key: PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.contentEntry,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    kind: "record",
    executionMode: "live",
    // The Builder draws a placeholder for an entry Widget and reads nothing.
    authoringMode: "none",
    title: "Content entry",
    description: "One published entry of a content kind, with the entries related to it.",
    settingsFields: [
      {
        key: "kind",
        type: "choice",
        label: "Kind",
        options: PHI_CONTENT_ENTRY_KINDS.map((kind) => ({ value: kind, label: kind })),
      },
      { key: "slug", type: "string", label: "Address" },
    ],
  },
] satisfies readonly PhiRuntimeModuleDataProviderDescriptor[];
