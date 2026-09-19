export type PhiIconPickerControlLabels = {
  buttonAriaLabel: string;
  modes: {
    standard: string;
    iconify: string;
  };
  placeholders: {
    iconName: string;
  };
  hints: {
    iconifySearchMinChars: string;
    noneSelected: string;
  };
  empty: {
    curated: string;
    search: string;
  };
  status: {
    loading: string;
    loadingMore: string;
    scrollMore: string;
  };
  errors: {
    search: string;
  };
  actions: {
    clear: string;
  };
};

export const PHI_ICON_PICKER_CONTROL_DEFAULT_LABELS: PhiIconPickerControlLabels = {
  buttonAriaLabel: "Widget icon",
  modes: {
    standard: "Standard",
    iconify: "Iconify",
  },
  placeholders: {
    iconName: "Icon name",
  },
  hints: {
    iconifySearchMinChars: "Type 2 characters or more to search Iconify.",
    noneSelected: "No icon",
  },
  empty: {
    curated: "No curated icons match the current filter.",
    search: "No Iconify icons match the current search.",
  },
  status: {
    loading: "Loading icons…",
    loadingMore: "Loading more…",
    scrollMore: "Scroll to load more",
  },
  errors: {
    // What went wrong, not how: the status code is for whoever reads the console, not for whoever
    // was looking for an icon.
    search: "Iconify could not be reached. The curated icons are still available.",
  },
  actions: {
    clear: "Clear",
  },
};
