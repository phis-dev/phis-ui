export const PHI_ASSET_CONTROLLER_STORE_KEY = "asset";

export const PHI_ASSET_SIGNAL_CHANNELS = {
  kind: "assetKind",
  presentationFlags: "assetFlags",
  path: "assetPath",
  query: "assetQuery",
  pagination: "assetPagination",
  reload: "assetReload",
  selection: "assetSelection",
  command: "assetInspectorCommand",
  submit: "assetInspectorSubmit",
  submitting: "assetInspectorSubmitting",
  collectionAction: "assetCollectionAction",
  folderCommand: "assetFolderCommand",
  folderSubmit: "assetFolderSubmit",
  folderSubmitting: "assetFolderSubmitting",
} as const;
