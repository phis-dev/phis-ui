"use client";

import { useMemo } from "react";

import type { PhiControlOption } from "../../controls/phi-control-options";
import { usePhiAuthoringToolsLabels } from "../client/shared/phi-authoring-tools-labels";
import type { PhiAuthoringToolsLabels } from "../label-types/authoring-tools";
import {
  PhiStaticRowsToolButton,
  type PhiStaticRowsEditorSpec,
  type PhiStaticRowsRecord,
} from "./phi-static-rows-editor";

function readText(row: PhiStaticRowsRecord, key: string) {
  return typeof row[key] === "string" ? (row[key] as string).trim() : "";
}

function createStaticOptionsSpec(
  labels: PhiAuthoringToolsLabels["staticOptions"],
): PhiStaticRowsEditorSpec<PhiControlOption> {
  return {
    resourceKey: "options",
    keyField: "value",
    nameField: "label",
    toggleField: "disabled",
    buttonIcon: "unordered-list",
    duplicateKeyMessage: labels.valuesUnique,
    columns: [
      { key: "icon", title: labels.columnIcon, editor: "icon", width: 48 },
      { key: "label", title: labels.columnLabel, editor: "string", required: true, width: 176 },
      { key: "value", title: labels.columnValue, editor: "string", required: true, width: 176 },
      { key: "description", title: labels.columnDescription, editor: "string", width: "fill" },
    ],
    createRow: (rows) => {
      const values = new Set(rows.map((row) => row.value));
      let suffix = 1;
      let value = "option";
      while (values.has(value)) value = `option-${++suffix}`;
      return { value, label: "Option" };
    },
    normalizeRow: (row) => {
      const description = readText(row, "description");
      const icon = readText(row, "icon");
      return {
        value: readText(row, "value"),
        label: readText(row, "label"),
        ...(description ? { description } : {}),
        ...(icon ? { icon } : {}),
        ...(row.disabled === true ? { disabled: true } : {}),
      };
    },
    validate: (rows) => {
      if (rows.some((row) => !readText(row, "value"))) return labels.valueRequired;
      if (rows.some((row) => !readText(row, "label"))) return labels.labelRequired;
      const values = rows.map((row) => readText(row, "value"));
      return new Set(values).size === values.length ? null : labels.valuesUnique;
    },
    labels: {
      edit: labels.edit,
      title: labels.title,
      add: labels.addOption,
      delete: labels.deleteOption,
      cancel: labels.cancel,
      apply: labels.apply,
      empty: labels.empty,
      columnActions: labels.columnActions,
      deleteRow: labels.deleteRow,
      enable: labels.enableOption,
      disable: labels.disableOption,
      enableRow: labels.enableRow,
      disableRow: labels.disableRow,
    },
  };
}

/** A choice Widget's static options, edited in a dialog from its scaffold toolbar. */
export function PhiStaticOptionsToolButton({
  options,
  disabled = false,
  onApply,
}: {
  options: readonly PhiControlOption[];
  disabled?: boolean;
  onApply: (options: PhiControlOption[]) => void;
}) {
  const labels = usePhiAuthoringToolsLabels().staticOptions;
  const spec = useMemo(() => createStaticOptionsSpec(labels), [labels]);
  return <PhiStaticRowsToolButton spec={spec} rows={options} disabled={disabled} onApply={onApply} />;
}
