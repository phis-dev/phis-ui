import "server-only";

import { definePhiLabelSet, getPhiLabelSet } from "../../../gateway/label-set";
import {
  PHI_TR_CTX_WEB_UI_LABEL,
  type PhiGlobalTranslatorOptions,
} from "../../../gateway/tr";
import {
  PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS,
  type PhiBuilderChromeWidgetLabels,
} from "../label-types/builder-chrome";

const PHI_BUILDER_CHROME_WIDGET_LABEL_SET = definePhiLabelSet({
  key: "widget:builder-chrome",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    toolbar_save: PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS.toolbar.save,
    toolbar_live_preview: PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS.toolbar.livePreview,
    toolbar_publish: PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS.toolbar.publish,
    toolbar_undo: PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS.toolbar.undo,
    toolbar_redo: PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS.toolbar.redo,
    toolbar_reset: PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS.toolbar.reset,
    mode_editor: PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS.modeSwitch.editor,
    mode_preview: PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS.modeSwitch.preview,
    mode_preview_snapshot_failed: PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS.modeSwitch.previewSnapshotFailed,
    theme_debug: PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS.themeSwitch.debug,
    theme_dark: PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS.themeSwitch.dark,
    theme_light: PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS.themeSwitch.light,
    draft_checking: PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS.draftStatus.checking,
    draft_draft: PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS.draftStatus.draft,
    draft_draft_with_revision: PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS.draftStatus.draftWithRevision,
    draft_published: PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS.draftStatus.published,
    draft_unavailable: PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS.draftStatus.unavailable,
    draft_read_failed: PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS.draftStatus.readFailed,
    pages_new_page: PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS.pages.newPage,
    pages_page_meta: PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS.pages.pageMeta,
    pages_select_page: PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS.pages.selectPage,
    pages_delete_page: PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS.pages.deletePage,
    pages_create: PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS.pages.create,
    pages_form_title: PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS.pages.form.title,
    pages_form_path: PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS.pages.form.path,
    pages_form_description: PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS.pages.form.description,
    pages_form_title_required: PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS.pages.form.titleRequired,
    pages_form_path_required: PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS.pages.form.pathRequired,
    canvas_picker_pick_layout: PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS.canvas.picker.pickLayout,
    canvas_picker_pick_widget: PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS.canvas.picker.pickWidget,
    canvas_picker_layouts: PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS.canvas.picker.layouts,
    canvas_picker_widgets: PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS.canvas.picker.widgets,
    canvas_picker_search_layouts: PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS.canvas.picker.searchLayouts,
    canvas_picker_search_widgets: PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS.canvas.picker.searchWidgets,
    canvas_picker_filter_packages: PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS.canvas.picker.filterPackages,
    canvas_picker_filter_categories: PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS.canvas.picker.filterCategories,
    canvas_picker_no_compatible_items: PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS.canvas.picker.noCompatibleItems,
    page_title_dashboard: PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS.pageTitles.dashboard,
    page_title_shells: PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS.pageTitles.shells,
    page_title_pages: PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS.pageTitles.pages,
    page_title_navigation: PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS.pageTitles.navigation,
    page_title_theme: PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS.pageTitles.theme,
    page_title_revisions: PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS.pageTitles.revisions,
    page_title_settings: PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS.pageTitles.settings,
    page_title_media: PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS.pageTitles.media,
  },
});

export async function getPhiBuilderChromeWidgetLabels(
  options: PhiGlobalTranslatorOptions,
): Promise<PhiBuilderChromeWidgetLabels> {
  const labels = await getPhiLabelSet(options, PHI_BUILDER_CHROME_WIDGET_LABEL_SET);
  return {
    toolbar: {
      save: labels.toolbar_save,
      livePreview: labels.toolbar_live_preview,
      publish: labels.toolbar_publish,
      undo: labels.toolbar_undo,
      redo: labels.toolbar_redo,
      reset: labels.toolbar_reset,
    },
    modeSwitch: {
      editor: labels.mode_editor,
      preview: labels.mode_preview,
      previewSnapshotFailed: labels.mode_preview_snapshot_failed,
    },
    themeSwitch: {
      debug: labels.theme_debug,
      dark: labels.theme_dark,
      light: labels.theme_light,
    },
    draftStatus: {
      checking: labels.draft_checking,
      draft: labels.draft_draft,
      draftWithRevision: labels.draft_draft_with_revision,
      published: labels.draft_published,
      unavailable: labels.draft_unavailable,
      readFailed: labels.draft_read_failed,
    },
    pages: {
      newPage: labels.pages_new_page,
      pageMeta: labels.pages_page_meta,
      selectPage: labels.pages_select_page,
      deletePage: labels.pages_delete_page,
      create: labels.pages_create,
      form: {
        title: labels.pages_form_title,
        path: labels.pages_form_path,
        description: labels.pages_form_description,
        titleRequired: labels.pages_form_title_required,
        pathRequired: labels.pages_form_path_required,
      },
    },
    canvas: {
      picker: {
        pickLayout: labels.canvas_picker_pick_layout,
        pickWidget: labels.canvas_picker_pick_widget,
        layouts: labels.canvas_picker_layouts,
        widgets: labels.canvas_picker_widgets,
        searchLayouts: labels.canvas_picker_search_layouts,
        searchWidgets: labels.canvas_picker_search_widgets,
        filterPackages: labels.canvas_picker_filter_packages,
        filterCategories: labels.canvas_picker_filter_categories,
        noCompatibleItems: labels.canvas_picker_no_compatible_items,
      },
    },
    pageTitles: {
      dashboard: labels.page_title_dashboard,
      shells: labels.page_title_shells,
      pages: labels.page_title_pages,
      navigation: labels.page_title_navigation,
      theme: labels.page_title_theme,
      revisions: labels.page_title_revisions,
      settings: labels.page_title_settings,
      media: labels.page_title_media,
    },
  };
}
