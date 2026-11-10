import type { ReactNode } from "react";


export type PhiPlainTableAlign = "left" | "center" | "right" | null;

export type PhiPlainTableColumn = {
  key: string;
  title: ReactNode;
  align?: PhiPlainTableAlign;
  /** The column's width, a CSS length such as `30%`; absent, the browser shares the row out by content. */
  width?: string;
  /** Keep the column's cells on one line; the column then takes the width of its longest entry. */
  nowrap?: boolean;
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
    <div className="phi-plain-table__scroll">
      <table className="phi-plain-table">
        {columns.some((column) => column.width) ? (
          <colgroup>
            {columns.map((column) => (
              <col key={column.key} style={column.width ? { width: column.width } : undefined} />
            ))}
          </colgroup>
        ) : null}
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={column.nowrap ? "phi-plain-table__nowrap" : undefined}
                style={column.align ? { textAlign: column.align } : undefined}
              >
                {column.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              {columns.map((column, columnIndex) => (
                <td
                  key={column.key}
                  className={column.nowrap ? "phi-plain-table__nowrap" : undefined}
                  style={column.align ? { textAlign: column.align } : undefined}
                >
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
