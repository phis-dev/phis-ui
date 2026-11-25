import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  runPhiUploadSession,
  type PhiMediaUploadPlan,
  type PhiUploadPhase,
  type PhiUploadSession,
  type PhiUploadTarget,
} from "./media-upload-flow";

/**
 * The seam every upload runs through (`runPhiUploadSession`): one sequence, the target saying where.
 *
 * What is proven is the order a target can rely on -- opened before anything travels, the heartbeat and
 * the leaving-watch around the body only, told when the body did not arrive, settled with what the
 * transport reported -- and the one transport difference a target may ask for: parts whose answer
 * carries no entity tag.
 */
class FakeXhr {
  static sent: string[] = [];
  static answer: (url: string) => { status: number; eTag?: string } = () => ({ status: 200, eTag: "\"tag\"" });
  url = "";
  status = 0;
  responseText = "";
  withCredentials = false;
  upload = { onprogress: null as ((event: { lengthComputable: boolean; loaded: number; total: number }) => void) | null };
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
    FakeXhr.sent.push(this.url);
    queueMicrotask(() => {
      const answer = FakeXhr.answer(this.url);
      this.status = answer.status;
      this.eTag = answer.eTag ?? "";
      this.onload?.();
    });
  }
  abort() {
    this.onabort?.();
  }
}

const plan: PhiMediaUploadPlan = {
  kind: "multipart-put",
  method: "PUT",
  uploadId: "u-1",
  partSizeBytes: 4,
  parts: [{ partNumber: 2, url: "/parts/2" }, { partNumber: 3, url: "/parts/3" }],
};

function fakeTarget(session: Partial<PhiUploadSession<string>> = {}) {
  const log: string[] = [];
  const target: PhiUploadTarget<string> = {
    open: async () => {
      log.push("open");
      return {
        plan,
        uploaded: [{ partNumber: 1, eTag: "\"one\"" }],
        heartbeat: null,
        watchLeaving: () => {
          log.push("watch");
          return () => log.push("stand-down");
        },
        abandon: async (error) => {
          log.push(`abandon:${(error as Error).message}`);
        },
        finish: async (completion) => {
          log.push("finish");
          return JSON.stringify(completion);
        },
        ...session,
      };
    },
  };
  return { target, log };
}

beforeEach(() => {
  FakeXhr.sent = [];
  FakeXhr.answer = () => ({ status: 200, eTag: "\"tag\"" });
  vi.stubGlobal("XMLHttpRequest", FakeXhr);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("runPhiUploadSession", () => {
  it("opens, sends what is missing, stands down and settles with the parts' receipts", async () => {
    const { target, log } = fakeTarget();
    const phases: PhiUploadPhase[] = [];
    const result = await runPhiUploadSession(target, new File([new Uint8Array(10)], "f.bin"), {
      onPhase: (phase) => phases.push(phase),
    });
    expect(FakeXhr.sent.sort()).toEqual(["/parts/2", "/parts/3"]);
    expect(log).toEqual(["open", "watch", "stand-down", "finish"]);
    expect(phases).toEqual(["checksum", "transfer", "finish"]);
    expect(JSON.parse(result)).toEqual({
      uploadId: "u-1",
      parts: [{ partNumber: 1, eTag: "\"one\"" }, { partNumber: 2, eTag: "\"tag\"" }, { partNumber: 3, eTag: "\"tag\"" }],
    });
  });

  it("refuses a part without an entity tag where the target asks for tags, as a storage part needs one", async () => {
    FakeXhr.answer = () => ({ status: 200 });
    const { target, log } = fakeTarget();
    await expect(runPhiUploadSession(target, new File([new Uint8Array(10)], "f.bin"))).rejects.toThrow(/entity tag/u);
    expect(log[0]).toBe("open");
    expect(log).toContain("stand-down");
    expect(log.some((entry) => entry.startsWith("abandon:"))).toBe(true);
    expect(log).not.toContain("finish");
  });

  it("takes a part's plain answer where the target's parts carry no tag", async () => {
    FakeXhr.answer = () => ({ status: 200 });
    const { target, log } = fakeTarget({ partReceipt: "none" });
    await runPhiUploadSession(target, new File([new Uint8Array(10)], "f.bin"));
    expect(log.at(-1)).toBe("finish");
  });

  it("tells the target when the body was stopped, with the signal it was stopped by", async () => {
    const abort = new AbortController();
    let seen: AbortSignal | undefined;
    const { target } = fakeTarget({
      abandon: async (_error, signal) => {
        seen = signal;
      },
    });
    FakeXhr.answer = () => {
      abort.abort("discard");
      return { status: 200, eTag: "\"tag\"" };
    };
    await expect(runPhiUploadSession(target, new File([new Uint8Array(10)], "f.bin"), { signal: abort.signal }))
      .rejects.toMatchObject({ code: "cancelled" });
    expect(seen?.reason).toBe("discard");
  });
});
