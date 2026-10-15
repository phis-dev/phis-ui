"use client";

import { useMemo } from "react";

import { isPhiTimelineTone, readPhiTimelineEntry, type PhiTimelineEntry } from "@phis/contracts/timeline";
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

function createStaticTimelineSpec(
  labels: PhiAuthoringToolsLabels["staticTimeline"],
): PhiStaticRowsEditorSpec<PhiTimelineEntry> {
  return {
    resourceKey: "timeline",
    keyField: "key",
    nameField: "title",
    buttonIcon: "history",
    duplicateKeyMessage: labels.keysUnique,
    columns: [
      { key: "icon", title: labels.columnIcon, editor: "icon", width: 48 },
      { key: "key", title: labels.columnKey, editor: "string", required: true, width: 112 },
      /* A date the Widget formats for the reader, or words of the author's own beside it. */
      { key: "at", title: labels.columnAt, editor: "date", width: 152 },
      { key: "time", title: labels.columnTime, editor: "string", width: 128 },
      { key: "title", title: labels.columnTitle, editor: "string", width: 160 },
      { key: "content", title: labels.columnContent, editor: "string", width: "fill" },
      {
        key: "tone",
        title: labels.columnTone,
        editor: "enum",
        width: 128,
        options: [
          { value: "", label: labels.toneDefault },
          { value: "secondary", label: labels.toneSecondary },
          { value: "success", label: labels.toneSuccess },
          { value: "warning", label: labels.toneWarning },
          { value: "danger", label: labels.toneDanger },
        ],
      },
      { key: "pending", title: labels.columnPending, editor: "boolean", width: 96 },
    ],
    createRow: (rows) => {
      const keys = new Set(rows.map((row) => row.key));
      let index = rows.length + 1;
      while (keys.has(`entry${index}`)) index += 1;
      return { key: `entry${index}`, content: "" };
    },
    /* Read as the contract reads a stored entry, so what the editor applies is what the Widget keeps. */
    normalizeRow: (row) => readPhiTimelineEntry({
      ...row,
      tone: isPhiTimelineTone(row.tone) ? row.tone : undefined,
    }) ?? { key: readText(row, "key"), content: "" },
    validate: (rows) => {
      if (rows.some((row) => !readText(row, "key"))) return labels.keyRequired;
      const keys = rows.map((row) => readText(row, "key"));
      return new Set(keys).size === keys.length ? null : labels.keysUnique;
    },
    labels: {
      edit: labels.edit,
      title: labels.title,
      add: labels.addEntry,
      delete: labels.deleteEntry,
      cancel: "",
      apply: "",
      empty: labels.empty,
      columnActions: "",
      deleteRow: labels.deleteRow,
    },
  };
}

/** A Timeline's static entries, edited in a dialog from its scaffold toolbar. */
export function PhiStaticTimelineToolButton({
  entries,
  disabled = false,
  onApply,
}: {
  entries: readonly PhiTimelineEntry[];
  disabled?: boolean;
  onApply: (entries: PhiTimelineEntry[]) => void;
}) {
  const toolsLabels = usePhiAuthoringToolsLabels();
  const spec = useMemo(() => {
    const base = createStaticTimelineSpec(toolsLabels.staticTimeline);
    /* Cancel, Apply and the actions column read as they do in the options dialog beside it. */
    return {
      ...base,
      labels: {
        ...base.labels,
        cancel: toolsLabels.staticOptions.cancel,
        apply: toolsLabels.staticOptions.apply,
        columnActions: toolsLabels.staticOptions.columnActions,
      },
    };
  }, [toolsLabels]);
  return <PhiStaticRowsToolButton spec={spec} rows={entries} disabled={disabled} onApply={onApply} />;
}
