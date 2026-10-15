"use client";

import { stopPhiOverlayEvent } from "../../../helpers/overlay-events";
import { useCallback, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";

import type { PhiTableControlColumn } from "../../controls/phi-table-control";
import { PhiButtonControl } from "../../controls/phi-button-control";
import { PhiAlertControl } from "../../controls/phi-alert-control";
import { PhiDialogControl } from "../../controls/phi-dialog-control";
import type { PhiControlOption } from "../../controls/phi-control-options";
import { PhiIcon } from "../../shell/phi-icon";
import { PhiWidgetIconPickerButton } from "../client/shared/phi-widget-icon-picker";
import { usePhiWidgetScaffoldPopup } from "../client/shared/phi-widget-scaffold-popup";
import { formatPhiAuthoringToolsLabel } from "../label-types/authoring-tools";
import type { PhiRuntimeDataProviderKey } from "../../../types/runtime-data-provider";
import type {
  PhiTableProviderFieldDefinition,
  PhiTableProviderMutationRequest,
  PhiTableProviderResourceDescriptor,
} from "../../../types/table-widget";
import { PhiTableProviderClient, type PhiTableProviderRegistration } from "../client/shared/phi-table-provider";
import { usePhiTableBinding } from "../../tables/client/phi-table-binding";
import { PhiTableBindingControl } from "../../tables/client/phi-table-binding-control";
import { PhiFlexControl } from "../../controls/phi-flex-control";
import { PhiCollectionHeaderControl } from "../../controls/phi-collection-header-control";
import { PhiToolbarControl } from "../../controls/phi-toolbar-control";
import { PHI_SPACE } from "../../../theme/antd-css-var-contract";

/*
 * Rows a Widget keeps in its own config, edited in a table in a dialog: static options, static timeline
 * entries. The rows stay a draft until Apply; Cancel and dismissing drop it.
 *
 * The table is a real Table Binding over an in-memory Table Provider, so editing, reordering, adding and
 * deleting go through the same commit path as every provider-backed table, and the editor gains nothing
 * a Table does not already have. What differs from one Widget to the next is the columns, which field
 * identifies a row, how a new row starts, and what a finished row looks like -- that is the spec below.
 */

export type PhiStaticRowsRecord = Record<string, unknown>;

export type PhiStaticRowsColumn = {
  key: string;
  title: string;
  /** `icon` is the icon picker; the others edit in the cell. `enum` takes `options`; `date` is an ISO date. */
  editor: "string" | "boolean" | "enum" | "date" | "icon";
  required?: boolean;
  options?: readonly PhiControlOption[];
  /** A fixed width in pixels, or the column that takes the rest. */
  width: number | "fill";
};

export type PhiStaticRowsLabels = {
  edit: string;
  title: string;
  add: string;
  delete: string;
  cancel: string;
  apply: string;
  empty: string;
  columnActions: string;
  /** `%1` is the row as it reads, its name field or else its key. */
  deleteRow: string;
  /** Only where the rows have a disabled switch (`toggleField`). */
  enable?: string;
  disable?: string;
  enableRow?: string;
  disableRow?: string;
};

export type PhiStaticRowsEditorSpec<TRow extends PhiStaticRowsRecord> = {
  /**
   * The in-memory Table Provider the dialog's table reads, one per kind of row. Created at module scope
   * by the caller, so an identifier nobody owns fails when the module loads rather than when the dialog
   * opens.
   */
  providerKey: PhiRuntimeDataProviderKey;
  /** The provider's one resource. */
  resourceKey: string;
  columns: readonly PhiStaticRowsColumn[];
  /** The field that identifies a row; it is required and unique among the rows. */
  keyField: string;
  /** The field a row reads as in labels and aria text. */
  nameField: string;
  /** A boolean field the row's actions switch, drawn as an eye; the row's cells lock while it is on. */
  toggleField?: string;
  /** A new row, its key not yet taken by any of `rows`. */
  createRow: (rows: readonly PhiStaticRowsRecord[]) => PhiStaticRowsRecord;
  /** A row as it is stored: trimmed, empty fields left out. */
  normalizeRow: (row: PhiStaticRowsRecord) => TRow;
  /** The first thing wrong with the rows, or `null`. Runs on Apply. */
  validate: (rows: readonly PhiStaticRowsRecord[]) => string | null;
  /** What a key that is already taken says, while it is typed in its cell. */
  duplicateKeyMessage: string;
  labels: PhiStaticRowsLabels;
  /** The tool button's icon name. */
  buttonIcon: string;
};

const ROW_ID = "rowId";

function readRowName<TRow extends PhiStaticRowsRecord>(row: PhiStaticRowsRecord, spec: PhiStaticRowsEditorSpec<TRow>) {
  return String(row[spec.nameField] || row[spec.keyField] || "");
}

function PhiStaticRowsTableProvider<TRow extends PhiStaticRowsRecord>({
  spec,
  providerKey,
  resource,
  rows,
  setRows,
  nextRowId,
  children,
}: {
  spec: PhiStaticRowsEditorSpec<TRow>;
  providerKey: PhiRuntimeDataProviderKey;
  resource: PhiTableProviderResourceDescriptor;
  rows: readonly PhiStaticRowsRecord[];
  setRows: Dispatch<SetStateAction<PhiStaticRowsRecord[]>>;
  nextRowId: () => string;
  children: ReactNode;
}) {
  const registration = useMemo<PhiTableProviderRegistration>(() => ({
    key: providerKey,
    resources: [resource],
    query: async () => ({ rows, total: rows.length }),
    mutate: async (request: PhiTableProviderMutationRequest) => {
      if (request.kind === "field") {
        const rowId = String(request.rowIdentity);
        if (request.fieldKey === spec.keyField) {
          const key = String(request.proposedValue ?? "").trim();
          if (!key || rows.some((row) => row[ROW_ID] !== rowId && String(row[spec.keyField] ?? "").trim() === key)) {
            return { status: "rejected" as const, invalidation: "none" as const, errorCode: "duplicate-value", message: spec.duplicateKeyMessage };
          }
        }
        setRows((current) => current.map((row) => row[ROW_ID] === rowId
          ? { ...row, [request.fieldKey]: request.proposedValue }
          : row));
        return { status: "accepted" as const, invalidation: "none" as const, canonicalValue: request.proposedValue };
      }
      if (request.kind === "row-move") {
        setRows((current) => {
          const sourceIndex = current.findIndex((row) => row[ROW_ID] === String(request.movedRowIdentity));
          const targetIdentity = request.beforeRowIdentity ?? request.afterRowIdentity;
          const targetIndex = current.findIndex((row) => row[ROW_ID] === String(targetIdentity));
          if (sourceIndex < 0 || targetIndex < 0) return current;
          const next = [...current];
          const [moved] = next.splice(sourceIndex, 1);
          const resolvedTargetIndex = next.findIndex((row) => row[ROW_ID] === String(targetIdentity));
          next.splice(resolvedTargetIndex + (request.afterRowIdentity == null ? 0 : 1), 0, moved);
          return next;
        });
        return { status: "accepted" as const, invalidation: "view" as const };
      }
      if (request.kind === "action" && request.actionKey === "add") {
        setRows((current) => [...current, { ...spec.createRow(current), [ROW_ID]: nextRowId() }]);
        return { status: "accepted" as const, invalidation: "view" as const };
      }
      if (request.kind === "action" && request.rowIdentity != null &&
        (request.actionKey === "toggle" || request.actionKey === "delete")) {
        const rowId = String(request.rowIdentity);
        if (request.actionKey === "delete") {
          setRows((current) => current.filter((row) => row[ROW_ID] !== rowId));
          return { status: "accepted" as const, invalidation: "view" as const };
        }
        const toggleField = spec.toggleField;
        if (!toggleField) {
          return { status: "rejected" as const, invalidation: "none" as const, errorCode: "unsupported-mutation" };
        }
        const row = rows.find((candidate) => candidate[ROW_ID] === rowId);
        setRows((current) => current.map((candidate) => candidate[ROW_ID] === rowId
          ? { ...candidate, [toggleField]: !candidate[toggleField] }
          : candidate));
        return { status: "accepted" as const, invalidation: "none" as const, rowPatch: { [toggleField]: !row?.[toggleField] } };
      }
      return { status: "rejected" as const, invalidation: "none" as const, errorCode: "unsupported-mutation" };
    },
  }), [nextRowId, providerKey, resource, rows, setRows, spec]);
  return <PhiTableProviderClient registration={registration}>{children}</PhiTableProviderClient>;
}

function PhiStaticRowsTable<TRow extends PhiStaticRowsRecord>({
  spec,
  providerKey,
  resource,
  disabled,
}: {
  spec: PhiStaticRowsEditorSpec<TRow>;
  providerKey: PhiRuntimeDataProviderKey;
  resource: PhiTableProviderResourceDescriptor;
  disabled: boolean;
}) {
  const { labels, toggleField } = spec;
  const source = useMemo(() => ({ providerKey, resourceKey: resource.resourceKey }), [providerKey, resource]);
  const binding = usePhiTableBinding({ source, defaultPageSize: 100 });
  const columns = useMemo<readonly PhiTableControlColumn<Record<string, unknown>>[]>(() => {
    const rowLocked = (row: Record<string, unknown>) => disabled || (toggleField != null && row[toggleField] === true);
    const commit = (row: Record<string, unknown>, fieldKey: string, originalValue: unknown, proposedValue: unknown) => {
      void binding.commitField({ kind: "field", rowIdentity: String(row[ROW_ID]), fieldKey, originalValue, proposedValue });
    };
    const fieldColumns = spec.columns.map((column): PhiTableControlColumn<Record<string, unknown>> => {
      const sizing = column.width === "fill" ? { mode: "fill" as const } : { mode: "fixed" as const, width: column.width };
      if (column.editor === "icon") {
        return {
          title: column.title, key: column.key, fieldPath: column.key, sizing,
          render: (_value, row) => (
            <PhiWidgetIconPickerButton
              value={typeof row[column.key] === "string" ? String(row[column.key]) : undefined}
              buttonAriaLabel={`${column.title}: ${readRowName(row, spec)}`}
              buttonIcon={row[column.key] ? <PhiIcon name={String(row[column.key])} /> : <PhiIcon name="appstore" size="inherit" />}
              placement="right" disabled={rowLocked(row)}
              onChange={(icon) => commit(row, column.key, row[column.key], icon ?? "")}
            />
          ),
        };
      }
      return {
        title: column.title, key: column.key, fieldPath: column.key, sizing,
        editor: {
          type: column.editor,
          ...(column.required ? { required: true } : {}),
          ...(column.options ? { options: column.options } : {}),
        },
        isEditorDisabled: rowLocked,
        onCommit: (row, originalValue, proposedValue) => commit(row, column.key, originalValue, proposedValue),
      };
    });
    const actions: PhiTableControlColumn<Record<string, unknown>> = {
      title: labels.columnActions, key: "actions", role: "actions", fieldPath: ROW_ID,
      sizing: { mode: "fixed", width: toggleField ? 72 : 40 }, fixed: "right",
      render: (_value, row) => (
        <PhiFlexControl align="center" gap={0} style={{ display: "inline-flex" }}>
          {toggleField ? (
            <PhiButtonControl type="text" size="small"
              icon={row[toggleField] ? <PhiIcon name="eye-invisible" size="inherit" /> : <PhiIcon name="eye" size="inherit" />}
              ariaLabel={formatPhiAuthoringToolsLabel((row[toggleField] ? labels.enableRow : labels.disableRow) ?? "", readRowName(row, spec))}
              disabled={disabled}
              tooltip={row[toggleField] ? labels.enable : labels.disable}
              onClick={() => { void binding.executeAction({ kind: "action", actionKey: "toggle", rowIdentity: String(row[ROW_ID]), selectedRowIdentities: [], query: binding.resolvedQuery }); }}
            />
          ) : null}
          <PhiButtonControl type="text" danger size="small" icon={<PhiIcon name="delete" size="inherit" />}
            ariaLabel={formatPhiAuthoringToolsLabel(labels.deleteRow, readRowName(row, spec))} disabled={disabled}
            tooltip={labels.delete}
            onClick={() => { void binding.executeAction({ kind: "action", actionKey: "delete", rowIdentity: String(row[ROW_ID]), selectedRowIdentities: [], query: binding.resolvedQuery }); }}
          />
        </PhiFlexControl>
      ),
    };
    return [...fieldColumns, actions];
  }, [binding, disabled, labels, spec, toggleField]);
  /*
   * Add stands over the table, as every collection's tools do (TABLES.md, "Collection Header"): a
   * compact toolbar on the right, `space.sm` above the table.
   */
  return <>
    {binding.error ? <PhiAlertControl level="error" showIcon title={binding.error.message} /> : null}
    <PhiFlexControl vertical gap={PHI_SPACE.sm} style={{ width: "100%", minWidth: 0 }}>
      <PhiCollectionHeaderControl
        toolbar={(
          <PhiToolbarControl
            compact
            size="small"
            disabled={disabled}
            items={[{ key: "add", label: labels.add, showLabel: true, icon: <PhiIcon name="plus" size="inherit" /> }]}
            onActivate={() => { void binding.executeAction({ kind: "action", actionKey: "add", selectedRowIdentities: [], query: binding.resolvedQuery }); }}
          />
        )}
      />
      <PhiTableBindingControl
        rows={binding.rows} fields={binding.resource?.fields ?? []} columns={columns}
        rowIdentityPath={ROW_ID} columnOrder={[...spec.columns.map((column) => column.key), "actions"]}
        sortingMode="none" sorts={[]} pagination={false} size="small" emptyText={labels.empty}
        layout={{ mode: "fixed", overflowX: "auto" }} loading={binding.loading}
        rowReordering={{ enabled: !disabled, onMove: (move) => { void binding.moveRow({ kind: "row-move", ...move }); } }}
      />
    </PhiFlexControl>
  </>;
}

/** A Widget's static rows: a tool button that opens them in a dialog and hands back the applied rows. */
export function PhiStaticRowsToolButton<TRow extends PhiStaticRowsRecord>({
  spec,
  rows: storedRows,
  disabled = false,
  onApply,
}: {
  spec: PhiStaticRowsEditorSpec<TRow>;
  rows: readonly TRow[];
  disabled?: boolean;
  onApply: (rows: TRow[]) => void;
}) {
  const { labels } = spec;
  const popup = usePhiWidgetScaffoldPopup();
  const { providerKey } = spec;
  const resource = useMemo<PhiTableProviderResourceDescriptor>(() => ({
    resourceKey: spec.resourceKey,
    title: labels.title,
    rowIdentityPath: ROW_ID,
    fields: [
      { key: ROW_ID, title: "ID", type: "string", required: true },
      ...spec.columns.map((column): PhiTableProviderFieldDefinition => ({
        key: column.key,
        title: column.title,
        type: column.editor === "icon" ? "string" : column.editor,
        mutable: true,
        ...(column.required ? { required: true } : {}),
      })),
    ],
    query: { sorting: "none", pagination: "none" },
    actions: [
      { key: "add", title: labels.add, scope: "resource" },
      ...(spec.toggleField ? [{ key: "toggle", title: labels.disable ?? "", scope: "row" as const }] : []),
      { key: "delete", title: labels.delete, scope: "row" },
    ],
    rowOrdering: "flat",
  }), [labels, spec.columns, spec.resourceKey, spec.toggleField]);
  const rowSequenceRef = useRef(storedRows.length);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<PhiStaticRowsRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  const createEditorRows = useCallback(() => storedRows.map((row, index) => ({
    ...row,
    [ROW_ID]: `static-${spec.resourceKey}-${index + 1}`,
  })), [spec.resourceKey, storedRows]);
  const nextRowId = useCallback(() => {
    rowSequenceRef.current += 1;
    return `static-${spec.resourceKey}-${rowSequenceRef.current}`;
  }, [spec.resourceKey]);
  const closeEditor = () => {
    setOpen(false);
    setError(null);
  };
  const discardEditor = () => {
    rowSequenceRef.current = storedRows.length;
    setRows(createEditorRows());
    closeEditor();
  };
  const applyEditor = () => {
    const nextError = spec.validate(rows);
    if (nextError) {
      setError(nextError);
      return;
    }
    onApply(rows.map(({ [ROW_ID]: _rowId, ...row }) => spec.normalizeRow(row)));
    closeEditor();
  };

  return (
    <>
      <PhiButtonControl
        ariaLabel={labels.edit}
        icon={<PhiIcon name={spec.buttonIcon} size="inherit" />}
        type="text"
        size="small"
        disabled={disabled}
        style={{ width: 24, minWidth: 24, height: 24, padding: 0 }}
        onClick={() => {
          setError(null);
          rowSequenceRef.current = storedRows.length;
          setRows(createEditorRows());
          setOpen(true);
        }}
      />
      <PhiDialogControl
        open={open}
        title={labels.title}
        controlSize="large"
        mask={{ appearance: "normal", allowOutsideInteraction: false, closable: false }}
        mountPolicy="remount"
        rootClassName={popup.rootClassName}
        onDismiss={discardEditor}
        alert={error ? { level: "error", showIcon: true, title: error } : null}
        actions={[
          { key: "cancel", label: labels.cancel, onClick: discardEditor },
          { key: "apply", label: labels.apply, type: "primary", onClick: applyEditor },
        ]}
      >
        {/*
          * The editor sits inside a Widget's own popup container, so a click that reaches past the table
          * lands on the Widget behind it and takes the selection with it. The Modal's shell stops mouse
          * and click at its root; pointer events are not among them, which is why this stays a wrapper of
          * its own rather than something the Dialog does for every caller.
          */}
        <div onClick={stopPhiOverlayEvent} onPointerDown={stopPhiOverlayEvent} style={{ minWidth: 0 }}>
          <PhiStaticRowsTableProvider
            spec={spec}
            providerKey={providerKey}
            resource={resource}
            rows={rows}
            setRows={setRows}
            nextRowId={nextRowId}
          >
            <PhiStaticRowsTable spec={spec} providerKey={providerKey} resource={resource} disabled={disabled} />
          </PhiStaticRowsTableProvider>
        </div>
      </PhiDialogControl>
    </>
  );
}
