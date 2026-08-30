"use client";

import { useMemo, type ReactNode } from "react";

import type { PhiTableProviderFieldDefinition } from "../../../types/table-widget";
import { usePhiControlOptionsProvider } from "../../controls/phi-options-provider";
import {
  PhiTableControl,
  type PhiTableControlColumn,
  type PhiTableControlProps,
} from "../../controls/phi-table-control";

type TableRow = Record<string, unknown>;
type ResolvedFieldOptions = Readonly<Record<string, {
  options: import("../../controls/phi-control-options").PhiControlOption<string | number>[];
  warning?: string;
}>>;

function PhiTableFieldOptionsResolver({
  fields,
  index,
  sourceConfig,
  resolved,
  children,
}: {
  fields: readonly PhiTableProviderFieldDefinition[];
  index: number;
  sourceConfig?: Record<string, unknown>;
  resolved: ResolvedFieldOptions;
  children: (resolved: ResolvedFieldOptions) => ReactNode;
}) {
  const field = fields[index];
  const optionField = field?.type === "enum" || field?.type === "enum[]" ? field : null;
  const result = usePhiControlOptionsProvider<string | number>({
    options: optionField?.options,
    optionsProvider: optionField?.optionsProvider,
    sourceConfig,
  });
  const nextResolved = useMemo<ResolvedFieldOptions>(() => field ? {
    ...resolved,
    [field.key]: { options: result.options, warning: result.warning },
  } : resolved, [field, resolved, result.options, result.warning]);
  if (!field || index === fields.length - 1) return children(nextResolved);
  return <PhiTableFieldOptionsResolver key={fields[index + 1].key} fields={fields} index={index + 1}
    sourceConfig={sourceConfig} resolved={nextResolved}>{children}</PhiTableFieldOptionsResolver>;
}

export type PhiTableBindingControlProps<TRow extends TableRow> = Omit<PhiTableControlProps<TRow>, "columns"> & {
  columns: readonly PhiTableControlColumn<TRow>[];
  fields: readonly PhiTableProviderFieldDefinition[];
  sourceConfig?: Record<string, unknown>;
  renderDiagnostics?: (warnings: readonly string[]) => ReactNode;
};

export function PhiTableBindingControl<TRow extends TableRow>({
  columns,
  fields,
  sourceConfig,
  renderDiagnostics,
  ...props
}: PhiTableBindingControlProps<TRow>) {
  const render = (resolved: ResolvedFieldOptions) => {
    const resolvedColumns = columns.map((column) => {
      if (!column.editor || (column.editor.type !== "enum" && column.editor.type !== "enum[]")) return column;
      const fieldOptions = resolved[column.fieldPath];
      return {
        ...column,
        editor: {
          ...column.editor,
          options: fieldOptions?.options ?? [],
          disabled: column.editor.disabled || Boolean(fieldOptions?.warning),
        },
      };
    });
    const warnings = fields.flatMap((field) => resolved[field.key]?.warning ?? []);
    return <>
      {warnings.length > 0 ? renderDiagnostics?.(warnings) : null}
      <PhiTableControl {...props} columns={resolvedColumns} />
    </>;
  };
  return fields.length === 0
    ? render({})
    : <PhiTableFieldOptionsResolver fields={fields} index={0} sourceConfig={sourceConfig} resolved={{}}>
        {render}
      </PhiTableFieldOptionsResolver>;
}
