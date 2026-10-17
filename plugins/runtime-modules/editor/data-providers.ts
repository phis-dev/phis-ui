import type { PhiRuntimeModuleDataProviderDescriptor } from "../contracts";
import {
  PHI_EDITOR_RELEASES_DATA_PROVIDER_KEY,
  PHI_EDITOR_RELEASES_RESOURCE_KEY,
  PHI_EDITOR_RUNTIME_MODULE_ID,
} from "./ids";

/**
 * The Publisher's queue: submitted Widget content, submitted entries, and the Working Drafts of Pages and
 * Areas (phis-server CONTENT.md, Submission).
 *
 * `live` and `authoringMode: "none"`, like every editorial record: the Builder has no business reading a
 * Site's queue while somebody composes a Page. The rows come from `GET /api/site/editor/releases`, behind
 * the guard of everybody who reads drafts; acting on them is the Publisher's, and Core refuses it to
 * anybody else whatever a Table offers.
 */
export const PHI_EDITOR_RUNTIME_DATA_PROVIDER_DESCRIPTORS = [
  {
    key: PHI_EDITOR_RELEASES_DATA_PROVIDER_KEY,
    ownerModuleId: PHI_EDITOR_RUNTIME_MODULE_ID,
    kind: "table",
    executionMode: "live",
    authoringMode: "none",
    title: "Releases",
    description: "What waits for a Publisher: submitted content and entries, and Page and Area drafts.",
    resources: [
      {
        resourceKey: PHI_EDITOR_RELEASES_RESOURCE_KEY,
        title: "Releases",
        rowIdentityPath: "id",
        fields: [
          { key: "id", title: "ID", type: "string", required: true },
          {
            key: "kind",
            title: "Kind",
            type: "enum",
            options: [
              { value: "content", label: "Content" },
              { value: "entry", label: "Entry" },
              { value: "page", label: "Page" },
              { value: "area", label: "Area" },
            ],
          },
          { key: "what", title: "What", type: "string" },
          { key: "where", title: "Where", type: "string" },
          { key: "by", title: "By", type: "string" },
          { key: "at", title: "When", type: "datetime" },
          { key: "publishable", title: "Can be published here", type: "boolean" },
          { key: "rejectable", title: "Can be sent back", type: "boolean" },
        ],
        query: {
          search: false,
          sorting: "none",
          pagination: "none",
        },
        recordRead: false,
        actions: [
          {
            key: "publish",
            title: "Publish",
            scope: "row",
            confirmation: "required",
            disabledWhen: { match: "any", conditions: [
              { source: "row", valuePath: "publishable", operator: "falsy" },
            ] },
          },
          {
            key: "reject",
            title: "Send back",
            scope: "row",
            confirmation: "required",
            disabledWhen: { match: "any", conditions: [
              { source: "row", valuePath: "rejectable", operator: "falsy" },
            ] },
          },
          { key: "refresh", title: "Refresh", scope: "resource" },
        ],
      },
    ],
  },
] satisfies readonly PhiRuntimeModuleDataProviderDescriptor[];
