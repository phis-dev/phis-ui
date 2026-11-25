import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PhisCdnAdminFileV1, PhisCdnUploadStateV1 } from "@phis/contracts/addon";

const digest = vi.hoisted(() => ({ value: null as null | { sha256: string } | { partSha256: string[] } }));
vi.mock("../../../../components/media/media-upload-digest", () => ({
  buildPhiMediaClientDigest: vi.fn(async () => digest.value),
}));

import {
  PHI_CDN_UPLOAD_DISCARD,
  PhiCdnUploadError,
  loadPhiCdnNames,
  runPhiCdnUpload,
  type PhiCdnUploadProgress,
} from "./upload";

const PART = 4;
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

type Route = (init: RequestInit | undefined) => Response | Promise<Response>;

/** A fake Core: each `METHOD path` answers in turn from its queue, the last answer repeating. */
function core(routes: Record<string, Route[]>) {
  const calls: { method: string; path: string; body?: BodyInit | null }[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input);
    const method = init?.method ?? "GET";
    calls.push({ method, path, body: init?.body ?? null });
    if (init?.signal?.aborted) throw new DOMException("aborted", "AbortError");
    const queue = routes[`${method} ${path.split("?")[0]}`];
    if (!queue?.length) throw new Error(`Unexpected ${method} ${path}`);
    const route = queue.length > 1 ? queue.shift()! : queue[0]!;
    return await route(init);
  });
  vi.stubGlobal("fetch", fetchMock);
  return calls;
}

const base = "/api/site/admin/cdn/uploads";
const input = (size = 10) => ({
  file: new File([new Uint8Array(size)], "tool.deb"),
  name: "tool",
  version: "1.0",
  fileName: "tool.deb",
  os: 1,
  arch: 1,
});

beforeEach(() => {
  digest.value = { partSha256: ["a".repeat(64), "b".repeat(64), "c".repeat(64)] };
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("runPhiCdnUpload", () => {
  it("hashes, opens, sends every part in order, completes and waits for the published file", async () => {
    const calls = core({
      [`POST ${base}`]: [() => json(201, state())],
      [`PUT ${base}/tok/parts/1`]: [() => json(200, { partNumber: 1, uploaded: 1 })],
      [`PUT ${base}/tok/parts/2`]: [() => json(200, { partNumber: 2, uploaded: 2 })],
      [`PUT ${base}/tok/parts/3`]: [() => json(200, { partNumber: 3, uploaded: 3 })],
      [`POST ${base}/tok/complete`]: [() => json(202, state({ state: "hashing", uploaded: [1, 2, 3] }))],
      [`GET ${base}/tok`]: [
        () => json(200, state({ state: "hashing", uploaded: [1, 2, 3] })),
        () => json(200, state({ state: "published", uploaded: [1, 2, 3], file: published })),
      ],
    });
    const progress: PhiCdnUploadProgress[] = [];
    const file = await runPhiCdnUpload(input(), { onProgress: (entry) => progress.push(entry), pollIntervalMs: 1 });

    expect(file).toEqual(published);
    const init = JSON.parse(String(calls[0]?.body));
    expect(init).toEqual({
      name: "tool",
      version: "1.0",
      fileName: "tool.deb",
      sizeBytes: 10,
      os: 1,
      arch: 1,
      partSha256: ["a".repeat(64), "b".repeat(64), "c".repeat(64)],
    });
    expect(calls.filter((call) => call.method === "PUT").map((call) => [call.path, (call.body as Blob).size])).toEqual([
      [`${base}/tok/parts/1`, 4],
      [`${base}/tok/parts/2`, 4],
      [`${base}/tok/parts/3`, 2],
    ]);
    expect(progress[0]).toEqual({ stage: "checksum" });
    expect(progress.filter((entry) => entry.stage === "uploading").map((entry) => entry.stage === "uploading" && entry.loadedBytes))
      .toEqual([0, 4, 8, 10]);
    expect(progress.at(-1)).toEqual({ stage: "hashing" });
  });

  it("opens a file of one part with its one digest", async () => {
    digest.value = { sha256: "d".repeat(64) };
    const calls = core({
      [`POST ${base}`]: [() => json(201, state({ partCount: 1, partSizeBytes: 16 }))],
      [`PUT ${base}/tok/parts/1`]: [() => json(200, { partNumber: 1, uploaded: 1 })],
      [`POST ${base}/tok/complete`]: [() => json(202, state({ state: "published", file: published }))],
    });
    await expect(runPhiCdnUpload(input(), { pollIntervalMs: 1 })).resolves.toEqual(published);
    expect(JSON.parse(String(calls[0]?.body)).partSha256).toEqual(["d".repeat(64)]);
  });

  it("resumes an open session and sends only the parts Core does not hold", async () => {
    const calls = core({
      [`POST ${base}`]: [() => json(200, state({ state: "uploading", uploaded: [1, 3] }))],
      [`PUT ${base}/tok/parts/2`]: [() => json(200, { partNumber: 2, uploaded: 3 })],
      [`POST ${base}/tok/complete`]: [() => json(202, state({ state: "published", uploaded: [1, 2, 3], file: published }))],
    });
    const progress: PhiCdnUploadProgress[] = [];
    await runPhiCdnUpload(input(), { onProgress: (entry) => progress.push(entry), pollIntervalMs: 1 });
    expect(calls.filter((call) => call.method === "PUT").map((call) => call.path)).toEqual([`${base}/tok/parts/2`]);
    expect(progress.find((entry) => entry.stage === "uploading")).toEqual({
      stage: "uploading",
      loadedBytes: 6,
      totalBytes: 10,
      partCount: 3,
      resumedParts: 2,
    });
  });

  it("sends again what Core says is missing at completion", async () => {
    const calls = core({
      [`POST ${base}`]: [() => json(201, state())],
      [`PUT ${base}/tok/parts/1`]: [() => json(200, {})],
      [`PUT ${base}/tok/parts/2`]: [() => json(200, {})],
      [`PUT ${base}/tok/parts/3`]: [() => json(200, {})],
      [`POST ${base}/tok/complete`]: [
        () => json(409, { error: "parts_missing", message: "Part 2 is missing.", uploaded: [1, 3] }),
        () => json(202, state({ state: "published", file: published })),
      ],
    });
    await runPhiCdnUpload(input(), { pollIntervalMs: 1 });
    expect(calls.filter((call) => call.method === "PUT").map((call) => call.path.split("/").at(-1))).toEqual(["1", "2", "3", "2"]);
  });

  it("stops at Core's refusal with Core's sentence, quota included", async () => {
    core({ [`POST ${base}`]: [() => json(413, { error: "quota-exceeded", message: "The Site Space is full." })] });
    const error = await runPhiCdnUpload(input()).catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(PhiCdnUploadError);
    expect(error).toMatchObject({ code: "quota-exceeded", message: "The Site Space is full.", status: 413 });
  });

  it("does not try a refused part again, and leaves the session to be resumed", async () => {
    const calls = core({
      [`POST ${base}`]: [() => json(201, state())],
      [`PUT ${base}/tok/parts/1`]: [() => json(422, { error: "part_rejected", message: "The storage refused the part's checksum." })],
    });
    await expect(runPhiCdnUpload(input())).rejects.toMatchObject({ code: "part_rejected" });
    expect(calls.filter((call) => call.method === "PUT")).toHaveLength(1);
    expect(calls.some((call) => call.method === "DELETE")).toBe(false);
  });

  it("tries a part again after the network failed it", async () => {
    let failures = 1;
    core({
      [`POST ${base}`]: [() => json(201, state({ partCount: 1, partSizeBytes: 16 }))],
      [`PUT ${base}/tok/parts/1`]: [() => {
        if (failures-- > 0) throw new TypeError("network down");
        return json(200, {});
      }],
      [`POST ${base}/tok/complete`]: [() => json(202, state({ state: "published", file: published }))],
    });
    digest.value = { sha256: "d".repeat(64) };
    await expect(runPhiCdnUpload(input(), { pollIntervalMs: 1 })).resolves.toEqual(published);
  });

  it("reports Core's failure after hashing", async () => {
    core({
      [`POST ${base}`]: [() => json(201, state({ state: "uploading", uploaded: [1, 2, 3] }))],
      [`POST ${base}/tok/complete`]: [() => json(202, state({ state: "hashing" }))],
      [`GET ${base}/tok`]: [() => json(200, state({ state: "failed", error: { code: "size_mismatch", message: "The object is shorter than stated." } }))],
    });
    await expect(runPhiCdnUpload(input(), { pollIntervalMs: 1 }))
      .rejects.toMatchObject({ code: "size_mismatch", message: "The object is shorter than stated." });
  });

  it("deletes the session when stopped as a discard", async () => {
    const abort = new AbortController();
    const calls = core({
      [`POST ${base}`]: [() => json(201, state())],
      [`PUT ${base}/tok/parts/1`]: [() => {
        abort.abort(PHI_CDN_UPLOAD_DISCARD);
        return json(200, {});
      }],
      [`DELETE ${base}/tok`]: [() => json(204)],
    });
    await expect(runPhiCdnUpload(input(), { signal: abort.signal })).rejects.toMatchObject({ code: "cancelled" });
    expect(calls.at(-1)).toMatchObject({ method: "DELETE", path: `${base}/tok` });
  });

  it("keeps the session when stopped for any other reason, so the file can be resumed", async () => {
    const abort = new AbortController();
    const calls = core({
      [`POST ${base}`]: [() => json(201, state())],
      [`PUT ${base}/tok/parts/1`]: [() => {
        abort.abort();
        return json(200, {});
      }],
    });
    await expect(runPhiCdnUpload(input(), { signal: abort.signal })).rejects.toMatchObject({ code: "cancelled" });
    expect(calls.some((call) => call.method === "DELETE")).toBe(false);
  });

  it("beats while parts travel", async () => {
    vi.useFakeTimers();
    let release: (() => void) | undefined;
    const calls = core({
      [`POST ${base}`]: [() => json(201, state({ partCount: 1, partSizeBytes: 16, heartbeatIntervalMs: 2000 }))],
      [`PUT ${base}/tok/parts/1`]: [() => new Promise<Response>((resolve) => { release = () => resolve(json(200, {})); })],
      [`POST ${base}/tok/heartbeat`]: [() => json(204)],
      [`POST ${base}/tok/complete`]: [() => json(202, state({ state: "published", file: published }))],
    });
    digest.value = { sha256: "d".repeat(64) };
    const running = runPhiCdnUpload(input(), { pollIntervalMs: 1 });
    await vi.waitFor(() => expect(release).toBeDefined());
    await vi.advanceTimersByTimeAsync(4500);
    expect(calls.filter((call) => call.path.endsWith("/heartbeat"))).toHaveLength(2);
    release!();
    await expect(running).resolves.toEqual(published);
    await vi.advanceTimersByTimeAsync(4500);
    expect(calls.filter((call) => call.path.endsWith("/heartbeat"))).toHaveLength(2);
  });

  it("refuses to start where the browser cannot hash", async () => {
    digest.value = null;
    const calls = core({});
    await expect(runPhiCdnUpload(input())).rejects.toMatchObject({ code: "checksum-unavailable" });
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
