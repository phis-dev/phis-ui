import type { PhiRuntimeModuleDataProviderDescriptor } from "../contracts";
import {
  PHI_CDN_RUNTIME_DATA_PROVIDER_KEYS,
  PHI_CDN_RUNTIME_MODULE_ID,
  PHI_CDN_TABLE_RESOURCE_KEYS,
} from "./ids";

/**
 * The Site's CDN catalogue and the check of its bucket, over Core's Admin routes
 * (`/api/site/admin/cdn`, phis-server; Admins and Maintainers). Every write is Core's to allow: the
 * Page only offers it.
 *
 * `files` is the catalogue: every file offered under the Site's name, copied into the bucket (`cdn`) or
 * linked where its source keeps it (`link`), with what became of it. A key is the file's whole identity
 * and is never written twice, so withdrawing and deleting keep the row: the key stays taken.
 *
 * `check` is one run of the bucket against the catalogue, read when its dialog opens. Its rows are what
 * it found -- an object the catalogue does not hold, a file the bucket does not hold, a size that differs
 * -- and an unrecorded object Core can take into the catalogue offers `adopt`.
 */
export const PHI_CDN_RUNTIME_DATA_PROVIDER_DESCRIPTORS = [
  {
    key: PHI_CDN_RUNTIME_DATA_PROVIDER_KEYS.table,
    ownerModuleId: PHI_CDN_RUNTIME_MODULE_ID,
    kind: "table",
    executionMode: "live",
    authoringMode: "none",
    title: "CDN",
    description: "The Site's CDN catalogue and the check of its bucket.",
    resources: [
      {
        resourceKey: PHI_CDN_TABLE_RESOURCE_KEYS.files,
        title: "CDN files",
        rowIdentityPath: "key",
        recordRead: true,
        fields: [
          { key: "key", title: "Key", type: "string", required: true },
          { key: "name", title: "Name", type: "string", required: true },
          { key: "version", title: "Version", type: "string", required: true },
          { key: "fileName", title: "File", type: "string", required: true },
          { key: "sizeBytes", title: "Size in bytes", type: "number" },
          { key: "sizeLabel", title: "Size", type: "string" },
          { key: "storage", title: "Storage", type: "string" },
          // `PhisCdnFileOs` and `PhisCdnFileArch` bits as one tag each: `macos`, `arm64`.
          { key: "platform", title: "Platform", type: "json" },
          { key: "sha256", title: "SHA-256", type: "string" },
          { key: "contentType", title: "Content type", type: "string" },
          { key: "publishedAt", title: "Published", type: "datetime" },
          { key: "url", title: "Address", type: "string" },
          { key: "state", title: "State", type: "string" },
          // The kind (`cli`, `upload`) or, for an Add-on's file, the Add-on's id.
          { key: "origin", title: "Origin", type: "string" },
          { key: "addonId", title: "Add-on", type: "string" },
          { key: "actorUserId", title: "Uploaded by", type: "number" },
          { key: "sourceUrl", title: "Source address", type: "string" },
          { key: "withdrawDisabled", title: "Withdrawn already", type: "boolean" },
          { key: "deleteDisabled", title: "Deleted already", type: "boolean" },
        ],
        query: {
          search: true,
          filterFields: ["state", "name"],
          sorting: "single",
          pagination: "offset",
          total: true,
        },
        actions: [
          { key: "copy-url", title: "Copy address", scope: "row", intent: "read" },
          {
            key: "withdraw",
            title: "Withdraw",
            scope: "row",
            intent: "destructive",
            confirmation: "required",
            disabledWhen: { source: "row", valuePath: "withdrawDisabled", operator: "truthy" },
          },
          {
            key: "delete",
            title: "Delete",
            scope: "row",
            intent: "destructive",
            confirmation: "required",
            disabledWhen: { source: "row", valuePath: "deleteDisabled", operator: "truthy" },
          },
        ],
      },
      {
        resourceKey: PHI_CDN_TABLE_RESOURCE_KEYS.check,
        title: "CDN check",
        rowIdentityPath: "id",
        fields: [
          { key: "id", title: "Finding", type: "string", required: true },
          { key: "key", title: "Key", type: "string", required: true },
          // `unrecorded`, `missing` or `size-mismatch`.
          { key: "finding", title: "Finding", type: "string", required: true },
          { key: "sizeLabel", title: "Size", type: "string" },
          { key: "recordedLabel", title: "Recorded size", type: "string" },
          { key: "reason", title: "Reason", type: "string" },
          { key: "adoptable", title: "Can be adopted", type: "boolean" },
        ],
        summaryFields: [
          { key: "objects", title: "Objects in the bucket", type: "number" },
          { key: "recorded", title: "Copied files in the catalogue", type: "number" },
          { key: "consistent", title: "Bucket and catalogue agree", type: "boolean" },
        ],
        query: {
          search: false,
          filterFields: [],
          sorting: "none",
          pagination: "none",
        },
        actions: [
          {
            key: "adopt",
            title: "Adopt",
            scope: "row",
            intent: "write",
            visibleWhen: { source: "row", valuePath: "adoptable", operator: "truthy" },
          },
        ],
      },
    ],
  },
] satisfies readonly PhiRuntimeModuleDataProviderDescriptor[];
