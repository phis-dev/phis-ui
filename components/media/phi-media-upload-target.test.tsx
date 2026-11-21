// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PHI_MEDIA_UPLOAD_DEFAULT_LABELS } from "./media-upload-labels";
import { PhiMediaUploadError } from "./media-upload-flow";
import { usePhiMediaUpload } from "./phi-media-upload";

/**
 * Where one file goes: the hook's `initOptions`, unless the caller names the target for that file --
 * the `media-asset` field's picker uploads into the Folder it shows, which moves while the hook stands.
 * A retry sends the file where it was sent the first time.
 */
describe("the target of one upload", () => {
  const file = { name: "a.png", type: "image/png", size: 10 } as File;

  function render() {
    const runSession = vi.fn(async (..._args: unknown[]) => ({ asset: { id: 5 } }));
    const hook = renderHook(() => usePhiMediaUpload({
      labels: PHI_MEDIA_UPLOAD_DEFAULT_LABELS,
      initOptions: { folderId: 1 },
      runSession,
    }));
    return { ...hook, runSession };
  }

  it("is the hook's initOptions where the caller names none", async () => {
    const { result, runSession } = render();
    await act(async () => { await result.current.upload(file); });
    expect(runSession.mock.calls[0]![2]).toEqual({ folderId: 1 });
  });

  it("is the caller's where it names one, and again on a retry", async () => {
    const { result, runSession } = render();
    runSession.mockRejectedValueOnce(new PhiMediaUploadError("locked", "folder_locked", 409));
    await act(async () => { await result.current.upload(file, { folderId: 7 }); });
    expect(runSession.mock.calls[0]![2]).toEqual({ folderId: 7 });
    expect(result.current.items[0]).toMatchObject({
      status: "error",
      error: PHI_MEDIA_UPLOAD_DEFAULT_LABELS.errorFolderLocked,
    });
    await act(async () => { await result.current.retry(result.current.items[0]!.localId); });
    expect(runSession.mock.calls[1]![2]).toEqual({ folderId: 7 });
    expect(result.current.items[0]).toMatchObject({ status: "done", assetId: 5 });
  });
});
