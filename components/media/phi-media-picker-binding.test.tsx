// @vitest-environment happy-dom
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PhiIntlLocaleProvider } from "../root/phi-intl-locale";
import { PHI_SEARCH_WIDGET_DEFAULT_LABELS } from "../widgets/label-types/search";
import { PHI_MEDIA_WIDGET_DEFAULT_LABELS } from "./media-widget-labels";
import type { PhiMediaSource } from "./phi-media-sources";
import type { PhiMediaPickerUploadBinding, PhiMediaPickerUploadTarget } from "./phi-media-picker-binding";

/**
 * What the picker does with a media source: the switch only where an import may land, the source's
 * pages by cursor, an import chosen like a tile of the library, and a refusal said where it happened.
 */

const sources: { current: PhiMediaSource[] } = { current: [] };
const spaceSelection = { current: false };
vi.mock("./phi-media-sources", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./phi-media-sources")>()),
  usePhiMediaSources: () => sources.current,
}));
vi.mock("./media-space-selection", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./media-space-selection")>()),
  usePhiMediaSpaceSelectionAllowed: () => spaceSelection.current,
}));
vi.mock("../widgets/client/shared/phi-control-signals", () => ({
  usePhiControlSignalController: () => ({ emitCapability: vi.fn() }),
}));

const libraryQueries: { query: unknown; signal: AbortSignal }[] = [];
const updateAsset = vi.fn(async (_request: unknown) => ({}));
const registeredProvider = {
  key: "@phis/test/assets",
  query: vi.fn(async (request: { query: unknown; signal: AbortSignal }) => {
    libraryQueries.push({ query: request.query, signal: request.signal });
    return {
      items: [],
      total: 0,
      meta: {
        folders: [],
        spaces: [
          { id: 1, address: "site", kind: "site", groupId: null, name: null, quotaBytes: null, usedBytes: 0, reservedBytes: 0 },
          { id: 2, address: "user:2", kind: "user", groupId: null, name: null, quotaBytes: null, usedBytes: 0, reservedBytes: 0 },
        ],
        activeSpace: { id: 1, address: "site", kind: "site", groupId: null, name: null, quotaBytes: null, usedBytes: 0, reservedBytes: 0 },
      },
    };
  }),
};
vi.mock("../widgets/client/shared/phi-collection-provider", () => ({
  usePhiCollectionProvider: () => ({ provider: registeredProvider, resource: {}, bindingError: null }),
  usePhiCollectionProviderAction: () => updateAsset,
}));

const { usePhiMediaPickerBinding } = await import("./phi-media-picker-binding");

function wrapper({ children }: { children: ReactNode }) {
  return <PhiIntlLocaleProvider locale="en" timeZone="UTC" renderedAt={0}>{children}</PhiIntlLocaleProvider>;
}

const item = (id: string) => ({
  id, kind: "image" as const, title: id, thumbnailUrl: `https://stock.example/${id}.jpg`, width: null, height: null, credit: null,
});
const tile = { id: 41, title: "Lake", altText: null, kind: "image" } as never;

function fakeSource(overrides: Partial<PhiMediaSource> = {}): PhiMediaSource & {
  list: ReturnType<typeof vi.fn>;
  importItem: ReturnType<typeof vi.fn>;
} {
  return {
    id: "addon:@acme/stock#main",
    label: "Stock",
    list: vi.fn(async ({ cursor }: { cursor: string | null }) =>
      cursor ? { items: [item("c")], nextCursor: null } : { items: [item("a"), item("b")], nextCursor: "next" }),
    importItem: vi.fn(async () => ({ asset: tile, metadata: null })),
    ...overrides,
  } as never;
}

function render(props: Partial<Parameters<typeof usePhiMediaPickerBinding>[0]> = {}) {
  return renderHook(
    (hookProps: Partial<Parameters<typeof usePhiMediaPickerBinding>[0]>) => usePhiMediaPickerBinding({
      config: { mediaType: "image", pageSize: 20 },
      labels: PHI_MEDIA_WIDGET_DEFAULT_LABELS,
      searchLabels: PHI_SEARCH_WIDGET_DEFAULT_LABELS,
      open: true,
      ...hookProps,
    }),
    { wrapper, initialProps: props },
  );
}

beforeEach(() => {
  sources.current = [];
  spaceSelection.current = false;
  libraryQueries.length = 0;
  registeredProvider.query.mockClear();
  updateAsset.mockClear();
});

describe("a picker without a source", () => {
  it("shows no switch and reads the library as it always did", async () => {
    const { result } = render();
    await waitFor(() => expect(libraryQueries).toHaveLength(1));
    expect(result.current.sources).toEqual([]);
    expect(result.current.sourceValue).toBe("");
    expect(result.current.sourceItems).toEqual([]);
  });
});

describe("the switch", () => {
  it("is the library, then each source, and takes the Site library's words", async () => {
    sources.current = [fakeSource()];
    const { result } = render();
    await waitFor(() => expect(libraryQueries).toHaveLength(1));
    expect(result.current.sources).toEqual([
      { value: "", label: PHI_MEDIA_WIDGET_DEFAULT_LABELS.space.site },
      { value: "addon:@acme/stock#main", label: "Stock" },
    ]);
  });

  it("is hidden while another Space than the Site's is shown", async () => {
    spaceSelection.current = true;
    sources.current = [fakeSource()];
    const { result } = render();
    await waitFor(() => expect(result.current.sources).toHaveLength(2));
    act(() => result.current.onSpaceChange("user:2"));
    await waitFor(() => expect(result.current.sources).toEqual([]));
  });
});

describe("a source in view", () => {
  async function inSource(source = fakeSource(), props: Parameters<typeof render>[0] = {}) {
    sources.current = [source];
    const hook = render(props);
    await waitFor(() => expect(hook.result.current.sources).toHaveLength(2));
    act(() => hook.result.current.onSourceChange(source.id));
    await waitFor(() => expect(hook.result.current.sourceItems.length).toBeGreaterThan(0));
    return { ...hook, source };
  }

  it("asks the trimmed, cut query, the picker's kind and the first page", async () => {
    const { result, source } = await inSource();
    act(() => result.current.onQueryChange(`  ${"x".repeat(250)}  `));
    await waitFor(() => expect(source.list).toHaveBeenCalledTimes(2));
    expect(source.list.mock.calls[0]![0]).toMatchObject({ query: "", kinds: ["image"], cursor: null, limit: 20, locale: "en" });
    expect(source.list.mock.calls[1]![0].query).toBe("x".repeat(200));
  });

  it("pages by cursor and appends", async () => {
    const { result, source } = await inSource();
    expect(result.current.sourceHasMore).toBe(true);
    act(() => result.current.onSourceLoadMore());
    await waitFor(() => expect(result.current.sourceItems.map((entry) => entry.id)).toEqual(["a", "b", "c"]));
    expect(source.list.mock.calls[1]![0].cursor).toBe("next");
    expect(result.current.sourceHasMore).toBe(false);
  });

  it("stops the library's own reads while the source is in view", async () => {
    const { result } = await inSource();
    const reads = libraryQueries.length;
    act(() => result.current.onQueryChange("lake"));
    await act(async () => { await Promise.resolve(); });
    expect(libraryQueries).toHaveLength(reads);
  });

  it("says the source did not answer where there is nothing else to say", async () => {
    const source = fakeSource({ list: vi.fn(async () => { throw new Error("down"); }) as never });
    vi.spyOn(console, "error").mockImplementation(() => {});
    sources.current = [source];
    const { result } = render();
    await waitFor(() => expect(result.current.sources).toHaveLength(2));
    act(() => result.current.onSourceChange(source.id));
    await waitFor(() => expect(result.current.labels.sourceEmpty).toBe(PHI_MEDIA_WIDGET_DEFAULT_LABELS.picker.sourceFailedText));
  });

  it("aborts what it asked when the source or the query changes, and when the picker closes", async () => {
    const signals: AbortSignal[] = [];
    const source = fakeSource({
      list: vi.fn(async ({ signal }: { signal: AbortSignal }) => {
        signals.push(signal);
        return { items: [item("a")], nextCursor: null };
      }) as never,
    });
    const { result, rerender } = await inSource(source);
    act(() => result.current.onQueryChange("again"));
    await waitFor(() => expect(signals).toHaveLength(2));
    expect(signals[0]!.aborted).toBe(true);
    rerender({ open: false });
    await waitFor(() => expect(signals[1]!.aborted).toBe(true));
  });

  it("imports into the Folder shown and answers the Asset, then shows the library again", async () => {
    const { result, source } = await inSource();
    let imported: unknown;
    await act(async () => { imported = await result.current.onSourceItemSelect(item("a")); });
    expect(imported).toBe(tile);
    expect(source.importItem.mock.calls[0]![0]).toMatchObject({ item: item("a"), folderId: null });
    expect(updateAsset).not.toHaveBeenCalled();
    expect(result.current.sourceValue).toBe("");
  });

  it("hands the imported Asset to onAssetSelect through the same select path", async () => {
    const onAssetSelect = vi.fn();
    const { result } = await inSource(fakeSource(), { onAssetSelect });
    await act(async () => { await result.current.onSourceItemSelect(item("a")); });
    act(() => result.current.onChange(41));
    expect(onAssetSelect).toHaveBeenCalledWith(tile);
  });

  it("writes a Module's title and alt text through the Asset update, and keeps the Asset if that is refused", async () => {
    const source = fakeSource({
      importItem: vi.fn(async () => ({ asset: tile, metadata: { title: "Dawn", altText: "A lake" } })) as never,
    });
    const { result } = await inSource(source);
    let imported: { title?: string; altText?: string | null } | null = null;
    await act(async () => { imported = await result.current.onSourceItemSelect(item("a")) as never; });
    expect(updateAsset).toHaveBeenCalledWith(expect.objectContaining({
      actionKey: "update", itemKey: 41, item: { title: "Dawn", altText: "A lake" },
    }));
    expect(imported).toMatchObject({ title: "Dawn", altText: "A lake" });

    updateAsset.mockRejectedValueOnce(new Error("refused"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    act(() => result.current.onSourceChange(source.id));
    await waitFor(() => expect(result.current.sourceItems.length).toBeGreaterThan(0));
    await act(async () => { imported = await result.current.onSourceItemSelect(item("a")) as never; });
    expect(imported).toMatchObject({ id: 41 });
  });

  it("shows the tile busy while the import runs", async () => {
    let finish: (value: { asset: never; metadata: null }) => void = () => {};
    const source = fakeSource({
      importItem: vi.fn(() => new Promise((resolve) => { finish = resolve as never; })) as never,
    });
    const { result } = await inSource(source);
    let pending: Promise<unknown> = Promise.resolve();
    act(() => { pending = result.current.onSourceItemSelect(item("b")); });
    expect(result.current.importingItemId).toBe("b");
    expect(result.current.labels.importing).toBe(PHI_MEDIA_WIDGET_DEFAULT_LABELS.picker.importingLabel);
    await act(async () => { finish({ asset: tile, metadata: null }); await pending; });
    expect(result.current.importingItemId).toBeNull();
  });

  it("stays in the source and says why when the import is refused, in the upload's words where it has them", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const refusal = Object.assign(new Error("big"), { code: "media_asset_too_large" });
    const source = fakeSource({ importItem: vi.fn(async () => { throw refusal; }) as never });
    const { result } = await inSource(source);
    let imported: unknown = "unset";
    await act(async () => { imported = await result.current.onSourceItemSelect(item("a")); });
    expect(imported).toBeNull();
    expect(result.current.sourceNotice).toBe(PHI_MEDIA_WIDGET_DEFAULT_LABELS.upload.refusals.errorTooLarge);
    expect(result.current.sourceValue).toBe(source.id);

    source.importItem.mockRejectedValueOnce(Object.assign(new Error("down"), { code: "media_source_failed" }));
    await act(async () => { await result.current.onSourceItemSelect(item("a")); });
    expect(result.current.sourceNotice).toBe(PHI_MEDIA_WIDGET_DEFAULT_LABELS.picker.importFailedText);
  });

  it("stops an import on its way when the picker closes, and says nothing of it", async () => {
    let importSignal: AbortSignal | null = null;
    const source = fakeSource({
      importItem: vi.fn(({ signal }: { signal: AbortSignal }) => new Promise((_resolve, reject) => {
        importSignal = signal;
        signal.addEventListener("abort", () => reject(new Error("stopped")));
      })) as never,
    });
    const { result, rerender } = await inSource(source);
    let pending: Promise<unknown> = Promise.resolve();
    act(() => { pending = result.current.onSourceItemSelect(item("a")); });
    rerender({ open: false });
    await act(async () => { expect(await pending).toBeNull(); });
    expect((importSignal as AbortSignal | null)?.aborted).toBe(true);
    expect(result.current.sourceNotice).toBeNull();
  });
});

describe("an upload inside the picker", () => {
  const uploaded = { id: 77, title: "Fresh", altText: null, kind: "image", folderId: 12 } as never;

  /* The host's surface, recorded: each target the binding drew it for. */
  function fakeUpload(notice: string | null = null) {
    const targets: PhiMediaPickerUploadTarget[] = [];
    const renderPanel = vi.fn((target: PhiMediaPickerUploadTarget) => {
      targets.push(target);
      return null;
    });
    return { binding: { renderPanel, notice } satisfies PhiMediaPickerUploadBinding, targets, renderPanel };
  }

  it("is offered only where a host brings one, with its words", async () => {
    const bare = render();
    await waitFor(() => expect(libraryQueries).toHaveLength(1));
    expect(bare.result.current.uploadPanel).toBeUndefined();

    const upload = fakeUpload("Too large.");
    const { result } = render({ upload: upload.binding });
    await waitFor(() => expect(result.current.uploadPanel).toBeDefined());
    expect(result.current.uploadNotice).toBe("Too large.");
    expect(result.current.labels.upload).toBe(PHI_MEDIA_WIDGET_DEFAULT_LABELS.upload.uploadToggleLabel);
  });

  it("is hidden while another Space than the Site's is shown, as an import is", async () => {
    spaceSelection.current = true;
    const { result } = render({ upload: fakeUpload().binding });
    await waitFor(() => expect(result.current.uploadPanel).toBeDefined());
    act(() => result.current.onSpaceChange("user:2"));
    await waitFor(() => expect(result.current.uploadPanel).toBeUndefined());
  });

  it("draws the host's surface for the Folder shown, reads the list again and chooses what came back like a picked tile", async () => {
    const onAssetSelect = vi.fn();
    const upload = fakeUpload();
    const { result } = render({ upload: upload.binding, onAssetSelect });
    await waitFor(() => expect(libraryQueries).toHaveLength(1));
    const choose = vi.fn((assetId: number) => result.current.onChange(assetId));
    act(() => { result.current.uploadPanel!(choose); });
    expect(upload.targets.at(-1)).toMatchObject({ folderId: null, intoStartFolder: false });
    act(() => upload.targets.at(-1)!.onUploaded(uploaded));
    expect(choose).toHaveBeenCalledWith(77);
    expect(onAssetSelect).toHaveBeenCalledWith(uploaded);
    await waitFor(() => expect(libraryQueries).toHaveLength(2));
  });

  it("chooses nothing where the host answers nothing, and still reads the list again", async () => {
    const upload = fakeUpload();
    const { result } = render({ upload: upload.binding });
    await waitFor(() => expect(libraryQueries).toHaveLength(1));
    const choose = vi.fn();
    act(() => { result.current.uploadPanel!(choose); });
    act(() => upload.targets.at(-1)!.onUploaded(null));
    expect(choose).not.toHaveBeenCalled();
    await waitFor(() => expect(libraryQueries).toHaveLength(2));
  });
});

describe("the Folder the picker opens on", () => {
  it("is asked for when it opens, and the listing waits for it", async () => {
    let answer: (folder: { folderId: number | null; complete: boolean }) => void = () => {};
    const openOnFolder = vi.fn(() => new Promise<{ folderId: number | null; complete: boolean }>((resolve) => { answer = resolve; }));
    const { result } = render({ open: undefined, openOnFolder });
    act(() => result.current.onOpenChange(true));
    expect(openOnFolder).toHaveBeenCalledTimes(1);
    await act(async () => { await Promise.resolve(); });
    expect(libraryQueries).toHaveLength(0);
    await act(async () => { answer({ folderId: 9, complete: true }); });
    await waitFor(() => expect(libraryQueries).toHaveLength(1));
    expect(libraryQueries[0]!.query).toMatchObject({ filters: { folderId: 9 } });
  });

  it("opens on the root and says why where it cannot be read", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const refusal = Object.assign(new Error("gone"), { code: "space_not_found" });
    const openOnFolder = vi.fn(async () => { throw refusal; });
    const { result } = render({ open: undefined, openOnFolder });
    act(() => result.current.onOpenChange(true));
    await waitFor(() => expect(libraryQueries).toHaveLength(1));
    expect(libraryQueries[0]!.query).toMatchObject({ filters: { folderId: null } });
    expect(result.current.uploadNotice).toBe(PHI_MEDIA_WIDGET_DEFAULT_LABELS.upload.refusals.errorSpaceUnavailable);
  });

  const uploadedIntoPath = { id: 78, title: "Shoe", altText: null, kind: "image", folderId: 12 } as never;
  function pathUpload() {
    const targets: PhiMediaPickerUploadTarget[] = [];
    return {
      binding: { renderPanel: (target: PhiMediaPickerUploadTarget) => { targets.push(target); return null; }, notice: null },
      targets,
    };
  }

  it("sends an upload into the whole path while the picker stands on the part of it that is there, then shows where it landed", async () => {
    const upload = pathUpload();
    const openOnFolder = vi.fn(async () => ({ folderId: 3, complete: false }));
    const { result } = render({ open: undefined, openOnFolder, upload: upload.binding });
    act(() => result.current.onOpenChange(true));
    await waitFor(() => expect(libraryQueries).toHaveLength(1));
    expect(libraryQueries[0]!.query).toMatchObject({ filters: { folderId: 3 } });
    act(() => { result.current.uploadPanel!(vi.fn()); });
    expect(upload.targets.at(-1)).toMatchObject({ folderId: 3, intoStartFolder: true });
    act(() => upload.targets.at(-1)!.onUploaded(uploadedIntoPath));
    await waitFor(() => expect(libraryQueries.at(-1)!.query).toMatchObject({ filters: { folderId: 12 } }));
    act(() => { result.current.uploadPanel!(vi.fn()); });
    expect(upload.targets.at(-1)).toMatchObject({ folderId: 12, intoStartFolder: false });
  });

  it("sends into the Folder shown once the reader has left the start Folder, and where the path is all there", async () => {
    const upload = pathUpload();
    const { result } = render({ open: undefined, openOnFolder: vi.fn(async () => ({ folderId: 3, complete: false })), upload: upload.binding });
    act(() => result.current.onOpenChange(true));
    await waitFor(() => expect(libraryQueries).toHaveLength(1));
    act(() => result.current.onFolderChange("/"));
    act(() => { result.current.uploadPanel!(vi.fn()); });
    expect(upload.targets.at(-1)).toMatchObject({ folderId: null, intoStartFolder: false });

    const whole = pathUpload();
    const second = render({ open: undefined, openOnFolder: vi.fn(async () => ({ folderId: 4, complete: true })), upload: whole.binding });
    act(() => second.result.current.onOpenChange(true));
    await waitFor(() => expect(libraryQueries.at(-1)!.query).toMatchObject({ filters: { folderId: 4 } }));
    act(() => { second.result.current.uploadPanel!(vi.fn()); });
    expect(whole.targets.at(-1)).toMatchObject({ folderId: 4, intoStartFolder: false });
  });
});
