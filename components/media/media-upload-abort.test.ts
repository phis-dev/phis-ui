import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  PhiMediaUploadError,
  isPhiMediaUploadCancelled,
  uploadPhiMediaUploadBody,
  type PhiMediaUploadPlan,
} from "./media-upload-flow";

/**
 * Stopping a body, on purpose or because one part gave up.
 *
 * What is proven is what nobody would see go wrong: workers that go on sending parts after the upload
 * already failed -- bytes nobody will assemble, progress landing on an upload that reads as failed --
 * and a body that keeps travelling after the surface that started it was closed.
 */
class FakeXhr {
  static sent: FakeXhr[] = [];
  url = "";
  status = 0;
  responseText = "";
  aborted = false;
  withCredentials = false;
  upload: { onprogress: ((event: { lengthComputable: boolean; loaded: number; total: number }) => void) | null } = {
    onprogress: null,
  };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  private eTag = "";

  open(_method: string, url: string) {
    this.url = url;
  }
  setRequestHeader() {}
  getResponseHeader(name: string) {
    return name.toLowerCase() === "etag" ? this.eTag : null;
  }
  send() {
    FakeXhr.sent.push(this);
  }
  abort() {
    this.aborted = true;
    this.onabort?.();
  }
  respond(status: number, eTag = "") {
    this.status = status;
    this.eTag = eTag;
    this.onload?.();
  }
}

beforeEach(() => {
  FakeXhr.sent = [];
  vi.stubGlobal("XMLHttpRequest", FakeXhr);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function multipartPlan(partCount: number): PhiMediaUploadPlan {
  return {
    kind: "multipart-put",
    method: "PUT",
    uploadId: "upload-1",
    partSizeBytes: 10,
    parts: Array.from({ length: partCount }, (_, index) => ({
      partNumber: index + 1,
      url: `https://storage.invalid/part/${index + 1}`,
    })),
  };
}

describe("a part that gives up", () => {
  it("stops every other worker before the failure is thrown", async () => {
    const file = new File([new Uint8Array(60)], "body.bin");
    const onProgress = vi.fn();
    const upload = uploadPhiMediaUploadBody(multipartPlan(6), file, onProgress);
    const settled = upload.catch((error: unknown) => error);

    await vi.waitFor(() => expect(FakeXhr.sent).toHaveLength(3));
    // A refusal is not repeated, so this ends the upload at once.
    FakeXhr.sent[0]!.respond(403);
    const error = await settled;

    expect(error).toBeInstanceOf(PhiMediaUploadError);
    expect((error as PhiMediaUploadError).code).toBe("storage_rejected");
    // The parts in flight were aborted, and nobody took parts four to six.
    expect(FakeXhr.sent[1]!.aborted).toBe(true);
    expect(FakeXhr.sent[2]!.aborted).toBe(true);
    expect(FakeXhr.sent).toHaveLength(3);

    // An aborted part that still reports afterwards does not move the bar of a failed upload.
    onProgress.mockClear();
    FakeXhr.sent[1]!.upload.onprogress?.({ lengthComputable: true, loaded: 5, total: 10 });
    expect(onProgress).not.toHaveBeenCalled();
  });

  it("assembles every part when none gives up", async () => {
    const file = new File([new Uint8Array(25)], "body.bin");
    const upload = uploadPhiMediaUploadBody(multipartPlan(3), file);
    await vi.waitFor(() => expect(FakeXhr.sent).toHaveLength(3));
    FakeXhr.sent.forEach((xhr, index) => xhr.respond(200, `"tag-${index + 1}"`));

    await expect(upload).resolves.toMatchObject({
      status: "uploaded",
      completion: {
        uploadId: "upload-1",
        parts: [
          { partNumber: 1, eTag: '"tag-1"' },
          { partNumber: 2, eTag: '"tag-2"' },
          { partNumber: 3, eTag: '"tag-3"' },
        ],
      },
    });
  });
});

describe("a body somebody stopped", () => {
  it("aborts the parts in flight and reads as cancelled", async () => {
    const controller = new AbortController();
    const file = new File([new Uint8Array(60)], "body.bin");
    const upload = uploadPhiMediaUploadBody(multipartPlan(6), file, undefined, [], controller.signal);
    const settled = upload.catch((error: unknown) => error);

    await vi.waitFor(() => expect(FakeXhr.sent).toHaveLength(3));
    controller.abort();

    expect(isPhiMediaUploadCancelled(await settled)).toBe(true);
    expect(FakeXhr.sent.every((xhr) => xhr.aborted)).toBe(true);
    expect(FakeXhr.sent).toHaveLength(3);
  });

  it("aborts a single-request body and reads as cancelled", async () => {
    const controller = new AbortController();
    const file = new File(["body"], "body.txt", { type: "text/plain" });
    const upload = uploadPhiMediaUploadBody(
      { kind: "presigned-put", method: "PUT", url: "https://storage.invalid/object", headers: {} },
      file,
      undefined,
      [],
      controller.signal,
    );
    const settled = upload.catch((error: unknown) => error);

    await vi.waitFor(() => expect(FakeXhr.sent).toHaveLength(1));
    controller.abort();

    expect(isPhiMediaUploadCancelled(await settled)).toBe(true);
    expect(FakeXhr.sent[0]!.aborted).toBe(true);
  });

  it("sends nothing for a signal that was already stopped", async () => {
    const controller = new AbortController();
    controller.abort();
    const file = new File(["body"], "body.txt");

    const error = await uploadPhiMediaUploadBody(multipartPlan(2), file, undefined, [], controller.signal)
      .catch((reason: unknown) => reason);

    expect(isPhiMediaUploadCancelled(error)).toBe(true);
    expect(FakeXhr.sent).toHaveLength(0);
  });
});
