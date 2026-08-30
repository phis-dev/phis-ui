export type PhiBuilderRevisionsWidgetLabels = {
  kindLabel: string;
  scopeLabel: string;
  kindOptions: {
    area: string;
    page: string;
    navigation: string;
    theme: string;
  };
  pagePlaceholder: string;
  navigationPlaceholder: string;
  themePlaceholder: string;
  revisionsLabel: string;
  selectedLabel: string;
  systemLabel: string;
  publishedLabel: string;
  draftLabel: string;
  deletedLabel: string;
  presetUpdateLabel: string;
  messages: {
    fallbackFromRevision: string;
    pageDeleted: string;
    pageMetaChanged: string;
    pageNodesChanged: string;
    pageSaved: string;
    areaNodesChanged: string;
    areaSaved: string;
    navigationOverlayChanged: string;
    navigationSaved: string;
    themeChanged: string;
    themeSaved: string;
    titleField: string;
    descriptionField: string;
    titleAndDescriptionFields: string;
  };
  columns: {
    revision: string;
    created: string;
    by: string;
    message: string;
    actions: string;
  };
  actions: {
    review: string;
    restore: string;
    delete: string;
    deleteSelected: string;
  };
  confirm: {
    restoreTitle: string;
    restoreDescription: string;
    deleteTitle: string;
    deleteDescription: string;
    deleteSelectedTitle: string;
    deleteSelectedDescription: string;
  };
};

export const PHI_BUILDER_REVISIONS_WIDGET_DEFAULT_LABELS: PhiBuilderRevisionsWidgetLabels = {
  kindLabel: "Type",
  scopeLabel: "Scope",
  kindOptions: {
    area: "Area",
    page: "Page",
    navigation: "Navigation",
    theme: "Theme",
  },
  pagePlaceholder: "Select page",
  navigationPlaceholder: "Select navigation key",
  themePlaceholder: "Select theme",
  revisionsLabel: "revisions",
  selectedLabel: "selected",
  systemLabel: "System",
  publishedLabel: "Published",
  draftLabel: "Draft",
  deletedLabel: "Deleted",
  presetUpdateLabel: "Preset update v%1 available",
  messages: {
    fallbackFromRevision: "From revision %1",
    pageDeleted: "Page deleted from revision %1",
    pageMetaChanged: "Changed %1 from revision %2",
    pageNodesChanged: "Changed %1 nodes from revision %2",
    pageSaved: "Saved page draft from revision %1",
    areaNodesChanged: "Changed %1 nodes from revision %2",
    areaSaved: "Saved area draft from revision %1",
    navigationOverlayChanged: "Changed navigation overlay (%1 overrides, %2 hidden) from revision %3",
    navigationSaved: "Saved navigation draft from revision %1",
    themeChanged: "Based on %1 v%2, %3 custom overrides from revision %4",
    themeSaved: "Saved theme draft from revision %1",
    titleField: "title",
    descriptionField: "description",
    titleAndDescriptionFields: "title and description",
  },
  columns: {
    revision: "Revision",
    created: "Created",
    by: "By",
    message: "Message",
    actions: "Actions",
  },
  actions: {
    review: "Review",
    restore: "Restore",
    delete: "Delete",
    deleteSelected: "Delete selected",
  },
  confirm: {
    restoreTitle: "Restore revision #%1?",
    restoreDescription: "This creates a new draft from the selected revision.",
    deleteTitle: "Delete revision #%1?",
    deleteDescription: "Revisions are deleted permanently.",
    deleteSelectedTitle: "Delete %1 selected revisions?",
    deleteSelectedDescription: "Selected revisions are deleted permanently.",
  },
};
