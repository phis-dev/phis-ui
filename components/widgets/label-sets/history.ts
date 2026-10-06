import "server-only";

import { definePhiLabelSet, definePhiMessageLabel, getPhiLabelSet } from "../../../gateway/label-set";
import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../gateway/tr";
import {
  PHI_HISTORY_DEFAULT_LABELS,
  type PhiHistoryActionKey,
  type PhiHistoryLabels,
  type PhiHistoryThemePartKey,
} from "../label-types/history";
import { getPhiRegionWidgetLabels } from "./region";

const D = PHI_HISTORY_DEFAULT_LABELS;

const PHI_HISTORY_LABEL_SET = definePhiLabelSet({
  key: "widget:history",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    undone: definePhiMessageLabel(D.undone),
    redone: definePhiMessageLabel(D.redone),
    undo_tooltip: D.undoTooltip,
    redo_tooltip: D.redoTooltip,
    nothing_to_undo: D.nothingToUndo,
    nothing_to_redo: D.nothingToRedo,
    list_separator: D.listSeparator,
    action_insert_node: D.actions.insertNode,
    action_delete_node: D.actions.deleteNode,
    action_move_node: D.actions.moveNode,
    action_swap_widgets: D.actions.swapWidgets,
    action_move_layout_to_root: D.actions.moveLayoutToRoot,
    action_change_node_settings: D.actions.changeNodeSettings,
    action_resize_node: D.actions.resizeNode,
    action_change_node_surface: D.actions.changeNodeSurface,
    action_change_node_padding: D.actions.changeNodePadding,
    action_change_node_anchor: D.actions.changeNodeAnchor,
    action_change_node_effects: D.actions.changeNodeEffects,
    action_change_node_translation: D.actions.changeNodeTranslation,
    action_change_node_signals: D.actions.changeNodeSignals,
    action_rename_slot: D.actions.renameSlot,
    action_change_region: D.actions.changeRegion,
    action_change_sider_layout: D.actions.changeSiderLayout,
    action_start_from_shell: D.actions.startFromShell,
    action_change_navigation: D.actions.changeNavigation,
    action_change_area_settings: D.actions.changeAreaSettings,
    action_change_modules: D.actions.changeModules,
    action_change_page_meta: D.actions.changePageMeta,
    action_change_theme: D.actions.changeTheme,
    theme_part_palette: D.themeParts.palette,
    theme_part_mode: D.themeParts.mode,
    theme_part_fonts: D.themeParts.fonts,
    theme_part_style: D.themeParts.style,
    theme_part_brand: D.themeParts.brand,
    theme_part_contact: D.themeParts.contact,
    theme_part_shell: D.themeParts.shell,
    theme_part_root: D.themeParts.root,
    theme_part_widgets: D.themeParts.widgets,
    theme_part_components: D.themeParts.components,
  },
});

/** The history's sentences, in the reader's language: what the Builder and the Theme workspace hand their Controllers. */
export async function getPhiHistoryLabels(options: PhiGlobalTranslatorOptions): Promise<PhiHistoryLabels> {
  const [labels, regions] = await Promise.all([
    getPhiLabelSet(options, PHI_HISTORY_LABEL_SET),
    getPhiRegionWidgetLabels(options),
  ]);
  const actions = {
    insertNode: labels.action_insert_node,
    deleteNode: labels.action_delete_node,
    moveNode: labels.action_move_node,
    swapWidgets: labels.action_swap_widgets,
    moveLayoutToRoot: labels.action_move_layout_to_root,
    changeNodeSettings: labels.action_change_node_settings,
    resizeNode: labels.action_resize_node,
    changeNodeSurface: labels.action_change_node_surface,
    changeNodePadding: labels.action_change_node_padding,
    changeNodeAnchor: labels.action_change_node_anchor,
    changeNodeEffects: labels.action_change_node_effects,
    changeNodeTranslation: labels.action_change_node_translation,
    changeNodeSignals: labels.action_change_node_signals,
    renameSlot: labels.action_rename_slot,
    changeRegion: labels.action_change_region,
    changeSiderLayout: labels.action_change_sider_layout,
    startFromShell: labels.action_start_from_shell,
    changeNavigation: labels.action_change_navigation,
    changeAreaSettings: labels.action_change_area_settings,
    changeModules: labels.action_change_modules,
    changePageMeta: labels.action_change_page_meta,
    changeTheme: labels.action_change_theme,
  } satisfies Record<PhiHistoryActionKey, string>;
  const themeParts = {
    palette: labels.theme_part_palette,
    mode: labels.theme_part_mode,
    fonts: labels.theme_part_fonts,
    style: labels.theme_part_style,
    brand: labels.theme_part_brand,
    contact: labels.theme_part_contact,
    shell: labels.theme_part_shell,
    root: labels.theme_part_root,
    widgets: labels.theme_part_widgets,
    components: labels.theme_part_components,
  } satisfies Record<PhiHistoryThemePartKey, string>;
  return {
    undone: labels.undone,
    redone: labels.redone,
    undoTooltip: labels.undo_tooltip,
    redoTooltip: labels.redo_tooltip,
    nothingToUndo: labels.nothing_to_undo,
    nothingToRedo: labels.nothing_to_redo,
    actions,
    themeParts,
    listSeparator: labels.list_separator,
    regions,
  };
}
