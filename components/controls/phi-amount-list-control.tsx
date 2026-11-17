import type { ReactNode } from "react";

import type { PhiControlSize } from "../../types/control";

/**
 * Lines and sums whose amounts stand in one column: a cart, a checkout, an order, a subscription's
 * sign-up, a receipt.
 *
 * **It knows nothing about money.** An amount is text somebody else has already formatted, in whatever
 * currency and locale the surface speaks. What this Control owns is the one thing a stack of rows cannot
 * give it: every amount -- the items' and the totals' -- is in the same grid column, so their right edges
 * are the same line and, with tabular digits, the figures stand digit under digit. Separate flex rows
 * cannot do that; each one sizes its amount to itself.
 *
 * **One grid, rows through `subgrid`.** The list is a four-column grid -- media, text, controls, amount --
 * and an item row and a total row are subgrids of it, so the amount column is sized by the widest amount
 * of the whole list. `display: contents` would also share the columns, but it drops the row's box: no
 * divider on a total, no role on a flattened element in some browsers. Rows are boxes, so `subgrid`.
 *
 * **Narrow is decided by the list's own width**, not the viewport's (`@container`, below 30rem): the item
 * becomes two lines -- media and text, then controls and amount -- and the amount stays in the same
 * column. Totals keep label left and amount right at every width. The container query needs
 * `container-type: inline-size`, so the list takes the width its parent gives it (`width: 100%`) and has
 * none of its own: in a shrink-to-fit parent -- an `inline-flex` or `fit-content` box -- it collapses to 0.
 *
 * **A list, with the sums as a description list.** The items are a `ul`: each is one thing with a name,
 * free controls and an amount, and a table would need column headers that nothing here has (the
 * controls cell has no name, the text cell is a title and a line). The sums are label/amount pairs, which
 * is what `dl` says. The `ul` carries `role="list"` because list-style resets drop the role in Safari.
 *
 * **It is display, with no data source.** It sorts nothing, pages nothing and edits nothing; the
 * quantity field or the remove button is whatever the surface passes as `controls`. It is not the Table
 * Widget ([TABLES.md](../../TABLES.md)). It renders on the server: no state, no Ant Design, no theme hook;
 * the rules are `styles/amount-list.css`.
 */
export type PhiAmountListItem = {
  key: string;
  /** The name of the line. It wraps; it is never cut off. */
  title: ReactNode;
  /** A second, quieter line under the title: "2 x 12,00 CHF", "per month". */
  description?: ReactNode;
  /** A small picture or icon before the title. */
  media?: ReactNode;
  /** Whatever the line can be operated with: a quantity field, a remove button. */
  controls?: ReactNode;
  /** The amount, already formatted. */
  amount: ReactNode;
  /** Quiet, under the amount: "incl. VAT". */
  amountNote?: ReactNode;
};

export type PhiAmountListTotal = {
  key: string;
  label: ReactNode;
  /** The amount, already formatted. */
  amount: ReactNode;
  /** Quiet, under the label. */
  note?: ReactNode;
  /** `strong` is for the line that is the answer: the grand total. */
  emphasis?: "normal" | "strong";
  /** A rule above this line, in the Theme's line colour. */
  divided?: boolean;
};

export type PhiAmountListControlProps = {
  items: readonly PhiAmountListItem[];
  totals?: readonly PhiAmountListTotal[];
  size?: PhiControlSize;
  /** Stands in place of the list when there are no items and no totals. */
  emptyText?: ReactNode;
  ariaLabel?: string;
};

export function PhiAmountListControl({
  items,
  totals,
  size = "medium",
  emptyText,
  ariaLabel,
}: PhiAmountListControlProps) {
  const hasTotals = totals != null && totals.length > 0;
  if (items.length === 0 && !hasTotals) {
    return emptyText != null ? <div className="phi-amount-list__empty">{emptyText}</div> : null;
  }

  return (
    <div
      className={`phi-amount-list phi-amount-list--${size}`}
      role={ariaLabel ? "group" : undefined}
      aria-label={ariaLabel}
    >
      {items.length > 0 ? (
        <ul className="phi-amount-list__items" role="list">
          {items.map((item) => (
            <li key={item.key} className="phi-amount-list__item" role="listitem">
              {item.media != null ? <div className="phi-amount-list__media">{item.media}</div> : null}
              <div className="phi-amount-list__text">
                <div className="phi-amount-list__title">{item.title}</div>
                {item.description != null ? (
                  <div className="phi-amount-list__description">{item.description}</div>
                ) : null}
              </div>
              {item.controls != null ? <div className="phi-amount-list__controls">{item.controls}</div> : null}
              <div className="phi-amount-list__amount">
                <div>{item.amount}</div>
                {item.amountNote != null ? <div className="phi-amount-list__note">{item.amountNote}</div> : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      {hasTotals ? (
        <dl className="phi-amount-list__totals">
          {totals.map((total) => {
            const className = [
              "phi-amount-list__total",
              total.emphasis === "strong" ? "phi-amount-list__total--strong" : null,
              total.divided ? "phi-amount-list__total--divided" : null,
            ].filter(Boolean).join(" ");
            return (
              <div key={total.key} className={className}>
                <dt className="phi-amount-list__label">
                  <span>{total.label}</span>
                  {total.note != null ? <span className="phi-amount-list__note">{total.note}</span> : null}
                </dt>
                <dd className="phi-amount-list__amount">{total.amount}</dd>
              </div>
            );
          })}
        </dl>
      ) : null}
    </div>
  );
}
