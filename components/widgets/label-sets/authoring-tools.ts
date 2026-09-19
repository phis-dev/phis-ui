import "server-only";

import {
  PHI_TR_CTX_WEB_UI_LABEL,
  type PhiGlobalTranslatorOptions,
} from "../../../gateway/tr";
import { definePhiLabelSet, definePhiMessageLabel, getPhiLabelSet } from "../../../gateway/label-set";
import {
  PHI_AUTHORING_TOOLS_DEFAULT_LABELS,
  type PhiAuthoringToolsLabels,
} from "../label-types/authoring-tools";
import type { PhiBlockRuntime } from "../../../types";
import { getPhiIconPickerLabels } from "./icon-picker";
import { buildPhiWidgetLabelTranslatorOptions } from "./runtime-options";

/**
 * Every one of these is a caption on a button, so none of them is a message label: they name what the
 * button does and have to fit beside it.
 */
const PHI_AUTHORING_TOOLS_LABEL_SET = definePhiLabelSet({
  key: "widget:authoring-tools",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    text_styles: PHI_AUTHORING_TOOLS_DEFAULT_LABELS.text.styles,
    text_color: PHI_AUTHORING_TOOLS_DEFAULT_LABELS.text.color,
    text_icon: PHI_AUTHORING_TOOLS_DEFAULT_LABELS.text.icon,
    text_typography: PHI_AUTHORING_TOOLS_DEFAULT_LABELS.text.typography,
    text_placeholder: PHI_AUTHORING_TOOLS_DEFAULT_LABELS.text.placeholder,
    rich_text_alignment: PHI_AUTHORING_TOOLS_DEFAULT_LABELS.richText.alignment,
    rich_text_styles: PHI_AUTHORING_TOOLS_DEFAULT_LABELS.richText.styles,
    rich_text_color: PHI_AUTHORING_TOOLS_DEFAULT_LABELS.richText.color,
    rich_text_link: PHI_AUTHORING_TOOLS_DEFAULT_LABELS.richText.link,
    rich_text_link_remove: PHI_AUTHORING_TOOLS_DEFAULT_LABELS.richText.linkRemove,
    rich_text_link_apply: PHI_AUTHORING_TOOLS_DEFAULT_LABELS.richText.linkApply,
    rich_text_insert_asset: PHI_AUTHORING_TOOLS_DEFAULT_LABELS.richText.insertAsset,
    descriptions_items: PHI_AUTHORING_TOOLS_DEFAULT_LABELS.descriptions.items,
    fallback_select_image: PHI_AUTHORING_TOOLS_DEFAULT_LABELS.fallbacks.selectImage,
    fallback_widget_color: PHI_AUTHORING_TOOLS_DEFAULT_LABELS.fallbacks.widgetColor,
    fallback_widget_typography: PHI_AUTHORING_TOOLS_DEFAULT_LABELS.fallbacks.widgetTypography,
    commands_add_button: PHI_AUTHORING_TOOLS_DEFAULT_LABELS.commands.addButton,
    commands_manage_buttons: PHI_AUTHORING_TOOLS_DEFAULT_LABELS.commands.manageButtons,
    icon_widget_icon: PHI_AUTHORING_TOOLS_DEFAULT_LABELS.icon.widgetIcon,
    icon_widget_color: PHI_AUTHORING_TOOLS_DEFAULT_LABELS.icon.widgetColor,
    static_options_edit: PHI_AUTHORING_TOOLS_DEFAULT_LABELS.staticOptions.edit,
    static_options_title: PHI_AUTHORING_TOOLS_DEFAULT_LABELS.staticOptions.title,
    static_options_add: PHI_AUTHORING_TOOLS_DEFAULT_LABELS.staticOptions.addOption,
    static_options_delete: PHI_AUTHORING_TOOLS_DEFAULT_LABELS.staticOptions.deleteOption,
    static_options_cancel: PHI_AUTHORING_TOOLS_DEFAULT_LABELS.staticOptions.cancel,
    static_options_apply: PHI_AUTHORING_TOOLS_DEFAULT_LABELS.staticOptions.apply,
    static_options_empty: definePhiMessageLabel(PHI_AUTHORING_TOOLS_DEFAULT_LABELS.staticOptions.empty),
    static_options_column_icon: PHI_AUTHORING_TOOLS_DEFAULT_LABELS.staticOptions.columnIcon,
    static_options_column_label: PHI_AUTHORING_TOOLS_DEFAULT_LABELS.staticOptions.columnLabel,
    static_options_column_value: PHI_AUTHORING_TOOLS_DEFAULT_LABELS.staticOptions.columnValue,
    static_options_column_description: PHI_AUTHORING_TOOLS_DEFAULT_LABELS.staticOptions.columnDescription,
    static_options_column_actions: PHI_AUTHORING_TOOLS_DEFAULT_LABELS.staticOptions.columnActions,
    static_options_enable: PHI_AUTHORING_TOOLS_DEFAULT_LABELS.staticOptions.enableOption,
    static_options_disable: PHI_AUTHORING_TOOLS_DEFAULT_LABELS.staticOptions.disableOption,
    static_options_enable_row: definePhiMessageLabel(PHI_AUTHORING_TOOLS_DEFAULT_LABELS.staticOptions.enableRow),
    static_options_disable_row: definePhiMessageLabel(PHI_AUTHORING_TOOLS_DEFAULT_LABELS.staticOptions.disableRow),
    static_options_delete_row: definePhiMessageLabel(PHI_AUTHORING_TOOLS_DEFAULT_LABELS.staticOptions.deleteRow),
    static_options_value_required: definePhiMessageLabel(PHI_AUTHORING_TOOLS_DEFAULT_LABELS.staticOptions.valueRequired),
    static_options_label_required: definePhiMessageLabel(PHI_AUTHORING_TOOLS_DEFAULT_LABELS.staticOptions.labelRequired),
    static_options_values_unique: definePhiMessageLabel(PHI_AUTHORING_TOOLS_DEFAULT_LABELS.staticOptions.valuesUnique),
  },
});

export async function getPhiAuthoringToolsLabels(
  options: PhiGlobalTranslatorOptions,
): Promise<PhiAuthoringToolsLabels> {
  const [labels, iconPicker] = await Promise.all([
    getPhiLabelSet(options, PHI_AUTHORING_TOOLS_LABEL_SET),
    getPhiIconPickerLabels(options),
  ]);
  return {
    text: {
      styles: labels.text_styles,
      color: labels.text_color,
      icon: labels.text_icon,
      typography: labels.text_typography,
      placeholder: labels.text_placeholder,
    },
    richText: {
      alignment: labels.rich_text_alignment,
      styles: labels.rich_text_styles,
      color: labels.rich_text_color,
      link: labels.rich_text_link,
      linkRemove: labels.rich_text_link_remove,
      linkApply: labels.rich_text_link_apply,
      insertAsset: labels.rich_text_insert_asset,
    },
    descriptions: {
      items: labels.descriptions_items,
    },
    fallbacks: {
      selectImage: labels.fallback_select_image,
      widgetColor: labels.fallback_widget_color,
      widgetTypography: labels.fallback_widget_typography,
    },
    commands: {
      addButton: labels.commands_add_button,
      manageButtons: labels.commands_manage_buttons,
    },
    icon: {
      widgetIcon: labels.icon_widget_icon,
      widgetColor: labels.icon_widget_color,
    },
    staticOptions: {
      edit: labels.static_options_edit,
      title: labels.static_options_title,
      addOption: labels.static_options_add,
      deleteOption: labels.static_options_delete,
      cancel: labels.static_options_cancel,
      apply: labels.static_options_apply,
      empty: labels.static_options_empty,
      columnIcon: labels.static_options_column_icon,
      columnLabel: labels.static_options_column_label,
      columnValue: labels.static_options_column_value,
      columnDescription: labels.static_options_column_description,
      columnActions: labels.static_options_column_actions,
      enableOption: labels.static_options_enable,
      disableOption: labels.static_options_disable,
      enableRow: labels.static_options_enable_row,
      disableRow: labels.static_options_disable_row,
      deleteRow: labels.static_options_delete_row,
      valueRequired: labels.static_options_value_required,
      labelRequired: labels.static_options_label_required,
      valuesUnique: labels.static_options_values_unique,
    },
    iconPicker,
  };
}

export function getPhiAuthoringToolsLabelsForRuntime(
  runtime: Pick<PhiBlockRuntime, "locale" | "site">,
) {
  return getPhiAuthoringToolsLabels(buildPhiWidgetLabelTranslatorOptions(runtime));
}
