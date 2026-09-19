import type { PhiSignalRouteSet } from "./signals";
import type {
  PhiTableSourceBinding,
  PhiTableTagColor,
  PhiTableTagVariant,
  PhiTableValueRenderer,
} from "./table-widget";

/**
 * One named value out of a record.
 *
 * **It is a table column without the table.** `PhiTableColumnDefinition` minus sorting, width, sticky,
 * hiding and the editor -- everything a column needs because it stands in a grid of hundreds of rows,
 * and nothing a value needs because it is being read. What is left is the part that was never about the
 * table: which Provider field, what it is called, and how it is drawn.
 *
 * That is deliberate rather than convenient. A record of a table's rows is the same data read one at a
 * time, so `datetime` has to mean there what it means in the column beside it, and `valueMap` has to
 * turn a status code into the same word. `renderPhiValueContent` is the single answer to that; the only
 * thing this type adds is `full`, because a record has lines and a cell does not.
 */
export type PhiRecordFieldDefinition = {
  key: string;
  /** The Provider field this reads, dotted for a nested one. */
  fieldKey: string;
  /** What the value is called. */
  label: string;
  renderer?: PhiTableValueRenderer;
  valueMap?: Readonly<Record<string, string>>;
  tagColorMap?: Readonly<Record<string, PhiTableTagColor>>;
  tagVariant?: PhiTableTagVariant;
  /** The rest of the line, for a value too long to share it -- a message, a stack, a JSON object. */
  full?: boolean;
};

export type PhiRecordWidgetPresentation = {
  /** A `grid` is a record read closely, with cells and rules; a `list` is a summary read once. */
  appearance: "grid" | "list";
  /** How many values stand side by side from `md` up. */
  columns: number;
  fields: readonly PhiRecordFieldDefinition[];
};

/**
 * **Which record to show arrives as a signal.** The Widget does not know the table it belongs to and
 * does not read a store: a row action carries a row identity onto the bus, and whoever listens on that
 * route loads it. That is what lets the same Widget sit in an Overlay beside a table, on a page of its
 * own driven by a selection elsewhere, or twice with two different sources.
 */
export type PhiRecordWidgetConfig = {
  source: PhiTableSourceBinding | null;
  /** The row action whose signal opens a record -- `view` in every first-party table so far. */
  openActionKey: string;
  presentation: PhiRecordWidgetPresentation;
  signalRoutes?: PhiSignalRouteSet | null;
};
