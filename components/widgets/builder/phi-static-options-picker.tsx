"use client";

import {
  AppstoreOutlined,
  DeleteOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  PlusOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import { Button, Flex, Space, Tooltip } from "antd";
import { useCallback, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";

import {
  type PhiTableControlColumn,
} from "../../controls/phi-table-control";
import { PhiButtonControl } from "../../controls/phi-button-control";
import { PhiAlertControl } from "../../controls/phi-alert-control";
import { PhiModalControl } from "../../controls/phi-modal-control";
import type { PhiControlOption } from "../../controls/phi-control-options";
import { PhiIcon } from "../../shell/phi-icon";
import { PhiWidgetIconPickerButton } from "../client/shared/phi-widget-icon-picker";
import { usePhiWidgetScaffoldPopup } from "../client/shared/phi-widget-scaffold-popup";
import { createPhiSharedRuntimeDataProviderKey } from "../../../constants/runtime-data-provider-key";
import type { PhiTableProviderMutationRequest, PhiTableProviderResourceDescriptor } from "../../../types/table-widget";
import { PhiTableProviderClient, type PhiTableProviderRegistration } from "../client/shared/phi-table-provider";
import { usePhiTableBinding } from "../../tables/client/phi-table-binding";
import { PhiTableBindingControl } from "../../tables/client/phi-table-binding-control";

type PhiStaticOptionEditorRow = PhiControlOption & {
  rowId: string;
};

const PHI_STATIC_OPTIONS_TABLE_PROVIDER_KEY = createPhiSharedRuntimeDataProviderKey("tables", "static-options-editor");
const PHI_STATIC_OPTIONS_TABLE_RESOURCE: PhiTableProviderResourceDescriptor = {
  resourceKey: "options",
  title: "Static options",
  rowIdentityPath: "rowId",
  fields: [
    { key: "rowId", title: "ID", type: "string", required: true },
    { key: "icon", title: "Icon", type: "string", mutable: true },
    { key: "label", title: "Label", type: "string", required: true, mutable: true },
    { key: "value", title: "Value", type: "string", required: true, mutable: true },
    { key: "description", title: "Description", type: "string", mutable: true },
    { key: "disabled", title: "Disabled", type: "boolean", mutable: true },
  ],
  query: { sorting: "none", pagination: "none" },
  actions: [
    { key: "add", title: "Add option", scope: "resource" },
    { key: "toggle", title: "Toggle option", scope: "row" },
    { key: "delete", title: "Delete option", scope: "row" },
  ],
  rowOrdering: "flat",
};

function createEditorRows(options: readonly PhiControlOption[]): PhiStaticOptionEditorRow[] {
  return options.map((option, index) => ({
    ...option,
    rowId: `static-option-${index + 1}`,
  }));
}

function normalizeEditorOption(row: PhiStaticOptionEditorRow): PhiControlOption {
  const value = row.value.trim();
  const label = row.label.trim();
  const description = row.description?.trim();
  const icon = row.icon?.trim();
  return {
    value,
    label,
    ...(description ? { description } : {}),
    ...(icon ? { icon } : {}),
    ...(row.disabled ? { disabled: true } : {}),
  };
}

function validateEditorRows(rows: readonly PhiStaticOptionEditorRow[]) {
  if (rows.some((row) => !row.value.trim())) {
    return "Every option requires a value.";
  }
  if (rows.some((row) => !row.label.trim())) {
    return "Every option requires a label.";
  }
  const values = rows.map((row) => row.value.trim());
  if (new Set(values).size !== values.length) {
    return "Option values must be unique.";
  }
  return null;
}

function stopOverlayEvent(event: { stopPropagation: () => void }) {
  event.stopPropagation();
}

function PhiStaticOptionsTableProvider({
  rows,
  setRows,
  nextRowId,
  children,
}: {
  rows: readonly PhiStaticOptionEditorRow[];
  setRows: Dispatch<SetStateAction<PhiStaticOptionEditorRow[]>>;
  nextRowId: () => string;
  children: ReactNode;
}) {
  const registration = useMemo<PhiTableProviderRegistration>(() => ({
    key: PHI_STATIC_OPTIONS_TABLE_PROVIDER_KEY,
    resources: [PHI_STATIC_OPTIONS_TABLE_RESOURCE],
    query: async () => ({ rows, total: rows.length }),
    mutate: async (request: PhiTableProviderMutationRequest) => {
      if (request.kind === "field") {
        const rowId = String(request.rowIdentity);
        if (request.fieldKey === "value") {
          const value = String(request.proposedValue ?? "").trim();
          if (!value || rows.some((row) => row.rowId !== rowId && row.value.trim() === value)) {
            return { status: "rejected" as const, invalidation: "none" as const, errorCode: "duplicate-value", message: "Option values must be unique." };
          }
        }
        setRows((current) => current.map((row) => row.rowId === rowId
          ? { ...row, [request.fieldKey]: request.proposedValue }
          : row));
        return { status: "accepted" as const, invalidation: "none" as const, canonicalValue: request.proposedValue };
      }
      if (request.kind === "row-move") {
        setRows((current) => {
          const sourceIndex = current.findIndex((row) => row.rowId === String(request.movedRowIdentity));
          const targetIdentity = request.beforeRowIdentity ?? request.afterRowIdentity;
          const targetIndex = current.findIndex((row) => row.rowId === String(targetIdentity));
          if (sourceIndex < 0 || targetIndex < 0) return current;
          const next = [...current];
          const [moved] = next.splice(sourceIndex, 1);
          const resolvedTargetIndex = next.findIndex((row) => row.rowId === String(targetIdentity));
          next.splice(resolvedTargetIndex + (request.afterRowIdentity == null ? 0 : 1), 0, moved);
          return next;
        });
        return { status: "accepted" as const, invalidation: "view" as const };
      }
      if (request.kind === "action" && request.actionKey === "add") {
        const values = new Set(rows.map((row) => row.value));
        let suffix = 1;
        let value = "option";
        while (values.has(value)) value = `option-${++suffix}`;
        setRows((current) => [...current, { rowId: nextRowId(), value, label: "Option" }]);
        return { status: "accepted" as const, invalidation: "view" as const };
      }
      if (request.kind === "action" && request.rowIdentity != null &&
        (request.actionKey === "toggle" || request.actionKey === "delete")) {
        const rowId = String(request.rowIdentity);
        if (request.actionKey === "delete") {
          setRows((current) => current.filter((row) => row.rowId !== rowId));
          return { status: "accepted" as const, invalidation: "view" as const };
        }
        const row = rows.find((candidate) => candidate.rowId === rowId);
        setRows((current) => current.map((candidate) => candidate.rowId === rowId
          ? { ...candidate, disabled: !candidate.disabled }
          : candidate));
        return { status: "accepted" as const, invalidation: "none" as const, rowPatch: { disabled: !row?.disabled } };
      }
      return { status: "rejected" as const, invalidation: "none" as const, errorCode: "unsupported-mutation" };
    },
  }), [nextRowId, rows, setRows]);
  return <PhiTableProviderClient registration={registration}>{children}</PhiTableProviderClient>;
}

function PhiStaticOptionsTable({ disabled }: { disabled: boolean }) {
  const source = useMemo(() => ({
    providerKey: PHI_STATIC_OPTIONS_TABLE_PROVIDER_KEY,
    resourceKey: PHI_STATIC_OPTIONS_TABLE_RESOURCE.resourceKey,
  }), []);
  const binding = usePhiTableBinding({ source, defaultPageSize: 100 });
  const columns = useMemo<readonly PhiTableControlColumn<Record<string, unknown>>[]>(() => [
    {
      title: "Icon", key: "icon", fieldPath: "icon", sizing: { mode: "fixed", width: 48 },
      render: (_value, row) => (
        <PhiWidgetIconPickerButton
          value={typeof row.icon === "string" ? row.icon : undefined}
          buttonAriaLabel={`Edit icon for ${String(row.label || row.value)}`}
          buttonIcon={row.icon ? <PhiIcon name={String(row.icon)} /> : <AppstoreOutlined />}
          placement="right" disabled={disabled || row.disabled === true}
          onChange={(icon) => { void binding.commitField({
            kind: "field", rowIdentity: String(row.rowId), fieldKey: "icon",
            originalValue: row.icon, proposedValue: icon ?? "",
          }); }}
        />
      ),
    },
    { title: "Label", key: "label", fieldPath: "label", sizing: { mode: "fixed", width: 176 }, editor: { type: "string", required: true },
      isEditorDisabled: (row) => disabled || row.disabled === true,
      onCommit: (row, originalValue, proposedValue) => { void binding.commitField({ kind: "field", rowIdentity: String(row.rowId), fieldKey: "label", originalValue, proposedValue }); } },
    { title: "Value", key: "value", fieldPath: "value", sizing: { mode: "fixed", width: 176 }, editor: { type: "string", required: true },
      isEditorDisabled: (row) => disabled || row.disabled === true,
      onCommit: (row, originalValue, proposedValue) => { void binding.commitField({ kind: "field", rowIdentity: String(row.rowId), fieldKey: "value", originalValue, proposedValue }); } },
    { title: "Description", key: "description", fieldPath: "description", sizing: { mode: "fill" }, editor: { type: "string" },
      isEditorDisabled: (row) => disabled || row.disabled === true,
      onCommit: (row, originalValue, proposedValue) => { void binding.commitField({ kind: "field", rowIdentity: String(row.rowId), fieldKey: "description", originalValue, proposedValue }); } },
    {
      title: "Actions", key: "actions", role: "actions", fieldPath: "rowId", sizing: { mode: "fixed", width: 72 }, fixed: "right",
      render: (_value, row) => (
        <Space size={0} align="center">
          <Tooltip title={row.disabled ? "Enable option" : "Disable option"}>
            <Button type="text" size="small" icon={row.disabled ? <EyeInvisibleOutlined /> : <EyeOutlined />}
              aria-label={row.disabled ? `Enable ${String(row.label)}` : `Disable ${String(row.label)}`} disabled={disabled}
              onClick={() => { void binding.executeAction({ kind: "action", actionKey: "toggle", rowIdentity: String(row.rowId), selectedRowIdentities: [], query: binding.resolvedQuery }); }} />
          </Tooltip>
          <Tooltip title="Delete option">
            <Button type="text" danger size="small" icon={<DeleteOutlined />} aria-label={`Delete ${String(row.label || row.value)}`} disabled={disabled}
              onClick={() => { void binding.executeAction({ kind: "action", actionKey: "delete", rowIdentity: String(row.rowId), selectedRowIdentities: [], query: binding.resolvedQuery }); }} />
          </Tooltip>
        </Space>
      ),
    },
  ], [binding, disabled]);
  return <>
    {binding.error ? <PhiAlertControl level="error" showIcon title={binding.error.message} /> : null}
    <PhiTableBindingControl
      rows={binding.rows} fields={binding.resource?.fields ?? []} columns={columns}
      rowIdentityPath="rowId" columnOrder={["icon", "label", "value", "description", "actions"]}
      sortingMode="none" sorts={[]} pagination={false} size="small" emptyText="No static options"
      layout={{ mode: "fixed", overflowX: "auto" }} loading={binding.loading}
      rowReordering={{ enabled: !disabled, onMove: (move) => { void binding.moveRow({ kind: "row-move", ...move }); } }}
    />
    <Flex justify="flex-end">
      <PhiButtonControl label="Add option" icon={<PlusOutlined />} size="small" disabled={disabled}
        onClick={() => { void binding.executeAction({ kind: "action", actionKey: "add", selectedRowIdentities: [], query: binding.resolvedQuery }); }} />
    </Flex>
  </>;
}

export function PhiStaticOptionsToolButton({
  options,
  disabled = false,
  onApply,
}: {
  options: readonly PhiControlOption[];
  disabled?: boolean;
  onApply: (options: PhiControlOption[]) => void;
}) {
  const popup = usePhiWidgetScaffoldPopup();
  const rowSequenceRef = useRef(options.length);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<PhiStaticOptionEditorRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const nextRowId = useCallback(() => {
    rowSequenceRef.current += 1;
    return `static-option-${rowSequenceRef.current}`;
  }, []);
  const closePicker = () => {
    setOpen(false);
    setError(null);
  };
  const discardPicker = () => {
    rowSequenceRef.current = options.length;
    setRows(createEditorRows(options));
    closePicker();
  };
  const applyPicker = () => {
    const nextError = validateEditorRows(rows);
    if (nextError) {
      setError(nextError);
      return;
    }
    onApply(rows.map(normalizeEditorOption));
    closePicker();
  };


  return (
    <>
      <PhiButtonControl
        ariaLabel="Edit static options"
        icon={<UnorderedListOutlined />}
        type="text"
        size="small"
        disabled={disabled}
        style={{ width: 24, minWidth: 24, height: 24, padding: 0 }}
        onClick={() => {
          setError(null);
          rowSequenceRef.current = options.length;
          setRows(createEditorRows(options));
          setOpen(true);
        }}
      />
      <PhiModalControl
        open={open}
        title="Static options"
        width={920}
        mask={{ appearance: "normal", allowOutsideInteraction: false, closable: false }}
        mountPolicy="on-open"
        rootClassName={popup.rootClassName}
        onDismiss={discardPicker}
        footer={<Flex justify="end" gap={12}>
          <PhiButtonControl label="Cancel" onClick={discardPicker} />
          <PhiButtonControl label="Apply" type="primary" onClick={applyPicker} />
        </Flex>}
        body={<Flex vertical gap={12} onClick={stopOverlayEvent} onPointerDown={stopOverlayEvent}>
          {error ? <PhiAlertControl level="error" showIcon title={error} /> : null}
          <PhiStaticOptionsTableProvider rows={rows} setRows={setRows} nextRowId={nextRowId}>
            <PhiStaticOptionsTable disabled={disabled} />
          </PhiStaticOptionsTableProvider>
        </Flex>}
      />
    </>
  );
}
