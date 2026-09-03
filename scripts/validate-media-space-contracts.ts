import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { PhiMediaAssetFlags, PhiMediaKind } from "../constants/media";
import { PHI_ASSET_RUNTIME_DATA_PROVIDER_KEYS } from "../plugins/runtime-modules/asset/ids";
import { PHI_ASSET_RUNTIME_DATA_PROVIDER_DESCRIPTORS } from "../plugins/runtime-modules/asset/data-providers";
import { PHI_ASSET_RUNTIME_MODULE_DEFINITION } from "../plugins/runtime-modules/asset/definition";
import { PHI_AVATAR_RUNTIME_MODULE_DEFINITION } from "../plugins/runtime-modules/avatar/definition";
import { PHI_GROUPS_RUNTIME_MODULE_DEFINITION } from "../plugins/runtime-modules/groups/definition";
import { PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG } from "../plugins/runtime-modules/catalog";
import { PHI_PUBLIC_RUNTIME_MODULE_ID } from "../plugins/runtime-modules/public/ids";
import { PHI_ASSET_RUNTIME_MODULE_ID } from "../plugins/runtime-modules/asset/ids";
import { resolvePhiRuntimeModuleServerBinding } from "../plugins/runtime-modules/server-capabilities";
import {
  readPhiRuntimeModuleIds,
  resolvePhiDeclaredMediaSpaces,
  resolvePhiRuntimeModuleIdsForArea,
} from "../plugins/runtime-modules/settings";
import type { PhiRuntimeModuleId } from "../types/cms-module-descriptors";
import type { PhiRuntimeModuleDefinition } from "../plugins/runtime-modules/contracts";
import type {
  PhiServerCapabilitySnapshot,
  PhiServerCapabilityId,
} from "../types/server-capabilities";
import type {
  PhiDeclarableMediaSpaceKind,
  PhiMediaKindValue,
  PhiMediaAssetFolder,
  PhiMediaAssetTile,
  PhiMediaSpaceOption,
} from "../types/media";
import {
  buildPhiMediaSpaceOptions,
  canPhiSurfaceSelectMediaSpace,
} from "../components/media/media-space-selection";
import {
  PHI_ASSET_COLLECTION_DATA_SOURCE,
  applyPhiAssetCollectionData,
  buildPhiAssetCollectionQuery,
} from "../components/media/asset-collection-runtime";
import {
  buildPhiImagePreviewFolderPathSegments,
  normalizePhiImagePreviewTile,
  readPhiImagePreviewResponse,
} from "../components/media/phi-image-preview-data";
import {
  phiImagePreviewStore,
  resetPhiImagePreviewStore,
} from "../components/media/phi-image-preview-store";
import { PHI_ASSET_CONTROLLER_STORE_KEY } from "../components/media/asset-controller-signals";
import {
  buildPhiMediaFolderCascaderOptions,
  buildPhiMediaFolderOptions,
  buildPhiMediaFolderPathById,
  buildPhiMediaFolderValueById,
  combinePhiMediaFlagValues,
  resolvePhiMediaFolderIdFromValue,
} from "../components/media/phi-media-scope-controller";
import {
  initPhiMediaUploadSession,
  resolvePhiMediaUploadInitOptions,
  uploadPhiMediaUploadBody,
  type PhiMediaUploadPlan,
} from "../components/media/media-upload-flow";
import {
  PHI_ASSET_INSPECTOR_OVERLAY_IDS,
  PHI_ASSET_INSPECTOR_WIDGET_IDS,
  PHI_ASSET_MEDIA_PAGE_WIDGET_IDS,
} from "../components/media/asset-inspector-addresses";
import { createPhiAssetControllerAddress } from "../components/media/asset-controller-address";
import { createPhiMediaPickerAssetControllerRoutes } from "../components/media/asset-controller-routes";

const readSource = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

// ---------------------------------------------------------------------------
// Space isolation
// ---------------------------------------------------------------------------

/**
 * The Space a request resolves to is the server's decision. Nothing in the shared UI may name one, or
 * a Picker in one Area could reach into another member's User Space. The Collection data source is
 * therefore parameterless and the query surface carries no Space field.
 */
assert.deepEqual(
  Object.keys(PHI_ASSET_COLLECTION_DATA_SOURCE).sort(),
  ["providerKey", "resourceKey"],
);
assert.equal(
  PHI_ASSET_COLLECTION_DATA_SOURCE.providerKey,
  PHI_ASSET_RUNTIME_DATA_PROVIDER_KEYS.mediaCollection,
);

const collectionDescriptor = PHI_ASSET_RUNTIME_DATA_PROVIDER_DESCRIPTORS
  .find(({ key }) => key === PHI_ASSET_RUNTIME_DATA_PROVIDER_KEYS.mediaCollection);
assert.ok(collectionDescriptor, "The media Collection provider must stay declared.");
const assetResource = "resources" in collectionDescriptor
  ? collectionDescriptor.resources?.find(({ resourceKey }) => resourceKey === "assets")
  : undefined;
assert.ok(assetResource, "The media Collection provider must expose the assets resource.");
assert.deepEqual(
  (assetResource.query?.filterFields ?? []).map(({ key }) => key).sort(),
  ["folderId", "kind", "presentationFlags"],
  "An author must never be able to pin a Space, owner or Storage filter into a Widget's query.",
);

const collectionQuery = buildPhiAssetCollectionQuery({
  page: 2,
  pageSize: 24,
  searchQuery: "logo",
  folderId: 7,
  kind: PhiMediaKind.Image,
  presentationFlags: PhiMediaAssetFlags.Featured,
  since: null,
  until: null,
});
assert.deepEqual(Object.keys(collectionQuery.filters ?? {}).sort(), [
  "folderId",
  "kind",
  "presentationFlags",
  "since",
  "until",
]);
assert.equal(collectionQuery.page, 2);
assert.equal(collectionQuery.pageSize, 24);
assert.equal(collectionQuery.search, "logo");
assert.equal(collectionQuery.sortKey, "created_at");

/**
 * `activeSpace` is reported state, not a request parameter. A User or Group Space must survive
 * verbatim: silently normalizing it to `site` would make an isolated Space look like the shared one.
 */
const folders: PhiMediaAssetFolder[] = [
  { id: 1, siteId: 1, spaceId: 5, parentId: null, name: "Brand", sortOrder: 1, flags: 0 },
  { id: 2, siteId: 1, spaceId: 5, parentId: 1, name: "Logos", sortOrder: 0, flags: 0 },
  { id: 3, siteId: 1, spaceId: 5, parentId: null, name: "Archive", sortOrder: 0, flags: 0 },
];
const tile = (id: number, spaceId: number, folderId: number | null) => ({
  id,
  siteId: 1,
  spaceId,
  folderId,
  createdByUserId: null,
  updatedByUserId: null,
  originalName: `${id}.png`,
  title: null,
  altText: null,
  deliveryUrl: `https://cdn.test/${id}.png`,
  contentType: "image/png",
  kind: PhiMediaKind.Image,
  width: 10,
  height: 10,
  bytes: 100,
  checksumSha256: null,
  lifecycleStatus: 1,
  deliveryPolicy: 1,
  deliveryRevision: 1,
  presentationFlags: 0,
}) as unknown as PhiMediaAssetTile;

resetPhiImagePreviewStore(PHI_ASSET_CONTROLLER_STORE_KEY);
applyPhiAssetCollectionData({
  items: [tile(10, 9, 2)],
  meta: { activeSpace: { id: 9, kind: "user" }, folders, pagination: { page: 1, pageSize: 20, hasMore: false } },
} as never, "request-1");
const afterUserSpace = phiImagePreviewStore.getSnapshot(PHI_ASSET_CONTROLLER_STORE_KEY);
assert.deepEqual(afterUserSpace.activeSpace, { id: 9, kind: "user" });
assert.deepEqual(afterUserSpace.folders.map(({ id }) => id), [1, 2, 3]);
assert.equal(afterUserSpace.resolvedCollectionRequestKey, "request-1");

// A payload without meta must not throw and must not keep a stale Space claim.
applyPhiAssetCollectionData({ items: [] } as never, "request-2");
const afterEmptyMeta = phiImagePreviewStore.getSnapshot(PHI_ASSET_CONTROLLER_STORE_KEY);
assert.equal(afterEmptyMeta.activeSpace, null);
assert.deepEqual(afterEmptyMeta.folders, []);
assert.equal(afterEmptyMeta.pagination, null);
resetPhiImagePreviewStore(PHI_ASSET_CONTROLLER_STORE_KEY);

// The Space id stays on the tile, so Space-aware presentation never has to guess.
assert.equal(normalizePhiImagePreviewTile(tile(11, 9, 2) as never, folders).spaceId, 9);
assert.deepEqual(
  normalizePhiImagePreviewTile(tile(11, 9, 2) as never, folders).folder,
  { id: 2, name: "Logos" },
);
// A Folder from another Space is not resolved onto the tile by id alone.
assert.equal(normalizePhiImagePreviewTile(tile(12, 9, 99) as never, folders).folder, null);

/**
 * The public reference projection is the one place an Asset crosses into a rendered page. Its own
 * documentation promises that ownership, placement, audit attribution and integrity data stay behind;
 * hold the type to that promise so a convenience field cannot leak a Space id to the Public.
 */
const mediaTypesSource = await readSource("types/media.ts");
const publicReferenceBlock = mediaTypesSource.slice(
  mediaTypesSource.indexOf("export type PhiPublicMediaAssetReference"),
);
assert.ok(publicReferenceBlock.length > 0, "The public Asset reference projection must stay declared.");
for (const forbiddenField of [
  "spaceId",
  "folderId",
  "createdByUserId",
  "updatedByUserId",
  "checksumSha256",
  "bytes",
  "meta",
  "lifecycleStatus",
  "deliveryPolicy",
  "siteId",
]) {
  assert.doesNotMatch(
    publicReferenceBlock,
    new RegExp(`^\\s*${forbiddenField}\\??:`, "mu"),
    `The public Asset reference projection must not carry "${forbiddenField}".`,
  );
}

// ---------------------------------------------------------------------------
// Folder filtering
// ---------------------------------------------------------------------------

assert.deepEqual(buildPhiMediaFolderOptions(folders), [
  { value: 3, label: "Archive" },
  { value: 1, label: "Brand", children: [{ value: 2, label: "Logos" }] },
]);
assert.deepEqual(buildPhiMediaFolderPathById(folders, 2), [1, 2]);
assert.deepEqual(buildPhiMediaFolderPathById(folders, null), []);
assert.deepEqual(buildPhiMediaFolderPathById(folders, 404), []);
assert.equal(buildPhiMediaFolderValueById(folders, 2), "/1/2");
assert.equal(buildPhiMediaFolderValueById(folders, null), "/");
assert.deepEqual(buildPhiMediaFolderCascaderOptions(folders), [
  { value: "/3", label: "Archive" },
  { value: "/1", label: "Brand" },
  { value: "/1/2", label: "Logos" },
]);
assert.deepEqual(buildPhiImagePreviewFolderPathSegments(folders, 2), ["Brand", "Logos"]);
assert.deepEqual(buildPhiImagePreviewFolderPathSegments(folders, null), []);

// A corrupt parent chain must terminate rather than hang the Picker.
const cyclicFolders: PhiMediaAssetFolder[] = [
  { id: 1, siteId: 1, spaceId: 5, parentId: 2, name: "A", sortOrder: 0, flags: 0 },
  { id: 2, siteId: 1, spaceId: 5, parentId: 1, name: "B", sortOrder: 0, flags: 0 },
];
assert.deepEqual(buildPhiMediaFolderPathById(cyclicFolders, 1), [2, 1]);
assert.deepEqual(buildPhiImagePreviewFolderPathSegments(cyclicFolders, 1), ["B", "A"]);
// An orphan stops at the missing parent instead of inventing a root.
const orphanFolders: PhiMediaAssetFolder[] = [
  { id: 4, siteId: 1, spaceId: 5, parentId: 99, name: "Orphan", sortOrder: 0, flags: 0 },
];
assert.deepEqual(buildPhiMediaFolderPathById(orphanFolders, 4), [4]);

// A Folder value only selects a Folder that exists in the current Space projection.
assert.equal(resolvePhiMediaFolderIdFromValue(folders, "/1/2"), 2);
assert.equal(resolvePhiMediaFolderIdFromValue(folders, "/"), null);
assert.equal(resolvePhiMediaFolderIdFromValue(folders, ""), null);
assert.equal(resolvePhiMediaFolderIdFromValue(folders, null), null);
assert.equal(resolvePhiMediaFolderIdFromValue(folders, "/1/404"), null);
assert.equal(resolvePhiMediaFolderIdFromValue(folders, "/Brand/Logos"), null);
assert.equal(resolvePhiMediaFolderIdFromValue([], "/1"), null);

assert.equal(
  combinePhiMediaFlagValues([PhiMediaAssetFlags.Featured, PhiMediaAssetFlags.Locked]),
  PhiMediaAssetFlags.Featured | PhiMediaAssetFlags.Locked,
);
assert.equal(combinePhiMediaFlagValues([]), 0);

// ---------------------------------------------------------------------------
// Picker and Inspector binding
// ---------------------------------------------------------------------------

const pickerRoutes = createPhiMediaPickerAssetControllerRoutes("test-picker", "area");
const assetControllerAddress = createPhiAssetControllerAddress();
const pickerEmits = pickerRoutes.emits ?? [];
assert.ok(pickerEmits.length > 0);
for (const route of pickerEmits) {
  assert.equal(route.receiver, assetControllerAddress, "Every Picker emit addresses the Asset controller.");
  assert.equal(route.scope, "area");
  assert.ok(route.routeKey.startsWith("test-picker-"));
}
assert.equal(
  new Set(pickerEmits.map(({ routeKey }) => routeKey)).size,
  pickerEmits.length,
  "Route keys must stay unique so two Pickers on one Page do not collide.",
);
assert.deepEqual(
  (createPhiMediaPickerAssetControllerRoutes("a", "area").emits ?? []).map(({ capabilityId }) => capabilityId),
  (createPhiMediaPickerAssetControllerRoutes("b", "page").emits ?? []).map(({ capabilityId }) => capabilityId),
  "The capability set is independent of prefix and scope.",
);

// Inspector, Overlay and Media page instance ids must not collide with each other.
const inspectorIds = [
  ...Object.values(PHI_ASSET_INSPECTOR_OVERLAY_IDS),
  ...Object.values(PHI_ASSET_INSPECTOR_WIDGET_IDS),
  ...Object.values(PHI_ASSET_MEDIA_PAGE_WIDGET_IDS),
];
assert.equal(new Set(inspectorIds).size, inspectorIds.length);

// The Picker reads the Collection provider rather than fetching media itself.
const pickerBindingSource = await readSource("components/media/phi-media-picker-binding.tsx");
assert.match(pickerBindingSource, /PHI_ASSET_COLLECTION_DATA_SOURCE/u);
assert.doesNotMatch(
  pickerBindingSource,
  /fetch\(/u,
  "The Picker must not open its own media request path.",
);

// ---------------------------------------------------------------------------
// Upload context inheritance
// ---------------------------------------------------------------------------

// A hosting Collection panel owns the context outright, including a deliberate "no flags".
assert.deepEqual(
  resolvePhiMediaUploadInitOptions({
    collectionContext: { folderId: 7, presentationFlags: PhiMediaAssetFlags.Featured },
    previewState: { folderId: 1, presentationFlags: PhiMediaAssetFlags.Locked },
    configPresentationFlags: PhiMediaAssetFlags.Mask,
  }),
  { folderId: 7, presentationFlags: PhiMediaAssetFlags.Featured, spaceAddress: null },
);
assert.deepEqual(
  resolvePhiMediaUploadInitOptions({
    collectionContext: { folderId: null, presentationFlags: null },
    previewState: { folderId: 1, presentationFlags: PhiMediaAssetFlags.Locked },
    configPresentationFlags: PhiMediaAssetFlags.Mask,
  }),
  { folderId: null, presentationFlags: 0, spaceAddress: null },
);
// Standalone uploads inherit the controller's preview state, then the Widget default.
assert.deepEqual(
  resolvePhiMediaUploadInitOptions({
    previewState: { folderId: 1, presentationFlags: PhiMediaAssetFlags.Locked },
    configPresentationFlags: PhiMediaAssetFlags.Mask,
  }),
  { folderId: 1, presentationFlags: PhiMediaAssetFlags.Locked, spaceAddress: null },
);
assert.deepEqual(
  resolvePhiMediaUploadInitOptions({
    previewState: { folderId: null, presentationFlags: null },
    configPresentationFlags: PhiMediaAssetFlags.Mask,
  }),
  { folderId: null, presentationFlags: PhiMediaAssetFlags.Mask, spaceAddress: null },
);
assert.deepEqual(
  resolvePhiMediaUploadInitOptions({ previewState: { folderId: null, presentationFlags: null } }),
  { folderId: null, presentationFlags: 0, spaceAddress: null },
);

/**
 * The Space is inherited whole, from whichever context supplies it, and a hosting panel does not
 * override it -- a panel owns its Folder and its flags, never the Space it is looking at.
 */
assert.deepEqual(
  resolvePhiMediaUploadInitOptions({
    collectionContext: { folderId: 7, presentationFlags: null },
    previewState: { folderId: 1, presentationFlags: null },
    activeSpaceAddress: "group:4",
  }),
  { folderId: 7, presentationFlags: 0, spaceAddress: "group:4" },
);
assert.deepEqual(
  resolvePhiMediaUploadInitOptions({
    previewState: { folderId: null, presentationFlags: null },
    activeSpaceAddress: "  ",
  }),
  { folderId: null, presentationFlags: 0, spaceAddress: null },
  "A blank Space is no Space, which asks for the Site Space.",
);

/**
 * The upload session request carries the inherited context and nothing else. The Space it names is the
 * one the surface was reading; it never names a Storage location, and the control plane resolves both
 * against the authenticated actor regardless of what was asked for.
 */
const uploadRequests: Array<{ url: string; body: Record<string, unknown> }> = [];
const originalFetch = globalThis.fetch;
globalThis.fetch = (async (input: unknown, init?: { body?: unknown }) => {
  uploadRequests.push({ url: String(input), body: JSON.parse(String(init?.body)) as Record<string, unknown> });
  return new Response(
    JSON.stringify({
      token: "t",
      plan: { kind: "proxy-stream", url: "/api/site/media/uploads/t", method: "PUT" },
      finalizeUrl: "/finalize",
      expiresAt: "",
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}) as typeof globalThis.fetch;

const uploadFile = { name: "logo.png", type: "image/png", size: 1234 } as File;
await initPhiMediaUploadSession(uploadFile, { folderId: 7, presentationFlags: 0, meta: { source: "test" } });
assert.equal(uploadRequests[0]?.url, "/api/site/media/uploads/init");
assert.deepEqual(uploadRequests[0]?.body, {
  filename: "logo.png",
  contentType: "image/png",
  size: 1234,
  folderId: 7,
  presentationFlags: 0,
  meta: { source: "test" },
});

uploadRequests.length = 0;
await initPhiMediaUploadSession({ name: "x", type: "", size: 0 } as File, {
  folderId: 0,
  presentationFlags: null,
  meta: [] as unknown as Record<string, unknown>,
});
assert.deepEqual(uploadRequests[0]?.body, {
  filename: "x",
  contentType: "application/octet-stream",
  size: 0,
});

uploadRequests.length = 0;
await initPhiMediaUploadSession(uploadFile, { folderId: 7, spaceAddress: "group:4" });
assert.equal(
  uploadRequests[0]?.url,
  "/api/site/media/uploads/init?spaceId=group%3A4",
  "The Space is named as a query parameter, the way every Media route names one.",
);
assert.equal(
  "spaceId" in (uploadRequests[0]?.body ?? {}),
  false,
  "The body describes the Asset, not the Space it lands in.",
);

uploadRequests.length = 0;
await initPhiMediaUploadSession(uploadFile, { folderId: 7, spaceAddress: null });
assert.equal(
  uploadRequests[0]?.url,
  "/api/site/media/uploads/init",
  "No Space named is what asks for the Site Space.",
);

uploadRequests.length = 0;
await initPhiMediaUploadSession(uploadFile, { folderId: -3 });
assert.equal("folderId" in (uploadRequests[0]?.body ?? {}), false);
uploadRequests.length = 0;
await initPhiMediaUploadSession(uploadFile, { folderId: 1.5 });
assert.equal("folderId" in (uploadRequests[0]?.body ?? {}), false);

globalThis.fetch = originalFetch;

/**
 * The upload plan is carried out, not decided here.
 *
 * The Server states how a body is to be delivered, and this executor obeys the statement -- including
 * the part that keeps a Site's credentials away from a Provider's own endpoint. A plan it does not
 * understand is refused rather than approximated, because the only available approximation would send
 * the body to the wrong place.
 */
type RecordedUpload = {
  method: string;
  url: string;
  headers: Record<string, string>;
  withCredentials: boolean;
};
const uploads: RecordedUpload[] = [];
class FakeXhr {
  status = 200;
  responseText = JSON.stringify({ token: "t", status: "uploaded" });
  withCredentials = false;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  upload = { onprogress: null as ((event: unknown) => void) | null };
  private record: RecordedUpload = { method: "", url: "", headers: {}, withCredentials: false };
  open(method: string, url: string) {
    this.record.method = method;
    this.record.url = url;
  }
  setRequestHeader(header: string, value: string) {
    this.record.headers[header] = value;
  }
  send() {
    this.record.withCredentials = this.withCredentials;
    uploads.push(this.record);
    this.onload?.();
  }
}
(globalThis as { XMLHttpRequest?: unknown }).XMLHttpRequest = FakeXhr;

const planFile = { name: "logo.png", type: "image/png", size: 4 } as File;
await uploadPhiMediaUploadBody(
  { kind: "proxy-stream", url: "/api/site/media/uploads/t", method: "PUT" },
  planFile,
);
assert.deepEqual(
  uploads[0],
  {
    method: "PUT",
    url: "/api/site/media/uploads/t",
    headers: { Accept: "application/json", "Content-Type": "image/png" },
    withCredentials: true,
  },
  "A body that streams through the Server carries the session and the file's own content type.",
);

uploads.length = 0;
(FakeXhr.prototype as { responseText?: string }).responseText = "";
await uploadPhiMediaUploadBody(
  {
    kind: "presigned-put",
    url: "https://storage.example/bucket/key?signature=x",
    method: "PUT",
    headers: { "content-type": "image/png", "x-amz-meta-token": "t" },
  },
  planFile,
);
assert.deepEqual(
  uploads[0],
  {
    method: "PUT",
    url: "https://storage.example/bucket/key?signature=x",
    headers: { "content-type": "image/png", "x-amz-meta-token": "t" },
    withCredentials: false,
  },
  "A presigned plan addresses the Provider: no Site credentials, and only the signed headers.",
);

await assert.rejects(
  uploadPhiMediaUploadBody(
    { kind: "presigned-multipart", url: "https://storage.example/x", method: "PUT" } as unknown as PhiMediaUploadPlan,
    planFile,
  ),
  /not supported by this Client/u,
  "A plan this Client does not know is refused, never approximated.",
);

// ---------------------------------------------------------------------------
// Provider availability
// ---------------------------------------------------------------------------

const CORE = "@phis/server/core" as const;
const MEDIA_CAPABILITY = "@phis/server/media:v1" as PhiServerCapabilityId;
const snapshot = (
  state: PhiServerCapabilitySnapshot["providers"][number]["state"],
  capabilities: readonly PhiServerCapabilityId[],
  diagnosticCode: string | null = null,
): PhiServerCapabilitySnapshot => ({
  siteKey: "test",
  releaseBuildId: null,
  buildManifestDigest: "digest",
  providers: [{
    providerId: CORE,
    state,
    diagnosticCode,
    capabilities: capabilities.map((id) => ({ id, interfaceDigest: "d" })),
  }],
});

const mediaBinding = { providerId: CORE, requiredCapabilities: [MEDIA_CAPABILITY] };
assert.deepEqual(
  resolvePhiRuntimeModuleServerBinding(mediaBinding, snapshot("available", [MEDIA_CAPABILITY])),
  { available: true },
);
assert.deepEqual(resolvePhiRuntimeModuleServerBinding(mediaBinding, null), {
  available: false,
  state: "unavailable",
  diagnosticCode: "capability_snapshot_unavailable",
  missingCapabilities: [MEDIA_CAPABILITY],
});
assert.deepEqual(
  resolvePhiRuntimeModuleServerBinding(
    { ...mediaBinding, providerId: "@other/provider" },
    snapshot("available", [MEDIA_CAPABILITY]),
  ),
  {
    available: false,
    state: "missing",
    diagnosticCode: "provider_missing",
    missingCapabilities: [MEDIA_CAPABILITY],
  },
);
assert.deepEqual(resolvePhiRuntimeModuleServerBinding(mediaBinding, snapshot("available", [])), {
  available: false,
  state: "missing",
  diagnosticCode: "capability_missing",
  missingCapabilities: [MEDIA_CAPABILITY],
});
assert.deepEqual(
  resolvePhiRuntimeModuleServerBinding(
    mediaBinding,
    snapshot("disabled", [MEDIA_CAPABILITY], "provider_disabled"),
  ),
  {
    available: false,
    state: "disabled",
    diagnosticCode: "provider_disabled",
    missingCapabilities: [],
  },
);

/**
 * The Asset module itself declares no required capability, so media availability never depends on a
 * capability probe. That is a deliberate state, not an omission: pin it so adding one is a decision
 * someone makes on purpose.
 */
assert.deepEqual(PHI_ASSET_RUNTIME_MODULE_DEFINITION.serverBinding.requiredCapabilities, []);
assert.equal(PHI_ASSET_RUNTIME_MODULE_DEFINITION.serverBinding.providerId, CORE);
assert.deepEqual(
  resolvePhiRuntimeModuleServerBinding(PHI_ASSET_RUNTIME_MODULE_DEFINITION.serverBinding, null),
  { available: true },
);

// A Collection request without a bound provider surfaces as an error, never as an empty gallery.
const collectionRuntimeSource = await readSource("components/media/asset-collection-runtime.ts");
assert.match(collectionRuntimeSource, /Media collection provider is unavailable\./u);
assert.match(collectionRuntimeSource, /bindingError \?\?/u);

// ---------------------------------------------------------------------------
// Module disable and restore
// ---------------------------------------------------------------------------

const moduleDefinitions = [...PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG.values()]
  .map(({ definition }) => definition) as unknown as readonly PhiRuntimeModuleDefinition[];

// The Asset module is an ordinary, selectable module in every Area -- so it can be turned off and on.
assert.equal(PHI_ASSET_RUNTIME_MODULE_DEFINITION.kind, "module");
for (const area of ["public", "app", "admin", "builder", "editor", "accounting"] as const) {
  assert.deepEqual(
    resolvePhiRuntimeModuleIdsForArea(area, [PHI_ASSET_RUNTIME_MODULE_ID], moduleDefinitions),
    [PHI_ASSET_RUNTIME_MODULE_ID],
    `The Asset module must stay selectable in Area "${area}".`,
  );
  assert.deepEqual(resolvePhiRuntimeModuleIdsForArea(area, [], moduleDefinitions), []);
  assert.deepEqual(resolvePhiRuntimeModuleIdsForArea(area, null, moduleDefinitions), []);
}
// Restoring a module that is already selected is idempotent rather than a duplicate.
assert.deepEqual(
  resolvePhiRuntimeModuleIdsForArea(
    "builder",
    [PHI_ASSET_RUNTIME_MODULE_ID, PHI_ASSET_RUNTIME_MODULE_ID],
    moduleDefinitions,
  ),
  [PHI_ASSET_RUNTIME_MODULE_ID],
);
assert.throws(
  () => resolvePhiRuntimeModuleIdsForArea(
    "public",
    [PHI_PUBLIC_RUNTIME_MODULE_ID],
    moduleDefinitions,
  ),
  /Locked runtime module/u,
);
assert.throws(
  () => resolvePhiRuntimeModuleIdsForArea(
    "admin",
    ["@test/pkg/modules/not-installed" as PhiRuntimeModuleId],
    moduleDefinitions,
  ),
  /is not installed/u,
);
assert.throws(() => readPhiRuntimeModuleIds(["not-namespaced"]), /namespaced module id/u);
assert.throws(
  () => readPhiRuntimeModuleIds([PHI_ASSET_RUNTIME_MODULE_ID, PHI_ASSET_RUNTIME_MODULE_ID]),
  /duplicate module ids/u,
);

/**
 * Disabling the module removes its UI contributions only. The build-time catalog is immutable, so its
 * declarations -- and therefore restoring it -- survive any Area selection.
 */
assert.ok(PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG.has(PHI_ASSET_RUNTIME_MODULE_ID));
assert.equal(PHI_ASSET_RUNTIME_DATA_PROVIDER_DESCRIPTORS.length, 2);
for (const descriptor of PHI_ASSET_RUNTIME_DATA_PROVIDER_DESCRIPTORS) {
  assert.equal(descriptor.ownerModuleId, PHI_ASSET_RUNTIME_MODULE_ID);
  assert.equal(descriptor.executionMode, "live");
}

// ---------------------------------------------------------------------------
// Legacy Media Group and direct Storage paths
// ---------------------------------------------------------------------------

/**
 * Group Spaces replaced Media Groups, and delivery replaced direct Storage access. Neither may return
 * as a parallel path: a Storage key in the shared UI would bypass the delivery policy and the
 * delivery revision that Asset access depends on.
 */
const mediaSourcePaths = [
  "types/media.ts",
  "constants/media.ts",
  "components/media/asset-collection-runtime.ts",
  "components/media/media-upload-flow.ts",
  "components/media/phi-image-preview-data.ts",
  "components/media/phi-image-preview-store.ts",
  "components/media/phi-media-scope-controller.ts",
  "components/media/phi-media-picker-binding.tsx",
  "components/media/phi-area-upload-widget.tsx",
  "plugins/runtime-modules/asset/data-providers.ts",
  "plugins/runtime-modules/asset/definition.ts",
];
for (const path of mediaSourcePaths) {
  const source = await readSource(path);
  for (const legacy of [/mediaGroup/iu, /media_group/iu, /storageKey/iu, /storageBucket/iu, /storageUrl/iu]) {
    assert.doesNotMatch(source, legacy, `${path} must not reintroduce ${legacy.source}.`);
  }
}

// Media requests go through the site media API, never a storage host.
const uploadFlowSource = await readSource("components/media/media-upload-flow.ts");
assert.match(uploadFlowSource, /"\/api\/site\/media\/uploads\/init"/u);
// No storage host is named here. A Provider endpoint only ever arrives inside a plan the Server issued,
// which is exactly the difference between carrying out a plan and knowing a Provider.
assert.doesNotMatch(uploadFlowSource, /["'`]https?:\/\//u);

// The response reader keeps the Space the server reported and nothing more.
const previewResponse = await readPhiImagePreviewResponse(new Response(
  JSON.stringify({
    activeSpace: { id: 3, kind: "group" },
    assets: [tile(20, 3, null)],
    folders: [],
  }),
  { status: 200, headers: { "Content-Type": "application/json" } },
));
assert.deepEqual(previewResponse.activeSpace, { id: 3, kind: "group" });
assert.equal(previewResponse.assets[0]?.spaceId, 3);
await assert.rejects(
  readPhiImagePreviewResponse(new Response(
    JSON.stringify({ error: "media_space_forbidden" }),
    { status: 403, headers: { "Content-Type": "application/json" } },
  )),
  /media_space_forbidden/u,
);

/**
 * The Builder's own pickers read the Site's Media library, and that must not depend on which Modules the
 * edited Area activates. A `phis:asset/...` reference is resolved by the core reference resolver, so an
 * Area without the Assets Module still renders its images -- but the Asset picker in a Widget toolbar
 * used to be gated on that Module and opened over an empty library, reporting the provider as
 * unavailable. Both Builder surfaces mount the same declared set.
 */
{
  const { readFile } = await import("node:fs/promises");
  const readSource = async (relativePath: string) =>
    readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
  // The Module that owns a provider declares whether the Builder's chrome may read it. A list inside
  // the Builder could only ever name first-party providers, so the declaration lives with the owner.
  const assetProviders = await readSource("plugins/runtime-modules/asset/data-providers.ts");
  assert.equal(
    (assetProviders.match(/availableToAuthoringChrome: true/gu) ?? []).length,
    2,
    "The media collection and folder providers declare themselves available to the Builder's chrome.",
  );
  const keys = await readSource("plugins/runtime-modules/builder/authoring-provider-keys.ts");
  assert.doesNotMatch(
    keys,
    /PHI_[A-Z0-9_]+_RUNTIME_DATA_PROVIDER_KEYS/u,
    "The Builder collects picker providers from the catalog; naming a Module's keys here excludes installed packages.",
  );
  for (const surface of [
    "plugins/runtime-modules/builder/clients/runtime-module-authoring-boundary.tsx",
    "plugins/runtime-modules/builder/inspector-section-widget.tsx",
  ]) {
    const source = await readSource(surface);
    assert.match(
      source,
      /resolvePhiBuilderAuthoringPickerDataProviderKeys/u,
      `${surface} must mount the Builder's picker providers rather than rely on the Area's active Modules.`,
    );
  }
}

// ---------------------------------------------------------------------------
// Which surface may name a Space
// ---------------------------------------------------------------------------

/**
 * A Space is where a person works, so `app` chooses and every authoring surface stays on the Site
 * Space. Reading that off the Area alone would be wrong: a Builder canvas renders the Area it edits, so
 * its Area really is `app` while previewing the App. The partition kind is what separates working from
 * authoring, and both have to agree.
 */
{
  const surface = (partitionKind: "site" | "area" | "canvas" | null, area: string | null) =>
    canPhiSurfaceSelectMediaSpace({ partitionKind, area });

  assert.equal(surface("area", "app"), true, "Someone working in the App chooses their Space.");
  for (const area of ["public", "builder", "editor", "admin", "accounting"]) {
    assert.equal(surface("area", area), false, `${area} stays on the Site Space.`);
  }
  assert.equal(
    surface("canvas", "app"),
    false,
    "A Builder canvas previewing the App is authoring, not working in it.",
  );
  assert.equal(surface("site", "app"), false, "A Site-wide partition is not an Area someone works in.");
  assert.equal(surface(null, "app"), false, "Without a partition there is no Area to trust.");
  assert.equal(surface("area", null), false, "An unknown Area never selects.");
}

/**
 * The selector reports what the control plane returned and nothing else, and a group Space is named
 * after its group -- that is what a member recognizes.
 */
{
  const labels = { site: "Site library", user: "My files", group: "Group" };
  const space = (overrides: Partial<PhiMediaSpaceOption>): PhiMediaSpaceOption => ({
    id: 1, address: "1", kind: "site", groupId: null, name: null,
    quotaBytes: null, usedBytes: 0, reservedBytes: 0, ...overrides,
  });
  assert.deepEqual(
    buildPhiMediaSpaceOptions([
      space({}),
      space({ id: 7, address: "7", kind: "user" }),
      space({ id: 9, address: "group:4", kind: "group", groupId: 4, name: "Marketing" }),
      space({ id: null, address: "group:5", kind: "group", groupId: 5, name: "Sales" }),
    ], labels),
    [
      { value: "1", label: "Site library" },
      { value: "7", label: "My files" },
      { value: "group:4", label: "Marketing" },
      { value: "group:5", label: "Sales" },
    ],
    "A group Space that has never been written to is still selectable, by address rather than by id.",
  );
  assert.deepEqual(buildPhiMediaSpaceOptions([], labels), []);
}

/**
 * The Picker only ever names a Space when the surface may, and it follows the answer rather than its
 * own state: the control plane says which Space it served.
 */
{
  const binding = await readSource("components/media/phi-media-picker-binding.tsx");
  assert.match(
    binding,
    /spaceSelectionAllowed && spaceAddress \? \{ spaceId: spaceAddress \} : \{\}/u,
    "A surface that may not select must send no Space at all.",
  );
  assert.match(
    binding,
    /if \(activeAddress\) setSpaceAddress\(activeAddress\)/u,
    "The active Space comes back from the control plane.",
  );
  const service = await readSource("components/media/asset-collection-service.tsx");
  assert.match(service, /search\.set\("spaceId", spaceId\)/u);

  // The Collection view is the other surface that reads Media, and it obeys the same rule.
  const collection = await readSource("components/media/phi-asset-collection-view-binding.tsx");
  assert.match(
    collection,
    /spaceSelectionAllowed && spaceOptions\.length > 1/u,
    "The Collection view renders a Space selector only where the Area allows one.",
  );
  const runtime = await readSource("components/media/asset-collection-runtime.ts");
  assert.match(
    runtime,
    /spaceAddress: spaceSelectionAllowed \? spaceAddress : null/u,
    "A surface that may not select carries no Space into its query.",
  );

  // An upload follows the Space the surface is reading rather than asking for one of its own.
  const upload = await readSource("components/media/phi-area-upload-widget.tsx");
  assert.match(upload, /activeSpaceAddress: previewState\.activeSpace\?\.address \?\? null/u);
}

// ---------------------------------------------------------------------------
// Availability is declared by Modules
// ---------------------------------------------------------------------------

/**
 * Whether a Space kind exists at all is a capability, not a quota, and it belongs to the Modules that
 * need it. Module metadata lives here and nowhere else, so this is the only place the derivation may
 * happen; the control plane materializes the union across published Areas from what the Area preset
 * carries. The Site Space is never declarable -- it always exists.
 */
{
  const declaring = (
    moduleId: string,
    spaceKind: PhiDeclarableMediaSpaceKind,
    kinds: readonly PhiMediaKindValue[],
  ) => ({
    ...PHI_ASSET_RUNTIME_MODULE_DEFINITION,
    moduleId: moduleId as PhiRuntimeModuleId,
    mediaSpaces: { [spaceKind]: { kinds } },
  } satisfies PhiRuntimeModuleDefinition);

  const definitions = [
    declaring("@vendor/profile", "user", ["image"]),
    declaring("@vendor/groups", "group", ["document"]),
    declaring("@vendor/accounting", "group", ["pdf", "image"]),
    PHI_ASSET_RUNTIME_MODULE_DEFINITION,
  ];
  const select = (...moduleIds: string[]) =>
    resolvePhiDeclaredMediaSpaces(moduleIds as PhiRuntimeModuleId[], definitions);

  assert.deepEqual(select(), {}, "A Site that activates no declaring Module has neither kind.");
  assert.deepEqual(
    select(PHI_ASSET_RUNTIME_MODULE_ID),
    {},
    "Handling Assets is not by itself a reason for a User or Group Space.",
  );
  assert.deepEqual(select("@vendor/profile"), { user: { kinds: ["image"] } });
  assert.deepEqual(
    select("@vendor/groups", "@vendor/accounting"),
    { group: { kinds: ["image", "pdf", "document"] } },
    "Two Modules sharing a Space each get what they declared, so the Space holds the union.",
  );
  assert.deepEqual(
    select("@vendor/accounting", "@vendor/profile"),
    { user: { kinds: ["image"] }, group: { kinds: ["image", "pdf"] } },
    "The order follows the declarable kinds, so an unchanged selection serializes identically.",
  );
  assert.deepEqual(
    JSON.stringify(select("@vendor/accounting")),
    JSON.stringify({ group: { kinds: ["image", "pdf"] } }),
    "Content kinds serialize in declaration order rather than the order a Module happened to list them.",
  );
  assert.deepEqual(
    select("@vendor/groups", "@vendor/unknown"),
    { group: { kinds: ["document"] } },
    "A Module that is not installed declares nothing.",
  );
}

/**
 * The two first-party Modules that carry a declaration, what each of them turns on, and what each says
 * belongs in the Space it asks for.
 *
 * Groups exist in Core either way; what activating that Module says is that this Site's groups need
 * somewhere to put files. Avatar is the same shape for the other kind: a Site whose people show a
 * picture is a Site whose people need somewhere personal to keep one. Avatar declaring images alone is
 * the point of the whole mechanism -- only the Module knows what its Space is for.
 */
{
  assert.deepEqual(PHI_AVATAR_RUNTIME_MODULE_DEFINITION.mediaSpaces, { user: { kinds: ["image"] } });
  assert.deepEqual(PHI_GROUPS_RUNTIME_MODULE_DEFINITION.mediaSpaces, {
    group: { kinds: ["image", "video", "audio", "pdf", "markdown", "document", "archive"] },
  });
  assert.ok(
    !(PHI_GROUPS_RUNTIME_MODULE_DEFINITION.mediaSpaces?.group?.kinds as readonly string[] | undefined)
      ?.includes("binary"),
    "Distributing executables is a Site Space decision, where the authority is a role and not a list.",
  );
  assert.deepEqual(
    resolvePhiDeclaredMediaSpaces(
      [PHI_AVATAR_RUNTIME_MODULE_DEFINITION.moduleId],
      [PHI_AVATAR_RUNTIME_MODULE_DEFINITION, PHI_ASSET_RUNTIME_MODULE_DEFINITION],
    ),
    { user: { kinds: ["image"] } },
    "Activating Avatar alone turns on User Spaces and nothing else.",
  );
  // Both together, in declarable order rather than module order, so an unchanged selection serializes
  // byte-identically whichever way the Area happens to list them.
  assert.deepEqual(
    Object.keys(resolvePhiDeclaredMediaSpaces(
      [PHI_AVATAR_RUNTIME_MODULE_DEFINITION.moduleId, PHI_GROUPS_RUNTIME_MODULE_DEFINITION.moduleId],
      [PHI_GROUPS_RUNTIME_MODULE_DEFINITION, PHI_AVATAR_RUNTIME_MODULE_DEFINITION],
    )),
    ["user", "group"],
  );
  const declaring = [...PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG.values()]
    .filter((entry) => Object.keys(entry.definition.mediaSpaces ?? {}).length > 0)
    .map((entry) => entry.definition.moduleId);
  assert.deepEqual(
    declaring.slice().sort(),
    [
      PHI_AVATAR_RUNTIME_MODULE_DEFINITION.moduleId,
      PHI_GROUPS_RUNTIME_MODULE_DEFINITION.moduleId,
    ].slice().sort(),
    "Groups and Avatar are the first-party Modules declaring a Space kind.",
  );
}

/**
 * The derivation has to reach the control plane, which holds no Module metadata of its own. It travels
 * with the Area preset the Builder writes -- never as a switch an administrator sets independently.
 */
{
  const persistence = await readSource("plugins/runtime-modules/builder/persistence.ts");
  assert.match(
    persistence,
    /mediaSpaces: resolvePhiDeclaredMediaSpaces\(/u,
    "The Area preset must carry the Spaces its Modules declare.",
  );
}

console.log("Media Space contracts validated.");
