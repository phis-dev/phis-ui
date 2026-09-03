import {
  PHI_BUILDER_INSERT_PICKER_CONTROL_DEFAULT_LABELS,
  type PhiBuilderInsertPickerControlLabels,
} from "../../controls/phi-builder-insert-picker-control-labels";

export type PhiBuilderChromeWidgetLabels = {
  toolbar: {
    save: string;
    livePreview: string;
    publish: string;
    undo: string;
    redo: string;
    reset: string;
  };
  modeSwitch: {
    editor: string;
    preview: string;
    previewSnapshotFailed: string;
  };
  themeSwitch: {
    debug: string;
    dark: string;
    light: string;
  };
  draftStatus: {
    checking: string;
    draft: string;
    draftWithRevision: string;
    published: string;
    unavailable: string;
    readFailed: string;
  };
  pages: {
    newPage: string;
    pageMeta: string;
    selectPage: string;
    deletePage: string;
    create: string;
    form: {
      title: string;
      path: string;
      description: string;
      titleRequired: string;
      pathRequired: string;
    };
  };
  canvas: {
    picker: PhiBuilderInsertPickerControlLabels;
  };
  pageTitles: {
    dashboard: string;
    modules: string;
    shells: string;
    pages: string;
    navigation: string;
    theme: string;
    revisions: string;
    settings: string;
    media: string;
  };
};

export const PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS: PhiBuilderChromeWidgetLabels = {
  toolbar: {
    save: "Save",
    livePreview: "Live preview",
    publish: "Publish",
    undo: "Undo",
    redo: "Redo",
    reset: "Reset",
  },
  modeSwitch: {
    editor: "Editor",
    preview: "Preview",
    previewSnapshotFailed: "Preview snapshot failed.",
  },
  themeSwitch: {
    debug: "Debug",
    dark: "Dark",
    light: "Light",
  },
  draftStatus: {
    checking: "Checking...",
    draft: "Draft",
    draftWithRevision: "Draft #{revisionId}",
    published: "Published",
    unavailable: "Unavailable",
    readFailed: "Failed to read draft status.",
  },
  pages: {
    newPage: "New page",
    pageMeta: "Page meta",
    selectPage: "Select page",
    deletePage: "Delete",
    create: "Create",
    form: {
      title: "Title",
      path: "Path",
      description: "Description",
      titleRequired: "Title is required.",
      pathRequired: "Path is required.",
    },
  },
  canvas: {
    picker: PHI_BUILDER_INSERT_PICKER_CONTROL_DEFAULT_LABELS,
  },
  pageTitles: {
    dashboard: "Dashboard",
    modules: "Modules",
    shells: "Shells",
    pages: "Pages",
    navigation: "Navigation",
    theme: "Theme",
    revisions: "Revisions",
    settings: "Settings",
    media: "Media",
  },
};

export function formatPhiBuilderDraftRevisionLabel(label: string, revisionId: number) {
  return label.replace("{revisionId}", String(revisionId));
}
