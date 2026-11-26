import { PHI_MEDIA_UPLOAD_DEFAULT_LABELS, type PhiMediaUploadLabels } from "./media-upload-labels";

export type PhiAssetPreviewToolWidgetLabels = {
  searchPlaceholder: string;
  folderLabel: string;
  createFolderLabel: string;
  /** Beside a locked Folder wherever Folders are offered: the lock is drawn, and this names it. */
  folderLockedLabel: string;
  lockFolderLabel: string;
  unlockFolderLabel: string;
  /** Standing over a locked Folder's contents, and what a refusal because of the lock reads as. */
  folderLockedText: string;
  folderLockFailedText: string;
  flagsLabel: string;
  flagPlaceholder: string;
  kindLabel: string;
  resetLabel: string;
  reloadLabel: string;
  /**
   * The Media renderer's toolbar action `add`: the Media library's picker, whose pick goes to the bound
   * resource's `add` action. A Collection of references to Assets offers it (a gallery); the Media
   * library's own does not.
   */
  chooseFromLibraryLabel: string;
  imageKindLabel: string;
  videoKindLabel: string;
  audioKindLabel: string;
  pdfKindLabel: string;
  markdownKindLabel: string;
  documentKindLabel: string;
  archiveKindLabel: string;
  fontKindLabel: string;
  binaryKindLabel: string;
  otherKindLabel: string;
  /**
   * The four flag words. Here and not with the Asset Module's editor because Core's toolbar flag filter
   * reads them, and Core cannot import the Module; the Module's metadata form reads them from here.
   */
  featuredFlagLabel: string;
  lockedFlagLabel: string;
  maskFlagLabel: string;
  backgroundFlagLabel: string;
};

export type PhiAreaUploadWidgetLabels = {
  dropTitle: string;
  dropHint: string;
  uploadToggleLabel: string;
  retryLabel: string;
  deleteLabel: string;
  doneLabel: string;
  failedLabel: string;
  deleteSuccessTemplate: string;
  uploadSuccessTemplate: string;
  deleteFailedText: string;
  /** The upload's own refusals, which are Core's `widget:upload` texts and not this Widget's. */
  refusals: PhiMediaUploadLabels;
};

export type PhiAssetPreviewGridWidgetLabels = {
  emptyDescription: string;
  /**
   * A tile's delete, the bound resource's `delete` action: the Media library deletes the file, a
   * Collection of references takes it out -- whose placement says so in its own words
   * (`presentation.labels.grid`).
   */
  deleteLabel: string;
  deleteSuccessTemplate: string;
  deleteFailedText: string;
  /** Said where the resource's `add` action refused an Asset picked or uploaded, without words of its own. */
  addFailedText: string;
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
  iconVariantLabel: string;
  shareVariantLabel: string;
  publicUrlLabel: string;
  contentTypeLabel: string;
  originalNameLabel: string;
  copyLabelTemplate: string;
};

export type PhiAssetInspectorEditorWidgetLabels = {
  titleLabel: string;
  altLabel: string;
  folderPathLabel: string;
  folderPathPlaceholder: string;
  createFolderTitle: string;
  folderNameLabel: string;
  folderNamePlaceholder: string;
  folderNameRequired: string;
  parentFolderLabel: string;
  topLevelFolderLabel: string;
  flagsLabel: string;
  focalRectLabel: string;
  focalRectButtonLabel: string;
};

/**
 * What the Foundation's Media surfaces say, one Label Set for all of them (`label-sets/media.ts`): the
 * picker, the Space names, the grid and the toolbar, and the upload surface's own texts, which are Core's
 * `widget:upload` set. The inspector and the metadata editor are the Asset Module's and are not here.
 */
export type PhiAssetWidgetLabels = {
  tool: PhiAssetPreviewToolWidgetLabels;
  upload: PhiAreaUploadWidgetLabels;
  grid: PhiAssetPreviewGridWidgetLabels;
  picker: PhiMediaPickerWidgetLabels;
  space: PhiMediaSpaceSelectorLabels;
};

/**
 * What the Asset Module's own surfaces say: the Inspector's sections and the metadata editor. The types
 * and the English defaults stay in the Foundation because Foundation components draw them (the inspector
 * section, the focal rect) and take them as props; only the Label Set that translates them, and its
 * loader, are the Module's (`plugins/runtime-modules/asset/labels.ts`).
 */
export type PhiAssetModuleLabels = {
  inspector: PhiAssetInspectorWidgetLabels;
  editor: PhiAssetInspectorEditorWidgetLabels;
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
  emptyDescription: string;
  loadFailedDescription: string;
  clearLabel: string;
  tileSizeLabel: string;
  /** The switch beside the Space select: the Site's library, or a media source. */
  sourceLabel: string;
  sourceFailedText: string;
  importingLabel: string;
  importFailedText: string;
  loadMoreLabel: string;
};

export const PHI_MEDIA_WIDGET_DEFAULT_LABELS: PhiAssetWidgetLabels = {
  tool: {
    searchPlaceholder: "Search assets",
    folderLabel: "Folder",
    createFolderLabel: "Create folder",
    folderLockedLabel: "Locked",
    lockFolderLabel: "Lock folder",
    unlockFolderLabel: "Unlock folder",
    folderLockedText: "This folder is locked. Nothing can be added to it, moved in or out of it or deleted from it until it is unlocked.",
    folderLockFailedText: "The folder could not be changed.",
    flagsLabel: "Flags",
    flagPlaceholder: "Flag",
    kindLabel: "Kind",
    resetLabel: "Reset",
    reloadLabel: "Reload",
    chooseFromLibraryLabel: "Choose from Media library",
    imageKindLabel: "image",
    videoKindLabel: "video",
    audioKindLabel: "audio",
    pdfKindLabel: "pdf",
    markdownKindLabel: "markdown",
    documentKindLabel: "document",
    archiveKindLabel: "archive",
    fontKindLabel: "font",
    binaryKindLabel: "binary",
    otherKindLabel: "other",
    featuredFlagLabel: "featured",
    lockedFlagLabel: "locked",
    maskFlagLabel: "mask",
    backgroundFlagLabel: "background",
  },
  upload: {
    dropTitle: "Drop assets here",
    dropHint: "or click to upload",
    uploadToggleLabel: "Upload",
    retryLabel: "Retry",
    deleteLabel: "Delete",
    doneLabel: "Done",
    failedLabel: "Failed",
    deleteSuccessTemplate: "Asset %1 deleted.",
    uploadSuccessTemplate: "Uploaded %1.",
    deleteFailedText: "Delete failed.",
    refusals: PHI_MEDIA_UPLOAD_DEFAULT_LABELS,
  },
  grid: {
    emptyDescription: "No assets found.",
    deleteLabel: "Delete asset",
    deleteSuccessTemplate: "Asset %1 deleted.",
    deleteFailedText: "Delete failed.",
    addFailedText: "The file could not be added.",
  },
  picker: {
    triggerLabel: "Mediathek",
    popoverTitle: "Mediathek",
    emptyDescription: "No assets found.",
    loadFailedDescription: "The media library could not be loaded.",
    clearLabel: "Clear selection",
    tileSizeLabel: "Tile size",
    sourceLabel: "Source",
    sourceFailedText: "The source did not answer.",
    importingLabel: "Importing...",
    importFailedText: "The file could not be imported.",
    loadMoreLabel: "Load more",
  },
  space: {
    label: "Space",
    site: "Site library",
    user: "My files",
    group: "Group",
  },
};

export const PHI_ASSET_MODULE_DEFAULT_LABELS: PhiAssetModuleLabels = {
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
    iconVariantLabel: "Icon",
    shareVariantLabel: "Share",
    publicUrlLabel: "Public URL",
    contentTypeLabel: "Content type",
    originalNameLabel: "Original name",
    copyLabelTemplate: "Copy %1",
  },
  editor: {
    titleLabel: "Title",
    altLabel: "Alt text",
    folderPathLabel: "Folder path",
    folderPathPlaceholder: "Summer 2024 / Costa Rica",
    createFolderTitle: "Create folder",
    folderNameLabel: "Name",
    folderNamePlaceholder: "Folder name",
    folderNameRequired: "Enter a folder name.",
    parentFolderLabel: "Parent folder",
    topLevelFolderLabel: "Top level",
    flagsLabel: "Flags",
    focalRectLabel: "Focal rect",
    focalRectButtonLabel: "Focal rect",
  },
};
