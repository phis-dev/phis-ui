import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS } from "../plugins/runtime-modules/core/ids";
import {
  createPhiStaticTableProviderRegistration,
  createPhiVersionedStaticTableProviderRegistration,
  type PhiVersionedStaticTableResourceStore,
} from "../components/widgets/client/shared/phi-static-table-provider";
import {
  movePhiTableBindingRows,
  patchPhiTableBindingRows,
  restorePhiTableBindingRowOrder,
} from "../helpers/table-binding";
import { parsePhiTableWidgetConfig } from "../plugins/runtime-modules/core/widgets/table/config";
import {
  readPhiTableColumnOrderSignalValue,
  readPhiTableBindingParamsSignalValue,
  readPhiTableProviderMutationResult,
  readPhiTableProviderQueryResult,
  readPhiTableQuery,
  validatePhiTableProviderFieldValue,
  validatePhiTableWidgetBinding,
  type PhiTableProviderResourceDescriptor,
  type PhiTableWidgetConfig,
} from "../types/table-widget";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const sourceRoots = ["components", "plugins"];
const sourceFiles = sourceRoots.flatMap((root) => {
  const files: string[] = [];
  const visit = (directory: string) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (/\.[cm]?[jt]sx?$/.test(entry.name)) files.push(absolute);
    }
  };
  visit(path.join(repositoryRoot, root));
  return files;
});
const directTableControlAllowlist = new Set([
  "components/controls/phi-table-control.tsx",
  "components/forms/compound-form-controls.tsx",
  "components/tables/client/phi-table-binding-control.tsx",
  "components/widgets/builder/phi-static-options-picker.tsx",
  "plugins/runtime-modules/theme/widgets/brand-controls/client.tsx",
  "plugins/runtime-modules/core/widgets/markdown/client.tsx",
  "plugins/runtime-modules/core/widgets/table/client.tsx",
  "components/widgets/signals/signal-endpoint-list.tsx",
]);
for (const absolute of sourceFiles) {
  const relative = path.relative(repositoryRoot, absolute).replaceAll(path.sep, "/");
  const sourceText = fs.readFileSync(absolute, "utf8");
  if (relative !== "components/controls/phi-table-control.tsx" &&
    /import(?:[\s\S]*?)\bTable\b(?:[\s\S]*?)from\s+["']antd["']/.test(sourceText)) {
    throw new Error(`${relative}: direct Ant Design Table imports are reserved for PhiTableControl.`);
  }
  if (!directTableControlAllowlist.has(relative) &&
    /import\s*\{[^}]*\bPhiTableControl\b[^}]*\}\s*from\s*["'][^"']*phi-table-control["']/.test(sourceText)) {
    throw new Error(`${relative}: mutable Tables must use PhiTableBinding and a declared Provider.`);
  }
  const tableTypeAliases = [...sourceText.matchAll(/typeKey:\s*["']([^"']*table[^"']*)["']/g)]
    .map((match) => match[1])
    .filter((typeKey) => typeKey !== "table");
  if (tableTypeAliases.length > 0) {
    throw new Error(`${relative}: domain Table Widget aliases are forbidden; use typeKey "table" in presets.`);
  }
}
for (const relative of [
  "components/controls/phi-table-control.tsx",
  "components/tables/client/phi-table-binding.ts",
  "components/tables/client/phi-table-binding-control.tsx",
  "plugins/runtime-modules/core/widgets/table/client.tsx",
]) {
  const sourceText = fs.readFileSync(path.join(repositoryRoot, relative), "utf8");
  if (/RUNTIME_DATA_PROVIDER_KEYS|providerKey\s*===|switch\s*\(\s*(?:source\.)?providerKey/.test(sourceText)) {
    throw new Error(`${relative}: generic Table hosts must not branch on Provider identity.`);
  }
}
const tableWidgetSource = fs.readFileSync(
  path.join(repositoryRoot, "plugins/runtime-modules/core/widgets/table/client.tsx"),
  "utf8",
);
if (/\bfilterState\b/.test(tableWidgetSource)) {
  throw new Error("PhiTableWidget query Controls must use Binding query state, not a parallel filterState.");
}

const resource: PhiTableProviderResourceDescriptor = {
  resourceKey: "tree",
  title: "Tree",
  rowIdentityPath: "id",
  fields: [
    { key: "id", title: "ID", type: "string", required: true },
    { key: "parentId", title: "Parent", type: "string" },
    { key: "name", title: "Name", type: "string", mutable: true },
    { key: "rank", title: "Rank", type: "number" },
    { key: "acceptsChildren", title: "Accepts children", type: "boolean", required: true },
  ],
  summaryFields: [
    { key: "entries", title: "Entries", type: "number" },
  ],
  query: { search: true, sorting: "multiple", pagination: "offset", filterFields: ["name"] },
  hierarchy: { parentRowIdentityPath: "parentId", canAcceptChildrenField: "acceptsChildren" },
  rowOrdering: "tree",
};

const config: PhiTableWidgetConfig = {
  presentation: {
    layout: { mode: "auto", overflowX: "auto" },
    footer: {
      template: "%1 entries",
      values: [{
        key: "entries",
        value: { source: "provider", fieldKey: "entries" },
      }],
    },
    summary: {
      placement: "body-end",
      rows: [{
        key: "total",
        cells: [{
          key: "total",
          columnKey: "name",
          throughColumnKey: "rank",
          item: { key: "total", value: { source: "core", fieldKey: "totalRows" } },
        }],
      }],
    },
    columns: [
      { key: "name", fieldKey: "name", title: "Name", sortable: true },
      { key: "rank", fieldKey: "rank", title: "Rank", sortable: true },
    ],
  },
  features: {
    search: { enabled: true },
    filters: [{ key: "name", type: "text", label: "Name" }],
    pagination: { enabled: true },
    sorting: { mode: "multiple" },
    structure: { mode: "tree", parentRowIdentityPath: "parentId", expandColumnKey: "name" },
  },
  source: { providerKey: PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.contentTable, resourceKey: "tree" },
};

assert.deepEqual(validatePhiTableWidgetBinding(config, resource), []);
const invalidFixedConfig: PhiTableWidgetConfig = {
  ...config,
  presentation: {
    ...config.presentation,
    layout: { mode: "fixed", overflowX: "auto" },
    columns: config.presentation.columns.map((column) => ({
      ...column,
      sizing: { mode: "fixed" as const, width: 120 },
    })),
  },
};
assert.match(validatePhiTableWidgetBinding(invalidFixedConfig, resource)[0] ?? "", /fill column/);
assert.match(validatePhiTableWidgetBinding({
  ...invalidFixedConfig,
  presentation: {
    ...invalidFixedConfig.presentation,
    columns: [
      { ...invalidFixedConfig.presentation.columns[0], sizing: { mode: "content" } },
      { ...invalidFixedConfig.presentation.columns[1], sizing: { mode: "fill", minWidth: 160 } },
    ],
  },
}, resource)[0] ?? "", /content sizing/);
assert.match(validatePhiTableWidgetBinding({
  ...config,
  presentation: {
    ...config.presentation,
    columns: config.presentation.columns.map((column, index) =>
      index === 0 ? { ...column, ellipsis: true } : column),
  },
}, resource)[0] ?? "", /Ellipsis/);
assert.equal(readPhiTableQuery({ sorts: [{ key: "name", direction: "ascending" }] })?.sorts?.[0]?.direction, "ascending");
assert.equal(readPhiTableQuery({ sorts: [{ key: "name", direction: "ascend" }] }), null);
assert.equal(readPhiTableQuery({ sorts: [{ key: "name", direction: "ascending", order: 1 }] }), null);
assert.deepEqual(readPhiTableColumnOrderSignalValue({ columnOrder: ["name", "rank"] }), {
  columnOrder: ["name", "rank"],
});
assert.equal(readPhiTableColumnOrderSignalValue({ columnOrder: ["name", "name"] }), null);
assert.deepEqual(readPhiTableBindingParamsSignalValue({ params: { navKey: "admin:sidebar" } }), {
  params: { navKey: "admin:sidebar" },
});
assert.equal(readPhiTableBindingParamsSignalValue({ params: { invalid: { nested: true } } }), null);
assert.equal(readPhiTableProviderQueryResult({ rows: [], total: 0, loading: false }), null);
assert.deepEqual(readPhiTableProviderQueryResult({
  rows: [],
  total: 0,
  summary: { entries: 0, active: true, note: null },
})?.summary, { entries: 0, active: true, note: null });
assert.equal(readPhiTableProviderQueryResult({ rows: [], summary: { entries: Number.NaN } }), null);
assert.deepEqual(
  readPhiTableProviderQueryResult({
    rows: [],
    total: 0,
    resolvedQuery: { filters: { locale: "de" } },
  })?.resolvedQuery?.filters,
  { locale: "de" },
);
assert.equal(readPhiTableProviderQueryResult({
  rows: [],
  resolvedQuery: { filters: { locale: { invalid: true } } },
}), null);
assert.match(validatePhiTableWidgetBinding({
  ...config,
  presentation: {
    ...config.presentation,
    footer: {
      template: "%1 missing",
      values: [{ key: "missing", value: { source: "provider", fieldKey: "missing" } }],
    },
  },
}, resource).join("\n"), /undeclared Provider summary field/);
assert.match(validatePhiTableWidgetBinding({
  ...config,
  presentation: {
    ...config.presentation,
    footer: {
      template: "%2 entries",
      values: [{ key: "entries", value: { source: "provider", fieldKey: "entries" } }],
    },
  },
}, resource).join("\n"), /placeholders must match/);
assert.equal(readPhiTableProviderMutationResult({ invalidation: "view", rows: [] }), null);
assert.deepEqual(readPhiTableProviderMutationResult({ status: "accepted", invalidation: "none", canonicalValue: "Name" }), {
  status: "accepted",
  invalidation: "none",
  canonicalValue: "Name",
  rowPatch: undefined,
  summaryPatch: undefined,
  value: undefined,
  errorCode: undefined,
  message: undefined,
});
assert.deepEqual(readPhiTableProviderMutationResult({
  status: "accepted",
  invalidation: "none",
  summaryPatch: { entries: 2 },
})?.summaryPatch, { entries: 2 });
assert.equal(readPhiTableProviderMutationResult({
  status: "rejected",
  invalidation: "none",
  errorCode: "rejected",
  summaryPatch: { entries: 2 },
}), null);
assert.equal(readPhiTableProviderMutationResult({ status: "rejected", invalidation: "none" }), null);
assert.equal(readPhiTableProviderMutationResult({
  status: "rejected", invalidation: "none", errorCode: "name-invalid",
})?.errorCode, "name-invalid");
assert.equal(validatePhiTableProviderFieldValue({
  key: "count", title: "Count", type: "number", constraints: { min: 1, max: 5, precision: 0 },
}, 3), null);
assert.match(validatePhiTableProviderFieldValue({
  key: "count", title: "Count", type: "number", constraints: { min: 1 },
}, 0) ?? "", /minimum/);
assert.equal(validatePhiTableProviderFieldValue({
  key: "choice", title: "Choice", type: "enum", options: [{ value: 1, label: "One" }],
}, "1"), 'Table field "choice" contains an undeclared option value.');
assert.match(validatePhiTableWidgetBinding({
  ...config,
  presentation: {
    ...config.presentation,
    columns: config.presentation.columns.map((column, index) =>
      index === 0 ? { ...column, renderer: "switch" as const } : column),
  },
}, resource)[0] ?? "", /renderer is incompatible/);
assert.deepEqual(validatePhiTableWidgetBinding({
  ...config,
  presentation: {
    ...config.presentation,
    columns: config.presentation.columns.map((column, index) =>
      index === 0 ? { ...column, editor: {} } : column),
  },
  features: { ...config.features, editing: { mode: "cell" } },
}, resource), []);
assert.match(validatePhiTableWidgetBinding({
  ...config,
  presentation: {
    ...config.presentation,
    columns: config.presentation.columns.map((column, index) =>
      index === 0 ? { ...column, editor: { control: "switch" as const } } : column),
  },
  features: { ...config.features, editing: { mode: "cell" } },
}, resource)[0] ?? "", /editor is incompatible/);
const bindingResource: PhiTableProviderResourceDescriptor = {
  ...resource,
  bindingFields: [{
    key: "navKey",
    title: "Navigation",
    type: "enum",
    options: [{ value: "main", label: "Main" }],
    create: { actionKey: "create-navigation" },
  }],
  actions: [{ key: "create-navigation", title: "Create navigation", scope: "resource", valueType: "string" }],
};
assert.deepEqual(validatePhiTableWidgetBinding({
  ...config,
  features: {
    ...config.features,
    tools: {
      mode: "self-contained",
      bindingFields: [{
        key: "navKey",
        label: "Navigation",
        create: { label: "Add", icon: "antd:plus", display: "icon" },
      }],
    },
  },
}, bindingResource), []);
assert.match(validatePhiTableWidgetBinding({
  ...config,
  features: { ...config.features, tools: { mode: "self-contained", bindingFields: [{ key: "missing", label: "Missing" }] } },
}, bindingResource)[0] ?? "", /binding field/);
assert.match(validatePhiTableWidgetBinding({
  ...config,
  features: {
    ...config.features,
    actions: { toolbar: [{ key: "signal", label: "Signal", execution: "signal" }] },
  },
}, resource)[0] ?? "", /explicit display/);

const legacy = parsePhiTableWidgetConfig({
  rowKey: "id",
  dataSource: { kind: "provider", providerKey: PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.contentTable, tableKey: "content" },
  contentRows: [{ key: "legacy", cells: [] }],
});
assert.equal(legacy.source, null);
assert.deepEqual(legacy.presentation.columns, []);
const parsedSizing = parsePhiTableWidgetConfig({
  presentation: {
    bordered: true,
    row: { striped: true },
    layout: { mode: "fixed", overflowX: "visible" },
    columns: [
      { key: "legacy", fieldKey: "legacy", title: "Legacy", width: 120 },
      { key: "fixed", fieldKey: "fixed", title: "Fixed", sizing: { mode: "fixed", width: "12rem" } },
      { key: "fill", fieldKey: "fill", title: "Fill", sizing: { mode: "fill", minWidth: 180, maxWidth: "40vw" } },
    ],
  },
  features: {
    tools: { mode: "self-contained", reload: true },
    filters: [{
      key: "name",
      type: "select",
      label: "Name",
      optionsProvider: { providerKey: PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.spacingScale },
    }],
  },
});
assert.deepEqual(parsedSizing.presentation.layout, { mode: "fixed", overflowX: "visible" });
assert.equal(parsedSizing.presentation.bordered, true);
assert.equal(parsedSizing.presentation.row?.striped, true);
assert.deepEqual(parsedSizing.presentation.columns.map((column) => column.sizing), [
  { mode: "content", minWidth: undefined, maxWidth: undefined },
  { mode: "fixed", width: "12rem" },
  { mode: "fill", minWidth: 180, maxWidth: "40vw" },
]);
const parsedSticky = parsePhiTableWidgetConfig({
  presentation: {
    layout: { mode: "auto", overflowX: "auto" },
    columns: [
      { key: "name", fieldKey: "name", title: "Name", sticky: "left", sizing: { mode: "content", maxWidth: "30%" } },
      { key: "rank", fieldKey: "rank", title: "Rank", sizing: { mode: "fill" } },
    ],
  },
  features: { rowSelection: { mode: "multiple" } },
});
const parsedFooter = parsePhiTableWidgetConfig({
  presentation: {
    footer: {
      align: "end",
      template: "%1 entries, %2 selected",
      values: [{
        key: "entries",
        value: { source: "provider", fieldKey: "entries" },
      }, { key: "selected", value: { source: "core", fieldKey: "selectedRows" } }],
    },
    summary: {
      placement: "sticky-bottom",
      rows: [{
        key: "totals",
        cells: [{
          key: "total",
          columnKey: "name",
          throughColumnKey: "rank",
          item: { key: "total", value: { source: "core", fieldKey: "totalRows" } },
        }],
      }],
    },
  },
});
assert.equal(parsedFooter.presentation.footer?.values[0]?.value.source, "provider");
assert.equal(parsedFooter.presentation.footer?.template, "%1 entries, %2 selected");
assert.equal(parsedFooter.presentation.summary?.placement, "sticky-bottom");
assert.equal(parsedSticky.presentation.columns[0]?.sticky, "left");
assert.deepEqual(validatePhiTableWidgetBinding(parsedSticky, resource), []);
assert.match(validatePhiTableWidgetBinding({
  ...parsedSticky,
  presentation: {
    ...parsedSticky.presentation,
    layout: { ...parsedSticky.presentation.layout, overflowX: "visible" },
  },
}, resource).join("\n"), /Sticky Table column.*requires automatic horizontal overflow/);
assert.deepEqual(parsePhiTableWidgetConfig({
  presentation: {
    columns: [
      { key: "legacy", fieldKey: "name", title: "Legacy", editable: true },
      { key: "boolean", fieldKey: "enabled", title: "Enabled", editor: { enabled: true, control: "checkbox" } },
    ],
  },
}).presentation.columns.map((column) => column.editor), [undefined, { control: "checkbox", disabledWhen: undefined }]);
const parsedProviderAction = parsePhiTableWidgetConfig({
  features: {
    actions: {
      toolbar: [{ key: "reload", execution: "provider", label: "Reload", icon: "antd:reload", display: "icon" }],
    },
    tools: { bindingFields: [{ key: "navKey", label: "Navigation" }] },
  },
});
assert.equal(parsedProviderAction.features.actions?.rowLayout, "compact");
assert.deepEqual(parsedProviderAction.features.actions?.toolbar, [{
  key: "reload",
  label: "Reload",
  execution: "provider",
  icon: "antd:reload",
  display: "icon",
  mode: "normal",
  href: undefined,
  hrefPath: undefined,
  newTab: undefined,
  visibleWhen: undefined,
  disabledWhen: undefined,
  confirm: undefined,
}]);
assert.deepEqual(parsedProviderAction.features.tools?.bindingFields, [{
  key: "navKey",
  label: "Navigation",
  placeholder: undefined,
  control: "select",
  create: undefined,
}]);
const parsedConfirmAlert = parsePhiTableWidgetConfig({
  features: {
    actions: {
      row: [{
        key: "delete",
        execution: "provider",
        label: "Delete",
        display: "icon",
        icon: "antd:delete",
        confirm: {
          title: "Delete?",
          alert: { level: "warning", title: "This cannot be undone." },
        },
      }],
    },
  },
});
assert.deepEqual(parsedConfirmAlert.features.actions?.row?.[0]?.confirm?.alert, {
  level: "warning",
  title: "This cannot be undone.",
  description: undefined,
});
assert.deepEqual(parsedSizing.features.tools, { mode: "self-contained", bindingFields: undefined, reload: true });
assert.equal(
  parsedSizing.features.filters?.[0]?.type === "select"
    ? parsedSizing.features.filters[0].optionsProvider?.providerKey
    : null,
  PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.spacingScale,
);

const provider = createPhiStaticTableProviderRegistration({
  key: PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.contentTable,
  resources: [{
    descriptor: resource,
    rows: [
      { id: "root", parentId: null, name: "Root", rank: 1 },
      { id: "child-b", parentId: "root", name: "Needle", rank: 2 },
      { id: "child-a", parentId: "root", name: "Needle", rank: 1 },
    ],
  }],
});
const result = await provider.query({
  resourceKey: "tree",
  query: {
    search: "needle",
    sorts: [
      { key: "name", direction: "ascending" },
      { key: "rank", direction: "descending" },
    ],
    page: 1,
    pageSize: 10,
  },
  signal: new AbortController().signal,
});
assert.deepEqual(result.rows.map((row) => row.id), ["root", "child-b", "child-a"]);
assert.deepEqual(patchPhiTableBindingRows(result.rows, "id", "child-b", { name: "Changed" })
  .map((row) => row.name), ["Root", "Changed", "Needle"]);
assert.deepEqual(movePhiTableBindingRows(result.rows, "id", {
  movedRowIdentity: "child-a",
  beforeRowIdentity: "child-b",
  afterRowIdentity: null,
}).map((row) => row.id), ["root", "child-a", "child-b"]);
assert.deepEqual(restorePhiTableBindingRowOrder([
  { ...result.rows[2], name: "Live edit" },
  result.rows[0],
  result.rows[1],
], result.rows, "id").map((row) => [row.id, row.name]), [
  ["root", "Root"],
  ["child-b", "Needle"],
  ["child-a", "Live edit"],
]);

const versionedSnapshots = {
  draft: { revisionId: 2, version: 3, status: "draft" as const, rows: [{ id: "draft", name: "Draft", rank: 1 }] },
  published: { revisionId: 1, version: 1, status: "published" as const, rows: [{ id: "published", name: "Published", rank: 1 }] },
};
let mutatedDraftRevisionId: string | number | null = null;
const versionedStore: PhiVersionedStaticTableResourceStore = {
  read: async ({ status }) => versionedSnapshots[status],
  mutateDraft: async ({ snapshot }) => {
    mutatedDraftRevisionId = snapshot.revisionId;
    return { status: "accepted", invalidation: "view" };
  },
};
const liveVersionedProvider = createPhiVersionedStaticTableProviderRegistration({
  key: "@test/pkg/modules/static-live",
  resources: [resource],
  mode: "live",
  store: versionedStore,
});
const authoringVersionedProvider = createPhiVersionedStaticTableProviderRegistration({
  key: "@test/pkg/modules/static-authoring",
  resources: [resource],
  mode: "authoring",
  store: versionedStore,
});
assert.equal((await liveVersionedProvider.query({
  resourceKey: "tree", query: {}, signal: new AbortController().signal,
})).rows[0]?.id, "published");
assert.equal((await authoringVersionedProvider.query({
  resourceKey: "tree", query: {}, signal: new AbortController().signal,
})).rows[0]?.id, "draft");
assert.equal(liveVersionedProvider.mutate, undefined);
await authoringVersionedProvider.mutate?.({
  kind: "field", resourceKey: "tree", rowIdentity: "draft", fieldKey: "name",
  originalValue: "Draft", proposedValue: "Changed", signal: new AbortController().signal,
});
assert.equal(mutatedDraftRevisionId, 2);

console.log("Table contracts validated.");
