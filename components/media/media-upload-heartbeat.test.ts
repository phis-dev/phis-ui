import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { keepPhiMediaUploadHeartbeat } from "./media-upload-flow";

/**
 * A crashed page sends nothing, so the Server only knows a page is still sending parts while it hears so.
 */
describe("the heartbeat of an upload sent in parts", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("window", globalThis);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("beats at the interval the Server named until it is stopped", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const stop = keepPhiMediaUploadHeartbeat({ url: "/api/site/media/uploads/t/heartbeat", intervalMs: 20_000 });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    stop();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("stops by itself once the session is no longer being delivered", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);
    keepPhiMediaUploadHeartbeat({ url: "/x", intervalMs: 20_000 });
    await vi.advanceTimersByTimeAsync(100_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does nothing where the Server asked for no heartbeat", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    keepPhiMediaUploadHeartbeat(null)();
    await vi.advanceTimersByTimeAsync(100_000);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
