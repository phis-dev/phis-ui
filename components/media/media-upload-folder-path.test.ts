import { afterEach, describe, expect, it, vi } from "vitest";

import type { PhiMediaAssetFolder } from "../../types/media";
import { PHI_MEDIA_UPLOAD_DEFAULT_LABELS } from "./media-upload-labels";
import { findPhiMediaFolderByNamePath, splitPhiMediaFolderNamePath } from "./media-folder-name-path";
import {
  readPhiMediaUploadFolderPathReach,
  resolvePhiMediaUploadFolderPathId,
  resolvePhiMediaUploadInitOptions,
} from "./media-upload-flow";
import { readPhiMediaUploadErrorMessage } from "./phi-media-upload";

/**
 * An upload into a Folder named by its path -- the `area-upload` Widget's `folderPath`.
 *
 * What is proven: the setting wins over the Folder in view and over the Space in view, a Widget without
 * one inherits exactly as before, and the path is resolved against the Site Space's Folders at upload,
 * the missing ones created once, below the deepest one that is there.
 */

function folder(id: number, name: string, parentId: number | null = null, flags = 0): PhiMediaAssetFolder {
  return { id, siteId: 1, spaceId: 1, parentId, name, sortOrder: 0, flags };
}

describe("splitPhiMediaFolderNamePath", () => {
  it("reads the path the way a person writes it", () => {
    expect(splitPhiMediaFolderNamePath(" Summer 2024 / Costa  Rica ")).toEqual(["Summer 2024", "Costa Rica"]);
    expect(splitPhiMediaFolderNamePath("/Shop Images//Products/")).toEqual(["Shop Images", "Products"]);
    expect(splitPhiMediaFolderNamePath(" / ")).toEqual([]);
    expect(splitPhiMediaFolderNamePath(undefined)).toEqual([]);
  });
});

describe("findPhiMediaFolderByNamePath", () => {
  const folders = [folder(1, "Shop Images"), folder(2, "Products", 1), folder(3, "Products")];

  it("follows the names from the root, without regard to case", () => {
    expect(findPhiMediaFolderByNamePath(folders, ["shop images", "PRODUCTS"])).toEqual({ folderId: 2, depth: 2 });
  });

  it("stops at the deepest Folder that is there", () => {
    expect(findPhiMediaFolderByNamePath(folders, ["Shop Images", "Banners", "Summer"])).toEqual({ folderId: 1, depth: 1 });
    expect(findPhiMediaFolderByNamePath(folders, ["Banners"])).toEqual({ folderId: null, depth: 0 });
  });
});

describe("resolvePhiMediaUploadInitOptions with a Folder path", () => {
  it("names the Folder by its path in the Site Space, whatever Folder and Space are in view", () => {
    expect(resolvePhiMediaUploadInitOptions({
      previewState: { folderId: 5, presentationFlags: 2 },
      configPresentationFlags: 4,
      configFolderPath: "Shop Images / Products",
      activeSpaceAddress: "group:4",
    })).toEqual({ folderId: null, folderPath: ["Shop Images", "Products"], presentationFlags: 2, spaceAddress: null });
  });

  it("keeps inheriting the flags as before, a hosting panel's included", () => {
    expect(resolvePhiMediaUploadInitOptions({
      previewState: { folderId: null, presentationFlags: null },
      configPresentationFlags: 4,
      configFolderPath: "Shop Images",
    })).toMatchObject({ presentationFlags: 4 });
    expect(resolvePhiMediaUploadInitOptions({
      collectionContext: { folderId: 7, presentationFlags: null },
      previewState: { folderId: 1, presentationFlags: 2 },
      configPresentationFlags: 4,
      configFolderPath: "Shop Images",
    })).toEqual({ folderId: null, folderPath: ["Shop Images"], presentationFlags: 0, spaceAddress: null });
  });

  it("is no setting when blank: the Folder and the Space in view, exactly as without one", () => {
    const input = {
      previewState: { folderId: 5, presentationFlags: null },
      activeSpaceAddress: "group:4",
    };
    const without = resolvePhiMediaUploadInitOptions(input);
    expect(without).toEqual({ folderId: 5, presentationFlags: 0, spaceAddress: "group:4" });
    expect(resolvePhiMediaUploadInitOptions({ ...input, configFolderPath: "" })).toEqual(without);
    expect(resolvePhiMediaUploadInitOptions({ ...input, configFolderPath: " / " })).toEqual(without);
    expect(resolvePhiMediaUploadInitOptions({ ...input, configFolderPath: null })).not.toHaveProperty("folderPath");
  });
});

type Call = { method: string; url: string; body: Record<string, string> };

function stubFolderRoutes(folders: PhiMediaAssetFolder[], options: { lockedParentIds?: number[] } = {}) {
  const calls: Call[] = [];
  let nextId = 100;
  const json = (status: number, payload: unknown) =>
    new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } });
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    const body = init?.body instanceof FormData
      ? Object.fromEntries([...init.body.entries()].map(([key, value]) => [key, String(value)]))
      : {};
    calls.push({ method, url, body });
    if (method === "GET") return json(200, { activeSpace: null, folders });
    const parentId = body.parentId ? Number(body.parentId) : null;
    if (parentId != null && options.lockedParentIds?.includes(parentId)) {
      return json(409, { error: "media_folder_locked", message: "The Media Folder is locked." });
    }
    const created = folder(nextId++, body.name, parentId);
    folders.push(created);
    return json(200, { folder: created });
  }));
  return calls;
}

describe("resolvePhiMediaUploadFolderPathId", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("answers a Folder that is there without creating anything", async () => {
    const calls = stubFolderRoutes([folder(1, "Shop Images"), folder(2, "Products", 1)]);
    await expect(resolvePhiMediaUploadFolderPathId(["shop images", "products"])).resolves.toBe(2);
    expect(calls).toEqual([{ method: "GET", url: "/api/site/media/folders", body: {} }]);
  });

  it("creates the missing Folders below the deepest one that is there, in the Site Space", async () => {
    const calls = stubFolderRoutes([folder(1, "Shop Images")]);
    await expect(resolvePhiMediaUploadFolderPathId(["Shop Images", "Products", "Summer"])).resolves.toBe(101);
    expect(calls).toEqual([
      { method: "GET", url: "/api/site/media/folders", body: {} },
      { method: "POST", url: "/api/site/media/folders", body: { name: "Products", parentId: "1" } },
      { method: "POST", url: "/api/site/media/folders", body: { name: "Summer", parentId: "100" } },
    ]);
  });

  it("creates a missing Folder once for files dropped together", async () => {
    const calls = stubFolderRoutes([]);
    const ids = await Promise.all([
      resolvePhiMediaUploadFolderPathId(["Shop Images"]),
      resolvePhiMediaUploadFolderPathId(["shop images"]),
    ]);
    expect(ids).toEqual([100, 100]);
    expect(calls.filter((call) => call.method === "POST")).toHaveLength(1);
  });

  it("reads a Folder refused below a locked one as the lock refusal", async () => {
    stubFolderRoutes([folder(1, "Shop Images", null, 1)], { lockedParentIds: [1] });
    const refusal = await resolvePhiMediaUploadFolderPathId(["Shop Images", "Products"]).catch((error: unknown) => error);
    expect(readPhiMediaUploadErrorMessage(refusal, PHI_MEDIA_UPLOAD_DEFAULT_LABELS))
      .toBe(PHI_MEDIA_UPLOAD_DEFAULT_LABELS.errorFolderLocked);
  });
});

describe("readPhiMediaUploadFolderPathReach", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("answers the whole path where it is there", async () => {
    const calls = stubFolderRoutes([folder(1, "Shop Images"), folder(2, "Products", 1)]);
    await expect(readPhiMediaUploadFolderPathReach(["shop images", "products"])).resolves.toEqual({ folderId: 2, complete: true });
    expect(calls).toEqual([{ method: "GET", url: "/api/site/media/folders", body: {} }]);
  });

  it("answers the deepest Folder that is there, the root where none is, and creates nothing", async () => {
    const calls = stubFolderRoutes([folder(1, "Shop Images")]);
    await expect(readPhiMediaUploadFolderPathReach(["Shop Images", "Products"])).resolves.toEqual({ folderId: 1, complete: false });
    await expect(readPhiMediaUploadFolderPathReach(["Banners"])).resolves.toEqual({ folderId: null, complete: false });
    expect(calls.every((call) => call.method === "GET")).toBe(true);
  });
});
