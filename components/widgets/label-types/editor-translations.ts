export type PhiEditorTranslationsWidgetLabels = {
  title: string;
  description: string;
  sourceLocaleLabel: string;
  targetLocaleLabel: string;
  contextLabel: string;
  statusLabel: string;
  searchPlaceholder: string;
  resetLabel: string;
  refreshLabel: string;
  statuses: {
    all: string;
    missing: string;
    translated: string;
  };
  rowStatus: {
    missing: string;
    translated: string;
  };
  columns: {
    source: string;
    context: string;
    status: string;
    translation: string;
    created: string;
    updated: string;
    actions: string;
  };
  actions: {
    edit: string;
    save: string;
    cancel: string;
    delete: string;
  };
  translationPlaceholder: string;
  delete: {
    title: string;
    description: string;
  };
  empty: {
    title: string;
    text: string;
  };
  feedback: {
    saveSuccess: string;
    deleteSuccess: string;
  };
  errors: {
    load: string;
    save: string;
    delete: string;
  };
};
