import { isPhiRecord } from "../helpers/is-record";
import type {
  PhiTableActionSignalValue,
  PhiTableBindingParamsSignalValue,
  PhiTableColumnOrderSignalValue,
  PhiTableExpansionSignalValue,
  PhiTableQueryValue,
  PhiTableRowIdentity,
  PhiTableSelectionSignalValue,
} from "./table-widget";

/*
 * What a Table says on its Signals, read by whoever listens: the Table itself, the record and form
 * runtimes, Module Controllers, and the Overlay container, which opens on a Table action. The container is
 * on every page, and the rest of the table contract -- provider results, field validators, config readers
 * -- is not something a page without a Table should download, so the readers live apart from it.
 */

export function readRowIdentities(value: unknown): PhiTableRowIdentity[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.every((entry) =>
    typeof entry === "string" || (typeof entry === "number" && Number.isFinite(entry)))
    ? value as PhiTableRowIdentity[]
    : undefined;
}

export function isPhiTableQueryValue(value: unknown): value is PhiTableQueryValue {
  return value == null ||
    typeof value === "string" ||
    typeof value === "number" && Number.isFinite(value) ||
    typeof value === "boolean" ||
    Array.isArray(value) && value.every((entry) =>
      typeof entry === "string" || typeof entry === "number" && Number.isFinite(entry));
}

export function readPhiTableBindingParamsSignalValue(value: unknown): PhiTableBindingParamsSignalValue | null {
  if (!isPhiRecord(value) || !isPhiRecord(value.params) ||
    Object.values(value.params).some((paramValue) => !isPhiTableQueryValue(paramValue))) {
    return null;
  }
  return { params: value.params as Record<string, PhiTableQueryValue> };
}

export function readPhiTableSelectionSignalValue(value: unknown): PhiTableSelectionSignalValue | null {
  const selectedRowIdentities = isPhiRecord(value)
    ? readRowIdentities(value.selectedRowIdentities)
    : undefined;
  return selectedRowIdentities ? { selectedRowIdentities } : null;
}

export function readPhiTableColumnOrderSignalValue(value: unknown): PhiTableColumnOrderSignalValue | null {
  if (!isPhiRecord(value) || !Array.isArray(value.columnOrder) ||
    !value.columnOrder.every((entry) => typeof entry === "string" && entry.trim().length > 0)) {
    return null;
  }
  const columnOrder = value.columnOrder as string[];
  return new Set(columnOrder).size === columnOrder.length ? { columnOrder } : null;
}

export function readPhiTableExpansionSignalValue(value: unknown): PhiTableExpansionSignalValue | null {
  const expandedRowIdentities = isPhiRecord(value)
    ? readRowIdentities(value.expandedRowIdentities)
    : undefined;
  return expandedRowIdentities ? { expandedRowIdentities } : null;
}

export function readPhiTableActionSignalValue(value: unknown): PhiTableActionSignalValue | null {
  if (!isPhiRecord(value) || typeof value.actionKey !== "string" || !value.actionKey.trim()) {
    return null;
  }
  const selectedRowIdentities = readRowIdentities(value.selectedRowIdentities);
  if (!selectedRowIdentities) return null;
  const rowIdentity = value.rowIdentity;
  if (rowIdentity !== undefined && rowIdentity !== null &&
    typeof rowIdentity !== "string" &&
    (typeof rowIdentity !== "number" || !Number.isFinite(rowIdentity))) {
    return null;
  }
  if (value.actionValue !== undefined && !isPhiTableQueryValue(value.actionValue)) {
    return null;
  }
  return {
    actionKey: value.actionKey.trim(),
    rowIdentity: rowIdentity as PhiTableRowIdentity | null | undefined,
    selectedRowIdentities,
    actionValue: value.actionValue as PhiTableQueryValue,
  };
}
