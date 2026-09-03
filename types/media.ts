import {
  PhiImageAssetVariantKey,
  PhiMediaAssetFlags,
  PhiMediaFolderFlags,
  PhiMediaKind,
} from "../constants/media";

export type PhiMediaKindValue = (typeof PhiMediaKind)[keyof typeof PhiMediaKind];
export type PhiImageAssetVariantKeyValue =
  (typeof PhiImageAssetVariantKey)[keyof typeof PhiImageAssetVariantKey];

type PhiMediaImageSourceUrlConfig = {
  sourceKind?: "url";
  sourceUrl?: string;
};

type PhiMediaImageAssetSourceConfig = {
  sourceKind: "asset";
  assetId?: number;
  variantKey?: PhiImageAssetVariantKeyValue | null;
  variantVersion?: number | null;
};

export type PhiMediaImageSourceConfig = (
  PhiMediaImageSourceUrlConfig | PhiMediaImageAssetSourceConfig
) & {
  trusted?: boolean;
  alt?: string;
  blurDataUrl?: string;
  previewMode?: "none" | "native" | "lightbox";
  sizes?: string;
  preload?: boolean;
};

export type PhiMediaAssetFolder = {
  id: number;
  siteId: number;
  spaceId: number;
  parentId: number | null;
  name: string;
  sortOrder: number;
  flags: number;
  createdAt?: string;
  updatedAt?: string;
};

export type PhiMediaSpaceKind = "site" | "user" | "group";

/**
 * The Space kinds a Module may declare a need for.
 *
 * The Site Space is not declarable: it always exists and is governed by the Core Media role matrix,
 * so a declaration could only ever repeat what is already true.
 */
export type PhiDeclarableMediaSpaceKind = Exclude<PhiMediaSpaceKind, "site">;

export const PHI_DECLARABLE_MEDIA_SPACE_KINDS = ["user", "group"] as const satisfies
  readonly PhiDeclarableMediaSpaceKind[];

export function isPhiDeclarableMediaSpaceKind(value: unknown): value is PhiDeclarableMediaSpaceKind {
  return (PHI_DECLARABLE_MEDIA_SPACE_KINDS as readonly string[]).includes(value as string);
}

export type PhiMediaSpace = {
  id: number;
  kind: PhiMediaSpaceKind;
};

/**
 * One Space as the control plane offers it for selection.
 *
 * `id` is `null` for a group whose Space nothing has written to yet -- discovery must not create a row
 * -- which is why a request names a Space by `address` rather than by id.
 */
export type PhiMediaSpaceOption = {
  id: number | null;
  address: string;
  kind: PhiMediaSpaceKind;
  groupId: number | null;
  name: string | null;
  quotaBytes: number | null;
  usedBytes: number;
  reservedBytes: number;
};

export type PhiMediaAssetVariant = {
  assetId: number;
  variantKey: PhiImageAssetVariantKeyValue;
  deliveryUrl: string;
  contentType: string;
  bytes: number | null;
  checksumSha256: string | null;
  width: number;
  height: number;
  blurDataUrl: string | null;
  flags: number;
  createdAt?: string;
  updatedAt?: string;
};

export type PhiMediaAsset = {
  id: number;
  siteId: number;
  spaceId: number;
  folderId: number | null;
  createdByUserId: number | null;
  updatedByUserId: number | null;
  variantVersion?: number | null;
  deliveryUrl: string;
  originalName: string;
  contentType: string;
  kind: PhiMediaKindValue;
  bytes: number | null;
  checksumSha256: string | null;
  width: number | null;
  height: number | null;
  blurDataUrl: string | null;
  thumbnailUrl?: string | null;
  previewUrl?: string | null;
  meta: Record<string, unknown> | null;
  title: string | null;
  altText: string | null;
  lifecycleStatus: number;
  deliveryPolicy: number;
  deliveryRevision: number;
  presentationFlags: number;
  createdAt?: string;
  updatedAt?: string;
  folder?: PhiMediaAssetFolder | null;
  variants?: PhiMediaAssetVariant[] | null;
};

export type PhiMediaAssetTile = {
  id: number;
  siteId: number;
  spaceId: number;
  folderId: number | null;
  createdByUserId: number | null;
  updatedByUserId: number | null;
  variantVersion?: number | null;
  originalName: string;
  title: string | null;
  altText: string | null;
  deliveryUrl: string;
  thumbnailUrl?: string | null;
  previewUrl?: string | null;
  contentType: string;
  kind: PhiMediaKindValue;
  width: number | null;
  height: number | null;
  bytes: number | null;
  checksumSha256: string | null;
  lifecycleStatus: number;
  deliveryPolicy: number;
  deliveryRevision: number;
  presentationFlags: number;
  blurDataUrl?: string | null;
  meta?: Record<string, unknown> | null;
  folder?: Pick<PhiMediaAssetFolder, "id" | "name"> | null;
};

export type PhiMediaPickerState = {
  query: string;
  folderId: number | null;
  kind: PhiMediaKindValue | null;
  presentationFlags: number | null;
  selectedAssetId: number | null;
  selectedVariantKey: PhiImageAssetVariantKeyValue | null;
  mode: "compact" | "full";
};

export type PhiMediaAssetPickerMode = PhiMediaPickerState["mode"];

export type PhiMediaAssetSelection = {
  assetId: number | null;
  asset: PhiMediaAsset | null;
  tile?: PhiMediaAssetTile | null;
  variantKey?: PhiImageAssetVariantKeyValue | null;
};

export type PhiMediaPickerPagination = {
  page: number;
  pageSize: number;
  total?: number;
  hasMore: boolean;
};

export type PhiMediaPickerResponse = {
  activeSpace: PhiMediaSpace;
  spaces?: PhiMediaSpaceOption[];
  assets: PhiMediaAssetTile[];
  folders: PhiMediaAssetFolder[];
  selectedAsset?: PhiMediaAsset | null;
  selectedAssetVariants?: PhiMediaAssetVariant[] | null;
  pagination?: PhiMediaPickerPagination;
};

export type PhiMediaAssetFilter = {
  id?: number | null;
  folderId?: number | null;
  query?: string | null;
  kind?: PhiMediaPickerState["kind"];
  contentType?: string | null;
  presentationFlags?: number | null;
  limit?: number | null;
  offset?: number | null;
};

export const PhiMediaAssetFlagNames = {
  Featured: PhiMediaAssetFlags.Featured,
  Locked: PhiMediaAssetFlags.Locked,
  Mask: PhiMediaAssetFlags.Mask,
} as const;

export const PhiMediaFolderFlagNames = {
  Collapsed: PhiMediaFolderFlags.Collapsed,
  Hidden: PhiMediaFolderFlags.Hidden,
  Locked: PhiMediaFolderFlags.Locked,
} as const;

/**
 * The public rendering projection of a resolved `phis:asset/<id>` reference.
 *
 * Deliberately narrower than `PhiMediaAsset`: it carries only what a rendered public page already
 * reveals. Ownership, Folder placement, audit attribution, checksum, byte size, and `meta` never
 * reach this path, and lifecycle plus delivery policy are absent because the server only emits
 * publicly deliverable Site Space Assets.
 */
export type PhiPublicMediaAssetReference = {
  id: number;
  deliveryUrl: string;
  deliveryRevision: number;
  variantVersion: number | null;
  contentType: string;
  kind: PhiMediaKindValue;
  originalName: string;
  width: number | null;
  height: number | null;
  blurDataUrl: string | null;
  title: string | null;
  altText: string | null;
  thumbnailUrl: string | null;
  previewUrl: string | null;
  focalRect: { x: number; y: number; width: number; height: number } | null;
};
