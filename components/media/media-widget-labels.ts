export type PhiAssetPreviewToolWidgetLabels = {
  searchPlaceholder: string;
  folderLabel: string;
  createFolderLabel: string;
  flagsLabel: string;
  flagPlaceholder: string;
  uploadToggleLabel: string;
  kindLabel: string;
  resetLabel: string;
  reloadLabel: string;
  assetsTemplate: string;
  imageKindLabel: string;
  videoKindLabel: string;
  audioKindLabel: string;
  pdfKindLabel: string;
  markdownKindLabel: string;
  documentKindLabel: string;
  archiveKindLabel: string;
  binaryKindLabel: string;
  otherKindLabel: string;
};

export type PhiAreaUploadWidgetLabels = {
  dropTitle: string;
  dropHint: string;
  uploadToggleLabel: string;
  retryLabel: string;
  deleteLabel: string;
  doneLabel: string;
  failedLabel: string;
  assetExistsLabel: string;
  deleteSuccessTemplate: string;
  uploadSuccessTemplate: string;
  uploadFailedText: string;
  /** The body never reached the storage Provider, or the Provider refused it. */
  uploadStorageUnreachableText: string;
  deleteFailedText: string;
};

export type PhiAssetPreviewGridWidgetLabels = {
  emptyDescription: string;
  deleteLabel: string;
  deleteSuccessTemplate: string;
  deleteFailedText: string;
};

export type PhiAssetInspectorWidgetLabels = {
  inspectorTitle: string;
  previewTitle: string;
  metadataTitle: string;
  variantsLabel: string;
  originalVariantLabel: string;
  thumbnailVariantLabel: string;
  previewVariantLabel: string;
  bannerVariantLabel: string;
  headerVariantLabel: string;
  cardVariantLabel: string;
  heroVariantLabel: string;
  avatarVariantLabel: string;
  logoVariantLabel: string;
  landscapeVariantLabel: string;
  portraitVariantLabel: string;
  storageKeyLabel: string;
  publicUrlLabel: string;
  contentTypeLabel: string;
  originalNameLabel: string;
  restrictedLabel: string;
  copyLabelTemplate: string;
};

export type PhiAssetInspectorEditorWidgetLabels = {
  titleLabel: string;
  altLabel: string;
  folderPathLabel: string;
  folderPathPlaceholder: string;
  folderPathHelp: string;
  createFolderTitle: string;
  folderNameLabel: string;
  folderNamePlaceholder: string;
  folderNameRequired: string;
  parentFolderLabel: string;
  topLevelFolderLabel: string;
  flagsLabel: string;
  focalRectLabel: string;
  focalRectButtonLabel: string;
  focalRectSaveLabel: string;
  focalRectResetLabel: string;
  focalRectClearLabel: string;
  focalRectHelpLabel: string;
  saveLabel: string;
  savingLabel: string;
  saveSuccessText: string;
  saveFailedText: string;
  privateFlagLabel: string;
  archivedFlagLabel: string;
  downloadFlagLabel: string;
  featuredFlagLabel: string;
  lockedFlagLabel: string;
  maskFlagLabel: string;
};

export type PhiAssetWidgetLabels = {
  tool: PhiAssetPreviewToolWidgetLabels;
  upload: PhiAreaUploadWidgetLabels;
  grid: PhiAssetPreviewGridWidgetLabels;
  inspector: PhiAssetInspectorWidgetLabels;
  editor: PhiAssetInspectorEditorWidgetLabels;
  picker: PhiMediaPickerWidgetLabels;
  space: PhiMediaSpaceSelectorLabels;
};

/**
 * Names for the Spaces a viewer may work in. A group Space is named after its group, so only the
 * unnamed kinds -- the Site's own library and a personal Space -- need a word here.
 */
export type PhiMediaSpaceSelectorLabels = {
  label: string;
  site: string;
  user: string;
  group: string;
};

export type PhiMediaPickerWidgetLabels = {
  triggerLabel: string;
  popoverTitle: string;
  selectedLabel: string;
  emptyDescription: string;
  clearLabel: string;
  tileSizeLabel: string;
};

export const PHI_MEDIA_WIDGET_DEFAULT_LABELS: PhiAssetWidgetLabels = {
  tool: {
    searchPlaceholder: "Search assets",
    folderLabel: "Folder",
    createFolderLabel: "Create folder",
    flagsLabel: "Flags",
    flagPlaceholder: "Flag",
    uploadToggleLabel: "Upload",
    kindLabel: "Kind",
    resetLabel: "Reset",
    reloadLabel: "Reload",
    assetsTemplate: "%1 assets",
    imageKindLabel: "image",
    videoKindLabel: "video",
    audioKindLabel: "audio",
    pdfKindLabel: "pdf",
    markdownKindLabel: "markdown",
    documentKindLabel: "document",
    archiveKindLabel: "archive",
    binaryKindLabel: "binary",
    otherKindLabel: "other",
  },
  upload: {
    dropTitle: "Drop assets here",
    dropHint: "or click to upload",
    uploadToggleLabel: "Upload",
    retryLabel: "Retry",
    deleteLabel: "Delete",
    doneLabel: "Done",
    failedLabel: "Failed",
    assetExistsLabel: "This asset already exists.",
    deleteSuccessTemplate: "Asset %1 deleted.",
    uploadSuccessTemplate: "Uploaded %1.",
    uploadFailedText: "Upload failed.",
    uploadStorageUnreachableText: "The file storage could not be reached. The upload never left this browser.",
    deleteFailedText: "Delete failed.",
  },
  grid: {
    emptyDescription: "No assets found.",
    deleteLabel: "Delete asset",
    deleteSuccessTemplate: "Asset %1 deleted.",
    deleteFailedText: "Delete failed.",
  },
  inspector: {
    inspectorTitle: "Asset inspector",
    previewTitle: "Preview",
    metadataTitle: "Metadata",
    variantsLabel: "Variants",
    originalVariantLabel: "Original",
    thumbnailVariantLabel: "Thumbnail",
    previewVariantLabel: "Preview",
    bannerVariantLabel: "Banner",
    headerVariantLabel: "Header",
    cardVariantLabel: "Card",
    heroVariantLabel: "Hero",
    avatarVariantLabel: "Avatar",
    logoVariantLabel: "Logo",
    landscapeVariantLabel: "Landscape",
    portraitVariantLabel: "Portrait",
    storageKeyLabel: "Storage key",
    publicUrlLabel: "Public URL",
    contentTypeLabel: "Content type",
    originalNameLabel: "Original name",
    restrictedLabel: "Restricted",
    copyLabelTemplate: "Copy %1",
  },
  editor: {
    titleLabel: "Title",
    altLabel: "Alt text",
    folderPathLabel: "Folder path",
    folderPathPlaceholder: "Summer 2024 / Costa Rica",
    folderPathHelp: "Select an existing folder.",
    createFolderTitle: "Create folder",
    folderNameLabel: "Name",
    folderNamePlaceholder: "Folder name",
    folderNameRequired: "Enter a folder name.",
    parentFolderLabel: "Parent folder",
    topLevelFolderLabel: "Top level",
    flagsLabel: "Flags",
    focalRectLabel: "Focal rect",
    focalRectButtonLabel: "Focal rect",
    focalRectSaveLabel: "Save focal rect",
    focalRectResetLabel: "Reset",
    focalRectClearLabel: "Clear",
    focalRectHelpLabel: "Drag a rectangle over the original image. The rect is stored on the asset and clears cached variants when changed.",
    saveLabel: "Save",
    savingLabel: "Saving...",
    saveSuccessText: "Asset saved.",
    saveFailedText: "Save failed.",
    privateFlagLabel: "private",
    archivedFlagLabel: "archived",
    downloadFlagLabel: "restricted",
    featuredFlagLabel: "featured",
    lockedFlagLabel: "locked",
    maskFlagLabel: "mask",
  },
  picker: {
    triggerLabel: "Mediathek",
    popoverTitle: "Mediathek",
    selectedLabel: "Selected asset",
    emptyDescription: "No assets found.",
    clearLabel: "Clear selection",
    tileSizeLabel: "Tile size",
  },
  space: {
    label: "Space",
    site: "Site library",
    user: "My files",
    group: "Group",
  },
};
