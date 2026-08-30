import type {
  PhiTableProviderRowMoveMutationRequest,
  PhiTableRowIdentity,
} from "../types/table-widget";

type TableRow = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function readPhiTableRowValue(row: TableRow, path: string) {
  return path.split(".").filter(Boolean).reduce<unknown>(
    (current, segment) => isRecord(current) ? current[segment] : undefined,
    row,
  );
}

export function readPhiTableRowIdentity(row: TableRow, path: string): PhiTableRowIdentity | null {
  const value = readPhiTableRowValue(row, path);
  return typeof value === "string" || (typeof value === "number" && Number.isFinite(value))
    ? value
    : null;
}

export function patchPhiTableRowValue(row: TableRow, path: string, value: unknown): TableRow {
  const segments = path.split(".").filter(Boolean);
  if (segments.length === 0) return row;
  const patchAt = (current: unknown, index: number): Record<string, unknown> => {
    const source = isRecord(current) ? current : {};
    const key = segments[index];
    return {
      ...source,
      [key]: index === segments.length - 1 ? value : patchAt(source[key], index + 1),
    };
  };
  return patchAt(row, 0);
}

function identityEquals(left: PhiTableRowIdentity | null, right: PhiTableRowIdentity | null) {
  return left != null && right != null && String(left) === String(right);
}

export function patchPhiTableBindingRows(
  rows: readonly TableRow[],
  rowIdentityPath: string,
  rowIdentity: PhiTableRowIdentity,
  patch: Readonly<Record<string, unknown>>,
) {
  return rows.map((row) => {
    if (!identityEquals(readPhiTableRowIdentity(row, rowIdentityPath), rowIdentity)) return row;
    return Object.entries(patch).reduce(
      (current, [path, value]) => patchPhiTableRowValue(current, path, value),
      row,
    );
  });
}

export function movePhiTableBindingRows(
  rows: readonly TableRow[],
  rowIdentityPath: string,
  request: Pick<
    PhiTableProviderRowMoveMutationRequest,
    "movedRowIdentity" | "beforeRowIdentity" | "afterRowIdentity"
  >,
) {
  const sourceIndex = rows.findIndex((row) =>
    identityEquals(readPhiTableRowIdentity(row, rowIdentityPath), request.movedRowIdentity));
  if (sourceIndex < 0) return rows;
  const next = [...rows];
  const [moved] = next.splice(sourceIndex, 1);
  const beforeIndex = request.beforeRowIdentity == null
    ? -1
    : next.findIndex((row) => identityEquals(readPhiTableRowIdentity(row, rowIdentityPath), request.beforeRowIdentity));
  const afterIndex = request.afterRowIdentity == null
    ? -1
    : next.findIndex((row) => identityEquals(readPhiTableRowIdentity(row, rowIdentityPath), request.afterRowIdentity));
  const targetIndex = beforeIndex >= 0 ? beforeIndex : afterIndex >= 0 ? afterIndex + 1 : next.length;
  next.splice(targetIndex, 0, moved);
  return next;
}

export function movePhiTableBindingTreeRows(
  rows: readonly TableRow[],
  rowIdentityPath: string,
  parentRowIdentityPath: string,
  request: Pick<
    PhiTableProviderRowMoveMutationRequest,
    "movedRowIdentity" | "targetParentRowIdentity" | "beforeRowIdentity" | "afterRowIdentity"
  >,
) {
  const moved = movePhiTableBindingRows(rows, rowIdentityPath, request);
  return moved.map((row) => identityEquals(readPhiTableRowIdentity(row, rowIdentityPath), request.movedRowIdentity)
    ? patchPhiTableRowValue(row, parentRowIdentityPath, request.targetParentRowIdentity)
    : row);
}

export function restorePhiTableBindingRowOrder(
  currentRows: readonly TableRow[],
  previousRows: readonly TableRow[],
  rowIdentityPath: string,
) {
  const currentByIdentity = new Map(currentRows.flatMap((row) => {
    const identity = readPhiTableRowIdentity(row, rowIdentityPath);
    return identity == null ? [] : [[String(identity), row] as const];
  }));
  const restored = previousRows.flatMap((row) => {
    const identity = readPhiTableRowIdentity(row, rowIdentityPath);
    if (identity == null) return [];
    const current = currentByIdentity.get(String(identity));
    currentByIdentity.delete(String(identity));
    return current ? [current] : [];
  });
  return [...restored, ...currentByIdentity.values()];
}
