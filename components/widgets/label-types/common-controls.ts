export type PhiCommonControlActionKey =
  | "add"
  | "apply"
  | "cancel"
  | "clear"
  | "delete"
  | "deleteSelected"
  | "edit"
  | "livePreview"
  | "meta"
  | "new"
  | "pageMeta"
  | "publish"
  | "reload"
  | "reset"
  | "restore"
  | "review"
  | "save"
  | "search"
  | "undo"
  | "redo"
  | "upload";

export type PhiCommonControlActionLabels = {
  label: string;
  tooltip: string;
  icon: string;
  buttonType?: "default" | "primary" | "dashed" | "text" | "link";
  danger?: boolean;
};

export type PhiCommonControlLabels = {
  actions: Record<PhiCommonControlActionKey, PhiCommonControlActionLabels>;
};

export const PHI_COMMON_CONTROL_DEFAULT_LABELS: PhiCommonControlLabels = {
  actions: {
    add: { label: "Add", tooltip: "Add", icon: "add" },
    apply: { label: "Apply", tooltip: "Apply", icon: "apply", buttonType: "primary" },
    cancel: { label: "Cancel", tooltip: "Cancel", icon: "cancel" },
    clear: { label: "Clear", tooltip: "Clear", icon: "clear" },
    delete: { label: "Delete", tooltip: "Delete", icon: "delete", danger: true },
    deleteSelected: { label: "Delete selected", tooltip: "Delete selected", icon: "delete", danger: true },
    edit: { label: "Edit", tooltip: "Edit", icon: "edit" },
    livePreview: { label: "Live preview", tooltip: "Live preview", icon: "preview" },
    meta: { label: "Meta", tooltip: "Meta", icon: "meta" },
    new: { label: "New", tooltip: "New", icon: "new" },
    pageMeta: { label: "Meta", tooltip: "Page meta", icon: "meta" },
    publish: { label: "Publish", tooltip: "Publish", icon: "publish", buttonType: "primary" },
    reload: { label: "Reload", tooltip: "Reload", icon: "reload" },
    reset: { label: "Reset", tooltip: "Reset", icon: "reset", danger: true },
    restore: { label: "Restore", tooltip: "Restore", icon: "restore" },
    review: { label: "Review", tooltip: "Review", icon: "preview" },
    save: { label: "Save", tooltip: "Save", icon: "save", buttonType: "primary" },
    search: { label: "Search", tooltip: "Search", icon: "search" },
    undo: { label: "Undo", tooltip: "Undo", icon: "undo" },
    redo: { label: "Redo", tooltip: "Redo", icon: "redo" },
    upload: { label: "Upload", tooltip: "Upload", icon: "upload", buttonType: "primary" },
  },
};

export function readPhiCommonControlActionKey(value: string | null | undefined): PhiCommonControlActionKey | null {
  const normalized = value?.trim();
  return normalized && normalized in PHI_COMMON_CONTROL_DEFAULT_LABELS.actions
    ? (normalized as PhiCommonControlActionKey)
    : null;
}
