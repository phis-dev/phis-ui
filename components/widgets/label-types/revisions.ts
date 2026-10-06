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
    /** %1 is the list of changed Modules, each written with `moduleAdded` or `moduleRemoved`. */
    areaModulesChanged: string;
    areaModulesSaved: string;
    moduleAdded: string;
    moduleRemoved: string;
    /** Appended to a Working Draft rewritten in place: %1 the message, %2 when, %3 by whom. */
    lastSaved: string;
    navigationOverlayChanged: string;
    navigationSaved: string;
    themeChanged: string;
    themeSaved: string;
    titleField: string;
    descriptionField: string;
    indexingField: string;
    titleAndDescriptionFields: string;
    /** What joins two field names when a save changed more than one of them. */
    fieldConjunction: string;
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
    /** The Builder's one irreversible command, offered on the Revisions page. */
    deleteArea: string;
  };
  /** The dialog that deletes an Area's own shell, and the field that has to be written out. */
  deleteArea: {
    title: string;
    survives: string;
    field: string;
    fieldRequired: string;
    confirm: string;
    cancel: string;
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
    areaModulesChanged: "Modules changed: %1 from revision %2",
    areaModulesSaved: "Saved module selection from revision %1",
    moduleAdded: "+ %1",
    moduleRemoved: "− %1",
    lastSaved: "%1 · last saved %2 by %3",
    navigationOverlayChanged: "Changed navigation overlay (%1 overrides, %2 hidden) from revision %3",
    navigationSaved: "Saved navigation draft from revision %1",
    themeChanged: "Based on %1 v%2, %3 custom overrides from revision %4",
    themeSaved: "Saved theme draft from revision %1",
    titleField: "title",
    descriptionField: "description",
    indexingField: "indexing",
    titleAndDescriptionFields: "title and description",
    fieldConjunction: " and ",
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
    deleteArea: "Delete Area",
  },
  deleteArea: {
    title: "Delete this Area's shell?",
    survives: "The Area keeps its Pages, its Navigation and its Theme. Only the shell goes.",
    field: "Type the Area key to confirm",
    fieldRequired: "Write the Area key out to confirm.",
    confirm: "Delete Area",
    cancel: "Cancel",
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
