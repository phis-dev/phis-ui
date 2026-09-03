import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../gateway/tr";
import { definePhiLabelSet, getPhiLabelSet } from "../../../gateway/label-set";
import {
  PHI_BUILDER_MODULES_PAGE_DEFAULT_LABELS,
  type PhiBuilderModulesPageLabels,
} from "../label-types/builder-modules";

const PHI_BUILDER_MODULES_PAGE_LABEL_SET = definePhiLabelSet({
  key: "widget:builder-modules",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    column_active: PHI_BUILDER_MODULES_PAGE_DEFAULT_LABELS.columns.active,
    column_title: PHI_BUILDER_MODULES_PAGE_DEFAULT_LABELS.columns.title,
    column_description: PHI_BUILDER_MODULES_PAGE_DEFAULT_LABELS.columns.description,
    column_category: PHI_BUILDER_MODULES_PAGE_DEFAULT_LABELS.columns.category,
    column_eligible_areas: PHI_BUILDER_MODULES_PAGE_DEFAULT_LABELS.columns.eligibleAreas,
    action_details: PHI_BUILDER_MODULES_PAGE_DEFAULT_LABELS.actions.details,
    footer_modules: PHI_BUILDER_MODULES_PAGE_DEFAULT_LABELS.footer.modules,
    category_foundation: PHI_BUILDER_MODULES_PAGE_DEFAULT_LABELS.categories.foundation,
    category_workspace: PHI_BUILDER_MODULES_PAGE_DEFAULT_LABELS.categories.workspace,
    category_content: PHI_BUILDER_MODULES_PAGE_DEFAULT_LABELS.categories.content,
    category_commerce: PHI_BUILDER_MODULES_PAGE_DEFAULT_LABELS.categories.commerce,
    category_people: PHI_BUILDER_MODULES_PAGE_DEFAULT_LABELS.categories.people,
    category_operations: PHI_BUILDER_MODULES_PAGE_DEFAULT_LABELS.categories.operations,
    category_other: PHI_BUILDER_MODULES_PAGE_DEFAULT_LABELS.categories.other,
    area_public: PHI_BUILDER_MODULES_PAGE_DEFAULT_LABELS.areas.public,
    area_app: PHI_BUILDER_MODULES_PAGE_DEFAULT_LABELS.areas.app,
    area_admin: PHI_BUILDER_MODULES_PAGE_DEFAULT_LABELS.areas.admin,
    area_builder: PHI_BUILDER_MODULES_PAGE_DEFAULT_LABELS.areas.builder,
    area_editor: PHI_BUILDER_MODULES_PAGE_DEFAULT_LABELS.areas.editor,
    area_accounting: PHI_BUILDER_MODULES_PAGE_DEFAULT_LABELS.areas.accounting,
    detail_title: PHI_BUILDER_MODULES_PAGE_DEFAULT_LABELS.detail.title,
    detail_field: PHI_BUILDER_MODULES_PAGE_DEFAULT_LABELS.detail.field,
    detail_value: PHI_BUILDER_MODULES_PAGE_DEFAULT_LABELS.detail.value,
    detail_module_id: PHI_BUILDER_MODULES_PAGE_DEFAULT_LABELS.detail.moduleId,
    detail_active: PHI_BUILDER_MODULES_PAGE_DEFAULT_LABELS.detail.active,
    detail_base_module: PHI_BUILDER_MODULES_PAGE_DEFAULT_LABELS.detail.baseModule,
    detail_yes: PHI_BUILDER_MODULES_PAGE_DEFAULT_LABELS.detail.yes,
    detail_no: PHI_BUILDER_MODULES_PAGE_DEFAULT_LABELS.detail.no,
  },
});

export async function getPhiBuilderModulesPageLabels(
  options: PhiGlobalTranslatorOptions,
): Promise<PhiBuilderModulesPageLabels> {
  const labels = await getPhiLabelSet(options, PHI_BUILDER_MODULES_PAGE_LABEL_SET);
  return {
    columns: {
      active: labels.column_active,
      title: labels.column_title,
      description: labels.column_description,
      category: labels.column_category,
      eligibleAreas: labels.column_eligible_areas,
    },
    actions: {
      details: labels.action_details,
    },
    footer: {
      modules: labels.footer_modules,
    },
    categories: {
      foundation: labels.category_foundation,
      workspace: labels.category_workspace,
      content: labels.category_content,
      commerce: labels.category_commerce,
      people: labels.category_people,
      operations: labels.category_operations,
      other: labels.category_other,
    },
    areas: {
      public: labels.area_public,
      app: labels.area_app,
      admin: labels.area_admin,
      builder: labels.area_builder,
      editor: labels.area_editor,
      accounting: labels.area_accounting,
    },
    detail: {
      title: labels.detail_title,
      field: labels.detail_field,
      value: labels.detail_value,
      moduleId: labels.detail_module_id,
      active: labels.detail_active,
      baseModule: labels.detail_base_module,
      yes: labels.detail_yes,
      no: labels.detail_no,
    },
  };
}
