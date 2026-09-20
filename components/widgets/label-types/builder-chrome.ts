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
      index: string;
      indexDescription: string;
    };
  };
  canvas: {
    picker: PhiBuilderInsertPickerControlLabels;
  };
  /**
   * The Area root selector in the Shells workspace header.
   *
   * Three labels, because everything below the first two is a Page and names itself. `automatic` is
   * what happens with nothing stored, and it is a choice rather than a blank: a Builder who picked a
   * Page has to be able to take it back, and the first navigation entry is what they take it back to.
   */
  rootRoute: {
    title: string;
    automatic: string;
    landing: string;
    landingPage: string;
    landingPageEmpty: string;
    landingPageAdopted: string;
  };
  /**
   * The dialog the Shells workspace keeps its statements about the Area in.
   *
   * The root route moved in here from the header, and the two SEO answers joined it, because they are
   * the same kind of sentence: about the Area being edited rather than about anything on the canvas.
   */
  areaSettings: {
    action: string;
    title: string;
    close: string;
    seoTitle: string;
    seoIndex: string;
    seoSitemap: string;
    titlesTitle: string;
    titleTemplate: string;
    titleTemplatePlaceholder: string;
    defaultTitle: string;
    defaultTitlePlaceholder: string;
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
      /*
       * Phrased as the permission and not as the refusal, so the switch reads the same way round as
       * the Area's own: on means found, off means not. The description carries the part an Operator
       * cannot see from the switch -- that a closed Area outranks an open Page.
       */
      index: "Allow indexing",
      indexDescription: "Only Public pages can be indexed, and only while the Area allows it.",
    },
  },
  canvas: {
    picker: PHI_BUILDER_INSERT_PICKER_CONTROL_DEFAULT_LABELS,
  },
  rootRoute: {
    title: "Area root",
    automatic: "First navigation entry",
    landing: "Landing page",
    landingPage: "Landing",
    // The option, not a report about the list: it is what a Builder picks to say the root is theirs to
    // construct. It used to read "No Module offers one", which was written when an empty list was the
    // only way to express this and now sits directly above the Pages that are on offer.
    landingPageEmpty: "Builder",
    landingPageAdopted: "edited here",
  },
  areaSettings: {
    action: "Area settings",
    title: "Area settings",
    close: "Done",
    seoTitle: "Search engines",
    seoIndex: "Allow indexing",
    seoSitemap: "List pages in the sitemap",
    titlesTitle: "Page titles",
    /*
     * The placeholders say what an empty field does rather than repeating the label.
     *
     * Both fields are answerable and both may be left alone, so the resting state has to be visible:
     * an Operator who types nothing here still gets titles, and the field is where that is said.
     */
    titleTemplate: "Title template",
    titleTemplatePlaceholder: "%s — site name",
    defaultTitle: "Default title",
    defaultTitlePlaceholder: "Site name",
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
