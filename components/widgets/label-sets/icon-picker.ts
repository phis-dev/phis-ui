import "server-only";

import {
  PHI_TR_CTX_WEB_UI_LABEL,
  type PhiGlobalTranslatorOptions,
} from "../../../gateway/tr";
import { definePhiLabelSet, definePhiMessageLabel, getPhiLabelSet } from "../../../gateway/label-set";
import {
  PHI_ICON_PICKER_CONTROL_DEFAULT_LABELS,
  type PhiIconPickerControlLabels,
} from "../label-types/icon-picker";
import type { PhiBlockRuntime } from "../../../types";
import { buildPhiWidgetLabelTranslatorOptions } from "./runtime-options";

/**
 * What the icon picker says.
 *
 * Both of its callers took `PHI_ICON_PICKER_CONTROL_DEFAULT_LABELS`, so the Control was the one piece of
 * the Inspector that stayed English however the Site was set up. The defaults remain the English wording
 * -- they are what a Control falls back to when nobody feeds it -- and this set is what the Builder feeds
 * it instead.
 */
const PHI_ICON_PICKER_LABEL_SET = definePhiLabelSet({
  key: "widget:icon-picker",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    button_aria_label: PHI_ICON_PICKER_CONTROL_DEFAULT_LABELS.buttonAriaLabel,
    mode_standard: PHI_ICON_PICKER_CONTROL_DEFAULT_LABELS.modes.standard,
    mode_iconify: PHI_ICON_PICKER_CONTROL_DEFAULT_LABELS.modes.iconify,
    placeholder_icon_name: PHI_ICON_PICKER_CONTROL_DEFAULT_LABELS.placeholders.iconName,
    hint_iconify_search_min_chars: definePhiMessageLabel(
      PHI_ICON_PICKER_CONTROL_DEFAULT_LABELS.hints.iconifySearchMinChars,
    ),
    hint_none_selected: PHI_ICON_PICKER_CONTROL_DEFAULT_LABELS.hints.noneSelected,
    empty_curated: definePhiMessageLabel(PHI_ICON_PICKER_CONTROL_DEFAULT_LABELS.empty.curated),
    empty_search: definePhiMessageLabel(PHI_ICON_PICKER_CONTROL_DEFAULT_LABELS.empty.search),
    status_loading: definePhiMessageLabel(PHI_ICON_PICKER_CONTROL_DEFAULT_LABELS.status.loading),
    status_loading_more: definePhiMessageLabel(PHI_ICON_PICKER_CONTROL_DEFAULT_LABELS.status.loadingMore),
    status_scroll_more: definePhiMessageLabel(PHI_ICON_PICKER_CONTROL_DEFAULT_LABELS.status.scrollMore),
    error_search: definePhiMessageLabel(PHI_ICON_PICKER_CONTROL_DEFAULT_LABELS.errors.search),
    action_clear: PHI_ICON_PICKER_CONTROL_DEFAULT_LABELS.actions.clear,
  },
});

export async function getPhiIconPickerLabels(
  options: PhiGlobalTranslatorOptions,
): Promise<PhiIconPickerControlLabels> {
  const labels = await getPhiLabelSet(options, PHI_ICON_PICKER_LABEL_SET);
  return {
    buttonAriaLabel: labels.button_aria_label,
    modes: {
      standard: labels.mode_standard,
      iconify: labels.mode_iconify,
    },
    placeholders: {
      iconName: labels.placeholder_icon_name,
    },
    hints: {
      iconifySearchMinChars: labels.hint_iconify_search_min_chars,
      noneSelected: labels.hint_none_selected,
    },
    empty: {
      curated: labels.empty_curated,
      search: labels.empty_search,
    },
    status: {
      loading: labels.status_loading,
      loadingMore: labels.status_loading_more,
      scrollMore: labels.status_scroll_more,
    },
    errors: {
      search: labels.error_search,
    },
    actions: {
      clear: labels.action_clear,
    },
  };
}

export function getPhiIconPickerLabelsForRuntime(
  runtime: Pick<PhiBlockRuntime, "locale" | "site">,
) {
  return getPhiIconPickerLabels(buildPhiWidgetLabelTranslatorOptions(runtime));
}
