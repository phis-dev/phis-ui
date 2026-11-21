/**
 * The words the table field says where its `config` names none: the add action, the remove action and
 * the empty table. The Form Widget puts Core's `widget:table` words here for every Form with a table
 * field, and the Form's own Label Set may say them differently under the same keys.
 */
export const PHI_FORM_TABLE_LABEL_KEYS = {
  add: "tableAdd",
  remove: "tableRemove",
  empty: "tableEmpty",
} as const;

/** The source wording of those words, for a Form rendered without a resolution behind it. */
export const PHI_FORM_TABLE_DEFAULT_LABELS = {
  add: "Add",
  remove: "Remove",
  empty: "No rows yet.",
} as const;
