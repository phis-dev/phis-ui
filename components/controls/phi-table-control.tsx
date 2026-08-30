"use client";

import { CloseOutlined, DownOutlined, EditOutlined, HolderOutlined, LeftOutlined, RightOutlined, SaveOutlined, UpOutlined } from "@ant-design/icons";
import { Button, Flex, Skeleton, Table, Tooltip } from "antd";
import type { TableColumnsType } from "antd";
import type { TableRowSelection } from "antd/es/table/interface";
import type { InputRef } from "antd/es/input";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragMoveEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  type SortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { flushSync } from "react-dom";
import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type HTMLAttributes,
  type Key,
  type ReactNode,
} from "react";

import type { PhiControlSize, PhiControlVariant } from "../../types/control";
import { PHI_GREGORY_CALENDAR_ADAPTER_KEY, type PhiCalendarAdapterKey, type PhiTemporalSelection } from "../../types/calendar";
import type {
  PhiTableColumnEditorControl,
  PhiTableProviderFieldType,
  PhiTableRowIdentity,
  PhiTableSort,
  PhiTableColumnSizing,
  PhiTableLayoutConfig,
} from "../../types/table-widget";
import type { PhiControlOption } from "./phi-control-options";
import { PhiColorControl } from "./phi-color-control";
import { PhiCheckboxControl } from "./phi-checkbox-control";
import { PhiCheckboxGroupControl } from "./phi-checkbox-group-control";
import { PhiDatePickerControl } from "./phi-date-picker-control";
import { PhiMultiSelectControl } from "./phi-multi-select-control";
import { PhiIconPickerControl } from "./phi-icon-picker-control";
import { PhiNumberControl } from "./phi-number-control";
import { PhiRadioGroupControl } from "./phi-radio-group-control";
import { PhiSelectControl } from "./phi-select-control";
import { PhiSegmentedControl } from "./phi-segmented-control";
import { PhiSwitchControl } from "./phi-switch-control";
import { PhiTextControl } from "./phi-text-control";
import { PhiExpandIndicator } from "./phi-expand-indicator";
import styles from "./phi-table-control.module.css";
import { usePhiConfig } from "../root/phi-config-provider";

export type PhiTableControlCellEditor = {
  type: Exclude<PhiTableProviderFieldType, "json">;
  control?: PhiTableColumnEditorControl;
  required?: boolean;
  disabled?: boolean;
  loading?: boolean;
  variant?: PhiControlVariant;
  options?: readonly PhiControlOption<string | number>[];
  calendarAdapterKey?: PhiCalendarAdapterKey;
  timeZone?: string;
  constraints?: {
    min?: number | string;
    max?: number | string;
    step?: number;
    precision?: number;
  };
};

export type PhiTableControlColumn<TRow extends Record<string, unknown>> = {
  key: string;
  role?: "data" | "actions";
  title: ReactNode;
  fieldPath: string;
  align?: "left" | "center" | "right";
  ellipsis?: boolean;
  fixed?: "left" | "right";
  sortable?: boolean;
  sortField?: string;
  render?: (value: unknown, row: TRow) => ReactNode;
  sizing?: PhiTableColumnSizing;
  editor?: PhiTableControlCellEditor;
  isEditorDisabled?: (row: TRow) => boolean;
  isEditorLoading?: (row: TRow) => boolean;
  onCommit?: (row: TRow, originalValue: unknown, proposedValue: unknown) => void;
};

type PhiTableSortableRowContextValue = Pick<
  ReturnType<typeof useSortable>,
  "attributes" | "listeners" | "setActivatorNodeRef"
>;

const PhiTableSortableRowContext = createContext<PhiTableSortableRowContextValue | null>(null);
const PhiTableDragVisualStateContext = createContext<{
  activeIdentity: string | null;
  insertionGapIndex: number | null;
  insertionGapHeight: number;
}>({ activeIdentity: null, insertionGapIndex: null, insertionGapHeight: 0 });
const PHI_TABLE_LOADING_ROW = Symbol("phi-table-loading-row");
const phiTableInsertionStrategy: SortingStrategy = () => null;

function PhiTableSortableRow({
  style,
  children,
  ...props
}: HTMLAttributes<HTMLTableRowElement> & { "data-row-key"?: string }) {
  const rowIdentity = String(props["data-row-key"] ?? "");
  const dragVisualState = useContext(PhiTableDragVisualStateContext);
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    index,
    isDragging,
  } = useSortable({ id: rowIdentity });
  const opensInsertionGap = dragVisualState.activeIdentity !== rowIdentity &&
    dragVisualState.insertionGapIndex != null &&
    index >= dragVisualState.insertionGapIndex;
  const renderedTransform = opensInsertionGap
    ? {
        x: transform?.x ?? 0,
        y: (transform?.y ?? 0) + dragVisualState.insertionGapHeight,
        scaleX: 1,
        scaleY: 1,
      }
    : transform;
  const context = useMemo<PhiTableSortableRowContextValue>(() => ({
    attributes,
    listeners,
    setActivatorNodeRef,
  }), [attributes, listeners, setActivatorNodeRef]);
  const renderedChildren = isDragging
    ? Children.map(children, (child) => {
        if (!isValidElement<{ style?: CSSProperties }>(child)) return child;
        return cloneElement(child, {
          style: {
            ...child.props.style,
            position: child.props.style?.position ?? "relative",
            zIndex: 11,
          },
        });
      })
    : children;
  return (
    <PhiTableSortableRowContext.Provider value={context}>
      <tr
        {...props}
        ref={setNodeRef}
        style={{
          ...style,
          transform: CSS.Transform.toString(renderedTransform ? {
            ...renderedTransform,
            x: 0,
            scaleX: 1,
            scaleY: 1,
          } : null),
          transition,
          position: "relative",
          zIndex: isDragging ? 10 : style?.zIndex,
          opacity: isDragging ? 0.68 : style?.opacity,
          pointerEvents: isDragging ? "none" : style?.pointerEvents,
        }}
      >
        {renderedChildren}
      </tr>
    </PhiTableSortableRowContext.Provider>
  );
}

function PhiTableRowDragHandle({
  dragLabel = "Drag row",
  disabled,
}: {
  dragLabel?: string;
  disabled: boolean;
}) {
  const sortable = useContext(PhiTableSortableRowContext);
  return (
    <Button
      {...sortable?.attributes}
      {...sortable?.listeners}
      ref={sortable?.setActivatorNodeRef}
      type="text"
      size="small"
      icon={<HolderOutlined />}
      aria-label={dragLabel}
      disabled={disabled || !sortable}
      onClick={(event) => event.stopPropagation()}
      style={{ touchAction: "none" }}
    />
  );
}

function PhiTableRowPositionControls({
  moveUpLabel = "Move row up",
  moveDownLabel = "Move row down",
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
}: {
  moveUpLabel?: string;
  moveDownLabel?: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <Flex align="center" gap={2} wrap={false}>
      <Button
        type="text"
        size="small"
        icon={<UpOutlined />}
        aria-label={moveUpLabel}
        disabled={!canMoveUp}
        onClick={(event) => { event.stopPropagation(); onMoveUp(); }}
      />
      <Button
        type="text"
        size="small"
        icon={<DownOutlined />}
        aria-label={moveDownLabel}
        disabled={!canMoveDown}
        onClick={(event) => { event.stopPropagation(); onMoveDown(); }}
      />
    </Flex>
  );
}

export type PhiTableControlPagination = {
  page: number;
  pageSize: number;
  total?: number;
  pageSizeOptions?: readonly number[];
  showSizeChanger?: boolean;
  onChange: (page: number, pageSize: number) => void;
};

export type PhiTableControlRowSelection<TRow extends Record<string, unknown>> = {
  mode: "single" | "multiple";
  selectedRowIdentities: readonly PhiTableRowIdentity[];
  preserveSelectedRowIdentities?: boolean;
  isRowDisabled?: (row: TRow) => boolean;
  onChange: (identities: readonly PhiTableRowIdentity[]) => void;
};

export type PhiTableControlTree = {
  parentRowIdentityPath: string;
  expandColumnKey: string;
  expandedRowIdentities: readonly PhiTableRowIdentity[];
  expandRowByClick?: boolean;
  indentSize?: number;
  onExpandedRowIdentitiesChange: (identities: readonly PhiTableRowIdentity[]) => void;
};

export type PhiTableControlRowMove = {
  movedRowIdentity: PhiTableRowIdentity;
  targetParentRowIdentity: PhiTableRowIdentity | null;
  beforeRowIdentity: PhiTableRowIdentity | null;
  afterRowIdentity: PhiTableRowIdentity | null;
};

export type PhiTableControlRowReordering = {
  enabled: boolean;
  dragLabel?: string;
  moveUpLabel?: string;
  moveDownLabel?: string;
  canAcceptChildren?: (row: Record<string, unknown>) => boolean;
  onMove: (move: PhiTableControlRowMove) => void;
};

export type PhiTableControlRowEditing<TRow extends Record<string, unknown>> = {
  mode: "row";
  editLabel?: string;
  saveLabel?: string;
  cancelLabel?: string;
  isRowDisabled?: (row: TRow) => boolean;
  onCommit: (
    row: TRow,
    originalValues: Readonly<Record<string, unknown>>,
    patch: Readonly<Record<string, unknown>>,
  ) => void;
};

export type PhiTableControlFooter = {
  content: ReactNode;
  align?: "start" | "center" | "end";
};

export type PhiTableControlSummary = {
  placement?: "body-end" | "sticky-top" | "sticky-bottom";
  rows: readonly {
    key: string;
    cells: readonly {
      key: string;
      columnKey: string;
      throughColumnKey?: string;
      align?: "left" | "center" | "right";
      content: ReactNode;
    }[];
  }[];
};

export type PhiTableControlProps<TRow extends Record<string, unknown>> = {
  rows: readonly TRow[];
  rowIdentityPath: string;
  columns: readonly PhiTableControlColumn<TRow>[];
  columnOrder: readonly string[];
  sortingMode: "none" | "single" | "multiple";
  sorts: readonly PhiTableSort[];
  onSortsChange?: (sorts: readonly PhiTableSort[]) => void;
  columnReordering?: boolean;
  onColumnOrderChange?: (columnOrder: readonly string[]) => void;
  rowSelection?: PhiTableControlRowSelection<TRow>;
  pagination?: PhiTableControlPagination | false;
  tree?: PhiTableControlTree;
  rowReordering?: PhiTableControlRowReordering;
  editing?: PhiTableControlRowEditing<TRow>;
  loading?: boolean;
  bordered?: boolean;
  striped?: boolean;
  showHeader?: boolean;
  footer?: PhiTableControlFooter;
  summary?: PhiTableControlSummary;
  size?: PhiControlSize;
  emptyText?: ReactNode;
  layout: PhiTableLayoutConfig;
  rowStyle?: (row: TRow) => CSSProperties | undefined;
  onRowActivate?: (row: TRow) => void;
  onExternalRowDragOver?: (
    event: DragEvent<HTMLTableRowElement>,
    row: TRow,
    placement: "before" | "after" | "child",
  ) => void;
  onExternalRowDrop?: (
    event: DragEvent<HTMLTableRowElement>,
    row: TRow,
    placement: "before" | "after" | "child",
  ) => void;
  onExternalDragOver?: (event: DragEvent<HTMLDivElement>) => void;
  onExternalDrop?: (event: DragEvent<HTMLDivElement>) => void;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function readPhiTableControlValue(row: Record<string, unknown>, path: string) {
  return path.split(".").filter(Boolean).reduce<unknown>(
    (current, segment) => isRecord(current) ? current[segment] : undefined,
    row,
  );
}

function readIdentity(row: Record<string, unknown>, path: string): PhiTableRowIdentity | null {
  const value = readPhiTableControlValue(row, path);
  return typeof value === "string" || (typeof value === "number" && Number.isFinite(value))
    ? value
    : null;
}

function buildTreeRows<TRow extends Record<string, unknown>>(
  rows: readonly TRow[],
  rowIdentityPath: string,
  parentRowIdentityPath: string,
) {
  type TreeRow = TRow & { __phiTableChildren?: TreeRow[] };
  const byIdentity = new Map<string, TreeRow>();
  const parentByIdentity = new Map<string, string | null>();
  for (const row of rows) {
    const identity = readIdentity(row, rowIdentityPath);
    if (identity == null) continue;
    const key = String(identity);
    byIdentity.set(key, { ...row });
    const parentIdentity = readIdentity(row, parentRowIdentityPath);
    parentByIdentity.set(key, parentIdentity == null ? null : String(parentIdentity));
  }
  const roots: TreeRow[] = [];
  for (const [identity, row] of byIdentity) {
    const parentIdentity = parentByIdentity.get(identity) ?? null;
    const parent = parentIdentity && parentIdentity !== identity ? byIdentity.get(parentIdentity) : null;
    if (!parent) {
      roots.push(row);
      continue;
    }
    (parent.__phiTableChildren ??= []).push(row);
  }
  return roots;
}

function flattenVisibleTreeRows<TRow extends Record<string, unknown>>(
  roots: readonly TRow[],
  rowIdentityPath: string,
  expandedRowIdentities: readonly PhiTableRowIdentity[],
) {
  type TreeRow = TRow & { __phiTableChildren?: readonly TreeRow[] };
  const expanded = new Set(expandedRowIdentities.map(String));
  const visible: TRow[] = [];
  const append = (row: TreeRow) => {
    visible.push(row);
    const identity = readIdentity(row, rowIdentityPath);
    if (identity == null || !expanded.has(String(identity))) return;
    for (const child of row.__phiTableChildren ?? []) append(child);
  };
  for (const root of roots as readonly TreeRow[]) append(root);
  return visible;
}

function moveColumn(columnOrder: readonly string[], key: string, offset: -1 | 1) {
  const index = columnOrder.indexOf(key);
  const target = index + offset;
  if (index < 0 || target < 0 || target >= columnOrder.length) return columnOrder;
  const next = [...columnOrder];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function normalizeSelectedKeys(keys: readonly Key[]) {
  return keys.filter((key): key is PhiTableRowIdentity =>
    typeof key === "string" || (typeof key === "number" && Number.isFinite(key)),
  );
}

function buildColumnStyle(sizing: PhiTableColumnSizing | undefined): CSSProperties | undefined {
  if (!sizing || sizing.mode === "fill") {
    return sizing ? { minWidth: sizing.minWidth, maxWidth: sizing.maxWidth } : undefined;
  }
  if (sizing.mode === "content") {
    return {
      width: sizing.maxWidth === undefined ? "1%" : undefined,
      minWidth: sizing.minWidth,
      maxWidth: sizing.maxWidth,
      whiteSpace: sizing.maxWidth === undefined ? "nowrap" : undefined,
      overflowWrap: sizing.maxWidth === undefined ? undefined : "anywhere",
    };
  }
  return {
    width: sizing.width,
    minWidth: sizing.width,
    maxWidth: sizing.width,
  };
}

function buildLoadingSkeletonStyle(
  width: CSSProperties["width"],
  cellPaddingInline: number,
): CSSProperties {
  if (width == null) return { display: "block", width: "100%", minWidth: 24 };
  const contentWidth = typeof width === "number"
    ? Math.max(24, width - cellPaddingInline * 2)
    : `max(24px, calc(${width} - ${cellPaddingInline * 2}px))`;
  return { display: "block", width: contentWidth, minWidth: 24, maxWidth: "100%" };
}

function EditableTableCell({ value, editor, onCommit }: {
  value: unknown;
  editor: PhiTableControlCellEditor;
  onCommit: (value: unknown) => void;
}) {
  const [draft, setDraft] = useState(value);
  const draftRef = useRef(value);
  const textInputRef = useRef<InputRef>(null);
  const skipNextBlurRef = useRef(false);
  const commit = useCallback(() => {
    if (!Object.is(draftRef.current, value)) onCommit(draftRef.current);
  }, [onCommit, value]);
  const commitOnBlur = useCallback(() => {
    if (skipNextBlurRef.current) {
      skipNextBlurRef.current = false;
      return;
    }
    commit();
  }, [commit]);
  const variant = editor.variant ?? "underlined";
  const disabled = editor.disabled || editor.loading;
  useEffect(() => {
    if (disabled) textInputRef.current?.blur();
  }, [disabled]);
  if (editor.type === "boolean") {
    if (editor.control === "checkbox") {
      return <PhiCheckboxControl checked={draft === true} disabled={editor.disabled || editor.loading}
        onChange={(next) => { draftRef.current = next; setDraft(next); onCommit(next); }} />;
    }
    return <PhiSwitchControl checked={draft === true} disabled={editor.disabled}
      loading={editor.loading} size="small"
      onChange={(next) => { draftRef.current = next; setDraft(next); onCommit(next); }} />;
  }
  if (editor.type === "number") {
    return <PhiNumberControl value={typeof draft === "number" ? draft : null}
      min={typeof editor.constraints?.min === "number" ? editor.constraints.min : undefined}
      max={typeof editor.constraints?.max === "number" ? editor.constraints.max : undefined}
      step={editor.constraints?.step} precision={editor.constraints?.precision}
      disabled={disabled} size="small" variant={variant} style={{ width: "100%" }}
      onChange={(next) => { draftRef.current = next; setDraft(next); }} onBlur={commitOnBlur}
      onKeyDown={(event) => {
        if (event.key !== "Enter") return;
        skipNextBlurRef.current = true;
        commit();
        event.currentTarget.blur();
      }} />;
  }
  if (editor.type === "color") {
    return <PhiColorControl value={typeof draft === "string" ? draft : null} disabled={disabled}
      showText size="small" onChange={(next) => { draftRef.current = next; setDraft(next); }}
      onCommit={() => commit()} />;
  }
  if (editor.type === "icon") {
    return <PhiIconPickerControl
      value={typeof draft === "string" ? draft : null}
      disabled={disabled}
      buttonType="default"
      buttonSize="small"
      onChange={(next) => {
        draftRef.current = next;
        setDraft(next);
        onCommit(next);
      }}
    />;
  }
  if (editor.type === "date" || editor.type === "datetime") {
    const selection: PhiTemporalSelection = editor.type === "date"
      ? {
          mode: "single",
          value: typeof draft === "string" && draft
            ? { kind: "date", value: { calendar: "gregory", isoDate: draft } }
            : null,
        }
      : {
          mode: "single",
          value: typeof draft === "string" && draft
            ? {
                kind: "datetime",
                value: {
                  calendar: "gregory",
                  localDateTime: draft.replace(/(?:Z|[+-]\d\d:\d\d)$/, ""),
                  timeZone: editor.timeZone ?? "UTC",
                  instant: draft,
                },
              }
            : null,
        };
    return <PhiDatePickerControl adapterKey={editor.calendarAdapterKey ?? PHI_GREGORY_CALENDAR_ADAPTER_KEY}
      selection={selection} selectionMode="single" precision={editor.type}
      showTime={editor.type === "datetime"} timeZone={editor.timeZone ?? "UTC"}
      min={typeof editor.constraints?.min === "string"
        ? { calendar: "gregory", isoDate: editor.constraints.min }
        : undefined}
      max={typeof editor.constraints?.max === "string"
        ? { calendar: "gregory", isoDate: editor.constraints.max }
        : undefined}
      disabled={disabled} allowClear={!editor.required} controlSize="small" variant={variant}
      onChange={(next) => {
        const temporal = next.mode === "single" ? next.value : null;
        const serialized = temporal?.kind === "date"
          ? temporal.value.isoDate
          : temporal?.kind === "datetime"
            ? temporal.value.instant
            : null;
        draftRef.current = serialized;
        setDraft(serialized);
        onCommit(serialized);
      }} />;
  }
  if (editor.type === "enum") {
    const enumValue = typeof draft === "string" || typeof draft === "number" ? draft : undefined;
    if (editor.control === "radio") {
      return <PhiRadioGroupControl value={enumValue} disabled={disabled} options={editor.options ?? []} size="small"
        onChange={(next) => { draftRef.current = next; setDraft(next); onCommit(next); }} />;
    }
    if (editor.control === "segmented") {
      return <PhiSegmentedControl value={enumValue} disabled={disabled} options={editor.options ?? []}
        block size="small" onChange={(next) => { draftRef.current = next; setDraft(next); onCommit(next); }} />;
    }
    return <PhiSelectControl value={enumValue}
      disabled={disabled} size="small" variant={variant} options={editor.options ?? []} style={{ width: "100%" }}
      onChange={(next) => { draftRef.current = next; setDraft(next); onCommit(next); }} />;
  }
  if (editor.type === "enum[]") {
    const values = Array.isArray(draft)
      ? draft.filter((entry): entry is string | number => typeof entry === "string" || typeof entry === "number")
      : [];
    if (editor.control === "checkbox-group") {
      return <PhiCheckboxGroupControl value={values} disabled={disabled} options={editor.options ?? []}
        onChange={(next) => { draftRef.current = next; setDraft(next); onCommit(next); }} />;
    }
    return <PhiMultiSelectControl value={values} disabled={disabled} options={editor.options ?? []}
      size="small" variant={variant} style={{ width: "100%" }}
      onChange={(next) => { draftRef.current = next; setDraft(next); onCommit(next); }} />;
  }
  return <PhiTextControl value={typeof draft === "string" ? draft : ""} variant={variant}
    inputRef={textInputRef}
    disabled={disabled} allowClear={!editor.required} size="small" style={{ width: "100%" }}
    onChange={(next) => { draftRef.current = next; setDraft(next); }} onBlur={commitOnBlur}
    onPressEnter={() => {
      skipNextBlurRef.current = true;
      commit();
      textInputRef.current?.blur();
    }} />;
}

function buildRowMove<TRow extends Record<string, unknown>>(
  rows: readonly TRow[],
  rowIdentityPath: string,
  parentRowIdentityPath: string | undefined,
  movedRowIdentity: PhiTableRowIdentity,
  targetRowIdentity: PhiTableRowIdentity,
  placement: "before" | "after",
): PhiTableControlRowMove | null {
  const target = rows.find((row) => String(readIdentity(row, rowIdentityPath)) === String(targetRowIdentity));
  if (!target || String(movedRowIdentity) === String(targetRowIdentity)) return null;
  const parent = parentRowIdentityPath ? readIdentity(target, parentRowIdentityPath) : null;
  return {
    movedRowIdentity,
    targetParentRowIdentity: parent,
    beforeRowIdentity: placement === "before" ? targetRowIdentity : null,
    afterRowIdentity: placement === "after" ? targetRowIdentity : null,
  };
}

export function PhiTableControl<TRow extends Record<string, unknown>>({
  rows,
  rowIdentityPath,
  columns,
  columnOrder,
  sortingMode,
  sorts,
  onSortsChange,
  columnReordering = false,
  onColumnOrderChange,
  rowSelection,
  pagination = false,
  tree,
  rowReordering,
  editing,
  loading = false,
  bordered,
  striped = false,
  showHeader,
  footer,
  summary,
  size,
  emptyText,
  layout,
  rowStyle,
  onRowActivate,
  onExternalRowDragOver,
  onExternalRowDrop,
  onExternalDragOver,
  onExternalDrop,
}: PhiTableControlProps<TRow>) {
  const { token } = usePhiConfig();
  const [editingRowIdentity, setEditingRowIdentity] = useState<PhiTableRowIdentity | null>(null);
  const [rowEditPatch, setRowEditPatch] = useState<Readonly<Record<string, unknown>>>({});
  const [treeExpandAnimation, setTreeExpandAnimation] = useState<{
    identity: string;
    fromExpanded: boolean;
    toExpanded: boolean;
  } | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    identity: PhiTableRowIdentity;
    placement: "before" | "after" | "child";
  } | null>(null);
  const dropTargetRef = useRef<typeof dropTarget>(null);
  const detectedDropTargetRef = useRef<typeof dropTarget | undefined>(undefined);
  const [activeDragIdentity, setActiveDragIdentity] = useState<string | null>(null);
  const [externalAppendActive, setExternalAppendActive] = useState(false);
  const [activeDragRowHeight, setActiveDragRowHeight] = useState(0);
  const dragPointerStartY = useRef<number | null>(null);
  const dragPointerClientY = useRef<number | null>(null);
  const dragRowRects = useRef(new Map<string, DOMRect>());
  const dragTableElement = useRef<HTMLTableElement | null>(null);
  const updateDropTarget = useCallback((target: typeof dropTarget) => {
    dropTargetRef.current = target;
    setDropTarget((current) => current && target &&
      String(current.identity) === String(target.identity) && current.placement === target.placement
      ? current
      : target);
  }, []);
  const isNoopSiblingPlacement = useCallback((
    activeIdentity: PhiTableRowIdentity,
    targetIdentity: PhiTableRowIdentity,
    placement: "before" | "after",
  ) => {
    const activeRow = rows.find((row) =>
      String(readIdentity(row, rowIdentityPath)) === String(activeIdentity));
    const targetRow = rows.find((row) =>
      String(readIdentity(row, rowIdentityPath)) === String(targetIdentity));
    if (!activeRow || !targetRow) return false;
    const activeParent = tree ? readIdentity(activeRow, tree.parentRowIdentityPath) : null;
    const targetParent = tree ? readIdentity(targetRow, tree.parentRowIdentityPath) : null;
    if (String(activeParent) !== String(targetParent)) return false;
    const siblings = rows.filter((row) => !tree ||
      String(readIdentity(row, tree.parentRowIdentityPath)) === String(targetParent));
    const activeIndex = siblings.findIndex((row) =>
      String(readIdentity(row, rowIdentityPath)) === String(activeIdentity));
    const targetIndex = siblings.findIndex((row) =>
      String(readIdentity(row, rowIdentityPath)) === String(targetIdentity));
    return placement === "before"
      ? activeIndex >= 0 && activeIndex + 1 === targetIndex
      : activeIndex > 0 && activeIndex - 1 === targetIndex;
  }, [rowIdentityPath, rows, tree]);
  const resolveRowDropTarget = useCallback((
    activeIdentity: PhiTableRowIdentity,
    targetRow: TRow,
    relativeY: number,
  ): typeof dropTarget => {
    const targetIdentity = readIdentity(targetRow, rowIdentityPath);
    if (targetIdentity == null || String(targetIdentity) === String(activeIdentity)) return null;
    const placement = relativeY < 1 / 3
      ? "before" as const
      : relativeY > 2 / 3
        ? "after" as const
        : rowReordering?.canAcceptChildren?.(targetRow) === true
          ? "child" as const
          : null;
    if (!placement) return null;
    if (placement !== "child" && isNoopSiblingPlacement(activeIdentity, targetIdentity, placement)) return null;
    return { identity: targetIdentity, placement };
  }, [isNoopSiblingPlacement, rowIdentityPath, rowReordering]);
  const detectRowCollision = useCallback<CollisionDetection>((input) => {
    const pointer = input.pointerCoordinates;
    let targetIdentity: string | null = null;
    if (pointer && dragTableElement.current) {
      const currentTarget = dropTargetRef.current;
      const pointedRow = document.elementFromPoint(pointer.x, pointer.y)
        ?.closest<HTMLTableRowElement>("tr[data-row-key]") ?? null;
      const pointedIdentity = pointedRow && dragTableElement.current.contains(pointedRow)
        ? pointedRow.getAttribute("data-row-key")
        : null;
      const matchingInitialRect = [...dragRowRects.current.entries()]
        .filter(([identity, rect]) => identity !== String(input.active.id) &&
          pointer.y >= rect.top && pointer.y <= rect.bottom)
        .sort((left, right) =>
          Math.abs(pointer.y - (left[1].top + left[1].height / 2)) -
          Math.abs(pointer.y - (right[1].top + right[1].height / 2)))[0];
      const initialIdentity = matchingInitialRect?.[0] ?? null;
      if (pointedIdentity && currentTarget && pointedIdentity === String(currentTarget.identity)) {
        targetIdentity = pointedIdentity;
      } else if (initialIdentity) {
        targetIdentity = initialIdentity;
      }
      if (currentTarget?.placement === "before") {
        const initialRect = dragRowRects.current.get(String(currentTarget.identity));
        const currentRow = [...dragTableElement.current.querySelectorAll<HTMLTableRowElement>("tr[data-row-key]")]
          .find((row) => row.getAttribute("data-row-key") === String(currentTarget.identity));
        const currentRect = currentRow?.getBoundingClientRect();
        if (!targetIdentity && initialRect && currentRect && currentRect.top > initialRect.top &&
          pointer.y >= initialRect.top && pointer.y <= currentRect.top) {
          targetIdentity = String(currentTarget.identity);
        }
      }
      if (!targetIdentity && pointedRow && dragTableElement.current.contains(pointedRow)) {
        if (pointedIdentity && pointedIdentity !== String(input.active.id)) targetIdentity = pointedIdentity;
      }
    }
    targetIdentity ??= dropTargetRef.current ? String(dropTargetRef.current.identity) : null;
    if (!targetIdentity) return closestCenter(input);
    const targetRow = rows.find((row) =>
      String(readIdentity(row, rowIdentityPath)) === targetIdentity);
    const targetElement = [...(dragTableElement.current
      ?.querySelectorAll<HTMLTableRowElement>("tr[data-row-key]") ?? [])]
      .find((row) => row.getAttribute("data-row-key") === targetIdentity);
    const targetRect = targetElement?.getBoundingClientRect() ?? dragRowRects.current.get(targetIdentity);
    if (targetRow && targetRect && pointer) {
      const relativeY = (pointer.y - targetRect.top) / Math.max(1, targetRect.height);
      detectedDropTargetRef.current = resolveRowDropTarget(input.active.id, targetRow, relativeY);
    } else {
      detectedDropTargetRef.current = null;
    }
    const collisions = input.droppableContainers.flatMap((container) =>
      String(container.id) === targetIdentity ? [{
        id: container.id,
        data: { droppableContainer: container, value: 0 },
      }] : []);
    return collisions.length > 0 ? collisions : closestCenter(input);
  }, [resolveRowDropTarget, rowIdentityPath, rows]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  useEffect(() => {
    if (activeDragIdentity == null) return;
    const trackPointer = (event: PointerEvent) => {
      dragPointerClientY.current = event.clientY;
    };
    window.addEventListener("pointermove", trackPointer, { capture: true, passive: true });
    return () => window.removeEventListener("pointermove", trackPointer, { capture: true });
  }, [activeDragIdentity]);
  const orderedColumns = useMemo(() => {
    const order = new Map(columnOrder.map((key, index) => [key, index]));
    return [...columns].sort((left, right) =>
      (order.get(left.key) ?? Number.MAX_SAFE_INTEGER) -
      (order.get(right.key) ?? Number.MAX_SAFE_INTEGER),
    );
  }, [columnOrder, columns]);
  const treeRowMeta = useMemo(() => {
    const result = new Map<string, { depth: number; hasChildren: boolean }>();
    if (!tree) return result;
    const parentByIdentity = new Map<string, string | null>();
    const identitiesWithChildren = new Set<string>();
    for (const row of rows) {
      const identity = readIdentity(row, rowIdentityPath);
      if (identity == null) continue;
      const parentIdentity = readIdentity(row, tree.parentRowIdentityPath);
      parentByIdentity.set(String(identity), parentIdentity == null ? null : String(parentIdentity));
      if (parentIdentity != null) identitiesWithChildren.add(String(parentIdentity));
    }
    for (const identity of parentByIdentity.keys()) {
      let depth = 0;
      let parentIdentity = parentByIdentity.get(identity) ?? null;
      const visited = new Set([identity]);
      while (parentIdentity != null && parentByIdentity.has(parentIdentity) && !visited.has(parentIdentity)) {
        visited.add(parentIdentity);
        depth += 1;
        parentIdentity = parentByIdentity.get(parentIdentity) ?? null;
      }
      result.set(identity, { depth, hasChildren: identitiesWithChildren.has(identity) });
    }
    return result;
  }, [rowIdentityPath, rows, tree]);
  const expandedTreeRowIdentitySet = useMemo(
    () => new Set(tree?.expandedRowIdentities.map(String) ?? []),
    [tree?.expandedRowIdentities],
  );
  const toggleTreeRow = useCallback((identity: PhiTableRowIdentity) => {
    if (!tree) return;
    const next = new Set(tree.expandedRowIdentities.map(String));
    const normalizedIdentity = String(identity);
    const fromExpanded = next.has(normalizedIdentity);
    if (fromExpanded) next.delete(normalizedIdentity);
    else next.add(normalizedIdentity);
    setTreeExpandAnimation({ identity: normalizedIdentity, fromExpanded, toExpanded: !fromExpanded });
    tree.onExpandedRowIdentitiesChange([...next]);
  }, [tree]);

  const moveByOffset = useCallback((row: TRow, offset: -1 | 1) => {
    if (!rowReordering?.enabled) return;
    const identity = readIdentity(row, rowIdentityPath);
    const parent = tree ? readIdentity(row, tree.parentRowIdentityPath) : null;
    const siblings = rows.filter((candidate) => !tree ||
      String(readIdentity(candidate, tree.parentRowIdentityPath)) === String(parent));
    const index = siblings.findIndex((candidate) =>
      String(readIdentity(candidate, rowIdentityPath)) === String(identity));
    const target = siblings[index + offset];
    const targetIdentity = target ? readIdentity(target, rowIdentityPath) : null;
    if (identity == null || targetIdentity == null) return;
    const move = buildRowMove(rows, rowIdentityPath, tree?.parentRowIdentityPath, identity, targetIdentity,
      offset < 0 ? "before" : "after");
    if (move) rowReordering.onMove(move);
  }, [rowIdentityPath, rowReordering, rows, tree]);

  const renderRowOrderingControls = useCallback((row: TRow) => {
    if (!rowReordering?.enabled) return null;
    const identity = readIdentity(row, rowIdentityPath);
    const parent = tree ? readIdentity(row, tree.parentRowIdentityPath) : null;
    const siblings = rows.filter((candidate) => !tree ||
      String(readIdentity(candidate, tree.parentRowIdentityPath)) === String(parent));
    const siblingIndex = siblings.findIndex((candidate) =>
      String(readIdentity(candidate, rowIdentityPath)) === String(identity));
    return (
      <PhiTableRowPositionControls
        moveUpLabel={rowReordering.moveUpLabel}
        moveDownLabel={rowReordering.moveDownLabel}
        canMoveUp={siblingIndex > 0}
        canMoveDown={siblingIndex >= 0 && siblingIndex < siblings.length - 1}
        onMoveUp={() => moveByOffset(row, -1)}
        onMoveDown={() => moveByOffset(row, 1)}
      />
    );
  }, [moveByOffset, rowIdentityPath, rowReordering, rows, tree]);

  const antdColumns = useMemo<TableColumnsType<TRow>>(() => orderedColumns.map((column, index) => {
    const sortField = column.sortField ?? column.fieldPath;
    const activeSortIndex = sorts.findIndex((sort) => sort.key === sortField);
    const activeSort = activeSortIndex >= 0 ? sorts[activeSortIndex] : null;
    const reorderIndex = columnOrder.indexOf(column.key);
    const canReorder = columnReordering && column.fixed === undefined && reorderIndex >= 0;
    const columnStyle = buildColumnStyle(column.sizing);
    const title = canReorder ? (
      <Flex align="center" gap={4}>
        <span>{column.title}</span>
        <Tooltip title="Move column left">
          <Button
            type="text"
            size="small"
            icon={<LeftOutlined />}
            disabled={reorderIndex === 0}
            aria-label="Move column left"
            onClick={(event) => {
              event.stopPropagation();
              onColumnOrderChange?.(moveColumn(columnOrder, column.key, -1));
            }}
          />
        </Tooltip>
        <Tooltip title="Move column right">
          <Button
            type="text"
            size="small"
            icon={<RightOutlined />}
            disabled={reorderIndex === columnOrder.length - 1}
            aria-label="Move column right"
            onClick={(event) => {
              event.stopPropagation();
              onColumnOrderChange?.(moveColumn(columnOrder, column.key, 1));
            }}
          />
        </Tooltip>
      </Flex>
    ) : column.title;
    return {
      key: column.key,
      columnKey: sortField,
      title,
      dataIndex: column.fieldPath,
      width: column.sizing?.mode === "fixed" ? column.sizing.width : undefined,
      align: column.align,
      ellipsis: column.ellipsis,
      fixed: column.fixed,
      sorter: sortingMode === "none" || !column.sortable
        ? undefined
        : sortingMode === "multiple"
          ? { multiple: orderedColumns.length - index }
          : true,
      sortOrder: activeSort?.direction === "ascending"
        ? "ascend"
        : activeSort?.direction === "descending"
          ? "descend"
          : undefined,
      render: (value: unknown, row: TRow) => {
        const identity = readIdentity(row, rowIdentityPath);
        const editor = column.editor
          ? {
              ...column.editor,
              disabled: column.editor.disabled || column.isEditorDisabled?.(row),
              loading: column.editor.loading || column.isEditorLoading?.(row),
            }
          : undefined;
        let content: ReactNode;
        if (editor && editing?.mode === "row" && identity != null &&
          String(identity) === String(editingRowIdentity)) {
          const editValue = rowEditPatch[column.fieldPath] ?? value;
          content = <EditableTableCell key={`${String(identity)}:${column.key}:${JSON.stringify(editValue)}`}
            value={editValue} editor={editor}
            onCommit={(next) => setRowEditPatch((current) => ({ ...current, [column.fieldPath]: next }))} />;
        } else {
          content = editor && column.onCommit
            ? <EditableTableCell key={`${String(identity)}:${column.key}:${JSON.stringify(value)}`}
                value={value} editor={editor}
                onCommit={(next) => column.onCommit?.(row, value, next)} />
            : column.render
              ? column.render(value, row)
              : value as ReactNode;
        }
        if (editor) {
          content = (
            <div style={{ minWidth: 0, width: "100%" }} onClick={(event) => event.stopPropagation()}>
              {content}
            </div>
          );
        }
        if (column.role === "actions" && rowReordering?.enabled) {
          return <Flex align="center" gap={2} wrap={false}>{content}{renderRowOrderingControls(row)}</Flex>;
        }
        if (tree && column.key === tree.expandColumnKey && identity != null) {
          const meta = treeRowMeta.get(String(identity)) ?? { depth: 0, hasChildren: false };
          const normalizedIdentity = String(identity);
          const animation = treeExpandAnimation?.identity === normalizedIdentity ? treeExpandAnimation : null;
          const expanded = animation?.toExpanded ?? expandedTreeRowIdentitySet.has(normalizedIdentity);
          return (
            <Flex align="center" wrap={false} style={{ minWidth: 0, width: "100%" }}>
              <span aria-hidden style={{ display: "inline-block", flex: "none", width: meta.depth * (tree.indentSize ?? 15) }} />
              {meta.hasChildren ? (
                <Button
                  type="text"
                  size="small"
                  icon={<PhiExpandIndicator
                    expanded={expanded}
                    animationFromExpanded={animation?.fromExpanded}
                    onAnimationEnd={animation ? () => setTreeExpandAnimation((current) =>
                      current?.identity === normalizedIdentity ? null : current) : undefined}
                  />}
                  aria-label={expanded ? "Collapse row" : "Expand row"}
                  style={{ flex: "none", minWidth: 24, width: 24 }}
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleTreeRow(identity);
                  }}
                />
              ) : <span aria-hidden style={{ display: "inline-block", flex: "none", width: 24 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>{content}</div>
            </Flex>
          );
        }
        return content;
      },
      onHeaderCell: () => ({ style: columnStyle }),
      onCell: () => ({ style: columnStyle }),
    };
  }), [
    columnOrder,
    columnReordering,
    onColumnOrderChange,
    orderedColumns,
    editing,
    editingRowIdentity,
    expandedTreeRowIdentitySet,
    rowEditPatch,
    renderRowOrderingControls,
    rowIdentityPath,
    rowReordering?.enabled,
    sortingMode,
    sorts,
    toggleTreeRow,
    tree,
    treeExpandAnimation,
    treeRowMeta,
  ]);

  const editableColumns = useMemo(() => columns.filter((column) => column.editor), [columns]);
  const rowEditingColumn = useMemo<TableColumnsType<TRow>>(() => editing ? [{
    key: "__row_edit__",
    title: null,
    width: 80,
    fixed: "right",
    render: (_value, row) => {
      const identity = readIdentity(row, rowIdentityPath);
      const active = identity != null && String(identity) === String(editingRowIdentity);
      const disabled = editing.isRowDisabled?.(row) ?? false;
      if (!active) {
        return <Tooltip title={editing.editLabel ?? "Edit row"}>
          <Button type="text" size="small" icon={<EditOutlined />} aria-label={editing.editLabel ?? "Edit row"}
            disabled={disabled || identity == null || editingRowIdentity != null}
            onClick={() => { setEditingRowIdentity(identity); setRowEditPatch({}); }} />
        </Tooltip>;
      }
      return <Flex align="center" gap={2}>
        <Tooltip title={editing.saveLabel ?? "Save row"}>
          <Button type="text" size="small" icon={<SaveOutlined />} aria-label={editing.saveLabel ?? "Save row"}
            disabled={disabled}
            onClick={() => {
              const originalValues = Object.fromEntries(
                editableColumns.map((column) => [column.fieldPath, readPhiTableControlValue(row, column.fieldPath)]),
              );
              editing.onCommit(row, originalValues, rowEditPatch);
              setEditingRowIdentity(null);
              setRowEditPatch({});
            }} />
        </Tooltip>
        <Tooltip title={editing.cancelLabel ?? "Cancel row editing"}>
          <Button type="text" size="small" icon={<CloseOutlined />} aria-label={editing.cancelLabel ?? "Cancel row editing"}
            onClick={() => { setEditingRowIdentity(null); setRowEditPatch({}); }} />
        </Tooltip>
      </Flex>;
    },
  }] : [], [editableColumns, editing, editingRowIdentity, rowEditPatch, rowIdentityPath]);

  const dataSource = useMemo(
    () => tree
      ? buildTreeRows(rows, rowIdentityPath, tree.parentRowIdentityPath)
      : [...rows],
    [rowIdentityPath, rows, tree],
  );
  const visibleRows = useMemo(
    () => tree
      ? flattenVisibleTreeRows(dataSource, rowIdentityPath, tree.expandedRowIdentities)
      : dataSource,
    [dataSource, rowIdentityPath, tree],
  );
  const loadingSkeletonRows = pagination === false
    ? 5
    : Math.min(8, Math.max(3, pagination.pageSize));
  const loadingRows = useMemo(() => Array.from({ length: loadingSkeletonRows }, (_, index) => ({
    [PHI_TABLE_LOADING_ROW]: index,
  }) as unknown as TRow), [loadingSkeletonRows]);
  const hasActionsColumn = orderedColumns.some((column) => column.role === "actions");
  const rowDragColumn = useMemo<TableColumnsType<TRow>>(() => rowReordering?.enabled ? [{
    key: "__row_drag__",
    title: null,
    fixed: "left" as const,
    width: 40,
    align: "center" as const,
    render: (_value: unknown, row: TRow) => {
      const identity = readIdentity(row, rowIdentityPath);
      return <PhiTableRowDragHandle dragLabel={rowReordering.dragLabel} disabled={identity == null} />;
    },
  }] : [], [rowIdentityPath, rowReordering]);
  const fallbackRowOrderingColumn = useMemo<TableColumnsType<TRow>>(() =>
    rowReordering?.enabled && !hasActionsColumn ? [{
      key: "__row_actions__",
      title: null,
      fixed: "right" as const,
      width: 96,
      render: (_value: unknown, row: TRow) => renderRowOrderingControls(row),
    }] : [], [hasActionsColumn, renderRowOrderingControls, rowReordering?.enabled]);
  const controlColumns = useMemo<TableColumnsType<TRow>>(() => {
    return [
      ...rowDragColumn,
      ...(rowSelection && !loading ? [Table.SELECTION_COLUMN] : []),
      ...antdColumns,
      ...rowEditingColumn,
      ...fallbackRowOrderingColumn,
    ];
  }, [antdColumns, fallbackRowOrderingColumn, loading, rowDragColumn, rowEditingColumn, rowSelection]);
  const loadingSkeletonWidths = useMemo(() => new Map<string, CSSProperties["width"]>(
    orderedColumns.flatMap((column) => {
      const width = column.sizing?.mode === "fixed"
        ? column.sizing.width
        : column.sizing?.minWidth;
      return width == null ? [] : [[column.key, width]];
    }),
  ), [orderedColumns]);
  const cellPaddingInline = size === "small"
    ? token.paddingXS
    : size === "medium"
      ? token.paddingSM
      : token.padding;
  const renderedColumns = useMemo<TableColumnsType<TRow>>(() => loading
    ? controlColumns.map((column) => column === Table.SELECTION_COLUMN
      ? column
      : ({
        ...column,
        sorter: undefined,
        sortOrder: undefined,
        render: () => {
          const columnKey = column.key == null ? null : String(column.key);
          const width = columnKey == null
            ? column.width
            : loadingSkeletonWidths.get(columnKey) ?? column.width;
          return <Skeleton.Input
            active
            size="small"
            style={buildLoadingSkeletonStyle(width, cellPaddingInline)}
          />;
        },
      }))
    : controlColumns, [cellPaddingInline, controlColumns, loading, loadingSkeletonWidths]);
  const renderedColumnKeys = useMemo(() => controlColumns.map((column, index) => {
    if (column === Table.SELECTION_COLUMN) return "__selection__";
    return column.key == null ? `__column_${index}` : String(column.key);
  }), [controlColumns]);
  const summaryNode = useMemo(() => {
    if (!summary || loading) return undefined;
    const fixed = summary.placement === "sticky-top"
      ? "top" as const
      : summary.placement === "sticky-bottom"
        ? "bottom" as const
        : false;
    return function PhiTableSummary() {
      return (
        <Table.Summary fixed={fixed}>
          {summary.rows.map((row) => {
            const resolvedCells = row.cells.flatMap((cell) => {
              const startIndex = renderedColumnKeys.indexOf(cell.columnKey);
              const throughIndex = renderedColumnKeys.indexOf(cell.throughColumnKey ?? cell.columnKey);
              if (startIndex < 0 || throughIndex < 0) return [];
              return [{ cell, startIndex: Math.min(startIndex, throughIndex), endIndex: Math.max(startIndex, throughIndex) }];
            });
            const cellByStart = new Map(resolvedCells.map((entry) => [entry.startIndex, entry]));
            let spannedThrough = -1;
            return (
              <Table.Summary.Row key={row.key}>
                {renderedColumnKeys.map((_columnKey, index) => {
                  if (index <= spannedThrough) return null;
                  const resolved = cellByStart.get(index);
                  if (resolved) spannedThrough = resolved.endIndex;
                  return (
                    <Table.Summary.Cell
                      key={resolved?.cell.key ?? `empty:${index}`}
                      index={index}
                      colSpan={resolved ? resolved.endIndex - resolved.startIndex + 1 : 1}
                      align={resolved?.cell.align}
                    >
                      {resolved?.cell.content}
                    </Table.Summary.Cell>
                  );
                })}
              </Table.Summary.Row>
            );
          })}
        </Table.Summary>
      );
    };
  }, [loading, renderedColumnKeys, summary]);
  const sortableRowIdentities = useMemo(() => visibleRows.flatMap((row) => {
    const identity = readIdentity(row, rowIdentityPath);
    return identity == null ? [] : [String(identity)];
  }), [rowIdentityPath, visibleRows]);
  const insertionGapIndex = useMemo(() => {
    if (!dropTarget) return null;
    const targetIndex = visibleRows.findIndex((row) =>
      String(readIdentity(row, rowIdentityPath)) === String(dropTarget.identity));
    if (targetIndex < 0 || dropTarget.placement === "before") return targetIndex < 0 ? null : targetIndex;
    if (!tree) return targetIndex + 1;
    const rowByIdentity = new Map(rows.flatMap((row) => {
      const identity = readIdentity(row, rowIdentityPath);
      return identity == null ? [] : [[String(identity), row] as const];
    }));
    const isDescendantOfTarget = (row: TRow) => {
      let parent = readIdentity(row, tree.parentRowIdentityPath);
      const visited = new Set<string>();
      while (parent != null && !visited.has(String(parent))) {
        if (String(parent) === String(dropTarget.identity)) return true;
        visited.add(String(parent));
        const parentRow = rowByIdentity.get(String(parent));
        parent = parentRow ? readIdentity(parentRow, tree.parentRowIdentityPath) : null;
      }
      return false;
    };
    let index = targetIndex + 1;
    while (index < visibleRows.length && isDescendantOfTarget(visibleRows[index])) index += 1;
    return index;
  }, [dropTarget, rowIdentityPath, rows, tree, visibleRows]);
  const normalizeDropTarget = useCallback((target: NonNullable<typeof dropTarget>) => {
    if (target.placement !== "after") return target;
    const targetIndex = visibleRows.findIndex((row) =>
      String(readIdentity(row, rowIdentityPath)) === String(target.identity));
    if (targetIndex < 0) return target;
    let nextIndex = targetIndex + 1;
    if (tree) {
      const rowByIdentity = new Map(rows.flatMap((row) => {
        const identity = readIdentity(row, rowIdentityPath);
        return identity == null ? [] : [[String(identity), row] as const];
      }));
      const isDescendantOfTarget = (row: TRow) => {
        let parent = readIdentity(row, tree.parentRowIdentityPath);
        const visited = new Set<string>();
        while (parent != null && !visited.has(String(parent))) {
          if (String(parent) === String(target.identity)) return true;
          visited.add(String(parent));
          const parentRow = rowByIdentity.get(String(parent));
          parent = parentRow ? readIdentity(parentRow, tree.parentRowIdentityPath) : null;
        }
        return false;
      };
      while (nextIndex < visibleRows.length && isDescendantOfTarget(visibleRows[nextIndex])) nextIndex += 1;
    }
    const targetRow = visibleRows[targetIndex];
    const nextRow = visibleRows[nextIndex];
    if (!targetRow || !nextRow) return target;
    if (tree) {
      const targetParent = readIdentity(targetRow, tree.parentRowIdentityPath);
      const nextParent = readIdentity(nextRow, tree.parentRowIdentityPath);
      if (String(targetParent) !== String(nextParent)) return target;
    }
    const nextIdentity = readIdentity(nextRow, rowIdentityPath);
    return nextIdentity == null ? target : { identity: nextIdentity, placement: "before" as const };
  }, [rowIdentityPath, rows, tree, visibleRows]);

  const resolveDndDropTarget = useCallback((event: DragMoveEvent | DragOverEvent | DragEndEvent) => {
    const activeRect = event.active.rect.current.translated ?? event.active.rect.current.initial;
    const fallbackRect = event.over?.rect ?? activeRect;
    if (!fallbackRect) return null;
    const pointerY = dragPointerClientY.current ?? (dragPointerStartY.current != null
      ? dragPointerStartY.current + event.delta.y
      : activeRect
        ? activeRect.top + activeRect.height / 2
        : fallbackRect.top + fallbackRect.height / 2);
    const overIdentity = event.over?.id;
    if (overIdentity == null || String(overIdentity) === String(event.active.id)) return null;
    const targetRow = rows.find((row) =>
      String(readIdentity(row, rowIdentityPath)) === String(overIdentity));
    if (!targetRow) return null;
    const targetElement = [...(dragTableElement.current
      ?.querySelectorAll<HTMLTableRowElement>("tr[data-row-key]") ?? [])]
      .find((row) => row.getAttribute("data-row-key") === String(overIdentity));
    const overRect = targetElement?.getBoundingClientRect() ??
      dragRowRects.current.get(String(overIdentity)) ?? event.over?.rect ?? fallbackRect;
    const relativeY = (pointerY - overRect.top) / Math.max(1, overRect.height);
    return resolveRowDropTarget(event.active.id, targetRow, relativeY);
  }, [resolveRowDropTarget, rowIdentityPath, rows]);
  const handleRowDragMove = useCallback((event: DragMoveEvent) => {
    updateDropTarget(detectedDropTargetRef.current !== undefined
      ? detectedDropTargetRef.current
      : resolveDndDropTarget(event));
  }, [resolveDndDropTarget, updateDropTarget]);
  const handleRowDragOver = useCallback((event: DragOverEvent) => {
    updateDropTarget(detectedDropTargetRef.current !== undefined
      ? detectedDropTargetRef.current
      : resolveDndDropTarget(event));
  }, [resolveDndDropTarget, updateDropTarget]);
  const handleRowDragStart = useCallback((event: DragStartEvent) => {
    const activatorEvent = event.activatorEvent;
    const activeRow = [...document.querySelectorAll<HTMLTableRowElement>("tr[data-row-key]")]
      .find((row) => row.getAttribute("data-row-key") === String(event.active.id)) ?? null;
    dragTableElement.current = activeRow?.closest("table") ?? null;
    setActiveDragRowHeight(activeRow?.getBoundingClientRect().height ?? 0);
    dragRowRects.current = new Map(
      [...(dragTableElement.current?.querySelectorAll<HTMLTableRowElement>("tr[data-row-key]") ?? [])].flatMap((row) => {
        const identity = row.getAttribute("data-row-key");
        return identity ? [[identity, row.getBoundingClientRect()] as const] : [];
      }),
    );
    dragPointerStartY.current = "clientY" in activatorEvent && typeof activatorEvent.clientY === "number"
      ? activatorEvent.clientY
      : null;
    dragPointerClientY.current = dragPointerStartY.current;
    detectedDropTargetRef.current = undefined;
    setActiveDragIdentity(String(event.active.id));
    updateDropTarget(null);
  }, [updateDropTarget]);
  const handleRowDragEnd = useCallback((event: DragEndEvent) => {
    const rawTarget = detectedDropTargetRef.current !== undefined
      ? detectedDropTargetRef.current
      : resolveDndDropTarget(event) ?? dropTarget;
    const target = rawTarget ? normalizeDropTarget(rawTarget) : null;
    dragPointerStartY.current = null;
    dragPointerClientY.current = null;
    dragRowRects.current.clear();
    detectedDropTargetRef.current = undefined;
    if (!rowReordering?.enabled || !target) {
      dragTableElement.current = null;
      setActiveDragRowHeight(0);
      setActiveDragIdentity(null);
      updateDropTarget(null);
      return;
    }
    const movedRow = rows.find((row) =>
      String(readIdentity(row, rowIdentityPath)) === String(event.active.id));
    const movedIdentity = movedRow ? readIdentity(movedRow, rowIdentityPath) : null;
    if (movedIdentity == null) {
      dragTableElement.current = null;
      setActiveDragRowHeight(0);
      setActiveDragIdentity(null);
      updateDropTarget(null);
      return;
    }
    const move = target.placement === "child"
      ? {
          movedRowIdentity: movedIdentity,
          targetParentRowIdentity: target.identity,
          beforeRowIdentity: null,
          afterRowIdentity: null,
        }
      : buildRowMove(
          rows,
          rowIdentityPath,
          tree?.parentRowIdentityPath,
          movedIdentity,
          target.identity,
          target.placement,
        );
    if (move) {
      flushSync(() => {
        updateDropTarget(null);
        rowReordering.onMove(move);
      });
    }
    dragTableElement.current = null;
    setActiveDragRowHeight(0);
    setActiveDragIdentity(null);
    if (!move) updateDropTarget(null);
  }, [
    dropTarget,
    normalizeDropTarget,
    resolveDndDropTarget,
    rowIdentityPath,
    rowReordering,
    rows,
    tree?.parentRowIdentityPath,
    updateDropTarget,
  ]);

  const antdRowSelection = rowSelection
    ? ({
        type: rowSelection.mode === "single" ? "radio" : "checkbox",
        fixed: rowReordering?.enabled || orderedColumns.some((column) => column.fixed === "left"),
        preserveSelectedRowKeys: rowSelection.preserveSelectedRowIdentities ?? true,
        selectedRowKeys: [...rowSelection.selectedRowIdentities],
        onChange: (keys) => rowSelection.onChange(normalizeSelectedKeys(keys)),
        getCheckboxProps: (row) => ({ disabled: rowSelection.isRowDisabled?.(row) ?? false }),
      } satisfies TableRowSelection<TRow>)
    : undefined;

  const table = (
    <Table<TRow>
      className={[styles.root, footer && !loading ? styles.withFooter : null].filter(Boolean).join(" ")}
      style={{ "--phi-table-striped-row-background": token.colorFillAlter } as CSSProperties}
      rowKey={(row) => loading
        ? `__phi_table_loading_${String((row as Record<PropertyKey, unknown>)[PHI_TABLE_LOADING_ROW])}`
        : String(readIdentity(row, rowIdentityPath))}
      columns={renderedColumns}
      dataSource={loading ? loadingRows : dataSource}
      bordered={bordered}
      showHeader={showHeader}
      tableLayout={layout.mode}
      size={size}
      rowClassName={(_row, index) => striped && index % 2 === 1 ? styles.stripedRow : ""}
      rowSelection={loading ? undefined : antdRowSelection}
      components={rowReordering?.enabled && !loading ? { body: { row: PhiTableSortableRow } } : undefined}
      scroll={layout.overflowX === "auto" ? { x: true } : undefined}
      pagination={pagination === false ? false : {
        current: pagination.page,
        pageSize: pagination.pageSize,
        total: pagination.total,
        pageSizeOptions: pagination.pageSizeOptions?.map(String),
        showSizeChanger: pagination.showSizeChanger,
        onChange: pagination.onChange,
      }}
      footer={footer && !loading ? () => (
        <Flex
          align="center"
          justify={footer.align ?? "start"}
          gap="small"
          wrap
        >
          {footer.content}
        </Flex>
      ) : undefined}
      summary={summaryNode}
      expandable={tree && !loading ? {
        childrenColumnName: "__phiTableChildren",
        showExpandColumn: false,
        expandedRowKeys: [...tree.expandedRowIdentities],
        expandRowByClick: tree.expandRowByClick,
        indentSize: tree.indentSize,
        onExpandedRowsChange: (keys) => tree.onExpandedRowIdentitiesChange(normalizeSelectedKeys(keys)),
      } : undefined}
      onRow={(row) => loading ? { style: { pointerEvents: "none" } } : ({
        onDragOver: onExternalRowDragOver ? (event) => {
          event.preventDefault();
          const identity = readIdentity(row, rowIdentityPath);
          if (identity == null) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          const childTarget = rowReordering?.canAcceptChildren?.(row) === true &&
            event.clientY >= bounds.top + bounds.height * 0.25 &&
            event.clientY <= bounds.top + bounds.height * 0.75;
          const placement = childTarget ? "child" : event.clientY < bounds.top + bounds.height / 2 ? "before" : "after";
          setDropTarget((current) => current && String(current.identity) === String(identity) &&
            current.placement === placement ? current : { identity, placement });
          onExternalRowDragOver?.(event, row, placement);
        } : undefined,
        onDrop: onExternalRowDrop ? (event) => {
          event.preventDefault();
          const identity = readIdentity(row, rowIdentityPath);
          const placement = identity == null || !dropTarget || String(dropTarget.identity) !== String(identity)
            ? "after"
            : dropTarget.placement;
          onExternalRowDrop?.(event, row, placement);
          setDropTarget(null);
        } : undefined,
        onClick: onRowActivate ? () => onRowActivate(row) : undefined,
        style: {
          ...rowStyle?.(row),
          ...(dropTarget && String(dropTarget.identity) === String(readIdentity(row, rowIdentityPath)) ? {
          boxShadow: dropTarget.placement === "before"
            ? `inset 0 3px 0 ${token.colorPrimary}`
            : dropTarget.placement === "after"
              ? `inset 0 -3px 0 ${token.colorPrimary}`
              : `inset 0 0 0 2px ${token.colorPrimary}`,
          background: dropTarget.placement === "child" ? token.colorPrimaryBg : undefined,
          } : {}),
        },
      })}
      onChange={(_, __, sorter) => {
        if (sortingMode === "none" || !onSortsChange) return;
        const activeSorters = (Array.isArray(sorter) ? sorter : [sorter])
          .filter((entry) => entry.order && typeof entry.columnKey === "string")
          .map((entry) => ({
            key: String(entry.columnKey),
            direction: entry.order === "descend" ? "descending" as const : "ascending" as const,
          }));
        onSortsChange(sortingMode === "single" ? activeSorters.slice(0, 1) : activeSorters);
      }}
      locale={{
        emptyText,
      }}
    />
  );
  const renderedTable = rowReordering?.enabled && !loading ? (
    <DndContext
      sensors={sensors}
      autoScroll={{ threshold: { x: 0.08, y: 0.08 } }}
      collisionDetection={detectRowCollision}
      onDragStart={handleRowDragStart}
      onDragMove={handleRowDragMove}
      onDragOver={handleRowDragOver}
      onDragEnd={handleRowDragEnd}
      onDragCancel={() => {
        dragPointerStartY.current = null;
        dragPointerClientY.current = null;
        dragRowRects.current.clear();
        detectedDropTargetRef.current = undefined;
        dragTableElement.current = null;
        setActiveDragRowHeight(0);
        setActiveDragIdentity(null);
        updateDropTarget(null);
      }}
    >
      <SortableContext items={sortableRowIdentities} strategy={phiTableInsertionStrategy}>
        <PhiTableDragVisualStateContext.Provider value={{
          activeIdentity: activeDragIdentity,
          insertionGapIndex,
          insertionGapHeight: activeDragRowHeight,
        }}>
          {table}
        </PhiTableDragVisualStateContext.Provider>
      </SortableContext>
    </DndContext>
  ) : table;
  const constrainedTable = (
    <div style={{ width: "100%", maxWidth: "100%", minWidth: 0, overflow: "hidden" }}>
      {renderedTable}
    </div>
  );
  return onExternalDragOver || onExternalDrop ? (
    <div
      onDragOver={(event) => {
        if (event.defaultPrevented) {
          setExternalAppendActive(false);
          return;
        }
        onExternalDragOver?.(event);
        if (event.defaultPrevented) setExternalAppendActive(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setExternalAppendActive(false);
      }}
      onDrop={(event) => {
        if (event.defaultPrevented) return;
        onExternalDrop?.(event);
        setExternalAppendActive(false);
      }}
      style={{
        width: "100%",
        minWidth: 0,
        outline: externalAppendActive ? `2px solid ${token.colorSuccess}` : undefined,
        outlineOffset: 2,
      }}
    >
      {constrainedTable}
    </div>
  ) : constrainedTable;
}
