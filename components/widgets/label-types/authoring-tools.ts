import {
  PHI_ICON_PICKER_CONTROL_DEFAULT_LABELS,
  type PhiIconPickerControlLabels,
} from "./icon-picker";

/**
 * What the Builder's authoring tools say -- the buttons in a Widget's scaffold, not the Widget.
 *
 * A Widget on the canvas shows what somebody authored, in the language they authored it in; nothing
 * there is ours to translate. The chrome around it is: "Add option", "Text alignment", "Insert Site
 * Asset" are things this Builder says to whoever is building, and they were said in English however
 * the Site was set up.
 *
 * The icon picker comes along whole rather than copied. It has a set of its own, and a caption
 * translated twice under two keys is a caption that will read two ways.
 */
export type PhiAuthoringToolsLabels = {
  text: {
    styles: string;
    color: string;
    icon: string;
    typography: string;
    placeholder: string;
  };
  richText: {
    alignment: string;
    styles: string;
    color: string;
    link: string;
    linkRemove: string;
    linkApply: string;
    insertAsset: string;
  };
  descriptions: {
    items: string;
  };
  /**
   * What a tool button calls itself when its caller says nothing.
   *
   * The icon button's own fallback is the icon picker's `buttonAriaLabel`, because that is the same
   * caption said in the same place.
   */
  fallbacks: {
    selectImage: string;
    widgetColor: string;
    widgetTypography: string;
  };
  commands: {
    addButton: string;
    manageButtons: string;
  };
  icon: {
    widgetIcon: string;
    widgetColor: string;
  };
  staticOptions: {
    edit: string;
    title: string;
    addOption: string;
    deleteOption: string;
    cancel: string;
    apply: string;
    empty: string;
    columnIcon: string;
    columnLabel: string;
    columnValue: string;
    columnDescription: string;
    columnActions: string;
    enableOption: string;
    disableOption: string;
    /** `%1` is the option as it reads in the row. */
    enableRow: string;
    disableRow: string;
    deleteRow: string;
    valueRequired: string;
    labelRequired: string;
    valuesUnique: string;
  };
  iconPicker: PhiIconPickerControlLabels;
};

export const PHI_AUTHORING_TOOLS_DEFAULT_LABELS: PhiAuthoringToolsLabels = {
  text: {
    styles: "Text styles",
    color: "Text color",
    icon: "Text icon",
    typography: "Text typography",
    placeholder: "Text",
  },
  richText: {
    alignment: "Text alignment",
    styles: "Rich text styles",
    color: "Rich text color",
    link: "Rich text link",
    linkRemove: "Remove",
    linkApply: "Apply",
    insertAsset: "Insert Site Asset",
  },
  descriptions: {
    items: "Description items",
  },
  fallbacks: {
    selectImage: "Select image",
    widgetColor: "Widget color",
    widgetTypography: "Widget typography",
  },
  commands: {
    addButton: "Add button",
    manageButtons: "Manage buttons",
  },
  icon: {
    widgetIcon: "Icon widget icon",
    widgetColor: "Icon widget color",
  },
  staticOptions: {
    edit: "Edit static options",
    title: "Static options",
    addOption: "Add option",
    deleteOption: "Delete option",
    cancel: "Cancel",
    apply: "Apply",
    empty: "No static options",
    columnIcon: "Icon",
    columnLabel: "Label",
    columnValue: "Value",
    columnDescription: "Description",
    columnActions: "Actions",
    enableOption: "Enable option",
    disableOption: "Disable option",
    enableRow: "Enable %1",
    disableRow: "Disable %1",
    deleteRow: "Delete %1",
    valueRequired: "Every option requires a value.",
    labelRequired: "Every option requires a label.",
    valuesUnique: "Option values must be unique.",
  },
  iconPicker: PHI_ICON_PICKER_CONTROL_DEFAULT_LABELS,
};

export function formatPhiAuthoringToolsLabel(template: string, value: string) {
  return template.replace("%1", value);
}
