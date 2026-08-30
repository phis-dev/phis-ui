"use client";

import { useMemo, useRef, useState } from "react";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";

import type { PhiFormFieldProviderProps } from "./form-provider-registry";
import {
  PhiTableControl,
  type PhiTableControlCellEditor,
  type PhiTableControlColumn,
  type PhiTableControlRowMove,
} from "../controls/phi-table-control";
import { PhiTreeControl, type PhiTreeControlDropRequest } from "../controls/phi-tree-control";
import type { PhiTableLayoutConfig } from "../../types/table-widget";
import type { PhiTreeNodeIdentity, PhiTreeWidgetPresentation } from "../../types/tree-widget";
import { PhiButtonControl } from "../controls/phi-button-control";
import { PhiCollectionHeaderControl } from "../controls/phi-collection-header-control";
import { PhiToolbarControl } from "../controls/phi-toolbar-control";
import type { PhiControlOption } from "../controls/phi-control-options";

type RecordValue = Record<string, unknown>;

function readRecords(value: unknown): RecordValue[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is RecordValue => Boolean(entry) && typeof entry === "object" && !Array.isArray(entry)).map((entry) => ({ ...entry }))
    : [];
}

function readPath(record: RecordValue, path: string) {
  return path.split(".").filter(Boolean).reduce<unknown>((current, key) =>
    current && typeof current === "object" && !Array.isArray(current)
      ? (current as RecordValue)[key]
      : undefined, record);
}

function setPath(record: RecordValue, path: string, value: unknown) {
  const segments = path.split(".").filter(Boolean);
  if (segments.length === 0) return record;
  const next = { ...record };
  let cursor = next;
  for (const segment of segments.slice(0, -1)) {
    const child = cursor[segment];
    const cloned = child && typeof child === "object" && !Array.isArray(child) ? { ...(child as RecordValue) } : {};
    cursor[segment] = cloned;
    cursor = cloned;
  }
  cursor[segments.at(-1)!] = value;
  return next;
}

function readControlOptions(value: unknown): PhiControlOption<string | number>[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const options = value.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const option = entry as RecordValue;
    if (typeof option.value !== "string" && typeof option.value !== "number") return [];
    return [{
      value: option.value,
      label: typeof option.label === "string" ? option.label : String(option.value),
      description: typeof option.description === "string" ? option.description : undefined,
      disabled: option.disabled === true,
    }];
  });
  return options.length === 0 ? undefined : options;
}

function readTableCellEditor(value: unknown): PhiTableControlCellEditor | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const editor = value as RecordValue;
  const type = editor.type;
  if (
    type !== "string" &&
    type !== "number" &&
    type !== "boolean" &&
    type !== "enum" &&
    type !== "enum[]" &&
    type !== "color" &&
    type !== "icon" &&
    type !== "date" &&
    type !== "datetime"
  ) return undefined;
  const constraints = editor.constraints && typeof editor.constraints === "object" && !Array.isArray(editor.constraints)
    ? editor.constraints as RecordValue
    : null;
  return {
    type,
    control:
      editor.control === "switch" ||
      editor.control === "checkbox" ||
      editor.control === "select" ||
      editor.control === "radio" ||
      editor.control === "segmented" ||
      editor.control === "multi-select" ||
      editor.control === "checkbox-group" ||
      editor.control === "icon-picker"
        ? editor.control
        : undefined,
    required: editor.required === true,
    variant:
      editor.variant === "outlined" ||
      editor.variant === "filled" ||
      editor.variant === "borderless" ||
      editor.variant === "underlined"
        ? editor.variant
        : undefined,
    options: readControlOptions(editor.options),
    constraints: constraints == null ? undefined : {
      min: typeof constraints.min === "number" || typeof constraints.min === "string" ? constraints.min : undefined,
      max: typeof constraints.max === "number" || typeof constraints.max === "string" ? constraints.max : undefined,
      step: typeof constraints.step === "number" ? constraints.step : undefined,
      precision: typeof constraints.precision === "number" ? constraints.precision : undefined,
    },
  };
}

function applyMove(rows: RecordValue[], identityPath: string, parentPath: string | null, move: PhiTableControlRowMove | PhiTreeControlDropRequest) {
  const movedIdentity = "movedRowIdentity" in move ? move.movedRowIdentity : move.movedNodeIdentity;
  const movedIndex = rows.findIndex((row) => String(readPath(row, identityPath)) === String(movedIdentity));
  if (movedIndex < 0) return rows;
  const [moved] = rows.splice(movedIndex, 1);
  const parentIdentity = "targetParentRowIdentity" in move ? move.targetParentRowIdentity : move.targetParentNodeIdentity;
  const beforeIdentity = "beforeRowIdentity" in move ? move.beforeRowIdentity : move.beforeNodeIdentity;
  const afterIdentity = "afterRowIdentity" in move ? move.afterRowIdentity : move.afterNodeIdentity;
  const nextMoved = parentPath ? setPath(moved, parentPath, parentIdentity) : moved;
  const anchorIdentity = beforeIdentity ?? afterIdentity;
  const anchorIndex = anchorIdentity == null ? -1 : rows.findIndex((row) => String(readPath(row, identityPath)) === String(anchorIdentity));
  const insertionIndex = anchorIndex < 0 ? rows.length : anchorIndex + (afterIdentity == null ? 0 : 1);
  rows.splice(insertionIndex, 0, nextMoved);
  return rows;
}

export function PhiCompoundTableFormControl({
  field,
  label,
  description,
  value,
  onChange,
  disabled,
  readOnly,
  formContext,
}: PhiFormFieldProviderProps) {
  const rows = useMemo(() => readRecords(value), [value]);
  const nextRowSequenceRef = useRef(0);
  const config = field.config ?? {};
  const identityPath = typeof config.rowIdentityPath === "string" ? config.rowIdentityPath : "id";
  const locked = disabled === true || readOnly === true;
  const addConfig = config.add && typeof config.add === "object" && !Array.isArray(config.add)
    ? config.add as RecordValue
    : null;
  const removeConfig = config.remove && typeof config.remove === "object" && !Array.isArray(config.remove)
    ? config.remove as RecordValue
    : null;
  const addEnabled = addConfig?.enabled === true;
  const removeEnabled = removeConfig?.enabled === true;
  const addLabel = typeof addConfig?.label === "string" ? addConfig.label : "Add";
  const removeLabel = typeof removeConfig?.label === "string" ? removeConfig.label : "Remove";
  const addSourceFields = addConfig?.sourceFields && typeof addConfig.sourceFields === "object" && !Array.isArray(addConfig.sourceFields)
    ? addConfig.sourceFields as RecordValue
    : null;
  const addResetFields = addConfig?.resetFields && typeof addConfig.resetFields === "object" && !Array.isArray(addConfig.resetFields)
    ? addConfig.resetFields as RecordValue
    : null;
  const rawColumns = useMemo(
    () => Array.isArray(config.columns) ? config.columns : [],
    [config.columns],
  );
  const columns = useMemo<PhiTableControlColumn<RecordValue>[]>(() => rawColumns.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const column = entry as RecordValue;
    const key = typeof column.key === "string" ? column.key : "";
    const fieldPath = typeof column.fieldPath === "string" ? column.fieldPath : key;
    if (!key || !fieldPath) return [];
    const editor = readTableCellEditor(column.editor);
    return [{
      key,
      title: typeof column.title === "string" ? column.title : key,
      fieldPath,
      sizing: column.sizing as PhiTableControlColumn<RecordValue>["sizing"],
      editor,
      isEditorDisabled: () => locked,
      onCommit: (row, _original, proposed) => {
        const identity = readPath(row, identityPath);
        onChange?.(rows.map((candidate) => String(readPath(candidate, identityPath)) === String(identity)
          ? setPath(candidate, fieldPath, proposed)
          : candidate));
      },
    }];
  }), [identityPath, locked, onChange, rawColumns, rows]);
  const actionColumn = useMemo<PhiTableControlColumn<RecordValue> | null>(() => removeEnabled ? {
    key: "actions",
    role: "actions",
    title: "",
    fieldPath: identityPath,
    fixed: "right",
    sizing: { mode: "content" },
    render: (identity) => (
      <PhiButtonControl
        ariaLabel={removeLabel}
        tooltip={removeLabel}
        icon={<DeleteOutlined />}
        type="text"
        danger
        size="small"
        disabled={locked}
        onClick={() => onChange?.(rows.filter((row) => String(readPath(row, identityPath)) !== String(identity)))}
      />
    ),
  } : null, [identityPath, locked, onChange, removeEnabled, removeLabel, rows]);
  const renderedColumns = actionColumn == null ? columns : [...columns, actionColumn];
  const columnOrder = renderedColumns.map((column) => column.key);
  const layout = (config.layout && typeof config.layout === "object" ? config.layout : { mode: "auto", overflowX: "auto" }) as PhiTableLayoutConfig;
  const appendRow = () => {
    let defaultRow = addConfig?.defaultRow && typeof addConfig.defaultRow === "object" && !Array.isArray(addConfig.defaultRow)
      ? { ...(addConfig.defaultRow as RecordValue) }
      : {};
    const formValues = formContext?.getValues() ?? {};
    for (const [rowPath, sourceField] of Object.entries(addSourceFields ?? {})) {
      if (typeof sourceField !== "string" || !sourceField) continue;
      defaultRow = setPath(defaultRow, rowPath, formValues[sourceField]);
    }
    nextRowSequenceRef.current += 1;
    onChange?.([
      ...rows,
      setPath(defaultRow, identityPath, `local:${nextRowSequenceRef.current}`),
    ]);
    if (addResetFields) formContext?.setValues(addResetFields);
  };
  return (
    <div data-phi-form-keyboard-scope style={{ display: "grid", gap: "var(--ant-padding-sm)", minWidth: 0, width: "100%" }}>
      <PhiCollectionHeaderControl
        title={label}
        description={description}
        toolbar={addEnabled ? (
          <PhiToolbarControl
            items={[{
              key: "add",
              label: addLabel,
              ariaLabel: addLabel,
              tooltip: addLabel,
              icon: <PlusOutlined />,
              type: "primary",
            }]}
            compact
            showLabels
            size="small"
            disabled={locked}
            onActivate={(key) => { if (key === "add") appendRow(); }}
          />
        ) : null}
      />
      <PhiTableControl
        rows={rows}
        rowIdentityPath={identityPath}
        columns={renderedColumns}
        columnOrder={columnOrder}
        sortingMode="none"
        sorts={[]}
        bordered={config.bordered === true}
        striped={config.striped === true}
        size="small"
        emptyText={typeof config.emptyText === "string" ? config.emptyText : undefined}
        layout={layout}
        rowReordering={config.reorder === true && !locked ? {
          enabled: true,
          onMove: (move) => onChange?.(applyMove([...rows], identityPath, typeof config.parentRowIdentityPath === "string" ? config.parentRowIdentityPath : null, move)),
        } : undefined}
      />
    </div>
  );
}

export function PhiCompoundTreeFormControl({ field, label, description, value, onChange, disabled, readOnly }: PhiFormFieldProviderProps) {
  const nodes = readRecords(value);
  const config = field.config ?? {};
  const identityPath = typeof config.nodeIdentityPath === "string" ? config.nodeIdentityPath : "id";
  const parentPath = typeof config.parentNodeIdentityPath === "string" ? config.parentNodeIdentityPath : "parentId";
  const [selected, setSelected] = useState<readonly PhiTreeNodeIdentity[]>([]);
  const [checked, setChecked] = useState<readonly PhiTreeNodeIdentity[]>([]);
  const [expanded, setExpanded] = useState<readonly PhiTreeNodeIdentity[]>([]);
  const presentation = (config.presentation && typeof config.presentation === "object" ? config.presentation : {
    blockNode: true,
    node: { titleFieldKey: typeof config.titleFieldKey === "string" ? config.titleFieldKey : "title" },
  }) as PhiTreeWidgetPresentation;
  return (
    <div data-phi-form-keyboard-scope style={{ display: "grid", gap: "var(--ant-padding-sm)", minWidth: 0, width: "100%" }}>
      <PhiCollectionHeaderControl title={label} description={description} />
      <PhiTreeControl
        nodes={nodes}
        nodeIdentityPath={identityPath}
        parentNodeIdentityPath={parentPath}
        presentation={presentation}
        disabled={disabled || readOnly}
        selectedNodeIdentities={selected}
        checkedNodeIdentities={checked}
        expandedNodeIdentities={expanded}
        selectionMode={config.selectionMode === "multiple" ? "multiple" : config.selectionMode === "none" ? "none" : "single"}
        checking={config.checking === true}
        editing={config.editing === true && !disabled && !readOnly}
        draggable={config.reorder === true && !disabled && !readOnly}
        onSelectionChange={setSelected}
        onCheckingChange={setChecked}
        onExpansionChange={setExpanded}
        onCommitField={(identity, fieldKey, proposed) => onChange?.(nodes.map((node) => String(readPath(node, identityPath)) === String(identity) ? setPath(node, fieldKey, proposed) : node))}
        onDrop={(move) => onChange?.(applyMove([...nodes], identityPath, parentPath, move))}
      />
    </div>
  );
}
