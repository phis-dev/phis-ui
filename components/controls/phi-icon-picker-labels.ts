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
  actions: {
    clear: "Clear",
  },
};
