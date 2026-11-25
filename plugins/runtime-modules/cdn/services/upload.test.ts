import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PhisCdnAdminFileV1, PhisCdnUploadStateV1 } from "@phis/contracts/addon";

const digest = vi.hoisted(() => ({ value: null as null | { sha256: string } | { partSha256: string[] } }));
vi.mock("../../../../components/media/media-upload-digest", () => ({
  buildPhiMediaClientDigest: vi.fn(async () => digest.value),
}));

import {
  PhiMediaUploadError,
  runPhiUploadSession,
  type PhiUploadPhase,
} from "../../../../components/media/media-upload-flow";
import { PHI_CDN_UPLOAD_DISCARD, createPhiCdnUploadTarget, loadPhiCdnNames } from "./upload";

const PART = 4;
const base = "/api/site/admin/cdn/uploads";
const published: PhisCdnAdminFileV1 = {
  key: "tool/1.0/tool.deb",
  name: "tool",
  version: "1.0",
  fileName: "tool.deb",
  sizeBytes: 10,
  sha256: "f".repeat(64),
  contentType: "application/vnd.debian.binary-package",
  publishedAt: "2026-11-25T10:00:00.000Z",
  url: "https://cdn.example.test/tool/1.0/tool.deb",
  storage: "cdn",
  os: 1,
  arch: 1,
  state: "offered",
  origin: { kind: "upload", addonId: null, actorUserId: 7, sourceUrl: null },
};

function state(overrides: Partial<PhisCdnUploadStateV1> = {}): PhisCdnUploadStateV1 {
  return {
    token: "tok",
    state: "pending",
    key: "tool/1.0/tool.deb",
    partSizeBytes: PART,
    partCount: 3,
    uploaded: [],
    expiresAt: "2026-11-25T11:00:00.000Z",
    heartbeatIntervalMs: 60_000,
    file: null,
    error: null,
    ...overrides,
  };
}

function json(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

/** The parts travel as the Media upload sends them, by XMLHttpRequest; this one answers by URL. */
class FakeXhr {
  static sent: { url: string; size: number }[] = [];
  static answer: (url: string) => number = () => 200;
  static onSend: ((url: string) => void) | null = null;
  url = "";
  status = 0;
  responseText = "";
  withCredentials = false;
  upload: { onprogress: ((event: { lengthComputable: boolean; loaded: number; total: number }) => void) | null } = { onprogress: null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  open(_method: string, url: string) {
    this.url = url;
  }
  setRequestHeader() {}
  getResponseHeader() {
    return null;
  }
  send(body: Blob) {
    FakeXhr.sent.push({ url: this.url, size: body.size });
    FakeXhr.onSend?.(this.url);
    queueMicrotask(() => {
      this.status = FakeXhr.answer(this.url);
      if (this.status === 0) this.onerror?.();
      else this.onload?.();
    });
  }
  abort() {
    this.onabort?.();
  }
}

type Route = () => Response | Promise<Response>;

/** A fake Core for the JSON routes: each `METHOD path` answers in turn, the last answer repeating. */
function core(routes: Record<string, Route[]>) {
  const calls: { method: string; path: string; body?: unknown }[] = [];
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input);
    const method = init?.method ?? "GET";
    calls.push({ method, path, body: init?.body ?? null });
    if (init?.signal?.aborted) throw new DOMException("aborted", "AbortError");
    const queue = routes[`${method} ${path.split("?")[0]}`];
    if (!queue?.length) throw new Error(`Unexpected ${method} ${path}`);
    const route = queue.length > 1 ? queue.shift()! : queue[0]!;
    return await route();
  }));
  return calls;
}

const input = { name: "tool", version: "1.0", fileName: "tool.deb", os: 1, arch: 1 };
const file = (size = 10) => new File([new Uint8Array(size)], "tool.deb");
const run = (options: { signal?: AbortSignal; onPhase?: (phase: PhiUploadPhase) => void; onProgress?: (progress: number) => void } = {}) =>
  runPhiUploadSession(createPhiCdnUploadTarget(input, { pollIntervalMs: 1 }), file(), options);

beforeEach(() => {
  digest.value = { partSha256: ["a".repeat(64), "b".repeat(64), "c".repeat(64)] };
  FakeXhr.sent = [];
  FakeXhr.answer = () => 200;
  FakeXhr.onSend = null;
  vi.stubGlobal("XMLHttpRequest", FakeXhr);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the CDN as an upload target", () => {
  it("opens with the part digests, sends every part to Core, completes and waits for the published file", async () => {
    const calls = core({
      [`POST ${base}`]: [() => json(201, state())],
      [`POST ${base}/tok/complete`]: [() => json(202, state({ state: "hashing", uploaded: [1, 2, 3] }))],
      [`GET ${base}/tok`]: [
        () => json(200, state({ state: "hashing" })),
        () => json(200, state({ state: "published", file: published })),
      ],
    });
    const phases: PhiUploadPhase[] = [];
    const progress: number[] = [];
    await expect(run({ onPhase: (phase) => phases.push(phase), onProgress: (value) => progress.push(value) })).resolves.toEqual(published);
    expect(JSON.parse(String(calls[0]?.body))).toEqual({
      name: "tool",
      version: "1.0",
      fileName: "tool.deb",
      sizeBytes: 10,
      os: 1,
      arch: 1,
      partSha256: ["a".repeat(64), "b".repeat(64), "c".repeat(64)],
    });
    expect(FakeXhr.sent.map((part) => [part.url, part.size]).sort()).toEqual([
      [`${base}/tok/parts/1`, 4],
      [`${base}/tok/parts/2`, 4],
      [`${base}/tok/parts/3`, 2],
    ]);
    expect(phases).toEqual(["checksum", "transfer", "finish"]);
    expect(progress.at(-1)).toBe(100);
  });

  it("opens a file of one part with its one digest", async () => {
    digest.value = { sha256: "d".repeat(64) };
    const calls = core({
      [`POST ${base}`]: [() => json(201, state({ partCount: 1, partSizeBytes: 16 }))],
      [`POST ${base}/tok/complete`]: [() => json(202, state({ state: "published", file: published }))],
    });
    await expect(run()).resolves.toEqual(published);
    expect(JSON.parse(String(calls[0]?.body)).partSha256).toEqual(["d".repeat(64)]);
  });

  it("resumes an open session and sends only the parts Core does not hold", async () => {
    core({
      [`POST ${base}`]: [() => json(200, state({ state: "uploading", uploaded: [1, 3] }))],
      [`POST ${base}/tok/complete`]: [() => json(202, state({ state: "published", file: published }))],
    });
    const progress: number[] = [];
    await run({ onProgress: (value) => progress.push(value) });
    expect(FakeXhr.sent.map((part) => part.url)).toEqual([`${base}/tok/parts/2`]);
    // What was there counts from the start: 6 of 10 bytes.
    expect(progress[0]).toBe(60);
  });

  it("only waits where the session was completed before the page went away", async () => {
    const calls = core({
      [`POST ${base}`]: [() => json(200, state({ state: "hashing", uploaded: [1, 2, 3] }))],
      [`GET ${base}/tok`]: [() => json(200, state({ state: "published", file: published }))],
    });
    await expect(run()).resolves.toEqual(published);
    expect(FakeXhr.sent).toHaveLength(0);
    expect(calls.some((call) => call.path.endsWith("/complete"))).toBe(false);
  });

  it("stops at Core's refusal with Core's code and sentence, quota included", async () => {
    core({ [`POST ${base}`]: [() => json(413, { error: "quota-exceeded", message: "The Site Space is full." })] });
    const error = await run().catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(PhiMediaUploadError);
    expect(error).toMatchObject({ code: "quota-exceeded", message: "The Site Space is full.", status: 413 });
  });

  it("does not try a refused part again, and leaves the session to be resumed", async () => {
    FakeXhr.answer = (url) => (url.endsWith("/parts/1") ? 422 : 200);
    const calls = core({ [`POST ${base}`]: [() => json(201, state({ partCount: 1, partSizeBytes: 16 }))] });
    await expect(run()).rejects.toMatchObject({ status: 422 });
    expect(FakeXhr.sent).toHaveLength(1);
    expect(calls.some((call) => call.method === "DELETE")).toBe(false);
  });

  it("tries a part again after the network failed it, as the Media upload does", async () => {
    let failures = 1;
    FakeXhr.answer = () => (failures-- > 0 ? 0 : 200);
    core({
      [`POST ${base}`]: [() => json(201, state({ partCount: 1, partSizeBytes: 16 }))],
      [`POST ${base}/tok/complete`]: [() => json(202, state({ state: "published", file: published }))],
    });
    await expect(run()).resolves.toEqual(published);
    expect(FakeXhr.sent).toHaveLength(2);
  });

  it("reports Core's failure after hashing", async () => {
    core({
      [`POST ${base}`]: [() => json(201, state({ state: "uploading", uploaded: [1, 2, 3] }))],
      [`POST ${base}/tok/complete`]: [() => json(202, state({ state: "hashing" }))],
      [`GET ${base}/tok`]: [() => json(200, state({ state: "failed", error: { code: "size_mismatch", message: "The object is shorter than stated." } }))],
    });
    await expect(run()).rejects.toMatchObject({ code: "size_mismatch", message: "The object is shorter than stated." });
  });

  it("deletes the session when stopped as a discard", async () => {
    const abort = new AbortController();
    FakeXhr.onSend = () => abort.abort(PHI_CDN_UPLOAD_DISCARD);
    const calls = core({
      [`POST ${base}`]: [() => json(201, state({ partCount: 1, partSizeBytes: 16 }))],
      [`DELETE ${base}/tok`]: [() => json(204)],
    });
    await expect(run({ signal: abort.signal })).rejects.toMatchObject({ code: "cancelled" });
    expect(calls.at(-1)).toMatchObject({ method: "DELETE", path: `${base}/tok` });
  });

  it("keeps the session when stopped for any other reason, so the file can be resumed", async () => {
    const abort = new AbortController();
    FakeXhr.onSend = () => abort.abort();
    const calls = core({ [`POST ${base}`]: [() => json(201, state({ partCount: 1, partSizeBytes: 16 }))] });
    await expect(run({ signal: abort.signal })).rejects.toMatchObject({ code: "cancelled" });
    expect(calls.some((call) => call.method === "DELETE")).toBe(false);
  });

  it("refuses to start where the browser cannot hash", async () => {
    digest.value = null;
    const calls = core({});
    await expect(run()).rejects.toMatchObject({ code: "checksum-unavailable" });
    expect(calls).toHaveLength(0);
  });
});

describe("loadPhiCdnNames", () => {
  it("offers each name the catalogue holds once", async () => {
    core({
      "GET /api/site/admin/cdn": [() => json(200, {
        cdn: null,
        files: [published, { ...published, version: "2.0" }, { ...published, name: "other" }],
        total: 3,
        page: 1,
        pageSize: 200,
      })],
    });
    await expect(loadPhiCdnNames()).resolves.toEqual(["tool", "other"]);
  });
});
