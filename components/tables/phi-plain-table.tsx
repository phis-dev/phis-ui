import type { ReactNode } from "react";

import styles from "./phi-plain-table.module.css";

export type PhiPlainTableAlign = "left" | "center" | "right" | null;

export type PhiPlainTableColumn = {
  key: string;
  title: ReactNode;
  align?: PhiPlainTableAlign;
};

export type PhiPlainTableRow = {
  key: string;
  /** One cell per column, in column order. A missing cell renders empty. */
  cells: readonly ReactNode[];
};

/**
 * A table to read, not to work with.
 *
 * Markdown tables and other content that only shows rows use this rather than `PhiTableControl`. The
 * Control carries sorting, pagination, inline editors for every column kind and drag reordering, and a
 * page that renders it pays for all of them; this is a `<table>` and a stylesheet, with nothing to
 * hydrate. It holds no hooks and no directive, so a Server Component can render it as well.
 *
 * Styled from Ant Design's CSS variables, so it follows the Theme and the colour scheme without reading
 * a token in JavaScript. One look for now -- a line under the head and between rows; the presentation
 * variants are to be shared with the Table Control once that has them.
 */
export function PhiPlainTable({
  columns,
  rows,
}: {
  columns: readonly PhiPlainTableColumn[];
  rows: readonly PhiPlainTableRow[];
}) {
  return (
    <div className={styles.scroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" style={column.align ? { textAlign: column.align } : undefined}>
                {column.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              {columns.map((column, columnIndex) => (
                <td key={column.key} style={column.align ? { textAlign: column.align } : undefined}>
                  {row.cells[columnIndex] ?? null}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
