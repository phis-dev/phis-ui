"use client";

import { useMemo, useRef, useState, type KeyboardEvent } from "react";

import { resolvePhiFormText } from "@phis/contracts/forms";
import { evaluatePhiRuntimeConditionExpression } from "../../types/runtime-condition";
import type { PhiFormFieldDescriptor, PhiFormTextDescriptor } from "../../types/form-descriptor";
import type { PhiFormFieldProviderProps } from "./form-provider-registry";
import { PhiTableControl, type PhiTableControlColumn } from "../controls/phi-table-control";
import { PhiButtonControl } from "../controls/phi-button-control";
import { PhiCardControl } from "../controls/phi-card-control";
import { PhiConfirmControl } from "../controls/phi-confirm-control";
import { PhiDescriptionHint } from "../controls/phi-description-tooltip-icon";
import { PhiDialogControl } from "../controls/phi-dialog-control";
import { PhiFlexControl } from "../controls/phi-flex-control";
import {
  PhiFormControl,
  type PhiFormControlFormInstance,
  type PhiFormControlHandle,
} from "../controls/phi-form-control";
import { PhiIcon } from "../shell/phi-icon";
import { renderPhiValueContent } from "../widgets/client/shared/phi-rendered-value";
import { PHI_INTERVAL_DEFAULT_LABELS } from "../widgets/label-types/interval";
import { readPhiDotPath } from "../../helpers/dot-path";
import { movePhiTableBindingRows } from "../../helpers/table-binding";
import { resolvePhiDialogFormGeometry } from "../../helpers/cms-dialog";
import { PHI_SPACE } from "../../theme/antd-css-var-contract";
import {
  buildPhiFormListEntryDescriptor,
  isPhiFormListKeyTaken,
  mergePhiFormListEntry,
  readPhiFormListEntries,
  readPhiFormListFieldConfig,
} from "./list-field";
import { PHI_FORM_LIST_DEFAULT_LABELS, PHI_FORM_LIST_LABEL_KEYS } from "./list-field-labels";

type Entry = Record<string, unknown>;

/** A row's identity while it is drawn: its position. The entries themselves carry none of their own. */
const ROW_ID = "__phiListRow";

const RENDERED_VALUE_LABELS = { interval: PHI_INTERVAL_DEFAULT_LABELS };

/** One of the field's words: its config's text, else the Form's word under the list keys, else English. */
function readListText(
  text: PhiFormTextDescriptor | undefined,
  labels: Readonly<Record<string, string>> | undefined,
  formConfig: Readonly<Record<string, unknown>> | undefined,
  key: keyof typeof PHI_FORM_LIST_LABEL_KEYS,
) {
  if (text) return resolvePhiFormText(text, labels, formConfig);
  return labels?.[PHI_FORM_LIST_LABEL_KEYS[key]]?.trim() || PHI_FORM_LIST_DEFAULT_LABELS[key];
}

/** What an entry field's stored values are called: its written-out options' labels, in the Form's words. */
function readValueMap(
  field: PhiFormFieldDescriptor,
  labels: Readonly<Record<string, string>> | undefined,
  formConfig: Readonly<Record<string, unknown>> | undefined,
) {
  if (!field.options || field.options.length === 0) return undefined;
  return Object.fromEntries(field.options.map((option) =>
    [String(option.value), resolvePhiFormText(option.label, labels, formConfig)]));
}

/*
 * A keystroke inside the list -- in the entry dialog above all, which React still counts as inside the
 * Form it is portalled out of -- is the list's: Enter in the dialog applies the entry, and must not also
 * submit the Form the list stands in.
 */
const stopKeyDown = (event: KeyboardEvent) => event.stopPropagation();

/**
 * The Core `list` field (FORMS.md, "List values"): a list of objects, each entry edited in a dialog built
 * from the field's entry fields. Its rows show the columns its config names, read-only; Add and a row's
 * Edit open the entry dialog -- a Form of the entry fields, as wide as that Form needs -- and Apply lays
 * what it holds over the entry. Remove asks first, and a row its config refuses removal says why.
 *
 * The list stands under a compact card heading, its label, with Add in the heading as every card heading's
 * action is, small. The Form draws no label of its own beside it (`phi-form-control.tsx`): the heading is it.
 */
export function PhiListFormControl({
  field,
  label,
  description,
  value,
  onChange,
  disabled,
  readOnly,
  labels,
  formConfig,
  size,
  mediaLimits,
}: PhiFormFieldProviderProps) {
  const config = useMemo(() => readPhiFormListFieldConfig(field), [field]);
  const entryDescriptor = useMemo(() => buildPhiFormListEntryDescriptor(field, config), [config, field]);
  const geometry = useMemo(() => resolvePhiDialogFormGeometry(entryDescriptor), [entryDescriptor]);
  const entries = useMemo(() => readPhiFormListEntries(value), [value]);
  const locked = disabled === true || readOnly === true;
  const text = (key: keyof typeof PHI_FORM_LIST_LABEL_KEYS, configured?: PhiFormTextDescriptor) =>
    readListText(configured, labels, formConfig, key);
  const addLabel = text("add", config.addLabel);
  const editLabel = text("edit", config.editLabel);
  const removeLabel = text("remove");
  const removeDisabledReason = config.removeDisabledReason
    ? resolvePhiFormText(config.removeDisabledReason, labels, formConfig)
    : null;

  // The entry the dialog edits: its position, or `null` for a new one; `undefined` while it is closed.
  const [editing, setEditing] = useState<number | null | undefined>(undefined);
  // Every opening is a Form of its own, started from the entry it opens on.
  const [opening, setOpening] = useState(0);
  const formRef = useRef<PhiFormControlHandle | null>(null);
  const formInstanceRef = useRef<PhiFormControlFormInstance | null>(null);
  const openEntry = (index: number | null) => {
    setOpening((current) => current + 1);
    setEditing(index);
  };
  const closeEntry = () => setEditing(undefined);
  const editedEntry = editing == null ? {} : entries[editing] ?? {};

  const publish = (next: readonly Entry[]) => onChange?.(next.map((entry) => ({ ...entry })));
  const applyEntry = (submitted: Record<string, unknown>) => {
    if (editing === undefined) return;
    const keyField = config.itemKeyField;
    if (keyField && isPhiFormListKeyTaken(entries, keyField, submitted[keyField], editing)) {
      formInstanceRef.current?.setFields([{ name: keyField, errors: [text("keyTaken")] }]);
      return;
    }
    const merged = mergePhiFormListEntry(entryDescriptor.fields, editing === null ? {} : entries[editing] ?? {}, submitted);
    publish(editing === null ? [...entries, merged] : entries.map((entry, index) => (index === editing ? merged : entry)));
    closeEntry();
  };

  const rows = useMemo(() => entries.map((entry, index) => ({ ...entry, [ROW_ID]: String(index) })), [entries]);
  const dataColumns = useMemo<PhiTableControlColumn<Entry>[]>(() => config.columns.map(({ field: column, renderer }) => {
    const valueMap = readValueMap(column, labels, formConfig);
    return {
      key: column.key,
      title: column.label ? resolvePhiFormText(column.label, labels, formConfig) : column.key,
      fieldPath: column.key,
      render: (_value, row) => renderPhiValueContent(readPhiDotPath(row, column.key), { renderer, ...(valueMap ? { valueMap } : {}) }, RENDERED_VALUE_LABELS),
    };
  }), [config.columns, formConfig, labels]);
  const actionColumn: PhiTableControlColumn<Entry> = {
    key: "actions",
    role: "actions",
    title: "",
    fieldPath: ROW_ID,
    fixed: "right",
    sizing: { mode: "content" },
    render: (identity, row) => {
      const index = Number(identity);
      const refused = config.removeDisabledWhen != null && evaluatePhiRuntimeConditionExpression(
        config.removeDisabledWhen,
        { row },
      ) === "matched";
      const atMinimum = entries.length <= config.minItems;
      return (
        <PhiFlexControl align="center" gap={PHI_SPACE.xxs} wrap={false}>
          <PhiButtonControl
            ariaLabel={editLabel}
            tooltip={editLabel}
            icon={<PhiIcon name="edit" size="inherit" />}
            type="text"
            size="small"
            disabled={locked}
            onClick={() => openEntry(index)}
          />
          {refused || atMinimum || locked ? (
            <PhiButtonControl
              ariaLabel={removeLabel}
              tooltip={refused ? removeDisabledReason : removeLabel}
              icon={<PhiIcon name="delete" size="inherit" />}
              type="text"
              size="small"
              danger
              disabled
            />
          ) : (
            <PhiConfirmControl
              title={text("removeTitle")}
              confirmLabel={removeLabel}
              cancelLabel={text("cancel")}
              danger
              trigger={{
                label: null,
                ariaLabel: removeLabel,
                icon: <PhiIcon name="delete" size="inherit" />,
                type: "text",
                danger: true,
                size: "small",
              }}
              onConfirm={() => publish(entries.filter((_, entryIndex) => entryIndex !== index))}
            />
          )}
        </PhiFlexControl>
      );
    },
  };
  const columns = [...dataColumns, actionColumn];

  const entryTitle = editing === null
    ? addLabel
    : (() => {
      const named = config.itemLabelField ? editedEntry[config.itemLabelField] : undefined;
      return typeof named === "string" && named.trim() ? named : editLabel;
    })();

  return (
    <div data-phi-form-keyboard-scope onKeyDown={stopKeyDown} style={{ minWidth: 0, width: "100%" }}>
      <PhiCardControl
        size="small"
        title={label ? (
          <PhiFlexControl align="center" gap={PHI_SPACE.xxs} wrap={false}>
            <span>{label}</span>
            {description ? <PhiDescriptionHint description={description} /> : null}
          </PhiFlexControl>
        ) : undefined}
        toolbar={(
          <PhiButtonControl
            label={addLabel}
            icon={<PhiIcon name="plus" size="inherit" />}
            size="small"
            disabled={locked || entries.length >= config.maxItems}
            onClick={() => openEntry(null)}
          />
        )}
      >
        <PhiTableControl
          rows={rows}
          rowIdentityPath={ROW_ID}
          columns={columns}
          columnOrder={columns.map((column) => column.key)}
          sortingMode="none"
          sorts={[]}
          size="small"
          emptyText={text("empty", config.emptyLabel)}
          layout={{ mode: "auto", overflowX: "auto" }}
          rowReordering={config.reorderable && !locked ? {
            enabled: true,
            onMove: (move) => publish(movePhiTableBindingRows(rows, ROW_ID, {
              movedRowIdentity: move.movedRowIdentity,
              beforeRowIdentity: move.beforeRowIdentity,
              afterRowIdentity: move.afterRowIdentity,
            }).map(({ [ROW_ID]: _row, ...entry }) => entry)),
          } : undefined}
        />
      </PhiCardControl>
      <PhiDialogControl
        open={editing !== undefined}
        title={entryTitle}
        size={geometry.size}
        maxSize={geometry.maxSize}
        onDismiss={closeEntry}
        actions={[
          { key: "cancel", label: text("cancel"), onClick: closeEntry },
          { key: "apply", label: text("apply"), type: "primary", onClick: () => formRef.current?.submit() },
        ]}
      >
        {editing === undefined ? null : (
          <PhiFormControl
            key={opening}
            ref={formRef}
            descriptor={entryDescriptor}
            labels={labels}
            formConfig={formConfig}
            initialValues={editedEntry}
            submitOnEnter
            size={size}
            mediaLimits={mediaLimits}
            onFormReady={(form) => { formInstanceRef.current = form; }}
            onSubmit={applyEntry}
          />
        )}
      </PhiDialogControl>
    </div>
  );
}
