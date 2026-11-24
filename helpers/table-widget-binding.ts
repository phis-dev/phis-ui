import type {
  PhiTableProviderResourceDescriptor,
  PhiTableSummaryItemDefinition,
  PhiTableWidgetConfig,
} from "../types/table-widget";

/**
 * A Table's config against the resource its Provider declares: columns, filters, sorting, the counted
 * footer, every Provider action in its scope with the confirmation and danger the resource asks for
 * (TABLES.md, "Checked where it is made").
 *
 * Checked where a config is made -- a package's preset tests (`checkPhiPresetTables`), `pnpm verify`, the
 * Builder's save (`gateway/site-cms-write-validation.ts`) -- and never in the browser or the render of a
 * request: a live Table trusts the config it is handed, and this file is kept out of every live Client
 * graph for that reason.
 */
export function validatePhiTableWidgetBinding(
  config: PhiTableWidgetConfig,
  resource: PhiTableProviderResourceDescriptor,
) {
  const errors: string[] = [];
  /*
   * A count shown needs a count given. The rows of one page are not the query's, so a Table that says
   * how many there are, or how many pages, is bound to a resource that counts -- or one that does not
   * page and so answers every row at once (`query.total`).
   */
  const resourceCounts = resource.query.total === true ||
    (resource.query.pagination !== "offset" && resource.query.pagination !== "cursor");
  if (!resourceCounts) {
    const footer = config.presentation.footer;
    const shownSources = [
      ...(footer?.values ?? []).map((item) => item.value),
      ...(footer?.variants ?? []).flatMap((variant) => [variant.when.value, ...(variant.values ?? []).map((item) => item.value)]),
      ...(config.presentation.summary?.rows ?? []).flatMap((row) => row.cells.map((cell) => cell.item.value)),
    ];
    const counted = shownSources.find((source) =>
      source.source === "core" && (source.fieldKey === "totalRows" || source.fieldKey === "pageCount"));
    if (counted) {
      errors.push(
        `Table shows "${counted.fieldKey}", but resource "${resource.resourceKey}" pages without a count ` +
        "(declare query.total on a resource that answers total).",
      );
    }
  }
  const fields = new Set(resource.fields.map((field) => field.key));
  const fieldsByKey = new Map(resource.fields.map((field) => [field.key, field]));
  const columns = config.presentation.columns;
  const columnKeys = new Set<string>();
  for (const column of columns) {
    if (!column.key.trim() || columnKeys.has(column.key)) {
      errors.push("Table columns require unique non-empty keys.");
      break;
    }
    columnKeys.add(column.key);
    if (!column.fieldKey.trim() || !fields.has(column.fieldKey)) {
      errors.push(`Table column "${column.key}" references undeclared field "${column.fieldKey}".`);
    }
    if (column.sortable && !fields.has(column.sortField ?? column.fieldKey)) {
      errors.push(`Table column "${column.key}" references an undeclared sort field.`);
    }
    const field = fieldsByKey.get(column.fieldKey);
    if (column.editor && !field?.mutable) {
      errors.push(`Table column "${column.key}" cannot edit read-only field "${column.fieldKey}".`);
    }
    if (column.titleDisplay === "icon" && !column.titleIcon) {
      errors.push(`Table column "${column.key}" hides its title without a title icon.`);
    }
    if (column.iconFieldKey !== undefined) {
      const iconField = fieldsByKey.get(column.iconFieldKey);
      if (!iconField) {
        errors.push(`Table column "${column.key}" references undeclared icon field "${column.iconFieldKey}".`);
      } else if (iconField.type !== "icon") {
        errors.push(`Table column "${column.key}" icon field "${column.iconFieldKey}" must be an icon field.`);
      }
    }
    if (column.imageFieldKey !== undefined) {
      const imageField = fieldsByKey.get(column.imageFieldKey);
      if (!imageField) {
        errors.push(`Table column "${column.key}" references undeclared image field "${column.imageFieldKey}".`);
      } else if (imageField.type !== "string") {
        errors.push(`Table column "${column.key}" image field "${column.imageFieldKey}" must be a string field.`);
      }
    }
    if (column.editor && field?.type === "json") {
      errors.push(`Table column "${column.key}" cannot use an implicit JSON editor.`);
    }
    const editorControlCompatible = !column.editor?.control ||
      (field?.type === "boolean" && (column.editor.control === "switch" || column.editor.control === "checkbox")) ||
      (field?.type === "icon" && column.editor.control === "icon-picker") ||
      (field?.type === "enum" && (column.editor.control === "select" || column.editor.control === "radio" ||
        column.editor.control === "segmented")) ||
      // A string chosen from a list: the row's options, or the placement's own (`editor.options`).
      (field?.type === "string" && (Boolean(field.rowOptionsPath) || column.editor.options !== undefined) &&
        column.editor.control === "select") ||
      (field?.type === "string" && column.editor.control === "textarea") ||
      (field?.type === "enum[]" && (column.editor.control === "multi-select" ||
        column.editor.control === "checkbox-group"));
    if (column.editor && !editorControlCompatible) {
      errors.push(`Table column "${column.key}" editor is incompatible with field "${column.fieldKey}".`);
    }
    const rendererCompatible = !column.renderer || column.renderer === "text" ||
      (column.renderer === "switch" && field?.type === "boolean") ||
      (column.renderer === "checkbox" && field?.type === "boolean") ||
      (column.renderer === "icon" && field?.type === "icon") ||
      (column.renderer === "image" && field?.type === "string") ||
      ((column.renderer === "date" || column.renderer === "datetime") && field?.type === column.renderer) ||
      (column.renderer === "json" && field?.type === "json") ||
      (column.renderer === "tags" && (field?.type === "json" || field?.type === "enum[]")) ||
      ((column.renderer === "money" || column.renderer === "interval") && field?.type === "json") ||
      ((column.renderer === "email" || column.renderer === "link" || column.renderer === "code" ||
        column.renderer === "badge") && (field?.type === "string" || field?.type === "enum"));
    if (!rendererCompatible) {
      errors.push(`Table column "${column.key}" renderer is incompatible with field "${column.fieldKey}".`);
    }
    if (config.presentation.layout.mode === "fixed" && column.sizing?.mode === "content") {
      errors.push(`Table column "${column.key}" cannot use content sizing with fixed Table layout.`);
    }
    if (!column.hidden && column.sticky && config.presentation.layout.overflowX !== "auto") {
      errors.push(`Sticky Table column "${column.key}" requires automatic horizontal overflow.`);
    }
  }
  const summaryFields = new Set(resource.summaryFields?.map((field) => field.key) ?? []);
  const validateSummaryItem = (item: PhiTableSummaryItemDefinition, owner: string) => {
    if (!item.key.trim()) errors.push(`${owner} requires a non-empty item key.`);
    if (item.value.source === "provider" && !summaryFields.has(item.value.fieldKey)) {
      errors.push(`${owner} references undeclared Provider summary field "${item.value.fieldKey}".`);
    }
  };
  const footerValueKeys = new Set<string>();
  const footer = config.presentation.footer;
  for (const binding of footer?.values ?? []) {
    if (footerValueKeys.has(binding.key)) errors.push("Table footer value keys must be unique.");
    footerValueKeys.add(binding.key);
    validateSummaryItem({ key: binding.key, value: binding.value }, `Table footer value "${binding.key}"`);
  }
  if (footer) {
    const placeholderIndexes = new Set(
      [...footer.template.matchAll(/%([1-9]\d*)/g)].map((match) => Number(match[1])),
    );
    // A sentence of its own is a footer too (the reader and PhiTableFooterVariant allow `values: []`):
    // only its placeholders and its values must match.
    if (!footer.template.trim() ||
      footer.values.some((_value, index) => !placeholderIndexes.has(index + 1)) ||
      [...placeholderIndexes].some((index) => index > footer.values.length)) {
      errors.push("Table footer template placeholders must match its ordered values.");
    }
  }
  const summaryRowKeys = new Set<string>();
  for (const row of config.presentation.summary?.rows ?? []) {
    if (!row.key.trim() || summaryRowKeys.has(row.key)) {
      errors.push("Table summary rows require unique non-empty keys.");
    }
    summaryRowKeys.add(row.key);
    const cellKeys = new Set<string>();
    const occupiedColumns = new Set<string>();
    for (const cell of row.cells) {
      if (!cell.key.trim() || cellKeys.has(cell.key)) {
        errors.push(`Table summary row "${row.key}" requires unique non-empty cell keys.`);
      }
      cellKeys.add(cell.key);
      if (!columnKeys.has(cell.columnKey) || cell.throughColumnKey && !columnKeys.has(cell.throughColumnKey)) {
        errors.push(`Table summary cell "${cell.key}" references an undeclared column.`);
      } else {
        const start = columns.findIndex((column) => column.key === cell.columnKey);
        const end = cell.throughColumnKey
          ? columns.findIndex((column) => column.key === cell.throughColumnKey)
          : start;
        if (end < start) {
          errors.push(`Table summary cell "${cell.key}" has a backwards column span.`);
        } else {
          for (const column of columns.slice(start, end + 1)) {
            if (occupiedColumns.has(column.key)) {
              errors.push(`Table summary row "${row.key}" contains overlapping cells.`);
              break;
            }
            occupiedColumns.add(column.key);
          }
        }
      }
      validateSummaryItem(cell.item, `Table summary cell "${cell.key}"`);
    }
  }
  if (config.presentation.layout.mode === "fixed" &&
    columns.every((column) => column.hidden || (column.sizing?.mode ?? "content") !== "fill")) {
    errors.push("Fixed Table layout requires at least one visible fill column.");
  }
  if (config.presentation.layout.mode !== "fixed" && columns.some((column) => column.ellipsis)) {
    errors.push("Ellipsis requires fixed Table layout.");
  }
  const sortingMode = config.features.sorting?.mode ?? "none";
  const providerSorting = resource.query.sorting ?? "none";
  if (sortingMode !== "none" && providerSorting === "none") {
    errors.push(`Table resource "${resource.resourceKey}" does not support sorting.`);
  } else if (sortingMode === "multiple" && providerSorting !== "multiple") {
    errors.push(`Table resource "${resource.resourceKey}" does not support multiple sorting.`);
  }
  if (config.features.search?.enabled && resource.query.search !== true) {
    errors.push(`Table resource "${resource.resourceKey}" does not support search.`);
  }
  if (config.features.pagination?.enabled !== false && resource.query.pagination === "none") {
    errors.push(`Table resource "${resource.resourceKey}" does not support pagination.`);
  }
  for (const sort of config.features.sorting?.defaultSorts ?? []) {
    if (!fields.has(sort.key)) errors.push(`Table default sort "${sort.key}" is not declared by the resource.`);
  }
  const filterFields = new Set(resource.query.filterFields ?? []);
  for (const filter of config.features.filters ?? []) {
    const keys = filter.type === "dateRange" ? [filter.startKey, filter.endKey] : [filter.key];
    for (const key of keys) {
      if (!filterFields.has(key)) errors.push(`Table filter "${key}" is not declared by the resource.`);
    }
  }
  const structure = config.features.structure;
  if (structure?.mode === "tree" &&
    resource.hierarchy?.parentRowIdentityPath !== structure.parentRowIdentityPath) {
    errors.push(`Table resource "${resource.resourceKey}" does not declare the selected hierarchy.`);
  }
  if (structure?.mode === "tree" && !columns.some((column) =>
    column.key === structure.expandColumnKey && !column.hidden)) {
    errors.push(`Table tree expand column "${structure.expandColumnKey}" is not a visible configured column.`);
  }
  if (resource.hierarchy?.canAcceptChildrenField) {
    const acceptanceField = fieldsByKey.get(resource.hierarchy.canAcceptChildrenField);
    if (acceptanceField?.type !== "boolean") {
      errors.push(`Table resource "${resource.resourceKey}" child-acceptance field must be a declared boolean field.`);
    }
  }
  if (config.features.editing?.mode === "none" && columns.some((column) => column.editor)) {
    errors.push("Editable Table columns require cell editing mode.");
  }
  if (config.features.rowReordering?.enabled) {
    const requiredOrdering = structure?.mode === "tree" ? "tree" : "flat";
    if (resource.rowOrdering !== requiredOrdering) {
      errors.push(`Table resource "${resource.resourceKey}" does not support ${requiredOrdering} row ordering.`);
    }
  }
  const providerActions = new Map(resource.actions?.map((action) => [action.key, action]) ?? []);
  const bindingFields = new Map(resource.bindingFields?.map((field) => [field.key, field]) ?? []);
  const configuredBindingKeys = new Set<string>();
  for (const bindingTool of config.features.tools?.bindingFields ?? []) {
    if (configuredBindingKeys.has(bindingTool.key)) {
      errors.push(`Table binding field "${bindingTool.key}" is configured more than once.`);
      continue;
    }
    configuredBindingKeys.add(bindingTool.key);
    const bindingField = bindingFields.get(bindingTool.key);
    if (!bindingField) {
      errors.push(`Table binding field "${bindingTool.key}" is not declared by resource "${resource.resourceKey}".`);
      continue;
    }
    if (bindingField.create) {
      const action = providerActions.get(bindingField.create.actionKey);
      if (!action || action.scope !== "resource" || action.valueType !== "string") {
        errors.push(`Table binding field "${bindingTool.key}" create action must be a declared string-valued resource action.`);
      }
      if (!bindingTool.create) errors.push(`Table binding field "${bindingTool.key}" needs Widget create-tool presentation.`);
      else if (!bindingTool.create.display) {
        errors.push(`Table binding field "${bindingTool.key}" create tool requires explicit display presentation.`);
      }
    } else if (bindingTool.create) {
      errors.push(`Table binding field "${bindingTool.key}" configures create presentation without a Provider create capability.`);
    }
    if (bindingTool.create && (bindingTool.create.display === "icon" || bindingTool.create.display === "icon-label") &&
      !bindingTool.create.icon?.trim()) {
      errors.push(`Table binding field "${bindingTool.key}" create tool needs an icon for display "${bindingTool.create.display}".`);
    }
  }
  for (const [scope, actions] of [
    ["resource", config.features.actions?.toolbar ?? []],
    ["row", config.features.actions?.row ?? []],
    ["selection", config.features.actions?.bulk ?? []],
  ] as const) {
    for (const action of actions) {
      if (!action.display) {
        errors.push(`Table action "${action.key}" requires explicit display presentation.`);
      }
      if ((action.display === "icon" || action.display === "icon-label") && !action.icon?.trim()) {
        errors.push(`Table action "${action.key}" needs an icon for display "${action.display}".`);
      }
      if (action.execution !== "provider") continue;
      const capability = providerActions.get(action.key);
      if (!capability) {
        errors.push(`Table action "${action.key}" is not declared by resource "${resource.resourceKey}".`);
      } else if (capability.scope !== scope) {
        errors.push(`Table action "${action.key}" cannot be placed in the ${scope} action scope.`);
      } else {
        if (capability.confirmation === "required" && !action.confirm?.title.trim()) {
          errors.push(`Table action "${action.key}" requires Widget confirmation presentation.`);
        }
        if (capability.intent === "destructive" && action.mode !== "danger") {
          errors.push(`Destructive Table action "${action.key}" requires danger presentation.`);
        }
      }
    }
  }
  return errors;
}
