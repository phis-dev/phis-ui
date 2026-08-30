import "server-only";

import { definePhiLabelSet, getPhiLabelSet } from "../../../gateway/label-set";
import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../gateway/tr";

const PHI_BUILDER_NAVIGATION_PAGE_LABEL_SET = definePhiLabelSet({
  key: "preset:builder-navigation-page",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    footer_template: "%1 entries, %2 hidden",
    source_search_placeholder: "Filter pages",
    column_icon: "Icon",
    column_label: "Label",
    column_type: "Type",
    column_origin: "Origin",
    column_path: "Path",
    column_new_tab: "New tab",
    deleted_target: "Deleted target",
    type_link: "Link",
    type_external: "External",
    type_container: "Container",
    type_separator: "Separator",
    empty_title: "No navigation items yet.",
    navigation_placeholder: "Choose navigation",
    navigation_create: "Add navigation",
    navigation_key_placeholder: "navigation-key",
    navigation_create_submit: "Create",
    action_add_link: "Add link",
    action_add_container: "Add container",
    action_add_separator: "Add separator",
    action_hide: "Hide",
    action_show: "Show",
    action_delete: "Delete",
    action_delete_confirm: "Delete navigation item?",
    action_cancel: "Cancel",
  },
});

export async function getPhiBuilderNavigationPageLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_BUILDER_NAVIGATION_PAGE_LABEL_SET);
  return {
    footerTemplate: labels.footer_template,
    sourceSearchPlaceholder: labels.source_search_placeholder,
    columns: {
      icon: labels.column_icon,
      label: labels.column_label,
      type: labels.column_type,
      origin: labels.column_origin,
      path: labels.column_path,
      newTab: labels.column_new_tab,
    },
    types: {
      link: labels.type_link,
      external: labels.type_external,
      container: labels.type_container,
      separator: labels.type_separator,
    },
    emptyTitle: labels.empty_title,
    deletedTarget: labels.deleted_target,
    navigation: {
      placeholder: labels.navigation_placeholder,
      create: labels.navigation_create,
      keyPlaceholder: labels.navigation_key_placeholder,
      createSubmit: labels.navigation_create_submit,
    },
    actions: {
      addLink: labels.action_add_link,
      addContainer: labels.action_add_container,
      addSeparator: labels.action_add_separator,
      hide: labels.action_hide,
      show: labels.action_show,
      delete: labels.action_delete,
      deleteConfirm: labels.action_delete_confirm,
      cancel: labels.action_cancel,
    },
  };
}
