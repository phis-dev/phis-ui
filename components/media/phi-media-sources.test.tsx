// @vitest-environment happy-dom
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PhiIntlLocaleProvider } from "../root/phi-intl-locale";
import type { PhiMediaSourceClient, PhiMediaSourceClientDefinition } from "../../types/media-source";
import type { PhiRuntimeModuleId } from "../../types/cms-plugins";
import { PHI_MEDIA_UPLOAD_DEFAULT_LABELS } from "./media-upload-labels";

/**
 * The sources a picker offers: an Add-on's, through Core's routes, and a Module's, in the browser. One
 * request for the Add-on's per page lifetime, none before a picker is open, and nothing a refusal can
 * turn into an error on the picker.
 */

const uploadSession = vi.fn();
vi.mock("./media-upload-flow", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./media-upload-flow")>()),
  runPhiMediaUploadSession: (...args: unknown[]) => uploadSession(...args),
}));

const moduleDefinitions: { current: PhiMediaSourceClientDefinition[] } = { current: [] };
vi.mock("../runtime/runtime-module-media-source-client-manifest", () => ({
  usePhiMediaSourceClientDefinitions: () => moduleDefinitions.current,
  loadPhiMediaSourceClient: (definition: PhiMediaSourceClientDefinition) => definition.load(),
}));

const {
  PhiMediaSourceError,
  readPhiMediaSourceImportErrorMessage,
  readPhiMediaSourcePage,
  resetPhiMediaAddonSourcesForTests,
  usePhiMediaSources,
} = await import("./phi-media-sources");

const fetchMock = vi.fn();

function wrapper({ children }: { children: ReactNode }) {
  return <PhiIntlLocaleProvider locale="de" timeZone="UTC" renderedAt={0}>{children}</PhiIntlLocaleProvider>;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const item = {
  id: "photo-1",
  kind: "image",
  title: "A lake",
  thumbnailUrl: "https://stock.example/t/1.jpg",
  width: 4000,
  height: 3000,
  credit: "Photo: A. Name",
} as const;

const tileRecord = {
  id: 41,
  siteId: 1,
  spaceId: 7,
  folderId: 3,
  createdByUserId: 9,
  updatedByUserId: null,
  originalName: "lake.jpg",
  title: "A lake",
  altText: null,
  deliveryUrl: "/media/41",
  thumbnailUrl: "/media/41/thumb",
  previewUrl: null,
  contentType: "image/jpeg",
  kind: "image",
  width: 4000,
  height: 3000,
  bytes: 1234,
  lifecycleStatus: 1,
  deliveryPolicy: 1,
  deliveryRevision: 1,
  presentationFlags: 0,
  focalRect: null,
  font: null,
  folder: null,
};

beforeEach(() => {
  resetPhiMediaAddonSourcesForTests();
  moduleDefinitions.current = [];
  fetchMock.mockReset();
  uploadSession.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function openedSources() {
  const hook = renderHook(() => usePhiMediaSources({ enabled: true }), { wrapper });
  await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  return hook;
}

describe("the Add-on sources", () => {
  it("lists what the route answers, one source each", async () => {
    fetchMock.mockResolvedValueOnce(json({ rows: [
      { source: "@acme/stock#main", label: "Stock" },
      { source: "@acme/stock#brand", label: "Brand portal" },
      { source: 7, label: "malformed" },
    ] }));
    const { result } = await openedSources();
    await waitFor(() => expect(result.current.map((entry) => entry.label)).toEqual(["Stock", "Brand portal"]));
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/site/media/sources");
    expect(init).toMatchObject({ method: "GET", credentials: "include", cache: "no-store" });
  });

  it("asks nothing of a picker that is not open", async () => {
    renderHook(() => usePhiMediaSources({ enabled: false }), { wrapper });
    await act(async () => { await Promise.resolve(); });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("asks once per page lifetime, however many pickers open", async () => {
    fetchMock.mockResolvedValue(json({ rows: [{ source: "@acme/stock#main", label: "Stock" }] }));
    const first = await openedSources();
    await waitFor(() => expect(first.result.current).toHaveLength(1));
    const second = renderHook(() => usePhiMediaSources({ enabled: true }), { wrapper });
    await waitFor(() => expect(second.result.current).toHaveLength(1));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("takes a refusal for no sources, and asks no second time", async () => {
    fetchMock.mockResolvedValue(json({ error: "forbidden", message: "No." }, 403));
    const first = await openedSources();
    await act(async () => { await Promise.resolve(); });
    expect(first.result.current).toEqual([]);
    const second = renderHook(() => usePhiMediaSources({ enabled: true }), { wrapper });
    await act(async () => { await Promise.resolve(); });
    expect(second.result.current).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("takes a failed request for no sources", async () => {
    fetchMock.mockRejectedValue(new TypeError("offline"));
    const { result } = await openedSources();
    await act(async () => { await Promise.resolve(); });
    expect(result.current).toEqual([]);
  });

  async function addonSource() {
    fetchMock.mockResolvedValueOnce(json({ rows: [{ source: "@acme/stock#main", label: "Stock" }] }));
    const { result } = await openedSources();
    await waitFor(() => expect(result.current).toHaveLength(1));
    return result.current[0]!;
  }

  it("asks a page with the query, the kinds, the cursor and the signal", async () => {
    const source = await addonSource();
    fetchMock.mockResolvedValueOnce(json({ items: [item], nextCursor: "c2" }));
    const controller = new AbortController();
    const page = await source.list({
      query: "lake", kinds: ["image", "video"], cursor: "c1", limit: 20, locale: "de", signal: controller.signal,
    });
    expect(page).toEqual({ items: [item], nextCursor: "c2" });
    const [url, init] = fetchMock.mock.calls[1]!;
    const search = new URL(String(url), "https://site.test").searchParams;
    expect(String(url).startsWith("/api/site/media/sources/items?")).toBe(true);
    expect(search.get("source")).toBe("@acme/stock#main");
    expect(search.get("q")).toBe("lake");
    expect(search.getAll("kind")).toEqual(["image", "video"]);
    expect(search.get("cursor")).toBe("c1");
    expect(search.get("limit")).toBe("20");
    expect(search.get("locale")).toBe("de");
    expect(init.signal).toBe(controller.signal);
  });

  it("hands the signal over, so a stopped request is the browser's to stop", async () => {
    const source = await addonSource();
    fetchMock.mockImplementationOnce((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
    }));
    const controller = new AbortController();
    const pending = source.list({ query: "", kinds: null, cursor: null, limit: 10, locale: "de", signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  });

  it("maps a refusal to its code, and the code to the words the uploads have", async () => {
    const source = await addonSource();
    fetchMock.mockResolvedValueOnce(json({ error: "media_source_failed", message: "Down." }, 502));
    await expect(source.list({
      query: "", kinds: null, cursor: null, limit: 10, locale: "de", signal: new AbortController().signal,
    })).rejects.toMatchObject({ name: "PhiMediaSourceError", code: "media_source_failed", status: 502 });

    fetchMock.mockResolvedValueOnce(json({ error: "media_asset_too_large", message: "Big." }, 413));
    const error = await source.importItem({
      item, folderId: null, signal: new AbortController().signal,
    }).catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(PhiMediaSourceError);
    expect(readPhiMediaSourceImportErrorMessage(error, PHI_MEDIA_UPLOAD_DEFAULT_LABELS, "generic"))
      .toBe(PHI_MEDIA_UPLOAD_DEFAULT_LABELS.errorTooLarge);
    expect(readPhiMediaSourceImportErrorMessage(
      new PhiMediaSourceError("x", "media_source_unusable", 409), PHI_MEDIA_UPLOAD_DEFAULT_LABELS, "generic",
    )).toBe("generic");
    expect(readPhiMediaSourceImportErrorMessage(new TypeError("offline"), PHI_MEDIA_UPLOAD_DEFAULT_LABELS, "generic"))
      .toBe("generic");
  });

  it("imports through the route and answers the Asset as a tile", async () => {
    const source = await addonSource();
    fetchMock.mockResolvedValueOnce(json({ asset: tileRecord }));
    const controller = new AbortController();
    const imported = await source.importItem({ item, folderId: 3, signal: controller.signal });
    expect(imported.asset).toMatchObject({ id: 41, title: "A lake", folderId: 3, kind: "image" });
    // The Add-on's import sets title and alt text itself; the picker writes nothing after it.
    expect(imported.metadata).toBeNull();
    const [url, init] = fetchMock.mock.calls[1]!;
    expect(url).toBe("/api/site/media/sources/import");
    expect(init).toMatchObject({ method: "POST", signal: controller.signal });
    expect(JSON.parse(init.body)).toEqual({ source: "@acme/stock#main", itemId: "photo-1", folderId: 3 });
  });

  it("names no Folder for the library's root", async () => {
    const source = await addonSource();
    fetchMock.mockResolvedValueOnce(json({ asset: tileRecord }));
    await source.importItem({ item, folderId: null, signal: new AbortController().signal });
    expect(JSON.parse(fetchMock.mock.calls[1]![1].body)).toEqual({ source: "@acme/stock#main", itemId: "photo-1" });
  });
});

describe("a Module's source", () => {
  function moduleDefinition(client: Partial<PhiMediaSourceClient> = {}): PhiMediaSourceClientDefinition {
    const take = vi.fn(async () => ({
      file: new Blob(["bytes"], { type: "image/jpeg" }),
      fileName: "lake.jpg",
      title: "A lake, in the Module's words",
      altText: "A lake at dawn",
      credit: "Photo: A. Name",
    }));
    return {
      key: "@acme/shop/stock",
      ownerModuleId: "@acme/shop/modules/shop" as PhiRuntimeModuleId,
      load: async () => ({
        describe: async ({ locale }) => ({ label: `Stock (${locale})` }),
        list: async () => ({ items: [item], nextCursor: null }),
        take,
        ...client,
      }),
    };
  }

  async function moduleSource(definition = moduleDefinition()) {
    moduleDefinitions.current = [definition];
    fetchMock.mockResolvedValue(json({ rows: [] }));
    const { result } = renderHook(() => usePhiMediaSources({ enabled: true }), { wrapper });
    await waitFor(() => expect(result.current).toHaveLength(1));
    return result.current[0]!;
  }

  it("is named by its own describe, in the reader's language", async () => {
    const source = await moduleSource();
    expect(source.label).toBe("Stock (de)");
  });

  it("is left out when it cannot be described", async () => {
    moduleDefinitions.current = [moduleDefinition({ describe: async () => { throw new Error("no"); } })];
    fetchMock.mockResolvedValue(json({ rows: [] }));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { result } = renderHook(() => usePhiMediaSources({ enabled: true }), { wrapper });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); });
    expect(result.current).toEqual([]);
  });

  it("answers a page the contract holds, and refuses one that does not", async () => {
    const source = await moduleSource(moduleDefinition({
      list: async () => ({ items: [{ ...item, thumbnailUrl: "http://stock.example/t/1.jpg" }], nextCursor: null }),
    }));
    await expect(source.list({
      query: "", kinds: null, cursor: null, limit: 10, locale: "de", signal: new AbortController().signal,
    })).rejects.toBeInstanceOf(PhiMediaSourceError);
  });

  it("uploads what was taken through the upload transport, into the Folder, with where it came from", async () => {
    const source = await moduleSource();
    uploadSession.mockResolvedValueOnce({ asset: tileRecord, token: "t" });
    const controller = new AbortController();
    const imported = await source.importItem({ item, folderId: 3, signal: controller.signal });

    expect(uploadSession).toHaveBeenCalledTimes(1);
    const [file, onProgress, options, signal] = uploadSession.mock.calls[0]!;
    expect(file).toBeInstanceOf(File);
    expect(file.name).toBe("lake.jpg");
    expect(file.type).toBe("image/jpeg");
    expect(onProgress).toBeUndefined();
    // The Site Space (no Space named) and the Folder the picker shows.
    expect(options).toEqual({
      folderId: 3,
      spaceAddress: null,
      meta: { source: "media-source", sourceKey: "@acme/shop/stock", itemId: "photo-1", credit: "Photo: A. Name" },
    });
    expect(signal).toBe(controller.signal);
    // The picker still has to set the words the Module gave.
    expect(imported.asset.id).toBe(41);
    expect(imported.metadata).toEqual({ title: "A lake, in the Module's words", altText: "A lake at dawn" });
  });

  it("lets a refusal of the upload through with its code", async () => {
    const source = await moduleSource();
    const refusal = Object.assign(new Error("full"), { code: "media_quota_exceeded" });
    uploadSession.mockRejectedValueOnce(refusal);
    const error = await source.importItem({ item, folderId: null, signal: new AbortController().signal })
      .catch((cause: unknown) => cause);
    expect(readPhiMediaSourceImportErrorMessage(error, PHI_MEDIA_UPLOAD_DEFAULT_LABELS, "generic"))
      .toBe(PHI_MEDIA_UPLOAD_DEFAULT_LABELS.errorQuotaExceeded);
  });
});

describe("a page of a source", () => {
  it("is read field by field", () => {
    expect(readPhiMediaSourcePage({ items: [{ ...item, width: 0, credit: undefined }], nextCursor: undefined }))
      .toEqual({ items: [{ ...item, width: null, credit: null }], nextCursor: null });
    expect(() => readPhiMediaSourcePage({ items: [{ ...item, id: "" }] })).toThrow(PhiMediaSourceError);
    expect(() => readPhiMediaSourcePage({ items: "no" })).toThrow(PhiMediaSourceError);
    expect(() => readPhiMediaSourcePage({ items: [], nextCursor: 3 })).toThrow(PhiMediaSourceError);
    expect(() => readPhiMediaSourcePage({ items: Array.from({ length: 61 }, () => item) })).toThrow(PhiMediaSourceError);
  });
});
