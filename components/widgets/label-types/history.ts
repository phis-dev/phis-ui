import {
  PHI_REGION_WIDGET_DEFAULT_LABELS,
  getPhiRegionWidgetLabelEntry,
  type PhiRegionWidgetLabels,
} from "./region";

/**
 * What an authoring history says about its steps: the undo and redo message, the toolbar's tooltip, and
 * one sentence per kind of step.
 *
 * A step is recorded as data -- its kind and, where it has one, the name of what it touched -- and
 * written as a sentence only here, in the reader's language. A sentence frozen at the moment of the edit
 * would be in whatever language the recorder held, and the recorder is often a store with no labels.
 */
export type PhiHistoryActionKey =
  | "insertNode"
  | "deleteNode"
  | "moveNode"
  | "swapWidgets"
  | "moveLayoutToRoot"
  | "changeNodeSettings"
  | "resizeNode"
  | "changeNodeSurface"
  | "changeNodePadding"
  | "changeNodeAnchor"
  | "changeNodeEffects"
  | "changeNodeTranslation"
  | "changeNodeSignals"
  | "renameSlot"
  | "changeRegion"
  | "changeSiderLayout"
  | "startFromShell"
  | "changeNavigation"
  | "changeAreaSettings"
  | "changeModules"
  | "changePageMeta"
  | "changeTheme";

/**
 * One step, as the history keeps it. `subject` names what the step touched -- a node, a Navigation, the
 * parts of a Theme -- and fills the sentence's `{subject}`. A Region is named by its key instead, because
 * its name is a label the reader translates; a kind whose sentence has no place for either is recorded
 * without.
 */
export type PhiHistoryAction = {
  key: PhiHistoryActionKey;
  subject?: string | null;
  regionKey?: string | null;
};

/** The parts of a Theme an edit can change, as the Theme step names them. */
export type PhiHistoryThemePartKey =
  | "palette"
  | "mode"
  | "fonts"
  | "style"
  | "brand"
  | "contact"
  | "shell"
  | "root"
  | "widgets"
  | "components";

export type PhiHistoryLabels = {
  /** The message after an undo; `{action}` is the step's sentence. */
  undone: string;
  /** The message after a redo. */
  redone: string;
  /** The undo button's tooltip while there is something to take back. */
  undoTooltip: string;
  /** The redo button's tooltip while there is something to bring back. */
  redoTooltip: string;
  nothingToUndo: string;
  nothingToRedo: string;
  actions: Record<PhiHistoryActionKey, string>;
  themeParts: Record<PhiHistoryThemePartKey, string>;
  /** What joins the names of several parts in one subject. */
  listSeparator: string;
  /** The Regions' names, which a Region step is written with. */
  regions: PhiRegionWidgetLabels;
};

export const PHI_HISTORY_DEFAULT_LABELS: PhiHistoryLabels = {
  undone: "Undone: {action}",
  redone: "Redone: {action}",
  undoTooltip: "Undo: {action}",
  redoTooltip: "Redo: {action}",
  nothingToUndo: "Nothing to undo",
  nothingToRedo: "Nothing to redo",
  actions: {
    insertNode: "Add {subject}",
    deleteNode: "Delete {subject}",
    moveNode: "Move {subject}",
    swapWidgets: "Swap {subject}",
    moveLayoutToRoot: "Make {subject} the Region root",
    changeNodeSettings: "Change {subject}",
    resizeNode: "Resize {subject}",
    changeNodeSurface: "Change the surface of {subject}",
    changeNodePadding: "Change the padding of {subject}",
    changeNodeAnchor: "Change the anchor of {subject}",
    changeNodeEffects: "Change the effects of {subject}",
    changeNodeTranslation: "Change the translation of {subject}",
    changeNodeSignals: "Change the signals of {subject}",
    renameSlot: "Rename a slot of {subject}",
    changeRegion: "Change the Region {subject}",
    changeSiderLayout: "Change how {subject} fills the height",
    startFromShell: "Start from the Module's shell",
    changeNavigation: "Change the Navigation {subject}",
    changeAreaSettings: "Change the Area settings",
    changeModules: "Change the Modules {subject}",
    changePageMeta: "Change the Page details of {subject}",
    changeTheme: "Change the Theme: {subject}",
  },
  themeParts: {
    palette: "colours",
    mode: "mode",
    fonts: "fonts",
    style: "style",
    brand: "brand",
    contact: "contact",
    shell: "shell",
    root: "page background",
    widgets: "widgets",
    components: "components",
  },
  listSeparator: ", ",
  regions: PHI_REGION_WIDGET_DEFAULT_LABELS,
};

/** The sentence one step reads as. */
export function formatPhiHistoryAction(labels: PhiHistoryLabels, action: PhiHistoryAction) {
  const subject = action.regionKey
    ? getPhiRegionWidgetLabelEntry(action.regionKey, labels.regions)?.title ?? action.regionKey
    : action.subject?.trim() ?? "";
  return labels.actions[action.key].replace("{subject}", subject);
}

/** The message after an undo or a redo, naming the step it moved. */
export function formatPhiHistoryMoveMessage(
  labels: PhiHistoryLabels,
  direction: "undo" | "redo",
  action: PhiHistoryAction,
) {
  return (direction === "undo" ? labels.undone : labels.redone)
    .replace("{action}", formatPhiHistoryAction(labels, action));
}

/** The tooltip of the undo or redo button: the step it would move, or that there is none. */
export function formatPhiHistoryTooltip(
  labels: PhiHistoryLabels,
  direction: "undo" | "redo",
  action: PhiHistoryAction | null,
) {
  if (!action) return direction === "undo" ? labels.nothingToUndo : labels.nothingToRedo;
  return (direction === "undo" ? labels.undoTooltip : labels.redoTooltip)
    .replace("{action}", formatPhiHistoryAction(labels, action));
}
