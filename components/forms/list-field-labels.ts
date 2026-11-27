/**
 * The words the list field says where its `config` names none: its add, edit and remove actions, the
 * empty list, the entry dialog's two buttons, the question before a removal and the refusal of an entry
 * key another entry holds. The Form Widget puts Core's `widget:table` words here for every Form with a
 * list field, and the Form's own Label Set may say them differently under the same keys.
 */
export const PHI_FORM_LIST_LABEL_KEYS = {
  add: "listAdd",
  edit: "listEdit",
  remove: "listRemove",
  empty: "listEmpty",
  apply: "listApply",
  cancel: "listCancel",
  removeTitle: "listRemoveTitle",
  keyTaken: "listKeyTaken",
} as const;

/** The source wording of those words, for a Form rendered without a resolution behind it. */
export const PHI_FORM_LIST_DEFAULT_LABELS = {
  add: "Add",
  edit: "Edit",
  remove: "Remove",
  empty: "No entries yet.",
  apply: "Apply",
  cancel: "Cancel",
  removeTitle: "Remove this entry?",
  keyTaken: "Another entry already has this value.",
} as const;
